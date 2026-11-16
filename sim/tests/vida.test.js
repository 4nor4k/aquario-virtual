// Testes juntando relógio + aquário + peixe: o peixe envelhece com o tempo acelerado.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarClock, DIA_MS, MINUTO_MS } from '../src/core/clock.js';
import { criarAquario } from '../src/core/aquarium.js';
import { limitesDoPeixe, msAteProximaFase, FASES } from '../src/core/fish.js';

function fonteFalsa() {
  let t = 0;
  const f = () => t;
  f.passar = (ms) => { t += ms; };
  return f;
}

const PASSO = 50; // ms reais por passo

test('a 3600×, o peixe passa por todas as fases em 12 minutos, na ordem, sem sair da água', () => {
  const fonte = fonteFalsa();
  const clock = criarClock(fonte, 3600);
  const aq = criarAquario({ semente: 3 });
  const peixe = aq.adicionarPeixe({}, clock.agoraMs());

  const vistas = [peixe.fase];
  const passos = (12 * MINUTO_MS) / PASSO;
  for (let i = 0; i < passos; i++) {
    fonte.passar(PASSO);
    aq.atualizar(PASSO / 1000, clock.agoraMs());
    if (vistas[vistas.length - 1] !== peixe.fase) vistas.push(peixe.fase);
    const lim = limitesDoPeixe(peixe.fase);
    assert.ok(peixe.x >= lim.minX && peixe.x <= lim.maxX, `passo ${i}: x=${peixe.x} fase ${peixe.fase}`);
    assert.ok(peixe.y >= lim.minY && peixe.y <= lim.maxY, `passo ${i}: y=${peixe.y} fase ${peixe.fase}`);
  }
  assert.deepEqual(vistas, FASES);
});

test('a 1×, o peixe continua filhote depois de 1 hora', () => {
  const fonte = fonteFalsa();
  const clock = criarClock(fonte, 1);
  const aq = criarAquario();
  const peixe = aq.adicionarPeixe({}, clock.agoraMs());
  fonte.passar(60 * MINUTO_MS);
  aq.atualizar(0.05, clock.agoraMs());
  assert.equal(peixe.fase, 'filhote');
});

test('"Pular fase" leva ao começo da próxima fase, até chegar ao idoso', () => {
  const fonte = fonteFalsa();
  const clock = criarClock(fonte);
  const aq = criarAquario();
  const peixe = aq.adicionarPeixe({}, clock.agoraMs());

  const vistas = [peixe.fase];
  for (let i = 0; i < 5; i++) {
    const ms = msAteProximaFase(peixe, clock.agoraMs());
    if (ms === null) break;
    clock.avancar(ms);
    aq.atualizar(0.05, clock.agoraMs());
    vistas.push(peixe.fase);
  }
  assert.deepEqual(vistas, FASES);
  assert.equal(msAteProximaFase(peixe, clock.agoraMs()), null);
});

test('peixe adicionado já numa fase entra com a idade dessa fase', () => {
  const aq = criarAquario();
  const p = aq.adicionarPeixe({ fase: 'adulto' }, 10 * DIA_MS);
  aq.atualizar(0.05, 10 * DIA_MS);
  assert.equal(p.fase, 'adulto');
  aq.atualizar(0.05, 10 * DIA_MS + 12 * DIA_MS); // 12 dias depois: já é idoso
  assert.equal(p.fase, 'idoso');
});

test('reiniciar: relógio em zero e peixe novo volta a ser filhote', () => {
  const fonte = fonteFalsa();
  const clock = criarClock(fonte, 3600);
  let aq = criarAquario({ semente: 1 });
  let p = aq.adicionarPeixe({}, clock.agoraMs());
  fonte.passar(7 * MINUTO_MS); // 7 min reais a 3600× = 17,5 dias de jogo (adulto: dia 15 a 27)
  aq.atualizar(0.05, clock.agoraMs());
  assert.equal(p.fase, 'adulto');

  clock.reiniciar();
  aq = criarAquario({ semente: 2 });
  p = aq.adicionarPeixe({}, clock.agoraMs());
  aq.atualizar(0.05, clock.agoraMs());
  assert.equal(clock.agoraMs(), 0);
  assert.equal(p.fase, 'filhote');
});
