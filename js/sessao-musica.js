// ══════════════════════════════════
//  GOOGLE LOGIN — SESSION UNIFICADA
// ══════════════════════════════════
const GOOGLE_CLIENT_ID='734644330198-h4oikt300ofvshi4o4mrcckb56111q1s.apps.googleusercontent.com';
const G_SVG=`<svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>`;

function initGoogleLogin(){
  if(typeof google==='undefined')return;
  google.accounts.id.initialize({
    client_id:GOOGLE_CLIENT_ID,
    callback:handleGoogleCredential,
    auto_select:false,
    cancel_on_tap_outside:true
  });
  // auto login se já logou antes
  const saved=DB.get('google_user');
  if(saved){fbUser=saved;applyGoogleSession();}
}

function parseJwt(token){
  try{const b=token.split('.')[1];return JSON.parse(atob(b.replace(/-/g,'+').replace(/_/g,'/')));}catch{return null;}
}

let _gCtx='';
function handleGoogleCredential(response){
  // remove botão temporário se existir
  const gBtn=document.getElementById('_g_btn_wrap');
  if(gBtn) gBtn.remove();

  const payload=parseJwt(response.credential);
  if(!payload)return;
  fbUser={name:payload.name||'',photo:payload.picture||'',email:payload.email||''};
  DB.set('google_user',fbUser);
  _initFB();
  if(AUTH){const gc=firebase.auth.GoogleAuthProvider.credential(response.credential);AUTH.signInWithCredential(gc).catch(()=>{});}
  applyGoogleSession();

  if(_gCtx==='feedback'){
    const nameEl=document.getElementById('fb-name');
    if(nameEl) nameEl.value=fbUser.name;
    const prev=document.getElementById('fb-photo-preview');
    const img=document.getElementById('fb-photo-img');
    if(prev&&img&&fbUser.photo){img.src=fbUser.photo;prev.style.display='block';}
    const btn=document.getElementById('fb-login-btn');
    if(btn){btn.classList.add('connected');btn.innerHTML=`${G_SVG} ✓ ${fbUser.name.split(' ')[0]}`;}
    // mostra upload de foto da pizza
    const pizzaWrap=document.getElementById('fb-pizza-wrap');
    if(pizzaWrap) pizzaWrap.style.display='block';
  } else if(_gCtx==='client'||_gCtx==='cart'){
    // fecha qualquer modal aberto e reabre o perfil
    document.querySelectorAll('.modal.open').forEach(m=>m.classList.remove('open'));
    setTimeout(()=>openClientModal(),200);
  }
  _gCtx='';
}

// aplica session em todo o site após login
function applyGoogleSession(){
  if(!fbUser)return;
  // atualiza currentUser
  if(!currentUser||!currentUser.name){
    currentUser={name:fbUser.name,address:currentUser?.address||'',houseNum:currentUser?.houseNum||'',phone:currentUser?.phone||'',fb_photo:fbUser.photo,via_facebook:true,email:fbUser.email};
    DB.set('client',currentUser);
  } else {
    currentUser.fb_photo=fbUser.photo;
    currentUser.via_facebook=true;
    currentUser.email=fbUser.email;
    DB.set('client',currentUser);
  }
  // drawer profile
  const dp=document.getElementById('drawer-profile');
  if(dp){
    dp.style.display='block';
    document.getElementById('dp-foto-img').src=fbUser.photo||'';
    document.getElementById('dp-nome-txt').innerText=fbUser.name;
    document.getElementById('dp-email-txt').innerText=fbUser.email;
  }
  // CTA carrinho: esconde
  const cta=document.getElementById('cart-google-cta');
  if(cta) cta.style.display='none';
  // preenche nome no cart
  const uname=document.getElementById('u-name');
  if(uname&&!uname.value) uname.value=fbUser.name;
  loadClientBadge();
  // upsert no Supabase (on_conflict email)
  _initFB();if(FS)FS.collection('clients').doc(fbUser.email).set({uid:AUTH?.currentUser?.uid||'',name:fbUser.name,email:fbUser.email,photo:fbUser.photo,via_google:true,last_visit:new Date().toISOString()},{merge:true}).catch(()=>{});
}

