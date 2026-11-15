# 01 · Visão e escopo

## O que é

Um Tamagotchi de aquário. O jogador adota um peixe filhote, dá nome, cuida dele até o fim
da vida natural e pode fazê-lo reproduzir. Roda em um ESP32 portátil (bateria + USB) e é
gerenciado também pelo smartphone via WiFi.

## Decisões fechadas

### Aparelho
- ESP32 + display IPS 1.3" 240×240 (controlador ST7789).
- Joystick analógico de PSP + 3 botões + buzzer.
- Bateria recarregável e alimentação por USB. Meta: **3 h ou mais** longe de casa.
- Funciona offline e conectado ao smartphone.

### Mundo e câmera
- Aquário (mundo) de **360×240**; a tela mostra apenas uma janela dele.
- O joystick move a "câmera" pelo aquário.
- Estilo retrô: renderiza em baixa resolução e escala para a tela (ver proposta abaixo).

### Jogo
- Adoção de um filhote com nome (o nome é dado pelo celular).
- Ciclo: filhote → adulto → fim da vida natural. O peixe envelhece em **tempo real**.
- Adulto desbloqueia adotar um parceiro (macho/fêmea) para reprodução.
- Reprodução gera 1 a 3 filhotes, **sexo aleatório**; cada um recebe nome.
- Indicadores: **fome, pH, sujeira da água** → compõem a **barra de saúde**.
  - Todos impróprios → o peixe **adoece**. Sem cuidado → **morre**.
  - Indicadores melhorando → o peixe recupera a saúde.
  - Sem peixes no aquário → **Game Over** (com mensagem).
- pH: faixa 6,2 · 6,4 · 6,6 · 6,8 · 7,0 · 7,2 · 7,5.
  Quanto mais sujo, mais ácido; solução alcalina corrige. Pode ser ilustrativo.
- Ações no aparelho: **dar comida, limpar aquário, regular pH**.

### Mundo real
- Temperatura da cidade real (via internet).
- Não afeta o peixe, só o cenário: frio mostra ícone de frio; chuva mostra relâmpagos
  e chuva na superfície da água.

### Celular (página servida pelo ESP32)
Deve ter tudo: status dos indicadores, adotar, escolher espécie (beta, guppy, neon...),
editar nome, escolher cor, trocar cenário, adicionar moradores, e também dar comida,
limpar aquário e regular pH.

### Sem RTC na v1
O peixe envelhece em tempo real sem módulo de relógio dedicado. Ver "Tempo" em
`02-hardware.md` e `05-arquitetura.md`.

## Backlog (ideias futuras)
- Tarefas novas: limpar filtro, plantar plantas.
- Novos moradores: camarão e caramujo (ajudam na limpeza).
- Módulo RTC, se a hora offline virar problema.

## Em aberto
- Regras do jogo: ver `03-jogo.md` (seção "Em aberto").
- Controles: 3 botões + joystick, ou menu navegável? (proposta em `02-hardware.md`)
- Escala de renderização: 120×120 com escala 2× em vez de 128×128 (ver `04`).
- Como funciona o QR code / configuração de WiFi (proposta em `06-web.md`).

## Roadmap de versões

Estratégia: primeiro um **simulador no navegador** (Fase A), depois o **firmware do ESP32** (Fase B),
quando as peças chegarem. Ver `05-arquitetura.md`.

### Fase A: simulador no navegador

| Versão | Entrega |
|---|---|
| v0.1 | Janela 120×120 (escala 2×), aquário 360×240, câmera por teclado, 1 peixe nadando (sprites provisórios), painel de tempo acelerado |
| v0.2 | Fome, sujeira, pH, saúde, ciclo de vida, Game Over, menu com A/B/C |
| v0.3 | Salvamento, adoção e nomes pelo painel (futuro celular), espécie e cor |
| v0.4 | Reprodução e vários peixes |
| v0.5 | Clima e hora simulados, dia/noite, efeitos no cenário |

### Fase B: ESP32

| Versão | Entrega |
|---|---|
| v1.0 | Firmware: tela, controles, regras portadas do simulador |
| v1.1 | WiFi, página do celular, hora real (NTP), clima real, salvamento em flash, bateria |
| v2+ | Filtro, plantas, camarão, caramujo, outras espécies |
