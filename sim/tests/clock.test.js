import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarClock, SEGUNDO_MS, MINUTO_MS, HORA_MS, DIA_MS } from '../src/core/clock.js';

// Fonte de tempo falsa: nós controlamos quanto tempo "real" passou.
function fonteFalsa(inicio = 1000) {
  let t = inicio;
  const fonte = () => t;
  fonte.passar = (ms) => { t += ms; };
  fonte.definir = (ms) => { t = ms; };
  return fonte;
}

test('constantes de tempo', () => {
  assert.equal(SEGUNDO_MS, 1000);
  assert.equal(MINUTO_MS, 60000);
  assert.equal(HORA_MS, 3600000);
  assert.equal(DIA_MS, 86400000);
});

test('começa em zero, mesmo que a fonte comece em outro valor', () => {
  const clock = criarClock(fonteFalsa(987654));
  assert.equal(clock.agoraMs(), 0);
});

test('velocidade 1× acompanha o tempo real', () => {
  const fonte = fonteFalsa();
  const clock = criarClock(fonte);
  fonte.passar(5 * SEGUNDO_MS);
  assert.equal(clock.agoraMs(), 5 * SEGUNDO_MS);
});

test('60×: 1 segundo real vira 1 minuto de jogo', () => {
  const fonte = fonteFalsa();
  const clock = criarClock(fonte, 60);
  fonte.passar(SEGUNDO_MS);
  assert.equal(clock.agoraMs(), MINUTO_MS);
});

test('3600×: 24 segundos reais viram 1 dia de jogo', () => {
  const fonte = fonteFalsa();
  const clock = criarClock(fonte, 3600);
  fonte.passar(24 * SEGUNDO_MS);
  assert.equal(clock.agoraMs(), DIA_MS);
});

test('3600×: 30 dias de vida levam 12 minutos reais', () => {
  const fonte = fonteFalsa();
  const clock = criarClock(fonte, 3600);
  fonte.passar(12 * MINUTO_MS);
  assert.equal(clock.agoraMs(), 30 * DIA_MS);
});

test('trocar a velocidade não muda o que já passou', () => {
  const fonte = fonteFalsa();
  const clock = criarClock(fonte, 1);
  fonte.passar(10 * SEGUNDO_MS);     // 10 s a 1×
  clock.velocidade = 60;             // troca sem ler o relógio antes
  assert.equal(clock.agoraMs(), 10 * SEGUNDO_MS);
  fonte.passar(SEGUNDO_MS);          // 1 s a 60×
  assert.equal(clock.agoraMs(), 10 * SEGUNDO_MS + MINUTO_MS);
});

test('velocidade 0 pausa o jogo', () => {
  const fonte = fonteFalsa();
  const clock = criarClock(fonte);
  fonte.passar(SEGUNDO_MS);
  clock.velocidade = 0;
  fonte.passar(10 * SEGUNDO_MS);
  assert.equal(clock.agoraMs(), SEGUNDO_MS);
});

test('avancar salta no tempo do jogo', () => {
  const fonte = fonteFalsa();
  const clock = criarClock(fonte);
  clock.avancar(5 * DIA_MS);
  assert.equal(clock.agoraMs(), 5 * DIA_MS);
  fonte.passar(SEGUNDO_MS);
  assert.equal(clock.agoraMs(), 5 * DIA_MS + SEGUNDO_MS);
});

test('reiniciar volta a zero e continua contando dali', () => {
  const fonte = fonteFalsa();
  const clock = criarClock(fonte, 60);
  fonte.passar(10 * SEGUNDO_MS);
  clock.reiniciar();
  assert.equal(clock.agoraMs(), 0);
  fonte.passar(SEGUNDO_MS);
  assert.equal(clock.agoraMs(), MINUTO_MS);
});

test('se a fonte andar para trás, o jogo não rebobina', () => {
  const fonte = fonteFalsa(5000);
  const clock = criarClock(fonte);
  fonte.passar(2 * SEGUNDO_MS);
  assert.equal(clock.agoraMs(), 2 * SEGUNDO_MS);
  fonte.definir(1000);               // relógio real voltou
  assert.equal(clock.agoraMs(), 2 * SEGUNDO_MS);
  fonte.passar(SEGUNDO_MS);          // e depois segue normal
  assert.equal(clock.agoraMs(), 3 * SEGUNDO_MS);
});

test('recusa velocidade e saltos inválidos', () => {
  const fonte = fonteFalsa();
  assert.throws(() => criarClock(fonte, -1), RangeError);
  assert.throws(() => criarClock(fonte, NaN), RangeError);
  assert.throws(() => criarClock(fonte, Infinity), RangeError);
  const clock = criarClock(fonte);
  assert.throws(() => { clock.velocidade = -5; }, RangeError);
  assert.throws(() => clock.avancar(-1), RangeError);
  assert.throws(() => clock.avancar(NaN), RangeError);
});
