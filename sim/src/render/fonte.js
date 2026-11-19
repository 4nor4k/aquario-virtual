// Fonte de pixels própria: letras de 3×5 pixels, com acentos do português.
// Escreve sempre em MAIÚSCULAS (letras pequenas ficam mais legíveis assim) e cabe cerca de
// 30 letras em uma linha de 120 pixels.
//
// Cada letra é desenhada com texto: X = pixel ligado, . = desligado, e a barra "/" separa as
// 5 linhas. Edite à vontade!
//
// Acentos: o jogo separa "Ã" em "A" + til (normalize NFD). O acento vai 1 linha ACIMA da letra
// (agudo, grave, circunflexo, til) e a cedilha 1 linha ABAIXO. Por isso o texto precisa de 1 linha
// livre acima e 1 abaixo (altura de linha 8).
import { LARGURA, ALTURA } from './tela.js';

export const LARGURA_LETRA = 3;
export const ALTURA_LETRA = 5;
export const AVANCO = 4;        // de uma letra para a próxima (3 de letra + 1 de espaço)
export const ALTURA_LINHA = 8;  // de uma linha para a próxima (acento + letra + cedilha + folga)

const DEFINICAO = {
  A: '.X./X.X/XXX/X.X/X.X',
  B: 'XX./X.X/XX./X.X/XX.',
  C: '.XX/X../X../X../.XX',
  D: 'XX./X.X/X.X/X.X/XX.',
  E: 'XXX/X../XX./X../XXX',
  F: 'XXX/X../XX./X../X..',
  G: '.XX/X../X.X/X.X/.XX',
  H: 'X.X/X.X/XXX/X.X/X.X',
  I: 'XXX/.X./.X./.X./XXX',
  J: '..X/..X/..X/X.X/.X.',
  K: 'X.X/X.X/XX./X.X/X.X',
  L: 'X../X../X../X../XXX',
  M: 'X.X/XXX/XXX/X.X/X.X',
  N: 'XX./X.X/X.X/X.X/X.X',
  O: '.X./X.X/X.X/X.X/.X.',
  P: 'XX./X.X/XX./X../X..',
  Q: '.X./X.X/X.X/XX./.XX',
  R: 'XX./X.X/XX./X.X/X.X',
  S: '.XX/X../.X./..X/XX.',
  T: 'XXX/.X./.X./.X./.X.',
  U: 'X.X/X.X/X.X/X.X/XXX',
  V: 'X.X/X.X/X.X/X.X/.X.',
  W: 'X.X/X.X/XXX/XXX/X.X',
  X: 'X.X/X.X/.X./X.X/X.X',
  Y: 'X.X/X.X/.X./.X./.X.',
  Z: 'XXX/..X/.X./X../XXX',
  0: 'XXX/X.X/X.X/X.X/XXX',
  1: '.X./XX./.X./.X./XXX',
  2: 'XX./..X/.X./X../XXX',
  3: 'XX./..X/.X./..X/XX.',
  4: 'X.X/X.X/XXX/..X/..X',
  5: 'XXX/X../XX./..X/XX.',
  6: '.XX/X../XXX/X.X/XXX',
  7: 'XXX/..X/.X./.X./.X.',
  8: 'XXX/X.X/XXX/X.X/XXX',
  9: 'XXX/X.X/XXX/..X/XX.',
  ' ': '.../.../.../.../...',
  '.': '.../.../.../.../.X.',
  ',': '.../.../.../.X./X..',
  ':': '.../.X./.../.X./...',
  '!': '.X./.X./.X./.../.X.',
  '?': 'XX./..X/.X./.../.X.',
  '-': '.../.../XXX/.../...',
  '+': '.../.X./XXX/.X./...',
  '/': '..X/..X/.X./X../X..',
  '%': 'X.X/..X/.X./X../X.X',
  "'": '.X./.X./.../.../...',
  '(': '.X./X../X../X../.X.',
  ')': '.X./..X/..X/..X/.X.',
  '>': 'X../XX./XXX/XX./X..', // seta do menu
  '<': '..X/.XX/XXX/.XX/..X', // seta para a esquerda (tela de adoção)
};

// Texto -> lista de linhas de 3 letras (cada linha é uma string de 'X' e '.').
export const GLIFOS = Object.fromEntries(
  Object.entries(DEFINICAO).map(([letra, def]) => [letra, def.split('/')]),
);

