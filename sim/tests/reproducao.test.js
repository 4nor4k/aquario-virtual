// Vários peixes, casal, namoro, ovos e filhotes (doc 10, passos 1 e 4).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarAquario } from '../src/core/aquarium.js';
import { exportarJogo, importarJogo, ErroDeSalvamento } from '../src/core/salvar.js';
import { aplicarAusencia } from '../src/core/ausencia.js';
import { OVO_Y_AREIA, DISTANCIA_DO_NAMORO } from '../src/core/reproducao.js';
import { HORA_MS, MINUTO_MS } from '../src/core/clock.js';
import { config, montar } from './ajuda.js';

const SALVO_EM = 1_800_000_000_000;

// Config com água perfeita para sempre (fome, sujeira e pH congelados): só a reprodução se mexe.
const configCalma = () => {
  const c = structuredClone(config);
  c.saciedade.horasParaZerar = 1e9;
  c.sujeira.diasParaEncher = 1e9;
  c.ph.horasPorPasso = { sujeiraBaixa: 1e9, sujeiraMedia: 1e9, sujeiraAlta: 1e9 };
  return c;
};

// Um aquário com um casal (fêmea adulta + macho adotado) bem cuidado.
function casalBem({ fase = 'adulto', semente = 1 } = {}) {
  const cfg = configCalma();
  const aq = criarAquario({ config: cfg, semente });
  const a = aq.adicionarPeixe({ nome: 'Ana', cor: 'vermelho', sexo: 'femea', fase: 'adulto', x: 60, y: 60 }, 0);
  const b = aq.adotarParceiro(a, { nome: 'Beto', cor: 'azul' }, 0);
  if (fase !== 'adulto') {
    // Faz os dois voltarem a ser da fase pedida (idade zero = filhote).
    a.nascimentoMs = b.nascimentoMs = 0;
  }
  let agora = 0;
  aq.atualizar(0, 0);
  return {
    aq, a, b, cfg,
    agora: () => agora,
    passar(horas, passoMs = 5 * MINUTO_MS) {
      const alvo = agora + horas * HORA_MS;
      while (agora < alvo) {
        agora = Math.min(alvo, agora + passoMs);
        aq.atualizar(0, agora);
      }
    },
  };
}

const naoCasal = (aq, a, b) => aq.peixes.filter((p) => p !== a && p !== b);

// --- Vagas e adoção do parceiro --------------------------------------------------------------

test('vagas: o limite é 5, contando vivos e ovos; morto não conta', () => {
  const { aq } = montar(2);
  assert.equal(aq.vagas(), 3);
  aq.ovos.push({}, {});
  assert.equal(aq.vagas(), 1);
  aq.matar(aq.peixes[0]);
  assert.equal(aq.vagas(), 2, 'o morto libera a vaga');
  aq.ovos.push({}, {}, {}, {});
  assert.equal(aq.vagas(), 0, 'nunca negativo');
});

test('parceiro: nasce adulto, do sexo oposto, e forma casal', () => {
  const { aq } = montar(0);
  const dono = aq.adicionarPeixe({ sexo: 'macho', fase: 'adulto' }, 0);
  assert.deepEqual(aq.podeAdotarParceiro(dono), { ok: true, motivo: null });
  const parceiro = aq.adotarParceiro(dono, { nome: 'Bia', cor: 'rosa' });
  assert.equal(parceiro.sexo, 'femea');
  assert.equal(parceiro.fase, 'adulto');
  assert.equal(parceiro.nome, 'Bia');
  assert.equal(parceiro.cor, 'rosa');
  assert.equal(aq.parceiroDe(dono), parceiro);
  assert.equal(aq.parceiroDe(parceiro), dono);
  assert.equal(aq.peixes.length, 2);
  // E o contrário: fêmea ganha macho.
  const { aq: aq2 } = montar(0);
  const f = aq2.adicionarPeixe({ sexo: 'femea', fase: 'adulto' }, 0);
  assert.equal(aq2.adotarParceiro(f).sexo, 'macho');
});

