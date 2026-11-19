// Converte o quadro indexado (1 byte por pixel, valor 0 a 15) em pixels pretos e brancos no canvas.
// O visual é monocromático com dithering (mono.js), com toques de cor SÓLIDA: os índices em
// COLORIDOS (palette.js: verdes, azul da água, cinzas das pedras) saem do dithering e são pintados
// na própria cor.
// No aparelho, este passo vira o envio ao display (preto = 0x0000, branco = 0xFFFF em RGB565).
import { TONS, PALETA, COLORIDOS } from './palette.js';
import { quadroParaMono, PRETO, BRANCO } from './mono.js';

export const LARGURA = 120;
export const ALTURA = 120;

export function criarQuadro() {
  return new Uint8Array(LARGURA * ALTURA);
}

const mono = new Uint8Array(LARGURA * ALTURA); // reaproveitado a cada quadro

// Cor sólida de cada índice da paleta, ou null se ele vai pelo preto e branco com dithering.
export const COR_SOLIDA = PALETA.map((cor, i) => (COLORIDOS.includes(i) ? cor : null));

export function mostrarQuadro(ctx, quadro) {
  quadroParaMono(quadro, LARGURA, TONS, mono);
  const imagem = ctx.createImageData(LARGURA, ALTURA);
  const px = imagem.data;
  for (let i = 0; i < mono.length; i++) {
    const [r, g, b] = COR_SOLIDA[quadro[i]] ?? (mono[i] ? BRANCO : PRETO);
    px[i * 4] = r;
    px[i * 4 + 1] = g;
    px[i * 4 + 2] = b;
    px[i * 4 + 3] = 255;
  }
  ctx.putImageData(imagem, 0, 0);
}
