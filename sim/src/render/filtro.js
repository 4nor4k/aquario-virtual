// O filtro do aquário, preso no canto de cima à esquerda do aquário (parte do mundo: só aparece
// quando a câmera está lá). É o tipo que fica pendurado na borda: uma caixa, um bico por onde a
// água cai em um fio até a superfície e um tubo de sucção que desce para dentro da água.
//
// A queda d'água é animada (em tempo real, como a onda): o fio é feito de pedacinhos que descem,
// batem na superfície e espirram, e abaixo dela sobem uns pontos como bolhas do impacto.
import { SUPERFICIE_Y } from '../core/mundo.js';
import { deslocamentoDaOnda } from './superficie.js';
import { LARGURA, ALTURA } from './tela.js';
import { COR } from './palette.js';

const BRANCO = 12;
const AZUL = COR.AZUL_AGUA; // a água que cai, os respingos e as bolhinhas, no mesmo azul da superfície
const XADREZ = 14; // meio-tom

// Medidas, em pixels do mundo (o canto de cima à esquerda é (0, 0)).
export const CAIXA = { x: 1, y: 2, largura: 13, altura: 16 };
export const BICO = { x: 14, y: 7, comprimento: 6 }; // sai da caixa para a direita, 2 px de espessura
export const QUEDA_X = BICO.x + BICO.comprimento - 2; // o fio de água cai nas colunas QUEDA_X e +1
export const QUEDA_Y = BICO.y + 2;                    // de onde começa a cair
export const TUBO = { x: 5, y: CAIXA.y + CAIXA.altura, comprimento: 34 }; // tubo de sucção (2 px)

// Um número "aleatório" que depende só de n: sempre dá o mesmo resultado para o mesmo n,
// então os respingos são iguais em qualquer máquina (e testáveis).
export function ruido(n) {
  let h = Math.imul(n | 0, 0x9e3779b1) ^ 0x85ebca6b;
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  return (h ^ (h >>> 12)) >>> 0;
}

export function desenharFiltro(quadro, camera, tempo = 0) {
  const cx = Math.round(camera.x);
  const cy = Math.round(camera.y);
  if (cx >= 40 || cy >= 90) return; // longe do canto: nada para desenhar

  const pixel = (wx, wy, cor) => {
    const x = wx - cx;
    const y = wy - cy;
    if (x >= 0 && x < LARGURA && y >= 0 && y < ALTURA) quadro[y * LARGURA + x] = cor;
  };
  const retangulo = (x, y, l, a, cor) => {
    for (let j = 0; j < a; j++) for (let i = 0; i < l; i++) pixel(x + i, y + j, cor);
  };

  // Tubo de sucção e a grade na ponta (dentro da água, embaixo da caixa).
  retangulo(TUBO.x, TUBO.y, 2, TUBO.comprimento, BRANCO);
  const fimDoTubo = TUBO.y + TUBO.comprimento;
  retangulo(TUBO.x - 2, fimDoTubo, 6, 5, XADREZ);
  for (let i = 0; i < 6; i++) { pixel(TUBO.x - 2 + i, fimDoTubo, BRANCO); pixel(TUBO.x - 2 + i, fimDoTubo + 4, BRANCO); }

  // Caixa: contorno branco, miolo em xadrez e três fendas escuras (a saída de ar do motor).
  const { x, y, largura, altura } = CAIXA;
  retangulo(x, y, largura, altura, XADREZ);
  for (let i = 0; i < largura; i++) { pixel(x + i, y, BRANCO); pixel(x + i, y + altura - 1, BRANCO); }
  for (let j = 0; j < altura; j++) { pixel(x, y + j, BRANCO); pixel(x + largura - 1, y + j, BRANCO); }
  for (let k = 0; k < 3; k++) retangulo(x + 3 + k * 3, y + 4, 1, 8, 0);

  // Bico: uma calha de 2 pixels que sai da caixa, com a pontinha virada para baixo.
  retangulo(BICO.x, BICO.y, BICO.comprimento, 2, BRANCO);
  pixel(BICO.x + BICO.comprimento - 1, BICO.y + 2, BRANCO);

  // A queda: um fio de 2 colunas de água descendo até a linha da superfície naquele ponto, com
  // uma terceira coluna mais rala ao lado, como o respingo da borda.
  const passo = Math.floor(tempo * 18);
  const superficie = (wx) => SUPERFICIE_Y + deslocamentoDaOnda(wx, tempo);
  for (let k = 0; k < 3; k++) {
    const wx = QUEDA_X + k;
    for (let wy = QUEDA_Y; wy < superficie(wx); wy++) {
      // No fio, três de cada quatro pixels ficam acesos e a "falha" desce com o tempo: parece água
      // caindo. Na coluna da borda, só um de cada três. O sinal é de MENOS (wy - passo): com o tempo
      // passando (passo crescendo), a falha fica em linhas cada vez maiores, ou seja, mais embaixo.
      const aceso = k < 2 ? ((wy - passo + k * 2) & 3) < 3 : (((wy - passo) % 3) + 3) % 3 === 0;
      if (aceso) pixel(wx, wy, AZUL);
    }
  }

  // Respingos logo acima da superfície, onde a água bate.
  const centro = QUEDA_X + 0.5;
  const nivel = superficie(QUEDA_X);
  const quadroDoRespingo = Math.floor(tempo * 14);
  for (let k = 0; k < 4; k++) {
    const h = ruido(quadroDoRespingo * 7 + k);
    const dx = (h % 9) - 4;
    if (dx === 0 || dx === -1) continue; // o centro é o próprio fio
    pixel(Math.round(centro) + dx, nivel - 1 - ((h >>> 8) % 3), AZUL);
  }

  // Bolhinhas do impacto, abaixo da superfície, que piscam e mudam de lugar.
  const quadroDasBolhas = Math.floor(tempo * 8);
  for (let k = 0; k < 5; k++) {
    const h = ruido(quadroDasBolhas * 13 + k + 1000);
    pixel(Math.round(centro) + (h % 7) - 3, nivel + 2 + ((h >>> 8) % 8), AZUL);
  }
}
