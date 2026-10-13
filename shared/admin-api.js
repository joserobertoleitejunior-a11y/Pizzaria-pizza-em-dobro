// Chamada ao backend do admin (server/admin-api.js) a partir de qualquer tela da
// equipe. Manda o ID token do login da equipe; o servidor confere o claim "staff".
// Pré-requisito: firebase-app-compat + firebase-auth-compat já carregados e login feito.
async function chamarAdminApi(acao, dados){
  const user = firebase.auth().currentUser;
  if(!user) throw new Error('Faça login da equipe de novo.');
  const token = await user.getIdToken();
  const r = await fetch('/api/admin-api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ acao, dados: dados || {} })
  });
  let corpo = null;
  try{ corpo = await r.json(); }catch{}
  if(!r.ok || !corpo || !corpo.ok) throw new Error((corpo && corpo.error) || ('Erro ' + r.status));
  return corpo.resultado;
}

// Cabeçalhos com o login da equipe (ID token do Firebase) pra chamar qualquer rota protegida
// do servidor (/api/send-whatsapp, /api/parse-order, /api/dashboard-chat...). O servidor confere
// o token e o claim "staff" — sem isso essas rotas respondem 401.
async function cabecalhosEquipe(extra){
  const h = Object.assign({'Content-Type':'application/json'}, extra || {});
  const user = (typeof firebase !== 'undefined' && firebase.auth) ? firebase.auth().currentUser : null;
  if(user) h.Authorization = 'Bearer ' + await user.getIdToken();
  return h;
}
