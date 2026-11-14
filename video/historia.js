/* Motor "historinha": cenário panorâmico (imagem do ChatGPT ou placeholder) + câmera com zoom/pan + bonecos stick em SVG + balões + legenda.
   Mesmo contrato do corte.js: window.quadro(t), __cfg, __pronto — serve o mesmo render e a mesma montagem de áudio. */
(function(){
var W=1080,H=1920,PW=2880,PH=1920,GY=1560, $=function(i){return document.getElementById(i);}, tempos, cfg, cenas, pal;
var ease=function(x){x=Math.max(0,Math.min(1,x));return x<.5?2*x*x:1-Math.pow(-2*x+2,2)/2;}, lerp=function(a,b,t){return a+(b-a)*t;};
var clamp=function(x,a,b){return Math.max(a,Math.min(b,x));};
function montar(){ pal=$('palco'); if(cfg.pagina){PW=cfg.pagina.w;PH=cfg.pagina.h;}
  var src=cfg.pagina?cfg.pagina.src:cfg.cenario;
  var cen=src?'<img id="cenImg" src="'+src+'" style="position:absolute;left:0;top:0;width:'+PW+'px;height:'+PH+'px" alt="">':'<div id="cenImg">'+window.cenarioPlaceholder()+'</div>';
  var chars=cfg.personagens.map(function(p){return Stick.svg(p.id,p.look);}).join('');
  var h='<div id="cam" style="position:absolute;left:0;top:0;width:'+PW+'px;height:'+PH+'px;transform-origin:0 0">'+cen+'<svg id="atores" viewBox="0 0 '+PW+' '+PH+'" width="'+PW+'" height="'+PH+'" style="position:absolute;left:0;top:0;overflow:visible"><defs><clipPath id="clipQ"><rect id="clipR" x="0" y="0" width="'+PW+'" height="'+PH+'"/></clipPath></defs><path id="escuro" fill="#000" fill-rule="evenodd" d=""/><g clip-path="url(#clipQ)">'+(cfg.extras||'')+chars+'</g></svg></div><div id="vhs"></div>'+
   '<div id="veu"></div><div id="baloes"></div><div id="leg"></div><div id="fim"><div class="fbg"></div><img class="carimbo" src="logo-carimbo.png" alt=""><div class="onda"></div><div class="f1"></div><div class="f2"></div><div class="url">pizzaria-pizza-em-dobro.com.br</div><div class="credito">FEITO POR VIBE CODING PROCESS</div></div><div id="flash"></div><div id="tit"></div>';
  pal.insertAdjacentHTML('beforeend',h); }
function cena(t){ var at=null; cenas.forEach(function(c){var s=tempos.cenas[c.id]; if(s&&t>=s.t0&&t<s.t1+1e-4)at=c;}); return at||cenas[cenas.length-1]; }
function bal(p,txt,u,quando){ // balão de fala preso na cabeça do personagem (em tela)
  return {p:p,txt:txt}; }
window.quadro=function(t){
  var at=cena(t), s=tempos.cenas[at.id], dur=s.t1-s.t0, u=t-s.t0, k=u/dur, gelo=at.congela!==undefined&&u>at.congela;
  var uA=gelo?at.congela:u, kA=uA/dur, gy=at.gy||GY, escC=at.esc||cfg.escala||1;
  var fim=!!at.fim; $('fim').style.display=fim?'block':'none'; $('cam').style.display=fim?'none':'block';
  // câmera
  var a=at.cam[0], b=at.cam[1], e=ease(k), cx=lerp(a[0],b[0],e), cy=lerp(a[1],b[1],e), z=lerp(a[2],b[2],e);
  var tx=W/2-cx*z, ty=H/2-cy*z; $('cam').style.transform='translate('+tx+'px,'+ty+'px) scale('+z+')';
  $('cam').style.filter=gelo?'grayscale(1) contrast(1.15)':(at.rebobina?'blur('+(6*Math.sin(Math.PI*k))+'px) saturate(.6)':'none');
  $('vhs').style.opacity=at.rebobina?.9:0; if(at.rebobina)$('vhs').style.backgroundPosition='0 '+Math.round(t*900)+'px';
  var q=at.painel; var cr=$('clipR'); if(q){cr.setAttribute('x',q[0]);cr.setAttribute('y',q[1]);cr.setAttribute('width',q[2]-q[0]);cr.setAttribute('height',q[3]-q[1]);}else{cr.setAttribute('x',0);cr.setAttribute('y',0);cr.setAttribute('width',PW);cr.setAttribute('height',PH);}
  var esc=$('escuro'), m=-4000; esc.setAttribute('d',q?'M'+m+' '+m+'H'+(PW-m)+'V'+(PH-m)+'H'+m+'Z M'+q[0]+' '+q[1]+'V'+q[3]+'H'+q[2]+'V'+q[1]+'Z':''); esc.setAttribute('opacity',at.escurece===undefined?.78:at.escurece);
  // atores
  var estado={}; cfg.personagens.forEach(function(p){ var r=(at.ator&&at.ator[p.id])?at.ator[p.id](uA,dur,kA):{alfa:0};
    var g=$(p.id); if(r.x===undefined) r.x=0; var esc=(r.esc||1)*escC, face=r.dir===-1?-1:1; g.setAttribute('transform','translate('+r.x+','+(r.y!==undefined?r.y:gy)+') scale('+(esc*face)+','+esc+')'); if(r.pisca===undefined) r.pisca=Stick.pisca(t,p.id.length*.7); if(r.respira===undefined) r.respira=Math.sin(t*2.4+p.id.length)*3; if(r.alfa!==0) Stick.pose(p.id,r); else g.style.opacity=0; g.querySelectorAll('.cf').forEach(function(e){e.style.transformBox='fill-box';e.style.transformOrigin='center';e.style.transform=face<0?'scaleX(-1)':'none';}); estado[p.id]=r; });
  // balões
  var hb=''; (at.baloes||[]).forEach(function(bl){ var r=estado[bl.quem]; if(!r||r.alfa===0)return; var d=u-bl.t0, du=bl.t1-bl.t0; if(d<0||d>du)return;
    var sx=r.x*z+tx, sy=((r.y!==undefined?r.y:gy)-660*(r.esc||1)*escC)*z+ty; var p=clamp(d/.18,0,1), q=clamp((du-d)/.15,0,1), sc=ease(Math.min(p,q));
    var bx=clamp(sx,300,W-300);
    sy=clamp(sy,330,1500); hb+='<div class="bal" style="left:'+bx+'px;top:'+sy+'px;transform:translate(-50%,-100%) scale('+sc+')"><span>'+bl.txt+'</span><i style="left:'+(50+clamp((sx-bx)/6,-30,30))+'%"></i></div>'; });
  $('baloes').innerHTML=hb;
  // título de cena (cartela estilo quadrinho)
  $('tit').innerHTML=at.cartela?'<div class="cart" style="opacity:'+clamp(Math.min(u/.25,(dur-u)/.25),0,1)+'">'+at.cartela+'</div>':'';
  // legenda do narrador: palavras aparecendo
  var ws=String(at.fala||'').split(/\s+/).filter(Boolean), ini=.25, fimT=Math.max(ini+.4,dur-.35), wd=(fimT-ini)/ws.length;
  $('leg').innerHTML=ws.map(function(w,i){ var d=u-(ini+i*wd), o=clamp(d/.12,0,1), ativo=d>=0&&d<wd*1.2, dest=(at.dest||[]).some(function(x){return w.toLowerCase().replace(/[^a-zà-ú0-9]/g,'').indexOf(x)===0;});
     return '<span style="opacity:'+o+';transform:translateY('+(1-o)*26+'px) scale('+(ativo?1.06:1)+');color:'+((dest||ativo)?'var(--ouro)':'#fff')+'">'+w+'</span>'; }).join(' ');
  $('leg').style.display=fim?'none':'flex';
  // flash na troca de cena
  var fl=0; if(u<.18) fl=1-u/.18; $('flash').style.opacity=at.corte?fl:0;
  if(fim){ var F=$('fim'); F.querySelector('.f1').textContent=at.f1||''; F.querySelector('.f2').textContent=at.f2||''; var uu=u;
    var c=F.querySelector('.carimbo'), kc=clamp(uu/.55,0,1), sc=kc<.55?lerp(2.8,.9,kc/.55):kc<.78?lerp(.9,1.04,(kc-.55)/.23):lerp(1.04,1,(kc-.78)/.22); c.style.opacity=clamp(uu/.2,0,1); c.style.transform='scale('+sc+') rotate('+lerp(-22,-8,ease(kc))+'deg)';
    var o=F.querySelector('.onda'), ko=clamp((uu-.35)/.9,0,1); o.style.opacity=ko>0?(1-ko)*.8:0; o.style.transform='scale('+(.6+ko*1.3)+')';
    F.querySelector('.f1').style.opacity=clamp((uu-.6)/.3,0,1); F.querySelector('.f2').style.opacity=clamp((uu-.9)/.3,0,1); F.querySelector('.url').style.opacity=clamp((uu-1.2)/.3,0,1);
    var ws2=String(at.fala||'').split(/\s+/).filter(Boolean); }
};
function ajustar(){ if(document.body.classList.contains('gravando'))return; var k=Math.min(innerWidth/W,innerHeight/H); pal.style.transform='scale('+k+')'; pal.style.marginLeft=Math.max(0,(innerWidth-W*k)/2)+'px'; }
window.Historia={iniciar:function(c){ cfg=c; cenas=c.cenas; var grav=new URLSearchParams(location.search).has('gravar'); if(grav)document.body.classList.add('gravando');
  window.__cfg={tempos:c.tempos,cenas:c.cenas.map(function(s){return {id:s.id,fala:s.fala,min:0,fim:!!s.fim};})};
  montar(); ajustar(); addEventListener('resize',ajustar);
  fetch(c.tempos).then(function(r){return r.json();}).then(function(tp){ tempos=tp; window.quadro(0);
    var im=[].slice.call(document.images), n=im.length, ok=function(){ if(--n<=0) document.fonts.ready.then(function(){window.__pronto=true;}); }; if(!n)ok(); im.forEach(function(i){ if(i.complete)ok(); else {i.onload=ok;i.onerror=ok;} });
    if(grav)return; var au=$('som'), t0=0, run=false;
    function loop(){ if(!run)return; var t=au&&!au.paused?au.currentTime:(performance.now()-t0)/1000; window.quadro(Math.min(t,tp.dur)); if(t<tp.dur)requestAnimationFrame(loop); else run=false; }
    function tocar(s){ $('capa').style.display='none'; run=true; t0=performance.now(); if(s&&au){au.currentTime=0;au.play().catch(function(){});} loop(); }
    $('btSom').onclick=function(){tocar(true);}; $('btMudo').onclick=function(){tocar(false);}; }); } };
})();
