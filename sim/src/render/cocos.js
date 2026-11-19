// Desenha o cocô (core/coco.js): um tijolinho marrom. Enquanto sai da cauda ele cresce (1×1, depois
// 2×1, depois 2×2); caído na areia, nos últimos segundos pisca e some.
import { LARGURA, ALTURA } from './tela.js';
import { COR } from './palette.js';

export const SEGUNDOS_PISCANDO = 3; // quanto tempo antes de sumir ele pisca

// Largura e altura que o cocô tem agora (função pura, para testar).
export function tamanhoDoCoco(coco, config) {
  if (coco.estado !== 'saindo') return { largura: 2, altura: 2 };
  const progresso = coco.tempo / config.coco.segundosSaindo;
  if (progresso < 0.35) return { largura: 1, altura: 1 };
  if (progresso < 0.7) return { largura: 2, altura: 1 };
  return { largura: 2, altura: 2 };
}

// Está na hora de sumir da tela neste instante do pisca?
export function estaApagado(coco, config) {
  if (coco.estado !== 'parado') return false;
  const falta = config.coco.segundosNaAreia - coco.tempo;
  return falta < SEGUNDOS_PISCANDO && Math.floor(coco.tempo * 4) % 2 === 1;
}

export function desenharCocos(quadro, cocos, camera, config) {
  const cx = Math.round(camera.x);
  const cy = Math.round(camera.y);
  for (const c of cocos) {
    if (estaApagado(c, config)) continue;
    const { largura, altura } = tamanhoDoCoco(c, config);
    const x0 = Math.round(c.x) - cx;
    const y0 = Math.round(c.y) - cy;
    for (let dy = 0; dy < altura; dy++) {
      for (let dx = 0; dx < largura; dx++) {
        const x = x0 + dx;
        const y = y0 + dy;
        if (x < 0 || x >= LARGURA || y < 0 || y >= ALTURA) continue;
        quadro[y * LARGURA + x] = dx === 0 && dy === 0 ? COR.COCO_CLARO : COR.COCO;
      }
    }
  }
}
