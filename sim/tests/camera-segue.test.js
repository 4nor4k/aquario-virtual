import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarCamera } from '../src/render/camera.js';
import { criarSeguidorDeCamera } from '../src/render/camera-segue.js';

const MEDIDAS = { mundoLargura: 360, mundoAltura: 240, janelaLargura: 120, janelaAltura: 120 };
const PARADO = { x: 0, y: 0 };

function montar(x = 0, y = 120) {
  const camera = criarCamera({ ...MEDIDAS, x, y });
  const seguidor = criarSeguidorDeCamera({ camera, janelaLargura: 120, janelaAltura: 120 });
  return { camera, seguidor };
}

// Roda "segundos" de jogo em passos de 50 ms.
function passar(seguidor, segundos, entrada) {
  for (let i = 0; i < Math.round(segundos * 20); i++) seguidor.atualizar(0.05, entrada);
}

const peixe = (x, y) => ({ x, y, largura: 20, altura: 14 });

test('peixe na tela: a câmera nunca se mexe', () => {
  const { camera, seguidor } = montar(0, 120);
  passar(seguidor, 60, { alvo: peixe(60, 180), joystick: PARADO });
  assert.deepEqual([camera.x, camera.y], [0, 120]);
  assert.equal(seguidor.seguindo, false);
});

test('peixe fora da tela por menos de 5 s: ainda não segue', () => {
  const { camera, seguidor } = montar(0, 120);
  passar(seguidor, 4.9, { alvo: peixe(300, 180), joystick: PARADO });
  assert.equal(seguidor.seguindo, false);
  assert.equal(camera.x, 0);
});

test('peixe fora da tela por 5 s: a câmera começa a seguir', () => {
  const { camera, seguidor } = montar(0, 120);
  passar(seguidor, 5.1, { alvo: peixe(300, 180), joystick: PARADO }); // 0,1 s de folga: soma de 0,05 não é exata
  assert.equal(seguidor.seguindo, true);
  passar(seguidor, 1,{ alvo: peixe(300, 180), joystick: PARADO });
  assert.ok(camera.x > 0, 'a câmera andou em direção ao peixe');
});

test('segue por 10 s e depois para', () => {
  const { camera, seguidor } = montar(0, 120);
  const entrada = { alvo: peixe(300, 180), joystick: PARADO };
  passar(seguidor, 5, entrada);                  // espera
  passar(seguidor, 9.9, entrada);
  assert.equal(seguidor.seguindo, true);
  passar(seguidor, 0.2, entrada);
  assert.equal(seguidor.seguindo, false);
  const parouEm = camera.x;
  passar(seguidor, 3, { alvo: peixe(300, 180), joystick: PARADO }); // peixe está na tela agora
  assert.equal(camera.x, parouEm, 'depois dos 10 s ela fica parada');
});

test('a câmera alcança o peixe e o deixa no meio da janela', () => {
  const { camera, seguidor } = montar(0, 120);
  const entrada = { alvo: peixe(300, 180), joystick: PARADO };
  passar(seguidor, 5 + 9, entrada);
  assert.ok(Math.abs(camera.x - (300 - 60)) < 1, `camera.x = ${camera.x}`);
});

test('a câmera nunca anda mais rápido que 60 px/s', () => {
  const { camera, seguidor } = montar(0, 120);
  const entrada = { alvo: peixe(340, 20), joystick: PARADO };
  passar(seguidor, 5, entrada);
  let antes = [camera.x, camera.y];
  for (let i = 0; i < 100; i++) {
    seguidor.atualizar(0.05, entrada);
    const passo = Math.hypot(camera.x - antes[0], camera.y - antes[1]);
    assert.ok(passo <= 60 * 0.05 + 1e-9, `passo de ${passo}`);
    antes = [camera.x, camera.y];
  }
});

test('mexer o joystick cancela o seguir e zera a espera', () => {
  const { camera, seguidor } = montar(0, 120);
  const fora = { alvo: peixe(300, 180), joystick: PARADO };
  passar(seguidor, 6, fora);
  assert.equal(seguidor.seguindo, true);
  seguidor.atualizar(0.05, { alvo: peixe(300, 180), joystick: { x: 1, y: 0 } });
  assert.equal(seguidor.seguindo, false);
  assert.equal(seguidor.tempoFora, 0);
  const x = camera.x;
  passar(seguidor, 4.9, fora);                   // recomeça a contar do zero
  assert.equal(camera.x, x);
  assert.equal(seguidor.seguindo, false);
});

test('peixe que volta para a tela zera a contagem', () => {
  const { seguidor } = montar(0, 120);
  passar(seguidor, 4, { alvo: peixe(300, 180), joystick: PARADO });
  passar(seguidor, 0.1, { alvo: peixe(60, 180), joystick: PARADO });
  assert.equal(seguidor.tempoFora, 0);
  passar(seguidor, 4, { alvo: peixe(300, 180), joystick: PARADO });
  assert.equal(seguidor.seguindo, false, 'os 4 s anteriores não contam');
});

test('peixe com um pedaço ainda aparecendo conta como "na tela"', () => {
  const { seguidor } = montar(0, 120);
  // centro em x=125, meia largura 10: a borda esquerda (115) ainda está dentro da janela (0..120)
  passar(seguidor, 20, { alvo: peixe(125, 180), joystick: PARADO });
  assert.equal(seguidor.seguindo, false);
});

test('menu aberto: a contagem e a câmera ficam congeladas', () => {
  const { camera, seguidor } = montar(0, 120);
  passar(seguidor, 30, { alvo: peixe(300, 180), joystick: PARADO, livre: false });
  assert.equal(seguidor.seguindo, false);
  assert.equal(seguidor.tempoFora, 0);
  assert.equal(camera.x, 0);
});

test('depois de parar, se o peixe continuar fora, espera 5 s e segue de novo', () => {
  // Câmera presa na borda do mundo não consegue enquadrar um peixe fora dela: simula o caso.
  const camera = criarCamera({ ...MEDIDAS, x: 0, y: 120 });
  const seguidor = criarSeguidorDeCamera({ camera, janelaLargura: 120, janelaAltura: 120 });
  const entrada = { alvo: peixe(300, 180), joystick: PARADO };
  passar(seguidor, 5 + 10.1, entrada);
  assert.equal(seguidor.seguindo, false);
  camera.irPara(0, 120);                         // alguém levou a câmera de volta
  passar(seguidor, 4.9, entrada);
  assert.equal(seguidor.seguindo, false);
  passar(seguidor, 0.2, entrada);
  assert.equal(seguidor.seguindo, true);
});
