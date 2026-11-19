# 02 · Hardware

> Rascunho com sugestões. Nada foi comprado ainda.

## Peças

| Peça | Sugestão | Observação |
|---|---|---|
| Microcontrolador | ESP32 comum (WROOM) em placa **com carregador de bateria integrado** | PSRAM não é necessária com buffer pequeno |
| Display | IPS 1.3" 240×240 ST7789, SPI | Geralmente 7 pinos, sem CS |
| Joystick | Analógico de PSP com **placa breakout** | O original é uma fita flat; precisa do módulo adaptador. Sem clique |
| Botões | 3 botões táteis | Com `INPUT_PULLUP`, sem resistor externo |
| Buzzer | **Passivo** (controlado por PWM) | Permite tocar melodias; o ativo só apita |
| Bateria | LiPo 1S 3,7 V, 1000–1500 mAh, **com circuito de proteção** | Ver estimativa abaixo |

## Energia

### Estimativa de consumo (a validar medindo)
- Offline (sem WiFi, tela ligada): ~60–80 mA
- Com WiFi ativo: ~150–200 mA

Para 3 h, o consumo é de ~240 mAh offline e ~540 mAh com WiFi, então 1000–1500 mAh dá folga.
Para economizar, o WiFi só liga quando necessário.

### Cuidados
- Evitar placas com regulador AMS1117: ele precisa de ~1 V de folga e a bateria não rende
  quando cai perto de 3,5 V. Prefira placas feitas para bateria (regulador de baixa queda).
- Módulo TP4056 puro funciona em protótipo, mas carregar e alimentar ao mesmo tempo
  atrapalha o fim da carga. Placa com gerenciamento de energia é melhor.
- Ler o nível da bateria exige um divisor de tensão no ADC (algumas placas já trazem).

> Antes de comprar, confira no anúncio: conector de bateria, carregador integrado,
> pino de leitura da bateria e os pinos ADC1 livres.

## Pinos (regras)
- Joystick nos pinos **ADC1** (GPIO 32–39). **ADC2 não funciona com WiFi ligado.**
- Display no barramento SPI padrão da placa.
- Buzzer em pino com PWM (LEDC).
- Pinagem final só depois da placa escolhida.

## Controles (proposta)

3 botões + joystick, com um menu único:
- Joystick (menu fechado): move a câmera.
- **A**: abre o menu de ações (comida, limpar, pH...) e confirma.
- Joystick (menu aberto): navega no menu.
- **B**: voltar/cancelar; na tela do jogo (sem menu), mostra/oculta o **HUD de indicadores**
  [fechado em 2026-11-19: camada por cima do jogo, não uma tela nova].
- **C**: tela de status (indicadores, idade, nome).

Vantagem: novas tarefas (filtro, plantas) viram itens de menu sem mudar o hardware.
**Adotada no simulador da v0.2** (2026-11-16, ao aceitar o `08-plano-v0.2.md`): A abre o menu
e confirma, B volta, C abre o status. Itens do menu: Dar comida, Limpar aquário, Regular pH.
Continua **[proposta]** até o usuário confirmar no aparelho de verdade.

## Tempo sem RTC (proposta)
- O ESP32 não guarda a hora sem energia.
- O aparelho salva a idade/hora periodicamente na memória flash.
- Com WiFi, sincroniza a hora real via NTP e calcula quanto tempo ficou desligado.
- Sem WiFi ao ligar, não sabe quanto ficou desligado: o relógio do peixe **pausa**.
- A penalidade pelo tempo desligado tem um limite máximo para não matar o peixe injustamente.
- RTC (DS3231, I2C) fica como melhoria futura, se precisar.

## Em aberto
- Modelo exato da placa ESP32.
- Pinagem.
- Controles: proposta usada no simulador da v0.2; confirmar no aparelho.
