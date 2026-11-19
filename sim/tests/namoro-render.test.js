// O desenho do namoro: ovos na areia e corações subindo (render/ovos.js, render/coracoes.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { desenharOvos, estaPrestesAEclodir } from '../src/render/ovos.js';
import {
  desenharCoracoes, coracoesVisiveis, QUANTOS_CORACOES, VIDA_DO_CORACAO, INTERVALO_ENTRE_CORACOES,
} from '../src/render/coracoes.js';
import { desenharQuadro } from '../src/render/scene.js';
import { gerarMapa } from '../src/render/cenario.js';
import { criarCamera } from '../src/render/camera.js';
import { criarQuadro, LARGURA, ALTURA, COR_SOLIDA } from '../src/render/tela.js';
import { COR, COLORIDOS } from '../src/render/palette.js';
import { OVO_Y_AREIA } from '../src/core/reproducao.js';
import { MUNDO_LARGURA, MUNDO_ALTURA } from '../src/core/mundo.js';
import { MINUTO_MS, HORA_MS } from '../src/core/clock.js';
import { config, montar } from './ajuda.js';

const camera = (x = 60, y = MUNDO_ALTURA - ALTURA) => criarCamera({
  mundoLargura: MUNDO_LARGURA, mundoAltura: MUNDO_ALTURA, janelaLargura: LARGURA, janelaAltura: ALTURA, x, y,
});
const contar = (q, cor) => q.reduce((n, c) => n + (c === cor ? 1 : 0), 0);
const ovo = (extra = {}) => ({
  x: 100, baseX: 100, y: OVO_Y_AREIA, estado: 'parado', espera: 0, tempo: 0, fase: 0, eclodeEmMs: HORA_MS, cor: 'azul', sexo: 'macho', ...extra,
});

test('as cores do ovo e do coração existem e são sólidas (não viram preto e branco)', () => {
  for (const i of [COR.OVO, COR.OVO_BRILHO, COR.CORACAO, COR.CORACAO_CLARO]) {
    assert.ok(COLORIDOS.includes(i), `índice ${i}`);
    assert.ok(COR_SOLIDA[i]);
  }
  const [r, g, b] = COR_SOLIDA[COR.CORACAO];
  assert.ok(r > g && r > b, 'o coração é rosado');
});

// --- Ovos ------------------------------------------------------------------------------------

test('ovo: 3×3 pixels redondos em cima, com um pixel de brilho, no lugar certo da tela', () => {
  const q = criarQuadro();
  const cam = camera(60);
  desenharOvos(q, [ovo({ x: 100 })], cam);
  assert.equal(contar(q, COR.OVO), 6);
  assert.equal(contar(q, COR.OVO_BRILHO), 1);
  const x = 100 - 60; // o ovo é centrado em x
  const y = OVO_Y_AREIA - Math.round(cam.y);
  assert.equal(q[y * LARGURA + x], COR.OVO_BRILHO, 'o brilho fica no alto, no meio');
  assert.equal(q[y * LARGURA + x - 1], 0, 'o canto de cima é vazio (redondo)');
  assert.equal(q[(y + 2) * LARGURA + x - 1], COR.OVO);
  assert.equal(y + 3, 128 - Math.round(cam.y), 'a base toca a areia');
});

test('ovo: o que ainda espera o namoro não aparece, o que cai e o parado aparecem', () => {
  for (const [estado, aparece] of [['esperando', false], ['caindo', true], ['parado', true]]) {
    const q = criarQuadro();
    desenharOvos(q, [ovo({ estado })], camera());
    assert.equal(contar(q, COR.OVO) > 0, aparece, estado);
  }
});

test('ovo: fora da tela não desenha nem dá erro', () => {
  const q = criarQuadro();
  assert.doesNotThrow(() => desenharOvos(q, [ovo({ x: 5 }), ovo({ x: 230 }), ovo({ y: -50 })], camera(60)));
  assert.equal(contar(q, COR.OVO), 0);
});

test('ovo: nos últimos 5 minutos antes de eclodir ele treme (muda de lugar de vez em quando)', () => {
  const o = ovo({ eclodeEmMs: 10 * MINUTO_MS });
  assert.equal(estaPrestesAEclodir(o, 4 * MINUTO_MS), false);
  assert.equal(estaPrestesAEclodir(o, 6 * MINUTO_MS), true);
  assert.equal(estaPrestesAEclodir(o, null), false, 'sem hora de jogo, sem tremor');
  const posicoes = new Set();
  for (let t = 0; t < 2; t += 0.05) {
    const q = criarQuadro();
    desenharOvos(q, [o], camera(), { tempo: t, agoraMs: 8 * MINUTO_MS });
    posicoes.add(q.indexOf(COR.OVO_BRILHO));
  }
  assert.equal(posicoes.size, 2, 'treme entre duas posições');
  const parado = new Set();
  for (let t = 0; t < 2; t += 0.05) {
    const q = criarQuadro();
    desenharOvos(q, [o], camera(), { tempo: t, agoraMs: 1 * MINUTO_MS });
    parado.add(q.indexOf(COR.OVO_BRILHO));
  }
  assert.equal(parado.size, 1, 'longe da hora, fica parado');
});

// --- Corações --------------------------------------------------------------------------------

const namoro = { restante: 6, x: 100, y: 70 };
const casalNamorando = (restante) => ({ aId: 1, bId: 2, namoro: { ...namoro, restante } });

test('corações: não aparecem sem namoro', () => {
  const q = criarQuadro();
  desenharCoracoes(q, [{ aId: 1, bId: 2, namoro: null }], camera(), config);
  assert.equal(contar(q, COR.CORACAO) + contar(q, COR.CORACAO_CLARO), 0);
  desenharCoracoes(q, [], camera(), config);
  assert.equal(contar(q, COR.CORACAO), 0);
});

