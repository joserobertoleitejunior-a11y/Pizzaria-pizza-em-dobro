# Domingo especial — "O Zé só queria uma pizza" (micro história, ~25 s)

O Zé entra pra comprar UMA pizza e sai com TRÊS. Mostra combo (2 por R$ 65), entrega grátis com 3 pizzas e o atendente da casa. Só aos domingos, como especial.

## 1) PROMPT PARA O CHATGPT — página única em estilo HQ (versão "marca grande")
Como as grandes marcas fazem no Instagram: **um visual só, forte e consistente** (paleta da marca, luz de cinema, nada de poluição), **leitura em 1 segundo** e **espaço reservado** pra personagem e texto. Por isso o cenário vem **sem pessoas e sem texto**: os bonecos, balões e preços entram por código, sempre certos e na cor da marca.

**Anexe a foto da fachada** e cole este prompt (em inglês o gerador obedece melhor às regras de composição):

```
Create ONE vertical comic book page, 2:3 aspect ratio, highest resolution available.
ART STYLE: premium American superhero comic book art (bold confident ink lines with varied weight, dramatic cinematic lighting, saturated colors, Ben-Day halftone dots in the shadows, dynamic perspective) BUT it is an everyday scene: NO superheroes, NO capes, NO powers, NO famous characters, NO publisher logos.
BRAND PALETTE: black, warm red (#C8281F), golden yellow (#F5B800), cream (#F3E3C1); warm, appetizing evening light.
REFERENCE: use the attached photo as the exact reference for the storefront (black facade, red "PIZZA EM DOBRO" letters, yellow "DELIVERY", phone "15 99705-8390", number 824, yellow and red stripe at the base, the cartoon pizza-slice mascot painted on the wall right of the door, roll-up door open).
ABSOLUTELY NO PEOPLE AND NO CHARACTERS in any panel. NO speech balloons, NO captions, NO sound effects text. The only text allowed is the storefront sign "PIZZA EM DOBRO".
LAYOUT: a complete story with a BEGINNING, MIDDLE and END: exactly 7 panels with thick black borders and a 2.5% white gutter, positions as % of the page from the top-left corner:
- Panel 1 — OPENING (x 3–97%, y 2–20%): cinematic wide establishing shot of a small Brazilian town street at dusk seen from a slightly high angle, the pizzeria glowing warm in the distance; leave the upper-left third of the panel as empty sky (a title will be added there later).
- Panel 2 (x 3–55%, y 22–42%): eye-level shot of the empty sidewalk with a glowing street lamp and a small tree, the pizzeria storefront (exactly like the photo) on the right side.
- Panel 3 (x 57.5–97%, y 22–42%): close-up of the open roll-up door, black doormat, warm light spilling onto the sidewalk.
- Panel 4 (x 3–97%, y 44–62%): wide interior: cream wall with THREE framed menu posters showing only pizza illustrations (NO text), black counter with a red neon "PIZZA EM DOBRO" sign, a potted plant, beige tiled floor.
- Panel 5 (x 3–48%, y 64–81%): the counter seen from the front, empty space behind it for a person to stand, a stack of pizza boxes on the side, warm light.
- Panel 6 (x 50.5–97%, y 64–81%): the exit seen from inside: open door to the night street, sidewalk outside.
- Panel 7 — ENDING (x 3–97%, y 83–98%): warm cozy home dining room at night: a wooden table with free space on top (pizza boxes will be added), chairs, a window with city lights; leave the upper-right quarter of the panel calm and empty (an ending text will be added there later).
COMPOSITION RULES: in every panel the floor/sidewalk is a straight horizontal line at 85% of that panel's height, with clear empty floor in the center for characters to walk. Keep the important details in the center of each panel (the video will crop each panel to a vertical 9:16 frame). Clean backgrounds, no clutter, sharp details, no watermark, no border text, no signature.
```

**Checklist antes de me mandar** (refaça pedindo só o que errou):
1. Placa escrita certo: "PIZZA EM DOBRO" (se errar: "same image, but leave the storefront sign blank").
2. Nenhuma pessoa/personagem e nenhum balão nos quadros.
3. Os 7 quadros nas posições pedidas (abertura, história e fim) e o chão reto em cada um.
4. Cores da marca (preto, vermelho, amarelo, creme).
Depois passe no **Upscayl (grátis) em 2×** e me mande.

**Plano B (qualidade máxima):** se a página sair borrada no zoom, gere **cada quadro separado**, vertical 9:16, com o mesmo prompt de estilo e a descrição do quadro (ex.: "Panel 1 only, 9:16 vertical"). Eu monto como se fosse uma página e a câmera passa entre eles do mesmo jeito.

