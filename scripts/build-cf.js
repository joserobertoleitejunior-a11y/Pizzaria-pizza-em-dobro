// Monta dist/ com SÓ o que é público. O repositório tem código de servidor, testes, regras do
// banco e documentação interna — nada disso pode ser servido pela internet (no Netlify a pasta
// inteira era publicada). Rodado automaticamente pelo `wrangler deploy` (wrangler.jsonc → build).
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.join(__dirname, '..');
const DIST = path.join(RAIZ, 'dist');

const INCLUIR = ['index.html', 'painel.html', 'sw.js', 'manifest.json', 'manifest-painel.json', 'robots.txt', 'sitemap.xml', 'llms.txt',
  'assets', 'js', 'shared', 'caixa', 'relatorios', 'clientes', 'cupom', 'dashboard', 'admin'];
// existem no repositório mas o site não usa mais (fotos licenciadas de antes das artes geradas em código)
const NAO_PUBLICAR = new Set(['assets/fogo-fundo.mp4', 'assets/pizza-hero.jpg', 'assets/cardapio']);

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

let arquivos = 0;
for (const item of INCLUIR) {
  const origem = path.join(RAIZ, item);
  if (!fs.existsSync(origem)) throw new Error(`Falta ${item} — o build público ficaria incompleto.`);
  fs.cpSync(origem, path.join(DIST, item), {
    recursive: true,
    filter: (src) => {
      const rel = path.relative(RAIZ, src).split(path.sep).join('/');
      if (NAO_PUBLICAR.has(rel)) return false;
      const base = path.basename(src);
      if (base === '.DS_Store' || base.endsWith('.map') || base.endsWith('.md') || base.endsWith('.log')) return false;
      if (fs.statSync(src).isFile()) arquivos++;
      return true;
    }
  });
}

// Cabeçalhos de segurança/indexação (formato do Cloudflare Workers assets)
fs.writeFileSync(path.join(DIST, '_headers'), `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: SAMEORIGIN

/assets/*
  Cache-Control: public, max-age=86400

/admin/*
  X-Robots-Tag: noindex, nofollow
/caixa/*
  X-Robots-Tag: noindex, nofollow
/relatorios/*
  X-Robots-Tag: noindex, nofollow
/clientes/*
  X-Robots-Tag: noindex, nofollow
/dashboard/*
  X-Robots-Tag: noindex, nofollow
/painel.html
  X-Robots-Tag: noindex, nofollow
/cupom/*
  X-Robots-Tag: noindex, nofollow
`);

console.log(`dist/ pronto: ${arquivos} arquivos públicos.`);
