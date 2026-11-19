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
];

// Índices que não passam pelo preto e branco: são pintados sólidos, na cor da PALETA.
export const COLORIDOS = [2, 3, 4, 5, 6, 7, 8, 9, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41];

// Nomes para quem desenha (os números acima são os índices da PALETA).
export const COR = {
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
};

// --- As cores do peixe (doc 09, seção 5) ---------------------------------------------------------
// O vermelho é o de sempre (tons escolhidos à mão, índices 27 a 35). As outras cores têm só 3 tons
// escolhidos (corpo, nadadeira/cauda e borda da cauda); o tom de IDOSO (apagado) e de DOENTE
// (pálido) sai por conta, a partir deles, e entra no fim da PALETA, depois do índice 41.
// Para acrescentar uma cor: ponha o nome em config/jogo.json ("cores") e os 3 tons aqui.
const TONS_DAS_CORES = {
  azul:    { corpo: [0x2f, 0x5f, 0xc0], nadadeira: [0x5a, 0x8c, 0xf0], borda: [0x9f, 0xc4, 0xff] },
  roxo:    { corpo: [0x7a, 0x3f, 0xb5], nadadeira: [0xa3, 0x6b, 0xe0], borda: [0xd1, 0xaa, 0xf5] },
  laranja: { corpo: [0xd9, 0x74, 0x1a], nadadeira: [0xf2, 0x9a, 0x3d], borda: [0xff, 0xd0, 0x8a] },
  verde:   { corpo: [0x3a, 0xa6, 0x4a], nadadeira: [0x5f, 0xc8, 0x6a], borda: [0xb0, 0xea, 0xa6] },
  rosa:    { corpo: [0xd9, 0x4f, 0x9a], nadadeira: [0xf2, 0x7a, 0xb8], borda: [0xff, 0xbf, 0xe0] },
};

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

const registrarTons = (t) => ({
  corpo: registrar(t.corpo), nadadeira: registrar(t.nadadeira), borda: registrar(t.borda),
});
const transformar = (tons, f) => ({ corpo: f(tons.corpo), nadadeira: f(tons.nadadeira), borda: f(tons.borda) });

// COR.PEIXE[cor] = { vivo, idoso, doente }, cada um com { corpo, nadadeira, borda } (índices).
COR.PEIXE = { vermelho: { vivo: COR.BETA, idoso: COR.BETA_IDOSO, doente: COR.BETA_DOENTE } };
for (const [nome, tons] of Object.entries(TONS_DAS_CORES)) {
  COR.PEIXE[nome] = {
    vivo: registrarTons(tons),
    idoso: registrarTons(transformar(tons, apagar)),
    doente: registrarTons(transformar(tons, empalidecer)),
  };
}
