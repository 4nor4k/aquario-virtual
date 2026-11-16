import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gerarMapa, ID, NUM_TILES, pixelsDoTile } from '../src/render/cenario.js';
import { COLUNAS, LINHAS, LINHA_AREIA, TILE } from '../src/core/mundo.js';

const em = (mapa, col, lin) => mapa[lin * COLUNAS + col];

test('o mapa tem 45×30 blocos (1350 bytes)', () => {
  const mapa = gerarMapa();
  assert.equal(mapa.length, 1350);
  assert.equal(COLUNAS * LINHAS, 1350);
});

test('mesma semente dá o mesmo cenário; outra semente dá outro', () => {
  assert.deepEqual(gerarMapa(5), gerarMapa(5));
  assert.notDeepEqual(gerarMapa(5), gerarMapa(6));
});

test('todo número do mapa é um bloco que existe', () => {
  for (const semente of [1, 2024, 99999]) {
    for (const id of gerarMapa(semente)) assert.ok(id < NUM_TILES, `bloco ${id} não existe`);
  }
});

test('todo bloco tem 64 pixels com cores de 0 a 15', () => {
  for (let id = 0; id < NUM_TILES; id++) {
    const pix = pixelsDoTile(id);
    assert.equal(pix.length, TILE * TILE);
    for (const cor of pix) assert.ok(cor >= 0 && cor <= 15, `bloco ${id} tem cor ${cor}`);
  }
});

test('nenhum pixel dos blocos é "transparente" (cor 0)', () => {
  for (let id = 0; id < NUM_TILES; id++) {
    assert.ok(!pixelsDoTile(id).includes(0), `bloco ${id} tem pixel de cor 0`);
  }
});

test('areia só do fundo para baixo, e água só acima da areia', () => {
  const mapa = gerarMapa();
  const areia = new Set([ID.areiaTopo, ID.areia, ID.areiaFundo]);
  for (let col = 0; col < COLUNAS; col++) {
    assert.equal(em(mapa, col, LINHA_AREIA), ID.areiaTopo);
    assert.equal(em(mapa, col, LINHA_AREIA + 1), ID.areia);
    assert.equal(em(mapa, col, LINHA_AREIA + 2), ID.areiaFundo);
    assert.equal(em(mapa, col, LINHAS - 1), ID.areiaFundo);
    for (let lin = 0; lin < LINHA_AREIA; lin++) assert.ok(!areia.has(em(mapa, col, lin)));
  }
});

test('o alto do mundo é só água', () => {
  const mapa = gerarMapa();
  const agua = new Set([ID.agua4, ID.agua4a, ID.agua4b]);
  for (let col = 0; col < COLUNAS; col++) assert.ok(agua.has(em(mapa, col, 0)));
});

test('rochas existem, ficam sobre a areia e têm no máximo 3 blocos de altura', () => {
  const mapa = gerarMapa();
  const rocha = new Set([ID.rochaTopo, ID.rocha]);
  let total = 0;
  for (let col = 0; col < COLUNAS; col++) {
    let altura = 0;
    for (let lin = LINHA_AREIA - 1; lin >= 0 && rocha.has(em(mapa, col, lin)); lin--) altura++;
    assert.ok(altura <= 3, `coluna ${col} com altura ${altura}`);
    total += altura;
    // Nenhuma rocha solta mais acima, longe da areia
    for (let lin = 0; lin < LINHA_AREIA - altura; lin++) assert.ok(!rocha.has(em(mapa, col, lin)));
    // Se a coluna tem rocha, o bloco mais alto é o "topo"
    if (altura > 0) assert.equal(em(mapa, col, LINHA_AREIA - altura), ID.rochaTopo);
  }
  assert.ok(total > 0, 'o cenário deveria ter rochas');
});

test('as rochas nunca encostam nas bordas do mundo (200 sementes)', () => {
  const rocha = new Set([ID.rochaTopo, ID.rocha]);
  for (let semente = 0; semente < 200; semente++) {
    const mapa = gerarMapa(semente);
    for (let lin = 0; lin < LINHAS; lin++) {
      assert.ok(!rocha.has(em(mapa, 0, lin)), `semente ${semente}: rocha na borda esquerda`);
      assert.ok(!rocha.has(em(mapa, COLUNAS - 1, lin)), `semente ${semente}: rocha na borda direita`);
    }
  }
});
