import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  gerarPlantas, desenharPlantas, balancoDaLinha, larguraOcupada, COR_VERDE, MODELOS, MODELOS_PEQUENOS, MODELOS_GRANDES,
} from '../src/render/plantas.js';
import { gerarMapa, ID } from '../src/render/cenario.js';
import { criarBolhas, EMISSORES_X } from '../src/core/bolhas.js';
import { AREIA_Y, SUPERFICIE_Y, COLUNAS, LINHA_AREIA, MUNDO_LARGURA, MUNDO_ALTURA, TILE } from '../src/core/mundo.js';
import { criarCamera } from '../src/render/camera.js';
import { criarQuadro, LARGURA, ALTURA } from '../src/render/tela.js';
import { COR } from '../src/render/palette.js';

const SEMENTES = [1, 2, 3, 42, 2024, 99999];
const CAM_Y = MUNDO_ALTURA - ALTURA; // câmera toda embaixo
const VERDES_ALGA = [COR.VERDE_ALGA, COR.ALGA_BORDA, COR.ALGA_BRILHO, COR.ALGA_MEIO, COR.ALGA_PONTA];
const pegada = (p) => {
  const largura = larguraOcupada(p.modelo);
  const esq = p.x - Math.floor(largura / 2);
  return [esq, esq + largura - 1];
};

test('plantas: 4 modelos comuns, 1 mais alto e 2 algas gigantes de uns metade do aquário', () => {
  const pequenas = Object.values(MODELOS_PEQUENOS).map((m) => m.altura).sort((x, y) => x - y);
  assert.equal(pequenas.length, 5);
  assert.ok(pequenas[4] > pequenas[3] + 4, 'o modelo alto é bem mais alto que os outros');
  const grandes = Object.values(MODELOS_GRANDES).map((m) => m.altura);
  assert.equal(grandes.length, 2);
  const coluna = AREIA_Y - SUPERFICIE_Y; // a água, da superfície à areia
  for (const h of grandes) {
    assert.ok(h >= coluna * 0.4 && h <= coluna * 0.6, `gigante com ${h} px, coluna de ${coluna}`);
    assert.ok(h >= pequenas[4] * 2, 'pelo menos o dobro da alga alta');
  }
  for (const m of Object.values(MODELOS)) {
    assert.equal(m.pix.length, m.largura * m.altura);
    assert.ok(m.pix.some((c) => c !== 0), 'tem desenho');
  }
});

test('alga gigante: só verdes da roseta, sem buracos da base ao alto', () => {
  for (const m of Object.values(MODELOS_GRANDES)) {
    assert.ok(Array.from(m.pix).every((c) => c === 0 || VERDES_ALGA.includes(c)), 'só as cores da alga');
    for (let y = 0; y < m.altura; y++) {
      const linha = Array.from(m.pix.slice(y * m.largura, (y + 1) * m.largura));
      assert.ok(linha.some((c) => c !== 0), `linha ${y} vazia`);
    }
    const verde = Array.from(m.pix).filter((c) => c === COR.VERDE_ALGA).length;
    assert.ok(verde / Array.from(m.pix).filter((c) => c !== 0).length > 0.28, 'o corpo é o verde #10AB8C');
  }
});

test('alga gigante (referência): roseta alta e estreita de folhas largas, com um vão entre elas', () => {
  for (const [nome, m] of Object.entries(MODELOS_GRANDES)) {
    const cols = [];
    for (let i = 0; i < m.pix.length; i++) if (m.pix[i] !== 0) cols.push(i % m.largura);
    const larguraReal = Math.max(...cols) - Math.min(...cols) + 1;
    assert.ok(larguraReal >= 18, `${nome}: estreita demais (${larguraReal})`);
    assert.ok(m.altura / larguraReal >= 1.6, `${nome}: devia ser bem mais alta que larga (${m.altura}×${larguraReal})`);
    // Em algum nível do meio há pelo menos duas folhas separadas por um vão.
    let comVao = false;
    for (let y = Math.floor(m.altura * 0.3); y < Math.floor(m.altura * 0.7); y++) {
      let pedacos = 0;
      let dentro = false;
      for (let x = 0; x < m.largura; x++) {
        const cheio = m.pix[y * m.largura + x] !== 0;
        if (cheio && !dentro) pedacos++;
        dentro = cheio;
      }
      if (pedacos >= 2) comVao = true;
    }
    assert.ok(comVao, `${nome}: as folhas não se separam`);
  }
});

