import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SPRITES, SPRITES_DOENTES, SPRITES_MORTOS, spriteDoPeixe, desenharSprite } from '../src/render/sprites.js';
import { criarQuadro, LARGURA } from '../src/render/tela.js';
import { atualizarPeixe, criarPeixe, atualizarPeixeMorto, FATOR_VELOCIDADE_DOENTE, limitesDoPeixe, quadroDeNado } from '../src/core/fish.js';
import { criarRng } from '../src/core/rng.js';

const FASES = ['filhote', 'jovem', 'adulto', 'idoso'];

test('doente: mesmo formato, cores pálidas, olho preservado, em todas as fases', () => {
  for (const fase of FASES) {
    const normal = SPRITES.beta[fase];
    const doente = SPRITES_DOENTES.beta[fase];
    assert.equal(doente.largura, normal.largura);
    assert.equal(doente.altura, normal.altura);
    normal.quadros.forEach((q, i) => {
      const qd = doente.quadros[i];
      assert.notDeepEqual(Array.from(qd), Array.from(q), `${fase}: as cores deveriam mudar`);
      q.forEach((cor, p) => assert.equal(qd[p] === 0, cor === 0, `${fase}: o formato não pode mudar`));
      assert.ok(!qd.includes(14) && !qd.includes(10) && !qd.includes(11), `${fase}: sobrou cor viva`);
      assert.ok(qd.includes(13), `${fase}: pupila`);
    });
  }
});

test('o idoso doente é diferente do idoso saudável', () => {
  assert.notDeepEqual(
    Array.from(SPRITES_DOENTES.beta.idoso.quadros[0]),
    Array.from(SPRITES.beta.idoso.quadros[0]),
  );
});

test('morto: cores apagadas (como o idoso) e o formato é o mesmo', () => {
  for (const fase of FASES) {
    const morto = SPRITES_MORTOS.beta[fase];
    assert.equal(morto.largura, SPRITES.beta[fase].largura);
    assert.ok(!morto.quadros[0].includes(14) && !morto.quadros[0].includes(10));
  }
});

test('spriteDoPeixe escolhe pelo estado, e só o morto vai de cabeça para baixo', () => {
  const p = criarPeixe({ fase: 'adulto' });
  assert.deepEqual(spriteDoPeixe(p), { sprite: SPRITES.beta.adulto, inverter: false });
  p.estado = 'doente';
  assert.deepEqual(spriteDoPeixe(p), { sprite: SPRITES_DOENTES.beta.adulto, inverter: false });
  p.estado = 'morto';
  assert.deepEqual(spriteDoPeixe(p), { sprite: SPRITES_MORTOS.beta.adulto, inverter: true });
});

test('desenharSprite com inverter vira o desenho de cabeça para baixo', () => {
  const sprite = { largura: 2, altura: 3, quadros: [Uint8Array.from([1, 2, 3, 4, 5, 6])] };
  const normal = criarQuadro();
  const virado = criarQuadro();
  desenharSprite(normal, sprite, 0, 10, 10);
  desenharSprite(virado, sprite, 0, 10, 10, false, true);
  const ler = (q) => [0, 1, 2].map((y) => [q[(10 + y) * LARGURA + 10], q[(10 + y) * LARGURA + 11]]);
  assert.deepEqual(ler(normal), [[1, 2], [3, 4], [5, 6]]);
  assert.deepEqual(ler(virado), [[5, 6], [3, 4], [1, 2]]);
});

test('espelhar e inverter juntos giram o desenho 180 graus', () => {
  const sprite = { largura: 2, altura: 2, quadros: [Uint8Array.from([1, 2, 3, 4])] };
  const q = criarQuadro();
  desenharSprite(q, sprite, 0, 0, 0, true, true);
  assert.deepEqual([q[0], q[1], q[LARGURA], q[LARGURA + 1]], [4, 3, 2, 1]);
});

// --- Movimento do peixe doente e do morto ------------------------------------------------------

function distanciaNadada(estado, segundos) {
  const peixe = criarPeixe({ fase: 'adulto', x: 100, y: 100 });
  peixe.estado = estado;
  peixe.movimento = 'nadando';
  peixe.destino = { x: 300, y: 100 }; // longe, para não chegar durante o teste
  const rng = criarRng(1);
  for (let i = 0; i < segundos * 20; i++) atualizarPeixe(peixe, 0.05, rng);
  return peixe.x - 100;
}

test('peixe doente nada na metade da velocidade', () => {
  const normal = distanciaNadada('saudavel', 4);
  const doente = distanciaNadada('doente', 4);
  assert.ok(normal > 0);
  assert.ok(Math.abs(doente - normal * FATOR_VELOCIDADE_DOENTE) < 0.01, `normal ${normal}, doente ${doente}`);
  assert.equal(FATOR_VELOCIDADE_DOENTE, 0.5);
});

test('peixe doente bate a cauda mais devagar (animação na metade do ritmo)', () => {
  const sadio = criarPeixe({ fase: 'adulto', x: 100, y: 100 });
  const doente = criarPeixe({ fase: 'adulto', x: 100, y: 100 });
  doente.estado = 'doente';
  const rng = criarRng(1);
  for (let i = 0; i < 40; i++) { atualizarPeixe(sadio, 0.05, rng); atualizarPeixe(doente, 0.05, rng); }
  assert.ok(Math.abs(doente.tempoAnimacao - sadio.tempoAnimacao / 2) < 1e-9);
  assert.ok(quadroDeNado(doente) >= 0 && quadroDeNado(doente) < 4);
});

test('peixe morto sobe a 8 px/s até o limite de cima', () => {
  const peixe = criarPeixe({ fase: 'adulto', x: 100, y: 100 });
  atualizarPeixeMorto(peixe, 1);
  assert.equal(peixe.y, 92);
  for (let i = 0; i < 100; i++) atualizarPeixeMorto(peixe, 1);
  assert.equal(peixe.y, limitesDoPeixe('adulto').minY);
});
