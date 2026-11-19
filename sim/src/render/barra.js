// A barra de indicador (tela de status e HUD): borda de 1 pixel e preenchimento por dentro.
import { LARGURA } from './tela.js';
import { preencherRetangulo, contornoRetangulo } from './formas.js';

const BORDA_SUAVE = 12; // branco (em preto e branco, um tom médio não forma linha)
export const COR_RUIM = 10; // rosa (indicador impróprio)

// Barra de 0 até `maximo` (100, ou 200 na saciedade): borda de 1 pixel e preenchimento por dentro.
// ideal: onde acaba o "de boa" (na saciedade, 100). Ganha uma marquinha em cima da barra, e o que
// passa dele (comer demais) é desenhado em xadrez rosa, como os outros avisos.
export function desenharBarra(quadro, x, y, largura, valor, cor, maximo = 100, ideal = null) {
  contornoRetangulo(quadro, x, y, largura, 5, BORDA_SUAVE);
  const interno = largura - 2;
  const cheio = Math.round((interno * Math.max(0, Math.min(maximo, valor))) / maximo);
  const limite = ideal === null ? interno : Math.round((interno * ideal) / maximo);
  const normal = Math.min(cheio, limite);
  if (cor !== COR_RUIM) {
    preencherRetangulo(quadro, x + 1, y + 1, normal, 3, cor);
  }
  // Em preto e branco o rosa e o ciano são os dois brancos; a barra imprópria vira xadrez
  // (meio apagada) para continuar parecendo um aviso.
  for (let by = 0; by < 3; by++) {
    for (let bx = cor === COR_RUIM ? 0 : normal; bx < cheio; bx++) {
      if ((bx + by) % 2 === 0) quadro[(y + 1 + by) * LARGURA + x + 1 + bx] = COR_RUIM;
    }
  }
  if (ideal !== null) quadro[(y - 1) * LARGURA + x + 1 + limite] = BORDA_SUAVE;
}

