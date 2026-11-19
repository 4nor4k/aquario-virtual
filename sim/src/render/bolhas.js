// Desenha as bolhas (core/bolhas.js): a maioria é um pontinho branco; algumas são um anel 3×3.
import { LARGURA, ALTURA } from './tela.js';

const COR_BOLHA = 12; // branco

function pixel(quadro, x, y) {
  if (x < 0 || x >= LARGURA || y < 0 || y >= ALTURA) return;
  quadro[y * LARGURA + x] = COR_BOLHA;
}

export function desenharBolhas(quadro, bolhas, camera) {
  const cx = Math.round(camera.x);
  const cy = Math.round(camera.y);
  for (const b of bolhas) {
    const x = Math.round(b.x) - cx;
    const y = Math.round(b.y) - cy;
    if (!b.anel) {
      pixel(quadro, x, y);
      continue;
    }
    // Anel 3×3 vazado no meio.
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx !== 0 || dy !== 0) pixel(quadro, x + dx, y + dy);
      }
    }
  }
}
