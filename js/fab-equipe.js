/* BOTÃO FLUTUANTE DA EQUIPE — aparece na loja só quando a equipe está logada.
   Arrastável (mouse/dedo, gruda na borda mais próxima e lembra o lugar) e com 2 opções:
   • Caixa (PDV)        → /caixa/
   • Conversor          → /caixa/?colar=1  (abre direto o conversor de pedido do WhatsApp) */
function iniciarFabEquipe(){
  if(document.getElementById('fab-equipe')) return;
  var raiz=document.createElement('div');
  raiz.id='fab-equipe';
  raiz.innerHTML=
    '<div class="fab-menu" id="fab-menu" role="menu" aria-hidden="true">'+
      '<a role="menuitem" href="caixa/"><span>🧾</span><b>Caixa</b><small>vender no PDV</small></a>'+
      '<a role="menuitem" href="caixa/?colar=1"><span>📋</span><b>Conversor</b><small>colar pedido do WhatsApp</small></a>'+
    '</div>'+
    '<button type="button" class="fab-botao" id="fab-botao" aria-label="Atalhos da equipe" aria-expanded="false">'+
      '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></svg>'+
    '</button>';
  document.body.appendChild(raiz);
  var botao=raiz.querySelector('#fab-botao'), menu=raiz.querySelector('#fab-menu');
  var T=56, M=12, CHAVE='fab_equipe_pos';

  // posição guardada: lado (esq/dir) + altura em %, pra funcionar em qualquer tamanho de tela
  var pos={lado:'dir',y:0.62};
  try{ var salvo=JSON.parse(localStorage.getItem(CHAVE)||'null'); if(salvo&&(salvo.lado==='esq'||salvo.lado==='dir')&&salvo.y>=0&&salvo.y<=1) pos=salvo; }catch(e){}
  function aplicar(){
    var w=window.innerWidth,h=window.innerHeight;
    var x=pos.lado==='dir'?w-T-M:M;
    var y=Math.min(Math.max(pos.y*h,M+60),h-T-M-90);
    raiz.style.transform='translate3d('+x+'px,'+y+'px,0)';
    raiz.classList.toggle('esq',pos.lado==='esq');
    raiz.classList.toggle('abaixo',y<h/2);
  }
  aplicar(); window.addEventListener('resize',aplicar,{passive:true});

  function abrir(sim){ raiz.classList.toggle('aberto',sim); botao.setAttribute('aria-expanded',sim?'true':'false'); menu.setAttribute('aria-hidden',sim?'false':'true'); }

  // arrastar (6px = vira arrasto; menos que isso é toque e abre/fecha o menu)
  var baixo=false,mexeu=false,x0=0,y0=0,bx=0,by=0,id=null;
  botao.addEventListener('pointerdown',function(e){
    baixo=true;mexeu=false;x0=e.clientX;y0=e.clientY;id=e.pointerId;
    var m=/translate3d\(([-\d.]+)px,\s*([-\d.]+)px/.exec(raiz.style.transform)||[0,0,0]; bx=parseFloat(m[1]);by=parseFloat(m[2]);
  });
  window.addEventListener('pointermove',function(e){
    if(!baixo)return;
    var dx=e.clientX-x0,dy=e.clientY-y0;
    if(!mexeu&&Math.hypot(dx,dy)>6){ mexeu=true; raiz.classList.add('arrastando'); abrir(false); try{botao.setPointerCapture(id);}catch(er){} }
    if(mexeu){
      var w=window.innerWidth,h=window.innerHeight;
      var nx=Math.min(Math.max(bx+dx,M),w-T-M), ny=Math.min(Math.max(by+dy,M+60),h-T-M-90);
      raiz.style.transform='translate3d('+nx+'px,'+ny+'px,0)';
    }
  });
  function soltar(){
    if(!baixo)return; baixo=false;
    if(mexeu){
      raiz.classList.remove('arrastando');
      var m=/translate3d\(([-\d.]+)px,\s*([-\d.]+)px/.exec(raiz.style.transform)||[0,0,0];
      var w=window.innerWidth,h=window.innerHeight;
      pos={lado:(parseFloat(m[1])+T/2)<w/2?'esq':'dir',y:parseFloat(m[2])/h};
      try{localStorage.setItem(CHAVE,JSON.stringify(pos));}catch(e){}
      raiz.classList.add('gruda'); aplicar(); setTimeout(function(){raiz.classList.remove('gruda');},260);
    }else{ abrir(!raiz.classList.contains('aberto')); }
  }
  window.addEventListener('pointerup',soltar);
  window.addEventListener('pointercancel',soltar);
  document.addEventListener('pointerdown',function(e){ if(!raiz.contains(e.target)) abrir(false); });
  document.addEventListener('keydown',function(e){ if(e.key==='Escape') abrir(false); });
}
