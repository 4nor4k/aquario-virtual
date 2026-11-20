// A paleta do jogo. O visual é PRETO E BRANCO com dithering (mono.js), com alguns toques de cor
// SÓLIDA: os índices em COLORIDOS (abaixo) saem do dithering e aparecem na própria cor da PALETA.
// Hoje só o texto, o HUD, as bolhas e a pupila/olho do peixe ainda passam pelo preto e branco.
//
// Os desenhos guardados (sprites, blocos do cenário) usam só os índices 0 a 15 (4 bits por pixel).
// Os índices 16 em diante existem só no quadro de 120×120 (1 byte por pixel, 14 KB no aparelho).
// As algas grandes são geradas por código (plantas.js), por isso podem usar os índices 20 a 23.
//
// O índice 0 é "sem cor" nos sprites (transparente).
export const PALETA = [
  [0x00, 0x00, 0x00], //  0 transparente (nos sprites)
  [0x00, 0x00, 0x00], //  1 água e ar (preto sólido)
  [0x3a, 0x3e, 0x45], //  2 pedras do fundo: cinza escuro (miolo)
  [0x55, 0x5a, 0x63], //  3 pedras do fundo: cinza mais claro (borda de cima)
  [0x10, 0xab, 0x8c], //  4 verde das algas grandes (#10AB8C)
  [0x86, 0xd0, 0xf2], //  5 azul claro: linha da superfície e água que cai do filtro
  [0xe6, 0xd3, 0xa3], //  6 areia (cor de base)
  [0xc4, 0xab, 0x74], //  7 areia escura (grãos e a camada de baixo)
  [0x6e, 0x73, 0x7c], //  8 rocha: cinza
  [0x4f, 0x53, 0x5b], //  9 rocha sombra: cinza escuro
  [0xff, 0x5d, 0x8f], // 10 rosa
  [0x5e, 0xe6, 0xf0], // 11 ciano
  [0xff, 0xff, 0xff], // 12 branco (olho, brilho)
  [0x1a, 0x1a, 0x24], // 13 contorno
  [0x8a, 0x5c, 0xc9], // 14 roxo
  [0xf2, 0xa6, 0x5a], // 15 laranja
  // Só no quadro (não existem nos desenhos guardados):
  [0x0d, 0x9a, 0x7e], // 16 verde das plantas pequenas, variação A (um pouco mais escuro)
  [0x17, 0xb8, 0x96], // 17 verde das plantas pequenas, variação B (um pouco mais claro)
  [0x22, 0xa8, 0x83], // 18 verde das plantas pequenas, variação C (puxando para o amarelo)
  [0x0b, 0x75, 0x61], // 19 verde escuro das plantas do fundo (mais longe, mais apagado)
  // Detalhes das algas grandes: borda escura, brilho e o degradê, tudo em verdes:
  [0x0a, 0x5c, 0x4c], // 20 verde escuro: borda das folhas e ponta
  [0x6f, 0xe0, 0xbe], // 21 verde claro: brilho
  [0x2a, 0xb2, 0x80], // 22 verde um pouco mais quente: meio da folha
  [0x58, 0xbd, 0x6e], // 23 verde-folha mais claro: ponta da folha (ainda verde, sem amarelo)
  // Grãos de areia, em tons diferentes (só nos blocos de areia, letras g, h e i do cenario.js):
  [0xf6, 0xeb, 0xc6], // 24 grão claro
  [0xd8, 0xb5, 0x6a], // 25 grão dourado
  [0xb3, 0xa5, 0x8a], // 26 grão acinzentado (uma pedrinha)
  // O peixe (beta), em tons de vermelho: o desenho usa corpo, nadadeira/cauda e borda da cauda.
  [0xc0, 0x30, 0x2d], // 27 saudável: corpo, vermelho
  [0xe8, 0x5a, 0x4f], // 28 saudável: nadadeira e cauda, vermelho vivo
  [0xff, 0x9a, 0x80], // 29 saudável: borda da cauda, salmão
  [0x8c, 0x4a, 0x48], // 30 idoso (e morto): corpo, vermelho apagado
  [0xa8, 0x64, 0x60], // 31 idoso: nadadeira e cauda
  [0xc2, 0x8f, 0x85], // 32 idoso: borda da cauda
  [0xc9, 0xa3, 0x9c], // 33 doente: corpo, vermelho pálido
  [0xdd, 0xbb, 0xae], // 34 doente: nadadeira e cauda
  [0xea, 0xd3, 0xc4], // 35 doente: borda da cauda
  // A pedra grande do fundo (cinza-amarronzado, escura por estar longe) e o musgo dela:
  [0x5a, 0x58, 0x50], // 36 pedra grande: tom base
  [0x70, 0x6d, 0x62], // 37 pedra grande: faceta clara (a luz vem de cima e da esquerda)
  [0x45, 0x44, 0x3d], // 38 pedra grande: faceta escura
  [0x2b, 0x2a, 0x25], // 39 pedra grande: rachadura
  [0x3f, 0x8f, 0x52], // 40 musgo
  [0x5d, 0xb3, 0x6b], // 41 musgo claro (o pixel de cima)
  // A água suja: grãos de sujeira escuros (na areia) e claros (no ar da água e boiando).
  [0x2a, 0x25, 0x12], // 42 turvo escuro: grão de sujeira na areia
  [0x8e, 0x88, 0x4a], // 43 turvo claro: partículas boiando e grãos sobre a areia
  // A comida (grãos de ração): um corpo alaranjado e um brilho.
  [0xe0, 0x84, 0x28], // 44 grão de comida
  [0xf7, 0xc0, 0x6a], // 45 brilho do grão de comida
  // O cocô do peixe: marrom e um pixel mais claro em cima.
  [0x6b, 0x3f, 0x1c], // 46 cocô
  [0x9a, 0x62, 0x32], // 47 cocô: pixel claro
  // A cor da água suja (muda de preto a marrom-esverdeado; turvacao.js mexe nela) e o bolor do vidro.
  [0x00, 0x00, 0x00], // 48 água suja (começa preta, igual à água limpa)
  [0x2f, 0x5a, 0x1f], // 49 bolor no vidro: verde escuro
  [0x58, 0x86, 0x2e], // 50 bolor no vidro: verde mais claro (borda)
  // Os ovos do casal (creme com um brilho) e os corações do namoro (rosa e rosa claro).
  [0xff, 0xdc, 0xe6], // 51 ovo (rosado bem claro, para aparecer na água preta e perto da areia)
  [0xff, 0xff, 0xff], // 52 ovo: brilho
  [0xff, 0x5d, 0x8f], // 53 coração
  [0xff, 0xb4, 0xcb], // 54 coração: brilho
  // O clima (doc 11): o céu no clarão do relâmpago (a luz.js muda a cor), as estrelas, a chuva, o gelo
  // do ícone de frio e os raios de luz do dia (a luz.js escolhe a intensidade).
  [0x00, 0x00, 0x00], // 55 céu do relâmpago (começa preto)
  [0x9a, 0xa8, 0xd0], // 56 estrela fraca
  [0x8f, 0xb4, 0xd8], // 57 chuva: gotas e anéis
  [0xa8, 0xe8, 0xff], // 58 gelo: ícone de frio
  // O brilho (glow) do spot de luz da noite (render/spot.js; a luz.js escolhe a intensidade): 7 degraus de
  // azul, do mais fraco (borda) ao mais forte (centro). Valem para a noite no máximo.
  [11, 24, 35],   // 59 brilho 1 (borda)
  [20, 42, 62],   // 60 brilho 2
  [28, 59, 88],   // 61 brilho 3
  [36, 75, 112],  // 62 brilho 4
  [44, 90, 135],  // 63 brilho 5
  [51, 105, 158], // 64 brilho 6
  [58, 120, 180], // 65 brilho 7 (centro)
];

