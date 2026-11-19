// A água suja (render/turvacao.js), em quatro faixas de sujeira: 0-40 limpo; 40-60 o chão escurece e
// aparecem partículas; 60-90 a água muda de cor (e começa o bolor no vidro, bolor.test.js); 90-100 água imunda.
// Sem pontilhado: a água é uma cor sólida.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  criarTurvacao, nivelDaSujeira, fasesDaSujeira, fasesDoNivel, desenharTurvacao, posicaoDaParticula, posicaoDaEspeca,
  corDaSuperficie, corDaAgua, corDaAreia, aplicarCores,
  COR_SUPERFICIE_LIMPA, COR_SUPERFICIE_SUJA, COR_AGUA_SUJA, COR_CHAO_ESCURO, TURVO_EM_90,
  SEGUNDOS_PARA_MUDAR, PARTICULAS_MAXIMAS, ESPECAS_MAXIMAS,
} from '../src/render/turvacao.js';
import { desenharQuadro } from '../src/render/scene.js';
import { gerarMapa } from '../src/render/cenario.js';
import { criarCamera } from '../src/render/camera.js';
import { criarQuadro, LARGURA, ALTURA, COR_SOLIDA } from '../src/render/tela.js';
import { COR, PALETA, COLORIDOS } from '../src/render/palette.js';
import { deslocamentoDaOnda } from '../src/render/superficie.js';
import { SUPERFICIE_Y, AREIA_Y, MUNDO_LARGURA, MUNDO_ALTURA } from '../src/core/mundo.js';

const camera = (x = 0, y = 0) => criarCamera({
  mundoLargura: MUNDO_LARGURA, mundoAltura: MUNDO_ALTURA, janelaLargura: LARGURA, janelaAltura: ALTURA, x, y,
});
const contar = (q, cor) => q.reduce((n, c) => n + (c === cor ? 1 : 0), 0);
// Um quadro só com água (índice 1), como o da cena antes da turvação.
const quadroDeAgua = () => criarQuadro().fill(COR.AGUA);
const quadroSujo = (nivel, tempo = 0, cx = 60, cy = 32) => {
  const q = quadroDeAgua();
  desenharTurvacao(q, camera(cx, cy), nivel, tempo);
  return q;
};
const NIVEL = (sujeira) => sujeira / 100;

test('as cores da água suja, do bolor, da comida e do cocô existem e são sólidas', () => {
  for (const i of [COR.TURVO, COR.TURVO_CLARO, COR.AGUA_SUJA, COR.BOLOR, COR.BOLOR_CLARO, COR.GRAO, COR.GRAO_BRILHO, COR.COCO, COR.COCO_CLARO]) {
    assert.ok(PALETA[i], `índice ${i}`);
    assert.ok(COLORIDOS.includes(i));
    assert.ok(COR_SOLIDA[i]);
  }
});

// --- As quatro faixas ------------------------------------------------------------------------

test('faixa 0 a 40: aquário limpo, nada aparece', () => {
  for (const s of [0, 10, 40]) {
    assert.deepEqual(fasesDaSujeira(s), { chao: 0, agua: 0, particulas: 0, bolor: 0 }, `sujeira ${s}`);
  }
});

test('faixa 41 a 60: o chão escurece e aparecem partículas, mas a água continua transparente', () => {
  const f41 = fasesDaSujeira(41);
  assert.ok(f41.chao > 0 && f41.particulas > 0, 'passou de 40: começa');
  assert.equal(f41.agua, 0);
  assert.equal(f41.bolor, 0);
  assert.equal(fasesDaSujeira(50).chao, 0.5);
  const f60 = fasesDaSujeira(60);
  assert.equal(f60.chao, 1, 'em 60 o chão já está no tom mais escuro');
  assert.equal(f60.agua, 0, 'em 60 a água ainda é transparente');
  assert.ok(f60.particulas > 0 && f60.particulas < 0.5, 'algumas partículas, não todas');
});

test('faixa 61 a 90: a água muda de cor (um pouco turva) e há mais partículas', () => {
  assert.ok(fasesDaSujeira(61).agua > 0);
  const f75 = fasesDaSujeira(75);
  assert.ok(f75.agua > 0 && f75.agua < TURVO_EM_90);
  assert.ok(f75.particulas > fasesDaSujeira(60).particulas);
  const f90 = fasesDaSujeira(90);
  assert.equal(f90.agua, TURVO_EM_90, 'em 90 a água já está bem turva, mas não no máximo');
  assert.ok(f90.bolor > 0 && f90.bolor < 1, 'o bolor já começou (a partir de 60) e continua crescendo');
  assert.equal(fasesDaSujeira(60).bolor, 0, 'em 60 ainda não há bolor');
  assert.ok(fasesDaSujeira(61).bolor > 0, 'passou de 60: o bolor começa');
  assert.equal(f90.chao, 1);
});

