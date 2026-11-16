// O aquário: a lista de peixes e o sorteio. (Regras de fome, sujeira e pH entram na v0.2.)
import { criarRng } from './rng.js';
import {
  criarPeixe, atualizarPeixe, atualizarIdade, limitesDoPeixe, INICIO_DA_FASE_MS,
} from './fish.js';
import { MUNDO_LARGURA, AREIA_Y } from './mundo.js';

export function criarAquario({ semente = 1 } = {}) {
  const rng = criarRng(semente);
  const peixes = [];
  let proximoId = 1;

  return {
    peixes,

    // Põe um peixe no aquário. Sem fase, nasce filhote agora. Com fase, entra já com a idade
    // em que essa fase começa. Sem posição, aparece no meio da água.
    // agoraMs: a hora do jogo neste momento (do relógio).
    adicionarPeixe(dados = {}, agoraMs = 0) {
      const fase = dados.fase || 'filhote';
      const lim = limitesDoPeixe(fase);
      const peixe = criarPeixe({
        ...dados,
        id: proximoId++,
        fase,
        nascimentoMs: dados.nascimentoMs ?? agoraMs - INICIO_DA_FASE_MS[fase],
        x: dados.x ?? Math.round(MUNDO_LARGURA / 2),
        y: dados.y ?? Math.round((lim.minY + Math.min(lim.maxY, AREIA_Y)) / 2),
      });
      peixes.push(peixe);
      return peixe;
    },

    // Um passo do jogo. dt = segundos reais do passo (movimento e animação);
    // agoraMs = hora do jogo (já acelerada pelo relógio), de onde sai a idade.
    atualizar(dt, agoraMs = 0) {
      for (const peixe of peixes) {
        atualizarIdade(peixe, agoraMs);
        atualizarPeixe(peixe, dt, rng);
      }
    },
  };
}
