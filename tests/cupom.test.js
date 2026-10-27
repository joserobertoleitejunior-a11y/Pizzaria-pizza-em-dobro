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

test('nome e total aparecem no topo e de novo no fim; sem total no pedido, soma os itens', () => {
  const t = formatarCupom(pedido);
  assert.ok(t.indexOf('Marcos') < t.indexOf('1x MEIA A MEIA'));
  assert.ok(t.indexOf('TOTAL R$ 71,99') < t.indexOf('1x MEIA A MEIA'));
  assert.equal((t.match(/71,99/g) || []).length, 2);
  const sem = formatarCupom({ ...pedido, total: 0 }); // 39,99 + 24,00 + 8,00 de entrega
  assert.match(sem, /TOTAL R\$ 71,99/);
  assert.match(formatarCupom({ ...pedido, client_name: '' }), /SEM NOME/);
});

test('comanda usa só ASCII nos traços e no cabeçalho (térmica com outra tabela imprimia "ÄÄÄ" e perdia o º)', () => {
  const t = formatarCupom(pedido);
  assert.doesNotMatch(t.split('\n').slice(0, 4).join('\n'), /[─º°]/);
  assert.match(t, /^PEDIDO 4\s+ENTREGA/);
  assert.match(t, /\n-{20,}\n/);
});
test('classificação de letra grande: pedido, nome, itens e total em G; detalhes em A; valor à direita', () => {
  const trecho2 = src.slice(src.indexOf('function classificarLinhasCupom'), src.indexOf('function linhasDoItem'));
  const { classificarLinhasCupom, quebrarLinha } = new Function(trecho2 + '; return {classificarLinhasCupom, quebrarLinha};')();
  const l = classificarLinhasCupom(formatarCupom({ ...pedido, delivery_type: 'retirada' }));
  assert.equal(l[0].k, 'G');
  assert.equal(l[3].k, 'G');
  assert.ok(l.some((x) => x.k === 'G' && x.dir));
  assert.ok(l.some((x) => x.k === 'S'));
  assert.deepEqual(quebrarLinha('PEDIDO 3 RETIRADA', 16), ['PEDIDO 3', 'RETIRADA']);
});
