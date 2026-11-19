// Desenha os ovos do casal (core/reproducao.js): 3×3 pixels, redondos em cima, rosados, com um
// brilho no alto.
// Eles caem até a areia e ficam ali até eclodir. O ovo que ainda "espera" (o casal está namorando)
// não aparece. Nos últimos minutos antes de eclodir o ovo treme (um pixel para o lado, de vez em quando).
import { LARGURA, ALTURA } from './tela.js';
import { COR } from './palette.js';

export const LARGURA_DO_OVO = 3;
export const ALTURA_DO_OVO = 3;

// O desenho (X = ovo, o = brilho). O ovo é centrado em x e começa em y.
const OVO = [
  '.o.',
  'XXX',
  'XXX',
];

// O ovo está prestes a eclodir? (a hora de eclodir está a menos de 5 minutos do jogo)
export function estaPrestesAEclodir(ovo, agoraMs) {
  return agoraMs !== null && ovo.eclodeEmMs - agoraMs < 5 * 60 * 1000;
}

// tempo: segundos reais, só para o tremor. agoraMs: a hora do jogo (null = sem tremor).
export function desenharOvos(quadro, ovos, camera, { tempo = 0, agoraMs = null } = {}) {
  const cx = Math.round(camera.x);
  const cy = Math.round(camera.y);
  for (const o of ovos) {
    if (o.estado === 'esperando') continue;
    const tremor = estaPrestesAEclodir(o, agoraMs) && Math.floor(tempo * 6) % 2 === 1 ? 1 : 0;
    const x0 = Math.round(o.x) - 1 - cx + tremor;
    const y0 = Math.round(o.y) - cy;
    OVO.forEach((linha, dy) => {
      for (let dx = 0; dx < LARGURA_DO_OVO; dx++) {
        if (linha[dx] === '.') continue;
        const x = x0 + dx;
        const y = y0 + dy;
        if (x < 0 || x >= LARGURA || y < 0 || y >= ALTURA) continue;
        quadro[y * LARGURA + x] = linha[dx] === 'o' ? COR.OVO_BRILHO : COR.OVO;
      }
    });
  }
}
