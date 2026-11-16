// Monta um quadro de 120×120: camadas de baixo para cima (doc 04, seção 4).
// Por enquanto só o cenário; peixes entram no passo 4.
import { TILE, COLUNAS, LINHAS } from '../core/aquarium.js';
import { pixelsDoTile } from './cenario.js';
import { LARGURA, ALTURA } from './tela.js';

// Desenha no quadro os blocos que aparecem dentro da janela da câmera.
export function desenharCenario(quadro, mapa, camera) {
  const cx = Math.round(camera.x);
  const cy = Math.round(camera.y);

  const col0 = Math.floor(cx / TILE);
  const col1 = Math.min(COLUNAS - 1, Math.floor((cx + LARGURA - 1) / TILE));
  const lin0 = Math.floor(cy / TILE);
  const lin1 = Math.min(LINHAS - 1, Math.floor((cy + ALTURA - 1) / TILE));

  for (let lin = lin0; lin <= lin1; lin++) {
    for (let col = col0; col <= col1; col++) {
      const pix = pixelsDoTile(mapa[lin * COLUNAS + col]);
      const ox = col * TILE - cx; // onde o bloco cai na tela
      const oy = lin * TILE - cy;
      for (let ty = 0; ty < TILE; ty++) {
        const y = oy + ty;
        if (y < 0 || y >= ALTURA) continue;
        for (let tx = 0; tx < TILE; tx++) {
          const x = ox + tx;
          if (x < 0 || x >= LARGURA) continue;
          quadro[y * LARGURA + x] = pix[ty * TILE + tx];
        }
      }
    }
  }
}

export function desenharQuadro(quadro, { mapa, camera }) {
  desenharCenario(quadro, mapa, camera);
}
