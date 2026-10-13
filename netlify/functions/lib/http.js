// Respostas JSON + validação de entrada compartilhadas pelas functions do backend.

function json(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) };
}

function lerCorpo(event) {
  try { return JSON.parse(event.body || '{}'); } catch { return null; }
}

// texto livre vindo de fora: corta tamanho e remove < > (nenhuma tela precisa deles, e
// é o que viraria HTML/script quando o Caixa ou o painel renderiza o dado)
function texto(v, max) {
  if (v === undefined || v === null) return null;
  const s = String(v).replace(/[<>]/g, '').trim().slice(0, max);
  return s || null;
}

function numero(v, min, max) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return Math.round(n * 100) / 100;
}

function hojeBrasilia(d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(d);
}

module.exports = { json, lerCorpo, texto, numero, hojeBrasilia };
