const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { esfDistribuirPadrao } = require('../shared/utils.js');

// extrai só a função pura do arquivo do navegador
const src = fs.readFileSync(__dirname + '/../caixa/js/colar-pedido.js', 'utf8');
const trecho = src.slice(src.indexOf('function consolidarBrotos'), src.indexOf('function montarCaixaComPedidoInterpretado'));
const trechoEsf = src.slice(src.indexOf('const RE_ESFIHA'), src.indexOf('// Junta as pizzas broto'));
const { completarEsfihas, extrairEsfihasDoSite, extrairClienteDoSite, extrairValorCombinado, extrairClienteDoWhatsapp } = new Function(trechoEsf + '; return { completarEsfihas, extrairEsfihasDoSite, extrairClienteDoSite, extrairValorCombinado, extrairClienteDoWhatsapp };')();
const consolidarBrotos = new Function(trecho + '; return consolidarBrotos;')();
const par = (r) => r.map((x) => x.nome_cardapio + '+' + x.nome_cardapio_2);

test('duas brotos de sabores diferentes viram UM combo com os dois sabores', () => {
  const r = consolidarBrotos([{ tipo: 'broto', nome_cardapio: 'Calabresa', qtd: 1 }, { tipo: 'broto', nome_cardapio: 'Mussarela', qtd: 1 }]);
  assert.deepEqual(par(r), ['Calabresa+Mussarela']);
});
test('2 brotos do mesmo sabor = 1 combo; 4 brotos = 2 combos', () => {
  assert.deepEqual(par(consolidarBrotos([{ tipo: 'broto', nome_cardapio: 'Calabresa', qtd: 2 }])), ['Calabresa+Calabresa']);
  assert.equal(consolidarBrotos([{ tipo: 'broto', nome_cardapio: 'A', qtd: 2 }, { tipo: 'broto', nome_cardapio: 'B', qtd: 2 }]).length, 2);
});
test('par já completo da IA e outros itens são preservados', () => {
  const r = consolidarBrotos([{ tipo: 'broto', nome_cardapio: 'A', nome_cardapio_2: 'B', qtd: 1 }, { tipo: 'normal', nome_cardapio: 'Kuat 2L', qtd: 1 }]);
  assert.equal(r.length, 2); assert.equal(r[1].tipo, 'normal');
});
test('quantidade ímpar de brotos avisa', () => {
  assert.equal(consolidarBrotos([{ tipo: 'broto', nome_cardapio: 'A', qtd: 3 }]).brotoSobra, true);
});
test('esfihas sem sabor usam os sabores padrão do site', () => {
  const d = esfDistribuirPadrao(10);
  assert.equal(Object.values(d).reduce((a, b) => a + b, 0), 10);
  assert.equal(d.Carne, 2); assert.equal(d.Mista, 1);
  assert.equal(Object.values(esfDistribuirPadrao(30)).every((v) => v === 5), true);
  assert.equal(esfDistribuirPadrao(10, { Carne: 5 }).Carne, 6); // completa o que faltou
});

test('broto doce ou sem sabor não entra no combo de R$ 50', () => {
  const valido = (n) => /calabresa|mussarela/i.test(n);
  const r = consolidarBrotos([{ tipo: 'broto', nome_cardapio: 'Pizza Doce Brigadeiro', qtd: 1 }, { tipo: 'broto', nome_cardapio: null, qtd: 1 }], valido);
  assert.equal(r.filter((x) => x.tipo === 'broto').length, 0);
  assert.equal(r.filter((x) => x.tipo === 'normal').length, 2);
  assert.match(r[0].observacao, /BROTO/);
  const r2 = consolidarBrotos([{ tipo: 'broto', nome_cardapio: 'Calabresa', qtd: 1 }, { tipo: 'broto', nome_cardapio: 'Mussarela', qtd: 1 }, { tipo: 'broto', nome_cardapio: 'Doce X', qtd: 1 }], valido);
  assert.equal(r2.filter((x) => x.tipo === 'broto').length, 1); // calabresa+mussarela = 1 combo
});