test('faixa 91 a 100: água completamente suja e bolor no máximo', () => {
  const f91 = fasesDaSujeira(91);
  assert.ok(f91.bolor > 0 && f91.agua > TURVO_EM_90);
  const f100 = fasesDaSujeira(100);
  assert.deepEqual(f100, { chao: 1, agua: 1, particulas: 1, bolor: 1 });
  assert.deepEqual(fasesDaSujeira(250), f100, 'passou de 100 vale o máximo');
  assert.deepEqual(fasesDaSujeira(-5), fasesDaSujeira(0));
});

test('as fases só crescem com a sujeira (nada some quando a sujeira aumenta)', () => {
  let anterior = fasesDaSujeira(0);
  for (let s = 1; s <= 100; s++) {
    const f = fasesDaSujeira(s);
    for (const k of Object.keys(f)) assert.ok(f[k] >= anterior[k] - 1e-12, `${k} em ${s}`);
    anterior = f;
  }
});

test('nivelDaSujeira: sujeira / 100, entre 0 e 1', () => {
  assert.equal(nivelDaSujeira(0), 0);
  assert.equal(nivelDaSujeira(70), 0.7);
  assert.equal(nivelDaSujeira(100), 1);
  assert.equal(nivelDaSujeira(150), 1);
  assert.equal(nivelDaSujeira(-5), 0);
  assert.deepEqual(fasesDoNivel(0.75), fasesDaSujeira(75));
});

// --- A transição -----------------------------------------------------------------------------

test('transição: o nível anda até o alvo aos poucos, sem pular', () => {
  const t = criarTurvacao(0);
  t.atualizar(1, 1);
  assert.ok(t.nivel > 0 && t.nivel < 0.5, `em 1 s só andou um pouco (${t.nivel})`);
  for (let i = 0; i < SEGUNDOS_PARA_MUDAR * 2; i++) t.atualizar(1, 1);
  assert.equal(t.nivel, 1);
});

test('transição: limpar o aquário clareia tudo em alguns segundos, não de uma vez', () => {
  const t = criarTurvacao(1);
  const niveis = [];
  for (let s = 0; s < SEGUNDOS_PARA_MUDAR + 2; s++) {
    t.atualizar(1, 0);
    niveis.push(t.nivel);
  }
  assert.ok(niveis[0] > 0.8, 'no primeiro segundo ainda está bem sujo');
  for (let i = 1; i < niveis.length; i++) assert.ok(niveis[i] <= niveis[i - 1], 'só clareia');
  assert.equal(niveis[niveis.length - 1], 0, 'no fim, limpo');
});

test('transição: nunca passa do alvo, nem com um passo de tempo enorme', () => {
  const t = criarTurvacao(0.2);
  t.atualizar(1000, 0.6);
  assert.equal(t.nivel, 0.6);
  t.atualizar(1000, 0.1);
  assert.equal(t.nivel, 0.1);
});

test('irPara pula direto (ao abrir o jogo a água já está como estava)', () => {
  const t = criarTurvacao();
  t.irPara(0.7);
  assert.equal(t.nivel, 0.7);
  t.irPara(5);
  assert.equal(t.nivel, 1);
});

// --- As cores --------------------------------------------------------------------------------

test('água: preta quando limpa e vai mudando de cor, passando por muitos tons, até o marrom-esverdeado', () => {
  assert.deepEqual(corDaAgua(0), [0, 0, 0]);
  assert.deepEqual(corDaAgua(1), COR_AGUA_SUJA);
  const [r, g, b] = COR_AGUA_SUJA;
  assert.ok(r > b && g > b, 'barrenta, sem azul');
  const vistas = new Set();
  let anterior = -1;
  for (let a = 0; a <= 1.0001; a += 0.05) {
    const c = corDaAgua(a);
    const luz = c[0] + c[1] + c[2];
    assert.ok(luz >= anterior, 'só clareia');
    anterior = luz;
    vistas.add(c.join());
  }
  assert.ok(vistas.size >= 15, 'é uma transição de cor, não um salto');
});

