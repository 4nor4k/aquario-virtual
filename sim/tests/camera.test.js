import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarCamera } from '../src/render/camera.js';

const MEDIDAS = { mundoLargura: 360, mundoAltura: 240, janelaLargura: 120, janelaAltura: 120 };

test('limites: x vai de 0 a 240 e y de 0 a 120', () => {
  const cam = criarCamera(MEDIDAS);
  assert.equal(cam.maxX, 240);
  assert.equal(cam.maxY, 120);
});

test('começa onde mandarmos', () => {
  const cam = criarCamera({ ...MEDIDAS, x: 100, y: 50 });
  assert.equal(cam.x, 100);
  assert.equal(cam.y, 50);
});

test('mover soma ao lugar atual', () => {
  const cam = criarCamera({ ...MEDIDAS, x: 10, y: 10 });
  cam.mover(3, -2);
  assert.equal(cam.x, 13);
  assert.equal(cam.y, 8);
});

test('não sai do mundo por nenhum dos quatro lados', () => {
  const cam = criarCamera(MEDIDAS);
  cam.mover(-50, -50);
  assert.deepEqual([cam.x, cam.y], [0, 0]);
  cam.mover(9999, 9999);
  assert.deepEqual([cam.x, cam.y], [240, 120]);
});

test('a posição inicial também respeita os limites', () => {
  const cam = criarCamera({ ...MEDIDAS, x: -5, y: 999 });
  assert.deepEqual([cam.x, cam.y], [0, 120]);
});

test('irPara respeita os limites', () => {
  const cam = criarCamera(MEDIDAS);
  cam.irPara(500, -1);
  assert.deepEqual([cam.x, cam.y], [240, 0]);
});

test('janela maior que o mundo: câmera fica parada em 0', () => {
  const cam = criarCamera({ mundoLargura: 100, mundoAltura: 100, janelaLargura: 120, janelaAltura: 120 });
  cam.mover(10, 10);
  assert.deepEqual([cam.x, cam.y], [0, 0]);
});
