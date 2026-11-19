// O cocô do peixe (core/coco.js, render/cocos.js): de vez em quando e 10 s depois de comer.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COCO_Y_AREIA, posicaoDaSaida, sortearIntervalo, iniciarCoco } from '../src/core/coco.js';
import { exportarJogo } from '../src/core/salvar.js';
import { criarRng } from '../src/core/rng.js';
import { desenharCocos, tamanhoDoCoco, estaApagado, SEGUNDOS_PISCANDO } from '../src/render/cocos.js';
import { desenharQuadro } from '../src/render/scene.js';
import { gerarMapa } from '../src/render/cenario.js';
import { criarCamera } from '../src/render/camera.js';
import { criarQuadro, LARGURA, ALTURA, COR_SOLIDA } from '../src/render/tela.js';
import { COR, PALETA, COLORIDOS } from '../src/render/palette.js';
import { MUNDO_LARGURA, MUNDO_ALTURA, AREIA_Y } from '../src/core/mundo.js';
import { config, montar } from './ajuda.js';

const passarReal = (aq, segundos) => {
  for (let t = 0; t < segundos; t += 0.05) aq.atualizar(0.05, 0);
};
// Peixe no meio da água, sem o cocô "de vez em quando" atrapalhando.
function umPeixe(dados = {}) {
  const t = montar(1, undefined, { dadosPeixe: { x: 120, y: 80, ...dados } });
  t.aq.peixes[0].cocoAleatorioEm = 1e9;
  return t;
}
const camera = (x = 0, y = 0) => criarCamera({
  mundoLargura: MUNDO_LARGURA, mundoAltura: MUNDO_ALTURA, janelaLargura: LARGURA, janelaAltura: ALTURA, x, y,
});

// --- Quando faz cocô --------------------------------------------------------------------------

test('10 segundos depois de comer o peixe faz cocô (e só então)', () => {
  const { aq } = umPeixe();
  const peixe = aq.peixes[0];
  peixe.saciedade = 20;
  aq.darComida();
  for (let s = 0; s < 120 && aq.graos.length > 0; s += 0.05) aq.atualizar(0.05, 0);
  assert.equal(aq.graos.length, 0, 'comeu tudo');
  assert.ok(peixe.cocoEm > 9.9 && peixe.cocoEm <= config.coco.segundosAposComer, `cocoEm ${peixe.cocoEm}`);
  assert.equal(aq.cocos.length, 0);
  passarReal(aq, 9.5);
  assert.equal(aq.cocos.length, 0, 'aos 9,5 s ainda não');
  passarReal(aq, 1);
  assert.equal(aq.cocos.length, 1, 'passados os 10 s, o cocô começou a sair');
  assert.equal(aq.cocos[0].estado, 'saindo');
});

test('uma refeição de 3 grãos dá um cocô só: a contagem recomeça a cada grão', () => {
  const { aq } = umPeixe();
  aq.peixes[0].saciedade = 20;
  aq.darComida();
  for (let s = 0; s < 120 && aq.graos.length > 0; s += 0.05) aq.atualizar(0.05, 0);
  let maximo = 0;
  for (let s = 0; s < 14; s += 0.05) {
    aq.atualizar(0.05, 0);
    maximo = Math.max(maximo, aq.cocos.length);
  }
  assert.equal(maximo, 1);
});

test('de vez em quando, sem comer: o intervalo é sorteado entre 1 e 3 minutos', () => {
  const rng = criarRng(5);
  const valores = Array.from({ length: 300 }, () => sortearIntervalo(config, rng));
  assert.ok(Math.min(...valores) >= config.coco.intervaloMinSeg);
  assert.ok(Math.max(...valores) <= config.coco.intervaloMaxSeg);
  assert.ok(Math.max(...valores) - Math.min(...valores) > 60, 'varia bastante');
});

