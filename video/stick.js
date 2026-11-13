/* Boneco "stick" em SVG, animado por código. Pés em (0,0), olhando pra direita. Poses em graus (positivo = pra frente). */
window.Stick=(function(){
var N='#141414', R='#c8281f', Y='#f5b800';
function limb(len1,len2,cls1,cls2,extra2,w){ w=w||17;
  return '<g class="'+cls1+'"><line x1="0" y1="0" x2="0" y2="'+len1+'" stroke="'+N+'" stroke-width="'+w+'" stroke-linecap="round"/><g class="'+cls2+'" transform="translate(0,'+len1+')"><line x1="0" y1="0" x2="0" y2="'+len2+'" stroke="'+N+'" stroke-width="'+w+'" stroke-linecap="round"/>'+extra2+'</g></g>'; }
var mao='<circle cx="0" cy="'+(104)+'" r="15" fill="#ffdcb0" stroke="'+N+'" stroke-width="5"/>';
var sapato='<path d="M-12,118 Q-12,104 4,104 L34,108 Q46,112 44,124 L-12,124 Z" fill="'+N+'"/>';
function arm(cls,sleeve,cuff,o){ // pivô no ombro
  return '<g class="'+cls+'">'+limb(100,98,cls+'u',cls+'f',mao)+
    '<path d="M-17,-8 L17,-8 L21,58 L-21,58 Z" fill="'+sleeve+'" stroke="'+N+'" stroke-width="5" stroke-linejoin="round"/>'+
    (cuff?'<path d="M-21,46 L21,46 L21,58 L-21,58 Z" fill="'+cuff+'"/>':'')+'</g>'; }
function face(){ return '<g class="rosto"><g class="olhos"><ellipse cx="-24" cy="-6" rx="8" ry="11" fill="#fff" stroke="'+N+'" stroke-width="4"/><ellipse cx="24" cy="-6" rx="8" ry="11" fill="#fff" stroke="'+N+'" stroke-width="4"/><circle class="pL" cx="-21" cy="-5" r="4.5" fill="'+N+'"/><circle class="pR" cx="27" cy="-5" r="4.5" fill="'+N+'"/></g>'+
  '<path class="sobr" d="M-38,-28 Q-24,-36 -10,-28 M10,-28 Q24,-36 38,-28" fill="none" stroke="'+N+'" stroke-width="6" stroke-linecap="round"/><path class="boca" d="M-24,24 Q0,46 24,24" fill="#fff" stroke="'+N+'" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></g>'; }
var BOCAS={sorriso:'M-26,22 Q0,50 26,22 Z',aberta:'M-22,20 Q0,60 22,20 Z',preocupado:'M-22,38 Q0,16 22,38',surpreso:'M-10,24 Q0,12 10,24 Q18,40 0,46 Q-18,40 -10,24 Z',neutro:'M-18,30 L18,30'};
function svg(id,o){ o=o||{}; var camisa=o.camisa||'#2e7be6', uni=!!o.uniforme;
  var logoImg='<circle cx="0" cy="-372" r="58" fill="#fff" stroke="'+N+'" stroke-width="5"/><image href="logo-carimbo.png" x="-52" y="-424" width="104" height="104" preserveAspectRatio="xMidYMid slice"/>';
  var tronco=uni?
    '<path d="M-84,-446 Q0,-474 84,-446 L70,-250 Q0,-232 -70,-250 Z" fill="'+N+'" stroke="'+N+'" stroke-width="6" stroke-linejoin="round"/>'+
    '<path d="M-84,-446 Q0,-474 84,-446 L82,-420 Q0,-446 -82,-420 Z" fill="'+R+'"/>'+                       // ombros vermelhos
    '<path d="M-24,-462 L0,-424 L24,-462 Z" fill="#fff" stroke="'+N+'" stroke-width="4" stroke-linejoin="round"/>'+ // gola polo
    '<path d="M-72,-300 Q0,-282 72,-300 L70,-282 Q0,-264 -70,-282 Z" fill="'+Y+'"/>'+                            // faixa amarela na barra
    '<g class="cf">'+logoImg+'</g>'+
    '<g class="cf"><rect x="26" y="-330" width="46" height="18" rx="4" fill="#fff"/><text x="49" y="-316" font-family="Archivo Black,Arial Black,sans-serif" font-size="11" text-anchor="middle" fill="'+N+'">EQUIPE</text></g>'+
    '<circle cx="0" cy="-296" r="0" fill="none"/>':
    '<path d="M-84,-446 Q0,-474 84,-446 L70,-250 Q0,-232 -70,-250 Z" fill="'+camisa+'" stroke="'+N+'" stroke-width="6" stroke-linejoin="round"/><path d="M-22,-462 Q0,-440 22,-462" fill="none" stroke="'+N+'" stroke-width="6"/><rect x="26" y="-390" width="36" height="34" rx="5" fill="none" stroke="'+N+'" stroke-width="4"/>';
  var cabelo=o.bone?
    '<path d="M-66,-24 Q-66,-84 0,-88 Q66,-84 66,-24 Z" fill="'+R+'" stroke="'+N+'" stroke-width="6" stroke-linejoin="round"/><path d="M40,-30 Q110,-34 112,-18 L50,-16 Z" fill="'+R+'" stroke="'+N+'" stroke-width="6" stroke-linejoin="round"/><rect x="-66" y="-30" width="132" height="12" fill="'+Y+'"/><circle cx="0" cy="-58" r="19" fill="#fff" stroke="'+N+'" stroke-width="4"/><image href="logo-carimbo.png" x="-16" y="-74" width="32" height="32"/>':
    '<path d="M-30,-66 Q-14,-98 6,-70 Q22,-96 40,-62" fill="none" stroke="'+N+'" stroke-width="8" stroke-linecap="round"/>';
  var cabeca='<g class="cabeca"><circle cx="0" cy="0" r="66" fill="#ffdcb0" stroke="'+N+'" stroke-width="7"/>'+face()+cabelo+'</g>';
  var caixas='<g class="caixas" style="display:none"><g transform="translate(112,-330)">'+[0,1,2].map(function(i){return '<g class="cx'+i+'" transform="translate(0,'+(-i*34)+')"><rect x="-84" y="-30" width="168" height="34" rx="4" fill="#d9a766" stroke="'+N+'" stroke-width="5"/><rect x="-84" y="-30" width="168" height="10" fill="'+R+'"/><circle cx="0" cy="-12" r="9" fill="'+Y+'" stroke="'+N+'" stroke-width="3"/></g>';}).join('')+'</g></g>';
  return '<g id="'+id+'" class="stick"><ellipse class="som" cx="0" cy="4" rx="120" ry="16" fill="rgba(0,0,0,.28)"/>'+
   '<g class="corpo">'+
    '<g transform="translate(-30,-250)">'+limb(125,122,'pernaD','joelhoD',sapato)+'</g>'+
    '<g transform="translate(30,-250)">'+limb(125,122,'pernaE','joelhoE',sapato)+'</g>'+
    '<g transform="translate(-78,-440)">'+arm('bracoD',uni?N:camisa,uni?R:null)+'</g>'+
    '<g class="tronco">'+tronco+'<g transform="translate(0,-520)">'+cabeca+'</g></g>'+
    '<g transform="translate(78,-440)">'+arm('bracoE',uni?N:camisa,uni?R:null)+'</g>'+caixas+
   '</g></g>'; }
function set(el,sel,tr){ var g=el.querySelector(sel); if(g) g.setAttribute('transform',tr); }
function pose(id,p){ var el=document.getElementById(id); p=p||{};
  var f=function(k,d){return p[k]===undefined?d:p[k];};
  set(el,'.corpo','translate(0,'+(-f('sobe',0))+')');
  set(el,'.pernaD','rotate('+(-f('cD',0))+')'); set(el,'.joelhoD','translate(0,125) rotate('+f('jD',0)+')');
  set(el,'.pernaE','rotate('+(-f('cE',0))+')'); set(el,'.joelhoE','translate(0,125) rotate('+f('jE',0)+')');
  set(el,'.bracoD','rotate('+(-f('oD',0))+')'); set(el,'.bracoDf','translate(0,100) rotate('+(-f('eD',10))+')');
  set(el,'.bracoE','rotate('+(-f('oE',0))+')'); set(el,'.bracoEf','translate(0,100) rotate('+(-f('eE',10))+')');
  set(el,'.tronco','rotate('+f('incl',0)+' 0 -250)'); set(el,'.cabeca','rotate('+f('cab',0)+')');
  var m=el.querySelector('.boca'); if(m) m.setAttribute('d',BOCAS[f('boca','sorriso')]||BOCAS.sorriso);
  var sb=el.querySelector('.sobr'); if(sb) sb.setAttribute('transform','translate(0,'+f('sobr',0)+')');
  var ol=f('olhar',0); [['.pL',-21],['.pR',27]].forEach(function(a){ var c=el.querySelector(a[0]); if(c) c.setAttribute('cx',a[1]+ol); });
  var cx=el.querySelector('.caixas'); if(cx){ cx.style.display=f('caixas',0)>0?'':'none'; for(var i=0;i<3;i++){ var b=el.querySelector('.cx'+i); if(b) b.style.display=i<f('caixas',0)?'':'none'; } }
  el.style.opacity=f('alfa',1); }
function andar(fase,v){ v=v===undefined?1:v; var s=Math.sin(fase), c=Math.cos(fase);
  return {cD:30*s*v,jD:Math.max(0,c)*40*v,cE:-30*s*v,jE:Math.max(0,-c)*40*v,oD:-30*s*v,oE:30*s*v,eD:18,eE:18,sobe:-247*(1-Math.cos(.5236*Math.abs(s)*v)),incl:4*v}; }
return {svg:svg,pose:pose,andar:andar};
})();