test('esfihas sem sabor: o texto manda, mesmo se a IA esquecer', () => {
  const r = completarEsfihas({ itens: [] }, 'Quero um combo com 20 esfilha');
  assert.equal(r.itens.length, 1);
  assert.equal(r.itens[0].tipo, 'esfihas'); assert.equal(r.itens[0].esfihas_total, 20); assert.equal(r.itens[0].esfihas, null);
  assert.equal(completarEsfihas({ itens: [] }, 'queria um combo de esfiha').itens[0].esfihas_total, 10); // sem número = 10
  assert.equal(completarEsfihas({ itens: [] }, '30 esfirras por favor').itens[0].esfihas_total, 30);
});
test('esfihas: não duplica quando a IA já montou, e completa o total', () => {
  const r = completarEsfihas({ itens: [{ tipo: 'esfihas', esfihas: [], qtd: 1 }] }, 'combo de 20 esfihas');
  assert.equal(r.itens.length, 1); assert.equal(r.itens[0].esfihas_total, 20);
  const r2 = completarEsfihas({ itens: [{ tipo: 'normal', nome_cardapio: null, observacao: 'combo de esfihas sem sabor', qtd: 1 }] }, 'combo de esfihas');
  assert.equal(r2.itens.length, 1); assert.equal(r2.itens[0].tipo, 'esfihas');
});
test('texto sem esfiha não cria esfihas', () => {
  assert.equal(completarEsfihas({ itens: [] }, 'uma calabresa e uma coca').itens.length, 0);
});

test('pedido do site com combo de esfihas: lido sem IA e não vai pro texto da IA', () => {
  const txt = '🛎️ *NOVO PEDIDO - SITE OFICIAL*\n\n*• Esfihas (10) — 4 Carne + 6 Mista*\n  💰 R$ 50,00\n\n*• Calabresa*\n  💰 R$ 37,99\n';
  const r = extrairEsfihasDoSite(txt);
  assert.equal(r.itens.length, 1);
  assert.equal(r.itens[0].tipo, 'esfihas');
  assert.equal(r.itens[0].esfihas_total, 10);
  assert.deepEqual(r.itens[0].esfihas, [{ sabor: 'Carne', qtd: 4 }, { sabor: 'Mista', qtd: 6 }]);
  assert.ok(!/Esfihas|Carne|50,00/.test(r.texto));
  assert.ok(/Calabresa/.test(r.texto));
});
test('"combo de esfihas" na mão: combo de pizza sem sabor que a IA criou é descartado', () => {
  const r = completarEsfihas({ itens: [{ tipo: 'combo', nome_cardapio: null, qtd: 1 }] }, 'Combo de esfihas');
  assert.equal(r.itens.length, 1);
  assert.equal(r.itens[0].tipo, 'esfihas');
  assert.equal(r.itens[0].esfihas_total, 10);
});

test('mensagem do site: nome e telefone lidos do texto (comanda não sai como Cliente Balcão)', () => {
  const txt = '🛎️ *NOVO PEDIDO - SITE OFICIAL*\n📅 20/10/2026 às 18:54\n\n👤 *Cliente:* Marcos Silva\n📞 *Telefone:* (15) 99999-1234\n\n🍕 *PEDIDO:*\n';
  assert.deepEqual(extrairClienteDoSite(txt), { nome: 'Marcos Silva', telefone: '(15) 99999-1234' });
  assert.deepEqual(extrairClienteDoSite('quero uma calabresa'), { nome: null, telefone: null });
  assert.equal(extrairClienteDoSite('👤 *Cliente:* Zé\n').nome, 'Zé');
});

test('valor combinado na conversa: "Fica 60 tudo" vira o total; tempo e perguntas não', () => {
  assert.equal(extrairValorCombinado('Quanto ficou ?\nFica 60 tudo\nPrecisa de troco\nPix'), 60);
  assert.equal(extrairValorCombinado('deu 85,50 com a entrega'), 85.5);
  assert.equal(extrairValorCombinado('o total é R$ 72'), 72);
  assert.equal(extrairValorCombinado('fica 20 minutos pra chegar'), null);
  assert.equal(extrairValorCombinado('Quanto ficou ?'), null);
  assert.equal(extrairValorCombinado('Eu quero 1 pizza grande'), null);
});