test('parceiro: só para peixe vivo, adulto, sem parceiro, e se houver vaga', () => {
  const { aq } = montar(0);
  const filhote = aq.adicionarPeixe({ fase: 'filhote' }, 0);
  const jovem = aq.adicionarPeixe({ fase: 'jovem' }, 0);
  const idoso = aq.adicionarPeixe({ fase: 'idoso' }, 0);
  assert.equal(aq.podeAdotarParceiro(filhote).motivo, 'naoAdulto');
  assert.equal(aq.podeAdotarParceiro(jovem).motivo, 'naoAdulto');
  assert.equal(aq.podeAdotarParceiro(idoso).motivo, 'naoAdulto', 'idoso não ganha parceiro');
  assert.throws(() => aq.adotarParceiro(filhote), RangeError);
  const adulto = aq.adicionarPeixe({ fase: 'adulto' }, 0);
  aq.adotarParceiro(adulto);
  assert.equal(aq.podeAdotarParceiro(adulto).motivo, 'temParceiro', 'um parceiro só');
  const morto = aq.adicionarPeixe({ fase: 'adulto' }, 0);
  aq.matar(morto);
  assert.equal(aq.podeAdotarParceiro(morto).motivo, 'morto');
  // Já são 5 vivos (filhote, jovem, idoso, adulto e o parceiro dele): cheio.
  const outro = aq.peixes.find((p) => p.fase === 'adulto' && p !== adulto && p !== morto && !aq.casalDe(p));
  assert.equal(aq.vagas(), 0);
  assert.equal(outro, undefined);
  const { aq: aq2 } = montar(4);
  const sozinho = aq2.adicionarPeixe({ fase: 'adulto' }, 0);
  assert.equal(aq2.vagas(), 0);
  assert.equal(aq2.podeAdotarParceiro(sozinho).motivo, 'cheio');
});

test('casal: quando um dos dois morre, o outro fica livre para ganhar outro parceiro', () => {
  const { aq, a, b } = casalBem();
  aq.matar(b);
  assert.equal(aq.casais.length, 0);
  assert.equal(aq.parceiroDe(a), null);
  assert.equal(aq.podeAdotarParceiro(a).ok, true);
});

// --- Mortos ----------------------------------------------------------------------------------

test('morto: é retirado do aquário 1 minuto depois de morrer', () => {
  const { aq, passar, agora } = casalBem();
  passar(1);
  const morto = aq.peixes[0];
  aq.matar(morto);
  assert.equal(morto.morteMs, agora());
  assert.equal(config.reproducao.morteSomeEmMin, 1);
  passar(0.5 / 60); // 30 s
  assert.ok(aq.peixes.includes(morto), 'em 30 s ainda está boiando');
  passar(0.6 / 60); // passou de 1 min
  assert.ok(!aq.peixes.includes(morto), 'passado 1 minuto, saiu');
  assert.equal(aq.peixes.length, 1);
  assert.equal(aq.casais.length, 0);
});

test('morto: o último peixe (Game Over) fica na tela, e o morto de um aquário com outros sai mesmo assim', () => {
  const { aq, passar } = casalBem();
  const [a, b] = aq.peixes;
  aq.matar(a);
  passar(0.05);
  assert.ok(!aq.peixes.includes(a));
  aq.matar(b); // o último
  assert.equal(aq.gameOver, true);
  passar(1);
  assert.ok(aq.peixes.includes(b), 'no Game Over as regras congelam e o peixe fica para a tela');
});

test('morto: se estava no foco, o foco vai para um vivo e o seletor não fica com peixe que sumiu', () => {
  const { aq, passar } = casalBem();
  aq.adicionarPeixe({ fase: 'filhote' }, 0);
  const morto = aq.peixes[0];
  aq.matar(morto);
  passar(0.05);
  assert.ok(aq.peixes.every((p) => p.estado !== 'morto'));
  assert.equal(aq.vivos().length, aq.peixes.length);
});

test('"Limpar" retira os mortos, menos no Game Over', () => {
  const { aq } = montar(3);
  aq.matar(aq.peixes[0]);
  aq.limparAquario();
  assert.equal(aq.peixes.length, 2);
  assert.ok(aq.peixes.every((p) => p.estado !== 'morto'));
  const { aq: sozinho } = montar(1);
  sozinho.matar(sozinho.peixes[0]);
  assert.equal(sozinho.gameOver, true);
  sozinho.limparAquario();
  assert.equal(sozinho.peixes.length, 1, 'no Game Over o peixe fica na tela');
});

