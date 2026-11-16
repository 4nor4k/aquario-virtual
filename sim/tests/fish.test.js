import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarRng } from '../src/core/rng.js';
import {
  criarPeixe, atualizarPeixe, limitesDoPeixe, quadroDeNado,
  TAMANHO_POR_FASE, FASES, VELOCIDADE_NADO, QUADROS_DE_NADO,
} from '../src/core/fish.js';
import { MUNDO_LARGURA, AREIA_Y } from '../src/core/mundo.js';

const DT = 0.05; // um passo de 50 ms

function simular(peixe, rng, passos, aoFinalDoPasso) {
  for (let i = 0; i < passos; i++) {
    atualizarPeixe(peixe, DT, rng);
    if (aoFinalDoPasso) aoFinalDoPasso(peixe, i);
  }
}

test('todas as fases têm tamanho definido', () => {
  for (const fase of FASES) {
    assert.ok(TAMANHO_POR_FASE[fase].largura > 0 && TAMANHO_POR_FASE[fase].altura > 0, fase);
  }
});

test('tamanhos do doc 04: filhote 10×8, jovem 14×10, adulto 20×14; idoso = adulto', () => {
  assert.deepEqual(TAMANHO_POR_FASE.filhote, { largura: 10, altura: 8 });
  assert.deepEqual(TAMANHO_POR_FASE.jovem, { largura: 14, altura: 10 });
  assert.deepEqual(TAMANHO_POR_FASE.adulto, { largura: 20, altura: 14 });
  assert.deepEqual(TAMANHO_POR_FASE.idoso, TAMANHO_POR_FASE.adulto);
});

test('os limites ficam dentro da água, acima da areia', () => {
  for (const fase of FASES) {
    const l = limitesDoPeixe(fase);
    const { largura, altura } = TAMANHO_POR_FASE[fase];
    assert.ok(l.minX - largura / 2 >= 0, `${fase}: sai pela esquerda`);
    assert.ok(l.maxX + largura / 2 <= MUNDO_LARGURA, `${fase}: sai pela direita`);
    assert.ok(l.minY - altura / 2 > 0, `${fase}: encosta na superfície`);
    assert.ok(l.maxY + altura / 2 < AREIA_Y, `${fase}: encosta na areia`);
    assert.ok(l.minX < l.maxX && l.minY < l.maxY);
  }
});

test('fase inválida é recusada', () => {
  assert.throws(() => criarPeixe({ fase: 'gigante', x: 10, y: 10 }), RangeError);
});

test('o peixe nunca sai da água, em nenhuma fase, com várias sementes', () => {
  for (const fase of FASES) {
    const lim = limitesDoPeixe(fase);
    for (const semente of [1, 2, 3, 42, 999]) {
      const rng = criarRng(semente);
      const peixe = criarPeixe({ fase, x: 180, y: 120 });
      simular(peixe, rng, 20000, (p) => { // 1000 segundos de nado
        assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y), 'posição virou NaN');
        assert.ok(p.x >= lim.minX && p.x <= lim.maxX, `${fase}/${semente}: x=${p.x}`);
        assert.ok(p.y >= lim.minY && p.y <= lim.maxY, `${fase}/${semente}: y=${p.y}`);
      });
    }
  }
});

test('o peixe nunca anda mais rápido que a velocidade de nado', () => {
  const rng = criarRng(5);
  const peixe = criarPeixe({ x: 180, y: 120 });
  let ax = peixe.x;
  let ay = peixe.y;
  simular(peixe, rng, 5000, (p) => {
    const andou = Math.hypot(p.x - ax, p.y - ay);
    assert.ok(andou <= VELOCIDADE_NADO * DT + 1e-9, `andou ${andou}`);
    ax = p.x;
    ay = p.y;
  });
});

test('nada, para, e vira para os dois lados', () => {
  const rng = criarRng(7);
  const peixe = criarPeixe({ x: 180, y: 120 });
  const estados = new Set();
  const direcoes = new Set();
  simular(peixe, rng, 4000, (p) => { estados.add(p.estado); direcoes.add(p.direcao); });
  assert.deepEqual([...estados].sort(), ['esperando', 'nadando']);
  assert.deepEqual([...direcoes].sort(), [-1, 1]);
});

test('a direção acompanha o lado para onde ele nada', () => {
  const rng = criarRng(11);
  const peixe = criarPeixe({ x: 180, y: 120 });
  simular(peixe, rng, 6000, (p) => {
    if (p.estado === 'nadando' && Math.abs(p.destino.x - p.x) > 0.5) {
      assert.equal(p.direcao, p.destino.x > p.x ? 1 : -1);
    }
  });
});

test('cada destino fica a pelo menos 20 pixels de lado e a no máximo 30 de altura', () => {
  const rng = criarRng(13);
  const peixe = criarPeixe({ x: 180, y: 120 });
  let origem = null;
  simular(peixe, rng, 6000, (p) => {
    if (p.estado === 'nadando' && !origem) origem = { x: p.x, y: p.y, destino: p.destino };
    if (p.estado === 'esperando' && origem) {
      assert.ok(Math.abs(origem.destino.x - origem.x) >= 19.999, 'destino perto demais');
      assert.ok(Math.abs(origem.destino.y - origem.y) <= 30.001, 'destino alto/baixo demais');
      origem = null;
    }
  });
});

test('mesma semente: mesmo trajeto; semente diferente: trajeto diferente', () => {
  const rota = (semente) => {
    const rng = criarRng(semente);
    const p = criarPeixe({ x: 180, y: 120 });
    simular(p, rng, 1000);
    return [p.x, p.y, p.direcao];
  };
  assert.deepEqual(rota(3), rota(3));
  assert.notDeepEqual(rota(3), rota(4));
});

test('a animação de nadar passa pelos 4 quadros, em ordem, a 6 por segundo', () => {
  const peixe = criarPeixe({ x: 100, y: 100 });
  assert.equal(quadroDeNado(peixe), 0);
  const rng = criarRng(1);
  const vistos = [];
  for (let i = 0; i < 20; i++) { // 1 segundo
    atualizarPeixe(peixe, DT, rng);
    const q = quadroDeNado(peixe);
    if (vistos[vistos.length - 1] !== q) vistos.push(q);
  }
  assert.deepEqual(vistos.slice(0, 5), [0, 1, 2, 3, 0]);
  assert.equal(QUADROS_DE_NADO, 4);
});

test('a animação continua mesmo com o peixe parado', () => {
  const peixe = criarPeixe({ x: 100, y: 100 });
  peixe.espera = 100; // vai ficar parado
  const rng = criarRng(1);
  atualizarPeixe(peixe, 0.5, rng);
  assert.equal(peixe.estado, 'esperando');
  assert.equal(quadroDeNado(peixe), 3); // 0,5 s × 6 por segundo = quadro 3
});