// Quão claro cada índice aparece em preto e branco: 0 = preto, 16 = branco (mono.js).
// Regra: o que é texto, borda ou destaque fica em 16 (branco sólido, senão a letra de 1 pixel
// de largura quebra); os tons do meio ficam para a areia e o corpo do peixe.
// Os índices em COLORIDOS não passam por aqui (são sólidos, na cor própria); ficam com 16.
export const TONS = [
  0,  //  0 transparente (nunca chega à tela)
  0,  //  1 água e ar   (preto sólido)
  16, //  2 pedras do fundo   (colorido)
  16, //  3 pedras do fundo   (colorido)
  16, //  4 verde das algas   (colorido)
  16, //  5 azul claro        (colorido)
  16, //  6 areia             (colorido: areia sólida)
  16, //  7 areia escura      (colorido)
  16, //  8 rocha             (colorido)
  16, //  9 rocha sombra      (colorido)
  16, // 10 rosa      (nadadeiras, alertas, seta do menu)
  16, // 11 ciano     (borda da cauda, bordas, barras)
  16, // 12 branco    (olho, texto)
  0,  // 13 contorno  (preto: pupila, fundo das caixas)
  8,  // 14 roxo      (corpo do peixe: xadrez, o olho branco e a pupila preta aparecem)
  16, // 15 laranja   (títulos, aviso de doente)
  16, // 16 verde planta A   (colorido)
  16, // 17 verde planta B   (colorido)
  16, // 18 verde planta C   (colorido)
  16, // 19 verde do fundo   (colorido)
  16, // 20 a 23: detalhes das algas grandes (coloridos)
  16, // 21
  16, // 22
  16, // 23
  16, // 24 a 26: grãos de areia (coloridos)
  16, // 25
  16, // 26
  16, // 27 a 35: o peixe, em vermelho (colorido)
  16, // 28
  16, // 29
  16, // 30
  16, // 31
  16, // 32
  16, // 33
  16, // 34
  16, // 35
  16, // 36 a 41: a pedra grande do fundo (colorida)
  16, // 37
  16, // 38
  16, // 39
  16, // 40
  16, // 41
  16, // 42 a 43: o turvo da água suja (colorido)
  16, // 43
  16, // 44 a 45: a comida (colorida)
  16, // 45
  16, // 46 a 47: o cocô (colorido)
  16, // 47
  16, // 48 água suja (colorida)
  16, // 49 a 50: bolor (colorido)
  16, // 50
  16, // 51 a 52: ovo (colorido)
  16, // 52
  16, // 53 a 54: coração (colorido)
  16, // 54
  16, // 55 a 59: clima (colorido)
  16, // 56
  16, // 57
  16, // 58
  16, // 59 a 65: brilho do spot de luz da noite (colorido)
  16, // 60
  16, // 61
  16, // 62
  16, // 63
  16, // 64
  16, // 65
];

