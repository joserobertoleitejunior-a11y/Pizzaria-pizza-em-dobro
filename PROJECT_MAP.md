# MAPA DO PROJETO — Pizza em Dobro

> Documento de navegação. Antes de investigar um bug ou pedir uma feature nova,
> lê este arquivo primeiro — ele existe pra não precisar reler o sistema inteiro
> toda vez. Atualiza esse arquivo sempre que uma mudança estrutural for feita
> (novo arquivo, nova coleção no banco, novo gotcha descoberto).

## Visão geral da arquitetura

Site estático hospedado no **Cloudflare Workers (Static Assets)** — o `wrangler.jsonc`
serve os arquivos grátis e só `/api/*` passa pelo Worker (`worker/index.js`). Firebase/Firestore
como banco de dados (acessado por REST + WebCrypto, sem firebase-admin). O servidor
(`server/*.js`) cuida do bot do WhatsApp, chat da IA do dashboard, pedidos, admin-api.
`npm run build` copia só os arquivos públicos para `dist/` (código do servidor, regras, docs e testes NUNCA são publicados).
Cron do bot (follow-up) = `scheduled()` do Worker a cada 5 min. Segredos no painel do Cloudflare:
`FIREBASE_SERVICE_ACCOUNT`, opcionais `SENTRY_DSN` e `WEBHOOK_SECRET`
(webhook da Evolution: `https://<site>/api/whatsapp-webhook?token=<WEBHOOK_SECRET>`).
Rotas da equipe (`admin-api`, `send-whatsapp`, `parse-order`, `dashboard-chat`, `dashboard-ai`) exigem ID token com claim `staff`.
Testes: `npm test`, `npm run test:regras` (emulador), `npm run test:worker` (workerd real). Deploy: `npm run deploy`. Sem framework — HTML + JS puro em
cada módulo, com scripts compartilhados carregados via `<script src="...">`.

```
/                           → Loja (site do cliente)         index.html (797 linhas) + assets/site.css + js/ (11 módulos)
/caixa/                     → PDV da equipe                  caixa/js/ (6 módulos, ver abaixo)
/relatorios/                → Dashboard + Assistente de IA    relatorios.js (~690 linhas)
/clientes/                  → Painel de clientes (leitura)    clientes.js (177 linhas)
/bot-config/                → Configuração do bot WhatsApp
/bot-config/conversas/      → Histórico de conversas do bot
/cupom/                     → Avaliação pós-pedido            cupom.js
/admin/                     → PAINEL ADMIN (equipe)           admin.js — tudo via admin-api, nada direto no banco
/dashboard/                 → ÓRFÃO — só redireciona pra /relatorios/
/shared/utils.js            → Funções e dados compartilhados (ver abaixo) — agora requireável em Node também
/shared/firebase-config.js  → Chave do Firebase (1 lugar só — pública por design, não é segredo)
/shared/sentry-config.js    → DSN do Sentry do navegador (vazio = observabilidade desligada)
/server/                   → Código de servidor (Node)
/server/lib/               → Módulos compartilhados ENTRE functions (firebase, equipe, http, secrets, senha, sentry)
/firestore.rules            → Regras v2 (banco trancado) — testadas no emulador; publicar DEPOIS do deploy (ver seção Backend)
/shared/admin-api.js        → chamarAdminApi(acao, dados) — usado pelo /admin/ e pelo bot-config
/firebase.json               → Aponta firestore.rules pro `firebase deploy --only firestore:rules`
/tests/                      → Testes unitários (`npm test`, node --test nativo, sem dependência nova)
/tests/regras/               → Regras + backend no emulador (`npm run test:regras` — precisa de Java)
/sw.js                      → Service worker (cache de assets, NÃO cacheia Firestore)
```

### Módulos JS de index.html (`/js/`) e do Caixa (`/caixa/js/`)

`index.html` e `caixa/index.html` eram um único `<script>` de milhares de linhas
cada — quebrados em arquivos menores carregados via `<script src>` sequencial
(sem bundler, sem ES modules — os `onclick="..."` inline continuam existindo e
dependem de escopo global compartilhado, então **a ordem dos `<script src>` no
HTML importa e não pode ser alterada** sem verificar as dependências entre
arquivos). Cada arquivo é uma fatia contígua do código original, cortada nos
comentários de seção (`// ══════`) — não houve reescrita de lógica.

`/js/` (loja, nessa ordem):
`core-data.js` (Firebase, LocalDB, sessão admin, config, promoções, DEFAULT_MENU)
→ `ui-shell.js` (drawer, mapa, stats) → `cardapio.js` (render, combos, meio a meio)
→ `carrinho.js` → `checkout.js` (finalizar) → `admin-avaliacoes.js` →
`admin-cardapio.js` (editor de menu) → `sessao-musica.js` (login Google, playlist)
→ `avaliacoes-feedback.js` → `boot-admin-extra.js` (BOOT/`init()` fica aqui) →
`conversor-storefront.js`.

