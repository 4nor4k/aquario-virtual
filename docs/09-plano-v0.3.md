# 09 · Plano da v0.3 (salvar, adotar, nomear, cores)

Legenda: **[fechado]** decidido pelo usuário · **[proposta]** sugestão a confirmar.

**Status: v0.3 concluída em 2026-11-19 (tag `v0.3`).** Plano fechado em 2026-11-19, com as recomendações da seção 8 (o usuário disse
"manda brasa" sem alterar nenhuma; pode reabrir qualquer uma). Três decisões vieram dele
(marcadas **[fechado]**); o resto é recomendação minha, agora adotada.
Progresso dos passos: ver seção 10.

## 1. Objetivo

Hoje, fechar a página mata o jogo: o peixe some e o próximo começa do zero. A v0.3 faz o
aquário **durar de verdade**:

- o jogo é **salvo** e volta de onde parou;
- o tempo em que o jogo ficou fechado **conta** (o peixe fica com fome, a água suja...), e ao
  voltar aparece **"Seu peixe dormiu por X horas, bem-vindo de volta!"**;
- você **adota** o peixe (em vez do "Reiniciar"): escolhe a **cor** e dá um **nome**.

Entrega do roadmap (`01`): salvamento, adoção e nomes pelo painel (futuro celular), espécie e
cor. Na v0.3 só existe a espécie **beta**, em várias cores [fechado].

## 2. O que entra e o que não entra

**Entra**
- Salvar e carregar o jogo em **arquivo** [fechado].
- Calcular o tempo em que ficou fechado e aplicá-lo às regras, com a **mensagem de boas-vindas**
  [fechado].
- Beta em várias **cores** [fechado].
- Tela de **adoção** no aparelho (escolher a cor) e seção **Adotar** no painel (nome e cor).
- **Renomear** o peixe pelo painel.
- Painel mostra se o jogo está sendo salvo.

**Não entra (vem depois)**
- Vários peixes, casal, ovos, parceiro adulto, limite de 5 (v0.4). Na v0.3 só se adota quando
  **não há peixe vivo**.
- Espécies novas (guppy, neon): cada uma pede desenho próprio.
- Clima e hora simulados (v0.5).
- A página do celular de verdade (v1.1). O painel faz o papel dela, como o `06` já previa.
- Resumo do que aconteceu durante a ausência ("ele ficou com fome"). Boa ideia, fica para depois.

## 3. Como o salvamento funciona

### O arquivo [fechado: arquivo; o resto é proposta]
- Caminho: `sim/saves/aquario.json`. A pasta `saves/` entra no `.gitignore` (é o seu jogo,
  não faz parte do código).
- O **navegador não escreve em arquivo**; quem escreve é o `servidor.js`, que ganha 3 pedidos:
  `GET /api/salvo` (lê), `PUT /api/salvo` (grava), `DELETE /api/salvo` (apaga).
  Continua ouvindo só em `127.0.0.1` e só mexe nesse arquivo.
- A gravação é **atômica**: escreve num arquivo temporário e troca de nome. Se faltar luz no
  meio, o arquivo bom continua lá.
- Se o servidor estiver desligado, o jogo roda normalmente, mas **sem salvar**; o painel avisa.

### O que vai dentro
```
versao          1   (para saber ler arquivos antigos no futuro)
salvoEmMs       hora REAL da gravação (Date.now())
tempoJogoMs     hora do jogo (o relógio) na gravação
aquario         sujeira, phPasso, phProgresso, gameOver, causaDoGameOver, proximoId
peixes[]        id, nome, especie, cor, sexo, fase, saciedade, saude, estado,
                causaDaMorte, nascimentoMs, x, y, direcao
```
**Não** se salva: para onde o peixe está nadando, bolhas, câmera, tela aberta, velocidade do
tempo. Ao abrir, o jogo volta a 1×, na tela do jogo, e o peixe sorteia um destino novo.

### Quando grava [proposta]
- a cada **10 segundos** (número em `config/jogo.json`);
- logo depois de cada ação: comida, limpar, pH, adotar, renomear, Game Over;
- ao **fechar a aba** (`pagehide`).

### Cuidados
- Arquivo ilegível, JSON quebrado ou `versao` desconhecida: **não apago nada**. Renomeio para
  `aquario.corrompido.json`, começo um jogo novo e o painel avisa.
