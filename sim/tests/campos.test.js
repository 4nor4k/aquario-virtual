import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lerNumero } from '../src/sim/campos.js';

test('lerNumero aceita números, com ponto ou vírgula, e espaços', () => {
  assert.equal(lerNumero('42'), 42);
  assert.equal(lerNumero(' 7 '), 7);
  assert.equal(lerNumero('12,5'), 12.5);
  assert.equal(lerNumero('12.5'), 12.5);
  assert.equal(lerNumero(55), 55);
});

test('lerNumero limita entre 0 e 100 (ou os limites dados)', () => {
  assert.equal(lerNumero('-5'), 0);
  assert.equal(lerNumero('250'), 100);
  assert.equal(lerNumero('9', 10, 20), 10);
  assert.equal(lerNumero('99', 10, 20), 20);
});

test('lerNumero devolve null para o que não dá para entender', () => {
  for (const ruim of ['', '   ', 'abc', '1,2,3', 'NaN', 'Infinity', null, undefined]) {
    assert.equal(lerNumero(ruim), null, String(ruim));
  }
});
