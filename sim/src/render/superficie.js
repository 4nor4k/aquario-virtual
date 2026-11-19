// A superfície da água: uma linha azul clara ondulada que se mexe. Água e ar são pretos sólidos;
// só a onda separa os dois e dá a sensação de que acima da água existe ar.
//
// A forma da onda depende só da posição no mundo (x) e do tempo, então a onda "anda" mesmo com
// o jogo parado e fica no mesmo lugar quando a câmera se move. O tempo aqui é o tempo REAL
// (visual), não o relógio acelerado do jogo.
import { SUPERFICIE_Y, AMPLITUDE_ONDA } from '../core/mundo.js';
import { LARGURA, ALTURA } from './tela.js';
import { COR } from './palette.js';

const COR_AR = 1;                  // preto, igual à água (cobre o que o fundo desenhou no ar)
const COR_LINHA = COR.AZUL_AGUA;   // azul claro

// Quantos pixels a linha da água sobe (-) ou desce (+) na coluna x do mundo, no instante t (s).
// Duas ondas somadas, uma curta e rápida e outra longa e lenta, para não parecer uma senoide só.
export function deslocamentoDaOnda(x, t) {
  const v = 1.3 * Math.sin(x * 0.16 + t * 1.8) + 0.9 * Math.sin(x * 0.065 - t * 1.2);
  return Math.max(-AMPLITUDE_ONDA, Math.min(AMPLITUDE_ONDA, Math.round(v)));
}

// Desenha o ar (acima da linha), a linha da água e uns brilhos curtos logo abaixo dela.
export function desenharSuperficie(quadro, camera, tempo = 0) {
  const cx = Math.round(camera.x);
  const cy = Math.round(camera.y);
  for (let sx = 0; sx < LARGURA; sx++) {
    const wx = cx + sx;
    const linha = SUPERFICIE_Y + deslocamentoDaOnda(wx, tempo); // y da linha, no mundo
    const brilho = linha + 3;                                   // brilho um pouco abaixo
    const temBrilho = Math.sin(wx * 0.4 + tempo * 2.5) > 0.8;
    const ultimo = Math.min(ALTURA - 1, brilho - cy);
    for (let sy = 0; sy <= ultimo; sy++) {
      const wy = cy + sy;
      if (wy < linha) quadro[sy * LARGURA + sx] = COR_AR;
      else if (wy === linha || (wy === brilho && temBrilho)) quadro[sy * LARGURA + sx] = COR_LINHA;
    }
  }
}