`/caixa/js/` (nessa ordem):
`dados-sessao.js` (DEFAULT_MENU/BORDAS_DEFAULT, abrir/fechar caixa) →
`produtos-carrinho.js` (render, carrinho, item modal, pagamento) →
`colar-pedido.js` (o Conversor — combo, meio a meio, IA) →
`notificacoes.js` (pedido novo da Loja) → `mini-mensageiro.js` (chat manual
com cliente) → `impressora.js` (Bluetooth + cupom).

**Se adicionar função nova**: coloque no arquivo do assunto certo, não crie
arquivo novo pra 1-2 funções — o objetivo era sair de "milhares de linhas
num arquivo só", não fragmentar demais. Verificado com `node --check` em
cada arquivo + teste real de navegador (Playwright) antes de entrar — qualquer
mudança na ordem dos `<script src>` precisa do mesmo cuidado.

## Funções do servidor (`server/`, rodam no Worker)

- **whatsapp-webhook.js** — recebe mensagem da Evolution API, chama Claude
  (Haiku), fecha pedido, cria doc em `orders`. Lê config em `config/bot` +
  segredos em `config_secrets/bot` (via `lib/secrets.js`).
- **bot-followup.js** — roda a cada 5 min (cron), lembra clientes que sumiram
  no meio do pedido, encerra conversas abandonadas.
- **dashboard-chat.js** — chat da IA do Dashboard (Sonnet). Lê `orders` +
  `menu_items` + `config/bot` fresco a cada mensagem. Tem ferramentas
  (function calling) pra editar o cardápio de verdade: adicionar, editar,
  remover, ativar/desativar item. Ver seção de gotchas abaixo.
- **dashboard-ai.js** — análise de vendas dos últimos 30 dias sob demanda.
- **parse-order.js** — "Colar Pedido" do Caixa: recebe texto colado do
  WhatsApp + o systemPrompt (montado em caixa.js) e devolve o JSON
  interpretado. Não decide nada sozinho, só repassa pra Anthropic.
