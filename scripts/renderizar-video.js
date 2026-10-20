// Renderiza um vídeo da pasta /video quadro a quadro (sem depender de tempo real) e junta a música com ffmpeg.
// Uso: node scripts/renderizar-video.js promocoes.html saida.mp4 36.5 video/musica-promocoes.mp3 [porta]
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const [, , pagina, saida, dur, musica, porta = '8765'] = process.argv;
const FPS = 30;
(async () => {
  const ffmpeg = require('child_process').execSync('python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())"').toString().trim();
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await (await b.newContext({ viewport: { width: 1080, height: 1920 } })).newPage();
  await p.goto(`http://localhost:${porta}/video/${pagina}?gravar`);
  await p.waitForFunction('window.quadro');
  await p.evaluate('document.fonts.ready');
  const args = ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-'];
  if (musica) args.push('-i', musica);
  args.push('-map', '0:v', ...(musica ? ['-map', '1:a'] : []), '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', String(FPS),
    ...(musica ? ['-c:a', 'aac', '-b:a', '192k'] : []), '-t', dur, '-movflags', '+faststart', saida);
  const ff = spawn(ffmpeg, args, { stdio: ['pipe', 'inherit', 'inherit'] });
  const total = Math.round(+dur * FPS);
  for (let i = 0; i < total; i++) {
    await p.evaluate(t => window.quadro(t), i / FPS);
    const img = await p.screenshot({ type: 'jpeg', quality: 96 });
    if (!ff.stdin.write(img)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 150 === 0) console.log('quadro', i, '/', total);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await b.close();
  console.log('pronto', saida);
})();
