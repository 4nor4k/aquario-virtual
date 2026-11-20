# 11 · Plano da v0.5 (clima, hora do dia, dia e noite)

Legenda: **[fechado]** decidido pelo usuário · **[proposta]** sugestão a confirmar.

**Status: v0.5 concluída em 2026-11-19 (tag `v0.5`).** Plano escrito e executado em 2026-11-19. O usuário disse "manda bala na v0.5"
sem ter lido o plano antes, então tudo o que está como **[proposta]** é recomendação minha, adotada
para andar. Os pontos de **aparência** (cores da noite, chuva, raios de luz) são os mais fáceis de
mudar: olhe o resultado e peça os ajustes. Progresso dos passos: seção 11.

## 1. Objetivo

O aquário passa a ter **hora do dia** e **clima**, só no cenário (o clima **não afeta o peixe**, `03`
seção 7 **[fechado]**):

- **dia e noite**: o cenário escurece e esfria de cor à noite, esquenta no amanhecer e no entardecer;
- **chuva**: gotas e respingos na superfície, o céu escurece um pouco e caem **relâmpagos**;
- **frio**: com menos de **18 °C** aparece o **ícone de frio**;
- a **temperatura** passa a existir (hoje o indicador TEMP mostra um valor fixo de 26 °C).

No simulador tudo isso é **simulado**; no ESP32 (v1.1) a hora vem do NTP/celular e o clima da
cidade real. O núcleo já nasce preparado: ele só **recebe** a hora do dia e o clima.

## 2. O que entra e o que não entra

**Entra**
- Hora do dia, dia/noite com transições, estrelas à noite e (de dia) raios de luz suaves.
- Chuva com relâmpagos, ícone de frio, temperatura no HUD.
- Painel de testes para **forçar** hora, chuva e temperatura, e um **ciclo rápido** (24 h em 1 min).

**Não entra (vem depois)**
- Clima e hora **reais** (NTP, cidade, internet): v1.1, junto com o WiFi.
- Som do trovão (o simulador não tem som).
- Efeito do clima na saúde do peixe (decidido que **não** há).
- Salvar o clima (ele é recalculado ao abrir: não faz sentido guardar chuva de ontem).

## 3. Hora do dia [proposta, base no `04` seção 7]

- No simulador a hora do dia é a do **relógio do computador** (hora real, como o `04` pede),
  **independente** da aceleração do jogo (a 3600× o dia não passa voando). O `core/` **não usa
  `Date`**: o `main.js` lê o relógio e entrega os minutos do dia ao núcleo.
- Horários (do `04`: dia das 6 h às 18 h, com transição curta), em **config**:
  noite até **5h30** · amanhecer (5h30 a 6h30) · **dia** (6h30 a 17h30) · entardecer (17h30 a 18h30)
  · noite a partir das **18h30**.
- O painel pode **forçar** a hora, ou rodar o **ciclo rápido** (um dia inteiro em 60 s).

## 4. Como cada hora aparece [proposta]

Troca de paleta (`04` seção 3), feita **multiplicando as cores do cenário** por um tom:

| Quando | Tom (R, G, B) | Olhar |
|---|---|---|
| Dia | 1,00 · 1,00 · 1,00 | exatamente o visual de hoje |
| Amanhecer / entardecer | 1,00 · 0,80 · 0,66 | tudo ligeiramente alaranjado |
| Noite | 0,36 · 0,46 · 0,78 | escuro e azulado |

- **Só o cenário muda** (areia, plantas, pedras, peixes, água suja). O texto, os menus, o HUD e as
  **bolhas** (branco) não mudam: as bolhas e os olhos dos peixes ficam brilhando à noite.
- A água continua **preta** (é a escolha do usuário); a água suja e a areia escura também escurecem.
- **Noite:** aparecem **estrelas** no ar (pontinhos que piscam), somem quando chove.
- **Dia:** 3 **raios de luz** suaves descem da superfície (faixas inclinadas, um azul quase preto,
  que balançam devagar) e somem ao entardecer. Vêm das referências do `04`.
- Transições: o tom anda suave entre os horários.

## 5. Chuva, relâmpago e frio [proposta, base no `03` seção 7]

- **Chuva** (simulada, tempo real): fica de 5 a 20 min sem chuva e chove de 1 a 4 min (números no
  config). Efeitos: **gotas** caindo no ar acima da água, **anéis** que se abrem na superfície, o
  cenário **escurece uns 18%** (se combina com dia/noite), e as estrelas somem.
- **Relâmpago** (só com chuva): a cada 4 a 12 s, duas piscadas rápidas: o **céu** (o ar, acima da
  água) fica azul-claro e o cenário clareia por um instante.
- **Frio**: temperatura **abaixo de 18 °C** mostra o **ícone de frio** (um floco de neve de 7×7) no
  canto de cima à direita da tela. Não muda nada no peixe.
- **Temperatura simulada**: curva do dia (**16 °C** de madrugada a **28 °C** à tarde) mais uma
  variação lenta de até 1,5 °C. O indicador **TEMP** do HUD passa a mostrar esse valor (sem barra).
  Madrugadas e manhãs cedo ficam abaixo de 18 °C, então o ícone aparece de verdade.

