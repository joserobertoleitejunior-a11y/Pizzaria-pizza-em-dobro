// ══════════════════════════════════════════════════════════
//  PAINEL ADMIN — toda leitura/escrita passa pelo backend
//  (shared/admin-api.js → server/admin-api.js), que confere
//  o login da equipe no servidor e valida cada campo. Nada aqui fala
//  com o banco direto. Todo dado vindo do banco é escapado (esc) antes
//  de virar HTML.
// ══════════════════════════════════════════════════════════

const CATEGORIAS = { p: 'Tradicionais', s: 'Especiais', co: 'Combos', dw: 'Doces', cz: 'Calzones doces', d: 'Bebidas' };
const STATUS = { novo: 'Novo', confirmado: 'Confirmado', pronto: 'Pronto', finalizado: 'Finalizado', cancelado: 'Cancelado' };
const CAMPOS_CONFIG = [
  ['numeroWhatsapp', 'WhatsApp da loja'], ['enderecoLoja', 'Endereço da loja'], ['taxaEntrega', 'Taxa de entrega', 'number'],
  ['tempoEntrega', 'Tempo de entrega'], ['formasPagamento', 'Formas de pagamento'], ['horarioInicio', 'Abre às', 'time'],
  ['horarioFim', 'Fecha às', 'time'], ['mensagemFechado', 'Mensagem de loja fechada'], ['observacoesLoja', 'Observações']
];
const SEGREDOS = [['anthropicKey', 'Anthropic (IA do Conversor e do Dashboard)']];

const estado = { cardapio: [], clientes: [] };

function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function reais(v) { return 'R$ ' + Number(v || 0).toFixed(2).replace('.', ','); }
function dataHora(iso) { const d = new Date(iso); return isNaN(d) ? '—' : d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); }
function hoje() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date()); }

let _avisoTimer;
function avisar(msg, erro) {
  const el = document.getElementById('aviso');
  el.textContent = msg;
  el.className = 'aviso mostrar' + (erro ? ' erro' : '');
  clearTimeout(_avisoTimer);
  _avisoTimer = setTimeout(() => { el.className = 'aviso'; }, 2800);
}
async function api(acao, dados) {
  try { return await chamarAdminApi(acao, dados); } catch (e) { avisar(e.message, true); throw e; }
}
function carregando(id) { document.getElementById(id).innerHTML = '<div class="sk-wrap" aria-hidden="true"><i class="sk"></i><i class="sk"></i><i class="sk"></i></div>'; }

// ── Abas ──
const carregadores = { resumo: carregarResumo, pedidos: carregarPedidos, cardapio: carregarCardapio, clientes: carregarClientes, avaliacoes: carregarAvaliacoes, motoboys: carregarMotoboys, config: carregarConfig, auditoria: carregarAuditoria };
document.getElementById('abas').addEventListener('click', e => {
  const b = e.target.closest('button[data-aba]');
  if (!b) return;
  document.querySelectorAll('#abas button').forEach(x => x.classList.toggle('ativa', x === b));
  document.querySelectorAll('.aba').forEach(s => s.classList.toggle('ativa', s.id === 'aba-' + b.dataset.aba));
  carregadores[b.dataset.aba]().catch(() => {});
});

