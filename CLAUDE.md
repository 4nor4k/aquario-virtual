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
- Fechado: `05-arquitetura.md` (seção 9, Fase B, fica como proposta até o hardware chegar). Git: só local por enquanto; nome do projeto
  provisório "Aquário". Pasta `C:\dev\aquario-virtual`; autor dos commits "Anorak".
  Primeiro commit feito. Pendente: apagar cópia antiga do OneDrive (se existir).
- Depois: `06-web.md`, e só então o código (v0.1).

## Pontos técnicos já levantados
- Proposta de renderizar em 120×120 com escala 2× (128 daria escala não inteira).
- Mundo 360×240: usar tiles/camadas; não guardar como imagem única.
- Joystick nos pinos ADC1 (ADC2 não funciona com WiFi).
- Sem RTC na v1: ver "Tempo sem RTC" em `docs/02-hardware.md`.
