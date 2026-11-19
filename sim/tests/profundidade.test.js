// Profundidade: o peixe passa às vezes atrás e às vezes na frente das algas gigantes e da pedra grande.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sortearPlano } from '../src/core/profundidade.js';
import { PLANOS } from '../src/core/fish.js';
import { criarRng } from '../src/core/rng.js';
import {
  atualizarPlanos, podeTrocarDePlano, peixeSobreAlgaGrande, peixeSobrePedraGrande,
} from '../src/render/profundidade.js';
import { desenharQuadro } from '../src/render/scene.js';
import { gerarMapa } from '../src/render/cenario.js';
import { gerarFundo } from '../src/render/fundo.js';
import { criarCamera } from '../src/render/camera.js';
import { criarQuadro, LARGURA, ALTURA } from '../src/render/tela.js';
import { COR } from '../src/render/palette.js';
import { MUNDO_LARGURA, MUNDO_ALTURA } from '../src/core/mundo.js';
import { config, montar } from './ajuda.js';

const camera = (x, y) => criarCamera({
  mundoLargura: MUNDO_LARGURA, mundoAltura: MUNDO_ALTURA, janelaLargura: LARGURA, janelaAltura: ALTURA, x, y,
});
const CORPO = COR.PEIXE.vermelho.vivo.corpo;
const contar = (q, cor) => q.reduce((n, c) => n + (c === cor ? 1 : 0), 0);
const peixeEm = (x, y, plano = 'frente', extra = {}) => ({
  id: 1, especie: 'beta', cor: 'vermelho', fase: 'adulto', estado: 'saudavel', x, y, direcao: 1, tempoAnimacao: 0, plano, planoDesejado: plano, ...extra,
});

// Uma alga gigante em x = 80 (o desenho tem ~60 px de altura, saindo da areia).
const PLANTAS = [{ modelo: 'grande1', x: 80 }];
const FUNDO = gerarFundo();
const CENTRO = { x: (MUNDO_LARGURA - LARGURA) / 2, y: MUNDO_ALTURA - ALTURA }; // a câmera do começo do jogo

// --- O sorteio --------------------------------------------------------------------------------

test('sortearPlano: 20% no fundo, 30% no meio e 50% na frente (valores do config)', () => {
  const rng = criarRng(11);
  const n = { fundo: 0, meio: 0, frente: 0 };
  for (let i = 0; i < 10000; i++) n[sortearPlano(rng, config.profundidade)]++;
  assert.ok(Math.abs(n.fundo / 10000 - config.profundidade.chanceNoFundo) < 0.03, `fundo ${n.fundo}`);
  assert.ok(Math.abs(n.meio / 10000 - config.profundidade.chanceNoMeio) < 0.03, `meio ${n.meio}`);
  assert.ok(n.frente > n.fundo && n.frente > n.meio, 'a maioria das vezes passa na frente');
  assert.deepEqual(PLANOS, ['fundo', 'meio', 'frente']);
});

test('o peixe sorteia o plano de novo a cada trajeto: com o tempo passa pelos três', () => {
  const { aq } = montar(1, undefined, { dadosPeixe: { x: 120, y: 80 } });
  const peixe = aq.peixes[0];
  assert.equal(peixe.planoDesejado, 'frente', 'começa na frente');
  const vistos = new Set();
  let trajetos = 0;
  for (let s = 0; s < 600; s += 0.05) {
    aq.atualizar(0.05, 0);
    vistos.add(peixe.planoDesejado);
    trajetos = peixe.trajeto;
  }
  assert.deepEqual([...vistos].sort(), ['frente', 'fundo', 'meio']);
  assert.ok(trajetos > 20, `${trajetos} trajetos em 10 minutos`);
});

test('o plano só muda quando começa um trajeto novo (não no meio do caminho)', () => {
  const { aq } = montar(1, undefined, { dadosPeixe: { x: 120, y: 80 } });
  const peixe = aq.peixes[0];
  let trajeto = peixe.trajeto;
  let plano = peixe.planoDesejado;
  for (let s = 0; s < 300; s += 0.05) {
    aq.atualizar(0.05, 0);
    if (peixe.trajeto === trajeto) assert.equal(peixe.planoDesejado, plano, 'mesmo trajeto, mesmo plano');
    trajeto = peixe.trajeto;
    plano = peixe.planoDesejado;
  }
});

test('peixe morto volta para a frente de tudo', () => {
  const { aq } = montar(1, undefined, { dadosPeixe: { x: 120, y: 80 } });
  const peixe = aq.peixes[0];
  peixe.planoDesejado = peixe.plano = 'fundo';
  aq.matar(peixe);
  aq.atualizar(0.05, 0);
  assert.equal(peixe.plano, 'frente');
  atualizarPlanos([{ ...peixe, plano: 'fundo' }], { plantas: PLANTAS, fundo: FUNDO, camera: camera(0, 32) });
});

// --- O desenho --------------------------------------------------------------------------------

function cena(peixe, { plantas = [], fundo, cam = camera(0, 32) } = {}) {
  const q = criarQuadro();
  desenharQuadro(q, { mapa: gerarMapa(), camera: cam, peixes: [peixe], plantas, fundo, tempo: 0 });
  return q;
}