test('"uma esfirra doce" é 1 esfiha (não combo de 10) e pede pra confirmar o sabor', () => {
  const r = completarEsfihas({ itens: [] }, 'Quero tambem uma esfirra doce por favor');
  assert.equal(r.itens[0].esfihas_total, 1);
  assert.match(r.itens[0].observacao, /Confete ou Brigadeiro/);
  assert.equal(completarEsfihas({ itens: [] }, 'duas esfihas').itens[0].esfihas_total, 2);
  assert.equal(completarEsfihas({ itens: [] }, 'queria um combo de esfiha').itens[0].esfihas_total, 10);
});

test('conversa copiada do WhatsApp: nome do cliente vem do remetente (não do atendente)', () => {
  const a = '[18:52, 20/10/2026] Alex Sandro: Boa noite, tudo bem?\n[18:52, 20/10/2026] Alex Sandro: Eu quero 1 pizza grande\n[18:53, 20/10/2026] Você: Ok\n[19:02, 20/10/2026] Você: Fica 60 tudo';
  assert.deepEqual(extrairClienteDoWhatsapp(a), { nome: 'Alex Sandro', telefone: null });
  const b = '20/10/2026 18:52 - ~ Maria José: quero uma calabresa\n20/10/2026 18:53 - Pizza em Dobro: ok';
  assert.equal(extrairClienteDoWhatsapp(b).nome, 'Maria José');
  const c = '[18:52, 20/10/2026] +55 15 99123-4567: oi\n[18:53, 20/10/2026] Você: oi';
  assert.deepEqual(extrairClienteDoWhatsapp(c), { nome: null, telefone: '+55 15 99123-4567' });
  assert.deepEqual(extrairClienteDoWhatsapp('Boa noite, eu quero 1 pizza grande'), { nome: null, telefone: null });
});

test('refri: qualquer pedido de Coca/Fanta vira a garrafa de 1.5L (única do cardápio); Kuat 2L continua Kuat', () => {
  const t = src.slice(src.indexOf('function _normNome'), src.indexOf('const _acharBorda'));
  const MENU = [{ n: 'Coca-Cola 1.5L', cat: 'd' }, { n: 'Fanta 1.5L', cat: 'd' }, { n: 'Kuat 2L', cat: 'd' }, { n: 'Calabresa', cat: 'p' }];
  const acharItem = new Function('DEFAULT_MENU', t + '; return _acharItem;')(MENU);
  for (const pedido of ['Coca 2L', 'coca 2 litros', 'Coca-Cola lata', 'coca', 'Coca Cola 2l']) assert.equal(acharItem(pedido)?.n, 'Coca-Cola 1.5L', pedido);
  assert.equal(acharItem('Fanta 2L')?.n, 'Fanta 1.5L');
  assert.equal(acharItem('Kuat 2L')?.n, 'Kuat 2L');
  assert.equal(acharItem('Guaraná'), null);
});

test('pedido pronto com preço: lê o preço de cada item nos formatos mais comuns', () => {
  const t = src.slice(src.indexOf('function _normNome'), src.indexOf('// ── Rede de segurança do combo de esfihas'));
  const { precosDoTexto, precoDoItemNoTexto } = new Function('DEFAULT_MENU', 'BORDAS_DEFAULT', 'ACRESCIMOS_DEFAULT', t + '; return { precosDoTexto, precoDoItemNoTexto };')([], [], []);
  // formato do site (WhatsApp)
  const site = '🛎️ *NOVO PEDIDO - SITE OFICIAL*\n*• Pizza Especial da Casa*\n  💰 R$ 54,90\n\n*• Guaraná Antarctica 2L*\n  💰 R$ 14,00\n🚚 🛵 *ENTREGA:* R$ 8,00\n💰 *TOTAL: R$ 76,90*';
  assert.deepEqual(precosDoTexto(site).map((e) => [e.nome, e.preco]), [['Pizza Especial da Casa', 54.9], ['Guaraná Antarctica 2L', 14]]);
  assert.equal(precoDoItemNoTexto(site, 'Guarana Antarctica 2L').unit, 14);
  // mesma linha, com quantidade (preço da linha é o total: divide pela quantidade)
  const linha = '1x Calzone de Chocolate ..... R$ 39,90\n2x Coca 2L R$ 24,00\nTaxa de entrega R$ 8,00\nTotal R$ 71,90';
  assert.equal(precoDoItemNoTexto(linha, 'Calzone de Chocolate').unit, 39.9);
  assert.equal(precoDoItemNoTexto(linha, 'Coca 2L').unit, 12);
  assert.equal(precoDoItemNoTexto(linha, 'Total'), null, 'total/taxa não viram item');
  // "nome - 45,00" sem R$
  assert.equal(precoDoItemNoTexto('Pizza de Strogonoff - 52,00', 'Strogonoff').unit, 52);
  // item que não aparece com preço na mensagem continua sem preço (vai pro CONFERIR)
  assert.equal(precoDoItemNoTexto(linha, 'Pizza de Atum'), null);
});