- Peixe com campo faltando ou valor fora do limite: o carregamento recusa em vez de adivinhar.
- Onde ficam as peças: `core/salvar.js` só **transforma** o aquário em dados e dados em
  aquário (sem arquivo, sem `Date`, sem navegador). Ler e gravar o arquivo é da interface
  (`sim/armazenamento.js`). É a mesma divisão que o ESP32 vai usar.

## 4. Tempo com o jogo fechado [fechado: calcular tudo e mostrar mensagem]

Ao abrir:
1. `ausência = hora real de agora − salvoEmMs`. Se der negativo (você mexeu no relógio do
   computador), vale **0**.
2. O relógio do jogo vai a `tempoJogoMs + ausência` e as **regras** rodam por esse tempo todo
   (`atualizarRegras`, que já corta o tempo em pedaços de 15 min; 30 dias são só ~2.900
   pedaços, é instantâneo).
3. Só as regras rodam: idade e fase, saciedade, sujeira, pH, saúde, doença, morte. Posição e
   nado não importam, o peixe reaparece onde estava.
4. A ausência conta a **1× (tempo real)**, mesmo que você estivesse jogando a 3600×.

**Sem teto** [proposta, consequência da sua decisão de computar tudo]. Pela tabela do `08`
(seção 6), sem nenhum cuidado o peixe morre em ~3,7 dias: **um fim de semana prolongado fora
mata o peixe**. Fica um número `ausenciaMaximaHoras` em `config/jogo.json`, hoje vazio (sem
teto), para você limitar se achar duro demais.

### A mensagem
- Só aparece se a ausência for de pelo menos **10 min** [proposta; número no config]. Assim,
  dar F5 na página não mostra aviso a toda hora. Abaixo disso o tempo conta do mesmo jeito.
- É uma tela do aparelho (120×120), fecha com **A**, e o tempo corre por baixo dela:

| Situação | Texto |
|---|---|
| Peixe vivo | **Seu peixe dormiu por 5 h 20 min. Bem-vindo de volta!** [fechado] |
| Peixe morreu na ausência | Você ficou fora por 4 dias. Seu peixe não resistiu. [proposta] |

  Na segunda, ao apertar A segue para o Game Over normal (condolências).
- Como mostrar o tempo [proposta]: menos de 1 h → "45 min"; menos de 1 dia → "5 h 20 min";
  1 dia ou mais → "2 dias e 3 h". Função nova `formatarDuracao` em `core/formatar.js`.
- Os textos ficam em `config/textos.json`.

### Limite conhecido
Se o computador **dormir** com a aba aberta, o relógio do navegador pode não contar esse
tempo. É uma falha só do simulador, e só aparece nesse caso. Não vou tentar consertar agora.

## 5. Cores do beta [fechado: várias cores; a lista é proposta]

Seis cores para começar, você troca ou acrescenta depois:
**vermelho** (o de hoje), **azul**, **roxo**, **laranja**, **verde**, **rosa**.

- Cada cor tem 3 tons: corpo, nadadeira e borda da cauda. O vermelho já existe.
- O **idoso, o doente e o morto** continuam sendo o mesmo desenho com cores desbotadas. Para
  não escrever 9 tons à mão por cor, a paleta **calcula** esses tons a partir dos 3 da cor
  (o vermelho mantém os tons escolhidos à mão).
- No peixe, `cor` guarda o nome (`"azul"`). Os sprites passam a ser
  `SPRITES[especie][cor][fase]`, montados uma vez ao abrir.
- A lista de cores fica em `config/jogo.json`, os nomes bonitos em `textos.json` e os tons em
  `render/palette.js`. O resto do código só sabe o nome.
- Custo no ESP32: ~45 entradas a mais na paleta (alguns bytes). Nada que preocupe.

## 6. Adoção e nome

### No aparelho (tela nova **Adote um peixe**) [proposta]
Aparece na **primeira vez** (sem arquivo salvo) e depois do **Game Over** (no lugar do atual
"A: novo filhote").
```
+------------------+
|  Adote um peixe  |
|                  |
|   <   [beta]  >  |   o peixe na cor escolhida
|                  |
|      Azul        |
|  A: adotar       |
+------------------+
```
Joystick para os lados troca a cor, **A** adota. O aparelho **não tem teclado**, então o
**nome** não se escolhe aqui: nasce como **"Beta"** e você muda pelo painel (depois, pelo
celular). Isso é igual ao que o `06` descreve.

