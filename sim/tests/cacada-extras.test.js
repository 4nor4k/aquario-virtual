// A caçada fora do núcleo (doc 14): recorde no arquivo salvo, o B segurado no teclado e o desenho.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { exportarJogo, importarJogo, ErroDeSalvamento } from '../src/core/salvar.js';
import { criarTeclado } from '../src/input/keyboard.js';
import { criarCacada } from '../src/core/cacada.js';
import { criarRng } from '../src/core/rng.js';
import { criarMenu } from '../src/core/menu.js';
import { desenharLarvas, desenharCacada, formatarTempoDaCacada } from '../src/render/cacada.js';
import { desenharTelas } from '../src/render/telas.js';
import { criarQuadro, LARGURA, ALTURA } from '../src/render/tela.js';
import { COR } from '../src/render/palette.js';
import { config, montar } from './ajuda.js';

const textos = JSON.parse(readFileSync(new URL('../config/textos.json', import.meta.url), 'utf8'));
const aperto = (...nomes) => Object.fromEntries(nomes.map((n) => [n, true]));
const contar = (q, cor) => q.reduce((n, c) => n + (c === cor ? 1 : 0), 0);

// --- Salvamento --------------------------------------------------------------------------------

test('o recorde vai e volta pelo arquivo salvo', () => {
  const { aq } = montar(1);
  const texto = JSON.stringify(exportarJogo(aq, { tempoJogoMs: 0, salvoEmMs: 1, recordeCacada: 14 }));
  assert.equal(importarJogo(JSON.parse(texto), { config }).recordeCacada, 14);
});

test('arquivo de antes da caçada abre com recorde 0', () => {
  const { aq } = montar(1);
  const dados = exportarJogo(aq, { tempoJogoMs: 0, salvoEmMs: 1 });
  delete dados.recordeCacada;
  assert.equal(importarJogo(dados, { config }).recordeCacada, 0);
});

test('recorde inválido no arquivo é recusado', () => {
  const { aq } = montar(1);
  for (const ruim of [-1, 2.5, '7', null, 1e9]) {
    const dados = exportarJogo(aq, { tempoJogoMs: 0, salvoEmMs: 1, recordeCacada: 3 });
    dados.recordeCacada = ruim;
    assert.throws(() => importarJogo(dados, { config }), (e) => e instanceof ErroDeSalvamento && e.message.includes('recordeCacada'));
  }
});

// --- Teclado -----------------------------------------------------------------------------------

test('segurando("b") vale enquanto a tecla está apertada e some ao soltar ou perder o foco', () => {
  const alvo = new EventTarget();
  const tecla = (tipo, code) => { const e = new Event(tipo, { cancelable: true }); e.code = code; alvo.dispatchEvent(e); };
  const t = criarTeclado(alvo);
  assert.equal(t.segurando('b'), false);
  tecla('keydown', 'KeyX');
  assert.equal(t.segurando('b'), true);
  t.botoes(); // ler os apertos não solta a tecla
  assert.equal(t.segurando('b'), true);
  assert.equal(t.segurando('a'), false);
  tecla('keyup', 'KeyX');
  assert.equal(t.segurando('b'), false);
  tecla('keydown', 'KeyX');
  alvo.dispatchEvent(new Event('blur'));
  assert.equal(t.segurando('b'), false);
  assert.equal(t.segurando('zzz'), false);
});

// --- Desenho -----------------------------------------------------------------------------------

test('o tempo aparece como m:ss, arredondando para cima', () => {
  assert.equal(formatarTempoDaCacada(60), '1:00');
  assert.equal(formatarTempoDaCacada(41.2), '0:42');
  assert.equal(formatarTempoDaCacada(0.3), '0:01');
  assert.equal(formatarTempoDaCacada(0), '0:00');
});

