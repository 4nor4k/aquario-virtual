// Visual monocromático (preto e branco) com dithering, como nos celulares antigos.
//
// O jogo continua desenhando com os 16 índices da paleta (palette.js). Só no último passo,
// na hora de mandar para a tela, cada índice vira um TOM de 0 (preto) a 16 (branco) e o
// dithering transforma o tom em pontinhos pretos e brancos:
//   tom 0  = tudo preto · tom 8 = metade dos pontos acesos (xadrez) · tom 16 = tudo branco.
//
// O dithering é "ordenado" (matriz de Bayer 4×4): cada posição da tela tem um limiar fixo e o
// pixel acende se o tom for maior que ele. A matriz é ancorada na TELA, não no mundo, então a
// textura fica parada quando a câmera anda. É barato (uma comparação por pixel), então no
// ESP32 roda igual, e o quadro final cabe em 1 bit por pixel.
//
// Mesmo display colorido: mostramos só duas cores, PRETO e BRANCO (troque aqui se um dia
// quiser tingir, por exemplo um verde de LCD antigo).

export const PRETO = [0x00, 0x00, 0x00];
export const BRANCO = [0xff, 0xff, 0xff];
export const TOM_MAXIMO = 16;

// Limiares de Bayer 4×4 (valores 0 a 15), na ordem [linha][coluna].
const BAYER_4X4 = [
  0, 8, 2, 10,
  12, 4, 14, 6,
  3, 11, 1, 9,
  15, 7, 13, 5,
];

// O pixel (x, y) fica aceso (branco) para este tom?
export function acesoNoDither(tom, x, y) {
  return tom > BAYER_4X4[(y & 3) * 4 + (x & 3)];
}

// Converte o quadro de índices da paleta em um quadro de 0 (preto) e 1 (branco).
// tons = tabela "índice da paleta -> tom" (TONS em palette.js).
export function quadroParaMono(quadro, largura, tons, saida = new Uint8Array(quadro.length)) {
  for (let i = 0; i < quadro.length; i++) {
    const x = i % largura;
    const y = (i - x) / largura;
    saida[i] = acesoNoDither(tons[quadro[i]], x, y) ? 1 : 0;
  }
  return saida;
}
