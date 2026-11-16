# 08 · Plano da v0.2 (o jogo de verdade)

Legenda: **[fechado]** decidido pelo usuário · **[proposta]** sugestão a confirmar.

**Status: RASCUNHO em 2026-11-16.** Falta o usuário responder as decisões da seção 8.
Nada aqui é código ainda.

## 1. Objetivo

Transformar o peixe que só nada em um **bichinho que precisa de cuidado**: ele sente fome,
a água suja, o pH cai, a saúde acompanha tudo isso, ele pode adoecer, morrer, e o jogo
termina em Game Over. E dar ao jogador os **controles do aparelho** (botões A, B e C e o
menu) para cuidar dele.

Entrega da v0.2 [fechado, vem do roadmap]: fome, sujeira, pH, saúde, ciclo de vida, Game
Over, menu com A/B/C.

## 2. O que entra e o que não entra

**Entra**
- Regras do `03` (seções 2, 3 e 4): saciedade, sujeira, pH, saúde, doença, morte e Game Over.
- Morte natural aos 30 dias (hoje o peixe só fica "idoso" para sempre).
- Botões **A, B, C** (teclado Z, X, C), **menu de ações** (dar comida, limpar, regular pH) e
  **tela de status** (C).
- Avisos na tela (HUD mínimo, conforme `04`): ícones de fome e doença, e peixe doente e peixe
  morto com visual próprio.
- **Tela de Game Over** com mensagem de condolências e o botão de recomeçar.
- Painel do simulador: ver e editar saciedade, sujeira, pH e saúde; matar o peixe.
- Números do jogo em arquivo de configuração (regra 4 do `05`).

**Não entra (vem depois)**
- Salvamento, adoção de verdade, nomes, espécie e cor (v0.3). O "recomeçar" do Game Over
  só cria um filhote beta novo, como o botão Reiniciar de hoje.
- Reprodução, ovos e vários peixes (v0.4). As duas dúvidas do `03` (ovos além do limite de 5
  e segundo parceiro) **só importam lá**; proponho resolvê-las no plano da v0.4.
- Clima, dia e noite (v0.5).
- Som, animação de comer e comida caindo. Na v0.2 a comida só aparece como mensagem.
- Teto para o tempo com o aparelho desligado: depende de salvar o jogo (v0.3) e do ESP32.

O código já aceita vários peixes (`aquarium.peixes`), então as regras serão escritas para
**N peixes**, mesmo que a v0.2 só use 1.

## 3. Os números [proposta, ver seção 6 antes de fechar]

Todos vão para `sim/config/jogo.json`; nenhum fica solto no código.

| O quê | Valor | Vem de |
|---|---|---|
| Valores iniciais | saciedade 100, sujeira 0, pH 7,0, saúde 100 | `03` |
| Saciedade cai | 100 → 0 em 48 h (≈ 2,08 por hora) | `03` [proposta] |
| Comer | +60 (máx. 100) | `03` [proposta] |
| Comer com saciedade > 80 | "excesso": suja a água | `03` [proposta] |
| Sujeira sobe | 0 → 100 em 4 dias (≈ 1,04 por hora) com 1 peixe | `03` [proposta] |
| Cada peixe a mais | +25% no ritmo da sujeira | `03` [proposta] |
| Comida suja a água | +3 (normal) ou +15 (excesso) | **novo [proposta]**, o `03` só diz "um pouco" |
| Limpar | sujeira vai a 0 | `03` |
| pH cai 1 passo a cada | 18 h (sujeira < 30), 12 h (30 a 70), 6 h (> 70) | `03` [proposta] |
| Regular pH | sobe 1 passo (máx. 7,5) | `03` |
| Nota do pH | 6,8 · 7,0 · 7,2 = 100; 6,6 · 7,5 = 60; 6,4 = 30; 6,2 = 0 | `03` [fechada a faixa] |
| Média | (saciedade + (100 − sujeira) + nota do pH) / 3 | `03` [fechado: pesos iguais] |
| Saúde por hora | média ≥ 70: +6 · 40 a 69: 0 · 15 a 39: −3 · < 15: −5 | `03` [proposta] |
| Doente | saúde < 30 | `03` [fechado] |
| Morre | saúde = 0, ou 30 dias de idade | `03` [fechado] |
| Imprópria (para avisos) | saciedade < 30 · sujeira > 70 · pH com nota ≤ 30 | `03` / **nota do pH: novo** |

