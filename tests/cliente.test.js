const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizarTelefone } = require('../server/cliente.js');

test('normalizarTelefone aceita celular/fixo BR com máscara e +55', () => {
  assert.equal(normalizarTelefone('(15) 99705-8390'), '15997058390');
  assert.equal(normalizarTelefone('+55 15 99705-8390'), '15997058390');
  assert.equal(normalizarTelefone('1532221234'), '1532221234');
});
test('normalizarTelefone recusa número inválido', () => {
  assert.equal(normalizarTelefone('12345'), null);
  assert.equal(normalizarTelefone('(15) 89705-8390'), null);
  assert.equal(normalizarTelefone(''), null);
});
