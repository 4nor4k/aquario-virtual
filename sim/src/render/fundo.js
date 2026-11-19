// O fundo com paralaxe: uma camada atrás do jogo que anda mais devagar que a câmera, o que dá
// sensação de profundidade (como na referência "Marine Life", de Bela Toth).
//
//   FUNDO  (anda a 85% da câmera, só para os lados): pedras grandes em cinza escuro e umas
//          poucas plantas ramificadas em verde escuro. O efeito é SUTIL de propósito;
//   JOGO   (anda a 100%):          rochas, areia, plantas, peixes e bolhas (o resto do render).
//
// Quanto mais longe, mais escuro: o cinza das pedras do fundo é mais escuro que o das rochas da
// frente, e o verde das plantas do fundo é mais escuro que o das plantas da frente (o contrário
// da referência, em que o longe é claro, porque aqui a água é preta; o princípio de perder
// contraste com a distância é o mesmo).
//
// Como o paralaxe é calculado: a camada tem um fator k (0 a 1). Com a câmera no meio do mundo
// (em x), a camada fica exatamente onde ficaria no mundo; quando a câmera anda para os lados, a
// camada se desloca só k vezes o que a câmera se deslocou. Para cima e para baixo NÃO há paralaxe:
// o fundo acompanha o mundo, e as pedras ficam sempre apoiadas na areia.
import { criarRng } from '../core/rng.js';
import { AREIA_Y, MUNDO_LARGURA } from '../core/mundo.js';
import { SEMENTE_CENARIO } from './cenario.js';
import { montarModelo, balanco } from './plantas.js';
import { LARGURA, ALTURA } from './tela.js';
import { COR } from './palette.js';

// 0 = o fundo ficaria colado na tela, 1 = andaria junto com o jogo (sem profundidade nenhuma).
// Perto de 1 o efeito é sutil: o fundo anda só 15% menos que a câmera.
export const PARALAXE_FUNDO = 0.85;

const COR_PEDRA = COR.PEDRA_FUNDO;         // miolo das pedras do fundo: cinza escuro, sólido
const COR_BORDA = COR.PEDRA_FUNDO_BORDA;   // borda de cima das pedras: cinza um pouco mais claro
const COR_PLANTA = COR.VERDE_FUNDO;        // plantas do fundo: verde escuro

const QUANTAS_PEDRAS = 6;       // espalhadas pelo mundo todo
const QUANTAS_PLANTAS = 3;      // bem poucas: o fundo é principalmente pedra
const LARGURA_PEDRA = [22, 38]; // sorteio entre esses valores (px)
const ALTURA_PEDRA = [8, 16];

// Planta ramificada: um tronco de 2 pixels com galhos grossos subindo em diagonal, alternando de
// lado e encurtando para cima, como os corais da referência.
//   altura: pixels · passo: de quantos em quantos pixels sai um galho · comprimento: galho mais longo
function ramo(altura, { passo, comprimento }) {
  const L = 2 * comprimento + 4;
  const meio = comprimento + 1; // o tronco ocupa as colunas meio e meio+1
  const grade = Array.from({ length: altura }, () => Array(L).fill('.'));
  const pinta = (acima, x) => {
    const r = altura - 1 - acima;
    if (r >= 0 && r < altura && x >= 0 && x < L) grade[r][x] = 'c';
  };
  for (let acima = 0; acima < altura; acima++) {
    pinta(acima, meio);
    if (acima < altura - 4) pinta(acima, meio + 1);
  }
  let lado = 1;
  for (let a = passo; a < altura - 3; a += passo) {
    const tamanho = Math.max(2, Math.round(comprimento * (1 - a / altura) + 1));
    for (let i = 1; i <= tamanho; i++) {
      const x = lado > 0 ? meio + 1 + i : meio - i;
      pinta(a + i, x);
      pinta(a + i - 1, x); // galho de 2 pixels de espessura
    }
    lado = -lado;
  }
  return grade.map((l) => l.join(''));
}

const MODELOS_PLANTA = [
  montarModelo(ramo(36, { passo: 6, comprimento: 6 }), COR_PLANTA),
  montarModelo(ramo(28, { passo: 5, comprimento: 5 }), COR_PLANTA),
  montarModelo(ramo(22, { passo: 5, comprimento: 5 }), COR_PLANTA),
];