// ── Resumo ──
async function carregarResumo() {
  carregando('aba-resumo');
  const [r, lista] = await Promise.all([api('resumo'), api('pedidos.listar', { de: hoje(), ate: hoje() }).catch(() => [])]);
  const abertos = lista.filter(p => p.status === 'novo' || p.status === 'confirmado' || p.status === 'pronto');
  const ticket = r.pedidosHoje ? r.faturamentoHoje / r.pedidosHoje : 0;
  document.getElementById('aba-resumo').innerHTML = `
    <div class="atalhos">
      <a class="atalho principal" href="../caixa/"><span>🧾</span><b>Abrir Caixa</b><small>PDV · vender agora</small></a>
      <a class="atalho" href="../caixa/?colar=1"><span>📋</span><b>Conversor</b><small>colar pedido do WhatsApp</small></a>
      <a class="atalho" href="../relatorios/"><span>📊</span><b>Dashboard</b><small>vendas e gráficos</small></a>
      <button class="atalho" onclick="irParaAba('cardapio')"><span>🍕</span><b>Cardápio</b><small>preços e itens</small></button>
    </div>
    <h2>Hoje · ${esc(r.dia.split('-').reverse().join('/'))}</h2>
    <div class="numeros">
      <div class="numero destaque"><span>Faturamento</span><b>${esc(reais(r.faturamentoHoje))}</b><small>${r.pedidosHoje} pedido${r.pedidosHoje === 1 ? '' : 's'} · ticket ${esc(reais(ticket))}</small></div>
      <div class="numero ${r.pedidosAbertos ? 'alerta' : ''}"><span>Em aberto</span><b>${r.pedidosAbertos}</b><small>aguardando andamento</small></div>
      <div class="numero"><span>Visitas no site</span><b>${r.visitasHoje}</b><small>hoje</small></div>
      <div class="numero"><span>Nota média</span><b>${r.notaMedia == null ? '—' : esc(r.notaMedia)}</b><small>${r.totalAvaliacoes} avaliações</small></div>
      ${r.conferirPreco ? `<div class="numero alerta"><span>Preço a conferir</span><b>${r.conferirPreco}</b><small>pedidos com divergência</small></div>` : ''}
    </div>
    <h2>Pedidos em andamento</h2>
    ${!abertos.length ? '<div class="vazio">Nenhum pedido em aberto agora. 🎉</div>' : abertos.slice(0, 8).map(p => `
      <div class="linha">
        <div class="info">
          <div class="titulo"><span class="num">#${esc(p.numero_sequencial || '—')}</span>${esc(p.client_name || 'Sem nome')}
            <span class="selo ${p.status === 'novo' ? 'vermelho' : ''}">${esc(STATUS[p.status] || p.status)}</span></div>
          <div class="sub">${esc(dataHora(p.created_at))} · ${esc(p.delivery_type || '')} · ${esc(p.payment || '')}</div>
        </div>
        <div class="preco">${esc(reais(p.total))}</div>
        <select data-resumo-status="${esc(p.id)}">${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${k === p.status ? 'selected' : ''}>${v}</option>`).join('')}</select>
      </div>`).join('')}
    ${abertos.length > 8 ? `<button class="btn btn-contorno" onclick="irParaAba('pedidos')">Ver todos os pedidos</button>` : ''}`;
}
function irParaAba(nome) { const b = document.querySelector(`#abas button[data-aba="${nome}"]`); if (b) b.click(); }
document.getElementById('aba-resumo').addEventListener('change', async e => {
  const id = e.target.dataset.resumoStatus;
  if (!id) return;
  await api('pedidos.status', { id, status: e.target.value });
  avisar('Status atualizado.');
  carregarResumo();
});

