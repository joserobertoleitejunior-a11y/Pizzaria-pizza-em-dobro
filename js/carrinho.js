// ══════════════════════════════════
//  CART
// ══════════════════════════════════
function addItem(id){
  const scr=window.scrollY;
  const item=menu.find(m=>m.id===id);if(!item)return;
  cart.push({...item,cartId:Date.now()+Math.random(),selectedBorda:BORDAS[0],removedIngredients:[],addedIngredients:[]});
  renderBordas(id);renderRemovals(id);
  const hasHH=cart.some(c=>c.type==='half'&&c.baseId===id);
  if(!hasHH)showImg(id,false);
  updateUI();window.scrollTo(0,scr);
}

function removeItem(id){
  let idx=-1;
  for(let i=cart.length-1;i>=0;i--){
    if(cart[i].id===id||(cart[i].type==='half'&&cart[i].baseId===id)){idx=i;break;}
  }
  if(idx===-1)return;
  cart.splice(idx,1);
  renderBordas(id);renderRemovals(id);
  const rem=cart.filter(c=>c.id===id||(c.type==='half'&&c.baseId===id));
  if(rem.length===0)hideImg(id);
  updateUI();
}

function removeFromSum(idx){
  const scr=window.scrollY;
  const it=cart[idx];const id=it.type==='half'?it.baseId:it.id;
  cart.splice(idx,1);
  renderBordas(id);renderRemovals(id);
  const rem=cart.filter(c=>c.id===id||(c.type==='half'&&c.baseId===id));
  if(rem.length===0)hideImg(id);
  updateUI();window.scrollTo(0,scr);
}
function duplicarItemCarrinho(idx){
  const scr=window.scrollY;
  const it=cart[idx];
  if(!it)return;
  cart.push({...it,cartId:Date.now()+Math.random()});
  updateUI();window.scrollTo(0,scr);
}

// ══════════════════════════════════
//  CONTROLES INLINE DO CARRINHO
// ══════════════════════════════════
function toggleCartOpts(sectionId,arrowId){
  const el=document.getElementById(sectionId);
  const arrow=document.getElementById(arrowId);
  if(!el)return;
  const open=el.style.display==='none';
  el.style.display=open?'block':'none';
  if(arrow)arrow.innerText=open?'▲':'▼';
}
function cartSetBorda(idx,vi){
  if(!cart[idx])return;
  cart[idx].selectedBorda=BORDAS[vi];
  updateUI();
}
function cartToggleAcr(idx,ai){
  if(!cart[idx])return;
  if(!cart[idx].addedIngredients)cart[idx].addedIngredients=[];
  const acr=ACRESCIMOS[ai];
  const i=cart[idx].addedIngredients.findIndex(x=>x.name===acr.name);
  if(i===-1)cart[idx].addedIngredients.push({...acr});
  else cart[idx].addedIngredients.splice(i,1);
  updateUI();
}
function cartToggleRm(idx,g,c){
  if(!cart[idx])return;
  if(!cart[idx].removedIngredients)cart[idx].removedIngredients=[];
  if(c){if(!cart[idx].removedIngredients.includes(g))cart[idx].removedIngredients.push(g);}
  else cart[idx].removedIngredients=cart[idx].removedIngredients.filter(x=>x!==g);
  updateUI();
}

