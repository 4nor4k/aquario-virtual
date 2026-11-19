// Bolhas pequenas subindo do chão até a superfície, saindo de dois pontos do aquário.
// É só enfeite: não afeta o jogo e não é salvo. O tempo vem de fora (dt), o sorteio tem semente.
//
// Cada ponto (emissor) solta uma bolha de tempos em tempos. A bolha sobe, balança um pouquinho
// para os lados e some ao chegar na superfície.
import { criarRng } from './rng.js';
import { AREIA_Y, SUPERFICIE_Y } from './mundo.js';

// De onde saem (x no mundo), bem afastados. Têm de ser colunas que nunca têm rocha (ver
// cenario.js): 0 a 2, 9 a 12, 19 a 22 e 29. O 84 fica dentro da câmera inicial.
export const EMISSORES_X = [84, 236];

// Tempo até a próxima bolha de um ponto: quase sempre um intervalo comum, às vezes uma rajada
// (várias coladas) e às vezes uma pausa longa. É isso que tira o ar de relógio.
const INTERVALO_COMUM = [0.3, 1.4];  // segundos
const INTERVALO_RAJADA = [0.08, 0.2];
const INTERVALO_PAUSA = [2.5, 6];
const CHANCE_DE_PAUSA = 0.15;
const CHANCE_DE_RAJADA = 0.25;
const VELOCIDADE_MIN = 9;       // pixels por segundo: umas sobem devagar, outras disparam
const VELOCIDADE_MAX = 26;
const BALANCO_MAX = 1.5;        // quanto balança para os lados, em pixels
const CHANCE_DE_ANEL = 0.25;    // as outras são só um pontinho
const MAXIMO = 40;              // teto de bolhas na tela (memória do ESP32)
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
  const proximoIntervalo = () => {
    const sorteio = rng.decimal();
    if (sorteio < CHANCE_DE_PAUSA) return entre(...INTERVALO_PAUSA);
    if (sorteio < CHANCE_DE_PAUSA + CHANCE_DE_RAJADA) return entre(...INTERVALO_RAJADA);
    return entre(...INTERVALO_COMUM);
  };
  // Quanto falta para cada ponto soltar a próxima bolha (começam em momentos diferentes).
  const espera = emissores.map(() => entre(0, 4));

  function nova(xDoPonto) {
    const centro = xDoPonto + entre(-1, 1); // cada bolha sai um tiquinho para o lado
    return {
      x: centro,
      y: yNascimento,
      xBase: centro,
      velocidade: entre(VELOCIDADE_MIN, VELOCIDADE_MAX),
      balanco: entre(0.4, BALANCO_MAX),
      ritmo: entre(1.2, 2.4),      // balanços por segundo
      fase: entre(0, Math.PI * 2),
      idade: 0,
      anel: rng.decimal() < CHANCE_DE_ANEL,
    };
  }

  function atualizar(dt) {
    for (let i = 0; i < emissores.length; i++) {
      espera[i] -= dt;
      while (espera[i] <= 0) {
        if (bolhas.length < MAXIMO) bolhas.push(nova(emissores[i]));
        espera[i] += proximoIntervalo();
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
