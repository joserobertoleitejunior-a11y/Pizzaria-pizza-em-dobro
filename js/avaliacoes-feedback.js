// ══════════════════════════════════
//  ATALHO: fecha carrinho e abre avaliação
// ══════════════════════════════════
function closeCartAndFeedback(){
  const body=document.getElementById('cart-body');
  if(body) body.style.display='none';
  document.getElementById('cart-hint').innerText='▲ VER MEU PEDIDO';
  openFeedbackModal();
}
async function openHistorico(){
  openModal('modal-historico');
  const ct=document.getElementById('historico-content');
  if(!fbUser&&!currentUser?.name){
    ct.innerHTML=`
      <p style="color:#aaa;font-size:.82rem;text-align:center;margin-bottom:14px;">Entre com o Google para ver seu histórico de pedidos.</p>
      <button class="ggl-login-btn" onclick="loginGoogleClient()">${G_SVG} Entrar com Google</button>`;
    return;
  }
  ct.innerHTML=`<div style="text-align:center;padding:20px;color:#555;">⏳ Carregando...</div>`;
  const email=fbUser?.email||currentUser?.email||'';
  const name=fbUser?.name||currentUser?.name||'';
  let rows=null;
  // tenta por email primeiro (mais preciso), depois por nome
  if(email){rows=await sg('orders',{where:[['client_email','==',email]],limit:30});if(rows)rows.sort((a,b)=>dataStr(b.created_at).localeCompare(dataStr(a.created_at)));}
  if((!rows||!rows.length)&&name){rows=await sg('orders',{where:[['client_name','==',name]],limit:30});if(rows)rows.sort((a,b)=>dataStr(b.created_at).localeCompare(dataStr(a.created_at)));}
  // fallback: pedidos salvos localmente
  if(!rows||!rows.length){
    const local=DB.get('local_orders')||[];
    if(local.length) rows=local;
  }
  if(!rows||!rows.length){
    ct.innerHTML=`<p style="color:#444;font-size:.82rem;text-align:center;padding:20px;">Nenhum pedido encontrado ainda. Faça seu primeiro pedido! 🍕</p>`;
    return;
  }
  ct.innerHTML=rows.map((r,idx)=>{
    let items=r.items_json||[];
    if(typeof items==='string'){try{items=JSON.parse(items);}catch{items=[];}}
    const itemNames=items.map(i=>i.name||i.n||'?').join(', ');
    const dt=r.created_at?new Date(dataStr(r.created_at)).toLocaleString('pt-BR'):(r.date||'');
    const tipo=r.delivery_type==='retirada'?'retirada':'entrega';
    return`<div class="hist-item">
      <div class="hist-data">${dt}</div>
      <div class="hist-items">🍕 ${itemNames||'—'}</div>
      <div class="hist-total">R$ ${fmtPrice(r.total||0)}</div>
      <span class="hist-tipo hist-${tipo}">${tipo==='retirada'?'🏠 Retirada':'🛵 Entrega'}</span>
    </div>`;
  }).join('');
}

// ══════════════════════════════════
//  CURTIR AVALIAÇÕES
// ══════════════════════════════════
function toggleLike(fbId,btn){
  const liked=DB.get('liked_'+fbId)||false;
  const newVal=!liked;
  DB.set('liked_'+fbId,newVal);
  const countEl=btn.querySelector('.like-count');
  const current=parseInt(countEl.innerText)||0;
  countEl.innerText=newVal?current+1:Math.max(0,current-1);
  btn.classList.toggle('liked',newVal);
  // atualiza no Supabase
  if(newVal) spatch('feedbacks',fbId,{likes:(current+1)});
}

// ══════════════════════════════════
//  COMENTAR AVALIAÇÕES
// ══════════════════════════════════
let _commentPhotoB64=null;

