# 10 · Plano da v0.4 (vários peixes, casal, ovos)

Legenda: **[fechado]** decidido pelo usuário · **[proposta]** sugestão a confirmar.

**Status: plano fechado em 2026-11-19.** O usuário disse "manda bala" sem alterar nenhuma das
nove decisões da seção 9, então todas as recomendações valem como **[fechado]** (ele pode
reabrir qualquer uma). As decisões novas já entraram no `03-jogo.md`. Progresso dos passos: seção 11.

## 1. Objetivo

Hoje o aquário tem **um** peixe. A v0.4 deixa o aquário **encher de vida**:

- você pode ter **até 5 peixes** ao mesmo tempo;
- quando o peixe vira **adulto**, você pode **adotar um parceiro** (do sexo oposto, já adulto);
- o casal, se estiver bem cuidado, **namora** (corações), **põe de 1 a 3 ovos** e os ovos
  **eclodem em 1 hora**, nascendo **filhotes**;
- o **sexo** do peixe, que até agora fica escondido, **aparece quando ele vira adulto**.

Entrega do roadmap (`01`): reprodução e vários peixes. As regras de reprodução já estão
**[fechadas]** no `03`, seção 5; aqui só se decide como encaixar no que já existe.

## 2. O que entra e o que não entra

**Entra**
- Vários peixes (limite de 5), com a interface escolhendo **qual peixe** mostrar.
- Adotar o **parceiro** (menu do aparelho e painel).
- Reprodução: condições, namoro, ovos, eclosão, filhotes com nome provisório.
- Sexo revelado no adulto (tela de status e painel).
- Salvar e carregar tudo isso, inclusive o que acontece com o jogo fechado.

**Não entra (vem depois)**
- Espécies novas (guppy, neon).
- Desenho diferente para macho e fêmea (hoje os dois são iguais; o sexo aparece só em texto).
  Você pode refinar a arte depois.
- Som do aviso de reprodução (o simulador não tem buzzer; o evento fica registrado para o ESP32).
- Resumo do que aconteceu durante a ausência ("nasceram 2 filhotes").
- Clima e hora simulados (v0.5).

## 3. Vários peixes: qual deles a tela mostra? [proposta]

Hoje a tela de status, o HUD de indicadores, a câmera automática e o painel olham só o
primeiro peixe. Com vários, eles passam a olhar o **peixe em foco**.

- **Foco** = um dos peixes vivos. Ao abrir o jogo é o primeiro vivo. Não é salvo.
- Na **tela de status** (botão **C**), o joystick **esquerda/direita troca o foco** e a tela
  mostra "2/4" (qual é, de quantos).
- O **HUD de indicadores** (botão **B**) mostra FOME e SAÚDE do peixe em foco; PH, SUJO e TEMP
  são da água, iguais para todos.
- A **câmera automática** segue o peixe em foco.
- O **painel** ganha um seletor de peixe (a mesma escolha: mexer num mexe no outro). Renomear,
  "Pular fase", "Matar" e os outros testes valem para o peixe selecionado.
- A **comida** continua caindo no meio do que você está vendo.
- Se o peixe em foco morrer ou sumir, o foco vai para o primeiro vivo.

Os avisos do HUD (fome, doente...) já olham todos os peixes; esses não mudam.

## 4. Adotar o parceiro [proposta, regras do `03` seção 6]

- Menu do aparelho ganha um 4º item, **Parceiro**. Vale para o **peixe em foco**.
- Só pode se o peixe em foco estiver **vivo, adulto e sem parceiro**, e houver **vaga** (menos
  de 5). Senão aparece uma mensagem curta dizendo o motivo ("Precisa ser adulto", "Aquário cheio").
- Abre a tela de adoção que já existe, em outro modo: título "Adote uma fêmea" (ou "um macho",
  o **sexo oposto** ao do peixe em foco), joystick escolhe a cor, **A** adota, **B** cancela.
- O parceiro nasce **já adulto**, do sexo oposto, com o nome padrão; o nome se muda pelo painel.
- No painel, a seção **Adoção** ganha o botão "Adotar parceiro" (cor e nome, como já é).

