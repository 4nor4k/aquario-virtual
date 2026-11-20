// O peixe se esconde da chuva atrás da pedra grande, colado no chão e quieto (doc 12, seção 2).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { atualizarAbrigo, alvoDoAbrigo } from '../src/core/abrigo.js';
import { limitesDoPeixe, TAMANHO_POR_FASE, criarPeixe } from '../src/core/fish.js';
import { exportarJogo } from '../src/core/salvar.js';
import { criarRng } from '../src/core/rng.js';
import { abrigoDaPedraGrande, atualizarPlanos, peixeSobrePedraGrande } from '../src/render/profundidade.js';
import { desenharQuadro } from '../src/render/scene.js';
import { gerarMapa } from '../src/render/cenario.js';
import { gerarFundo } from '../src/render/fundo.js';
import { criarCamera } from '../src/render/camera.js';
import { criarQuadro, LARGURA, ALTURA } from '../src/render/tela.js';
import { COR } from '../src/render/palette.js';
import { MUNDO_LARGURA, MUNDO_ALTURA } from '../src/core/mundo.js';
import { config, montar } from './ajuda.js';

const cfg = config.abrigoDaChuva;
const ABRIGO = { x: 120, meiaLargura: 33 };
const CHUVA = { chuvaNivel: 1, abrigo: ABRIGO };
const SEM_CHUVA = { chuvaNivel: 0, abrigo: ABRIGO };
const DT = 0.05;

// Um aquário com N peixes adultos espalhados; roda `segundos` com o ambiente dado.
function aquarioDeAdultos(n = 1, { semente = 1 } = {}) {
  const t = montar(0, undefined, { cfg: config });
  for (let i = 0; i < n; i++) t.aq.adicionarPeixe({ fase: 'adulto', x: 40 + i * 30, y: 60 }, 0);
  return t.aq;
}
function rodar(aq, segundos, ambiente, depoisDeCada = null) {
  for (let i = 0; i < Math.round(segundos / DT); i++) {
    aq.atualizar(DT, 0, typeof ambiente === 'function' ? ambiente(i * DT) : ambiente);
    if (depoisDeCada) depoisDeCada(i * DT);
  }
}
// Faz o papel da interface: quando o peixe quer o plano "fundo", ele já está no plano "fundo".
const interfaceTrocaOPlano = (aq) => () => aq.peixes.forEach((p) => { p.plano = p.planoDesejado; });

// --- Decisão de entrar e sair do abrigo ----------------------------------------------------------

test('entra com a chuva acima de 0,5 e não entra com chuva fraca', () => {
  const p = criarPeixe({ fase: 'adulto', x: 50, y: 60 });
  const rng = criarRng(3);
  atualizarAbrigo(p, DT, rng, { chuvaNivel: 0.5, abrigo: ABRIGO }, cfg);
  assert.equal(p.abrigado, false, 'chuva exatamente 0,5 ainda não');
  atualizarAbrigo(p, DT, rng, { chuvaNivel: 0.51, abrigo: ABRIGO }, cfg);
  assert.equal(p.abrigado, true);
  assert.ok(Math.abs(p.abrigoDx) <= ABRIGO.meiaLargura, `o ponto fica ao longo da pedra (${p.abrigoDx})`);
  assert.ok(p.abrigoDy >= 0 && p.abrigoDy <= cfg.alturaNoChaoPx);
});

test('sai só depois da chuva passar (abaixo de 0,2) e depois de 3 a 8 s; chuva fraca no meio não o tira', () => {
  const p = criarPeixe({ fase: 'adulto', x: 50, y: 60 });
  const rng = criarRng(5);
  atualizarAbrigo(p, DT, rng, CHUVA, cfg);
  assert.equal(p.abrigado, true);
  atualizarAbrigo(p, DT, rng, { chuvaNivel: 0.3, abrigo: ABRIGO }, cfg);
  assert.equal(p.abrigado, true, 'entre 0,2 e 0,5 continua escondido');
  assert.equal(p.abrigoSaiEm, null, 'e ainda não começou a contar para sair');

  let t = 0;
  while (p.abrigado && t < 20) {
    atualizarAbrigo(p, DT, rng, { chuvaNivel: 0.1, abrigo: ABRIGO }, cfg);
    t += DT;
  }
  assert.equal(p.abrigado, false);
  assert.ok(t >= 3 - DT && t <= 8 + 2 * DT, `saiu depois de ${t.toFixed(2)} s`);
  assert.equal(p.movimento, 'esperando');
  assert.ok(p.espera <= 0.5, 'logo volta a passear');
});