// ══════════════════════════════════
//  BORDAS & REMOVALS
// ══════════════════════════════════
function renderBordas(id){
  const ct=document.getElementById(`bc-${id}`);if(!ct)return;
  const rc=document.getElementById(`rc-${id}`);
  const base=menu.find(m=>m.id===id);
  if(!base||base.cat!=='p'&&base.cat!=='s'){if(ct)ct.innerHTML='';if(rc)rc.innerHTML='';return;}
  const its=cart.filter(m=>m.id===id||(m.type==='half'&&m.baseId===id));
  if(!its.length){if(ct)ct.innerHTML='';if(rc)rc.innerHTML='';return;}
  const getIngs=(item)=>(item.d||'').split(',').flatMap(s=>s.trim().split(' e ')).map(s=>s.trim()).filter(s=>s&&s.toLowerCase()!=='molho');

  ct.innerHTML=its.map((it,i)=>{
    const isMeia=it.type==='half';
    const label=its.length>1?(isMeia?`½${it.halves[0].n}+½${it.halves[1].n}`:`Pizza ${i+1}`):'';
    // label da metade para o pizzaiolo (ex: "½ MARGHERITA  +  ½ CALABRESA")
    const meiaLabel=isMeia
      ?`<div style="background:rgba(255,159,28,.08);border:1px solid rgba(255,159,28,.2);border-radius:8px;padding:8px 10px;margin-bottom:10px;">
          <div style="font-size:.72rem;color:var(--muted);letter-spacing:2px;margin-bottom:6px;">🍕 MEIA A MEIA</div>
          <div style="display:flex;align-items:center;gap:6px;">
            <div style="flex:1;background:rgba(255,159,28,.1);border-radius:6px;padding:6px 8px;text-align:center;">
              <div style="font-size:.72rem;color:var(--muted);letter-spacing:1.5px;margin-bottom:2px;">1ª METADE</div>
              <div style="font-size:.86rem;font-weight:700;color:var(--pr);">½ ${it.halves[0].n}</div>
            </div>
            <div style="font-size:.98rem;color:var(--tx-5);">+</div>
            <div style="flex:1;background:rgba(255,159,28,.1);border-radius:6px;padding:6px 8px;text-align:center;">
              <div style="font-size:.72rem;color:var(--muted);letter-spacing:1.5px;margin-bottom:2px;">2ª METADE</div>
              <div style="font-size:.86rem;font-weight:700;color:var(--pr);">½ ${it.halves[1].n}</div>
            </div>
          </div>
          <div style="font-size:.72rem;color:var(--tx-4);margin-top:6px;text-align:center;">As opções abaixo se aplicam à pizza inteira (borda e acréscimos) ou a cada metade (remover ingrediente)</div>
        </div>`
      :'';
    const acrSel=it.addedIngredients||[];

    return `
    <div style="border:1px solid rgba(255,159,28,.12);border-radius:10px;padding:10px;margin-top:8px;background:rgba(20,20,20,.02);">
      ${meiaLabel}

      <!-- BORDA toggle -->
      <div class="opt-toggle-hdr" onclick="toggleOpts('borda-${id}-${i}','borda-arrow-${id}-${i}')">
        <span style="font-size:.78rem;font-weight:700;letter-spacing:1.5px;color:var(--pr);">
          🥖 BORDA
          ${it.selectedBorda&&it.selectedBorda.price>0?`<span style="background:rgba(255,159,28,.2);border-radius:10px;padding:1px 8px;margin-left:4px;">${it.selectedBorda.name}</span>`:''}
        </span>
        <span id="borda-arrow-${id}-${i}" style="font-size:.82rem;color:var(--tx-5);">▼</span>
      </div>
      <div id="borda-${id}-${i}" style="display:none;padding-top:6px;">
        <div class="borda-pills">
          ${BORDAS.map((o,oi)=>`
            <div class="borda-pill${it.selectedBorda&&it.selectedBorda.name===o.name?' sel':''}"
              onclick="setBorda(${id},${i},${oi})" id="bp-${id}-${i}-${oi}">
              ${o.name}${o.price>0?`<span style="font-size:.74rem;opacity:.75;"> +R$${fmtPrice(o.price)}</span>`:''}
            </div>`).join('')}
        </div>
      </div>

    </div>`;
  }).join('');

  // REMOVER — container rc separado
  if(rc){
    rc.innerHTML=its.map((it,i)=>{
      const isMeia=it.type==='half';
      const ings=isMeia
        ?[...new Set([...getIngs(it.halves[0]),...getIngs(it.halves[1])])]
        :getIngs(base);
      const remSel=it.removedIngredients||[];
      const label=its.length>1?(isMeia?`½${it.halves[0].n}+½${it.halves[1].n}`:`Pizza ${i+1}`):'';

      return `
      <div style="border:1px solid rgba(231,29,54,.12);border-radius:10px;padding:10px;margin-top:6px;background:rgba(20,20,20,.02);">
        ${label?`<div style="font-size:.78rem;font-weight:700;color:var(--se);letter-spacing:1px;margin-bottom:8px;opacity:.8;">${label}</div>`:''}
        <div class="opt-toggle-hdr" style="border-color:rgba(231,29,54,.15);" onclick="toggleOpts('rm-${id}-${i}','rm-arrow-${id}-${i}')">
          <span style="font-size:.78rem;font-weight:700;letter-spacing:1.5px;color:var(--se);">
            🚫 REMOVER INGREDIENTE
            ${remSel.length>0?`<span style="background:rgba(231,29,54,.2);border-radius:10px;padding:1px 8px;margin-left:4px;">${remSel.length} removido${remSel.length>1?'s':''}</span>`:'<span style="font-size:.74rem;color:var(--tx-5);font-weight:400;margin-left:4px;">(opcional)</span>'}
          </span>
          <span id="rm-arrow-${id}-${i}" style="font-size:.82rem;color:var(--tx-5);">▼</span>
        </div>
        <div id="rm-${id}-${i}" style="display:none;padding-top:6px;">
          <div class="rm-pills">
            ${ings.map(g=>`
              <div class="rm-pill${remSel.includes(g)?' sel':''}"
                onclick="toggleRm(${id},${i},'${g.replace(/'/g,"\'")}',!this.classList.contains('sel'))">
                Sem ${g}
              </div>`).join('')}
          </div>
        </div>
      </div>`;
    }).join('');
  }
}
function toggleOpts(sectionId,arrowId){
  const el=document.getElementById(sectionId);
  const arrow=document.getElementById(arrowId);
  if(!el)return;
  const open=el.style.display==='none';
  el.style.display=open?'block':'none';
  if(arrow)arrow.innerText=open?'▲ fechar':'▼ ver';
}

