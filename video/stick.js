/* Personagens "stick" em SVG com volume (quase 3D): gradientes cilíndricos nos membros, cabeça esférica com brilho,
   sombra de contato, oclusão sob o queixo, olhos com reflexo. Pés em (0,0), olhando pra direita.
   API: Stick.svg(id, look) · Stick.pose(id, pose) · Stick.andar(fase) · Stick.pisca(t, off) */
window.Stick=(function(){
var N='#17120f', R='#d62b20', Y='#f5b800', PELE='#ffcf9e';
var OL='stroke="'+N+'" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"';
function tom(h,a){ var n=parseInt(h.slice(1),16), r=n>>16, g=n>>8&255, b=n&255, f=function(c){return Math.max(0,Math.min(255,Math.round(a<0?c*(1+a):c+(255-c)*a)));}; return '#'+((1<<24)+(f(r)<<16)+(f(g)<<8)+f(b)).toString(16).slice(1); }
function cil(id,c){ return '<linearGradient id="'+id+'" gradientUnits="userSpaceOnUse" x1="-9" y1="0" x2="9" y2="0"><stop offset="0" stop-color="'+tom(c,-.3)+'"/><stop offset=".35" stop-color="'+tom(c,.25)+'"/><stop offset=".6" stop-color="'+c+'"/><stop offset="1" stop-color="'+tom(c,-.38)+'"/></linearGradient>'; }
function vol(id,c){ return '<linearGradient id="'+id+'" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="'+tom(c,-.22)+'"/><stop offset=".3" stop-color="'+tom(c,.2)+'"/><stop offset=".62" stop-color="'+c+'"/><stop offset="1" stop-color="'+tom(c,-.4)+'"/></linearGradient>'; }
function esf(id,c,cx,cy){ return '<radialGradient id="'+id+'" cx="'+(cx||.38)+'" cy="'+(cy||.32)+'" r=".78"><stop offset="0" stop-color="'+tom(c,.3)+'"/><stop offset=".5" stop-color="'+c+'"/><stop offset="1" stop-color="'+tom(c,-.32)+'"/></radialGradient>'; }
function membro(len,gid){ return '<line x1="0" y1="0" x2="0" y2="'+len+'" stroke="'+N+'" stroke-width="30" stroke-linecap="round"/><line x1="0" y1="0" x2="0" y2="'+len+'" stroke="url(#'+gid+')" stroke-width="18" stroke-linecap="round"/>'; }
function perna(cls,id,tenis){ var j=cls.replace('perna','joelho');
  return '<g class="'+cls+'">'+membro(125,id+'-gCal')+'<g class="'+j+'" transform="translate(0,125)">'+membro(118,id+'-gCal')+'<line x1="0" y1="-18" x2="0" y2="4" stroke="url(#'+id+'-gCal)" stroke-width="18"/>'+
  '<path d="M-22,102 Q-24,88 -6,86 L32,90 Q58,95 58,112 L58,122 L-22,122 Z" fill="url(#'+id+'-gTen)" '+OL+'/><path d="M-22,113 L58,113" stroke="#fff" stroke-width="7"/><path d="M4,94 Q22,92 36,98" fill="none" stroke="#fff" stroke-width="4" opacity=".7"/></g></g>'; }
function braco(cls,id,cuff){
  return '<g class="'+cls+'">'+membro(100,id+'-gPel')+'<g class="'+cls+'f" transform="translate(0,100)">'+membro(92,id+'-gPel')+'<line x1="0" y1="-18" x2="0" y2="4" stroke="url(#'+id+'-gPel)" stroke-width="18"/>'+
  '<circle cx="0" cy="98" r="20" fill="url(#'+id+'-gMao)" '+OL+'/><path d="M-8,88 Q-2,84 6,88" stroke="#fff" stroke-width="4" fill="none" opacity=".6"/></g>'+
  '<path d="M-25,-10 Q0,-23 25,-10 L29,58 Q0,69 -29,58 Z" fill="url(#'+id+'-gCam)" '+OL+'/>'+(cuff?'<path d="M-28,46 Q0,56 28,46 L29,58 Q0,69 -29,58 Z" fill="'+cuff+'"/>':'')+'</g>'; }
function olho(cls,x){ return '<g class="'+cls+'" transform="translate('+x+',-8)"><ellipse rx="16" ry="20" fill="#fff" '+OL+'/><ellipse cx="0" cy="8" rx="14" ry="9" fill="#000" opacity=".06"/>'+
  '<g class="pup"><circle cx="3" cy="2" r="9.5" fill="#3b2516"/><circle cx="3" cy="2" r="5.5" fill="#000"/><circle cx="7" cy="-3" r="3.6" fill="#fff"/><circle cx="-1" cy="6" r="1.6" fill="#fff" opacity=".8"/></g></g>'; }
var BOCAS={sorriso:'M-26,30 Q0,58 26,30 Q0,40 -26,30 Z',aberta:'M-20,28 Q0,70 20,28 Q0,34 -20,28 Z',preocupado:'M-20,46 Q0,30 20,46 Q0,40 -20,46 Z',
  surpreso:'M-11,32 Q0,22 11,32 Q16,48 0,52 Q-16,48 -11,32 Z',neutro:'M-18,40 Q0,44 18,40 Q0,46 -18,40 Z',risada:'M-30,26 Q0,70 30,26 Z'};
function svg(id,o){ o=o||{}; var uni=!!o.uniforme, cam=uni?'#24232a':(o.camisa||'#2f7de1'), calca=o.calca||(uni?'#2a2a2e':'#2e5491'), tenis=o.tenis||(uni?R:'#f2f2f2'), cab=o.cabelo||'#3a2414';
  var defs='<defs>'+cil(id+'-gCal',calca)+cil(id+'-gPel',PELE)+esf(id+'-gMao',PELE)+vol(id+'-gCam',cam)+vol(id+'-gTen',tenis)+esf(id+'-gCab',PELE,.36,.3)+esf(id+'-gCbl',cab,.4,.25)+esf(id+'-gBon',R,.4,.25)+
    '<radialGradient id="'+id+'-gSom"><stop offset="0" stop-color="#000" stop-opacity=".42"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs>';
  var torsoP='M-86,-448 Q0,-478 86,-448 L74,-262 Q0,-240 -74,-262 Z';
  var tronco='<path d="'+torsoP+'" fill="url(#'+id+'-gCam)" '+OL+'/>'+
    '<ellipse cx="0" cy="-452" rx="58" ry="16" fill="#000" opacity=".22"/>'+                                         // oclusão sob o queixo
    '<path d="M-40,-330 Q-30,-300 -44,-276 M30,-350 Q42,-318 34,-290" fill="none" stroke="#000" stroke-width="5" opacity=".14" stroke-linecap="round"/>'+ // dobras
    '<path d="M-62,-440 Q-40,-452 -20,-446" fill="none" stroke="#fff" stroke-width="6" opacity=".25" stroke-linecap="round"/>'+                   // brilho no ombro
    (uni?'<path d="M-86,-448 Q0,-478 86,-448 L84,-414 Q0,-442 -84,-414 Z" fill="'+R+'"/><path d="M-84,-414 Q0,-442 84,-414" fill="none" stroke="'+Y+'" stroke-width="5"/>'+
         '<path d="M-28,-466 L0,-420 L28,-466 Q0,-456 -28,-466 Z" fill="#fff" '+OL+'/><circle cx="0" cy="-404" r="4.5" fill="'+Y+'"/><circle cx="0" cy="-386" r="4.5" fill="'+Y+'"/>'+
         '<path d="M-76,-288 Q0,-268 76,-288 L75,-274 Q0,-254 -75,-274 Z" fill="'+Y+'"/>'+
         // logo PEQUENO no peito (lado do coração), como bordado de uniforme
         '<g class="cf"><circle cx="40" cy="-404" r="24" fill="#fff" stroke="'+N+'" stroke-width="4"/><image href="logo-carimbo.png" x="19" y="-425" width="42" height="42"/></g>'+
         '<g class="cf"><rect x="-74" y="-412" width="44" height="16" rx="4" fill="#fff" stroke="'+N+'" stroke-width="3"/><text x="-52" y="-400" font-family="Archivo Black,Arial Black,sans-serif" font-size="10" text-anchor="middle" fill="'+N+'">EQUIPE</text></g>'
        :'<path d="M-26,-466 Q0,-440 26,-466" fill="none" stroke="'+N+'" stroke-width="7" stroke-linecap="round"/>');
  var cabelo=o.bone?
    '<g><path d="M-76,-30 Q-78,-100 0,-104 Q78,-100 76,-30 Z" fill="url(#'+id+'-gBon)" '+OL+'/><path d="M46,-36 Q128,-40 130,-20 L54,-18 Z" fill="'+tom(R,-.15)+'" '+OL+'/>'+
    '<path d="M-40,-88 Q-10,-100 20,-94" fill="none" stroke="#fff" stroke-width="7" opacity=".35" stroke-linecap="round"/><rect x="-76" y="-38" width="152" height="12" fill="'+Y+'" stroke="'+N+'" stroke-width="4"/>'+
    '<g class="cf"><circle cx="0" cy="-66" r="17" fill="#fff" stroke="'+N+'" stroke-width="4"/><image href="logo-carimbo.png" x="-14" y="-80" width="28" height="28"/></g></g>':
    '<path d="M-72,-26 Q-80,-94 -10,-98 Q20,-120 46,-94 Q84,-86 74,-24 Q52,-60 18,-58 Q-20,-72 -40,-48 Q-58,-54 -72,-26 Z" fill="url(#'+id+'-gCbl)" '+OL+'/><path d="M-30,-84 Q0,-96 26,-88" fill="none" stroke="#fff" stroke-width="6" opacity=".25" stroke-linecap="round"/>';
  var rosto='<g class="rosto"><ellipse cx="-48" cy="22" rx="15" ry="9" fill="#ff7f7f" opacity=".45"/><ellipse cx="48" cy="22" rx="15" ry="9" fill="#ff7f7f" opacity=".45"/>'+
    '<g class="olhos">'+olho('olhoL',-27)+olho('olhoR',27)+'</g>'+
    '<path class="sobr" d="M-46,-40 Q-28,-50 -11,-42 M11,-42 Q28,-50 46,-40" fill="none" stroke="'+N+'" stroke-width="8" stroke-linecap="round"/>'+
    '<ellipse cx="6" cy="14" rx="9" ry="7" fill="'+tom(PELE,-.18)+'"/><ellipse cx="3" cy="11" rx="3" ry="2" fill="#fff" opacity=".6"/>'+
    '<path class="boca" d="" fill="#7a1d1d" '+OL+'/></g>';
  var cabeca='<g class="cabeca"><ellipse cx="-76" cy="6" rx="12" ry="16" fill="url(#'+id+'-gMao)" '+OL+'/><ellipse cx="76" cy="6" rx="12" ry="16" fill="url(#'+id+'-gMao)" '+OL+'/>'+
    '<circle cx="0" cy="0" r="76" fill="url(#'+id+'-gCab)" '+OL+'/><ellipse cx="-28" cy="-40" rx="22" ry="12" fill="#fff" opacity=".28" transform="rotate(-20 -28 -40)"/>'+rosto+cabelo+'</g>';
  var caixas='<g class="caixas" style="display:none"><g transform="translate(118,-330)">'+[0,1,2].map(function(i){return '<g class="cx'+i+'" transform="translate('+(i%2?6:-4)+','+(-i*40)+')"><rect x="-92" y="-36" width="184" height="40" rx="5" fill="#d9a766" '+OL+'/><rect x="-92" y="-36" width="184" height="12" fill="'+R+'"/><rect x="-92" y="-4" width="184" height="8" fill="#000" opacity=".15"/><circle cx="0" cy="-12" r="11" fill="'+Y+'" stroke="'+N+'" stroke-width="4"/></g>';}).join('')+'</g></g>';
  return '<g id="'+id+'" class="stick">'+defs+'<ellipse class="som" cx="10" cy="6" rx="150" ry="24" fill="url(#'+id+'-gSom)"/><g class="corpo">'+
    '<g transform="translate(-34,-250)">'+perna('pernaD',id,tenis)+'</g><g transform="translate(34,-250)">'+perna('pernaE',id,tenis)+'</g>'+
    '<g transform="translate(-80,-438)">'+braco('bracoD',id,uni?R:null)+'</g>'+
    '<g class="tronco">'+tronco+'<g transform="translate(0,-552)">'+cabeca+'</g></g>'+
    '<g transform="translate(80,-438)">'+braco('bracoE',id,uni?R:null)+'</g>'+caixas+'</g></g>'; }
function set(el,sel,tr){ var g=el.querySelector(sel); if(g) g.setAttribute('transform',tr); }
function pose(id,p){ var el=document.getElementById(id); p=p||{}; var f=function(k,d){return p[k]===undefined?d:p[k];};
  set(el,'.corpo','translate(0,'+(-f('sobe',0))+')');
  set(el,'.pernaD','rotate('+(-f('cD',0))+')'); set(el,'.joelhoD','translate(0,125) rotate('+f('jD',0)+')');
  set(el,'.pernaE','rotate('+(-f('cE',0))+')'); set(el,'.joelhoE','translate(0,125) rotate('+f('jE',0)+')');
  set(el,'.bracoD','rotate('+(-f('oD',0))+')'); set(el,'.bracoDf','translate(0,100) rotate('+(-f('eD',10))+')');
  set(el,'.bracoE','rotate('+(-f('oE',0))+')'); set(el,'.bracoEf','translate(0,100) rotate('+(-f('eE',10))+')');
  set(el,'.tronco','rotate('+f('incl',0)+' 0 -250) translate(0,'+(-f('respira',0))+')'); set(el,'.cabeca','rotate('+f('cab',0)+')');
  var m=el.querySelector('.boca'); if(m) m.setAttribute('d',BOCAS[f('boca','sorriso')]||BOCAS.sorriso);
  var sb=el.querySelector('.sobr'); if(sb) sb.setAttribute('transform','translate(0,'+f('sobr',0)+')');
  var ol=f('olhar',0), ov=f('olharV',0); el.querySelectorAll('.pup').forEach(function(g){ g.setAttribute('transform','translate('+ol+','+ov+')'); });
  var pis=Math.max(.08,1-f('pisca',0)); set(el,'.olhoL','translate(-27,-8) scale(1,'+pis+')'); set(el,'.olhoR','translate(27,-8) scale(1,'+pis+')');
  var cx=el.querySelector('.caixas'); if(cx){ cx.style.display=f('caixas',0)>0?'':'none'; for(var i=0;i<3;i++){ var b=el.querySelector('.cx'+i); if(b) b.style.display=i<f('caixas',0)?'':'none'; } }
  el.style.opacity=f('alfa',1); }
function andar(fase,v){ v=v===undefined?1:v; var s=Math.sin(fase), c=Math.cos(fase);
  return {cD:30*s*v,jD:Math.max(0,c)*40*v,cE:-30*s*v,jE:Math.max(0,-c)*40*v,oD:-32*s*v,oE:32*s*v,eD:22,eE:22,sobe:-243*(1-Math.cos(.5236*Math.abs(s)*v)),incl:4*v,cab:-2*s*v}; }
function pisca(t,off){ var x=((t+(off||0))%3.1); return x<.12?Math.sin(x/.12*Math.PI):0; }
return {svg:svg,pose:pose,andar:andar,pisca:pisca};
})();
