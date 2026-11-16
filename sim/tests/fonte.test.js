import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  GLIFOS, decompor, caracteresSemGlifo, larguraDoTexto, desenharTexto, quebrarTexto,
  AVANCO, LARGURA_LETRA, ALTURA_LETRA,
} from '../src/render/fonte.js';
import { criarQuadro, LARGURA, ALTURA } from '../src/render/tela.js';

const COR = 7;

// Lê os pixels ligados de uma região do quadro como linhas de texto ('X' e '.').
function ler(quadro, x, y, largura, altura) {
  const linhas = [];
  for (let ly = y; ly < y + altura; ly++) {
    let s = '';
    for (let lx = x; lx < x + largura; lx++) s += quadro[ly * LARGURA + lx] === COR ? 'X' : '.';
    linhas.push(s);
  }
  return linhas;
}

test('todas as letras têm 5 linhas de 3 colunas, só com X e ponto', () => {
  for (const [letra, linhas] of Object.entries(GLIFOS)) {
    assert.equal(linhas.length, ALTURA_LETRA, `letra ${letra}`);
    for (const linha of linhas) assert.match(linha, /^[X.]{3}$/, `letra ${letra}: "${linha}"`);
  }
});

test('a fonte tem A a Z, 0 a 9 e a pontuação usada nos textos', () => {
  const esperadas = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,:!?-+/%\'()>';
  assert.deepEqual(caracteresSemGlifo(esperadas), []);
});

test('nenhuma letra é igual a outra (todas são distinguíveis)', () => {
  const vistas = new Map();
  for (const [letra, linhas] of Object.entries(GLIFOS)) {
    const chave = linhas.join('/');
    assert.ok(!vistas.has(chave), `"${letra}" é igual a "${vistas.get(chave)}"`);
    vistas.set(chave, letra);
  }
});

test('decompor separa o acento da letra e põe em maiúsculas', () => {
  assert.deepEqual(decompor('ão').map((l) => l.letra), ['A', 'O']);
  assert.equal(decompor('ão')[0].marca, '̃');
  assert.equal(decompor('ç')[0].marca, '̧');
  assert.equal(decompor('é')[0].marca, '́');
  assert.equal(decompor('É')[0].marca, '́');
  assert.equal(decompor('a')[0].marca, null);
});

test('caracteresSemGlifo avisa o que a fonte não sabe desenhar', () => {
  assert.deepEqual(caracteresSemGlifo('Olá, aquário!'), []);
  assert.deepEqual(caracteresSemGlifo('Oi ☺'), ['☺']);
});

test('desenhar "A" põe os pixels certos, na cor pedida, sem sujar em volta', () => {
  const q = criarQuadro();
  desenharTexto(q, 'A', 10, 10, COR);
  assert.deepEqual(ler(q, 10, 10, 3, 5), ['.X.', 'X.X', 'XXX', 'X.X', 'X.X']);
  assert.deepEqual(ler(q, 9, 9, 5, 1), ['.....']); // nada em volta
  assert.deepEqual(ler(q, 9, 15, 5, 1), ['.....']);
});

test('letras seguintes ficam 4 pixels à direita (3 da letra + 1 de espaço)', () => {
  const q = criarQuadro();
  desenharTexto(q, 'II', 10, 10, COR);
  assert.deepEqual(ler(q, 10, 10, 3, 1), ['XXX']);
  assert.deepEqual(ler(q, 10 + AVANCO, 10, 3, 1), ['XXX']);
  assert.deepEqual(ler(q, 13, 10, 1, 1), ['.']); // o espaço entre elas
});

test('acentos: agudo, circunflexo, til e grave ficam uma linha acima da letra', () => {
  const casos = [['Á', '..X'], ['Â', '.X.'], ['Ã', 'X.X'], ['À', 'X..']];
  for (const [texto, acento] of casos) {
    const q = criarQuadro();
    desenharTexto(q, texto, 10, 10, COR);
    assert.deepEqual(ler(q, 10, 9, 3, 1), [acento], texto);
    assert.deepEqual(ler(q, 10, 10, 3, 5), GLIFOS.A.map((l) => l), texto); // a letra continua igual
  }
});

test('cedilha: um pixel embaixo, no meio da letra', () => {
  const q = criarQuadro();
  desenharTexto(q, 'ç', 10, 10, COR);
  assert.deepEqual(ler(q, 10, 15, 3, 1), ['.X.']);
  assert.deepEqual(ler(q, 10, 10, 3, 5), GLIFOS.C);
});

test('minúsculas saem como maiúsculas', () => {
  const a = criarQuadro();
  const b = criarQuadro();
  desenharTexto(a, 'peixe', 5, 5, COR);
  desenharTexto(b, 'PEIXE', 5, 5, COR);
  assert.deepEqual(a, b);
});

test('letra desconhecida vira "?"', () => {
  const a = criarQuadro();
  const b = criarQuadro();
  desenharTexto(a, '☺', 5, 5, COR);
  desenharTexto(b, '?', 5, 5, COR);
  assert.deepEqual(a, b);
});

test('escala 2: cada pixel vira um bloco de 2×2', () => {
  const q = criarQuadro();
  desenharTexto(q, 'I', 10, 10, COR, 2);
  assert.deepEqual(ler(q, 10, 10, 6, 2), ['XXXXXX', 'XXXXXX']); // linha de cima do I (XXX)
  assert.deepEqual(ler(q, 10, 12, 6, 2), ['..XX..', '..XX..']); // haste (.X.)
  assert.equal(larguraDoTexto('II', 2), (2 * AVANCO - 1) * 2);
});

test('o que sai da tela é cortado, sem dar a volta nem dar erro', () => {
  const q = criarQuadro();
  desenharTexto(q, 'TESTE', LARGURA - 5, ALTURA - 2, COR);
  desenharTexto(q, 'TESTE', -6, -3, COR);
  desenharTexto(q, 'X', 500, 500, COR);
  assert.equal(q.length, LARGURA * ALTURA);
  assert.equal(q[0 * LARGURA + (LARGURA - 1)], 0); // nada apareceu do outro lado
});

test('larguraDoTexto: 4 pixels por letra, menos o espaço final', () => {
  assert.equal(larguraDoTexto(''), 0);
  assert.equal(larguraDoTexto('A'), LARGURA_LETRA);
  assert.equal(larguraDoTexto('ABC'), 3 * AVANCO - 1);
  assert.equal(larguraDoTexto('ÃO'), larguraDoTexto('AO')); // acento não conta como letra
});

test('quebrarTexto: não corta palavras e respeita o limite', () => {
  const linhas = quebrarTexto('Seu peixe viveu uma vida longa. Obrigado por cuidar dele.', 20);
  assert.deepEqual(linhas, ['Seu peixe viveu uma', 'vida longa. Obrigado', 'por cuidar dele.']);
  for (const l of linhas) assert.ok(decompor(l).length <= 20);
});

test('quebrarTexto: palavra maior que a linha é cortada à força; acento conta como 1 letra', () => {
  assert.deepEqual(quebrarTexto('ABCDEFGHIJ', 4), ['ABCD', 'EFGH', 'IJ']);
  assert.deepEqual(quebrarTexto('ação ação', 4), ['ação', 'ação']);
  assert.deepEqual(quebrarTexto('', 10), []);
  assert.deepEqual(quebrarTexto('   a   b  ', 10), ['a b']);
});
