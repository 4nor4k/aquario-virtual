// Testes de saúde, doença, morte e Game Over (doc 03, seções 3 e 4).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarAquario } from '../src/core/aquarium.js';
import { taxaDaSaude, mediaDoPeixe } from '../src/core/rules.js';
import { fimDaVidaNatural, limitesDoPeixe } from '../src/core/fish.js';
import { DIA_MS, HORA_MS } from '../src/core/clock.js';
import { config, montar, perto } from './ajuda.js';

const eventosDe = (aq, tipo) => aq.eventos.retirar().filter((e) => e.tipo === tipo);

// Põe os indicadores em valores conhecidos (sac = saciedade, suj = sujeira, ph = posição do pH).
function ajustar(aq, { sac, suj, ph }) {
  for (const p of aq.peixes) if (sac !== undefined) p.saciedade = sac;
  if (suj !== undefined) aq.sujeira = suj;
  if (ph !== undefined) aq.phPasso = ph;
}

// --- Média e faixas ------------------------------------------------------------------------

test('a média tem os três indicadores com peso igual', () => {
  const { aq } = montar();
  ajustar(aq, { sac: 60, suj: 30, ph: 2 }); // pH 6,6 = nota 60
  perto(mediaDoPeixe(aq.peixes[0], aq, config), (60 + 70 + 60) / 3, 1e-9);
});

test('taxa de saúde por faixa de média, inclusive nas fronteiras', () => {
  const casos = [
    [100, 6], [70, 6], [69.9, 0], [55, 0], [40, 0],
    [39.9, -3], [20, -3], [15, -3], [14.9, -5], [0, -5],
  ];
  for (const [media, taxa] of casos) {
    assert.equal(taxaDaSaude(media, config.saude), taxa, `média ${media}`);
  }
});

test('em 1 hora a saúde muda como manda a faixa da média', () => {
  const casos = [
    // [descrição, indicadores, saúde inicial, saúde esperada depois de 1 h]
    ['média alta (≥ 70): recupera 6', { sac: 100, suj: 0, ph: 4 }, 50, 56],
    ['média média (40 a 69): estável', { sac: 50, suj: 50, ph: 2 }, 50, 50],
    ['média baixa (15 a 39): cai 3', { sac: 10, suj: 80, ph: 1 }, 50, 47],
    ['média péssima (< 15): cai 5', { sac: 0, suj: 100, ph: 0 }, 50, 45],
  ];
  for (const [nome, indicadores, inicio, esperado] of casos) {
    const t = montar();
    ajustar(t.aq, indicadores);
    t.aq.peixes[0].saude = inicio;
    t.passar(1);
    perto(t.aq.peixes[0].saude, esperado, 1e-6, nome);
  }
});

test('a saúde nunca passa de 100', () => {
  const t = montar();
  t.aq.peixes[0].saude = 98;
  t.passar(5);
  assert.equal(t.aq.peixes[0].saude, 100);
});

// --- Doença --------------------------------------------------------------------------------

test('o peixe adoece quando a saúde fica abaixo de 30, e o evento sai uma vez só', () => {
  const t = montar();
  ajustar(t.aq, { sac: 0, suj: 100, ph: 0 }); // média 0: cai 5 por hora
  t.aq.peixes[0].saude = 31;
  t.aq.eventos.retirar();
  t.passar(0.1);
  assert.equal(t.aq.peixes[0].estado, 'saudavel'); // 30,5: ainda não
  t.passar(0.5);
  assert.equal(t.aq.peixes[0].estado, 'doente'); // 28
  t.passar(1);
  assert.deepEqual(t.aq.eventos.retirar(), [{ tipo: 'adoeceu', peixeId: t.aq.peixes[0].id }]);
});

test('exatamente 30 ainda não é doente (só "abaixo de 30")', () => {
  const t = montar();
  ajustar(t.aq, { sac: 50, suj: 50, ph: 2 }); // média estável: a saúde não muda
  t.aq.peixes[0].saude = 30;
  t.passar(0.5);
  assert.equal(t.aq.peixes[0].estado, 'saudavel');
  t.aq.peixes[0].saude = 29.99;
  t.passar(0.1);
  assert.equal(t.aq.peixes[0].estado, 'doente');
});

test('com cuidado o peixe doente se recupera e o evento sai', () => {
  const t = montar();
  const peixe = t.aq.peixes[0];
  peixe.saude = 20;
  peixe.estado = 'doente';
  ajustar(t.aq, { sac: 100, suj: 0, ph: 4 }); // média alta: +6 por hora
  t.passar(1); // 26
  assert.equal(peixe.estado, 'doente');
  t.passar(1); // 32
  assert.equal(peixe.estado, 'saudavel');
  assert.deepEqual(t.aq.eventos.retirar(), [{ tipo: 'recuperou', peixeId: peixe.id }]);
});