function setBorda(id,i,vi){
  const its=cart.filter(m=>m.id===id||(m.type==='half'&&m.baseId===id));
  if(!its[i])return;
  its[i].selectedBorda=BORDAS[vi];
  const pills=document.querySelectorAll(`[id^="bp-${id}-${i}-"]`);
  pills.forEach((p,oi)=>p.classList.toggle('sel',oi===vi));
  updateUI();
}

function toggleAcr(id,i,ai){
  const its=cart.filter(m=>m.id===id||(m.type==='half'&&m.baseId===id));
  if(!its[i])return;
  if(!its[i].addedIngredients)its[i].addedIngredients=[];
  const acr=ACRESCIMOS[ai];
  const idx=its[i].addedIngredients.findIndex(x=>x.name===acr.name);
  const pill=document.getElementById(`ap-${id}-${i}-${ai}`);
  if(idx===-1){its[i].addedIngredients.push({...acr});if(pill)pill.classList.add('sel');}
  else{its[i].addedIngredients.splice(idx,1);if(pill)pill.classList.remove('sel');}
  renderBordas(id);
  updateUI();
}

function renderRemovals(id){renderBordas(id);}

function toggleRm(id,i,g,c){
  const its=cart.filter(m=>m.id===id||(m.type==='half'&&m.baseId===id));
  const it=its[i];if(!it)return;
  if(c){if(!it.removedIngredients.includes(g))it.removedIngredients.push(g);}
  else it.removedIngredients=it.removedIngredients.filter(x=>x!==g);
  renderBordas(id);
  updateUI();
}