test('se volta a chover antes de sair, a contagem recomeça', () => {
  const p = criarPeixe({ fase: 'adulto', x: 50, y: 60 });
  const rng = criarRng(5);
  atualizarAbrigo(p, DT, rng, CHUVA, cfg);
  for (let i = 0; i < 20; i++) atualizarAbrigo(p, DT, rng, { chuvaNivel: 0.1, abrigo: ABRIGO }, cfg);
  assert.ok(p.abrigoSaiEm !== null && p.abrigado);
  atualizarAbrigo(p, DT, rng, { chuvaNivel: 0.8, abrigo: ABRIGO }, cfg);
  assert.equal(p.abrigoSaiEm, null);
});

test('sem abrigo (ou sem ambiente) o peixe nunca fica abrigado, e sai se estava', () => {
  const p = criarPeixe({ fase: 'adulto', x: 50, y: 60 });
  const rng = criarRng(5);
  atualizarAbrigo(p, DT, rng, null, cfg);
  atualizarAbrigo(p, DT, rng, { chuvaNivel: 1, abrigo: null }, cfg);
  assert.equal(p.abrigado, false);
  atualizarAbrigo(p, DT, rng, CHUVA, cfg);
  assert.equal(p.abrigado, true);
  atualizarAbrigo(p, DT, rng, { chuvaNivel: 1, abrigo: null }, cfg);
  assert.equal(p.abrigado, false);
});

// --- Para onde ele vai -----------------------------------------------------------------------------

test('alvo: ainda na frente da pedra, vai primeiro à borda dela (fora da silhueta); no fundo, entra e fica colado no chão', () => {
  const p = criarPeixe({ fase: 'adulto', x: 50, y: 60 });
  const rng = criarRng(7);
  atualizarAbrigo(p, DT, rng, CHUVA, cfg);
  const lim = limitesDoPeixe('adulto');
  const meia = TAMANHO_POR_FASE.adulto.largura / 2;

  p.plano = 'frente';
  const fora = alvoDoAbrigo(p, ABRIGO);
  assert.ok(Math.abs(fora.x - ABRIGO.x) >= ABRIGO.meiaLargura + meia, 'fora da silhueta da pedra');
  assert.ok(fora.x < ABRIGO.x, 'vindo da esquerda, vai pela esquerda');
  p.x = 200;
  assert.ok(alvoDoAbrigo(p, ABRIGO).x > ABRIGO.x, 'vindo da direita, vai pela direita');

  p.plano = 'fundo';
  const dentro = alvoDoAbrigo(p, ABRIGO);
  assert.ok(Math.abs(dentro.x - ABRIGO.x) <= ABRIGO.meiaLargura, 'ao longo da largura da pedra');
  assert.equal(dentro.minX, ABRIGO.x - ABRIGO.meiaLargura, 'vai e vem pela pedra toda');
  assert.equal(dentro.maxX, ABRIGO.x + ABRIGO.meiaLargura);
  assert.ok(dentro.y <= lim.maxY && dentro.y >= lim.maxY - cfg.alturaNoChaoPx, `colado no chão (y ${dentro.y}, chão ${lim.maxY})`);
  assert.ok(dentro.minX <= dentro.x && dentro.x <= dentro.maxX);
});

// --- Comportamento no aquário -----------------------------------------------------------------------

test('com chuva o peixe vai depressa até a pedra e fica indo e vindo ao longo dela, perto do chão', () => {
  const aq = aquarioDeAdultos(1);
  const p = aq.peixes[0];
  const lim = limitesDoPeixe('adulto');
  const alvo = () => alvoDoAbrigo(p, ABRIGO);

  // Chega depressa: do x = 40 até a pedra (centro em 120) e para trás dela em poucos segundos.
  let t = 0;
  for (; t < 20; t += DT) {
    aq.atualizar(DT, 0, CHUVA);
    interfaceTrocaOPlano(aq)();
    if (p.plano === 'fundo' && p.x >= alvo().minX - cfg.toleranciaPx) break;
  }
  assert.ok(t < 8, `chegou à pedra em ${t.toFixed(1)} s`);
  assert.equal(p.abrigado, true);
  assert.equal(p.planoDesejado, 'fundo');

  // Depois fica indo e vindo: percorre boa parte da largura da pedra, sempre perto do chão, e se mexe com frequência.
  let nadando = 0;
  let total = 0;
  let menorX = Infinity;
  let maiorX = -Infinity;
  let piorForaDaFaixa = 0;
  let maisAlto = Infinity;
  rodar(aq, 60, CHUVA, () => {
    total++;
    if (p.movimento === 'nadando') nadando++;
    menorX = Math.min(menorX, p.x);
    maiorX = Math.max(maiorX, p.x);
    piorForaDaFaixa = Math.max(piorForaDaFaixa, alvo().minX - p.x, p.x - alvo().maxX);
    maisAlto = Math.min(maisAlto, p.y);
  });
  assert.ok(maiorX - menorX > ABRIGO.meiaLargura, `percorreu a pedra (${(maiorX - menorX).toFixed(0)} px)`);
  assert.ok(piorForaDaFaixa <= cfg.toleranciaPx, `ficou perto da pedra (${piorForaDaFaixa.toFixed(1)} px para fora)`);
  assert.ok(nadando / total > 0.2, `se mexe com frequência (${(nadando / total * 100).toFixed(0)}% do tempo)`);
  assert.ok(maisAlto >= lim.maxY - cfg.alturaNoChaoPx - cfg.subidaPx - 0.01, 'perto do chão');
});

