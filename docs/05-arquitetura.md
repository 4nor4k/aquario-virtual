# 05 · Arquitetura do software

Legenda: **[fechado]** decidido pelo usuário · **[proposta]** sugestão a confirmar.

## 1. Estratégia em duas fases [fechado]

Sem hardware ainda, então:

- **Fase A: simulador no navegador.** Validamos o jogo inteiro (regras, arte, controles)
  rodando no computador.
- **Fase B: firmware do ESP32.** Com as peças em mãos, traduzimos para C++ (PlatformIO no VS Code).

Ferramentas: **Antigravity IDE** (editor baseado no VS Code) e **Git** [fechado]. O PlatformIO
só entra na Fase B. Ver a nota de compatibilidade na seção 9.

## 2. Linguagem do simulador [proposta]

JavaScript puro (sem frameworks e sem etapa de build), para ser simples e fácil de portar.
Node.js (já instalado) serve para testes e para um servidor local mínimo.

Alternativa descartada: escrever o jogo em C++ e compilar para WebAssembly. Teria uma base
só, mas a configuração é complexa para quem está começando.

**Custo assumido:** o jogo existirá duas vezes (JS e C++). Para a tradução ser mecânica,
valem as regras da seção 4.

## 3. Estrutura de pastas [proposta]

```
Projeto Aquario Virtual/
  docs/            documentação
  referencias/     imagens de inspiração
  arte/            sprites e cenários (PNG)
  sim/             Fase A: simulador no navegador
    index.html
    config/        números do jogo (tabelas do doc 03) em JSON
    src/
      core/        regras do jogo, SEM nada de navegador
      render/      desenho 120x120, paleta, câmera
      input/       teclado/gamepad -> joystick + botões A, B, C
      sim/         painel de testes (tempo acelerado, clima, etc.)
      main.js
    tests/         testes das regras (rodam no Node)
  firmware/        Fase B: projeto PlatformIO (ESP32)
  web/             página do celular (servida pelo ESP32)
```

## 4. Regras para portar fácil [proposta]

1. **`core/` não conhece o navegador.** Nada de `document`, `canvas` ou `localStorage` dentro dele.
   Isso vira o código C++ do firmware, quase linha a linha.
2. **Tempo injetado.** O jogo pergunta a hora a um `Clock`. No simulador ele pode ser
   acelerado; no ESP32 usa a hora real. Sem isso é impossível testar 30 dias de vida.
3. **Salvamento por interface.** `core` chama `Storage.save/load`; no simulador usa
   `localStorage`, no ESP32 usa a memória flash.
4. **Números em `config/`.** Taxas de fome, sujeira, pH e saúde ficam em um arquivo, não
   espalhadas pelo código. Ajustar o balanceamento vira mexer em um lugar só.
5. **Atualização com passo fixo** (por exemplo, 20 vezes por segundo), igual no ESP32.
6. **Render como no aparelho:** janela de 120×120, paleta indexada de 16 cores, escala 2×.
   O que não couber no simulador, não vai caber no ESP32.
7. **Testes das regras no Node** (`node --test`, sem instalar nada). Os mesmos casos viram
   conferência do código C++ depois.

## 5. Módulos do `core` [proposta]

| Módulo | Responsabilidade |
|---|---|
| `clock` | Hora atual e aceleração |
| `fish` | Dados e ciclo de vida de um peixe (fases, saúde, morte) |
| `aquarium` | Sujeira, pH, lista de peixes (máx. 5), ovos |
| `rules` | Aplica as regras do doc 03 a cada passo |
| `breeding` | Condições e eventos de reprodução |
| `weather` | Clima e hora do dia (simulados no sim; reais no ESP32) |
| `save` | Serializa o estado e o recupera |
| `events` | Avisos para a interface (som, mensagem, Game Over) |

## 6. Painel de testes do simulador [proposta]

Fica ao lado da tela do jogo e **não existe no aparelho**:
- Velocidade do tempo: 1×, 60×, 3600×, e "pular para a próxima fase".
- Ver e editar fome, sujeira, pH e saúde.
- Simular clima (chuva, frio) e hora do dia.
- Forçar reprodução e Game Over.

## 7. Controles no simulador [proposta]

| Aparelho | Teclado |
|---|---|
| Joystick | Setas ou WASD |
| A / B / C | Z / X / C |

Gamepad do navegador também pode funcionar.

## 8. Página do celular

O painel do simulador (nomear, adotar, status, comida, limpeza, pH) pode virar a **página
do celular** (HTML/JS é a mesma coisa). No simulador, falaria com o jogo diretamente; no
ESP32, por uma API. Detalhes no `06-web.md`.

## 9. Fase B: ESP32 [proposta]

- PlatformIO + Arduino framework, no Antigravity IDE (ou pelo terminal).
- **Nota de compatibilidade [proposta]:** o Antigravity é um "primo" do VS Code e usa outra
  loja de extensões (Open VSX). A extensão do PlatformIO e a de C/C++ da Microsoft podem não
  funcionar igual lá. Plano B: usar o PlatformIO pelo terminal (`pio run`, `pio run -t upload`),
  que independe do editor. Verificar na instalação, só quando as peças chegarem.
- Biblioteca gráfica: LovyanGFX ou TFT_eSPI (decidir quando houver a placa).
- Salvamento em LittleFS ou NVS.
- WiFi, servidor web e NTP do Arduino/ESP32.

## 10. Git [fechado: usar Git]

- Um repositório na raiz do projeto, **só local por enquanto** [fechado]. GitHub pode entrar
  depois sem perder o histórico.
- Nome do projeto: **"Aquário"** (provisório) [fechado]. O nome definitivo fica para depois.
- Um commit por passo concluído, uma etiqueta (tag) por versão (v0.1, v0.2...).
- Arquivos de arte e firmware entram no repositório; arquivos gerados não.

## 11. Em aberto

- Nome e e-mail do autor nos commits.
- Confirmar a pasta `C:\dev\aquario-virtual` (fora do OneDrive, evita corromper o `.git`).

Resolvido: repositório remoto → só local por enquanto.
