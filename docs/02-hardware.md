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

## Conectividade [fechado em 2026-11-19, pedido do usuário]
O aparelho **tem WiFi**. Todas as placas ESP32 da lista abaixo já trazem WiFi (e Bluetooth) embutidos: não é preciso
comprar nenhum módulo a mais, nem antena. O que o WiFi faz (celular em casa, rede própria do aparelho, hora e clima) está
em `06-web.md`. Pelo lado do hardware o que importa é: joystick só em ADC1, bateria com folga (WiFi consome ~150 a 200 mA)
e WiFi ligado só quando necessário.

## Lista de compras (proposta, 2026-11-19; nada comprado)

Tudo abaixo é **[proposta]**. Eu não conferi preço nem estoque: o que vale é o anúncio na hora de comprar.

### Para o aparelho
| # | Peça | O que procurar | Qtd |
|---|---|---|---|
| 1 | Placa ESP32 | Uma destas, ou equivalente: **LOLIN D32** (Wemos), **FireBeetle ESP32** (DFRobot) ou **Adafruit HUZZAH32 Feather**. Têm conector de bateria, carregador por USB e consomem pouco. Evitar a "ESP32 DevKit" comum sem carregador | 1 |
| 2 | Display | "**1.3 inch IPS 240x240 ST7789**", 7 pinos (GND, VCC, SCL, SDA, RES, DC, BLK) | 1 |
| 3 | Joystick | "**PSP 3D joystick breakout**" (módulo com a fita já soldada em placa). Tem 4 a 5 pinos: GND, VCC, X, Y | 1 |
| 4 | Botões | Botão tátil 6×6 mm (ou 12×12 mm, mais fácil de apertar) | 3 (comprar 10) |
| 5 | Buzzer | "**Passive buzzer**" 3,3 V ou 5 V, módulo ou avulso. Se vier escrito "active", é o errado | 1 |
| 6 | Bateria | LiPo 3,7 V, 1000 a 1500 mAh, **com proteção**, **conector JST-PH 2 pinos** igual ao da placa. Atenção: a polaridade (+/−) dos fios varia de bateria para bateria e **precisa bater com a placa** | 1 |

### Para montar (ferramentas)
| # | Item | Para quê |
|---|---|---|
| 7 | Protoboard (400 furos) | Montar sem soldar |
| 8 | Fios jumper macho-macho e macho-fêmea | Ligações |
| 9 | Cabo USB **de dados** (o da placa, micro-USB ou USB-C) | Gravar o programa. Cabo só de carga não grava |
| 10 | Ferro de solda, solda e barras de pinos | Muitas placas vêm com os pinos soltos. **Dá para pedir "pinos já soldados"** ou deixar para depois |
| 11 | Multímetro simples (opcional) | Ver se a bateria e a placa estão em 3,3 V |

### Ordem sugerida
1. Comprar **1 a 3** (placa, display, joystick) e os itens 7 a 9: já dá para ver o aquário no display.
2. Depois **4 e 5** (botões, buzzer).
3. **Bateria por último**, quando o resto funcionar. Ela é o único item com algum risco (curto-circuito esquenta e pode pegar fogo). Nunca ligar com a polaridade trocada.

## Pinagem (proposta para a LOLIN D32, a placa escolhida; confirmar no esquema dela)

Regras que usei: joystick só em ADC1 (GPIO 32 a 39); fugir de pinos com função especial na partida (GPIO 0, 2, 5, 12, 15);
GPIO 34 a 39 só servem como entrada (bom para o joystick, ruim para saída).

| Função | Pino do display/peça | GPIO | Observação |
|---|---|---|---|
| Display SCL (relógio) | SCL | 18 | SPI padrão (VSPI) |
| Display SDA (dados) | SDA | 23 | SPI padrão (VSPI) |
| Display DC | DC | 21 | |
| Display RES (reset) | RES | 22 | |
| Display BLK (luz) | BLK | 4 | PWM: dá para regular brilho e apagar a tela para poupar bateria |
| Display GND / VCC | GND / VCC | GND / 3V3 | |
| Joystick X | X | 36 | ADC1 |
| Joystick Y | Y | 39 | ADC1 |
| Joystick GND / VCC | GND / VCC | GND / 3V3 | Alimentar com 3,3 V para o valor nunca passar do que o ESP32 aguenta |
| Botão A | um lado | 25 | `INPUT_PULLUP`; o outro lado vai no GND |
| Botão B | um lado | 26 | idem |
| Botão C | um lado | 27 | idem |
| Buzzer | + | 17 | PWM (LEDC); o outro pino no GND |
| Leitura da bateria | (interna da placa) | 35 | A LOLIN D32 já tem o divisor de tensão ligado aqui |

O display ST7789 de 7 pinos não tem pino CS: não ligar nada nele.

## Primeiros testes quando as peças chegarem (proposta)
Um teste por vez, só avançar quando o anterior funcionar:
1. "Hello": gravar um programa que pisca o LED da placa (confirma cabo, driver e gravação).
2. Display: mostrar cores e depois o quadro do simulador (120×120 em 2×).
3. Botões: mostrar na tela qual está apertado.
4. Joystick: mostrar X e Y, e **achar o ponto central** (o valor em repouso nunca é exato).
5. Buzzer: tocar uma nota.
6. Salvar e ler da memória flash (idade do peixe).
7. Só então juntar tudo no firmware (Fase B, `05-arquitetura.md`, seção 9).
8. Bateria: ligar por último e conferir se a leitura do nível faz sentido.

## Em aberto
- ~~Modelo da placa~~ **[fechado em 2026-11-19]: LOLIN D32** (Wemos). Conferir no anúncio: conector de bateria JST-PH, carregador por USB, pino 35 ligado ao divisor da bateria.
- Pinagem: a tabela acima vale para a LOLIN D32; conferir no esquema da placa antes de ligar.
- Controles: proposta usada no simulador da v0.2; confirmar no aparelho.
- **Tempo desligado sem WiFi:** a seção "Tempo sem RTC" fala em limite máximo de penalidade, mas no simulador
  (v0.3) o tempo com o jogo fechado conta inteiro, sem teto, e é decisão do usuário. No aparelho isso só vale com
  hora real (WiFi); sem ela o relógio pausa. Confirmar com o usuário qual comportamento ele quer.
- Caixa/carcaça do aparelho (impressão 3D, caixa pronta?): não discutido.
