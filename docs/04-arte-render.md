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
- Mundo: **240×152** pixels de render = 2 janelas de largura × 1,27 de altura (era 360×240; ver seção 8).
- Mundo montado com **tiles de 8×8**: 30×19 tiles (570 bytes de mapa).
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

1. **Fundo:** duas camadas com paralaxe (ver seção 8), movendo mais devagar que a câmera. [Raios de luz: não feitos.]
2. **Cenário:** areia, rochas, plantas (tiles).
3. **Peixes.**
4. **Partículas:** bolhas, corações, comida caindo.
5. **Clima:** chuva na superfície, flash do relâmpago, ícone de frio.
6. **HUD:** mínimo. Só avisos (por exemplo, ícone de fome sobre o peixe). O status completo
   fica na tela do botão C.

## 5. Peixes [proposta]

- Sprite desenhado virado para um lado; o outro lado é o mesmo sprite espelhado.
- Tamanho cresce com a idade: **filhote 14×11**, **jovem 22×18**, **adulto 32×26** (novo design do
  beta, seção 8; antes eram ~10×8, ~14×10 e ~20×14).
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

- **[fechado]** **Dia, noite e clima na v0.5** (plano `11`; o usuário disse "manda bala" e aceitou as recomendações; a
  aparência é a parte mais fácil de ajustar). Em `render/luz.js`, `ceu.js`, `raios.js`, `chuva.js` e `hud.js`:
  - **Hora do dia** = relógio do computador (hora real), independente da aceleração do jogo. Noite até 5h30,
    amanhecer 5h30 a 6h30, dia até 17h30, entardecer 17h30 a 18h30, noite depois (números em `jogo.json`, `clima.horas`).
  - A luz multiplica as cores **coloridas** do cenário: dia 1·1·1 (o visual de sempre), amanhecer e entardecer
    1·0,8·0,66, noite 0,36·0,46·0,78; a chuva tira 18%. Texto, menus, HUD, olhos e **bolhas** não mudam. A água
    continua preta; água suja e areia escura também escurecem. Ordem por quadro: restaurar a paleta, a turvação
    reescreve água e areia, aplicar a luz.
  - **Estrelas** (28, aparecem uma a uma ao escurecer, piscam, somem na chuva) e o **clarão do relâmpago** (o ar
    fica azul-claro `#7890d0`, o cenário clareia) são desenhados **depois** da superfície, que repinta o ar de preto.
  - **Raios de luz** (3 faixas inclinadas de `#0a223a`, só de dia, só na água pura, balançam; `render/raios.js`).
  - **Chuva**: 130 gotas (risquinho de 3 px, `#8fb4d8`) no ar e anéis na linha da água, presas ao mundo.
  - **Frio**: floco de neve 7×7 em `#a8e8ff` (cor que a luz não escurece), canto de cima à direita, com fundo preto.
  - **[proposta]** Todas as cores, tamanhos e quantidades são meus e estão no topo de cada arquivo.
- **[fechado]** Sprites provisórios gerados por mim; o usuário refina depois.
- **[fechado]** Quadros de animação da seção 5.
- **[fechado]** Dia e noite com hora real na v1.
- **[fechado]** Câmera automática (pedido do usuário em 18/11/2026, para dar dinamismo com o jogo
  parado): se o peixe fica **todo fora da tela por 5 s**, a câmera o **segue por 10 s** e para.
  Código em `sim/src/render/camera-segue.js`, tempos em segundos reais.
  - **[proposta]** Detalhes que escolhi e o usuário pode trocar: mexer o joystick cancela e zera a
    contagem; menu aberto congela a contagem; a câmera chega suave (máx. 60 px/s, como o joystick);
    "fora da tela" = nenhum pedaço do sprite visível. Valores no topo do arquivo.
