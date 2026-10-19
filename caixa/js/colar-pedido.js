// ══════════════════════════════════════════════════════════
//  COLAR PEDIDO (WhatsApp → Caixa)
//  A IA só identifica QUAL item do cardápio real e QUAL borda real
//  o cliente pediu — nunca inventa nome nem preço. Preço sempre vem
//  do DEFAULT_MENU/BORDAS_DEFAULT, igual a qualquer outra venda.
//  Itens que a IA não reconhecer com certeza viram um aviso manual
//  no carrinho, nunca são adicionados "no escuro".
// ══════════════════════════════════════════════════════════
// chave da IA agora fica só no servidor (server/parse-order.js) — nunca mais exposta aqui

function abrirColarPedido(){
  if(cart.length>0){
    const manter=confirm('Já tem item no carrinho (de um pedido anterior ou em andamento).\n\nOK = manter esses itens e ADICIONAR o pedido colado a eles.\nCancelar = ESVAZIAR o carrinho antes de colar o novo pedido (recomendado se o carrinho é de outro pedido).');
    if(!manter){ cart=[]; atualizarBarraCarrinho(); }
  }
  document.getElementById('colar-texto').value='';
  document.getElementById('colar-tel').value='';
  document.getElementById('colar-status').textContent='';
  openModal('modal-colar');
}

