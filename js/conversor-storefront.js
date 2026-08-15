// ══════════════════════════════════
//  CONVERSOR DE PEDIDO
// ══════════════════════════════════
let _ct='';
// O conversor antigo (texto aproximado) foi substituído pelo "Colar Pedido" do Caixa,
// que casa cada item com o cardápio real. Redirecionamos pra lá em vez de duplicar a função.
// (o modal antigo e as funções antigas continuam no arquivo, só não são mais chamadas)
function openConversor(){ window.open('caixa/index.html?colar=1','_blank'); }
function fecharConversor(){document.getElementById('modal-conversor').classList.remove('open');}
function resetConversor(){
  document.getElementById('conv-input').value='';
  document.getElementById('conv-result').className='';
  document.getElementById('conv-result').innerHTML='';
  const ed=document.getElementById('conv-result-edit');
  const eb=document.getElementById('conv-edit-btn');
  if(ed){ed.style.display='none';ed.value='';}
  if(eb)eb.style.display='none';
  const tg=document.getElementById('conv-taxa-gps');
  if(tg){tg.style.display='none';tg.innerHTML='';}
  const ps=document.getElementById('conv-print-status');
  if(ps){ps.style.display='none';ps.innerText='';}
  document.getElementById('conv-spinner').className='';
  document.getElementById('conv-btn').style.display='block';
  document.getElementById('conv-copy').className='conv-copy';
  document.getElementById('conv-print').className='conv-print';
  _ct='';
}
async function converterPedido(){
  // Resetar taxa GPS do conversor
  window._taxaGPSconv=null;
  window._ultimoPedidoConvertidoId=null;
  const raw=document.getElementById('conv-input').value.trim();
  if(!raw)return;
  document.getElementById('conv-btn').style.display='none';
  document.getElementById('conv-spinner').className='show';
  document.getElementById('conv-result').className='';

  const now=new Date();
  const dt=String(now.getDate()).padStart(2,'0')+'/'+String(now.getMonth()+1).padStart(2,'0')+'/'+now.getFullYear()+' '+String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
  const cardapio=menu.map(i=>`${i.n} — R$ ${fmtPrice(i.p)}`).join('\n');
  const bordas=BORDAS.filter(b=>b.price>0).map(b=>`${b.name} (+R$ ${fmtPrice(b.price)})`).join(' | ');
  const acrescimosLista=ACRESCIMOS.map(a=>`${a.name} (+R$ ${fmtPrice(a.price)})`).join(' | ');

  const systemPrompt=`Você converte pedidos de pizza da Pizzaria Pizza em Dobro, Itapetininga SP.

CARDÁPIO (preços exatos):
${cardapio}

BORDAS DISPONÍVEIS: ${bordas}

ACRÉSCIMOS DISPONÍVEIS (ingredientes extras pagos): ${acrescimosLista}

REGRAS OBRIGATÓRIAS:

1. CONTAGEM DE PIZZAS:
   - Pizza inteira = 1 pizza
   - Meia a meia = 1 pizza (NÃO são 2)
   - Entrega = taxa única R$ 8,00, sempre, não importa a quantidade de pizzas
   - Retirada = sempre grátis

2. PREÇO MEIA A MEIA = MAIOR valor entre os dois sabores (OBRIGATÓRIO)
   Ex: ½ Portuguesa R$40,99 + ½ Marguerita R$37,99 = R$40,99 (usa o maior)
   NUNCA some os dois preços. NUNCA divida por 2.

3. BORDAS: some ao preço da pizza. Ex: pizza R$40,99 + borda R$15,00 = R$55,99

4. ACRÉSCIMOS: ingredientes extras pedidos pelo cliente. Some ao preço do item.
   Use APENAS os acréscimos da lista acima com seus preços.
   Ex: cliente pediu "queijo parmesão" → Parmesão (+R$ ${fmtPrice((ACRESCIMOS.find(a=>a.name.toLowerCase().includes('parm'))||{price:4}).price)})
   Se o cliente pediu algo que não está na lista, mostre como "Obs: [pedido]" sem cobrar.

5. REMOÇÕES (Sem): APENAS ingredientes removidos. Nunca endereço ou outros campos.

6. ENDEREÇO: extraia limpo, sem repetir. Formato: "Rua X, Complemento, Número"

7. TELEFONE: se houver algum número de telefone/celular na conversa (do cliente, não da pizzaria), extraia limpo, só números com DDD. Se não houver, use "—".

8. CÁLCULO OBRIGATÓRIO — faça passo a passo antes de escrever:
   a) Some cada item: pizza + borda + acréscimos
   b) Some todos os itens → Subtotal
   c) Taxa entrega: R$8,00 se for entrega (sempre, qualquer quantidade). GRÁTIS se retirada.
   d) TOTAL = Subtotal + taxa
   Verifique duas vezes antes de escrever o total.

FORMATO — responda EXATAMENTE assim (NUNCA mude a ordem):

════════════════════════
🍕 PIZZA EM DOBRO
${dt}
════════════════════════
Cliente: [nome]
Telefone: [telefone ou —]
────────────────────────
ITENS:
  N. [nome ou ½X + ½Y]
     [Borda: nome (+R$valor)]
     [Acréscimo: nome (+R$valor)]
     [Sem: ingrediente]
     [Obs: observação]
     R$ [total do item]
────────────────────────
Endereço: [endereço ou — se retirada]
Tipo: [🛵 ENTREGA ou 🏠 RETIRADA]
────────────────────────
Subtotal: R$ [soma itens]
[Taxa de entrega: R$ 8,00 / Retirada: GRÁTIS 🏠]
TOTAL: R$ [total final]
────────────────────────
Pagamento: [forma][Troco p/ R$X se dinheiro]
════════════════════════`;

  try{
    const r=await fetch('/.netlify/functions/parse-order',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({systemPrompt, raw})
    });
    const d=await r.json();
    if(d.error){throw new Error(d.error);}
    _ct=d?.texto||'';
    if(!_ct)throw new Error('Resposta vazia');
    const res=document.getElementById('conv-result');
    const edit=document.getElementById('conv-result-edit');
    const editBtn=document.getElementById('conv-edit-btn');
    res.innerText=_ct;
    res.className='show';
    if(edit){edit.value=_ct;edit.style.display='none';}
    if(editBtn)editBtn.style.display='block';
    document.getElementById('conv-copy').className='conv-copy show';
    document.getElementById('conv-print').className='conv-print show';
    // Salva no painel e avisa que o pedido está pronto para ser finalizado no Caixa
    _salvarPedidoConvertido();
    _avisarPedidoNoCaixa();
  }catch(e){
    document.getElementById('conv-result').innerText='⚠️ Erro: '+e.message;
    document.getElementById('conv-result').className='show';
    document.getElementById('conv-btn').style.display='block';
  }finally{
    document.getElementById('conv-spinner').className='';
  }
}

// ═══════════════════════════════════════════════════════════════════
//  PIZZA EM DOBRO — PARSER v5.0
//  Correções: meia a meia preciso, sem-vazamento, endereço limpo
// ═══════════════════════════════════════════════════════════════════

function _n(s){
  return(s||'').toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/[^\w\s]/g,' ').replace(/\s+/g,' ').trim();
}
function _cap(s){
  return(s||'').trim().replace(/(?:^|\s)\S/g,c=>c.toUpperCase());
}
function _fmtP(n){return Number(n).toFixed(2).replace('.',',');}

const _QTD={
  'um':1,'uma':1,'hum':1,'huma':1,
  'dois':2,'duas':2,
  'tres':3,'trez':3,
  'quatro':4,'cinco':5,'seis':6,'sete':7,'oito':8,'nove':9,'dez':10,
  '1':1,'2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10
};
function _pQtd(s){
  if(!s)return 1;
  const n=_n(s.trim());
  return _QTD[n]||parseInt(s)||1;
}

const _STOP=new Set('pizza pizzas calzone calzones borda bordas sem com mais menos extra entrega retirada buscar rua avenida av bairro pix cartao dinheiro troco coca fanta agua cerveja obrigado obrigada valeu boa bom oi ola quero queria gostaria manda pode coloca traz por favor hoje agora rapido urgente nome cliente pedido endereco telefone todas todos'.split(' '));

