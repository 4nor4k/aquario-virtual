// Testes de saciedade, sujeira, pH e das ações de cuidado (doc 03, seção 2).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarAquario } from '../src/core/aquarium.js';
import { atualizarRegras, horasPorPassoDoPh, valorDoPh, notaDoPh } from '../src/core/rules.js';
import { HORA_MS, DIA_MS } from '../src/core/clock.js';
import { config, configImortal, montar as montarBase, perto } from './ajuda.js';

// Aqui a saúde não muda (configImortal): o peixe não morre no meio de um teste de indicadores.
const montar = (peixes, passoMs) => montarBase(peixes, passoMs, { cfg: configImortal });

test('o config é coerente: 7 valores de pH, uma nota para cada, em ordem crescente', () => {
  const { valores, notas } = config.ph;
  assert.equal(valores.length, 7);
  assert.equal(notas.length, valores.length);
  assert.deepEqual(valores, [...valores].sort((a, b) => a - b));
  assert.deepEqual(valores, [6.2, 6.4, 6.6, 6.8, 7.0, 7.2, 7.5]);
  assert.deepEqual(notas, [0, 30, 60, 100, 100, 100, 60]);
  assert.equal(valores[config.inicial.phPasso], 7.0);
});

test('o aquário sem config não abre (para não rodar com números inventados)', () => {
  assert.throws(() => criarAquario(), TypeError);
});

test('começa com água limpa, pH 7,0 e peixe de barriga cheia', () => {
  const { aq } = montar();
  assert.equal(aq.sujeira, 0);
  assert.equal(valorDoPh(aq, config), 7.0);
  assert.equal(notaDoPh(aq, config), 100);
  assert.equal(aq.peixes[0].saciedade, 100);
});

// --- Saciedade ---------------------------------------------------------------------------

test('a saciedade cai de 100 para 0 em 48 horas', () => {
  const t = montar();
  t.passar(24);
  perto(t.aq.peixes[0].saciedade, 50, 0.001, 'após 24 h');
  t.passar(24);
  perto(t.aq.peixes[0].saciedade, 0, 0.001, 'após 48 h');
});

test('a saciedade para em 0, nunca fica negativa', () => {
  const t = montar();
  t.passar(100);
  assert.equal(t.aq.peixes[0].saciedade, 0);
});

// --- Sujeira -----------------------------------------------------------------------------

test('a sujeira sobe de 0 a 100 em 4 dias com 1 peixe', () => {
  const t = montar(1);
  t.passar(48);
  perto(t.aq.sujeira, 50, 0.01, 'após 2 dias');
  t.passar(48);
  perto(t.aq.sujeira, 100, 0.01, 'após 4 dias');
});

test('cada peixe a mais acelera a sujeira em 25%', () => {
  for (const [n, fator] of [[1, 1], [2, 1.25], [3, 1.5], [5, 2]]) {
    const t = montar(n);
    t.passar(24);
    perto(t.aq.sujeira, 25 * fator, 0.01, `${n} peixe(s)`);
  }
});

test('a sujeira para em 100', () => {
  const t = montar();
  t.passar(24 * 30);
  assert.equal(t.aq.sujeira, 100);
});

// --- pH ----------------------------------------------------------------------------------

test('horas por passo do pH segundo a sujeira, inclusive nas fronteiras', () => {
  const casos = [[0, 36], [29.9, 36], [30, 24], [50, 24], [70, 24], [70.1, 12], [100, 12]];
  for (const [sujeira, horas] of casos) {
    assert.equal(horasPorPassoDoPh(sujeira, config.ph), horas, `sujeira ${sujeira}`);
  }
});

test('com a água bem suja, o pH cai 1 passo a cada 12 horas até o fundo e fica lá', () => {
  const t = montar();
  t.aq.sujeira = 100;
  const lido = [];
  // Confere 6 minutos depois de cada fronteira de 12 h (na fronteira exata, a soma de
  // muitos pedacinhos pode dar 0,99999 e o pH cai uns segundos depois; não importa no jogo).
  t.passar(0.1);
  for (let i = 0; i < 6; i++) {
    t.passar(12);
    lido.push(valorDoPh(t.aq, config));
  }
  // 7,0 -> 6,8 -> 6,6 -> 6,4 -> 6,2, e então não cai mais.
  assert.deepEqual(lido, [6.8, 6.6, 6.4, 6.2, 6.2, 6.2]);
});

test('na água limpa o pH cai bem devagar (36 h por passo)', () => {
  const t = montar();
  t.passar(30);
  assert.equal(valorDoPh(t.aq, config), 7.0); // 30 h: ainda não caiu
  // (a sujeira chega a 31% e muda o ritmo, mas ainda falta pouco)
  t.passar(8);
  assert.equal(valorDoPh(t.aq, config), 6.8); // 38 h: caiu 1 passo
});

test('regular o pH sobe 1 passo e para em 7,5', () => {
  const { aq } = montar();
  assert.deepEqual(aq.regularPh(), { mudou: true, ph: 7.2 });
  assert.deepEqual(aq.regularPh(), { mudou: true, ph: 7.5 });
  assert.deepEqual(aq.regularPh(), { mudou: false, ph: 7.5 });
  assert.equal(valorDoPh(aq, config), 7.5);
});

test('regular o pH no fundo da escala não faz ele cair de novo na hora', () => {
  const t = montar();
  t.aq.sujeira = 100;
  t.passar(60); // chega ao fundo (6,2) e fica
  assert.equal(valorDoPh(t.aq, config), 6.2);
  t.aq.regularPh();
  t.passar(6); // metade do tempo de um passo
  assert.equal(valorDoPh(t.aq, config), 6.4);
  t.passar(7);
  assert.equal(valorDoPh(t.aq, config), 6.2); // agora sim caiu
});

