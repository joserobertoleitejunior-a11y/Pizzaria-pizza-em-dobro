# Domingo especial — "Como o Zé foi comprar UMA pizza e voltou com TRÊS?" (até 25 s)

## A ideia (gancho nos 2 primeiros segundos)
Começa pelo FIM, como série: o Zé chegando em casa equilibrando **3 caixas**, quase derrubando tudo, e a narradora pergunta **"Como é que o Zé foi comprar UMA pizza… e voltou com TRÊS?"**. Rebobina (efeito de fita voltando + "15 MINUTOS ANTES") e a história mostra o porquê. Quem assiste fica até o fim pra ver a resposta, e o final fecha o círculo: a família vibra com as 3 pizzas.
Outros ganchos que testei e por que ficaram de reserva: tropeço (engraçado, mas não explica nada), pizzaria lotada (passa ideia de fila e demora), barriga roncando (bom, entra como 2º momento).

| Tempo | O que acontece | Quadro da página |
|---|---|---|
| 0–2,5 s | **GANCHO:** Zé na porta de casa, 3 caixas balançando · "Como é que o Zé foi comprar UMA… e voltou com TRÊS?" | 1 |
| 2,5–3,5 s | rebobina + "15 MINUTOS ANTES" | página inteira girando rápido |
| 3,5–7 s | Zé na rua, a barriga ronca ("GRRR" em letra de HQ), sente o cheiro e segue pela rua até a pizzaria | 2 (a rua real) |
| 7–9 s | chega na fachada e entra | 3 |
| 9–13 s | vê o cardápio: "Duas por R$ 65?!" · "Com 3, entrega grátis?" | 4 |
| 13–17 s | atendente: "E aí, vai levar mais uma? Vai ser ótimo!" · Zé: "Ah… então põe mais uma." | 5 |
| 17–20 s | volta pra rua com 3 caixas: "Eu vim buscar UMA!" | 6 |
| 20–24 s | em casa, as 3 caixas na mesa e a família vibrando · "Pizza em Dobro. Quem entra, não sai com uma só." + logo em carimbo | 7 |

## 1) QUADRO DE REFERÊNCIA (você manda os prints, eu monto)
O ChatGPT grátis aceita **1 imagem**. Então eu junto tudo numa imagem só: **em cima a fachada (foto do site)**, **embaixo os prints do Street View numerados** (1 vindo pela esquerda, 2 de frente, 3 vindo pela direita, 4 esquina). Você anexa só essa imagem.

## 2) PROMPT PARA O CHATGPT (anexe o quadro de referência e cole)
```
Create ONE vertical comic book page, 2:3 aspect ratio, highest resolution available.
ART STYLE: premium American superhero comic book art (bold confident ink lines with varied weight, dramatic cinematic lighting, saturated colors, Ben-Day halftone dots in the shadows, dynamic perspective) BUT it is an everyday scene: NO superheroes, NO capes, NO powers, NO famous characters, NO publisher logos.
BRAND PALETTE: black, warm red (#C8281F), golden yellow (#F5B800), cream (#F3E3C1); warm, appetizing evening light.
REFERENCE BOARD: the attached image is a reference board. TOP = the real storefront: copy it exactly (black facade, red "PIZZA EM DOBRO" letters, yellow "DELIVERY", phone "15 99705-8390", number 824, yellow and red stripe at the base, the cartoon pizza-slice mascot painted on the wall right of the door, roll-up door open). BOTTOM (numbered screenshots) = the real street around it: use them for the sidewalk, neighbor buildings, trees and poles, recognizable but cleaned up (no cars blocking, no readable signs of other shops). Do not draw the reference board itself, only use it as reference.
ABSOLUTELY NO PEOPLE AND NO CHARACTERS in any panel. NO speech balloons, NO captions, NO sound effect text. The only text allowed is the storefront sign "PIZZA EM DOBRO".
LAYOUT: a complete story with BEGINNING, MIDDLE and END, exactly 7 panels with thick black borders and a 2.5% white gutter, positions as % of the page from the top-left corner:
- Panel 1 — OPENING (x 3–97%, y 2–20%): the front door of a simple, cozy Brazilian house at night, warm porch light, door slightly open, short sidewalk in front; leave the upper-left third calm (a title will be added).
- Panel 2 (x 3–55%, y 22–42%): eye-level view walking down the REAL street from the reference, early evening, the pizzeria storefront glowing at the end of the sidewalk on the right side.
- Panel 3 (x 57.5–97%, y 22–42%): the storefront up close, exactly like the reference, roll-up door open, black doormat, warm light spilling onto the sidewalk.
- Panel 4 (x 3–97%, y 44–62%): wide interior: cream wall with THREE framed menu posters showing only pizza illustrations (NO text), black counter with a red neon "PIZZA EM DOBRO" sign, a potted plant, beige tiled floor.
- Panel 5 (x 3–48%, y 64–81%): the counter seen from the front, empty space behind it for a person to stand, a stack of pizza boxes on the side, warm light.
- Panel 6 (x 50.5–97%, y 64–81%): the same real street at night seen from the pizzeria door, sidewalk leading away, street lamps on.
- Panel 7 — ENDING (x 3–97%, y 83–98%): warm cozy home dining room at night: a wooden table with free space on top (pizza boxes will be added), chairs around it, a window with city lights; leave the upper-right quarter calm (an ending text will be added).
COMPOSITION RULES: in every panel the floor/sidewalk is a straight horizontal line at 85% of that panel's height, with clear empty floor in the center for characters to walk. Keep the important details in the center of each panel (each panel will be cropped to a vertical 9:16 video frame). Clean backgrounds, no clutter, sharp details, no watermark, no signature.
```
Se errar, peça só a correção: placa errada → `Same image, but leave the storefront sign blank.` · apareceu gente → `Same image, remove all people.` · quadros fora do lugar → `Same image, keep the 7 panels exactly in the positions described.`
Depois: **Upscayl (grátis) 2×** e me mande.

