/* ======================= FAIXA DE ÍCONES DE CONTATO =======================
   Componente fornecido pelo José (lógica original, sem alterações): auto-scroll contínuo,
   arrastável com mouse/dedo com inércia, loop infinito (dois conjuntos iguais no HTML),
   pausa fora da tela (IntersectionObserver) e respeita prefers-reduced-motion. */
(function () {
  "use strict";

  // opcoes: { velocidade: px/ms (negativo = anda pra esquerda, positivo = pra direita) }
  function iniciarFaixaArrastavel(seletor, opcoes) {
    var trilha = document.querySelector(typeof seletor === "string" ? seletor : ".faixa-trilha");
    if (!trilha) return;
    opcoes = opcoes || {};

    var reduzMovimento = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    var VELOCIDADE_AUTOMATICA = Math.abs(opcoes.velocidade || 0.035); // px por ms
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
    var idPonteiro = 0;
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
      trilha.style.transform = "translate3d(" + posicao.toFixed(2) + "px,0,0)";
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
        posicao -= VELOCIDADE_AUTOMATICA * passo * (opcoes.velocidade > 0 ? -1 : 1); // padrão: pra esquerda; velocidade positiva: pra direita
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
      idPonteiro = evento.pointerId;
    }

    function aoMover(evento) {
      if (!arrastando) return;
      var agora = performance.now();
      var deltaX = evento.clientX - pontoX;
      var deltaT = Math.max(agora - pontoT, 1);
      posicao += deltaX;
      velocidade = deltaX / deltaT;
      somaMovimento += Math.abs(deltaX);
      if (somaMovimento > LIMIAR_CLIQUE && !moveuBastante) {
        moveuBastante = true;
        // só "captura" o ponteiro quando virou arrasto de verdade — capturar já no toque
        // redirecionava o clique pra faixa e os links dos ícones nunca abriam
        trilha.classList.add("arrastando");
        if (trilha.setPointerCapture) {
          try { trilha.setPointerCapture(idPonteiro); } catch (erro) {}
        }
      }
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

    trilha.addEventListener("dragstart", function (e) { e.preventDefault(); }); // arrasto nativo de <a> cancelava o gesto
    document.addEventListener("visibilitychange", function () { ultimoQuadroAuto = null; ultimoQuadroMomento = null; });
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

  function iniciarTodas() {
    iniciarFaixaArrastavel(".faixa-trilha");                                  // ícones de contato: da direita pra esquerda
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciarTodas);
  else iniciarTodas();

  // Exponha globalmente se quiser chamar manualmente em algum outro ponto
  window.iniciarFaixaArrastavel = iniciarFaixaArrastavel;
})();
