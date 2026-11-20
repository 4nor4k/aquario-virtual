// O minigame "Caçar" (doc 14): larvas que fogem, captura, tempo, pausa, recorde, peixe controlado e o menu.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { criarCacada, bocaDoPeixe, limitesDaLarva } from '../src/core/cacada.js';
import { criarRng } from '../src/core/rng.js';
import { criarMenu, TELAS, ACOES } from '../src/core/menu.js';
import { atualizarPeixeControlado, limitesDoPeixe } from '../src/core/fish.js';
import { config, montar } from './ajuda.js';

const textos = JSON.parse(readFileSync(new URL('../config/textos.json', import.meta.url), 'utf8'));
const aperto = (...nomes) => Object.fromEntries(nomes.map((n) => [n, true]));
const cfg = config.cacada;
const PARADO = { dir: { x: 0, y: 0 }, acelerando: false };

function nova({ semente = 1, recorde = 0, terminou = [] } = {}) {
  const t = montar(1, undefined, { dadosPeixe: { fase: 'adulto', x: 120, y: 80 } });
  const peixe = t.aq.peixes[0];
  const c = criarCacada({ config, rng: criarRng(semente), recorde, aoTerminar: (r) => terminou.push(r) });
  c.iniciar(peixe);
  return { c, peixe, aq: t.aq, terminou };
}
// Passa a contagem e deixa a caçada em "jogando".
function comecar(c) {
  c.atualizar(cfg.contagemSeg + 0.01, PARADO);
  assert.equal(c.fase, 'jogando');
}
const rodar = (c, segundos, entrada = PARADO, passo = 0.05) => {
  for (let t = 0; t < segundos; t += passo) c.atualizar(passo, entrada);
};

// --- O peixe controlado ------------------------------------------------------------------------

test('peixe controlado: anda na direção do joystick, vira para o lado e respeita os limites', () => {
  const t = montar(1, undefined, { dadosPeixe: { fase: 'adulto', x: 120, y: 80 } });
  const p = t.aq.peixes[0];
  atualizarPeixeControlado(p, 1, { x: -1, y: 0 }, 40);
  assert.equal(p.x, 80);
  assert.equal(p.direcao, -1);
  assert.equal(p.movimento, 'nadando');
  atualizarPeixeControlado(p, 1, { x: 0, y: 0 }, 40);
  assert.equal(p.x, 80);
  assert.equal(p.movimento, 'esperando');
  atualizarPeixeControlado(p, 100, { x: 1, y: 1 }, 40);
  const lim = limitesDoPeixe('adulto');
  assert.equal(p.x, lim.maxX);
  assert.equal(p.y, lim.maxY);
});

test('na diagonal o peixe não anda mais depressa', () => {
  const t = montar(1, undefined, { dadosPeixe: { fase: 'adulto', x: 100, y: 60 } });
  const p = t.aq.peixes[0];
  atualizarPeixeControlado(p, 1, { x: 1, y: 1 }, 40);
  assert.ok(Math.abs(Math.hypot(p.x - 100, p.y - 60) - 40) < 1e-9);
});

test('o aquário não move o peixe controlado', () => {
  const t = montar(1, undefined, { dadosPeixe: { fase: 'adulto', x: 120, y: 80 } });
  const p = t.aq.peixes[0];
  p.controlado = true;
  for (let i = 0; i < 100; i++) t.aq.atualizar(0.05, 0);
  assert.equal(p.x, 120);
  assert.equal(p.y, 80);
});

// --- Começo, contagem e tempo ------------------------------------------------------------------

test('começa em contagem regressiva (3, 2, 1) com as larvas já na água, e o peixe não anda', () => {
  const { c, peixe } = nova();
  assert.equal(c.fase, 'contagem');
  assert.equal(c.numeroDaContagem, 3);
  assert.equal(c.larvas.length, cfg.larvas);
  assert.equal(peixe.controlado, true);
  c.atualizar(1.2, { dir: { x: 1, y: 0 }, acelerando: false });
  assert.equal(c.numeroDaContagem, 2);
  assert.equal(peixe.x, 120);
  c.atualizar(2, PARADO);
  assert.equal(c.fase, 'jogando');
});

test('a partida dura a duração do config e então termina', () => {
  const { c, terminou } = nova();
  comecar(c);
  rodar(c, cfg.duracaoSeg - 1);
  assert.equal(c.fase, 'jogando');
  assert.ok(c.restante > 0.5 && c.restante < 1.5);
  rodar(c, 2);
  assert.equal(c.fase, 'fim');
  assert.equal(c.restante, 0);
  assert.equal(terminou.length, 1);
  assert.equal(c.larvas.length, 0);
});

