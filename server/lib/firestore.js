// ══════════════════════════════════════════════════════════
//  FIRESTORE VIA REST — mesma interface do firebase-admin que o código usa
//  (collection/doc/get/set/update/delete/add, where/orderBy/limit, getAll,
//  runTransaction, FieldValue, Timestamp), pra rodar no Cloudflare Workers.
//  Só implementa o que o projeto usa; o que não existe aqui falha alto
//  (TypeError) em vez de fazer algo errado em silêncio.
// ══════════════════════════════════════════════════════════
const { getAccessToken, projectId, emuladorFirestore } = require('./google-auth');

// ── Timestamp / FieldValue ──
class Timestamp {
  constructor(seconds, nanoseconds) { this.seconds = seconds; this.nanoseconds = nanoseconds; }
  static fromMillis(ms) { const s = Math.floor(ms / 1000); return new Timestamp(s, Math.round((ms - s * 1000) * 1e6)); }
  static fromDate(d) { return Timestamp.fromMillis(d.getTime()); }
  static now() { return Timestamp.fromMillis(Date.now()); }
  toMillis() { return this.seconds * 1000 + Math.floor(this.nanoseconds / 1e6); }
  toDate() { return new Date(this.toMillis()); }
}
class Sentinela { constructor(tipo, valor) { this.tipo = tipo; this.valor = valor; } }
const FieldValue = {
  serverTimestamp: () => new Sentinela('serverTimestamp'),
  increment: (n) => new Sentinela('increment', n),
  delete: () => new Sentinela('delete')
};

// ── Conversão de valores ──
const ehObjetoSimples = (v) => v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Timestamp) && !(v instanceof Date)
  && !(v instanceof Sentinela) && !(v instanceof DocumentReference);

function codificar(v) {
  if (v === null || v === undefined) return { nullValue: null };
  switch (typeof v) {
    case 'string': return { stringValue: v };
    case 'boolean': return { booleanValue: v };
    case 'number':
      if (!Number.isFinite(v)) return { doubleValue: String(v) };
      return Number.isInteger(v) && Math.abs(v) <= Number.MAX_SAFE_INTEGER ? { integerValue: String(v) } : { doubleValue: v };
    default:
  }
  if (v instanceof Timestamp) return { timestampValue: v.toDate().toISOString() };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (v instanceof DocumentReference) return { referenceValue: v._nomeCompleto() };
  if (v instanceof Sentinela) throw new Error('FieldValue só pode ser usado como valor direto de um campo.');
  if (Array.isArray(v)) return { arrayValue: { values: v.map(codificar) } };
  if (typeof v === 'object') return { mapValue: { fields: codificarCampos(v) } };
  throw new TypeError('Tipo não suportado no Firestore: ' + typeof v);
}
function codificarCampos(obj) {
  const f = {};
  for (const k of Object.keys(obj)) if (obj[k] !== undefined) f[k] = codificar(obj[k]);
  return f;
}
function decodificar(v) {
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return typeof v.doubleValue === 'string' ? Number(v.doubleValue) : v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('timestampValue' in v) return Timestamp.fromMillis(Date.parse(v.timestampValue));
  if ('mapValue' in v) return decodificarCampos(v.mapValue.fields || {});
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(decodificar);
  if ('referenceValue' in v) return v.referenceValue;
  if ('geoPointValue' in v) return v.geoPointValue;
  if ('bytesValue' in v) return v.bytesValue;
  return null;
}
function decodificarCampos(f) {
  const o = {};
  for (const k of Object.keys(f)) o[k] = decodificar(f[k]);
  return o;
}

