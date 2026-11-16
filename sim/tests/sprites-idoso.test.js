import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SPRITES } from '../src/render/sprites.js';

test('idoso: mesmo desenho do adulto, mas com cores apagadas', () => {
  const adulto = SPRITES.beta.adulto;
  const idoso = SPRITES.beta.idoso;
  assert.equal(idoso.largura, adulto.largura);
  assert.equal(idoso.altura, adulto.altura);
  adulto.quadros.forEach((q, i) => {
    const qi = idoso.quadros[i];
    assert.notDeepEqual(Array.from(qi), Array.from(q), 'as cores deveriam mudar');
    q.forEach((cor, p) => {
      assert.equal(qi[p] === 0, cor === 0, 'o formato (transparência) não pode mudar');
    });
    assert.ok(!qi.includes(14) && !qi.includes(10) && !qi.includes(11), 'sobrou cor viva');
    assert.ok(qi.includes(12) && qi.includes(13), 'o olho precisa continuar');
  });
});

test('o adulto não é alterado pelo recolorido do idoso', () => {
  assert.ok(SPRITES.beta.adulto.quadros[0].includes(14));
  assert.ok(SPRITES.beta.adulto.quadros[0].includes(10));
});