Duas escolhas técnicas que ninguém precisa decidir, mas ficam registradas:
- O pH é contado em **fração de passo** (um "relógio" que enche até 1), e não em degraus
  de hora cheia. Assim as regras funcionam igual a 1×, 60× ou 3600×.
- Todas as taxas usam **o tempo do jogo que passou** desde o passo anterior, não um valor
  fixo por passo. Assim o resultado não depende da velocidade escolhida.

## 4. Como cada parte funciona [proposta]

### Núcleo (`core/`, sem navegador)
- **`rules.js` (novo):** a cada passo recebe o aquário e o tempo de jogo que passou e
  atualiza saciedade, sujeira, pH, saúde, doença e morte, nesta ordem. É a única parte
  que conhece as fórmulas.
- **`aquarium.js`:** ganha `sujeira`, `ph` (guardado como posição na lista de 7 passos),
  as ações `darComida()`, `limparAquario()`, `regularPh()` e a lista de **eventos** do passo.
- **`fish.js`:** ganha `saciedade`, `saude`, `estado` (`saudavel`, `doente`, `morto`) e
  `causaDaMorte` (`velhice` ou `cuidado`). Peixe doente nada na metade da velocidade.
  Peixe morto para de nadar e sobe devagar até a superfície.
- **`events.js` (novo):** lista simples de avisos para a interface ("peixe adoeceu",
  "peixe morreu", "game over", "comeu", "excesso"). O `core` só os registra; quem mostra
  é a interface. Esse é o mesmo caminho que vai tocar o buzzer no ESP32.
- **`menu.js` (novo):** a máquina de telas (jogo, menu, status, game over) e o item
  selecionado. Sem navegador, porque a lógica vai para o C++ igual.
- **Fim da vida:** `faseDaIdade` continua devolvendo "idoso" depois dos 30 dias; quem mata
  é a regra de idade em `rules.js`. O aviso de "fim da vida sem efeito" do painel sai.

### Controles (`05`, seção 7, e `02`, "Controles")
| Aparelho | Teclado | Menu fechado | Menu aberto |
|---|---|---|---|
| Joystick | setas / WASD | move a câmera | navega pelos itens |
| A | Z | abre o menu | confirma |
| B | X | (nada) | volta / fecha |
| C | C | abre a tela de status | (nada) |

O jogo **não pausa** com o menu aberto: o tempo segue e a câmera fica parada.
O teclado ganha o conceito de "apertou agora" (uma vez por aperto) para os botões.

### Menu de ações
Três itens: **Dar comida**, **Limpar aquário**, **Regular pH**. Depois de confirmar, o
menu fecha e aparece uma mensagem curta (cerca de 2 s) no rodapé:
- "Comida servida" · "Ele já estava cheio! A água suja." (excesso)
- "Aquário limpo"
- "pH subiu para 7,2" · "pH já está no máximo" (não gasta nada)

### Tela de status (botão C)
Nome, fase e idade; barras de saciedade, sujeira e saúde; pH em número; estado
(saudável, doente). É uma tela só, ocupando os 120×120.

### Avisos no jogo (HUD mínimo)
- Ícone de **fome** sobre o peixe (saciedade < 30) e de **doente** (saúde < 30).
- Três mini-ícones no canto superior (fome, sujeira, pH) que só aparecem quando aquele
  indicador está impróprio. O número exato fica no status.
- Peixe doente: cores pálidas e nado lento (`04`: "doente 2 quadros"). Na v0.2 reaproveito a
  troca de cores que o idoso já usa, com um tom mais pálido e esverdeado, em vez de desenhar
  quadros novos.
- Peixe morto: de barriga para cima, boiando na superfície.

