// Converte o quadro indexado (1 byte por pixel, valor 0 a 15) em cores RGB no canvas.
// No aparelho, este passo vira a conversão para RGB565 e o envio ao display.
import { PALETA } from './palette.js';

export const LARGURA = 120;
export const ALTURA = 120;

export function criarQuadro() {
  return new Uint8Array(LARGURA * ALTURA);
}

export function mostrarQuadro(ctx, quadro) {
  const imagem = ctx.createImageData(LARGURA, ALTURA);
  const px = imagem.data;
  for (let i = 0; i < quadro.length; i++) {
    const [r, g, b] = PALETA[quadro[i]];
    px[i * 4] = r;
    px[i * 4 + 1] = g;
    px[i * 4 + 2] = b;
    px[i * 4 + 3] = 255;
  }
  ctx.putImageData(imagem, 0, 0);
}
