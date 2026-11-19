import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarBolhas, EMISSORES_X } from '../src/core/bolhas.js';
import { SUPERFICIE_Y, AMPLITUDE_ONDA, AREIA_Y, COLUNAS, LINHA_AREIA, TILE, MUNDO_LARGURA, MUNDO_ALTURA } from '../src/core/mundo.js';
import { FASES, limitesDoPeixe, TAMANHO_POR_FASE } from '../src/core/fish.js';
import { deslocamentoDaOnda, desenharSuperficie } from '../src/render/superficie.js';
import { desenharBolhas } from '../src/render/bolhas.js';
import { desenharQuadro } from '../src/render/scene.js';
import { gerarMapa, ID } from '../src/render/cenario.js';
import { criarCamera } from '../src/render/camera.js';
import { criarQuadro, LARGURA, ALTURA } from '../src/render/tela.js';
import { COR } from '../src/render/palette.js';

const camera = (x = 0, y = 0) => criarCamera({
  mundoLargura: MUNDO_LARGURA, mundoAltura: MUNDO_ALTURA, janelaLargura: LARGURA, janelaAltura: ALTURA, x, y,
});

// --- Superfície -----------------------------------------------------------------------------

test('a onda nunca passa da amplitude e sempre dá número inteiro', () => {
  for (let x = 0; x < 400; x += 3) {
    for (let t = 0; t < 30; t += 0.37) {
      const d = deslocamentoDaOnda(x, t);
      assert.ok(Number.isInteger(d) && Math.abs(d) <= AMPLITUDE_ONDA, `x=${x} t=${t}: ${d}`);
    }
  }
});

test('a onda se mexe com o tempo e varia ao longo do mundo', () => {
  const linhaNoTempo = Array.from({ length: 60 }, (_, i) => deslocamentoDaOnda(50, i * 0.1));
  const linhaNoMundo = Array.from({ length: 60 }, (_, x) => deslocamentoDaOnda(x, 0));
  assert.ok(new Set(linhaNoTempo).size >= 3, 'sobe e desce no tempo');
  assert.ok(new Set(linhaNoMundo).size >= 3, 'tem relevo ao longo do mundo');
});

test('superfície: ar preto em cima, uma linha azul clara por coluna e água preta embaixo', () => {
  const q = criarQuadro();
  desenharSuperficie(q, camera(0, 0), 0);
  for (let x = 0; x < LARGURA; x++) {
    const linha = SUPERFICIE_Y + deslocamentoDaOnda(x, 0);
    assert.equal(q[linha * LARGURA + x], COR.AZUL_AGUA, `linha azul em (${x}, ${linha})`);
    if (linha > 0) assert.equal(q[(linha - 1) * LARGURA + x], 1, 'ar (preto, igual à água) logo acima da linha');
    assert.equal(q[(linha + 1) * LARGURA + x], 0, 'logo abaixo não é desenhado (água do cenário)');
  }
  // A água fundo não é tocada.
  assert.equal(q[(ALTURA - 1) * LARGURA + 10], 0);
});

test('superfície: a câmera mais embaixo não vê a superfície nem o ar', () => {
  const q = criarQuadro();
  desenharSuperficie(q, camera(0, 120), 0);
  assert.ok(q.every((v) => v === 0));
});

test('superfície: fica presa ao mundo (andar a câmera em x desloca a onda, não a muda)', () => {
  const a = criarQuadro();
  const b = criarQuadro();
  desenharSuperficie(a, camera(0, 0), 2.5);
  desenharSuperficie(b, camera(10, 0), 2.5);
  for (let x = 0; x < LARGURA - 10; x++) {
    for (let y = 0; y < 20; y++) assert.equal(b[y * LARGURA + x], a[y * LARGURA + x + 10], `(${x}, ${y})`);
  }
});

test('o peixe fica sempre abaixo da crista mais alta da onda, em todas as fases', () => {
  for (const fase of FASES) {
    const topo = limitesDoPeixe(fase).minY - TAMANHO_POR_FASE[fase].altura / 2;
    assert.ok(topo > SUPERFICIE_Y + AMPLITUDE_ONDA, `${fase}: topo em ${topo}`);
  }
});

// --- Bolhas ---------------------------------------------------------------------------------

