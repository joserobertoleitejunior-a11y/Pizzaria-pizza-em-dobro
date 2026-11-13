/* Personagens "stick" em SVG (visual de marca: traço grosso uniforme, cores chapadas, olhos com brilho, bochecha, logo no peito).
   Pés em (0,0), olhando pra direita. Poses em graus (positivo = pra frente). API: Stick.svg(id, look) · Stick.pose(id, pose) · Stick.andar(fase) */
window.Stick=(function(){
var N='#141414', R='#d62b20', Y='#f5b800', PELE='#ffd3a6', PELE2='#f2b98a';
var OL='stroke="'+N+'" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"';
function membro(cor,len){ // contorno preto + recheio colorido (fica "desenhado à mão" mas limpo)
  return '<line x1="0" y1="0" x2="0" y2="'+len+'" stroke="'+N+'" stroke-width="30" stroke-linecap="round"/><line x1="0" y1="0" x2="0" y2="'+len+'" stroke="'+cor+'" stroke-width="16" stroke-linecap="round"/>'; }
function perna(cls,cor,tenis){ return '<g class="'+cls+'">'+membro(cor,125)+'<g class="'+cls.replace('perna','joelho')+'" transform="translate(0,125)">'+membro(cor,118)+'<circle r="8" fill="'+cor+'"/>'+
  '<path d="M-20,104 Q-22,92 -6,90 L30,94 Q54,98 54,114 L54,122 L-20,122 Z" fill="'+tenis+'" '+OL+'/><path d="M-20,114 L54,114" stroke="#fff" stroke-width="7"/></g></g>'; }
function braco(cls,manga,cuff){ return '<g class="'+cls+'">'+membro(PELE,100)+'<g class="'+cls+'f" transform="translate(0,100)">'+membro(PELE,92)+'<circle r="8" fill="'+PELE+'"/>'+
  '<circle cx="0" cy="98" r="19" fill="'+PELE+'" '+OL+'/></g>'+
  '<path d="M-24,-10 Q0,-22 24,-10 L28,58 Q0,68 -28,58 Z" fill="'+manga+'" '+OL+'/>'+(cuff?'<path d="M-27,46 Q0,56 27,46 L28,58 Q0,68 -28,58 Z" fill="'+cuff+'"/>':'')+'</g>'; }
function rosto(){ return '<g class="rosto">'+
  '<ellipse cx="-48" cy="22" rx="14" ry="9" fill="#ff8a8a" opacity=".55"/><ellipse cx="48" cy="22" rx="14" ry="9" fill="#ff8a8a" opacity=".55"/>'+
  '<g class="olhos"><g class="olhoL" transform="translate(-26,-8)"><ellipse rx="15" ry="19" fill="#fff" '+OL+'/><g class="pup"><circle class="pL" cx="3" cy="2" r="8" fill="'+N+'"/><circle cx="6" cy="-2" r="3" fill="#fff"/></g></g>'+
  '<g class="olhoR" transform="translate(26,-8)"><ellipse rx="15" ry="19" fill="#fff" '+OL+'/><g class="pup"><circle class="pR" cx="3" cy="2" r="8" fill="'+N+'"/><circle cx="6" cy="-2" r="3" fill="#fff"/></g></g></g>'+
  '<path class="sobr" d="M-44,-38 Q-28,-48 -12,-40 M12,-40 Q28,-48 44,-38" fill="none" stroke="'+N+'" stroke-width="8" stroke-linecap="round"/>'+
  '<path d="M4,6 Q12,14 4,18" fill="none" stroke="'+PELE2+'" stroke-width="5" stroke-linecap="round"/>'+
  '<path class="boca" d="" fill="#7a1d1d" '+OL+'/></g>'; }
var BOCAS={sorriso:'M-26,30 Q0,58 26,30 Q0,40 -26,30 Z',aberta:'M-20,28 Q0,70 20,28 Q0,34 -20,28 Z',preocupado:'M-20,46 Q0,30 20,46 Q0,40 -20,46 Z',
  surpreso:'M-11,32 Q0,22 11,32 Q16,48 0,52 Q-16,48 -11,32 Z',neutro:'M-18,40 Q0,44 18,40 Q0,46 -18,40 Z',risada:'M-30,26 Q0,70 30,26 Z'};
function logoPeito(y,r){ return '<g class="cf"><circle cx="0" cy="'+(y+4)+'" r="'+(r+8)+'" fill="rgba(0,0,0,.28)"/><circle cx="0" cy="'+y+'" r="'+(r+8)+'" fill="#fff" stroke="'+N+'" stroke-width="6"/>'+
  '<image href="logo-carimbo.png" x="'+(-r)+'" y="'+(y-r)+'" width="'+(2*r)+'" height="'+(2*r)+'"/></g>'; }
function svg(id,o){ o=o||{}; var uni=!!o.uniforme, cam=o.camisa||'#2f7de1', calca=o.calca||(uni?'#222':'#2b4c7e'), tenis=o.tenis||(uni?R:'#f5f5f5');
  var corT=uni?'#1c1c1f':cam;
  var tronco='<path d="M-86,-448 Q0,-478 86,-448 L74,-262 Q0,-240 -74,-262 Z" fill="'+corT+'" '+OL+'/>'+
    '<path d="M30,-460 Q86,-448 86,-448 L74,-262 Q40,-252 26,-250 Q52,-360 30,-460 Z" fill="#000" opacity=".14"/>'+   // sombra lateral
    (uni?'<path d="M-86,-448 Q0,-478 86,-448 L84,-412 Q0,-440 -84,-412 Z" fill="'+R+'"/>'+                                  // ombros vermelhos
         '<path d="M-28,-466 L0,-420 L28,-466 Q0,-456 -28,-466 Z" fill="#fff" '+OL+'/><circle cx="0" cy="-404" r="5" fill="'+Y+'"/>'+  // gola polo + botão
         '<path d="M-76,-290 Q0,-270 76,-290 L75,-276 Q0,-256 -75,-276 Z" fill="'+Y+'"/>'+                                     // faixa amarela
         '<g class="cf"><rect x="30" y="-318" width="52" height="20" rx="5" fill="#fff" stroke="'+N+'" stroke-width="3"/><text x="56" y="-303" font-family="Archivo Black,Arial Black,sans-serif" font-size="12" text-anchor="middle" fill="'+N+'">EQUIPE</text></g>'
        :'<path d="M-26,-466 Q0,-440 26,-466" fill="none" stroke="'+N+'" stroke-width="7" stroke-linecap="round"/>')+
    logoPeito(uni?-368:-372,uni?50:46);
  var cabelo=o.bone?
    '<g><path d="M-74,-30 Q-76,-98 0,-102 Q76,-98 74,-30 Z" fill="'+R+'" '+OL+'/><path d="M46,-36 Q126,-40 128,-20 L54,-18 Z" fill="'+R+'" '+OL+'/>'+
    '<rect x="-74" y="-38" width="148" height="12" fill="'+Y+'" stroke="'+N+'" stroke-width="4"/>'+
    '<g class="cf"><circle cx="0" cy="-66" r="22" fill="#fff" stroke="'+N+'" stroke-width="4"/><image href="logo-carimbo.png" x="-19" y="-85" width="38" height="38"/></g></g>':
    '<path d="M-70,-26 Q-78,-92 -10,-96 Q20,-118 44,-92 Q82,-84 72,-24 Q50,-58 18,-56 Q-20,-70 -40,-46 Q-58,-52 -70,-26 Z" fill="#3a2414" '+OL+'/>';
  var cabeca='<g class="cabeca"><ellipse cx="-74" cy="6" rx="12" ry="16" fill="'+PELE+'" '+OL+'/><ellipse cx="74" cy="6" rx="12" ry="16" fill="'+PELE+'" '+OL+'/><circle cx="0" cy="0" r="74" fill="'+PELE+'" '+OL+'/>'+rosto()+cabelo+'</g>';
  var caixas='<g class="caixas" style="display:none"><g transform="translate(116,-330)">'+[0,1,2].map(function(i){return '<g class="cx'+i+'" transform="translate('+(i%2?6:-4)+','+(-i*38)+')"><rect x="-90" y="-34" width="180" height="38" rx="5" fill="#d9a766" '+OL+'/><rect x="-90" y="-34" width="180" height="11" fill="'+R+'"/><circle cx="0" cy="-12" r="11" fill="'+Y+'" stroke="'+N+'" stroke-width="4"/></g>';}).join('')+'</g></g>';
  return '<g id="'+id+'" class="stick"><ellipse class="som" cx="10" cy="6" rx="130" ry="18" fill="rgba(0,0,0,.3)"/><g class="corpo">'+
    '<g transform="translate(-34,-250)">'+perna('pernaD',calca,tenis)+'</g><g transform="translate(34,-250)">'+perna('pernaE',calca,tenis)+'</g>'+
    '<g transform="translate(-80,-438)">'+braco('bracoD',uni?'#1c1c1f':cam,uni?R:null)+'</g>'+
    '<g class="tronco">'+tronco+'<g transform="translate(0,-548)">'+cabeca+'</g></g>'+
    '<g transform="translate(80,-438)">'+braco('bracoE',uni?'#1c1c1f':cam,uni?R:null)+'</g>'+caixas+'</g></g>'; }
function set(el,sel,tr){ var g=el.querySelector(sel); if(g) g.setAttribute('transform',tr); }
function pose(id,p){ var el=document.getElementById(id); p=p||{}; var f=function(k,d){return p[k]===undefined?d:p[k];};
  set(el,'.corpo','translate(0,'+(-f('sobe',0))+')');
  set(el,'.pernaD','rotate('+(-f('cD',0))+')'); set(el,'.joelhoD','translate(0,125) rotate('+f('jD',0)+')');
  set(el,'.pernaE','rotate('+(-f('cE',0))+')'); set(el,'.joelhoE','translate(0,125) rotate('+f('jE',0)+')');
  set(el,'.bracoD','rotate('+(-f('oD',0))+')'); set(el,'.bracoDf','translate(0,100) rotate('+(-f('eD',10))+')');
  set(el,'.bracoE','rotate('+(-f('oE',0))+')'); set(el,'.bracoEf','translate(0,100) rotate('+(-f('eE',10))+')');
  var resp=f('respira',0); set(el,'.tronco','rotate('+f('incl',0)+' 0 -250) translate(0,'+(-resp)+')'); set(el,'.cabeca','rotate('+f('cab',0)+')');
  var m=el.querySelector('.boca'); if(m) m.setAttribute('d',BOCAS[f('boca','sorriso')]||BOCAS.sorriso);
  var sb=el.querySelector('.sobr'); if(sb) sb.setAttribute('transform','translate(0,'+f('sobr',0)+')');
  var ol=f('olhar',0), ov=f('olharV',0); el.querySelectorAll('.pup').forEach(function(g){ g.setAttribute('transform','translate('+ol+','+ov+')'); });
  var pis=Math.max(.08,1-f('pisca',0)); set(el,'.olhoL','translate(-26,-8) scale(1,'+pis+')'); set(el,'.olhoR','translate(26,-8) scale(1,'+pis+')');
  var cx=el.querySelector('.caixas'); if(cx){ cx.style.display=f('caixas',0)>0?'':'none'; for(var i=0;i<3;i++){ var b=el.querySelector('.cx'+i); if(b) b.style.display=i<f('caixas',0)?'':'none'; } }
  el.style.opacity=f('alfa',1); }
function andar(fase,v){ v=v===undefined?1:v; var s=Math.sin(fase), c=Math.cos(fase);
  return {cD:30*s*v,jD:Math.max(0,c)*40*v,cE:-30*s*v,jE:Math.max(0,-c)*40*v,oD:-32*s*v,oE:32*s*v,eD:22,eE:22,sobe:-243*(1-Math.cos(.5236*Math.abs(s)*v)),incl:4*v,cab:-2*s*v}; }
// piscada automática: 0..1 por tempo (pisca rápido a cada ~3 s, com deslocamento por personagem)
function pisca(t,off){ var x=((t+(off||0))%3.1); return x<.12?Math.sin(x/.12*Math.PI):0; }
return {svg:svg,pose:pose,andar:andar,pisca:pisca};
})();