- **[fechado]** Estética **monocromática (preto e branco) com dithering**, como nos celulares
  antigos, mesmo no display colorido (pedido do usuário em 18/11/2026). Isso **substitui a paleta
  colorida da seção 3 na tela**; a paleta de 16 entradas continua existindo no código.
  - Como funciona (`sim/src/render/mono.js` e `palette.js`): o jogo desenha com os mesmos índices;
    só no último passo cada índice vira um **tom de 0 a 16** (tabela `TONS`) e um **dithering
    ordenado de Bayer 4×4** transforma o tom em pontos pretos e brancos. No ESP32 é uma comparação
    por pixel e o quadro final cabe em 1 bit por pixel (1,8 KB).
  - **[proposta]** Escolhas minhas, fáceis de trocar na tabela `TONS`: areia quase branca,
    rochas em meio-tom, corpo do peixe em xadrez.
    Texto, bordas e avisos em branco sólido (letra de 1 pixel quebra em tom médio).
    Peixe com **contorno preto de 1 pixel** para se separar do pontilhado. Emblemas do HUD
    viram quadradinho branco com letra preta. Barra de status imprópria vira xadrez.
  - **[proposta]** O pontilhado fica **preso à tela** (não ao mundo): com a câmera andando, a
    textura fica parada e o cenário "desliza" por baixo dela.
  - O dia/noite (seção 7) continua sendo troca de tabela: noite = tons mais baixos.
  - Os sprites do beta são provisórios e foram pensados em cor; no preto e branco o olho some.
    Refinar quando você redesenhar.
- **[fechado]** Fundo da água **preto sólido**, sem degradê (pedido do usuário em 18/11/2026).
  Só a areia e as rochas (objetos) mantêm o dithering.
- **[fechado]** **Superfície da água** com onda animada e **bolhas** (mesmo pedido):
  - A superfície fica em y = 12 do mundo (`SUPERFICIE_Y`), com onda de até 2 pixels
    (`render/superficie.js`): linha ondulando (hoje **azul claro**) e uns brilhos curtos logo abaixo. O **ar** acima
    dela também é **preto sólido**, sem dithering (pedido do usuário); só a onda separa ar e água.
    O peixe nunca passa da crista da onda.
  - **Bolhas pequenas** (`core/bolhas.js`, `render/bolhas.js`) sobem da areia até a superfície
    saindo de **um ponto** (x = 84, coluna que nunca tem rocha; a segunda fonte, a da direita, foi
    tirada em 19/11/2026, e há outra atrás da pedra grande, ver "Bolhas" abaixo). Maioria é um
    pontinho; 1 em 4 é um anel 3×3. Balançam 1 a 2 pixels e somem ao tocar a superfície.
  - **[proposta]** Onda e bolhas andam em **tempo real** (não aceleram com o 60×/3600×) e não
    afetam o jogo. Tudo nos números do topo desses arquivos.
  - **Tempo das bolhas, irregular:** o intervalo entre bolhas de um ponto é quase sempre comum
    (0,3 a 1,4 s), às vezes uma **rajada** (bolhas coladas) e às vezes uma **pausa** longa
    (2,5 a 6 s). A velocidade de subida também varia bastante (9 a 26 px/s).
- **[fechado]** **Plantas** (pedido do usuário em 18/11/2026; antes só havia areia e rochas), em
  `render/plantas.js`:
  - **4 modelos comuns** (alga em fita, capim, folhas largas, coral) e **1 mais alto** (alga alta, 24 px).
  - **2 algas gigantes** (pedido seguinte): talo em S com folhas alternadas, de **60 e 52 px**, cerca
    de **metade da coluna de água** (ver "Aquário menor" acima). **[proposta]** Li
    "metade da altura do aquário" assim; se for metade do mundo todo (120 px), é só mudar o número
    em `algaGigante(...)`. Ficam a pelo menos 100 px uma da outra.
  - Sorteadas com semente, ficam sobre a areia, **nunca sobre rochas nem nas bolhas**; hoje saem
    cerca de 8 a 9 no total.
  - **Balançam com a água** (pedido seguinte): cada linha da planta se desloca de lado alguns pixels,
    a base fica parada e o alto mexe mais; a onda sobe pela planta e cada uma tem a sua fase.
    Pequenas mexem 1 px, as gigantes até ~3 px na ponta, e as grandes balançam mais devagar.
    Usa o tempo real, como a onda da superfície (`balancoDaLinha`).
  - **[proposta]** Os desenhos são provisórios (talos de 1 pixel, em branco e xadrez): redesenhe
    quando quiser, é só editar os textos no topo do arquivo.
