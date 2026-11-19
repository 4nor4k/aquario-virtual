import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gerarMapa, ID, NUM_TILES, pixelsDoTile, VARIANTES_AREIA } from '../src/render/cenario.js';
import { PALETA } from '../src/render/palette.js';
import { COLUNAS, LINHAS, LINHA_AREIA, TILE } from '../src/core/mundo.js';

const em = (mapa, col, lin) => mapa[lin * COLUNAS + col];

test('o mapa tem 30×19 blocos (570 bytes)', () => {
  const mapa = gerarMapa();
  assert.equal(mapa.length, 570);
  assert.equal(COLUNAS * LINHAS, 570);
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

test('todo bloco tem 64 pixels com cores que existem na paleta', () => {
  for (let id = 0; id < NUM_TILES; id++) {
    const pix = pixelsDoTile(id);
    assert.equal(pix.length, TILE * TILE);
    for (const cor of pix) assert.ok(Number.isInteger(cor) && cor >= 0 && cor < PALETA.length, `bloco ${id} tem cor ${cor}`);
  }
});

test('nenhum pixel dos blocos é "transparente" (cor 0)', () => {
  for (let id = 0; id < NUM_TILES; id++) {
    assert.ok(!pixelsDoTile(id).includes(0), `bloco ${id} tem pixel de cor 0`);
  }
});

test('areia só do fundo para baixo (3 camadas), e água só acima da areia', () => {
  const mapa = gerarMapa();
  const todasAsAreias = new Set([...VARIANTES_AREIA.topo, ...VARIANTES_AREIA.meio, ...VARIANTES_AREIA.fundo]);
  assert.equal(LINHAS - LINHA_AREIA, 3, 'a areia tem 3 camadas');
  for (let col = 0; col < COLUNAS; col++) {
    assert.ok(VARIANTES_AREIA.topo.includes(em(mapa, col, LINHA_AREIA)), 'topo');
    assert.ok(VARIANTES_AREIA.meio.includes(em(mapa, col, LINHA_AREIA + 1)), 'meio');
    assert.ok(VARIANTES_AREIA.fundo.includes(em(mapa, col, LINHA_AREIA + 2)), 'fundo');
    assert.ok(VARIANTES_AREIA.fundo.includes(em(mapa, col, LINHAS - 1)), 'última linha');
    for (let lin = 0; lin < LINHA_AREIA; lin++) assert.ok(!todasAsAreias.has(em(mapa, col, lin)));
  }
});

test('areia: cor de areia lisa com grãos de tons diferentes, em 3 variações por camada', () => {
  const COR_AREIA = [6, 7];
  for (const [camada, ids] of Object.entries(VARIANTES_AREIA)) {
    assert.equal(new Set(ids).size, 3, `${camada}: 3 variações`);
    const desenhos = ids.map((id) => Array.from(pixelsDoTile(id)).join());
    assert.equal(new Set(desenhos).size, 3, `${camada}: as variações são diferentes`);
  }
  const tonsDeGrao = new Set();
  for (const id of [...VARIANTES_AREIA.topo, ...VARIANTES_AREIA.meio, ...VARIANTES_AREIA.fundo]) {
    const pix = Array.from(pixelsDoTile(id));
    const base = pix.filter((c) => COR_AREIA.includes(c)).length;
    assert.ok(base >= 40, `bloco ${id}: tem de ser majoritariamente areia lisa (${base} de 64)`);
    pix.filter((c) => c >= 24 && c <= 26).forEach((c) => tonsDeGrao.add(c));
    assert.ok(pix.filter((c) => c !== pix[40] && c !== 1).length >= 6, `bloco ${id}: poucos grãos`);
  }
  assert.equal(tonsDeGrao.size, 3, 'grãos claros, dourados e acinzentados aparecem');
});

test('areia: sorteio das variações é fixo para a mesma semente e não mexe nas rochas', () => {
  assert.deepEqual(gerarMapa(5), gerarMapa(5));
  const rochas = (m) => Array.from(m).map((id) => (id === ID.rocha || id === ID.rochaTopo ? id : 0));
  assert.deepEqual(rochas(gerarMapa(5)), rochas(gerarMapa(5)));
  const usadas = new Set();
  const mapa = gerarMapa();
  for (let col = 0; col < COLUNAS; col++) usadas.add(em(mapa, col, LINHA_AREIA));
  assert.ok(usadas.size >= 2, 'as variações se misturam ao longo da areia');
});

test('o alto do mundo é só água', () => {
  const mapa = gerarMapa();
  for (let col = 0; col < COLUNAS; col++) assert.equal(em(mapa, col, 0), ID.agua);
});

test('pedras existem, ficam sobre a areia e são pequenas: só 1 bloco (8 px) de altura', () => {
  const mapa = gerarMapa();
  const rocha = new Set([ID.rochaTopo, ID.rocha]);
  let total = 0;
  for (let col = 0; col < COLUNAS; col++) {
    let altura = 0;
    for (let lin = LINHA_AREIA - 1; lin >= 0 && rocha.has(em(mapa, col, lin)); lin--) altura++;
    assert.ok(altura <= 1, `coluna ${col} com altura ${altura}: pedra grande demais`);
    total += altura;
    // Nenhuma rocha solta mais acima, longe da areia
    for (let lin = 0; lin < LINHA_AREIA - altura; lin++) assert.ok(!rocha.has(em(mapa, col, lin)));
    // Se a coluna tem rocha, o bloco mais alto é o "topo"
    if (altura > 0) assert.equal(em(mapa, col, LINHA_AREIA - altura), ID.rochaTopo);
  }
  assert.ok(total >= 5 && total <= 10, `5 pedrinhas de 1 ou 2 blocos: ${total} colunas`);
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