test('alga gigante (referência): borda escura, brilhos e o degradê, só em verdes', () => {
  for (const [nome, m] of Object.entries(MODELOS_GRANDES)) {
    const usadas = new Set(Array.from(m.pix).filter((c) => c !== 0));
    for (const c of [COR.VERDE_ALGA, COR.ALGA_BORDA, COR.ALGA_BRILHO, COR.ALGA_MEIO, COR.ALGA_PONTA]) {
      assert.ok(usadas.has(c), `${nome}: falta a cor ${c}`);
    }
    // Altura média (linhas menores = mais alto): o ocre fica mais acima que o corpo verde.
    const alturaMedia = (cor) => {
      const ys = [];
      for (let i = 0; i < m.pix.length; i++) if (m.pix[i] === cor) ys.push(Math.floor(i / m.largura));
      return ys.reduce((a, b) => a + b, 0) / ys.length;
    };
    assert.ok(alturaMedia(COR.ALGA_PONTA) < alturaMedia(COR.ALGA_MEIO), `${nome}: a ponta deve ficar acima do meio`);
    assert.ok(alturaMedia(COR.ALGA_MEIO) < alturaMedia(COR.VERDE_ALGA), `${nome}: o meio deve ficar acima do corpo`);
  }
});

test('plantas: mesma semente, mesmas plantas', () => {
  const mapa = gerarMapa();
  assert.deepEqual(gerarPlantas(mapa, 5), gerarPlantas(mapa, 5));
  assert.notDeepEqual(gerarPlantas(mapa, 5), gerarPlantas(mapa, 6));
});

test('plantas: todos os modelos aparecem, com exatamente 2 gigantes bem afastadas', () => {
  for (const semente of SEMENTES) {
    const plantas = gerarPlantas(gerarMapa(semente), semente);
    assert.ok(plantas.length >= 6, `semente ${semente}: só ${plantas.length}`);
    for (const nome of Object.keys(MODELOS_PEQUENOS)) {
      assert.ok(plantas.some((p) => p.modelo === nome), `semente ${semente}: falta ${nome}`);
    }
    const gigantes = plantas.filter((p) => p.modelo in MODELOS_GRANDES);
    assert.equal(gigantes.length, 2, `semente ${semente}: gigantes`);
    assert.ok(Math.abs(gigantes[0].x - gigantes[1].x) >= 100, `semente ${semente}: gigantes coladas`);
  }
});

test('plantas: dentro do mundo, com o pé fora das rochas, longe das bolhas e sem se sobrepor', () => {
  for (const semente of SEMENTES) {
    const mapa = gerarMapa(semente);
    const plantas = gerarPlantas(mapa, semente);
    plantas.forEach((p, i) => {
      const [esq, dir] = pegada(p);
      assert.ok(esq >= 0 && dir < MUNDO_LARGURA, `semente ${semente}: planta fora do mundo`);
      assert.equal(mapa[(LINHA_AREIA - 1) * COLUNAS + Math.floor(p.x / TILE)], ID.agua, `semente ${semente}: pé da planta sobre rocha`);
      for (const e of EMISSORES_X) assert.ok(dir < e - 5 || esq > e + 5, `semente ${semente}: planta na bolha ${e}`);
      plantas.slice(i + 1).forEach((q) => {
        const [qe, qd] = pegada(q);
        assert.ok(dir < qe || esq > qd, `semente ${semente}: plantas sobrepostas`);
      });
    });
  }
});

test('desenharPlantas: a base fica na primeira linha da areia e o que sai da tela é cortado', () => {
  const camera = criarCamera({ mundoLargura: MUNDO_LARGURA, mundoAltura: MUNDO_ALTURA, janelaLargura: LARGURA, janelaAltura: ALTURA, x: 0, y: CAM_Y });
  const q = criarQuadro();
  desenharPlantas(q, [{ modelo: 'alta', x: 50 }], camera);
  const { altura } = MODELOS.alta;
  let topo = -1;
  let base = -1;
  for (let y = 0; y < ALTURA; y++) {
    if (q.slice(y * LARGURA, (y + 1) * LARGURA).some((c) => c !== 0)) { if (topo < 0) topo = y; base = y; }
  }
  assert.equal(base, AREIA_Y - CAM_Y, 'a base está na linha da areia');
  assert.equal(base - topo + 1, altura);

  // Planta na borda do mundo e planta fora da janela (a câmera está do outro lado): não dá erro.
  desenharPlantas(criarQuadro(), [{ modelo: 'coral', x: 0 }, { modelo: 'coral', x: MUNDO_LARGURA }], camera);
  const alto = criarQuadro();
  desenharPlantas(alto, [{ modelo: 'alta', x: 50 }], criarCamera({ mundoLargura: MUNDO_LARGURA, mundoAltura: MUNDO_ALTURA, janelaLargura: LARGURA, janelaAltura: ALTURA, x: 200, y: 0 }));
  assert.ok(alto.every((c) => c === 0), 'planta fora da janela não desenha nada');
});

