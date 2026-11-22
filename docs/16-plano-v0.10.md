# 16 · Plano da v0.10 (efeitos sonoros para o buzzer)

**Escrito e implementado em 22/11/2026** (o usuário disse "pode" e aceitou as 5 recomendações da seção 8; resultado na seção 9). O que o usuário
pediu está marcado **[fechado]**; tudo o que eu completei está marcado **[proposta]**.

## 1. O que o usuário pediu [fechado]

- O projeto vai ter um **buzzer**. Criar os **efeitos sonoros do jogo**.

O buzzer já estava previsto no hardware (`02-hardware.md`: **passivo**, pino 17, PWM). Desde a v0.2 o jogo
**anota os acontecimentos** numa fila de eventos (`core/events.js`) justamente para o som entrar depois. Esta versão é esse "depois".

## 2. Como o buzzer funciona (explicação para quem está começando)

- Um buzzer **passivo** é como um alto-falante bem simples: ele só faz barulho quando recebe uma **onda**, e a
  **frequência** da onda (em Hz) é a **nota**. 440 Hz = lá; 880 Hz = o mesmo lá, uma oitava acima.
- O ESP32 gera essa onda sozinho (PWM, comando `ledcWriteTone(pino, frequência)`). Uma "melodia" é só uma lista de
  **pares (frequência, duração)**: toca 523 Hz por 80 ms, depois 659 Hz por 80 ms, e assim por diante.
- Ele toca **uma nota de cada vez** (não faz acorde) e o som é "de videogame antigo". É esse o charme.
- Buzzer pequeno soa melhor entre **cerca de 1000 e 4000 Hz**; abaixo de ~400 Hz fica fraquinho. Por isso as
  melodias abaixo ficam quase todas na faixa de 400 a 2700 Hz, e os sons tristes descem, mas não muito.

## 3. Como entra no projeto [proposta]

A ideia é a mesma do resto: **o som é dado, não código.** Cada efeito é uma lista de notas num arquivo de
configuração. O simulador toca essa lista com o som do computador/celular; o ESP32 vai tocar **a mesma lista** no buzzer.
Assim, o que você ouve no navegador é o que vai ouvir no aparelho (só o timbre muda um pouco).

| Peça | Arquivo | O que faz |
|---|---|---|
| Catálogo de sons | `config/sons.json` (novo) | Nome do efeito → prioridade e lista de notas `[Hz, ms]` (Hz = 0 é silêncio). Você ajusta aqui. |
| Tocador (regras) | `core/som.js` (novo) | `criarSom({ sons })`: um canal só, como o buzzer. `tocar(nome)`, `atualizar(dt)` devolve a frequência de agora (ou 0). Sem som de verdade, sem DOM: testável. |
| Evento vira som | `core/eventos-som.js` (novo) | Tabela "evento do core → nome do som" (adoeceu → `adoeceu`...). |
| Som no navegador | `sim/src/sim/audio.js` (novo) | Web Audio: oscilador de onda **quadrada** (o timbre de buzzer) tocando a frequência que o `som.js` pedir. |
| Ligações | `main.js`, `core/menu.js` | Eventos do core, botões, ações do menu e a caçada chamam `som.tocar(...)`. |
| Opções | painel (`index.html`) e Opções da página do aparelho | Interruptor **Som ligado/desligado** (guardado no navegador) e a **lista de teste**: um botão ▶ por efeito, para você ouvir todos. |
| Testes | `tests/som*.test.js` | Prioridade, fila, notas e pausas, mapa evento → som, e um teste que confere que todo som citado existe no catálogo. |

**Regras do canal único (como no buzzer de verdade):**
- Só um som toca por vez. Cada efeito tem **prioridade** (1 a 3).
- Chegou um som de prioridade **maior ou igual** ao que está tocando: ele **corta** o atual e toca.
- Chegou um de prioridade **menor**: é **descartado** (um "clique" não atropela uma música de Game Over).
- Quando o jogo registra `morreu` e `gameOver` no mesmo instante, o de maior prioridade vence.
- Eventos do tempo com o jogo fechado ("Bem-vindo de volta") **não fazem som** (a fila é descartada, como hoje).
- **Navegadores só deixam tocar som depois do primeiro toque/tecla** do usuário. Não é problema: o jogo só
  começa a soar depois que você mexe nele.

## 4. Catálogo dos efeitos [proposta]

Notas: C5 = 523 Hz, D5 = 587, E5 = 659, F5 = 698, G5 = 784, A5 = 880, B5 = 988, C6 = 1047, E6 = 1319, G6 = 1568.
Prioridade: **1** = detalhe, **2** = acontecimento, **3** = importante.

### 4.1 Aparelho e menus

