# Aquário Virtual

Tamagotchi de aquário em ESP32 (display ST7789 240×240, joystick de PSP, 3 botões, buzzer,
bateria + USB), gerenciado também pelo celular via WiFi. Veja `README.md` e `docs/`.

## Como trabalhar neste projeto
- Responder sempre em português.
- O projeto é de uma pessoa iniciante em eletrônica: explicar de forma simples e sugerir
  opções, sem presumir conhecimento prévio.
- **Planejamento antes de código.** Cada bloco é fechado por escrito em `docs/` antes de
  codar. Decisões novas entram no doc correspondente.
- Manter tudo organizado e simples; o projeto cresce por versões (roadmap em `docs/01-visao.md`).
- Nos docs, separar o que é **[fechado]** (decidido pelo usuário) do que é **[proposta]**.

## Onde paramos
- Fechados: visão (`01`), regras do jogo (`03`), arte e renderização (`04`), planos da v0.4 e v0.5 (`10`, `11`).
- Hardware: placa escolhida = **LOLIN D32**; WiFi fechado; lista de compras e pinagem em rascunho (`02`).
  Hardware em rascunho (`02`).
- Arte: dia e noite com hora real na v1 (troca de paleta); sprites provisórios gerados
  pelo Claude, o usuário refina depois.
- Estratégia: Fase A = simulador no navegador (JS puro, `core/` sem DOM, tempo injetado e
  acelerável); Fase B = firmware ESP32 (PlatformIO, editor Antigravity IDE) quando o hardware chegar.
  Usuário ainda não tem nenhuma peça.
- Fechado: `05-arquitetura.md` (a seção 9, Fase B, fica como proposta até o hardware chegar).
- Git: local + GitHub público (ver "GitHub" abaixo). Pasta `C:\dev\aquario-virtual`; autor dos commits "Anorak" (e-mail anônimo do GitHub).
  Nome do projeto provisório: "Aquário". Uma tag por versão (`v0.1` a `v0.8` criadas).
  Pendente: apagar cópia antiga do OneDrive (se existir).