## 6. Painel de testes [fechado no `05` seção 6: "simular clima e hora do dia"]

Nova seção **Clima**:
- **Hora do dia**: relógio do computador (padrão) · ciclo rápido · fixa (campo de 0 a 23,9).
- **Chuva**: automática · ligada · desligada.
- **Temperatura**: automática ou um valor.
- uma linha com o que está valendo agora ("Hora 14:32 · chuva: não · 24 °C · frio: não").

## 7. Como cada parte muda [proposta]

| Arquivo | Mudança |
|---|---|
| `core/clima.js` (novo) | hora do dia, chuva, relâmpago, temperatura, frio; o que o painel força |
| `render/luz.js` (novo) | o tom de cada hora; restaurar e aplicar a paleta do cenário |
| `render/ceu.js` (novo) | estrelas à noite e o clarão do relâmpago no ar |
| `render/chuva.js` (novo) | gotas e anéis na superfície |
| `render/raios.js` (novo) | os raios de luz do dia |
| `render/hud.js` | ícone de frio |
| `render/indicadores.js` | TEMP com a temperatura simulada |
| `render/palette.js` | 5 cores sólidas novas (céu do relâmpago, estrela, chuva, gelo, raio de luz) |
| `render/scene.js` | recebe `clima` e chama tudo na ordem certa |
| `sim/panel.js`, `index.html` | seção Clima |
| `main.js` | lê o relógio do computador e entrega ao `clima` |
| `config/jogo.json` | bloco `clima` |

O `core/` continua **sem** `document`, `canvas`, `localStorage`, `window`, `fetch` e **sem `Date`**.
O sorteio da chuva tem **semente própria**.

### Passos (cada um vira um commit)
1. **Núcleo do clima**: `core/clima.js`, config e testes.
2. **Dia e noite**: `render/luz.js`, `render/ceu.js`, `render/raios.js`, paleta, ligação no `main.js`.
3. **Chuva e relâmpago**: `render/chuva.js` e o clarão.
4. **Frio e temperatura**: ícone e indicador TEMP.
5. **Painel**: seção Clima.
6. **Fechamento**: conferência no navegador, README, `CLAUDE.md`, tag `v0.5`.

### Para o ESP32 (Fase B), só registrado
Hoje o "tom" multiplica as cores da paleta (16 bits no aparelho). Em vez de calcular a cada
quadro, o ESP32 pode ter 3 paletas prontas (dia, entardecer, noite) e misturar poucas vezes por
segundo. A hora e o clima chegam pelo mesmo `core/clima.js`, alimentado pelo NTP e pela API do tempo.

## 8. Números novos (bloco `clima` do `jogo.json`) [proposta]

| Número | Valor |
|---|---|
| `friaAbaixoDe` | 18 °C **[fechado no `03`]** |
| horas: amanhecer, dia, entardecer, noite | 5,5 · 6,5 · 17,5 · 18,5 (do `04`) |
| temperatura média / amplitude / variação | 22 / 6 / 1,5 °C |
| chuva: sem chuva / duração | 300 a 1200 s / 60 a 240 s |
| relâmpago: intervalo / duração | 4 a 12 s / 0,35 s |
| `cicloRapidoSeg` | 60 |

## 9. Decisões

Todas **[proposta]** (recomendação primeiro; se nada for dito, vale a recomendação):

1. **Hora do dia = relógio do computador**, sem acompanhar a aceleração? *Recomendo sim.*
2. **Noite = escurecer e azular o cenário**, com a água continuando preta, bolhas e olhos brilhando,
   e estrelas no ar? *Recomendo sim*; é o que mais combina com o preto e branco.
3. **Raios de luz de dia** (suaves)? *Recomendo sim*, mas é o mais "gosto": diga se não curtir.
4. **Chuva automática** de tempos em tempos no simulador, com relâmpago? *Recomendo sim.*
5. **Temperatura simulada** (16 a 28 °C) no indicador TEMP, com ícone de frio abaixo de 18? *Recomendo sim.*
6. **Clima não é salvo**? *Recomendo sim.*
7. **Sem som** de trovão no simulador? *Recomendo sim.*

## 10. Como saber que a v0.5 está pronta [proposta]

1. `node --test` passa, incluindo:
   - o clima: mesma semente, mesma chuva; chove e para nos tempos do config; relâmpago só com
     chuva; temperatura segue a curva e o frio vale abaixo de 18; o que o painel força vence o automático;
   - a luz: tons nos horários-chave e entre eles (sem saltos); dia = exatamente a paleta de hoje;
     as cores de UI e as bolhas **nunca** mudam; aplicar duas vezes não escurece em dobro;
   - estrelas só de noite e sem chuva; raios só de dia; gotas e anéis só com chuva e só no ar e na
     linha da água; ícone de frio só com frio; TEMP mostra a temperatura;
   - nada em `src/core/` usa `Date`, `document`, `window`...