// ── SINÔNIMOS ──
const _SIN={
  'mussarela':['muçarela','muzarela','mozarela','muzzarela','muzarella','mussarella','mocarela','mucarela','mussa','muss','queijo simples','so queijo','pizza branca','pizza simples','queijinha','queijo tomate','margherita simples','muza','mozza'],
  'calabresa':['calabreza','calebresa','calbresa','calbreza','calabrêsa','calabres','calb','linguica','linguiça','lingüiça','linguica defumada','linguiça defumada','pizza vermelha','calabresa defumada'],
  'marguerita':['margarita','margerita','margherita','margarida','margherit','margu','margareta','margaritha','margheritha','margeritta'],
  'frango catupiry':['frango com catupiry','frango piry','fg catupiry','frango cat','frg catupiry','fg piry','frango crem','frg cat','frango requeijao','frango requeijão','fg requeijao','frango cremoso','frango c catupiry','frango e catupiry','frangopiry','fg catur','frango catupiri'],
  'calabresa piry':['calabresa catupiry','calabresa com catupiry','calb piry','calb cat','calabreza piry','calabresa cremosa','calb requeijao','linguica catupiry','linguiça catupiry','linguica piry','calabresa c catupiry'],
  'alho frito':['alho','com alho','alho torrado','alho crocante','pizza alho','alho assado','alho dourado'],
  'milho':['com milho','milho verde','pizza milho','milho cozido','pizza de milho'],
  'palmito':['com palmito','pizza palmito','palmitão','palmito pupunha'],
  'quatro queijos':['4 queijos','4queijos','quattro formaggi','quatro queijo','4q','pizza 4 queijos','pizza quatro queijo','quatro tipos de queijo','4 variedades queijo','mix queijo'],
  'portuguesa':['portugues','portu','portuguesa classica','portuga','portugu','portuguesa tradicional','pizza com ovo','ovo presunto palmito','caprichada','portugesa'],
  'toscana':['tosc','pizza toscana','toscana classica','toscana tradicional','calabresa cebola','linguica cebola','calabresa com cebola','tosca'],
  'bauru':['pizza bauru','bauru classico','presunto queijo tomate','pizza lanche'],
  'franqueijo':['frango queijo','fg queijo','franq','frango mussarela','frango muçarela','frango mozarela','frango com queijo','frango mussa','frango cheese','fg mussa'],
  'bacon':['com bacon','pizza bacon','bacon crocante','baicon','baccon','bacon torrado','pizza com bacon','bêicon','beicon','pizza de bacon'],
  'toscana piry':['toscana catupiry','toscana com catupiry','tosc piry','tosc cat','toscana crem','toscana cremosa','tosc requeijao','linguica catupiry cebola'],
  'franqueijo piry':['franqueijo catupiry','frango queijo catupiry','franq piry','fg queijo cat','frango mussarela catupiry','fg mussa piry','franqueijo cremoso'],
  'frambacon':['frango bacon','fg bacon','frango com bacon','pizza frambacon','frango baicon','fg baicon','frambakon'],
  '5 queijos':['cinco queijos','5queijos','pizza 5 queijos','cinco q','cinco tipos queijo'],
  'brocolis com bacon':['brocolis bacon','broc bacon','brocoli bacon','brocolis com baicon','brocoli','brocolis'],
  'atum':['pizza atum','com atum','atum cebola','atum com cebola','pizza de atum','atun'],
  'peperone':['pepperoni','pepperon','peperoni','pepp','pepper','pizza peperone','pizza pepperoni','pizza americana'],
  'peito de peru':['peru','peito peru','pp','pizza peru','presunto de peru','peru defumado'],
  'lombo':['lombo suino','pizza lombo','lombo assado','lombo defumado','lombo canadense'],
  'calabresa cheddar':['calb cheddar','calabresa com cheddar','calb ched','calabresa queijo amarelo','linguica cheddar'],
  'toscana cheddar':['tosc cheddar','toscana com cheddar','tosc ched','toscana queijo amarelo'],
  'pizza doce prestigio':['prestigio','prestígio','doce prestigio','pizza prestigio','coco chocolate','pizza coco'],
  'pizza doce brigadeiro':['brigadeiro','pizza brigadeiro','doce brigadeiro','choco granulado','chocolate granulado'],
  'pizza doce dois amores':['dois amores','chocolate branco preto','2 amores','doce dois amores','dois chocolates'],
  'pizza doce confeti':['confeti','confetti','doce confeti','pizza confeti','chocolate confete'],
  'pizza doce romeu e julieta':['romeu e julieta','romeu julieta','goiabada queijo','romeo julieta','pizza goiabada','goiaba queijo'],
  'pudim chandelle':['pudim','chandelle','pudim creme','pudim de leite','pudimzinho','pudin'],
  'brigadeirao':['brigadeirão','brigadeirao','brig'],
  'calzone doce prestigio':['calzone prestigio','calzone coco'],
  'calzone doce brigadeiro':['calzone brigadeiro','calzone choco'],
  'calzone doce dois amores':['calzone dois amores','calzone 2 amores'],
  'calzone doce confeti':['calzone confeti','calzone confetti'],
  'calzone doce romeu e julieta':['calzone romeu julieta','calzone goiabada'],
  'coca-cola 1.5l':['coca','coca cola','cocacola','coca-cola','cc','refri coca','refrigerante coca','coke','cola','cocinha','refri','refrigerante','coca zero','coca light'],
  'fanta 1.5l':['fanta','fanta laranja','fanta uva','fanta gelada','fantinha'],
  'tubaina 2l':['tubaina','tubaína','refri tubaina','refrigerante tubaina'],
  'kuat 2l':['kuat','guarana kuat','kuat gelado','guarana','guaraná'],
  'cerveja lata 350ml':['cerveja','birra','beer','gelada','cervejinha','cerv','latinha','lata','heineken','skol','brahma','itaipava','crystal','budweiser','cerveja lata','long neck'],
  'agua 500ml':['agua','água','agua gelada','aguinha','agua mineral','aguinhas'],
};

const _BSIN={
  'catupiry':['catupiry','cat','catup','requeijao','requeijão','creme','cremoso','catupiry original','requeijao cremoso','cream cheese','catupiri'],
  'cheddar':['cheddar','ched','chedd','queijo amarelo','cheddar derretido','queijo cheddar','amarelo'],
  'mussarela':['mussa borda','muçarela borda','mozarela borda','borda queijo','borda de mussarela','borda de queijo','borda mussa'],
  'presunto':['presunto','pres','presunt','borda presunto'],
  'tampinha':['tampinha','tamp','borda tampinha'],
  'paozinho':['paozinho','pão','pao','pãozinho','borda pao','borda pão','pao frances'],
  'vulcao':['vulcao','vulcão','vulc','borda vulcao','borda vulcão'],
  'sem borda recheada':['sem borda','simples','normal','sem recheio','nenhuma borda','borda normal','borda simples','sem nada na borda'],
};

function _mBorda(src){
  const t=_n(src);
  for(const borda of BORDAS){
    if(borda.price===0)continue;
    const bn=_n(borda.name);
    if(t.includes(bn))return borda;
    const sins=_BSIN[bn]||[];
    if(sins.some(s=>t.includes(_n(s))))return borda;
  }
  return null;
}

function _mItem(texto){
  if(!texto||texto.length<2)return null;
  const t=_n(texto);
  if(t.length<2||_STOP.has(t))return null;
  let f=menu.find(i=>_n(i.n)===t);
  if(f)return f;
  for(const[nc,sins]of Object.entries(_SIN)){
    if(t===_n(nc)||sins.some(s=>_n(s)===t||_n(s).includes(t)||t.includes(_n(s)))){
      const it=menu.find(i=>_n(i.n)===_n(nc));
      if(it)return it;
    }
  }
  f=menu.find(i=>{const n=_n(i.n);return n.includes(t)||t.includes(n);});
  if(f)return f;
  const pT=t.split(' ').filter(w=>w.length>3&&!_STOP.has(w));
  if(!pT.length)return null;
  let best=null,bScore=0;
  menu.forEach(i=>{
    const pN=_n(i.n).split(' ').filter(w=>w.length>3);
    let sc=0;
    pT.forEach(pt=>pN.forEach(pn=>{
      if(pn===pt)sc+=3;
      else if(pn.includes(pt)||pt.includes(pn))sc+=2;
    }));
    for(const[nc,sins]of Object.entries(_SIN)){
      if(_n(i.n)===_n(nc)&&sins.some(s=>t.includes(_n(s))))sc+=4;
    }
    if(sc>bScore){bScore=sc;best=i;}
  });
  return bScore>=2?best:null;
}

