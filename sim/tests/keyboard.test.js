import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarTeclado } from '../src/input/keyboard.js';

// Alvo falso de eventos (no navegador seria a "window").
function novoAlvo() {
  const alvo = new EventTarget();
  alvo.apertar = (code) => {
    const e = new Event('keydown', { cancelable: true });
    e.code = code;
    alvo.dispatchEvent(e);
    return e;
  };
  alvo.soltar = (code) => {
    const e = new Event('keyup');
    e.code = code;
    alvo.dispatchEvent(e);
  };
  alvo.perderFoco = () => alvo.dispatchEvent(new Event('blur'));
  return alvo;
}

test('sem tecla apertada, a direção é (0, 0)', () => {
  const t = criarTeclado(novoAlvo());
  assert.deepEqual(t.direcao(), { x: 0, y: 0 });
});

test('setas e WASD dão as quatro direções', () => {
  const casos = [
    ['ArrowLeft', { x: -1, y: 0 }], ['KeyA', { x: -1, y: 0 }],
    ['ArrowRight', { x: 1, y: 0 }], ['KeyD', { x: 1, y: 0 }],
    ['ArrowUp', { x: 0, y: -1 }], ['KeyW', { x: 0, y: -1 }],
    ['ArrowDown', { x: 0, y: 1 }], ['KeyS', { x: 0, y: 1 }],
  ];
  for (const [tecla, esperado] of casos) {
    const alvo = novoAlvo();
    const t = criarTeclado(alvo);
    alvo.apertar(tecla);
    assert.deepEqual(t.direcao(), esperado, tecla);
  }
});

test('tecla segurada continua valendo a cada leitura até soltar', () => {
  const alvo = novoAlvo();
  const t = criarTeclado(alvo);
  alvo.apertar('ArrowRight');
  assert.equal(t.direcao().x, 1);
  assert.equal(t.direcao().x, 1);
  assert.equal(t.direcao().x, 1);
  alvo.soltar('ArrowRight');
  assert.equal(t.direcao().x, 0);
});

test('toque rápido (apertar e soltar antes da leitura) ainda conta uma vez', () => {
  const alvo = novoAlvo();
  const t = criarTeclado(alvo);
  alvo.apertar('KeyW');
  alvo.soltar('KeyW');
  assert.equal(t.direcao().y, -1);
  assert.equal(t.direcao().y, 0); // só uma vez
});

test('direções opostas se anulam e diagonais funcionam', () => {
  const alvo = novoAlvo();
  const t = criarTeclado(alvo);
  alvo.apertar('ArrowLeft');
  alvo.apertar('ArrowRight');
  assert.equal(t.direcao().x, 0);
  alvo.soltar('ArrowLeft');
  alvo.soltar('ArrowRight');
  t.direcao();
  alvo.apertar('ArrowRight');
  alvo.apertar('ArrowDown');
  assert.deepEqual(t.direcao(), { x: 1, y: 1 });
});

test('seta e letra da mesma direção juntas não somam', () => {
  const alvo = novoAlvo();
  const t = criarTeclado(alvo);
  alvo.apertar('ArrowRight');
  alvo.apertar('KeyD');
  assert.equal(t.direcao().x, 1);
});

test('perder o foco solta tudo', () => {
  const alvo = novoAlvo();
  const t = criarTeclado(alvo);
  alvo.apertar('ArrowRight');
  alvo.perderFoco();
  assert.deepEqual(t.direcao(), { x: 0, y: 0 });
});

test('setas não rolam a página; outras teclas passam', () => {
  const alvo = novoAlvo();
  criarTeclado(alvo);
  assert.equal(alvo.apertar('ArrowDown').defaultPrevented, true);
  assert.equal(alvo.apertar('KeyQ').defaultPrevented, false);
});
