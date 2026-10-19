// ══════════════════════════════════
//  ENTRAR — só nome + WhatsApp (sem senha, sem Google)
//  O cadastro vai pro servidor (/api/cliente) e a sessão fica salva no aparelho.
// ══════════════════════════════════
const G_SVG=''; // legado (selo "via Google" removido)
let _entrarDepois=null;

function clienteLogado(){ return !!(currentUser&&currentUser.name&&currentUser.phone&&currentUser.logado); }
function _telDigitos(v){ let d=String(v||'').replace(/\D+/g,''); if(d.length>=12&&d.startsWith('55'))d=d.slice(2); return d; }
function _mascaraTel(v){
  const d=_telDigitos(v).slice(0,11);
  if(d.length<=2) return d;
  if(d.length<=6) return '('+d.slice(0,2)+') '+d.slice(2);
  if(d.length<=10) return '('+d.slice(0,2)+') '+d.slice(2,6)+'-'+d.slice(6);
  return '('+d.slice(0,2)+') '+d.slice(2,7)+'-'+d.slice(7);
}

// depois: função opcional executada quando o cliente concluir a entrada
function abrirEntrar(depois){
  _entrarDepois=typeof depois==='function'?depois:null;
  const n=document.getElementById('ent-nome'), t=document.getElementById('ent-tel'), e=document.getElementById('ent-erro');
  if(n) n.value=currentUser?.name||''; if(t) t.value=currentUser?.phone?_mascaraTel(currentUser.phone):''; if(e) e.textContent='';
  openModal('modal-entrar');
  setTimeout(()=>{ (n&&!n.value?n:t)?.focus(); },250);
}

async function confirmarEntrar(){
  const nome=(document.getElementById('ent-nome').value||'').replace(/[<>"`\\]/g,'').trim();
  const tel=_telDigitos(document.getElementById('ent-tel').value);
  const erro=document.getElementById('ent-erro'), btn=document.getElementById('ent-btn');
  if(nome.length<2){ erro.textContent='Digite seu nome.'; return; }
  if(!/^[1-9][1-9](9\d{8}|[2-5]\d{7})$/.test(tel)){ erro.textContent='Digite o WhatsApp com DDD. Ex.: (15) 99705-8390'; return; }
  erro.textContent=''; btn.disabled=true; const txt=btn.textContent; btn.textContent='⏳ Entrando...';
  try{
    // se o servidor estiver fora do ar, entra mesmo assim: o cadastro é só pra equipe saber quem é
    fetch('/api/cliente',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nome,telefone:tel})}).catch(()=>{});
  }catch(e){}
  currentUser={...(currentUser||{}),name:nome,phone:tel,logado:true};
  DB.set('client',currentUser);
  btn.disabled=false; btn.textContent=txt;
  closeModal('modal-entrar');
  aplicarSessaoCliente();
  if(typeof updateUI==='function') try{updateUI();}catch(e){}
  const f=_entrarDepois; _entrarDepois=null; if(f) setTimeout(f,150);
}

// aplica a sessão em todo o site (menu, carrinho, avaliação)
function aplicarSessaoCliente(){
  loadClientBadge();
  const logado=clienteLogado();
  const dp=document.getElementById('drawer-profile');
  if(dp){
    dp.style.display='block';
    document.getElementById('dp-nome-txt').innerText=logado?currentUser.name:'Visitante';
    document.getElementById('dp-email-txt').innerText=logado?_mascaraTel(currentUser.phone):'Toque em Entrar e salve seus dados';
    const b=document.getElementById('dp-btn'); if(b){ b.textContent=logado?'Meu perfil':'Entrar'; }
  }
  const cta=document.getElementById('cart-google-cta');
  if(cta) cta.style.display=(!logado&&cart.length>0)?'block':'none';
  if(logado){
    const un=document.getElementById('u-name'); if(un&&!un.value) un.value=currentUser.name;
    const ut=document.getElementById('u-tel'); if(ut&&!ut.value) ut.value=_mascaraTel(currentUser.phone);
  }
}

// compatibilidade com chamadas antigas
function loginGoogleFeedback(){ abrirEntrar(()=>{ const n=document.getElementById('fb-name'); if(n) n.value=currentUser?.name||''; }); }
function loginGoogleClient(){ abrirEntrar(); }
function loginGoogleCart(){ abrirEntrar(); }
function initGoogleLogin(){ aplicarSessaoCliente(); }

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
  div.style.cssText='background:rgba(20,20,20,.03);border:1px solid rgba(20,20,20,.07);border-radius:10px;padding:10px;margin-bottom:8px;position:relative;';
  div.innerHTML=`<div style="font-size:.78rem;color:var(--pr);letter-spacing:1px;margin-bottom:6px;">FAIXA ${idx+1}</div>
    <input type="text" class="m-input" placeholder="URL do áudio (.mp3 / .ogg)" data-type="url" style="margin-bottom:6px;">
    <input type="text" class="m-input" placeholder="Título da música" data-type="title" style="margin-bottom:6px;">
    <input type="text" class="m-input" placeholder="Artista (opcional)" data-type="artist" style="margin-bottom:0;">
    <button onclick="this.parentNode.remove();renumberTracks();" style="position:absolute;top:8px;right:8px;background:rgba(231,29,54,.15);border:none;color:var(--se);border-radius:6px;padding:3px 8px;font-size:.82rem;cursor:pointer;">✕</button>`;
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
    music:'Música será removida.',
    all:'TODAS as configurações voltarão ao padrão (não mexe na senha da equipe — essa é só pelo Netlify).'
  };
  if(!confirm(msgs[key]||'Resetar esta configuração?'))return;
  if(key==='all'){
    ['pd_cfg_wpp','pd_cfg_end','pd_music','pd_promos'].forEach(k=>localStorage.removeItem(k));
    alert('Tudo resetado.');
  } else {
    localStorage.removeItem('pd_cfg_'+key);
  }
}