// ══════════════════════════════════
//  UPDATE UI — com desconto promo
// ══════════════════════════════════
// ── BORDA no resumo do pedido: um toque, pra qualquer pizza (avulsa, meia a meia, broto e combos — no combo, uma por pizza)
function ehPizzaSite(it){ return !!it&&(it.cat==='p'||it.cat==='s'||it.type==='half'||it.cat==='co'); }
function seletorBordaResumo(it,idxs){
  if(!ehPizzaSite(it)) return '';
  const lista=idxs.join(',');
  const combo=it.cat==='co';
  const atual=k=>combo?((it.bordas||[0,0])[k]||0):Math.max(0,BORDAS.findIndex(b=>b.name===(it.selectedBorda&&it.selectedBorda.name)));
  const sel=k=>`<select class="sum-borda-sel" onchange="bordaResumo('${lista}',${k},this.value)" aria-label="Borda${combo?' da '+(k+1)+'ª pizza':''}">`+
    BORDAS.map((b,bi)=>`<option value="${bi}" ${atual(k)===bi?'selected':''}>${bi===0?'Sem borda':b.name+' +R$'+fmtPrice(b.price)}</option>`).join('')+'</select>';
  return combo?`<span class="sum-borda-linha">🥖 1ª pizza ${sel(0)}</span><span class="sum-borda-linha">🥖 2ª pizza ${sel(1)}</span>`:`<span class="sum-borda-linha">🥖 Borda ${sel(0)}</span>`;
}
function bordaResumo(lista,k,vi){
  vi=Number(vi)||0;
  String(lista).split(',').map(Number).forEach(idx=>{
    const it=cart[idx]; if(!it) return;
    if(it.cat==='co'){
      const bs=(it.bordas||[0,0]).slice(); bs[k]=vi; it.bordas=bs;
      const b0=BORDAS[bs[0]]||BORDAS[0], b1=BORDAS[bs[1]]||BORDAS[0], preco=(bs[0]?b0.price:0)+(bs[1]?b1.price:0);
      it.selectedBorda=preco>0?{name:bs[0]&&bs[0]===bs[1]?b0.name+' (nas 2)':[bs[0]?'1ª '+b0.name:null,bs[1]?'2ª '+b1.name:null].filter(Boolean).join(' / '),price:preco}:BORDAS[0];
    }else it.selectedBorda=BORDAS[vi];
    const bid=it.type==='half'?it.baseId:it.id; if(typeof renderBordas==='function') renderBordas(bid);
  });
  updateUI();
}
function updateUI(){
  const seen=new Set();
  cart.forEach(it=>{
    const bid=it.type==='half'?it.baseId:it.id;seen.add(bid);
    const el=document.getElementById(`qty-${bid}`);
    if(el)el.innerText=cart.filter(m=>m.id===bid||(m.type==='half'&&m.baseId===bid)).length;
  });
  menu.forEach(m=>{if(!seen.has(m.id)){const el=document.getElementById(`qty-${m.id}`);if(el&&el.innerText!=='0')el.innerText='0';}});

  const bar=document.getElementById('cart-bar');
  bar.style.display=cart.length>0?'block':'none';

  const numPizzas=cart.filter(i=>i.cat==='p'||i.cat==='s').length;
  let sumHTML='',total=0;

  // agrupa itens idênticos (mesmo sabor/meia-a-meia, borda e acréscimos/remoções)
  // numa linha só com contador — antes cada clique em "+" virava uma linha nova e
  // idêntica, o que fazia o "−" parecer que não funcionava
  const grupos={};
  const ordemGrupos=[];
  cart.forEach((it,idx)=>{
    const acrSel=it.addedIngredients||[];
    const remSel=it.removedIngredients||[];
    const acrTotal=acrSel.reduce((s,a)=>s+a.price,0);
    const itemTotal=Number(it.p)+(it.selectedBorda?.price||0)+acrTotal;
    total+=itemTotal;

    const chave=(it.type==='half'?'half-'+it.halves[0].n+'-'+it.halves[1].n:'item-'+it.n)
      +'|'+(it.selectedBorda?.name||'')
      +'|'+acrSel.map(a=>a.name).slice().sort().join(',')
      +'|'+remSel.slice().sort().join(',');

    if(!grupos[chave]){
      grupos[chave]={it, qty:0, unitPrice:itemTotal, idxs:[]};
      ordemGrupos.push(chave);
    }
    grupos[chave].qty++;
    grupos[chave].idxs.push(idx);
  });

  ordemGrupos.forEach(chave=>{
    const g=grupos[chave];
    const it=g.it;
    const acrSel=it.addedIngredients||[];
    const remSel=it.removedIngredients||[];

    let ext='';
    if(it.selectedBorda?.price>0) ext+=` <span class="sum-borda">🥖 ${it.selectedBorda.name} +R$${fmtPrice(it.selectedBorda.price)}</span>`;
    if(acrSel.length>0) ext+=`<span class="sum-desc">➕ ${acrSel.map(a=>a.name).join(', ')}</span>`;
    if(remSel.length>0) ext+=`<span class="sum-rm">🚫 Sem: ${remSel.join(', ')}</span>`;

    const nomeHTML=it.type==='half'
      ?`<span style="color:var(--pr)">½</span> <b>${it.halves[0].n}</b> <span style="color:var(--tx-5)">+</span> <span style="color:var(--pr)">½</span> <b>${it.halves[1].n}</b>`
      :`<b>${it.n}</b>`;

    const idxRef=g.idxs[g.idxs.length-1];
    const precoLinha=g.unitPrice*g.qty;

    sumHTML+=`<div class="sum-item">
      <div class="sum-nome">${nomeHTML}${ext}${seletorBordaResumo(it,g.idxs)}</div>
      <div class="sum-lado">
        <div class="sum-controls">
          <span class="sum-x" onclick="removeFromSum(${idxRef})" title="Diminuir" role="button" aria-label="Diminuir">−</span>
          <span class="sum-qty">${g.qty}</span>
          <span class="sum-x mais" onclick="duplicarItemCarrinho(${idxRef})" title="Adicionar mais um igual" role="button" aria-label="Adicionar mais um">+</span>
        </div>
        <span class="sum-price">R$ ${fmtPrice(precoLinha)}</span>
      </div>
    </div>`;
  });

    // CIRURGIA: aplica desconto promo
  const desc=calcDesconto(cart);
  if(desc>0){
    const p=getPromoAtiva();
    sumHTML+=`<div class="sum-linha ok"><span>🔥 ${p.nome}</span><span>− R$ ${fmtPrice(desc)}</span></div>`;
    total-=desc;
    if(total<0)total=0;
  }

  const isRet=document.getElementById('delivery-method').checked;
  const bE=document.getElementById('modo-entrega'),bR=document.getElementById('modo-retirada');
  if(bE&&bR){ bE.classList.toggle('on',!isRet); bR.classList.toggle('on',isRet); }
  let fee=0;
  if(isRet){
    document.getElementById('del-lbl-txt').innerText='RETIRADA';
    document.getElementById('addr-fields').style.display='none';
    document.getElementById('time-title').innerText='Prazo de Retirada:';
    document.getElementById('time-desc').innerText='Pronto em até 20 minutos.';
    sumHTML+=`<div class="sum-linha ok"><span>Retirada no local</span><span>Grátis</span></div>`;
    document.getElementById('delivery-msg').innerHTML=`<span style="color:#2ecc71">🏠 Retirada em mãos</span>`;
  } else {
    document.getElementById('del-lbl-txt').innerText='ENTREGA';
    document.getElementById('addr-fields').style.display='block';
    document.getElementById('time-title').innerText='Prazo de Entrega:';
    document.getElementById('time-desc').innerText='Seu pedido pode levar até 50 minutos.';
    const nCombos=combosNoCarrinho(cart), nPizzas=pizzasNoCarrinho(cart), falta=Math.min(COMBOS_ENTREGA_GRATIS-nCombos,PIZZAS_ENTREGA_GRATIS-nPizzas);
    if(entregaGratis(cart)){
      fee=0;
      sumHTML+=`<div class="sum-linha ok"><span>Taxa de entrega</span><span>GRÁTIS</span></div>`;
      document.getElementById('delivery-msg').innerHTML=`<span class="eg-cart ok">${EG_ICONES.moto}<span>Entrega grátis! Seu pedido tem ${nPizzas>=PIZZAS_ENTREGA_GRATIS?nPizzas+' pizzas':nCombos+' combos'}.</span></span>`;
    }else{
      fee=8;
      sumHTML+=`<div class="sum-linha"><span>Taxa de entrega</span><span>R$ 8,00</span></div>`;
      const faltaP=Math.max(1,PIZZAS_ENTREGA_GRATIS-nPizzas);
      document.getElementById('delivery-msg').innerHTML=`Taxa de entrega R$ 8,00<span class="eg-cart">${EG_ICONES.presente}<span>${nPizzas>0?'Faltam '+faltaP+' pizza'+(faltaP>1?'s':'')+' para a entrega ser grátis':'Peça 3 pizzas e a entrega é grátis'}</span></span>${egProgresso(nPizzas,PIZZAS_ENTREGA_GRATIS)}`;
    }
  }

  const totalFinal=total+fee;
  sumHTML+=`<div class="sum-linha total"><span>Total</span><span>R$ ${fmtPrice(totalFinal)}</span></div>`;
  document.getElementById('order-summary').innerHTML=sumHTML;
  document.getElementById('total-val').innerText=`R$ ${fmtPrice(totalFinal)}`;

  // CTA "Entrar" — mostra se não logado
  const cta=document.getElementById('cart-google-cta');
  if(cta) cta.style.display=(!clienteLogado()&&cart.length>0)?'block':'none';

  autofillClient();
}