test('plantas pequenas: verdes (variações do verde das algas), uma variação por planta, em rodízio', () => {
  const mapa = gerarMapa();
  const plantas = gerarPlantas(mapa);
  const pequenas = plantas.filter((p) => !(p.modelo in MODELOS_GRANDES));
  assert.ok(pequenas.length >= 5);
  assert.ok(pequenas.every((p) => [0, 1, 2].includes(p.tom)), 'toda pequena tem uma variação');
  assert.equal(new Set(pequenas.map((p) => p.tom)).size, 3, 'as três variações aparecem');
  assert.ok(plantas.filter((p) => p.modelo in MODELOS_GRANDES).every((p) => p.tom === undefined), 'as gigantes não variam');

  const camera = criarCamera({ mundoLargura: MUNDO_LARGURA, mundoAltura: MUNDO_ALTURA, janelaLargura: LARGURA, janelaAltura: ALTURA, x: 0, y: CAM_Y });
  for (const tom of [0, 1, 2]) {
    const q = criarQuadro();
    desenharPlantas(q, [{ modelo: 'coral', x: 50, tom }], camera);
    const usadas = new Set(Array.from(q).filter((c) => c !== 0));
    assert.ok(usadas.size >= 1 && [...usadas].every((c) => COR.VERDES_PLANTA.includes(c)), `tom ${tom}: só os verdes das plantas`);
  }
  // Variações diferentes dão cores diferentes.
  const corDoTalo = (tom) => {
    const q = criarQuadro();
    desenharPlantas(q, [{ modelo: 'fita', x: 50, tom }], camera);
    return Array.from(q).find((c) => c !== 0);
  };
  assert.equal(new Set([0, 1, 2].map(corDoTalo)).size, 3);
});

test('algas gigantes não passam pela variação de verde das pequenas', () => {
  const camera = criarCamera({ mundoLargura: MUNDO_LARGURA, mundoAltura: MUNDO_ALTURA, janelaLargura: LARGURA, janelaAltura: ALTURA, x: 0, y: CAM_Y });
  const q = criarQuadro();
  desenharPlantas(q, [{ modelo: 'grande1', x: 60 }], camera);
  assert.ok(Array.from(q).every((c) => c === 0 || VERDES_ALGA.includes(c)));
  assert.ok(!Array.from(q).some((c) => COR.VERDES_PLANTA.includes(c)));
});

test('as duas algas são a mesma planta: a menor é um pouco mais baixa e tem as folhas em outra ordem', () => {
  const g1 = MODELOS_GRANDES.grande1;
  const g2 = MODELOS_GRANDES.grande2;
  assert.ok(g2.altura < g1.altura && g2.altura >= g1.altura * 0.7, `menor, mas só um pouco (${g2.altura} contra ${g1.altura})`);
  // Mesmo tipo de planta: as mesmas cores, as mesmas proporções de roseta (alta e estreita).
  const cores = (m) => new Set(Array.from(m.pix).filter((c) => c !== 0));
  assert.deepEqual([...cores(g1)].sort(), [...cores(g2)].sort());
  // Folhas em outra ordem (não é só o espelho): a ponta mais alta fica de lados opostos...
  const lado = (m) => {
    let soma = 0;
    let n = 0;
    for (let y = 0; y < Math.floor(m.altura * 0.2); y++) {
      for (let x = 0; x < m.largura; x++) if (m.pix[y * m.largura + x] !== 0) { soma += x - (m.largura - 1) / 2; n++; }
    }
    return soma / n;
  };
  assert.ok(lado(g1) < -1 && lado(g2) > 1, `as pontas altas devem ficar de lados opostos (${lado(g1).toFixed(1)} e ${lado(g2).toFixed(1)})`);
  // ...e o desenho da menor não é o da maior espelhado.
  const espelhado = (m) => Array.from({ length: m.altura }, (_, y) => Array.from({ length: m.largura }, (_, x) => m.pix[y * m.largura + (m.largura - 1 - x)]).join());
  const linhasIguais = espelhado(g2).filter((l, y) => y < g1.altura && l === espelhado(g1)[y]).length;
  assert.ok(linhasIguais < 3, `a menor não pode ser a maior espelhada (${linhasIguais} linhas iguais)`);
});

// --- Bolhas: nascentes afastadas e tempos irregulares -----------------------------------------

test('bolhas: as nascentes são bem afastadas', () => {
  assert.ok(Math.abs(EMISSORES_X[1] - EMISSORES_X[0]) >= 150);
});

