// O canal de som do aparelho (doc 16): o buzzer toca UMA coisa de cada vez.
// É só a LÓGICA: decide qual som toca (prioridade) e guarda o que está tocando. Não faz som de verdade e não
// conhece a hora real: o tempo chega em `dt` (segundos).
//   - No navegador, quem faz o som é sim/audio.js (Web Audio), avisado pelos callbacks aoTocar e aoCalar. Ele
//     agenda as notas no relógio do próprio áudio, porque o jogo anda em passos de 50 ms e há notas de 25 ms.
//   - No ESP32, o laço pode chamar atualizar(dt) e mandar a frequência devolvida para o buzzer (ledcWriteTone).
//
// Regra de prioridade: o som novo CORTA o que está tocando se a prioridade dele for maior ou igual;
// se for menor, é descartado (um "clique" não atropela a música de Game Over).
//
// sons: o objeto `sons` de config/sons.json: nome -> { prioridade, notas: [[Hz, ms], ...] } (Hz 0 = silêncio).
export function criarSom({ sons, ligado = true, aoTocar = () => {}, aoCalar = () => {} }) {
  let atual = null; // { nome, prioridade, notas, indice, restanteMs }
  let estaLigado = ligado;

  function tocar(nome) {
    const som = sons[nome];
    if (!som) throw new RangeError(`som desconhecido: ${nome}`);
    if (!estaLigado) return false;
    if (atual && som.prioridade < atual.prioridade) return false;
    atual = { nome, prioridade: som.prioridade, notas: som.notas, indice: 0, restanteMs: som.notas[0][1] };
    aoTocar(nome, som.notas);
    return true;
  }

  function calar() {
    if (!atual) return;
    atual = null;
    aoCalar();
  }

  return {
    tocar,
    calar,
    get ligado() { return estaLigado; },
    set ligado(valor) {
      estaLigado = Boolean(valor);
      if (!estaLigado) calar(); // desligou: cala na hora
    },
    // O nome do som que está tocando (ou null).
    get tocando() { return atual ? atual.nome : null; },
    // Anda `dt` segundos e devolve a frequência (Hz) do buzzer agora; 0 = quieto.
    atualizar(dt) {
      if (!atual) return 0;
      let ms = dt * 1000;
      while (ms >= atual.restanteMs) {
        ms -= atual.restanteMs;
        atual.indice++;
        if (atual.indice >= atual.notas.length) {
          atual = null;
          return 0;
        }
        atual.restanteMs = atual.notas[atual.indice][1];
      }
      atual.restanteMs -= ms;
      return atual.notas[atual.indice][0];
    },
    // Quanto dura um som, em ms (para a lista de teste e para os testes).
    duracaoMs(nome) {
      const som = sons[nome];
      if (!som) throw new RangeError(`som desconhecido: ${nome}`);
      return som.notas.reduce((soma, [, ms]) => soma + ms, 0);
    },
  };
}