// ── Pedidos ──
async function carregarPedidos() {
  const de = document.getElementById('ped-de').value || hoje();
  const ate = document.getElementById('ped-ate').value || de;
  carregando('lista-pedidos');
  const lista = await api('pedidos.listar', { de, ate });
  const total = lista.filter(p => p.status !== 'cancelado').reduce((s, p) => s + Number(p.total || 0), 0);
  document.getElementById('lista-pedidos').innerHTML = !lista.length ? '<div class="vazio">Nenhum pedido nesse período.</div>' :
    `<h2>${lista.length} pedidos · ${esc(reais(total))}</h2>` + lista.map(p => `
      <div class="pedido">
        <div class="pedido-topo">
          <div>
            <div class="linha-titulo"><b>#${esc(p.numero_sequencial || '—')} ${esc(p.client_name || 'Sem nome')}</b>
              <span class="selo ${p.status === 'cancelado' ? 'cinza' : p.status === 'novo' ? 'vermelho' : ''}">${esc(STATUS[p.status] || p.status || '—')}</span>
              <span class="selo cinza">${esc(p.origem || '—')}</span></div>
            <div class="sub">${esc(dataHora(p.created_at))} · ${esc(p.delivery_type || '')} · ${esc(p.payment || '')}${p.client_phone ? ' · ' + esc(p.client_phone) : ''}</div>
            ${p.address ? `<div class="sub">${esc(p.address)} ${esc(p.house_number || '')}</div>` : ''}
            ${p.conferir_preco ? `<div class="alerta-preco">⚠ Conferir preço: ${esc((p.divergencias_preco || []).join('; '))}</div>` : ''}
          </div>
          <div class="preco">${esc(reais(p.total))}</div>
        </div>
        <div class="pedido-itens">${(p.items_json || []).map(i => `${esc(i.qty || 1)}× ${esc(i.name)}${i.borda ? ' (borda ' + esc(i.borda) + ')' : ''}`).join('<br>')}</div>
        <div class="pedido-rodape">
          <select data-status="${esc(p.id)}">${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${k === p.status ? 'selected' : ''}>${v}</option>`).join('')}</select>
          <button class="btn btn-mini btn-perigo" data-excluir-pedido="${esc(p.id)}">Excluir</button>
        </div>
      </div>`).join('');
}
document.getElementById('lista-pedidos').addEventListener('change', async e => {
  const id = e.target.dataset.status;
  if (!id) return;
  await api('pedidos.status', { id, status: e.target.value });
  avisar('Status atualizado.');
});
document.getElementById('lista-pedidos').addEventListener('click', async e => {
  const id = e.target.dataset.excluirPedido;
  if (!id || !confirm('Excluir este pedido? Fica guardada uma cópia de segurança.')) return;
  await api('pedidos.excluir', { id });
  avisar('Pedido excluído.');
  carregarPedidos();
});

// ── Cardápio ──
async function carregarCardapio() {
  carregando('lista-cardapio');
  estado.cardapio = await api('cardapio.listar');
  renderCardapio();
}
function renderCardapio() {
  const busca = document.getElementById('card-busca').value.trim().toLowerCase();
  const itens = estado.cardapio.filter(i => !busca || (i.name || '').toLowerCase().includes(busca) || (i.description || '').toLowerCase().includes(busca));
  const html = Object.entries(CATEGORIAS).map(([cat, nome]) => {
    const doGrupo = itens.filter(i => i.category === cat);
    if (!doGrupo.length) return '';
    return `<h2>${esc(nome)}</h2>` + doGrupo.map(i => `
      <div class="linha ${i.active === false ? 'inativo' : ''}">
        <div class="info">
          <div class="titulo"><span class="num">#${esc(i.slug_id)}</span>${esc(i.name)}${i.active === false ? '<span class="selo cinza">Em falta</span>' : ''}</div>
          <div class="sub">${esc(i.description || '')}</div>
        </div>
        <div class="preco">${esc(reais(i.price))}</div>
        <div class="acoes">
          <button class="btn btn-mini btn-contorno" data-ativar="${esc(i.id)}" data-valor="${i.active === false}">${i.active === false ? 'Ativar' : 'Pausar'}</button>
          <button class="btn btn-mini" data-editar="${esc(i.id)}">Editar</button>
        </div>
      </div>`).join('');
  }).join('');
  document.getElementById('lista-cardapio').innerHTML = html || '<div class="vazio">Nenhum item encontrado.</div>';
}
document.getElementById('lista-cardapio').addEventListener('click', async e => {
  const t = e.target;
  if (t.dataset.editar) abrirItem(estado.cardapio.find(i => i.id === t.dataset.editar));
  if (t.dataset.ativar) {
    await api('cardapio.ativar', { id: t.dataset.ativar, active: t.dataset.valor === 'true' });
    const item = estado.cardapio.find(i => i.id === t.dataset.ativar);
    if (item) item.active = t.dataset.valor === 'true';
    renderCardapio();
    avisar('Disponibilidade atualizada.');
  }
});
document.getElementById('it-cat').innerHTML = Object.entries(CATEGORIAS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
let _itemEditando = null;
function abrirItem(item) {
  _itemEditando = item || null;
  const proximo = Math.max(0, ...estado.cardapio.map(i => Number(i.slug_id) || 0)) + 1;
  document.getElementById('item-titulo').textContent = item ? 'Editar item' : 'Novo item';
  document.getElementById('it-slug').value = item ? item.slug_id : proximo;
  document.getElementById('it-slug').disabled = !!item;
  document.getElementById('it-cat').value = item ? item.category : 'p';
  document.getElementById('it-nome').value = item ? item.name : '';
  document.getElementById('it-desc').value = item ? (item.description || '') : '';
  document.getElementById('it-preco').value = item ? item.price : '';
  document.getElementById('it-ativo').checked = item ? item.active !== false : true;
  document.getElementById('modal-item').classList.add('aberto');
}
function fecharItem() { document.getElementById('modal-item').classList.remove('aberto'); }
async function salvarItem(e) {
  e.preventDefault();
  const dados = {
    slug_id: Number(document.getElementById('it-slug').value),
    category: document.getElementById('it-cat').value,
    name: document.getElementById('it-nome').value,
    description: document.getElementById('it-desc').value,
    price: Number(document.getElementById('it-preco').value),
    active: document.getElementById('it-ativo').checked
  };
  if (!_itemEditando && estado.cardapio.some(i => Number(i.slug_id) === dados.slug_id)) { avisar('Já existe um item com esse número.', true); return; }
  await api('cardapio.salvar', dados);
  fecharItem();
  avisar('Item salvo — já aparece na loja e no Caixa.');
  carregarCardapio();
}

// ── Clientes ──
async function carregarClientes() {
  carregando('lista-clientes');
  estado.clientes = await api('clientes.listar');
  renderClientes();
}
function renderClientes() {
  const busca = document.getElementById('cli-busca').value.trim().toLowerCase();
  const lista = estado.clientes.filter(c => !busca || (c.nome || '').toLowerCase().includes(busca) || (c.telefone || '').includes(busca.replace(/\D/g, '') || '§'));
  document.getElementById('lista-clientes').innerHTML = !lista.length ? '<div class="vazio">Nenhum cliente encontrado.</div>' :
    `<h2>${lista.length} clientes</h2>` + lista.slice(0, 300).map(c => `
      <div class="linha">
        <div class="info">
          <div class="titulo">${esc(c.nome || 'Sem nome')}</div>
          <div class="sub">${esc(c.telefone || '')}${c.email ? ' · ' + esc(c.email) : ''} · último pedido ${esc(dataHora(c.ultimo))}</div>
          ${c.endereco ? `<div class="sub">${esc(c.endereco)}</div>` : ''}
          ${c.notas ? `<div class="sub"><b>Nota:</b> ${esc(c.notas)}</div>` : ''}
        </div>
        <div class="preco">${c.pedidos}× · ${esc(reais(c.gasto))}</div>
        <div class="acoes"><button class="btn btn-mini btn-contorno" data-notas="${esc(c.email || c.telefone || '')}">Anotar</button></div>
      </div>`).join('');
}
document.getElementById('lista-clientes').addEventListener('click', async e => {
  const chave = e.target.dataset.notas;
  if (!chave) return;
  const atual = (estado.clientes.find(c => (c.email || c.telefone) === chave) || {}).notas || '';
  const notas = prompt('Anotação sobre o cliente (só a equipe vê):', atual);
  if (notas === null) return;
  await api('clientes.salvarNotas', { chave, notas });
  avisar('Anotação salva.');
  carregarClientes();
});

// ── Avaliações ──
async function carregarAvaliacoes() {
  carregando('lista-avaliacoes');
  const r = await api('avaliacoes.listar');
  const estrelas = n => '★'.repeat(Math.max(0, Math.min(5, Number(n) || 0)));
  const linha = (col, id, titulo, sub, texto) => `
    <div class="linha"><div class="info"><div class="titulo">${titulo}</div><div class="sub">${sub}</div><div class="sub">${esc(texto || '')}</div></div>
    <div class="acoes"><button class="btn btn-mini btn-perigo" data-colecao="${col}" data-id="${esc(id)}">Apagar</button></div></div>`;
  document.getElementById('lista-avaliacoes').innerHTML =
    `<h2>Pós-pedido (${r.avaliacoes.length})</h2>` + (r.avaliacoes.map(a => linha('avaliacoes', a.id, `<span class="estrelas">${estrelas(a.nota)}</span> ${esc(a.client_name || '')}`, esc(dataHora(a.created_at)), a.comentario)).join('') || '<div class="vazio">Nenhuma ainda.</div>') +
    `<h2>Depoimentos (${r.feedbacks.length})</h2>` + (r.feedbacks.map(f => linha('feedbacks', f.id, `<span class="estrelas">${estrelas(f.stars)}</span> ${esc(f.name || '')}`, `${esc(dataHora(f.created_at))} · ${Number(f.likes || 0)} curtidas`, f.comment)).join('') || '<div class="vazio">Nenhum ainda.</div>') +
    `<h2>Comentários (${r.comentarios.length})</h2>` + (r.comentarios.map(c => linha('feedback_comments', c.id, esc(c.author || ''), esc(dataHora(c.created_at)), c.comment)).join('') || '<div class="vazio">Nenhum ainda.</div>');
}
document.getElementById('lista-avaliacoes').addEventListener('click', async e => {
  const { colecao, id } = e.target.dataset;
  if (!colecao || !confirm('Apagar de vez?')) return;
  await api('avaliacoes.excluir', { colecao, id });
  avisar('Apagado.');
  carregarAvaliacoes();
});

// ── Motoboys ──
async function carregarMotoboys() {
  carregando('lista-motoboys');
  const lista = await api('motoboys.listar');
  document.getElementById('lista-motoboys').innerHTML = !lista.length ? '<div class="vazio">Nenhum motoboy cadastrado.</div>' :
    lista.map(m => `<div class="linha"><div class="info"><div class="titulo">${esc(m.nome)}</div><div class="sub">${esc(m.telefone || '')}</div></div>
      <div class="preco">${esc(reais(m.taxa))}</div>
      <div class="acoes"><button class="btn btn-mini btn-contorno" data-mb='${esc(JSON.stringify({ id: m.id, nome: m.nome, telefone: m.telefone, taxa: m.taxa }))}'>Editar</button>
      <button class="btn btn-mini btn-perigo" data-mb-excluir="${esc(m.id)}">Excluir</button></div></div>`).join('');
}
document.getElementById('lista-motoboys').addEventListener('click', async e => {
  if (e.target.dataset.mb) {
    const m = JSON.parse(e.target.dataset.mb);
    document.getElementById('mb-id').value = m.id;
    document.getElementById('mb-nome').value = m.nome || '';
    document.getElementById('mb-tel').value = m.telefone || '';
    document.getElementById('mb-taxa').value = m.taxa || '';
  }
  if (e.target.dataset.mbExcluir && confirm('Excluir este motoboy?')) {
    await api('motoboys.excluir', { id: e.target.dataset.mbExcluir });
    avisar('Motoboy excluído.');
    carregarMotoboys();
  }
});
async function salvarMotoboy(e) {
  e.preventDefault();
  await api('motoboys.salvar', {
    id: document.getElementById('mb-id').value || null,
    nome: document.getElementById('mb-nome').value,
    telefone: document.getElementById('mb-tel').value,
    taxa: Number(document.getElementById('mb-taxa').value || 0)
  });
  e.target.reset();
  document.getElementById('mb-id').value = '';
  avisar('Motoboy salvo.');
  carregarMotoboys();
}

// ── Configurações ──
document.getElementById('cfg-campos').innerHTML = CAMPOS_CONFIG.map(([k, rotulo, tipo]) =>
  `<label>${esc(rotulo)}<input id="cfg-${k}" type="${tipo || 'text'}" ${tipo === 'number' ? 'step="any" min="0"' : ''}></label>`).join('') +
  '<label>Taxa de entrega do Caixa (R$)<input id="cfg-loja-taxa" type="number" step="0.01" min="0"></label>';
document.getElementById('seg-campos').innerHTML = SEGREDOS.map(([k, rotulo]) =>
  `<label>${esc(rotulo)} <small id="seg-st-${k}"></small><input id="seg-${k}" type="password" autocomplete="new-password" placeholder="cole a chave nova"></label>`).join('');
async function carregarConfig() {
  const [cfg, seg] = await Promise.all([api('config.ler'), api('segredos.status')]);
  CAMPOS_CONFIG.forEach(([k]) => { const v = cfg.bot[k]; document.getElementById('cfg-' + k).value = v == null ? '' : v; });
  document.getElementById('cfg-lojaFechada').checked = !!cfg.bot.lojaFechada;
  document.getElementById('cfg-loja-taxa').value = cfg.loja.taxaEntrega == null ? '' : cfg.loja.taxaEntrega;
  SEGREDOS.forEach(([k]) => { document.getElementById('seg-st-' + k).textContent = seg[k] ? '✓ configurada' : '— não configurada'; });
}
async function salvarConfig(e) {
  e.preventDefault();
  const bot = { lojaFechada: document.getElementById('cfg-lojaFechada').checked };
  CAMPOS_CONFIG.forEach(([k, , tipo]) => {
    const v = document.getElementById('cfg-' + k).value.trim();
    if (v !== '') bot[k] = tipo === 'number' ? Number(v) : v;
  });
  const dados = { bot };
  const taxa = document.getElementById('cfg-loja-taxa').value;
  if (taxa !== '') dados.loja = { taxaEntrega: Number(taxa) };
  await api('config.salvar', dados);
  avisar('Configurações salvas.');
}
async function salvarSegredos(e) {
  e.preventDefault();
  const dados = {};
  SEGREDOS.forEach(([k]) => { const v = document.getElementById('seg-' + k).value.trim(); if (v) dados[k] = v; });
  if (!Object.keys(dados).length) { avisar('Cole pelo menos uma chave.', true); return; }
  await api('segredos.salvar', dados);
  SEGREDOS.forEach(([k]) => { document.getElementById('seg-' + k).value = ''; });
  avisar('Chaves salvas.');
  carregarConfig();
}

// ── Histórico (auditoria) ──
const NOMES_ACAO = { 'cardapio.salvar': 'Item do cardápio salvo', 'cardapio.ativar': 'Disponibilidade alterada', 'cardapio.excluir': 'Item excluído', 'pedidos.status': 'Status de pedido', 'pedidos.excluir': 'Pedido excluído', 'clientes.salvarNotas': 'Anotação de cliente', 'avaliacoes.excluir': 'Avaliação apagada', 'config.salvar': 'Configurações salvas', 'segredos.salvar': 'Chaves de API trocadas', 'motoboys.salvar': 'Motoboy salvo', 'motoboys.excluir': 'Motoboy excluído' };
async function carregarAuditoria() {
  carregando('lista-auditoria');
  const lista = await api('auditoria.listar');
  document.getElementById('lista-auditoria').innerHTML = '<h2>Últimas alterações</h2>' + (lista.map(a => `
    <div class="linha"><div class="info"><div class="titulo">${esc(NOMES_ACAO[a.acao] || a.acao)}</div>
    <div class="sub">${esc(dataHora(a.quando))}</div><div class="sub">${esc(a.detalhes ? JSON.stringify(a.detalhes).slice(0, 220) : '')}</div></div></div>`).join('') || '<div class="vazio">Nada registrado ainda.</div>');
}

// ── Início: só depois do login da equipe confirmado ──
document.getElementById('ped-de').value = hoje();
document.getElementById('ped-ate').value = hoje();
iniciarGateEquipe().then(() => carregarResumo().catch(() => {}));
