import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SPRITES, desenharSprite } from '../src/render/sprites.js';
import { criarQuadro, LARGURA, ALTURA } from '../src/render/tela.js';
import { TAMANHO_POR_FASE, FASES, QUADROS_DE_NADO } from '../src/core/fish.js';

test('o tamanho de cada sprite é o mesmo que o jogo espera para a fase', () => {
  for (const fase of FASES) {
    const s = SPRITES.beta[fase];
    assert.equal(s.largura, TAMANHO_POR_FASE[fase].largura, `${fase}: largura`);
    assert.equal(s.altura, TAMANHO_POR_FASE[fase].altura, `${fase}: altura`);
  }
});

test('cada sprite tem 4 quadros, com os pixels certos e cores de 0 a 15', () => {
  for (const fase of FASES) {
    const s = SPRITES.beta[fase];
    assert.equal(s.quadros.length, QUADROS_DE_NADO);
    for (const q of s.quadros) {
      assert.equal(q.length, s.largura * s.altura);
      for (const cor of q) assert.ok(Number.isInteger(cor) && cor >= 0 && cor <= 15);
    }
  }
});

test('a animação tem quadros diferentes entre si (a cauda se mexe)', () => {
  for (const fase of ['filhote', 'jovem', 'adulto']) {
    const q = SPRITES.beta[fase].quadros.map((x) => x.join(','));
    assert.notEqual(q[0], q[1], `${fase}: 0 igual a 1`);
    assert.notEqual(q[0], q[3], `${fase}: 0 igual a 3`);
    assert.notEqual(q[1], q[3], `${fase}: 1 igual a 3`);
  }
});

test('a cabeça (corpo, olho) é igual em todos os quadros; só a cauda muda', () => {
  for (const fase of ['filhote', 'jovem', 'adulto']) {
    const s = SPRITES.beta[fase];
    const colunaCorpo = Math.ceil(s.largura / 2) + 1; // da metade para a direita é só corpo
    for (let q = 1; q < s.quadros.length; q++) {
      for (let y = 0; y < s.altura; y++) {
        for (let x = colunaCorpo; x < s.largura; x++) {
          assert.equal(s.quadros[q][y * s.largura + x], s.quadros[0][y * s.largura + x],
            `${fase}: quadro ${q} mudou o corpo em (${x},${y})`);
        }
      }
    }
  }
});

test('tem olho (branco e pupila) e corpo roxo', () => {
  for (const fase of ['filhote', 'jovem', 'adulto']) {
    const q = SPRITES.beta[fase].quadros[0];
    assert.ok(q.includes(12), `${fase}: sem olho branco`);
    assert.ok(q.includes(13), `${fase}: sem pupila`);
    assert.ok(q.includes(14), `${fase}: sem corpo roxo`);
  }
});

// Sprite pequeno só para testar o desenho (3×2): um lado vermelho(1), outro azul(2), um furo.
const MINI = { largura: 3, altura: 2, quadros: [Uint8Array.from([1, 0, 2, 1, 1, 2])] };

test('desenharSprite põe os pixels no lugar e pula a cor 0 (transparente)', () => {
  const q = criarQuadro();
  q.fill(9);
  desenharSprite(q, MINI, 0, 10, 20);
  assert.equal(q[20 * LARGURA + 10], 1);
  assert.equal(q[20 * LARGURA + 11], 9, 'o transparente não pode apagar o fundo');
  assert.equal(q[20 * LARGURA + 12], 2);
  assert.equal(q[21 * LARGURA + 10], 1);
});

test('desenharSprite espelhado inverte esquerda e direita', () => {
  const q = criarQuadro();
  q.fill(9);
  desenharSprite(q, MINI, 0, 10, 20, true);
  assert.equal(q[20 * LARGURA + 10], 2);
  assert.equal(q[20 * LARGURA + 11], 9);
  assert.equal(q[20 * LARGURA + 12], 1);
});

test('desenharSprite corta o que sai da tela, sem dar a volta no outro lado', () => {
  const q = criarQuadro();
  q.fill(9);
  desenharSprite(q, MINI, 0, -2, 0);            // só a 3ª coluna aparece, em x = 0
  assert.equal(q[0], 2);
  assert.equal(q[LARGURA - 1], 9, 'não pode aparecer no lado direito');

  desenharSprite(q, MINI, 0, LARGURA - 1, 50);   // só a 1ª coluna aparece, em x = 119
  assert.equal(q[50 * LARGURA + LARGURA - 1], 1);
  assert.equal(q[51 * LARGURA + 0], 9, 'não pode aparecer na linha de baixo, à esquerda');

  desenharSprite(q, MINI, 0, 5, -1);             // só a 2ª linha aparece, em y = 0
  assert.equal(q[0 * LARGURA + 5], 1);
  desenharSprite(q, MINI, 0, 5, ALTURA - 1);     // só a 1ª linha aparece, em y = 119
  assert.equal(q[(ALTURA - 1) * LARGURA + 5], 1);
});

test('desenharSprite totalmente fora da tela não faz nada nem dá erro', () => {
  const q = criarQuadro();
  q.fill(9);
  desenharSprite(q, MINI, 0, 500, 500);
  desenharSprite(q, MINI, 0, -500, -500);
  assert.ok(q.every((c) => c === 9));
});
