// ══════════════════════════════════════════════════════════
//  IA BARATA — assistente do gerente e análise do dashboard usam o modelo BÁSICO (Haiku),
//  pedido do José: "um modelo básico responda e analise, não um modelo caro".
//  Claude Haiku 5.5 (US$ 0,10 / 0,50 por milhão de tokens) com esforço baixo; se ele não
//  estiver disponível na conta, cai pro Haiku 4.5. Se a pesquisa na internet não for aceita
//  pelo modelo, tenta de novo sem ela.
// ══════════════════════════════════════════════════════════
const MODELOS = [
  { id: 'claude-haiku-5-5', extra: { output_config: { effort: 'low' } } },
  { id: 'claude-haiku-4-5', extra: {} } // sem output_config: o Haiku 4.5 não aceita "effort"
];

async function chamarClaude(chave, { system, messages, tools, max_tokens }) {
  let semBusca = false;
  for (let i = 0; i < MODELOS.length; i++) {
    const m = MODELOS[i];
    const usar = (tools || []).filter(t => !(semBusca && t.name === 'web_search'));
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': chave, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: m.id, max_tokens, system, messages,
        ...(usar.length ? { tools: usar } : {}),
        ...m.extra
      })
    });
    const data = await resp.json();
    if (data?.type !== 'error') return data;
    const tipo = data.error?.type, msg = String(data.error?.message || '');
    console.error('ERRO da API da Anthropic (' + m.id + '):', JSON.stringify(data.error));
    if (tipo === 'invalid_request_error' && /web_search/i.test(msg) && !semBusca) { semBusca = true; i--; continue; }
    if ((tipo === 'not_found_error' || (tipo === 'invalid_request_error' && /model|output_config|effort/i.test(msg))) && i < MODELOS.length - 1) continue;
    return data;
  }
}

module.exports = { chamarClaude, MODELOS };
