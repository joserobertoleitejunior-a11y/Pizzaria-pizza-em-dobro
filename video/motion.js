/* Motor dos vídeos em formato Stories. Tudo é função do tempo: quadro(t) desenha o vídeo no instante t.
   - no navegador: um laço rAF chama quadro(t) em tempo real (com a música);
   - na gravação (scripts/renderizar-video.js): chama quadro(t) quadro a quadro, então o MP4 não depende da velocidade da máquina. */
(function(){
"use strict";
var P=new URLSearchParams(location.search), GRAVANDO=P.has('gravar');
if(GRAVANDO)document.body.classList.add('gravando');
var $=function(id){return document.getElementById(id)};
var palco=$('palco'), ifr=$('site'), fone=$('fone'), capEl=$('cap'), fimEl=$('fim'), zapEl=$('zap');
function ajustar(){var s=Math.min(innerWidth/1080,innerHeight/1920);palco.style.transform='translate(-50%,-50%) scale('+s+')';}
addEventListener('resize',ajustar);ajustar();

var clamp=function(x){return Math.max(0,Math.min(1,x));};
var outCubic=function(x){x=clamp(x);return 1-Math.pow(1-x,3);};
var outBack=function(x){x=clamp(x);var c=1.5;return 1+(c+1)*Math.pow(x-1,3)+c*Math.pow(x-1,2);};
var inOutSine=function(x){x=clamp(x);return -(Math.cos(Math.PI*x)-1)/2;};
var inOutCubic=function(x){x=clamp(x);return x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;};

/* texto → palavras e letras (cada letra aparece da esquerda pra direita) */
function letras(html){
  var box=document.createElement('div'); box.innerHTML=html; var out=document.createElement('span'); out.className='in';
  (function walk(no,ac,dest){
    Array.prototype.forEach.call(no.childNodes,function(n){
      if(n.nodeType===3){
        n.textContent.split(/(\s+)/).forEach(function(w){
          if(!w)return;
          if(/^\s+$/.test(w)){dest.appendChild(document.createTextNode(' '));return;}
          var p=document.createElement('span');p.className='p'+(ac?' ac-p':'');
          w.split('').forEach(function(ch){var l=document.createElement('span');l.className='l'+(ac?' ac':'');l.textContent=ch;p.appendChild(l);});
          dest.appendChild(p);
        });
      }else if(n.nodeType===1){walk(n,ac||n.tagName==='B',dest);}
    });
  })(box,false,out);
  return out;
}
function revelar(el,u,passo,sai){ // u = segundos desde o início
  var ls=el.querySelectorAll('.l');
  for(var i=0;i<ls.length;i++){
    var e=outCubic((u-i*(passo||.028))/.42);
    ls[i].style.opacity=e;
    ls[i].style.transform='translateX('+(-52*(1-e))+'px)';
    ls[i].style.filter=e<1?'blur('+(7*(1-e))+'px)':'none';
  }
  el.style.setProperty('--ub',outCubic((u-ls.length*(passo||.028)*.55-.1)/.5));
}

var C=null, caps=[], flags={}, segs=[], ifrOk=false;
var W=function(){return ifr.contentWindow}, D=function(){return ifr.contentDocument};
function el(id){return D().getElementById(id);}
function resolverY(s){
  if(typeof s.y==='number')return s.y;
  if(s.y==='fim')return D().documentElement.scrollHeight;
  var id=s.el; if(id==='@pizza'){var m=W().eval('menu'),p=m.filter(function(x){return x.cat==='p'&&/frango catupiry/i.test(x.n);})[0]||m.filter(function(x){return x.cat==='p';})[0];id='card-'+p.id;}
  var e=el(id); return Math.max(0,e.getBoundingClientRect().top+W().scrollY-(s.off||0));
}
function prepararSite(){
  var d=D(),st=d.createElement('style');
  st.textContent='html{scroll-behavior:auto!important}*{content-visibility:visible!important}html{scrollbar-width:none!important}html::-webkit-scrollbar,body::-webkit-scrollbar,*::-webkit-scrollbar{display:none!important;width:0!important;height:0!important}'+
   '#pwa-banner,#fab-equipe,.fab-equipe,#music-bar{display:none!important}.reveal{opacity:1!important;transform:none!important;transition:none!important}';
  d.head.appendChild(st);
  var fixa=function(){var b=d.getElementById('status-loja');if(b){b.textContent='ABERTO';b.className='status-badge open';}};fixa();setInterval(fixa,400);
}
/* ── WhatsApp: mesma mensagem que o site envia ── */
function negrito(t){return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/\*(.+?)\*/g,'<b>$1</b>');}
function montarZap(){
  var w=W(),c=w.eval('cart')||[],n=new Date(),z=function(x){return String(x).padStart(2,'0');},l=[];
  var data=z(n.getDate())+'/'+z(n.getMonth()+1)+'/'+n.getFullYear(),hora=z(n.getHours())+':'+z(n.getMinutes());
  l.push('🛎️ *NOVO PEDIDO - SITE OFICIAL*','📅 '+data+' às '+hora,'────────────────────','','👤 *Cliente:* Marcos','','🍕 *PEDIDO:*','');
  c.forEach(function(it){l.push('*• '+it.n+'*','  💰 R$ '+Number(it.p).toFixed(2).replace('.',','),'');});
  l.push('────────────────────','','📍 *ENDEREÇO:* Rua XV de Novembro, nº 120','','💳 *PAGAMENTO:* Pix','🚚 *ENTREGA GRÁTIS* 🎁','','💰 *TOTAL: '+(el('total-val')?el('total-val').textContent:'')+'*','────────────────────','_Pedido via site oficial._');
  zapEl.innerHTML='<div class="z-top"><div class="z-av">P</div><div><div class="z-nome">Pizza em Dobro</div><div class="z-sub">pedidos do site</div></div></div>'+
   '<div class="z-chat"><div class="z-aviso">Hoje</div><div class="z-msg" id="z-m">'+negrito(l.join('\n'))+'<span class="z-hora">'+hora+'</span></div></div><div class="z-input"><i></i></div>';
}
/* logo da Vibe Coding Process: o mesmo cubo do rodapé do site (arestas douradas #C9A227 + contorno 1,12× a 55%),
   dentro de um quadrado preto leve com estrelas ("espaço") — só atrás da logo da Vibe */
function desenharEspaco(cv,t){
  var c=cv.getContext('2d'),S=cv.width;
  c.clearRect(0,0,S,S);
  var g=c.createRadialGradient(S*.5,S*.45,10,S*.5,S*.5,S*.75);g.addColorStop(0,'#0f1118');g.addColorStop(1,'#020203');
  c.fillStyle=g;c.fillRect(0,0,S,S);
  var neb=c.createRadialGradient(S*.5,S*.5,0,S*.5,S*.5,S*.5);neb.addColorStop(0,'rgba(201,162,39,.13)');neb.addColorStop(1,'rgba(201,162,39,0)');c.fillStyle=neb;c.fillRect(0,0,S,S);
  var sd=7;function rnd(){sd=(sd*16807)%2147483647;return sd/2147483647;}
  for(var i=0;i<70;i++){var x=rnd()*S,y=rnd()*S,r=.6+rnd()*1.7,ph=rnd()*6.28,v=.35+.65*(.5+.5*Math.sin(t*(1.2+rnd()*1.5)+ph));
    c.fillStyle='rgba(255,255,255,'+(v*.9)+')';c.beginPath();c.arc(x,y,r,0,6.283);c.fill();}
  var rx=.4+t*.35,ry=.5+t*.7,h=.575,V=[];
  for(var a=0;a<8;a++)V.push([(a&1?h:-h),(a&2?h:-h),(a&4?h:-h)]);
  var E=[[0,1],[2,3],[4,5],[6,7],[0,2],[1,3],[4,6],[5,7],[0,4],[1,5],[2,6],[3,7]];
  function proj(v,k){var x=v[0]*k,y=v[1]*k,z=v[2]*k,cx=Math.cos(rx),sx=Math.sin(rx),cy=Math.cos(ry),sy=Math.sin(ry);
    var x1=x*cy+z*sy,z1=-x*sy+z*cy,y1=y*cx-z1*sx; return [S/2+x1*S/2.6,S/2-y1*S/2.6];}
  function arestas(k,al,lw){c.strokeStyle='rgba(201,162,39,'+al+')';c.lineWidth=lw;c.lineCap='round';
    E.forEach(function(e){var p=proj(V[e[0]],k),q=proj(V[e[1]],k);c.beginPath();c.moveTo(p[0],p[1]);c.lineTo(q[0],q[1]);c.stroke();});}
  c.shadowColor='rgba(201,162,39,.55)';c.shadowBlur=14;arestas(1,1,S/58*1.4);arestas(1.12,.55,S/58*1.4);c.shadowBlur=0;
}
function montarFim(){
  var f=C.fim;
  fimEl.innerHTML=
   '<div class="fx f-par"><img class="f-logo" src="../assets/logo.png" alt=""></div>'+
   '<div class="fx f-nome"></div><div class="fx f-tag"></div><div class="fx f-linha"></div>'+
   '<div class="fx f-contato"><div class="f-fone"></div><div class="f-jose"></div></div>';
  var q=function(s){return fimEl.querySelector(s);};
  q('.f-nome').appendChild(letras('Pizza em <b>Dobro</b>'));
  q('.f-tag').appendChild(letras(f.tag));
  q('.f-fone').appendChild(letras('(15) 99705-8390'));
  q('.f-jose').appendChild(letras('WhatsApp · Peça já pelo site'));
}
/* ── fundo: fachada com movimento de câmera lenta, partículas de luz e grão de filme ── */
var part=$('part'),pc=part.getContext('2d'),grao=$('grao'),gc=grao.getContext('2d'),fotoEl=document.querySelector('#fundo img'),pts=[];
(function(){var sd=3;function r(){sd=(sd*16807)%2147483647;return sd/2147483647;}for(var i=0;i<46;i++)pts.push({x:r()*1080,y:r()*1920,r:6+r()*26,v:8+r()*26,a:.10+r()*.30,f:r()*6.28});})();
function fundoVivo(t){
  var k=1.06+.05*(t/(C.dur||30)); fotoEl.style.transform='translateX(-50%) translate('+(Math.sin(t*.12)*26)+'px,'+(-t*2.4)+'px) scale('+k+')';
  pc.clearRect(0,0,1080,1920);pc.globalCompositeOperation='lighter';
  pts.forEach(function(p){var y=((p.y-p.v*t)%2100+2100)%2100-90,x=p.x+Math.sin(t*.4+p.f)*22,o=p.a*(.6+.4*Math.sin(t*.9+p.f));
    var g=pc.createRadialGradient(x,y,0,x,y,p.r);g.addColorStop(0,'rgba(255,236,190,'+o+')');g.addColorStop(1,'rgba(255,236,190,0)');pc.fillStyle=g;pc.beginPath();pc.arc(x,y,p.r,0,6.283);pc.fill();});
  pc.globalCompositeOperation='source-over';
  var id=gc.createImageData(grao.width,grao.height),d=id.data,s=(t*977|0)+1;
  for(var i=0;i<d.length;i+=4){s=(s*1103515245+12345)&0x7fffffff;var v=(s>>16)&255;d[i]=d[i+1]=d[i+2]=v;d[i+3]=255;}
  gc.putImageData(id,0,0);
}
/* ── o quadro ── */
function quadro(t){
  if(!ifrOk)return;
  fundoVivo(t);
  var cr=$('credito'); cr.style.opacity=clamp((t-.8)/.6); cr.style.transform='translateX('+(-40*(1-outCubic((t-.8)/.7)))+'px)'; desenharEspaco($('cuboMini'),t);
  /* celular: entra deslizando e flutua levemente */
  var ent=outBack(t/1.1), sai=C.fim?inOutCubic((t-C.fim.t0)/.7):0;
  fone.style.opacity=clamp(t/.5)*(1-sai);
  fone.style.transform='translateY('+(140*(1-ent)+sai*-80)+'px) rotateY('+(Math.sin(t*.6)*3.2*(1-sai))+'deg) rotateX('+(Math.cos(t*.45)*1.6)+'deg) scale('+(.9+.1*ent)+')';
  var br=(t%7)/1; $('brilho').style.transform='translateX('+(-130+260*inOutSine(br<1?br:1))+'%)';
  /* splash do site: animações travadas no tempo do vídeo */
  if(C.splash){
    var st=C.splash.t;
    if(t<st){D().getAnimations({subtree:true}).forEach(function(a){try{a.pause();a.currentTime=t*1000;}catch(e){}});flags.splashPausa=true;}
    else if(!flags.splashAberta){flags.splashAberta=true;D().getAnimations({subtree:true}).forEach(function(a){try{a.play();}catch(e){}});W().abrirPortaSplash();}
  }
  /* rolagens do site (vertical, com início e fim suaves) */
  segs.forEach(function(s){
    if(t<s.t0)return;
    if(!s.y0&&s.y0!==0){ // primeira vez que entra no trecho: lê de onde partiu e resolve o destino
      var alvo=s.inner?el(s.inner):null;
      s.y0=s.inner?alvo.scrollTop:W().scrollY; s.y1=s.inner?s.y:resolverY(s);
    }
    var p=inOutSine((t-s.t0)/(s.t1-s.t0)), y=s.y0+(s.y1-s.y0)*p;
    if(s.inner){el(s.inner).scrollTop=y;}else{W().scrollTo(0,y);}
  });
  /* digitação */
  (C.digitar||[]).forEach(function(d){
    if(t<d.t0)return; var k=Math.round(d.texto.length*clamp((t-d.t0)/(d.t1-d.t0))), c=el(d.id);
    if(c&&c.value!==d.texto.slice(0,k)){c.value=d.texto.slice(0,k);c.dispatchEvent(new Event('input',{bubbles:true}));}
  });
  /* ações no site (uma vez cada) */
  (C.eventos||[]).forEach(function(e,i){ if(t>=e.t&&!flags['e'+i]){flags['e'+i]=1;try{e.fn(W(),el);}catch(x){console.error('VIDEO-ERRO',x.message);}} });
  /* WhatsApp dentro do celular */
  if(C.zap){
    var z=C.zap, up=inOutCubic((t-z.t0)/.6)-inOutCubic((t-z.t1)/.5);
    if(t>=z.t0-.05&&!flags.zapMontado){flags.zapMontado=1;montarZap();}
    zapEl.style.transform='translateY('+((1-up)*100)+'%)';
    var m=$('z-m'); if(m){var e=outBack((t-z.t0-.7)/.6);m.style.opacity=clamp((t-z.t0-.7)/.25);m.style.transform='translateY('+(60*(1-e))+'px) scale('+(.94+.06*e)+')';}
  }
  /* legendas cinéticas */
  caps.forEach(function(c){
    var u=t-c.t0,ativo=t>=c.t0&&t<=c.t1;
    c.el.style.opacity=ativo?1:0; if(!ativo)return;
    revelar(c.el,u);
    var s=clamp((t-(c.t1-.38))/.38),e=s*s;
    c.el.style.opacity=1-e; c.el.style.transform='translateX('+(90*e)+'px)';
  });
  /* cartão final */
  if(C.fim){
    var u=t-C.fim.t0, w=inOutCubic(u/.8);
    fimEl.style.clipPath='inset(0 '+((1-w)*100)+'% 0 0)';
    if(u>-.1){
      if(!flags.fimMontado){flags.fimMontado=1;montarFim();}
      var itens=fimEl.querySelectorAll('.fx'),ult=[.5,.95,1.35,1.7,1.9];
      Array.prototype.forEach.call(itens,function(x,i){
        var uu=u-ult[i],e=outCubic(uu/.7);x.style.opacity=e;
        if(i===3)x.style.transform='scaleX('+e+')'; else x.style.transform='translateX('+(-70*(1-e))+'px)';
        if(i===1||i===2||i===4)revelar(x,uu,.026);
      });
    }
  }
}
window.quadro=quadro;

function construir(){
  capEl.innerHTML='';
  caps=(C.legendas||[]).map(function(l){var d=document.createElement('div');d.className='leg';d.appendChild(letras(l.html));capEl.appendChild(d);return {t0:l.t0,t1:l.t1,el:d};});
  segs=(C.rolagens||[]).map(function(s){return Object.assign({},s);});
}
function carregar(){
  try{ if(C.splash)sessionStorage.removeItem('splash_ok'); else sessionStorage.setItem('splash_ok','1'); }catch(e){}
  return new Promise(function(res){
    ifr.onload=function(){
      prepararSite();
      var ate=Date.now()+8000;
      (function esp(){ // espera o cardápio existir
        var ok=false;try{ok=!!(el('cat-p')&&el('cat-p').children.length&&W().eval('typeof menu!=="undefined"&&menu.length'));}catch(e){}
        if(ok||Date.now()>ate){ifrOk=true;window.__pronto=true;res();}else setTimeout(esp,150);
      })();
    };
    ifr.src='../index.html';
  });
}
var raf=0,som=null;
function tocar(comSom){
  cancelAnimationFrame(raf);
  if(comSom&&som){som.currentTime=0;som.play().catch(function(){});}
  var ini=performance.now();
  (function passo(){var t=(performance.now()-ini)/1000;quadro(t);
    if(t<C.dur)raf=requestAnimationFrame(passo);else{window.__fim=true;}})();
}
window.Video={
  iniciar:function(cfg){
    window.__cfg=cfg; C=cfg; palco.className='tema-'+(cfg.tema||'instagram'); construir(); som=$('som');
    $('capa').style.display=GRAVANDO?'none':'flex';
    carregar().then(function(){
      quadro(0);
      $('btSom').onclick=function(){$('capa').style.display='none';tocar(true);};
      $('btMudo').onclick=function(){$('capa').style.display='none';tocar(false);};
      $('btRe').onclick=function(){location.reload();};
      if(P.has('auto'))tocar(false);
    });
  }
};
})();
