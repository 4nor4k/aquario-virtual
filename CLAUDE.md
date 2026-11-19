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
- Fechados: visão (`01`), regras do jogo (`03`), arte e renderização (`04`).
  Hardware em rascunho (`02`).
- Arte: dia e noite com hora real na v1 (troca de paleta); sprites provisórios gerados
  pelo Claude, o usuário refina depois.
- Estratégia: Fase A = simulador no navegador (JS puro, `core/` sem DOM, tempo injetado e
  acelerável); Fase B = firmware ESP32 (PlatformIO, editor Antigravity IDE) quando o hardware chegar.
  Usuário ainda não tem nenhuma peça.
- Fechado: `05-arquitetura.md` (a seção 9, Fase B, fica como proposta até o hardware chegar).
- Git: só local por enquanto. Pasta `C:\dev\aquario-virtual`; autor dos commits "Anorak".
  Nome do projeto provisório: "Aquário". Uma tag por versão (`v0.1`, `v0.2` e `v0.3` criadas).
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
- Próximo: **v0.4** (reprodução e vários peixes: casal, ovos, limite de 5, parceiro adulto).
  Escrever `docs/10-plano-v0.4.md` e fechar com o usuário antes de codar. As dúvidas de ovos além do
  limite e segundo parceiro (`03`, seção 8) entram nesse plano. O código e as regras já aceitam
  N peixes, mas o `main.js`, a tela de status, o HUD e o painel ainda olham só `aquario.peixes[0]`.
- O usuário costuma ter o servidor aberto na porta 8080: não encerrar processos dele;
  testar em outra porta (`PORT=`) e parar só o meu processo.

## Pontos técnicos já levantados
- Proposta de renderizar em 120×120 com escala 2× (128 daria escala não inteira).
- Mundo 360×240: usar tiles/camadas; não guardar como imagem única.
- Joystick nos pinos ADC1 (ADC2 não funciona com WiFi).
- Sem RTC na v1: ver "Tempo sem RTC" em `docs/02-hardware.md`.
