// O aquário: a lista de peixes e o sorteio. (Regras de fome, sujeira e pH entram na v0.2.)
import { criarRng } from './rng.js';
import { criarPeixe, atualizarPeixe, limitesDoPeixe } from './fish.js';
import { MUNDO_LARGURA, AREIA_Y } from './mundo.js';

export function criarAquario({ semente = 1 } = {}) {
  const rng = criarRng(semente);
  const peixes = [];
  let proximoId = 1;

  return {
    peixes,

    // Põe um peixe no aquário. Sem posição, ele aparece no meio da água.
    adicionarPeixe(dados = {}) {
      const fase = dados.fase || 'adulto';
      const lim = limitesDoPeixe(fase);
      const peixe = criarPeixe({
        ...dados,
        id: proximoId++,
        fase,
        x: dados.x ?? Math.round(MUNDO_LARGURA / 2),
        y: dados.y ?? Math.round((lim.minY + Math.min(lim.maxY, AREIA_Y)) / 2),
      });
      peixes.push(peixe);
      return peixe;
    },

    // Um passo do jogo (dt em segundos).
    atualizar(dt) {
      for (const peixe of peixes) atualizarPeixe(peixe, dt, rng);
    },
  };
}
