// O cenário: blocos (tiles) de 8×8 pixels e o mapa que diz qual bloco vai em cada lugar.
//
// Cada pixel de um bloco é um índice da paleta (0 a 15). A paleta está em palette.js:
//   1 = água (preto sólido) · 6 e 7 = areia, e as letras g, h e i = grãos de areia em tons
//   diferentes (índices 24, 25 e 26) · 8 e 9 = rocha (cinza)
//
// A superfície, o ar e as bolhas não são blocos: são desenhados à parte (superficie.js, bolhas.js).
import { TILE, COLUNAS, LINHAS, LINHA_AREIA } from '../core/mundo.js';
import { criarRng } from '../core/rng.js';

export const SEMENTE_CENARIO = 2024; // mesma semente = mesmo cenário sempre

const TILES = [];     // pixels de cada bloco (Uint8Array de 64)
export const ID = {}; // nome do bloco -> número

// Além dos dígitos hexadecimais (0 a f), os blocos usam estas letras para os grãos de areia.
const LETRAS_EXTRA = { g: 24, h: 25, i: 26 };

// Registra um bloco a partir de 8 linhas de 8 letras; cada letra é uma cor da paleta em hexadecimal
// (ou uma das LETRAS_EXTRA).
function registrar(nome, linhas) {
  if (linhas.length !== TILE || linhas.some((l) => l.length !== TILE)) {
    throw new Error(`bloco ${nome}: precisa ter ${TILE} linhas de ${TILE} letras`);
  }
  const pix = new Uint8Array(TILE * TILE);
  linhas.forEach((linha, y) => {
    for (let x = 0; x < TILE; x++) pix[y * TILE + x] = LETRAS_EXTRA[linha[x]] ?? parseInt(linha[x], 16);
  });
  ID[nome] = TILES.length;
  TILES.push(pix);
}

// Troca alguns pixels de um bloco liso por outra cor (grãos na areia).
function comPontos(base, ponto, posicoes) {
  const linhas = Array.from({ length: TILE }, () => base.repeat(TILE).split(''));
  for (const [x, y] of posicoes) linhas[y][x] = ponto;
  return linhas.map((l) => l.join(''));
}

// Água: um bloco liso, preto. (Sem degradê: o fundo é sólido.)
registrar('agua', Array(TILE).fill('1'.repeat(TILE)));

// Areia: cor de areia lisa com grãos espalhados em tons diferentes (mais claros, dourados,
// escuros e uma pedrinha acinzentada). Cada camada tem 3 variações, sorteadas bloco a bloco no
// mapa, para o padrão não repetir de 8 em 8 pixels.
//   base: '6' (areia) ou '7' (areia escura, a camada de baixo) · bordaIrregular: o topo tem
//   uns pixels de água (preto), para a superfície da areia não ser uma régua.
function areiaComGraos(base, semente, bordaIrregular) {
  const rng = criarRng(semente);
  const grade = Array.from({ length: TILE }, () => Array(TILE).fill(base));
  const tons = base === '6' ? ['7', 'g', 'h', 'i', '7', 'g'] : ['6', 'g', 'h', 'i', 'h'];
  const quantos = rng.inteiro(9, 12);
  for (let n = 0; n < quantos; n++) {
    grade[rng.inteiro(bordaIrregular ? 1 : 0, TILE - 1)][rng.inteiro(0, TILE - 1)] = tons[rng.inteiro(0, tons.length - 1)];
  }
  if (bordaIrregular) {
    for (let n = 0; n < 2; n++) grade[0][rng.inteiro(0, TILE - 1)] = '1';
  }
  return grade.map((l) => l.join(''));
}

// Ids dos blocos de areia, por camada.
export const VARIANTES_AREIA = { topo: [], meio: [], fundo: [] };
[['topo', '6', true], ['meio', '6', false], ['fundo', '7', false]].forEach(([camada, base, borda], k) => {
  for (let v = 0; v < 3; v++) {
    const nome = `areia_${camada}${v}`;
    registrar(nome, areiaComGraos(base, 500 + k * 10 + v, borda));
    VARIANTES_AREIA[camada].push(ID[nome]);
  }
});

// Rocha
registrar('rochaTopo', [
  '11888811',
  '88888888',
  '88888988',
  '89888888',
  '88888898',
  '88988888',
  '88888888',
  '98888889',
]);
registrar('rocha', [
  '88888888',
  '88988888',
  '88888898',
  '98888888',
  '88888988',
  '88898888',
  '88888888',
  '89888888',
]);

export const NUM_TILES = TILES.length;
export function pixelsDoTile(id) {
  return TILES[id];
}

// Monta o mapa do mundo: COLUNAS × LINHAS números, cada um é o id de um bloco.
export function gerarMapa(semente = SEMENTE_CENARIO) {
  const rng = criarRng(semente);
  const sorteioDaAreia = criarRng(semente + 7); // separado, para não mexer nas rochas
  const variante = (camada) => VARIANTES_AREIA[camada][sorteioDaAreia.inteiro(0, 2)];
  const mapa = new Uint8Array(COLUNAS * LINHAS);

  for (let linha = 0; linha < LINHAS; linha++) {
    for (let col = 0; col < COLUNAS; col++) {
      let id;
      if (linha < LINHA_AREIA) id = ID.agua;
      else if (linha === LINHA_AREIA) id = variante('topo');
      else if (linha === LINHA_AREIA + 1) id = variante('meio');
      else id = variante('fundo');
      mapa[linha * COLUNAS + col] = id;
    }
  }

  // Cinco pedrinhas sobre a areia, de 1 ou 2 blocos de largura e só 1 de altura (8 px): bem menores
  // que os montes de 3 blocos que havia antes (a pedra grande agora é a do fundo, pedra-grande.js).
  // Cada uma sai de uma faixa (centro = base ou base + 1) e ocupa o centro e, às vezes, a coluna
  // seguinte. Ocupam as colunas 2 a 4, 6 a 8, 14 a 16, 19 a 21 e 24 a 26 (nunca encostam nas
  // bordas). Sobram sempre livres as colunas 0 e 1, 9 a 13, 17 e 18, 22 e 23 e 27 a 29: de lá sobem
  // as bolhas (core/bolhas.js) e ali também podem nascer plantas (plantas.js).
  for (const base of [2, 6, 14, 19, 24]) {
    const centro = base + rng.inteiro(0, 1);
    const largura = rng.inteiro(1, 2);
    for (let dx = 0; dx < largura; dx++) mapa[(LINHA_AREIA - 1) * COLUNAS + centro + dx] = ID.rochaTopo;
  }
  return mapa;
}