test('chão: a areia e os grãos escurecem até um tom acastanhado, mantendo os tons diferentes entre si', () => {
  const originais = [COR.AREIA, COR.AREIA_ESCURA, ...COR.GRAOS].map((i) => [...PALETA[i]]);
  aplicarCores(0);
  [COR.AREIA, COR.AREIA_ESCURA, ...COR.GRAOS].forEach((i, n) => assert.deepEqual(PALETA[i], originais[n], 'limpo = areia de sempre'));
  const luz = (c) => c[0] + c[1] + c[2];
  aplicarCores(NIVEL(50));
  const meio = [COR.AREIA, ...COR.GRAOS].map((i) => luz(PALETA[i]));
  aplicarCores(NIVEL(60));
  const escuro = [COR.AREIA, ...COR.GRAOS].map((i) => luz(PALETA[i]));
  meio.forEach((v, n) => assert.ok(v < luz(originais[n === 0 ? 0 : n + 1]), 'já escureceu na metade'));
  escuro.forEach((v, n) => assert.ok(v < meio[n], 'e escurece mais'));
  assert.ok(luz(PALETA[COR.AREIA]) > luz(COR_CHAO_ESCURO), 'ainda é areia, não preto');
  assert.ok(new Set([COR.AREIA, COR.AREIA_ESCURA, ...COR.GRAOS].map((i) => PALETA[i].join())).size === 5, 'os tons continuam diferentes');
  // Depois de 60 o chão não muda mais.
  aplicarCores(NIVEL(100));
  assert.deepEqual([COR.AREIA, ...COR.GRAOS].map((i) => luz(PALETA[i])), escuro);
  aplicarCores(0);
  assert.deepEqual(corDaAreia(COR.AREIA, 0), originais[0]);
});

test('cores: aplicar põe na paleta a água, a superfície e o chão deste nível, e a tela enxerga', () => {
  aplicarCores(NIVEL(100));
  assert.deepEqual(PALETA[COR.AGUA_SUJA], COR_AGUA_SUJA);
  assert.deepEqual(COR_SOLIDA[COR.AGUA_SUJA], COR_AGUA_SUJA, 'a tela usa a mesma cor (a mesma lista)');
  assert.deepEqual(COR_SOLIDA[COR.AZUL_AGUA], COR_SUPERFICIE_SUJA);
  aplicarCores(NIVEL(40));
  assert.deepEqual(PALETA[COR.AGUA_SUJA], [0, 0, 0]);
  assert.deepEqual(COR_SOLIDA[COR.AZUL_AGUA], COR_SUPERFICIE_LIMPA);
  aplicarCores(0);
});

// --- O desenho da água -----------------------------------------------------------------------

test('água limpa (até 60): nada é pintado na água', () => {
  for (const s of [0, 30, 60]) {
    assert.equal(contar(quadroSujo(NIVEL(s)), COR.AGUA_SUJA), 0, `sujeira ${s}`);
  }
  assert.ok(quadroSujo(0).every((c) => c === COR.AGUA), 'com sujeira 0 o quadro fica como estava');
});

test('água suja: toda a água vira a cor sólida da água suja (sem pontilhado), menos o ar e a linha', () => {
  const q = quadroSujo(NIVEL(80), 0.7, 0, 0);
  for (let x = 0; x < LARGURA; x++) {
    const linha = SUPERFICIE_Y + deslocamentoDaOnda(x, 0.7);
    for (let y = 0; y <= linha; y++) assert.equal(q[y * LARGURA + x], COR.AGUA, `(${x}, ${y}) é ar ou superfície`);
    for (let y = linha + 1; y < ALTURA; y++) {
      const c = q[y * LARGURA + x];
      assert.ok(c === COR.AGUA_SUJA || c === COR.TURVO || c === COR.TURVO_CLARO, `(${x}, ${y}) = ${c}`);
    }
  }
});

test('água suja: só o que é água muda; o que já foi desenhado (planta, pedra, peixe) fica', () => {
  const q = quadroDeAgua();
  q[80 * LARGURA + 50] = COR.PEDRA;
  q[81 * LARGURA + 50] = COR.VERDE_ALGA;
  desenharTurvacao(q, camera(0, 0), 1, 0);
  assert.equal(q[80 * LARGURA + 50], COR.PEDRA);
  assert.equal(q[81 * LARGURA + 50], COR.VERDE_ALGA);
});

// --- As partículas ---------------------------------------------------------------------------

