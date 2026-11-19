// Os raios de luz do dia (doc 11, seção 4; referências do doc 04): três faixas inclinadas e suaves, de um
// azul quase preto, que descem da superfície e balançam devagar. Só pintam a água que ainda é água pura (cor
// 1), então a água suja, as plantas, as pedras e os peixes ficam como estão. A cor deles (índice
// RAIO_DE_LUZ) é calculada pela luz.js: de noite é preta, então nada aparece.
import { SUPERFICIE_Y, AREIA_Y } from '../core/mundo.js';
import { LARGURA, ALTURA } from './tela.js';
import { COR } from './palette.js';

export const RAIOS = [
  { x: 52, largura: 7, fase: 0.4 },
  { x: 118, largura: 9, fase: 2.1 },
  { x: 188, largura: 7, fase: 4.0 },
];
const INCLINACAO = 0.45;   // quantos pixels o raio anda para o lado a cada pixel que desce
const FUNDURA = 0.62;      // até que parte da água o raio desce
const BALANCO = 3;         // quantos pixels balança para os lados

// Onde (no mundo) fica o centro de um raio na linha wy, no instante `tempo`.
export function centroDoRaio(raio, wy, tempo = 0) {
  return raio.x + (wy - SUPERFICIE_Y) * INCLINACAO + BALANCO * Math.sin(tempo * 0.25 + raio.fase);
}

export function desenharRaiosDeLuz(quadro, camera, tempo = 0) {
  const cx = Math.round(camera.x);
  const cy = Math.round(camera.y);
  const ultimaLinha = SUPERFICIE_Y + Math.round((AREIA_Y - SUPERFICIE_Y) * FUNDURA);
  for (let sy = 0; sy < ALTURA; sy++) {
    const wy = cy + sy;
    if (wy <= SUPERFICIE_Y + 2 || wy > ultimaLinha) continue;
    for (const raio of RAIOS) {
      const centro = centroDoRaio(raio, wy, tempo);
      // O raio vai afinando com a fundura.
      const fundo = (wy - SUPERFICIE_Y) / (ultimaLinha - SUPERFICIE_Y);
      const metade = (raio.largura / 2) * (1 - 0.35 * fundo);
      const de = Math.ceil(centro - metade) - cx;
      const ate = Math.floor(centro + metade) - cx;
      for (let sx = Math.max(0, de); sx <= Math.min(LARGURA - 1, ate); sx++) {
        if (quadro[sy * LARGURA + sx] === COR.AGUA) quadro[sy * LARGURA + sx] = COR.RAIO_DE_LUZ;
      }
    }
  }
}