- **send-whatsapp.js** *(novo)* — envia mensagem manual do mini-mensageiro
  do Caixa. Existe pra chave da Evolution API nunca precisar rodar no
  navegador (antes rodava — ver gotcha #12).
- **admin-api.js** — BACKEND DO ADMIN. `POST {acao, dados}` com
  `Authorization: Bearer <ID token>`; recusa (401) quem não tem o claim
  `staff`. Ações: resumo, cardapio.*, pedidos.*, clientes.*, avaliacoes.*,
  config.*, segredos.* (só gravação/status, nunca devolve a chave),
  motoboys.*, auditoria.listar. Valida cada campo (listas fechadas de
  categoria/status, texto sem < > aspas duplas, crase e barra invertida, limites) e grava cada alteração
  em `auditoria`. Pedido excluído vai antes pra `pedidos_excluidos`.
- **criar-pedido.js** — ÚNICA porta de entrada dos pedidos da loja: limpa os
  campos, número sequencial (fuso de São Paulo), trava de duplicata (mesmo
  telefone + total em 10 min), confere preço item a item com `menu_items`
  (divergência → `conferir_preco: true`, nunca recusa — o pedido já foi pelo
  WhatsApp). `client_email` só de login Google com e-mail verificado.
- **pedido-publico.js** — o cupom (/cupom/) lê o pedido por aqui: só primeiro
  nome, itens e total (sem telefone/endereço).
- **registrar-visita.js** — soma 1 em `visits/<AAAA-MM-DD>` (incremento atômico).
- **staff-login.js** — além da senha, bloqueia 8 erros por IP em 15 min
  (`seguranca_login`, IP guardado só como hash).
- ~~secrets-status.js~~ — removido (respondia sem login; o status das chaves
  agora vem de `admin-api` → `segredos.status`).
- **lib/firebase.js** — init único do Admin SDK (usa o emulador se
  `FIRESTORE_EMULATOR_HOST` existir). **lib/equipe.js** — `exigirEquipe(event)`.
  **lib/http.js** — `json`, `texto` (sanitização), `numero`, `hojeBrasilia`.
- **lib/secrets.js** *(novo)* — `getSecrets(db)`: lê/migra as chaves de
  `config/bot` (legado) pra `config_secrets/bot` automaticamente, uma vez,
  sem ação manual. Toda function que precisa de `anthropicKey`/`evolutionKey`/
  `geminiKey` passa por aqui — nunca lê `config/bot` esperando achar a chave lá.
- **lib/sentry.js** *(novo)* — `reportError(err, contexto)`: manda pro Sentry
  se `SENTRY_DSN` existir nas env vars da Netlify, senão só faz `console.error`
  (100% inofensivo sem DSN).

## shared/utils.js — o que tem lá dentro

Carregado por: index.html, caixa/index.html, relatorios/index.html, clientes/index.html
(via `<script src>`) **e** por dashboard-ai.js/dashboard-chat.js (via `require()` —
o arquivo ganhou `module.exports` no final, então funciona nos dois mundos sem duplicar).
- `fmt(v)` — formata moeda em R$
- `toMillis(v)` / `dataStr(v)` — leitura seguros de datas (protege contra
  Timestamp do Firebase vs string ISO)
- `obterProximoNumeroSequencial(FS)` — número sequencial do pedido, reinicia
  por dia, contador em `contadores/pedidos_AAAA-MM-DD`
- `categoriaPagamento(raw)` — normaliza forma de pagamento em 4 baldes
- `COMBOS_DEFAULT` — as 4 faixas de combo "2 por X" (fonte única, site/Caixa/bot)
- `CATEGORIAS_CARDAPIO` + `_normalizarCategoriaCardapio(cat)` — mapeia
  categoria (código OU palavra em português) pro código interno (p/s/co/dw/cz/d)
- `resolverFaixaCombo(sabor1, sabor2, faixaExplicita)` *(novo)* — acha a faixa
  de combo certa a partir dos 2 sabores, sem nunca adivinhar (ver gotcha #10)
- `decomporSaboresItem(nome)` *(novo)* — separa o nome composto de um item
  de combo/meio a meio nos sabores reais (ver gotcha #11)
- `pizzasFisicasPorItem(nome)` *(novo)* — quantas pizzas físicas uma linha
  do carrinho representa (combo = 2, meio a meio e normal = 1)

Cada arquivo que usa essas funções também tem uma cópia de segurança
("fallback") caso o `shared/utils.js` falhe ao carregar (cache/CDN) — ver
gotcha #1 abaixo.

## Coleções do Firestore

| Coleção | O que guarda | Quem escreve |
|---|---|---|
| `orders` | Todo pedido (site, Caixa, bot, conversor) | criar-pedido.js (loja), caixa.js (equipe), webhook.js |
| `menu_items` | Cardápio — 1 doc por item, doc ID = `String(slug_id)` | index.html (admin), dashboard-chat.js |
| `config/bot` | Config PÚBLICA do negócio (endereço, taxa, horário) — NUNCA mais tem chave de API aqui | bot-config/index.html |
| `config_secrets/bot` | As 3 chaves de API (Anthropic/Evolution/Gemini) — só Admin SDK lê, navegador nunca | Netlify Functions (via `lib/secrets.js`), bot-config/index.html só escreve (nunca lê de volta) |
| `contadores/pedidos_AAAA-MM-DD` | Contador do número sequencial, reinicia por dia | shared/utils.js |
| `caixa_sessoes` | Abertura/fechamento de turno do Caixa — **só equipe logada** (ver login abaixo) | caixa.js |
| `bot_conversas` | Estado de cada conversa do bot WhatsApp — **só equipe logada** | webhook.js, bot-followup.js |
| `motoboys` | Cadastro de entregadores (nome/telefone/taxa) — **só equipe logada** | caixa.js, painel.html |
| `clients` | Perfil do cliente (login Google na loja) — autosserviço do próprio cliente + editado pelo modo admin da loja | index.html |
| `avaliacoes` | Avaliação pós-pedido (fluxo do cupom) | cupom.js |
| `feedbacks` + `feedback_comments` | Depoimento geral da loja + comentários — moderação hoje passa pelo modo admin da loja, não pela equipe | index.html |
| `conv_orders` | Conversor de pedido embutido na própria loja (modo admin da loja) | index.html |
| `visits` | Contador de visitas — 1 doc por dia (id = data) a partir da v2 | registrar-visita.js |
| `auditoria` | Quem alterou o quê e quando (toda ação do admin-api) | admin-api.js (navegador só lê, equipe) |
| `pedidos_excluidos` | Cópia de segurança de pedido apagado pelo painel | admin-api.js (só servidor) |
| `seguranca_login` | Contagem de senha errada por IP (hash) | staff-login.js (só servidor) |

## Backend e segurança (v2) — como o banco ficou trancado

- **Cliente (navegador da loja)**: lê cardápio, config pública e depoimentos;
  cria avaliação/depoimento/comentário/o próprio perfil Google com campos
  conferidos pelas regras (sem `< >`, tamanho máximo, sem campo extra). Lê
  SÓ os próprios pedidos (e-mail Google verificado). Pedido e visita: só
  pelo servidor.
- **Equipe (claim `staff`)**: Caixa, Relatórios, Clientes, painel e o modo
  admin da loja continuam falando direto com o Firestore — as regras liberam
  só pra quem tem o claim (checado pelos servidores do Google). O painel
  novo `/admin/` e as chaves de API vão pelo `admin-api`.
- **Ninguém pelo navegador**: `config_secrets`, `pedidos_excluidos`,
  `seguranca_login`; `visits`/`auditoria`/`analises_ia` só leitura da equipe.
- Testes: `npm run test:regras` (29 casos: visitante, cliente Google, conta
  com e-mail não verificado, equipe).

⚠️ **ORDEM PRA PUBLICAR** (o deploy preview usa o MESMO banco de produção):
1. Mergear/publicar o site novo na Netlify (as functions novas usam as
   mesmas variáveis `FIREBASE_SERVICE_ACCOUNT` e `STAFF_PASSWORD`).
2. SÓ DEPOIS publicar `firestore.rules` (Firebase Console → Firestore →
   Regras → colar o arquivo → Publicar). Publicar antes quebra o site antigo,
   que ainda grava pedido direto do navegador.
3. Testar: pedido pela loja aparece no Caixa; /admin/ abre com a senha.

## Login da equipe (senha única)

Caixa, Relatórios, Clientes, bot-config, bot-config/conversas e painel.html
não tinham NENHUMA proteção — qualquer um que soubesse a URL entrava. Agora
todas essas páginas carregam `shared/staff-auth.js` e chamam
`iniciarGateEquipe()` logo depois de carregar `firebase-auth-compat.js` +
`shared/firebase-config.js` — isso cobre a tela com uma senha até o
Firebase confirmar (via `server/staff-login.js`, que compara com
a variável de ambiente `STAFF_PASSWORD` na Netlify e devolve um *custom
token* do Firebase Auth se bater). Depois de entrar uma vez, o navegador
lembra (sessão do Firebase) — não pede senha nova a cada página nem a cada
recarregamento no mesmo aparelho.

`firestore.rules` (v2) usa `isEquipe()` (`request.auth.token.staff==true`)
em todas as coleções internas — ver seção "Backend e segurança (v2)". O gate
(`shared/staff-auth.js`) também exige o claim: antes bastava QUALQUER login,
então um cliente logado com Google na loja abria o Caixa.

**Sem a variável `STAFF_PASSWORD` configurada na Netlify, ninguém consegue
entrar em nenhuma dessas páginas** (a function devolve erro 500 "senha
ainda não configurada") — isso é intencional (fail-closed), não um bug.

### Schema de `menu_items` (importante manter consistente)
```js
{
  id: "24",              // string, mesmo valor do slug_id
  slug_id: 24,            // number — usado pro orderBy no carregamento
  name: "Toscana",
  description: "...",
  price: 40.99,
  category: "s",           // SEMPRE um destes: p, s, co, dw, cz, d — nunca texto livre
  img_url: null,           // base64 comprimido, ou null
  active: true,
  updated_at: "2026-08-08T..."
}
```

### Schema de item dentro de `orders.items_json`
```js
{ name: "Toscana", price: 40.99, qty: 2, borda: "Catupiry"|null, removed: [], added: [] }
```
`qty` nem sempre existe em pedidos vindos do site (cada clique = 1 entrada
separada no array, sem campo qty) — código que lê isso precisa tratar
`qty` ausente como 1.

## Onde cada módulo lê o cardápio (⚠️ os 3 NÃO estão automaticamente sincronizados)

- **index.html (Loja)**: `sg('menu_items', {where:[active==true], orderBy:slug_id})`
  na carga da página. Só recarrega se a página for recarregada.
- **caixa.js**: idem, função `carregarCardapioDoBanco()`, chamada 1x no início.
  Antes de 08/2026 isso NÃO existia — o Caixa usava uma lista fixa hardcoded
  (`DEFAULT_MENU`) que nunca via itens novos. Corrigido, mas se `DEFAULT_MENU`
  virar `const` de novo por engano, esse carregamento quebra silenciosamente.
- **dashboard-chat.js**: lê direto do Firestore a cada mensagem do chat
  (sempre fresco, roda no servidor, não tem "página aberta" pra ficar velha).

**Consequência prática**: se o assistente de IA (que sempre lê fresco) disser
uma coisa e a tela do navegador mostrar outra, a explicação nº 1 é aba
desatualizada — pede pra recarregar (fechar e abrir de novo, não só F5) antes
de assumir que é bug de dado.

## Gotchas e histórico de bugs já corrigidos (não reintroduzir)

1. **Funções de `shared/utils.js` têm fallback local em cada arquivo.** Se
   `shared/utils.js` falhar ao carregar (cache/CDN durante troca de deploy),
   cada módulo define a função na hora, senão a tela quebra inteira
   (aconteceu: `toMillis is not defined` no painel Clientes).
2. **Categoria do cardápio tem que ser SEMPRE um código válido** (p/s/co/dw/cz/d).
   Se qualquer código gravar texto livre tipo "doces", o item fica invisível
   no site/Caixa (eles só reconhecem os códigos). Use sempre
   `_normalizarCategoriaCardapio()` antes de gravar `category`.
3. **Horário sempre em America/Sao_Paulo, nunca hora local do servidor.**
   Servidor Netlify roda em UTC — perto da meia-noite de Brasília (21h-23h59),
   `new Date().getDate()` etc no servidor já é "amanhã". Sempre usar
   `Intl.DateTimeFormat` ou `toLocaleDateString` com `timeZone:'America/Sao_Paulo'`
   explícito.
4. **`buscarItemPorNome()` (dashboard-chat.js) pode achar item duplicado.**
   Já existiam casos de 2 itens com nome igual/parecido no banco (de testes
   antigos). A função detecta isso e retorna `{ambiguo:true, opcoes:[...]}`
   em vez de escolher um às cegas — nunca reverter isso pra escolha silenciosa.
5. **Impressão automática do Caixa nunca pode usar `alert()`** — trava a aba
   inteira sem ninguém pra clicar OK, e para de processar pedidos novos até
   alguém aparecer. Erros de impressão automática só logam no console e caem
   na fila manual (`filaNotificacoes`).
6. **Nunca usar bibliotecas de IA pesadas (ex: remoção de fundo) rodando no
   thread principal do navegador.** Testado e travou o celular inteiro.
   Removido — não reintroduzir sem testar antes num aparelho real.
7. **`html,body{overflow:hidden}` no Caixa** foi removido de propósito —
   antes só uma faixa específica da tela rolava. Não reintroduzir esse padrão
   de "app com scroll travado" sem necessidade clara.
8. **Bot do WhatsApp usa Evolution API (não-oficial, Baileys)** — sujeito a
   restrição/banimento do WhatsApp por atividade suspeita. Migração pra API
   oficial da Meta estava em andamento (ver histórico de decisão). Enquanto
   isso, reconectar o mínimo possível: cada reconexão é sinal de risco a mais.
9. **`Math.random()` numa chave de agrupamento sempre quebra dedução de
   quantidade** — foi a causa de pizzas iguais aparecerem como várias linhas
   de "1x" em vez de uma linha "2x" (tanto no carrinho do Caixa quanto no
   cupom impresso). Chaves de agrupamento têm que ser determinísticas
   (nome+borda+acréscimos), nunca aleatórias. **Isso voltou a acontecer** no
   item "colado" do Colar Pedido e no combo manual (ambos usavam
   `Date.now()+Math.random()`) — corrigido, mas fica o alerta: qualquer
   `cart.push({_chave:'...'+Math.random()...})` novo é suspeito por padrão.
10. **O Colar Pedido (Caixa) não entendia combo "2 por X"** — o schema/prompt
    só tinha `tipo:"normal"|"meia_a_meia"`, sem noção nenhuma de combo, então
    um pedido de combo virava 2 itens avulsos (preço errado) ou item "não
    identificado". O bot oficial do WhatsApp (`whatsapp-webhook.js`) sempre
    soube tratar combo certinho — o Colar Pedido foi corrigido pra replicar o
    mesmo padrão (`resolverFaixaCombo()`, nunca adivinha faixa ambígua tipo
    "Bacon" que existe em 2 faixas de preço diferentes).
11. **`abrirColarPedido()` não limpava o carrinho antes de montar o pedido
    interpretado** — se o Caixa já tinha item de um pedido anterior não
    finalizado, colar um pedido novo SOMAVA em cima, em silêncio (causa real
    de "pedi 2 pizzas, apareceram 3 — uma de pedido passado"). Agora avisa e
    pergunta antes de colar em cima de um carrinho não vazio.
12. **As 3 chaves de API viviam no MESMO documento (`config/bot`) que Caixa e
    bot-config liam inteiro, direto do navegador** — ou seja, qualquer um que
    abrisse essas páginas baixava `anthropicKey`/`evolutionKey`/`geminiKey`
    junto com os campos públicos. O mini-mensageiro do Caixa também chamava a
    Evolution API DIRETO do navegador com a chave em mãos. Corrigido: chaves
    agora em `config_secrets/bot` (só Admin SDK lê), e o envio de WhatsApp
    manual passou a ser servidor (`send-whatsapp.js`). **Nunca adicionar campo
    de chave/segredo em `config/bot` de novo** — vai em `config_secrets/bot`.
13. **`mix-blend-mode` + `mask-image` no MESMO `<video>` trava a composição no
    Safari/iOS** (fogo do fundo aparecia congelado/"lavado" só no iPhone,
    Android normal). Corrigido movendo blend-mode/mask pro `<div>` que
    envolve o vídeo, nunca no `<video>` em si. Se algum efeito visual novo
    precisar de blend-mode/mask num vídeo, sempre no wrapper.
14. **Ranking "sabores mais vendidos" do Dashboard contava pelo `it.name`
    exato** — como combo salva `"2 Por R$ 65,00 — A + B"` e meio a meio salva
    `"Meio a Meio: A / B"`, esses sabores nunca contavam pro sabor de
    verdade (e apareciam como "nunca vendido" mesmo vendendo bastante via
    combo). Corrigido com `decomporSaboresItem()` — qualquer contagem nova
    "por sabor" no dashboard/relatórios precisa passar por essa função, nunca
    usar `it.name` cru quando o objetivo é sabor (usar cru é certo quando o
    objetivo é o item exato, tipo lista de lançamentos).
15. **Hoisting de `function` NÃO atravessa fronteira de `<script src>`.** Ao
    quebrar o `caixa.js` monolítico em `caixa/js/*.js` (múltiplos
    `<script src>` sequenciais), uma chamada de boot (`iniciarEscutaNotificacoes()`)
    ficou num arquivo carregado ANTES do arquivo que define essa função —
    no arquivo único original isso funcionava por hoisting dentro do mesmo
    `<script>` (função declarada mais abaixo no arquivo, mas disponível o
    tempo todo); separado em arquivos, throw "X is not defined" na hora do
    boot. Pego só porque o teste com Playwright simulava o Firestore
    respondendo de verdade (com Firestore 100% fora do ar, esse caminho de
    código nem rodava, e o bug ficava escondido). **Se cortar mais algum
    arquivo grande em módulos**: toda chamada de função no boot (código que
    roda assim que o arquivo carrega, fora de qualquer função) só pode
    chamar função já definida num arquivo carregado ANTES ou no mesmo
    arquivo — nunca confiar em hoisting entre arquivos separados. O boot
    real do Caixa (`renderCats(); renderProdutos(); ...; if(iniciarFirebase())...`)
    mora no fim de `caixa/js/impressora.js` (o último a carregar) por causa
    disso.

## Login da equipe

Ver seção "Login da equipe (senha única)" mais acima — antes de mexer em
Caixa/Relatórios/Clientes/bot-config/painel, leia aquilo primeiro.

## Convenções de código deste projeto

- Sem build step: HTML/JS direto, sem TypeScript, sem framework.
- Estilo de função: `nomeDaFuncao` em português, camelCase.
- Todo `.set()`/escrita no Firestore que pode falhar (conexão) precisa de
  try/catch com feedback visível pro usuário — nunca falhar em silêncio
  (já aconteceu: item "salvo" que na verdade não gravou).
- Deploy: agora versionado em `github.com/joserobertoleitejunior-a11y/Pizzaria-pizza-em-dobro`
  (antes só existia como zip solto, nunca tinha ido pro Git — corrigido). O
  método antigo de zip pra `/mnt/user-data/outputs/` ou Termux continua
  funcionando se precisar, mas o caminho normal agora é `git push` pra branch
  de trabalho, PR pra `main`, Netlify builda a partir do Git.
- `netlify.toml` roda `npm install && npm test` no build — se um teste
  quebrar, o deploy não sobe. Rodar `npm test` local antes de empurrar
  qualquer mudança em `shared/utils.js` ou nas Netlify Functions.
- `npm run lint` (Biome) existe mas não é gate de build ainda — código legado
  tem dívida de estilo pendente de limpeza dedicada.

## ⚠️ Acesso provisório da equipe
Por pedido do José, `server/staff-login.js` aceita o login fixo **usuário `marco` / senha `1234`**, sem bloqueio por tentativas
e sem `STAFF_PASSWORD`. É temporário: trocar por senha forte (e reativar o limite de tentativas) antes do lançamento público.

## Combos, 3D, dispositivo e zoom (loja)
- Combos aparecem ANTES do cardápio (`#cat-co` primeiro; nav e botão do topo levam a eles). Cada cartão mostra preço grande, "de R$ X / você economiza R$ Y" (calculado do cardápio real) e botão 🎲 Surpreenda-me.
- Vitrine 3D (`src/combo3d.src.js` → `npm run build:3d` → `assets/vendor/combo3d.js`, three.js só com o necessário, ~120KB gzip): carrega só depois da splash e ocioso, 30 quadros/s, pausa fora da tela/aba escondida, pula em aparelho fraco (`html[data-leve]`) e usa emoji.
- `js/dispositivo.js` (no head): `data-disp` celular/tablet/desktop, `data-leve`, `--vh`, e bloqueio de zoom (junto de meta viewport `user-scalable=no` + `touch-action:manipulation`).
- Desktop (≥1024px, bloco final de `assets/site.css`): coluna central de até 1200px (1360px ≥1500px), hero grande, menu de categorias centralizado, cardápio em 2 colunas (3 em tela enorme), combos 2 colunas (4 em tela enorme), carrinho como cartão flutuante no canto, janelas no centro, efeitos de passar o mouse.
- **Combo broto** (`COMBO_BROTO` em shared/utils.js): 2 broto por R$ 50, qualquer sabor p/s, pode repetir; item "2 Broto por R$ 50,00 — A + B". **Esfihas** (`ESFIHA_*`, `precoEsfihas`, `nomeEsfihas`): R$ 5 cada, 6 sabores, 10=R$50 / 20=R$90 / 30=R$130, melhor preço combinando pacotes; item "Esfihas (N) — 4 Carne + 6 Mista". Presentes na loja (`js/cardapio.js`), no Caixa (aba Esfihas + card broto em Combos), no bot (prompt) e nos relatórios. Esfihas NÃO estão em `menu_items` (são fixas no código, como `COMBOS_DEFAULT`).
- **Faixa de ícones** (`js/faixa-contatos.js` + bloco final de site.css): WhatsApp, telefone, Instagram e endereço (abre o mapa). Facebook/SoluTudo/chat não existem neste site e ficaram de fora.
- **Otimização da loja:** scripts pesados (Firebase, utils) saíram do `<head>`; Sentry só carrega se houver DSN; Google Maps só carrega ao abrir o pedido/focar no endereço; GSAP removido (entrada ao rolar = `.reveal` + IntersectionObserver); fonte Public Sans removida; `content-visibility:auto` nos cartões do cardápio; SW com cache-first pra imagens/fontes/3D; `Cache-Control` 1 dia em `/assets/*`. Faixas (ícones e vermelha) usam `js/faixa-contatos.js` (translate3d, sem máscara/filtro; captura de ponteiro só ao arrastar de verdade, senão o clique não chega no link).
- **Promoções imperdíveis** (`#promos` no index, `js/promos.js`, imagens em `assets/promo/`): carrossel de cartazes (rolagem nativa + arrasto de mouse + pontinhos); clicar leva ao item (`data-alvo`) com pulso. Substituiu os 2 cartões "Entrega super rápida/Combos imperdíveis". Pra incluir outro cartaz: copiar um `<a class="promo-slide">`.
- **Visual único da equipe** (`shared/app-clean.css`, carregado por último em admin, caixa, relatórios, clientes, bot-config, cupom; gate em `shared/staff-auth.js`; conversor da loja no fim de `assets/site.css`): claro/clean, cartões brancos, vermelho #D62828, botões chapados. Troque cores mexendo nas variáveis do `:root` desse arquivo. `painel.html` (painel da cozinha) também usa o visual claro (CSS próprio dentro do arquivo, mesmos tokens).
- **Botão flutuante da equipe** (`js/fab-equipe.js`): aparece na loja quando o login da equipe está ativo; arrastável (gruda na borda, lembra a posição); opções **Caixa** (`/caixa/`) e **Conversor** (`/caixa/?colar=1`, abre direto o conversor do Caixa — o único que entende combo broto/esfihas). Admin → aba Resumo tem atalhos (Caixa, Conversor, Dashboard, Cardápio) e lista de pedidos em andamento com troca de status.
- **Tamanhos de texto:** todos os `font-size` abaixo de 1rem da loja e das telas da equipe foram aumentados (mínimo .72rem; escala: <.6→.72, .6–.63→.74, .64–.68→.78, .69–.73→.82, .74–.79→.86, ≥.8 → +.08) e as cores de texto secundário clareadas. Ao criar CSS novo, use ≥ .78rem para texto de leitura.
- **Carrinho enxuto:** itens (com − / + e total), Entrega|Retirada (botões, `definirModoEntrega`), Google em 1 linha, dados, botão "📍 Usar minha localização atual" (`usarLocalizacaoAtual`), pagamento por toque (`escolherPagamento`, o `<select id="u-pay">` segue existindo escondido) e enviar. Os IDs usados pelo checkout não mudaram.
- **Dashboard (relatorios/)** reescrito: dias/horas no fuso de Brasília, "pizzas" = só pizzas (esfiha, bebida, calzone fora), cada informação uma vez (formas de pagamento = 1 lista que também filtra os pedidos), barras em HTML/CSS (sem Chart.js), PDF/CSV corrigidos e jsPDF só carrega ao pedir. `dashboard/` ficou só como redirecionamento.
- **Caixa mais leve/confiável:** logo do recibo em arquivo (`assets/logo-recibo.png`, antes 150KB dentro do JS), sem fonte externa nem blur, busca com atraso, um único AudioContext, checagem da impressora a cada 15s só com a aba visível, aviso de falta de internet, "Vendas de hoje" com resumo (total, por forma, dinheiro na gaveta), reimpressão com fallback pro navegador, fechamento de caixa mostra/imprime o resumo.
- **Publicação:** o mesmo repositório publica no **Netlify** (`netlify.toml` → `dist/`, `/api/*` → `netlify/functions/api.js`, cron `bot-followup`) OU no **Cloudflare Workers** (`wrangler.jsonc` + `worker/index.js`). Os dois usam o mesmo código de servidor (`server/*.js`). Variável obrigatória nos dois: `FIREBASE_SERVICE_ACCOUNT`. Depois de estar no ar, publicar `firestore.rules` no Console do Firebase.

## Acesso do cliente (nome + WhatsApp) e "Cliente balcão"
- **Login Google dos clientes foi removido** (script GSI, botões, selo "via Google", fotos). Agora: modal `#modal-entrar` → `abrirEntrar()` / `confirmarEntrar()` em `js/sessao-musica.js`; sessão = `currentUser{name,phone,logado:true}` no `DB('client')`. `clienteLogado()` diz se entrou. `aplicarSessaoCliente()` atualiza menu/carrinho/avaliação.
- Cadastro no servidor: `server/cliente.js` → `POST /api/cliente` (registrado em `worker/index.js` e `netlify/functions/api.js`), grava `clients/<DDD+número>`. Não devolve dados de ninguém; o histórico de pedidos fica no aparelho (`local_orders`).
- **Venda de balcão**: Caixa grava `balcao:true` quando não há nome nem telefone. `ehClienteBalcao(p)` (`shared/utils.js`) também reconhece pedidos antigos ("Cliente Balcão" sem telefone). Fica fora de `clientes.listar`, Clientes, Dashboard (KPI clientes) e ranking do chat IA.
- Limpeza dos dados Google antigos: botão "🧹 Apagar dados do login Google antigo" em /clientes → ação `clientes.limparGoogle` (admin-api): apaga e-mail/foto/uid de clients, pedidos, avaliações e comentários.
- `firestore.rules` ainda tem as regras antigas de e-mail (inofensivas; ninguém mais grava por elas).

## Bot removido + Como chegar / Google / rodapé
- **Bot do WhatsApp removido**: sem `bot-config/`, `server/whatsapp-webhook.js`, `server/bot-followup.js`, `server/send-whatsapp.js`, mini-mensageiro do Caixa, cron (netlify.toml/wrangler). Ficam: config da loja (`loja fechada`, taxa, horário) no admin e a IA do Conversor/Dashboard (chave Anthropic).
- Fim da loja (`index.html`): `#local-section` = mapa (carrega só ao chegar perto) + botões **Waze** e **Google Maps** + **Avaliações no Google** (ver / avaliar). Endereço vem de `getEndereco()` (config da loja). Pra abrir direto a janela de avaliar, gravar o Place ID do Google na config `gplace` (`getCfg('gplace')`). Código: `js/ui-shell.js` (`iniciarLocal`).
- Rodapé `#rodape`: marca, atalhos, contato, crédito "Vibe Coding Process" com cubo 3D CSS (`.cubo`, só transform — leve) e direitos autorais. CSS no fim de `assets/site.css`.
- Caixa: faixa "Hoje" (vendas/total/ticket/gaveta) em `#resumo-rail` (`pintarResumoRail`, `atualizarTotaisHoje` em `caixa/js/produtos-carrinho.js`); barra do total sempre colada embaixo.

## Impressora térmica (POS-5890U) e impressão automática
- `caixa/js/impressora.js`: USB (WebUSB), Bluetooth LE e **AUTO** (driver do Windows via `window.print()` num iframe, silencioso com Chrome `--kiosk-printing`). `impressoraPronta()` é o teste único usado por Caixa/notificações/fechamento.
- Acentos: texto convertido pra tabela da impressora (`cp850` padrão, `cp1252` ou `sem` acento). Botão "Teste" imprime uma linha com acentos e troca o modo a cada toque (salvo em `localStorage.ped_acento`).
- Pedido do site chegando + impressora pronta → imprime e finaliza sozinho (`iniciarEscutaNotificacoes` em `notificacoes.js`). Sem impressora → entra na fila de notificações com som.
- Celular (Android): o modo AUTO (driver do Windows) fica desligado e escondido — `window.print()` abriria a tela "Todas as impressoras". No celular a térmica é pelo cabo USB (OTG) com o botão "🔌 USB" (WebUSB, reconecta sozinha depois da 1ª vez).

## Versão sempre atualizada
- `scripts/build-cf.js` gera `dist/version.json` a cada deploy; `shared/atualizar-versao.js` (loja, Caixa, Dashboard, Clientes, Painel) compara com a última vista no aparelho e, se mudou, limpa o cache do app e recarrega 1 vez. `sw.js` busca a rede com `cache:'no-cache'`; `/`, `/index.html`, `/sw.js` e `/version.json` sem cache HTTP.

## Login da equipe
- `server/staff-login.js`: usuário `marco`, senha `lamalu` (pedido do José). Trocar por senha forte + bloqueio quando abrir a mais gente.

## Conversor (Colar Pedido do Caixa)
- O "Conversor" da loja abre `caixa/index.html?colar=1` (o antigo de `js/conversor-storefront.js` não é mais usado).
- IA devolve também `acrescimos`, `entrega` (entrega/retirada), `troco_para`, `observacao_geral`; tenta 2× se o JSON vier quebrado.
- Nomes casados com tolerância (`_acharPorNome`: sem acento, "contém", palavras em comum, erro de digitação pequeno) — sabor inexistente continua indo como "⚠️ CONFERIR", nunca trocado.
- Cupom (`formatarCupom`) igual pra pedido do site e convertido: acréscimos, nº da casa (site guarda em `house_number`), troco ("Troco para"), taxa. Pedido do site agora manda preço do item com borda+acréscimos, `added` e `taxa`.
- Bluetooth: `BT_SERVICOS` (lista ampla de serviços BLE das térmicas) + `acharCaracteristicaEscrita` descobre sozinha onde escrever; usa escrita "sem resposta" quando a impressora aceita. Impressora com Bluetooth só "clássico" não aparece no navegador → usar cabo.
- USB no Windows com driver instalado dá "Access denied" → `explicarFalhaUSB` oferece ligar o modo AUTO.
- Dois Caixas abertos (ex.: notebook + celular): `reservarImpressao` (transação em `orders`, campos `impresso_auto/impresso_por/impresso_em`) garante que só um aparelho imprime cada pedido do site.
