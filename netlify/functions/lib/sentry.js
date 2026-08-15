// ══════════════════════════════════════════════════════════
//  OBSERVABILIDADE (Sentry) — desligado até vocês colarem o DSN
//  Padrão da agência: erro em produção precisa ser visível ANTES do
//  cliente reclamar. Hoje os erros das functions só vão pro log da
//  Netlify (ninguém olha isso todo dia). Isto liga captura de erro
//  em tempo real assim que SENTRY_DSN existir nas variáveis de
//  ambiente da Netlify — sem DSN, é 100% inofensivo (Sentry.init com
//  dsn undefined não faz nada, e reportError vira só um no-op).
// ══════════════════════════════════════════════════════════

const dsn = process.env.SENTRY_DSN || '';
let Sentry = null;
if (dsn) {
  Sentry = require('@sentry/node');
  Sentry.init({ dsn, tracesSampleRate: 0 });
}

function reportError(err, contexto) {
  console.error(contexto ? `${contexto}:` : 'Erro:', err);
  if (Sentry) {
    Sentry.captureException(err, contexto ? { tags: { contexto } } : undefined);
  }
}

module.exports = { reportError };
