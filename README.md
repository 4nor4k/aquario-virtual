# Aquário Virtual

Tamagotchi de aquário rodando em um ESP32, com display colorido, joystick e botões.
Pode ser gerenciado pelo smartphone via WiFi e também funciona offline.

> Status: **v0.5 do simulador pronta** (Fase A). O firmware do ESP32 (Fase B) começa quando
> as peças chegarem.

## Como rodar o simulador

Precisa só do [Node.js](https://nodejs.org). Não há nada para instalar.

```
cd sim
node servidor.js
```

Depois abra **http://localhost:8080** no navegador. Para parar, use `Ctrl+C` no terminal.

- Testes: `node --test` (dentro de `sim/`).
- Outra porta: `PORT=8099 node servidor.js` (no PowerShell: `$env:PORT=8099; node servidor.js`).
- **PowerShell bloqueando o `npm`?** Use os comandos `node` acima, ou `npm.cmd start` /
  `npm.cmd test`.
- Se aparecer `EADDRINUSE`, a porta já está em uso (talvez o simulador esteja aberto em outro
  terminal). Feche o outro ou use outra porta.

## O que o simulador faz

### v0.5: clima, hora do dia, dia e noite

O cenário ganha **hora do dia** e **clima** (só visuais: o clima **não afeta o peixe**):

- **Dia e noite** pela hora do relógio do computador: de dia é o visual de sempre; no amanhecer e no entardecer tudo fica alaranjado; à noite o cenário escurece e azula, aparecem
  **estrelas** no ar e uma **lâmpada** em cima do aquário (ligada também de dia, mais fraca) abre um brilho suave em cone do centro do topo (à noite o que fica na luz é mais claro); o **peixe mantém as cores do dia**, e as bolhas e os olhos continuam brilhando. A água continua preta.
- **Chuva** (sozinha, de tempos em tempos): gotas no ar, anéis na superfície, o cenário escurece um pouco e
  caem **relâmpagos** (o céu e o cenário clareiam por um instante).
- **Frio:** temperatura abaixo de **18 °C** mostra o **ícone de frio** (floco de neve) no canto de cima à
  direita. A temperatura simulada vai de 16 °C (madrugada) a 28 °C (tarde) e aparece no indicador **TEMP**
  do HUD (botão B).
- **Painel, seção Clima:** forçar a **hora** (relógio, ciclo rápido de 24 h em 1 min, ou fixa), a **chuva**
  (automática, ligada, desligada) e a **temperatura**. O clima não é salvo.
- Clima e hora **reais** (internet, NTP) ficam para a v1.1, com o WiFi.

### v0.4: vários peixes, casal e ovos

- **Até 5 peixes** ao mesmo tempo (vivos mais ovos). Na **tela de status** (botão **C**), o joystick
  para os lados **troca o peixe em foco** ("2/3"); o HUD e a câmera automática seguem o peixe em foco.
- Quando o peixe vira **adulto**, o **sexo aparece** (antes é "?") e o menu **Adotar parceiro**
  (ou o painel) adota um parceiro já adulto, de sexo oposto e da cor que você escolher. Cada peixe
  tem no máximo um parceiro; filho só reproduz se você adotar um parceiro para ele.
- O casal **bem cuidado** (os dois adultos, saúde 90 ou mais por 30 min seguidos, 3 dias desde a
  última vez, e vaga no aquário) **namora**: os dois se encontram, sobem corações, aparecem 1 a 3
  **ovos** que caem na areia e **eclodem em 1 hora**. O filhote tem a cor de um dos pais, sexo
  sorteado e se chama "Filhote 1", "Filhote 2"... (renomeie pelo painel). Com o jogo fechado, o
  namoro e a eclosão também acontecem.
- **Peixe morto** sai com "Limpar aquário" ou é retirado sozinho 1 minuto depois de morrer (aparece "Fulano morreu"). Ovos seguram o Game Over.
- No painel: seletor de peixe, **Adotar parceiro** e **Forçar namoro** (para testar sem esperar).

### v0.3: o aquário dura de verdade

- **O jogo é salvo** no arquivo `sim/saves/aquario.json` (a cada 10 segundos, depois de cada
  cuidado e ao fechar a aba). Ao abrir de novo, o peixe continua de onde parou.
- **O tempo com o jogo fechado conta.** Ao voltar, aparece "Seu peixe dormiu por 5 h 20 min.
  Bem-vindo de volta!" (só se ficou fora 10 min ou mais). Fome, sujeira, pH, saúde e idade andaram
  esse tempo todo, e o peixe pode ter morrido. **Um fim de semana fora mata o peixe**, a não ser
  que você ponha um teto em `salvamento.ausenciaMaximaHoras` no `jogo.json`.
- **Adoção:** na primeira vez, e depois do Game Over, a tela **Adote um peixe** deixa escolher a
  cor com o joystick (esquerda e direita) e adotar com **A** (Z no teclado). São 6 cores de beta.
  O nome nasce "Beta"; para mudar, use o painel (campo **Nome** do peixe, ou a seção **Adoção**).
- O arquivo estragado nunca é apagado: ele vira `saves/aquario.corrompido.json` e o jogo começa
  um aquário novo, com um aviso no painel.

### v0.2: o bichinho precisa de cuidado

O beta é um **bichinho que precisa de cuidado**. Ele nasce filhote, cresce em tempo real
(filhote, jovem, adulto e idoso, em 30 dias) e:

- **sente fome** (a saciedade cai 100 pontos a cada 48 h). Ela vai de 0 a 200: até 100 está bem,
  acima é comer demais, e em 200 o peixe **passa mal e adoece**. A comida é jogada em 3 grãos que
  caem devagar, e o peixe vai atrás deles mesmo sem fome;
- **suja a água** (sobe de 0 a 100 em 4 dias, e a água fica cada vez mais **turva**; ao limpar, ela
  clareia aos poucos) e o **pH cai** com o tempo (quanto mais suja a água, mais rápido);
- tem uma **saúde** que sobe ou desce conforme a média dessas três coisas;
- **adoece** (saúde abaixo de 30: cores pálidas, nada devagar) e **morre** (saúde 0, ou 30 dias
  de idade);
- quando morre o último peixe, aparece o **Game Over**, com uma mensagem de condolências, e você
  pode adotar outro.

Para não esperar, o painel acelera o tempo.

### Controles

| No aparelho | No teclado | Na tela do jogo | Com o menu aberto |
|---|---|---|---|
| Joystick | Setas ou WASD | Move a câmera | Escolhe o item |
| Botão A | **Z** | Abre o menu | Confirma |
| Botão B | **X** | Mostra/oculta o HUD de indicadores | Volta |
| Botão C | **C** | Abre o status | (nada) |

O menu tem **Dar comida**, **Limpar aquário**, **Regular pH** e **Adotar parceiro**. O jogo **não pausa** com o menu
aberto. O **HUD de indicadores** (B na tela do jogo) aparece por cima do jogo, sem trocar de tela, com
um indicador em cada canto: fome, saúde, pH, temperatura da água e sujeira. No Game Over, **Z** abre a tela de adoção.

Avisos na tela: no cantinho de cima, **F** (fome), **S** (sujeira) e **P** (pH) aparecem quando
aquele indicador está ruim; sobre o peixe, **F** (fome) e **+** (doente).

### Painel ao lado da tela (só no simulador)

| Controle | O que faz |
|---|---|
| 1× / 60× / 3600× | Velocidade do tempo. A 3600×, 1 dia de vida leva 24 segundos |
| Pular fase | Vai direto para o começo da próxima fase |
| Apagar jogo | Apaga o jogo salvo e volta à adoção (pede um segundo clique para confirmar) |
| Nome (do peixe) | Escreva e aperte Enter para renomear (até 12 letras) |
| Adoção | Nome, cor e botão **Adotar**; só vale sem peixe vivo (Game Over ou primeira vez) |
| Saciedade, sujeira, pH, saúde | Mostram os valores; escreva um número para testar |
| Dar comida, Limpar, Regular pH | Os mesmos cuidados do menu |
| Matar peixe | Para testar o Game Over |
| Tela 2× / 4× | Só aumenta a imagem no computador |

Som: o jogo tem 23 efeitos sonoros para o buzzer (liga/desliga e lista de teste no painel e nas Opções do celular; ver [docs/16-plano-v0.10.md](docs/16-plano-v0.10.md)).
Ver o roadmap em [docs/01-visao.md](docs/01-visao.md).

## Como ajustar o jogo

- **Números do jogo** (fome, sujeira, pH, saúde): `sim/config/jogo.json`.
- **Todos os textos** (menu, mensagens, status, condolências): `sim/config/textos.json`.
  Só dá para usar letras de A a Z (com acentos), números e `. , : ! ? - + / % ' ( ) < >`.
  Se escrever algo que a fonte não tem, o teste `node --test` avisa qual é.
- Depois de mexer, **recarregue a página** (F5).
- **Quanto tempo o peixe aguenta?** Rode `node tools/balanco.js` (dentro de `sim/`). Ele mostra
  quando o peixe adoece e morre em cada rotina de cuidado, com os números do `jogo.json`.
  Para comparar uma ideia sem mexer no arquivo oficial: `node tools/balanco.js meu-teste.json`.

Com os números de hoje, o peixe morre em **3,7 dias sem cuidado nenhum**, e só vive os 30 dias se
você alimentar todo dia e limpar o aquário e regular o pH **a cada 2 dias**. Se achar exigente
demais, o `docs/08-plano-v0.2.md` (seção 6) mostra o que mexer: deixar o pH mais lento e a
sujeira mais devagar (por exemplo, pH em 48 / 36 / 18 h e `diasParaEncher` em 6) faz a rotina de
"a cada 3 dias" bastar.

Para desenvolvedores: abrindo `http://localhost:8080/?debug`, o objeto `__debug` fica
disponível no console do navegador (`camera`, `clock`, `config`, `textos`, `menu`, `aquario()`,
`salvamento`, `salvar()`, `clima`).

## Documentação

| Doc | Assunto | Status |
|---|---|---|
| [01-visao.md](docs/01-visao.md) | Visão, decisões fechadas, backlog e versões | fechado |
| [02-hardware.md](docs/02-hardware.md) | Peças, energia, pinagem | rascunho |
| [03-jogo.md](docs/03-jogo.md) | Regras: ciclo de vida, indicadores, reprodução | fechado (números a ajustar jogando) |
| [04-arte-render.md](docs/04-arte-render.md) | Sprites, câmera, tiles, escala, dia/noite | fechado |
| [05-arquitetura.md](docs/05-arquitetura.md) | Simulador, módulos, pastas, Git | fechado (Fase B, seção 9, é proposta) |
| [06-web.md](docs/06-web.md) | Página no celular, conexão, API | fechado |
| [07-plano-v0.1.md](docs/07-plano-v0.1.md) | Plano e resultado da v0.1 | concluído |
| [08-plano-v0.2.md](docs/08-plano-v0.2.md) | Plano e resultado da v0.2 | concluído |
| [09-plano-v0.3.md](docs/09-plano-v0.3.md) | Plano e resultado da v0.3 (salvar, adotar, cores) | concluído |
| [10-plano-v0.4.md](docs/10-plano-v0.4.md) | Plano e resultado da v0.4 (vários peixes, casal, ovos) | concluído |
| [11-plano-v0.5.md](docs/11-plano-v0.5.md) | Plano e resultado da v0.5 (clima, hora do dia, dia e noite) | concluído |

## Como trabalhamos

1. Fechar cada bloco por escrito (docs acima).
2. Só depois codar, em versões pequenas (v0.1, v0.2, ...).
3. Decisões novas entram no doc correspondente.
4. Um commit por passo concluído e uma etiqueta (tag) por versão.
