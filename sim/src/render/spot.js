// O SPOT de luz da noite (pedido do usuário em 19/11/2026): um feixe que sai do centro do TOPO DO AQUÁRIO (a
// linha 0 do mundo, em cima do ar, e não da superfície da água) e abre em cone, como o spot de uma lâmpada
// na tampa. Só existe de noite (as cores são calculadas pela luz.js: de dia são pretas) e só pinta o ar e a
// água ainda puros (cor 1), então estrelas, chuva, plantas, pedras, água suja e peixes ficam como estão. Cor sólida, sem pontilhado: um miolo mais claro dentro de um halo mais escuro.
// O feixe fica preso ao MUNDO (no meio do aquário), então anda na tela junto com a câmera.
import { AREIA_Y, MUNDO_LARGURA } from '../core/mundo.js';
import { LARGURA, ALTURA } from './tela.js';
import { COR } from './palette.js';

export const SPOT_X = MUNDO_LARGURA / 2;  // o centro do topo
const ABERTURA_NO_TOPO = 3;               // meia largura do halo no topo do aquário
const ABERTURA_NO_FUNDO = 50;             // meia largura do halo na areia
const PROPORCAO_DO_MIOLO = 0.42;          // o miolo claro é esta parte do halo

// Meia largura do halo na linha wy do mundo (cresce em linha reta do topo até a areia, formando o cone).
export function meiaLarguraDoSpot(wy) {
  const p = Math.max(0, Math.min(1, wy / AREIA_Y));
  return ABERTURA_NO_TOPO + (ABERTURA_NO_FUNDO - ABERTURA_NO_TOPO) * p;
}

export function desenharSpot(quadro, camera) {
  const cx = Math.round(camera.x);
  const cy = Math.round(camera.y);
  for (let sy = 0; sy < ALTURA; sy++) {
    const wy = cy + sy;
    if (wy < 0 || wy >= AREIA_Y) continue;
    const meia = meiaLarguraDoSpot(wy);
    const miolo = meia * PROPORCAO_DO_MIOLO;
    const de = Math.max(0, Math.ceil(SPOT_X - meia) - cx);
    const ate = Math.min(LARGURA - 1, Math.floor(SPOT_X + meia) - cx);
    for (let sx = de; sx <= ate; sx++) {
      if (quadro[sy * LARGURA + sx] !== COR.AGUA) continue;
      const dentro = Math.abs(cx + sx - SPOT_X) <= miolo;
      quadro[sy * LARGURA + sx] = dentro ? COR.SPOT_MIOLO : COR.SPOT;
    }
  }
}