// ════════════════════════════════════════════════════════
//  PARSER PRINCIPAL v5
// ════════════════════════════════════════════════════════
function _parsePedido(txt){
  const now=new Date();
  const dt=String(now.getDate()).padStart(2,'0')+'/'+String(now.getMonth()+1).padStart(2,'0')+'/'+now.getFullYear()+' '+String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
  const orig=txt;
  const src=_n(txt);

  // ════ NOME ════
  let nome='NÃO INFORMADO';
  const _nI=new Set(_n('Uma Dois Duas Tres Quatro Cinco Rua Avenida Bairro Pizza Borda Meia Sem Com Pix Cartao Dinheiro Entrega Retirada Obrigado Obrigada Oi Ola Coca Fanta Agua Cerveja Pudim Calzone Todas Todos').split(' '));
  const nRgx=[
    /\bsou\s+(?:eu\s+)?(?:o|a)?\s*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÜÇ][a-záàâãéèêíïóôõöúüç]+(?:\s+[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÜÇ][a-záàâãéèêíïóôõöúüç]+)?)/,
    /\bme\s+chamo\s+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÜÇ][a-záàâãéèêíïóôõöúüç]+(?:\s+[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÜÇ][a-záàâãéèêíïóôõöúüç]+)?)/,
    /\b(?:meu\s+)?nome\s*[:\-é]?\s*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÜÇ][a-záàâãéèêíïóôõöúüç]+(?:\s+[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÜÇ][a-záàâãéèêíïóôõöúüç]+)?)/,
    /\baqui\s+[eé]\s+(?:o|a)?\s*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÜÇ][a-záàâãéèêíïóôõöúüç]+(?:\s+[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÜÇ][a-záàâãéèêíïóôõöúüç]+)?)/,
    /\bpedido\s+(?:d[oa]|pra|para)\s+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÜÇ][a-záàâãéèêíïóôõöúüç]+(?:\s+[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÜÇ][a-záàâãéèêíïóôõöúüç]+)?)/,
    /\bcliente\s*[:\-]\s*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÜÇ][a-záàâãéèêíïóôõöúüç]+(?:\s+[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÜÇ][a-záàâãéèêíïóôõöúüç]+)?)/,
    /\baqui\s+(?:o|a)\s+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÜÇ][a-záàâãéèêíïóôõöúüç]+)/,
    /\bfala\s+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÜÇ][a-záàâãéèêíïóôõöúüç]+)\s+aqui/,
    /\bobrigad[ao],?\s+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÜÇ][a-záàâãéèêíïóôõöúüç]+)/,
    /\b(?:ass|att|abraços|beijos|valeu|vlw)\s*[,:\-]\s*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÜÇ][a-záàâãéèêíïóôõöúüç]+)/i,
    /^([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÜÇ][a-záàâãéèêíïóôõöúüç]+(?:\s+[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÜÇ][a-záàâãéèêíïóôõöúüç]+)?)\s*(?:aqui|:)/m,
  ];
  for(const r of nRgx){
    const m=orig.match(r);
    if(m&&m[1]){
      const c=m[1].trim();
      if(c.length>1&&!_nI.has(_n(c))&&!_mItem(c)){nome=_cap(c);break;}
    }
  }

  // ════ TIPO ════
  let tipo='ENTREGA';
  const _RET=['retiro','retira','retirada','buscar','busco','vou buscar','vou pegar','passo ai','passo aí','passo buscar','passo la','passo lá','no local','na loja','no balcao','no balcão','pego ai','pego aí','vou ate','vou até','vou la','vou lá','prefiro retirar','quero retirar','vou retirar','ir buscar','ir pegar','to indo','estou indo','to perto','posso buscar','venho buscar','venho pegar','passarei','irei buscar','eu retiro','eu busco','eu pego','saindo agora','to na rua'];
  if(_RET.some(t=>src.includes(_n(t))))tipo='RETIRADA';

  // ════ ENDEREÇO — limpo, sem duplicação ════
  let end='NÃO INFORMADO';
  // extrai linha do endereço
  const linhas=orig.split('\n').map(l=>l.trim()).filter(l=>l.length>3);
  for(const linha of linhas){
    const ln=_n(linha);
    if(/^(?:rua|av|avenida|r\.|travessa|alameda|estrada|rodovia)\s+/i.test(linha)){
      end=_cap(linha.trim());
      break;
    }
    if(ln.startsWith('rua ')||ln.startsWith('av ')||ln.startsWith('avenida ')){
      end=_cap(linha.trim());
      break;
    }
  }
  // fallback regex
  if(end==='NÃO INFORMADO'){
    const _eRgx=[
      /(?:rua|r\.)\s+([A-Za-záàâãéèêíïóôõöúüçñ0-9\s\.]{3,70}?)(?=\s*[,\n]|\s*n[uúº°]|\s*\d{1,5}|\s*bairro|$)/i,
      /(?:avenida|av\.?)\s+([A-Za-záàâãéèêíïóôõöúüçñ0-9\s\.]{3,70}?)(?=\s*[,\n]|\s*n[uúº°]|\s*\d{1,5}|\s*bairro|$)/i,
      /(?:endereco|endereço)\s*[:\-]?\s*([A-Za-záàâãéèêíïóôõöúüçñ0-9\s\.,]{5,80}?)(?=\s*\n|$)/i,
      /(?:moro\s+(?:na|no|em))\s+([A-Za-záàâãéèêíïóôõöúüçñ0-9\s\.,]{5,60}?)(?=\s*[\n,]|$)/i,
      /(?:entrega\s+(?:na|no|em|para|pra))\s+([A-Za-záàâãéèêíïóôõöúüçñ0-9\s\.,]{5,60}?)(?=\s*[\n,]|$)/i,
    ];
    for(const p of _eRgx){
      const m=orig.match(p);
      if(m){end=_cap((m[1]||m[0]).trim().replace(/,\s*$/,''));break;}
    }
  }

  // adiciona número (se separado)
  if(end!=='NÃO INFORMADO'){
    const _nRgx=[/n[uú]mero\s*[:\-]?\s*(\d+[A-Za-z]?)/i,/n[º°\.]\s*(\d+)/i,/\bnum\s+(\d+)/i];
    for(const p of _nRgx){const m=orig.match(p);if(m&&!end.includes(m[1])){end+=', nº '+m[1];break;}}
    // bairro
    const _bM=orig.match(/bairro\s+([A-Za-záàâãéèêíïóôõöúüçñ\s]{3,40}?)(?=\s*[,\.\n]|$)/i);
    if(_bM&&!end.toLowerCase().includes(_n(_bM[1]))){end+=', Bairro '+_cap(_bM[1].trim());}
    // complemento — adiciona uma vez só
    const _cRgx=[
      /(?:condominio|condomínio|cond\.?)\s+([A-Za-záàâãéèêíïóôõöúüçñ\s0-9]+?)(?=\s*[,\n]|casa|apto|bloco|$)/i,
      /(?:ap(?:to|artamento)?\.?\s*)(\d+[A-Za-z]?)/i,
      /(?:bloco\s+)([A-Za-z0-9]+)/i,
    ];
    for(const p of _cRgx){
      const m=orig.match(p);
      if(m){
        const comp=_cap(m[0].trim());
        if(!end.toLowerCase().includes(_n(comp).substring(0,8))){end+=', '+comp;}
        break;
      }
    }
    // casa/número final
    const _casaM=orig.match(/\bcasa\s+(\d+[A-Za-z]?)/i);
    if(_casaM&&!end.includes(_casaM[1])){end+=', Casa '+_casaM[1];}
    // referência
    const _rfM=orig.match(/(?:perto|proximo|próximo|referencia|referência|ao lado|em frente)\s+(?:d[oa]|de|ao|da)?\s*([A-Za-záàâãéèêíïóôõöúüçñ\s]{3,40}?)(?=\s*[,\.\n]|$)/i);
    if(_rfM)end+=' (ref: '+_cap(_rfM[1].trim())+')';
  }

  // ════ BORDA GLOBAL ════
  const bG=_mBorda(src)||null;

  // ════ REMOÇÕES — com limite de captura ════
  const rems=[];
  // captura apenas ingredientes reais após "sem", não palavras de pagamento/tipo
  const _rI=new Set(_n('borda pizza calzone entrega retirada troco pix dinheiro cartao coca fanta agua cerveja pagamento forma').split(' '));
  const _rRgx=[
    /\bsem\s+([a-záàâãéèêíïóôõöúüç]{2,20}(?:\s+[a-záàâãéèêíïóôõöúüç]{2,15})?)(?=\s*[,\.\n]|$|\s+(?:pag|din|pix|cart|ret|ent))/gi,
    /\btira[r]?\s+(?:o|a|os|as)?\s*([a-záàâãéèêíïóôõöúüç\s]{2,20}?)(?=\s*[,\.\n]|$)/gi,
    /\bn[aã]o\s+(?:coloca|p[õo]e|quero)\s+(?:o|a|de)?\s*([a-záàâãéèêíïóôõöúüç\s]{2,20}?)(?=\s*[,\.\n]|$)/gi,
    /\bretira[r]?\s+(?:o|a)?\s*([a-záàâãéèêíïóôõöúüç\s]{2,20}?)(?=\s*[,\.\n]|$)/gi,
    /\bn[aã]o\s+gosto\s+(?:de\s+)?([a-záàâãéèêíïóôõöúüç\s]{2,20}?)(?=\s*[,\.\n]|$)/gi,
    /\balergi[a]?\s+a\s+([a-záàâãéèêíïóôõöúüç\s]{2,20}?)(?=\s*[,\.\n]|$)/gi,
  ];
  _rRgx.forEach(p=>{
    let m;p.lastIndex=0;
    while((m=p.exec(src))!==null){
      const r=m[1].trim().replace(/\s+$/,'');
      // verifica que não é stop word nem item do cardápio
      if(r.length>1&&!_rI.has(_n(r))&&!_STOP.has(_n(r))&&!_mItem(r)){
        const rc=_cap(r);
        if(!rems.includes(rc))rems.push(rc);
      }
    }
  });

  // ════ OBSERVAÇÕES ════
  const obs=[];
  ['bem assado','bem assada','caprichado','caprichada','extra queijo','mais queijo','sem cortar','urgente','para festa','aniversário','aniversario','bem crocante','pouco sal','sem sal','mais molho','sem molho','entrega rapida','entrega rápida'].forEach(o=>{
    if(src.includes(_n(o)))obs.push(_cap(o));
  });

  // ════ HORÁRIO ════
  let horario='';
  const _hM=orig.match(/(?:para\s+(?:as?|às?)|pra\s+(?:as?|às?)|às?\s+)(\d{1,2}[h:]\d{0,2})/i)||orig.match(/(\d{1,2}[h:]\d{2})/)||orig.match(/(?:as|às)\s+(\d{1,2})\s*(?:horas?|h)/i);
  if(_hM)horario=`\nHorário: ${_hM[1]}`;

  // ════ TELEFONE ════
  let tel='';
  const _tM=orig.match(/(?:tel(?:efone)?|fone|cel(?:ular)?|whats(?:app)?|zap)\s*[:\-]?\s*((?:\+55\s?)?(?:\(?\d{2}\)?\s?)?\d{4,5}[\-\s]?\d{4})/i)||orig.match(/\b(?:\+55\s?)?(?:\(?\d{2}\)?\s?)?\d{5}[\-\s]?\d{4}\b/);
  if(_tM)tel=`\nTelefone: ${(_tM[1]||_tM[0]).trim()}`;

  // ════ DETECÇÃO DE ITENS ════
  // Estratégia: divide a mensagem em linhas e tokens
  // Cada linha é processada independentemente para evitar contaminação
  const itens=[];

  // ── FASE 1: processa linha a linha ──
  const linhasItens=orig.split('\n').map(l=>l.trim()).filter(l=>l.length>2);

  for(const linha of linhasItens){
    const lsrc=_n(linha);

    // pula linhas de endereço, nome, pagamento
    if(/^(?:rua|av|avenida|travessa|alameda|estrada|r\.|bairro)\s/i.test(linha))continue;
    if(/\b(?:meu\s+nome|me\s+chamo|sou\s+(?:o|a)|aqui\s+[eé]|cliente\s*:)\b/i.test(lsrc))continue;
    if(/\b(?:pix|cartao|cartão|dinheiro|pagamento|forma\s+de\s+pag)\b/i.test(lsrc)&&!_mItem(linha))continue;
    if(/\b(?:endereco|endereço|rua|avenida)\b/i.test(lsrc))continue;

    // ── MEIA A MEIA: detecta padrão "X meia Y" ou "meia X meia Y" ──
    // SOMENTE se ambos os lados são claramente itens do cardápio
    const _meiaRgx=[
      /^(?:uma?\s+)?(?:meia?\s+)(.{3,35}?)\s+meia?\s+(.{3,35}?)(?:\s*[,\.]|$)/i,
      /^(?:uma?\s+)?(.{3,35}?)\s+meia\s+(.{3,35}?)(?:\s*[,\.]|$)/i,
      /^(?:uma?\s+)?(?:meia?\s+)(.{3,35}?)\s+(?:com|e|\+)\s+(.{3,35}?)(?:\s*meia)?(?:\s*[,\.]|$)/i,
    ];
    let meiaOk=false;
    for(const p of _meiaRgx){
      const m=lsrc.match(p);
      if(m){
        const s1=_mItem(m[1]);
        const s2=_mItem(m[2]);
        if(s1&&s2&&(s1.cat==='p'||s1.cat==='s')&&(s2.cat==='p'||s2.cat==='s')&&s1.id!==s2.id){
          const bL=_mBorda(lsrc)||bG||BORDAS[0];
          itens.push({tipo:'meia',item:s1,s2,borda:bL});
          meiaOk=true;
          break;
        }
      }
    }
    if(meiaOk)continue;

    // ── ITENS INTEIROS: detecta quantidade + nome ──
    // padrão: "uma calabresa", "2 portuguesas", "uma margerita toscana" → duas pizzas separadas
    const _iRgx=[
      /^(\d+|um[a]?|dois|duas|tr[eê]s|quatro|cinco)\s+(?:pizza[s]?\s+(?:de\s+)?)?(.{3,40}?)(?:\s+(?:com\s+borda|borda|sem)\s+|$)/i,
      /^(?:uma?\s+pizza\s+(?:de\s+)?)?(.{3,40}?)(?:\s+(?:com\s+borda|borda|sem)\s+|$)/i,
    ];
    let itemOk=false;
    for(const p of _iRgx){
      const m=lsrc.match(p);
      if(!m)continue;
      const qtdStr=m[1]||'1';
      const nomeStr=(m[2]||m[1]||'').trim();
      if(!nomeStr||nomeStr.length<2)continue;

      // tenta detectar múltiplos itens na mesma linha
      // ex: "uma margerita toscana" → margerita + toscana separadas
      const it=_mItem(nomeStr);
      if(it){
        const qtd=_pQtd(qtdStr.match(/\d|um|uma|dois|duas|tres|quatro|cinco/i)?qtdStr:'1');
        const bL=_mBorda(lsrc)||bG||BORDAS[0];
        for(let i=0;i<qtd;i++)itens.push({tipo:'inteiro',item:it,borda:bL});
        itemOk=true;
        break;
      }

      // CASO ESPECIAL: linha tem dois nomes de pizzas sem separador claro
      // ex: "uma margerita toscana" → tenta dividir
      const palavras=nomeStr.split(' ');
      const encontrados=[];
      let buf='';
      for(const pal of palavras){
        buf=buf?buf+' '+pal:pal;
        const it2=_mItem(buf);
        if(it2){encontrados.push(it2);buf='';}
      }
      if(encontrados.length>=2){
        const bL=_mBorda(lsrc)||bG||BORDAS[0];
        encontrados.forEach(it2=>itens.push({tipo:'inteiro',item:it2,borda:bL}));
        itemOk=true;
        break;
      }
    }
    if(itemOk)continue;

    // fallback: busca direta de itens conhecidos na linha
    const msort=[...menu].sort((a,b)=>b.n.length-a.n.length);
    let lwork=lsrc;
    msort.forEach(it=>{
      const nN=_n(it.n);
      if(lwork.includes(nN)){
        const antes=lwork.substring(0,lwork.indexOf(nN));
        const qM=antes.match(/(\d+|um[a]?|dois|duas)\s*$/i);
        const qtd=qM?_pQtd(qM[1]):1;
        const bL=_mBorda(lsrc)||bG||BORDAS[0];
        for(let i=0;i<qtd;i++)itens.push({tipo:'inteiro',item:it,borda:bL});
        lwork=lwork.replace(nN,'~'.repeat(nN.length));
      }
    });
    // sinônimos no fallback por linha
    if(!lwork.includes('~')){
      for(const[nc,sins]of Object.entries(_SIN)){
        const it=menu.find(i=>_n(i.n)===_n(nc));
        if(!it)continue;
        const matched=sins.find(s=>lwork.includes(_n(s)));
        if(matched){
          const bL=_mBorda(lsrc)||bG||BORDAS[0];
          itens.push({tipo:'inteiro',item:it,borda:bL});
          break;
        }
      }
    }
  }

  // ── FASE 2: fallback geral se não encontrou nada ──
  if(!itens.length){
    const W=src;
    const msort=[...menu].sort((a,b)=>b.n.length-a.n.length);
    let lwork=W;
    msort.forEach(it=>{
      const nN=_n(it.n);
      if(lwork.includes(nN)){
        const antes=lwork.substring(0,lwork.indexOf(nN));
        const qM=antes.match(/(\d+|um[a]?|dois|duas)\s*$/i);
        const qtd=qM?_pQtd(qM[1]):1;
        const bL=bG||BORDAS[0];
        for(let i=0;i<qtd;i++)itens.push({tipo:'inteiro',item:it,borda:bL});
        lwork=lwork.replace(nN,'~'.repeat(nN.length));
      }
    });
  }

  // aplica borda global e remoções a todos os itens
  itens.forEach(p=>{
    p.rems=rems;
    // se item não tem borda específica e há borda global, aplica
    if(bG&&p.borda===BORDAS[0])p.borda=bG;
  });

  // ════ PAGAMENTO ════
  let pag='?';
  // extrai apenas da última parte do texto (depois dos itens)
  const ultLinhas=orig.split('\n').slice(-5).join(' ');
  const srcPag=_n(ultLinhas)||src;
  if(/\bpix\b|\btransferencia\b|\bchave pix\b|\bvia pix\b/.test(srcPag))pag='Pix';
  else if(/\bcart[aã]o\b|\bcredito\b|\bdebito\b|\bmaquininha\b|\bvisa\b|\bmaster\b|\belo\b/.test(srcPag))pag='Cartão';
  else if(/\bdinheiro\b|\bespecie\b|\bnotas?\b|\btroco\b|\bcash\b|\bespécie\b/.test(srcPag))pag='Dinheiro';
  // fallback no texto completo
  if(pag==='?'){
    if(/\bpix\b/.test(src))pag='Pix';
    else if(/\bcart[aã]o\b|\bcredito\b|\bdebito\b/.test(src))pag='Cartão';
    else if(/\bdinheiro\b|\bespecie\b|\btroco\b/.test(src))pag='Dinheiro';
  }

  let trocoStr='';
  const _tRgx=[/troco\s+(?:pra|para|de)?\s*(?:r\$)?\s*(\d+(?:[,.]\d{2})?)/i,/(?:tenho|pago\s+com)\s+(?:r\$)?\s*(\d+(?:[,.]\d{2})?)/i,/nota\s+de\s+(\d+)/i,/r\$\s*(\d+(?:[,.]\d{2})?)/i];
  for(const p of _tRgx){const m=orig.match(p);if(m&&parseFloat(m[1].replace(',','.')>0)){trocoStr=` — Troco p/ R$ ${_fmtP(parseFloat(m[1].replace(',','.')))}`; break;}}

  // ════ CÁLCULO ════
  let sub=0;
  itens.forEach(p=>{
    p.preco=(p.tipo==='meia'?Math.max(p.item.p,p.s2.p):p.item.p)+(p.borda?.price||0);
    sub+=p.preco;
  });
  const nPiz=itens.filter(p=>p.item.cat==='p'||p.item.cat==='s').length;
  const taxa=tipo==='RETIRADA'?0:(itens.length>0?8:0);
  const total=sub+taxa;

  // ════ SAÍDA ════
  const S1='════════════════════════';
  const S2='────────────────────────';
  let itStr='';
  if(!itens.length){
    itStr='  ⚠️ Nenhum item identificado\n  Verifique os nomes no cardápio';
  }else{
    itens.forEach((p,i)=>{
      const nm=p.tipo==='meia'?`½ ${p.item.n} + ½ ${p.s2.n}`:p.item.n;
      itStr+=`  ${i+1}. ${nm}\n`;
      if(p.borda&&p.borda.price>0)itStr+=`     Borda: ${p.borda.name}\n`;
      if(p.rems?.length)itStr+=`     Sem: ${p.rems.join(', ')}\n`;
      itStr+=`     R$ ${_fmtP(p.preco)}\n`;
    });
  }
  if(obs.length)itStr+=`\n  📝 Obs: ${obs.slice(0,4).join(', ')}\n`;

  const eLinha=tipo==='RETIRADA'?'  Retirada: GRÁTIS 🏠 (~20min)':'  Taxa de entrega: R$ 8,00';

  return `${S1}
🍕 PIZZA EM DOBRO — ${dt}${horario}${tel}
${S1}
👤 Cliente: ${nome}
${S2}
🍕 PEDIDO:
${itStr.trimEnd()}
${S2}
📍 Endereço: ${tipo==='RETIRADA'?'🏠 RETIRADA (Grátis ~20min)':end}
${S2}
💳 Pagamento: ${pag}${trocoStr}
${eLinha}
💰 TOTAL: R$ ${_fmtP(total)}
${S1}`;
}
function _ehItemCardapio(n){return !!_mItem(n);}
function _matchItem(t){return _mItem(t);}
function _matchBorda(s){return _mBorda(s);}
function _capitalize(s){return _cap(s);}

