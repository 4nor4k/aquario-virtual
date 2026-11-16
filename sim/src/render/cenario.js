// O cenário: blocos (tiles) de 8×8 pixels e o mapa que diz qual bloco vai em cada lugar.
//
// Cada pixel de um bloco é um índice da paleta (0 a 15). A paleta está em palette.js:
//   1 a 4 = água (1 = funda, 4 = clara) · 6 e 7 = areia · 8 e 9 = rocha
//
// Cores provisórias: refinamos olhando na tela.
import { TILE, COLUNAS, LINHAS, LINHA_AREIA } from '../core/mundo.js';
import { criarRng } from '../core/rng.js';

export const SEMENTE_CENARIO = 2024; // mesma semente = mesmo cenário sempre

const TILES = [];     // pixels de cada bloco (Uint8Array de 64)
export const ID = {}; // nome do bloco -> número

// Registra um bloco a partir de 8 linhas de 8 letras; cada letra é uma cor da paleta em hexadecimal.
function registrar(nome, linhas) {
  if (linhas.length !== TILE || linhas.some((l) => l.length !== TILE)) {
    throw new Error(`bloco ${nome}: precisa ter ${TILE} linhas de ${TILE} letras`);
  }
  const pix = new Uint8Array(TILE * TILE);
  linhas.forEach((linha, y) => {
    for (let x = 0; x < TILE; x++) pix[y * TILE + x] = parseInt(linha[x], 16);
  });
  ID[nome] = TILES.length;
  TILES.push(pix);
}

// Troca alguns pixels de um bloco liso por outra cor (brilhos na água, grãos na areia).
function comPontos(base, ponto, posicoes) {
  const linhas = Array.from({ length: TILE }, () => base.repeat(TILE).split(''));
  for (const [x, y] of posicoes) linhas[y][x] = ponto;
  return linhas.map((l) => l.join(''));
}

// Duas cores alternadas em xadrez: faz a passagem suave entre dois tons de água.
function xadrez(a, b) {
  return Array.from({ length: TILE }, (_, y) =>
    Array.from({ length: TILE }, (_, x) => ((x + y) % 2 === 0 ? a : b)).join(''));
}

const PONTOS_A = [[2, 1], [6, 5]];
const PONTOS_B = [[5, 2], [1, 6]];

// Água: 4 tons (1 = funda ... 4 = clara), cada um liso e com 2 jeitos de brilho.
for (let tom = 1; tom <= 4; tom++) {
  const t = tom.toString(16);
  const claro = (tom + 1).toString(16);
  registrar(`agua${tom}`, comPontos(t, t, []));
  registrar(`agua${tom}a`, comPontos(t, claro, PONTOS_A));
  registrar(`agua${tom}b`, comPontos(t, claro, PONTOS_B));
}
// Passagens entre tons
registrar('passa43', xadrez('4', '3'));
registrar('passa32', xadrez('3', '2'));
registrar('passa21', xadrez('2', '1'));

// Areia
registrar('areiaTopo', [
  '66166616',
  '66666666',
  '66766666',
  '66666667',
  '67666666',
  '66666676',
  '76666666',
  '66666666',
]);
registrar('areia', comPontos('6', '7', [[1, 1], [5, 3], [3, 6], [7, 7], [6, 0]]));
registrar('areiaFundo', comPontos('7', '6', [[2, 2], [6, 4], [4, 7]]));

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

// Qual bloco de água vai em cada linha do mundo (de cima para baixo).
// Nas linhas "passa" usa o xadrez entre dois tons.
function blocoDeAgua(linha, rng) {
  let nome;
  if (linha <= 4) nome = 'agua4';
  else if (linha === 5) return ID.passa43;
  else if (linha <= 11) nome = 'agua3';
  else if (linha === 12) return ID.passa32;
  else if (linha <= 19) nome = 'agua2';
  else if (linha === 20) return ID.passa21;
  else nome = 'agua1';

  // 1 em cada 4 blocos leva brilho, para o movimento da câmera ficar visível.
  const sorteio = rng.inteiro(0, 7);
  if (sorteio === 0) return ID[nome + 'a'];
  if (sorteio === 1) return ID[nome + 'b'];
  return ID[nome];
}

// Monta o mapa do mundo: COLUNAS × LINHAS números, cada um é o id de um bloco.
export function gerarMapa(semente = SEMENTE_CENARIO) {
  const rng = criarRng(semente);
  const mapa = new Uint8Array(COLUNAS * LINHAS);

  for (let linha = 0; linha < LINHAS; linha++) {
    for (let col = 0; col < COLUNAS; col++) {
      let id;
      if (linha < LINHA_AREIA) id = blocoDeAgua(linha, rng);
      else if (linha === LINHA_AREIA) id = ID.areiaTopo;
      else if (linha === LINHA_AREIA + 1) id = ID.areia;
      else id = ID.areiaFundo;
      mapa[linha * COLUNAS + col] = id;
    }
  }

  // Quatro montinhos de rocha sobre a areia, de 1 a 3 blocos de altura.
  for (let i = 0; i < 4; i++) {
    // Centros entre as colunas 6-8, 16-18, 26-28 e 36-38: com meia largura de até 3,
    // as rochas ficam nas colunas 3 a 41 (nunca encostam nas bordas nem se sobrepõem).
    const centro = 6 + i * 10 + rng.inteiro(0, 2);
    const meiaLargura = rng.inteiro(1, 3);
    for (let dx = -meiaLargura; dx <= meiaLargura; dx++) {
      const altura = Math.max(1, 3 - Math.abs(dx));
      for (let h = 1; h <= altura; h++) {
        const linha = LINHA_AREIA - h;
        mapa[linha * COLUNAS + centro + dx] = h === altura ? ID.rochaTopo : ID.rocha;
      }
    }
  }
  return mapa;
}
