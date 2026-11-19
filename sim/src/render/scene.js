// Monta um quadro de 120×120: camadas de baixo para cima (doc 04, seção 4).
import { TILE, COLUNAS, LINHAS } from '../core/mundo.js';
import { quadroDeNado } from '../core/fish.js';
import { pixelsDoTile } from './cenario.js';
import { spriteDoPeixe, desenharSprite } from './sprites.js';
import { desenharHud } from './hud.js';
import { desenharPlantas } from './plantas.js';
import { desenharFundo } from './fundo.js';
import { desenharFiltro } from './filtro.js';
import { desenharSuperficie } from './superficie.js';
import { desenharBolhas } from './bolhas.js';
import { LARGURA, ALTURA } from './tela.js';

const COR_AGUA = 1;

// Desenha no quadro os blocos que aparecem dentro da janela da câmera. Os pixels de água (cor 1)
// não são pintados: deixam aparecer o que já está no quadro, o fundo com paralaxe.
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
          const cor = pix[ty * TILE + tx];
          if (cor !== COR_AGUA) quadro[y * LARGURA + x] = cor;
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
    const { sprite, inverter } = spriteDoPeixe(peixe);
    const x = Math.round(peixe.x - sprite.largura / 2) - cx;
    const y = Math.round(peixe.y - sprite.altura / 2) - cy;
    // O peixe morto não bate a cauda: fica sempre no quadro 0.
    const quadroDaAnimacao = peixe.estado === 'morto' ? 0 : quadroDeNado(peixe);
    desenharSprite(quadro, sprite, quadroDaAnimacao, x, y, peixe.direcao === -1, inverter, true);
  }
}

// aquario e config são opcionais: sem eles, desenha só o cenário e os peixes (sem avisos).
// tempo (segundos reais, só para animar a onda e o balanço das plantas), bolhas, plantas e fundo (paralaxe) também são opcionais.
export function desenharQuadro(quadro, { mapa, camera, peixes, aquario, config, bolhas = [], plantas = [], fundo, tempo = 0 }) {
  quadro.fill(COR_AGUA);                      // a água: preto sólido
  if (fundo) desenharFundo(quadro, fundo, camera, tempo); // camadas de paralaxe, atrás de tudo
  desenharCenario(quadro, mapa, camera);
  desenharPlantas(quadro, plantas, camera, tempo);
  desenharSuperficie(quadro, camera, tempo);
  desenharFiltro(quadro, camera, tempo);     // caixa, bico e queda d'água, por cima da superfície
  desenharPeixes(quadro, peixes, camera);
  desenharBolhas(quadro, bolhas, camera);
  if (aquario && config) desenharHud(quadro, { aquario, config, camera });
}
