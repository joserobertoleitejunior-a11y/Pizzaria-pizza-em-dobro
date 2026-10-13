// ══════════════════════════════════════════════════════════
//  CUPOM / AVALIAÇÃO — Pizza em Dobro
//  Lê o pedido (?pedido=ID) pelo servidor (server/pedido-publico.js,
//  só primeiro nome/itens/total — "orders" não é legível pelo navegador) e grava
//  a avaliação em 'avaliacoes' (as regras do banco conferem nota e texto).
// ══════════════════════════════════════════════════════════

// Fallback de segurança: se por cache/CDN o shared/utils.js não tiver carregado,
// define aqui também — assim a tela nunca quebra por isso.
if(typeof fmt==='undefined'){ window.fmt=function(v){ return 'R$ '+Number(v||0).toFixed(2).replace('.',','); }; }

const _fbCfg=FB_CONFIG;
if(!firebase.apps.length) firebase.initializeApp(_fbCfg);
const FS=firebase.firestore();

// fmt() agora vem de shared/utils.js
function esc(v){ return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function getPedidoId(){
  const params=new URLSearchParams(window.location.search);
  return params.get('pedido');
}

let notaSelecionada=0;
let pedidoAtual=null;
let pedidoIdAtual=null;

async function iniciar(){
  const id=getPedidoId();
  const box=document.getElementById('conteudo');
  if(!id){
    box.innerHTML='<div class="empty">Nenhum pedido informado. Acesse este link a partir da confirmação do seu pedido.</div>';
    return;
  }
  try{
    const r=await fetch('/api/pedido-publico?id='+encodeURIComponent(id));
    if(r.status===404||r.status===400){
      box.innerHTML='<div class="empty">Pedido não encontrado.</div>';
      return;
    }
    if(!r.ok) throw new Error('HTTP '+r.status);
    pedidoAtual=await r.json();
    pedidoIdAtual=id;
    renderCupom();
  }catch(e){
    console.error('Erro ao carregar pedido:',e);
    box.innerHTML='<div class="empty">Não foi possível carregar seu pedido. Verifique a conexão.</div>';
  }
}

function renderCupom(){
  const p=pedidoAtual;
  const itensHtml=(p.items_json||[]).map(i=>`
    <div class="cupom-linha">
      <div>
        <div class="item-nome">${esc(i.name)}</div>
        ${i.borda?`<div class="item-sub">Borda: ${esc(i.borda)}</div>`:''}
      </div>
      <div>${fmt(i.price)}</div>
    </div>`).join('');

  document.getElementById('conteudo').innerHTML=`
    <div class="cupom">
      <div class="cupom-linha"><span>Cliente</span><span>${esc(p.client_name||'—')}</span></div>
      <div class="cupom-linha"><span>Pagamento</span><span>${esc(p.payment||'—')}</span></div>
      <div class="cupom-linha"><span>Tipo</span><span>${esc(p.delivery_type||'—')}</span></div>
      ${itensHtml}
      <div class="cupom-linha cupom-total"><span>Total</span><span>${fmt(p.total)}</span></div>
    </div>
    <div class="avaliacao" id="box-avaliacao">
      <h3>Como foi seu pedido?</h3>
      <div class="stars" id="stars">
        ${[1,2,3,4,5].map(n=>`<span data-n="${n}" onclick="selecionarNota(${n})">★</span>`).join('')}
      </div>
      <textarea id="comentario" placeholder="Conte pra gente (opcional)"></textarea>
      <button class="btn" onclick="enviarAvaliacao()">Enviar avaliação</button>
    </div>
  `;
}

function selecionarNota(n){
  notaSelecionada=n;
  document.querySelectorAll('#stars span').forEach(s=>{
    s.classList.toggle('on', Number(s.dataset.n)<=n);
  });
}

async function enviarAvaliacao(){
  if(notaSelecionada===0){ alert('Selecione uma nota de 1 a 5 estrelas.'); return; }
  const comentario=document.getElementById('comentario').value.replace(/[<>]/g,'').trim().slice(0,1000);
  try{
    await FS.collection('avaliacoes').add({
      pedido_id:pedidoIdAtual,
      client_name:pedidoAtual.client_name||null,
      nota:notaSelecionada,
      comentario:comentario||null,
      created_at:new Date().toISOString()
    });
    document.getElementById('box-avaliacao').innerHTML='<div class="ok-msg">✓ Obrigado pela sua avaliação!</div>';
  }catch(e){
    console.error('Erro ao enviar avaliação:',e);
    alert('Não foi possível enviar sua avaliação. Tente novamente.');
  }
}

iniciar();
