const test = require('node:test');
const assert = require('node:assert/strict');
const { ZONAS_ENTREGA, TAXAS_VALIDAS, acharBairroNoTexto, taxaDoBairro } = require('../shared/utils.js');

test('tabela de entrega: 4 zonas, 62 bairros, taxas 8/9/10/15 (arte oficial)', () => {
  assert.deepEqual(ZONAS_ENTREGA.map((z) => z.taxa), [8, 9, 10, 15]);
  assert.equal(ZONAS_ENTREGA.reduce((t, z) => t + z.bairros.length, 0), 62);
  assert.deepEqual(TAXAS_VALIDAS, [8, 9, 10, 15]);
});
test('reconhece o bairro dentro de um endereço completo (acento, Jd./Jardim, numeral)', () => {
  const t = (txt) => { const r = acharBairroNoTexto(txt); return r && [r.bairro, r.zona, r.taxa].join('|'); };
  assert.equal(t('Rua Alcina Vasconcelos Ferrari, Vila Nastri, Itapetininga - SP'), 'Vila Nastri I|1|8');
  assert.equal(t('R. das Flores, 120 - Jardim Deise, Itapetininga'), 'Jd. Deise|1|8');
  assert.equal(t('Av. X, Jd. Brasil'), 'Jd. Brasil|2|9');
  assert.equal(t('Estrada da Chapada, Chapada Grande'), 'Chapada Grande|4|15');
  assert.equal(t('Rua A, PACAEMBU 2'), 'Pacaembu 2|3|10');
  assert.equal(t('Rua A, Vila Nastri II'), 'Vila Nastri II|1|8');
  assert.equal(t('Rua Y, Cambui'), 'Cambuí|1|8');
});
test('bairro fora da tabela não é reconhecido (nada de chute)', () => {
  assert.equal(acharBairroNoTexto('Rua Z, Centro, Itapetininga'), null);
  assert.equal(acharBairroNoTexto(''), null);
  assert.equal(taxaDoBairro('Centro'), null);
  assert.equal(taxaDoBairro('Itacol'), 15);
});
