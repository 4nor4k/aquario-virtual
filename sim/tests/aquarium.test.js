import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarAquario } from '../src/core/aquarium.js';
import { config } from './ajuda.js';
import { limitesDoPeixe } from '../src/core/fish.js';

test('começa sem peixes e cada peixe novo recebe um número diferente', () => {
  const aq = criarAquario({ config });
  assert.equal(aq.peixes.length, 0);
  const a = aq.adicionarPeixe();
  const b = aq.adicionarPeixe();
  assert.notEqual(a.id, b.id);
  assert.equal(aq.peixes.length, 2);
});

test('sem posição, o peixe aparece dentro da água', () => {
  for (const fase of ['filhote', 'jovem', 'adulto', 'idoso']) {
    const aq = criarAquario({ config });
    const p = aq.adicionarPeixe({ fase });
    const lim = limitesDoPeixe(fase);
    assert.ok(p.x >= lim.minX && p.x <= lim.maxX, `${fase}: x=${p.x}`);
    assert.ok(p.y >= lim.minY && p.y <= lim.maxY, `${fase}: y=${p.y}`);
  }
});

test('atualizar move todos os peixes sem tirá-los da água', () => {
  const aq = criarAquario({ config, semente: 9 });
  aq.adicionarPeixe({ fase: 'filhote' });
  aq.adicionarPeixe({ fase: 'adulto' });
  for (let i = 0; i < 10000; i++) {
    aq.atualizar(0.05);
    for (const p of aq.peixes) {
      const lim = limitesDoPeixe(p.fase);
      assert.ok(p.x >= lim.minX && p.x <= lim.maxX && p.y >= lim.minY && p.y <= lim.maxY);
    }
  }
});

test('mesma semente no aquário: mesmo resultado', () => {
  const rodar = (semente) => {
    const aq = criarAquario({ config, semente });
    aq.adicionarPeixe();
    for (let i = 0; i < 2000; i++) aq.atualizar(0.05);
    const p = aq.peixes[0];
    return [p.x, p.y, p.direcao];
  };
  assert.deepEqual(rodar(5), rodar(5));
  assert.notDeepEqual(rodar(5), rodar(6));
});
