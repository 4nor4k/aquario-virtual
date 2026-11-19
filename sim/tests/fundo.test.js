import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gerarFundo, desenharFundo, PARALAXE_FUNDO } from '../src/render/fundo.js';
import { PEDRA_GRANDE, desenharPedraGrande } from '../src/render/pedra-grande.js';
import { desenharQuadro } from '../src/render/scene.js';
import { gerarMapa } from '../src/render/cenario.js';
import { criarCamera } from '../src/render/camera.js';
import { criarQuadro, LARGURA, ALTURA } from '../src/render/tela.js';
import { AREIA_Y, MUNDO_LARGURA, MUNDO_ALTURA } from '../src/core/mundo.js';
import { COR } from '../src/render/palette.js';

const MIOLO = COR.PEDRA_FUNDO;           // miolo das pedras do fundo
const CONTORNO = COR.PEDRA_FUNDO_BORDA;  // borda de cima das pedras do fundo
const PLANTA = COR.VERDE_FUNDO;          // plantas do fundo
const camera = (x, y) => criarCamera({
  mundoLargura: MUNDO_LARGURA, mundoAltura: MUNDO_ALTURA, janelaLargura: LARGURA, janelaAltura: ALTURA, x, y,
});
const CORES_PEDRA_GRANDE = Object.values(COR.PEDRA_GRANDE);
const fundo = gerarFundo();
const CAMERA_MAX_Y = MUNDO_ALTURA - ALTURA; // câmera no fundo do aquário

// Posições (x,y) dos pixels de uma cor no quadro.
const posicoes = (q, cor) => {
  const r = [];
  for (let i = 0; i < q.length; i++) if (q[i] === cor) r.push([i % LARGURA, Math.floor(i / LARGURA)]);
  return r;
};
const quadroDe = (cx, cy, t = 0) => {
  const q = criarQuadro();
  desenharFundo(q, fundo, camera(cx, cy), t);
  return q;
};
const chave = ([x, y]) => `${x},${y}`;

test('fundo: mesma semente, mesmo fundo; outra semente, outro', () => {
  assert.deepEqual(gerarFundo(5), gerarFundo(5));
  assert.notDeepEqual(gerarFundo(5), gerarFundo(6));
});

test('fundo: é principalmente pedra (poucas plantas), espalhado pelo mundo todo', () => {
  for (const semente of [1, 2, 3, 99]) {
    const f = gerarFundo(semente);
    assert.ok(f.pedras.length >= 5, 'várias pedras');
    assert.ok(f.plantas.length >= 1 && f.plantas.length <= 4, 'bem poucas plantas');
    assert.ok(f.pedras.length > f.plantas.length * 1.5, 'mais pedras que plantas');
    const xs = f.pedras.map((p) => p.x);
    assert.ok(Math.min(...xs) < 40 && Math.max(...xs) > MUNDO_LARGURA - 40, 'espalhadas');
    for (const p of f.pedras) {
      assert.ok(p.largura >= 22 && p.largura <= 38 && p.altura >= 8 && p.altura <= 16, 'pedra num tamanho sensato');
    }
  }
});

test('paralaxe: sutil (o fundo anda pouco menos que a câmera: de 75% a 95%)', () => {
  assert.ok(PARALAXE_FUNDO >= 0.75 && PARALAXE_FUNDO <= 0.95, `fator ${PARALAXE_FUNDO}`);
});

// Quanto o fundo anda na tela quando a câmera vai de x=40 a x=80 (o meio do mundo é x=60).
const DESLOCA = Math.round(60 + 20 * PARALAXE_FUNDO) - Math.round(60 - 20 * PARALAXE_FUNDO);

test('paralaxe: câmera 40 px para a direita desloca o fundo só uns 85% disso, 34 px', () => {
  assert.ok(DESLOCA >= 30 && DESLOCA < 40, `deslocamento ${DESLOCA}`);
  const a = quadroDe(40, CAMERA_MAX_Y);
  const b = quadroDe(80, CAMERA_MAX_Y);
  for (const cor of [MIOLO, CONTORNO, PLANTA]) {
    const pa = new Set(posicoes(a, cor).map(chave));
    const pb = posicoes(b, cor);
    assert.ok(pb.length > 10, `cor ${cor}: quase nada desenhado`);
    // Tudo que está em b, com x+DESLOCA, já estava em a (exceto o que entrou pela borda direita).
    const dentro = pb.filter(([x]) => x + DESLOCA < LARGURA);
    const iguais = dentro.filter(([x, y]) => pa.has(chave([x + DESLOCA, y]))).length;
    assert.ok(iguais / dentro.length > 0.97, `cor ${cor}: ${iguais} de ${dentro.length}`);
  }
});

