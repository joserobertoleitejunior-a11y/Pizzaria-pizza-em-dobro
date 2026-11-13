# Domingo especial — "O Zé só queria uma pizza" (micro história, 25 s)

Idéia: o Zé entra pra comprar UMA pizza e sai com TRÊS. Mostra combo (2 por R$ 65) + entrega grátis com 3 pizzas + o atendente da casa ("mais uma pizza vai ser ótimo!"). Só aos domingos, como especial.

## 1) PROMPT PARA O CHATGPT (gere a imagem do cenário)
Anexe a **foto da fachada** (a mesma do site) e cole:

> Crie UMA ilustração de cenário em formato paisagem 3:2 (1536×1024), estilo desenho animado simples, "doodle" com contorno preto grosso e cores chapadas (sem degradês nem sombras realistas), combinando com bonecos de palito. Use a foto anexa como referência da fachada. **Sem nenhuma pessoa e nenhum personagem** na imagem. É um cenário contínuo que se lê da esquerda para a direita, ao entardecer (céu azul-escuro virando laranja):
>
> **0–35% da largura (esquerda): a rua.** Calçada larga e vazia, um poste de luz aceso, uma árvore pequena, meio-fio e rua cinza com faixa tracejada.
> **35–69% (centro): a fachada da pizzaria**, igual à foto: parede preta, letras vermelhas "PIZZA EM DOBRO" no alto, "DELIVERY" em amarelo com o telefone "15 99705-8390", janelinha quadrada, número 824, base com faixa amarela e vermelha, e o mascote (fatia de pizza amarela com boné vermelho, luvas brancas e tênis vermelhos) pintado na parede, à direita da porta. A **porta de enrolar está aberta**, no centro da fachada, mostrando o interior; capacho preto na entrada.
> **69–100% (direita): o interior** (continua depois da porta, como se a câmera tivesse entrado): parede creme, **três quadros de cardápio na parede com ilustrações de pizza e SEM texto**, balcão preto com luminoso vermelho "PIZZA EM DOBRO", vaso de planta, piso de cerâmica bege.
> **REGRAS DE ENQUADRAMENTO (importante):** o **chão** (calçada, soleira da porta e piso interno) fica numa **única linha horizontal em 81% da altura da imagem** (a partir do topo). A porta aberta fica centrada em 52% da largura. Nada cobrindo o chão. Deixe espaço livre em frente à fachada e em frente ao balcão para os bonecos andarem. Não escreva nenhum outro texto. Sem moldura, sem marca d'água.

**Se a placa "PIZZA EM DOBRO" sair com letra errada**, peça: "Refaça deixando a placa e os quadros em branco" — eu escrevo o texto certo por código em cima.
Mande a imagem aqui. Eu encaixo (linha do chão, porta, balcão) e ligo a câmera.

## 2) PERSONAGENS (em HTML, já prontos)
- **Zé** (cliente): camiseta azul, anda, surpreende, carrega as 3 caixas.
- **Atendente da casa**: **uniforme preto com ombros vermelhos, gola polo, faixa amarela, logotipo da pizzaria no peito (círculo) + crachá "EQUIPE" + boné vermelho com o logo**. Acena e sorri.
- Anda de verdade (passos, braços), balança no lugar, faz cara de surpresa/preocupado/feliz e fala em balões.
Imagens do andamento: `historia-andamento.jpg` e `historia-uniforme.jpg`.

## 3) ROTEIRO (voz A — feminina, narradora) — cole no ElevenLabs
Pausa curta (0.5 s) pra caber em 25 s. Mesmas regras do passo a passo (`ROTEIROS-2.md`): modelo Multilingual v2, Stability 40, Similarity 75, Style 30, não corrigir a escrita.
```
O Zé só queria uma pizza. <break time="0.5s" /> Entrou na Pizza em Dobro e foi ver o cardápio. <break time="0.5s" /> Duas por sessenta e cinco reais, e com três pizzas a entrega é grátis! <break time="0.5s" /> O atendente sorriu: mais uma pizza vai ser ótimo, né? <break time="0.5s" /> O Zé veio comprar uma. Saiu com três! <break time="0.5s" /> Pizza em Dobro. Quem entra, não sai com uma só!
```
## 4) STORYBOARD (cena × câmera × balão)
| # | Tempo | O que acontece | Câmera | Balão (texto na tela) |
|---|---|---|---|---|
| 1 | 0–3,5 s | Zé caminha pela calçada até a fachada | pan largo da rua pra fachada | "Só uma pizzinha!" |
| 2 | –7 s | chega na porta e entra | zoom na porta | — |
| 3 | –12 s | dentro, olha o cardápio, cara de espanto | zoom no quadro | "2 por R$ 65?!" · "3 pizzas, entrega grátis?" |
| 4 | –16 s | atendente (uniforme com logo) acena | zoom no peito/logo e rosto | "Mais uma pizza vai ser ótimo!" |
| 5 | –21 s | Zé sai com 3 caixas | recua | "Eu vim buscar UMA…" · "Valeu cada fatia!" |
| 6 | –25 s | carimbo do logo + fachada | — | "Quem entra, não sai com uma só!" |
Duração real = a do áudio (a gente ajusta cena a cena pela fala).
