// Monta um quadro de 120×120: camadas de baixo para cima (doc 04, seção 4).
import { TILE, COLUNAS, LINHAS } from '../core/mundo.js';
import { quadroDeNado } from '../core/fish.js';
import { pixelsDoTile } from './cenario.js';
import { SPRITES, desenharSprite } from './sprites.js';
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

// Desenha os peixes por cima do cenário. (x, y) do peixe é o centro dele no mundo.
export function desenharPeixes(quadro, peixes, camera) {
  const cx = Math.round(camera.x);
  const cy = Math.round(camera.y);
  for (const peixe of peixes) {
    const sprite = SPRITES[peixe.especie][peixe.fase];
    const x = Math.round(peixe.x - sprite.largura / 2) - cx;
    const y = Math.round(peixe.y - sprite.altura / 2) - cy;
    desenharSprite(quadro, sprite, quadroDeNado(peixe), x, y, peixe.direcao === -1);
  }
}

export function desenharQuadro(quadro, { mapa, camera, peixes }) {
  desenharCenario(quadro, mapa, camera);
  desenharPeixes(quadro, peixes, camera);
}
