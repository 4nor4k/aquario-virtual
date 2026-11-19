// O céu: o ar acima da água (doc 11). Só aparece quando a câmera sobe até a superfície.
//   - de NOITE, estrelas que piscam (somem quando chove ou no clarão do relâmpago);
//   - no RELÂMPAGO, o ar fica azul-claro por um instante (a cor do índice CEU_RELAMPAGO é calculada pela
//     luz.js; aqui só se pinta o ar com ele).
// O ar fica acima da linha da onda da superfície. O céu só pinta o ar que ainda é preto (cor 1): o que
// já foi desenhado ali (o filtro, a comida jogada de cima) não é coberto. Chame DEPOIS de
// desenharSuperficie, que repinta o ar de preto.
import { criarRng } from '../core/rng.js';
import { SUPERFICIE_Y, MUNDO_LARGURA } from '../core/mundo.js';
import { deslocamentoDaOnda } from './superficie.js';
import { LARGURA, ALTURA } from './tela.js';
import { COR } from './palette.js';

export const QUANTAS_ESTRELAS = 28;
const COR_ESTRELA_BRILHANTE = 12; // branco (passa pelo preto e branco: não escurece com a luz)

// As estrelas, sorteadas uma vez (mesma semente, mesmo céu): { x, y (do mundo), limiar, fase, brilhante }.
// limiar: a noite precisa estar pelo menos nesse ponto para a estrela aparecer (elas surgem uma a uma).
export function gerarEstrelas(semente = 20261119) {
  const rng = criarRng(semente);
  return Array.from({ length: QUANTAS_ESTRELAS }, (_, i) => ({
    x: rng.inteiro(1, MUNDO_LARGURA - 2),
    y: rng.inteiro(1, SUPERFICIE_Y - 5),
    limiar: 0.45 + 0.5 * (i / QUANTAS_ESTRELAS),
    fase: rng.decimal() * Math.PI * 2,
    brilhante: i % 4 === 0,
  }));
}
export const ESTRELAS = gerarEstrelas();

// luz: { noite, chuvaNivel, raio } (de luz.js). tempo: segundos reais, para o piscar.
export function desenharCeu(quadro, camera, luz, tempo = 0) {
  const cx = Math.round(camera.x);
  const cy = Math.round(camera.y);
  const clarao = luz.raio > 0.02;

  if (clarao) {
    for (let sx = 0; sx < LARGURA; sx++) {
      const limite = Math.min(ALTURA, SUPERFICIE_Y + deslocamentoDaOnda(cx + sx, tempo) - cy);
      for (let sy = 0; sy < limite; sy++) {
        if (quadro[sy * LARGURA + sx] === COR.AGUA) quadro[sy * LARGURA + sx] = COR.CEU_RELAMPAGO;
      }
    }
    return; // no clarão não se vê estrela
  }

  const escuridao = luz.noite * (1 - (luz.chuvaNivel ?? 0));
  for (const e of ESTRELAS) {
    if (escuridao < e.limiar) continue;
    if (Math.sin(tempo * 1.7 + e.fase) < -0.55) continue; // pisca
    const x = e.x - cx;
    const y = e.y - cy;
    if (x < 0 || x >= LARGURA || y < 0 || y >= ALTURA) continue;
    if (quadro[y * LARGURA + x] === COR.AGUA) quadro[y * LARGURA + x] = e.brilhante ? COR_ESTRELA_BRILHANTE : COR.ESTRELA_FRACA;
  }
}