**Quem forma casal [proposta, responde à dúvida 3 do `03`]:** casal é o que se forma **ao
adotar o parceiro**. Cada peixe tem **no máximo um parceiro**. Filhos **não** formam casal
sozinhos: para um filho reproduzir, você adota um parceiro para ele. Se um dos dois morre, o
que sobrou fica livre para ganhar outro parceiro.

## 5. Reprodução [regras do `03` seção 5, com os detalhes que faltavam]

### Quando acontece [fechado no `03`, números marcados são proposta]
Um **casal** reproduz quando, ao mesmo tempo:
1. os dois estão **adultos** (idoso não reproduz) [proposta] e vivos;
2. a **saúde dos dois é 90 ou mais**;
3. isso dura **30 minutos seguidos** (tempo do jogo); se qualquer um cair abaixo de 90, a
   contagem **volta a zero** [proposta];
4. já passaram **3 dias** desde a última reprodução do casal (o primeiro namoro não espera) [proposta];
5. **cabe pelo menos 1 peixe** a mais (veja "Limite", abaixo).

### O evento
1. **Aviso:** mensagem na tela ("Seus peixes estão namorando!") e um evento `reproducao`
   (o ESP32 vai tocar o buzzer; o simulador não tem som).
2. **Namoro (~6 s de tempo real):** os dois **nadam até se encontrar** e ficam juntos, com
   **corações** subindo.
3. **Ovos:** aparecem **1 a 3 ovos** (sorteio) no ponto do encontro e **caem até a areia**,
   como o cocô. São 2×2 pixels, claros.
4. **Eclosão em 1 hora** do jogo (acelera com o relógio: a 3600× são 1 s reais). O ovo some e
   nasce um **filhote** no lugar.
5. O **sexo** de cada filhote é **sorteado**. A **cor** é a de **um dos pais** (sorteio) [proposta].
6. Nome provisório **"Filhote 1", "Filhote 2"...** (a contagem continua entre ninhadas), até
   você renomear pelo painel.

### Limite de 5 [proposta, responde à dúvida 2 do `03`]
Conta **peixes vivos + ovos que ainda não eclodiram**. A ninhada sorteada é **cortada pelo
que cabe**: com 4 peixes e sorteio de 3, nascem só 1. Com 5, **a reprodução nem começa** (a
contagem de 30 min continua e ela acontece quando abrir vaga). Assim nenhum ovo é "perdido".

### Peixes mortos [proposta]
Hoje o peixe morto fica boiando para sempre, o que não faz sentido com vários peixes.
- A ação **Limpar** do menu passa a **retirar os mortos** (além de zerar a sujeira).
- Se você não limpar, o morto **some sozinho 12 h depois** de morrer (tempo do jogo).
- Peixe morto **não conta** no limite de 5.

### Game Over [proposta]
Continua: **nenhum peixe vivo**. Mas **ovos ainda não eclodidos seguram o Game Over**: eles
são descendentes (o `03`, seção 4, diz "sem ter deixado descendentes"). Se nascer filhote, o
jogo continua; se não houver mais ovos nem vivos, é Game Over.

## 6. Salvar, carregar e o jogo fechado

- O arquivo da v0.3 **continua valendo** (a versão do salvamento não muda): os campos novos são
  opcionais e, se faltarem, valem "sem parceiro" e "sem ovos".
- **Novos campos:** por peixe, `parceiroId` e a hora da morte; no aquário, a lista de `casais`
  (quem, contagem dos 30 min, quando foi o último namoro), a lista de `ovos` (onde estão, quando
  eclodem, qual a cor e o sexo já sorteados) e o contador de filhotes.
- **Com o jogo fechado**, o namoro e a eclosão **acontecem** como qualquer outra regra
  (o `aplicarAusencia` roda tudo). Não há animação: o ovo aparece e eclode direto. O limite de
  peixes vale do mesmo jeito.
