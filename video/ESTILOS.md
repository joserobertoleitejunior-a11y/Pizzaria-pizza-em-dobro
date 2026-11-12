# Estilos (visuais) dos vídeos — margem, cores, música, tipo de imagem

Prévia dos 6 visuais: `ESTILOS-previa.jpg` (neon · xadrez · quadrinhos · cinema · clean · retrô).

| Estilo | Margem / moldura | Cores | Letra e legenda | Música de fundo | Imagem ideal | Dia sugerido |
|---|---|---|---|---|---|---|
| **Neon noite** | borda neon vermelha com brilho | preto, vermelho neon, amarelo | letras com brilho | funk/eletrônica leve, 110–125 BPM, grave marcado | pizza em luz baixa, fumaça | Seg |
| **Toalha xadrez** | moldura vermelha e branca (toalha de pizzaria) | vermelho, branco, verde | legenda em faixa creme | tarantela/acordeão italiano alegre, 120 BPM | pizza de cima, esfiha, mesa | Ter |
| **Quadrinhos (HQ)** | borda preta grossa + pontilhado | amarelo, preto, vermelho | balão de fala | swing/ska divertido, 130 BPM | mascote, selos, pizza inteira | Qui |
| **Cinema (food porn)** | tarja preta em cima e embaixo | preto, dourado, creme | letra fina minúscula, quase sem fala | jazz suave / trilha cinematográfica lenta, 70–85 BPM | **vídeo macro**: queijo esticando, molho, forno, granulado caindo | Sáb (doces), Dom |
| **Clean Instagram** | margem creme, foto arredondada | creme, branco, vermelho | letra escura limpa | pop leve/lo-fi, 95–105 BPM | fotos bem iluminadas, mesa, bebida | Qua |
| **Retrô anos 80** | borda degradê magenta→ciano + linhas de TV | roxo, magenta, ciano | letra branca com sombra rosa | synthwave, 100–110 BPM | pizza + mascote, animações | Sex |

Cada vídeo escolhe o estilo com uma palavra (`tema:'neon'`...). Dá pra trocar o estilo de qualquer vídeo sem refazer nada.

## Vídeos dentro dos vídeos (food porn e animados)
Qualquer cena pode ser um **clipe** em vez de foto. Prepare o clipe assim e me mande o arquivo `.webm`, ou o `.mp4` original que eu preparo:
`bash scripts/preparar-clipe.sh entrada.mp4 video/clips/nome.webm 6`  (vertical, sem som, até 6–8 s)
O clipe avança junto com a voz, quadro a quadro. Serve para: queijo esticando, molho caindo, forno, granulado, animação do mascote (Higgsfield/Kling/Runway/Pika).
Para ver/renderizar os vídeos com clipe use o servidor `node scripts/servidor.js` (aceita avanço de vídeo; o `python3 -m http.server` não aceita).

## Música — onde conseguir sem pagar direitos
Use biblioteca com **licença comercial** (a pizzaria vende e posta anúncio): YouTube Audio Library, Pixabay Music, Uppbeat (plano gratuito com crédito), ou gere no Suno/ElevenLabs Music com plano que libere uso comercial. Peça pelo gênero e BPM da tabela, **sem letra**, 20–30 s, e me mande o MP3. Eu mixo baixinho por baixo da voz e ajusto o volume.
Não use música de artista famoso (o Instagram derruba e a pizzaria pode ser multada).