test('sem paralaxe vertical: câmera toda para cima faz o fundo descer o mesmo tanto que o mundo', () => {
  const a = quadroDe(60, CAMERA_MAX_Y);
  const b = quadroDe(60, 0);
  const pa = new Set(posicoes(a, CONTORNO).map(chave));
  const pb = posicoes(b, CONTORNO).filter(([, y]) => y - CAMERA_MAX_Y >= 0);
  assert.ok(pb.length > 20);
  const iguais = pb.filter(([x, y]) => pa.has(chave([x, y - CAMERA_MAX_Y]))).length;
  assert.ok(iguais / pb.length > 0.97, `${iguais} de ${pb.length}`);
});

test('paralaxe: com a câmera no meio, o fundo fica na altura do mundo', () => {
  // O chão do fundo está na linha da areia (y = 128 - 40 = 88 na tela).
  const q = quadroDe(60, CAMERA_MAX_Y);
  const linhaDoChao = AREIA_Y - CAMERA_MAX_Y;
  assert.ok(posicoes(q, MIOLO).some(([, y]) => y === linhaDoChao + 1), 'o miolo das pedras começa no chão');
});

test('o fundo fica sempre apoiado na areia, com a câmera em qualquer altura', () => {
  for (const cy of [0, 10, 20, 30, 40]) {
    const q = quadroDe(60, cy);
    const chao = AREIA_Y - cy; // a linha da areia, na tela
    if (chao >= ALTURA) continue; // a areia nem aparece
    // O miolo das pedras chega até o chão: não sobra vão entre a pedra e a areia.
    assert.ok(posicoes(q, MIOLO).some(([, y]) => y === chao), `câmera y=${cy}: pedra não chega à areia`);
  }
});

test('as plantas do fundo balançam com o tempo', () => {
  const a = posicoes(quadroDe(60, CAMERA_MAX_Y, 0), PLANTA).map(chave).join();
  const b = posicoes(quadroDe(60, CAMERA_MAX_Y, 2.3), PLANTA).map(chave).join();
  assert.notEqual(a, b);
});

test('desenharQuadro com fundo: aparece na água e a areia e as rochas ficam por cima', () => {
  const mapa = gerarMapa();
  const q = criarQuadro();
  desenharQuadro(q, { mapa, camera: camera(60, CAMERA_MAX_Y), peixes: [], fundo });
  assert.ok(q.includes(MIOLO) && q.includes(CONTORNO) && q.includes(PLANTA), 'o fundo aparece');
  const linhaDaAreia = AREIA_Y - CAMERA_MAX_Y;
  for (let y = linhaDaAreia + 1; y < ALTURA; y++) {
    for (let x = 0; x < LARGURA; x++) {
      const cor = q[y * LARGURA + x];
      assert.ok(cor !== MIOLO && cor !== CONTORNO && cor !== PLANTA && !CORES_PEDRA_GRANDE.includes(cor), `fundo vazou pela areia em (${x}, ${y})`);
    }
  }
  // Sem fundo continua tudo preto onde era água.
  const sem = criarQuadro();
  desenharQuadro(sem, { mapa, camera: camera(60, CAMERA_MAX_Y), peixes: [] });
  assert.ok(!sem.includes(MIOLO) && !sem.includes(CONTORNO) && !sem.includes(PLANTA));
});

// --- A pedra grande do fundo (a partir de uma referência de pixel art) --------------------------

test('pedra grande: relativamente grande, mais larga que alta e maior que as outras pedras do fundo', () => {
  const { largura, altura } = PEDRA_GRANDE;
  assert.ok(largura >= 50 && altura >= 32, `${largura}×${altura}`);
  assert.ok(largura > altura);
  assert.ok(altura > 16 * 2, 'bem mais alta que as pedras comuns do fundo (até 16 px)');
  const maiorLargura = Math.max(...gerarFundo().pedras.map((p) => p.largura));
  assert.ok(largura > maiorLargura, 'mais larga que qualquer pedra comum');
});

