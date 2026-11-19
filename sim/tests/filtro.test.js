import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  desenharFiltro, ruido, CAIXA, BICO, QUEDA_X, QUEDA_Y, TUBO,
} from '../src/render/filtro.js';
import { deslocamentoDaOnda } from '../src/render/superficie.js';
import { desenharQuadro } from '../src/render/scene.js';
import { gerarMapa } from '../src/render/cenario.js';
import { criarCamera } from '../src/render/camera.js';
import { criarQuadro, LARGURA, ALTURA } from '../src/render/tela.js';
import { COR } from '../src/render/palette.js';
import { SUPERFICIE_Y, AMPLITUDE_ONDA, MUNDO_LARGURA, MUNDO_ALTURA } from '../src/core/mundo.js';

const camera = (x, y) => criarCamera({
  mundoLargura: MUNDO_LARGURA, mundoAltura: MUNDO_ALTURA, janelaLargura: LARGURA, janelaAltura: ALTURA, x, y,
});
const quadroDe = (t, cx = 0, cy = 0) => {
  const q = criarQuadro();
  desenharFiltro(q, camera(cx, cy), t);
  return q;
};
const pixel = (q, x, y) => q[y * LARGURA + x];

test('filtro: a caixa fica no canto de cima à esquerda, com contorno branco, e acima da água', () => {
  const q = quadroDe(0);
  assert.equal(CAIXA.y + CAIXA.altura, 18);
  assert.ok(CAIXA.y + CAIXA.altura <= SUPERFICIE_Y - AMPLITUDE_ONDA, 'a caixa não encosta na crista da onda');
  for (let i = 0; i < CAIXA.largura; i++) {
    assert.equal(pixel(q, CAIXA.x + i, CAIXA.y), 12, 'borda de cima');
    assert.equal(pixel(q, CAIXA.x + i, CAIXA.y + CAIXA.altura - 1), 12, 'borda de baixo');
  }
  assert.equal(pixel(q, CAIXA.x + 2, CAIXA.y + 2), 14, 'miolo em xadrez');
});

test('filtro: o bico sai da caixa para a direita, a queda começa na ponta dele', () => {
  const q = quadroDe(0);
  for (let i = 0; i < BICO.comprimento; i++) assert.equal(pixel(q, BICO.x + i, BICO.y), 12, `bico em ${i}`);
  assert.ok(QUEDA_X >= BICO.x && QUEDA_X < BICO.x + BICO.comprimento, 'a queda sai do bico');
  assert.ok(QUEDA_Y > BICO.y, 'a queda começa abaixo do bico');
});

test('filtro: a água cai do bico até a superfície, em azul claro, e não passa dela', () => {
  for (const t of [0, 0.4, 1.1, 2.7]) {
    const q = quadroDe(t);
    const superficie = SUPERFICIE_Y + deslocamentoDaOnda(QUEDA_X, t);
    let acesos = 0;
    for (let y = QUEDA_Y; y < superficie; y++) if (pixel(q, QUEDA_X, y) === COR.AZUL_AGUA) acesos++;
    assert.ok(acesos >= (superficie - QUEDA_Y) * 0.5, `t=${t}: o fio está cheio de falhas (${acesos})`);
    assert.equal(pixel(q, QUEDA_X, BICO.y - 1), 0, `t=${t}: água acima do bico`);
  }
});

test('filtro: a queda é animada, as falhas descem com o tempo', () => {
  const coluna = (t) => Array.from({ length: 12 }, (_, i) => pixel(quadroDe(t), QUEDA_X, QUEDA_Y + i)).join();
  const vistos = new Set([0, 0.06, 0.12, 0.18, 0.24, 0.3].map(coluna));
  assert.ok(vistos.size >= 3, 'o desenho do fio muda');
  assert.equal(coluna(1.5), coluna(1.5), 'mesmo tempo, mesmo desenho');
});

