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
//  netlify/functions/staff-login.js) que a senha bate. Depois disso o
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
  overlay.style.cssText='position:fixed;inset:0;z-index:99999;background:#07060a;display:flex;align-items:center;justify-content:center;padding:20px;font-family:system-ui,sans-serif;';
  overlay.innerHTML='<div style="color:#9c8f83;font-size:.85rem;">Carregando…</div>';
  // some ANTES de qualquer verificação — a tela fica bloqueada por padrão (fail-closed);
  // só é liberada explicitamente depois de confirmar login, nunca por omissão/erro.
  (document.body||document.documentElement).appendChild(overlay);

  function renderErro(msg){
    overlay.innerHTML=`<div style="max-width:320px;text-align:center;color:#e71d36;font-size:.85rem;">⚠️ ${msg}</div>`;
  }

  function renderFormulario(auth){
    overlay.innerHTML=`
      <div style="width:100%;max-width:320px;text-align:center;">
        <div style="font-size:2.4rem;margin-bottom:8px;">🍕🔒</div>
        <div style="color:#FF9F1C;font-size:1rem;font-weight:700;letter-spacing:1px;margin-bottom:18px;">ÁREA DA EQUIPE</div>
        <input type="password" id="gate-senha" placeholder="Senha da equipe" autocomplete="current-password"
          style="width:100%;box-sizing:border-box;background:#171016;border:1px solid rgba(255,159,28,.3);border-radius:8px;color:#f3ece2;padding:12px 14px;font-size:1rem;text-align:center;margin-bottom:10px;">
        <button id="gate-btn" style="width:100%;background:#FF9F1C;color:#000;border:none;border-radius:8px;padding:12px;font-weight:700;font-size:.9rem;cursor:pointer;">ENTRAR</button>
        <div id="gate-status" style="color:#e71d36;font-size:.78rem;margin-top:10px;min-height:1.2em;"></div>
      </div>`;
    document.getElementById('gate-senha').focus();

    async function tentarEntrar(){
      const senha=document.getElementById('gate-senha').value;
      const btn=document.getElementById('gate-btn');
      const status=document.getElementById('gate-status');
      if(!senha){ status.textContent='Digite a senha.'; return; }
      btn.disabled=true; btn.textContent='ENTRANDO...'; status.textContent='';
      try{
        const r=await fetch('/.netlify/functions/staff-login',{
          method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({senha})
        });
        const d=await r.json();
        if(!r.ok||d.error) throw new Error(d.error||'Não foi possível entrar.');
        await auth.signInWithCustomToken(d.token);
        // overlay some no onAuthStateChanged (abaixo) — mantém uma única fonte da verdade
      }catch(e){
        status.textContent='⚠️ '+e.message;
        btn.disabled=false; btn.textContent='ENTRAR';
      }
    }
    document.getElementById('gate-btn').onclick=tentarEntrar;
    document.getElementById('gate-senha').addEventListener('keydown',e=>{ if(e.key==='Enter') tentarEntrar(); });
  }

  return new Promise(resolve=>{
    try{
      if(!firebase.apps.length) firebase.initializeApp(FB_CONFIG);
      const auth=firebase.auth();
      auth.onAuthStateChanged(
        user=>{
          if(user){ overlay.remove(); resolve(user); }
          else{ renderFormulario(auth); }
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
  firebase.auth().signOut().then(()=>location.reload());
}