// Acento -> pixels da linha acima da letra (3 colunas).
const ACENTOS = {
  '̀': 'X..', // grave  (à)
  '́': '..X', // agudo  (á)
  '̂': '.X.', // circunflexo (â)
  '̃': 'X.X', // til (ã)
};
const CEDILHA = '̧'; // ç: um pixel abaixo do meio da letra

// Separa o texto em letras, com o acento (se houver) de cada uma.
// Ex.: "Ação" -> [{letra:'A'}, {letra:'C', marca:cedilha}, {letra:'A', marca:til}, {letra:'O'}]
export function decompor(texto) {
  const lista = [];
  for (const ch of String(texto).toUpperCase().normalize('NFD')) {
    if (ch >= '̀' && ch <= 'ͯ') {
      if (lista.length > 0) lista[lista.length - 1].marca = ch;
    } else {
      lista.push({ letra: ch, marca: null });
    }
  }
  return lista;
}

// Letras do texto que a fonte não sabe desenhar (para avisar quando alguém escrever algo fora).
export function caracteresSemGlifo(texto) {
  const faltando = new Set();
  for (const { letra, marca } of decompor(texto)) {
    if (!GLIFOS[letra]) faltando.add(letra);
    if (marca && !ACENTOS[marca] && marca !== CEDILHA) faltando.add(letra + marca);
  }
  return [...faltando];
}

export function larguraDoTexto(texto, escala = 1) {
  const n = decompor(texto).length;
  return n === 0 ? 0 : (n * AVANCO - 1) * escala;
}

// Desenha o texto com o canto de cima à esquerda das LETRAS em (x, y).
// escala 2 = letras duas vezes maiores. Letra desconhecida vira "?".
export function desenharTexto(quadro, texto, x, y, cor, escala = 1) {
  const ponto = (px, py) => {
    for (let dy = 0; dy < escala; dy++) {
      for (let dx = 0; dx < escala; dx++) {
        const tx = px * escala + dx;
        const ty = py * escala + dy;
        if (tx >= 0 && tx < LARGURA && ty >= 0 && ty < ALTURA) quadro[ty * LARGURA + tx] = cor;
      }
    }
  };
  // (px, py) estão em "pixels da fonte"; a conta de x e y é feita antes de multiplicar a escala.
  const bx = x / escala;
  const by = y / escala;

  decompor(texto).forEach(({ letra, marca }, i) => {
    const linhas = GLIFOS[letra] ?? GLIFOS['?'];
    const ox = bx + i * AVANCO;
    for (let ly = 0; ly < ALTURA_LETRA; ly++) {
      for (let lx = 0; lx < LARGURA_LETRA; lx++) {
        if (linhas[ly][lx] === 'X') ponto(ox + lx, by + ly);
      }
    }
    if (marca && ACENTOS[marca]) {
      for (let lx = 0; lx < LARGURA_LETRA; lx++) if (ACENTOS[marca][lx] === 'X') ponto(ox + lx, by - 1);
    }
    if (marca === CEDILHA) ponto(ox + 1, by + ALTURA_LETRA);
  });
}

// Quebra o texto em linhas de no máximo `maxLetras` letras, sem cortar palavras
// (palavra maior que a linha é cortada à força).
export function quebrarTexto(texto, maxLetras) {
  const tamanho = (t) => decompor(t).length;
  const linhas = [];
  let atual = '';
  for (let palavra of String(texto).split(/\s+/).filter(Boolean)) {
    // Palavra maior que uma linha inteira: corta à força, pedaço por pedaço.
    while (tamanho(palavra) > maxLetras) {
      if (atual) { linhas.push(atual); atual = ''; }
      const pedaco = cortar(palavra, maxLetras);
      linhas.push(pedaco);
      palavra = palavra.normalize('NFD').slice(pedaco.normalize('NFD').length).normalize('NFC');
    }
    if (atual === '') {
      atual = palavra;
    } else if (tamanho(`${atual} ${palavra}`) <= maxLetras) {
      atual = `${atual} ${palavra}`;
    } else {
      linhas.push(atual);
      atual = palavra;
    }
  }
  if (atual) linhas.push(atual);
  return linhas;
}

// Primeiras `n` letras de um texto (contando "Ã" como 1, não 2).
function cortar(texto, n) {
  let contadas = 0;
  let saida = '';
  for (const ch of texto.normalize('NFD')) {
    const marca = ch >= '̀' && ch <= 'ͯ';
    if (!marca) {
      if (contadas === n) break;
      contadas++;
    }
    saida += ch;
  }
  return saida.normalize('NFC');
}