test('o abrigo é mais rápido que o nado normal (fator do config)', () => {
  assert.ok(cfg.velocidade >= 1.5, 'config: abrigo mais rápido que o nado normal');
  const a = aquarioDeAdultos(1);
  const pa = a.peixes[0];
  pa.x = 40; pa.y = 100; pa.plano = pa.planoDesejado = 'fundo';
  rodar(a, 1, CHUVA, interfaceTrocaOPlano(a)); // entra e já nada
  const x0 = pa.x;
  rodar(a, 1, CHUVA, interfaceTrocaOPlano(a));
  assert.ok(pa.x - x0 > 15 * 1.5, `andou ${(pa.x - x0).toFixed(1)} px em 1 s (nado normal: 15 px/s)`);
});

test('quando a chuva passa ele sai e volta a passear pela água toda', () => {
  const aq = aquarioDeAdultos(1);
  const p = aq.peixes[0];
  rodar(aq, 30, CHUVA, interfaceTrocaOPlano(aq));
  assert.equal(p.abrigado, true);
  const xs = new Set();
  rodar(aq, 60, SEM_CHUVA, () => xs.add(Math.round(p.x / 20)));
  assert.equal(p.abrigado, false);
  assert.ok(xs.size > 3, `passeou por vários pontos da água (${xs.size})`);
});

test('a comida tem prioridade: ele sai do abrigo para comer e volta depois', () => {
  const aq = aquarioDeAdultos(1);
  const p = aq.peixes[0];
  rodar(aq, 30, CHUVA, interfaceTrocaOPlano(aq));
  const xAntes = p.x;
  const xGrao = xAntes + 70; // longe, para ele ter de nadar um bom pedaço (a menos de ~20 px já come na hora)
  aq.graos.push({ x: xGrao, baseX: xGrao, y: p.y - 5, espera: 0, tempo: 0, fase: 0, naAreia: false, segundosNaAreia: 0 });
  rodar(aq, 3, CHUVA, interfaceTrocaOPlano(aq));
  assert.equal(p.abrigado, true, 'continua "abrigado" (só foi comer)');
  assert.ok(p.x > xAntes + 5, `foi atrás do grão (${xAntes.toFixed(1)} -> ${p.x.toFixed(1)})`);
});

test('morto não se esconde; sem ambiente nada muda (mesmos movimentos de antes)', () => {
  const a = aquarioDeAdultos(2);
  const b = aquarioDeAdultos(2);
  rodar(a, 20, null);
  rodar(b, 20, { chuvaNivel: 0, abrigo: ABRIGO });
  assert.deepEqual(a.peixes.map((p) => [p.x, p.y]), b.peixes.map((p) => [p.x, p.y]), 'sem chuva, o abrigo não muda o nado');

  const m = aquarioDeAdultos(1);
  m.matar(m.peixes[0], 'cuidado');
  rodar(m, 5, CHUVA);
  assert.equal(m.peixes[0].abrigado, false);
});

test('vários peixes pegam pontos diferentes atrás da pedra', () => {
  const aq = aquarioDeAdultos(4);
  rodar(aq, 60, CHUVA, interfaceTrocaOPlano(aq));
  assert.ok(aq.peixes.every((p) => p.abrigado));
  assert.ok(new Set(aq.peixes.map((p) => p.abrigoDx)).size > 1, 'não ficam todos no mesmo ponto');
});

test('o abrigo não é salvo: os campos temporários ficam fora do arquivo', () => {
  const aq = aquarioDeAdultos(1);
  rodar(aq, 5, CHUVA);
  assert.equal(aq.peixes[0].abrigado, true, 'ele estava abrigado ao salvar');
  const texto = JSON.stringify(exportarJogo(aq, { tempoJogoMs: 0, salvoEmMs: 0 }));
  assert.ok(!texto.includes('abrigo'), 'nada de abrigo no arquivo salvo');
});

// --- Junto com o desenho: a pedra de verdade ------------------------------------------------------------

const camera = (x, y) => criarCamera({
  mundoLargura: MUNDO_LARGURA, mundoAltura: MUNDO_ALTURA, janelaLargura: LARGURA, janelaAltura: ALTURA, x, y,
});
const FUNDO = gerarFundo();