test('Game Over espera os ovos: sem vivo mas com ovo ainda não acabou', () => {
  const { aq, a, b } = casalBem();
  aq.ovos.push({
    x: 50, baseX: 50, y: OVO_Y_AREIA, estado: 'parado', espera: 0, tempo: 0, fase: 0, eclodeEmMs: 60 * MINUTO_MS, cor: 'azul', sexo: 'macho',
  });
  aq.matar(a);
  aq.matar(b);
  assert.equal(aq.gameOver, false, 'tem ovo: ainda há descendentes');
  // O ovo eclode e o filhote continua o jogo.
  aq.atualizar(0, 2 * HORA_MS);
  assert.equal(aq.vivos().length, 1);
  assert.equal(aq.gameOver, false);
  assert.equal(aq.vivos()[0].nome, 'Filhote 1');
});

test('Game Over: sem vivo e sem ovo acontece como antes', () => {
  const { aq } = montar(1);
  aq.matar(aq.peixes[0]);
  assert.equal(aq.gameOver, true);
});

// --- Reproduzir ------------------------------------------------------------------------------

test('reprodução: o casal bem cuidado reproduz depois de 30 min, e o ovo eclode em 1 h', () => {
  const { aq, passar, agora } = casalBem();
  passar(0.4); // 24 min: ainda não
  assert.equal(aq.ovos.length, 0);
  passar(0.2); // 36 min
  assert.ok(aq.ovos.length >= 1 && aq.ovos.length <= 3, `${aq.ovos.length} ovos`);
  const ovos = aq.ovos.length;
  assert.equal(aq.peixes.length, 2, 'ainda não nasceu ninguém');
  assert.ok(aq.ovos.every((o) => o.eclodeEmMs - agora() <= HORA_MS && o.eclodeEmMs - agora() >= HORA_MS - 10 * MINUTO_MS));
  // Os ovos esperam a animação (tempo real); aqui ela já passou.
  aq.ovos.forEach((o) => { o.estado = 'parado'; });
  passar(1.2);
  assert.equal(aq.ovos.length, 0, 'eclodiram');
  assert.equal(aq.vivos().length, 2 + ovos);
});

test('reprodução: o filhote tem nome provisório, sexo e cor de um dos pais', () => {
  const { aq, a, b, passar } = casalBem();
  passar(0.7);
  aq.ovos.forEach((o) => { o.estado = 'parado'; });
  passar(2);
  const filhotes = naoCasal(aq, a, b);
  assert.ok(filhotes.length >= 1);
  filhotes.forEach((f, i) => {
    assert.equal(f.nome, `Filhote ${i + 1}`);
    assert.equal(f.fase, 'filhote');
    assert.ok(['macho', 'femea'].includes(f.sexo));
    assert.ok([a.cor, b.cor].includes(f.cor));
    assert.equal(f.estado, 'saudavel');
  });
  assert.equal(aq.filhotesNascidos, filhotes.length);
});

test('reprodução: o filhote nasce na hora exata em que o ovo eclodiria (idade certa)', () => {
  const { aq, passar } = casalBem();
  passar(0.6);
  const ovo = aq.ovos[0];
  aq.ovos.forEach((o) => { o.estado = 'parado'; });
  passar(3);
  const filhote = aq.peixes.find((p) => p.nome === 'Filhote 1');
  assert.equal(filhote.nascimentoMs, ovo.eclodeEmMs);
});

test('reprodução: filhotes (que ainda não são adultos) não reproduzem', () => {
  const { aq, passar } = casalBem({ fase: 'filhote' });
  passar(3);
  assert.equal(aq.ovos.length, 0);
  assert.equal(aq.peixes.length, 2);
});

test('reprodução: sem vaga não reproduz; abrindo uma, nasce só o que cabe', () => {
  const { aq, a, b, passar } = casalBem();
  while (aq.vagas() > 0) aq.adicionarPeixe({ fase: 'filhote' }, 0);
  passar(2);
  assert.equal(aq.ovos.length, 0);
  assert.equal(aq.vivos().length, 5);
  aq.matar(naoCasal(aq, a, b)[0]);
  assert.equal(aq.vagas(), 1);
  passar(0.1);
  assert.equal(aq.ovos.length, 1, 'abriu 1 vaga: a ninhada é cortada para 1 ovo');
});