// ── comanda da casa colada de volta + coca 2L → 1.5L ──
const _menuSrc = fs.readFileSync(__dirname + '/../js/core-data.js', 'utf8');
const DEFAULT_MENU = new Function(_menuSrc.slice(_menuSrc.indexOf('const DEFAULT_MENU=['), _menuSrc.indexOf('];', _menuSrc.indexOf('const DEFAULT_MENU=[')) + 2) + '; return DEFAULT_MENU;')();
const _ajuda = src.slice(src.indexOf('function _normNome'), src.indexOf('function precosDoTexto'));
const _comanda = src.slice(src.indexOf('function lerComandaDaCasa'), src.indexOf('// ── Rede de segurança do combo de esfihas'));
const { lerComandaDaCasa, _acharItem } = new Function('DEFAULT_MENU', 'BORDAS_DEFAULT', 'ACRESCIMOS_DEFAULT', _ajuda + _comanda + '; return { lerComandaDaCasa, _acharItem };')(DEFAULT_MENU, [], []);

test('cupom da casa colado de volta (nome solto, item em 2 linhas, preço embaixo) é lido sem IA', () => {
  const r = lerComandaDaCasa(`PEDIDO 1 ENTREGA
05/11 18:28 PIZZA EM DOBRO
Ney
TOTAL R$ 99,98
Cartão de Débito
José Maria Cerdeira Filho, nº 73, Entrar na Mazzei
1x Franqueijo
Piry
R$ 45,99
1x Toscana Piry
R$ 45,99
Entrega R$ 8,00
TOTAL R$ 99,98
Pagto: Cartão de Débito`);
  assert.equal(r.cliente.nome, 'Ney');
  assert.equal(r.entrega, 'entrega');
  assert.equal(r.pagamento.forma_principal, 'Cartão de Débito');
  assert.deepEqual([r.cliente.endereco.rua, r.cliente.endereco.numero, r.cliente.endereco.complemento], ['José Maria Cerdeira Filho', '73', 'Entrar na Mazzei']);
  assert.deepEqual(r.itens.map((i) => i.nome_cardapio + '|' + i.qtd), ['Franqueijo Piry|1', 'Toscana Piry|1']);
  assert.match(r._textoLimpo, /1x Franqueijo Piry R\$ 45,99/);
});
test('cupom com acento perdido na impressão ("Cartu de Dbito") ainda é entendido; texto comum não é comanda', () => {
  const r = lerComandaDaCasa('PEDIDO 7 RETIRADA\n05/11 19:00 PIZZA EM DOBRO\nAna\nTOTAL R$ 33,99\nPagto: Cartu de Dbito\n1x Calabresa R$ 33,99');
  assert.equal(r.pagamento.forma_principal, 'Cartão de Débito'); assert.equal(r.entrega, 'retirada');
  assert.equal(lerComandaDaCasa('oi quero uma calabresa'), null);
});
test('coca de 2L (ou lata, ou só coca) vira a Coca-Cola 1.5L', () => {
  for (const t of ['Coca 2L', 'coca de 2 litros', 'coca lata', 'Coca-Cola 2L', 'coca']) assert.equal(_acharItem(t).n, 'Coca-Cola 1.5L', t);
  assert.equal(_acharItem('Kuat 2L').n, 'Kuat 2L');
});