// Índices que não passam pelo preto e branco: são pintados sólidos, na cor da PALETA.
export const COLORIDOS = [2, 3, 4, 5, 6, 7, 8, 9, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65];

// Nomes para quem desenha (os números acima são os índices da PALETA).
export const COR = {
  AGUA: 1,
  PEDRA_FUNDO: 2,
  PEDRA_FUNDO_BORDA: 3,
  VERDE_ALGA: 4,
  AZUL_AGUA: 5,
  PEDRA: 8,
  PEDRA_SOMBRA: 9,
  VERDES_PLANTA: [16, 17, 18],
  VERDE_FUNDO: 19,
  // As algas grandes: o corpo é o VERDE_ALGA (#10AB8C) e estes são os detalhes.
  ALGA_BORDA: 20,
  ALGA_BRILHO: 21,
  ALGA_MEIO: 22,
  ALGA_PONTA: 23,
  AREIA: 6,
  AREIA_ESCURA: 7,
  // Grãos de areia (claro, dourado, acinzentado).
  GRAOS: [24, 25, 26],
  // O peixe: corpo, nadadeira/cauda e borda da cauda, em cada estado de saúde.
  BETA: { corpo: 27, nadadeira: 28, borda: 29 },
  BETA_IDOSO: { corpo: 30, nadadeira: 31, borda: 32 },
  BETA_DOENTE: { corpo: 33, nadadeira: 34, borda: 35 },
  // A pedra grande do fundo e o musgo dela.
  PEDRA_GRANDE: { base: 36, clara: 37, escura: 38, rachadura: 39, musgo: 40, musgoClaro: 41 },
  // A água suja (turvacao.js): os grãos de sujeira, a cor da água e o bolor do vidro (bolor.js).
  TURVO: 42,
  TURVO_CLARO: 43,
  AGUA_SUJA: 48,
  BOLOR: 49,
  BOLOR_CLARO: 50,
  // Os ovos (render/ovos.js) e os corações do namoro (render/coracoes.js).
  OVO: 51,
  OVO_BRILHO: 52,
  CORACAO: 53,
  CORACAO_CLARO: 54,
  // O clima (render/luz.js, ceu.js, chuva.js, spot.js, hud.js).
  CEU_RELAMPAGO: 55,
  ESTRELA_FRACA: 56,
  CHUVA: 57,
  GELO: 58,
  SPOT: [59, 60, 61, 62, 63, 64, 65], // o brilho do spot da noite (spot.js), do mais fraco ao mais forte
  // A comida (comida.js).
  GRAO: 44,
  GRAO_BRILHO: 45,
  // O cocô do peixe (cocos.js).
  COCO: 46,
  COCO_CLARO: 47,
};