// --- As larvas ---------------------------------------------------------------------------------

test('as larvas nascem dentro da água e longe do peixe', () => {
  for (let semente = 1; semente <= 30; semente++) {
    const { c, peixe } = nova({ semente });
    for (const l of c.larvas) {
      const L = limitesDaLarva('adulto');
      assert.ok(l.x >= L.minX && l.x <= L.maxX);
      assert.ok(l.y >= L.minY && l.y <= L.maxY);
      assert.ok(Math.hypot(l.x - peixe.x, l.y - peixe.y) >= cfg.distanciaMinimaAoNascer - 1e-9);
    }
  }
});

test('larva com o peixe perto foge: a distância aumenta', () => {
  const { c, peixe } = nova();
  comecar(c);
  const l = c.larvas[0];
  l.x = peixe.x + 15;
  l.y = peixe.y;
  const antes = Math.hypot(l.x - peixe.x, l.y - peixe.y);
  rodar(c, 0.3);
  const depois = Math.hypot(l.x - peixe.x, l.y - peixe.y);
  assert.equal(l.fugindo, true);
  assert.ok(depois > antes, `${depois} > ${antes}`);
});

test('larva longe do peixe só passeia (devagar)', () => {
  const { c, peixe } = nova();
  comecar(c);
  const l = c.larvas[0];
  l.x = peixe.x + cfg.raioSusto + 40;
  l.y = peixe.y;
  const x0 = l.x;
  const y0 = l.y;
  rodar(c, 1);
  assert.equal(l.fugindo, false);
  assert.ok(Math.hypot(l.x - x0, l.y - y0) <= cfg.velocidadePasseio * 1.01);
});

test('a larva nunca sai da água, mesmo fugindo para a parede', () => {
  const { c, peixe } = nova();
  comecar(c);
  const l = c.larvas[0];
  const L = limitesDaLarva('adulto');
  l.x = L.maxX - 2;
  l.y = L.maxY - 2;
  peixe.x = l.x - 12;
  peixe.y = l.y - 12;
  rodar(c, 5, { dir: { x: 1, y: 1 }, acelerando: false });
  for (const v of c.larvas) {
    assert.ok(v.x >= L.minX && v.x <= L.maxX);
    assert.ok(v.y >= L.minY && v.y <= L.maxY);
  }
});

test('a velocidade combina com o plano: sem B a larva escapa, com B o peixe alcança', () => {
  assert.ok(cfg.velocidadePeixe < cfg.velocidadeFuga);
  assert.ok(cfg.velocidadeFuga < cfg.velocidadeComB);
});

// --- Pegar larvas ------------------------------------------------------------------------------

test('a boca do peixe pega a larva: +1 ponto, e outra aparece depois', () => {
  const { c, peixe } = nova();
  comecar(c);
  const boca = bocaDoPeixe(peixe);
  const l = c.larvas[0];
  l.x = boca.x + 2;
  l.y = boca.y;
  c.atualizar(0.05, PARADO);
  assert.equal(c.pontos, 1);
  assert.equal(c.larvas.length, cfg.larvas - 1);
  rodar(c, cfg.reaparecerSeg + 0.2);
  assert.equal(c.larvas.length, cfg.larvas);
});

test('a boca fica na frente do peixe, de acordo com o lado em que ele olha', () => {
  const { peixe } = nova();
  peixe.direcao = 1;
  assert.ok(bocaDoPeixe(peixe).x > peixe.x);
  peixe.direcao = -1;
  assert.ok(bocaDoPeixe(peixe).x < peixe.x);
});

test('larva atrás do peixe (longe da boca) não é pega', () => {
  const { c, peixe } = nova();
  comecar(c);
  peixe.direcao = 1;
  const l = c.larvas[0];
  l.x = peixe.x - 20;
  l.y = peixe.y;
  c.atualizar(0.01, PARADO);
  assert.equal(c.pontos, 0);
});

// --- Pausa, reiniciar e sair -------------------------------------------------------------------