test('a larva é desenhada na cor do corpo e da cabeça, e some quando está fora da tela', () => {
  const camera = { x: 0, y: 0 };
  const q = criarQuadro();
  q.fill(1);
  desenharLarvas(q, [{ x: 60, y: 60, ang: 0, fase: 0 }], camera);
  assert.ok(contar(q, COR.CORACAO) > 0);
  assert.ok(contar(q, COR.CORACAO_CLARO) > 0);
  const longe = criarQuadro();
  longe.fill(1);
  desenharLarvas(longe, [{ x: 500, y: 500, ang: 0, fase: 0 }], camera);
  assert.equal(contar(longe, COR.CORACAO), 0);
});

function menuCacando() {
  const menu = criarMenu({ textos, cores: config.cores, config, aoNovoJogo() {} });
  const t = montar(1, undefined, { dadosPeixe: { fase: 'adulto' } });
  menu.apertar(aperto('a'), t.aq);
  while (menu.item !== 4) menu.apertar(aperto('baixo'), t.aq);
  menu.apertar(aperto('a'), t.aq);
  return { menu, aq: t.aq };
}

test('cada fase da caçada desenha algo diferente (contagem, jogando, pausa e fim)', () => {
  const { menu, aq } = menuCacando();
  const quadros = {};
  const tirar = (nome) => {
    const q = criarQuadro();
    q.fill(1);
    desenharTelas(q, { menu, aquario: aq, config, textos, agoraMs: 0 });
    quadros[nome] = q;
  };
  tirar('contagem');
  menu.cacada.atualizar(config.cacada.contagemSeg + 0.1);
  tirar('jogando');
  menu.apertar(aperto('a'), aq);
  tirar('pausa');
  menu.apertar(aperto('b'), aq);
  for (let t = 0; t < config.cacada.duracaoSeg + 1; t += 0.05) menu.cacada.atualizar(0.05);
  tirar('fim');
  const nomes = Object.keys(quadros);
  for (let i = 0; i < nomes.length; i++) {
    for (let j = i + 1; j < nomes.length; j++) {
      assert.notDeepEqual(quadros[nomes[i]], quadros[nomes[j]], `${nomes[i]} igual a ${nomes[j]}`);
    }
  }
  // A faixa de placar existe em todas e a água embaixo continua intacta.
  for (const q of Object.values(quadros)) assert.equal(q[(ALTURA - 1) * LARGURA], 1);
});

test('"NOVO RECORDE!" só aparece quando bate o recorde', () => {
  const desenhar = (novo) => {
    const c = criarCacada({ config, rng: criarRng(1), recorde: novo ? 0 : 99 });
    const t = montar(1, undefined, { dadosPeixe: { fase: 'adulto' } });
    c.iniciar(t.aq.peixes[0]);
    c.atualizar(config.cacada.contagemSeg + 0.1);
    // um ponto à força para passar do recorde 0
    const boca = { x: t.aq.peixes[0].x + t.aq.peixes[0].direcao * 14, y: t.aq.peixes[0].y };
    c.larvas[0].x = boca.x; c.larvas[0].y = boca.y;
    c.atualizar(0.05);
    for (let s = 0; s < config.cacada.duracaoSeg + 1; s += 0.05) c.atualizar(0.05);
    const q = criarQuadro();
    q.fill(1);
    desenharCacada(q, { cacada: c, textos });
    return { q, c };
  };
  const com = desenhar(true);
  const sem = desenhar(false);
  assert.equal(com.c.novoRecorde, true);
  assert.equal(sem.c.novoRecorde, false);
  assert.notDeepEqual(com.q, sem.q);
});

test('todos os textos da caçada cabem na tela', () => {
  const t = textos.cacada;
  assert.ok(t.pausa.itens.length === 3);
  for (const item of t.pausa.itens) assert.ok(item.length <= 12, item);
  assert.ok(t.pausa.dica.length <= 20);
  assert.ok(t.fim.dica.length <= 22);
  assert.ok(t.fim.novoRecorde.length <= 22);
});