// --- As cores do peixe (doc 09, seção 5; novo desenho no doc 04, seção 8) ----------------------
// Cada cor do peixe tem 8 "papéis" (PAPEIS_DO_PEIXE), que o desenho do beta usa:
//   corpo       o corpo (tom médio)               sombra     o corpo embaixo (mais escuro)
//   brilho      o corpo em cima (mais claro)      contorno   a linha escura em volta e entre as partes
//   nadadeira   nadadeira e cauda (base)          clara      nadadeira e cauda (meio)
//   borda       nadadeira e cauda (pontas, o mais claro)
//   destaque    o "segundo tom": os raios coloridos da cauda e das nadadeiras
// O vermelho é o de sempre (corpo, nadadeira e borda escolhidos à mão, índices 27 a 35). Nas outras
// cores se escolhem 4 tons à mão (corpo, nadadeira, borda e destaque). O resto sai por conta
// (contorno, sombra, brilho e clara são misturas), assim como o tom de IDOSO (apagado) e o de
// DOENTE (pálido); tudo isso entra no fim da PALETA, depois do índice 47.
// Para acrescentar uma cor: ponha o nome em config/jogo.json ("cores") e os 4 tons aqui.
export const PAPEIS_DO_PEIXE = ['corpo', 'nadadeira', 'borda', 'contorno', 'sombra', 'brilho', 'clara', 'destaque'];

const TONS_DAS_CORES = {
  azul:    { corpo: [0x2f, 0x5f, 0xc0], nadadeira: [0x5a, 0x8c, 0xf0], borda: [0x9f, 0xc4, 0xff], destaque: [0xff, 0xd2, 0x4a] },
  roxo:    { corpo: [0x7a, 0x3f, 0xb5], nadadeira: [0xa3, 0x6b, 0xe0], borda: [0xd1, 0xaa, 0xf5], destaque: [0xff, 0x8a, 0xd8] },
  laranja: { corpo: [0xd9, 0x74, 0x1a], nadadeira: [0xf2, 0x9a, 0x3d], borda: [0xff, 0xd0, 0x8a], destaque: [0xff, 0xe4, 0x5e] },
  verde:   { corpo: [0x3a, 0xa6, 0x4a], nadadeira: [0x5f, 0xc8, 0x6a], borda: [0xb0, 0xea, 0xa6], destaque: [0xe8, 0xf2, 0x6a] },
  rosa:    { corpo: [0xd9, 0x4f, 0x9a], nadadeira: [0xf2, 0x7a, 0xb8], borda: [0xff, 0xbf, 0xe0], destaque: [0xc7, 0xa2, 0xff] },
};
// O destaque do vermelho (o corpo, a nadadeira e a borda dele já estão na PALETA, índices 27 a 35).
const DESTAQUE_DO_VERMELHO = [0xff, 0xb3, 0x47];

const misturar = (a, b, parte) => a.map((v, i) => Math.round(v * (1 - parte) + b[i] * parte));
const brilho = (c) => Math.round(0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]);
// Idoso: metade do caminho até o cinza de mesmo brilho, um pouco mais escuro.
const apagar = (c) => misturar(c, [brilho(c), brilho(c), brilho(c)], 0.5).map((v) => Math.round(v * 0.93));
// Doente: quase todo o caminho até um bege claro.
const empalidecer = (c) => misturar(c, [212, 196, 188], 0.75);

// Põe uma cor na PALETA (como cor sólida, sem dithering) e devolve o índice dela.
function registrar(rgb) {
  PALETA.push(rgb);
  TONS.push(16);
  const indice = PALETA.length - 1;
  COLORIDOS.push(indice);
  return indice;
}

const PRETO = [0, 0, 0];
const BRANCO = [255, 255, 255];

