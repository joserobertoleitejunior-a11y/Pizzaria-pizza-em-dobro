/* PROMOÇÕES IMPERDÍVEIS — carrossel de cartazes.
   Rolagem horizontal NATIVA (dedo arrasta com a inércia do celular e "gruda" em cada cartaz),
   mouse com "agarrar e arrastar", pontinhos indicando o cartaz atual e clique que leva direto ao item
   (rola até o destino e dá um pulso de destaque nele). Sem biblioteca, sem animação contínua. */
(function () {
  "use strict";
  function iniciar() {
    var trilho = document.getElementById("promos-trilho");
    if (!trilho) return;
    var pontos = document.querySelectorAll("#promos-pontos i");
    var slides = trilho.querySelectorAll(".promo-slide");

    // pontinhos: qual cartaz está mais perto do centro
    function atualizarPontos() {
      var centro = trilho.scrollLeft + trilho.clientWidth / 2, melhor = 0, dist = 1e9;
      slides.forEach(function (s, i) {
        var d = Math.abs(s.offsetLeft + s.offsetWidth / 2 - centro);
        if (d < dist) { dist = d; melhor = i; }
      });
      pontos.forEach(function (p, i) { p.classList.toggle("on", i === melhor); });
    }
    trilho.addEventListener("scroll", function () { requestAnimationFrame(atualizarPontos); }, { passive: true });
    // sem sobra de rolagem (todos cabem na tela): esconde os pontinhos
    function medir() { var cabe = trilho.scrollWidth <= trilho.clientWidth + 2; document.getElementById("promos-pontos").style.display = cabe ? "none" : ""; trilho.classList.toggle("cabe", cabe); }
    medir(); window.addEventListener("resize", medir, { passive: true });

    // mouse: agarrar e arrastar (vira arrasto só depois de 6px — assim o clique normal continua abrindo o cartaz)
    var baixo = false, arrastou = false, x0 = 0, sl0 = 0;
    trilho.addEventListener("pointerdown", function (e) {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      baixo = true; arrastou = false; x0 = e.clientX; sl0 = trilho.scrollLeft;
    });
    window.addEventListener("pointermove", function (e) {
      if (!baixo) return;
      var dx = e.clientX - x0;
      if (!arrastou && Math.abs(dx) > 6) { arrastou = true; trilho.classList.add("arrastando"); }
      if (arrastou) trilho.scrollLeft = sl0 - dx;
    });
    function soltar() { if (!baixo) return; baixo = false; trilho.classList.remove("arrastando"); }
    window.addEventListener("pointerup", soltar);
    window.addEventListener("pointercancel", soltar);
    trilho.addEventListener("dragstart", function (e) { e.preventDefault(); });

    // clique: vai direto ao item do cartaz
    trilho.addEventListener("click", function (e) {
      var a = e.target.closest(".promo-slide");
      if (!a) return;
      e.preventDefault();
      if (arrastou) { arrastou = false; return; }
      var alvo = document.getElementById(a.getAttribute("data-alvo"));
      if (!alvo) return;
      alvo.scrollIntoView({ behavior: "smooth", block: "start" });
      // pulso de destaque no item de destino (some sozinho)
      alvo.classList.remove("alvo-pulso"); void alvo.offsetWidth; alvo.classList.add("alvo-pulso");
      setTimeout(function () { alvo.classList.remove("alvo-pulso"); }, 1800);
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
