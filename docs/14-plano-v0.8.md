# 14 · Plano da v0.8 (minigame "Caçar")

**Escrito e implementado em 20/11/2026** (o usuário disse "pode" e aceitou as 5 recomendações da seção 8; resultado na seção 9, que também diz quais números mudaram na hora de fazer). O que o usuário
pediu está marcado **[fechado]**; tudo o que eu completei está marcado **[proposta]**.

## 1. O que o usuário pediu [fechado]

- No menu (botão **A**) entra uma opção nova: **"Caçar"**.
- A caçada dura **1 minuto**. São jogadas **minhoquinhas / mini larvas** na água; o beta caça e come.
- As larvinhas **fogem** dele.
- **Joystick** controla o peixe. **A** abre um menu que **pausa** o jogo, com as opções de **reiniciar** ou
  **sair** do modo. **B** **acelera** o nado, ajudando na caçada.
- **Objetivo:** pegar o maior número de larvinhas e **salvar o recorde**.
- A **câmera** fica **travada no peixe** o tempo todo.

## 2. Como as peças de hoje se encaixam

- O menu (`core/menu.js`) é uma máquina de telas (`JOGO`, `MENU`, `STATUS`...). A caçada vira **uma tela nova**
  (`CACADA`), com seus próprios estados por dentro.
- O peixe hoje nada sozinho (`core/fish.js`, `atualizarPeixe`). Na caçada **quem manda é o joystick**.
- A câmera tem 120×120 e o mundo 240×152 (`render/camera.js`): a câmera "travada no peixe" cabe sem problema
  (ela só não sai do mundo).
- A tecla **B** hoje só dá "aperto" (`keyboard.botoes()`). Acelerar pede saber se está **segurada**: entra
  uma leitura nova no teclado (no aparelho é a leitura do botão, a mesma ideia).
- Os números ficam em `config/jogo.json` (seção `cacada`) e os textos em `config/textos.json`, como no resto.

## 3. Como funciona [proposta]

### 3.1 Quem caça e quando pode

- Caça o **peixe em foco** (o da tela de status). Precisa estar **vivo e saudável** (nem *doente* nem *muito
  doente*) e **não namorando**. Se não der, aparece uma mensagem curta ("Ele está fraco demais para caçar."),
  igual às mensagens do "Adotar parceiro".
- Qualquer fase serve; a boca fica na frente do peixe e o tamanho dele muda o alcance.
- Se o peixe **morrer** durante a caçada, ela termina na hora e o fluxo normal volta (Game Over etc.).

### 3.2 Fluxo da partida

1. **Menu → Caçar** → contagem **3, 2, 1** (3 s), a câmera já travada no peixe.
2. **Jogando:** 60 s de tempo **real** (não acelera com o 60×/3600× do painel). Pegar uma larva = +1.
3. **A** em qualquer momento → **pausa** (tempo, larvas e peixe congelam) com o menu:
   **Continuar · Reiniciar · Sair**. **B** na pausa também continua.
4. O tempo acabou → **tela de resultado**: "Larvas: N", "Recorde: M" e **NOVO RECORDE!** se bateu.
   **A** = jogar de novo · **B** = sair.
5. **Sair** (pausa ou resultado) volta ao aquário normal, peixe no lugar onde está.

### 3.3 Controles

| Botão | Na caçada |
|---|---|
| Joystick | Nada para onde apontar (8 direções no teclado; no aparelho, analógico). Soltou = para. |
| **B** (segurado) | Acelera enquanto estiver segurado. Sem limite de fôlego (você não pediu um; fica fácil de acrescentar depois). |
| **A** | Abre/fecha o menu de pausa. |
| **C** | Não faz nada na caçada. |

### 3.4 As larvinhas

- Ficam **dentro da água**, nos mesmos limites do peixe. **8 ao mesmo tempo**; quando uma é comida, outra
  aparece depois de ~0,8 s, **longe do peixe** (pelo menos 50 px) e sempre dentro da água.
- **Sem ameaça por perto** passeiam devagar (10 px/s), mudando de direção de vez em quando.
- **Peixe a menos de ~30 px:** fogem para o lado oposto, a ~44 px/s, com um pouco de aleatoriedade (zigue-zague) para
  não serem previsíveis. Nas paredes elas escorregam, e **uma larva encurralada no canto fica mais fácil**.
- A conta de velocidade é o coração da dificuldade: peixe normal **38 px/s** < fuga **44 px/s** < peixe com B **66 px/s**.
  Ou seja, **só no vai e vem não alcança: é preciso usar o B** na hora certa, e ele cansa quem erra o ângulo.
  (Para comparação, o beta passeando no aquário nada a 15 px/s.)
- Pegou: a **boca** do peixe (um ponto na frente do corpo) chega a **6 px** da larva.
- **Aparência:** minhoca de ~6×2 px, ondulando em 2 quadros, em tom claro (cor que já existe na paleta; ela
  tem só 3 índices sobrando). Ao ser comida some com um estalinho de 2-3 pixels.