- **[fechado]** **Verde nas algas grandes** (pedido do usuário em 18/11/2026): as 2 algas gigantes são
  **verde #10AB8C** e **ganharam folhas maiores e compridas** (primeiro como lâminas num talo, depois
  refeitas pela referência abaixo). O verde foi o **primeiro toque de cor**, uma exceção à regra do
  preto e branco: os índices em `COLORIDOS` (`palette.js`) saem do dithering e `mostrarQuadro` os
  pinta sólidos, na própria cor (ver "Mais cor" abaixo). **[proposta]** Verde sólido, sem dithering; na
  folha ficam só lâminas cheias, sem xadrez. No aparelho vira só mais uma cor no envio ao display
  (RGB565 de #10AB8C = 0x1551). Para reservar espaço na areia só o talo (17 px) conta, as folhas
  ficam no alto.
- **[fechado]** **Mais cor** (pedido do usuário em 18/11/2026). Continua tudo preto e branco com dithering,
  menos estes elementos, que agora são **cores sólidas, sem dithering** (lista `COLORIDOS` em
  `palette.js`; o quadro passa de 16 para 20 índices, só o quadro: os desenhos guardados seguem
  com 16):
  - **Plantas pequenas, verdes** com **variação pequena do #10AB8C**: três pares de verdes
    (#0D9A7E, #17B896, #22A883), um par por planta, em rodízio. Cada planta usa 2 tons (talo e folha).
  - **Plantas do fundo**: verde mais escuro (#0B7561), por estarem mais longe.
  - **Pedras em cinza cheio**: rochas da frente em #6E737C (sombra #4F535B) e pedras do fundo em
    #3A3E45 (borda de cima #555A63). O cinza tem um leve tom frio.
  - **Superfície da água e água que cai do filtro**: **azul claro #86D0F2** (a linha ondulada, os
    respingos, as bolhinhas do impacto e o fio d'água). A caixa e o tubo do filtro eram brancos com miolo em xadrez; passaram a **cinza escuro sólido** (contorno `#4f535b`, miolo `#3a3e45`, os mesmos das pedras).
  - O ar acima da superfície é o mesmo preto da água (agora o índice 1; o 5 virou o azul).
  - **[proposta]** Os tons exatos são palpite meu: ajuste na `PALETA` e veja na hora.
  - Continuam em preto e branco: texto/HUD e bolhas (e o olho e a pupila do peixe, que são
    branco e preto).
- **[fechado]** **Algas grandes refeitas pela referência** (pedido do usuário em 18/11/2026, com uma imagem
  de pixel art de uma alga): em vez de talo com folhinhas, agora é uma **roseta de folhas largas
  em forma de chama** saindo de um centro estreito, como na imagem. Em `render/plantas.js`
  (`algaRoseta`), gerada por código a partir de curvas de Bézier:
  - 5 folhas na alga de 60 px e 4 na de 48 px: a alga de 60 tem uma folha alta em S, uma menor que se curva
    para dentro e folhas curtas na frente; cada folha cresce rápido, tem a largura máxima no primeiro
    terço e afina até a ponta; as de trás são pintadas antes e as da frente se sobrepõem.
  - **Cores, só em verdes** (pedido do usuário depois de ver: "muita variação de cor, remova o
    amarelo"): corpo no **#10AB8C** na base, **#2AB280** no meio e **#58BD6E** (verde-folha) perto da
    ponta, em degradê com a divisa irregular; **fio de borda escuro** (#0A5C4C) de 1 pixel num dos
    lados de cada folha e **brilhos discretos** (#6FE0BE). Antes tinha oliva e ocre, como na
    referência; foram tirados. **[proposta]** Os verdes do degradê são palpite meu.
  - **As duas algas são da mesma planta, mas a menor é uma variação própria** (pedido do usuário):
    tem **48 px** (a maior tem 60) e as folhas saem em **outra ordem**: a folha alta fica à direita e
    mais reta, uma folha à esquerda abre bem para o lado e volta, e há uma média à direita. Não é a
    maior espelhada (há teste que confere).
  - Cores na paleta (índices 20 a 23): borda #0A5C4C, brilho #6FE0BE, meio #2AB280 e ponta #58BD6E.
  - Continuam balançando com a água. A base reserva 16 px de areia para as outras plantas.
- **[fechado]** **Peixe vermelho** (pedido do usuário em 18/11/2026): o beta agora é "na cor padrão em
  tons de vermelho", **cor sólida** (não mais dithering). Saudável: corpo #C0302D, nadadeira e cauda
  #E85A4F e borda da cauda #FF9A80. **Idoso e morto**: vermelhos apagados (#8C4A48, #A86460,
  #C28F85). **Doente**: vermelho pálido (#C9A39C, #DDBBAE, #EAD3C4). Olho branco e pupila preta
  seguem iguais. **[proposta]** Os tons são palpite meu. O desenho (formato) é o mesmo de antes;
  só as cores mudaram (`CORES_DO_BETA` em `render/sprites.js`).
- **[fechado]** **Areia mais baixa e colorida** (pedido do usuário em 18/11/2026): o substrato perdeu
  **uma camada** (de 4 para 3 blocos de altura; o mundo ficou **240×152**, 30×19 blocos, e a água
  continua com a mesma profundidade). Agora é **cor de areia sólida** (#E6D3A3, com a camada de baixo
  mais escura, #C4AB74) com **grãos em tons diferentes**: claros (#F6EBC6), dourados (#D8B56A),
  escuros e uns acinzentados (#B3A58A, pedrinhas). Cada camada tem **3 variações de bloco**,
  sorteadas ao longo da areia para o padrão não repetir de 8 em 8 pixels (`areiaComGraos` em
  `render/cenario.js`; as letras `g`, `h` e `i` nos blocos são os grãos).
- **[fechado]** **Pedra grande no fundo** (pedido do usuário em 19/11/2026, com uma imagem de pixel art de um
  rochedo): uma pedra **relativamente grande**, de 66×40 px, na **camada de fundo** (a 2ª camada, a
  que tem paralaxe), em `render/pedra-grande.js`. Segue a referência: um **bloco largo e facetado**
  de cinza-amarronzado, com **rachaduras escuras** entre as facetas, **musgo verde** no alto, uma
  **pedra menor na frente, à esquerda** (também com musgo) e **duas pedrinhas soltas** na base.
  - Gerada por código, sempre igual: silhueta com topo largo e degraus; 16 pontos dentro da pedra
    dividem-na em facetas (cada pixel é da faceta do ponto mais próximo), cada faceta tem um tom
    (mais clara no alto e à esquerda, de onde vem a luz); onde duas facetas se encontram o pixel
    vira rachadura; o musgo é uma faixa irregular logo abaixo do topo.
  - Fica perto do meio do mundo (x entre 105 e 135), então aparece logo na tela inicial; é
    desenhada atrás das pedras comuns do fundo e das plantas, e atrás de tudo o que é da frente.
  - Cores novas na paleta (índices 36 a 41): pedra #5A5850 (base), #706D62 (faceta clara), #45443D
    (faceta escura), rachadura #2B2A25, musgo #3F8F52 e musgo claro #5DB36B. **[proposta]** Os tons
    são escuros por estar longe; o musgo é **verde** (na referência é amarelo-limão) para combinar
    com as algas e porque você tirou o amarelo delas. Se quiser o limão, é só trocar os 2 índices.
- **[fechado]** **Pedras da frente bem menores** (pedido do usuário em 19/11/2026: "remover ou mudar para
  pedras bem menores"; escolhi **menores**, para a areia não ficar vazia e a pedra grande do fundo
  ter contra o que contrastar). No lugar dos 3 montes de rocha de até 3 blocos (24 px) de altura,
  agora são **5 pedrinhas de 1 ou 2 blocos de largura e só 1 de altura (8 px)**, em
  `render/cenario.js`, ainda em cinza cheio. Ocupam as colunas 2 a 4, 6 a 8, 14 a 16, 19 a 21 e
  24 a 26; ficam livres as colunas 0 e 1, 9 a 13, 17 e 18, 22 e 23 e 27 a 29 (de onde sobem as
  bolhas, em x = 84 e x = 236). **[proposta]** Li "camada 1" como a camada do jogo (a da frente).
  Para remover de vez, é só tirar o laço das pedrinhas em `gerarMapa`.
- **[fechado]** **Queda d'água do filtro corrigida**: as falhas do fio estavam andando para cima.
  Agora descem (há teste que confere o sentido).
- **[fechado]** **Aquário menor** (pedido do usuário em 18/11/2026: "a sensação é de que está muito
  grande"): o mundo passou de 360×240 para **240×160** (30×20 blocos) e, depois, para **240×152** (30×19, ver "Areia" abaixo). A areia sobe para a linha 16
  (y = 128), a superfície vai para y = 20 (20 pixels de ar em cima), há **3 montes de rocha** em vez
  de 4 (depois trocados por 5 pedrinhas, ver "Pedras da frente bem menores"), as nascentes de bolhas ficam em x = 84 e x = 236, as algas gigantes baixaram para 60 e 52 px
  (de novo cerca de metade da água, que agora tem ~108 px) e o peixe começa em (120, 80).
  **[proposta]** Escolhi esse tamanho; se ainda parecer grande ou ficou pequeno, é só trocar
  `COLUNAS`, `LINHAS` e `LINHA_AREIA` em `core/mundo.js`. Plantas: só o pé precisa estar em areia
  livre, e as pontas podem encostar numa rocha (senão não sobrava lugar).
- **[fechado]** **Paralaxe** (pedido do usuário em 18/11/2026, a partir da referência "Marine Life", de
  Bela Toth, que tem 3 planos: escuro e nítido na frente, tom médio no meio, formas grandes e
  suaves ao fundo). Em `render/fundo.js`: **uma camada de fundo** atrás do jogo, que anda a **85%**
  da câmera (**sutil**, pedido do usuário; era 55%) **só para os lados** (para cima e para baixo não há paralaxe: pedido do usuário), com **6 pedras grandes e apagadas** e **3 plantas ramificadas** que
  balançam. O jogo (rochas, areia, plantas, peixes, bolhas) anda a 100%. Uma 2ª camada, mais longe
  (linha de morros a 25%), existiu por algumas horas e foi **removida** a pedido do usuário.
  - Com a câmera no meio do mundo (x) a camada fica onde estaria no mundo; ao andar para os lados
    ela se desloca só 85% do que a câmera andou (15% a menos). Na vertical ela acompanha o mundo 1 para 1, então
    as pedras ficam sempre apoiadas na areia (o miolo delas desce até o pé da tela, escondido pela
    areia). A versão anterior tinha paralaxe vertical e precisava de remendos para nada flutuar.
  - Ordem de desenho: água preta, fundo, cenário (areia e rochas), plantas, superfície, filtro,
    peixes, bolhas, HUD. Por isso os pixels de água dos blocos (cor 1) não são pintados.
  - **[proposta]** "Mais longe" = **mais escuro**: as pedras do fundo são de um cinza mais escuro
    que o das rochas da frente, e as plantas do fundo têm um verde mais escuro que as da frente.
  - **[proposta]** Fica de fora uma camada **na frente** dos peixes (as silhuetas escuras da
    referência), porque taparia o peixe numa tela pequena.
- **[fechado]** **Filtro do aquário** (pedido do usuário em 18/11/2026, no lugar da camada mais funda),
  em `render/filtro.js`: uma caixa de filtro pendurada no **canto de cima à esquerda** do aquário,
  com um bico por onde a **água cai em um fio animado** até a superfície, respingos ali e bolhinhas
  do impacto logo abaixo, e um tubo de sucção que desce para dentro da água.
  **[proposta]** Li "fixo" como **fixo no aquário** (parte do mundo): só aparece quando a câmera
  vai até o canto de cima à esquerda. Se você queria fixo na **tela** (sempre visível, como uma
  moldura), diga que eu mudo; mas aí a queda não acompanharia a superfície quando a câmera descesse.
- **[fechado]** **Água suja em quatro faixas** (pedido do usuário em 19/11/2026, refeito no mesmo dia),
  em `render/turvacao.js` e `render/bolor.js`. **Sem pontilhado nenhum**: a água muda de **cor
  sólida**, e a sujeira aparece como partículas que flutuam e caem. (Passou por névoa com Bayer, por
  névoa com ruído azul e por cor sólida; o que o usuário quer é esta: cor sólida + partículas.)

  | Sujeira | O que se vê |
  |---|---|
  | 0 a 40 | aquário limpo |
  | 41 a 60 | o **chão escurece** aos poucos (areia e grãos andam até um tom acastanhado escuro, 65% do caminho até `#241e10`, e param no 60); aparecem **grãos de sujeira parados no chão** (claros em cima da areia, escuros na areia) e algumas **partículas flutuando e caindo** (até 30% do total). A água ainda é preta |
  | 61 a 90 | a **água muda de cor**, do preto ao marrom-esverdeado `#584f24` (até 70% da cor em 90); mais partículas (até 70%); a **linha da superfície** (e a água do filtro) vai do azul `#86d0f2` ao amarelo-barrento `#b8aa5e` junto com a água. **O bolor começa no 61** e cresce até o 100 |
  | 91 a 100 | água na **cor inteira** e o **máximo de partículas** (70 flutuando e 60 no chão); o bolor chega ao tamanho máximo no 100 |

  O **bolor** (`render/bolor.js`; `#2f5a1f`, borda `#58862e`) é do **vidro do aquário, dentro da
  água** (correção do usuário em 19/11/2026: antes eu tinha feito na tela/câmera). Ele é preso ao
  **mundo**: 20 manchas irregulares nas **duas paredes laterais** (10 em cada), entre a linha da
  água e a areia, então só aparecem quando a câmera chega perto da parede. Cada mancha começa um pouco
  antes ou depois das outras e cresce a partir do vidro. Como é o vidro, é desenhado **antes de
  tudo** (logo depois de pintar a água): fundo, areia, pedras, plantas e peixes ficam na frente.
  Some aos poucos ao limpar. Só os pixels de **água** (cor 1) são pintados pela cor da água suja:
  plantas, pedras, peixes, comida e bolhas ficam por cima. O ar acima da linha da água não muda. O nível visual **não pula**
  com a sujeira: ele anda até ela em até 6 s, então **limpar o aquário clareia tudo aos poucos**.
  Ao abrir o jogo já aparece como estava. As cores e os limites das faixas são do usuário (as
  faixas) e **[proposta]** meus (os tons exatos, em `render/turvacao.js`: `COR_AGUA_SUJA`,
  `COR_CHAO_ESCURO`, `COR_SUPERFICIE_SUJA`).
- **[fechado]** **Namoro, ovos e corações** (v0.4, plano `10`): `render/coracoes.js` desenha 4 corações rosa de
  5×5 px (`#ff5d8f`, brilho `#ffb4cb`) que saem um após o outro e sobem 16 px do ponto de encontro durante
  os 6 s do namoro, balançando e piscando antes de sumir; `render/ovos.js` desenha o ovo em **3×3 px**,
  redondo em cima, rosado claro (`#ffdce6`) com 1 px de brilho, parado na areia, que **treme** nos últimos
  5 min antes de eclodir. (O ovo 2×2 em creme foi tentado e sumia na areia.) **[proposta]** Tons e
  tamanhos são meus. O sexo não muda o desenho do peixe por enquanto.
- **[fechado]** **Bolhas** (pedido do usuário em 19/11/2026): a fonte da **direita (x = 236) foi
  tirada**; fica só a de x = 84. Foi acrescentada uma **fonte atrás da pedra grande, na camada 3**
  (mais longe que a camada 2 das pedras): ela anda a **70%** da câmera (a pedra, a 85%), é
  desenhada antes de tudo do fundo e fica coberta pela pedra, então as bolhas aparecem saindo de
  trás dela. **[proposta]** Li "camada 3" como uma camada **atrás** da 2 (a da pedra grande); se
  era outra coisa, diga.
- **[fechado]** **Comida** (pedido do usuário em 19/11/2026), em `render/comida.js`: grãos 2×2
  alaranjados (`#e08428`, com 1 pixel de brilho) que são jogados de cima, caem devagar (9 px/s) e
  o peixe vai atrás. Aparecem por cima de tudo, inclusive no ar acima da água. A tela de status
  mostra a saciedade em uma barra de 0 a 200, com uma marquinha no 100 e o que passa disso em
  xadrez rosa (aviso de comer demais). Regras em `03-jogo.md`.
- **[fechado]** **Cocô** (pedido do usuário em 19/11/2026), em `render/cocos.js`: tijolinho marrom
  (`#6b3f1c`, com 1 pixel mais claro `#9a6232`) que cresce de 1×1 a 2×2 ao sair da cauda e depois cai
  até a areia. Aparece por cima do peixe. Regras em `03-jogo.md`.
- **[fechado]** **HUD de indicadores** (pedido do usuário em 19/11/2026), em `render/indicadores.js`:
  botão **B** na tela do jogo mostra e oculta, **por cima do jogo** (não é uma tela nova; a câmera
  e os outros botões continuam funcionando). São cinco caixinhas de 37×18 px, uma em cada canto:
  **FOME** (cima, esquerda; barra de 0 a 200 com marca no 100 e o excesso em xadrez), **SAÚDE**
  (cima, direita), **PH** (baixo, esquerda), **SUJO** (baixo, direita) e **TEMP** (baixo, meio).
  **[proposta]** Como são 5 indicadores para 4 cantos, a temperatura ficou no meio de baixo. O
  valor ruim fica em rosa. **A temperatura da água ainda não existe no jogo**: mostra um valor
  fixo (`agua.temperatura`, 26 °C) até existir o clima/sensor (doc 01 prevê a temperatura real da
  cidade, que só mexe no cenário).
- **[fechado]** **Profundidade do peixe** (pedido do usuário em 19/11/2026), em `core/profundidade.js`
  e `render/profundidade.js`: a cada trajeto o peixe sorteia o plano por onde passa: **frente** (50%,
  na frente de tudo), **meio** (30%, na frente da pedra grande e atrás das algas gigantes) ou
  **fundo** (20%, atrás da pedra grande e das algas). Ele só troca de plano quando o corpo não está
  tocando a silhueta da alga ou da pedra (conferido por pixels), para não "pular". As chances estão
  em `config.profundidade`. Peixe morto fica sempre na frente.
- **[fechado]** **Bolhas** (pedido do usuário em 19/11/2026): as duas nascentes soltam o tempo todo
  bolhas **pequenas** (um pontinho) e, de vez em quando (a cada 3,5 a 9 s), uma bolha **maior** (anel
  3×3, e em 30% delas um anel 5×5) que sobe mais depressa.
- **[fechado]** **Novo design do beta** (pedido do usuário em 19/11/2026, a partir de uma imagem de
  pixel art de um beta azul com nadadeiras amarelas, cremes e lilás). O usuário escolheu as três
  recomendações:
  - **Tamanho:** filhote **14×11**, jovem **22×18**, adulto (e idoso) **32×26** (eram 10×8, 14×10 e
    20×14). Em `TAMANHO_POR_FASE` (`core/fish.js`). Na tela de 120×120 o adulto ocupa mais de um
    quarto da largura: com muitos peixes o aquário fica cheio (vale conferir na v0.4).
  - **Desenho:** visto de lado, virado para a direita. Cauda grande em leque (a parte que ondula),
    nadadeira de cima e de baixo, nadadeira peitoral, olho com brilho, contorno escuro em volta e
    entre as partes. O adulto é o desenho completo; o jovem e o filhote são o mesmo desenho
    simplificado (menos raios e sem peitoral), para o peixe crescer "virando" o adulto.
  - **Cores:** o corpo na cor do peixe e as nadadeiras em tons claros dela, com um **segundo tom**
    (destaque) nos raios da cauda e das nadadeiras (ex.: vermelho com raios laranja, azul com raios
    amarelos). Cada cor passou de 3 para **8 papéis** (`PAPEIS_DO_PEIXE` em `render/palette.js`):
    corpo, sombra, brilho, contorno, nadadeira, clara, borda e destaque. Só o corpo, a nadadeira, a
    borda e o destaque são escolhidos à mão; o resto é mistura. Idoso (apagado) e doente (pálido)
    seguem sendo só troca de cor do mesmo desenho.
  - **Animação:** 4 quadros (repouso, sobe, repouso, desce) em que a cauda **ondula**: cada coluna
    sobe ou desce e a ponta se mexe mais que a base (até 2 linhas no adulto, 1 nos menores).
  - O desenho está em texto em `render/sprites.js` (cada letra é um papel de cor; a lista está no
    topo do arquivo) e continua provisório: o usuário refina depois. Os sprites foram gerados por
    um script temporário que amostra a mesma forma nos três tamanhos.
  - Na tela de adoção o peixe aparece com escala 2× (era 3×), porque o adulto agora tem 32×26.
- Resolução 120×120 com escala 2×, camadas, paleta indexada e tiles 8×8 continuam como **[proposta]**
  até validarmos no aparelho.

## 9. Em aberto

- Cores exatas das paletas de dia e de noite (definir ao gerar o primeiro cenário).