| Som | Quando toca | Melodia | Prior. |
|---|---|---|---|
| `ligar` | O aparelho/jogo abre | C5 · E5 · G5 · C6 (curtinhas, subindo) | 2 |
| ~~`clique`~~ | **Removido em 22/11/2026 a pedido do usuário** (era 1 bip de 25 ms ao abrir o menu, entrar na caçada, sair do Game Over, fechar o aviso de ausência e continuar a pausa). Agora são **23 efeitos**. | | |
| `voltar` | B volta/cancela | A5 → E5 (2 notas descendo, 40 ms cada) | 1 |
| `status` | C abre a tela de status | G5 · C6 (2 notas, 50 ms) | 1 |
| `negado` | Ação que não pode (ex.: "Ele está fraco demais para caçar", "aquário cheio") | 2 bips graves: 330 Hz · 260 Hz (80 ms cada) | 2 |
| `bemvindo` | Voltou depois de ficar fora 10 min ou mais | C5 · G5 · E5 · G5 · C6 (alegre) | 2 |

### 4.2 Cuidar do peixe

| Som | Quando toca | Melodia | Prior. |
|---|---|---|---|
| `comida` | Joga a comida na água | 3 "plops" subindo: 600 · 800 · 1000 Hz (40 ms) | 1 |
| `comeu` | O peixe come um grão | 1 blip: 1300 Hz, 20 ms | 1 |
| `limpar` | Limpar o aquário | Varredura subindo: 500 → 2000 Hz em 8 degraus de 20 ms ("shhhhip") | 2 |
| `ph` | Regular o pH | 2 notas calmas: E5 · E5 (60 ms, com pausa de 40 ms) | 1 |
| `adotar` | Adotou um peixe ou parceiro | C5 · E5 · G5 · C6 · E6 (jingle de festa) | 3 |
| `adoeceu` | Peixe ficou doente | 3 notas tristes descendo: A5 · F5 · D5 (150 ms) | 3 |
| `recuperou` | Peixe sarou | 3 notas subindo: E5 · G5 · B5 (80 ms) | 2 |
| `morreu` | Um peixe morreu | Descendo devagar: G5 · E5 · C5 · G4 (220 ms cada) | 3 |
| `gameOver` | Último peixe morreu | Melodia lenta e triste: E5 · D5 · C5 · B4 · A4, e uma nota longa e grave de 600 ms | 3 |

### 4.3 Namoro e filhotes

| Som | Quando toca | Melodia | Prior. |
|---|---|---|---|
| `namoro` | Evento `reproducao` (o aviso sonoro que o doc 03 já prometia) | "Música de coração": E5 · G5 · C6 · E6 · C6 · G5 · C6 (suave, 110 ms) | 3 |
| `nasceu` | Ovo eclodiu | Brilhinho: C6 · E6 · G6 (60 ms) e C6 curtinha | 2 |

### 4.4 Clima

| Som | Quando toca | Melodia | Prior. |
|---|---|---|---|
| `trovao` | Relâmpago (item que ficou de fora da v0.5) | Estalo agudo de 15 ms + "rumor" grave tremido: 160 ↔ 110 Hz alternando a cada 25 ms, durante ~600 ms. Buzzer não faz ruído de verdade, então é uma aproximação. | 1 |

### 4.5 Minigame "Caçar"

| Som | Quando toca | Melodia | Prior. |
|---|---|---|---|
| `contagem` | Cada número do 3-2-1 | 1 bip: A5, 100 ms | 2 |
| `vai` | "Valendo!" | 1 nota mais aguda e longa: E6, 250 ms | 2 |
| `larva` | Pegou uma larva | 2 notas rápidas subindo: 1000 · 1500 Hz (25 ms cada) | 1 |
| `pausa` | A abre a pausa | 2 notas descendo: G5 · C5 (50 ms) | 1 |
| `fimCacada` | Acabou o minuto | C6 · G5 · E5 · C5 (100 ms) | 2 |
| `recorde` | Novo recorde | Fanfarra: C5 · C5 · C5 · G5 · E5 · G5 · C6 (a última longa) | 3 |

São **24 efeitos**. Os `comeu` e `larva` podem acontecer muitas vezes seguidas: como têm prioridade 1 e
duram poucos milissegundos, não se acumulam (um novo só corta o anterior).

## 5. O que fica de fora desta versão [proposta]

- **Música de fundo.** Buzzer passivo toca bem efeitos curtos; música contínua seria cansativa e gastaria bateria.
- **Alarme de fome / sujeira** (o Tamagotchi clássico apita pedindo comida). Exigiria um evento novo e regra de "não
  perturbar"; deixo como ideia para quando você estiver com o aparelho na mão. Dúvida 4.
- **Volume ajustável.** No buzzer real o volume quase não muda por software. Na v0.10: só **liga/desliga**.
- **Som na página do celular que fala com o aparelho** (`web/`, doc 06): o som é do aparelho, não do celular.
  (Já a página `aparelho.html`, que é o jogo rodando no celular, **toca** o som.)

## 6. Passos de implementação

