// O HUD de indicadores: aparece por cima do jogo com B, sem trocar de tela, um indicador por canto.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { criarMenu, TELAS } from '../src/core/menu.js';
import {
  CELULAS, LARGURA_CELULA, ALTURA_CELULA, FOLGA, valoresDoHud, desenharIndicadores,
} from '../src/render/indicadores.js';
import { desenharTelas } from '../src/render/telas.js';
import { criarQuadro, LARGURA, ALTURA } from '../src/render/tela.js';
import { caracteresSemGlifo, larguraDoTexto } from '../src/render/fonte.js';
import { config, montar } from './ajuda.js';

const textos = JSON.parse(readFileSync(new URL('../config/textos.json', import.meta.url), 'utf8'));
const NADA = { a: false, b: false, c: false, cima: false, baixo: false, esquerda: false, direita: false };
const aperto = (...nomes) => ({ ...NADA, ...Object.fromEntries(nomes.map((n) => [n, true])) });
const contar = (q, cor) => q.reduce((n, c) => n + (c === cor ? 1 : 0), 0);
const novoMenu = () => criarMenu({ textos });
const naCelula = (nome, x, y) => {
  const c = CELULAS[nome];
  return x >= c.x && x < c.x + LARGURA_CELULA && y >= c.y && y < c.y + ALTURA_CELULA;
};

// --- O botão -----------------------------------------------------------------------------------

test('B na tela do jogo mostra o HUD e B de novo oculta; a tela continua sendo a do jogo', () => {
  const menu = novoMenu();
  const { aq } = montar();
  assert.equal(menu.hudVisivel, false, 'começa oculto');
  menu.apertar(aperto('b'), aq);
  assert.equal(menu.hudVisivel, true);
  assert.equal(menu.tela, TELAS.JOGO, 'não é uma tela nova');
  assert.equal(menu.cameraLivre(), true, 'a câmera continua andando com o HUD aberto');
  menu.apertar(aperto('b'), aq);
  assert.equal(menu.hudVisivel, false);
});

test('com o HUD aberto, A, C e o menu funcionam como sempre', () => {
  const menu = novoMenu();
  const { aq } = montar();
  menu.apertar(aperto('b'), aq);
  menu.apertar(aperto('a'), aq);
  assert.equal(menu.tela, TELAS.MENU);
  menu.apertar(aperto('b'), aq); // B no menu volta ao jogo (e não liga/desliga o HUD)
  assert.equal(menu.tela, TELAS.JOGO);
  assert.equal(menu.hudVisivel, true, 'o HUD continua como estava');
  menu.apertar(aperto('c'), aq);
  assert.equal(menu.tela, TELAS.STATUS);
  menu.apertar(aperto('b'), aq);
  assert.equal(menu.tela, TELAS.JOGO);
  assert.equal(menu.hudVisivel, true);
});

test('B no menu não liga o HUD', () => {
  const menu = novoMenu();
  const { aq } = montar();
  menu.apertar(aperto('a'), aq);
  menu.apertar(aperto('b'), aq);
  assert.equal(menu.hudVisivel, false);
});

// --- Onde fica cada um ------------------------------------------------------------------------

test('um indicador em cada canto: fome e saúde em cima, pH e sujeira embaixo, temperatura no meio de baixo', () => {
  assert.deepEqual(Object.keys(CELULAS).sort(), ['fome', 'ph', 'saude', 'sujeira', 'temperatura']);
  assert.ok(CELULAS.fome.x < LARGURA / 2 && CELULAS.fome.y < ALTURA / 2, 'fome: cima, esquerda');
  assert.ok(CELULAS.saude.x > LARGURA / 2 && CELULAS.saude.y < ALTURA / 2, 'saúde: cima, direita');
  assert.ok(CELULAS.ph.x < LARGURA / 2 && CELULAS.ph.y > ALTURA / 2, 'pH: baixo, esquerda');
  assert.ok(CELULAS.sujeira.x > LARGURA / 2 && CELULAS.sujeira.y > ALTURA / 2, 'sujeira: baixo, direita');
  const meio = CELULAS.temperatura.x + LARGURA_CELULA / 2;
  assert.ok(Math.abs(meio - LARGURA / 2) <= 1 && CELULAS.temperatura.y > ALTURA / 2, 'temperatura: baixo, no meio');
});

