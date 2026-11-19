// O bolor nas paredes de vidro do aquário (render/bolor.js) e a fonte de bolhas atrás da pedra grande.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { desenharBolor, gerarManchas, MANCHAS, QUANTAS_MANCHAS, crescimentoDaMancha } from '../src/render/bolor.js';
import { desenharQuadro } from '../src/render/scene.js';
import { desenharFundo, gerarFundo, deslocamentoDoFundo } from '../src/render/fundo.js';
import { PEDRA_GRANDE } from '../src/render/pedra-grande.js';
import { deslocamentoDaOnda } from '../src/render/superficie.js';
import { criarBolhas } from '../src/core/bolhas.js';
import { gerarMapa } from '../src/render/cenario.js';
import { criarCamera } from '../src/render/camera.js';
import { criarQuadro, LARGURA, ALTURA } from '../src/render/tela.js';
import { COR } from '../src/render/palette.js';
import { SUPERFICIE_Y, AREIA_Y, MUNDO_LARGURA, MUNDO_ALTURA } from '../src/core/mundo.js';

const contar = (q, cor) => q.reduce((n, c) => n + (c === cor ? 1 : 0), 0);
const camera = (x = 0, y = 0) => criarCamera({
  mundoLargura: MUNDO_LARGURA, mundoAltura: MUNDO_ALTURA, janelaLargura: LARGURA, janelaAltura: ALTURA, x, y,
});
const NAO_AGUA = (c) => c !== COR.AGUA;
// O bolor sozinho num quadro de água, com a câmera olhando a parede da esquerda ('e') ou da direita ('d').
const bolorEm = (sujeira, lado = 'e', tempo = 0) => {
  const q = criarQuadro().fill(COR.AGUA);
  desenharBolor(q, camera(lado === 'e' ? 0 : MUNDO_LARGURA - LARGURA, 24), sujeira / 100, tempo);
  return q;
};
const pixelsDeBolor = (q) => contar(q, COR.BOLOR) + contar(q, COR.BOLOR_CLARO);

test('bolor: não existe até a sujeira 60', () => {
  for (const s of [0, 40, 60]) {
    for (const lado of ['e', 'd']) assert.ok(bolorEm(s, lado).every((c) => c === COR.AGUA), `sujeira ${s}, lado ${lado}`);
  }
});

test('bolor: de 60 a 100 as manchas crescem (cada vez mais pixels), nas duas paredes', () => {
  for (const lado of ['e', 'd']) {
    const n = [63, 75, 90, 100].map((s) => pixelsDeBolor(bolorEm(s, lado)));
    assert.ok(n[0] > 0, `em 63 já aparece (lado ${lado})`);
    for (let i = 1; i < n.length; i++) assert.ok(n[i] > n[i - 1], `${lado}: ${n}`);
    const area = n[n.length - 1] / (LARGURA * ALTURA);
    assert.ok(area > 0.03 && area < 0.3, `no máximo cobre ${(100 * area).toFixed(1)}% da tela perto da parede`);
  }
});

test('bolor: é do vidro do aquário (preso ao mundo): só aparece perto das paredes, não no meio do aquário', () => {
  const meio = criarQuadro().fill(COR.AGUA);
  desenharBolor(meio, camera(60, 24), 1, 0); // a câmera no meio: as paredes ficam a 60 px de distância
  assert.ok(meio.every((c) => c === COR.AGUA), 'no meio do aquário não há bolor');
  // Perto da parede da esquerda, ele fica encostado nela (as primeiras colunas), não solto no meio da tela.
  const q = bolorEm(100, 'e');
  for (let y = 0; y < ALTURA; y++) for (let x = 18; x < LARGURA; x++) assert.equal(q[y * LARGURA + x], COR.AGUA, `(${x}, ${y})`);
  const d = bolorEm(100, 'd');
  for (let y = 0; y < ALTURA; y++) for (let x = 0; x < LARGURA - 18; x++) assert.equal(d[y * LARGURA + x], COR.AGUA, `(${x}, ${y})`);
});

test('bolor: não anda com a câmera (a mesma mancha, na mesma parede, em qualquer câmera)', () => {
  // Com a câmera a 0 e a 6 px, a parede (x do mundo = 0) aparece 6 px mais à esquerda: o desenho se desloca junto.
  const a = criarQuadro().fill(COR.AGUA);
  const b = criarQuadro().fill(COR.AGUA);
  desenharBolor(a, camera(0, 24), 1, 0);
  desenharBolor(b, camera(6, 24), 1, 0);
  for (let y = 0; y < ALTURA; y++) {
    for (let x = 0; x < 40; x++) {
      assert.equal(b[y * LARGURA + x], a[y * LARGURA + x + 6], `(${x}, ${y})`);
    }
  }
});

test('bolor: só dentro da água (abaixo da linha da superfície e acima da areia)', () => {
  const cy = 0;
  const q = criarQuadro().fill(COR.AGUA);
  desenharBolor(q, camera(0, cy), 1, 0.7);
  for (let x = 0; x < LARGURA; x++) {
    const linha = SUPERFICIE_Y + deslocamentoDaOnda(x, 0.7);
    for (let y = 0; y < ALTURA; y++) {
      if (!NAO_AGUA(q[y * LARGURA + x])) continue;
      assert.ok(y + cy > linha, `(${x}, ${y}) está acima da água`);
      assert.ok(y + cy < AREIA_Y, `(${x}, ${y}) está na areia`);
    }
  }
  assert.ok(pixelsDeBolor(q) > 0);
});