// ══════════════════════════════════
//  AUTO-SAVE CLIENT
// ══════════════════════════════════
function autoSaveClient(){
  clearTimeout(autoSaveTimer);
  autoSaveTimer=setTimeout(()=>{
    const name=document.getElementById('u-name')?.value?.trim();
    if(!name)return;
    const address=document.getElementById('u-end')?.value?.trim()||'';
    const houseNum=document.getElementById('u-num')?.value?.trim()||'';
    const phone=document.getElementById('u-tel')?.value?.trim()||'';
    const manteve=clienteLogado()&&_telDigitos(phone)===_telDigitos(currentUser.phone);
    currentUser={name,address,houseNum,phone,logado:manteve};
    DB.set('client',currentUser);
    loadClientBadge();
  },600);
}

function autofillClient(){
  if(!currentUser)return;
  const n=document.getElementById('u-name');
  const e=document.getElementById('u-end');
  const h=document.getElementById('u-num');
  const t=document.getElementById('u-tel');
  if(n&&!n.value&&currentUser.name) n.value=currentUser.name;
  if(e&&!e.value&&currentUser.address) e.value=currentUser.address;
  if(h&&!h.value&&currentUser.houseNum) h.value=currentUser.houseNum;
  if(t&&!t.value&&currentUser.phone) t.value=_mascaraTel(currentUser.phone);
}