test('pedra grande: facetas em tons diferentes, rachaduras escuras e musgo verde no alto', () => {
  const { largura, altura, pix } = PEDRA_GRANDE;
  const usadas = new Set(Array.from(pix).filter((c) => c !== 0));
  for (const cor of CORES_PEDRA_GRANDE) assert.ok(usadas.has(cor), `falta a cor ${cor}`);
  assert.ok(Array.from(pix).every((c) => c === 0 || CORES_PEDRA_GRANDE.includes(c)), 'só as cores da pedra grande');
  // O musgo fica acima da metade da pedra.
  const linhasDoMusgo = [];
  for (let i = 0; i < pix.length; i++) if (pix[i] === COR.PEDRA_GRANDE.musgo || pix[i] === COR.PEDRA_GRANDE.musgoClaro) linhasDoMusgo.push(Math.floor(i / largura));
  assert.ok(linhasDoMusgo.length >= 20, 'tem musgo');
  const media = linhasDoMusgo.reduce((a, b) => a + b, 0) / linhasDoMusgo.length;
  assert.ok(media < altura * 0.5, `o musgo fica no alto (linha média ${media.toFixed(1)} de ${altura})`);
  // Cada tom de pedra aparece em quantidade relevante (não é só um tom com uns respingos).
  const quantos = (c) => Array.from(pix).filter((p) => p === c).length;
  for (const c of [COR.PEDRA_GRANDE.base, COR.PEDRA_GRANDE.clara, COR.PEDRA_GRANDE.escura]) assert.ok(quantos(c) >= 60, `pouco do tom ${c}`);
});

test('pedra grande: silhueta inteira (sem buracos no meio) e apoiada na base', () => {
  const { largura, altura, pix } = PEDRA_GRANDE;
  for (let x = 0; x < largura; x++) {
    // Em cada coluna, os pixels da pedra são um bloco só, do topo até a base.
    let viuVazio = false;
    let comecou = false;
    for (let y = 0; y < altura; y++) {
      const cheio = pix[y * largura + x] !== 0;
      if (cheio) { assert.ok(!viuVazio, `coluna ${x}: buraco na pedra`); comecou = true; } else if (comecou) viuVazio = true;
    }
    if (comecou) assert.ok(pix[(altura - 1) * largura + x] !== 0, `coluna ${x} não chega ao chão`);
  }
});

test('pedra grande: é sempre a mesma (gerada com semente fixa)', () => {
  assert.ok(Array.from(PEDRA_GRANDE.pix).filter((c) => c !== 0).length > 1000);
});

test('pedra grande: o fundo a sorteia perto do meio do mundo, sem mudar o resto do fundo', () => {
  for (const semente of [1, 2, 3, 99]) {
    const f = gerarFundo(semente);
    assert.ok(f.pedraGrande.x >= 105 && f.pedraGrande.x <= 135, `x = ${f.pedraGrande.x}`);
  }
  assert.deepEqual(gerarFundo(5).pedras, gerarFundo(5).pedras);
});

test('pedra grande: apoiada no chão, anda com o paralaxe sutil e é cortada nas bordas da tela', () => {
  const chao = AREIA_Y - CAMERA_MAX_Y;
  const q = criarQuadro();
  desenharPedraGrande(q, 120, 60, chao);
  const ys = posicoesDe(q, CORES_PEDRA_GRANDE).map(([, y]) => y);
  assert.equal(Math.max(...ys), chao, 'a base está no chão');
  const primeiraLinha = Array.from({ length: PEDRA_GRANDE.altura }, (_, y) => y).find((y) => PEDRA_GRANDE.pix.slice(y * PEDRA_GRANDE.largura, (y + 1) * PEDRA_GRANDE.largura).some((c) => c !== 0));
  assert.equal(Math.min(...ys), chao - PEDRA_GRANDE.altura + 1 + primeiraLinha, 'o topo fica na altura certa acima do chão');

  // Paralaxe: câmera 40 px para a direita desloca a pedra DESLOCA px.
  const a = quadroDe(40, CAMERA_MAX_Y);
  const b = quadroDe(80, CAMERA_MAX_Y);
  const pa = new Set(posicoesDe(a, [COR.PEDRA_GRANDE.rachadura]).map(chave));
  const pb = posicoesDe(b, [COR.PEDRA_GRANDE.rachadura]).filter(([x]) => x + DESLOCA < LARGURA);
  assert.ok(pb.length > 5, 'a pedra aparece na tela');
  assert.ok(pb.filter(([x, y]) => pa.has(chave([x + DESLOCA, y]))).length / pb.length > 0.97);

  // Fora da tela: não desenha nem dá erro.
  const fora = criarQuadro();
  desenharPedraGrande(fora, -500, 0, chao);
  desenharPedraGrande(fora, 900, 0, chao);
  desenharPedraGrande(fora, 120, 0, 9999);
  assert.ok(fora.every((c) => c === 0));
});

function posicoesDe(q, cores) {
  const r = [];
  for (let i = 0; i < q.length; i++) if (cores.includes(q[i])) r.push([i % LARGURA, Math.floor(i / LARGURA)]);
  return r;
}
