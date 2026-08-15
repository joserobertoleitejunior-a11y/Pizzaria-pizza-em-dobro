# MAPA DO PROJETO — Pizza em Dobro

> Documento de navegação. Antes de investigar um bug ou pedir uma feature nova,
> lê este arquivo primeiro — ele existe pra não precisar reler o sistema inteiro
> toda vez. Atualiza esse arquivo sempre que uma mudança estrutural for feita
> (novo arquivo, nova coleção no banco, novo gotcha descoberto).

## Visão geral da arquitetura

Site estático (sem build step, sem bundler) hospedado na Netlify. Firebase/Firestore
como banco de dados. Netlify Functions pra tudo que precisa rodar no servidor
(bot do WhatsApp, chat da IA do dashboard). Sem framework — HTML + JS puro em
cada módulo, com scripts compartilhados carregados via `<script src="...">`.

```
/                           → Loja (site do cliente)         index.html (797 linhas) + assets/site.css + js/ (11 módulos)
/caixa/                     → PDV da equipe                  caixa/js/ (6 módulos, ver abaixo)
/relatorios/                → Dashboard + Assistente de IA    relatorios.js (~690 linhas)
/clientes/                  → Painel de clientes (leitura)    clientes.js (177 linhas)
/bot-config/                → Configuração do bot WhatsApp
/bot-config/conversas/      → Histórico de conversas do bot
/cupom/                     → Avaliação pós-pedido            cupom.js
/dashboard/                 → ÓRFÃO — só redireciona pra /relatorios/
/shared/utils.js            → Funções e dados compartilhados (ver abaixo) — agora requireável em Node também
/shared/firebase-config.js  → Chave do Firebase (1 lugar só — pública por design, não é segredo)
/shared/sentry-config.js    → DSN do Sentry do navegador (vazio = observabilidade desligada)
/netlify/functions/         → Código de servidor (Node)
/netlify/functions/lib/     → Módulos compartilhados ENTRE functions (secrets.js, sentry.js)
/firestore.rules            → Regras de segurança do Firestore — NUNCA publicado ainda, ver nota lá dentro
/firebase.json               → Aponta firestore.rules pro `firebase deploy --only firestore:rules`
/tests/                      → Testes unitários (`npm test`, node --test nativo, sem dependência nova)
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

## Funções da Netlify (servidor)

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
- **secrets-status.js** *(novo)* — devolve só `{anthropicKey: true/false, ...}`
  pro bot-config saber o que já está configurado, sem nunca devolver o valor.
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
| `orders` | Todo pedido (site, Caixa, bot, conversor) | index.html, caixa.js, webhook.js |
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
| `visits` | Contador de visitas (estatística pública) | index.html |

⚠️ `firestore.rules` (na raiz do repo) documenta o que cada coleção precisa
de acesso, mas **nunca foi publicado no Firebase de verdade** — ninguém aqui
tem a credencial do projeto pra publicar. Antes de publicar, testar cada
tela (loja, Caixa, Relatórios, Clientes, bot-config, painel) — ver aviso no
topo do arquivo.

## Login da equipe (senha única)

Caixa, Relatórios, Clientes, bot-config, bot-config/conversas e painel.html
não tinham NENHUMA proteção — qualquer um que soubesse a URL entrava. Agora
todas essas páginas carregam `shared/staff-auth.js` e chamam
`iniciarGateEquipe()` logo depois de carregar `firebase-auth-compat.js` +
`shared/firebase-config.js` — isso cobre a tela com uma senha até o
Firebase confirmar (via `netlify/functions/staff-login.js`, que compara com
a variável de ambiente `STAFF_PASSWORD` na Netlify e devolve um *custom
token* do Firebase Auth se bater). Depois de entrar uma vez, o navegador
lembra (sessão do Firebase) — não pede senha nova a cada página nem a cada
recarregamento no mesmo aparelho.

`firestore.rules` usa `isEquipe()` (`request.auth.token.staff==true`) pra
travar de verdade `caixa_sessoes`, `motoboys` e `bot_conversas` — essas 3
coleções só a equipe (nem cliente logado com Google) consegue ler/escrever
depois que a regra for publicada. As demais coleções que a LOJA também usa
(orders, menu_items, config, clients, avaliacoes, feedbacks etc.) **não**
foram travadas atrás dessa senha nesta passada — a loja tem seu próprio modo
admin mais antigo (`checkAdminSession()`, separado, senha diferente) que
ainda gerencia essas coleções, e unificar os dois exige mexer no index.html
com mais tempo de teste. Ver nota 4 dentro do `firestore.rules`.

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