function loginGoogleFeedback(){_gCtx='feedback';promptGoogle();}
function loginGoogleClient(){_gCtx='client';promptGoogle();}
function loginGoogleCart(){_gCtx='cart';promptGoogle();}

function promptGoogle(){
  if(typeof google==='undefined'){
    // tenta carregar o script e aguarda
    const btn=document.querySelector('.ggl-login-btn');
    if(btn){const orig=btn.innerHTML;btn.innerHTML='⏳ Carregando...';setTimeout(()=>{btn.innerHTML=orig;},2000);}
    return;
  }
  // cria div temporário para renderizar o botão Google
  let gBtn=document.getElementById('_g_btn_wrap');
  if(!gBtn){
    gBtn=document.createElement('div');
    gBtn.id='_g_btn_wrap';
    gBtn.style.cssText='position:fixed;bottom:80px;left:50%;transform:translateX(-50%);z-index:9999;';
    document.body.appendChild(gBtn);
  }
  gBtn.innerHTML='';
  google.accounts.id.renderButton(gBtn,{
    theme:'outline',size:'large',text:'signin_with',
    locale:'pt-BR',width:260
  });
  // também tenta o One Tap
  google.accounts.id.prompt();
}

// ══════════════════════════════════
//  MÚSICA — PLAYLIST
// ══════════════════════════════════
let _plIdx=0;
let _pl=[];

function loadMusic(){
  const cfg=DB.get('music');
  if(!cfg)return;
  // suporte legado (objeto único) e novo (playlist array)
  if(cfg.playlist&&cfg.playlist.length){
    _pl=cfg.playlist;
  } else if(cfg.url){
    _pl=[{url:cfg.url,title:cfg.title||'Música',artist:cfg.artist||''}];
  } else return;
  _plIdx=0;
  _loadTrack(_plIdx);
  document.getElementById('music-bar').classList.add('show');
}

function _loadTrack(idx){
  if(!_pl.length)return;
  idx=((idx%_pl.length)+_pl.length)%_pl.length;
  _plIdx=idx;
  const t=_pl[_plIdx];
  const audio=document.getElementById('music-audio');
  audio.src=t.url;
  audio.loop=(_pl.length===1);
  document.getElementById('mp-title').innerText=t.title||'Faixa '+(idx+1);
  document.getElementById('mp-artist').innerText=t.artist||(_pl.length>1?`Faixa ${idx+1} de ${_pl.length}`:'');
}

document.getElementById('music-audio').addEventListener('ended',()=>{
  if(_pl.length>1){
    _loadTrack(_plIdx+1);
    document.getElementById('music-audio').play().catch(()=>{});
  }
});

function musicNext(){
  if(_pl.length<2)return;
  _loadTrack(_plIdx+1);
  const audio=document.getElementById('music-audio');
  const btn=document.getElementById('mp-play-btn');
  audio.play().then(()=>{btn.innerText='⏸';}).catch(()=>{btn.innerText='▶';});
}

function toggleMusic(){
  const audio=document.getElementById('music-audio');
  const btn=document.getElementById('mp-play-btn');
  if(!audio.src||audio.src===window.location.href){
    loadMusic();
    if(!_pl.length)return;
  }
  if(audio.paused){audio.play().then(()=>{btn.innerText='⏸';}).catch(()=>{btn.innerText='▶';});}
  else{audio.pause();btn.innerText='▶';}
}

function hideMusicBar(){
  document.getElementById('music-bar').classList.remove('show');
  document.getElementById('music-audio').pause();
  document.getElementById('mp-play-btn').innerText='▶';
}