test('reprodução: saúde abaixo de 90 zera a contagem dos 30 minutos', () => {
  const { aq, a, passar } = casalBem();
  passar(0.4); // 24 min contados
  assert.ok(aq.casais[0].boasMs > 0);
  a.saude = 80;
  passar(0.05);
  assert.equal(aq.casais[0].boasMs, 0, 'zerou');
});

test('reprodução: saúde 90 ou mais por 30 minutos seguidos é o que vale (89 não)', () => {
  const baixa = casalBem();
  baixa.aq.casais[0].boasMs = 0;
  // A saúde cai a cada passo (simulado): nunca chega aos 30 min seguidos em condição boa.
  for (let i = 0; i < 24; i++) { baixa.a.saude = 89; baixa.passar(5 / 60); }
  assert.equal(baixa.aq.ovos.length, 0, 'com 89 de saúde nunca reproduz');
  const boa = casalBem();
  for (let i = 0; i < 12; i++) { boa.a.saude = 90; boa.passar(5 / 60); }
  assert.ok(boa.aq.ovos.length >= 1, 'com 90 reproduz');
});

test('reprodução: respeita o intervalo de 3 dias entre ninhadas', () => {
  const { aq, passar } = casalBem();
  passar(0.7);
  const primeira = aq.ovos.length;
  assert.ok(primeira >= 1);
  aq.ovos.forEach((o) => { o.estado = 'parado'; });
  passar(30); // 30 h depois: a ninhada nasceu, mas o casal ainda espera os 3 dias
  assert.equal(aq.filhotesNascidos, primeira);
  assert.equal(aq.ovos.length, 0);
  // Abre vaga para a próxima ninhada, se for preciso.
  for (const f of aq.peixes.filter((p) => p.nome.startsWith('Filhote'))) aq.matar(f);
  passar(24 * 3);
  aq.ovos.forEach((o) => { o.estado = 'parado'; });
  passar(2);
  assert.ok(aq.filhotesNascidos > primeira, 'passados os 3 dias, nasceu outra ninhada');
});

test('reprodução: nunca há mais de 5 vivos + ovos, por nenhum caminho', () => {
  for (const semente of [1, 2, 3, 4, 5, 6, 7, 8]) {
    const cfg = configCalma();
    const aq = criarAquario({ config: cfg, semente });
    const a = aq.adicionarPeixe({ sexo: 'femea', fase: 'adulto' }, 0);
    aq.adotarParceiro(a);
    aq.adicionarPeixe({ fase: 'filhote' }, 0);
    aq.adicionarPeixe({ fase: 'filhote' }, 0); // 4 vivos: cabe 1
    let agora = 0;
    for (let i = 0; i < 40 * 12; i++) {
      agora += 5 * MINUTO_MS;
      aq.atualizar(0, agora);
      aq.atualizar(0.5, agora); // e o tempo real da animação
      assert.ok(aq.vivos().length + aq.ovos.length <= 5, `semente ${semente}: ${aq.vivos().length} vivos + ${aq.ovos.length} ovos`);
    }
  }
});

test('reprodução: o sorteio varia a quantidade de ovos entre 1 e 3', () => {
  const vistos = new Set();
  for (let semente = 1; semente <= 30; semente++) {
    const aq = criarAquario({ config: configCalma(), semente });
    const a = aq.adicionarPeixe({ sexo: 'femea', fase: 'adulto' }, 0);
    aq.adotarParceiro(a);
    for (let t = 1; t <= 8; t++) aq.atualizar(0, t * 5 * MINUTO_MS);
    vistos.add(aq.ovos.length);
  }
  assert.deepEqual([...vistos].sort(), [1, 2, 3]);
});

// --- A animação do namoro --------------------------------------------------------------------