function abrirComentar(fbId){
  if(!fbUser&&!currentUser?.name){
    alert('Entre com o Google para comentar.');
    loginGoogleFeedback();
    return;
  }
  document.getElementById('comentar-fb-id').value=fbId;
  document.getElementById('comentar-txt').value='';
  document.getElementById('comentar-tag').value='';
  document.getElementById('comentar-photo-preview').style.display='none';
  document.getElementById('comentar-pizza-file').value='';
  _commentPhotoB64=null;
  openModal('modal-comentar');
}

function handleCommentPhoto(input){
  const f=input.files[0];if(!f)return;
  const r=new FileReader();
  r.onload=e=>{
    _commentPhotoB64=e.target.result;
    document.getElementById('comentar-photo-img').src=_commentPhotoB64;
    document.getElementById('comentar-photo-preview').style.display='block';
  };
  r.readAsDataURL(f);
}

async function enviarComentario(){
  const fbId=document.getElementById('comentar-fb-id').value;
  const txt=document.getElementById('comentar-txt').value.trim();
  const tag=document.getElementById('comentar-tag').value.trim();
  const autor=fbUser?.name||currentUser?.name||'Anônimo';
  if(!txt)return;
  const payload={feedback_id:parseInt(fbId),author:autor,comment:txt,photo:fbUser?.photo||null};
  if(tag) payload.tagged_user=tag;
  if(_commentPhotoB64) payload.pizza_photo=_commentPhotoB64;
  await sp('feedback_comments',payload);
  _commentPhotoB64=null;
  closeModal('modal-comentar');
  renderFeedbacks();
}

async function editOwnComment(id,currentText){
  const novo=prompt('Editar comentário:',currentText);
  if(novo===null||novo.trim()===currentText)return;
  if(!novo.trim()){alert('Comentário não pode ficar vazio.');return;}
  await spatch('feedback_comments',id,{comment:novo.trim()});
  const el=document.getElementById(`fc-txt-${id}`);
  if(el) el.innerText=novo.trim();
}
function toggleComments(fbId){
  const area=document.getElementById(`comments-${fbId}`);
  if(area) area.style.display=area.style.display==='none'?'block':'none';
}

// ══════════════════════════════════
//  FEEDBACK
// ══════════════════════════════════
function setStar(n){selStars=n;document.querySelectorAll('#star-row span').forEach((el,i)=>el.classList.toggle('lit',i<n));}

let _fbPizzaB64=null;

function handleFbPizzaPhoto(input){
  const f=input.files[0];if(!f)return;
  const r=new FileReader();
  r.onload=e=>{
    _fbPizzaB64=e.target.result;
    document.getElementById('fb-pizza-img').src=_fbPizzaB64;
    document.getElementById('fb-pizza-preview').style.display='block';
  };
  r.readAsDataURL(f);
}

function openFeedbackModal(){
  selStars=0;_fbPizzaB64=null;
  // preserva sessão Google — não zera fbUser
  const savedFbUser=fbUser||null;
  document.getElementById('fb-name').value=savedFbUser?.name||currentUser?.name||'';
  document.getElementById('fb-text').value='';
  document.getElementById('fb-photo-preview').style.display='none';
  document.getElementById('fb-pizza-preview').style.display='none';
  document.getElementById('fb-pizza-file').value='';
  // mostra upload de pizza se já logado com Google
  const pizzaWrap=document.getElementById('fb-pizza-wrap');
  if(pizzaWrap) pizzaWrap.style.display=(savedFbUser||currentUser?.via_facebook)?'block':'none';
  // atualiza botão login
  const btn=document.getElementById('fb-login-btn');
  if(savedFbUser){
    btn.className='ggl-login-btn connected';
    btn.innerHTML=`${G_SVG} ✓ ${savedFbUser.name.split(' ')[0]}`;
    // mostra foto de perfil
    const prev=document.getElementById('fb-photo-preview');
    const img=document.getElementById('fb-photo-img');
    if(prev&&img&&savedFbUser.photo){img.src=savedFbUser.photo;prev.style.display='block';}
  } else {
    btn.className='ggl-login-btn';
    btn.innerHTML=`${G_SVG} Entrar com Google`;
  }
  document.querySelectorAll('#star-row span').forEach(el=>el.classList.remove('lit'));
  openModal('modal-feedback');
}

