// Plantas do fundo do aquário: cinco modelos pequenos desenhados em texto (um deles mais alto) e
// duas algas gigantes (cerca de metade da altura do aquário), espalhados pela areia entre as
// rochas e longe das bolhas. Todas balançam de leve com a água (ver balancoDaLinha).
//
// Cada letra é uma cor da paleta (palette.js):  .  transparente   c  branco (talo e contorno)
//                                               e  meio-tom em xadrez (folha)
// Edite à vontade: é só desenhar de outro jeito.
import { criarRng } from '../core/rng.js';
import { AREIA_Y, COLUNAS, LINHA_AREIA, MUNDO_LARGURA, TILE } from '../core/mundo.js';
import { ID, SEMENTE_CENARIO } from './cenario.js';
import { EMISSORES_X } from '../core/bolhas.js';
import { LARGURA, ALTURA } from './tela.js';
import { COR } from './palette.js';

export const COR_VERDE = COR.VERDE_ALGA; // verde das algas grandes (#10AB8C)

// As plantas pequenas são desenhadas com os "índices-molde" 12 (talo) e 14 (folha) e ganham, na
// hora de desenhar, um destes pares de verdes: variações pequenas do verde das algas grandes.
// Cada planta usa uma variação, e assim vizinhas não ficam idênticas.
const VARIANTES = COR.VERDES_PLANTA.map((verde, i) => ({
  12: verde,
  14: COR.VERDES_PLANTA[(i + 1) % COR.VERDES_PLANTA.length],
}));

const MODELOS_TEXTO = {
  // Alga em fita: um talo fino que serpenteia.
  fita: [
    '..c..',
    '.c...',
    '.c...',
    '..c..',
    '...c.',
    '...c.',
    '..c..',
    '.c...',
    '.c...',
    '..c..',
    '...c.',
    '...c.',
    '..c..',
    '..c..',
    '.c...',
    '.c...',
  ],
  // Capim: folhas finas abrindo em leque.
  capim: [
    'c...c...c',
    'c...c...c',
    '.c..c..c.',
    '.c..c..c.',
    '..c.c.c..',
    '..c.c.c..',
    '...ccc...',
    '...ccc...',
  ],
  // Folhas largas: um talo com folhas cheias dos dois lados.
  folhas: [
    '.....c.....',
    '....cec....',
    '....cec....',
    '.c..cec..c.',
    'cec.cec.cec',
    'cec.cec.cec',
    '.cc.ccc.cc.',
    '..cc.c.cc..',
    '...cc.cc...',
    '....ccc....',
    '.....c.....',
    '.....c.....',
  ],
  // Coral: copa redonda e cheia sobre um pé curto.
  coral: [
    '..cc...cc..',
    '.cecc.cecc.',
    '.ceeccceec.',
    '..ceeeeec..',
    '...ceeec...',
    '....cec....',
    '.....c.....',
    '.....c.....',
  ],
  // Alga alta (24 pixels): o modelo maior entre os pequenos, com folhinhas ao longo do talo.
  alta: [
    '...c...',
    '..cec..',
    '...c...',
    '...c...',
    '..c....',
    '.cec...',
    '..c....',
    '..c....',
    '...c...',
    '...cec.',
    '...c...',
    '...c...',
    '..c....',
    '.cec...',
    '..c....',
    '..c....',
    '...c...',
    '...cec.',
    '...c...',
    '...c...',
    '..c....',
    '..c....',
    '...c...',
    '...c...',
  ],
};

// Alga gigante, a partir de uma referência de pixel art: uma ROSETA de folhas largas em forma de
// chama, saindo de um centro estreito na base. Cada folha é uma curva (Bézier) com largura que
// cresce rápido, passa do máximo no primeiro terço e afina até a ponta. A folha de trás é pintada
// primeiro e a da frente depois, então as folhas se sobrepõem.
//
// Cores (todas sólidas, ver palette.js), decididas por pixel:
//   - o corpo é o verde #10AB8C e vai ficando oliva e depois ocre perto da ponta;
//   - um fio de borda escura corre por um dos lados de cada folha (separa uma folha da outra) e
//     escurece a ponta;
//   - manchas de brilho no lado claro e um núcleo brilhante na base.
//
//   altura, largura: tamanho do desenho em pixels
//   folhas: [{ pontos: [[u, v] × 4], largura }] · pontos = curva de Bézier com u de -1 a 1 (para os
//           lados) e v de 0 a 1 (da base ao alto); largura = meia largura máxima da folha, em pixels
//   espelhar: vira o desenho (e o lado da borda escura) para a esquerda/direita
const PASSOS_DA_FOLHA = 500;

