# 07 · Plano da v0.1 (simulador)

Legenda: **[fechado]** decidido pelo usuário · **[proposta]** sugestão a confirmar.

**Status: fechado em 2026-11-15** (plano e as 4 decisões da seção 7 aceitos).

## 1. Objetivo

Ter uma primeira versão que **funcione no navegador** e valide as decisões de arte e de
arquitetura (`04` e `05`) antes de entrar no jogo de verdade.

Entrega da v0.1 [fechado, vem do roadmap]:
- Janela 120×120 com escala 2×.
- Aquário de 360×240.
- Câmera movida pelo teclado.
- 1 peixe nadando (sprites provisórios).
- Painel de tempo acelerado.

## 2. O que entra e o que não entra [proposta]

**Entra**
- Cenário simples em tiles de 8×8: água em degradê, areia embaixo, algumas rochas.
- Um beta que nada sozinho, vira de lado e muda de altura.
- O beta **cresce com o tempo**: filhote, jovem, adulto e idoso (durações do `03`: 5, 10, 12 e
  3 dias). Com o tempo acelerado, dá para ver isso acontecer em segundos.
- Painel ao lado da tela, com tempo acelerado, "pular para a próxima fase" e "reiniciar".
- Testes automáticos das regras de tempo e de fase.

**Não entra (vem nas próximas versões)**
- Fome, sujeira, pH, saúde, doença, morte e Game Over (v0.2).
- Salvamento, adoção, nomes, espécie e cor (v0.3).
- Reprodução e vários peixes (v0.4).
- Clima, dia e noite (v0.5).
- Raios de luz, bolhas, comida caindo e som.

Na v0.1 o peixe **não morre**: ao chegar ao dia 30, fica como idoso e o painel avisa que o
fim da vida ainda não tem efeito.

## 3. Estrutura dos arquivos [proposta]

Segue a estrutura do `05`. Só cria o que a v0.1 usa.

```
sim/
  index.html            tela do jogo + painel
  estilo.css            visual da página (simples)
  servidor.js           servidor local mínimo (Node, sem instalar nada)
  package.json          só para os comandos "npm start" e "npm test"
  src/
    core/               regras, SEM nada de navegador
      rng.js            sorteio com semente (mesmo resultado em teste e no ESP32)
      clock.js          relógio do jogo: hora atual e velocidade
      fish.js           dados do peixe: posição, direção, idade, fase
      aquarium.js       o mundo 360×240 e a lista de peixes (por enquanto, 1)
    render/             desenho
      palette.js        paleta de 16 cores
      sprites.js        sprites provisórios do beta (3 tamanhos × 4 quadros)
      scene.js          monta o quadro 120×120: fundo, cenário, peixe
      camera.js         qual pedaço do mundo a janela mostra
    input/
      keyboard.js       setas/WASD movem a câmera
    sim/
      panel.js          painel de tempo
    main.js             liga tudo e roda o laço do jogo
  tests/                testes do core (rodam com "node --test")
```

Por que um servidor local: o navegador não deixa um `index.html` aberto direto do disco
carregar módulos JavaScript. O `servidor.js` resolve isso em poucas linhas, com o Node que
você já tem. Para abrir: `npm start` e entrar em `http://localhost:8080`.

## 4. Como cada parte funciona [proposta]

### Tela
- Um `canvas` de **120×120** mostrado em **240×240** (CSS com `image-rendering: pixelated`),
  igual ao aparelho.
- O quadro é montado em um **buffer de 120×120 com cor indexada** (16 cores) e só no fim
  convertido em RGB, como será no ESP32.

### Laço do jogo
- **Passo fixo de 20 por segundo** (`05`, regra 5). A tela é redesenhada a cada passo.
- O **movimento e a animação** do peixe usam tempo real: nadam na mesma velocidade em
  qualquer aceleração.
- O **relógio do jogo** (`Clock`) é que acelera. Dele sai a idade do peixe, então a fase
  muda mais rápido quando aceleramos.
- O `Clock` recebe de fora a fonte de tempo (no teste, uma falsa), como pede a regra 2 do `05`.