async function submitFeedback(){
  const name=document.getElementById('fb-name').value.trim();
  const text=document.getElementById('fb-text').value.trim();
  if(!name||!text||!selStars)return alert('Preencha nome, estrelas e comentário.');
  const payload={name,stars:selStars,comment:text,
    fb_photo:fbUser?.photo||null,via_facebook:!!fbUser,
    pizza_photo:_fbPizzaB64||null};
  const fb={...payload,date:new Date().toLocaleString('pt-BR')};
  const fbs=DB.get('feedbacks')||[];fbs.push(fb);DB.set('feedbacks',fbs);
  await sp('feedbacks',payload);
  _fbPizzaB64=null;
  closeModal('modal-feedback');renderFeedbacks();
}
// IDs deletados localmente — nunca reaparecem mesmo que Supabase demore
const _deletedFbIds=new Set();
const _deletedCmIds=new Set();

async function renderFeedbacks(){
  let fbs=[];
  const rows=await sg('feedbacks',{orderBy:'created_at',orderDir:'desc',limit:20});
  if(rows&&rows.length){
    fbs=rows
      .filter(r=>!_deletedFbIds.has(r.id))
      .map(r=>({
        id:r.id,name:r.name,stars:r.stars,text:r.comment||'',
        date:new Date(dataStr(r.created_at)).toLocaleString('pt-BR'),
        fb_photo:r.fb_photo||null,via_facebook:r.via_facebook||false,
        likes:r.likes||0,pizza_photo:r.pizza_photo||null
      }));
    DB.set('feedbacks',fbs);
  } else {
    fbs=(DB.get('feedbacks')||[]).filter(r=>!_deletedFbIds.has(r.id));
  }
  const sec=document.getElementById('feedback-section');
  if(!fbs.length){sec.style.display='none';return;}
  sec.style.display='block';

  let allComments=await sg('feedback_comments',{orderBy:'created_at',orderDir:'asc'})||[];
  allComments=allComments.filter(c=>!_deletedCmIds.has(c.id));

  const myName=fbUser?.name||currentUser?.name||'';
  const isAdmin=checkAdminSession();

  document.getElementById('feedback-list').innerHTML=fbs.map(f=>{
    const liked=DB.get('liked_'+f.id)||false;
    const comments=allComments.filter(c=>c.feedback_id==f.id);

    const adminFbDel=isAdmin
      ?`<button onclick="adminDeleteFb(${f.id})" style="background:none;border:none;color:var(--se);font-size:.75rem;cursor:pointer;padding:2px 6px;border-radius:6px;opacity:.7;margin-left:auto;" title="Apagar avaliação">✕</button>`
      :'';

    const commentsHTML=comments.map(c=>{
      const isMine=myName&&(c.author===myName);
      const editBtn=isMine
        ?`<button onclick="editOwnComment(${c.id},'${(c.comment||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'")}')" style="background:none;border:none;color:#555;font-size:.65rem;cursor:pointer;padding:0 3px;">✏️</button>`
        :'';
      const delBtn=(isMine||isAdmin)
        ?`<button onclick="${isMine&&!isAdmin?'deleteOwnComment':'adminDeleteComment'}(${c.id})" style="background:none;border:none;color:var(--se);font-size:.65rem;cursor:pointer;padding:0 3px;">✕</button>`
        :'';
      const cmPhotoHTML=c.pizza_photo
        ?`<div style="margin:4px 0;"><img src="${c.pizza_photo}" style="width:100%;max-height:120px;object-fit:cover;border-radius:6px;border:1px solid rgba(255,159,28,.15);" onerror="this.style.display='none'"></div>`
        :'';
      return`<div class="fb-comment-item" id="fc-item-${c.id}">
        <div class="fb-comment-author" style="display:flex;align-items:center;gap:4px;">
          ${c.photo?`<img src="${c.photo}" style="width:18px;height:18px;border-radius:50%;object-fit:cover;flex-shrink:0;" onerror="this.style.display='none'">`:''}
          <span>${c.author}</span>
          ${c.tagged_user?`<span style="color:#4285F4;font-size:.63rem;">@${c.tagged_user}</span>`:''}
          ${editBtn}${delBtn}
        </div>
        <div class="fb-comment-txt" id="fc-txt-${c.id}">${c.comment}</div>
        ${cmPhotoHTML}
      </div>`;
    }).join('');

    const pizzaPhotoHTML=f.pizza_photo
      ?`<div style="margin:8px 0;"><img src="${f.pizza_photo}" alt="Pizza" style="width:100%;max-height:180px;object-fit:cover;border-radius:8px;border:1px solid rgba(255,159,28,.2);" onerror="this.style.display='none'"></div>`
      :'';

    return`<div class="fb-card" id="fb-card-${f.id}">
      <div class="fb-author" style="display:flex;align-items:center;gap:6px;">
        ${f.fb_photo?`<img src="${f.fb_photo}" alt="" style="width:28px;height:28px;border-radius:50%;object-fit:cover;flex-shrink:0;" onerror="this.style.display='none'">`:''}
        <span>${f.name}</span>
        ${f.via_facebook?`<span class="fb-badge-fb">${G_SVG} Google</span>`:''}
        ${adminFbDel}
      </div>
      <div class="fb-stars">${'★'.repeat(f.stars)}${'☆'.repeat(5-f.stars)}</div>
      <div class="fb-text">${f.text}</div>
      ${pizzaPhotoHTML}
      <div class="fb-date">${f.date}</div>
      <div class="fb-actions">
        <button class="fb-like-btn${liked?' liked':''}" onclick="toggleLike(${f.id},this)">
          <svg viewBox="0 0 24 24" fill="${liked?'currentColor':'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          <span class="like-count">${f.likes||0}</span>
        </button>
        <button class="fb-comment-btn" onclick="abrirComentar(${f.id})">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          Comentar
        </button>
        ${comments.length?`<button class="fb-comment-btn" onclick="toggleComments(${f.id})">${comments.length} resposta${comments.length>1?'s':''}</button>`:''}
      </div>
      <div class="fb-comments-area" id="comments-${f.id}" style="display:${comments.length?'block':'none'}">${commentsHTML}</div>
    </div>`;
  }).join('');
}

