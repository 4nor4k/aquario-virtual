// Teste de ponta a ponta: o jogo inteiro, sem navegador, do começo ao Game Over e ao recomeço.
// Usa o mesmo laço do main.js (passos de 50 ms reais) a 3600×.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { criarAquario } from '../src/core/aquarium.js';
import { criarMenu, TELAS } from '../src/core/menu.js';
import { HORA_MS } from '../src/core/clock.js';
import { config } from './ajuda.js';

const textos = JSON.parse(readFileSync(new URL('../config/textos.json', import.meta.url), 'utf8'));

function iniciar() {
  const jogo = { aq: null, recomecos: 0, agoraMs: 0 };
  const menu = criarMenu({
    textos,
    aoNovoJogo() {
      jogo.recomecos++;
      jogo.agoraMs = 0;
      jogo.aq = criarAquario({ config, semente: jogo.recomecos + 1 });
      jogo.aq.adicionarPeixe({}, 0);
      menu.reiniciar();
    },
  });
  jogo.aq = criarAquario({ config, semente: 1 });
  jogo.aq.adicionarPeixe({}, 0);
  jogo.menu = menu;
  // Um passo de 50 ms reais a "velocidade" vezes mais rápido.
  jogo.passo = (velocidade) => {
    jogo.agoraMs += 50 * velocidade;
    jogo.aq.atualizar(0.05, jogo.agoraMs);
    menu.atualizar(0.05, jogo.aq);
  };
  return jogo;
}

test('sem cuidado nenhum, a 3600×: doente, morto, 5 s depois Game Over, e A recomeça', () => {
  const jogo = iniciar();
  const peixe = jogo.aq.peixes[0];
  const vistos = [];
  let segundosReais = 0;
  let segundosAteOGameOver = null;

  while (jogo.menu.tela !== TELAS.GAME_OVER && segundosReais < 600) {
    jogo.passo(3600);
    segundosReais += 0.05;
    if (vistos[vistos.length - 1] !== peixe.estado) vistos.push(peixe.estado);
    if (jogo.aq.gameOver && segundosAteOGameOver === null) segundosAteOGameOver = segundosReais;
  }

  assert.deepEqual(vistos, ['saudavel', 'doente', 'morto']);
  assert.equal(jogo.menu.tela, TELAS.GAME_OVER);
  assert.equal(jogo.aq.causaDoGameOver, 'cuidado');
  // Morre aos ~3,7 dias de jogo = ~89 s reais a 3600×; o Game Over vem 5 s depois.
  assert.ok(segundosAteOGameOver > 80 && segundosAteOGameOver < 100, `morreu aos ${segundosAteOGameOver} s`);
  assert.ok(Math.abs(segundosReais - segundosAteOGameOver - 5) < 0.2, 'Game Over 5 s depois');
  assert.ok(jogo.agoraMs / HORA_MS < 120, 'menos de 5 dias de jogo');

  jogo.menu.apertar({ a: true }, jogo.aq);
  assert.equal(jogo.recomecos, 1);
  assert.equal(jogo.menu.tela, TELAS.JOGO);
  assert.equal(jogo.aq.gameOver, false);
  assert.equal(jogo.aq.peixes[0].fase, 'filhote');
  assert.equal(jogo.aq.peixes[0].estado, 'saudavel');
  assert.equal(jogo.aq.sujeira, 0);
});

test('cuidando bem (comida, limpeza e pH a cada 2 dias), o peixe chega aos 30 dias e morre de velhice', () => {
  const jogo = iniciar();
  const peixe = jogo.aq.peixes[0];
  let ultimoCuidado = 0;
  let adoeceu = false;

  // 1 passo = 50 ms reais a 3600× = 3 minutos de jogo.
  while (!jogo.aq.gameOver && jogo.agoraMs < 40 * 24 * HORA_MS) {
    jogo.passo(3600);
    if (peixe.estado === 'doente') adoeceu = true;
    const horas = jogo.agoraMs / HORA_MS;
    if (horas - ultimoCuidado >= 24) { // comida todo dia; limpeza e pH a cada 2 dias
      jogo.menu.executar('comida', jogo.aq);
      if (Math.round(horas / 24) % 2 === 0) {
        jogo.menu.executar('limpar', jogo.aq);
        jogo.menu.executar('ph', jogo.aq);
      }
      ultimoCuidado = horas;
    }
  }
  assert.equal(adoeceu, false);
  assert.equal(jogo.aq.causaDoGameOver, 'velhice');
  assert.ok(Math.abs(jogo.agoraMs / HORA_MS - 720) < 1, `morreu em ${jogo.agoraMs / HORA_MS} h`);
  assert.deepEqual(['filhote', 'jovem', 'adulto', 'idoso'].includes(peixe.fase), true);
});
