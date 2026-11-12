/* Motor "corte rápido" — mesmo contrato do estilo.js (window.quadro(t), __cfg, __pronto), então o render e a montagem de áudio servem igual. */
(function(){
var $=function(i){return document.getElementById(i);}, cenas, tempos, pal, cfg0;
var ANIM={zin:'zIn',zout:'zOut',pl:'pL',pr:'pR'};
function palavras(f,dest){ return String(f||'').replace(/R\$\s?([\d.,]+)/g,'R$ $1').split(/\s+/).filter(Boolean).map(function(w){
  var d=(dest||[]).some(function(x){return w.toLowerCase().replace(/[^a-zà-ú0-9$]/g,'').indexOf(x.toLowerCase())===0&&x.length>1;})||/^R\$/.test(w);
  return '<em class="w a'+(d?' d':'')+'">'+w+'</em>'; }).join(' '); }
function blocos(f,dest){ var p=String(f||'').trim().split(/(?<=[,.:!?…])\s+/),o=[],c='';
  p.forEach(function(s){ if(c&&(c+' '+s).length>26){o.push(c);c=s;}else c=c?c+' '+s:s; }); if(c)o.push(c);
  return o.map(function(b){return '<span class="bl" data-b>'+palavras(b,dest)+'</span>';}).join(''); }
function montar(c){ pal=$('palco'); var h='';
  c.cenas.forEach(function(s){
    if(s.fim) h+='<div class="cena fim" id="c-'+s.id+'"><div class="fbg"></div><div class="fveu"></div><div class="onda a" style="--d:.2s"></div><img class="carimbo a" style="--d:.1s" src="logo-carimbo.png" alt=""><div class="url a" style="--d:.9s;animation-name:up">pizzaria-pizza-em-dobro.com.br</div><div class="ig a" style="--d:1.1s;animation-name:up">@pizza_dobro_itape · Todos os dias 18h às 00h</div><div class="leg">'+blocos(s.fala,s.dest)+'</div><div class="credito">FEITO POR VIBE CODING PROCESS</div></div>';
    else h+='<div class="cena" id="c-'+s.id+'">'+(s.clip?'<video class="clip" src="'+s.clip+'" muted playsinline preload="auto" data-ini="'+(s.clipIni||0)+'" style="object-position:'+(s.pos||'50% 50%')+'"></video>':'')+'<img class="foto" src="'+s.foto+'" style="object-position:'+(s.pos||'50% 50%')+';animation-name:'+(ANIM[s.anim]||'zIn')+(s.clip?';display:none':'')+'" alt=""><div class="veu"></div>'+(s.selo?'<div class="selo a" style="--d:.35s">'+(s.seloTopo?'<small>'+s.seloTopo+'</small>':'')+s.selo+'</div>':'')+'<div class="leg">'+blocos(s.fala,s.dest)+'</div></div>';
  });
  h+='<div class="dia">'+c.dia+'</div><div class="barra"><i id="prog"></i></div>';
  pal.insertAdjacentHTML('beforeend',h); }
window.quadro=function(t){
  var at=null; cenas.forEach(function(c){var s=tempos.cenas[c.id]; if(s&&t>=s.t0&&t<s.t1+1e-4) at=c;}); if(!at) at=cenas[cenas.length-1];
  cenas.forEach(function(c){ $('c-'+c.id).classList.toggle('on',c===at); });
  var s=tempos.cenas[at.id], u=Math.max(0,t-s.t0), el=$('c-'+at.id), dur=s.t1-s.t0;
  el.style.setProperty('--u',u+'s'); el.querySelectorAll('.a').forEach(function(x){x.style.setProperty('--u',u+'s');});
  var f=el.querySelector('.foto'); if(f) f.style.setProperty('--u',u+'s');
  var bl=el.querySelectorAll('[data-b]'), n=bl.length, ini=.15, fim=Math.max(ini+.4,dur-(at.fim?1.2:.2)), bd=(fim-ini)/n, k=Math.min(n-1,Math.max(0,Math.floor((u-ini)/bd)));
  bl.forEach(function(b,j){ b.style.display=(j===k&&u>=ini)?'block':'none'; if(j!==k)return; var ws=b.querySelectorAll('.w'), wd=bd*.9/ws.length, t0=ini+j*bd;
    ws.forEach(function(w,i){ w.style.setProperty('--u',(u-(t0+i*wd))+'s'); w.style.setProperty('--d','0s'); }); });
  var pr=$('prog'); if(pr) pr.style.width=Math.min(100,t/tempos.dur*100)+'%';
  document.querySelector('.dia').style.display=at.fim?'none':'block'; document.querySelector('.barra').style.display=at.fim?'none':'block';
  var v=el.querySelector('video.clip'); if(v){ var alvo=(parseFloat(v.dataset.ini)||0)+u; try{ if(v.duration) alvo=Math.min(alvo,v.duration-.05); }catch(e){}
    return new Promise(function(res){ var fim=function(){ res(); }; if(Math.abs(v.currentTime-alvo)<.01){ res(); return; } v.addEventListener('seeked',fim,{once:true}); v.currentTime=alvo; setTimeout(res,1500); }); }
};
function ajustar(){ if(document.body.classList.contains('gravando'))return; var k=Math.min(innerWidth/1080,innerHeight/1920); pal.style.transform='scale('+k+')'; pal.style.marginLeft=Math.max(0,(innerWidth-1080*k)/2)+'px'; }
window.Corte={iniciar:function(c){ cfg0=c; var grav=new URLSearchParams(location.search).has('gravar'); if(grav)document.body.classList.add('gravando');
  var tq=new URLSearchParams(location.search).get('tema')||c.tema; if(tq) document.body.setAttribute('data-tema',tq); if(c.cor) document.documentElement.style.setProperty('--cor',c.cor); if(c.ouro) document.documentElement.style.setProperty('--ouro',c.ouro);
  cenas=c.cenas; window.__cfg={tempos:c.tempos,cenas:c.cenas.map(function(s){return {id:s.id,fala:s.fala,min:0,fim:!!s.fim};})};
  montar(c); ajustar(); addEventListener('resize',ajustar);
  fetch(c.tempos).then(function(r){return r.json();}).then(function(tp){ tempos=tp; window.quadro(0);
    var im=[].slice.call(document.images), n=im.length, ok=function(){ if(--n<=0) document.fonts.ready.then(function(){window.__pronto=true;}); }; if(!n)ok(); im.forEach(function(i){ if(i.complete)ok(); else {i.onload=ok;i.onerror=ok;} });
    if(grav)return; var au=$('som'), t0=0, run=false;
    function loop(){ if(!run)return; var t=au&&!au.paused?au.currentTime:(performance.now()-t0)/1000; window.quadro(Math.min(t,tp.dur)); if(t<tp.dur)requestAnimationFrame(loop); else run=false; }
    function tocar(s){ $('capa').style.display='none'; run=true; t0=performance.now(); if(s&&au){au.currentTime=0;au.play().catch(function(){});} loop(); }
    $('btSom').onclick=function(){tocar(true);}; $('btMudo').onclick=function(){tocar(false);}; }); } };
})();
