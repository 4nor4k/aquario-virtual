// Bolhas subindo do chão até a superfície, saindo de um ou mais pontos (emissores) do aquário.
// É só enfeite: não afeta o jogo e não é salvo. O tempo vem de fora (dt), o sorteio tem semente.
//
// Cada ponto (emissor) solta, o tempo todo, bolhas PEQUENAS (um pontinho), e de vez em quando uma
// bolha MAIOR (um anel de 3×3, e às vezes um de 5×5), que sobe mais depressa. A bolha sobe,
// balança um pouquinho para os lados e some ao chegar na superfície.
import { criarRng } from './rng.js';
import { AREIA_Y, SUPERFICIE_Y } from './mundo.js';

// De onde saem (x no mundo) as bolhas da frente. Tem de ser uma coluna que nunca tem rocha (ver
// cenario.js): 0 e 1, 9 a 13, 17 e 18, 22 e 23 e 27 a 29. O 84 fica dentro da câmera inicial.
// (A fonte da direita, no 236, foi tirada a pedido do usuário em 19/11/2026. Existe outra fonte, atrás
// da pedra grande, que é do fundo: ver main.js e render/fundo.js.)
export const EMISSORES_X = [84];

// Bolhas pequenas: saem sempre, com um intervalo que varia um pouco (e às vezes duas juntas), sem
// pausas longas: o fluxo é constante.
const INTERVALO_PEQUENA = [0.3, 0.9]; // segundos entre uma e outra
const CHANCE_DE_DUPLA = 0.2;          // às vezes saem duas bolhas juntas, uma ao lado da outra
// Bolhas maiores: de vez em quando, bem mais raras.
const INTERVALO_GRANDE = [3.5, 9];
const CHANCE_DE_ENORME = 0.3;         // entre as grandes, as que são o anel de 5×5
const VELOCIDADE_MIN = 9;       // pixels por segundo: umas sobem devagar, outras disparam
const VELOCIDADE_MAX = 26;
const VELOCIDADE_GRANDE = [20, 32]; // as grandes sobem mais depressa
const BALANCO_MAX = 1.5;        // quanto balança para os lados, em pixels
const BALANCO_GRANDE = [0.8, 1.8];
export const MAXIMO_DE_BOLHAS = 100; // teto de bolhas no aquário (memória do ESP32)
const AQUECIMENTO_S = 14;       // já começa com a coluna de bolhas formada

export function criarBolhas({
  semente = 7,
  emissores = EMISSORES_X,
  yNascimento = AREIA_Y - 1,
  ySuperficie = SUPERFICIE_Y + 1,
  aquecimento = AQUECIMENTO_S,
} = {}) {
  const rng = criarRng(semente);
  const entre = (min, max) => min + rng.decimal() * (max - min);

  const bolhas = [];
  // Quanto falta para cada ponto soltar a próxima bolha pequena e a próxima grande (começam em
  // momentos diferentes).
  const espera = emissores.map(() => entre(0, 1));
  const esperaGrande = emissores.map(() => entre(0, INTERVALO_GRANDE[1]));

  // tamanho: 1 = pontinho, 3 = anel 3×3, 5 = anel 5×5. `anel` (true nas maiores) continua existindo.
  function nova(xDoPonto, tamanho) {
    const centro = xDoPonto + entre(-1, 1); // cada bolha sai um tiquinho para o lado
    const grande = tamanho > 1;
    return {
      x: centro,
      y: yNascimento,
      xBase: centro,
      tamanho,
      anel: grande,
      velocidade: grande ? entre(...VELOCIDADE_GRANDE) : entre(VELOCIDADE_MIN, VELOCIDADE_MAX),
      balanco: grande ? entre(...BALANCO_GRANDE) : entre(0.4, BALANCO_MAX),
      ritmo: grande ? entre(0.8, 1.4) : entre(1.2, 2.4), // balanços por segundo (as grandes oscilam mais devagar)
      fase: entre(0, Math.PI * 2),
      idade: 0,
    };
  }
  const cabe = () => bolhas.length < MAXIMO_DE_BOLHAS;

  function atualizar(dt) {
    for (let i = 0; i < emissores.length; i++) {
      espera[i] -= dt;
      while (espera[i] <= 0) {
        if (cabe()) bolhas.push(nova(emissores[i], 1));
        if (cabe() && rng.decimal() < CHANCE_DE_DUPLA) bolhas.push(nova(emissores[i], 1));
        espera[i] += entre(...INTERVALO_PEQUENA);
      }
      esperaGrande[i] -= dt;
      while (esperaGrande[i] <= 0) {
        if (cabe()) bolhas.push(nova(emissores[i], rng.decimal() < CHANCE_DE_ENORME ? 5 : 3));
        esperaGrande[i] += entre(...INTERVALO_GRANDE);
      }
    }
    for (let i = bolhas.length - 1; i >= 0; i--) {
      const b = bolhas[i];
      b.idade += dt;
      b.y -= b.velocidade * dt;
      b.x = b.xBase + b.balanco * Math.sin(b.fase + b.idade * b.ritmo * Math.PI * 2);
      if (b.y <= ySuperficie) bolhas.splice(i, 1); // estourou na superfície
    }
  }

  for (let t = 0; t < aquecimento; t += 0.1) atualizar(0.1);

  return {
    atualizar,
    get lista() { return bolhas; },
  };
}
