// ══════════════════════════════════════════════════════════
//  ZONA DE ENTREGA NO CARRINHO — o bairro define a taxa (R$ 8 / 9 / 10 / 15, ver ZONAS_ENTREGA em shared/utils.js).
//  • reconhece o bairro sozinho pelo endereço digitado, pela sugestão do Maps ou pelo botão 📍 (GPS);
//  • se não reconhecer, o cliente escolhe na lista (select);
//  • bairro fora da tabela: não dá pra calcular — o cliente chama no WhatsApp (ou escolhe Retirada).
// ══════════════════════════════════════════════════════════
const BAIRRO_OUTRO='__outro__';
function montarSelectBairro(){
  const sel=document.getElementById('u-bairro'); if(!sel||sel.dataset.pronto) return;
  sel.dataset.pronto='1';
  const esc=t=>String(t).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
  sel.innerHTML='<option value="">Selecione o seu bairro…</option>'+
    ZONAS_ENTREGA.map(z=>`<optgroup label="Zona ${z.zona} — R$ ${z.taxa.toFixed(2).replace('.',',')}">`+z.bairros.map(b=>`<option value="${esc(b)}">${esc(b)}</option>`).join('')+'</optgroup>').join('')+
    `<option value="${BAIRRO_OUTRO}">Meu bairro não está na lista</option>`;
}
function escolherBairroManual(){ const sel=document.getElementById('u-bairro'); if(sel){ sel.dataset.manual='1'; sel.dataset.auto=''; sel.style.borderColor=''; } if(typeof updateUI==='function') updateUI(); }
// lê o endereço e marca o bairro (só troca se achou um bairro da tabela)
function detectarBairroSite(){
  const sel=document.getElementById('u-bairro'), end=document.getElementById('u-end'); if(!sel||!end) return;
  const a=acharBairroNoTexto(end.value);
  if(a){ if(sel.value!==a.bairro){ sel.value=a.bairro; sel.dataset.manual=''; sel.dataset.auto='1'; sel.style.borderColor=''; if(typeof updateUI==='function') updateUI(); } }
  // o endereço mudou pra um lugar fora da tabela: o bairro que o sistema tinha marcado sozinho sai (não deixa taxa velha)
  else if(sel.dataset.auto==='1'&&sel.dataset.manual!=='1'&&sel.value){ sel.value=''; sel.dataset.auto=''; if(typeof updateUI==='function') updateUI(); }
}
// {ok, bairro, zona, taxa, motivo} — usado pelo carrinho e pelo envio do pedido
function zonaEntregaSite(){
  const sel=document.getElementById('u-bairro'), v=sel?sel.value:'';
  if(!v) return {ok:false,motivo:'escolha'};
  if(v===BAIRRO_OUTRO) return {ok:false,motivo:'fora'};
  const a=acharBairroNoTexto(v); if(!a) return {ok:false,motivo:'escolha'};
  return {ok:true,bairro:a.bairro,zona:a.zona,taxa:a.taxa};
}
document.addEventListener('DOMContentLoaded',montarSelectBairro);
if(document.readyState!=='loading') montarSelectBairro();