test('atrás da alga gigante o peixe fica parcialmente escondido; na frente aparece inteiro', () => {
  // A alga fica em x = 80; o peixe (adulto, 20×14) bem no meio do talo, a 100 de altura.
  const cam = camera(40, 32);
  const frente = contar(cena(peixeEm(80, 100, 'frente'), { plantas: PLANTAS, cam }), CORPO);
  const meio = contar(cena(peixeEm(80, 100, 'meio'), { plantas: PLANTAS, cam }), CORPO);
  const fundo = contar(cena(peixeEm(80, 100, 'fundo'), { plantas: PLANTAS, cam }), CORPO);
  const semAlga = contar(cena(peixeEm(80, 100, 'meio'), { cam }), CORPO);
  assert.ok(frente > 0);
  assert.equal(frente, semAlga, 'na frente é igual a sem alga nenhuma');
  assert.ok(meio < frente, `atrás da alga perde pixels (${meio} contra ${frente})`);
  assert.equal(fundo, meio, 'no fundo também fica atrás da alga');
});

test('atrás da pedra grande o peixe fica escondido; no meio ou na frente aparece inteiro', () => {
  const x = FUNDO.pedraGrande.x;
  const cam = camera(CENTRO.x, CENTRO.y); // câmera no meio: a pedra fica onde está no mundo
  const noFundo = contar(cena(peixeEm(x, 105, 'fundo'), { fundo: FUNDO, cam }), CORPO);
  const noMeio = contar(cena(peixeEm(x, 105, 'meio'), { fundo: FUNDO, cam }), CORPO);
  const naFrente = contar(cena(peixeEm(x, 105, 'frente'), { fundo: FUNDO, cam }), CORPO);
  assert.ok(naFrente > 0);
  assert.equal(noMeio, naFrente, 'entre a pedra e as algas: na frente da pedra');
  assert.ok(noFundo < naFrente, `atrás da pedra perde pixels (${noFundo} contra ${naFrente})`);
});

test('peixe sem plano (como nos desenhos de antes) é desenhado na frente', () => {
  const sem = peixeEm(80, 100);
  delete sem.plano;
  const q = cena(sem, { plantas: PLANTAS, cam: camera(40, 32) });
  assert.equal(contar(q, CORPO), contar(cena(peixeEm(80, 100, 'frente'), { plantas: PLANTAS, cam: camera(40, 32) }), CORPO));
});

// --- Quando troca -----------------------------------------------------------------------------

test('detecção: o corpo do peixe toca nos pixels da alga (e não só numa caixa em volta)', () => {
  const ctx = { plantas: PLANTAS, fundo: FUNDO, camera: camera(40, 32) };
  assert.equal(peixeSobreAlgaGrande(peixeEm(80, 100), ctx), true, 'no meio do talo');
  assert.equal(peixeSobreAlgaGrande(peixeEm(200, 100), ctx), false, 'longe');
  assert.equal(peixeSobreAlgaGrande(peixeEm(80, 40), ctx), false, 'acima da ponta da alga');
  assert.equal(peixeSobrePedraGrande(peixeEm(FUNDO.pedraGrande.x, 105), { fundo: FUNDO, camera: camera(CENTRO.x, CENTRO.y) }), true);
  assert.equal(peixeSobrePedraGrande(peixeEm(10, 50), { fundo: FUNDO, camera: camera(CENTRO.x, CENTRO.y) }), false);
});

test('só troca de plano quando muda de lado em relação ao que está sobre ele', () => {
  const ctx = { plantas: PLANTAS, fundo: FUNDO, camera: camera(40, 32) };
  const sobreAlga = peixeEm(80, 100);
  assert.equal(podeTrocarDePlano(sobreAlga, 'frente', 'meio', ctx), false, 'pularia para trás da alga');
  assert.equal(podeTrocarDePlano(sobreAlga, 'meio', 'frente', ctx), false);
  assert.equal(podeTrocarDePlano(sobreAlga, 'fundo', 'meio', ctx), true, 'fundo e meio ficam os dois atrás da alga: nada pula');
  assert.equal(podeTrocarDePlano(peixeEm(200, 100), 'frente', 'fundo', ctx), true, 'longe de tudo troca livremente');
});

test('atualizarPlanos: espera o peixe sair de cima da alga para trocar de plano', () => {
  const ctx = { plantas: PLANTAS, fundo: FUNDO, camera: camera(40, 32) };
  const peixe = peixeEm(80, 100, 'frente', { planoDesejado: 'meio' });
  atualizarPlanos([peixe], ctx);
  assert.equal(peixe.plano, 'frente', 'está sobre a alga: continua na frente');
  peixe.x = 200;
  atualizarPlanos([peixe], ctx);
  assert.equal(peixe.plano, 'meio', 'saiu de cima: troca');
});

test('atualizarPlanos: peixe morto vai para a frente', () => {
  const peixe = peixeEm(80, 100, 'fundo', { estado: 'morto' });
  atualizarPlanos([peixe], { plantas: PLANTAS, fundo: FUNDO, camera: camera(40, 32) });
  assert.equal(peixe.plano, 'frente');
});

test('as chances do config somam menos de 1 (o resto é "na frente")', () => {
  assert.ok(config.profundidade.chanceNoFundo + config.profundidade.chanceNoMeio < 1);
});
