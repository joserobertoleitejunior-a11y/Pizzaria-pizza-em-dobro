// ══════════════════════════════════════════════════════════
//  ZONA DE ENTREGA NO CAIXA — bairro define a taxa (R$ 8 / 9 / 10 / 15, ZONAS_ENTREGA em shared/utils.js).
//  O Caixa reconhece o bairro pelo endereço (digitado ou vindo do Conversor / do site) e preenche a taxa;
//  a atendente pode trocar o bairro na lista ou ajustar a taxa à mão (ex.: taxa combinada).
// ══════════════════════════════════════════════════════════
function montarSelectBairroCaixa(){
  const sel=document.getElementById('f-bairro'); if(!sel||sel.dataset.pronto) return;
  sel.dataset.pronto='1';
  const esc=t=>String(t).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
  sel.innerHTML='<option value="">— não identificado (digite a taxa) —</option>'+
    ZONAS_ENTREGA.map(z=>`<optgroup label="Zona ${z.zona} — R$ ${z.taxa.toFixed(2).replace('.',',')}">`+z.bairros.map(b=>`<option value="${esc(b)}">${esc(b)}</option>`).join('')+'</optgroup>').join('');
}
// bairro escolhido (ou reconhecido) → taxa do campo
function aplicarBairroCaixa(){
  const sel=document.getElementById('f-bairro'), campo=document.getElementById('f-taxa-entrega'); if(!sel||!campo) return;
  const b=sel.value?acharBairroNoTexto(sel.value):null;
  if(b){ campo.value=b.taxa; }
  const info=document.getElementById('bairro-info'); if(info) info.textContent=b?('Zona '+b.zona+' · R$ '+b.taxa.toFixed(2).replace('.',',')):'';
  if(typeof atualizarBarraCarrinho==='function') atualizarBarraCarrinho();
}
function detectarBairroCaixa(){
  const end=document.getElementById('f-endereco-colado'), sel=document.getElementById('f-bairro'); if(!end||!sel) return;
  const a=acharBairroNoTexto(end.value);
  if(a){ if(sel.value!==a.bairro){ sel.value=a.bairro; sel.dataset.auto='1'; aplicarBairroCaixa(); } }
  // endereço mudou pra fora da tabela: tira o bairro que foi marcado sozinho (o que a atendente escolheu à mão fica)
  else if(sel.dataset.auto==='1'&&sel.value){ sel.value=''; sel.dataset.auto=''; aplicarBairroCaixa(); }
}
function bairroDoPedidoCaixa(){
  const sel=document.getElementById('f-bairro'); const b=sel&&sel.value?acharBairroNoTexto(sel.value):null;
  return b?{bairro:b.bairro,zona:b.zona}:{bairro:null,zona:null};
}
montarSelectBairroCaixa();
document.getElementById('f-endereco-colado')?.addEventListener('input',detectarBairroCaixa);