### Velocidades do relógio
| Botão | O que faz | Um dia de vida leva |
|---|---|---|
| 1× | Tempo real | 24 h |
| 60× | 1 minuto de jogo por segundo | 24 min |
| 3600× | 1 hora de jogo por segundo | 24 s |
| Pular fase | Vai direto para o começo da próxima fase | — |

### Câmera
- Setas ou WASD movem a janela pelo mundo, a cerca de 60 pixels por segundo.
- Para nos limites do mundo (não mostra nada fora dos 360×240).
- Ela segue só o teclado; **não segue o peixe**.

### Cenário
- Mapa de **45×30 tiles de 8×8**, guardado como uma lista de números (1.350 bytes).
- Água em faixas de azul-esverdeado escuro (mais claro no alto), areia clara nas últimas
  linhas e rochas escuras sobre a areia.
- As cores exatas são provisórias; refinamos ao ver na tela (item em aberto do `04`).

### Peixe
- **Sprites provisórios que eu desenho**, escritos como texto no `sprites.js` (cada letra é
  uma cor da paleta). Assim você consegue editar à mão depois, e um script os converte em
  C++ na Fase B.
- Tamanhos do `04`: filhote ~10×8, jovem ~14×10, adulto ~20×14. O **idoso reutiliza o
  tamanho do adulto**, com cores um pouco mais apagadas [proposta].
- Um lado só desenhado; o outro é o espelho.
- Animação de nadar com 4 quadros.
- Comportamento: escolhe um ponto de destino dentro da água (acima da areia), nada até lá
  em ~15 px/s, vira para o lado certo, espera um instante e sorteia outro destino.
  O sorteio usa o `rng.js`, então o resultado se repete com a mesma semente.

### Painel
Ao lado da tela, fora do aparelho (como no `05`, seção 6):
- Botões de velocidade (1×, 60×, 3600×) e **Pular fase**.
- Hora do jogo: "Dia 12 · 08:30".
- Peixe: nome provisório "Beta", fase e idade ("dia 12 de 30").
- Posição da câmera.
- **Reiniciar:** volta ao começo, com um novo filhote.

## 5. Ordem do trabalho [proposta]

Cada passo termina com um commit.

| Passo | Entrega | Como você confere |
|---|---|---|
| 1 | Pastas, `package.json`, servidor e `index.html` com o canvas 120×120 em 240×240 e a paleta desenhada | Abrir no navegador e ver os 16 quadrados de cor |
| 2 | `rng`, `clock` e seus testes | `npm test` passa |
| 3 | `palette`, `camera`, cenário em tiles e teclado | Ver o aquário e andar a câmera pelas bordas |
| 4 | Sprites, `fish`, `aquarium`: o peixe nadando | Ver o beta nadando e virando |
| 5 | Idade e fases, mais o painel de tempo | Apertar 3600× e ver o peixe crescer |
| 6 | Revisão final e `README.md` com o modo de uso | Roteiro da seção 6 inteiro |

## 6. Como saber que a v0.1 está pronta [proposta]

1. `npm start` abre o simulador em `http://localhost:8080` sem erro.
2. A janela tem **240×240** pixels na tela, feita com pixels nítidos de 2×2.
3. As setas e WASD movem a câmera, que para nas bordas do mundo (360×240).
4. O beta nada sozinho e vira de lado quando muda de direção.
5. Com 3600×, o peixe passa por filhote, jovem, adulto e idoso em cerca de 12 minutos
   (30 dias = 720 horas, e 3600× passa 1 hora por segundo; "Pular fase" encurta isso).
6. `npm test` passa, incluindo: relógio acelerado, mesmo sorteio com a mesma semente, fases
   nas fronteiras de dia 5, 15, 27 e 30, e peixe sempre dentro da água.
7. Nada dentro de `src/core/` usa `document`, `canvas` ou `localStorage`.

## 7. Decisões tomadas [fechado]

1. **Tamanho no computador:** botão **2× / 4×** no painel, que só aumenta a imagem
   (não muda nada do jogo). Entra no passo 5, junto com o painel.
2. **Idoso:** usa o tamanho do adulto, com cores apagadas.
3. **Código:** nomes de arquivos como no `05` (`clock`, `fish`, `aquarium`) e
   **comentários em português**.
4. **Peixe na v0.1:** só nada, sem fome e sem morte.
