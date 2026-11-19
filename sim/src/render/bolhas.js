// Desenha as bolhas (core/bolhas.js): a maioria é um pontinho branco; as maiores são um anel de
// 3×3 e, mais raramente, um anel de 5×5 (sem os cantos, para ficar redondo).
import { LARGURA, ALTURA } from './tela.js';

const COR_BOLHA = 12; // branco

function pixel(quadro, x, y) {
  if (x < 0 || x >= LARGURA || y < 0 || y >= ALTURA) return;
  quadro[y * LARGURA + x] = COR_BOLHA;
}

// Os desenhos com os pontos de cada tamanho (relativos ao centro).
function anel(raio, semCantos) {
  const pontos = [];
  for (let dy = -raio; dy <= raio; dy++) {
    for (let dx = -raio; dx <= raio; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== raio) continue; // só a borda: o meio é vazio
      if (semCantos && Math.abs(dx) === raio && Math.abs(dy) === raio) continue;
      pontos.push([dx, dy]);
    }
  }
  return pontos;
}
export const ANEL_3 = anel(1, false); // 8 pixels
export const ANEL_5 = anel(2, true);  // 12 pixels

// Tamanho da bolha: 1, 3 ou 5. Bolhas sem \`tamanho\` (de antes) valem 3 se forem anel, senão 1.
export function tamanhoDaBolha(b) {
  return b.tamanho ?? (b.anel ? 3 : 1);
}

export function desenharBolhas(quadro, bolhas, camera) {
  const cx = Math.round(camera.x);
  const cy = Math.round(camera.y);
  for (const b of bolhas) {
    const x = Math.round(b.x) - cx;
    const y = Math.round(b.y) - cy;
    const tamanho = tamanhoDaBolha(b);
    if (tamanho === 1) {
      pixel(quadro, x, y);
      continue;
    }
    for (const [dx, dy] of tamanho === 5 ? ANEL_5 : ANEL_3) pixel(quadro, x + dx, y + dy);
  }
}
