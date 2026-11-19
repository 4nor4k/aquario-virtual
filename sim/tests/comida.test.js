// A comida em grãos e a saciedade de 0 a 200 (doc 03, "Comida"): os grãos caem devagar, o peixe
// vai atrás mesmo sem fome, e comer demais deixa o peixe doente.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarAquario } from '../src/core/aquarium.js';
import {
  GRAO_Y_INICIAL, GRAO_Y_AREIA, peixeAlcancaGrao, graoMaisPerto, soltarGraos,
} from '../src/core/comida.js';
import { notaDaSaciedade, mediaDoPeixe, saciedadeDepoisDe } from '../src/core/rules.js';
import { exportarJogo, importarJogo, ErroDeSalvamento } from '../src/core/salvar.js';
import { SUPERFICIE_Y, AREIA_Y } from '../src/core/mundo.js';
import { criarRng } from '../src/core/rng.js';
import { HORA_MS } from '../src/core/clock.js';
import { sujar } from '../src/core/rules.js';
import { aplicarAusencia } from '../src/core/ausencia.js';
import { config, montar, perto } from './ajuda.js';

// Deixa passar tempo REAL (o do nado e da queda dos grãos), sem passar tempo do jogo.
function passarReal(aq, segundos) {
  for (let t = 0; t < segundos; t += 0.05) aq.atualizar(0.05, 0);
}
function comerTudo(aq, segundos = 180) {
  for (let t = 0; t < segundos && aq.graos.length > 0; t += 0.05) aq.atualizar(0.05, 0);
}
const umPeixe = (dados = {}) => montar(1, undefined, { dadosPeixe: { x: 120, y: 80, ...dados } });

// --- A nota da saciedade -------------------------------------------------------------------------

test('nota da saciedade: até 100 é ela mesma; acima disso cai de volta, e 200 vale 0', () => {
  const nota = (s) => notaDaSaciedade(s, config.saciedade);
  assert.equal(nota(0), 0);
  assert.equal(nota(60), 60);
  assert.equal(nota(100), 100);
  assert.equal(nota(150), 50);
  assert.equal(nota(190), 10);
  assert.equal(nota(200), 0);
});

test('a média de saúde usa a nota: comer demais pesa tanto quanto passar fome', () => {
  const { aq } = umPeixe();
  const peixe = aq.peixes[0];
  peixe.saciedade = 50;
  const comFome = mediaDoPeixe(peixe, aq, config);
  peixe.saciedade = 150;
  const cheioDemais = mediaDoPeixe(peixe, aq, config);
  perto(cheioDemais, comFome, 1e-9, '150 de saciedade pesa igual a 50');
  peixe.saciedade = 100;
  assert.ok(mediaDoPeixe(peixe, aq, config) > cheioDemais);
});

test('o excesso (acima de 100) é digerido depressa: de 200 a 100 leva 5 horas; abaixo de 100, 48 h para zerar', () => {
  const t = umPeixe();
  t.aq.peixes[0].saciedade = 200;
  t.passar(2.5);
  perto(t.aq.peixes[0].saciedade, 150, 0.001, 'depois de 2,5 h');
  t.passar(2.5);
  perto(t.aq.peixes[0].saciedade, 100, 0.001, 'depois de 5 h');
  t.passar(24);
  perto(t.aq.peixes[0].saciedade, 50, 0.001, 'dali em diante é o ritmo normal (50 a cada 24 h)');
});

test('saciedadeDepoisDe: o mesmo resultado em um passo grande ou em vários pequenos, mesmo cruzando o 100', () => {
  for (const inicio of [30, 100, 130, 200]) {
    for (const horas of [0.25, 3, 8, 60]) {
      let aos_poucos = inicio;
      for (let i = 0; i < 100; i++) aos_poucos = saciedadeDepoisDe(aos_poucos, horas / 100, config.saciedade);
      perto(saciedadeDepoisDe(inicio, horas, config.saciedade), aos_poucos, 1e-9, `de ${inicio} por ${horas} h`);
    }
  }
  assert.equal(saciedadeDepoisDe(10, 1000, config.saciedade), 0, 'nunca fica negativa');
});

// --- Os grãos ------------------------------------------------------------------------------------

