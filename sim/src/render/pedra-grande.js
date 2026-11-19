// A pedra grande do fundo (camada 2), a partir de uma referência de pixel art: um rochedo
// facetado de cinza-amarronzado, com rachaduras escuras, musgo verde no alto e uma pedra menor
// na frente, mais pedrinhas soltas na base.
//
// Como é gerada (tudo por código, sempre igual):
//   1. a silhueta: uma linha de topo assimétrica, com degrau, a pedra da frente e as pedrinhas;
//   2. as facetas: espalham-se pontos dentro da pedra e cada pixel pertence ao ponto mais
//      próximo; cada faceta ganha um tom (mais clara no alto e à esquerda, de onde vem a luz);
//   3. as rachaduras: onde duas facetas se encontram o pixel fica escuro;
//   4. o musgo: uma faixa irregular logo abaixo do topo, com o pixel de cima mais claro.
//
// Como está no fundo, os tons são mais escuros que os das rochas da frente.
import { criarRng } from '../core/rng.js';
import { COR } from './palette.js';
import { LARGURA, ALTURA } from './tela.js';

const L = 66; // largura do desenho
const A = 40; // altura do desenho

// A altura do corpo principal (de x = 9 a 58): sobe rápido, tem um topo largo e meio chato e desce
// em degraus para a direita. À esquerda, na frente, fica uma pedra menor; à direita, pedrinhas.
const PERFIL = [[9, 10], [12, 22], [16, 29], [22, 34], [34, 35], [42, 33], [48, 26], [52, 17], [56, 8], [58, 2]];

function alturaDoCorpo(x) {
  if (x < PERFIL[0][0] || x > PERFIL[PERFIL.length - 1][0]) return 0;
  for (let i = 1; i < PERFIL.length; i++) {
    const [x1, h1] = PERFIL[i];
    const [x0, h0] = PERFIL[i - 1];
    if (x <= x1) return h0 + ((h1 - h0) * (x - x0)) / (x1 - x0);
  }
  return 0;
}

// Uma cúpula: meia elipse com centro cx, meia largura r e altura h.
const cupula = (x, cx, r, h) => (Math.abs(x - cx) < r ? h * Math.sqrt(1 - ((x - cx) / r) ** 2) : 0);

function gerarPedraGrande() {
  const rng = criarRng(4242);

  // 1. Silhueta: a altura de cada coluna.
  const corpo = new Array(L).fill(0);
  const perfil = new Array(L).fill(0);
  for (let x = 0; x < L; x++) {
    const irregular = Math.round(Math.sin(x * 0.7) * 0.7); // o topo não é uma régua
    corpo[x] = Math.max(0, Math.round(alturaDoCorpo(x)) + (alturaDoCorpo(x) > 3 ? irregular : 0));
    perfil[x] = Math.max(
      corpo[x],
      Math.round(cupula(x, 9, 8.5, 13)),    // a pedra da frente, à esquerda
      Math.round(cupula(x, 60.5, 3.2, 8)),  // pedrinha
      Math.round(cupula(x, 64, 2.2, 5)),    // pedrinha menor
    );
  }
  const topo = perfil.map((h) => A - h); // linha do topo de cada coluna (de cima para baixo)
  const existe = (x, y) => x >= 0 && x < L && y >= topo[x] && y < A;

  // 2. Facetas: pontos dentro da pedra, e o tom de cada um.
  const pontos = [];
  while (pontos.length < 16) {
    const x = rng.inteiro(12, 54);
    const y = rng.inteiro(0, A - 1);
    if (existe(x, y)) pontos.push({ x, y });
  }
  pontos.push({ x: 5, y: A - 5 }, { x: 12, y: A - 6 }); // a pedra da frente
  pontos.push({ x: 60, y: A - 3 }, { x: 64, y: A - 2 }); // as pedrinhas
  for (const p of pontos) {
    const luz = 0.5 * (1 - p.y / A) + 0.3 * (1 - p.x / L) + 0.3 * rng.decimal();
    p.cor = luz > 0.6 ? COR.PEDRA_GRANDE.clara : luz < 0.4 ? COR.PEDRA_GRANDE.escura : COR.PEDRA_GRANDE.base;
  }
  const faceta = new Int16Array(L * A).fill(-1);
  for (let y = 0; y < A; y++) {
    for (let x = 0; x < L; x++) {
      if (!existe(x, y)) continue;
      let melhor = 0;
      let menor = Infinity;
      pontos.forEach((p, i) => {
        const d = (p.x - x) ** 2 + ((p.y - y) * 1.3) ** 2;
        if (d < menor) { menor = d; melhor = i; }
      });
      faceta[y * L + x] = melhor;
    }
  }

  // 3 e 4. Cor de cada pixel: faceta, rachadura e musgo.
  const espessuraDoMusgo = (x) => {
    if (x >= 9 && x <= 50) {
      return Math.max(0, Math.min(5, Math.round(2.6 + 2.4 * Math.sin(x * 0.35 + 0.7) + 1.4 * Math.sin(x * 0.9))));
    }
    return x >= 4 && x <= 12 && perfil[x] > corpo[x] ? 2 : 0; // musgo também na pedra da frente
  };
  const pix = new Uint8Array(L * A);
  for (let y = 0; y < A; y++) {
    for (let x = 0; x < L; x++) {
      const f = faceta[y * L + x];
      if (f < 0) continue;
      let cor = pontos[f].cor;
      const encontro = (nx, ny) => existe(nx, ny) && faceta[ny * L + nx] !== f;
      const ruido = ((Math.imul(x * 73856093 ^ y * 19349663, 0x9e3779b1) >>> 0) % 100) / 100;
      if ((encontro(x + 1, y) || encontro(x, y + 1)) && ruido < 0.7) cor = COR.PEDRA_GRANDE.rachadura;
      const fundoDoMusgo = y - topo[x]; // 0 no topo da coluna
      if (fundoDoMusgo < espessuraDoMusgo(x)) {
        cor = fundoDoMusgo === 0 ? COR.PEDRA_GRANDE.musgoClaro : COR.PEDRA_GRANDE.musgo;
      }
      pix[y * L + x] = cor;
    }
  }
  return { largura: L, altura: A, pix };
}

export const PEDRA_GRANDE = gerarPedraGrande();

// Desenha a pedra com o centro em x (do mundo), apoiada no chão (y do chão, na tela).
// ox = deslocamento da camada (paralaxe). O que sai da tela é cortado.
export function desenharPedraGrande(quadro, x, ox, chao) {
  const { largura, altura, pix } = PEDRA_GRANDE;
  const x0 = x - Math.floor(largura / 2) - ox;
  const y0 = chao - altura + 1;
  for (let y = 0; y < altura; y++) {
    const ty = y0 + y;
    if (ty < 0 || ty >= ALTURA) continue;
    for (let i = 0; i < largura; i++) {
      const tx = x0 + i;
      const cor = pix[y * largura + i];
      if (cor !== 0 && tx >= 0 && tx < LARGURA) quadro[ty * LARGURA + tx] = cor;
    }
  }
}