// Um número "aleatório" que só depende da posição: o mesmo pixel sempre dá o mesmo resultado.
function ruidoDoPixel(x, y, sal) {
  let h = Math.imul(x * 73856093 ^ y * 19349663 ^ sal * 83492791, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  return ((h ^ (h >>> 12)) >>> 0) % 1000 / 1000; // de 0 a 1
}

function pontoDaCurva(p, t) {
  const u = 1 - t;
  return [
    u * u * u * p[0][0] + 3 * u * u * t * p[1][0] + 3 * u * t * t * p[2][0] + t * t * t * p[3][0],
    u * u * u * p[0][1] + 3 * u * u * t * p[1][1] + 3 * u * t * t * p[2][1] + t * t * t * p[3][1],
  ];
}

function direcaoDaCurva(p, t) {
  const u = 1 - t;
  return [
    3 * u * u * (p[1][0] - p[0][0]) + 6 * u * t * (p[2][0] - p[1][0]) + 3 * t * t * (p[3][0] - p[2][0]),
    3 * u * u * (p[1][1] - p[0][1]) + 6 * u * t * (p[2][1] - p[1][1]) + 3 * t * t * (p[3][1] - p[2][1]),
  ];
}

function algaRoseta(altura, largura, folhas, { espelhar = false } = {}) {
  const centro = (largura - 1) / 2;
  const meia = centro - 1;
  const n = largura * altura;
  // O que cada pixel guarda: de qual folha é (-1 = vazio) e onde ele está dentro dela.
  const folha = new Int8Array(n).fill(-1);
  const posT = new Float32Array(n);   // 0 = base da folha, 1 = ponta
  const posS = new Float32Array(n);   // distância ao eixo da folha (pixels, com sinal)
  const meiaL = new Float32Array(n);  // meia largura da folha naquele ponto
  const ladoEscuro = espelhar ? 1 : -1; // o lado da borda escura (o direito, ou o esquerdo se espelhado)

  folhas.forEach((f, id) => {
    const pontos = f.pontos.map(([u, v]) => [centro + (espelhar ? -u : u) * meia, v * (altura - 1)]);
    for (let i = 0; i <= PASSOS_DA_FOLHA; i++) {
      const t = i / PASSOS_DA_FOLHA;
      const [cx, cy] = pontoDaCurva(pontos, t);
      const [dx, dy] = direcaoDaCurva(pontos, t);
      const tam = Math.hypot(dx, dy) || 1;
      const nx = -dy / tam;
      const ny = dx / tam;
      const hw = Math.max(0.9, f.largura * Math.sin(Math.PI * Math.pow(t, 0.65)) ** 0.9);
      for (let s = -hw; s <= hw + 1e-9; s += 0.35) {
        const x = Math.round(cx + nx * s);
        const y = Math.round(cy + ny * s); // y = altura acima da base
        if (x < 0 || x >= largura || y < 0 || y >= altura) continue;
        const k = (altura - 1 - y) * largura + x;
        folha[k] = id;
        posT[k] = t;
        posS[k] = s;
        meiaL[k] = hw;
      }
    }
  });

  const pix = new Uint8Array(n);
  for (let k = 0; k < n; k++) {
    if (folha[k] < 0) continue;
    const x = k % largura;
    const y = Math.floor(k / largura);
    const t = posT[k];
    const dEscura = meiaL[k] - ladoEscuro * posS[k]; // 0 no fio da borda escura
    const dClara = meiaL[k] + ladoEscuro * posS[k];  // 0 na borda do lado claro

    // O corpo: verde na base, oliva no meio, ocre perto da ponta (com a divisa meio irregular).
    const tt = t + (ruidoDoPixel(x, y, 1) - 0.5) * 0.08;
    let cor = tt < 0.55 ? COR.VERDE_ALGA : tt < 0.76 ? COR.ALGA_MEIO : COR.ALGA_PONTA;

    if (t < 0.15 && Math.abs(posS[k]) < meiaL[k] * 0.55) cor = COR.ALGA_BRILHO; // núcleo da base
    else if (t > 0.3 && t < 0.88 && dClara < 1.6 && ruidoDoPixel(x, y, 2) < 0.16) cor = COR.ALGA_BRILHO; // brilho (discreto)
    if (dEscura < 0.7 || t > 0.985) cor = COR.ALGA_BORDA; // fio escuro (1 pixel) e a pontinha
    pix[k] = cor;
  }
  return { largura, altura, pix };
}

// A alga maior e a menor são da MESMA planta, mas a menor é uma variação própria (e não só a
// maior espelhada): é um pouco mais baixa e as folhas saem em outra ordem.
//   maior (60 px): a folha alta em S fica à esquerda, e a maior das outras se curva para dentro
//                  à direita; folhas curtas na frente.
//   menor (48 px): a folha alta fica à direita e é mais reta; a segunda, à esquerda, abre bem para
//                  o lado e volta; mais uma folha média à direita; uma curta na frente.
const FOLHAS_ROSETA = [
  { pontos: [[-0.05, 0], [-0.70, 0.22], [-0.05, 0.55], [-0.50, 1.0]], largura: 4 },     // a alta, em S
  { pontos: [[0.08, 0], [0.18, 0.18], [0.80, 0.28], [0.58, 0.62]], largura: 3.6 },      // a da direita
  { pontos: [[0.0, 0], [-0.16, 0.14], [0.18, 0.26], [0.08, 0.42]], largura: 3 },        // a do meio
  { pontos: [[-0.04, 0], [-0.40, 0.08], [-0.44, 0.18], [-0.28, 0.27]], largura: 2.4 },  // curta, esquerda
  { pontos: [[0.04, 0], [0.34, 0.08], [0.46, 0.15], [0.38, 0.28]], largura: 2.4 },      // curta, direita
];
const FOLHAS_ROSETA_MENOR = [
  { pontos: [[0.05, 0], [0.55, 0.25], [0.0, 0.55], [0.38, 1.0]], largura: 3.8 },        // a alta, à direita
  { pontos: [[-0.08, 0], [-0.85, 0.15], [-0.75, 0.40], [-0.30, 0.66]], largura: 3.4 },  // à esquerda, abre e volta
  { pontos: [[0.06, 0], [0.70, 0.12], [0.88, 0.32], [0.70, 0.50]], largura: 3 },        // média, à direita
  { pontos: [[0.0, 0], [0.10, 0.12], [-0.15, 0.22], [-0.05, 0.34]], largura: 2.8 },     // curta, na frente
];

export const MODELOS_GRANDES = {
  grande1: algaRoseta(60, 34, FOLHAS_ROSETA),
  grande2: algaRoseta(48, 30, FOLHAS_ROSETA_MENOR),
};

// corTalo / corFolha: índices da paleta para as letras 'c' e 'e' (o fundo usa tons mais apagados).
export function montarModelo(linhas, corTalo = 12, corFolha = 14) {
  const largura = linhas[0].length;
  if (linhas.some((l) => l.length !== largura)) throw new Error('planta: linhas de tamanhos diferentes');
  const pix = new Uint8Array(largura * linhas.length);
  linhas.forEach((linha, y) => {
    for (let x = 0; x < largura; x++) {
      pix[y * largura + x] = linha[x] === '.' ? 0 : linha[x] === 'c' ? corTalo : corFolha;
    }
  });
  return { largura, altura: linhas.length, pix };
}

export const MODELOS_PEQUENOS = Object.fromEntries(
  Object.entries(MODELOS_TEXTO).map(([nome, linhas]) => [nome, montarModelo(linhas, 12, 14)]),
);
export const MODELOS = { ...MODELOS_PEQUENOS, ...MODELOS_GRANDES };
const NOMES_PEQUENOS = Object.keys(MODELOS_PEQUENOS);
const NOMES_GRANDES = Object.keys(MODELOS_GRANDES);

// --- Balanço da água --------------------------------------------------------------------------

// Quantos pixels a linha da planta se desloca para o lado agora. A base não se mexe e o alto
// balança mais; a onda sobe pela planta (as linhas de cima ficam um pouco "atrasadas") e a fase
// muda com a posição no mundo, então plantas vizinhas não balançam juntas como soldadinhos.
// acima = quantos pixels a linha está acima da base · x = onde a planta está · t = tempo em segundos.
export function balancoDaLinha(modelo, acima, x, t) {
  return balanco(MODELOS[modelo].altura, acima, x, t);
}

// O mesmo balanço, para quem só conhece a altura da planta (as plantas do fundo usam).
export function balanco(altura, acima, x, t) {
  const amplitude = Math.max(1, altura * 0.035);          // 1 px nas pequenas, ~2 px nas gigantes
  const velocidade = 1.5 - altura * 0.006;                // as grandes balançam mais devagar
  const alcance = Math.pow(acima / (altura - 1), 1.5);     // 0 na base, 1 na ponta
  return Math.round(amplitude * alcance * Math.sin(t * velocidade + x * 0.03 + acima * 0.06)) || 0; // || 0 troca -0 por 0
}

// --- Onde ficam -------------------------------------------------------------------------------

const QUANTAS = 18;            // até quantas plantas pequenas tentamos colocar
const TENTATIVAS = 200;
const FOLGA_ENTRE_PLANTAS = 1; // pixels livres entre uma planta e a outra
const FOLGA_DAS_BOLHAS = 6;    // pixels livres em volta de cada ponto de bolhas
const DISTANCIA_ENTRE_GIGANTES = 100; // as duas algas gigantes ficam longe uma da outra
const LARGURA_DO_TALO = 16;   // das algas gigantes só a base reserva espaço: as folhas se abrem no alto

// Quantos pixels de largura a planta ocupa na areia (para não sobrepor as outras).
export function larguraOcupada(modelo) {
  return modelo in MODELOS_GRANDES ? Math.min(MODELOS[modelo].largura, LARGURA_DO_TALO) : MODELOS[modelo].largura;
}

// Onde ficam as plantas: [{ modelo, x, tom }], x = centro da planta no mundo; tom (0 a 2) é a
// variação de verde das pequenas (as gigantes não têm).
// A mesma semente dá sempre as mesmas plantas. O pé não fica sobre rocha, e elas não nascem nas bolhas.
// Primeiro entram as duas algas gigantes; depois os modelos pequenos, em rodízio.
export function gerarPlantas(mapa, semente = SEMENTE_CENARIO + 1) {
  const rng = criarRng(semente);
  const plantas = [];

  const colunaLivre = (col) => col >= 0 && col < COLUNAS && mapa[(LINHA_AREIA - 1) * COLUNAS + col] === ID.agua;
  const pegada = (p) => {
    const largura = larguraOcupada(p.modelo);
    const esq = p.x - Math.floor(largura / 2);
    return [esq, esq + largura - 1];
  };

  // Tenta sortear um lugar para o modelo; devolve true se colocou.
  function colocar(nome, aceita = () => true) {
    const largura = larguraOcupada(nome);
    for (let i = 0; i < TENTATIVAS; i++) {
      const x = rng.inteiro(Math.ceil(largura / 2), MUNDO_LARGURA - Math.ceil(largura / 2));
      const planta = { modelo: nome, x };
      const [esq, dir] = pegada(planta);
      // O pé da planta (a coluna do meio) precisa estar em areia livre; as pontas podem encostar
      // numa rocha, como num aquário de verdade.
      let serve = colunaLivre(Math.floor(x / TILE));
      serve = serve && EMISSORES_X.every((e) => dir < e - FOLGA_DAS_BOLHAS || esq > e + FOLGA_DAS_BOLHAS);
      serve = serve && plantas.every((p) => {
        const [pEsq, pDir] = pegada(p);
        return dir + FOLGA_ENTRE_PLANTAS < pEsq || esq - FOLGA_ENTRE_PLANTAS > pDir;
      });
      if (serve && aceita(planta)) {
        // As pequenas revezam as variações de verde (sem sorteio: as posições não mudam).
        if (!(nome in MODELOS_GRANDES)) planta.tom = plantas.length % VARIANTES.length;
        plantas.push(planta);
        return true;
      }
    }
    return false;
  }

  for (const nome of NOMES_GRANDES) {
    colocar(nome, (nova) => plantas.every((p) => !NOMES_GRANDES.includes(p.modelo)
      || Math.abs(p.x - nova.x) >= DISTANCIA_ENTRE_GIGANTES));
  }

  let vez = rng.inteiro(0, NOMES_PEQUENOS.length - 1); // rodízio: todos os modelos aparecem
  for (let n = 0; n < QUANTAS; n++) {
    colocar(NOMES_PEQUENOS[vez % NOMES_PEQUENOS.length]); // se não couber, passa para o próximo modelo
    vez++;
  }
  // Garante que todos os modelos apareçam: quem não coube na sua vez tenta de novo, agora que se
  // sabe o que sobrou de espaço.
  for (const nome of NOMES_PEQUENOS) {
    if (!plantas.some((p) => p.modelo === nome)) colocar(nome);
  }
  return plantas;
}

// --- Desenho ----------------------------------------------------------------------------------

// Desenha as plantas que aparecem na janela. A última linha de cada planta fica sobre a primeira
// linha da areia, para ela parecer plantada. tempo (s) anima o balanço; sem ele, planta parada.
export function desenharPlantas(quadro, plantas, camera, tempo = 0) {
  const cx = Math.round(camera.x);
  const cy = Math.round(camera.y);
  for (const p of plantas) {
    const { largura, altura, pix } = MODELOS[p.modelo];
    const troca = p.tom === undefined ? null : VARIANTES[p.tom];
    const x0 = p.x - Math.floor(largura / 2) - cx;
    const y0 = AREIA_Y - altura + 1 - cy;
    for (let y = 0; y < altura; y++) {
      const ty = y0 + y;
      if (ty < 0 || ty >= ALTURA) continue;
      const desvio = balancoDaLinha(p.modelo, altura - 1 - y, p.x, tempo);
      for (let x = 0; x < largura; x++) {
        const tx = x0 + x + desvio;
        const molde = pix[y * largura + x];
        const cor = troca ? troca[molde] ?? molde : molde;
        if (cor !== 0 && tx >= 0 && tx < LARGURA) quadro[ty * LARGURA + tx] = cor;
      }
    }
  }
}


