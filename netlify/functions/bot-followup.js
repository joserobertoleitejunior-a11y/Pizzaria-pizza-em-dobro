// Tarefa agendada (netlify.toml: a cada 5 min) — mesmo código do Cloudflare (server/bot-followup.js)
const { handler } = require('../../server/bot-followup');
exports.handler = async () => handler({ httpMethod: 'POST', headers: {}, body: '', queryStringParameters: {} });