### 3.4.1 O resto do aquário durante a caçada

- Os **outros peixes** continuam nadando normalmente (o peixe caçador só é pulado nas regras de passeio, com um
  marcador `controlado`). A comida, o cocô, o clima e as regras de fome/sujeira/pH **continuam como sempre**
  (1 minuto real não muda nada de importante).
- **Na pausa e no resultado**, o aquário também congela (não chamo `aquario.atualizar`): as regras recuperam o
  minuto parado no passo seguinte, como já acontece com a aba escondida.
- **Comer larvas não altera fome, saúde nem sujeira.** É só um jogo. [Dúvida 2, seção 8]

### 3.5 Recorde

- Guardado no arquivo salvo (`recordeCacada`, campo opcional: o arquivo da v0.7 abre sem ele, como nas versões
  anteriores) e **sobrevive ao Game Over e a uma nova adoção**. **"Apagar jogo"** do painel o apaga junto
  (é o que o botão promete: apagar tudo).
- Grava na hora em que a partida termina com novo recorde (e já salva o jogo).
- Recorde único (não por peixe, nem por cor).

### 3.5.1 Tela durante a caçada

- Faixa de cima (preto sólido, texto branco): **tempo restante** (ex.: `0:42`), **larvas** (`LARVAS 5`) e
  **recorde** (`REC 12`). Sem HUD de indicadores (o B agora é acelerar).
- Contagem: número grande no centro. Pausa e resultado: mesma caixa do menu de hoje.
- O brilho/escuro do clima, a chuva e o resto do cenário continuam sendo desenhados.

## 4. O que muda no código [proposta]

| Peça | Arquivo | O que faz |
|---|---|---|
| Regras da caçada (puro, testável) | `core/cacada.js` (novo) | `criarCacada({ config, rng })`: estado (`contagem`/`jogando`/`pausa`/`fim`), tempo, larvas, pontos, recorde. `atualizar(dt, entrada)`, `pausar`, `reiniciar`. Sem `Date`, sem DOM. |
| Peixe controlado | `core/fish.js` | `atualizarPeixeControlado(peixe, dt, dir, acelerando)`: move, vira, respeita os limites do peixe. |
| Aquário | `core/aquarium.js` | O laço de peixes pula quem tem `controlado`. |
| Menu | `core/menu.js` | Ação `cacar` no fim de `ACOES`; tela `CACADA`; botões de cada estado; `menu.cacada`. |
| Teclado | `input/keyboard.js` | `segurando('b')`: o botão está apertado agora? |
| Câmera | `main.js` | Com a caçada aberta, `camera.irPara(peixe.x - 60, peixe.y - 60)` a cada passo; sem o seguidor automático. |
| Desenho | `render/cacada.js` (novo) + `render/telas.js` | Larvas, faixa de cima, contagem, pausa, resultado. |
| Salvamento | `core/salvar.js` | Campo opcional `recordeCacada` (validado: inteiro ≥ 0). |
| Números / textos | `config/jogo.json` (`cacada`), `config/textos.json` | duração, velocidades, raios, quantidade de larvas; textos do menu, pausa e resultado. |
| Painel de testes | `sim/panel.js` | Botão "Zerar recorde" e linha com o recorde. |
| Testes | `tests/cacada*.test.js` | Fuga, captura, tempo, pausa, reiniciar, recorde, salvar, tela, menu. |

**Fora desta versão** (ideias para depois): som no buzzer, caçar pela página do celular, ranking por peixe,
tipos diferentes de larva, fôlego do B, fome como bônus (comer larva saciar o peixe).

## 5. Passos de implementação

1. `config` (números e textos) + `core/cacada.js` com testes (larvas, fuga, captura, tempo, pausa, recorde).
2. `fish.js` (peixe controlado) + `aquarium.js` + teclado (`segurando`) com testes.
3. `menu.js`: ação "Caçar", tela, botões de cada estado, regras de quem pode caçar. Testes.
4. `main.js`: câmera travada, entrada do joystick/B, recorde carregado e salvo; `salvar.js` com o campo novo.
5. Desenho: larvas, faixa, contagem, pausa, resultado. Conferir no navegador (porta diferente da 8080).
6. Painel (recorde), docs (resultado aqui, `03`, `CLAUDE.md`, memória), commit e tag `v0.8`.

## 6. Equilíbrio

A dificuldade fica em `cacada` no `jogo.json` e se ajusta jogando (como o resto): velocidade do peixe,
do B, da fuga, o raio de susto, o número de larvas e o tempo. A referência de "bom jogo" que proponho:
um jogador mediano pega **8 a 12 larvas** em 60 s; quem domina o B passa de 20. Vou conferir com um bot de
teste (em `tools/`, como o `balanco.js`) antes de fechar os números.

