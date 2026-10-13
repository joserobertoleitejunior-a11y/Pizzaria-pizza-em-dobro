// ══════════════════════════════════════════════════════════
//  IMAGEM GERADA POR CÓDIGO — um SVG único por item, montado a partir dos
//  dados reais do próprio cardápio (não é foto de banco de imagens, nunca
//  repete entre dois itens diferentes). Determinístico por id (o mesmo
//  item sempre gera a mesma imagem; dois itens diferentes nunca coincidem).
//  Pizza/calzone → recheio "cheio" (camada de queijo derretido por baixo +
//  ingredientes de cima, não só pontinhos soltos). Bebida → garrafa/lata
//  ilustrada por cor real da bebida (nunca desenho de pizza numa bebida).
// ══════════════════════════════════════════════════════════

function _seedRand(seed){
  let s=(seed*9301+49297)%233280;
  return function(){ s=(s*9301+49297)%233280; return s/233280; };
}

// cor + tamanho de cada ingrediente reconhecido na descrição do item
const _INGREDIENTES_VISUAL=[
  {kw:'calabresa',color:'#A8432F',r:9},
  {kw:'peperone',color:'#A8432F',r:9},
  {kw:'bacon',color:'#8B4A2E',r:6},
  {kw:'lombo',color:'#D9A679',r:8},
  {kw:'frango',color:'#E8C9A0',r:8},
  {kw:'catupiry',color:'#FFF6E0',r:5},
  {kw:'requeijão',color:'#FFF6E0',r:5},
  {kw:'milho',color:'#F4C430',r:4},
  {kw:'presunto',color:'#E8A0A0',r:8},
  {kw:'peru',color:'#E8C4A8',r:8},
  {kw:'palmito',color:'#D4C896',r:6},
  {kw:'atum',color:'#8B6F47',r:8},
  {kw:'cebola',color:'#F5ECD8',r:6},
  {kw:'azeitona',color:'#2E3A2E',r:4},
  {kw:'gorgonzola',color:'#D8D4B8',r:6},
  {kw:'cheddar',color:'#E8A33D',r:5},
  {kw:'parmesão',color:'#F0E0A8',r:3},
  {kw:'brócolis',color:'#4A6B3A',r:7},
  {kw:'ervilha',color:'#6B8E4E',r:4},
  {kw:'ovo',color:'#F4D35E',r:8},
  {kw:'alho',color:'#F5ECD8',r:4},
  {kw:'pimenta',color:'#C1281E',r:4},
];
const _DOCE_VISUAL=[
  {kw:'granulado',color:'#3A2818',r:3},
  {kw:'coco',color:'#FFF8E7',r:3},
  {kw:'confete',rainbow:true,r:5},
  {kw:'morango',color:'#D14D4D',r:7},
];
const _PALETA_CONFETE=['#C1623B','#E8B088','#4A6B3A','#4285F4','#E8C430','#A8432F'];

