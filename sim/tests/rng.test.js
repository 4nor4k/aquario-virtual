import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarRng } from '../src/core/rng.js';

test('mesma semente dá a mesma sequência', () => {
  const a = criarRng(123);
  const b = criarRng(123);
  for (let i = 0; i < 100; i++) assert.equal(a.proximo(), b.proximo());
});

test('sementes diferentes dão sequências diferentes', () => {
  const a = criarRng(1);
  const b = criarRng(2);
  const seqA = Array.from({ length: 10 }, () => a.proximo());
  const seqB = Array.from({ length: 10 }, () => b.proximo());
  assert.notDeepEqual(seqA, seqB);
});

// Valores de referência: o código C++ da Fase B precisa dar exatamente estes números.
// (Conferidos também contra uma segunda implementação, feita com BigInt.)
test('valores de referência para conferir o C++ depois', () => {
  const casos = {
    1: [2693262067, 11749833, 2265367787],
    42: [2581720956, 1925393290, 3661312704],
    12345: [4207900869, 1317490944, 2079646450],
  };
  for (const [semente, esperado] of Object.entries(casos)) {
    const r = criarRng(Number(semente));
    assert.deepEqual([r.proximo(), r.proximo(), r.proximo()], esperado);
  }
});

test('inteiro(min, max) fica dentro do intervalo e alcança as duas pontas', () => {
  const r = criarRng(7);
  const vistos = new Set();
  for (let i = 0; i < 1000; i++) {
    const n = r.inteiro(1, 3);
    assert.ok(n >= 1 && n <= 3, `fora do intervalo: ${n}`);
    vistos.add(n);
  }
  assert.deepEqual([...vistos].sort(), [1, 2, 3]);
});

test('inteiro com min igual a max devolve esse valor', () => {
  const r = criarRng(9);
  assert.equal(r.inteiro(5, 5), 5);
});

test('inteiro aceita números negativos', () => {
  const r = criarRng(3);
  for (let i = 0; i < 200; i++) {
    const n = r.inteiro(-2, 2);
    assert.ok(n >= -2 && n <= 2);
  }
});

test('inteiro recusa intervalo inválido', () => {
  const r = criarRng(1);
  assert.throws(() => r.inteiro(3, 1), RangeError);
  assert.throws(() => r.inteiro(1.5, 3), RangeError);
});

test('decimal fica entre 0 (incluído) e 1 (excluído)', () => {
  const r = criarRng(11);
  for (let i = 0; i < 1000; i++) {
    const d = r.decimal();
    assert.ok(d >= 0 && d < 1, `fora do intervalo: ${d}`);
  }
});

test('semente 0 e semente máxima funcionam', () => {
  for (const semente of [0, 4294967295]) {
    const r = criarRng(semente);
    const n = r.proximo();
    assert.ok(Number.isInteger(n) && n >= 0 && n <= 4294967295);
  }
});
