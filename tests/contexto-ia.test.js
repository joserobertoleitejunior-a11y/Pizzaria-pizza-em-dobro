const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

test('contexto da IA traz hoje/ontem/7/30 dias JÁ SOMADOS pelo servidor (cancelados fora da conta)', async () => {
  const agora = Date.now();
  const iso = (dias) => new Date(agora - dias * 864e5).toISOString();
  const orders = [
    { created_at: iso(0), total: 100, status: 'novo', items_json: [{ name: 'Calabresa', qty: 1 }], client_name: 'A' },
    { created_at: iso(0), total: 55.5, status: 'novo', items_json: [], client_name: 'B' },
    { created_at: iso(0), total: 999, status: 'cancelado', items_json: [], client_name: 'C' },
    { created_at: iso(1), total: 80, status: 'novo', items_json: [], client_name: 'D' },
    { created_at: iso(5), total: 70, status: 'novo', items_json: [], client_name: 'E' },
    { created_at: iso(20), total: 30, status: 'novo', items_json: [], client_name: 'F' }
  ];
  const snap = (arr) => ({ docs: arr.map((d, i) => ({ id: 'i' + i, data: () => d })), size: arr.length });
  const db = { collection: (n) => ({ where() { return this; }, orderBy() { return this; }, limit() { return this; },
    get: async () => snap(n === 'orders' ? orders : []), doc: () => ({ get: async () => ({ exists: false, data: () => ({}) }) }) }) };
  const original = Module._load;
  Module._load = function (req, ...resto) {
    if (/lib\/firebase$/.test(req)) return { db, admin: { firestore: { FieldValue: {} } } };
    return original.call(this, req, ...resto);
  };
  let texto;
  try {
    delete require.cache[require.resolve('../server/dashboard-chat.js')];
    texto = await require('../server/dashboard-chat.js').montarContextoVendas();
  } finally { Module._load = original; }
  assert.match(texto, /NÚMEROS JÁ CALCULADOS POR PERÍODO/);
  assert.match(texto, /Hoje \([^)]*\): faturamento R\$ 155,50 · 2 pedido\(s\) válido\(s\) · ticket médio R\$ 77,75 · 1 cancelado\(s\)/);
  assert.match(texto, /Ontem \([^)]*\): faturamento R\$ 80,00 · 1 pedido/);
  assert.match(texto, /7 dias[^:]*: faturamento R\$ 305,50 · 4 pedido/);
  assert.match(texto, /30 dias[^:]*: faturamento R\$ 335,50 · 5 pedido/);
});