function addPlaylistTrack(){
  const wrap=document.getElementById('playlist-tracks');
  const idx=wrap.children.length;
  const div=document.createElement('div');
  div.style.cssText='background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:10px;margin-bottom:8px;position:relative;';
  div.innerHTML=`<div style="font-size:.65rem;color:var(--pr);letter-spacing:1px;margin-bottom:6px;">FAIXA ${idx+1}</div>
    <input type="text" class="m-input" placeholder="URL do áudio (.mp3 / .ogg)" data-type="url" style="margin-bottom:6px;">
    <input type="text" class="m-input" placeholder="Título da música" data-type="title" style="margin-bottom:6px;">
    <input type="text" class="m-input" placeholder="Artista (opcional)" data-type="artist" style="margin-bottom:0;">
    <button onclick="this.parentNode.remove();renumberTracks();" style="position:absolute;top:8px;right:8px;background:rgba(231,29,54,.15);border:none;color:var(--se);border-radius:6px;padding:3px 8px;font-size:.7rem;cursor:pointer;">✕</button>`;
  wrap.appendChild(div);
}

function renumberTracks(){
  document.querySelectorAll('#playlist-tracks > div').forEach((d,i)=>{
    const lbl=d.querySelector('div');
    if(lbl)lbl.innerText=`FAIXA ${i+1}`;
  });
}

function saveMusic(){
  const tracks=[];
  document.querySelectorAll('#playlist-tracks > div').forEach(d=>{
    const url=d.querySelector('[data-type="url"]')?.value.trim();
    const title=d.querySelector('[data-type="title"]')?.value.trim()||'';
    const artist=d.querySelector('[data-type="artist"]')?.value.trim()||'';
    if(url) tracks.push({url,title,artist});
  });
  if(!tracks.length)return alert('Adicione pelo menos uma faixa com URL.');
  DB.set('music',{playlist:tracks});
  closeModal('modal-musica');
  loadMusic();
  // auto-play tenta após interação do usuário
  const audio=document.getElementById('music-audio');
  audio.play().then(()=>{document.getElementById('mp-play-btn').innerText='⏸';}).catch(()=>{});
}

function removeMusic(){
  DB.set('music',null);
  _pl=[];_plIdx=0;
  document.getElementById('music-bar').classList.remove('show');
  const audio=document.getElementById('music-audio');
  audio.pause();audio.src='';
  document.getElementById('mp-play-btn').innerText='▶';
  closeModal('modal-musica');
}

function openMusicAdmin(){
  const cfg=DB.get('music')||{};
  const wrap=document.getElementById('playlist-tracks');
  wrap.innerHTML='';
  let tracks=[];
  if(cfg.playlist&&cfg.playlist.length) tracks=cfg.playlist;
  else if(cfg.url) tracks=[{url:cfg.url,title:cfg.title||'',artist:cfg.artist||''}];
  tracks.forEach(t=>{
    addPlaylistTrack();
    const d=wrap.lastElementChild;
    d.querySelector('[data-type="url"]').value=t.url||'';
    d.querySelector('[data-type="title"]').value=t.title||'';
    d.querySelector('[data-type="artist"]').value=t.artist||'';
  });
  if(!tracks.length) addPlaylistTrack();
  openModal('modal-musica');
}

// ══════════════════════════════════
//  RESET CONFIGURAÇÕES
// ══════════════════════════════════
function resetConfig(key){
  const msgs={
    wpp:'WhatsApp voltará para o número padrão.',
    end:'Endereço da loja voltará para o padrão.',
    admin_pass:'Senha voltará para 1234.',
    music:'Música será removida.',
    all:'TODAS as configurações voltarão ao padrão.'
  };
  if(!confirm(msgs[key]||'Resetar esta configuração?'))return;
  if(key==='all'){
    ['pd_cfg_wpp','pd_cfg_end','pd_admin_pass','pd_music','pd_promos','pd_admin_session'].forEach(k=>localStorage.removeItem(k));
    alert('Tudo resetado. A senha voltou para 1234.');
  } else if(key==='admin_pass'){
    localStorage.removeItem('pd_admin_pass');
  } else {
    localStorage.removeItem('pd_cfg_'+key);
  }
}