## 2) PERSONAGENS (HTML, já prontos)
- **Zé (cliente):** camiseta azul **sem logo**, calça jeans e tênis; anda, se espanta, fica preocupado, carrega as 3 caixas.
- **Atendente (Lu):** polo preta com ombros vermelhos e friso amarelo, gola branca, botões, faixa amarela + **logo pequeno no peito (lado do coração), como bordado** + crachá "EQUIPE" + boné vermelho com o logo.
Visual "quase 3D": volume com luz e sombra em braços, pernas, camisa e cabeça (esfera com brilho), oclusão sob o queixo, olhos com íris e reflexo piscando sozinhos, respiração, tênis com brilho e sombra suave no chão. (Imagens: `personagens.jpg`, `historia-andamento.jpg`, `historia-uniforme.jpg`. O cenário que aparece ali é provisório; entra a sua página quando chegar.)

## 3) ROTEIRO COM VOZES DIFERENTES (ElevenLabs)
**3 vozes, 3 áudios.** Cada voz grava SÓ as falas dela, na ordem, com pausa de 1,2 s entre elas (eu corto nas pausas e encaixo no vídeo). Regras de sempre: Multilingual v2, português do Brasil, Stability 35 (mais emoção) · Similarity 75 · Style 40, não corrigir a escrita, não adicionar nada. Teste antes: `Pizza em Dobro: a pizza, a esfía e o Pics de hoje!`

### 🎙 NARRADORA — voz A (feminina, 30–40, voz de contadora de histórias, calorosa, com um sorriso na voz)
```
Domingo, seis e quarenta e dois da tarde. O Zé só queria uma pizza. <break time="1.2s" /> O Zé veio comprar uma. Saiu com três. <break time="1.2s" /> Pizza em Dobro. Quem entra, não sai com uma só.
```
Direção: 1ª frase leve e curiosa; 2ª com ironia, "uma" e "três" bem marcadas; 3ª firme e sorrindo, final descendo.

### 🎙 ZÉ — voz masculina jovem (25–35, animada, meio atrapalhada, interior de SP)
```
Só uma pizzinha, e já volto! <break time="1.2s" /> Duas por sessenta e cinco reais?! <break time="0.6s" /> Com três, entrega grátis? <break time="1.2s" /> Ah... então põe mais uma. <break time="1.2s" /> Eu vim buscar UMA!
```
(Entre "reais?!" e "Com três" pausa só de 0,6 s: são dois balões da mesma cena.)
Direção: 1ª despreocupado; 2ª e 3ª espantado, subindo o tom; 4ª rendido, rindo; 5ª incrédulo e engraçado, a palavra UMA em destaque.

### 🎙 ATENDENTE LU — voz feminina jovem (22–30, simpática, rápida, sorridente), diferente da narradora
```
E aí, vai levar mais uma? Vai ser ótimo!
```
Direção: sorrindo, tom de quem sabe que o cliente vai ceder.

### Ordem em que eu encaixo (pra você conferir)
1. Narradora (frase 1) → 2. Zé "Só uma pizzinha…" → 3. Zé "Duas por 65…" + "Com três…" → 4. Lu → 5. Zé "Ah… então põe mais uma" → 6. Narradora (frase 2) → 7. Zé "Eu vim buscar UMA!" → 8. Narradora (frase 3).
Total de fala ≈ 20 s; com as pausas fica em até 25 s.

## 4) STORYBOARD (começo, meio e fim — câmera dando zoom de quadro em quadro)
| Cena | Quadro da página | Câmera | Quem fala / o que aparece |
|---|---|---|---|
| Abertura | 1 (cidade ao entardecer) | começa mostrando a página inteira e mergulha no quadro 1; título "DOMINGO ESPECIAL" no céu | Narradora: "Domingo, seis e quarenta e dois…" |
| 1 | 2 (calçada + fachada) | acompanha o Zé andando | Zé: "Só uma pizzinha, e já volto!" |
| 2 | 3 (porta) | zoom na porta, o Zé entra | — (som de sininho opcional) |
| 3 | 4 (interior) | pan pelos quadros de cardápio (preços escritos por código) | Zé: "Duas por R$ 65?!" · "Com 3, entrega grátis?" |
| 4 | 5 (balcão) | zoom na atendente (logo no peito) | Lu: "E aí, vai levar mais uma?…" · Zé: "Ah… então põe mais uma." |
| 5 | 6 (saída) | o Zé sai com 3 caixas | Narradora: "O Zé veio comprar uma. Saiu com três." |
| Fim | 7 (casa) | o Zé chega em casa e põe as 3 caixas na mesa; "FIM" no canto | Zé: "Eu vim buscar UMA!" · Narradora: "Pizza em Dobro. Quem entra, não sai com uma só." |
| Assinatura | cartão final | logo em carimbo + endereço do site (1,5 s) | — |
Efeito extra: quem não está no quadro em foco escurece (leitura de HQ) e, no começo e no fim, a câmera mostra a página inteira por meio segundo, pra o público ver que é uma "historinha".