### No painel (faz o papel do celular, `06` seção 3.3) [fechado: nomes pelo painel]
- **Adotar:** campo de nome (até **12 caracteres**, pode repetir [fechado no `06`]), seletor de
  cor e botão **Adotar**. Só habilitado quando **não há peixe vivo**; senão o painel explica.
- **Renomear:** campo e botão para o peixe atual (vivo ou não).
- Nome aceita só o que a fonte do aparelho sabe desenhar (letras, números, espaço e os
  acentos que já existem). Espaços das pontas são cortados; vazio vira "Beta".
- O botão **Reiniciar** vira **Apagar jogo e recomeçar**: apaga o arquivo e abre a tela de
  adoção.

### Sexo
O `03` manda sortear o sexo na adoção e só revelar no adulto. A revelação é da v0.4, mas
**sorteio e gravação entram agora**, para o arquivo da v0.3 já nascer completo. Não aparece em
nenhum lugar da tela.

## 7. Como cada parte muda [proposta]

| Arquivo | Mudança |
|---|---|
| `core/salvar.js` (novo) | `exportarJogo`, `importarJogo` (valida e recusa o que estiver errado) |
| `core/ausencia.js` (novo) | aplica a ausência às regras e devolve `{ ausenciaMs, morreu, gameOver }` |
| `core/fish.js` | campos `cor` e `sexo` |
| `core/aquarium.js` | `adotar({ nome, cor })` e `renomear(peixe, nome)` |
| `core/menu.js` | telas `ADOCAO` e `BEM_VINDO`; Game Over leva à adoção |
| `core/formatar.js` | `formatarDuracao` |
| `render/sprites.js`, `palette.js` | sprites por cor, tons calculados |
| `render/telas.js` | desenha as duas telas novas |
| `sim/armazenamento.js` (novo) | fala com `/api/salvo` pelo navegador |
| `servidor.js` | os 3 pedidos do arquivo |
| `sim/panel.js`, `index.html` | seção Adotar, Renomear, estado do salvamento |
| `main.js` | carregar ao abrir, gravar periodicamente |
| `config/jogo.json`, `textos.json` | `salvamento`, lista de `cores`, textos novos |
| `.gitignore` | `sim/saves/` |

O `core/` continua **sem** `document`, `canvas`, `localStorage`, `window`, `fetch` e **sem
`Date`**: a hora real chega de fora (regra 4 do `05`).

### Passos (cada um vira um commit, como na v0.2)
1. **Núcleo:** `core/salvar.js`, `cor` e `sexo` no peixe, testes de ida e volta.
2. **Arquivo:** pedidos no servidor, `armazenamento.js`, grava e carrega no `main.js`.
   Já dá para fechar e abrir e o peixe continua.
3. **Ausência:** `core/ausencia.js`, `formatarDuracao`, tela "Bem-vindo de volta".
4. **Cores:** paleta, sprites e testes.
5. **Adoção:** tela do aparelho, seção Adotar e Renomear no painel, "Apagar jogo".
6. **Fechamento:** conferência, README, `CLAUDE.md`, tag `v0.3`.

### Para o ESP32 (Fase B), só registrado
- O arquivo vira um arquivo na memória flash (LittleFS), com o mesmo conteúdo. Como a flash se
  desgasta, lá grava-se a cada poucos minutos e depois de cada ação, não a cada 10 s.
- **Sem RTC** (relógio) o aparelho não sabe a hora ao ligar. A hora vem do celular
  (`06`, "Hora pelo celular"), e é aí que se calcula a ausência e se mostra a mensagem.

## 8. Decisões

Já vieram do usuário em 2026-11-19: **(1)** salvar em arquivo; **(2)** só beta, em cores
diferentes; **(3)** contar o tempo fechado e mostrar "Seu peixe dormiu por X horas, bem-vindo
de volta".

A confirmar (a recomendação vem primeiro; se nada for dito, entra a recomendação):

1. **Sem teto** para o tempo fechado? *Recomendo sim*, como você pediu. Aviso: fim de semana
   fora = peixe morto. O número fica no config para limitar depois.
2. **Aviso só acima de 10 min**? *Recomendo sim*, para o F5 não mostrar mensagem.
3. **Texto quando o peixe morre** na ausência: "Você ficou fora por X. Seu peixe não
   resistiu." Serve, ou quer outro?
4. **Seis cores:** vermelho, azul, roxo, laranja, verde, rosa. Quer outras?
5. **Cor escolhida no aparelho** (joystick) e **nome no painel**, com "Beta" até você mudar?
6. **Gravar a cada 10 s**, depois de cada ação e ao fechar a aba?
7. **Sorteio do sexo** já na v0.3, guardado e invisível?