function filtrarMenu(q){
  const term=q.trim().toLowerCase();
  const clearBtn=document.getElementById('search-clear');
  const emptyEl=document.getElementById('search-empty');
  const termEl=document.getElementById('search-term');
  clearBtn.style.display=term?'block':'none';

  if(!term){
    // mostra tudo
    document.querySelectorAll('.item-card').forEach(c=>c.style.display='');
    document.querySelectorAll('.cat-title').forEach(t=>t.style.display='');
    emptyEl.style.display='none';
    return;
  }

  // normaliza texto removendo acentos para comparação
  const norm=s=>s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
  const tNorm=norm(term);

  let totalVisiveis=0;
  Object.keys(CATS).forEach(cat=>{
    const el=document.getElementById(CATS[cat]);
    if(!el)return;
    const cards=el.querySelectorAll('.item-card');
    let visiveisCat=0;
    cards.forEach(card=>{
      const nome=norm(card.dataset.nome||'');
      const desc=norm(card.dataset.desc||'');
      // match exato ou parcial no nome ou ingredientes
      const match=nome.includes(tNorm)||desc.includes(tNorm);
      card.style.display=match?'':'none';
      if(match)visiveisCat++;
    });
    // esconde/mostra título da categoria
    const titulo=el.querySelector('.cat-title');
    if(titulo)titulo.style.display=visiveisCat?'':'none';
    totalVisiveis+=visiveisCat;
  });

  emptyEl.style.display=totalVisiveis?'none':'block';
  if(termEl)termEl.innerText=q.trim();
}