### Texto na tela
O jogo hoje não escreve nada nos 120×120. Preciso de uma **fonte de pixels** própria
(`render/fonte.js`), em letras pequenas (cerca de 4×6 pixels, ~24 letras por linha) e com
**acentos**, porque as mensagens são em português.

### Morte e Game Over
1. A saúde chega a 0 (ou o peixe completa 30 dias): ele **morre** e boia por alguns
   segundos (tempo real, cerca de 5 s, para você ver o que aconteceu).
2. Se não resta nenhum peixe vivo, aparece o **Game Over**.
3. A tela mostra a mensagem de condolências e a opção **A: novo filhote**.
4. Enquanto estiver no Game Over, as regras ficam congeladas.

Duas mensagens, conforme a causa (textos meus, **você edita**):
- Velhice: "Seu peixe viveu uma vida longa. Obrigado por cuidar dele."
- Falta de cuidado: "Seu peixe não resistiu. Cuidar também é aprender. Que tal tentar de novo?"

### Painel do simulador
Além do que já existe: mostra saciedade, sujeira, pH e saúde; campos para **editar** os
quatro valores; botões "Matar peixe" e "Dar comida / Limpar / Regular pH" (os mesmos do
menu, para testar sem o teclado). Os botões do painel e do menu chamam as mesmas funções
do `core`.

## 5. Ordem do trabalho [proposta]

Cada passo termina com um commit; a versão fecha com a tag `v0.2`.

| Passo | Entrega | Como você confere |
|---|---|---|
| 1 | `config/jogo.json`, `rules.js` e os 3 indicadores (saciedade, sujeira, pH) com testes | `node --test` passa |
| 2 | Saúde, doença, morte (fome e velhice) e Game Over lógico, com testes de "sobrevive X dias" | `node --test` passa |
| 3 | Fonte de pixels, HUD, peixe doente e peixe morto | Pelo painel, baixar a saciedade e ver o peixe adoecer e boiar |
| 4 | Botões A, B, C, menu de ações e tela de status | Dar comida e limpar de verdade, pelo teclado |
| 5 | Tela de Game Over, "novo filhote" e o painel com os valores | Deixar o peixe morrer com 3600× e ver o Game Over |
| 6 | Balanceamento, README, resultado da conferência e a tag | Roteiro da seção 7 inteiro |

## 6. Conferência dos números [achado importante]

Simulei os números do `03` (um peixe só, comida a cada 24 h, valores como na seção 3) para
ver **quanto tempo o peixe aguenta**. A ideia do `03` era proteger períodos longe de casa.
Veja o que acontece:

| Rotina de cuidado | Fica doente em | Morre em |
|---|---|---|
| Nenhum cuidado | 2,7 dias | **2,9 dias** |
| Só comida, 1 vez por dia | 3,3 dias | 3,7 dias |
| Comida diária, limpar a cada 3 dias, pH a cada 3 dias | 5,9 dias | 8,8 dias |
| Comida diária, limpar a cada 4 dias, pH a cada 4 dias | 3,3 dias | **3,7 dias** |
| Comida diária, limpar a cada 2 dias, pH a cada 2 dias | nunca | nunca |

O que isso quer dizer:
- **Quem se ausenta 3 dias, perde o peixe.** Um fim de semana prolongado é fatal.
- Para viver 30 dias é preciso **limpar a cada 2 dias, regular o pH a cada 2 dias e
  alimentar todo dia**. Isso é um bichinho exigente.
- O **pH é o que mais pesa**: cai 1 passo a cada 18 h na água limpa, ou seja, 1,3 passo
  por dia, e só 3 dos 7 passos são ideais.

Se quiser um jogo **mais tranquilo**, a menor mudança é deixar o pH mais lento
(1 passo a cada **36 h / 24 h / 12 h** em vez de 18 / 12 / 6):

| Rotina | Nenhum cuidado | Limpar e pH a cada 3 dias |
|---|---|---|
| pH como está no `03` (18 / 12 / 6 h) | morre em 2,9 dias | morre em 8,8 dias |
| pH mais lento (36 / 24 / 12 h) | morre em 3,6 dias | morre em 11,8 dias |
| pH bem lento (48 / 36 / 18 h) | morre em 4,2 dias | morre em 14,9 dias |