test('dar comida solta 3 grãos de cima, espalhados e um depois do outro', () => {
  const { aq } = umPeixe();
  aq.darComida({ x: 100 });
  assert.equal(aq.graos.length, 3);
  aq.graos.forEach((g, i) => {
    assert.ok(Math.abs(g.x - 100) <= config.comida.espalhamentoX, `grão ${i} em x=${g.x}`);
    assert.equal(g.y, GRAO_Y_INICIAL);
    assert.ok(GRAO_Y_INICIAL < SUPERFICIE_Y, 'nasce acima da água');
    assert.ok(Math.abs(g.espera - i * config.comida.intervaloEntreGraosSeg) < 1e-9, `grão ${i} espera ${g.espera}`);
  });
});

test('os grãos caem devagar, a velocidade da config, e param em cima da areia', () => {
  const { aq } = montar(0); // sem peixe: nada come os grãos
  soltarGraos(aq.graos, { centroX: 200, config, rng: criarRng(2) });
  passarReal(aq, 0.1);
  const antes = aq.graos[0].y;
  passarReal(aq, 2);
  perto(aq.graos[0].y - antes, config.comida.velocidadeQueda * 2, 0.5, 'queda em 2 segundos');
  passarReal(aq, 14); // dá tempo de chegar ao fundo (e ainda não passou o tempo na areia)
  assert.equal(aq.graos.length, 3);
  assert.ok(aq.graos.every((g) => g.naAreia && g.y === GRAO_Y_AREIA), 'todos chegaram à areia');
  assert.ok(GRAO_Y_AREIA < AREIA_Y, 'ficam em cima da areia, não dentro');
});

const totalPendente = (aq) => aq.sujeiraPendente.reduce((soma, e) => soma + e.total, 0);

test('o grão não comido some depois de um tempo na areia e vira sujeira pendente', () => {
  const t = montar(0); // sem peixe nenhum
  const aq = t.aq;
  soltarGraos(aq.graos, { centroX: 100, config, rng: criarRng(1) });
  assert.equal(aq.graos.length, 3);
  passarReal(aq, 60);
  assert.equal(aq.graos.length, 0, 'sumiram');
  assert.equal(aq.sujeira, 0, 'não suja na hora');
  perto(totalPendente(aq), 3 * config.sujeira.porGraoPerdido, 1e-9, 'cada grão perdido suja, aos poucos');
});

test('há um máximo de grãos na água', () => {
  const { aq } = umPeixe({ x: 5, y: 40 });
  for (let i = 0; i < 10; i++) aq.darComida({ x: 150 });
  assert.equal(aq.graos.length, config.comida.maximoNaAgua);
});

test('os grãos não vão para o arquivo salvo', () => {
  const { aq } = umPeixe();
  aq.darComida();
  const dados = exportarJogo(aq, { tempoJogoMs: 0, salvoEmMs: 1 });
  assert.ok(!JSON.stringify(dados).includes('grao'));
  const { aquario } = importarJogo(JSON.parse(JSON.stringify(dados)), { config });
  assert.equal(aquario.graos.length, 0);
});

// --- O peixe vai atrás da comida -----------------------------------------------------------------

test('mesmo cheio (100), o peixe vai atrás da comida e come', () => {
  const t = umPeixe({ x: 20, y: 60 });
  const peixe = t.aq.peixes[0];
  peixe.saciedade = 100;
  t.aq.darComida({ x: 200 });
  passarReal(t.aq, 5);
  assert.ok(peixe.x > 90, `foi na direção da comida (x=${peixe.x})`);
  comerTudo(t.aq);
  assert.equal(t.aq.graos.length, 0, 'não sobrou grão');
  perto(peixe.saciedade, 100 + 3 * config.comida.ganhoPorGrao, 1e-9, 'comeu os três grãos');
});

test('o peixe come cada grão: a saciedade sobe um grão por vez', () => {
  const t = umPeixe();
  const peixe = t.aq.peixes[0];
  peixe.saciedade = 20;
  t.aq.darComida();
  const vistos = new Set();
  for (let s = 0; s < 120 && t.aq.graos.length > 0; s += 0.05) {
    t.aq.atualizar(0.05, 0);
    vistos.add(Math.round(peixe.saciedade * 10));
  }
  assert.ok(vistos.size >= 4, `a saciedade subiu aos poucos (${[...vistos]})`);
});

test('o peixe doente também vai atrás da comida, mais devagar', () => {
  const t = umPeixe({ x: 20, y: 60 });
  const peixe = t.aq.peixes[0];
  peixe.estado = 'doente';
  peixe.saude = 20;
  t.aq.darComida({ x: 40 });
  comerTudo(t.aq);
  assert.equal(t.aq.graos.length, 0);
});

