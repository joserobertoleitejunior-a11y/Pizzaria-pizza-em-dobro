/* Cenário provisório DESENHADO POR CÓDIGO (estilo traço grosso), no mesmo tamanho do cenário do ChatGPT (2880×1920, chão em y=1560).
   Quando o cenário do ChatGPT chegar, é só colocar o arquivo em video/cenarios/ e este aqui deixa de ser usado. */
window.cenarioPlaceholder=function(){ var N='#141414', ST='stroke="'+N+'" stroke-width="8" stroke-linejoin="round" stroke-linecap="round"';
  var quadro=function(x,y,t1,t2){ return '<g><rect x="'+x+'" y="'+y+'" width="190" height="250" fill="#2a2018" '+ST+'/><rect x="'+(x+16)+'" y="'+(y+16)+'" width="158" height="218" fill="#f6e7c8"/><text x="'+(x+95)+'" y="'+(y+80)+'" font-family="Archivo Black,Arial Black,sans-serif" font-size="30" text-anchor="middle" fill="#c8281f">'+t1+'</text><text x="'+(x+95)+'" y="'+(y+126)+'" font-family="Archivo Black,Arial Black,sans-serif" font-size="46" text-anchor="middle" fill="'+N+'">'+t2+'</text><circle cx="'+(x+95)+'" cy="'+(y+182)+'" r="38" fill="#e8a33a" '+ST+'/></g>'; };
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2880 1920" width="2880" height="1920">'+
  '<defs><linearGradient id="ceu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1d2a4d"/><stop offset="1" stop-color="#f2a66b"/></linearGradient></defs>'+
  '<rect width="2880" height="1560" fill="url(#ceu)"/>'+
  // rua e calçada
  '<rect y="1560" width="1000" height="360" fill="#9aa0a6"/><rect y="1560" width="1000" height="60" fill="#c9ccd0" '+ST+'/><rect x="1000" y="1560" width="880" height="360" fill="#b8bdc2"/><path d="M0,1790 L1000,1790" stroke="#fff" stroke-width="14" stroke-dasharray="90 70"/>'+
  // poste
  '<rect x="470" y="740" width="26" height="820" fill="#3a3a3a" '+ST+'/><circle cx="483" cy="720" r="52" fill="#ffe08a" '+ST+'/>'+
  // árvore
  '<rect x="150" y="1180" width="30" height="380" fill="#6b4a2b" '+ST+'/><circle cx="165" cy="1100" r="130" fill="#2f9e5b" '+ST+'/><circle cx="90" cy="1180" r="80" fill="#2f9e5b" '+ST+'/>'+
  // fachada
  '<rect x="1000" y="520" width="1000" height="1040" fill="#1b1b1f" '+ST+'/><rect x="1000" y="1456" width="1000" height="22" fill="#f5b800"/><rect x="1000" y="1478" width="1000" height="82" fill="#c8281f"/>'+
  '<rect x="1000" y="470" width="1000" height="60" fill="#8a6a3b" '+ST+'/>'+
  '<text x="1500" y="700" font-family="Archivo Black,Arial Black,sans-serif" font-size="150" text-anchor="middle" fill="#e63227" stroke="#fff" stroke-width="6" paint-order="stroke">PIZZA EM DOBRO</text>'+
  '<text x="1500" y="800" font-family="Archivo Black,Arial Black,sans-serif" font-size="48" text-anchor="middle" fill="#f5b800">DELIVERY · 15 99705-8390</text>'+
  // porta aberta com vista do interior
  '<rect x="1240" y="860" width="520" height="700" fill="#f6e7c8" '+ST+'/><rect x="1240" y="860" width="520" height="150" fill="#2b2b30" '+ST+'/><rect x="1330" y="1180" width="160" height="380" fill="#141414" opacity=".85"/><rect x="1390" y="1470" width="300" height="46" fill="#141414" '+ST+'/><rect x="1400" y="1480" width="280" height="12" fill="#c8281f"/>'+
  // mascote na parede
  '<g transform="translate(1790,1080)"><path d="M-70,-300 Q0,-340 70,-300 L10,60 Q0,72 -10,60 Z" fill="#ffd21f" '+ST+'/><path d="M-72,-300 Q0,-345 72,-300 L66,-250 Q0,-286 -66,-250 Z" fill="#e63227" '+ST+'/><circle cx="-24" cy="-190" r="14" fill="#fff" stroke="'+N+'" stroke-width="6"/><circle cx="24" cy="-190" r="14" fill="#fff" stroke="'+N+'" stroke-width="6"/><circle cx="-22" cy="-188" r="5" fill="'+N+'"/><circle cx="26" cy="-188" r="5" fill="'+N+'"/><path d="M-30,-140 Q0,-100 30,-140 Z" fill="#fff" stroke="'+N+'" stroke-width="6"/><ellipse cx="-50" cy="90" rx="46" ry="26" fill="#e63227" '+ST+'/><ellipse cx="50" cy="90" rx="46" ry="26" fill="#e63227" '+ST+'/></g>'+
  // interior (painel da direita)
  '<rect x="2000" y="520" width="880" height="1040" fill="#f3e3c1" '+ST+'/><rect x="2000" y="1560" width="880" height="360" fill="#c9a77a"/><path d="M2000,1560 L2880,1560" '+ST+'/>'+
  quadro(2090,720,'2 POR','R$65')+quadro(2330,720,'3 PIZZAS','GRÁTIS')+quadro(2570,720,'ABERTO','18h')+
  '<rect x="2430" y="1180" width="300" height="380" fill="#16161a" '+ST+'/><text x="2580" y="1300" font-family="Archivo Black,Arial Black,sans-serif" font-size="44" text-anchor="middle" fill="#ff3b30">PIZZA</text><text x="2580" y="1352" font-family="Archivo Black,Arial Black,sans-serif" font-size="44" text-anchor="middle" fill="#ff3b30">EM DOBRO</text>'+
  '<rect x="2650" y="1060" width="40" height="120" fill="#6b4a2b" '+ST+'/><circle cx="2670" cy="1040" r="70" fill="#2f9e5b" '+ST+'/>'+
  '</svg>'; };
