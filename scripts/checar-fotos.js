// Confere se as fotos estão se repetindo: mostra quantas vezes cada foto aparece em cada vídeo e na semana.
// Uso: node scripts/checar-fotos.js     (avisa se a mesma foto aparece 2x no mesmo vídeo ou em 2 vídeos da semana)
const fs = require('fs'), path = require('path'); const dir = path.join(__dirname, '..', 'video');
const uso = {}, porVideo = {};
fs.readdirSync(dir).filter(f => /^(segunda|terca|quarta|quinta|sexta|sabado|domingo)\.html$/.test(f)).forEach(f => {
  const t = fs.readFileSync(path.join(dir, f), 'utf8'), v = f.replace('.html', '');
  [...t.matchAll(/(?:foto|clip):'([^']+)'/g)].forEach(m => { (uso[m[1]] = uso[m[1]] || {})[v] = (uso[m[1]][v] || 0) + 1; (porVideo[v] = porVideo[v] || []).push(m[1]); });
});
let avisos = 0;
Object.entries(uso).forEach(([foto, vs]) => { const total = Object.values(vs).reduce((a, b) => a + b, 0);
  Object.entries(vs).forEach(([v, n]) => { if (n > 1) { console.log(`⚠ ${foto} aparece ${n}× no vídeo ${v} — traga mais fotos`); avisos++; } });
  if (Object.keys(vs).length > 1) { console.log(`⚠ ${foto} repete em: ${Object.keys(vs).join(', ')}`); avisos++; } });
Object.entries(porVideo).forEach(([v, l]) => console.log(`${v}: ${new Set(l).size} foto(s) diferente(s) em ${l.length} cena(s)`));
console.log(avisos ? `\n${avisos} aviso(s) de repetição.` : '\nSem repetição: cada foto aparece uma vez na semana.');