test('abrigoDaPedraGrande acompanha a paralaxe: o centro dela na tela, em coordenadas do mundo', () => {
  const sem = abrigoDaPedraGrande({ fundo: { pedraGrande: null }, camera: camera(0, 0) });
  assert.equal(sem, null);
  assert.equal(abrigoDaPedraGrande({ fundo: null, camera: camera(0, 0) }), null);
  const xs = [0, 40, 60, 120].map((cx) => abrigoDaPedraGrande({ fundo: FUNDO, camera: camera(cx, 32) }).x);
  // a pedra anda a 85% da câmera: quando a câmera vai 120 px para a direita, o x do mundo dela só anda 102
  assert.ok(Math.abs((xs[3] - xs[0]) - 120 * 0.15) <= 2, `deslocamento relativo ${xs[3] - xs[0]}`);
  assert.equal(abrigoDaPedraGrande({ fundo: FUNDO, camera: camera(0, 32) }).meiaLargura, 33);
});

test('o ponto fora da silhueta não toca a pedra; o ponto de dentro toca (câmera em vários lugares)', () => {
  for (const cx of [0, 30, 60, 90, 120]) {
    const cam = camera(cx, 32);
    const abrigo = abrigoDaPedraGrande({ fundo: FUNDO, camera: cam });
    const p = criarPeixe({ fase: 'adulto', x: abrigo.x - 80, y: 100 });
    p.abrigado = true;
    p.plano = 'frente';
    const fora = alvoDoAbrigo(p, abrigo);
    const sobre = (x, y) => peixeSobrePedraGrande({ ...p, x, y }, { fundo: FUNDO, camera: cam });
    assert.equal(sobre(fora.x, fora.y), false, `câmera ${cx}: o ponto de espera fica livre da pedra`);
    p.plano = 'fundo';
    const dentro = alvoDoAbrigo(p, abrigo);
    assert.equal(sobre(dentro.x, dentro.y), true, `câmera ${cx}: o ponto de dentro está na pedra`);
    assert.equal(sobre(abrigo.x, dentro.y), true, `câmera ${cx}: o meio da pedra também`);
  }
});

test('integração: com a chuva o peixe da frente da pedra dá a volta, passa para trás dela e fica escondido', () => {
  const cam = camera(60, 32); // a câmera do começo do jogo (a pedra no meio da tela)
  const t = montar(0);
  const aq = t.aq;
  const abrigoAgora = () => abrigoDaPedraGrande({ fundo: FUNDO, camera: cam });
  // começa bem na frente da pedra, no plano da frente: é o caso difícil (ele precisa sair da silhueta antes)
  aq.adicionarPeixe({ fase: 'adulto', x: abrigoAgora().x, y: 70 }, 0);
  const p = aq.peixes[0];
  p.plano = p.planoDesejado = 'frente';
  const contexto = { plantas: [], fundo: FUNDO, camera: cam };
  for (let i = 0; i < 80 / DT; i++) {
    aq.atualizar(DT, 0, { chuvaNivel: 1, abrigo: abrigoAgora() });
    atualizarPlanos(aq.peixes, contexto);
  }
  assert.equal(p.plano, 'fundo', 'passou para trás da pedra');
  const alvo = alvoDoAbrigo(p, abrigoAgora());
  assert.ok(p.x >= alvo.minX - cfg.toleranciaPx && p.x <= alvo.maxX + cfg.toleranciaPx, 'ao longo da pedra');

  // Desenhado: no meio da pedra o peixe quase não aparece; na ponta dela ele aparece (dá para ver que está lá).
  const CORES_DO_PEIXE = new Set(Object.values(COR.PEIXE.vermelho.vivo));
  const peixeNaTela = (plano) => {
    const q = criarQuadro();
    desenharQuadro(q, { mapa: gerarMapa(), camera: cam, peixes: [{ ...p, plano }], plantas: [], fundo: FUNDO, tempo: 0 });
    return q.reduce((n, c) => n + (CORES_DO_PEIXE.has(c) ? 1 : 0), 0);
  };
  const aVista = peixeNaTela('frente');
  assert.ok(aVista > 100, `o peixe aparece quando está na frente (${aVista} pixels)`);
  const yDoChao = alvoDoAbrigo(p, abrigoAgora()).y;
  const noPonto = (x) => { p.x = x; p.y = yDoChao; return peixeNaTela('fundo') / aVista; };
  const noMeio = noPonto(abrigoAgora().x);
  const naPonta = noPonto(abrigoAgora().x + abrigoAgora().meiaLargura);
  assert.ok(noMeio <= 0.15, `no meio da pedra quase não se vê o peixe (${(noMeio * 100).toFixed(0)}% aparece)`);
  assert.ok(naPonta >= 0.3, `na ponta da pedra ele aparece (${(naPonta * 100).toFixed(0)}% aparece)`);
});