test('bolor: tem duas cores (miolo e borda clara) e as manchas são sempre as mesmas', () => {
  const q = bolorEm(100);
  assert.ok(contar(q, COR.BOLOR) > 0 && contar(q, COR.BOLOR_CLARO) > 0);
  assert.deepEqual(Array.from(bolorEm(100)), Array.from(q));
  assert.equal(MANCHAS.length, QUANTAS_MANCHAS);
  assert.deepEqual(gerarManchas(), MANCHAS);
  assert.notDeepEqual(gerarManchas(5), MANCHAS);
  for (const m of MANCHAS) {
    assert.ok(m.x <= 2 || m.x >= MUNDO_LARGURA - 3, `mancha em x=${m.x}: tem de estar encostada no vidro`);
    assert.ok(m.y > SUPERFICIE_Y && m.y < AREIA_Y);
  }
  assert.ok(MANCHAS.some((m) => m.x <= 2) && MANCHAS.some((m) => m.x >= MUNDO_LARGURA - 3), 'nas duas paredes');
});

test('bolor: as manchas não nascem todas juntas (cada uma tem seu atraso)', () => {
  const atrasos = new Set(MANCHAS.map((m) => m.atraso.toFixed(3)));
  assert.ok(atrasos.size > QUANTAS_MANCHAS / 2);
  for (const m of MANCHAS) {
    assert.equal(crescimentoDaMancha(m, 0), 0);
    assert.equal(crescimentoDaMancha(m, 1), 1);
  }
});

test('bolor: na cena fica atrás de tudo (a areia, as plantas e o peixe cobrem o vidro)', () => {
  const mapa = gerarMapa();
  const peixe = {
    id: 1, especie: 'beta', cor: 'vermelho', fase: 'adulto', estado: 'saudavel', x: 12, y: 60, direcao: 1, tempoAnimacao: 0,
  };
  const cena = (turvacao) => {
    const q = criarQuadro();
    desenharQuadro(q, { mapa, camera: camera(0, 32), peixes: [peixe], tempo: 1, turvacao });
    return q;
  };
  const limpa = cena(0);
  const suja = cena(1);
  assert.equal(pixelsDeBolor(limpa), 0);
  assert.ok(pixelsDeBolor(suja) > 50, 'o bolor aparece na parede');
  const corpo = COR.PEIXE.vermelho.vivo.corpo;
  assert.equal(contar(suja, corpo), contar(limpa, corpo), 'o peixe fica na frente do bolor');
  // A areia (a partir da linha da areia) não tem bolor por cima.
  for (let y = AREIA_Y - 32; y < ALTURA; y++) {
    for (let x = 0; x < LARGURA; x++) {
      assert.notEqual(suja[y * LARGURA + x], COR.BOLOR, `bolor sobre a areia em (${x}, ${y})`);
    }
  }
});

// --- A fonte de bolhas atrás da pedra grande ---------------------------------------------------

test('bolhas do fundo (camada 3): saem de trás da pedra grande e a pedra fica por cima', () => {
  const fundo = gerarFundo();
  const bolhas = criarBolhas({ semente: 21, emissores: [fundo.pedraGrande.x] });
  assert.ok(bolhas.lista.length >= 10);
  assert.ok(bolhas.lista.every((b) => Math.abs(b.x - fundo.pedraGrande.x) <= 3), 'todas saem do x da pedra');

  const quadro = criarQuadro().fill(COR.AGUA);
  const cam = camera(60, MUNDO_ALTURA - ALTURA);
  desenharFundo(quadro, fundo, cam, 0, null, bolhas.lista);
  const ox = deslocamentoDoFundo(cam);
  const oy = Math.round(cam.y);
  // Há bolhas brancas visíveis (acima da pedra)...
  assert.ok(contar(quadro, 12) > 0, 'as bolhas aparecem');
  // ...mas nenhum pixel da pedra grande foi coberto por uma bolha.
  const x0 = fundo.pedraGrande.x - Math.floor(PEDRA_GRANDE.largura / 2) - ox;
  const y0 = AREIA_Y - oy - PEDRA_GRANDE.altura + 1;
  for (let y = 0; y < PEDRA_GRANDE.altura; y++) {
    for (let x = 0; x < PEDRA_GRANDE.largura; x++) {
      const cor = PEDRA_GRANDE.pix[y * PEDRA_GRANDE.largura + x];
      const tx = x0 + x;
      const ty = y0 + y;
      // (as plantas do fundo são desenhadas na frente da pedra; só a bolha não pode estar na frente dela)
      if (cor !== 0 && tx >= 0 && tx < LARGURA && ty >= 0 && ty < ALTURA) assert.notEqual(quadro[ty * LARGURA + tx], 12, `bolha na frente da pedra em (${tx}, ${ty})`);
    }
  }
});

test('bolhas do fundo (camada 3): com a câmera andando, elas se deslocam só 70% do que a câmera andou', () => {
  const fundo = gerarFundo();
  const bolhas = criarBolhas({ semente: 21, emissores: [fundo.pedraGrande.x] });
  const brancos = (cx) => {
    const q = criarQuadro().fill(COR.AGUA);
    desenharFundo(q, fundo, camera(cx, MUNDO_ALTURA - ALTURA), 0, null, bolhas.lista);
    const xs = [];
    for (let i = 0; i < q.length; i++) if (q[i] === 12) xs.push(i % LARGURA);
    return xs;
  };
  const a = brancos(100);
  const b = brancos(110);
  const media = (v) => v.reduce((s, x) => s + x, 0) / v.length;
  assert.ok(a.length > 0 && b.length > 0);
  assert.ok(Math.abs((media(a) - media(b)) - 7) < 1.5, `deslocou ${media(a) - media(b)} (esperado ~7)`);
});