// --- Morte e Game Over ---------------------------------------------------------------------

test('com média 0 o peixe morre em cerca de 20 horas, por falta de cuidado', () => {
  const t = montar();
  ajustar(t.aq, { sac: 0, suj: 100, ph: 0 });
  t.aq.eventos.retirar();
  const peixe = t.aq.peixes[0];

  t.passar(19.9);
  assert.equal(peixe.estado, 'doente');
  assert.equal(t.aq.gameOver, false);
  t.passar(0.3);
  assert.equal(peixe.estado, 'morto');
  assert.equal(peixe.causaDaMorte, 'cuidado');
  assert.equal(peixe.saude, 0);
  assert.equal(t.aq.gameOver, true);
});

test('ao morrer de falta de cuidado saem os eventos "adoeceu", "morreu" e "gameOver", nessa ordem', () => {
  const t = montar();
  ajustar(t.aq, { sac: 0, suj: 100, ph: 0 });
  t.aq.peixes[0].saude = 1;
  t.aq.eventos.retirar();
  t.passar(1);
  assert.deepEqual(t.aq.eventos.retirar(), [
    { tipo: 'adoeceu', peixeId: t.aq.peixes[0].id }, // com saúde 1 já estava doente antes de morrer
    { tipo: 'morreu', peixeId: t.aq.peixes[0].id, causa: 'cuidado' },
    { tipo: 'gameOver', causa: 'cuidado' },
  ]);
  assert.deepEqual(t.aq.eventos.retirar(), []); // a fila esvazia ao retirar
});

test('fim da vida natural é a partir dos 30 dias', () => {
  assert.equal(fimDaVidaNatural(30 * DIA_MS - 1), false);
  assert.equal(fimDaVidaNatural(30 * DIA_MS), true);
});

test('morte natural aos 30 dias, mesmo com a saúde cheia: causa "velhice"', () => {
  // Peixe que já tem 29 dias; só 1 dia de vida pela frente, e com média sempre boa.
  const t = montar(1, undefined, { dadosPeixe: { nascimentoMs: -29 * DIA_MS, fase: 'idoso' } });
  const peixe = t.aq.peixes[0];
  ajustar(t.aq, { sac: 100, suj: 0, ph: 4 });
  t.passar(23); // 29 dias e 23 h
  assert.equal(peixe.estado, 'saudavel');
  t.passar(1.1);
  assert.equal(peixe.estado, 'morto');
  assert.equal(peixe.causaDaMorte, 'velhice');
  assert.ok(peixe.saude > 0, 'morreu de velhice, não de saúde zerada');
  assert.equal(t.aq.gameOver, true);
  assert.deepEqual(t.aq.eventos.retirar().filter((e) => e.tipo === 'gameOver'), [
    { tipo: 'gameOver', causa: 'velhice' },
  ]);
});

test('Game Over só quando o último peixe vivo morre', () => {
  const t = montar(2);
  ajustar(t.aq, { sac: 0, suj: 100, ph: 0 });
  const [a, b] = t.aq.peixes;
  a.saude = 1;
  t.aq.eventos.retirar();

  t.passar(1);
  assert.equal(a.estado, 'morto');
  assert.notEqual(b.estado, 'morto');
  assert.equal(t.aq.gameOver, false);
  assert.equal(t.aq.vivos().length, 1);
  assert.deepEqual(eventosDe(t.aq, 'gameOver'), []);

  b.saude = 1;
  t.passar(1);
  assert.equal(b.estado, 'morto');
  assert.equal(t.aq.gameOver, true);
  assert.equal(t.aq.vivos().length, 0);
});

test('depois do Game Over as regras ficam congeladas', () => {
  const t = montar();
  ajustar(t.aq, { sac: 0, suj: 100, ph: 0 });
  t.aq.peixes[0].saude = 1;
  t.passar(1);
  assert.equal(t.aq.gameOver, true);
  t.aq.eventos.retirar();

  const antes = { suj: t.aq.sujeira, ph: t.aq.phPasso, prog: t.aq.phProgresso, sac: t.aq.peixes[0].saciedade };
  ajustar(t.aq, { suj: 40 });
  t.passar(100);
  assert.equal(t.aq.sujeira, 40); // não subiu
  assert.equal(t.aq.phPasso, antes.ph);
  assert.equal(t.aq.peixes[0].estado, 'morto');
  assert.deepEqual(t.aq.eventos.retirar(), []); // e nenhum evento repetido
});

// --- Peixe morto ---------------------------------------------------------------------------