2. No navegador: ciclo rápido (dia, entardecer, noite, amanhecer), chuva ligada com relâmpagos,
   temperatura forçada para 10 °C (ícone de frio), tudo voltando ao normal ao desligar.
3. As telas (menu, status, Game Over) continuam legíveis à noite.

## 11. Andamento

- **1 feito em 2026-11-19**: `core/clima.js` (hora do dia por modo relógio/ciclo/fixa, chuva automática ou forçada com nível suave, relâmpago de duas piscadas, temperatura por curva do dia + variação lenta, frio < 18), bloco `clima` no `jogo.json`, 16 testes.
- **2 feito em 2026-11-19**: `render/luz.js` (tom por hora, chuva e relâmpago; restaurar e aplicar na paleta), `render/ceu.js` (estrelas e clarão, desenhados depois da superfície porque ela repinta o ar), `render/raios.js` (3 raios de luz só de dia), 5 cores novas na paleta (55 a 59), ligação na cena e no `main.js` (hora = relógio do computador). 576 testes.
- **3 feito em 2026-11-19**: `render/chuva.js` (130 gotas de risquinho de 3 px que caem no ar, anéis que se abrem na linha da água, quantidade cresce com o nível da chuva, presa ao mundo; o relâmpago já veio no passo 2). 587 testes.
- **4 e 5 feitos em 2026-11-19** (juntos): ícone de frio (floco 7×7 em cor sólida que a luz não escurece, com fundo preto, no canto de cima à direita), indicador TEMP com a temperatura simulada (sem clima, o valor fixo de antes), e a seção **Clima** do painel (hora: relógio/ciclo rápido/fixa; chuva: automática/ligada/desligada; temperatura: automática ou valor; linha do que está valendo). 600 testes.
- **6 feito em 2026-11-19**: conferência no navegador, README, `CLAUDE.md`, versão 0.5.0 e tag `v0.5`.

## 12. Resultado da conferência da v0.5 (2026-11-19)

`node --test`: **600 testes passando** (`clima`, `luz`, `chuva`, `frio` e `clima-painel` são novos).

Conferido **no navegador** (servidor de teste em outra porta, jogo salvo numa pasta temporária):
- O **jogo salvo da v0.4 abriu** normalmente com o clima novo (apareceu o "Bem-vindo de volta").
- A hora do dia inicial veio do relógio do computador (18h30 na hora do teste) e o painel mostrou "Hora 18:30 ·
  chuva: não · 27 °C · frio: não".
- Painel: hora fixa 02:00 + chuva ligada → "Hora 02:00 (fixa) · chuva: sim (forçada) · 17 °C · frio: sim"; a chuva
  chegou ao nível 1; na tela havia gotas, cenário escuro e o **ícone de frio**; temperatura forçada em 30 °C
  apagou o frio e em 10 °C trouxe de volta; o **ciclo rápido** fez a hora andar (campo "Hora fixa" desabilitado).
- A **tela de status** continuou legível à noite. Sem nenhum erro no console.

**Imagens geradas por script** (sem navegador) conferiram dia, amanhecer, entardecer, noite, relâmpago e chuva.

**Conferido depois, em 19/11/2026** (servidor de teste na porta 8091):
- **Relâmpago ao vivo:** com a chuva forçada, o `clima.raio` chegou a 1 (piscada forte, respiro de 0,1, segunda
  piscada de 0,9 e apagar, 0,35 s). Com a câmera no topo e o raio travado em 0, 0,5 e 1, o céu foi de preto a
  `#3c4868` e a `#7890d0` (largura toda). **Atenção para quem testar:** com a câmera embaixo (y=32, a superfície
  fica fora da tela) só se vê o brilho da lâmpada ficar mais fraco (×0,4) e o cenário clarear; é o previsto.
- **Chuva automática e ciclo rápido de 24 h** foram conferidos no navegador chamando `clima.atualizar` com passos
  de 1 s (3.900 s simulados), **não em tempo real**: a chuva alternou 9 vezes, com períodos secos de 370 a 1.019 s
  (config: 300 a 1.200) e chuvas de 60 a 180 s (config: 60 a 240), 79 relâmpagos, todos com chuva; o ciclo
  deu a volta em 60 s e voltou à mesma hora. Continua sem uma espera real de 5 a 20 min.
- Detalhe do painel: ao voltar a chuva para "automática" depois de forçá-la, ela continua como estava (chovendo
  ou não) até o contador interno de alternância zerar; só então segue o ritmo automático.

## 13. Para o usuário olhar e ajustar

A aparência é o que mais depende de gosto: tons da noite e do amanhecer (`TOM_NOITE`, `TOM_AURORA` em
`render/luz.js`), quantidade e tamanho das estrelas (`ceu.js`), raios de luz (`raios.js`, ou tirá-los), chuva
(`chuva.js`) e o clarão do relâmpago (`COR_DO_CEU_NO_RAIO`). Os tempos da chuva e do relâmpago e as horas do
dia estão no bloco `clima` do `jogo.json`.