async function interpretarPedidoColado(){
  const texto=document.getElementById('colar-texto').value.trim();
  if(!texto){ alert('Cole a mensagem do cliente primeiro.'); return; }
  const btn=document.getElementById('colar-btn');
  const status=document.getElementById('colar-status');
  btn.disabled=true; btn.style.opacity='.5';
  status.style.color='var(--sub)';
  status.textContent='🤖 Interpretando o pedido...';

  const nomesCardapio=DEFAULT_MENU.map(i=>i.n);
  const nomesBordas=BORDAS_DEFAULT.map(b=>b.name);
  const nomesAcrescimos=ACRESCIMOS_DEFAULT.map(a=>a.name);
  const faixasCombo=(typeof COMBOS_DEFAULT!=='undefined'?COMBOS_DEFAULT:[]).map(c=>
    `- 2 Por R$ ${c.preco.toFixed(2).replace('.',',')}: escolha 2 sabores DIFERENTES entre ${c.sabores.join(', ')}`
  ).join('\n');
  const systemPrompt=`Você interpreta pedidos de pizzaria colados de conversas de WhatsApp (o texto pode vir bagunçado, com quebras de linha, gírias, informação fora de ordem) e devolve APENAS um JSON válido, sem texto antes ou depois, sem markdown, no formato exato:

{"cliente":{"nome":string|null,"telefone":string|null,"endereco":{"rua":string|null,"numero":string|null,"complemento":string|null,"bairro":string|null}},
"pagamento":{"forma_principal":string|null,"misto":[{"metodo":string,"valor":number|null}]|null},
"entrega":"entrega"|"retirada"|null,"troco_para":number|null,"observacao_geral":string|null,
"itens":[{"tipo":"normal"|"meia_a_meia"|"combo"|"broto"|"esfihas","nome_cardapio":string|null,"nome_cardapio_2":string|null,"combo_faixa":number|null,"esfihas":[{"sabor":string,"qtd":number}]|null,"qtd":number,"borda":string|null,"acrescimos":[string],"remover":[string],"observacao":string|null}]}

CARDÁPIO REAL — "nome_cardapio" e "nome_cardapio_2" DEVEM ser EXATAMENTE um destes nomes (copie a grafia exata), ou null se não tiver certeza absoluta: ${JSON.stringify(nomesCardapio)}
BORDAS REAIS — "borda" DEVE ser EXATAMENTE um destes nomes, ou null: ${JSON.stringify(nomesBordas)}
ACRÉSCIMOS REAIS (R$ 7,00 cada) — "acrescimos" só pode ter nomes DESTA lista (ex: "mais bacon", "com catupiry extra", "adicional de cheddar" → o nome correspondente); [] se não pediu: ${JSON.stringify(nomesAcrescimos)}
ENTREGA/RETIRADA — "entrega": "retirada" se o cliente disser que vai buscar/retirar/pegar no local/"vou aí"; "entrega" se pedir entrega ou passar endereço; null se não ficou claro. "troco_para": valor (número) se o cliente disser que paga em dinheiro e precisa de troco pra tal valor (ex: "troco pra 100" → 100); senão null. "observacao_geral": recado do cliente sobre o PEDIDO todo (ex: "ponto de referência: portão azul", "sem pressa", "tocar o interfone") em uma frase curta, ou null.
SEJA FLEXÍVEL com a forma de escrever: aceite gírias, abreviações ("calabreza", "mussa", "frango c/ cat"), erros de digitação, mensagens longas, listas com marcadores ou emojis, o formato do pedido do próprio site ("NOVO PEDIDO - SITE OFICIAL"), pedidos de várias pizzas/bebidas/esfihas/doces/calzones numa mensagem só, e informações fora de ordem. Reconheça bebidas e doces do cardápio também (tipo "normal"). Se um sabor não existir no cardápio, use null no nome e explique em "observacao" (nunca troque por outro).

FAIXAS DE COMBO "2 POR X" (promoção fixa — use EXATAMENTE estas faixas e sabores, nunca invente combinação ou preço):
${faixasCombo}

REGRAS CRÍTICAS (siga à risca, erros aqui atrapalham o funcionamento real da pizzaria):

1. UMA PIZZA FÍSICA = UM ÚNICO ITEM no array "itens". Se o cliente pedir "meia sabor A, meia sabor B", isso é UMA pizza só: gere um único objeto com "tipo":"meia_a_meia", "nome_cardapio":"A" (primeiro sabor mencionado), "nome_cardapio_2":"B" (segundo sabor). NUNCA crie um item separado para A e outro para B. NUNCA repita a mesma pizza duas vezes.

2. NUNCA troque ou "adivinhe" um sabor parecido — use exatamente o nome que o cliente disse, procurando a correspondência exata na lista do cardápio. Se o cliente disse "Toscana", o item é "Toscana", nunca "Napolitana" ou qualquer outro nome.

3. "remover" é APENAS para ingredientes que o cliente pediu para TIRAR (ex: "sem cebola" → remover:["cebola"]). NUNCA coloque frases, explicações ou descrições do pedido dentro de "remover" — só nomes curtos de ingredientes. Pedidos para ADICIONAR ou AUMENTAR algo (ex: "bastante azeitona", "mais queijo", "capricha no queijo") NÃO vão em "remover" — vão em "observacao" como um aviso curto pro atendente.

4. "observacao" é uma nota CURTA (uma frase) só quando há algo que o atendente precisa saber e não cabe nos outros campos. Nunca copie o texto inteiro da mensagem ali.

5. Pagamento: se o cliente mencionar MAIS DE UMA forma de pagamento pro mesmo pedido (ex: "30 no dinheiro e o resto no crédito"), preencha "pagamento.misto" com uma entrada por forma e o valor de cada uma (use null se o valor de uma parte não foi dito, tipo "o resto"). "forma_principal" deve ser a primeira forma mencionada. Se for só uma forma de pagamento, preencha apenas "forma_principal" e deixe "misto":null.

6. Extraia nome, telefone e endereço (rua, bairro/condomínio) exatamente como o cliente escreveu, cada pedaço no campo certo — ver regra 6.1 sobre o número, que é o campo que mais causa erro de entrega quando sai errado.

6.1. NÚMERO DA CASA/APARTAMENTO — CRÍTICO, é o dado que mais causa erro de entrega quando se perde. O número quase nunca vem sozinho nem formatado — procure ATIVAMENTE por ele no texto INTEIRO, não só na frase que parece o "endereço":
   - Pode vir logo depois do nome da rua ("Rua das Flores 123", "Rua das Flores, 123") — nesse caso "numero":"123".
   - Pode vir sozinho, sem nome de rua junto, às vezes numa linha separada ou depois de "nº", "n°", "numero", "número", "casa", "apto", "ap", "bloco" (ex: "nº 45", "casa 45", "apto 302 bloco B") — extraia o número mesmo sem o nome da rua por perto; NUNCA descarte um número só porque ele está "solto" no texto.
   - NUNCA confunda com: número de telefone (vai em "telefone", não em "numero"), valor em dinheiro/troco (ex: "pago com 50"), quantidade de pizza, ou número que faz parte do NOME de um bairro/condomínio (ex: "Condomínio Vila 3", "Jardim das Indústrias II" — isso é "bairro", não "numero").
   - Se o cliente mencionou rua/bairro mas em NENHUM lugar do texto há um número de casa/apartamento reconhecível, "numero" fica null — não invente, mas também não desista de procurar antes de decidir que não tem.

EXEMPLOS SÓ DE NÚMERO (pra fixar o padrão, endereço completo fora deles pode variar):
"Rua Sete de Setembro 452, Vila Nova" → {"rua":"Rua Sete de Setembro","numero":"452","complemento":null,"bairro":"Vila Nova"}
"pode entregar na Rua dos Ipês\nnº 78\napto 12" → {"rua":"Rua dos Ipês","numero":"78","complemento":"apto 12","bairro":null}
"endereço 205" (sem nome de rua) → {"rua":null,"numero":"205","complemento":null,"bairro":null}
"Jardim Paulista, perto do mercado" (sem nenhum número em lugar nenhum do texto) → {"rua":null,"numero":null,"complemento":null,"bairro":"Jardim Paulista"}

7. "cliente.nome" é EXCLUSIVAMENTE o nome de uma PESSOA. NUNCA coloque ali nome de rua, avenida, bairro, condomínio ou qualquer trecho de endereço — isso vai em "cliente.endereco". Se o texto tiver algo como "Rua das Palmeiras, 205" ou "Av. Brasil 90", isso é endereço, nunca nome. Se não houver um nome de pessoa claro e separado do endereço, "cliente.nome" deve ser null — nunca "adivinhe" um nome usando parte do endereço.

8. "borda" É INDIVIDUAL DE CADA ITEM e só pode ser preenchida se o cliente pediu uma borda recheada EXPLICITAMENTE para aquela pizza específica (ex: "borda de catupiry", "borda recheada de chocolate"). Muitos sabores do cardápio já contêm palavras como "Catupiry" no PRÓPRIO NOME/descrição (ex: "Frango Catupiry", "Calabresa Piry", "Franqueijo Piry") — isso é o RECHEIO da pizza, não é pedido de borda, e NUNCA deve fazer você preencher "borda" nesse item nem em nenhum outro. Preencher "borda" em um item nunca deve influenciar os outros itens do pedido — cada item é avaliado sozinho, olhando só o que foi dito sobre ELE. Na dúvida, "borda":null.

9. COMBO "2 por X": se o cliente pedir um combo (duas pizzas de sabores diferentes por um preço fixo, ex: "quero o 2 por 65", "o combo de mussarela com calabresa"), use "tipo":"combo". Preencha "nome_cardapio" com o 1º sabor e "nome_cardapio_2" com o 2º sabor, EXATAMENTE como aparecem na lista de FAIXAS DE COMBO acima (nunca do cardápio normal). Preencha "combo_faixa" com o valor da faixa (65, 75, 80 ou 85) SE o cliente disse o preço/faixa explicitamente — senão deixe "combo_faixa":null, o sistema descobre sozinho pelos 2 sabores. O combo é sempre 2 sabores DIFERENTES — nunca repita o mesmo sabor nos dois campos. Se não tiver certeza se é combo ou 2 pizzas avulsas, ou não tiver certeza da faixa/sabores, prefira "tipo":"normal" com um item pra cada sabor (nunca invente uma faixa de combo que o cliente não pediu claramente).

10. COMBO BROTO — "2 pizzas broto por R$ 50" (o cliente diz "combo broto", "2 broto", "duas brotinho", "broto 50"): use "tipo":"broto", "nome_cardapio" = 1º sabor e "nome_cardapio_2" = 2º sabor, EXATAMENTE como no CARDÁPIO REAL (qualquer pizza tradicional ou especial). Aqui os 2 sabores PODEM ser iguais. "qtd" = quantos combos broto (cada combo = 2 pizzas broto). Se o cliente disser só 1 sabor para o combo, repita o mesmo sabor nos dois campos. Se disser "broto" mas não ficar claro que é o combo de 2, use "tipo":"normal".

11. ESFIHAS (R$ 5,00 cada; sabores fixos: ${JSON.stringify(typeof ESFIHA_SABORES!=='undefined'?ESFIHA_SABORES:[])}): quando o cliente pedir esfihas (ex: "10 esfihas, 5 de carne e 5 de frango catupiry", "combo de 20 esfiha", "3 esfiha de bacon"), use "tipo":"esfihas" em UM ÚNICO item para TODAS as esfihas do pedido, e preencha "esfihas":[{"sabor":"<nome exato da lista acima>","qtd":N}, ...] com a quantidade de cada sabor. "qtd" do item é sempre 1. NÃO calcule preço — o sistema aplica 10=R$50, 20=R$90, 30=R$130 sozinho. Se o cliente pediu uma quantidade total (ex: "10 esfihas") sem dividir por sabor, divida igualmente pelos sabores que ele citou; se não citou nenhum, use "tipo":"normal" com nome_cardapio null e uma "observacao" explicando (o atendente confere). "Esfiha mista" é um sabor da lista (Mista).

EXEMPLO (cardápio ilustrativo, não é o real — é só pra você entender o padrão esperado):
Texto recebido: "oi, meu nome é Ana. quero uma meia Frango meia Calabresa, borda catupiry, sem cebola, bem carregado na azeitona por favor. Pagamento: 20 no pix e o resto na entrega em dinheiro. Rua das Flores 123"
JSON esperado:
{"cliente":{"nome":"Ana","telefone":null,"endereco":{"rua":"Rua das Flores","numero":"123","complemento":null,"bairro":null}},
"pagamento":{"forma_principal":"Pix","misto":[{"metodo":"Pix","valor":20},{"metodo":"Dinheiro","valor":null}]},
"itens":[{"tipo":"meia_a_meia","nome_cardapio":"Frango","nome_cardapio_2":"Calabresa","qtd":1,"borda":"Catupiry","remover":["cebola"],"observacao":"cliente pediu bem carregado na azeitona"}]}

CONTRAEXEMPLO (mostra a regra 8 — sabor com "catupiry" no nome NÃO é borda — e a regra 6.1, número solto sem rua):
Texto recebido: "quero uma Frango Catupiry e uma Atum, endereço 205, cartão débito"
JSON esperado:
{"cliente":{"nome":null,"telefone":null,"endereco":{"rua":null,"numero":"205","complemento":null,"bairro":null}},
"pagamento":{"forma_principal":"Cartão de Débito","misto":null},
"itens":[{"tipo":"normal","nome_cardapio":"Frango Catupiry","nome_cardapio_2":null,"qtd":1,"borda":null,"remover":[],"observacao":null},{"tipo":"normal","nome_cardapio":"Atum","nome_cardapio_2":null,"qtd":1,"borda":null,"remover":[],"observacao":null}]}
(repare: "Catupiry" aqui é parte do NOME do sabor, nenhum dos dois itens pediu borda, então "borda" fica null nos dois — mesmo a palavra "catupiry" aparecendo no texto. E "205" virou "numero" mesmo sem nome de rua junto — nunca jogue um número solto fora.)`;

  try{
    // 1ª tentativa; se a IA devolver algo que não é JSON (acontece com mensagem muito bagunçada), tenta de novo uma vez
    let parsed=null, ultimoErro=null;
    for(let tentativa=0;tentativa<2&&!parsed;tentativa++){
      try{
        const r=await fetch('/api/parse-order',{
          method:'POST',
          headers:await cabecalhosEquipe(),
          body:JSON.stringify({systemPrompt, raw:texto})
        });
        const d=await r.json();
        if(d.error) throw new Error(d.error);
        let raw=(d?.texto||'').trim().replace(/^```json\s*|^```\s*|```$/g,'');
        const ini=raw.indexOf('{'), fim=raw.lastIndexOf('}');
        if(ini>=0&&fim>ini) raw=raw.slice(ini,fim+1); // pega só o JSON, mesmo que venha texto antes/depois
        parsed=JSON.parse(raw);
      }catch(e){ ultimoErro=e; if(tentativa===0) status.textContent='🤖 Conferindo de novo...'; }
    }
    if(!parsed) throw ultimoErro||new Error('sem resposta');
    montarCaixaComPedidoInterpretado(parsed);
    closeModal('modal-colar');
  }catch(e){
    console.error('Erro ao interpretar pedido:',e);
    status.style.color='var(--se)';
    status.textContent='⚠️ Não consegui interpretar. Confira o texto ou monte manualmente.';
  }finally{
    btn.disabled=false; btn.style.opacity='1';
  }
}

// ── Casamento tolerante com o cardápio: a IA pode errar a grafia ("calabreza", "Frango c/ Catupiry").
// Primeiro igualdade sem acento/maiúscula, depois "contém", depois palavras em comum.
function _normNome(t){ return String(t||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/\b(pizza|de|da|do|a|o|com|c|e|extra)\b/g,' ').replace(/\s+/g,' ').trim(); }
function _acharPorNome(nome,lista,getNome){
  const alvo=_normNome(nome); if(!alvo) return null;
  const nomes=lista.map(x=>_normNome(getNome(x)));
  let i=nomes.indexOf(alvo); if(i>=0) return lista[i];
  const cont=[]; nomes.forEach((n,k)=>{ if(n&&(n.includes(alvo)||alvo.includes(n))) cont.push(k); });
  if(cont.length===1) return lista[cont[0]];
  // erro de digitação ("calabreza", "margarita"): distância de edição pequena e sem empate
  const dist=(a,b)=>{ const d=Array.from({length:a.length+1},(_,i)=>[i]); for(let j=1;j<=b.length;j++) d[0][j]=j; for(let i=1;i<=a.length;i++) for(let j=1;j<=b.length;j++) d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1)); return d[a.length][b.length]; };
  const limite=Math.max(1,Math.floor(alvo.length*0.25)); let mk=-1, md=99, mt=false;
  nomes.forEach((n,k)=>{ if(!n) return; const x=dist(alvo,n); if(x<md){md=x;mk=k;mt=false;} else if(x===md) mt=true; });
  if(mk>=0&&md<=limite&&!mt) return lista[mk];
  const pa=new Set(alvo.split(' ')); let melhor=-1, ms=0, empate=false;
  nomes.forEach((n,k)=>{ if(!n) return; const pn=n.split(' '); const comum=pn.filter(w=>pa.has(w)).length; const sc=comum/Math.max(pn.length,pa.size); if(sc>ms){ms=sc;melhor=k;empate=false;} else if(sc===ms&&sc>0) empate=true; });
  return (melhor>=0&&ms>=0.6&&!empate)?lista[melhor]:null;
}
const _acharItem=n=>_acharPorNome(n,DEFAULT_MENU,m=>m.n);
const _acharBorda=n=>_acharPorNome(n,BORDAS_DEFAULT,b=>b.name);
const _acharAcrescimos=ls=>(Array.isArray(ls)?ls:[]).map(n=>_acharPorNome(n,ACRESCIMOS_DEFAULT,a=>a.name)).filter((a,i,arr)=>a&&arr.indexOf(a)===i);

function montarCaixaComPedidoInterpretado(parsed){
  let naoIdentificados=0;
  let meiaAMeiaDetectada=false;
  let comboDetectado=false;
  (parsed.itens||[]).forEach(it=>{
    const qtd=Math.max(1,parseInt(it.qtd)||1);

    // ---- COMBO "2 POR X" ----
    if(it.tipo==='combo'){
      const s1=it.nome_cardapio, s2=it.nome_cardapio_2;
      // resolverFaixaCombo() vem de shared/utils.js — fonte única com o site e o bot do WhatsApp
      const combo=(typeof resolverFaixaCombo==='function')?resolverFaixaCombo(s1,s2,it.combo_faixa):null;
      if(!combo||!s1||!s2||s1===s2){
        naoIdentificados++;
        cart.push({
          _chave:'manual-'+Date.now()+'-'+Math.random(),
          id:null, name:'⚠️ CONFERIR (combo): '+(it.observacao||[s1,s2].filter(Boolean).join(' + ')||'faixa/sabores não identificados'),
          unitPrice:0, qty:qtd, borda:null, removedIng:[], addedIng:[], isMeia:false, precisaRevisao:true
        });
        return;
      }
      // usa a MESMA função do botão manual de combo — zero divergência entre os dois caminhos
      adicionarComboAoCarrinho(combo, s1, s2, qtd);
      comboDetectado=true;
      return;
    }

    // ---- COMBO BROTO (2 broto por R$ 50, qualquer sabor p/s, pode repetir) ----
    if(it.tipo==='broto'){
      const sabOk=n=>DEFAULT_MENU.some(m=>(m.cat==='p'||m.cat==='s')&&m.n===n);
      const acharSab=n=>{ const m=_acharItem(n); return m&&(m.cat==='p'||m.cat==='s')?m.n:n; };
      const s1=acharSab(it.nome_cardapio), s2=acharSab(it.nome_cardapio_2||it.nome_cardapio);
      if(!s1||!sabOk(s1)||!sabOk(s2)){
        naoIdentificados++;
        cart.push({
          _chave:'manual-'+Date.now()+'-'+Math.random(),
          id:null, name:'⚠️ CONFERIR (combo broto): '+(it.observacao||[s1,s2].filter(Boolean).join(' + ')||'sabores não identificados'),
          unitPrice:0, qty:qtd, borda:null, removedIng:[], addedIng:[], isMeia:false, precisaRevisao:true
        });
        return;
      }
      adicionarBrotoAoCarrinho(s1, s2, qtd);
      comboDetectado=true;
      return;
    }

    // ---- ESFIHAS (R$ 5; 10=50, 20=90, 30=130) ----
    if(it.tipo==='esfihas'){
      const norm=t=>(t||'').toString().trim().toLowerCase();
      const cont={}; let ok=true;
      (it.esfihas||[]).forEach(e=>{
        const sab=ESFIHA_SABORES.find(x=>norm(x)===norm(e.sabor));
        const q=Math.max(0,parseInt(e.qtd)||0);
        if(!sab){ ok=false; return; }
        cont[sab]=(cont[sab]||0)+q;
      });
      const total=ESFIHA_SABORES.reduce((t,x)=>t+(cont[x]||0),0);
      if(!ok||!total){
        naoIdentificados++;
        cart.push({
          _chave:'manual-'+Date.now()+'-'+Math.random(),
          id:null, name:'⚠️ CONFERIR (esfihas): '+(it.observacao||'sabores/quantidades não identificados'),
          unitPrice:0, qty:1, borda:null, removedIng:[], addedIng:[], isMeia:false, precisaRevisao:true
        });
        return;
      }
      adicionarEsfihasAoCarrinho(cont, 1);
      comboDetectado=true;
      return;
    }

    // ---- MEIA A MEIA ----
    if(it.tipo==='meia_a_meia'){
      const metadeA=DEFAULT_MENU.find(m=>m.n===it.nome_cardapio)||_acharItem(it.nome_cardapio);
      const metadeB=DEFAULT_MENU.find(m=>m.n===it.nome_cardapio_2)||_acharItem(it.nome_cardapio_2);
      if(!metadeA||!metadeB){
        naoIdentificados++;
        cart.push({
          _chave:'manual-'+Date.now()+'-'+Math.random(),
          id:null, name:'⚠️ CONFERIR (meia a meia): '+(it.observacao||[it.nome_cardapio,it.nome_cardapio_2].filter(Boolean).join(' / ')||'não identificado'),
          unitPrice:0, qty:qtd, borda:null, removedIng:[], addedIng:[], isMeia:true, precisaRevisao:true
        });
        return;
      }
      // usa a MESMA função do modo manual — zero divergência de preço/formato entre os dois caminhos
      adicionarMeiaAMeiaAoCarrinho(metadeA, metadeB, (_acharBorda(it.borda)||{}).name||null, Array.isArray(it.remover)?it.remover:[], qtd, _acharAcrescimos(it.acrescimos));
      meiaAMeiaDetectada=true;
      return;
    }

    // ---- ITEM NORMAL ----
    const menuItem=DEFAULT_MENU.find(m=>m.n===it.nome_cardapio)||_acharItem(it.nome_cardapio);
    if(!menuItem){
      naoIdentificados++;
      cart.push({
        _chave:'manual-'+Date.now()+'-'+Math.random(),
        id:null, name:'⚠️ CONFERIR: '+(it.observacao||it.nome_cardapio||'item não identificado'),
        unitPrice:0, qty:qtd, borda:null, removedIng:[], addedIng:[], isMeia:false, precisaRevisao:true
      });
      return;
    }
    const borda=BORDAS_DEFAULT.find(b=>b.name===it.borda)||_acharBorda(it.borda);
    const precoBorda=(itemAceitaOpcoes(menuItem.cat)&&borda)?borda.price:0;
    const acrs=itemAceitaOpcoes(menuItem.cat)?_acharAcrescimos(it.acrescimos):[];
    const precoAcr=acrs.reduce((t,a)=>t+a.price,0);
    const acrNomes=acrs.map(a=>a.name);
    const bordaNome=(itemAceitaOpcoes(menuItem.cat)&&borda&&borda.name!=='Sem Borda Recheada')?borda.name:null;
    const removidos=Array.isArray(it.remover)?it.remover:[];
    const obsTexto=it.observacao||null;
    // chave determinística (nunca Date.now()/Math.random()) — pizza igual pedida 2x vira "2x" numa linha só, não 2 linhas de "1x"
    const novoItem={
      id:menuItem.id, name:menuItem.n, unitPrice:menuItem.p+precoBorda+precoAcr, qty:qtd,
      borda:bordaNome, removedIng:removidos, addedIng:acrNomes, obs:obsTexto, isMeia:false
    };
    novoItem._chave='colado|'+menuItem.id+'|'+(bordaNome||'')+'|'+removidos.slice().sort().join(',')+'|'+acrNomes.slice().sort().join(',')+'|'+(obsTexto||'');
    const existenteItem=cart.find(c=>c._chave===novoItem._chave);
    if(existenteItem){ existenteItem.qty+=novoItem.qty; }
    else{ cart.push(novoItem); }
  });

  const cli=parsed.cliente||{};
  const pag=parsed.pagamento||{};
  const end=cli.endereco||{};
  const telManual=document.getElementById('colar-tel').value.trim();
  if(cli.nome) document.getElementById('f-nome').value=cli.nome;
  if(telManual) document.getElementById('f-tel').value=telManual;
  else if(cli.telefone) document.getElementById('f-tel').value=cli.telefone;
  // endereço vem em pedaços (rua/numero/complemento/bairro) — nunca um texto solto — pra o
  // número da casa/apto nunca ficar "perdido" no meio de uma frase livre. Monta sempre no
  // mesmo formato, com o número destacado logo depois da rua.
  let enderecoFaltandoNumero=false;
  if(end.rua||end.numero||end.complemento||end.bairro){
    document.getElementById('f-tipo').value='entrega';
    alternarCampoEntregador();
    const partes=[];
    if(end.rua) partes.push(end.rua);
    if(end.numero) partes.push('nº '+end.numero);
    if(end.complemento) partes.push(end.complemento);
    if(end.bairro) partes.push(end.bairro);
    document.getElementById('f-endereco-colado').value=partes.join(', ');
    // tem rua ou bairro mas NENHUM número — é o erro mais caro que existe aqui (entrega
    // errada/perdida), avisa antes de deixar ir pro motoboy sem ninguém notar
    if((end.rua||end.bairro)&&!end.numero) enderecoFaltandoNumero=true;
  }

  // retirada declarada pelo cliente vale mais que "ter endereço"; entrega sem endereço fica como entrega
  if(parsed.entrega==='retirada'){ document.getElementById('f-tipo').value='retirada'; alternarCampoEntregador(); }
  else if(parsed.entrega==='entrega'&&document.getElementById('f-tipo').value!=='entrega'){ document.getElementById('f-tipo').value='entrega'; alternarCampoEntregador(); }
  // recado geral do cliente sobre o pedido: vai como observação no 1º item do carrinho (aparece no cupom)
  if(parsed.observacao_geral&&cart.length){ const p0=cart[0]; p0.obs=[p0.obs,parsed.observacao_geral].filter(Boolean).join(' | '); }

  atualizarBarraCarrinho();
  openCartModal(); // atenção: isso reseta o pagamento, por isso o misto é aplicado DEPOIS, abaixo

  let avisoPagamento=null;
  if(Array.isArray(pag.misto)&&pag.misto.length>1){
    // ativa de verdade o pagamento fracionado, já preenchido com o que a IA identificou
    pagamentoMisto=true;
    document.getElementById('misto-box').style.display='block';
    document.getElementById('pay-methods').style.opacity='.4';
    document.getElementById('pay-methods').style.pointerEvents='none';
    const total=totalCarrinho();
    const somaComValor=pag.misto.reduce((s,l)=>s+(l.valor||0),0);
    const semValor=pag.misto.filter(l=>!l.valor).length;
    const restante=Math.max(0,total-somaComValor);
    linhasMisto=pag.misto.map(l=>({
      metodo:['Dinheiro','Pix','Cartão de Crédito','Cartão de Débito'].find(m=>l.metodo&&l.metodo.toLowerCase().includes(m.toLowerCase().split(' ')[0].toLowerCase()))||'Dinheiro',
      valor: l.valor || (semValor===1 ? Math.round(restante*100)/100 : 0)
    }));
    renderLinhasMisto();
    atualizarVisibilidadeTroco();
    avisoPagamento='💰 Pagamento combinado já preenchido — confira os valores antes de finalizar.';
  } else if(pag.forma_principal){
    const metodo=['Dinheiro','Pix','Cartão de Crédito','Cartão de Débito'].find(m=>pag.forma_principal.toLowerCase().includes(m.toLowerCase().split(' ')[0].toLowerCase()));
    if(metodo) selecionarPagamento(metodo);
    // "troco pra 100": preenche o valor recebido (o Caixa calcula o troco sozinho)
    const campoRec=document.getElementById('f-valor-recebido');
    if(metodo==='Dinheiro'&&campoRec&&Number(parsed.troco_para)>0){
      campoRec.value=Number(parsed.troco_para);
      campoRec.dispatchEvent(new Event('input',{bubbles:true}));
    }
  }

  if(meiaAMeiaDetectada){
    const btn=document.getElementById('btn-meia');
    btn.classList.add('active');
    setTimeout(()=>btn.classList.remove('active'),1600);
  }
  const avisos=[];
  if(naoIdentificados>0) avisos.push('⚠️ '+naoIdentificados+' item(ns) não foram reconhecidos com certeza e aparecem marcados no carrinho como "CONFERIR" — remova e adicione o item correto pela busca antes de finalizar.');
  if(comboDetectado) avisos.push('🍕🍕 Combo/esfihas identificados e adicionados ao carrinho — confira os sabores, quantidades e o preço antes de finalizar.');
  if(enderecoFaltandoNumero) avisos.push('📍 Não encontrei o NÚMERO da casa/apartamento no texto colado — confira com o cliente antes de despachar a entrega.');
  if(avisoPagamento) avisos.push(avisoPagamento);
  if(avisos.length) setTimeout(()=>alert(avisos.join('\n\n')),400);
}


// carrega o cardápio de verdade do banco (mesma fonte que o site usa) — sem isso,
// item adicionado/editado pelo site, painel ou assistente de IA nunca aparecia aqui,
// porque essa lista ficava travada no que estava escrito direto no código.
async function carregarCardapioDoBanco(){
  if(!FS) return;
  try{
    const snap=await FS.collection('menu_items').where('active','==',true).orderBy('slug_id','asc').get();
    if(snap.empty) return; // mantém a lista padrão se o banco ainda não tiver nada
    const novoMenu=snap.docs.map(d=>{
      const r=d.data();
      return {
        id:r.slug_id||Number(d.id)||d.id,
        n:r.name,
        d:r.description||'',
        p:parseFloat(r.price)||0,
        cat:typeof _normalizarCategoriaCardapio==='function'?_normalizarCategoriaCardapio(r.category):(Object.keys(CATLABELS).includes(r.category)?r.category:'p')
      };
    });
    DEFAULT_MENU=novoMenu;
    renderCats();
    renderProdutos();
  }catch(e){
    console.warn('Não foi possível carregar o cardápio do banco, usando a lista padrão do código:',e);
  }
}
if(new URLSearchParams(window.location.search).get('colar')==='1'){ abrirColarPedido(); }
if(new URLSearchParams(window.location.search).get('view')==='hoje'){ setView('hoje'); }

// ── MINI PERFIL DO CLIENTE (a partir da lista de vendas de hoje) ──
function abrirPerfilClienteCaixa(telefone,nome){
  const chave=(telefone||nome||'').toLowerCase();
  const doCliente=(pedidosHojeCache||[]).filter(p=>(p.client_phone||p.client_name||'').toLowerCase()===chave);
  document.getElementById('perfil-nome-caixa').textContent=nome||'Cliente';
  document.getElementById('perfil-tel-caixa').textContent=telefone||'—';
  document.getElementById('perfil-qtd-caixa').textContent=doCliente.length;
  const total=doCliente.reduce((s,p)=>s+Number(p.total||0),0);
  document.getElementById('perfil-total-caixa').textContent=fmt(total);

  const waBtn=document.getElementById('perfil-whatsapp-caixa');
  if(telefone){
    const digitos=telefone.replace(/\D/g,'');
    const comDDI=digitos.length<=11?'55'+digitos:digitos;
    waBtn.href='https://wa.me/'+comDDI;
    waBtn.style.display='inline-flex';
  }else{
    waBtn.style.display='none';
  }
  openModal('modal-perfil');
}