test('peixe morto não passa fome nem recebe comida e não suja mais a água', () => {
  const t = montar(2);
  const [morto, vivo] = t.aq.peixes;
  morto.estado = 'morto';
  morto.saciedade = 10;

  t.passar(10);
  assert.equal(morto.saciedade, 10); // não mudou
  assert.ok(vivo.saciedade < 100);   // o vivo passou fome

  t.aq.darComida();
  assert.equal(morto.saciedade, 10);
  // Com 1 peixe vivo a sujeira sobe no ritmo de 1 peixe (e não de 2): 10 h = 10,42%.
  const t2 = montar(2);
  t2.aq.peixes[0].estado = 'morto';
  t2.passar(10);
  perto(t2.aq.sujeira, (100 / 96) * 10, 0.01);
});

test('dar comida quando só há peixes mortos não faz nada', () => {
  const t = montar();
  t.aq.peixes[0].estado = 'morto';
  assert.deepEqual(t.aq.darComida(), { alimentou: false, excesso: false });
  assert.equal(t.aq.sujeira, 0);
});

test('peixe morto não nada: só sobe devagar até a superfície e fica boiando lá', () => {
  const aq = criarAquario({ config, semente: 4 });
  const p = aq.adicionarPeixe({ x: 100, y: 100, fase: 'adulto' }, 0);
  p.estado = 'morto';
  const { minY } = limitesDoPeixe('adulto');

  let anterior = p.y;
  for (let i = 1; i <= 2000; i++) {
    aq.atualizar(0.05, i * 50);
    assert.equal(p.x, 100, 'não anda de lado');
    assert.ok(p.y <= anterior, 'só sobe');
    assert.ok(p.y >= minY, 'não passa da superfície');
    anterior = p.y;
  }
  assert.equal(p.y, minY); // chegou e ficou
});

// --- Tempo acelerado -----------------------------------------------------------------------

test('a hora da morte é a mesma a 1×, 60× e 3600× (passos de 50 ms reais)', () => {
  const horas = [50, 3000, 180000].map((passoMs) => {
    const t = montar(1, passoMs);
    ajustar(t.aq, { sac: 0, suj: 100, ph: 0 });
    while (!t.aq.gameOver) t.passar(0.01);
    return t.agora() / HORA_MS;
  });
  for (const h of horas) perto(h, 20, 0.1, 'hora da morte');
});

// --- Rotinas de cuidado (balanceamento, seção 6 do plano) ---------------------------------

// Vive N dias com uma rotina: comida, limpeza e regulagem de pH a cada X horas (ou nunca).
// Devolve quando adoeceu e quando morreu (em dias; null = não aconteceu) e a causa.
function viver({ comidaH, limparH, phH, maxDias = 40 }) {
  const t = montar(1, 10 * 60 * 1000); // passos de 10 minutos de jogo
  const peixe = t.aq.peixes[0];
  let doenteH = null;
  let horas = 0;
  while (!t.aq.gameOver && horas < maxDias * 24) {
    t.passar(1);
    horas += 1;
    if (peixe.estado === 'doente' && doenteH === null) doenteH = horas;
    if (comidaH && horas % comidaH === 0) t.aq.darComida();
    if (limparH && horas % limparH === 0) t.aq.limparAquario();
    if (phH && horas % phH === 0) t.aq.regularPh();
  }
  return {
    doenteDias: doenteH === null ? null : doenteH / 24,
    morteDias: t.aq.gameOver ? horas / 24 : null,
    causa: peixe.causaDaMorte,
  };
}

test('rotina: sem nenhum cuidado o peixe morre entre 3 e 4 dias', () => {
  const r = viver({});
  assert.equal(r.causa, 'cuidado');
  assert.ok(r.morteDias >= 3 && r.morteDias <= 4, `morreu em ${r.morteDias} dias`);
  assert.ok(r.doenteDias < r.morteDias);
});

test('rotina: só comida, 1 vez por dia, não basta (morre em até 5 dias)', () => {
  const r = viver({ comidaH: 24 });
  assert.equal(r.causa, 'cuidado');
  assert.ok(r.morteDias > 4 && r.morteDias <= 5.5, `morreu em ${r.morteDias} dias`);
});

test('rotina: comida todo dia, limpar e regular o pH a cada 2 dias: vive até a velhice, sem adoecer', () => {
  const r = viver({ comidaH: 24, limparH: 48, phH: 48 });
  assert.equal(r.doenteDias, null);
  assert.equal(r.causa, 'velhice');
  perto(r.morteDias, 30, 0.1, 'morte natural');
});

test('rotina: limpar e regular o pH só a cada 4 dias ainda mata, mas bem depois do que sem cuidado', () => {
  const r = viver({ comidaH: 24, limparH: 96, phH: 96 });
  assert.equal(r.causa, 'cuidado');
  assert.ok(r.morteDias > 6 && r.morteDias < 9, `morreu em ${r.morteDias} dias`);
});