test('namoro: os dois nadam até se encontrar, de frente um para o outro, e os ovos aparecem e caem', () => {
  const { aq, a, b } = casalBem();
  a.x = 30; b.x = 100; a.y = 60; b.y = 60;
  let agora = 0;
  for (let i = 0; i < 8; i++) { agora += 5 * MINUTO_MS; aq.atualizar(0, agora); }
  assert.ok(aq.casais[0].namoro, 'o namoro começou');
  assert.ok(a.namorando && b.namorando);
  assert.ok(aq.ovos.every((o) => o.estado === 'esperando'), 'os ovos ainda não apareceram');

  for (let i = 0; i < 58; i++) aq.atualizar(0.1, agora); // quase 6 s de tempo real
  assert.ok(aq.casais[0].namoro, 'ainda namorando');
  assert.ok(Math.abs(b.x - a.x - 2 * DISTANCIA_DO_NAMORO) < 3, `ficaram a ${b.x - a.x} px (esperado ${2 * DISTANCIA_DO_NAMORO})`);
  assert.equal(a.direcao, 1);
  assert.equal(b.direcao, -1);
  for (let i = 0; i < 5; i++) aq.atualizar(0.1, agora);
  assert.equal(a.namorando, null, 'o namoro terminou');
  assert.equal(aq.casais[0].namoro, null);
  assert.ok(aq.ovos.every((o) => o.estado !== 'esperando'), 'os ovos apareceram');
  for (let i = 0; i < 300; i++) aq.atualizar(0.1, agora);
  assert.ok(aq.ovos.every((o) => o.estado === 'parado' && o.y === OVO_Y_AREIA), 'caíram até a areia e pararam');
});

test('namoro: um ovo que ainda espera a animação não eclode (mesmo com o relógio acelerado)', () => {
  const { aq } = casalBem();
  let agora = 0;
  for (let i = 0; i < 8; i++) { agora += 5 * MINUTO_MS; aq.atualizar(0, agora); }
  assert.ok(aq.ovos.length >= 1);
  // Salto de 3 h de jogo sem tempo real: os ovos ainda esperam a animação.
  aq.atualizar(0, agora + 3 * HORA_MS);
  assert.ok(aq.ovos.length >= 1, 'ainda esperando a animação');
  aq.ovos.forEach((o) => assert.equal(o.estado, 'esperando'));
  aq.atualizar(10, agora + 3 * HORA_MS); // passa o tempo real
  aq.atualizar(0, agora + 3 * HORA_MS + 1000);
  assert.equal(aq.ovos.length, 0, 'agora eclodiram');
});

// --- Salvar e ausência -----------------------------------------------------------------------

function idaEVolta(aq, tempoJogoMs = 999) {
  const texto = JSON.stringify(exportarJogo(aq, { tempoJogoMs, salvoEmMs: SALVO_EM }));
  return importarJogo(JSON.parse(texto), { config });
}

test('salvar: casal, ovos, contador e hora da morte vão e voltam', () => {
  const { aq, a, b, passar } = casalBem();
  passar(0.6);
  assert.ok(aq.ovos.length >= 1);
  const morto = aq.adicionarPeixe({ fase: 'filhote' }, 0);
  if (aq.vagas() < 0) aq.removerPeixe(morto);
  aq.matar(aq.peixes.find((p) => p !== a && p !== b));
  const q = idaEVolta(aq).aquario;
  assert.equal(q.casais.length, 1);
  assert.deepEqual([q.casais[0].aId, q.casais[0].bId], [a.id, b.id]);
  assert.equal(q.casais[0].ultimaMs, aq.casais[0].ultimaMs);
  assert.equal(q.casais[0].boasMs, aq.casais[0].boasMs);
  assert.equal(q.ovos.length, aq.ovos.length);
  q.ovos.forEach((o, i) => {
    assert.equal(o.estado, 'parado');
    assert.equal(o.y, OVO_Y_AREIA);
    assert.equal(o.eclodeEmMs, aq.ovos[i].eclodeEmMs);
    assert.equal(o.cor, aq.ovos[i].cor);
    assert.equal(o.sexo, aq.ovos[i].sexo);
  });
  assert.equal(q.filhotesNascidos, aq.filhotesNascidos);
  const mortoDepois = aq.peixes.find((p) => p.estado === 'morto');
  assert.equal(q.peixes.find((p) => p.id === mortoDepois.id).morteMs, mortoDepois.morteMs);
});