test('A pausa: o tempo, o peixe e as larvas congelam; Continuar volta', () => {
  const { c, peixe } = nova();
  comecar(c);
  rodar(c, 2, { dir: { x: 1, y: 0 }, acelerando: false });
  c.apertar(aperto('a'));
  assert.equal(c.fase, 'pausa');
  const restante = c.restante;
  const x = peixe.x;
  const larva = { ...c.larvas[0] };
  rodar(c, 5, { dir: { x: 1, y: 0 }, acelerando: true });
  assert.equal(c.restante, restante);
  assert.equal(peixe.x, x);
  assert.equal(c.larvas[0].x, larva.x);
  c.apertar(aperto('a')); // o primeiro item é "Continuar"
  assert.equal(c.fase, 'jogando');
});

test('na pausa, B também continua; cima/baixo escolhem e dão a volta', () => {
  const { c } = nova();
  comecar(c);
  c.apertar(aperto('a'));
  c.apertar(aperto('cima'));
  assert.equal(c.item, 2);
  c.apertar(aperto('baixo'));
  assert.equal(c.item, 0);
  c.apertar(aperto('b'));
  assert.equal(c.fase, 'jogando');
});

test('pausar durante a contagem volta para a contagem', () => {
  const { c } = nova();
  c.apertar(aperto('a'));
  assert.equal(c.fase, 'pausa');
  c.apertar(aperto('b'));
  assert.equal(c.fase, 'contagem');
});

test('Reiniciar zera pontos e tempo e recomeça pela contagem', () => {
  const { c } = nova();
  comecar(c);
  const boca = bocaDoPeixe(c.peixe);
  c.larvas[0].x = boca.x;
  c.larvas[0].y = boca.y;
  rodar(c, 5);
  assert.ok(c.pontos >= 1);
  c.apertar(aperto('a'));
  c.apertar(aperto('baixo'));
  assert.equal(c.apertar(aperto('a')), null);
  assert.equal(c.fase, 'contagem');
  assert.equal(c.pontos, 0);
  assert.equal(c.restante, cfg.duracaoSeg);
  assert.equal(c.larvas.length, cfg.larvas);
});

test('Sair devolve o peixe ao aquário e termina a caçada', () => {
  const { c, peixe } = nova();
  comecar(c);
  c.apertar(aperto('a'));
  c.apertar(aperto('cima'));
  assert.equal(c.apertar(aperto('a')), 'sair');
  assert.equal(c.fase, null);
  assert.equal(c.ativa, false);
  assert.equal(peixe.controlado, false);
});

// --- Fim e recorde -----------------------------------------------------------------------------

test('o recorde só sobe quando a partida passa dele; empate não é novo recorde', () => {
  const r = [];
  const { c } = nova({ recorde: 2, terminou: r });
  comecar(c);
  // Pega 2 larvas à força (empata com o recorde).
  for (let i = 0; i < 2; i++) {
    const boca = bocaDoPeixe(c.peixe);
    c.larvas[0].x = boca.x;
    c.larvas[0].y = boca.y;
    c.atualizar(0.05, PARADO);
  }
  assert.equal(c.pontos, 2);
  rodar(c, cfg.duracaoSeg);
  assert.equal(c.fase, 'fim');
  assert.equal(c.novoRecorde, false);
  assert.equal(c.recorde, 2);
  assert.deepEqual(r, [{ pontos: 2, novoRecorde: false }]);
});

test('novo recorde: guarda e avisa', () => {
  const r = [];
  const { c } = nova({ recorde: 0, terminou: r });
  comecar(c);
  const boca = bocaDoPeixe(c.peixe);
  c.larvas[0].x = boca.x;
  c.larvas[0].y = boca.y;
  c.atualizar(0.05, PARADO);
  rodar(c, cfg.duracaoSeg);
  assert.equal(c.novoRecorde, true);
  assert.equal(c.recorde, 1);
  assert.deepEqual(r, [{ pontos: 1, novoRecorde: true }]);
});

test('na tela de fim, A joga de novo e B sai', () => {
  const { c } = nova();
  comecar(c);
  rodar(c, cfg.duracaoSeg + 1);
  assert.equal(c.fase, 'fim');
  c.apertar(aperto('a'));
  assert.equal(c.fase, 'contagem');
  rodar(c, cfg.duracaoSeg + 5);
  assert.equal(c.fase, 'fim');
  assert.equal(c.apertar(aperto('b')), 'sair');
  assert.equal(c.fase, null);
});

test('definirRecorde aceita só números inteiros de 0 para cima', () => {
  const { c } = nova();
  c.definirRecorde(12);
  assert.equal(c.recorde, 12);
  c.definirRecorde(-4);
  assert.equal(c.recorde, 0);
  c.definirRecorde(NaN);
  assert.equal(c.recorde, 0);
});

// --- O menu ------------------------------------------------------------------------------------

