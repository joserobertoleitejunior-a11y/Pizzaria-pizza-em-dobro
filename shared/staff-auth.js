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
  overlay.style.cssText='position:fixed;inset:0;z-index:99999;background:#141414;display:flex;align-items:center;justify-content:center;padding:20px;font-family:"Work Sans",system-ui,sans-serif;';
  overlay.innerHTML='<div style="color:rgba(255,255,255,.6);font-size:.85rem;">Carregando…</div>';
  // some ANTES de qualquer verificação — a tela fica bloqueada por padrão (fail-closed);
  // só é liberada explicitamente depois de confirmar login, nunca por omissão/erro.
  (document.body||document.documentElement).appendChild(overlay);

  function renderErro(msg){
    overlay.innerHTML=`<div style="max-width:320px;text-align:center;color:#FF7A70;font-size:.85rem;">⚠️ ${msg}</div>`;
  }

  function renderFormulario(auth){
    overlay.innerHTML=`
      <div style="width:100%;max-width:320px;text-align:left;">
        <div style="display:inline-block;background:#D62828;color:#fff;font-size:.62rem;font-weight:700;letter-spacing:2.5px;padding:5px 9px;margin-bottom:14px;">ÁREA RESTRITA</div>
        <div style="color:#fff;font-size:2.1rem;line-height:.95;font-family:'Archivo Black',sans-serif;letter-spacing:-1px;margin-bottom:22px;">PIZZA EM<br>DOBRO <span style="color:#D62828;">EQUIPE.</span></div>
        <input type="password" id="gate-senha" placeholder="Senha da equipe" autocomplete="current-password"
          style="width:100%;box-sizing:border-box;background:#fff;border:3px solid #fff;border-radius:2px;color:#141414;padding:13px 14px;font-size:1rem;margin-bottom:10px;outline:none;">
        <button id="gate-btn" style="width:100%;background:#D62828;color:#fff;border:none;border-radius:2px;padding:15px;font-family:'Archivo Black',sans-serif;letter-spacing:.6px;font-size:.88rem;cursor:pointer;">ENTRAR</button>
        <div id="gate-status" style="color:#FF7A70;font-size:.8rem;margin-top:10px;min-height:1.2em;"></div>
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
        async user=>{
          // só libera quem tem o claim "staff" (emitido pelo staff-login.js). Antes bastava
          // QUALQUER login — um cliente logado com Google na loja abria o Caixa direto.
          if(user){
            try{
              const t=await user.getIdTokenResult();
              if(t.claims && t.claims.staff===true){ overlay.remove(); resolve(user); return; }
            }catch(e){ /* cai pro formulário */ }
          }
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
  firebase.auth().signOut().then(()=>location.reload());
}
