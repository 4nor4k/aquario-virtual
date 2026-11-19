// O tempo com o jogo fechado ou o aparelho desligado (doc 03 e doc 09, seção 4).
// Ao voltar, o jogo compara a hora real da gravação com a de agora e aplica esse tempo todo às
// regras. Aqui NÃO existe Date: as duas horas reais chegam de fora.
import { HORA_MS } from './clock.js';
import { atualizarRegras } from './rules.js';
import { atualizarIdade, limitesDoPeixe } from './fish.js';

// Quanto tempo ficou fechado, em ms. Se a hora de agora for ANTES da gravação (o relógio do
// computador foi mexido), vale 0: o tempo nunca anda para trás.
export function calcularAusencia(salvoEmMs, agoraRealMs) {
  return Math.max(0, agoraRealMs - salvoEmMs);
}

// Aplica a ausência ao aquário. horaDoJogoAntesMs = a hora do jogo que estava gravada.
// Devolve o que o jogador precisa saber:
//   { ausenciaMs, aplicadaMs, horaDoJogoMs, morreu, gameOver }
// - aplicadaMs: o tanto que de fato contou (menor que ausenciaMs se houver teto no config);
// - horaDoJogoMs: a nova hora do jogo (o relógio deve ir para ela);
// - morreu: algum peixe que estava vivo morreu durante a ausência.
export function aplicarAusencia(aquario, { ausenciaMs, horaDoJogoAntesMs }, config) {
  const horasMaximas = config.salvamento.ausenciaMaximaHoras;
  const aplicadaMs = horasMaximas == null ? ausenciaMs : Math.min(ausenciaMs, horasMaximas * HORA_MS);
  const horaDoJogoMs = horaDoJogoAntesMs + aplicadaMs;
  const vivosAntes = new Set(aquario.vivos());

  atualizarRegras(aquario, aplicadaMs, horaDoJogoMs, config, { animar: false }); // sem namoro na tela

  for (const peixe of aquario.peixes) {
    if (peixe.estado !== 'morto') {
      atualizarIdade(peixe, horaDoJogoMs); // pode ter crescido enquanto dormia
    } else if (vivosAntes.has(peixe)) {
      // Quem morreu durante a ausência já passou tempo boiando: está na superfície.
      peixe.y = limitesDoPeixe(peixe.fase).minY;
    }
  }
  const morreu = [...vivosAntes].some((p) => p.estado === 'morto');

  // Os avisos da ausência já não valem (o jogador não estava olhando): esvazia a fila.
  aquario.eventos.retirar();

  return { ausenciaMs, aplicadaMs, horaDoJogoMs, morreu, gameOver: aquario.gameOver };
}