function limparBusca(){
  const box=document.getElementById('search-box');
  if(box){box.value='';filtrarMenu('');}
}

function _parseConvTexto(texto){
  const linhas=texto.split('\n');
  let nome='',end='',pag='',tel='';
  for(const l of linhas){
    const lt=l.trim();
    if(!nome&&/^(👤\s*)?cliente\s*:/i.test(lt)) nome=lt.replace(/^(👤\s*)?cliente\s*:\s*/i,'').trim();
    if(!tel&&/^(📞\s*)?telefone\s*:/i.test(lt)){
      const v=lt.replace(/^(📞\s*)?telefone\s*:\s*/i,'').trim();
      if(v&&v!=='—') tel=v;
    }
    if(!end&&/^(📍\s*)?endere[çc]o\s*:/i.test(lt)) end=lt.replace(/^(📍\s*)?endere[çc]o\s*:\s*/i,'').trim();
    if(!pag&&/^(💳\s*)?pagamento\s*:/i.test(lt)) pag=lt.replace(/^(💳\s*)?pagamento\s*:\s*/i,'').trim();
  }
  const totalMatch=texto.match(/TOTAL[:\s:]+R\$[\s]?([\d]+[,.]?[\d]*)/i);
  const totalVal=totalMatch?parseFloat(totalMatch[1].replace(',','.')):0;
  return{nome,end,pag,tel,totalVal};
}

