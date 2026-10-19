/* ======================= FAIXA DE ÍCONES DE CONTATO =======================
   Componente fornecido pelo José (lógica original, sem alterações): auto-scroll contínuo,
   arrastável com mouse/dedo com inércia, loop infinito (dois conjuntos iguais no HTML),
   pausa fora da tela (IntersectionObserver) e respeita prefers-reduced-motion. */
(function () {
  "use strict";

  function iniciarFaixaArrastavel() {
    var trilha = document.querySelector(".faixa-trilha");
    if (!trilha) return;

    var reduzMovimento = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    var VELOCIDADE_AUTOMATICA = 0.035; // px por ms
    var ATRITO = 0.94;
    var LIMIAR_CLIQUE = 6; // px — acima disso, não deixa o clique passar pro link

    var larguraConjunto = trilha.scrollWidth / 2;
    window.addEventListener("resize", function () {
      larguraConjunto = trilha.scrollWidth / 2;
    });

    var posicao = 0;
    var arrastando = false;
    var moveuBastante = false;
    var somaMovimento = 0;
    var pontoX = 0;
    var pontoT = 0;
    var velocidade = 0;
    var quadroAtivo = null;
    var ultimoQuadroAuto = null;
    var ultimoQuadroMomento = null;
    // Só roda o loop de animação enquanto a faixa está visível na tela —
    // sem isso, o requestAnimationFrame ficaria rodando pra sempre em
    // segundo plano depois que o visitante rolasse a página pra baixo,
    // gastando bateria/CPU à toa.
    var visivel = true;
    if ("IntersectionObserver" in window) {
      var observador = new IntersectionObserver(
        function (entradas) {
          var estavaVisivel = visivel;
          visivel = entradas[0].isIntersecting;
          if (visivel && !estavaVisivel && !arrastando && !quadroAtivo) {
            quadroAtivo = requestAnimationFrame(autoRolar);
          }
        },
        { threshold: 0 }
      );
      observador.observe(trilha);
    }

    function normalizar() {
      if (larguraConjunto <= 0) return;
      while (posicao <= -larguraConjunto) posicao += larguraConjunto;
      while (posicao > 0) posicao -= larguraConjunto;
    }

    function desenhar() {
      normalizar();
      trilha.style.transform = "translateX(" + posicao + "px)";
    }

    function cancelarQuadro() {
      if (quadroAtivo) cancelAnimationFrame(quadroAtivo);
      quadroAtivo = null;
    }

    function autoRolar(agora) {
      if (!visivel) {
        // Não agenda o próximo quadro — quem acorda o loop de novo é
        // o próprio IntersectionObserver.
        quadroAtivo = null;
        ultimoQuadroAuto = null;
        return;
      }
      if (ultimoQuadroAuto === null) ultimoQuadroAuto = agora;
      var passo = agora - ultimoQuadroAuto;
      ultimoQuadroAuto = agora;
      if (!arrastando && !reduzMovimento) {
        posicao -= VELOCIDADE_AUTOMATICA * passo;
        desenhar();
      }
      quadroAtivo = requestAnimationFrame(autoRolar);
    }

    function aplicarMomento(agora) {
      if (ultimoQuadroMomento === null) ultimoQuadroMomento = agora;
      var passo = agora - ultimoQuadroMomento;
      ultimoQuadroMomento = agora;
      posicao += velocidade * passo;
      velocidade *= ATRITO;
      desenhar();
      if (Math.abs(velocidade) > 0.01) {
        quadroAtivo = requestAnimationFrame(aplicarMomento);
      } else {
        ultimoQuadroMomento = null;
        ultimoQuadroAuto = null;
        quadroAtivo = requestAnimationFrame(autoRolar);
      }
    }

    function aoPressionar(evento) {
      arrastando = true;
      moveuBastante = false;
      somaMovimento = 0;
      cancelarQuadro();
      pontoX = evento.clientX;
      pontoT = performance.now();
      velocidade = 0;
      trilha.classList.add("arrastando");
      if (trilha.setPointerCapture) {
        try {
          trilha.setPointerCapture(evento.pointerId);
        } catch (erro) {}
      }
    }

    function aoMover(evento) {
      if (!arrastando) return;
      var agora = performance.now();
      var deltaX = evento.clientX - pontoX;
      var deltaT = Math.max(agora - pontoT, 1);
      posicao += deltaX;
      velocidade = deltaX / deltaT;
      somaMovimento += Math.abs(deltaX);
      if (somaMovimento > LIMIAR_CLIQUE) moveuBastante = true;
      pontoX = evento.clientX;
      pontoT = agora;
      desenhar();
    }

    function aoSoltar() {
      if (!arrastando) return;
      arrastando = false;
      trilha.classList.remove("arrastando");
      cancelarQuadro();
      ultimoQuadroMomento = null;
      if (Math.abs(velocidade) > 0.02 && !reduzMovimento) {
        quadroAtivo = requestAnimationFrame(aplicarMomento);
      } else {
        ultimoQuadroAuto = null;
        quadroAtivo = requestAnimationFrame(autoRolar);
      }
    }

    trilha.addEventListener("pointerdown", aoPressionar);
    trilha.addEventListener("pointermove", aoMover);
    trilha.addEventListener("pointerup", aoSoltar);
    trilha.addEventListener("pointercancel", aoSoltar);
    trilha.addEventListener("pointerleave", function (evento) {
      if (arrastando && evento.buttons === 0) aoSoltar();
    });
    // Depois de um arrasto de verdade, o clique que sobra não deve abrir
    // o link do ícone — só dispara quando foi mesmo um toque/clique sem
    // arrastar.
    trilha.addEventListener(
      "click",
      function (evento) {
        if (moveuBastante) {
          evento.preventDefault();
          evento.stopPropagation();
        }
      },
      true
    );

    quadroAtivo = requestAnimationFrame(autoRolar);
  }

  document.addEventListener("DOMContentLoaded", iniciarFaixaArrastavel);

  // Exponha globalmente se quiser chamar manualmente em algum outro ponto
  window.iniciarFaixaArrastavel = iniciarFaixaArrastavel;
})();