- O limite de peixes no arquivo (`MAXIMO_DE_PEIXES`) passa a contar só os **vivos**; mortos
  esperando sumir podem passar de 5 no arquivo.

## 7. Como cada parte muda [proposta]

| Arquivo | Mudança |
|---|---|
| `core/aquarium.js` | `vagas()`, `adotarParceiro`, `casais`, `ovos`, retirar mortos, `limpar` retira os mortos |
| `core/reproducao.js` (novo) | as regras da seção 5: condições, contagem dos 30 min, ninhada, eclosão |
| `core/ovos.js` (novo) | o ovo (cair, esperar, eclodir) |
| `core/fish.js` | `parceiroId`, `morteMs`; `namorando` (o peixe vai até o ponto de encontro) |
| `core/rules.js` | chama a reprodução; Game Over espera os ovos; mortos somem |
| `core/menu.js` | **foco**; 4º item "Parceiro"; modo "parceiro" da tela de adoção (B cancela) |
| `core/salvar.js` | os campos novos, opcionais |
| `render/telas.js` | status com sexo, "2/4" e troca de foco; tela de adoção em modo parceiro |
| `render/indicadores.js` | FOME e SAÚDE do peixe em foco |
| `render/ovos.js`, `render/coracoes.js` (novos) | desenho dos ovos e dos corações |
| `render/scene.js` | desenha ovos e corações |
| `sim/panel.js`, `index.html` | seletor de peixe, "Adotar parceiro", botão de teste "Forçar namoro" |
| `main.js` | no lugar de `beta`, o peixe em foco; carregar e salvar os campos novos |
| `config/jogo.json`, `textos.json` | números da reprodução (`reproducao`) e textos novos |

O `core/` continua **sem** `document`, `canvas`, `localStorage`, `window`, `fetch` e **sem
`Date`**. O sorteio (ninhada, sexo, cor) tem **semente própria**, como já é com a comida e o
cocô, para não bagunçar os testes do resto.

### Passos (cada um vira um commit, como na v0.3)
1. **Vários peixes no núcleo:** limite, `vagas()`, `adotarParceiro`, casais, mortos que somem,
   Game Over esperando ovos. Testes.
2. **Foco na interface:** status com troca de peixe, HUD, câmera e painel olhando o peixe em foco.
   Sexo revelado no adulto. Já dá para ter 2 peixes pelo painel e alternar.
3. **Adotar o parceiro:** item do menu, tela em modo parceiro, botão no painel.
4. **Reprodução (núcleo):** condições, ninhada, ovos, eclosão, nomes provisórios, salvar/carregar
   e ausência. Testes com o relógio acelerado.
5. **Namoro na tela:** os peixes se encontram, corações, ovos caindo, mensagem e evento.
6. **Fechamento:** conferência à mão, README, `CLAUDE.md`, tag `v0.4`.

### Para o ESP32 (Fase B), só registrado
O evento `reproducao` vira um sinal do buzzer. Cada peixe a mais custa pouca memória (uns 100
bytes); o limite de 5 mantém o desenho dentro do que o aparelho aguenta.

## 8. Números novos (vão para `config/jogo.json`, bloco `reproducao`) [proposta]

| Número | Valor | Origem |
|---|---|---|
| `saudeMinima` | 90 | `03` **[fechado]** |
| `boasCondicoesMin` | 30 | `03` [proposta] |
| `intervaloEntreNinhadasDias` | 3 | `03` [proposta] |
| `ovosMin` / `ovosMax` | 1 / 3 | `03` **[fechado]** |
| `eclosaoMin` | 60 | `03` **[fechado]** |
| `namoroSegundos` | 6 | meu |
| `limiteDePeixes` | 5 | `03` **[fechado]** |
| `morteSomeEmHoras` | 12 | meu |

## 9. Decisões

**Todas confirmadas em 2026-11-19** ("manda bala"). Texto original, com a recomendação de cada uma:

1. **Foco** trocado na tela de status com o joystick (esquerda/direita)? *Recomendo sim*: não
   precisa de botão novo. A alternativa seria dar ao botão B outra função, mas ele já liga o HUD.
