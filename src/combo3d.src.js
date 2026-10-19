// Vitrine 3D dos combos: duas pizzas girando devagar numa ÚNICA cena three.js (só o que é usado
// entra no bundle — veja `npm run build:3d`). Feito pra não pesar:
//  • carrega só depois da splash, quando o navegador está ocioso, e só se o aparelho aguenta;
//  • resolução limitada (1x–1.5x), sem antialias em tela densa, sem sombras, 2 malhas simples;
//  • desenha no máximo 30 quadros/s e PARA de desenhar quando sai da tela ou a aba fica escondida;
//  • "reduzir movimento" do sistema → desenha 1 quadro parado.
import {
  WebGLRenderer, Scene, PerspectiveCamera, CylinderGeometry, Mesh, MeshLambertMaterial,
  CanvasTexture, AmbientLight, DirectionalLight, Group, SRGBColorSpace
} from 'three';

function texturaPizza(corMolho, pepperoni) {
  const T = 256, c = document.createElement('canvas');
  c.width = c.height = T;
  const g = c.getContext('2d'), m = T / 2;
  g.fillStyle = '#D99A48'; g.beginPath(); g.arc(m, m, m, 0, 7); g.fill();            // borda
  g.fillStyle = corMolho; g.beginPath(); g.arc(m, m, m * 0.86, 0, 7); g.fill();     // molho
  g.fillStyle = '#F6CB62'; g.beginPath(); g.arc(m, m, m * 0.8, 0, 7); g.fill();     // queijo
  // queijo "derretido": manchas mais claras/escuras
  for (let i = 0; i < 26; i++) {
    const a = i * 2.4, r = (i % 7) / 7 * m * 0.7;
    g.fillStyle = i % 2 ? 'rgba(255,238,170,.55)' : 'rgba(224,160,60,.4)';
    g.beginPath(); g.arc(m + Math.cos(a) * r, m + Math.sin(a) * r, 9 + (i % 4) * 4, 0, 7); g.fill();
  }
  for (let i = 0; i < 9; i++) {                                                      // coberturas
    const a = i * 0.7 + 0.3, r = (i % 3 + 1) * m * 0.22;
    g.fillStyle = pepperoni; g.beginPath(); g.arc(m + Math.cos(a) * r, m + Math.sin(a) * r, 15, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,.22)'; g.beginPath(); g.arc(m + Math.cos(a) * r - 4, m + Math.sin(a) * r - 4, 4, 0, 7); g.fill();
  }
  const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; return t;
}

function pizza(corMolho, pepperoni) {
  const topo = new MeshLambertMaterial({ map: texturaPizza(corMolho, pepperoni) });
  const lado = new MeshLambertMaterial({ color: 0xC98A3E });
  const m = new Mesh(new CylinderGeometry(1, 1, 0.14, 40, 1), [lado, topo, lado]);
  const inclina = new Group();            // inclina o conjunto pra câmera ver o topo...
  inclina.rotation.x = 1.0;
  inclina.add(m);                          // ...e a pizza gira em volta do próprio eixo (Y do cilindro)
  inclina.userData.gira = m;
  return inclina;
}

export function iniciar(container) {
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  let renderer;
  try {
    renderer = new WebGLRenderer({ alpha: true, antialias: dpr < 1.25, powerPreference: 'low-power' });
  } catch (e) { return false; }
  renderer.setPixelRatio(dpr);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  container.appendChild(renderer.domElement);

  const cena = new Scene();
  const cam = new PerspectiveCamera(35, 2, 0.1, 20);
  cam.position.set(0, 0, 6);
  cena.add(new AmbientLight(0xffffff, 1.25));
  const sol = new DirectionalLight(0xffffff, 1.6); sol.position.set(2, 4, 5); cena.add(sol);

  const a = pizza('#B3261E', '#9E2B1F'), b = pizza('#C8341C', '#7C2A1B');
  const grupo = new Group(); grupo.add(a, b); cena.add(grupo);
  a.position.set(-1.3, 0.35, 0); b.position.set(1.3, 0.3, 0);

  function medir() {
    const w = container.clientWidth || 320, h = container.clientHeight || 150;
    renderer.setSize(w, h, false);
    cam.aspect = w / h;
    // enquadra as duas pizzas mesmo em telas bem estreitas
    cam.position.z = Math.max(5.6, 5.6 * (2.0 / Math.min(cam.aspect, 2.0)));
    cam.updateProjectionMatrix();
  }
  medir();
  window.addEventListener('resize', medir, { passive: true });

  let visivel = false, rodando = false, ultimo = 0;
  const parado = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function desenha(t) {
    const s = t / 1000;
    a.userData.gira.rotation.y = s * 0.5; b.userData.gira.rotation.y = -s * 0.5 + 1;
    grupo.position.y = Math.sin(s * 1.2) * 0.08;
    renderer.render(cena, cam);
  }
  function loop(t) {
    if (!visivel || document.hidden) { rodando = false; return; }
    requestAnimationFrame(loop);
    if (t - ultimo < 33) return; // ~30 quadros/s
    ultimo = t; desenha(t);
  }
  function acorda() { if (!rodando && visivel && !parado) { rodando = true; requestAnimationFrame(loop); } }
  desenha(0);
  container.classList.add('c3d-pronto');
  if (typeof IntersectionObserver !== 'undefined') {
    new IntersectionObserver(es => { visivel = es[0].isIntersecting; acorda(); }, { threshold: 0.05 }).observe(container);
  } else { visivel = true; acorda(); }
  document.addEventListener('visibilitychange', acorda);
  renderer.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); visivel = false; container.classList.remove('c3d-pronto'); });
  return true;
}
window.Combo3D = { iniciar };
