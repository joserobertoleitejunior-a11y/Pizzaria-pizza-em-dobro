// O adaptador do Netlify (netlify/functions/api.js) roteia certo e não expõe o bot-followup.
process.env.GCLOUD_PROJECT = 'demo-pizza';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { handler } = require('../../netlify/functions/api');

const chama = (rota, corpo, metodo = 'POST') => handler({
  rawUrl: 'https://site.netlify.app/api/' + rota, httpMethod: metodo, headers: { 'x-nf-client-connection-ip': '1.2.3.4' },
  body: corpo == null ? null : (typeof corpo === 'string' ? corpo : JSON.stringify(corpo)), queryStringParameters: {}
});

test('rota inexistente e bot-followup por HTTP → 404', async () => {
  assert.equal((await chama('nao-existe', {})).statusCode, 404);
  assert.equal((await chama('bot-followup', {})).statusCode, 404);
  assert.equal((await chama('constructor', {})).statusCode, 404);
});
test('login da equipe pelo adaptador: marco/1234 entra, senha errada não', async () => {
  const ok = await chama('staff-login', { usuario: 'marco', senha: '1234' });
  assert.equal(ok.statusCode, 200);
  assert.ok(JSON.parse(ok.body).token);
  assert.equal((await chama('staff-login', { usuario: 'marco', senha: 'x' })).statusCode, 401);
});
test('rotas da equipe exigem login e corpo gigante é recusado', async () => {
  assert.equal((await chama('admin-api', { acao: 'resumo' })).statusCode, 401);
  assert.equal((await chama('criar-pedido', 'x'.repeat(2_000_000))).statusCode, 413);
});
