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
/                           → Loja (site do cliente)         index.html (5057 linhas)
/caixa/                     → PDV da equipe                  caixa.js (1776 linhas)
/relatorios/                → Dashboard + Assistente de IA    relatorios.js (684 linhas)
/clientes/                  → Painel de clientes (leitura)    clientes.js (177 linhas)
/bot-config/                → Configuração do bot WhatsApp
/bot-config/conversas/      → Histórico de conversas do bot
/cupom/                     → Avaliação pós-pedido            cupom.js
/dashboard/                 → ÓRFÃO — só redireciona pra /relatorios/
/shared/utils.js            → Funções e dados compartilhados (ver abaixo)
/shared/firebase-config.js  → Chave do Firebase (1 lugar só)
/netlify/functions/         → Código de servidor (Node)
/sw.js                      → Service worker (cache de assets, NÃO cacheia Firestore)
```

## Funções da Netlify (servidor)

- **whatsapp-webhook.js** — recebe mensagem da Evolution API, chama Claude
  (Haiku), fecha pedido, cria doc em `orders`. Lê config em `config/bot`.
- **bot-followup.js** — roda a cada 5 min (cron), lembra clientes que sumiram
  no meio do pedido, encerra conversas abandonadas.
- **dashboard-chat.js** — chat da IA do Dashboard (Sonnet). Lê `orders` +
  `menu_items` + `config/bot` fresco a cada mensagem. Tem ferramentas
  (function calling) pra editar o cardápio de verdade: adicionar, editar,
  remover, ativar/desativar item. Ver seção de gotchas abaixo.

## shared/utils.js — o que tem lá dentro

Carregado por: index.html, caixa/index.html, relatorios/index.html, clientes/index.html.
- `fmt(v)` — formata moeda em R$
- `toMillis(v)` / `dataStr(v)` — leitura seguros de datas (protege contra
  Timestamp do Firebase vs string ISO)
- `obterProximoNumeroSequencial(FS)` — número sequencial do pedido, reinicia
  por dia, contador em `contadores/pedidos_AAAA-MM-DD`
- `categoriaPagamento(raw)` — normaliza forma de pagamento em 4 baldes
- `COMBOS_DEFAULT` — as 4 faixas de combo "2 por X" (fonte única, site/Caixa/bot)
- `CATEGORIAS_CARDAPIO` + `_normalizarCategoriaCardapio(cat)` — mapeia
  categoria (código OU palavra em português) pro código interno (p/s/co/dw/cz/d)

Cada arquivo que usa essas funções também tem uma cópia de segurança
("fallback") caso o `shared/utils.js` falhe ao carregar (cache/CDN) — ver
gotcha #1 abaixo.

## Coleções do Firestore

| Coleção | O que guarda | Quem escreve |
|---|---|---|
| `orders` | Todo pedido (site, Caixa, bot, conversor) | index.html, caixa.js, webhook.js |
| `menu_items` | Cardápio — 1 doc por item, doc ID = `String(slug_id)` | index.html (admin), dashboard-chat.js |
| `config/bot` | Config do negócio (endereço, taxa, horário, chave da Anthropic) | bot-config/index.html |
| `contadores/pedidos_AAAA-MM-DD` | Contador do número sequencial, reinicia por dia | shared/utils.js |
| `caixa_sessoes` | Abertura/fechamento de turno do Caixa | caixa.js |
| `bot_conversas` | Estado de cada conversa do bot WhatsApp | webhook.js, bot-followup.js |

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
   (nome+borda+acréscimos), nunca aleatórias.

## Convenções de código deste projeto

- Sem build step: HTML/JS direto, sem TypeScript, sem framework.
- Estilo de função: `nomeDaFuncao` em português, camelCase.
- Todo `.set()`/escrita no Firestore que pode falhar (conexão) precisa de
  try/catch com feedback visível pro usuário — nunca falhar em silêncio
  (já aconteceu: item "salvo" que na verdade não gravou).
- Deploy: zip completo pra `/mnt/user-data/outputs/pizza-em-dobro-DEPLOY.zip`,
  ou via Termux (`netlify deploy --prod` de dentro de `~/pizza-em-dobro`,
  NUNCA de `~/storage/downloads` — dá erro de permissão no `npm install`).
