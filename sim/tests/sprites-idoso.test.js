import { COR } from '../src/render/palette.js';
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
    assert.ok(!Object.values(COR.BETA).some((c) => qi.includes(c)), 'sobrou o vermelho vivo');
    assert.ok(Object.values(COR.BETA_IDOSO).every((c) => qi.includes(c)), 'o vermelho apagado do idoso aparece');
    assert.ok(qi.includes(12) && qi.includes(13), 'o olho precisa continuar');
  });
});

test('o adulto não é alterado pelo recolorido do idoso', () => {
  assert.ok(SPRITES.beta.adulto.quadros[0].includes(COR.BETA.corpo));
  assert.ok(SPRITES.beta.adulto.quadros[0].includes(COR.BETA.nadadeira));
});
