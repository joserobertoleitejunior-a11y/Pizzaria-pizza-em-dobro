// Testa a migração automática das chaves de API pra config_secrets/bot (ver
// netlify/functions/lib/secrets.js). Simula o Firestore com um mock em memória —
// sem isso, uma mudança aqui só seria descoberta ao vivo, na primeira mensagem do bot.
const test = require('node:test');
const assert = require('node:assert/strict');
const admin = require('firebase-admin');
if (!admin.firestore.FieldValue) admin.firestore.FieldValue = {};
admin.firestore.FieldValue.delete = () => ({ _delete: true });

const { getSecrets, CAMPOS_SECRETOS } = require('../netlify/functions/lib/secrets.js');

function makeDb(initial) {
  const store = JSON.parse(JSON.stringify(initial));
  return {
    collection(name) {
      return {
        doc(id) {
          const key = name + '/' + id;
          return {
            async get() { return { exists: !!store[key], data: () => store[key] }; },
            async set(data) { store[key] = { ...(store[key] || {}), ...data }; },
            async update(data) {
              if (!store[key]) throw new Error('doc inexistente: ' + key);
              Object.keys(data).forEach(k => {
                const v = data[k];
                if (v && v._delete) delete store[key][k]; else store[key][k] = v;
              });
            }
          };
        }
      };
    },
    _store: store
  };
}

test('getSecrets migra as chaves da doc legada uma única vez e limpa de lá', async () => {
  const db = makeDb({ 'config/bot': { anthropicKey: 'sk-ant-1', evolutionKey: 'evo-1', mensagemFechado: 'texto público' } });

  const primeira = await getSecrets(db);
  assert.equal(primeira.anthropicKey, 'sk-ant-1');
  assert.equal(primeira.evolutionKey, 'evo-1');

  // a doc pública não deve mais ter as chaves secretas depois da migração
  assert.equal(db._store['config/bot'].anthropicKey, undefined);
  assert.equal(db._store['config/bot'].evolutionKey, undefined);
  assert.equal(db._store['config/bot'].mensagemFechado, 'texto público'); // campo público intocado

  const segunda = await getSecrets(db);
  assert.deepEqual(segunda, primeira);
});

test('getSecrets não migra o que já não existe na doc legada (evita sobrescrever com undefined)', async () => {
  const db = makeDb({
    'config_secrets/bot': { anthropicKey: 'sk-ant-ja-migrada' },
    'config/bot': { evolutionKey: 'evo-novo-na-legada' }
  });
  const secrets = await getSecrets(db);
  assert.equal(secrets.anthropicKey, 'sk-ant-ja-migrada'); // preservada
  assert.equal(secrets.evolutionKey, 'evo-novo-na-legada'); // migrada agora
  assert.equal(CAMPOS_SECRETOS.includes('geminiKey'), true);
});
