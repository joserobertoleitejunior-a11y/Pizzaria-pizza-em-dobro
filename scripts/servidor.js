// Servidor estático da raiz do projeto COM suporte a Range (necessário pro vídeo avançar quadro a quadro no render). Uso: node scripts/servidor.js [porta]
const http = require('http'), fs = require('fs'), path = require('path');
const RAIZ = path.join(__dirname, '..'), PORTA = +process.argv[2] || 8765;
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.webm': 'video/webm', '.mp4': 'video/mp4', '.mp3': 'audio/mpeg', '.ttf': 'font/ttf', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
http.createServer((req, res) => {
  let f = path.join(RAIZ, decodeURIComponent(req.url.split('?')[0])); if (!f.startsWith(RAIZ)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end('404'); }
  const tam = fs.statSync(f).size, tipo = TIPOS[path.extname(f)] || 'application/octet-stream', r = req.headers.range;
  if (r) { const m = /bytes=(\d*)-(\d*)/.exec(r), ini = m[1] ? +m[1] : 0, fim = m[2] ? Math.min(+m[2], tam - 1) : tam - 1;
    res.writeHead(206, { 'Content-Type': tipo, 'Content-Range': `bytes ${ini}-${fim}/${tam}`, 'Accept-Ranges': 'bytes', 'Content-Length': fim - ini + 1 }); fs.createReadStream(f, { start: ini, end: fim }).pipe(res); }
  else { res.writeHead(200, { 'Content-Type': tipo, 'Accept-Ranges': 'bytes', 'Content-Length': tam }); fs.createReadStream(f).pipe(res); }
}).listen(PORTA, () => console.log('servidor em http://localhost:' + PORTA));