const segmentoSimples = /^[A-Za-z_][A-Za-z_0-9]*$/;
const caminhoCampo = (segs) => segs.map((s) => (segmentoSimples.test(s) ? s : '`' + s.replace(/\\/g, '\\\\').replace(/`/g, '\\`') + '`')).join('.');

// ── HTTP ──
const basePath = () => `projects/${projectId()}/databases/(default)`;
const baseUrl = () => (emuladorFirestore() ? `http://${process.env.FIRESTORE_EMULATOR_HOST}/v1/` : 'https://firestore.googleapis.com/v1/');
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function rest(metodo, caminho, corpo, consulta) {
  const url = baseUrl() + caminho + (consulta ? '?' + consulta : '');
  const leitura = metodo === 'GET' || caminho.endsWith(':runQuery') || caminho.endsWith(':batchGet');
  for (let tentativa = 0; ; tentativa++) {
    const headers = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (emuladorFirestore() ? 'owner' : await getAccessToken()) };
    const res = await fetch(url, { method: metodo, headers, body: corpo ? JSON.stringify(corpo) : undefined });
    const texto = await res.text();
    let json = null;
    try { json = texto ? JSON.parse(texto) : null; } catch { /* resposta não-JSON */ }
    if (res.ok) return json;
    if (leitura && tentativa < 2 && (res.status === 429 || res.status >= 500)) { await dormir(250 * (tentativa + 1)); continue; }
    const e = new Error(`Firestore ${res.status}: ${(json && json.error && json.error.message) || texto.slice(0, 300)}`);
    e.status = res.status;
    e.code = json && json.error && json.error.status;
    throw e;
  }
}

const alfabeto = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
function idAutomatico() {
  const b = crypto.getRandomValues(new Uint8Array(20));
  let s = '';
  for (let i = 0; i < 20; i++) s += alfabeto[b[i] % alfabeto.length];
  return s;
}

// ── Escritas ──
// Percorre os dados separando: campos comuns, caminhos folha (máscara do merge) e FieldValue.
function analisar(dados, prefixo, saida) {
  for (const k of Object.keys(dados)) {
    const v = dados[k];
    if (v === undefined) continue;
    const caminho = [...prefixo, k];
    if (v instanceof Sentinela) {
      if (v.tipo === 'delete') saida.apagar.push(caminho);
      else saida.transformacoes.push({ fieldPath: caminhoCampo(caminho), ...(v.tipo === 'serverTimestamp' ? { setToServerValue: 'REQUEST_TIME' } : { increment: codificar(v.valor) }) });
    } else if (ehObjetoSimples(v) && Object.keys(v).length) {
      const filho = { campos: {}, folhas: [], apagar: saida.apagar, transformacoes: saida.transformacoes };
      analisar(v, caminho, filho);
      if (Object.keys(filho.campos).length || !Object.keys(v).some((x) => v[x] instanceof Sentinela)) saida.campos[k] = { mapValue: { fields: filho.campos } };
      saida.folhas.push(...filho.folhas);
    } else {
      saida.campos[k] = codificar(v);
      saida.folhas.push(caminho);
    }
  }
}

function escritaSet(ref, dados, opcoes) {
  const a = { campos: {}, folhas: [], apagar: [], transformacoes: [] };
  analisar(dados, [], a);
  const w = { update: { name: ref._nomeCompleto(), fields: a.campos } };
  if (opcoes && opcoes.merge) w.updateMask = { fieldPaths: [...a.folhas, ...a.apagar].map(caminhoCampo) };
  else if (a.apagar.length) throw new Error('FieldValue.delete() só vale com merge:true.');
  if (a.transformacoes.length) w.updateTransforms = a.transformacoes;
  return w;
}
function escritaUpdate(ref, dados) {
  const campos = {}, mascara = [], transformacoes = [];
  for (const chave of Object.keys(dados)) {
    const v = dados[chave];
    if (v === undefined) continue;
    const segs = chave.split('.');
    if (v instanceof Sentinela) {
      if (v.tipo === 'delete') mascara.push(caminhoCampo(segs));
      else transformacoes.push({ fieldPath: caminhoCampo(segs), ...(v.tipo === 'serverTimestamp' ? { setToServerValue: 'REQUEST_TIME' } : { increment: codificar(v.valor) }) });
      continue;
    }
    mascara.push(caminhoCampo(segs));
    let alvo = campos;
    segs.slice(0, -1).forEach((s) => { alvo[s] = alvo[s] || { mapValue: { fields: {} } }; alvo = alvo[s].mapValue.fields; });
    alvo[segs[segs.length - 1]] = codificar(v);
  }
  const w = { update: { name: ref._nomeCompleto(), fields: campos }, updateMask: { fieldPaths: mascara }, currentDocument: { exists: true } };
  if (transformacoes.length) w.updateTransforms = transformacoes;
  return w;
}

async function commit(escritas, transacao) {
  return rest('POST', `${basePath()}/documents:commit`, { writes: escritas, ...(transacao ? { transaction: transacao } : {}) });
}

// ── Snapshots e referências ──
class DocumentSnapshot {
  constructor(ref, campos) { this.ref = ref; this._campos = campos; }
  get id() { return this.ref.id; }
  get exists() { return !!this._campos; }
  data() { return this._campos ? decodificarCampos(this._campos) : undefined; }
  get(campo) { const d = this.data(); return d ? d[campo] : undefined; }
}
class QuerySnapshot {
  constructor(docs) { this.docs = docs; }
  get empty() { return this.docs.length === 0; }
  get size() { return this.docs.length; }
  forEach(fn) { this.docs.forEach(fn); }
}

class DocumentReference {
  constructor(caminho) { this.path = caminho; this.id = caminho.split('/').pop(); }
  _nomeCompleto() { return `${basePath()}/documents/${this.path}`; }
  _url() { return `${this._nomeCompleto()}`.split('/').map((s, i) => (i < 5 ? s : encodeURIComponent(s))).join('/'); }
  collection(nome) { return new CollectionReference(`${this.path}/${nome}`); }
  get parent() { return new CollectionReference(this.path.split('/').slice(0, -1).join('/')); }
  async get() {
    try {
      const d = await rest('GET', this._url());
      return new DocumentSnapshot(this, d.fields || {});
    } catch (e) {
      if (e.status === 404) return new DocumentSnapshot(this, null);
      throw e;
    }
  }
  async set(dados, opcoes) { await commit([escritaSet(this, dados, opcoes)]); }
  async update(dados) { await commit([escritaUpdate(this, dados)]); }
  async create(dados) { const w = escritaSet(this, dados); w.currentDocument = { exists: false }; await commit([w]); }
  async delete() { await commit([{ delete: this._nomeCompleto() }]); }
}

const OPERADORES = { '==': 'EQUAL', '!=': 'NOT_EQUAL', '<': 'LESS_THAN', '<=': 'LESS_THAN_OR_EQUAL', '>': 'GREATER_THAN', '>=': 'GREATER_THAN_OR_EQUAL', in: 'IN', 'not-in': 'NOT_IN', 'array-contains': 'ARRAY_CONTAINS' };

class Query {
  constructor(caminho, filtros = [], ordens = [], limite = null) { this._caminho = caminho; this._filtros = filtros; this._ordens = ordens; this._limite = limite; }
  where(campo, op, valor) {
    if (!OPERADORES[op]) throw new TypeError('Operador de consulta não suportado: ' + op);
    return new Query(this._caminho, [...this._filtros, { campo, op, valor }], this._ordens, this._limite);
  }
  orderBy(campo, direcao = 'asc') { return new Query(this._caminho, this._filtros, [...this._ordens, { campo, direcao }], this._limite); }
  limit(n) { return new Query(this._caminho, this._filtros, this._ordens, n); }
  _corpo() {
    const partes = this._caminho.split('/');
    const sq = { from: [{ collectionId: partes[partes.length - 1] }] };
    const filtros = this._filtros.map((f) => ({ fieldFilter: { field: { fieldPath: caminhoCampo(f.campo.split('.')) }, op: OPERADORES[f.op], value: codificar(f.valor) } }));
    if (filtros.length === 1) sq.where = filtros[0];
    else if (filtros.length > 1) sq.where = { compositeFilter: { op: 'AND', filters: filtros } };
    if (this._ordens.length) sq.orderBy = this._ordens.map((o) => ({ field: { fieldPath: caminhoCampo(o.campo.split('.')) }, direction: o.direcao === 'desc' ? 'DESCENDING' : 'ASCENDING' }));
    if (this._limite != null) sq.limit = this._limite;
    return sq;
  }
  async get(transacao) {
    const pai = this._caminho.split('/').slice(0, -1).join('/');
    const caminho = `${basePath()}/documents${pai ? '/' + pai.split('/').map(encodeURIComponent).join('/') : ''}:runQuery`;
    const r = await rest('POST', caminho, { structuredQuery: this._corpo(), ...(transacao ? { transaction: transacao } : {}) });
    const docs = (r || []).filter((x) => x.document).map((x) => {
      const id = x.document.name.split('/').pop();
      return new DocumentSnapshot(new DocumentReference(`${this._caminho}/${id}`), x.document.fields || {});
    });
    return new QuerySnapshot(docs);
  }
}
class CollectionReference extends Query {
  constructor(caminho) { super(caminho); this.path = caminho; this.id = caminho.split('/').pop(); }
  doc(id) { return new DocumentReference(`${this.path}/${id || idAutomatico()}`); }
  async add(dados) { const ref = this.doc(); await ref.create(dados); return ref; }
}

class Transaction {
  constructor(id) { this._id = id; this._escritas = []; }
  async get(alvo) {
    if (alvo instanceof Query) return alvo.get(this._id);
    // batchGet (e não GET) porque ele devolve "missing" em vez de 404 — o 404 dentro de uma
    // transação deixava o emulador pendurado e é a forma documentada de ler numa transação.
    const r = await rest('POST', `${basePath()}/documents:batchGet`, { documents: [alvo._nomeCompleto()], transaction: this._id });
    const achado = (r || []).find((x) => x.found);
    return new DocumentSnapshot(alvo, achado ? achado.found.fields || {} : null);
  }
  set(ref, dados, opcoes) { this._escritas.push(escritaSet(ref, dados, opcoes)); return this; }
  update(ref, dados) { this._escritas.push(escritaUpdate(ref, dados)); return this; }
  delete(ref) { this._escritas.push({ delete: ref._nomeCompleto() }); return this; }
}

const db = {
  collection: (nome) => new CollectionReference(nome),
  doc: (caminho) => new DocumentReference(caminho),
  async getAll(...refs) {
    if (!refs.length) return [];
    const r = await rest('POST', `${basePath()}/documents:batchGet`, { documents: refs.map((x) => x._nomeCompleto()) });
    const achados = {};
    for (const item of r || []) if (item.found) achados[item.found.name] = item.found.fields || {};
    return refs.map((ref) => new DocumentSnapshot(ref, achados[ref._nomeCompleto()] || null));
  },
  // Soma `delta` ao campo (ATÔMICO, sem transação, sem disputa) e devolve o valor novo —
  // usado no número sequencial do pedido: 10 pedidos no mesmo segundo recebem 10 números
  // diferentes, e nunca "desiste" por bloqueio como uma transação faria.
  async incrementar(ref, campo, delta = 1) {
    const r = await commit([{
      update: { name: ref._nomeCompleto(), fields: {} }, updateMask: { fieldPaths: [] },
      updateTransforms: [{ fieldPath: caminhoCampo(campo.split('.')), increment: codificar(delta) }]
    }]);
    const v = r && r.writeResults && r.writeResults[0] && r.writeResults[0].transformResults && r.writeResults[0].transformResults[0];
    if (!v) throw new Error('O Firestore não devolveu o valor do incremento.');
    return decodificar(v);
  },
  async runTransaction(fn, { maxAttempts = 8 } = {}) {
    let ultimo;
    for (let i = 0; i < maxAttempts; i++) {
      let transacao = null;
      try {
        transacao = (await rest('POST', `${basePath()}/documents:beginTransaction`, { options: { readWrite: {} } })).transaction;
        const t = new Transaction(transacao);
        const resultado = await fn(t);
        await commit(t._escritas, transacao);
        return resultado;
      } catch (e) {
        ultimo = e;
        // libera o bloqueio ANTES de tentar de novo (sem isso as tentativas travam umas às outras)
        if (transacao) await rest('POST', `${basePath()}/documents:rollback`, { transaction: transacao }).catch(() => {});
        if (e.status === 409 || e.code === 'ABORTED') { await dormir(40 + Math.random() * 120 * (i + 1)); continue; }
        throw e;
      }
    }
    throw ultimo;
  }
};

module.exports = { db, FieldValue, Timestamp, DocumentReference };