- Fechado: `06-web.md` (página do celular; design visual fica para depois do v0.5).
- **v0.1 do simulador concluída** (`sim/`, doc `07-plano-v0.1.md`, resultado na seção 8):
  beta nada, câmera por teclado, fases por idade, painel de tempo (1×/60×/3600×).
  Rodar: `cd sim` e `node servidor.js` (http://localhost:8080); testar: `node --test`.
  No PowerShell o `npm` pode ser bloqueado: usar `node` ou `npm.cmd`.
- **v0.2 do simulador concluída em 16/11/2026** (plano e resultado em `docs/08-plano-v0.2.md`,
  seção 9; tag `v0.2`; 217 testes). O usuário aceitou as recomendações do plano (pH mais lento:
  36/24/12 h, já no `03`) e pediu para seguir os passos 3 a 6 sem interrupção; ele mesmo vai
  ajustar depois. Entregue: fome, sujeira, pH, saúde, doença, morte (falta de cuidado e velhice
  aos 30 dias), Game Over com condolências, fonte de pixels com acentos, HUD (F/S/P e F/+), peixe
  doente e morto, botões A/B/C (teclado Z/X/C), menu (comida, limpar, pH), tela de status, painel
  com valores editáveis.
  - Números do jogo: `sim/config/jogo.json`. Textos: `sim/config/textos.json`.
  - Balanceamento: `node tools/balanco.js` (em `sim/`). Com os números de hoje, sem cuidado o
    peixe morre em 3,7 dias e só vive 30 dias limpando e regulando o pH a cada 2 dias. **Foi
    deixado assim para o usuário ajustar jogando.**
  - No peixe: `estado` = saúde (`saudavel`/`doente`/`morto`), `movimento` = nado.
    `criarAquario` exige `config`. `core/events.js` existe mas a interface ainda não o usa.
  - Pendente da v0.2: nada. Faltam só as conferências à mão que o plano marca como não feitas
    (3600× esperado por ~95 s reais).
- **Depois da v0.2 (18/11/2026, commit `087c68b`, sem tag):** (1) câmera automática: peixe 5 s fora da
  tela -> câmera o segue por 10 s (`sim/src/render/camera-segue.js`); (2) visual **preto e branco
  com dithering** de Bayer (`sim/src/render/mono.js`, tabela `TONS` em `palette.js`); (3) fundo
  da água preto sólido, superfície ondulada (ar e água pretos sólidos) (`render/superficie.js`) e bolhas
  saindo de dois pontos afastados, com tempos irregulares (`core/bolhas.js`); (4) plantas: 4 modelos
  + 1 alto + 2 algas gigantes (~metade da água), todas balançando (`render/plantas.js`); (5) fundo com paralaxe em 1 camada, só para os lados e **sutil** (85%) (pedras e poucas plantas, a 85% da
  câmera, `render/fundo.js`); (6) filtro do aquário no canto de cima à esquerda com queda d'água animada
  (`render/filtro.js`); (7) **aquário menor: mundo 240×152** (era 360×240), areia na linha 16 com 3 camadas; (8) algas grandes
  em **roseta de folhas largas** (referência de pixel art, verde #10AB8C, degradê só em verdes; a menor é uma variação de 48 px); (9) mais cor sólida: plantas pequenas em variações de verde,
  pedras em cinza cheio, superfície e queda do filtro em azul claro, **peixe em tons de vermelho** e
  **areia cor de areia com grãos** de tons diferentes (`COLORIDOS` em `palette.js`).
  (10) **pedra grande com musgo** na camada de fundo (`render/pedra-grande.js`, referência de pixel art);
  (11) rochas da frente trocadas por **5 pedrinhas de 1 bloco de altura**.
  Decisões de (2) a (11) na seção 8 do `docs/04`. Não existe captura de tela sem navegador no projeto (foi um script temporário).
- **v0.3 concluída em 19/11/2026** (plano e resultado em `docs/09-plano-v0.3.md`, seção 11; tag
  `v0.3`; 367 testes). O usuário disse "manda brasa" e aceitou todas as recomendações. Entregue:
  - **Salvamento em arquivo** `sim/saves/aquario.json` (no `.gitignore`), gravado pelo
    `servidor.js` (`/api/salvo`); `core/salvar.js` só transforma aquário <-> dados; a hora real
    (`Date.now`) só existe no `main.js`. Grava a cada 10 s, depois de ações/Game Over e ao fechar a
    aba. Arquivo estragado vira `aquario.corrompido.json`. Sem jogo (adoção pendente) nada é salvo.
  - **Tempo com o jogo fechado conta inteiro** (`core/ausencia.js`), sem teto (`salvamento.ausenciaMaximaHoras`
    vazio no `jogo.json`); tela "Seu peixe dormiu por X. Bem-vindo de volta!" só se ficou fora
    10 min ou mais. Fim de semana fora mata o peixe (3,7 dias sem cuidado).
  - **6 cores de beta** (vermelho, azul, roxo, laranja, verde, rosa; tons provisórios em
    `render/palette.js`), tela **Adote um peixe** no aparelho (joystick escolhe a cor, A adota) e
    seção **Adoção**, campo **Nome** e **Apagar jogo** no painel. Nome até 12 letras, só o que a
    fonte desenha. Game Over -> A -> adoção. Sexo sorteado e guardado, ainda invisível (v0.4).
  - Estrutura: `criarMenu({ textos, cores, aoNovoJogo({cor}), aoAgir })`; telas `ADOCAO` e
    `BEM_VINDO`; `SPRITES*` são os do vermelho, `spritesDaCor(cor)` tem todos.
  - Pendente da v0.3: nada. Não foi feita à mão a espera de 1 minuto com o servidor desligado.
- **Depois da v0.3 (19/11/2026, sem tag ainda):** (1) "Pular fase" do painel agora só **envelhece o
  peixe** (`aquario.envelhecer`); antes avançava o relógio dias e o peixe morria de fome no caminho;
  (2) filtro em **cinza escuro** sólido; (3) **água suja em 4 faixas, sem pontilhado** (refeita no mesmo dia; `04`, seção 8): 0-40 limpo; 41-60 chão escurece + grãos no chão + partículas flutuando/caindo; 61-90 água muda de cor sólida (preto -> marrom-esverdeado) e a superfície vai de azul a amarelo-barrento; **bolor no vidro das paredes laterais do aquário, preso ao mundo e atrás de tudo, de 61 a 100** (`render/bolor.js`); 91-100 cor inteira; transição de 6 s ao limpar. **Bolhas:** a fonte da direita (x=236) foi tirada; há uma fonte atrás da pedra grande na **camada 3** (paralaxe 70%, `PARALAXE_CAMADA_3`). 480 testes; bolhas mais fortes (~2,5×); a sujeira da comida só entra 5 s depois de comer e bem devagar (6 h; `sujeiraPendente`, `rules.js`, `sujar`); cada grão dá +7 de saciedade (porção = 21; manter o peixe pede comida a cada 8 a 10 h; o excesso acima de 100 é digerido em 5 h; empanturrado até 200 adoece e só melhora ao voltar a 100)
  (`render/turvacao.js`); (4) **comida em grãos** (`core/comida.js`, `render/comida.js`): 3 grãos caem
  devagar, o peixe vai atrás mesmo sem fome; (5) **saciedade de 0 a 200** (100 = cheio; 200 = doente
  por comer demais). Números em `config/jogo.json` (`saciedade`, `comida`, `sujeira`). Decisões em
  `03` (Fome/saciedade) e `04` (seção 8). **cocô** do peixe (`core/coco.js`: de vez em quando e 10 s depois de comer; só animação). **HUD de indicadores** (B na tela do jogo, `render/indicadores.js`; temperatura ainda é valor fixo), **profundidade do peixe** (passa atrás/na frente das algas e da pedra grande) e bolhas pequenas constantes + grandes de vez em quando. 460 testes.
- **Novo design do beta (19/11/2026, sem tag):** adulto **32×26**, jovem 22×18, filhote 14×11 (cauda
  em leque, nadadeiras de cima e de baixo, peitoral, contorno escuro; referência: imagem de pixel art
  do usuário). 8 papéis de cor por cor de peixe (`PAPEIS_DO_PEIXE` em `palette.js`: corpo, sombra,
  brilho, contorno, nadadeira, clara, borda, destaque); cauda ondula por coluna. Desenho em texto em
  `render/sprites.js` (provisório, o usuário refina). Decisões em `04`, seção 8. 474 testes.
- **v0.4 concluída em 19/11/2026** (plano e resultado em `docs/10-plano-v0.4.md`, seção 12; tag `v0.4`; 537 testes). O usuário disse "manda bala" e aceitou as 9 recomendações. Entregue: até 5 peixes (vivos + ovos); **peixe em foco** (`menu.peixeEmFoco`, troca na tela de status com esquerda/direita; HUD, câmera e painel seguem o foco); **casal** só se forma ao **adotar o parceiro** (`aquario.adotarParceiro`, item "Adotar parceiro" do menu e botão do painel); sexo só aparece no adulto (`sexoRevelado`); reprodução em `core/reproducao.js` (adultos, saúde 90 por 30 min seguidos, 3 dias, vaga; ninhada 1 a 3 cortada pelo que cabe; ovos eclodem em 1 h do jogo; filhote com cor de um dos pais, sexo sorteado, "Filhote N"); animação do namoro em tempo real (peixes se encontram, `render/coracoes.js`, `render/ovos.js`); mortos saem do aquário **1 minuto** depois de morrer (`reproducao.morteSomeEmMin`; eram 12 h, mudado a pedido do usuário em 19/11/2026) ou na hora com "Limpar", e aparece a mensagem "Fulano morreu"; ovos seguram o Game Over; salvamento com campos opcionais (arquivo da v0.3 abre); com o jogo fechado o namoro e a eclosão acontecem sem animação. Casal = lista `aquario.casais` (não há `parceiroId` no peixe). Painel: seletor de peixe e "Forçar namoro". Conferido no navegador. Conferências à mão feitas em 19/11/2026 (limite de 5 peixes e ausência longa; doc 10, seção 12). Pendente da v0.4: só ovos na tela "Bem-vindo de volta" (não há resumo).
- **v0.5 concluída em 19/11/2026** (plano e resultado em `docs/11-plano-v0.5.md`, seção 12; tag `v0.5`; 600 testes). O usuário disse "manda bala" **antes de ler o plano**: as decisões foram minhas (marcadas **[proposta]**), a aparência é a parte a ajustar (seção 13 do plano). Entregue: `core/clima.js` (hora do dia por relógio/ciclo rápido/fixa, chuva automática ou forçada, relâmpago, temperatura 16 a 28 °C, frio < 18; sem `Date`: o `main.js` entrega os minutos do relógio do computador); `render/luz.js` (tom por hora multiplicado nas cores coloridas do cenário, chuva escurece, relâmpago clareia; ordem por quadro: `restaurarPaleta` -> turvação -> `aplicarLuz`), `ceu.js` (estrelas e clarão, depois da superfície), `raios.js` (raios de luz de dia), `chuva.js`, ícone de frio no `hud.js`, TEMP do HUD com a temperatura simulada, seção Clima do painel. Água continua preta; bolhas, olhos e UI não escurecem. O clima não é salvo e não afeta o peixe. Conferências feitas em 19/11/2026 (doc 11, seção 12): relâmpago ao vivo no navegador; chuva automática e ciclo de 24 h só **acelerados** (chamando `clima.atualizar` com passos grandes), nunca em tempo real.
- **Depois da v0.5 (19/11/2026, sem tag):** raios de sol **removidos** (`raios.js` apagado); de noite há um **spot de luz em cone** saindo do centro do **topo do aquário**, não da superfície da água (`render/spot.js`): é como uma lâmpada **sempre ligada** (de dia só o brilho fraco, 35%, e o aquário todo iluminado; de noite forte), um **glow suave** (7 degraus de azul, cores 59 a 65) e **o cenário iluminado fica mais claro** (cada cor do cenário ganha uma cor gêmea mais clara, `PAR_CLARO` em `palette.js`; a borda do feixe é suavizada por uma gêmea intermediária, `PAR_MEIO`; a paleta tem 244 cores, o limite é 248: os moldes dos sprites estão em 248 a 255); **as cores do peixe não escurecem** com a hora (`SEM_TOM` em `luz.js`). 605 testes.
- **v0.6 concluída em 19/11/2026 (tag `v0.6`)** (plano e resultado em `docs/12-plano-v0.6.md`, seção 9; 630 testes). Pedidos
  do usuário, depois de uma rodada de conferências à mão: (1) **peixe se abriga da chuva** perto da pedra grande, rente ao chão, **2× mais rápido, indo e vindo ao
  longo da pedra** (aparece nas pontas; ajuste pedido depois, `docs/12` seção 9.1) (`core/abrigo.js`, `atualizarPeixeAbrigado`;
  `abrigoDaChuva` no `jogo.json`; a comida tem prioridade; o peixe da frente da pedra dá a volta antes de entrar por trás);
  (2) **saúde sem número**: cruz "+" verde (70 a 100) / amarela (30 a 69) / vermelha (< 30) **só no HUD B e na tela C**, não
  sobre o peixe (`statusDaSaude` em `rules.js`; `saude.saudavelAPartirDe` no `jogo.json`); (3) **pH**: "pH valor" + quadradinho
  de 5×5 na cor da faixa (azul 6,2 a 6,6 ácido, verde ideal, amarelo 7,5 alcalino), `faixaDoPh`, `ph.faixas`. **Paleta: o limite real é 247 (o `sprites.js` lança erro em 248), sobram 3 índices.**
  As 4 cores do status (`COR.STATUS`) apontam para tons dos peixes (verde, laranja-destaque, vermelho do beta, azul), então
  **mudar as cores dos peixes muda o HUD**. O usuário aceitou as 4 recomendações do plano ("pode"). Conferido no navegador
  (porta 8091). Aparência é proposta minha, a ajustar.
- **v0.7 concluída em 20/11/2026 (tag `v0.7`; testada no celular de verdade, tudo funcionou)** (plano e resultado em
  `docs/13-plano-v0.7.md`; 674 testes). O usuário pediu "a aplicação que rodará no mobile" e escolheu **testar no celular
  de verdade via WiFi**, com o servidor do simulador fazendo o papel do ESP32 ("ponte"). Entregue: **página do celular**
  em `web/` (`index.html`, `estilo.css`, `api.js`, `app.js`; 30 KB; 4 abas; só `api.js` fala com o aparelho), servida
  em `/app/`; `core/estado-api.js` (`montarEstado`, GET /api/estado) e `core/comandos-api.js` (`executarComando`, usa as
  mesmas funções dos botões); `sim/celular.js` + `servidor.js` (ponte: retrato, fila de comandos, online por 4 s);
  `sim/src/sim/ponte.js` (a aba do jogo, a cada 0,5 s); textos em `textos.json` > `celular`.
  **Modo rede:** `REDE=1 node servidor.js` (PowerShell: `$env:REDE="1"; node servidor.js`) abre para a rede de casa; a rede só
  vê `/app/` e a API do celular, o resto dá 403. IP do PC do usuário na rede: muda (DHCP; 192.168.1.101 e depois .100, Ethernet): usar o endereço que o servidor
  mostra ao iniciar ou `ipconfig`; o `26.x` é do Radmin VPN, não serve. Limite: a aba do
  jogo precisa ficar visível (senão o jogo para). Aparência da página é proposta minha. Pendente da v0.7: nada.
- **v0.8 concluída em 20/11/2026 (tag `v0.8`)** (plano e resultado em `docs/14-plano-v0.8.md`; 712 testes). Pedido do usuário: **minigame "Caçar"** no menu
  (A): 1 minuto, larvas que fogem, joystick nada, **B acelera**, **A pausa** (Continuar/Reiniciar/Sair), recorde salvo, câmera travada no peixe.
  O usuário disse "pode" e aceitou as 5 recomendações. Núcleo em `core/cacada.js` (números em `jogo.json` > `cacada`), desenho em
  `render/cacada.js`, recorde no arquivo salvo (`recordeCacada`, opcional; "Apagar jogo" zera). Comer larva **não** mexe em fome/saúde/sujeira.
  `criarMenu` agora recebe `config` e `semente`. Balanço: `node tools/cacada.js` (em `sim/`): bot perfeito faz ~44 larvas, sem B ~14;
  **dificuldade a ajustar pelo usuário jogando**. Não testado à mão: setas + B segurado juntos. Página do celular não tem a caçada.
- **GitHub (20/11/2026):** repositório **público** `github.com/4nor4k/aquario-virtual` criado e enviado a pedido do usuário (branch `main` + tags `v0.1` a `v0.8`).
  Antes do envio reescrevi os 54 commits para o e-mail anônimo `231084968+4nor4k@users.noreply.github.com` (o e-mail real não está no histórico; o git deste
  repositório já usa o anônimo). O `gh` tem duas contas (`4nor4k` ativa e `KatyJu` inativa: outra conta que já estava logada neste PC, não mexer). Enviar de novo (`git push`) e
  **ligar o Pages continuam pedindo um sim explícito** do usuário.
- **v0.9 NO AR (20/11/2026): `https://4nor4k.github.io/aquario-virtual/`.** O usuário autorizou ("pode"): Pages ligado com fonte "GitHub Actions", `git push` do commit `dbcab53`, Action
  `Publicar no GitHub Pages` passou (testes + publicação) e o site responde certo. Cada `git push` na `main` republica sozinho (precisa de novo sim para enviar). Só avisos de
  Node 20 nas actions (não quebra). Falta o teste no celular e a tag. O texto a seguir é do estado antes de publicar.
- **v0.9 implementada em 20/11/2026, SEM tag** (plano e resultado em `docs/15-plano-v0.9.md`, seção 7; 774 testes). O usuário respondeu o plano:
  repositório público **sim**, analógico **contínuo**, PWA **sim**, exportar/importar **sim**. Entregue: `sim/aparelho.html` + `estilo-aparelho.css` (tela em cima,
  analógico à esquerda, A/B/C à direita; deitado: analógico | tela | botões), entrada por toque com multitoque (`input/toque.js`, `combinar.js`), salvamento no
  `localStorage` (`sim/armazenamento-local.js`; o `main.js` escolhe pelo `data-modo="aparelho"`), Opções com exportar/importar/apagar jogo (`backup.js`,
  `aparelho-ui.js`), PWA (`manifest.webmanifest`, `icones/`, `sw.js`), `tools/montar-site.mjs` e `.github/workflows/pages.yml` (testa e publica). Importar um backup **não conta
  o tempo desde a cópia** (proposta minha). Testado no navegador (incl. um "Pages simulado" só com arquivos estáticos). **Pendente:** (1) ele autorizar commit/envio e ligar o
  Pages (passos em `docs/15`, seção 7.1); (2) testar no celular de verdade (multitoque, tamanho, instalar na tela inicial, download do backup; lista na seção 7); (3) tag `v0.9`.
  A aparência é proposta minha (variáveis no topo do CSS). Rodar a página no PC: `node servidor.js` e abrir `http://localhost:8080/aparelho.html`.
- **v0.10 concluída em 22/11/2026 (tag `v0.10`, só local, sem push)** (plano e resultado em `docs/16-plano-v0.10.md`; 800 testes). O usuário disse "pode" e aceitou as 5 recomendações.
  Entregue: **24 efeitos sonoros** do buzzer como lista de notas em `sim/config/sons.json`; `core/som.js` (canal único, prioridade: maior ou igual corta, menor é descartado);
  `core/eventos-som.js` (decide quando cada som toca: eventos do core, trocas de tela, caçada, trovão, grão comido; **sem som ao mover o joystick**);
  `sim/src/sim/audio.js` (Web Audio, onda quadrada, notas agendadas no relógio do áudio); interruptor **Som** (padrão ligado, guardado no `localStorage`)
  e **lista de teste ▶** no painel e nas Opções do celular. O primeiro som sai no primeiro toque/tecla (regra do navegador). **Eu não ouvi os sons:** as melodias
  são palpite meu, o usuário ouve e pede ajustes em `sons.json`. Para o ESP32: `ledcWriteTone` com as mesmas notas. Fora: alarme de fome, volume, música.
- Depois da v0.9: **depois da v0.8** (refinar arte/balanceamento/caçada jogando → esperar o hardware; perguntar ao usuário).
  Antes: **depois da v0.7** (refinar arte/balanceamento/aparência da página jogando → esperar o hardware; perguntar ao usuário).
  Antes: **depois da v0.6** (plano combinado: refinar arte e balanceamento jogando → esperar o hardware).
  Antes: **depois da v0.5.** O roadmap do `docs/01-visao.md` vai da v0.5 direto para a v1.0 (firmware no ESP32, Fase B, quando o hardware chegar) e v1.1 (WiFi, celular, hora e clima reais). Perguntar ao usuário o que quer a seguir: refinar arte e balanceamento, simular a página do celular (doc 06) no navegador, ou esperar o hardware.
  **Plano escrito em `docs/10-plano-v0.4.md` (19/11/2026, rascunho, sem commit): aguardando o usuário confirmar a seção 9 antes de codar.** As dúvidas de ovos além do
  limite e segundo parceiro (`03`, seção 8) entram nesse plano. O código e as regras já aceitam
  N peixes, mas o `main.js`, a tela de status, o HUD e o painel ainda olham só `aquario.peixes[0]`.
- O usuário costuma ter o servidor aberto na porta 8080: não encerrar processos dele;
  testar em outra porta (`PORT=`) e parar só o meu processo.

## Pontos técnicos já levantados
- Proposta de renderizar em 120×120 com escala 2× (128 daria escala não inteira).
- Mundo 360×240: usar tiles/camadas; não guardar como imagem única.
- Joystick nos pinos ADC1 (ADC2 não funciona com WiFi).
- Sem RTC na v1: ver "Tempo sem RTC" em `docs/02-hardware.md`.
