/* Motor do estilo editorial: tudo é função do tempo t (quadro(t)), igual ao motor antigo — serve pro render quadro a quadro e pra prévia. */
(function(){
var $=function(i){return document.getElementById(i);};
var ST='fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"';
var IC={
 fatia:'<svg viewBox="0 0 48 48" '+ST+'><path d="M6 12c11-6 25-6 36 0L24 43z"/><circle cx="19" cy="20" r="2.6"/><circle cx="29" cy="22" r="2.6"/><circle cx="24" cy="31" r="2.6"/></svg>',
 moto:'<svg viewBox="0 0 48 48" '+ST+'><circle cx="11" cy="35" r="6"/><circle cx="38" cy="35" r="6"/><path d="M17 35h12l5-15h-8"/><path d="M34 20l4 15"/><path d="M28 12h7l3 8"/><path d="M5 22h10M3 28h8"/></svg>',
 carrinho:'<svg viewBox="0 0 48 48" '+ST+'><path d="M4 6h6l5 24h22l5-17H12"/><circle cx="18" cy="39" r="3"/><circle cx="34" cy="39" r="3"/></svg>',
 pix:'<svg viewBox="0 0 48 48" '+ST+'><path d="M24 4l9 9-9 9-9-9zM24 26l9 9-9 9-9-9zM4 24l9-9v18zM44 24l-9-9v18z"/></svg>',
 zap:'<svg viewBox="0 0 48 48" '+ST+'><path d="M6 42l3-10A17 17 0 1 1 16 39z"/><path d="M18 18c0 8 6 13 12 13l3-3-4-2-2 2c-3-1-5-3-6-6l2-2-2-4z"/></svg>',
 pin:'<svg viewBox="0 0 48 48" '+ST+'><path d="M24 44S9 29 9 19a15 15 0 0 1 30 0c0 10-15 25-15 25z"/><circle cx="24" cy="19" r="5"/></svg>',
 presente:'<svg viewBox="0 0 48 48" '+ST+'><rect x="7" y="19" width="34" height="22" rx="3"/><path d="M5 13h38v6H5zM24 13v28"/><path d="M24 13c-3-7-11-7-10-2 .5 3 6 2 10 2zM24 13c3-7 11-7 10-2-.5 3-6 2-10 2z"/></svg>',
 estrela:'<svg viewBox="0 0 48 48" '+ST+'><path d="M24 5l6 13 14 2-10 10 2 14-12-7-12 7 2-14L4 20l14-2z"/></svg>',
 gota:'<svg viewBox="0 0 48 48" '+ST+'><path d="M24 5s14 15 14 25a14 14 0 0 1-28 0C10 20 24 5 24 5z"/></svg>'
};
var d=function(n){return 'style="--d:'+n+'s"';};
/* ── visuais do quadro ── */
var V={
 foto:function(src,o){o=o||{};return '<img class="foto a zoom" src="'+src+'" '+(o.pos?'style="object-position:'+o.pos+'"':'')+' alt=""><div class="sombra"></div>';},
 badge:function(txt,peq,o){o=o||{};return '<div class="badge a pop '+(o.cls||'')+'" style="--d:'+(o.d||.35)+'s;left:'+(o.x||'60px')+';top:'+(o.y||'60px')+'">'+(peq?'<small>'+peq+'</small>':'')+txt+'</div>';},
 chips:function(l,o){o=o||{};return '<div class="chips" style="'+(o.pos||'top:560px')+'">'+l.map(function(c,i){var doce=/confete|brigadeiro|doce/i.test(c);return '<span class="chip a pop'+(doce?' doce':'')+'" '+d((o.d||.6)+i*.16)+'>'+c+'</span>';}).join('')+'</div>';},
 tiers:function(l){return '<div class="tiers">'+l.map(function(t,i){return '<div class="tier a up" '+d(.25+i*.45)+'><div class="q">'+t.q+'<small>esfihas</small></div><div><div class="p">'+t.p+'</div><div class="u">'+t.u+'</div><div class="barra"><i class="a grow" style="--w:'+t.w+'%;--d:'+(.7+i*.45)+'s;animation-duration:.9s"></i></div></div></div>';}).join('')+'</div>';},
 passos:function(l){return '<div class="passos">'+l.map(function(p,i){return '<div class="passo a up" '+d(.25+i*.55)+'><span class="n">'+(i+1)+'</span>'+IC[p.ic]+'<div><b>'+p.t+'</b><span>'+p.s+'</span></div></div>';}).join('')+'</div>';},
 aneis:function(){var z=[{r:370,t:'ZONA 4 · R$ 15'},{r:290,t:'ZONA 3 · R$ 10'},{r:210,t:'ZONA 2 · R$ 9'},{r:130,t:'ZONA 1 · R$ 8'}];
   return '<div class="aneis">'+z.map(function(a,i){return '<div class="anel a pop" style="--d:'+(.3+i*.55)+'s;width:'+a.r*2+'px;height:'+a.r*2+'px;margin:-'+a.r+'px 0 0 -'+a.r+'px"><b style="top:'+'-22px'+'">'+a.t+'</b></div>';}).join('')+'<div class="a pop" style="--d:.1s;position:absolute;left:-45px;top:-40px;width:90px;height:90px;color:#1b1714">'+IC.pin+'</div></div>';},
 entrega:function(n,txt){var fatias='';for(var i=0;i<n;i++)fatias+='<span class="a pop" '+d(.3+i*.5)+'>'+IC.fatia+'</span>';
   return '<div class="meter"><div class="pizzas3" style="justify-content:space-around">'+fatias+'</div><div class="trilho"><i class="a grow" style="--w:100%;--d:.3s;animation-duration:'+(n*.5+.4)+'s"></i></div></div><div class="a pop" style="--d:'+(n*.5+.6)+'s;position:absolute;left:60px;top:150px;width:220px;color:var(--ouro);display:none">'+IC.moto+'</div><div class="badge ouro a pop" style="--d:'+(n*.5+.7)+'s;left:50%;top:500px;margin-left:-400px;width:800px;font-size:100px;white-space:nowrap;text-align:center">'+txt+'</div>';},
 celular:function(frames,rot){var n=frames.length,K=426/390;
   var im=frames.map(function(f,i){var fr=(f.f!==undefined?f.f:(i===0?0:.08+(i/n)*.86));return '<img class="fr a fade" data-f="'+fr+'" style="--d:0s;animation-duration:.25s" src="telas/'+f.img+'.jpg" alt="">';}).join('');
   var tp=frames.map(function(f,i){if(!f.tap||i===n-1)return '';var nx=frames[i+1],fr=(nx.f!==undefined?nx.f:(.08+((i+1)/n)*.86));return '<span class="tap a" data-f="'+fr+'" data-o="-.7" style="left:'+(f.tap[0]*K)+'px;top:'+(f.tap[1]*K)+'px"></span>';}).join('');
   var lb=frames.map(function(f,i){if(!f.lb)return '';var fr=(f.f!==undefined?f.f:(i===0?0:.08+(i/n)*.86));return '<div class="lb a pop" data-f="'+fr+'" data-o=".15" style="top:'+(f.y||150)+'px"><i>'+(i+1)+'</i>'+f.lb+'</div>';}).join('');
   return '<div class="fone a up" style="--d:.1s"><div class="ilha"></div><div class="tela">'+im+tp+'</div></div>'+lb;},
 grande:function(txt,sub,o){o=o||{};return '<div class="a pop" style="--d:.25s;position:absolute;left:0;right:0;top:'+(o.top||'200px')+';text-align:center;font:400 190px/1 \'Archivo Black\';white-space:nowrap;color:var(--cor)">'+txt+'</div><div class="a up" style="--d:.6s;position:absolute;left:40px;right:40px;top:'+(o.top2||'400px')+';text-align:center;font:700 56px/1.2 \'Work Sans\'">'+sub+'</div>';}
};
/* ── legenda: divide a fala em blocos curtos e mostra um de cada vez ── */
function blocos(f){
  var p=f.replace(/\s+/g,' ').trim().split(/(?<=[,.:!?…])\s+/), out=[], cur='';
  p.forEach(function(s){ if(cur&&(cur+' '+s).length>34){out.push(cur);cur=s;}else cur=cur?cur+' '+s:s; });
  if(cur)out.push(cur); return out;
}
var C,cenas,tempos,pal;
var IG='<svg viewBox="0 0 48 48" '+ST+'><rect x="5" y="5" width="38" height="38" rx="11"/><circle cx="24" cy="24" r="9"/><circle cx="35" cy="13" r="1.6" fill="currentColor"/></svg>';
function moldura(){
  pal.insertAdjacentHTML('beforeend','<div id="moldura"><div class="mol-borda"></div>'+
   '<div class="mol-perfil a desce" style="--d:.1s"><span class="mol-anel"><img src="../assets/logo.png" alt=""></span><div><b>pizza_dobro_itape <svg class="ver" viewBox="0 0 24 24"><path fill="#0095f6" d="M12 1l2.6 2 3.2-.3 1.2 3 2.9 1.5-.6 3.2 1.6 2.8-2 2.5.2 3.2-3.1 1-1.8 2.7L12 21l-2.6 1.6-1.8-2.7-3.1-1 .2-3.2-2-2.5 1.6-2.8-.6-3.2L5 5.7l1.2-3L9.4 3z"/><path fill="none" stroke="#fff" stroke-width="2" d="M7.5 12.3l3 3 6-6.3"/></svg></b><small>Pizzaria · Todos os dias, 18h às 00h</small></div><span id="seguir" class="mol-seguir"><i>Seguir</i><i>✓ Siga no Insta</i></span></div>'+
   '<div class="mol-rodape a up" style="--d:.4s"><span class="mol-ig">'+IG+'</span><div><b>@pizza_dobro_itape</b><small>Delivery ON · 18h às 00h · WhatsApp (15) 99705-8390</small></div></div></div>');
}
function montar(cfg){
  pal=$('palco'); var h='';
  cfg.cenas.forEach(function(c,i){
    var leg=blocos(c.fala||'').map(function(b,j){return '<span class="bl" data-j="'+j+'">'+b.replace(/R\$\s?([\d.,]+)/g,'R$\u00a0$1').split(' ').map(function(w){return '<em class="w a pop'+(/^R\$/.test(w)?' pr':'')+'">'+w+'</em>';}).join(' ')+'</span>';}).join('');
    if(c.tipo==='mais') h+='<div class="cena" id="c-'+c.id+'"><div class="mais a fade">'+c.titulo+'</div><div class="legenda" style="top:1530px"><div style="position:relative;width:100%">'+leg+'</div></div></div>';
    else if(c.fim) h+='<div class="cena fimc" id="c-'+c.id+'"><div class="fbg"></div><div class="fveu"></div><div class="onda a" style="--d:1.05s"></div><img class="carimbo a" style="--d:.95s" src="logo-carimbo.png" alt="Pizza em Dobro"><div id="marca"><img src="../assets/logo.png" alt="">PIZZA EM <b>DOBRO</b></div><div class="tit"><i class="a up">'+c.t1+'</i><i class="a up" style="--d:.15s">'+c.t2+'</i></div><div class="sub a up" style="--d:.6s">'+c.sub+'</div><div class="url a up" style="--d:.9s">'+c.url+'</div><div class="legenda"><div style="position:relative;width:100%">'+leg+'</div></div><div class="credito a fade" style="--d:1.2s">FEITO POR VIBE CODING PROCESS</div></div>';
    else h+='<div class="cena" id="c-'+c.id+'"><div id="marca" class="a desce"><img src="../assets/logo.png" alt="">PIZZA EM <b>DOBRO</b></div><div class="tit"><i class="a up">'+c.t1+'</i><i class="a up" style="--d:.12s">'+c.t2+'</i></div><div class="quadro a fade"><div class="vis">'+c.vis+'</div>'+(c.card?'<div class="cartao a up" style="--d:.3s">'+IC[c.card.ic]+'<div><b>'+c.card.t+'</b><span>'+c.card.s+'</span></div></div>':'')+'</div><div class="legenda"><div style="position:relative;width:100%;height:100%;display:flex;align-items:center">'+leg+'</div></div></div>';
  });
  pal.insertAdjacentHTML('beforeend',h);
}
window.quadro=function(t){
  var atual=null; cenas.forEach(function(c){var s=tempos.cenas[c.id]; if(s&&t>=s.t0&&t<s.t1+.0001)atual=c;}); if(!atual)atual=cenas[cenas.length-1];
  cenas.forEach(function(c){var el=$('c-'+c.id); el.classList.toggle('on',c===atual);});
  var s=tempos.cenas[atual.id], u=Math.max(0,t-s.t0), el=$('c-'+atual.id); var dur=s.t1-s.t0-(atual.fim?0:.45);
  el.querySelectorAll('[data-f]').forEach(function(x){x.style.setProperty('--d',(parseFloat(x.dataset.f)*dur+parseFloat(x.dataset.o||0))+'s');});
  el.style.setProperty('--u',u+'s'); el.querySelectorAll('.a').forEach(function(a){a.style.setProperty('--u',u+'s');});
  // legenda: blocos distribuídos pelo tempo da fala (começa .2s depois da cena)
  var sp=el.querySelectorAll('.legenda .bl'), n=sp.length, ini=.2, fim=Math.max(ini+.5,(s.t1-s.t0)-(atual.fim?1.3:.45)), bd=(fim-ini)/n, k=Math.min(n-1,Math.max(0,Math.floor((u-ini)/bd)));
  sp.forEach(function(x,j){var ts=ini+j*bd; x.style.display=(j===k&&u>=ini)?'block':'none';
    if(j!==k)return; var ws=x.querySelectorAll('.w'), nw=ws.length, wd=bd*.92/nw;
    ws.forEach(function(w,i){var t0w=ts+i*wd; w.style.setProperty('--u',(u-t0w)+'s'); w.style.setProperty('--d','0s'); w.classList.toggle('ativa',u>=t0w&&u<t0w+wd*1.15);});});
  var ml=$('moldura'); if(ml){ml.style.setProperty('--u',t+'s'); ml.querySelectorAll('.a').forEach(function(a){a.style.setProperty('--u',t+'s');}); ml.classList.toggle('fim',!!atual.fim); var sg=$('seguir'); if(sg)sg.classList.toggle('ok',(t%6)>3.2);}
  if(atual.fim){var cr=el.querySelector('.credito'); if(cr)cr.style.setProperty('--u',u+'s');}
};
function ajustar(){ if(document.body.classList.contains('gravando'))return; var k=Math.min(innerWidth/1080,innerHeight/1920); pal.style.transform='scale('+k+')'; pal.style.marginLeft=Math.max(0,(innerWidth-1080*k)/2)+'px'; }
window.Estilo={iniciar:function(cfg){
  var grav=new URLSearchParams(location.search).has('gravar'); if(grav)document.body.classList.add('gravando');
  cenas=cfg.cenas;
  window.__cfg={tempos:cfg.tempos,cenas:cfg.cenas.map(function(c){return {id:c.id,fala:c.fala,min:c.min||0,fim:!!c.fim};})};
  montar(cfg); if(cfg.moldura!==false&&!/semmoldura/.test(location.search))moldura(); ajustar(); addEventListener('resize',ajustar);
  fetch(cfg.tempos).then(function(r){return r.json();}).then(function(tp){
    tempos=tp; window.quadro(0);
    var imgs=[].slice.call(document.images), n=imgs.length; var ok=function(){ if(--n<=0) document.fonts.ready.then(function(){window.__pronto=true;}); }; if(!n)ok(); imgs.forEach(function(im){ if(im.complete)ok(); else {im.onload=ok;im.onerror=ok;} });
    if(grav)return;
    var au=$('som'), t0=0, rodando=false;
    function loop(){ if(!rodando)return; var t=au&&!au.paused?au.currentTime:(performance.now()-t0)/1000; window.quadro(Math.min(t,tp.dur)); if(t<tp.dur)requestAnimationFrame(loop); else rodando=false; }
    function tocar(som){ $('capa').style.display='none'; rodando=true; t0=performance.now(); if(som&&au){au.currentTime=0;au.play().catch(function(){});} loop(); }
    $('btSom').onclick=function(){tocar(true);}; $('btMudo').onclick=function(){tocar(false);};
  });
}, IC:IC, V:V};
})();
