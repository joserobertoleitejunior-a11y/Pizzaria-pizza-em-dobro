// ══════════════════════════════════════════════════════════
//  BACKEND DO ADMIN — toda operação do painel /admin/ passa por aqui.
//  1. Confere no servidor o login da equipe (ID token + claim "staff"),
//     nunca uma flag vinda do navegador (lib/equipe.js).
//  2. Cada ação valida e limpa o que recebe (categoria, preço, status
//     fazem parte de listas fechadas; texto sem < >; tamanho máximo).
//  3. Toda alteração grava um registro em "auditoria" (quem, o quê,
//     quando) — dá pra saber depois quem mudou um preço.
//  Chamada: POST /.netlify/functions/admin-api  { acao, dados }
// ══════════════════════════════════════════════════════════
const { admin, db } = require('./lib/firebase');
const { json, lerCorpo, texto, numero, hojeBrasilia } = require('./lib/http');
const { exigirEquipe } = require('./lib/equipe');
const { reportError } = require('./lib/sentry');

const CATEGORIAS = ['p', 's', 'co', 'dw', 'cz', 'd'];
const STATUS = ['novo', 'confirmado', 'pronto', 'finalizado', 'cancelado'];
const CONFIG_BOT = ['numeroWhatsapp', 'evolutionUrl', 'instanceName', 'mensagemFechado', 'enderecoLoja', 'taxaEntrega', 'tempoEntrega', 'formasPagamento', 'observacoesLoja', 'minutosLembrete', 'minutosEncerrar', 'horarioInicio', 'horarioFim', 'delayMinMs', 'delayMaxMs', 'limiteMsgsPorHora'];
const SEGREDOS = ['anthropicKey', 'evolutionKey', 'geminiKey'];
const COLECOES_AVALIACAO = ['feedbacks', 'feedback_comments', 'avaliacoes'];

class ErroEntrada extends Error {}
const exigir = (cond, msg) => { if (!cond) throw new ErroEntrada(msg); };
const idSeguro = (v) => { const s = String(v || ''); exigir(/^[A-Za-z0-9_@.+-]{1,120}$/.test(s), 'Identificador inválido.'); return s; };
const docsDe = (snap) => snap.docs.map(d => ({ id: d.id, ...d.data() }));

async function auditar(usuario, acao, detalhes) {
  await db.collection('auditoria').add({
    acao, detalhes: detalhes || null, uid: usuario.uid,
    quando: new Date().toISOString(), server_ts: admin.firestore.FieldValue.serverTimestamp()
  });
}

function inicioDoDia(dia) { return new Date(`${dia}T00:00:00-03:00`).toISOString(); }
function fimDoDia(dia) { return new Date(`${dia}T23:59:59.999-03:00`).toISOString(); }
function diaValido(v) { exigir(/^\d{4}-\d{2}-\d{2}$/.test(String(v || '')), 'Data inválida.'); return v; }