function gerarImagemSaborSVG(item){
  const seed=Number(item.id)||1;
  const rnd=_seedRand(seed);
  const desc=((item.d||'')+' '+(item.n||'')).toLowerCase();
  const isDoce=item.cat==='dw'||(item.cat==='cz'&&/chocolate|confete|amores|prestígio|brigadeiro/.test(desc));
  const isCalzone=item.cat==='cz';
  const temGoiabada=/goiabada/.test(desc);

  const W=300,H=200,cx=150,cy=100;
  const crustColor='#D9A54A', crustColor2='#B97830';
  let baseColor1,baseColor2,sauceRing=true;

  if(isDoce && !temGoiabada){
    baseColor1=['#4A3426','#5A4030'][Math.floor(rnd()*2)]; baseColor2='#3A281C'; sauceRing=false;
  }else if(temGoiabada){
    baseColor1='#FFF6E0'; baseColor2='#F5E8C8'; sauceRing=false;
  }else{
    baseColor1='#F2D98A'; baseColor2='#E8C867';
  }

  const raio=isCalzone?74:78;
  const raioBase=raio-14;
  const centroY=isCalzone?cy+raio*.22:cy;
  const escalaY=isCalzone?.55:1;

  let formaBase;
  if(isCalzone){
    formaBase=`<path d="M ${cx-raio},${cy} A ${raio},${raio} 0 0 1 ${cx+raio},${cy} L ${cx+raio},${cy+raio*.55} A ${raio},${raio*.55} 0 0 1 ${cx-raio},${cy+raio*.55} Z"
      fill="${crustColor}" stroke="${crustColor2}" stroke-width="3"/>
      <path d="M ${cx-raio+10},${cy+4} A ${raio-10},${raio-10} 0 0 1 ${cx+raio-10},${cy+4} L ${cx+raio-10},${cy+raio*.5} A ${raio-10},${raio*.42} 0 0 1 ${cx-raio+10},${cy+raio*.5} Z"
      fill="${baseColor1}"/>`;
  }else{
    formaBase=`<circle cx="${cx}" cy="${cy}" r="${raio}" fill="${crustColor}" stroke="${crustColor2}" stroke-width="2"/>
      ${sauceRing?`<circle cx="${cx}" cy="${cy}" r="${raio-9}" fill="#B4432E"/>`:''}
      <circle cx="${cx}" cy="${cy}" r="${raioBase}" fill="${baseColor1}"/>`;
  }

  // camada de "queijo derretido" — blobs irregulares e sobrepostos cobrindo quase
  // toda a superfície, pra nunca ficar com cara de vazio/sem recheio
  let queijoDerretido='';
  const nBlobs=9;
  for(let k=0;k<nBlobs;k++){
    const ang=(k/nBlobs)*Math.PI*2+rnd()*.6;
    const dist=rnd()*(raioBase*.65);
    const px=cx+Math.cos(ang)*dist;
    const py=centroY+Math.sin(ang)*dist*escalaY;
    const rx=(raioBase*.32)*(.75+rnd()*.5);
    const ry=rx*(.75+rnd()*.4);
    const rot=Math.floor(rnd()*360);
    queijoDerretido+=`<ellipse cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="${baseColor2}" opacity="${(.4+rnd()*.3).toFixed(2)}" transform="rotate(${rot} ${px.toFixed(1)} ${py.toFixed(1)})"/>`;
  }

  // ingredientes detectados na descrição real do item
  const ativos=(isDoce?_DOCE_VISUAL:_INGREDIENTES_VISUAL).filter(ing=>desc.includes(ing.kw));
  if(temGoiabada) ativos.push({kw:'goiabada',color:'#C1623B',r:9});
  if(!ativos.length) ativos.push({kw:'queijo',color:'#FFE9A8',r:5}); // mussarela/queijo simples

  let toppings='';
  const baseQtd=isDoce&&ativos.some(a=>a.rainbow)?26:16;
  ativos.forEach(ing=>{
    const qtd=ing.rainbow?baseQtd:Math.max(6,Math.floor(baseQtd/ativos.length)+3);
    for(let k=0;k<qtd;k++){
      const ang=rnd()*Math.PI*2;
      const raioMax=isCalzone?raio*.5:raioBase-6;
      const dist=Math.sqrt(rnd())*raioMax;
      const px=cx+Math.cos(ang)*dist;
      const py=centroY+Math.sin(ang)*dist*escalaY;
      const cor=ing.rainbow?_PALETA_CONFETE[Math.floor(rnd()*_PALETA_CONFETE.length)]:ing.color;
      const rr=(ing.r*(.75+rnd()*.5));
      const rot=Math.floor(rnd()*360);
      // pedaço irregular (elipse levemente rotacionada) em vez de círculo perfeito — lê mais
      // como "pedaço de ingrediente de verdade" do que "bolinha decorativa"
      toppings+=`<ellipse cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" rx="${rr.toFixed(1)}" ry="${(rr*.8).toFixed(1)}" fill="${cor}" opacity="${(.88+rnd()*.12).toFixed(2)}" transform="rotate(${rot} ${px.toFixed(1)} ${py.toFixed(1)})"/>`;
    }
  });

  // brilho quente por cima, pra dar sensação de "assado na hora"
  const brilho=isCalzone
    ?`<ellipse cx="${cx-raio*.3}" cy="${cy+raio*.15}" rx="${raio*.5}" ry="${raio*.25}" fill="#fff" opacity=".08"/>`
    :`<ellipse cx="${cx-raio*.28}" cy="${cy-raio*.28}" rx="${raio*.42}" ry="${raio*.3}" fill="#fff" opacity=".1"/>`;

  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="#EDE3D4"/>
    ${formaBase}
    ${queijoDerretido}
    ${toppings}
    ${brilho}
  </svg>`;
  return 'data:image/svg+xml;utf8,'+encodeURIComponent(svg);
}

// ── BEBIDAS — garrafa ou lata ilustrada, cor real da bebida, nunca pizza ──
const _BEBIDA_VISUAL=[
  {kw:'água',cor:'#BFE3F0',tampa:'#4285F4',rotulo:'#fff',formato:'garrafa'},
  {kw:'cerveja',cor:'#E8A33D',tampa:'#C1623B',rotulo:'#FFF6E0',formato:'lata'},
  {kw:'coca',cor:'#5C1A1A',tampa:'#3A2818',rotulo:'#fff',formato:'garrafa'},
  {kw:'fanta',cor:'#E8792E',tampa:'#A8432F',rotulo:'#fff',formato:'garrafa'},
  {kw:'kuat',cor:'#8B2E2E',tampa:'#5C1A1A',rotulo:'#F4C430',formato:'garrafa'},
  {kw:'tubaína',cor:'#8BAA4E',tampa:'#4A6B3A',rotulo:'#fff',formato:'garrafa'},
  {kw:'del valle',cor:'#E8A33D',tampa:'#C1623B',rotulo:'#fff',formato:'caixinha'},
  {kw:'suco',cor:'#E8A33D',tampa:'#C1623B',rotulo:'#fff',formato:'caixinha'},
];
function gerarImagemBebidaSVG(item){
  const seed=Number(item.id)||1;
  const rnd=_seedRand(seed);
  const desc=((item.n||'')+' '+(item.d||'')).toLowerCase();
  const match=_BEBIDA_VISUAL.find(b=>desc.includes(b.kw))||{cor:'#8BAA4E',tampa:'#4A6B3A',rotulo:'#fff',formato:'garrafa'};
  const W=300,H=200,cx=150;

  let corpo;
  if(match.formato==='lata'){
    corpo=`<rect x="${cx-34}" y="55" width="68" height="110" rx="10" fill="${match.cor}"/>
      <rect x="${cx-34}" y="55" width="68" height="18" rx="9" fill="${match.tampa}"/>
      <rect x="${cx-34}" y="147" width="68" height="18" rx="9" fill="${match.tampa}" opacity=".6"/>
      <rect x="${cx-24}" y="90" width="48" height="38" rx="4" fill="${match.rotulo}" opacity=".92"/>`;
  }else if(match.formato==='caixinha'){
    corpo=`<path d="M ${cx-32},70 L ${cx-32},165 L ${cx+32},165 L ${cx+32},70 L ${cx},52 Z" fill="${match.cor}"/>
      <rect x="${cx-32}" y="70" width="64" height="95" fill="${match.cor}"/>
      <path d="M ${cx-32},70 L ${cx},52 L ${cx+32},70 Z" fill="${match.tampa}"/>
      <rect x="${cx-22}" y="95" width="44" height="34" rx="3" fill="${match.rotulo}" opacity=".92"/>`;
  }else{
    corpo=`<path d="M ${cx-16},40 L ${cx-16},62 L ${cx-30},88 L ${cx-30},162 Q ${cx-30},170 ${cx-22},170 L ${cx+22},170 Q ${cx+30},170 ${cx+30},162 L ${cx+30},88 L ${cx+16},62 L ${cx+16},40 Z" fill="${match.cor}"/>
      <rect x="${cx-9}" y="26" width="18" height="18" rx="3" fill="${match.tampa}"/>
      <rect x="${cx-24}" y="105" width="48" height="36" rx="4" fill="${match.rotulo}" opacity=".92"/>`;
  }
  const brilho=`<ellipse cx="${cx-14}" cy="95" rx="6" ry="46" fill="#fff" opacity=".16"/>`;

  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="#EDE3D4"/>
    ${corpo}
    ${brilho}
  </svg>`;
  return 'data:image/svg+xml;utf8,'+encodeURIComponent(svg);
}

// preenche img só de quem não tem (nunca sobrescreve foto real cadastrada no Firestore)
function preencherImagensGeradas(lista){
  (lista||[]).forEach(i=>{
    if(i.img) return;
    i.img = i.cat==='d' ? gerarImagemBebidaSVG(i) : gerarImagemSaborSVG(i);
  });
}