test('sem comer, o peixe faz cocô sozinho dentro de 3 minutos, e de novo depois', () => {
  const t = montar(1, undefined, { dadosPeixe: { x: 120, y: 80 } });
  const { aq } = t;
  const nascimentos = [];
  const vistos = new Set();
  for (let s = 0; s < 600; s += 0.05) {
    aq.atualizar(0.05, 0);
    for (const c of aq.cocos) if (!vistos.has(c)) { vistos.add(c); nascimentos.push(s); }
  }
  assert.ok(nascimentos.length >= 3, `${nascimentos.length} cocôs em 10 minutos`);
  assert.ok(nascimentos[0] >= config.coco.intervaloMinSeg - 1 && nascimentos[0] <= config.coco.intervaloMaxSeg + 1, `primeiro aos ${nascimentos[0]} s`);
  for (let i = 1; i < nascimentos.length; i++) {
    const dif = nascimentos[i] - nascimentos[i - 1];
    assert.ok(dif >= config.coco.intervaloMinSeg - 1 && dif <= config.coco.intervaloMaxSeg + 1, `intervalo de ${dif} s`);
  }
});

// --- A animação -------------------------------------------------------------------------------

test('o peixe para enquanto faz cocô, o cocô sai da cauda e depois ele volta a nadar', () => {
  const { aq } = umPeixe({ direcao: 1 });
  const peixe = aq.peixes[0];
  assert.equal(iniciarCoco(aq, peixe, config, criarRng(1)), true);
  const antes = { x: peixe.x, y: peixe.y };
  const coco = aq.cocos[0];
  const saida = posicaoDaSaida(peixe);
  assert.ok(saida.x < peixe.x, 'olhando para a direita, a cauda fica à esquerda');
  assert.deepEqual([coco.x, coco.y], [saida.x, saida.y]);

  passarReal(aq, config.coco.segundosSaindo - 0.2);
  assert.deepEqual([peixe.x, peixe.y], [antes.x, antes.y], 'ficou parado');
  assert.equal(coco.estado, 'saindo');
  assert.deepEqual([coco.x, coco.y], [saida.x, saida.y], 'preso na cauda');

  passarReal(aq, 0.5); // passou do tempo de sair
  assert.equal(coco.estado, 'caindo');
  assert.equal(peixe.fazendoCoco, 0);
  passarReal(aq, 10);
  assert.ok(peixe.x !== antes.x || peixe.y !== antes.y, 'voltou a nadar');
});

test('a cauda fica do lado oposto ao que o peixe olha', () => {
  const peixe = { x: 100, y: 60, fase: 'adulto', direcao: -1 };
  assert.ok(posicaoDaSaida(peixe).x > peixe.x);
  assert.ok(posicaoDaSaida({ ...peixe, direcao: 1 }).x < peixe.x);
  assert.ok(posicaoDaSaida(peixe).y > peixe.y, 'um pouco abaixo do meio');
});

test('o cocô cai devagar, para em cima da areia, fica parado e some', () => {
  const { aq } = umPeixe({ x: 120, y: 60 });
  iniciarCoco(aq, aq.peixes[0], config, criarRng(1));
  const coco = aq.cocos[0];
  passarReal(aq, config.coco.segundosSaindo + 0.1);
  assert.equal(coco.estado, 'caindo');
  const y0 = coco.y;
  passarReal(aq, 2);
  const velocidade = (coco.y - y0) / 2;
  assert.ok(Math.abs(velocidade - config.coco.velocidadeQueda) < 1, `desce a ${velocidade} px/s`);
  passarReal(aq, 20);
  assert.equal(coco.estado, 'parado');
  assert.equal(coco.y, COCO_Y_AREIA);
  assert.ok(COCO_Y_AREIA < AREIA_Y, 'em cima da areia, não dentro');
  passarReal(aq, config.coco.segundosNaAreia + 1);
  assert.equal(aq.cocos.length, 0, 'some depois de um tempo');
});

test('só um cocô por vez por peixe, e há um máximo no aquário', () => {
  const { aq } = umPeixe();
  const peixe = aq.peixes[0];
  assert.equal(iniciarCoco(aq, peixe, config, criarRng(1)), true);
  assert.equal(iniciarCoco(aq, peixe, config, criarRng(1)), false, 'já está fazendo');
  for (let i = aq.cocos.length; i < config.coco.maximo; i++) aq.cocos.push({ estado: 'parado', tempo: 0, x: 5, y: 5 });
  peixe.fazendoCoco = 0;
  assert.equal(iniciarCoco(aq, peixe, config, criarRng(1)), false, 'cocô demais na água');
});

