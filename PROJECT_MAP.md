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
/                           → Loja (site do cliente)         index.html (~5100 linhas)
/caixa/                     → PDV da equipe                  caixa.js (~1800 linhas)
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
| `caixa_sessoes` | Abertura/fechamento de turno do Caixa | caixa.js |
| `bot_conversas` | Estado de cada conversa do bot WhatsApp | webhook.js, bot-followup.js |

⚠️ `firestore.rules` (na raiz do repo) documenta o que cada coleção precisa
de acesso, mas **nunca foi publicado no Firebase de verdade** — ninguém aqui
tem a credencial do projeto pra publicar. Antes de publicar, testar cada
tela (loja, Caixa, Relatórios, bot-config) — ver aviso no topo do arquivo.

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