test('partículas que flutuam e caem: aparecem aos poucos, cada uma sempre no mesmo caminho, dentro da água', () => {
  const quantas = (s) => contar(quadroSujo(NIVEL(s), 2, 0, 20), COR.TURVO_CLARO);
  assert.equal(quantas(30), 0);
  assert.ok(quantas(55) > 0, 'na faixa do chão já há partículas');
  assert.ok(quantas(55) < quantas(80));
  assert.ok(quantas(80) < quantas(100));
  for (let k = 0; k < PARTICULAS_MAXIMAS; k++) {
    for (const t of [0, 7.3, 50, 321]) {
      const p = posicaoDaParticula(k, t);
      assert.ok(p.x >= 0 && p.x < MUNDO_LARGURA, `x ${p.x}`);
      assert.ok(p.y > SUPERFICIE_Y + 4 && p.y < AREIA_Y, `y ${p.y} (partícula ${k})`);
    }
    assert.deepEqual(posicaoDaParticula(k, 12), posicaoDaParticula(k, 12));
  }
  // Elas afundam devagar: um pouco mais tarde estão mais embaixo (menos quando dão a volta).
  let desceram = 0;
  for (let k = 0; k < 40; k++) if (posicaoDaParticula(k, 3).y > posicaoDaParticula(k, 1).y) desceram++;
  assert.ok(desceram >= 30, `${desceram} de 40 desceram (as outras deram a volta no fundo)`);
});

test('sujeira no chão: grãos parados, em cima da areia e na areia, que aparecem um a um e ficam', () => {
  for (let k = 0; k < ESPECAS_MAXIMAS; k++) {
    const e = posicaoDaEspeca(k);
    assert.ok(e.x >= 0 && e.x < MUNDO_LARGURA);
    assert.ok(e.y === AREIA_Y - 1 || e.y === AREIA_Y, `y ${e.y}`);
    assert.deepEqual(posicaoDaEspeca(k), posicaoDaEspeca(k), 'parado: sempre no mesmo lugar');
  }
  assert.ok(new Set(Array.from({ length: ESPECAS_MAXIMAS }, (_, k) => posicaoDaEspeca(k).x)).size > ESPECAS_MAXIMAS / 2, 'espalhados');
  // Com a câmera olhando o chão, os grãos aparecem; não mudam com o tempo.
  const chao = (s, t) => quadroSujo(NIVEL(s), t, 0, MUNDO_ALTURA - ALTURA);
  const a = chao(100, 0);
  const b = chao(100, 5);
  const grao = (q) => contar(q, COR.TURVO) + contar(q, COR.TURVO_CLARO);
  assert.ok(grao(chao(45, 0)) < grao(chao(60, 0)) && grao(chao(60, 0)) < grao(a), 'mais sujeira, mais grãos');
  assert.ok(contar(a, COR.TURVO) > 0, 'grãos escuros na areia');
  const y = AREIA_Y - (MUNDO_ALTURA - ALTURA);
  for (let x = 0; x < LARGURA; x++) {
    assert.equal(a[y * LARGURA + x] === COR.TURVO, b[y * LARGURA + x] === COR.TURVO, 'não se mexem');
  }
});

// --- Na cena ---------------------------------------------------------------------------------

test('a cena: a água suja muda a cor do fundo mas o peixe continua inteiro por cima', () => {
  const mapa = gerarMapa();
  const peixe = {
    id: 1, especie: 'beta', cor: 'vermelho', fase: 'adulto', estado: 'saudavel', x: 60, y: 60, direcao: 1, tempoAnimacao: 0,
  };
  const limpo = criarQuadro();
  const sujo = criarQuadro();
  desenharQuadro(limpo, { mapa, camera: camera(0, 0), peixes: [peixe], tempo: 1, turvacao: 0 });
  desenharQuadro(sujo, { mapa, camera: camera(0, 0), peixes: [peixe], tempo: 1, turvacao: 1 });
  assert.equal(contar(limpo, COR.AGUA_SUJA), 0);
  assert.ok(contar(sujo, COR.AGUA_SUJA) > 5000, 'a água aparece na cor suja');
  const corpo = COR.PEIXE.vermelho.vivo.corpo;
  assert.equal(contar(sujo, corpo), contar(limpo, corpo), 'o peixe não perde pixels');
});

