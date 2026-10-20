const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const src = fs.readFileSync(__dirname + '/../caixa/js/impressora.js', 'utf8');
const trecho = src.slice(src.indexOf('function formatarCupom'), src.indexOf('// ponto único pra tentar reconectar'));
const formatarCupom = new Function('dataStr', 'bordaReal', 'linhasDoItem', trecho + '; return formatarCupom;')(
  (x) => x, (b) => (b && b !== 'Sem borda' ? b : null), (n) => ({ titulo: n, subs: [] }));

const pedido = { numero_sequencial: 4, delivery_type: 'entrega', created_at: '2026-10-20T18:54:00', client_name: 'Marcos', address: 'Rua Safira, nº 374',
  items_json: [{ name: 'MEIA A MEIA', qty: 1, price: 39.99 }, { name: 'Kuat 2L', qty: 2, price: 12 }], total: 71.99, taxa_entrega: 8, payment: 'Pix' };

test('comanda mostra o valor de cada item, a entrega e o total', () => {
  const t = formatarCupom(pedido);
  assert.match(t, /R\$ 39,99/);
  assert.match(t, /R\$ 24,00/); // 2 x 12
  assert.match(t, /Entrega\s+R\$ 8,00/);
  assert.match(t, /TOTAL\s+R\$ 71,99/);
});
test('endereço da entrega sai antes dos itens (se a impressão cortar, o destino não some)', () => {
  const t = formatarCupom(pedido);
  assert.ok(t.indexOf('Rua Safira') < t.indexOf('1x MEIA A MEIA'));
});
test('entrega grátis e retirada', () => {
  assert.match(formatarCupom({ ...pedido, taxa_entrega: 0 }), /Entrega\s+grátis/);
  assert.doesNotMatch(formatarCupom({ ...pedido, delivery_type: 'retirada' }), /Entrega/);
});