test('peixe morto não faz cocô; se morre no meio, o cocô solta e cai', () => {
  const { aq } = umPeixe();
  const peixe = aq.peixes[0];
  iniciarCoco(aq, peixe, config, criarRng(1));
  aq.matar(peixe);
  passarReal(aq, 0.2);
  assert.equal(aq.cocos[0].estado, 'caindo');
  assert.equal(peixe.fazendoCoco, 0);
  peixe.cocoEm = 0.1;
  peixe.cocoAleatorioEm = 0.1;
  passarReal(aq, 5);
  assert.equal(aq.cocos.length, 1, 'nenhum cocô novo');
});

test('o cocô é só enfeite: não entra no arquivo salvo nem mexe na sujeira e na saúde', () => {
  const comCoco = umPeixe();
  const semCoco = umPeixe();
  iniciarCoco(comCoco.aq, comCoco.aq.peixes[0], config, criarRng(1));
  comCoco.passar(6);
  semCoco.passar(6);
  assert.equal(comCoco.aq.sujeira, semCoco.aq.sujeira);
  assert.equal(comCoco.aq.peixes[0].saude, semCoco.aq.peixes[0].saude);
  const texto = JSON.stringify(exportarJogo(comCoco.aq, { tempoJogoMs: 0, salvoEmMs: 1 }));
  assert.ok(!texto.includes('coco') && !texto.includes('fazendoCoco'));
});

// --- O desenho --------------------------------------------------------------------------------

test('as cores do cocô existem e são sólidas', () => {
  for (const i of [COR.COCO, COR.COCO_CLARO]) {
    assert.ok(PALETA[i]);
    assert.ok(COLORIDOS.includes(i));
    assert.ok(COR_SOLIDA[i]);
  }
});

test('o cocô cresce enquanto sai da cauda: 1×1, 2×1 e 2×2', () => {
  const d = config.coco.segundosSaindo;
  const tam = (tempo) => tamanhoDoCoco({ estado: 'saindo', tempo }, config);
  assert.deepEqual(tam(0.1 * d), { largura: 1, altura: 1 });
  assert.deepEqual(tam(0.5 * d), { largura: 2, altura: 1 });
  assert.deepEqual(tam(0.9 * d), { largura: 2, altura: 2 });
  assert.deepEqual(tamanhoDoCoco({ estado: 'caindo', tempo: 0 }, config), { largura: 2, altura: 2 });
});

test('desenharCocos: marrom 2×2 com um pixel claro, cortado nas bordas da tela', () => {
  const q = criarQuadro();
  desenharCocos(q, [{ estado: 'caindo', tempo: 0, x: 50, y: 60 }], camera(0, 0), config);
  assert.equal(q.filter((c) => c === COR.COCO).length, 3);
  assert.equal(q.filter((c) => c === COR.COCO_CLARO).length, 1);
  assert.equal(q[60 * LARGURA + 50], COR.COCO_CLARO);
  const borda = criarQuadro();
  desenharCocos(borda, [{ estado: 'caindo', tempo: 0, x: -1, y: -1 }, { estado: 'caindo', tempo: 0, x: LARGURA, y: ALTURA }], camera(0, 0), config);
  assert.equal(borda.length, LARGURA * ALTURA);
});

test('o cocô parado pisca nos últimos segundos antes de sumir', () => {
  const comeco = { estado: 'parado', tempo: 2 };
  assert.equal(estaApagado(comeco, config), false, 'no começo não pisca');
  const faltando = config.coco.segundosNaAreia - SEGUNDOS_PISCANDO;
  const estados = new Set();
  for (let t = faltando; t < config.coco.segundosNaAreia; t += 0.05) estados.add(estaApagado({ estado: 'parado', tempo: t }, config));
  assert.deepEqual([...estados].sort(), [false, true], 'liga e desliga');
  assert.equal(estaApagado({ estado: 'caindo', tempo: 99 }, config), false);
});

test('a cena desenha o cocô por cima do peixe', () => {
  const mapa = gerarMapa();
  const q = criarQuadro();
  const cocos = [{ estado: 'caindo', tempo: 0, x: 70, y: 70 }];
  desenharQuadro(q, { mapa, camera: camera(0, 0), peixes: [], tempo: 0, config, cocos });
  assert.equal(q.filter((c) => c === COR.COCO).length, 3);
  const sem = criarQuadro();
  desenharQuadro(sem, { mapa, camera: camera(0, 0), peixes: [], tempo: 0, config, cocos: [] });
  assert.equal(sem.filter((c) => c === COR.COCO).length, 0);
});