## 7. Riscos

- **Peixe e larva muito rápidos para 120×120 pixels:** a janela mostra pouco do mundo; se a larva fugir para
  fora da tela, o jogador perde de vista. Mitigação: 240 de mundo e 120 de janela = a larva fica no máximo a
  ~1 tela de distância; o spawn é perto o bastante (50 a 90 px). Ajusto jogando.
- **Paleta cheia** (3 índices livres): a larva usa uma cor que já existe.
- **Teclado:** segurar B e as setas juntas funciona em quase todo teclado; combinações com 3+ teclas podem falhar
  em teclados baratos (o aparelho real não tem esse problema).

## 8. Para você confirmar

1. **Pode caçar só o peixe vivo e saudável** (não doente, não namorando)? **Recomendo sim.** Se preferir, deixo
   caçar até doente (só mais lento).
2. **Comer larva não mexe em fome/saúde** (é só diversão)? **Recomendo sim,** para o minigame não virar
   um jeito de alimentar sem sujar a água. Alternativa: cada larva sacia um pouco.
3. **Recorde único**, que sobrevive ao Game Over e é apagado só no "Apagar jogo"? **Recomendo sim.**
4. **Pausa com 3 opções** (Continuar · Reiniciar · Sair) e contagem **3-2-1** antes de começar?
   **Recomendo sim** (você pediu reiniciar e sair; Continuar é o que falta para voltar a jogar).
5. **Dificuldade:** o B é **necessário** para alcançar uma larva em fuga (peixe normal mais lento que ela)?
   **Recomendo sim,** é o que dá sentido ao botão. Ajustável depois no `jogo.json`.

## 9. Resultado

Passos 1 a 6 feitos; **712 testes passando** (eram 674 na v0.7; 38 novos). Conferido no navegador (porta 8092, com
uma pasta de salvamento temporária, para não tocar no jogo do usuário): item "Caçar" no menu, contagem, câmera travada no
peixe, larvas ondulando, pausa com as 3 opções, tela de fim com "NOVO RECORDE!", recorde gravado no arquivo e de volta
depois de recarregar a página.

### 9.1 O que mudou em relação ao plano

| Ponto | Plano | Feito | Por quê |
|---|---|---|---|
| Larvas ao mesmo tempo | 8 | **5** | Com 8 sempre havia uma colada no peixe. |
| Fuga / susto / volta | 44 px/s · 30 px · 0,8 s | **50 px/s · 34 px · 1,5 s** | Um bot "perfeito" fazia 76 larvas; agora faz ~44 (sem B, ~14). |
| Onde a larva pode ficar | toda a água | **só onde a boca alcança** (`limitesDaLarva`) | O teste com o bot achou larvas coladas no teto/chão que o peixe nunca alcançava. |
| Larva na parede | escorrega | **escorrega ao longo dela**; só o canto não tem saída | Ficou mais justo e mais difícil de encurralar. |
| Painel | botão "Zerar recorde" | idem, e mostra o recorde | |

Peixe 38 px/s < fuga 50 px/s < B 66 px/s: o B continua sendo necessário (sem ele, o bot faz um terço).
Referência do bot (`node tools/cacada.js`, em `sim/`): guloso 43 · sem B 14 · sempre B 45. Um humano deve ficar bem
abaixo disso; **ajuste os números em `jogo.json` > `cacada` jogando**.

### 9.2 O que foi construído

| Peça | Arquivo |
|---|---|
| Regras da caçada (estados, larvas, fuga, captura, pausa, recorde) | `sim/src/core/cacada.js` |
| Peixe controlado | `core/fish.js` (`atualizarPeixeControlado`, `controlado`), `core/aquarium.js` (pula quem é controlado) |
| Menu: item "Caçar", tela `CACADA`, quem pode caçar | `core/menu.js` (`criarMenu` agora recebe `config` e `semente`) |
| B segurado | `input/keyboard.js` (`segurando('b')`) |
| Câmera travada, congelar na pausa/fim | `main.js` |
| Desenho | `render/cacada.js` (larvas, faixa, contagem, pausa, fim), `render/scene.js`, `render/telas.js` |
| Recorde no arquivo (campo opcional `recordeCacada`) | `core/salvar.js` |
| Painel | `sim/index.html`, `sim/src/sim/panel.js` |
| Balanceamento | `sim/tools/cacada.js` |
| Testes | `tests/cacada.test.js`, `tests/cacada-extras.test.js` |

### 9.3 Não foi feito / fica para depois

- Não testei com as mãos a combinação setas + B segurado (o navegador de teste só aperta uma tecla por vez): conferido por teste
  automático (`segurando`) e pelo bot.
- Um namoro que começasse durante a caçada deixaria o peixe "namorando" por 6 s depois dela (raríssimo; só animação).
- Ideias da seção 4 (som, celular, fôlego do B, larva que sacia) seguem fora.
