// Testa a comparação de senha da equipe (netlify/functions/lib/senha.js) —
// crítica porque é a única porta de entrada pra Caixa/Relatórios/Clientes/
// bot-config/painel, que hoje não têm nenhuma outra proteção.
const test = require('node:test');
const assert = require('node:assert/strict');
const { senhaConfere } = require('../netlify/functions/lib/senha.js');

test('senhaConfere aceita a senha certa', () => {
  assert.equal(senhaConfere('pizza123', 'pizza123'), true);
});

test('senhaConfere rejeita senha errada do mesmo tamanho', () => {
  assert.equal(senhaConfere('pizza124', 'pizza123'), false);
});

test('senhaConfere rejeita senha de tamanho diferente sem quebrar', () => {
  assert.equal(senhaConfere('pizza', 'pizza123'), false);
  assert.equal(senhaConfere('pizza1234567890', 'pizza123'), false);
});

test('senhaConfere rejeita vazio/undefined sem lançar erro', () => {
  assert.equal(senhaConfere('', 'pizza123'), false);
  assert.equal(senhaConfere(undefined, 'pizza123'), false);
  assert.equal(senhaConfere('pizza123', ''), false);
});

test('senhaConfere é sensível a maiúsculas/minúsculas', () => {
  assert.equal(senhaConfere('Pizza123', 'pizza123'), false);
});