## 9. Como saber que a v0.3 está pronta [proposta]

1. `node --test` passa, incluindo:
   - ida e volta: salvar e carregar dá o mesmo aquário (peixe vivo, doente, morto e Game Over);
   - arquivo com campo faltando, valor fora do limite ou versão desconhecida é recusado;
   - ausência: 0 (nada muda), 1 h, 10 h e 5 dias; com a mesma conta de uma simulação direta;
   - peixe que morre durante a ausência e o Game Over certo; ausência negativa vira 0;
   - `formatarDuracao` nos três formatos;
   - servidor (numa porta de teste): grava, lê, apaga, recusa corpo grande e JSON inválido;
   - todas as cores geram sprites de todas as fases e estados; nome é limpo e cortado em 12;
   - todo texto novo cabe na tela e só usa letras que a fonte tem.
2. No navegador: adotar um peixe azul chamado "Nemo", fechar o servidor e a aba, abrir de
   novo 1 minuto depois: peixe, nome e cor continuam, e nenhuma mensagem aparece.
3. Editar `salvoEmMs` no arquivo para 5 h atrás e abrir: aparece "dormiu por 5 h", e fome,
   sujeira e pH refletem essas 5 h.
4. Idem com 5 dias atrás: mensagem de que não resistiu, depois o Game Over.
5. Game Over, **A**, tela de adoção, escolher outra cor e adotar.
6. Estragar o arquivo à mão: o jogo abre um aquário novo, o painel avisa e o arquivo ruim fica
   guardado com o outro nome.
7. Nada em `src/core/` usa `document`, `canvas`, `localStorage`, `window`, `fetch` nem `Date`.

## 10. Andamento

- **Passo 1 (núcleo) feito em 2026-11-19:** `core/salvar.js` (ida e volta e recusa de arquivo
  ruim), `cor` e `sexo` no peixe, `restaurarPeixe` no aquário. `nome` (padrão e máximo de 12) e
  `cores` entraram no `config/jogo.json`.
- **Passo 2 (arquivo) feito em 2026-11-19:** servidor com `GET/PUT/DELETE /api/salvo` e
  `POST /api/salvo/corrompido` (grava atômico, uma gravação por vez, corpo até 64 KB, só aceita
  Host localhost), `sim/armazenamento.js`, o `main.js` carrega ao abrir e grava a cada 10 s, depois
  das ações, no Game Over e ao fechar a aba. O painel mostra "Salvo às ...". Se o servidor não
  responder ao abrir, o jogo **não grava** (para não apagar um jogo salvo que ele não conseguiu ler).
  Conferido no navegador: adotar "Nemo", recarregar e continuar; arquivo estragado vira
  `aquario.corrompido.json` e abre um aquário novo.