test('peixe morto não come: os grãos continuam caindo', () => {
  const t = umPeixe({ x: 100, y: 60 });
  t.aq.darComida({ x: 100 });
  t.aq.matar(t.aq.peixes[0]);
  const saciedade = t.aq.peixes[0].saciedade;
  passarReal(t.aq, 60);
  assert.equal(t.aq.peixes[0].saciedade, saciedade);
});

test('sem comida na água o peixe passeia como sempre', () => {
  const t = umPeixe({ x: 100, y: 60 });
  const peixe = t.aq.peixes[0];
  const posicoes = new Set();
  for (let s = 0; s < 30; s += 0.05) {
    t.aq.atualizar(0.05, 0);
    posicoes.add(`${Math.round(peixe.x)},${Math.round(peixe.y)}`);
  }
  assert.ok(posicoes.size > 20, 'ele se mexe');
});

test('graoMaisPerto: só conta grão que já apareceu e já está na água', () => {
  const peixe = { x: 100, y: 60 };
  const graos = [
    { x: 100, y: 60, espera: 1 },                 // ainda não apareceu
    { x: 100, y: SUPERFICIE_Y - 3, espera: 0 },   // no ar, antes de cair na água
    { x: 130, y: 70, espera: 0 },
    { x: 105, y: 90, espera: 0 },
  ];
  assert.equal(graoMaisPerto(peixe, graos), graos[3]);
  assert.equal(graoMaisPerto(peixe, graos.slice(0, 2)), null);
});

test('peixeAlcancaGrao: o grão tem de estar dentro do corpo do peixe', () => {
  const peixe = { x: 100, y: 60, fase: 'adulto' }; // 32 × 26
  assert.equal(peixeAlcancaGrao(peixe, { x: 100, y: 60 }), true);
  assert.equal(peixeAlcancaGrao(peixe, { x: 115, y: 70 }), true);
  assert.equal(peixeAlcancaGrao(peixe, { x: 117, y: 60 }), false);
  assert.equal(peixeAlcancaGrao(peixe, { x: 100, y: 75 }), false);
});

test('um grão na areia ainda dá para o peixe alcançar (ele nada até o fundo)', () => {
  const t = umPeixe({ x: 100, y: 60, fase: 'adulto', saciedade: 20 });
  soltarGraos(t.aq.graos, { centroX: 100, config, rng: criarRng(3) });
  comerTudo(t.aq);
  assert.equal(t.aq.graos.length, 0);
  // Foi comido (e não dissolvido na areia): nem sujeira de excesso nem de grão perdido.
  assert.equal(t.aq.sujeira, 0);
  perto(t.aq.peixes[0].saciedade, 20 + 3 * config.comida.ganhoPorGrao, 1e-9, 'comeu os três');
});

// --- Comer demais --------------------------------------------------------------------------------

test('comer até 200 faz o peixe passar mal: fica doente na hora', () => {
  const t = umPeixe();
  const peixe = t.aq.peixes[0];
  peixe.saciedade = 190;
  t.aq.darComida();
  comerTudo(t.aq);
  assert.equal(peixe.saciedade, config.saciedade.maximo, 'a barra para em 200');
  assert.equal(peixe.estado, 'doente');
  assert.ok(peixe.saude < config.saude.doenteAbaixoDe);
  assert.equal(t.aq.eventos.retirar().some((e) => e.tipo === 'adoeceu' && e.motivo === 'comeuDemais'), true);
});

test('abaixo de 200 comer demais não adoece (só aperta a saúde se a água também for ruim)', () => {
  const t = umPeixe();
  const peixe = t.aq.peixes[0];
  peixe.saciedade = 100;
  t.aq.darComida();
  comerTudo(t.aq);
  assert.ok(peixe.saciedade > 100 && peixe.saciedade < 200);
  assert.equal(peixe.estado, 'saudavel');
});

test('o peixe empanturrado leva uns 5 horas para melhorar: a saúde só sobe quando a saciedade chega a 100', () => {
  const t = umPeixe();
  const peixe = t.aq.peixes[0];
  peixe.saciedade = 190;
  t.aq.darComida();
  comerTudo(t.aq);
  assert.equal(peixe.estado, 'doente');
  const saudeDoente = peixe.saude;
  assert.ok(saudeDoente < config.saude.doenteAbaixoDe);
  for (let h = 0.25; h < 4.75; h += 0.25) {
    t.passar(0.25);
    assert.ok(peixe.saciedade > 100, `aos ${h} h a saciedade ainda é ${peixe.saciedade}`);
    assert.equal(peixe.saude, saudeDoente, `aos ${h} h a saúde não melhora enquanto a saciedade está acima de 100`);
    assert.equal(peixe.estado, 'doente');
  }
  t.passar(1.5); // 6 horas depois de comer
  assert.ok(peixe.saciedade <= 100);
  assert.equal(peixe.estado, 'saudavel', 'chegou a 100 e a saúde voltou');
  assert.ok(peixe.saude >= config.saude.doenteAbaixoDe);
});

