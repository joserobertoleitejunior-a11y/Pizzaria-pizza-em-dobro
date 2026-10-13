// ══════════════════════════════════════════════════════════
//  OBSERVABILIDADE — manda o erro pro Sentry (se SENTRY_DSN existir) por fetch
//  puro: o SDK @sentry/node não roda no Cloudflare Workers. Sem DSN, só
//  console.error (aparece nos logs do Cloudflare). O envio é "solto" (não trava
//  a resposta); o Worker espera ele terminar depois via drenarRelatorios().
// ══════════════════════════════════════════════════════════
const pendentes = [];

function parseDsn(dsn) {
  try {
    const u = new URL(dsn);
    const projeto = u.pathname.replace(/^\/+/, '');
    return { chave: u.username, host: u.host, projeto, protocolo: u.protocol };
  } catch { return null; }
}

function reportError(err, contexto) {
  console.error(contexto ? `${contexto}:` : 'Erro:', err);
  const dsn = parseDsn(process.env.SENTRY_DSN || '');
  if (!dsn) return;
  const e = err instanceof Error ? err : new Error(String(err));
  const evento = {
    event_id: crypto.randomUUID().replace(/-/g, ''),
    timestamp: Date.now() / 1000,
    platform: 'javascript',
    level: 'error',
    tags: contexto ? { contexto } : undefined,
    exception: { values: [{ type: e.name, value: e.message, stacktrace: undefined }] },
    extra: { stack: String(e.stack || '').slice(0, 4000) }
  };
  pendentes.push(fetch(`${dsn.protocolo}//${dsn.host}/api/${dsn.projeto}/store/?sentry_version=7&sentry_key=${dsn.chave}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(evento)
  }).catch(() => {}));
}

function drenarRelatorios() {
  return Promise.allSettled(pendentes.splice(0));
}

module.exports = { reportError, drenarRelatorios };