// Lê a seção "ITENS:" do texto convertido e extrai cada pizza/produto de verdade
// (nome, borda, ingredientes removidos, preço), em vez de salvar só um nome genérico.
function _parseItensConv(texto){
  const linhas=texto.split('\n');
  const items=[];
  let atual=null;
  let emItens=false;
  const itemStart=/^\s*\d+\.\s*(.+)$/;
  const precoLine=/^\s*R\$\s*([\d]+[,.]?[\d]*)\s*$/;
  const bordaLine=/^\s*Borda:\s*(.+?)(\s*\(\+R\$[\d,.]+\))?\s*$/i;
  const acrescimoLine=/^\s*Acr[ée]scimo:\s*(.+?)(\s*\(\+R\$[\d,.]+\))?\s*$/i;
  const semLine=/^\s*Sem:\s*(.+)$/i;
  const obsLine=/^\s*Obs:\s*(.+)$/i;
  for(const l of linhas){
    const lt=l.trim();
    if(/^ITENS:/i.test(lt)){emItens=true;continue;}
    if(emItens&&/^(Endere[çc]o|Subtotal|Tipo)\s*:/i.test(lt)){emItens=false;}
    if(!emItens)continue;
    const mi=lt.match(itemStart);
    if(mi){
      if(atual)items.push(atual);
      atual={name:mi[1].trim(),price:0,borda:null,removed:[],extra:[]};
      continue;
    }
    if(!atual)continue;
    let m;
    if((m=lt.match(bordaLine))){atual.borda=m[1].trim();continue;}
    if((m=lt.match(acrescimoLine))){atual.extra.push('+ '+m[1].trim());continue;}
    if((m=lt.match(semLine))){atual.removed.push(m[1].trim());continue;}
    if((m=lt.match(obsLine))){atual.extra.push('Obs: '+m[1].trim());continue;}
    if((m=lt.match(precoLine))){atual.price=parseFloat(m[1].replace(',','.'));continue;}
  }
  if(atual)items.push(atual);
  return items;
}

// Monta o items_json pronto pra salvar no pedido, com fallback caso não consiga extrair nada
function _montarItemsJson(texto,totalVal){
  const parsed=_parseItensConv(texto);
  if(!parsed.length) return[{name:'[Pedido via Conversor]',price:totalVal}];
  return parsed.map(it=>({
    name:it.name+(it.extra&&it.extra.length?(' — '+it.extra.join('; ')):''),
    price:it.price||0,
    borda:it.borda||null,
    removed:it.removed||[]
  }));
}

window._ultimoPedidoConvertidoId=null;
async function _salvarPedidoConvertido(){
  if(!_ct)return;
  const{nome,end,pag,tel,totalVal}=_parseConvTexto(_ct);
  const itemsJson=_montarItemsJson(_ct,totalVal);
  const now=new Date().toISOString();
  const reg={ts:Date.now(),nome:nome||'—',end:end||'—',pag:pag||'—',texto:_ct};
  // salva local (cache para exibição rápida)
  const hist=DB.get('conv_orders')||[];
  hist.unshift(reg);
  DB.set('conv_orders',hist);
  // salva em conv_orders (histórico)
  sp('conv_orders',{
    nome:nome||'—',
    endereco:end||'—',
    pagamento:pag||'—',
    texto_completo:_ct,
    created_at:now
  });
  // salva em orders (vai ao painel) com selo conversor — guarda o ID pra permitir edição depois
  _initFB();
  if(FS){
    const numeroSequencial=await obterProximoNumeroSequencial(FS);
    FS.collection('orders').add({
      client_name:nome||'—',
      client_phone:tel||null,
      address:end||'—',
      payment:pag||'—',
      total:totalVal,
      delivery_type:'entrega',
      items_json:itemsJson,
      status:'novo',
      origem:'conversor',
      texto_completo:_ct,
      whatsapp_sent:true,
      created_at:now,
      numero_sequencial:numeroSequencial
    }).then(function(docRef){window._ultimoPedidoConvertidoId=docRef.id;})
      .catch(function(e){console.warn('Erro ao salvar pedido no painel:',e);});
  }
}
let convStatsPeriod=7;
function _convPeriodFrom(period){
  const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-(period-1));
  return d.getTime();
}
function _renderConvStats(list){
  const el=document.getElementById('conv-stats-body');
  if(!el)return;
  list=list||[];
  const now=new Date();
  const todayStart=new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime();
  const periodStart=_convPeriodFrom(convStatsPeriod);
  const totalHoje=list.filter(function(r){return (r.ts||0)>=todayStart;}).length;
  const noPeriodo=list.filter(function(r){return (r.ts||0)>=periodStart;});
  const totalPeriodo=noPeriodo.length;
  const totalGeral=list.length;
  const pagCount={};
  noPeriodo.forEach(function(r){
    const p=(r.pag||'').trim();
    if(p&&p!=='—')pagCount[p]=(pagCount[p]||0)+1;
  });
  const topPag=Object.entries(pagCount).sort(function(a,b){return b[1]-a[1];})[0];
  const pagLabel=topPag?topPag[0]+' ('+topPag[1]+'×)':'—';
  const periodLbl=convStatsPeriod+' dias';
  el.innerHTML=
    '<div class="dash-grid">'
    +'<div class="dash-card"><div class="dash-num">'+totalHoje+'</div><div class="dash-lbl">Convertidos hoje</div></div>'
    +'<div class="dash-card"><div class="dash-num">'+totalPeriodo+'</div><div class="dash-lbl">No período<br><span style="font-size:.58rem;color:#555;">'+periodLbl+'</span></div></div>'
    +'</div>'
    +'<div class="dash-card" style="margin-bottom:10px;text-align:center;"><div class="dash-num" style="font-size:1.4rem;">'+totalGeral+'</div><div class="dash-lbl">Total geral de convertidos</div></div>'
    +'<div class="dash-card" style="text-align:center;"><div class="dash-num" style="font-size:1rem;color:#4285F4;">'+pagLabel+'</div><div class="dash-lbl">Pagamento mais usado — '+periodLbl+'</div></div>';
}
function setConvStatsPeriod(p){
  convStatsPeriod=p;
  document.querySelectorAll('.conv-period-btn').forEach(function(b){b.classList.remove('active');});
  const btn=document.getElementById('conv-period-'+p);
  if(btn)btn.classList.add('active');
  _renderConvStats(DB.get('conv_orders')||[]);
}
async function openPedidosConvertidos(){
  const el=document.getElementById('conv-orders-list');
  el.innerHTML='<p style="text-align:center;color:#555;padding:24px 0;">Carregando...</p>';
  convStatsPeriod=7;
  document.querySelectorAll('.conv-period-btn').forEach(function(b){b.classList.remove('active');});
  const defBtn=document.getElementById('conv-period-7');
  if(defBtn)defBtn.classList.add('active');
  const statsEl=document.getElementById('conv-stats-body');
  if(statsEl)statsEl.innerHTML='⏳';
  openModal('modal-conv-orders');
  let list=[];
  // tenta buscar do Firebase
  _initFB();
  if(FS){
    try{
      const snap=await FS.collection('conv_orders').orderBy('created_at','desc').get();
      if(!snap.empty){
        list=snap.docs.map(d=>({
          id:d.id,...d.data(),
          ts:d.data().created_at?new Date(dataStr(d.data().created_at)).getTime():Date.now(),
          nome:d.data().nome||'—',
          end:d.data().endereco||'—',
          pag:d.data().pagamento||'—',
          texto:d.data().texto_completo||''
        }));
        // atualiza cache local
        DB.set('conv_orders',list);
      }
    }catch(e){console.warn('conv_orders firebase:',e);}
  }
  // fallback local
  if(!list.length) list=DB.get('conv_orders')||[];
  _renderConvStats(list);
  if(!list.length){
    el.innerHTML='<p style="text-align:center;color:#555;padding:32px 0;">Nenhum pedido convertido ainda.<br><span style="font-size:.75rem;">Os pedidos aparecem aqui após você copiar ou imprimir pelo conversor.</span></p>';
    return;
  }
  el.innerHTML=list.map((r,i)=>{
    const dt=new Date(r.ts||dataStr(r.created_at)||Date.now());
    const data=dt.toLocaleDateString('pt-BR');
    const hora=dt.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
    return `<div onclick="verPedidoConvertido(${i})" style="border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:12px 14px;margin-bottom:8px;cursor:pointer;background:rgba(255,255,255,.03);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <span style="font-size:.85rem;font-weight:700;color:#fff;">${r.nome}</span>
        <span style="font-size:.65rem;color:#555;">${data} ${hora}</span>
      </div>
      <div style="font-size:.72rem;color:#888;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${r.end}</div>
      <div style="font-size:.7rem;color:var(--pr);margin-top:3px;">💳 ${r.pag}</div>
    </div>`;
  }).join('');
}
function limparPedidosConv(){alert('Para limpar o histórico, acesse diretamente o Firebase Console.');}
function verPedidoConvertido(i){
  const list=DB.get('conv_orders')||[];
  const r=list[i];if(!r)return;
  document.getElementById('conv-detail-text').innerText=r.texto;
  closeModal('modal-conv-orders');
  openModal('modal-conv-detail');
}
// ── MAPS (busca de endereço + localização atual) ────────────────────────────
const _MAPS_KEY_SITE='AIzaSyBMPjAS03DT3tuGPtJBld2EXuX7C6__1lg';