test('comer demais NÃO deixa doente se não chegar a 200: ele só digere o excesso', () => {
  const t = umPeixe();
  const peixe = t.aq.peixes[0];
  peixe.saciedade = 100;
  t.aq.darComida(); // +21: 121
  comerTudo(t.aq);
  assert.ok(peixe.saciedade > 100 && peixe.saciedade < 150);
  assert.equal(peixe.estado, 'saudavel');
  t.passar(2);
  assert.ok(peixe.saciedade <= 100, 'em 2 horas já digeriu');
});

test('muitas porções seguidas (de 100 até 200) deixam o peixe doente, mesmo com a água boa', () => {
  const t = umPeixe();
  const peixe = t.aq.peixes[0];
  peixe.saciedade = 100;
  for (let porcao = 0; porcao < 6 && peixe.saciedade < config.saciedade.maximo; porcao++) {
    t.aq.darComida();
    comerTudo(t.aq);
  }
  assert.equal(peixe.saciedade, config.saciedade.maximo);
  assert.equal(peixe.estado, 'doente');
});

test('comer demais de novo com 200 mantém o peixe doente e suja a água', () => {
  const t = umPeixe();
  const peixe = t.aq.peixes[0];
  peixe.saciedade = 200;
  peixe.estado = 'doente';
  peixe.saude = 29;
  const antes = t.aq.sujeira;
  t.aq.darComida();
  comerTudo(t.aq);
  assert.equal(peixe.saciedade, 200);
  assert.equal(peixe.estado, 'doente');
  assert.equal(t.aq.sujeira, antes, 'não suja na hora');
  perto(totalPendente(t.aq), config.comida.graos * config.sujeira.porGraoEmExcesso, 1e-9, 'suja depois, devagar');
});

test('dois peixes: cada um come o que alcança, e o excesso de um não passa ao outro', () => {
  const t = montar(2, undefined, { dadosPeixe: { x: 120, y: 80 } });
  const [a, b] = t.aq.peixes;
  a.saciedade = 20;
  b.saciedade = 20;
  t.aq.darComida();
  comerTudo(t.aq);
  perto(a.saciedade + b.saciedade, 40 + 3 * config.comida.ganhoPorGrao, 1e-9, 'os três grãos foram comidos');
});

// --- A sujeira vem depois, devagar ---------------------------------------------------------------

// Um config sem a sujeira de fundo, para ver só a que vem da comida.
const semSujeiraDeFundo = () => {
  const cfg = structuredClone(config);
  cfg.sujeira.diasParaEncher = 1e9;
  return cfg;
};

test('comer não suja na hora: a sujeira só começa a subir 5 segundos depois', () => {
  const cfg = semSujeiraDeFundo();
  const t = montar(1, 1000, { cfg, dadosPeixe: { x: 120, y: 80 } }); // passos de 1 s de jogo
  t.aq.peixes[0].saciedade = 100; // cheio: cada grão é excesso
  t.aq.darComida();
  comerTudo(t.aq);
  perto(t.aq.sujeira, 0, 1e-9, 'recém comeu: água limpa');
  t.passar(4 / 3600);
  perto(t.aq.sujeira, 0, 1e-9, 'aos 4 segundos ainda limpa');
  t.passar(10 / 3600);
  assert.ok(t.aq.sujeira > 1e-4, 'passados os 5 segundos, começou a subir');
});

test('a sujeira sobe aos poucos, sem degrau, até o total em 6 horas (e não passa disso)', () => {
  const cfg = semSujeiraDeFundo();
  const t = montar(1, 60 * 1000, { cfg, dadosPeixe: { x: 120, y: 80 } }); // passos de 1 min
  t.aq.peixes[0].saciedade = 100;
  t.aq.darComida();
  comerTudo(t.aq);
  const total = config.comida.graos * config.sujeira.porGraoEmExcesso;
  let anterior = 0;
  let maiorDegrau = 0;
  for (let min = 0; min < 8 * 60; min++) {
    t.passar(1 / 60);
    maiorDegrau = Math.max(maiorDegrau, t.aq.sujeira - anterior);
    assert.ok(t.aq.sujeira >= anterior, 'só sobe');
    anterior = t.aq.sujeira;
    if (min === 3 * 60 - 1) perto(t.aq.sujeira, total / 2, 0.1, 'na metade do tempo, metade da sujeira');
  }
  perto(t.aq.sujeira, total, 1e-6, 'no fim entrou tudo');
  assert.ok(maiorDegrau < total / 100, `sobe bem devagar (maior salto por minuto: ${maiorDegrau})`);
  assert.equal(t.aq.sujeiraPendente.length, 0, 'nada ficou pendente');
});