test('bolhas: já começam com uma coluna formada, nos dois pontos', () => {
  const b = criarBolhas();
  assert.equal(EMISSORES_X.length, 2);
  assert.ok(b.lista.length >= 8, `${b.lista.length} bolhas`);
  for (const x of EMISSORES_X) {
    assert.ok(b.lista.some((o) => Math.abs(o.x - x) < 3), `nenhuma bolha perto de x=${x}`);
  }
});

test('bolhas: sobem, ficam entre a areia e a superfície e balançam pouco', () => {
  const b = criarBolhas({ aquecimento: 0 });
  const vistas = new Map();
  for (let i = 0; i < 600; i++) {
    b.atualizar(0.05);
    for (const o of b.lista) {
      assert.ok(o.y <= AREIA_Y && o.y > SUPERFICIE_Y, `y=${o.y}`);
      assert.ok(Math.min(...EMISSORES_X.map((x) => Math.abs(o.x - x))) <= 3, `x=${o.x} longe dos pontos`);
      if (vistas.has(o)) assert.ok(o.y < vistas.get(o), 'a bolha só sobe');
      vistas.set(o, o.y);
    }
  }
  assert.ok(vistas.size > 20, 'saem bolhas novas o tempo todo');
});

test('bolhas: somem ao chegar na superfície e há um teto de quantidade', () => {
  const b = criarBolhas({ aquecimento: 0 });
  for (let i = 0; i < 2000; i++) b.atualizar(0.05);
  assert.ok(b.lista.length <= 40);
  assert.ok(b.lista.every((o) => o.y > SUPERFICIE_Y));
  b.atualizar(30); // um salto grande de tempo não quebra nada
  assert.ok(b.lista.length <= 40);
});

test('bolhas: mesma semente, mesmas bolhas', () => {
  const a = criarBolhas({ semente: 3 });
  const b = criarBolhas({ semente: 3 });
  for (let i = 0; i < 100; i++) { a.atualizar(0.05); b.atualizar(0.05); }
  assert.deepEqual(a.lista, b.lista);
});

test('os pontos das bolhas são colunas sem rocha, em qualquer cenário', () => {
  for (const semente of [1, 2, 3, 42, 2024, 99999, 123456]) {
    const mapa = gerarMapa(semente);
    for (const x of EMISSORES_X) {
      const col = Math.floor(x / TILE);
      for (let lin = 0; lin < LINHA_AREIA; lin++) {
        assert.equal(mapa[lin * COLUNAS + col], ID.agua, `semente ${semente}: rocha na coluna ${col}, linha ${lin}`);
      }
    }
  }
});

test('desenharBolhas: pontinho vira 1 pixel branco e anel vira 8; corta o que sai da tela', () => {
  const q = criarQuadro();
  desenharBolhas(q, [{ x: 50, y: 50, anel: false }], camera(0, 0));
  assert.equal(q.filter((v) => v === 12).length, 1);
  assert.equal(q[50 * LARGURA + 50], 12);

  const r = criarQuadro();
  desenharBolhas(r, [{ x: 50, y: 50, anel: true }], camera(0, 0));
  assert.equal(r.filter((v) => v === 12).length, 8);
  assert.equal(r[50 * LARGURA + 50], 0, 'o meio do anel é vazio');

  const c = criarQuadro();
  desenharBolhas(c, [{ x: -1, y: -1, anel: true }, { x: LARGURA, y: ALTURA, anel: true }], camera(0, 0));
  assert.equal(c.length, LARGURA * ALTURA);
});

test('desenharQuadro: com bolhas e tempo aparecem; sem eles continua funcionando', () => {
  const mapa = gerarMapa();
  const sem = criarQuadro();
  desenharQuadro(sem, { mapa, camera: camera(60, MUNDO_ALTURA - ALTURA), peixes: [] });
  const com = criarQuadro();
  desenharQuadro(com, { mapa, camera: camera(60, MUNDO_ALTURA - ALTURA), peixes: [], bolhas: [{ x: 110, y: 50 + MUNDO_ALTURA - ALTURA, anel: false }], tempo: 1 });
  assert.equal(sem[50 * LARGURA + 50], 1, 'água');
  assert.equal(com[50 * LARGURA + 50], 12);
});
