# Domingo especial — "O Zé só queria uma pizza" (micro história, ~25 s)

O Zé entra pra comprar UMA pizza e sai com TRÊS. Mostra combo (2 por R$ 65), entrega grátis com 3 pizzas e o atendente da casa. Só aos domingos, como especial.

## 1) PROMPT PARA O CHATGPT — a HISTÓRIA INTEIRA em UMA página de quadrinhos
Anexe a **foto da fachada** e cole (formato retrato 2:3, 1024×1536):

> Crie UMA página de história em quadrinhos, vertical 2:3 (1024×1536), no **estilo dos quadrinhos americanos de super-herói** (arte-final em nanquim forte e dramática, contornos pretos grossos com variação de espessura, cores vibrantes e saturadas, pontilhado de impressão "halftone/Ben-Day" nas sombras, iluminação de cinema, perspectiva dinâmica, linhas de ação) — **mas é uma cena do dia a dia: sem super-heróis, sem capas, sem poderes, sem personagens famosos e sem nenhum logotipo de editora**. Usando a foto anexa como referência da fachada.
> **NENHUMA PESSOA E NENHUM PERSONAGEM nos quadros** (os bonecos entram depois). **Sem balões de fala e sem legendas de texto** (só a placa da loja pode ter texto: "PIZZA EM DOBRO").
> A página tem **5 quadros** com moldura preta grossa e calha branca de 2,5% entre eles, posicionados assim (medidas em % da página, a partir do canto superior esquerdo):
> **Quadro A** (x 3–62%, y 3–31%): a rua e a calçada ao entardecer, poste de luz aceso, árvore, e a **fachada da pizzaria igual à foto** chegando pela direita.
> **Quadro B** (x 64,5–97%, y 3–31%): close na **porta de enrolar aberta** da pizzaria, capacho preto, luz quente saindo de dentro.
> **Quadro C** (x 3–97%, y 33,5–62%): o **interior**, largo: parede creme, **3 quadros de cardápio na parede com ilustração de pizza e SEM texto**, balcão preto com luminoso vermelho "PIZZA EM DOBRO", planta, piso bege.
> **Quadro D** (x 3–50%, y 64,5–97%): o **balcão visto de frente**, com espaço livre atrás dele para uma pessoa em pé, parede ao fundo, luz quente.
> **Quadro E** (x 52,5–97%, y 64,5–97%): a **saída da pizzaria vista de dentro**, porta aberta para a rua de noite chegando, calçada.
> **REGRAS:** em cada quadro, o **chão** (piso ou calçada) é uma **linha horizontal reta a 85% da altura daquele quadro**, com espaço livre à frente para bonecos andarem. Os quadros precisam seguir **exatamente** as medidas acima. Paleta: preto, vermelho #C8281F, amarelo #F5B800, creme. Sem marca d'água.

Dica de qualidade: a página será ampliada (zoom nos quadros). Se o ChatGPT mandar 1024×1536, passe por um ampliador gratuito (Upscayl) em 2× antes de me mandar. Se algum quadro sair fora do lugar, peça "refaça mantendo os quadros nas posições exatas" ou me mande assim mesmo que eu meço e ajusto a câmera.

## 2) PERSONAGENS (HTML, já prontos)
- **Zé:** camiseta azul; anda, se espanta, fica preocupado, carrega as 3 caixas.
- **Atendente (Lu):** uniforme preto + ombros vermelhos + gola polo + faixa amarela + **logo da pizzaria no peito** + crachá "EQUIPE" + boné vermelho com o logo.
(Imagens de andamento: `historia-andamento.jpg`, `historia-uniforme.jpg`. O cenário que aparece ali é provisório; entra a sua página quando chegar.)

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

## 4) STORYBOARD (câmera dando zoom de quadro em quadro)
| Cena | Quadro | Câmera | Quem fala |
|---|---|---|---|
| 1 | A (rua + fachada) | começa aberta e se aproxima do Zé andando | Narradora |
| 2 | B (porta) | zoom na porta, o Zé entra | Zé |
| 3 | C (interior) | pan pelos quadros de cardápio | Zé (2 falas) |
| 4 | D (balcão) | zoom no peito/logo e no rosto da atendente | Lu, Zé |
| 5 | E (saída) | recua e o Zé sai com 3 caixas | Narradora, Zé |
| 6 | cartão final | logo em carimbo + fachada | Narradora |
Efeito extra: o fora-do-quadro escurece (como quem lê um HQ) enquanto a câmera passa de um quadro pro outro.