test('corações: um depois do outro, sobem e somem; no fim do namoro não sobra nenhum', () => {
  assert.equal(coracoesVisiveis(namoro, 0).length, 1, 'no começo só o primeiro');
  assert.equal(coracoesVisiveis(namoro, INTERVALO_ENTRE_CORACOES * 2.5).length, 3);
  assert.ok(coracoesVisiveis(namoro, 6).length <= QUANTOS_CORACOES);
  assert.equal(coracoesVisiveis(namoro, (QUANTOS_CORACOES - 1) * INTERVALO_ENTRE_CORACOES + VIDA_DO_CORACAO + 0.1).length, 0);
  // Sobe: o mesmo coração fica mais alto (y menor) com o tempo.
  const antes = coracoesVisiveis(namoro, 0.2)[0];
  const depois = coracoesVisiveis(namoro, 1.5)[0];
  assert.ok(depois.y < antes.y, `subiu de ${antes.y} para ${depois.y}`);
  // E fica acima dos peixes (os peixes ficam em y = 70).
  assert.ok(antes.y < namoro.y - 5);
});

test('corações: 5×5 pixels, rosa com um brilho, e a quantidade cresce no começo do namoro', () => {
  const quadroEm = (decorrido) => {
    const q = criarQuadro();
    desenharCoracoes(q, [casalNamorando(6 - decorrido)], camera(), config);
    return q;
  };
  const um = quadroEm(0.1);
  assert.ok(contar(um, COR.CORACAO) > 8 && contar(um, COR.CORACAO) < 25);
  assert.equal(contar(um, COR.CORACAO_CLARO), 1);
  const varios = quadroEm(INTERVALO_ENTRE_CORACOES * 2 + 0.1);
  assert.ok(contar(varios, COR.CORACAO) > 2 * contar(um, COR.CORACAO) * 0.9, 'mais corações juntos');
});

test('corações: fora da tela não desenha nem dá erro', () => {
  const q = criarQuadro();
  const longe = { aId: 1, bId: 2, namoro: { restante: 5, x: 5, y: 5 } };
  assert.doesNotThrow(() => desenharCoracoes(q, [longe], camera(150), config));
});

// --- Na cena ---------------------------------------------------------------------------------

test('cena: ovos e corações aparecem por cima do cenário, na frente dos peixes', () => {
  const mapa = gerarMapa();
  const peixe = {
    id: 1, especie: 'beta', cor: 'vermelho', fase: 'adulto', estado: 'saudavel', x: 100, y: 70, direcao: 1, tempoAnimacao: 0,
  };
  const vazia = criarQuadro();
  const cheia = criarQuadro();
  const base = { mapa, camera: camera(60, 32), peixes: [peixe], tempo: 1, config };
  desenharQuadro(vazia, base);
  desenharQuadro(cheia, { ...base, ovos: [ovo({ x: 90 }), ovo({ x: 93 })], casais: [casalNamorando(4)], agoraMs: 0 });
  assert.equal(contar(vazia, COR.OVO) + contar(vazia, COR.CORACAO), 0);
  assert.equal(contar(cheia, COR.OVO), 12);
  assert.ok(contar(cheia, COR.CORACAO) > 0);
  // O coração sobe até o peixe? Ele é desenhado por cima do peixe, nunca coberto.
  const corpo = COR.PEIXE.vermelho.vivo.corpo;
  assert.ok(contar(cheia, corpo) <= contar(vazia, corpo), 'o coração pode cobrir, nunca o contrário');
});

test('cena: o fluxo completo do jogo desenha o namoro e depois os ovos, sem erro', () => {
  const c = structuredClone(config);
  c.saciedade.horasParaZerar = 1e9;
  c.sujeira.diasParaEncher = 1e9;
  c.ph.horasPorPasso = { sujeiraBaixa: 1e9, sujeiraMedia: 1e9, sujeiraAlta: 1e9 };
  const m = montar(0, 5 * MINUTO_MS, { cfg: c });
  const a = m.aq.adicionarPeixe({ sexo: 'femea', fase: 'adulto', x: 100, y: 70 }, 0);
  m.aq.adotarParceiro(a);
  const mapa = gerarMapa();
  let agora = 0;
  for (let i = 0; i < 8; i++) { agora += 5 * MINUTO_MS; m.aq.atualizar(0, agora); }
  assert.ok(m.aq.casais[0].namoro);
  // 2,5 s de namoro: já há corações, mas os ovos ainda não apareceram.
  for (let i = 0; i < 25; i++) m.aq.atualizar(0.1, agora);
  const quadroDaCena = () => {
    const q2 = criarQuadro();
    desenharQuadro(q2, {
      mapa, camera: camera(60, 32), peixes: m.aq.peixes, aquario: m.aq, config: c, tempo: 1,
      ovos: m.aq.ovos, casais: m.aq.casais, agoraMs: agora,
    });
    return q2;
  };
  assert.ok(contar(quadroDaCena(), COR.CORACAO) > 0, 'corações durante o namoro');
  assert.equal(contar(quadroDaCena(), COR.OVO), 0, 'ainda sem ovos');
  for (let i = 0; i < 500; i++) m.aq.atualizar(0.1, agora); // o namoro acaba e os ovos caem
  assert.equal(contar(quadroDaCena(), COR.CORACAO), 0, 'acabou o namoro: sem corações');
  assert.ok(contar(quadroDaCena(), COR.OVO) >= 6, 'os ovos estão na areia');
});