// Sorteia o fundo: as pedras ({ x, largura, altura, fase }) e as plantas ({ modelo, x }).
// A mesma semente dá sempre o mesmo fundo.
export function gerarFundo(semente = SEMENTE_CENARIO + 2) {
  const rng = criarRng(semente);

  const pedras = [];
  const espacoPedras = MUNDO_LARGURA / QUANTAS_PEDRAS;
  for (let i = 0; i < QUANTAS_PEDRAS; i++) {
    pedras.push({
      x: Math.round((i + 0.5) * espacoPedras + rng.inteiro(-8, 8)),
      largura: rng.inteiro(...LARGURA_PEDRA),
      altura: rng.inteiro(...ALTURA_PEDRA),
      fase: rng.decimal() * 6.28, // dá a cada pedra um contorno irregular diferente
    });
  }

  const plantas = [];
  const espacoPlantas = MUNDO_LARGURA / QUANTAS_PLANTAS;
  let vez = rng.inteiro(0, MODELOS_PLANTA.length - 1);
  for (let i = 0; i < QUANTAS_PLANTAS; i++) {
    plantas.push({
      modelo: vez % MODELOS_PLANTA.length,
      x: Math.round((i + 0.5) * espacoPlantas + rng.inteiro(-15, 15)),
    });
    vez++;
  }
  return { pedras, plantas };
}

// Quanto a camada é deslocada na tela, para os lados (x do mundo que fica na borda esquerda).
function deslocamentoX(camera, k) {
  const meioX = camera.maxX / 2;
  return Math.round(meioX + (camera.x - meioX) * k);
}

const dentro = (x, y) => x >= 0 && x < LARGURA && y >= 0 && y < ALTURA;

// Altura da pedra na coluna dx (a partir do centro): meia elipse com a borda irregular.
function alturaDaPedra(pedra, dx) {
  const r = (2 * dx) / pedra.largura;
  if (Math.abs(r) >= 1) return 0;
  const base = pedra.altura * Math.sqrt(1 - r * r);
  return Math.max(0, Math.round(base + 1.2 * Math.sin(dx * 1.7 + pedra.fase)));
}

function desenharPedras(quadro, fundo, ox, oy) {
  const chao = AREIA_Y - oy; // y do chão, na tela (a mesma linha da areia)
  for (const p of fundo.pedras) {
    const metade = Math.floor(p.largura / 2);
    let anterior = null;
    for (let dx = -metade; dx <= metade; dx++) {
      const sx = p.x + dx - ox;
      const topo = chao - alturaDaPedra(p, dx);
      // O contorno liga um pixel ao vizinho, sem buracos nas subidas íngremes.
      const de = anterior === null ? topo : Math.min(anterior, topo);
      const ate = anterior === null ? topo : Math.max(anterior, topo);
      anterior = topo;
      if (sx < 0 || sx >= LARGURA) continue;
      for (let y = de; y <= ate; y++) if (dentro(sx, y)) quadro[y * LARGURA + sx] = COR_BORDA;
      // O miolo desce até o pé da tela: a areia (desenhada depois) cobre o que passar dela.
      for (let y = Math.max(0, ate + 1); y < ALTURA; y++) quadro[y * LARGURA + sx] = COR_PEDRA;
    }
  }
}

function desenharPlantas(quadro, fundo, ox, oy, tempo) {
  const base = AREIA_Y - oy; // y da base das plantas na tela
  for (const p of fundo.plantas) {
    const { largura, altura, pix } = MODELOS_PLANTA[p.modelo];
    const x0 = p.x - Math.floor(largura / 2) - ox;
    if (x0 + largura + 4 < 0 || x0 - 4 >= LARGURA) continue;
    for (let y = 0; y < altura; y++) {
      const ty = base - altura + 1 + y;
      if (ty < 0 || ty >= ALTURA) continue;
      const desvio = balanco(altura, altura - 1 - y, p.x, tempo * 0.8);
      for (let x = 0; x < largura; x++) {
        if (pix[y * largura + x] !== 0 && dentro(x0 + x + desvio, ty)) quadro[ty * LARGURA + x0 + x + desvio] = COR_PLANTA;
      }
    }
  }
}

// Desenha a camada de fundo: primeiro as pedras, depois as plantas na frente delas. Chame logo
// depois de pintar a água e antes do cenário (areia e rochas), que a cobre.
export function desenharFundo(quadro, fundo, camera, tempo = 0) {
  const ox = deslocamentoX(camera, PARALAXE_FUNDO);
  const oy = Math.round(camera.y);
  desenharPedras(quadro, fundo, ox, oy);
  desenharPlantas(quadro, fundo, ox, oy, tempo);
}
