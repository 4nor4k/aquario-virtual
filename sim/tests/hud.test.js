import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emblemasDoCanto, emblemasDoPeixe, desenharHud, desenharCruz, CRUZ } from '../src/render/hud.js';
import { COR, COLORIDOS } from '../src/render/palette.js';
import { avisosDoAquario, peixeComFome, matarPeixe } from '../src/core/rules.js';
import { criarQuadro } from '../src/render/tela.js';
import { criarCamera } from '../src/render/camera.js';
import { MUNDO_LARGURA, MUNDO_ALTURA } from '../src/core/mundo.js';
import { montar, config } from './ajuda.js';

test('sem nada impróprio, nenhum aviso', () => {
  const { aq } = montar();
  assert.deepEqual(avisosDoAquario(aq, config), { fome: false, sujeira: false, ph: false });
  assert.deepEqual(emblemasDoCanto(aq, config), []);
  assert.deepEqual(emblemasDoPeixe(aq.peixes[0], config), []);
});

test('fome: abaixo de 30; exatamente 30 ainda não', () => {
  const { aq } = montar();
  const p = aq.peixes[0];
  p.saciedade = 30;
  assert.equal(peixeComFome(p, config), false);
  p.saciedade = 29.9;
  assert.equal(peixeComFome(p, config), true);
  assert.deepEqual(emblemasDoCanto(aq, config), ['F']);
  assert.deepEqual(emblemasDoPeixe(p, config), [{ letra: 'F', cor: 10 }]);
});

test('sujeira: acima de 70; pH: nota 30 ou menos (6,4 e 6,2)', () => {
  const { aq } = montar();
  aq.sujeira = 70;
  assert.equal(avisosDoAquario(aq, config).sujeira, false);
  aq.sujeira = 70.1;
  assert.equal(avisosDoAquario(aq, config).sujeira, true);

  for (const [passo, aviso] of [[6, false], [3, false], [2, false], [1, true], [0, true]]) {
    aq.phPasso = passo;
    assert.equal(avisosDoAquario(aq, config).ph, aviso, `pH passo ${passo}`);
  }
});

test('os emblemas do canto saem na ordem F, S, P', () => {
  const { aq } = montar();
  aq.peixes[0].saciedade = 0;
  aq.sujeira = 100;
  aq.phPasso = 0;
  assert.deepEqual(emblemasDoCanto(aq, config), ['F', 'S', 'P']);
});

test('a cruz da saúde NÃO acompanha o peixe: sobre ele só aparece o F da fome, qualquer que seja a saúde', () => {
  const { aq } = montar();
  const p = aq.peixes[0];
  for (const saude of [100, 69, 30, 29, 1]) {
    p.saude = saude;
    assert.deepEqual(emblemasDoPeixe(p, config), [], `saúde ${saude}: nenhum emblema`);
  }
  p.saude = 20;
  p.saciedade = 0;
  assert.deepEqual(emblemasDoPeixe(p, config), [{ letra: 'F', cor: 10 }]);
});

test('peixe morto e aquário sem peixe vivo não mostram avisos', () => {
  const { aq } = montar();
  aq.peixes[0].saciedade = 0;
  aq.sujeira = 100;
  matarPeixe(aq, aq.peixes[0]);
  assert.deepEqual(emblemasDoPeixe(aq.peixes[0], config), []);
  assert.deepEqual(emblemasDoCanto(aq, config), []);
});

test('desenharHud pinta o emblema no canto e sobre o peixe, sem dar erro nas bordas', () => {
  const { aq } = montar();
  const p = aq.peixes[0];
  p.saciedade = 0;
  p.saude = 20;
  p.estado = 'doente';
  aq.sujeira = 100;
  const camera = criarCamera({
    mundoLargura: MUNDO_LARGURA, mundoAltura: MUNDO_ALTURA, janelaLargura: 120, janelaAltura: 120,
    x: 0, y: 0,
  });

  // No meio da tela e colado no alto (o emblema vai para baixo do peixe) e nos cantos.
  for (const [x, y] of [[60, 60], [60, 6], [2, 60], [118, 118], [-30, -30]]) {
    p.x = x;
    p.y = y;
    const quadro = criarQuadro();
    desenharHud(quadro, { aquario: aq, config, camera });
    assert.equal(quadro[2 * 120 + 2], 10, 'emblema F (rosa) no cantinho'); // canto (2, 2)
    assert.ok(quadro.length === 120 * 120);
  }

  // Peixe no meio e muito doente: só o emblema F (rosa) aparece sobre ele; nenhuma cruz de saúde no quadro.
  p.x = 60;
  p.y = 60;
  const quadro = criarQuadro();
  desenharHud(quadro, { aquario: aq, config, camera });
  assert.ok(quadro.includes(10), 'emblema F do peixe com fome');
  for (const cor of Object.values(COR.STATUS)) assert.ok(!quadro.includes(cor), 'nenhuma cruz de saúde sobre o peixe');
});

test('a cruz tem 7×7, braços de 3 pixels e as cores do status são sólidas e diferentes', () => {
  assert.equal(CRUZ.length, 7);
  assert.ok(CRUZ.every((l) => l.length === 7));
  assert.equal(CRUZ.join('').split('X').length - 1, 33, '4 linhas de 3 pixels + 3 linhas de 7 = 33 pixels de cruz');
  const cores = Object.values(COR.STATUS);
  assert.equal(new Set(cores).size, 4, 'verde, amarelo, vermelho e azul são índices diferentes');
  for (const c of cores) assert.ok(COLORIDOS.includes(c), `índice ${c} tem de ser sólido (sem dithering)`);
  const q = criarQuadro();
  desenharCruz(q, 10, 10, 'verde');
  assert.equal(q.filter((c) => c === COR.STATUS.verde).length, 33);
});