1. `config/sons.json` com os 24 efeitos + `core/som.js` + testes (prioridade, corte, descarte, notas/pausas).
2. `core/eventos-som.js` + testes (todos os tipos de evento têm som; todo som citado existe).
3. `sim/src/sim/audio.js` (Web Audio) + interruptor Som + lista de teste (▶) no painel e nas Opções do aparelho.
4. Ligações no `main.js` e no `menu.js`: eventos do core, botões, ações do menu, caçada, trovão, abertura. Testes.
5. Conferir no navegador (porta diferente da 8080, com pasta de salvamento temporária) e ajustar notas ouvindo.
6. Docs (resultado aqui, `03`, `02`, `CLAUDE.md`), commit e tag `v0.10`.

## 7. Riscos

- **Som do navegador não é som de buzzer.** O timbre é parecido (onda quadrada), mas o buzzer pequeno soa mais
  fino e mais baixo. A confirmação final é com a peça na mão: por isso a melodia é **dado** em `sons.json`, fácil de retocar.
- **Notas graves** (`gameOver`, `trovao`) podem sair fracas no buzzer real. Se for o caso, subimos o tom.
- **Barulho incomoda.** Por isso o interruptor de som entra já nesta versão, e `mover` (cada passo do joystick no
  menu) **não** tem som.

## 8. Para você confirmar

1. **Som ligado ou desligado por padrão?** **Recomendo ligado**, com o interruptor nas Opções/painel (e no ESP32, mais tarde, um item no menu).
2. **Sem som ao mover o joystick no menu** (só ao confirmar com A, voltar com B e C)? **Recomendo sim:** em buzzer de verdade, bipar a cada passo cansa.
3. **Trovão com o buzzer** (aproximação com estalo + rumor grave)? **Recomendo sim,** é só uma linha no catálogo e dá para tirar.
4. **Alarme de fome/sujeira** agora ou depois? **Recomendo depois** (quando houver aparelho para testar se incomoda).
5. **Só liga/desliga, sem volume?** **Recomendo sim** (no buzzer real o volume não varia de forma útil).

Se você disser "pode", faço os passos 1 a 6 com as recomendações. A lista de teste (▶) é para você **ouvir cada efeito e dizer o que trocar**: as melodias da seção 4 são o meu primeiro palpite.

## 9. Resultado

Passos 1 a 6 feitos; **800 testes passando** (eram 774 na v0.9; 26 novos). Conferido no navegador (página do aparelho, porta
8093): a lista de teste com os 24 botões ▶, o interruptor (desligar desabilita os botões e grava a escolha; religar volta), e uma
sequência de teclas de verdade (abrir, menu, comida) que tocou `bemvindo`, `clique`, `comida` e `comeu`. **Eu não consigo ouvir:**
quem confere se as melodias ficaram boas é você, na lista de teste.

### 9.1 O que mudou em relação ao plano

| Ponto | Plano | Feito | Por quê |
|---|---|---|---|
| Quantidade de efeitos | 26 | **24** | Erro de conta no plano: as tabelas somam 24. |
| Como o navegador toca | `som.atualizar` a cada passo | **notas agendadas no relógio do Web Audio** (`aoTocar`/`aoCalar`) | O jogo anda em passos de 50 ms e há bips de 25 ms: pelo passo, eles não soariam. `atualizar(dt)` continua para o ESP32. |
| Primeiro som | "ligar" ao abrir | `ligar` (ou `bemvindo`) toca no **primeiro toque/tecla** | O navegador não deixa tocar antes. |
| `negado` | quando o menu recusa | detectado por "voltou do menu com mensagem nova e sem ação" | Não precisou mudar o `menu.js`. |

### 9.2 O que foi construído

| Peça | Arquivo |
|---|---|
| Catálogo dos 24 sons | `sim/config/sons.json` |
| Canal único com prioridade | `sim/src/core/som.js` |
| Quando cada som toca (eventos, telas, caçada, trovão, comida) | `sim/src/core/eventos-som.js` |
| Web Audio (onda quadrada) | `sim/src/sim/audio.js` |
| Liga/desliga lembrado no navegador | `sim/src/sim/preferencia-som.js` |
| Interruptor e lista de teste | `sim/src/sim/sons-ui.js`, `index.html`, `aparelho.html` |
| Ligações | `sim/src/main.js` (o `menu.js` não mudou) |
| Testes | `sim/tests/som.test.js` |

### 9.3 Não foi feito / fica para depois

- **Ouvido no buzzer de verdade:** só com a peça na mão. Notas graves (`gameOver`, `trovao`) podem sair fracas.
- Alarme de fome/sujeira, volume e música de fundo, como decidido na seção 5.
- Para o ESP32: tocar `notas` com `ledcWriteTone(pino, Hz)` e pausar `ms` entre elas (o `core/som.js` já devolve a frequência do momento).
- 'comeu' também toca se um grão some por outro motivo (grão que dissolve na areia): detalhe pequeno.