test('as caixinhas cabem na tela, não se sobrepõem e deixam o meio do jogo livre', () => {
  const nomes = Object.keys(CELULAS);
  for (const n of nomes) {
    const c = CELULAS[n];
    assert.ok(c.x >= 0 && c.y >= 0 && c.x + LARGURA_CELULA <= LARGURA && c.y + ALTURA_CELULA <= ALTURA, n);
  }
  for (let i = 0; i < nomes.length; i++) {
    for (let j = i + 1; j < nomes.length; j++) {
      const a = CELULAS[nomes[i]];
      const b = CELULAS[nomes[j]];
      const separadas = a.x + LARGURA_CELULA <= b.x || b.x + LARGURA_CELULA <= a.x
        || a.y + ALTURA_CELULA <= b.y || b.y + ALTURA_CELULA <= a.y;
      assert.ok(separadas, `${nomes[i]} e ${nomes[j]} se sobrepõem`);
    }
  }
  const q = criarQuadro();
  const { aq } = montar();
  desenharIndicadores(q, { aquario: aq, config, textos });
  for (let y = 30; y < 90; y++) {
    for (let x = 5; x < LARGURA - 5; x++) assert.equal(q[y * LARGURA + x], 0, `(${x}, ${y}) devia estar livre`);
  }
});

// --- O que mostram ----------------------------------------------------------------------------

test('valores: fome 0 a 200, saúde, pH, sujeira e temperatura vêm do jogo', () => {
  const { aq } = montar();
  aq.peixes[0].saciedade = 130;
  aq.peixes[0].saude = 64;
  aq.sujeira = 41.6;
  aq.phPasso = 5; // 7,2
  const v = valoresDoHud(aq, config, textos);
  assert.equal(v.fome.texto, '130');
  assert.equal(v.fome.maximo, 200);
  assert.equal(v.fome.ideal, 100);
  assert.equal(v.saude.texto, '64');
  assert.equal(v.sujeira.texto, '42');
  assert.equal(v.ph.texto, '7,2');
  assert.equal(v.temperatura.texto, `${config.agua.temperatura}°C`);
  assert.equal(v.temperatura.valor, null, 'a temperatura não tem barra');
});

test('valores: o que está impróprio fica marcado', () => {
  const { aq } = montar();
  const normal = valoresDoHud(aq, config, textos);
  assert.deepEqual([normal.fome.ruim, normal.saude.ruim, normal.ph.ruim, normal.sujeira.ruim], [false, false, false, false]);
  aq.peixes[0].saciedade = 10;
  aq.peixes[0].saude = 20;
  aq.sujeira = 90;
  aq.phPasso = 1;
  const ruim = valoresDoHud(aq, config, textos);
  assert.deepEqual([ruim.fome.ruim, ruim.saude.ruim, ruim.ph.ruim, ruim.sujeira.ruim], [true, true, true, true]);
});

test('sem peixe, fome e saúde mostram "--" em vez de dar erro', () => {
  const { aq } = montar(0);
  const v = valoresDoHud(aq, config, textos);
  assert.equal(v.fome.texto, '--');
  assert.equal(v.saude.texto, '--');
  const q = criarQuadro();
  assert.doesNotThrow(() => desenharIndicadores(q, { aquario: aq, config, textos }));
});

// --- O desenho --------------------------------------------------------------------------------

