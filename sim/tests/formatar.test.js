import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatarHoraDoJogo, formatarIdade } from '../src/sim/formatar.js';
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


// --- Textos que a tela do aparelho também usa (core/formatar.js) -----------------------------

import { diaDaVida, formatarPh, preencher } from '../src/core/formatar.js';

test('diaDaVida: começa no dia 1 de 30 e trava no dia 30', () => {
  assert.deepEqual(diaDaVida(0), { dia: 1, total: 30 });
  assert.deepEqual(diaDaVida(11 * DIA_MS), { dia: 12, total: 30 });
  assert.deepEqual(diaDaVida(500 * DIA_MS), { dia: 30, total: 30 });
});

test('pH em texto usa vírgula e uma casa', () => {
  assert.equal(formatarPh(7), '7,0');
  assert.equal(formatarPh(6.2), '6,2');
  assert.equal(formatarPh(7.5), '7,5');
});

test('preencher troca {nome} e deixa o que não conhece', () => {
  assert.equal(preencher('pH {ph} em {onde}', { ph: '7,0' }), 'pH 7,0 em {onde}');
  assert.equal(preencher('sem molde', { ph: 1 }), 'sem molde');
  assert.equal(preencher('{a}{a}', { a: 0 }), '00');
});