test('filtro: as falhas do fio DESCEM com o tempo (não sobem)', () => {
  // Cada quadro da animação é 1/18 s. Um quadro depois, o desenho tem de ser o anterior deslocado
  // 1 linha PARA BAIXO: o pixel da linha y agora é o que estava na linha y-1.
  for (const k of [0, 1]) {
    for (let n = 0; n < 8; n++) {
      const antes = quadroDe(n / 18 + 0.001);
      const depois = quadroDe((n + 1) / 18 + 0.001);
      for (let y = QUEDA_Y + 2; y < SUPERFICIE_Y - AMPLITUDE_ONDA; y++) {
        assert.equal(pixel(depois, QUEDA_X + k, y), pixel(antes, QUEDA_X + k, y - 1), `coluna ${k}, quadro ${n}, linha ${y}`);
      }
    }
  }
  // E a coluna rala da borda também desce.
  const antes = quadroDe(0.001);
  const depois = quadroDe(1 / 18 + 0.001);
  for (let y = QUEDA_Y + 2; y < SUPERFICIE_Y - AMPLITUDE_ONDA; y++) {
    assert.equal(pixel(depois, QUEDA_X + 2, y), pixel(antes, QUEDA_X + 2, y - 1), `coluna da borda, linha ${y}`);
  }
});

test('filtro: tubo de sucção desce para dentro da água e acaba numa grade', () => {
  const q = quadroDe(0);
  for (let y = TUBO.y; y < TUBO.y + TUBO.comprimento; y++) assert.equal(pixel(q, TUBO.x, y), 12, `tubo na linha ${y}`);
  assert.ok(TUBO.y + TUBO.comprimento > SUPERFICIE_Y + AMPLITUDE_ONDA + 10, 'o tubo entra bem fundo na água');
  assert.equal(pixel(q, TUBO.x, TUBO.y + TUBO.comprimento + 2), 14, 'grade em xadrez');
});

test('filtro: respingos e bolhas do impacto variam e ficam perto da queda', () => {
  const todos = new Set();
  for (let t = 0; t < 3; t += 0.05) {
    const q = quadroDe(t);
    for (let i = 0; i < q.length; i++) {
      if (q[i] !== COR.AZUL_AGUA) continue;
      const x = i % LARGURA;
      const y = Math.floor(i / LARGURA);
      // Só olha a área do impacto: fora da caixa, do bico, do tubo e do fio.
      if (y > SUPERFICIE_Y + 2 + 8 + 1 || y < SUPERFICIE_Y - 6 || x < QUEDA_X - 6 || x > QUEDA_X + 7) continue;
      if (x >= QUEDA_X && x <= QUEDA_X + 2 && y < SUPERFICIE_Y + AMPLITUDE_ONDA) continue; // o fio
      if (x < CAIXA.x + CAIXA.largura + 1 && x >= TUBO.x - 3 && x <= TUBO.x + 3) continue;  // o tubo
      todos.add(`${x},${y}`);
    }
  }
  assert.ok(todos.size >= 15, `só ${todos.size} posições diferentes de respingo`);
});

test('filtro: só aparece com a câmera no canto; longe dele não desenha nada', () => {
  assert.ok(quadroDe(1, 0, 0).some((c) => c !== 0));
  assert.ok(quadroDe(1, 120, 0).every((c) => c === 0), 'câmera no lado direito');
  // Com a câmera no fundo só o tubo (que desce na água) ainda aparece; a caixa e a queda saem de cena.
  const noFundo = quadroDe(1, 0, 40);
  for (let i = 0; i < noFundo.length; i++) if (noFundo[i] !== 0) assert.ok(i % LARGURA < 9, 'só o tubo e a grade (à esquerda)');
});

test('filtro: acompanha o mundo (andar a câmera 10 px o desloca 10 px)', () => {
  const a = quadroDe(0.7, 0, 0);
  const b = quadroDe(0.7, 10, 0);
  for (let y = 0; y < 30; y++) for (let x = 0; x < 30; x++) assert.equal(pixel(b, x, y), pixel(a, x + 10, y), `(${x}, ${y})`);
});

test('ruído: sempre o mesmo para o mesmo número e bem espalhado', () => {
  assert.equal(ruido(42), ruido(42));
  const valores = new Set(Array.from({ length: 200 }, (_, i) => ruido(i) % 9));
  assert.equal(valores.size, 9, 'sai de 0 a 8');
});

test('desenharQuadro: o filtro aparece por cima da superfície, sem sumir com o ar', () => {
  const mapa = gerarMapa();
  const q = criarQuadro();
  desenharQuadro(q, { mapa, camera: camera(0, 0), peixes: [], tempo: 0.5 });
  assert.equal(pixel(q, CAIXA.x, CAIXA.y), 12);
  const sem = criarQuadro();
  desenharQuadro(sem, { mapa, camera: camera(120, 0), peixes: [], tempo: 0.5 });
  assert.notEqual(pixel(sem, CAIXA.x, CAIXA.y), 12, 'sem o filtro quando a câmera está longe');
  assert.ok(q.length === LARGURA * ALTURA);
});