- **Passo 3 (tempo fechado) feito em 2026-11-19:** `core/ausencia.js` (`calcularAusencia`,
  `aplicarAusencia`), `formatarDuracao`, tela **Bem-vindo de volta** (`menu.mostrarBemVindo`,
  `desenharBemVindo`) e os textos em `textos.json`. O `main.js` calcula a ausência ao carregar, o
  relógio vai para a nova hora e grava de novo na hora. A ausência real é a que aparece na
  mensagem, mesmo que `ausenciaMaximaHoras` limite o que conta. Conferido no navegador: 5 h 20 min
  fora (saciedade 100 -> 89, sujeira 0 -> 6, relógio em 05:20) e 5 dias fora ("Você ficou fora
  por 5 dias. Seu peixe não resistiu.", A leva ao Game Over).
- **Passo 4 (cores) feito em 2026-11-19:** seis cores (vermelho, azul, roxo, laranja, verde, rosa).
  O vermelho mantém os tons de antes (índices 27 a 35); as outras têm 3 tons escolhidos em
  `palette.js` (`TONS_DAS_CORES`) e os tons de idoso e doente saem por cálculo, entrando na
  paleta depois do índice 41 (agora 87 entradas). `sprites.js` monta tudo uma vez ao abrir
  (`spritesDaCor`, `spriteDoPeixe` escolhe pela cor); `SPRITES`, `SPRITES_DOENTES` e
  `SPRITES_MORTOS` continuam existindo e são os do vermelho. Os tons são **provisórios**, para
  o usuário refinar.
- **Passo 5 (adoção) feito em 2026-11-19:** tela **Adote um peixe** (`menu.abrirAdocao`,
  `desenharAdocao`: peixe 3× batendo a cauda, setas `<` `>` e nome da cor), `core/nome.js`
  (`normalizarNome`) e `aquario.renomear`, sorteio do sexo, campo **Nome** e seção **Adoção** no
  painel, botão **Apagar jogo** (pede um segundo clique). Na primeira vez (sem arquivo) o aquário
  de trás é só um enfeite e **nada é salvo** até adotar. O Game Over passou a levar à adoção (A),
  e adotar é que recomeça o jogo. A fonte ganhou o `<`.
- **Passo 6 (fechamento) feito em 2026-11-19:** conferência abaixo, README, `CLAUDE.md`, versão
  0.3.0 e tag `v0.3`.

## 11. Resultado da conferência da v0.3 (2026-11-19)

| # | Critério (seção 9) | Resultado | Como foi conferido |
|---|---|---|---|
| 1 | `node --test` passa, com os casos listados | ok | **367 testes, 0 falhas**: ida e volta (vivo, doente, morto, Game Over), recusa de arquivo ruim, ausência de 0, 1 h, 10 h e 48 h igual a jogar o tempo todo, 5 dias com morte e Game Over, relógio voltando, velhice, crescimento e teto, `formatarDuracao`, servidor numa pasta temporária (grava, lê, apaga, recusa corpo grande e JSON inválido, Host de fora, `../`), 6 cores com todos os sprites e estados, nome (corte em 12, símbolos, acento decomposto), textos que cabem e só usam letras da fonte |
| 2 | Adotar "Nemo" azul/roxo, fechar e abrir de novo, tudo continua e sem aviso | ok, com ressalva | No navegador: adotei, renomeei para "Nemo", recarreguei e nome, cor, saciedade e hora do jogo continuaram, sem aviso. **Não** esperei 1 minuto nem desliguei o servidor entre uma abertura e outra |
| 3 | Arquivo com 5 h atrás: "dormiu por 5 h", indicadores refletem | ok | Editei `salvoEmMs` para 5 h 20 min atrás: tela "SEU PEIXE DORMIU POR 5 H 20 MIN. BEM-VINDO DE VOLTA!", relógio do jogo em 05:20, saciedade 100 → 89 e sujeira 0 → 6 (esperado: 11 e 5,5) |
| 4 | Idem com 5 dias: não resistiu, depois Game Over | ok | Tela "VOCÊ FICOU FORA POR 5 DIAS. SEU PEIXE NÃO RESISTIU." e, com A, o Game Over com as condolências |
| 5 | Game Over, A, adoção, outra cor, adotar | ok | "Matar peixe", Game Over, A abre a adoção, joystick troca a cor, A adota; arquivo novo com o peixe novo, id 1, sem Game Over |
| 6 | Arquivo estragado: aquário novo, aviso, arquivo guardado | ok | Escrevi `{ quebrado` no arquivo: o painel avisou e o arquivo ficou como `aquario.corrompido.json` |
| 7 | Nada em `src/core/` usa `document`, `canvas`, `localStorage`, `window`, `fetch`, `Date` | ok | Busca no código: nada |

**Extras conferidos:** "Apagar jogo" (1º clique pede confirmação, 2º apaga e abre a adoção); fechar a
página na tela de adoção **não** grava nada; o nome "  Nemo @#  " virou "Nemo".

**Defeitos achados e corrigidos pelo caminho:** nenhum no jogo. Dois testes meus estavam
errados (um esperava que o `fetch` mandasse `../` sem arrumar; outro apertava duas setas no
mesmo passo) e foram corrigidos. Na aba de automação, apertos de tecla dentro do mesmo quadro
valem como um só (comportamento do teclado, igual ao da v0.2).

**Para o usuário decidir/ajustar:** os tons das 5 cores novas (`TONS_DAS_CORES` em
`render/palette.js`); o texto de "não resistiu" (`bemVindo.morto`); se quer um teto para a
ausência (`salvamento.ausenciaMaximaHoras`); o sorteio do sexo ainda não aparece em lugar nenhum
(v0.4).

**Fica para as próximas versões:** vários peixes, casal, ovos e o limite de 5 (v0.4); espécies
novas; clima e dia/noite (v0.5); resumo do que aconteceu durante a ausência; o salvamento no
ESP32 (flash e hora pelo celular, seção 7).