2. **Casal = quem foi formado ao adotar o parceiro**, no máximo um por peixe, e filho precisa de
   parceiro adotado? *Recomendo sim*: é simples de explicar e de testar. A alternativa (qualquer
   macho e fêmea adultos reproduzem) faria irmãos reproduzirem sozinhos.
3. **Ninhada cortada pelo que cabe** (e reprodução parada com 5)? *Recomendo sim*; resolve a
   dúvida 2 do `03`.
4. **Mortos**: "Limpar" retira e, se ninguém limpar, somem em 12 h? *Recomendo sim*, senão o
   aquário enche de peixes mortos.
5. **Ovos seguram o Game Over**? *Recomendo sim*: é coerente com "sem descendentes" do `03`.
6. **Só adulto reproduz** (idoso, não)? *Recomendo sim*: o adulto dura 12 dias, o que dá no
   máximo uns 4 namoros por casal.
7. **Cor do filhote** = a de um dos pais, sorteada? *Recomendo sim*.
8. **Sexo só em texto** (status e painel), sem mudar o desenho do peixe por enquanto?
   *Recomendo sim*; a arte você refina depois.
9. **Sem som** no simulador? *Recomendo sim*; fica o evento para o ESP32.

## 10. Como saber que a v0.4 está pronta [proposta]

1. `node --test` passa, incluindo:
   - nunca há mais de 5 peixes vivos + ovos, por nenhum caminho (adoção, ninhada, ausência);
   - o parceiro nasce adulto, do sexo oposto, e só se o peixe em foco for adulto, vivo e sem parceiro;
   - o casal só reproduz com os dois adultos, saúde ≥ 90 por 30 min seguidos (cair abaixo zera a
     contagem), respeitando os 3 dias e a vaga; nenhuma dessas condições sozinha basta;
   - ninhada de 1 a 3, cortada pelo que cabe; ovo eclode em 1 h do jogo; sexo e cor sorteados;
   - nomes "Filhote N" sem repetir; morte de um do casal desfaz o casal;
   - mortos somem em 12 h ou com "Limpar"; Game Over espera os ovos;
   - salvar e carregar com casal, ovos e mortos dá o mesmo aquário; arquivo da v0.3 abre;
   - ausência de 2 h com ovos: os filhotes nascem; ausência longa com casal bem cuidado: nasce o
     que cabe e nada passa de 5;
   - o foco troca, pula mortos e volta ao primeiro vivo se o escolhido sumir;
   - textos novos cabem na tela e só usam letras da fonte.
2. No navegador (relógio a 3600×): pular um peixe para adulto, adotar o parceiro, ver o namoro
   (corações), os ovos caindo, a eclosão e o filhote "Filhote 1"; renomear pelo painel.
3. Chegar a 5 peixes: o menu recusa o parceiro e o casal não reproduz; matar um, e volta a reproduzir.
4. Trocar de peixe na tela de status e conferir que o HUD e a câmera seguem o escolhido.
5. Fechar o servidor com ovos, abrir depois: os filhotes nasceram.
6. Nada em `src/core/` usa `document`, `canvas`, `localStorage`, `window`, `fetch` nem `Date`.

## 11. Andamento

Ajuste de implementação (não muda nenhuma regra): em vez de um campo `parceiroId` em cada peixe,
o casal fica na lista `casais` do aquário (`{ aId, bId, ... }`) e `aquario.parceiroDe(peixe)`
descobre o parceiro. Evita dois campos que precisariam andar juntos.

Passos:
- **1 e 4 (núcleo) feitos em 2026-11-19**: `core/reproducao.js`, casais, ovos, vagas, parceiro, mortos que somem, Game Over esperando ovos, salvamento dos campos novos (arquivo da v0.3 ainda abre) e ausência sem animação. Fiz o passo 4 junto com o 1 porque o Game Over e as vagas dependem dos ovos. 508 testes (26 novos em `tests/reproducao.test.js`).
- 2 (foco na interface), 3 (adotar o parceiro), 5 (namoro na tela) e 6 (fechamento): por fazer.