const acoes = {
  async resumo() {
    const hoje = hojeBrasilia();
    const [pedidos, visitas, avaliacoes] = await Promise.all([
      db.collection('orders').where('created_at', '>=', inicioDoDia(hoje)).get(),
      db.collection('visits').where('date', '==', hoje).get(),
      db.collection('avaliacoes').orderBy('created_at', 'desc').limit(200).get()
    ]);
    const validos = pedidos.docs.map(d => d.data()).filter(p => p.status !== 'cancelado');
    const notas = avaliacoes.docs.map(d => Number(d.data().nota)).filter(n => n >= 1 && n <= 5);
    return {
      dia: hoje,
      pedidosHoje: validos.length,
      faturamentoHoje: Math.round(validos.reduce((s, p) => s + Number(p.total || 0), 0) * 100) / 100,
      pedidosAbertos: validos.filter(p => p.status === 'novo' || p.status === 'confirmado' || p.status === 'pronto').length,
      conferirPreco: validos.filter(p => p.conferir_preco).length,
      visitasHoje: visitas.docs.reduce((s, d) => s + Number(d.data().count || 0), 0),
      notaMedia: notas.length ? Math.round(notas.reduce((a, b) => a + b, 0) / notas.length * 10) / 10 : null,
      totalAvaliacoes: notas.length
    };
  },

  // ── Cardápio ──
  async 'cardapio.listar'() {
    return docsDe(await db.collection('menu_items').orderBy('slug_id', 'asc').get());
  },
  async 'cardapio.salvar'(d, u) {
    const slug = Number(d.slug_id);
    exigir(Number.isInteger(slug) && slug > 0 && slug < 100000, 'Número do item inválido.');
    const item = {
      id: String(slug), slug_id: slug,
      name: texto(d.name, 80), description: texto(d.description, 300) || '',
      price: numero(d.price, 0, 1000),
      category: CATEGORIAS.includes(d.category) ? d.category : null,
      active: d.active !== false,
      updated_at: new Date().toISOString()
    };
    exigir(item.name, 'Nome obrigatório.');
    exigir(item.price !== null, 'Preço inválido.');
    exigir(item.category, 'Categoria inválida.');
    if (d.img_url !== undefined) {
      const img = d.img_url === null ? null : String(d.img_url);
      exigir(img === null || (/^data:image\/(jpeg|png|webp);base64,/.test(img) && img.length <= 400000), 'Imagem inválida ou grande demais.');
      item.img_url = img;
    }
    await db.collection('menu_items').doc(item.id).set(item, { merge: true });
    await auditar(u, 'cardapio.salvar', { id: item.id, name: item.name, price: item.price, category: item.category, active: item.active });
    return { id: item.id };
  },
  async 'cardapio.ativar'(d, u) {
    const id = idSeguro(d.id);
    await db.collection('menu_items').doc(id).update({ active: d.active === true, updated_at: new Date().toISOString() });
    await auditar(u, 'cardapio.ativar', { id, active: d.active === true });
    return { id };
  },
  async 'cardapio.excluir'(d, u) {
    const id = idSeguro(d.id);
    const doc = await db.collection('menu_items').doc(id).get();
    exigir(doc.exists, 'Item não encontrado.');
    await db.collection('menu_items').doc(id).delete();
    await auditar(u, 'cardapio.excluir', { id, antes: doc.data() });
    return { id };
  },

  // ── Pedidos ──
  async 'pedidos.listar'(d) {
    const de = diaValido(d.de || hojeBrasilia());
    const ate = diaValido(d.ate || de);
    const snap = await db.collection('orders')
      .where('created_at', '>=', inicioDoDia(de)).where('created_at', '<=', fimDoDia(ate))
      .orderBy('created_at', 'desc').limit(500).get();
    return docsDe(snap);
  },
  async 'pedidos.status'(d, u) {
    const id = idSeguro(d.id);
    exigir(STATUS.includes(d.status), 'Status inválido.');
    await db.collection('orders').doc(id).update({ status: d.status, updated_at: new Date().toISOString() });
    await auditar(u, 'pedidos.status', { id, status: d.status });
    return { id };
  },
  async 'pedidos.excluir'(d, u) {
    const id = idSeguro(d.id);
    const doc = await db.collection('orders').doc(id).get();
    exigir(doc.exists, 'Pedido não encontrado.');
    // cópia antes de apagar — pedido apagado por engano ainda pode ser recuperado
    await db.collection('pedidos_excluidos').doc(id).set({ ...doc.data(), excluido_em: new Date().toISOString(), excluido_por: u.uid });
    await db.collection('orders').doc(id).delete();
    await auditar(u, 'pedidos.excluir', { id });
    return { id };
  },

  // ── Clientes (agregado dos pedidos + perfil Google + anotações da equipe) ──
  async 'clientes.listar'() {
    const [pedidos, perfis] = await Promise.all([
      db.collection('orders').orderBy('created_at', 'desc').limit(2000).get(),
      db.collection('clients').limit(1000).get()
    ]);
    const mapa = {};
    pedidos.docs.forEach(doc => {
      const p = doc.data();
      if (p.status === 'cancelado') return;
      const chave = p.client_phone || p.client_email || (p.client_name || '').toLowerCase();
      if (!chave) return;
      const c = mapa[chave] || (mapa[chave] = { chave, nome: p.client_name || null, telefone: p.client_phone || null, email: p.client_email || null, pedidos: 0, gasto: 0, ultimo: null, endereco: p.address || null });
      c.pedidos += 1;
      c.gasto += Number(p.total || 0);
      if (!c.ultimo || String(p.created_at) > c.ultimo) c.ultimo = String(p.created_at);
    });
    const notas = {};
    perfis.docs.forEach(doc => { notas[doc.id] = doc.data(); });
    return Object.values(mapa)
      .map(c => ({ ...c, gasto: Math.round(c.gasto * 100) / 100, notas: (notas[c.email] || notas[c.telefone] || {}).admin_obs || null }))
      .sort((a, b) => b.pedidos - a.pedidos);
  },
  async 'clientes.salvarNotas'(d, u) {
    const id = idSeguro(d.chave);
    await db.collection('clients').doc(id).set({ admin_obs: texto(d.notas, 500), updated_at: new Date().toISOString() }, { merge: true });
    await auditar(u, 'clientes.salvarNotas', { id });
    return { id };
  },

  // ── Avaliações (cupom) + depoimentos da loja + comentários ──
  async 'avaliacoes.listar'() {
    const [av, fb, cm] = await Promise.all([
      db.collection('avaliacoes').orderBy('created_at', 'desc').limit(200).get(),
      db.collection('feedbacks').limit(300).get(),
      db.collection('feedback_comments').limit(500).get()
    ]);
    return { avaliacoes: docsDe(av), feedbacks: docsDe(fb), comentarios: docsDe(cm) };
  },
  async 'avaliacoes.excluir'(d, u) {
    exigir(COLECOES_AVALIACAO.includes(d.colecao), 'Tipo inválido.');
    const id = idSeguro(d.id);
    await db.collection(d.colecao).doc(id).delete();
    if (d.colecao === 'feedbacks') {
      // a loja grava feedback_id como número (parseInt) em comentários antigos — cobre os dois
      const chaves = [id];
      if (/^\d+$/.test(id)) chaves.push(Number(id));
      const cms = await db.collection('feedback_comments').where('feedback_id', 'in', chaves).get();
      await Promise.all(cms.docs.map(c => c.ref.delete()));
    }
    await auditar(u, 'avaliacoes.excluir', { colecao: d.colecao, id });
    return { id };
  },

  // ── Configuração da loja e do bot (campos públicos) ──
  async 'config.ler'() {
    const [bot, loja] = await Promise.all([db.collection('config').doc('bot').get(), db.collection('config').doc('loja').get()]);
    return { bot: bot.exists ? bot.data() : {}, loja: loja.exists ? loja.data() : {} };
  },
  async 'config.salvar'(d, u) {
    const bot = {};
    CONFIG_BOT.forEach(k => {
      if (d.bot && d.bot[k] !== undefined) {
        const v = d.bot[k];
        bot[k] = typeof v === 'number' ? numero(v, 0, 10000000) : texto(v, 1000);
      }
    });
    ['ativo', 'lojaFechada'].forEach(k => { if (d.bot && typeof d.bot[k] === 'boolean') bot[k] = d.bot[k]; });
    const loja = {};
    if (d.loja && d.loja.taxaEntrega !== undefined) {
      loja.taxaEntrega = numero(d.loja.taxaEntrega, 0, 100);
      exigir(loja.taxaEntrega !== null, 'Taxa de entrega inválida.');
    }
    if (Object.keys(bot).length) await db.collection('config').doc('bot').set(bot, { merge: true });
    if (Object.keys(loja).length) await db.collection('config').doc('loja').set(loja, { merge: true });
    await auditar(u, 'config.salvar', { bot: Object.keys(bot), loja });
    return { ok: true };
  },

  // ── Chaves de API do bot: só gravação; nunca devolve o valor ──
  async 'segredos.status'() {
    const s = await db.collection('config_secrets').doc('bot').get();
    const dados = s.exists ? s.data() : {};
    const r = {};
    SEGREDOS.forEach(k => { r[k] = !!dados[k]; });
    return r;
  },
  async 'segredos.salvar'(d, u) {
    const novos = {};
    SEGREDOS.forEach(k => {
      if (typeof d[k] === 'string' && d[k].trim()) {
        exigir(d[k].trim().length <= 400, 'Chave grande demais.');
        novos[k] = d[k].trim();
      }
    });
    exigir(Object.keys(novos).length, 'Nenhuma chave informada.');
    await db.collection('config_secrets').doc('bot').set(novos, { merge: true });
    await auditar(u, 'segredos.salvar', { campos: Object.keys(novos) });
    return { ok: true };
  },

  // ── Motoboys ──
  async 'motoboys.listar'() {
    return docsDe(await db.collection('motoboys').limit(200).get());
  },
  async 'motoboys.salvar'(d, u) {
    const m = { nome: texto(d.nome, 60), telefone: texto(String(d.telefone || '').replace(/\D/g, ''), 15), taxa: numero(d.taxa ?? 0, 0, 200) };
    exigir(m.nome, 'Nome obrigatório.');
    exigir(m.taxa !== null, 'Taxa inválida.');
    let id = d.id ? idSeguro(d.id) : null;
    if (id) await db.collection('motoboys').doc(id).set(m, { merge: true });
    else id = (await db.collection('motoboys').add({ ...m, created_at: new Date().toISOString() })).id;
    await auditar(u, 'motoboys.salvar', { id, nome: m.nome });
    return { id };
  },
  async 'motoboys.excluir'(d, u) {
    const id = idSeguro(d.id);
    await db.collection('motoboys').doc(id).delete();
    await auditar(u, 'motoboys.excluir', { id });
    return { id };
  },

  async 'auditoria.listar'() {
    return docsDe(await db.collection('auditoria').orderBy('quando', 'desc').limit(100).get());
  }
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Use POST.' });
  const usuario = await exigirEquipe(event);
  if (!usuario) return json(401, { error: 'Login da equipe necessário.' });
  const corpo = lerCorpo(event);
  if (!corpo || typeof corpo.acao !== 'string' || !Object.hasOwn(acoes, corpo.acao)) return json(400, { error: 'Ação desconhecida.' });
  try {
    const resultado = await acoes[corpo.acao](corpo.dados && typeof corpo.dados === 'object' ? corpo.dados : {}, usuario);
    return json(200, { ok: true, resultado });
  } catch (err) {
    if (err instanceof ErroEntrada) return json(400, { error: err.message });
    reportError(err, `admin-api:${corpo.acao}`);
    return json(500, { error: 'Erro no servidor. Tente de novo.' });
  }
};

module.exports.acoes = acoes;