## 3) VOZES (ElevenLabs) — 3 vozes, cada uma grava só as falas dela, na ordem, com pausa de 1,2 s
Multilingual v2 · português do Brasil · Stability 35 · Similarity 75 · Style 40 · não corrigir a escrita · não adicionar nada.

**NARRADORA** (voz A — calorosa, contadora de histórias, com suspense no começo)
```
Como é que o Zé foi comprar UMA pizza... e voltou com TRÊS? <break time="1.2s" /> Quinze minutos antes... <break time="1.2s" /> Pizza em Dobro. Quem entra, não sai com uma só.
```
Direção: 1ª devagar, mistério, "UMA" e "TRÊS" marcadas; 2ª sussurrada e rápida; 3ª firme e sorrindo.

**ZÉ** (masculina jovem, animada, meio atrapalhada, interior de SP)
```
Que cheiro é esse?! <break time="1.2s" /> Duas por sessenta e cinco reais?! <break time="0.6s" /> Com três, entrega grátis? <break time="1.2s" /> Ah... então põe mais uma. <break time="1.2s" /> Eu vim buscar UMA!
```
Direção: 1ª farejando, animado; 2ª e 3ª espantado; 4ª rendido, rindo; 5ª incrédulo e engraçado.

**ATENDENTE LU** (feminina jovem, simpática, diferente da narradora)
```
E aí, vai levar mais uma? Vai ser ótimo!
```

**Efeitos (opcional, ElevenLabs → Sound Effects, plano grátis):** `cartoon stomach growl` · `tape rewind whoosh` · `small shop door bell` · `crowd cheering short`. Mande os MP3 que eu encaixo.

## 4) PERSONAGENS (HTML, prontos)
Zé (camiseta azul lisa, jeans, tênis) e atendente Lu (polo preta com ombros vermelhos, logo pequeno bordado no peito, crachá "EQUIPE", boné com logo), com volume "quase 3D", olhos piscando e respiração. Para o final eu acrescento a família (2 bonecos) comemorando na mesa.

## 5) PRA VIRALIZAR (checklist aplicado neste vídeo)
1. **Gancho em 1 segundo, com TEXTO na tela** (muita gente vê sem som): primeiro quadro já com a frase grande **"Fui comprar UMA pizza…"** e as 3 caixas balançando.
2. **Situação que todo mundo já viveu** (ir comprar uma e voltar com mais) → gera identificação e **marcação de amigo**.
3. **Loop perfeito:** o último quadro emenda no primeiro (o Zé na porta de casa), então o Reels recomeça sem corte e conta como "assistido de novo" — é o que mais empurra o vídeo.
4. **Curto:** alvo **18–22 s**. Cada cena com movimento novo a cada 1,5–2 s (zoom, balão, efeito).
5. **Pergunta que puxa comentário** na legenda do post e na tela final: **"Você leva uma ou já pede três? 🍕"**.
6. **Série com personagem fixo:** "As aventuras do Zé — ep. 1". Personagem que volta toda semana cria público que espera o próximo.
7. **Na hora de postar:** sexta a domingo, 18h–19h30 · localização "Itapetininga" · 3 a 5 hashtags locais (#itapetininga #pizzaitapetininga #pizzaemdobro #deliveryitapetininga) · comentário fixado com o link do site · responder os primeiros comentários na primeira hora.
8. **Áudio:** voz + efeitos no vídeo; se quiser música, use uma do próprio Instagram (biblioteca do Reels) em volume baixo — áudio em alta ajuda na distribuição.
9. **Collab:** postar como colaboração com um perfil local (influenciador ou página da cidade) dobra o alcance de graça.

**Legenda pronta do post:**
`Fui comprar UMA pizza… 🍕😅 Quem nunca? Você leva uma ou já pede três? Marca aquele amigo que faz isso! 👇 Combo 2 por R$ 65 e entrega grátis com 3 pizzas. Peça pelo site (link no perfil). #itapetininga #pizzaitapetininga #pizzaemdobro #deliveryitapetininga`
