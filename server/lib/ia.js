// ══════════════════════════════════════════════════════════
//  IA DO PAINEL — assistente do gerente e análise do Dashboard.
//  1º tenta o GEMINI (camada GRÁTIS do Google) se a chave dele estiver configurada;
//  se o Gemini falhar (limite grátis, instabilidade) e houver chave da Anthropic, cai pra ela.
//  A resposta volta no formato da Anthropic ({content:[{type:'text'|'tool_use'}], stop_reason}),
//  então o resto do código não precisa saber qual IA respondeu.
// ══════════════════════════════════════════════════════════
const { chamarClaude } = require('./claude');

const MODELOS_GEMINI = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.5-flash-lite'];

// schema da Anthropic → schema do Gemini (aceita só um subconjunto do OpenAPI)
function esquemaGemini(s) {
  if (!s || typeof s !== 'object') return s;
  const out = {};
  if (s.type) out.type = s.type;
  if (s.description) out.description = s.description;
  if (s.enum) out.enum = s.enum;
  if (s.required) out.required = s.required;
  if (s.properties) { out.properties = {}; Object.entries(s.properties).forEach(([k, v]) => { out.properties[k] = esquemaGemini(v); }); }
  if (s.items) out.items = esquemaGemini(s.items);
  return out;
}

// mensagens no formato Anthropic → "contents" do Gemini
function conteudoGemini(messages) {
  const nomePorId = {};
  const contents = [];
  for (const m of messages) {
    if (typeof m.content === 'string') {
      contents.push({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] });
      continue;
    }
    if (m.role === 'assistant') {
      const parts = [];
      for (const b of m.content || []) {
        if (b._raw) { parts.push(b._raw); if (b.type === 'tool_use') nomePorId[b.id] = b.name; continue; }
        if (b.type === 'text' && b.text) parts.push({ text: b.text });
        if (b.type === 'tool_use') { nomePorId[b.id] = b.name; parts.push({ functionCall: { name: b.name, args: b.input || {} } }); }
      }
      if (parts.length) contents.push({ role: 'model', parts });
    } else {
      const parts = [];
      for (const b of m.content || []) {
        if (b.type === 'tool_result') parts.push({ functionResponse: { name: nomePorId[b.tool_use_id] || 'ferramenta', response: { resultado: String(b.content == null ? '' : b.content) } } });
        else if (b.type === 'text') parts.push({ text: b.text });
      }
      if (parts.length) contents.push({ role: 'user', parts });
    }
  }
  return contents;
}

function tipoErroGemini(status, e) {
  const st = String(e?.status || ''), msg = String(e?.message || '');
  if (status === 429 || st === 'RESOURCE_EXHAUSTED') return 'rate_limit_error';
  if (status === 503 || st === 'UNAVAILABLE') return 'overloaded_error';
  if (status === 404 || st === 'NOT_FOUND') return 'not_found_error';
  if (status === 401 || status === 403 || /API key|permission/i.test(msg)) return 'authentication_error';
  return 'api_error';
}

async function chamarGemini(chave, { system, messages, ferramentas, busca, max_tokens }) {
  const corpoBase = {
    systemInstruction: { parts: [{ text: String(system || '') }] },
    contents: conteudoGemini(messages),
    generationConfig: { maxOutputTokens: max_tokens || 4000, temperature: 0.2 } // baixa: números e fatos, sem inventar
  };
  if (ferramentas && ferramentas.length) {
    // o Gemini não mistura pesquisa na internet com ferramentas de função: com ferramentas, só elas
    corpoBase.tools = [{ functionDeclarations: ferramentas.map(f => ({ name: f.name, description: f.description, parameters: esquemaGemini(f.input_schema) })) }];
  } else if (busca) {
    corpoBase.tools = [{ google_search: {} }];
  }
  let ultimo = null;
  // Chaves novas do Google começam com "AQ." (em vez de "AIza"): se a API do AI Studio recusar a chave,
  // tenta o endereço da Vertex AI (modo expresso), que aceita esse formato.
  const ehAQ = String(chave).startsWith('AQ.');
  let usarVertex = false;
  for (let i = 0; i < MODELOS_GEMINI.length; i++) {
    const modelo = MODELOS_GEMINI[i];
    const url = usarVertex
      ? 'https://aiplatform.googleapis.com/v1/publishers/google/models/' + modelo + ':generateContent'
      : 'https://generativelanguage.googleapis.com/v1beta/models/' + modelo + ':generateContent';
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': chave },
      body: JSON.stringify(corpoBase)
    });
    let data = {};
    try { data = await resp.json(); } catch (_) { /* resposta sem JSON */ }
    if (resp.ok && !data.error) {
      const partes = data.candidates?.[0]?.content?.parts || [];
      const content = [];
      partes.forEach((p, i) => {
        if (p.thought) return;
        if (p.text) content.push({ type: 'text', text: p.text });
        else if (p.functionCall) content.push({ type: 'tool_use', id: 'g' + Date.now() + '_' + i, name: p.functionCall.name, input: p.functionCall.args || {}, _raw: p });
      });
      if (!content.length) {
        const motivo = data.candidates?.[0]?.finishReason || data.promptFeedback?.blockReason || 'sem resposta';
        ultimo = { type: 'error', error: { type: 'api_error', message: 'O Gemini não devolveu texto (' + motivo + ').' } };
        continue;
      }
      return { content, stop_reason: content.some(b => b.type === 'tool_use') ? 'tool_use' : 'end_turn', _provedor: 'gemini ' + modelo };
    }
    const tipo = tipoErroGemini(resp.status, data.error);
    console.error('ERRO do Gemini (' + modelo + '):', JSON.stringify(data.error || { status: resp.status }));
    ultimo = { type: 'error', error: { type: tipo, message: String(data.error?.message || ('HTTP ' + resp.status)).slice(0, 300) } };
    if (tipo === 'authentication_error') {
      if (ehAQ && !usarVertex) { usarVertex = true; i = -1; continue; } // recomeça a lista pelo endereço da Vertex
      return ultimo;                                                    // chave ruim: não adianta trocar de modelo
    }
    // limite/instabilidade/modelo sumiu: tenta o próximo modelo da lista
  }
  return ultimo;
}

// system: texto. ferramentas: ferramentas de função (formato Anthropic). busca: pesquisa na internet.
async function chamarIA(secrets, { system, messages, ferramentas, busca, max_tokens, cache }) {
  let erroGemini = null;
  if (secrets.geminiKey) {
    const r = await chamarGemini(secrets.geminiKey, { system, messages, ferramentas, busca, max_tokens });
    if (r.type !== 'error') return r;
    erroGemini = r;
    if (!secrets.anthropicKey) return r;
    console.warn('Gemini falhou, usando a Anthropic como reserva:', JSON.stringify(r.error));
  }
  if (!secrets.anthropicKey) return { type: 'error', error: { type: 'authentication_error', message: 'Nenhuma chave de IA configurada.' } };
  const tools = [...(busca ? [{ type: 'web_search_20250305', name: 'web_search' }] : []), ...(ferramentas || [])];
  const r = await chamarClaude(secrets.anthropicKey, {
    max_tokens: max_tokens || 4000,
    system: cache ? [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }] : system,
    messages, tools
  });
  if (r && r.type !== 'error') r._provedor = 'anthropic';
  // as duas falharam: devolve o erro da reserva, mas leva junto o motivo do Gemini pra aparecer na tela
  if (r && r.type === 'error' && erroGemini) r.error = { ...r.error, gemini: erroGemini.error };
  return r;
}

module.exports = { chamarIA, chamarGemini, conteudoGemini, esquemaGemini };
