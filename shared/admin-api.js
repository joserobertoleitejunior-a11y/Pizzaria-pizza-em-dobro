// Chamada ao backend do admin (netlify/functions/admin-api.js) a partir de qualquer tela da
// equipe. Manda o ID token do login da equipe; o servidor confere o claim "staff".
// Pré-requisito: firebase-app-compat + firebase-auth-compat já carregados e login feito.
async function chamarAdminApi(acao, dados){
  const user = firebase.auth().currentUser;
  if(!user) throw new Error('Faça login da equipe de novo.');
  const token = await user.getIdToken();
  const r = await fetch('/.netlify/functions/admin-api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ acao, dados: dados || {} })
  });
  let corpo = null;
  try{ corpo = await r.json(); }catch{}
  if(!r.ok || !corpo || !corpo.ok) throw new Error((corpo && corpo.error) || ('Erro ' + r.status));
  return corpo.resultado;
}
