// Desenha os grãos de comida (core/comida.js): um quadradinho 2×2 alaranjado com um brilho no
// canto de cima. Aparecem por cima de tudo, para dar para ver onde caem, inclusive no ar acima da
// água (a comida é jogada de cima).
import { visivel } from '../core/comida.js';
import { LARGURA, ALTURA } from './tela.js';
import { COR } from './palette.js';

export function desenharGraos(quadro, graos, camera) {
  const cx = Math.round(camera.x);
  const cy = Math.round(camera.y);
  for (const g of graos) {
    if (!visivel(g)) continue;
    const x0 = Math.round(g.x) - cx;
    const y0 = Math.round(g.y) - cy;
    for (let dy = 0; dy < 2; dy++) {
      for (let dx = 0; dx < 2; dx++) {
        const x = x0 + dx;
        const y = y0 + dy;
        if (x < 0 || x >= LARGURA || y < 0 || y >= ALTURA) continue;
        quadro[y * LARGURA + x] = dx === 0 && dy === 0 ? COR.GRAO_BRILHO : COR.GRAO;
      }
    }
  }
}