test('bolhas: os intervalos entre bolhas são irregulares (rajadas e pausas)', () => {
  const b = criarBolhas({ aquecimento: 0 });
  const nascimentos = [];
  const vistas = new Set();
  for (let t = 0; t < 600; t += 0.02) {
    b.atualizar(0.02);
    for (const o of b.lista) {
      if (!vistas.has(o) && Math.abs(o.xBase - EMISSORES_X[0]) < 3) { vistas.add(o); nascimentos.push(t); }
    }
  }
  const intervalos = nascimentos.slice(1).map((t, i) => t - nascimentos[i]);
  assert.ok(intervalos.length > 100);
  assert.ok(Math.min(...intervalos) < 0.25, 'tem rajadas (bolhas coladas)');
  assert.ok(Math.max(...intervalos) > 2.5, 'tem pausas longas');
});

test('bolhas: as velocidades variam bastante', () => {
  const b = criarBolhas({ aquecimento: 0 });
  const velocidades = new Set();
  for (let i = 0; i < 400; i++) { b.atualizar(0.05); b.lista.forEach((o) => velocidades.add(o.velocidade)); }
  const v = [...velocidades];
  assert.ok(Math.max(...v) - Math.min(...v) > 10, 'umas devagar, outras rápidas');
});

// --- Balanço da água -------------------------------------------------------------------------

test('balanço: a base não se mexe e o alto balança mais que o meio', () => {
  for (const nome of Object.keys(MODELOS)) {
    const { altura } = MODELOS[nome];
    for (let t = 0; t < 20; t += 0.13) assert.equal(balancoDaLinha(nome, 0, 80, t), 0, `${nome}: base mexeu`);
    const maximo = (acima) => {
      let m = 0;
      for (let t = 0; t < 40; t += 0.05) m = Math.max(m, Math.abs(balancoDaLinha(nome, acima, 80, t)));
      return m;
    };
    assert.ok(maximo(altura - 1) >= maximo(Math.floor(altura / 2)), `${nome}: o alto deve balançar mais`);
  }
});

test('balanço: micro movimento. Pequenas mexem 1 px e as gigantes até uns 3 ou 4 px, nunca mais', () => {
  for (const [nome, m] of Object.entries(MODELOS)) {
    let maior = 0;
    for (let t = 0; t < 60; t += 0.05) {
      for (let acima = 0; acima < m.altura; acima++) maior = Math.max(maior, Math.abs(balancoDaLinha(nome, acima, 123, t)));
    }
    assert.ok(maior >= 1, `${nome}: nunca se mexe`);
    assert.ok(maior <= (nome in MODELOS_GRANDES ? 4 : 1), `${nome}: balança ${maior} px`);
  }
});

test('balanço: muda com o tempo, é igual com o mesmo tempo e difere de uma planta para outra', () => {
  const ponta = (x, t) => balancoDaLinha('grande1', 59, x, t);
  assert.equal(ponta(50, 3.3), ponta(50, 3.3));
  const noTempo = new Set(Array.from({ length: 80 }, (_, i) => ponta(50, i * 0.1)));
  assert.ok(noTempo.size >= 4, 'vai e volta');
  const entrePlantas = new Set(Array.from({ length: 30 }, (_, i) => ponta(i * 25, 2)));
  assert.ok(entrePlantas.size >= 3, 'cada planta tem a sua fase');
});

test('desenharPlantas: com tempo diferente o alto muda de lugar e a base fica igual', () => {
  const camera = criarCamera({ mundoLargura: MUNDO_LARGURA, mundoAltura: MUNDO_ALTURA, janelaLargura: LARGURA, janelaAltura: ALTURA, x: 0, y: CAM_Y });
  const plantas = [{ modelo: 'grande1', x: 60 }];
  const a = criarQuadro();
  const b = criarQuadro();
  desenharPlantas(a, plantas, camera, 0);
  let t = 0.5;
  while (balancoDaLinha('grande1', 59, 60, t) === balancoDaLinha('grande1', 59, 60, 0)) t += 0.1;
  desenharPlantas(b, plantas, camera, t);
  const linha = (q, y) => Array.from(q.slice(y * LARGURA, (y + 1) * LARGURA)).join();
  const topo = AREIA_Y - CAM_Y - (MODELOS.grande1.altura - 1);
  assert.equal(linha(a, AREIA_Y - CAM_Y), linha(b, AREIA_Y - CAM_Y), 'base igual');
  assert.notEqual(linha(a, topo), linha(b, topo), 'o alto balançou');
  assert.equal(a.filter((c) => c !== 0).length, b.filter((c) => c !== 0).length, 'mesmo número de pixels');
});