// ══════════════════════════════════
//  CART TOGGLE
// ══════════════════════════════════
// "Entrega | Retirada": liga/desliga o mesmo controle de sempre (checkbox escondido), tudo continua igual por baixo
function definirModoEntrega(retirada){
  const c=document.getElementById('delivery-method'); if(!c)return;
  c.checked=!!retirada; updateUI();
}
// Pagamento por toque: preenche o campo de sempre (select escondido) e mostra/oculta o troco
function escolherPagamento(v){
  const sel=document.getElementById('u-pay'); if(!sel)return;
  sel.value=v; sel.style.borderColor=''; handlePaymentChange();
  document.querySelectorAll('#pay-chips button').forEach(b=>b.classList.toggle('on',b.dataset.pay===v));
  const box=document.getElementById('pay-chips'); if(box) box.classList.remove('erro');
}
function toggleCart(e){
  const body=document.getElementById('cart-body');
  const hint=document.getElementById('cart-hint');
  if(!body)return;
  if(typeof carregarGoogleMaps==='function')carregarGoogleMaps();
  const open=body.style.display==='none'||body.style.display==='';
  body.style.display=open?'block':'none';
  hint.innerText=open?'▼ RECOLHER PEDIDO':'▲ VER MEU PEDIDO';
}

// ══════════════════════════════════
//  PAYMENT
// ══════════════════════════════════
function handlePaymentChange(){
  const pay=document.getElementById('u-pay').value;
  document.getElementById('u-change').style.display=pay==='Dinheiro'?'block':'none';
  if(pay!=='Dinheiro')document.getElementById('u-change').value='';
}

