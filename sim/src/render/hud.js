// HUD mínimo (doc 04, camada 6): só avisos. O status completo fica na tela do botão C.
//   - cantinho de cima à esquerda: F (fome), S (sujeira), P (pH), só quando estão impróprios;
//   - cantinho de cima à direita: o ícone de FRIO (um floco de neve), quando a temperatura está abaixo
//     de 18 °C (o clima não afeta o peixe: é só um aviso do cenário, doc 03 seção 7);
//   - sobre o peixe: F (fome). A cruz da saúde não vai sobre o peixe (fica no HUD B e na tela de status).
import { avisosDoAquario, peixeComFome } from '../core/rules.js';
import { spriteDoPeixe } from './sprites.js';
import { desenharTexto } from './fonte.js';
import { preencherRetangulo } from './formas.js';
import { COR } from './palette.js';
import { LARGURA as LARGURA_TELA } from './tela.js';

const COR_ALERTA = 10;   // rosa (em preto e branco: quadradinho branco)
const COR_LETRA = 13;    // preto: letra escura no quadradinho branco
const COR_FUNDO_DO_FRIO = 13; // preto: o floco aparece mesmo sobre o céu claro do relâmpago
const LADO = 7;          // o emblema mede 7×7
const ESPACO = 2;

// O floco de neve do ícone de frio (7×7). X = gelo.
export const FLOCO = [
  '...X...',
  'X..X..X',
  '.X.X.X.',
  'XXXXXXX',
  '.X.X.X.',
  'X..X..X',
  '...X...',
];
export const POSICAO_DO_FRIO = { x: 120 - LADO - 2, y: 2 }; // canto de cima à direita

// Desenha o ícone de frio (cor sólida GELO, que a luz da noite não escurece).
export function desenharIconeDeFrio(quadro, x = POSICAO_DO_FRIO.x, y = POSICAO_DO_FRIO.y) {
  preencherRetangulo(quadro, x - 1, y - 1, LADO + 2, LADO + 2, COR_FUNDO_DO_FRIO);
  FLOCO.forEach((linha, dy) => {
    for (let dx = 0; dx < LADO; dx++) if (linha[dx] === 'X') quadro[(y + dy) * LARGURA_TELA + x + dx] = COR.GELO;
  });
}

// A cor (nome em COR.STATUS) de cada status da saúde e de cada faixa do pH. Uma só tabela para o HUD de
// indicadores e a tela de status. Morto não tem cruz.
export const CRUZ_DO_STATUS = { saudavel: 'verde', doente: 'amarelo', muitoDoente: 'vermelho', morto: null };
export const COR_DA_FAIXA = { acido: 'azul', ideal: 'verde', alcalino: 'amarelo' };

// A cruz da saúde (7×7, braços de 3 pixels, como a cruz de enfermaria). X = a cor do status.
export const CRUZ = [
  '..XXX..',
  '..XXX..',
  'XXXXXXX',
  'XXXXXXX',
  'XXXXXXX',
  '..XXX..',
  '..XXX..',
];

// Desenha a cruz na cor do status ('verde', 'amarelo' ou 'vermelho'; COR.STATUS). Ela só aparece nas telas
// (HUD de indicadores e status), não acompanha o peixe.
export function desenharCruz(quadro, x, y, status) {
  CRUZ.forEach((linha, dy) => {
    for (let dx = 0; dx < LADO; dx++) if (linha[dx] === 'X') quadro[(y + dy) * LARGURA_TELA + x + dx] = COR.STATUS[status];
  });
}

// O quadradinho do pH (5×5, a altura de uma letra) na cor da faixa: azul ácido, verde ideal, amarelo alcalino.
export const LADO_DO_QUADRADINHO = 5;
export function desenharQuadradinhoDoPh(quadro, x, y, faixa) {
  preencherRetangulo(quadro, x, y, LADO_DO_QUADRADINHO, LADO_DO_QUADRADINHO, COR.STATUS[COR_DA_FAIXA[faixa]]);
}

// Quadradinho colorido com uma letra de 3×5 dentro.
function desenharEmblema(quadro, emblema, x, y) {
  preencherRetangulo(quadro, x, y, LADO, LADO, emblema.cor);
  desenharTexto(quadro, emblema.letra, x + 2, y + 1, COR_LETRA);
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

// Quais emblemas ficam sobre um peixe (função pura): só o F (fome). A cruz da saúde não acompanha o peixe
// (pedido do usuário em 19/11/2026): ela fica no HUD de indicadores e na tela de status.
export function emblemasDoPeixe(peixe, config) {
  if (peixe.estado === 'morto') return [];
  return [
    peixeComFome(peixe, config) && { letra: 'F', cor: COR_ALERTA },
  ].filter(Boolean);
}

// frio (opcional): true mostra o ícone de frio no canto de cima à direita.
export function desenharHud(quadro, { aquario, config, camera, frio = false }) {
  if (frio) desenharIconeDeFrio(quadro);
  // Cantinho de cima à esquerda.
  emblemasDoCanto(aquario, config).forEach((letra, i) => {
    desenharEmblema(quadro, { letra, cor: COR_ALERTA }, 2 + i * (LADO + ESPACO), 2);
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
    emblemas.forEach((emblema, i) => desenharEmblema(quadro, emblema, x0 + i * (LADO + 1), y));
  }
}
