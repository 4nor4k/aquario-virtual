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
  Nome do projeto provisório: "Aquário". Uma tag por versão (`v0.1` já criada).
  Pendente: apagar cópia antiga do OneDrive (se existir).
- Fechado: `06-web.md` (página do celular; design visual fica para depois do v0.5).
- **v0.1 do simulador concluída** (`sim/`, doc `07-plano-v0.1.md`, resultado na seção 8):
  beta nada, câmera por teclado, fases por idade, painel de tempo (1×/60×/3600×).
  Rodar: `cd sim` e `node servidor.js` (http://localhost:8080); testar: `node --test`.
  No PowerShell o `npm` pode ser bloqueado: usar `node` ou `npm.cmd`.
- Próximo: **v0.2** (fome, sujeira, pH, saúde, doença, morte, Game Over, menu A/B/C).
  **Plano fechado em 16/11/2026: `docs/08-plano-v0.2.md`** (usuário aceitou as recomendações;
  pH ficou mais lento: 36/24/12 h, já no `03`). As dúvidas de ovos/segundo parceiro ficam para
  o plano da v0.4.
  **v0.2, passos 1 e 2 feitos** (config em `sim/config/jogo.json`, `core/rules.js`: saciedade,
  sujeira, pH, saúde, doença, morte por falta de cuidado e velhice, Game Over lógico, eventos
  em `core/events.js`; ações darComida/limparAquario/regularPh; 135 testes). `criarAquario`
  exige `config`. No peixe: `estado` = saúde (`saudavel`/`doente`/`morto`), `movimento` = nado.
  Medido: sem cuidado morre em 3,7 dias; só vive 30 dias limpando e regulando pH a cada 2 dias
  (ajustar no passo 6). Próximo: **passo 3** (fonte de pixels, HUD, peixe doente e morto).
  Por enquanto o peixe morto só fica parado na tela e o doente nada normal.
  O usuário costuma ter o servidor aberto na porta 8080: não encerrar processos dele;
  testar em outra porta (`PORT=`).

## Pontos técnicos já levantados
- Proposta de renderizar em 120×120 com escala 2× (128 daria escala não inteira).
- Mundo 360×240: usar tiles/camadas; não guardar como imagem única.
- Joystick nos pinos ADC1 (ADC2 não funciona com WiFi).
- Sem RTC na v1: ver "Tempo sem RTC" em `docs/02-hardware.md`.
