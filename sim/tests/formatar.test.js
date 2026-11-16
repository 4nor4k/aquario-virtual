import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatarHoraDoJogo, formatarIdade, fimDaVidaNatural } from '../src/sim/formatar.js';
import { DIA_MS, HORA_MS, MINUTO_MS } from '../src/core/clock.js';

test('hora do jogo: começa no "Dia 1 · 00:00"', () => {
  assert.equal(formatarHoraDoJogo(0), 'Dia 1 · 00:00');
});

test('hora do jogo: 11 dias, 8 h e 30 min = "Dia 12 · 08:30"', () => {
  assert.equal(formatarHoraDoJogo(11 * DIA_MS + 8 * HORA_MS + 30 * MINUTO_MS), 'Dia 12 · 08:30');
});

test('hora do jogo: 23:59 e a virada do dia', () => {
  assert.equal(formatarHoraDoJogo(DIA_MS - MINUTO_MS), 'Dia 1 · 23:59');
  assert.equal(formatarHoraDoJogo(DIA_MS), 'Dia 2 · 00:00');
});

test('hora do jogo: ignora segundos (59 s ainda é o mesmo minuto)', () => {
  assert.equal(formatarHoraDoJogo(MINUTO_MS - 1), 'Dia 1 · 00:00');
});

test('idade: "dia 1 de 30" ao nascer, "dia 12 de 30" aos 11 dias', () => {
  assert.equal(formatarIdade(0), 'dia 1 de 30');
  assert.equal(formatarIdade(11 * DIA_MS), 'dia 12 de 30');
  assert.equal(formatarIdade(29 * DIA_MS + HORA_MS), 'dia 30 de 30');
});

test('idade: nunca passa de "dia 30 de 30"', () => {
  assert.equal(formatarIdade(30 * DIA_MS), 'dia 30 de 30');
  assert.equal(formatarIdade(90 * DIA_MS), 'dia 30 de 30');
});

test('fim da vida natural só a partir dos 30 dias', () => {
  assert.equal(fimDaVidaNatural(30 * DIA_MS - 1), false);
  assert.equal(fimDaVidaNatural(30 * DIA_MS), true);
});
