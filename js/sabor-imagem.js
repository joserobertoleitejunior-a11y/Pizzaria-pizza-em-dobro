// ══════════════════════════════════════════════════════════
//  IMAGEM GERADA POR CÓDIGO — um SVG único por sabor, montado a partir dos
//  ingredientes reais da descrição do item (não é foto de banco de imagens,
//  nunca repete entre dois itens diferentes porque o desenho nasce dos
//  próprios dados do cardápio + um gerador de números pseudo-aleatório
//  travado no id do item, então o mesmo item sempre gera a mesma imagem).
// ══════════════════════════════════════════════════════════

function _seedRand(seed){
  let s=(seed*9301+49297)%233280;
  return function(){ s=(s*9301+49297)%233280; return s/233280; };
}

// cor + formato de cada ingrediente reconhecido na descrição do item
const _INGREDIENTES_VISUAL=[
  {kw:'calabresa',color:'#A8432F',r:7},
  {kw:'peperone',color:'#A8432F',r:7},
  {kw:'bacon',color:'#8B4A2E',r:5},
  {kw:'lombo',color:'#D9A679',r:6},
  {kw:'frango',color:'#E8C9A0',r:6},
  {kw:'catupiry',color:'#FFF6E0',r:3},
  {kw:'requeijão',color:'#FFF6E0',r:3},
  {kw:'milho',color:'#F4C430',r:3},
  {kw:'presunto',color:'#E8A0A0',r:6},
  {kw:'peru',color:'#E8C4A8',r:6},
  {kw:'palmito',color:'#D4C896',r:5},
  {kw:'atum',color:'#8B6F47',r:6},
  {kw:'cebola',color:'#F0E6D2',r:5},
  {kw:'azeitona',color:'#2E3A2E',r:3},
  {kw:'gorgonzola',color:'#D8D4B8',r:5},
  {kw:'cheddar',color:'#E8A33D',r:4},
  {kw:'parmesão',color:'#F0E0A8',r:2},
  {kw:'brócolis',color:'#4A6B3A',r:5},
  {kw:'ervilha',color:'#6B8E4E',r:3},
  {kw:'ovo',color:'#F4D35E',r:6},
  {kw:'alho',color:'#F0E6D2',r:3},
  {kw:'pimenta',color:'#C1281E',r:3},
];
const _DOCE_VISUAL=[
  {kw:'granulado',color:'#3A2818',r:2},
  {kw:'coco',color:'#FFF8E7',r:2},
  {kw:'confete',rainbow:true,r:4},
  {kw:'morango',color:'#D14D4D',r:5},
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
  let crustColor='#D9A54A', crustColor2='#C4883A';
  let baseColor, sauceRing=true;

  if(isDoce && !temGoiabada){
    baseColor=['#4A3426','#5A4030','#52392B'][Math.floor(rnd()*3)];
    sauceRing=false;
  }else if(temGoiabada){
    baseColor='#FFF6E0'; sauceRing=false;
  }else{
    baseColor=['#F2D98A','#EFD27E','#F0D68A'][Math.floor(rnd()*3)];
  }

  const raio=isCalzone?74:78;

  // forma base: calzone = meia-lua dobrada; pizza redonda normal
  let formaBase;
  if(isCalzone){
    formaBase=`<path d="M ${cx-raio},${cy} A ${raio},${raio} 0 0 1 ${cx+raio},${cy} L ${cx+raio},${cy+raio*.55} A ${raio},${raio*.55} 0 0 1 ${cx-raio},${cy+raio*.55} Z"
      fill="${crustColor}" stroke="${crustColor2}" stroke-width="3"/>
      <path d="M ${cx-raio+10},${cy+4} A ${raio-10},${raio-10} 0 0 1 ${cx+raio-10},${cy+4} L ${cx+raio-10},${cy+raio*.5} A ${raio-10},${raio*.42} 0 0 1 ${cx-raio+10},${cy+raio*.5} Z"
      fill="${baseColor}"/>`;
  }else{
    formaBase=`<circle cx="${cx}" cy="${cy}" r="${raio}" fill="${crustColor}" stroke="${crustColor2}" stroke-width="2"/>
      ${sauceRing?`<circle cx="${cx}" cy="${cy}" r="${raio-9}" fill="#B4432E"/>`:''}
      <circle cx="${cx}" cy="${cy}" r="${raio-14}" fill="${baseColor}"/>`;
  }

  // ingredientes detectados na descrição real do item
  const ativos=(isDoce?_DOCE_VISUAL:_INGREDIENTES_VISUAL).filter(ing=>desc.includes(ing.kw));
  if(temGoiabada) ativos.push({kw:'goiabada',color:'#C1623B',r:7});
  if(!ativos.length) ativos.push({kw:'queijo',color:'#FFE9A8',r:3}); // mussarela/queijo simples, sem topping extra

  let toppings='';
  const nPorIngrediente=isDoce&&ativos.some(a=>a.rainbow)?22:9;
  ativos.forEach((ing,gi)=>{
    const qtd=ing.rainbow?nPorIngrediente:Math.max(4,Math.floor(nPorIngrediente/ativos.length)+2);
    for(let k=0;k<qtd;k++){
      const ang=rnd()*Math.PI*2;
      const raioMax=isCalzone?raio*.5:raio-22;
      const dist=Math.sqrt(rnd())*raioMax;
      const px=cx+Math.cos(ang)*dist;
      const py=(isCalzone?cy+raio*.22:cy)+Math.sin(ang)*dist*(isCalzone?.55:1);
      const cor=ing.rainbow?_PALETA_CONFETE[Math.floor(rnd()*_PALETA_CONFETE.length)]:ing.color;
      toppings+=`<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${(ing.r*(.7+rnd()*.6)).toFixed(1)}" fill="${cor}" opacity="${(.85+rnd()*.15).toFixed(2)}"/>`;
    }
  });

  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="#EDE3D4"/>
    ${formaBase}
    ${toppings}
  </svg>`;
  return 'data:image/svg+xml;utf8,'+encodeURIComponent(svg);
}

// preenche img só de quem não tem (nunca sobrescreve foto real cadastrada no Firestore)
function preencherImagensGeradas(lista){
  (lista||[]).forEach(i=>{ if(!i.img) i.img=gerarImagemSaborSVG(i); });
}
