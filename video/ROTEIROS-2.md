# Roteiros 2 — Vozes B e C (colar no ElevenLabs) + passo a passo pra não dar erro

Mapa da semana: **A** = Dom, Qua, Sex (já enviados) · **B** = Seg, Qui, Sáb · **C** = Ter. Nenhum dia vizinho repete a voz.

## PASSO A PASSO (siga na ordem)
1. **Uma voz por vídeo, um áudio por vídeo.** Gere o vídeo de segunda inteiro de uma vez, depois o de quinta, etc. Não junte dois vídeos num áudio e não gere frase solta.
2. **Configuração (igual pra todos):** modelo Eleven Multilingual v2 · idioma Português (Brasil) · Stability 40 · Similarity 75 · Style 30 · Speaker Boost ligado · velocidade 1.05.
3. **Voz:** use a MESMA voz de cada letra (A, B, C) em todos os dias dela. Anote o nome da voz que escolher e me diga.
4. **Teste antes** (grátis, 1 frase): `Pizza em Dobro: a pizza, a esfía e o Pics de hoje!` — precisa sair "pítsa", "esfía" e "Pics". Se errar, troque de voz.
5. **Cole o texto EXATAMENTE como está** (com `<break time="0.8s" />` entre as linhas). Não corrija a escrita: "esfía", "bêicon", "catupiri", "cômbo", "brôto", "calzône", "Piri" são de propósito, é como se fala. A legenda do vídeo eu escrevo certa (esfiha, bacon, catupiry).
6. **Não adicione** música, "olá", "obrigado" nem efeito. Só a fala.
7. **Ouça o áudio inteiro** antes de me mandar. Se alguma palavra saiu errada, gere de novo o vídeo inteiro (não corte pedaço) e me diga qual palavra errou.
8. **Baixe em MP3** e me mande **um por vez, dizendo o dia** (ex.: "segunda, voz B"). Se mandar sem dizer, eu confiro pelo texto, mas confirmo com você.
9. **Eu faço:** transcrevo, corto nas pausas, encaixo cada frase numa imagem, confiro a pronúncia e te mostro quadros antes de fechar. Se a duração passar de 20 s eu te aviso antes.
10. **Imagens:** cada vídeo usa fotos diferentes. Conferi com `node scripts/checar-fotos.js`: só a terça repete (tenho 1 foto de esfiha). Traga mais fotos e eu troco.

## VOZ B — masculina, 30–40 anos, interior de SP, animada
### SEGUNDA — Duelo
```
Segunda: qual pizza é a sua? <break time="0.8s" /> Mussarela com calabresa. <break time="0.8s" /> Frango com catupiri. <break time="0.8s" /> Ou portuguesa. Todas em cômbo, a partir de sessenta e cinco reais! <break time="0.8s" /> Pizza em Dobro. Escolhe a sua!
```
### QUINTA — Caixa 3D (especiais)
```
Quinta pede um especial! <break time="0.8s" /> Franqueijo Piri, Toscana Piri, ou brócolis com bêicon. <break time="0.8s" /> Cada um mais recheado que o outro. <break time="0.8s" /> Duas por oitenta e cinco reais! <break time="0.8s" /> Pizza em Dobro. Pede o seu!
```
### SÁBADO — Doce (stop-motion)
```
Sábado é dia de doce! <break time="0.8s" /> Pizza doce: quarenta reais e noventa e nove. <break time="0.8s" /> Calzône doce: trinta e cinco reais e noventa e nove. <break time="0.8s" /> Brigadeiro, confete, prestígio, romeu e julieta. <break time="0.8s" /> Pizza em Dobro. Fecha a noite com doce!
```
## VOZ C — feminina, 35–45 anos, interior de SP, calma e acolhedora (ASMR)
### TERÇA — ASMR esfihas (fala bem devagar, poucas palavras)
```
Terça. Esfía quentinha. <break time="1.0s" /> Carne. Frango com catupiri. Calabresa. Bêicon. <break time="1.0s" /> E duas doces. <break time="1.0s" /> Cinco reais cada. Dez por cinquenta. <break time="1.0s" /> Pizza em Dobro.
```
(Terça: pode pedir ao ElevenLabs velocidade 0.95 e Style 15 pra soar mais suave.)

## Imagens diferentes sempre
Regra: **nenhuma foto se repete dentro da semana**. Meta por vídeo: 4 a 5 fotos/clipes diferentes. Pra 7 vídeos precisamos de ~30 imagens por semana (ou menos, com clipes de 3–5 s cortados em vários pedaços). Trazer variedade: ângulos (de cima, 45°, close, mão segurando), luz (dia, noite), pratos diferentes e a caixa/fachada.