// ── AUTOCOMPLETE DE ENDEREÇO (busca manual, sem depender do widget do Google) ──
window._enderecoAutocomplete=null; // {lat,lng,formatted_address} do último endereço escolhido na busca
window._mapsAutocompleteOK=false;
window._acSuggestions=[]; // sugestões da última busca
window._acSessionToken=null;
window._acDebounce=null;
// O Google chama esta função automaticamente se a chave de API tiver problema
// (API não habilitada no projeto, restrição de domínio, faturamento, etc).
window.gm_authFailure=function(){
  console.error('[Google Maps] Falha de autenticação da API — verifique no Google Cloud Console se a "Places API (New)" e a "Maps JavaScript API" estão ativadas para esta chave, e se não há restrição de domínio bloqueando o site.');
  const dd=document.getElementById('addr-suggestions');
  if(dd){dd.style.display='block';dd.innerHTML='<div style="padding:10px 14px;color:#e71d36;font-size:.78rem;">Erro de configuração do Maps. Avise o suporte.</div>';}
};
async function initGmapsAutocomplete(){
  try{
    if(!window.google||!google.maps)return;
    await google.maps.importLibrary('places');
    window._acSessionToken=new google.maps.places.AutocompleteSessionToken();
    window._mapsAutocompleteOK=true;
    // Fecha a lista ao tocar fora dela
    document.addEventListener('click',(ev)=>{
      const dd=document.getElementById('addr-suggestions');
      const input=document.getElementById('u-end');
      if(dd&&input&&!dd.contains(ev.target)&&ev.target!==input){
        dd.style.display='none';
      }
    });
    window.addEventListener('scroll',_posicionarSugestoesEndereco,true);
    window.addEventListener('resize',_posicionarSugestoesEndereco);
  }catch(e){console.warn('Busca de endereço do Maps não pôde ser iniciada:',e);}
}
window.initGmapsAutocomplete=initGmapsAutocomplete;

function _posicionarSugestoesEndereco(){
  const input=document.getElementById('u-end');
  const dd=document.getElementById('addr-suggestions');
  if(!input||!dd||dd.style.display==='none')return;
  const r=input.getBoundingClientRect();
  dd.style.left=r.left+'px';
  dd.style.top=(r.bottom+4)+'px';
  dd.style.width=r.width+'px';
}

async function _buscarSugestoesEndereco(valor){
  const dd=document.getElementById('addr-suggestions');
  if(!dd)return;
  // Se o texto mudou, invalida a seleção anterior
  if(window._enderecoAutocomplete&&valor!==window._enderecoAutocomplete.formatted_address){
    window._enderecoAutocomplete=null;
  }
  clearTimeout(window._acDebounce);
  const texto=(valor||'').trim();
  if(texto.length<4){dd.style.display='none';dd.innerHTML='';return;}
  if(!window.google||!google.maps||!google.maps.places){
    dd.style.display='block';
    dd.innerHTML='<div style="padding:10px 14px;color:#888;font-size:.78rem;">Carregando busca do Maps...</div>';
    _posicionarSugestoesEndereco();
    return;
  }
  window._acDebounce=setTimeout(async()=>{
    try{
      if(!window._acSessionToken) window._acSessionToken=new google.maps.places.AutocompleteSessionToken();
      const req={
        input:texto,
        sessionToken:window._acSessionToken,
        locationBias:{radius:15000,center:{lat:-23.5917,lng:-48.0531}}, // Itapetininga/SP
        includedRegionCodes:['br']
      };
      const{suggestions}=await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions(req);
      window._acSuggestions=suggestions||[];
      if(!window._acSuggestions.length){
        dd.innerHTML='<div style="padding:10px 14px;color:#888;font-size:.78rem;">Nenhum endereço encontrado. Tente digitar de outro jeito.</div>';
      }else{
        dd.innerHTML=window._acSuggestions.map((s,i)=>{
          const texto=(s.placePrediction&&s.placePrediction.text&&s.placePrediction.text.text)||'';
          return`<div onclick="_selecionarSugestaoEndereco(${i})" style="padding:10px 14px;border-top:1px solid rgba(255,255,255,.06);cursor:pointer;font-size:.8rem;color:#ddd;">📍 ${texto.replace(/</g,'&lt;')}</div>`;
        }).join('');
      }
      dd.style.display='block';
      _posicionarSugestoesEndereco();
    }catch(e){
      const detalhe=(e&&(e.message||e.toString()))||'erro desconhecido';
      if(/permission/i.test(detalhe)){
        console.error('[Maps] Erro de permissão — provavelmente falta ativar/confirmar o FATURAMENTO (billing) do projeto no Google Cloud Console. Detalhe técnico:',detalhe);
      }else{
        console.warn('Erro ao buscar endereço:',e);
      }
      dd.innerHTML='<div style="padding:10px 14px;color:#888;font-size:.78rem;">Não conseguimos buscar sugestões agora. Digite seu endereço completo ou use o botão 📍.</div>';
      dd.style.display='block';
      _posicionarSugestoesEndereco();
    }
  },350);
}

async function _selecionarSugestaoEndereco(idx){
  const dd=document.getElementById('addr-suggestions');
  const input=document.getElementById('u-end');
  const suggestion=window._acSuggestions[idx];
  if(!suggestion||!input)return;
  try{
    const place=suggestion.placePrediction.toPlace();
    await place.fetchFields({fields:['formattedAddress','location','addressComponents']});
    if(!place.location)return;
    input.value=place.formattedAddress||input.value;
    window._enderecoAutocomplete={
      lat:place.location.lat(),
      lng:place.location.lng(),
      formatted_address:place.formattedAddress||input.value
    };
    const numComp=(place.addressComponents||[]).find(c=>(c.types||[]).includes('street_number'));
    const numInput=document.getElementById('u-num');
    if(numComp&&numInput&&!numInput.value.trim()) numInput.value=numComp.longText||numComp.long_name||'';
    if(dd){dd.style.display='none';dd.innerHTML='';}
    window._acSessionToken=new google.maps.places.AutocompleteSessionToken(); // novo token pra próxima busca
    if(typeof autoSaveClient==='function') autoSaveClient();
  }catch(e){console.warn('Erro ao selecionar endereço:',e);}
}