test('a cena: os grãos de comida aparecem em laranja, por cima da água suja', () => {
  const mapa = gerarMapa();
  const q = criarQuadro();
  const graos = [{ x: 60, y: 70, espera: 0 }, { x: 80, y: 40, espera: 2 }];
  desenharQuadro(q, { mapa, camera: camera(0, 0), peixes: [], tempo: 0, turvacao: 1, graos });
  assert.equal(contar(q, COR.GRAO), 3, 'um grão 2×2 com 1 pixel de brilho; o que ainda espera não aparece');
  assert.equal(contar(q, COR.GRAO_BRILHO), 1);
  assert.equal(q[70 * LARGURA + 60], COR.GRAO_BRILHO);
});

// --- A cor da superfície ---------------------------------------------------------------------

const brilho = (c) => c[0] + c[1] + c[2];

test('superfície: limpa é o azul claro de sempre; muito suja vira um amarelo-barrento', () => {
  assert.deepEqual(COR_SUPERFICIE_LIMPA, [0x86, 0xd0, 0xf2]);
  assert.deepEqual(corDaSuperficie(0), COR_SUPERFICIE_LIMPA);
  assert.deepEqual(corDaSuperficie(1), COR_SUPERFICIE_SUJA);
  const [r, g, b] = COR_SUPERFICIE_SUJA;
  assert.ok(r > b && g > b, 'barrenta: pouco azul');
  assert.ok(brilho(COR_SUPERFICIE_SUJA) > brilho(COR_AGUA_SUJA), 'continua mais clara que a água suja (a linha tem de aparecer)');
  assert.deepEqual(corDaSuperficie(-2), corDaSuperficie(0));
  assert.deepEqual(corDaSuperficie(9), corDaSuperficie(1));
});

test('superfície: a cor muda aos poucos, passando por todos os tons entre o azul e o barrento', () => {
  const azul = (c) => c[2] - (c[0] + c[1]) / 2; // quão azulada é
  let anterior = Infinity;
  const vistas = new Set();
  for (let n = 0; n <= 1.0001; n += 0.05) {
    const c = corDaSuperficie(n);
    assert.ok(azul(c) <= anterior + 1e-9, `só perde azul (nível ${n.toFixed(2)})`);
    anterior = azul(c);
    vistas.add(c.join());
  }
  assert.ok(vistas.size >= 15, 'muitos tons diferentes: é uma transição');
});

test('superfície: acompanha a água (começa a mudar em 60, não antes) e a linha continua inteira', () => {
  const mapa = gerarMapa();
  const cena = (sujeira) => {
    const q = criarQuadro();
    desenharQuadro(q, { mapa, camera: camera(0, 0), peixes: [], tempo: 1, turvacao: NIVEL(sujeira) });
    return q;
  };
  const limpa = cena(0);
  assert.deepEqual(COR_SOLIDA[COR.AZUL_AGUA], COR_SUPERFICIE_LIMPA);
  assert.ok(contar(limpa, COR.AZUL_AGUA) > 100, 'a linha da superfície aparece');
  cena(55);
  assert.deepEqual(COR_SOLIDA[COR.AZUL_AGUA], COR_SUPERFICIE_LIMPA, 'até 60 a superfície continua azul');
  const meio = cena(75);
  assert.deepEqual(COR_SOLIDA[COR.AZUL_AGUA], corDaSuperficie(fasesDaSujeira(75).agua));
  const suja = cena(100);
  assert.deepEqual(COR_SOLIDA[COR.AZUL_AGUA], COR_SUPERFICIE_SUJA);
  for (const quadro of [limpa, meio, suja]) {
    for (let x = 20; x < LARGURA; x++) { // (o filtro, no canto, cobre a linha nas primeiras colunas)
      const c = quadro[(SUPERFICIE_Y + deslocamentoDaOnda(x, 1)) * LARGURA + x];
      // (o bolor no vidro, na água imunda, pode cobrir a linha nos cantos)
      assert.ok(c === COR.AZUL_AGUA || c === COR.BOLOR || c === COR.BOLOR_CLARO, `linha em x=${x}`);
    }
  }
  cena(0); // limpou: tudo volta ao normal
  assert.deepEqual(COR_SOLIDA[COR.AZUL_AGUA], COR_SUPERFICIE_LIMPA);
  assert.deepEqual(PALETA[COR.AGUA_SUJA], [0, 0, 0]);
});

test('superfície: a água que cai do filtro é a mesma água, então muda junto', () => {
  assert.equal(COR.AZUL_AGUA, 5);
  aplicarCores(1);
  assert.deepEqual(COR_SOLIDA[5], COR_SUPERFICIE_SUJA);
  aplicarCores(0);
});