test('desenharTelas: o HUD só aparece com ele ligado, só na tela do jogo, e por cima dela', () => {
  const t = montar();
  const menu = novoMenu();
  const ctx = { menu, aquario: t.aq, config, textos, agoraMs: 0 };

  const oculto = criarQuadro();
  desenharTelas(oculto, ctx);
  assert.equal(contar(oculto, 0), LARGURA * ALTURA, 'oculto: não desenha nada');

  menu.apertar(aperto('b'), t.aq);
  const visivel = criarQuadro();
  visivel.fill(7); // o "jogo" por baixo
  desenharTelas(visivel, ctx);
  assert.ok(contar(visivel, 7) > LARGURA * ALTURA * 0.7, 'o jogo continua aparecendo por baixo');
  for (const nome of Object.keys(CELULAS)) {
    const c = CELULAS[nome];
    assert.notEqual(visivel[(c.y + 1) * LARGURA + c.x + 1], 7, `${nome}: a caixinha cobre o jogo no canto`);
  }

  menu.apertar(aperto('a'), t.aq); // abre o menu: o HUD não é desenhado por cima da tela do menu
  const noMenu = criarQuadro();
  noMenu.fill(7);
  desenharTelas(noMenu, ctx);
  assert.equal(noMenu[(CELULAS.fome.y + 1) * LARGURA + CELULAS.fome.x + 1], 7);
});

test('a barra da fome vai de 0 a 200: 100 é a metade, e acima disso aparece o rosa do excesso', () => {
  const { aq } = montar();
  const barra = (saciedade, cor) => {
    aq.peixes[0].saciedade = saciedade;
    const q = criarQuadro();
    desenharIndicadores(q, { aquario: aq, config, textos });
    const c = CELULAS.fome;
    let n = 0;
    for (let y = c.y; y < c.y + ALTURA_CELULA; y++) {
      for (let x = c.x; x < c.x + LARGURA_CELULA; x++) if (q[y * LARGURA + x] === cor) n++;
    }
    return n;
  };
  assert.equal(barra(100, 10), 0, 'em 100 nada rosa');
  assert.ok(barra(150, 10) > 0, 'acima de 100: excesso em rosa');
  assert.ok(barra(200, 10) > barra(150, 10));
  assert.ok(barra(100, 11) > barra(50, 11), 'mais cheia, mais barra');
});

test('os textos cabem nas caixinhas e só usam letras da fonte', () => {
  for (const k of ['fome', 'saude', 'temperatura', 'ph', 'sujeira', 'semPeixe']) {
    assert.deepEqual(caracteresSemGlifo(textos.hud[k]), [], k);
  }
  assert.deepEqual(caracteresSemGlifo('26°C 7,0 200'), []);
  const maximo = LARGURA_CELULA - 2 * FOLGA; // a folga de cada lado
  const { aq } = montar();
  aq.peixes[0].saciedade = 200;
  aq.peixes[0].saude = 100;
  aq.sujeira = 100;
  const v = valoresDoHud(aq, config, textos);
  for (const k of ['fome', 'saude', 'ph', 'sujeira']) {
    assert.ok(larguraDoTexto(textos.hud[k]) + 3 + larguraDoTexto(v[k].texto) <= maximo, `${k} não cabe: ${textos.hud[k]} ${v[k].texto}`);
  }
  assert.ok(larguraDoTexto(v.temperatura.texto) <= maximo);
  assert.ok(larguraDoTexto(textos.hud.temperatura) <= maximo);
});

test('nada do HUD vaza para fora da própria caixinha', () => {
  const { aq } = montar();
  aq.peixes[0].saciedade = 200;
  aq.sujeira = 100;
  const q = criarQuadro();
  desenharIndicadores(q, { aquario: aq, config, textos });
  for (let y = 0; y < ALTURA; y++) {
    for (let x = 0; x < LARGURA; x++) {
      if (q[y * LARGURA + x] === 0) continue;
      assert.ok(Object.keys(CELULAS).some((n) => naCelula(n, x, y)), `pixel solto em (${x}, ${y})`);
    }
  }
});