function novoMenu({ dadosPeixe = { fase: 'adulto' } } = {}) {
  const chamadas = [];
  const menu = criarMenu({ textos, cores: config.cores, aoNovoJogo() {}, aoAgir: (a) => chamadas.push(a), config });
  const t = montar(1, undefined, { dadosPeixe });
  return { menu, aq: t.aq, peixe: t.aq.peixes[0], chamadas };
}
function abrirPeloMenu(menu, aq) {
  menu.apertar(aperto('a'), aq);
  while (ACOES[menu.item] !== 'cacar') menu.apertar(aperto('baixo'), aq);
  menu.apertar(aperto('a'), aq);
}

test('o menu tem o item "Caçar" e ele abre a caçada com o peixe em foco', () => {
  const { menu, aq, peixe } = novoMenu();
  assert.equal(textos.menu.itens[ACOES.indexOf('cacar')], 'Caçar');
  abrirPeloMenu(menu, aq);
  assert.equal(menu.tela, TELAS.CACADA);
  assert.equal(menu.cacada.peixe, peixe);
  assert.equal(peixe.controlado, true);
  assert.equal(menu.cameraLivre(), false);
});

test('A pausa e Sair volta ao jogo normal, pelo menu', () => {
  const { menu, aq, peixe } = novoMenu();
  abrirPeloMenu(menu, aq);
  menu.apertar(aperto('a'), aq);
  assert.equal(menu.cacada.fase, 'pausa');
  menu.apertar(aperto('cima'), aq);
  menu.apertar(aperto('a'), aq);
  assert.equal(menu.tela, TELAS.JOGO);
  assert.equal(peixe.controlado, false);
});

test('peixe doente, morto ou namorando não caça: mensagem e nada muda', () => {
  const casos = [
    [(p) => { p.saude = 50; }, textos.mensagens.cacar.fraco],
    [(p) => { p.saude = 10; }, textos.mensagens.cacar.fraco],
    [(p) => { p.estado = 'morto'; }, textos.mensagens.cacar.morto],
    [(p) => { p.namorando = { x: 1, y: 1, olharPara: 1 }; }, textos.mensagens.cacar.namorando],
  ];
  for (const [preparar, mensagem] of casos) {
    const { menu, aq, peixe } = novoMenu();
    preparar(peixe);
    abrirPeloMenu(menu, aq);
    assert.equal(menu.tela, TELAS.JOGO);
    assert.equal(menu.mensagem, mensagem);
    assert.equal(peixe.controlado, false);
  }
});

test('se o peixe morre durante a caçada, ela acaba na hora com um aviso', () => {
  const { menu, aq, peixe } = novoMenu();
  peixe.nome = 'Nemo';
  abrirPeloMenu(menu, aq);
  aq.matar(peixe);
  menu.atualizar(0.05, aq);
  assert.equal(menu.tela, TELAS.JOGO);
  assert.equal(menu.cacada.ativa, false);
  assert.match(menu.mensagem, /Nemo/);
});

test('o fim da partida avisa a interface (para salvar) e o recorde fica no menu', () => {
  const { menu, aq, chamadas } = novoMenu();
  menu.definirRecorde(3);
  assert.equal(menu.recorde, 3);
  abrirPeloMenu(menu, aq);
  menu.cacada.atualizar(cfg.contagemSeg + 0.1, PARADO);
  for (let t = 0; t < cfg.duracaoSeg + 1; t += 0.05) menu.cacada.atualizar(0.05, PARADO);
  assert.equal(menu.cacada.fase, 'fim');
  assert.ok(chamadas.includes('cacada'));
});

test('reiniciar o menu (novo jogo) cancela a caçada, mas mantém o recorde', () => {
  const { menu, aq, peixe } = novoMenu();
  menu.definirRecorde(9);
  abrirPeloMenu(menu, aq);
  menu.reiniciar();
  assert.equal(menu.tela, TELAS.JOGO);
  assert.equal(menu.cacada.ativa, false);
  assert.equal(peixe.controlado, false);
  assert.equal(menu.recorde, 9);
});

test('toda larva fica onde a boca do peixe alcança, em qualquer fase (nada preso no teto ou no chão)', () => {
  for (const fase of ['filhote', 'jovem', 'adulto']) {
    const lim = limitesDoPeixe(fase);
    const L = limitesDaLarva(fase);
    assert.ok(L.minY - lim.minY >= -cfg.raioCaptura, fase);
    assert.ok(L.maxY - lim.maxY <= cfg.raioCaptura, fase);
  }
});