// ── USAR LOCALIZAÇÃO ATUAL (GPS do celular + geocodificação reversa) ────────
function usarLocalizacaoAtual(btn){
  if(!navigator.geolocation){
    alert('Seu celular/navegador não suporta localização automática. Digite o endereço manualmente.');
    return;
  }
  const orig=btn?btn.innerHTML:'';
  if(btn){btn.innerHTML='⏳';btn.disabled=true;}
  navigator.geolocation.getCurrentPosition(async(pos)=>{
    try{
      const{latitude,longitude}=pos.coords;
      const r=await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${_MAPS_KEY_SITE}&language=pt-BR`).then(r=>r.json());
      if(r.status==='OK'&&r.results&&r.results[0]){
        const res=r.results[0];
        document.getElementById('u-end').value=res.formatted_address;
        window._enderecoAutocomplete={lat:latitude,lng:longitude,formatted_address:res.formatted_address};
        const numComp=(res.address_components||[]).find(c=>(c.types||[]).includes('street_number'));
        if(numComp)document.getElementById('u-num').value=numComp.long_name;
        const dd=document.getElementById('addr-suggestions');
        if(dd){dd.style.display='none';dd.innerHTML='';}
        if(typeof autoSaveClient==='function')autoSaveClient();
      }else{
        if(r.status==='REQUEST_DENIED'||r.status==='OVER_QUERY_LIMIT'){
          console.error('[Maps] Geocodificação reversa negada (status: '+r.status+') — provavelmente falta ativar/confirmar o FATURAMENTO (billing) do projeto no Google Cloud Console.',r.error_message||'');
        }else{
          console.warn('[Maps] Geocodificação reversa sem resultado (status: '+r.status+')');
        }
        alert('Não foi possível identificar seu endereço automaticamente. Digite manualmente.');
      }
    }catch(e){
      alert('Erro ao buscar sua localização. Digite o endereço manualmente.');
    }
    if(btn){btn.innerHTML=orig;btn.disabled=false;}
  },(err)=>{
    if(err.code===1) alert('Permissão de localização negada. Você pode digitar o endereço manualmente, ou ativar a localização nas configurações do navegador.');
    else alert('Não foi possível obter sua localização agora. Digite o endereço manualmente.');
    if(btn){btn.innerHTML=orig;btn.disabled=false;}
  },{enableHighAccuracy:true,timeout:12000});
}

function toggleEditConversor(){
  const res=document.getElementById('conv-result');
  const edit=document.getElementById('conv-result-edit');
  const btn=document.getElementById('conv-edit-btn');
  if(!res||!edit||!btn)return;
  const isEditing=edit.style.display!=='none';
  if(isEditing){
    // Salvar edição
    _ct=edit.value;
    res.innerText=_ct;
    res.style.display='block';
    edit.style.display='none';
    btn.innerText='✏️ EDITAR';
    // Atualiza o pedido que já foi salvo automaticamente no painel, em vez de duplicar
    if(window._ultimoPedidoConvertidoId){
      const{nome,end,pag,tel,totalVal}=_parseConvTexto(_ct);
      const itemsJson=_montarItemsJson(_ct,totalVal);
      spatch('orders',window._ultimoPedidoConvertidoId,{
        client_name:nome||'—',client_phone:tel||null,address:end||'—',payment:pag||'—',total:totalVal,items_json:itemsJson,texto_completo:_ct
      });
    }
  }else{
    // Entrar em modo edição
    edit.value=_ct;
    res.style.display='none';
    edit.style.display='block';
    btn.innerText='✅ SALVAR';
  }
}
function copiarPedido(){
  if(!_ct)return;
  navigator.clipboard.writeText(_ct).then(()=>{
    const b=document.getElementById('conv-copy');
    b.innerText='✓ COPIADO'; setTimeout(()=>{b.innerText='📋 COPIAR';},2000);
  }).catch(()=>{const t=document.createElement('textarea');t.value=_ct;t.style.cssText='position:fixed;opacity:0';document.body.appendChild(t);t.select();document.execCommand('copy');document.body.removeChild(t);});
}
// ── BLUETOOTH COMPARTILHADO (conversor) ──────────────────────────────────────
let _btDevice=null;
let _btChar=null;
const _BT_KEY='ped_bt_device_name';

async function _conectarBT(){
  if(_btChar)return true;
  const SERVICES=['000018f0-0000-1000-8000-00805f9b34fb','0000ff00-0000-1000-8000-00805f9b34fb','0000ffe0-0000-1000-8000-00805f9b34fb','00001101-0000-1000-8000-00805f9b34fb'];
  const CHARS=['00002af1-0000-1000-8000-00805f9b34fb','0000ff02-0000-1000-8000-00805f9b34fb','0000ffe1-0000-1000-8000-00805f9b34fb'];
  try{
    if(!('bluetooth' in navigator)){
      console.warn('[Impressora] Web Bluetooth não disponível neste navegador.');
      return false;
    }
    const saved=localStorage.getItem(_BT_KEY);
    if(!saved){
      console.warn('[Impressora] Nenhuma impressora salva ainda — conecte uma vez pelo painel (Conectar Impressora).');
      return false;
    }
    const devices=await navigator.bluetooth.getDevices().catch(e=>{console.warn('[Impressora] getDevices falhou:',e);return[];});
    const dev=devices.find(d=>d.name===saved);
    if(!dev){
      console.warn('[Impressora] Dispositivo salvo ("'+saved+'") não está entre os permitidos neste navegador/página.');
      return false;
    }
    _btDevice=dev;
    // Se outra aba já está usando a conexão, tenta desconectar antes de reconectar
    if(dev.gatt.connected){try{dev.gatt.disconnect();}catch(e){}}
    const srv=await dev.gatt.connect();
    let svc=null;
    for(const u of SERVICES){try{svc=await srv.getPrimaryService(u);break;}catch(e){}}
    if(!svc){console.warn('[Impressora] Conectou no dispositivo mas não achou o serviço de impressão esperado.');return false;}
    for(const c of CHARS){try{_btChar=await svc.getCharacteristic(c);return true;}catch(e){}}
    console.warn('[Impressora] Serviço encontrado mas nenhuma característica de escrita compatível.');
    return false;
  }catch(e){
    console.warn('[Impressora] Falha ao conectar automaticamente:',e);
    return false;
  }
}

async function _imprimirBluetooth(texto){
  let ok=await _conectarBT();
  if(!ok||!_btChar){
    // Tenta mais uma vez após uma pequena pausa — a primeira conexão BLE do dia às vezes falha na primeira tentativa
    await new Promise(r=>setTimeout(r,800));
    _btChar=null;
    ok=await _conectarBT();
  }
  if(!ok||!_btChar){return false;}
  try{
    const ESC=0x1B,GS=0x1D;
    const enc=new TextEncoder();
    const cmds=[ESC,0x40,ESC,0x61,0x01];
    for(const l of texto.split('\n')){const b=enc.encode(l+'\n');for(const x of b)cmds.push(x);}
    cmds.push(GS,0x56,0x01);
    const arr=new Uint8Array(cmds);
    for(let i=0;i<arr.length;i+=20){await _btChar.writeValue(arr.slice(i,i+20));}
    return true;
  }catch(e){
    console.warn('[Impressora] Conectada mas falhou ao enviar os dados:',e);
    return false;
  }
}

// Tenta deixar a impressora pronta assim que a página carrega, igual ao painel —
// assim, quando o conversor precisar imprimir, a conexão já está "quente" e não falha na primeira tentativa.
if('bluetooth' in navigator){
  setTimeout(()=>{_conectarBT();},2000);
}

// Antes o conversor imprimia sozinho. Agora, por pedido do Marco, o pedido convertido
// só é salvo (já aparece no Caixa e no Painel) e a equipe finaliza e imprime por lá.
function _avisarPedidoNoCaixa(){
  const aviso=document.getElementById('conv-print-status');
  if(!aviso)return;
  aviso.style.display='block';
  aviso.style.color='#2ecc71';
  aviso.innerHTML='✅ Pedido enviado! Finalize e imprima no <a href="caixa/index.html" target="_blank" style="color:#2ecc71;text-decoration:underline;">Caixa</a>.';
}
function abrirCaixaParaFinalizar(){
  window.open('caixa/index.html','_blank');
}


// Impressão MANUAL (botão): tenta Bluetooth e, se não conseguir, abre a tela de impressão do navegador
function imprimirPedido(){
  if(!_ct)return;
  _imprimirBluetooth(_ct).then(ok=>{
    if(ok)return; // Imprimiu via BT
    // Fallback: popup
    const w=window.open('','_blank','width=560,height=680');
  w.document.write('<html><head><meta charset="UTF-8"><style>body{font-family:monospace;font-size:13px;line-height:1.9;padding:24px;max-width:440px;margin:auto;}h2{text-align:center;border-bottom:2px solid #000;padding-bottom:6px;margin-bottom:14px;}pre{white-space:pre-wrap;}</style></head><body><h2>PIZZA EM DOBRO</h2><pre>'+_ct.replace(/</g,'&lt;')+'</pre></body></html>');
  w.document.close();w.focus();w.print();
  });}

// SPLASH — mostra "CARREGANDO..." (tela de carregamento no estilo do fogo de fundo) até o
// cardápio estar pronto, depois troca pra "TOQUE PARA ENTRAR" com um flash rápido. O toque
// sempre funcionou mesmo antes disso pronto (o cardápio tem fallback local instantâneo), então
// nada trava — só o texto passa a refletir a realidade em vez de convidar antes da hora.
let _splashPronta=false;
function marcarSplashPronta(){
  if(_splashPronta) return;
  _splashPronta=true;
  const el=document.getElementById('ws-toque-aviso');
  if(!el) return;
  el.textContent='TOQUE PARA ENTRAR';
  el.classList.add('pronto');
}
setTimeout(marcarSplashPronta,3000); // nunca fica preso em "carregando" se a rede estiver lenta

// SPLASH — agora espera o toque do cliente, com efeito de porta abrindo
function abrirPortaSplash(){
  const ws=document.getElementById('ws');
  if(!ws || ws.classList.contains('aberto')) return;
  ws.classList.add('aberto');
  setTimeout(()=>{
    ws.style.display='none';
    ws.style.visibility='hidden';
  },950);
}

_initFB();
init();