test('a sujeira pendente rende o mesmo a 1×, 60× e 3600×', () => {
  const resultados = [50, 3000, 180000].map((passoMs) => {
    const cfg = semSujeiraDeFundo();
    const aq = criarAquario({ config: cfg });
    aq.adicionarPeixe({}, 0);
    aq.atualizar(0, 0);
    sujar(aq, 12, 0, cfg);
    for (let agora = passoMs; agora <= 10 * HORA_MS; agora += passoMs) aq.atualizar(0, agora);
    return aq.sujeira;
  });
  for (const r of resultados) perto(r, 12, 1e-6, 'sujeira depois de 10 h');
});

test('limpar o aquário não cancela a sujeira que o peixe já comeu (ela ainda vai entrar)', () => {
  const cfg = semSujeiraDeFundo();
  const t = montar(1, 60 * 1000, { cfg, dadosPeixe: { x: 120, y: 80 } });
  t.aq.peixes[0].saciedade = 100;
  t.aq.darComida();
  comerTudo(t.aq);
  t.aq.limparAquario();
  t.passar(8);
  perto(t.aq.sujeira, config.comida.graos * config.sujeira.porGraoEmExcesso, 1e-6, 'ela entrou depois da limpeza');
});

test('a sujeira pendente vai para o arquivo e entra durante o tempo com o jogo fechado', () => {
  const cfg = semSujeiraDeFundo();
  const t = montar(1, 60 * 1000, { cfg, dadosPeixe: { x: 120, y: 80 } });
  t.aq.peixes[0].saciedade = 100;
  t.aq.darComida();
  comerTudo(t.aq);
  const dados = JSON.parse(JSON.stringify(exportarJogo(t.aq, { tempoJogoMs: 0, salvoEmMs: 1 })));
  assert.equal(dados.aquario.sujeiraPendente.length, config.comida.graos);
  const { aquario } = importarJogo(dados, { config: cfg });
  assert.equal(aquario.sujeiraPendente.length, config.comida.graos);
  assert.equal(aquario.sujeira, 0);
  aplicarAusencia(aquario, { ausenciaMs: 8 * HORA_MS, horaDoJogoAntesMs: 0 }, cfg);
  perto(aquario.sujeira, config.comida.graos * config.sujeira.porGraoEmExcesso, 1e-6, 'entrou enquanto estava fechado');
});

test('arquivo antigo, sem sujeira pendente, ainda abre; pendência estragada é recusada', () => {
  const { aq } = umPeixe();
  const dados = JSON.parse(JSON.stringify(exportarJogo(aq, { tempoJogoMs: 0, salvoEmMs: 1 })));
  delete dados.aquario.sujeiraPendente;
  assert.equal(importarJogo(dados, { config }).aquario.sujeiraPendente.length, 0);
  dados.aquario.sujeiraPendente = [{ inicioMs: 5, duracaoMs: 0, total: 3 }];
  assert.throws(() => importarJogo(dados, { config }), ErroDeSalvamento);
  dados.aquario.sujeiraPendente = 'x';
  assert.throws(() => importarJogo(dados, { config }), ErroDeSalvamento);
});

// --- Salvamento ------------------------------------------------------------------------------------

test('a saciedade acima de 100 (até 200) sobrevive ao salvar e carregar; 201 é recusado', () => {
  const { aq } = umPeixe();
  aq.peixes[0].saciedade = 175.5;
  const dados = JSON.parse(JSON.stringify(exportarJogo(aq, { tempoJogoMs: 0, salvoEmMs: 1 })));
  const { aquario } = importarJogo(dados, { config });
  assert.equal(aquario.peixes[0].saciedade, 175.5);
  dados.peixes[0].saciedade = 201;
  assert.throws(() => importarJogo(dados, { config }), ErroDeSalvamento);
});

test('criarAquario: começa sem grão nenhum', () => {
  assert.deepEqual(criarAquario({ config }).graos, []);
});
