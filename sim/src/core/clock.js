// Relógio do jogo. O jogo nunca olha a hora do computador direto: ele pergunta a este relógio.
// A fonte de tempo é injetada, então:
//   - no simulador, o relógio pode ser acelerado (60×, 3600×);
//   - nos testes, usamos uma fonte falsa e controlamos o tempo à mão;
//   - no ESP32, a fonte será o relógio do aparelho.

export const SEGUNDO_MS = 1000;
export const MINUTO_MS = 60 * SEGUNDO_MS;
export const HORA_MS = 60 * MINUTO_MS;
export const DIA_MS = 24 * HORA_MS;

// fonte: função que devolve o tempo REAL em milissegundos (ex.: () => performance.now()).
export function criarClock(fonte, velocidadeInicial = 1) {
  validarVelocidade(velocidadeInicial);
  let velocidade = velocidadeInicial;
  let ultimaLeitura = fonte(); // tempo real na última atualização
  let tempoJogo = 0;           // milissegundos de jogo desde o começo

  // Traz o tempo de jogo até o instante real de agora.
  function atualizar() {
    const agora = fonte();
    const passou = agora - ultimaLeitura;
    // Se a fonte andar para trás (ou der erro), ignora em vez de rebobinar o jogo.
    if (passou > 0) tempoJogo += passou * velocidade;
    ultimaLeitura = agora;
  }

  return {
    // Milissegundos de jogo desde o começo (0 = nascimento do peixe).
    agoraMs() {
      atualizar();
      return tempoJogo;
    },

    get velocidade() {
      return velocidade;
    },

    // Troca a velocidade. O que já passou não muda; só o que vem depois.
    set velocidade(nova) {
      validarVelocidade(nova);
      atualizar(); // fecha o trecho anterior com a velocidade antiga
      velocidade = nova;
    },

    // Salta no tempo do jogo (usado por "Pular para a próxima fase").
    avancar(ms) {
      if (!(ms >= 0) || !Number.isFinite(ms)) {
        throw new RangeError(`avancar(${ms}): precisa ser um número maior ou igual a 0`);
      }
      atualizar();
      tempoJogo += ms;
    },

    // Volta ao começo (usado por "Reiniciar").
    reiniciar() {
      ultimaLeitura = fonte();
      tempoJogo = 0;
    },
  };
}

function validarVelocidade(v) {
  if (!(v >= 0) || !Number.isFinite(v)) {
    throw new RangeError(`velocidade ${v}: precisa ser um número maior ou igual a 0`);
  }
}
