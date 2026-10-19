// ══════════════════════════════════════════════════════════
//  GATE DE LOGIN DA EQUIPE — senha única, sessão real do Firebase
//  Usado por Caixa, Relatórios, Clientes, bot-config, bot-config/conversas
//  e painel.html. Antes dessas páginas não tinham NENHUMA proteção.
//
//  Como funciona: cobre a tela inteira com uma camada opaca ANTES de
//  qualquer outra coisa (nunca expõe conteúdo por padrão — se o
//  Firebase falhar ao carregar, mostra erro em vez de sumir e deixar
//  a página exposta). Só troca pra senha depois de confirmar que o
//  SDK carregou; só some de vez quando o Firebase confirma (de
//  verdade, via custom token assinado no servidor —
//  server/staff-login.js) que a senha bate. Depois disso o
//  Firebase guarda a sessão sozinho (o mesmo dispositivo/navegador
//  não pede senha de novo) — é o "senha única da equipe, digita uma
//  vez por aparelho".
//
//  Pré-requisito na página que usa isto: já ter carregado
//  firebase-app-compat.js + firebase-firestore-compat.js +
//  firebase-auth-compat.js + shared/firebase-config.js antes deste
//  arquivo.
// ══════════════════════════════════════════════════════════

function iniciarGateEquipe(){
  const overlay=document.createElement('div');
  overlay.id='gate-equipe';
  overlay.style.cssText='position:fixed;inset:0;z-index:99999;background:#F4F5F7;display:flex;align-items:center;justify-content:center;padding:20px;font-family:"Work Sans",system-ui,sans-serif;';
  overlay.innerHTML='';
  // aparelho que já entrou antes: mostra a tela na hora (sem camada, sem "Carregando…"); a
  // confirmação do login continua rodando e, se falhar, a camada de senha aparece por cima.
  // Os dados são protegidos pelas regras do banco/servidor, não por esta camada.
  let conhecido=false; try{ conhecido=localStorage.getItem('staff_ok')==='1'; }catch(e){}
  if(conhecido) overlay.style.display='none';
  // some ANTES de qualquer verificação — a tela fica bloqueada por padrão (fail-closed);
  // só é liberada explicitamente depois de confirmar login, nunca por omissão/erro.
  (document.body||document.documentElement).appendChild(overlay);

  function renderErro(msg){
    overlay.innerHTML=`<div style="max-width:320px;text-align:center;color:#B91C1C;font-size:.85rem;">⚠️ ${msg}</div>`;
  }

  function renderFormulario(auth){
    const campo='width:100%;box-sizing:border-box;background:#F9FAFB;border:1px solid #E5E7EB;border-radius:14px;color:#111827;padding:14px 16px;font-size:1rem;margin-bottom:10px;outline:none;';
    overlay.innerHTML=`
      <div style="width:100%;max-width:360px;background:#fff;border:1px solid #E5E7EB;border-radius:24px;padding:32px 24px 26px;text-align:center;box-shadow:0 1px 2px rgba(16,24,40,.06),0 20px 50px rgba(16,24,40,.12);">
        <img src="/assets/logo.png" alt="" width="64" height="64" style="width:64px;height:64px;border-radius:50%;object-fit:cover;margin-bottom:12px;box-shadow:0 6px 16px rgba(16,24,40,.18);">
        <div style="color:#111827;font-size:1.2rem;font-family:'Archivo Black',sans-serif;margin-bottom:4px;">Área da equipe</div>
        <div style="color:#6B7280;font-size:.82rem;margin-bottom:20px;">Entre para abrir o Caixa, o Conversor e o Dashboard</div>
        <style>#gate-senha::placeholder,#gate-usuario::placeholder{color:#9CA3AF;}#gate-usuario:focus,#gate-senha:focus{border-color:#D62828!important;box-shadow:0 0 0 3px rgba(214,40,40,.12);}</style>
        <input type="text" id="gate-usuario" placeholder="Usuário" autocomplete="username" autocapitalize="none" style="${campo}">
        <input type="password" id="gate-senha" placeholder="Senha" autocomplete="current-password" style="${campo}">
        <button id="gate-btn" style="width:100%;background:#D62828;color:#fff;border:none;border-radius:14px;padding:14px;font-weight:700;font-size:.95rem;cursor:pointer;margin-top:4px;box-shadow:0 8px 18px rgba(214,40,40,.28);">Entrar</button>
        <div id="gate-status" style="color:#B91C1C;font-size:.8rem;margin-top:12px;min-height:1.2em;"></div>
      </div>`;
    document.getElementById('gate-usuario').focus();

    async function tentarEntrar(){
      const usuario=document.getElementById('gate-usuario').value;
      const senha=document.getElementById('gate-senha').value;
      const btn=document.getElementById('gate-btn');
      const status=document.getElementById('gate-status');
      if(!usuario||!senha){ status.textContent='Digite usuário e senha.'; return; }
      btn.disabled=true; btn.textContent='Entrando...'; status.textContent='';
      try{
        const r=await fetch('/api/staff-login',{
          method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({usuario,senha})
        });
        const d=await r.json();
        if(!r.ok||d.error) throw new Error(d.error||'Não foi possível entrar.');
        await auth.signInWithCustomToken(d.token);
        // overlay some no onAuthStateChanged (abaixo) — mantém uma única fonte da verdade
      }catch(e){
        status.textContent='⚠️ '+e.message;
        btn.disabled=false; btn.textContent='Entrar';
      }
    }
    document.getElementById('gate-btn').onclick=tentarEntrar;
    ['gate-usuario','gate-senha'].forEach(id=>document.getElementById(id).addEventListener('keydown',e=>{ if(e.key==='Enter') tentarEntrar(); }));
  }

  return new Promise(resolve=>{
    try{
      if(!firebase.apps.length) firebase.initializeApp(FB_CONFIG);
      const auth=firebase.auth();
      auth.onAuthStateChanged(
        async user=>{
          // só libera quem tem o claim "staff" (emitido pelo staff-login.js). Antes bastava
          // QUALQUER login — um cliente logado com Google na loja abria o Caixa direto.
          if(user){
            try{
              const t=await user.getIdTokenResult();
              if(t.claims && t.claims.staff===true){ try{localStorage.setItem('staff_ok','1');}catch(e){} overlay.remove(); resolve(user); return; }
            }catch(e){ /* cai pro formulário */ }
          }
          try{localStorage.removeItem('staff_ok');}catch(e){}
          overlay.style.display='flex';
          renderFormulario(auth);
        },
        ()=>renderErro('Não foi possível verificar o login. Recarregue a página.')
      );
    }catch(e){
      renderErro('Não foi possível carregar o sistema de login. Confira sua conexão e recarregue a página.');
    }
  });
}

// Botão "Sair" — qualquer página pode chamar isso (ex: num link no rodapé/menu)
function sairDaEquipe(){
  if(typeof limparCacheVisual==='function') limparCacheVisual();
  try{localStorage.removeItem('staff_ok');}catch(e){}
  firebase.auth().signOut().then(()=>location.reload());
}
