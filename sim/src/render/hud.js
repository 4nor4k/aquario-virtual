// HUD mínimo (doc 04, camada 6): só avisos. O status completo fica na tela do botão C.
//   - cantinho de cima à esquerda: F (fome), S (sujeira), P (pH), só quando estão impróprios;
//   - sobre o peixe: F (fome) e + (doente).
import { avisosDoAquario, peixeComFome } from '../core/rules.js';
import { spriteDoPeixe } from './sprites.js';
import { desenharTexto } from './fonte.js';
import { preencherRetangulo } from './formas.js';

const COR_ALERTA = 10;   // rosa
const COR_DOENTE = 15;   // laranja
const COR_LETRA = 12;    // branco
const LADO = 7;          // o emblema mede 7×7
const ESPACO = 2;

// Quadradinho colorido com uma letra de 3×5 dentro.
function desenharEmblema(quadro, letra, x, y, corFundo) {
  preencherRetangulo(quadro, x, y, LADO, LADO, corFundo);
  desenharTexto(quadro, letra, x + 2, y + 1, COR_LETRA);
}

// Quais emblemas aparecem no canto da tela (função pura, para testar).
export function emblemasDoCanto(aquario, config) {
  const avisos = avisosDoAquario(aquario, config);
  return [
    avisos.fome && 'F',
    avisos.sujeira && 'S',
    avisos.ph && 'P',
  ].filter(Boolean);
}

// Quais emblemas ficam sobre um peixe (função pura).
export function emblemasDoPeixe(peixe, config) {
  if (peixe.estado === 'morto') return [];
  return [
    peixeComFome(peixe, config) && { letra: 'F', cor: COR_ALERTA },
    peixe.estado === 'doente' && { letra: '+', cor: COR_DOENTE },
  ].filter(Boolean);
}

export function desenharHud(quadro, { aquario, config, camera }) {
  // Cantinho de cima à esquerda.
  emblemasDoCanto(aquario, config).forEach((letra, i) => {
    desenharEmblema(quadro, letra, 2 + i * (LADO + ESPACO), 2, COR_ALERTA);
  });

  // Em cima de cada peixe (ou embaixo, se ele está colado no alto da tela).
  const cx = Math.round(camera.x);
  const cy = Math.round(camera.y);
  for (const peixe of aquario.peixes) {
    const emblemas = emblemasDoPeixe(peixe, config);
    if (emblemas.length === 0) continue;
    const { sprite } = spriteDoPeixe(peixe);
    const larguraTotal = emblemas.length * LADO + (emblemas.length - 1) * 1;
    const x0 = Math.round(peixe.x) - cx - Math.floor(larguraTotal / 2);
    const topoDoPeixe = Math.round(peixe.y - sprite.altura / 2) - cy;
    let y = topoDoPeixe - LADO - 1;
    if (y < 0) y = topoDoPeixe + sprite.altura + 1;
    emblemas.forEach(({ letra, cor }, i) => desenharEmblema(quadro, letra, x0 + i * (LADO + 1), y, cor));
  }
}