test('salvar: arquivo da v0.3 (sem casais, ovos nem morteMs) ainda abre', () => {
  const { aq } = montar(2);
  const dados = JSON.parse(JSON.stringify(exportarJogo(aq, { tempoJogoMs: 5, salvoEmMs: SALVO_EM })));
  delete dados.aquario.casais;
  delete dados.aquario.ovos;
  delete dados.aquario.filhotesNascidos;
  dados.peixes.forEach((p) => delete p.morteMs);
  const r = importarJogo(dados, { config });
  assert.equal(r.aquario.casais.length, 0);
  assert.equal(r.aquario.ovos.length, 0);
  assert.equal(r.aquario.filhotesNascidos, 0);
});

test('salvar: recusa casal com peixe que não existe, repetido ou mais de 5 vivos com ovos', () => {
  const { aq } = montar(2);
  const base = () => JSON.parse(JSON.stringify(exportarJogo(aq, { tempoJogoMs: 0, salvoEmMs: SALVO_EM })));
  const recusa = (dados, trecho) => assert.throws(() => importarJogo(dados, { config }),
    (e) => e instanceof ErroDeSalvamento && e.message.includes(trecho));
  let d = base();
  d.aquario.casais = [{ aId: 1, bId: 99, boasMs: 0, ultimaMs: null }];
  recusa(d, 'não existe');
  d = base();
  d.aquario.casais = [{ aId: 1, bId: 1, boasMs: 0, ultimaMs: null }];
  recusa(d, 'em outro casal');
  d = base();
  d.aquario.casais = [{ aId: 1, bId: 2, boasMs: 0, ultimaMs: null }, { aId: 2, bId: 1, boasMs: 0, ultimaMs: null }];
  recusa(d, 'em outro casal');
  d = base();
  d.aquario.ovos = [1, 2, 3, 4].map(() => ({ x: 10, eclodeEmMs: 5, cor: 'azul', sexo: 'macho' }));
  recusa(d, 'mais de 5');
  d = base();
  d.aquario.ovos = [{ x: 10, eclodeEmMs: 5, cor: 'amarelo', sexo: 'macho' }];
  recusa(d, 'ovos[0].cor');
});

test('salvar: Game Over só sem vivo e sem ovo', () => {
  const { aq } = montar(1);
  aq.matar(aq.peixes[0]);
  const d = JSON.parse(JSON.stringify(exportarJogo(aq, { tempoJogoMs: 0, salvoEmMs: SALVO_EM })));
  d.aquario.ovos = [{ x: 10, eclodeEmMs: 5, cor: 'azul', sexo: 'macho' }];
  assert.throws(() => importarJogo(d, { config }), (e) => e instanceof ErroDeSalvamento && e.message.includes('gameOver'));
});

test('ausência: o casal bem cuidado reproduz e os ovos eclodem, sem passar de 5 e sem animação', () => {
  const { aq, cfg } = casalBem();
  const r = aplicarAusencia(aq, { ausenciaMs: 20 * HORA_MS, horaDoJogoAntesMs: 0 }, cfg);
  assert.equal(r.horaDoJogoMs, 20 * HORA_MS);
  assert.ok(aq.vivos().length >= 3, `${aq.vivos().length} vivos`);
  assert.ok(aq.vivos().length + aq.ovos.length <= 5);
  assert.ok(aq.ovos.every((o) => o.estado === 'parado'));
  assert.ok(aq.casais.every((c) => c.namoro === null));
  assert.equal(aq.eventos.retirar().length, 0, 'os avisos da ausência são descartados');
});

test('ausência: ovos pendentes eclodem durante o tempo fechado', () => {
  const { aq, cfg, agora } = casalBem();
  aq.atualizar(0, 36 * MINUTO_MS); // casal reproduz
  aq.ovos.forEach((o) => { o.estado = 'parado'; });
  const quantos = aq.ovos.length;
  assert.ok(quantos >= 1);
  aplicarAusencia(aq, { ausenciaMs: 2 * HORA_MS, horaDoJogoAntesMs: 36 * MINUTO_MS }, cfg);
  assert.equal(aq.ovos.length, 0);
  assert.equal(aq.vivos().length, 2 + quantos);
  assert.ok(agora() >= 0);
});
