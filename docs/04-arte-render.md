# 04 · Arte e renderização

Legenda: **[fechado]** decidido pelo usuário · **[proposta]** sugestão a confirmar.

## 1. Referências (pasta `referencias/`)

| Arquivo | O que é | O que aproveitar |
|---|---|---|
| `c9a30d...jpg` | Folha de tiles pixel art: ondas, algas, corais rosa, bolhas, luz verde com dithering, fundo azul-esverdeado escuro | **Estilo principal [proposta]**: poucos tons, tiles pequenos, brilho com dithering, destaque em rosa/ciano |
| `5bca81...jpg` | Aquascape real: rochas escuras, areia clara, peixes pequenos | **Composição do cenário**: rochas no fundo, areia embaixo, água limpa em cima |
| `92650...jpg` | Pixel art subaquática: raios de luz, coluna de bolhas, corais laranja | **Clima e efeitos**: raios de luz da superfície, coluna de bolhas, corais coloridos |
| `c5a09f...jpg`, `videoframe_10839.png` | Cenas escuras com luz neon (estilo Animal Well) | **Noite**: ambiente escuro com poucos pontos de luz. Detalhado demais para 120×120 |
| `1c1fef...gif` | Telas em 4 tons de verde (estilo Game Boy) | **Opção retrô** de paleta mínima, e referência de HUD simples |

**Leitura geral:** o tom das referências é retrô, com paleta curta e ambiente de água
escura com acentos coloridos. As cenas mais detalhadas (3 e 4) são inspiração de clima,
não de resolução.

## 2. Resolução e tela [proposta]

- Janela renderizada: **120×120**, escalada **2×** até 240×240 (escala inteira, pixels nítidos).
  Em vez de 128×128, que daria 1,875× e pixels irregulares.
- Mundo: **360×240** pixels de render = 3 janelas de largura × 2 de altura.
- Mundo montado com **tiles de 8×8**: 45×30 tiles (1.350 bytes de mapa).
  A janela mostra 15×15 tiles.
- Memória: o buffer da janela 120×120 em 16 bits ocupa ~28 KB. Cabe sem PSRAM.

## 3. Cores [proposta]

- Imagens guardadas em **cor indexada** (paleta de 16 cores, 4 bits por pixel), convertidas
  para RGB565 no desenho. Ocupam pouca memória e a paleta pode ser trocada.
- **Troca de paleta faz muita coisa de graça:**
  - a **cor do peixe** (escolhida no celular) é só uma paleta diferente do mesmo sprite;
  - **noite/dia** e **clima** (frio, chuva) podem escurecer ou tingir o cenário inteiro.
- Paleta inicial: fundo azul-esverdeado escuro, areia clara, destaque rosa e ciano
  (da referência principal).

## 4. Camadas [proposta]

1. **Fundo:** água em gradiente com raios de luz (com leve paralaxe, movendo mais devagar que a câmera).
2. **Cenário:** areia, rochas, plantas (tiles).
3. **Peixes.**
4. **Partículas:** bolhas, corações, comida caindo.
5. **Clima:** chuva na superfície, flash do relâmpago, ícone de frio.
6. **HUD:** mínimo. Só avisos (por exemplo, ícone de fome sobre o peixe). O status completo
   fica na tela do botão C.

## 5. Peixes [proposta]

- Sprite desenhado virado para um lado; o outro lado é o mesmo sprite espelhado.
- Tamanho cresce com a idade: **filhote ~10×8**, **jovem ~14×10**, **adulto ~20×14**.
- Animações: **nadar 4 quadros**, **comer 3**, **doente 2** (mais lento e paleta pálida).
  O namoro reutiliza o nadar e adiciona partículas de coração.
- Ovo: sprite pequeno, 2 quadros.
- Beta: corpo curto com cauda e nadadeiras longas.

## 6. Pipeline dos desenhos [proposta]

- Desenhos em PNG com paleta indexada, em `arte/`.
- Um script converte os PNG em arrays C para o firmware.
- No início, geramos **sprites provisórios em código** para testar; você troca depois
  pelos seus.

## 7. Dia e noite [fechado: entra na v1, com hora real]

- O cenário tem **visual de dia** (claro, azul, raios de luz; referências 4 e 5) e **visual de noite**
  (escuro, com brilho neon; referências 1, 2 e 3), conforme a **hora real**.
- É feito por troca de paleta (seção 3), então custa pouca memória.
- Horários iniciais [proposta]: dia das 6h às 18h, com transição curta (entardecer/amanhecer).
- A hora vem do NTP quando há WiFi. Sem WiFi, o aparelho segue contando a partir da
  última hora conhecida. Se nunca sincronizou, assume dia.
- O fuso horário vem da cidade configurada pelo celular.
- Clima (chuva/frio) se combina com dia/noite.
- Como depende de WiFi para a hora, a implementação fica junto do WiFi (ver roadmap).

## 8. Decisões fechadas

- **[fechado]** Sprites provisórios gerados por mim; o usuário refina depois.
- **[fechado]** Quadros de animação da seção 5.
- **[fechado]** Dia e noite com hora real na v1.
- Resolução 120×120 com escala 2×, camadas, paleta indexada e tiles 8×8 continuam como **[proposta]**
  até validarmos no aparelho.

## 9. Em aberto

- Cores exatas das paletas de dia e de noite (definir ao gerar o primeiro cenário).
- Estilo do beta: formato do corpo e das nadadeiras (definir ao gerar o primeiro sprite).
