// Reconhece o aparelho e prepara a página ANTES de pintar (carregado no <head>):
//  • html[data-disp]  = celular | tablet | desktop   (pela tela e por toque, não por "marca")
//  • html[data-leve]  = "1" em aparelho fraco (pouca memória/CPU, "economizar dados") → o site
//                       dispensa o 3D e deixa animações mais simples
//  • --vh / --vw      = altura/largura REAIS da tela visível (resolve a barra do navegador do celular)
//  • bloqueio de zoom (pinça e duplo toque) — junto do meta viewport e do touch-action no CSS
(function () {
  var h = document.documentElement;
  function medir() {
    var w = window.innerWidth || h.clientWidth, alt = window.innerHeight || h.clientHeight;
    var toque = (navigator.maxTouchPoints || 0) > 0 || 'ontouchstart' in window;
    var menor = Math.min(w, alt);
    var disp = (toque && menor < 600) ? 'celular' : (toque && w < 1100) ? 'tablet' : (w < 700 ? 'celular' : w < 1100 ? 'tablet' : 'desktop');
    h.setAttribute('data-disp', disp);
    h.setAttribute('data-orient', w > alt ? 'paisagem' : 'retrato');
    h.style.setProperty('--vh', (alt * 0.01) + 'px');
    h.style.setProperty('--vw', (w * 0.01) + 'px');
  }
  medir();
  var t;
  function agenda() { clearTimeout(t); t = setTimeout(medir, 120); }
  window.addEventListener('resize', agenda, { passive: true });
  window.addEventListener('orientationchange', agenda, { passive: true });

  var c = navigator.connection || {};
  var fraco = (navigator.deviceMemory && navigator.deviceMemory <= 3) ||
    (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
    c.saveData === true || /(^|-)2g$/.test(c.effectiveType || '');
  if (fraco) h.setAttribute('data-leve', '1');

  // Zoom: pinça (iOS dispara gesture*, Android dispara touchmove com 2 dedos), Ctrl+roda e Ctrl +/−/0.
  function barra(e) { e.preventDefault(); }
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(function (n) { document.addEventListener(n, barra); });
  document.addEventListener('touchmove', function (e) { if (e.touches && e.touches.length > 1) e.preventDefault(); }, { passive: false });
  document.addEventListener('wheel', function (e) { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '-' || e.key === '=' || e.key === '0')) e.preventDefault();
  });
})();