// Dos 3 tons principais (corpo, nadadeira, borda) e do destaque saem os outros 4 papéis.
function completar(t) {
  return {
    ...t,
    contorno: misturar(t.corpo, PRETO, 0.62),
    sombra: misturar(t.corpo, PRETO, 0.3),
    brilho: misturar(t.corpo, BRANCO, 0.32),
    clara: misturar(t.nadadeira, t.borda, 0.5),
  };
}
const transformar = (tons, f) => Object.fromEntries(PAPEIS_DO_PEIXE.map((p) => [p, f(tons[p])]));
const registrarTons = (tons, jaRegistrados = {}) => Object.fromEntries(
  PAPEIS_DO_PEIXE.map((p) => [p, jaRegistrados[p] ?? registrar(tons[p])]),
);

// COR.PEIXE[cor] = { vivo, idoso, doente }, cada um com os 8 papéis (índices da PALETA).
// No vermelho, os 3 tons principais já estavam na PALETA (COR.BETA, COR.BETA_IDOSO, COR.BETA_DOENTE);
// aqui entram só os outros 5 papéis, e as mesmas pastas passam a ter os 8.
const principais = (c) => ({ corpo: PALETA[c.corpo], nadadeira: PALETA[c.nadadeira], borda: PALETA[c.borda] });
{
  const vivo = completar({ ...principais(COR.BETA), destaque: DESTAQUE_DO_VERMELHO });
  Object.assign(COR.BETA, registrarTons(vivo, COR.BETA));
  Object.assign(COR.BETA_IDOSO, registrarTons(transformar(vivo, apagar), COR.BETA_IDOSO));
  Object.assign(COR.BETA_DOENTE, registrarTons(transformar(vivo, empalidecer), COR.BETA_DOENTE));
}
COR.PEIXE = { vermelho: { vivo: COR.BETA, idoso: COR.BETA_IDOSO, doente: COR.BETA_DOENTE } };
for (const [nome, base] of Object.entries(TONS_DAS_CORES)) {
  const vivo = completar(base);
  COR.PEIXE[nome] = {
    vivo: registrarTons(vivo),
    idoso: registrarTons(transformar(vivo, apagar)),
    doente: registrarTons(transformar(vivo, empalidecer)),
  };
}

// --- As cores do status (doc 12): verde, amarelo, vermelho e azul --------------------------------
// A cruz da saúde (verde, amarelo, vermelho) e a faixa do pH (azul, verde, amarelo). A paleta só tem 3 índices
// livres (o limite é 247, os moldes dos sprites usam 248 a 255), então em vez de registrar cores novas estas
// APONTAM para tons que já existem nas cores de peixe: são sólidos e a luz não os escurece (estão em CORES_DO_PEIXE
// da luz.js). Se um dia o usuário refizer os tons dos peixes, estes quatro mudam junto: confira o HUD.
COR.STATUS = {
  verde: COR.PEIXE.verde.vivo.nadadeira,       // #5fc86a
  amarelo: COR.PEIXE.laranja.vivo.destaque,    // #ffe45e
  vermelho: COR.BETA.nadadeira,                // #e85a4f
  azul: COR.PEIXE.azul.vivo.nadadeira,         // #5a8cf0
};

// --- As cores "iluminadas" (o spot da noite, render/spot.js) -----------------------------------
// Onde o spot ilumina, o cenário fica mais claro que no resto. Como o quadro é indexado, cada cor do
// cenário que o feixe alcança ganha uma GÊMEA (outro índice) que a luz.js pinta mais clara a cada quadro.
// PAR_CLARO.get(índice) = índice da gêmea. As cores do peixe não entram (o peixe não muda com a luz).
export const PAR_CLARO = new Map();
{
  const doCenario = [2, 3, 4, 5, 6, 7, 8, 9, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26,
    36, 37, 38, 39, 40, 41, 48];
  for (const i of doCenario) PAR_CLARO.set(i, registrar([...PALETA[i]]));
}

// Para suavizar a borda da luz, as superfícies grandes (areia, pedras, pedra grande, água suja e a alga
// maior) ganham uma segunda gêmea, de claridade INTERMEDIÁRIA: na borda do feixe elas passam por dois
// degraus (escuro, meio, claro) em vez de um salto só. As plantas finas ficam só com a gêmea clara.
export const PAR_MEIO = new Map();
{
  const grandes = [6, 7, 24, 25, 26, 8, 9, 2, 3, 48, 36, 37, 38, 39, 40, 41, 4];
  for (const i of grandes) PAR_MEIO.set(i, registrar([...PALETA[i]]));
}
