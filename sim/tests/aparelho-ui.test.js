import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tamanhoDaTela } from '../src/sim/aparelho-ui.js';

test('tela: o tamanho é sempre um número inteiro de vezes 120 pixels REAIS do aparelho', () => {
  // celular comum: 2 pixels reais por pixel CSS, 360 de largura útil = 720 reais = 6× => 360
  assert.equal(tamanhoDaTela(360, 900, 2), 360);
  // 3 pixels reais: 375 CSS = 1125 reais; 9× = 1080 reais = 360 CSS
  assert.equal(tamanhoDaTela(375, 900, 3), 360);
  // sem escala (computador): 500 CSS => 4× => 480
  assert.equal(tamanhoDaTela(500, 900, 1), 480);
});

test('tela: o espaço mais apertado (largura ou altura) decide', () => {
  assert.equal(tamanhoDaTela(900, 250, 1), 240);
  assert.equal(tamanhoDaTela(250, 900, 1), 240);
  assert.equal(tamanhoDaTela(900, 130, 1), 120);
});

test('tela: nunca fica menor que 1× nem quebra com espaço pequeno, zero ou negativo', () => {
  assert.equal(tamanhoDaTela(50, 50, 1), 120);
  assert.equal(tamanhoDaTela(0, 0, 1), 120);
  assert.equal(tamanhoDaTela(-10, 300, 1), 120);
  assert.equal(tamanhoDaTela(50, 50, 2), 60); // 1× em pixels reais = 60 CSS
});

test('tela: escala de pixels inválida cai para 1', () => {
  assert.equal(tamanhoDaTela(500, 500, 0), 480);
  assert.equal(tamanhoDaTela(500, 500, NaN), 480);
  assert.equal(tamanhoDaTela(500, 500, -2), 480);
});

test('tela: escala não inteira (2,625) ainda dá número inteiro de pixels reais', () => {
  const css = tamanhoDaTela(380, 900, 2.625);
  const reais = css * 2.625;
  assert.ok(Math.abs(reais / 120 - Math.round(reais / 120)) < 1e-9, `${reais} reais não são múltiplo de 120`);
  assert.ok(css <= 380);
});
