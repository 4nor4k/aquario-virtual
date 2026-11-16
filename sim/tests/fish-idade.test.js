import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  criarPeixe, limitesDoPeixe, faseDaIdade, idadeMs, msAteProximaFase, atualizarIdade,
  DURACAO_FASE_DIAS, VIDA_NATURAL_DIAS, INICIO_DA_FASE_MS,
} from '../src/core/fish.js';

const DIA = 86400000;

test('as fases duram 5, 10, 12 e 3 dias e começam em 0, 5, 15 e 27', () => {
  assert.deepEqual(DURACAO_FASE_DIAS, { filhote: 5, jovem: 10, adulto: 12, idoso: 3 });
  assert.equal(Object.values(DURACAO_FASE_DIAS).reduce((a, b) => a + b), VIDA_NATURAL_DIAS);
  assert.equal(VIDA_NATURAL_DIAS, 30);
  assert.deepEqual(INICIO_DA_FASE_MS, {
    filhote: 0, jovem: 5 * DIA, adulto: 15 * DIA, idoso: 27 * DIA,
  });
});

test('faseDaIdade nas fronteiras (dia 5, 15, 27 e 30)', () => {
  const casos = [
    [0, 'filhote'], [5 * DIA - 1, 'filhote'], [5 * DIA, 'jovem'],
    [15 * DIA - 1, 'jovem'], [15 * DIA, 'adulto'],
    [27 * DIA - 1, 'adulto'], [27 * DIA, 'idoso'],
    [30 * DIA, 'idoso'], [100 * DIA, 'idoso'], // depois dos 30 dias continua idoso
    [-5, 'filhote'],
  ];
  for (const [idade, esperado] of casos) assert.equal(faseDaIdade(idade), esperado, `idade ${idade}`);
});

test('a idade é "agora" menos o nascimento, e nunca negativa', () => {
  const p = criarPeixe({ nascimentoMs: 1000, x: 100, y: 100 });
  assert.equal(idadeMs(p, 6000), 5000);
  assert.equal(idadeMs(p, 0), 0);
});

test('um peixe novo nasce filhote, com nascimento em 0', () => {
  const p = criarPeixe({ x: 100, y: 100 });
  assert.equal(p.fase, 'filhote');
  assert.equal(p.nascimentoMs, 0);
});

test('msAteProximaFase leva exatamente à próxima fase e é null no idoso', () => {
  const p = criarPeixe({ x: 100, y: 100 });
  const casos = [[0, 'jovem'], [3 * DIA + 777, 'jovem'], [6 * DIA, 'adulto'], [20 * DIA + 5, 'idoso']];
  for (const [agora, proxima] of casos) {
    const ms = msAteProximaFase(p, agora);
    assert.equal(faseDaIdade(idadeMs(p, agora + ms)), proxima, `agora ${agora}`);
    assert.notEqual(faseDaIdade(idadeMs(p, agora + ms - 1)), proxima, 'passou direto da fronteira');
  }
  assert.equal(msAteProximaFase(p, 27 * DIA), null);
  assert.equal(msAteProximaFase(p, 50 * DIA), null);
});

test('atualizarIdade troca a fase e deixa o peixe dentro dos novos limites', () => {
  // Filhote colado no canto: ao virar jovem (corpo maior) tem de ser empurrado para dentro.
  const lim = limitesDoPeixe('jovem');
  const p = criarPeixe({ x: 5, y: lim.maxY + 1, fase: 'filhote' });
  p.destino = { x: 2, y: 500 };
  atualizarIdade(p, 5 * DIA);
  assert.equal(p.fase, 'jovem');
  assert.ok(p.x >= lim.minX && p.x <= lim.maxX);
  assert.ok(p.y >= lim.minY && p.y <= lim.maxY);
  assert.ok(p.destino.x >= lim.minX && p.destino.y <= lim.maxY);
});

test('atualizarIdade não mexe em nada se a fase é a mesma', () => {
  const p = criarPeixe({ x: 5, y: 5, fase: 'filhote' });
  p.destino = { x: 1, y: 1 };
  atualizarIdade(p, 2 * DIA);
  assert.deepEqual([p.x, p.y, p.destino], [5, 5, { x: 1, y: 1 }]);
});