// --- Ações de cuidado --------------------------------------------------------------------

// A comida agora é jogada em grãos e o peixe vai comer (detalhes em comida.test.js).
// `comerTudo` deixa passar tempo REAL (o do nado) até não sobrar grão na água.
function comerTudo(aq, segundos = 180) {
  for (let t = 0; t < segundos && aq.graos.length > 0; t += 0.05) aq.atualizar(0.05, 0);
}

test('dar comida: nada suja na hora e a saciedade só sobe quando o peixe come', () => {
  const { aq } = montar();
  aq.peixes[0].saciedade = 20;
  assert.deepEqual(aq.darComida(), { alimentou: true, excesso: false });
  assert.equal(aq.sujeira, 0, 'jogar a comida não suja a água');
  assert.equal(aq.peixes[0].saciedade, 20, 'ainda nada foi comido');
  comerTudo(aq);
  perto(aq.peixes[0].saciedade, 20 + config.comida.graos * config.comida.ganhoPorGrao, 1e-9, 'saciedade depois de comer');
  assert.equal(aq.sujeira, 0, 'comer também não suja na hora: a sujeira vem depois, aos poucos');
});

test('dar comida com o peixe cheio (100 ou mais) é excesso, e cada grão comido suja mais (devagar)', () => {
  const comExcesso = montar();
  const normal = montar();
  comExcesso.aq.peixes[0].saciedade = 100;
  normal.aq.peixes[0].saciedade = 20;
  assert.deepEqual(comExcesso.aq.darComida(), { alimentou: true, excesso: true });
  normal.aq.darComida();
  comerTudo(comExcesso.aq);
  comerTudo(normal.aq);
  comExcesso.passar(8);
  normal.passar(8);
  const base = (100 / (config.sujeira.diasParaEncher * 24)) * 8; // o que a água suja sozinha em 8 h
  perto(normal.aq.sujeira, base + config.comida.graos * config.sujeira.porGrao, 1e-6, 'comida normal');
  perto(comExcesso.aq.sujeira, base + config.comida.graos * config.sujeira.porGraoEmExcesso, 1e-6, 'comida em excesso');
});

test('exatamente 99 ainda não é excesso (só a partir de 100)', () => {
  const { aq } = montar();
  aq.peixes[0].saciedade = 99;
  assert.equal(aq.darComida().excesso, false);
});

test('dar comida sem peixe nenhum não faz nada', () => {
  const { aq } = montar(0);
  assert.deepEqual(aq.darComida(), { alimentou: false, excesso: false });
  assert.equal(aq.sujeira, 0);
  assert.equal(aq.graos.length, 0);
});

test('a sujeira nunca passa de 100, nem com comida', () => {
  const t = montar();
  const { aq } = t;
  aq.sujeira = 99;
  aq.peixes[0].saciedade = 100;
  aq.darComida();
  comerTudo(aq);
  t.passar(8);
  assert.equal(aq.sujeira, 100);
});

test('limpar o aquário zera a sujeira', () => {
  const t = montar();
  t.passar(60);
  assert.ok(t.aq.sujeira > 50);
  t.aq.limparAquario();
  assert.equal(t.aq.sujeira, 0);
});

// --- Tempo acelerado ---------------------------------------------------------------------

test('o resultado é o mesmo a 1×, 60× e 3600× (passos de 50 ms reais)', () => {
  // Em um passo de 50 ms reais, o jogo avança 50 ms (1×), 3 s (60×) ou 180 s (3600×).
  const resultados = [50, 3000, 180000].map((passoMs) => {
    const t = montar(1, passoMs);
    t.passar(40);
    return {
      sac: t.aq.peixes[0].saciedade,
      suj: t.aq.sujeira,
      ph: t.aq.phPasso - t.aq.phProgresso, // posição exata na escala
    };
  });
  for (const r of resultados.slice(1)) {
    perto(r.sac, resultados[0].sac, 1e-6, 'saciedade');
    perto(r.suj, resultados[0].suj, 1e-6, 'sujeira');
    // O pH muda de ritmo quando a sujeira cruza 30; o corte em pedaços de 15 min
    // pode diferir por uma fração mínima de passo.
    perto(r.ph, resultados[0].ph, 0.05, 'pH');
  }
});

test('um salto grande de tempo ("pular fase") dá o mesmo que passar o tempo aos poucos', () => {
  const aos_poucos = montar(1);
  aos_poucos.passar(24 * 10);
  const salto = criarAquario({ config: configImortal });
  salto.adicionarPeixe({}, 0);
  atualizarRegras(salto, 10 * DIA_MS, 10 * DIA_MS, configImortal);

  assert.equal(salto.peixes[0].saciedade, aos_poucos.aq.peixes[0].saciedade);
  assert.equal(salto.sujeira, aos_poucos.aq.sujeira);
  assert.equal(salto.phPasso, aos_poucos.aq.phPasso);
});

test('o tempo de jogo não anda para trás: relógio que volta não muda nada', () => {
  const { aq } = montar();
  aq.atualizar(0, 10 * HORA_MS);
  const antes = [aq.sujeira, aq.peixes[0].saciedade];
  aq.atualizar(0, 5 * HORA_MS); // voltou no tempo
  assert.deepEqual([aq.sujeira, aq.peixes[0].saciedade], antes);
});

test('o primeiro passo não "recupera" o tempo anterior (aquário criado com o relógio já andado)', () => {
  const aq = criarAquario({ config });
  aq.adicionarPeixe({}, 7 * DIA_MS);
  aq.atualizar(0, 7 * DIA_MS);
  assert.equal(aq.sujeira, 0);
  assert.equal(aq.peixes[0].saciedade, 100);
});