Mesmo com o pH bem lento, ficar 4 dias fora ainda mata. Para aguentar mais, o caminho é
mexer na **sujeira** (hoje 4 dias para ir a 100) ou na **velocidade de queda da saúde**.
Teste: pH bem lento **e** sujeira em 6 dias (144 h) leva a "nenhum cuidado" a 4,8 dias, e
a rotina "comida diária, limpar e pH a cada 3 dias" passa a sobreviver os 30 dias.

*(Simulação feita fora do projeto, hora a hora, com a média e as faixas do `03`. A v0.2 vai
trazer isso como teste automático.)*

**Recomendação:** implementar os números como estão no `03` **em `config/`**, e ajustar
depois de jogar um pouco no simulador (com 3600× dá para testar uma rotina de 30 dias em
12 minutos). Mas é bom você decidir já a pergunta 1 da seção 8, porque ela diz para qual
lado ajustar.

## 7. Como saber que a v0.2 está pronta [proposta]

1. `node --test` passa, incluindo:
   - cada indicador muda no ritmo da tabela da seção 3 (e com a mesma taxa a 1×, 60× e 3600×);
   - dar comida (normal e em excesso), limpar e regular pH, inclusive no limite (pH 7,5);
   - saúde sobe, fica estável e cai nas faixas certas da média;
   - doente abaixo de 30 e morte em 0, com a causa certa;
   - morte natural aos 30 dias;
   - Game Over só quando não resta peixe vivo;
   - a rotina "limpar e pH a cada 2 dias, comida diária" sobrevive 30 dias, e "nenhum cuidado" morre
     entre 2 e 4 dias (valores atualizados se o balanceamento mudar).
2. No simulador, pelo teclado: **Z** abre o menu, setas escolhem, **Z** confirma, **X** volta,
   **C** mostra o status.
3. Com 3600× e nenhum cuidado, o peixe passa por: fome, doente, morto, Game Over, e o
   **A** cria um filhote novo.
4. As mensagens aparecem sem cortar letras e os acentos saem certos.
5. Nada em `src/core/` usa `document`, `canvas`, `localStorage` ou `window`.
6. Os números do jogo estão só em `config/jogo.json`.

## 8. Decisões que preciso de você

Marque o que concordar; o que não marcar eu sigo com a recomendação.

1. **Quão exigente deve ser o bichinho?** (a seção 6 mostra os números)
   - **(a)** Como está no `03`: cuidar a cada 2 dias, 3 dias sem ninguém mata.
   - **(b)** *Recomendo:* **pH mais lento** (36 / 24 / 12 h), e ajusto o resto jogando.
   - **(c)** Mais tranquilo ainda: pH bem lento (48 / 36 / 18 h) e sujeira em 6 dias. Sem
     nenhum cuidado ele morre em 4,8 dias, e comida diária com limpeza e pH a cada 3 dias
     o mantém vivo os 30 dias.
2. **Comida suja a água:** +3 normal e +15 em excesso (saciedade > 80)? São números meus.
3. **Menu:** os 3 itens (comida, limpar, pH) e os botões A, B, C como na tabela da seção 4
   (é a proposta do `02`, que continua **pendente de confirmação**)?
4. **Peixe morto:** boia na superfície por ~5 s e depois vem o Game Over?
5. **Mensagens de condolências:** os dois textos da seção 4 servem, ou quer escrever os seus?
6. **Acentos na fonte:** sim (recomendo, as mensagens são em português) ou prefere texto
   sem acento para a fonte ficar mais simples?
7. **Dúvidas do `03` sobre ovos e segundo parceiro:** deixo para o plano da v0.4?
8. **Números em JSON:** o `05` pede `config/` em JSON. O navegador vai carregar o arquivo
   no início e entregar ao `core`, que continua sem navegador. Tudo bem?

## 9. Resultado da conferência da v0.2

*(a preencher ao final, como na seção 8 do `07`)*
