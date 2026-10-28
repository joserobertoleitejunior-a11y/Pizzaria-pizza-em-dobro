const test = require('node:test');
const assert = require('node:assert/strict');
const { chamarIA, conteudoGemini, esquemaGemini } = require('../server/lib/ia.js');

const respostaGemini = (parts) => ({ ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts }, finishReason: 'STOP' }] }) });
const erroHttp = (status, st, message) => ({ ok: false, status, json: async () => ({ error: { code: status, status: st, message } }) });
const ferramentas = [{ name: 'adicionar_item', description: 'x', input_schema: { type: 'object', properties: { nome: { type: 'string' }, cat: { type: 'string', enum: ['p', 's'] } }, required: ['nome'], additionalProperties: false } }];

test('Gemini: resposta de texto e chamada de ferramenta viram blocos no formato Anthropic', async () => {
  const antes = global.fetch; let corpo;
  global.fetch = async (url, init) => { corpo = JSON.parse(init.body); return respostaGemini([{ text: 'ok' }, { functionCall: { name: 'adicionar_item', args: { nome: 'Pizza X' } } }]); };
  const r = await chamarIA({ geminiKey: 'g' }, { system: 'S', messages: [{ role: 'user', content: 'oi' }], ferramentas, busca: true, max_tokens: 100 });
  global.fetch = antes;
  assert.equal(r.stop_reason, 'tool_use');
  assert.deepEqual(r.content.map(b => b.type), ['text', 'tool_use']);
  assert.equal(r.content[1].input.nome, 'Pizza X');
  assert.ok(corpo.tools[0].functionDeclarations, 'com ferramentas de função, sem google_search junto');
  assert.equal(corpo.tools[0].functionDeclarations[0].parameters.additionalProperties, undefined);
  assert.equal(corpo.systemInstruction.parts[0].text, 'S');
});

test('Gemini: sem ferramentas e com busca, usa pesquisa do Google', async () => {
  const antes = global.fetch; let corpo;
  global.fetch = async (url, init) => { corpo = JSON.parse(init.body); return respostaGemini([{ text: 'análise' }]); };
  const r = await chamarIA({ geminiKey: 'g' }, { system: 'S', messages: [{ role: 'user', content: 'x' }], busca: true });
  global.fetch = antes;
  assert.equal(r.content[0].text, 'análise');
  assert.deepEqual(corpo.tools, [{ google_search: {} }]);
});

test('histórico com tool_use/tool_result vira contents do Gemini (nome da função vem do id)', () => {
  const c = conteudoGemini([
    { role: 'user', content: 'adiciona' },
    { role: 'assistant', content: [{ type: 'tool_use', id: 'a1', name: 'adicionar_item', input: { nome: 'X' } }] },
    { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'a1', content: 'feito' }] }
  ]);
  assert.equal(c[1].role, 'model');
  assert.equal(c[1].parts[0].functionCall.name, 'adicionar_item');
  assert.equal(c[2].parts[0].functionResponse.name, 'adicionar_item');
  assert.equal(c[2].parts[0].functionResponse.response.resultado, 'feito');
});

test('limite do Gemini grátis: tenta os outros modelos e depois cai na Anthropic se houver chave', async () => {
  const antes = global.fetch; const chamadas = [];
  global.fetch = async (url) => {
    chamadas.push(String(url));
    if (String(url).includes('generativelanguage')) return erroHttp(429, 'RESOURCE_EXHAUSTED', 'quota');
    return { ok: true, status: 200, json: async () => ({ content: [{ type: 'text', text: 'da anthropic' }], stop_reason: 'end_turn' }) };
  };
  const r = await chamarIA({ geminiKey: 'g', anthropicKey: 'a' }, { system: 'S', messages: [{ role: 'user', content: 'x' }] });
  global.fetch = antes;
  assert.equal(r.content[0].text, 'da anthropic');
  assert.equal(chamadas.filter(u => u.includes('generativelanguage')).length, 3);
});

test('sem chave da Anthropic, o erro do Gemini volta pro chamador mostrar', async () => {
  const antes = global.fetch;
  global.fetch = async () => erroHttp(429, 'RESOURCE_EXHAUSTED', 'quota');
  const r = await chamarIA({ geminiKey: 'g' }, { system: 'S', messages: [{ role: 'user', content: 'x' }] });
  global.fetch = antes;
  assert.equal(r.type, 'error');
  assert.equal(r.error.type, 'rate_limit_error');
});

test('esquema: tira campos que o Gemini não aceita', () => {
  const e = esquemaGemini({ type: 'object', additionalProperties: false, properties: { a: { type: 'number', description: 'd' } }, required: ['a'] });
  assert.deepEqual(e, { type: 'object', properties: { a: { type: 'number', description: 'd' } }, required: ['a'] });
});
