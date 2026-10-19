/* FAIXA VERMELHA (atalhos do cardápio) — dinâmica, arrastável e clicável.
   Base: rolagem horizontal NATIVA do navegador (no celular o dedo arrasta com a inércia do sistema e
   o toque nos links sempre funciona). Por cima: anda sozinha da esquerda pra direita, dá "agarrar e
   arrastar" com o mouse, faz loop infinito (o conteúdo é clonado 4×) e pausa fora da tela/ao tocar. */
(function () {
  "use strict";
  function iniciar() {
    var faixa = document.querySelector(".hero-faixa");
    var trilho = faixa && faixa.querySelector(".hero-faixa-trilho");
    if (!trilho) return;

    // 4 cópias idênticas (as 3 extras são decorativas) — o loop sempre tem folga pros dois lados
    var base = Array.prototype.slice.call(trilho.children);
    for (var c = 0; c < 3; c++) {
      base.forEach(function (n) {
        var k = n.cloneNode(true);
        k.setAttribute("aria-hidden", "true");
        if (k.tagName === "A") { k.setAttribute("tabindex", "-1"); }
        trilho.appendChild(k);
      });
    }
    var larguraConjunto = 0;
    function medir() {
      var primeiro = base[0].getBoundingClientRect().left;
      var ultimo = base[base.length - 1].getBoundingClientRect();
      larguraConjunto = (ultimo.right - primeiro) + (parseFloat(getComputedStyle(base[base.length - 1]).marginRight) || 0);
      // o último item é o "✦" com respiro à direita; o próximo conjunto começa logo depois dele
      var segundo = trilho.children[base.length].getBoundingClientRect().left;
      larguraConjunto = segundo - primeiro;
    }
    function centralizar() { medir(); if (larguraConjunto > 0) faixa.scrollLeft = larguraConjunto; }
    window.addEventListener("resize", function () { var r = faixa.scrollLeft % (larguraConjunto || 1); medir(); faixa.scrollLeft = larguraConjunto + r; }, { passive: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(centralizar);
    centralizar();

    var reduz = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    var VELOCIDADE = 0.05; // px por ms, da esquerda pra direita (o conteúdo "anda" pra direita)
    var pos = faixa.scrollLeft;   // posição em decimal (scrollLeft só aceita inteiro em alguns navegadores)
    var visivel = true, tocando = false, quadro = null, ultimo = null, retomarEm = 0;

    // loop infinito: sempre mantém a posição dentro do 2º/3º conjunto (pula o tamanho de 1 conjunto, sem se notar)
    function dobrar() {
      if (larguraConjunto <= 0) return;
      var sl = faixa.scrollLeft;
      if (sl < larguraConjunto * 0.5) { faixa.scrollLeft = sl + larguraConjunto; pos = faixa.scrollLeft; }
      else if (sl > larguraConjunto * 2.5) { faixa.scrollLeft = sl - larguraConjunto; pos = faixa.scrollLeft; }
    }
    function passo(agora) {
      quadro = null;
      if (!visivel || document.hidden) { ultimo = null; return; }
      if (ultimo === null) ultimo = agora;
      var dt = Math.min(agora - ultimo, 64); ultimo = agora;
      if (!tocando && !reduz && agora >= retomarEm) {
        pos -= VELOCIDADE * dt;           // scrollLeft diminui = conteúdo anda pra direita
        faixa.scrollLeft = Math.round(pos);
        dobrar();
      } else { pos = faixa.scrollLeft; }
      quadro = requestAnimationFrame(passo);
    }
    function acordar() { if (!quadro) { ultimo = null; quadro = requestAnimationFrame(passo); } }
    function pausar(ms) { retomarEm = performance.now() + ms; pos = faixa.scrollLeft; }

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) { visivel = es[0].isIntersecting; if (visivel) acordar(); }, { threshold: 0 }).observe(faixa);
    }
    document.addEventListener("visibilitychange", acordar);

    // dedo: rolagem nativa; só pausa o automático enquanto toca e por um instante depois da inércia
    faixa.addEventListener("touchstart", function () { tocando = true; }, { passive: true });
    faixa.addEventListener("touchend", function () { tocando = false; pausar(1400); }, { passive: true });
    faixa.addEventListener("touchcancel", function () { tocando = false; pausar(1400); }, { passive: true });
    faixa.addEventListener("scroll", function () { if (tocando) pos = faixa.scrollLeft; }, { passive: true });
    faixa.addEventListener("wheel", function () { pausar(1200); }, { passive: true });

    // mouse: agarrar e arrastar (com pequena inércia); só vira "arrasto" depois de mexer 6px, assim o clique no link continua valendo
    var mouseDown = false, arrastou = false, x0 = 0, sl0 = 0, ultX = 0, ultT = 0, vel = 0, inercia = null;
    faixa.addEventListener("pointerdown", function (e) {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      mouseDown = true; arrastou = false; x0 = ultX = e.clientX; sl0 = faixa.scrollLeft; ultT = performance.now(); vel = 0;
      if (inercia) { cancelAnimationFrame(inercia); inercia = null; }
      tocando = true;
    });
    window.addEventListener("pointermove", function (e) {
      if (!mouseDown) return;
      var dx = e.clientX - x0;
      if (!arrastou && Math.abs(dx) > 6) { arrastou = true; faixa.classList.add("arrastando"); }
      if (arrastou) {
        faixa.scrollLeft = sl0 - dx;
        var antes = faixa.scrollLeft; dobrar(); sl0 += faixa.scrollLeft - antes; // se deu a volta do loop, acompanha o salto
        var agora = performance.now();
        vel = (e.clientX - ultX) / Math.max(agora - ultT, 1); ultX = e.clientX; ultT = agora;
      }
    });
    function soltar() {
      if (!mouseDown) return;
      mouseDown = false; faixa.classList.remove("arrastando");
      if (arrastou && Math.abs(vel) > 0.05 && !reduz) {
        var v = vel;
        (function girar() {
          faixa.scrollLeft -= v * 16; v *= 0.94; dobrar();
          if (Math.abs(v) > 0.02) inercia = requestAnimationFrame(girar);
          else { inercia = null; tocando = false; pausar(900); }
        })();
      } else { tocando = false; pausar(900); }
    }
    window.addEventListener("pointerup", soltar);
    window.addEventListener("pointercancel", soltar);
    // depois de um arrasto de verdade, o clique que sobra não pode abrir o link
    faixa.addEventListener("click", function (e) { if (arrastou) { e.preventDefault(); e.stopPropagation(); arrastou = false; } }, true);
    faixa.addEventListener("dragstart", function (e) { e.preventDefault(); });

    acordar();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
