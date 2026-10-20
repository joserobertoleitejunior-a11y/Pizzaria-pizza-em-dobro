// Lê a configuração de um vídeo (video/*.html) e grava o roteiro de falas em JSON para scripts/gerar-audio-video.py.
// Uso: node scripts/exportar-roteiro.js promocoes.html roteiro.json [porta]
const { chromium } = require('playwright');
const [, , pagina, saida, porta = '8765'] = process.argv;
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage();
  await p.goto(`http://localhost:${porta}/video/${pagina}?gravar`);
  await p.waitForFunction('window.__cfg');
  const cfg = await p.evaluate('window.__cfg');
  const falas = (cfg.legendas || []).map(l => ({ t: +(l.t0 + 0.2).toFixed(2), ate: l.t1, texto: l.fala || l.html.replace(/<[^>]+>/g, '') }));
  if (cfg.fim && cfg.fim.fala) falas.push({ t: +(cfg.fim.t0 + 1.0).toFixed(2), ate: cfg.dur, texto: cfg.fim.fala });
  require('fs').writeFileSync(saida, JSON.stringify({ dur: cfg.dur, falas }, null, 1));
  console.log(falas.length, 'falas →', saida);
  await b.close();
})();