// Admin apaga avaliação — DOM imediato + blacklist + Supabase
async function adminDeleteFb(id){
  _deletedFbIds.add(id);
  document.getElementById(`fb-card-${id}`)?.remove();
  const fbs=(DB.get('feedbacks')||[]).filter(f=>f.id!==id);
  DB.set('feedbacks',fbs);
  // apaga no Supabase (sem esperar, sem rerender)
  sdel('feedbacks',id);
  _initFB();if(FS)FS.collection('feedback_comments').where('feedback_id','==',id).get().then(s=>s.docs.forEach(d=>d.ref.delete()));
}

// Admin apaga comentário — DOM imediato + blacklist + Supabase
async function adminDeleteComment(id){
  _deletedCmIds.add(id);
  document.getElementById(`fc-item-${id}`)?.remove();
  sdel('feedback_comments',id);
}

// Usuário apaga próprio comentário
async function deleteOwnComment(id){
  _deletedCmIds.add(id);
  document.getElementById(`fc-item-${id}`)?.remove();
  sdel('feedback_comments',`?id=eq.${id}`);
}

// ══════════════════════════════════
//  MODAL HELPERS
// ══════════════════════════════════
function openModal(id){document.getElementById(id).classList.add('open');}
function closeModal(id){document.getElementById(id).classList.remove('open');}
document.querySelectorAll('.modal').forEach(o=>{o.addEventListener('click',e=>{if(e.target===o)o.classList.remove('open');});});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&document.getElementById('modal-admin-login').classList.contains('open'))doAdminLogin();});

