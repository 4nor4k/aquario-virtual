// Vários peixes na interface (doc 10, passos 2 e 3): o peixe em foco, o status com troca de peixe,
// o HUD do peixe em foco, o sexo que só aparece no adulto e a adoção do parceiro pelo menu.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { criarMenu, TELAS, ACOES } from '../src/core/menu.js';
import { desenharStatus, desenharAdocao, desenharTelas, sexoRevelado } from '../src/render/telas.js';
import { valoresDoHud, desenharIndicadores } from '../src/render/indicadores.js';
import { criarQuadro, LARGURA } from '../src/render/tela.js';
import { INICIO_DA_FASE_MS } from '../src/core/fish.js';
import { DIA_MS } from '../src/core/clock.js';
import { config, montar } from './ajuda.js';

const textos = JSON.parse(readFileSync(new URL('../config/textos.json', import.meta.url), 'utf8'));
const aperto = (...nomes) => Object.fromEntries(nomes.map((n) => [n, true]));

function novo({ peixes = 3 } = {}) {
  const chamadas = [];
  const menu = criarMenu({ textos, cores: config.cores, aoNovoJogo() {}, aoAgir: (a) => chamadas.push(a) });
  const m = montar(0);
  const lista = [];
  for (let i = 0; i < peixes; i++) lista.push(m.aq.adicionarPeixe({ nome: `P${i + 1}`, fase: 'adulto', sexo: i % 2 ? 'femea' : 'macho' }, 0));
  return { menu, aq: m.aq, lista, chamadas };
}
const contar = (q, cor) => q.reduce((n, c) => n + (c === cor ? 1 : 0), 0);

// --- O foco ----------------------------------------------------------------------------------

test('foco: começa no primeiro peixe vivo e troca para o próximo e o anterior, dando a volta', () => {
  const { menu, aq, lista } = novo();
  assert.equal(menu.peixeEmFoco(aq), lista[0]);
  assert.deepEqual(menu.posicaoDoFoco(aq), { numero: 1, total: 3 });
  menu.trocarFoco(aq, 1);
  assert.equal(menu.peixeEmFoco(aq), lista[1]);
  menu.trocarFoco(aq, 1);
  menu.trocarFoco(aq, 1);
  assert.equal(menu.peixeEmFoco(aq), lista[0], 'deu a volta');
  menu.trocarFoco(aq, -1);
  assert.equal(menu.peixeEmFoco(aq), lista[2], 'e para trás também');
  assert.deepEqual(menu.posicaoDoFoco(aq), { numero: 3, total: 3 });
});

test('foco: pula os mortos, e se o escolhido morre o foco vai para o primeiro vivo', () => {
  const { menu, aq, lista } = novo();
  menu.trocarFoco(aq, 1); // P2
  aq.matar(lista[1]);
  assert.equal(menu.peixeEmFoco(aq), lista[0], 'o escolhido morreu: volta ao primeiro vivo');
  assert.deepEqual(menu.posicaoDoFoco(aq), { numero: 1, total: 2 });
  menu.trocarFoco(aq, 1);
  assert.equal(menu.peixeEmFoco(aq), lista[2], 'o morto não entra na troca');
});

test('foco: se o escolhido some do aquário, vale o primeiro vivo; sem nenhum peixe é null', () => {
  const { menu, aq, lista } = novo();
  menu.trocarFoco(aq, 1);
  aq.removerPeixe(lista[1]);
  assert.equal(menu.peixeEmFoco(aq), lista[0]);
  const { menu: m2, aq: aq2 } = novo({ peixes: 0 });
  assert.equal(m2.peixeEmFoco(aq2), null);
  assert.doesNotThrow(() => m2.trocarFoco(aq2, 1));
  assert.deepEqual(m2.posicaoDoFoco(aq2), { numero: 0, total: 0 });
});

test('foco: com todos mortos, ainda dá para ver o morto (Game Over)', () => {
  const { menu, aq, lista } = novo({ peixes: 1 });
  aq.matar(lista[0]);
  assert.equal(menu.peixeEmFoco(aq), lista[0]);
});

test('foco: o painel escolhe por id (só entre os candidatos) e reiniciar volta ao primeiro', () => {
  const { menu, aq, lista } = novo();
  menu.focar(aq, lista[2].id);
  assert.equal(menu.peixeEmFoco(aq), lista[2]);
  menu.focar(aq, 9999); // não existe: ignora
  assert.equal(menu.peixeEmFoco(aq), lista[2]);
  menu.reiniciar();
  assert.equal(menu.peixeEmFoco(aq), lista[0]);
});

test('status: esquerda e direita trocam o peixe; nas outras telas não fazem nada', () => {
  const { menu, aq, lista } = novo();
  menu.apertar(aperto('direita'), aq);
  assert.equal(menu.peixeEmFoco(aq), lista[0], 'na tela do jogo a seta só move a câmera');
  menu.apertar(aperto('c'), aq);
  assert.equal(menu.tela, TELAS.STATUS);
  menu.apertar(aperto('direita'), aq);
  assert.equal(menu.peixeEmFoco(aq), lista[1]);
  menu.apertar(aperto('esquerda'), aq);
  menu.apertar(aperto('esquerda'), aq);
  assert.equal(menu.peixeEmFoco(aq), lista[2]);
  assert.equal(menu.tela, TELAS.STATUS, 'trocar de peixe não fecha a tela');
});

test('status: mostra o peixe em foco (cada peixe desenha uma tela diferente) e a posição "2/3"', () => {
  const { menu, aq, lista } = novo();
  lista[1].saciedade = 20;
  const ctx = { aquario: aq, config, textos, agoraMs: 20 * DIA_MS, menu };
  const q1 = criarQuadro();
  desenharStatus(q1, ctx);
  menu.trocarFoco(aq, 1);
  const q2 = criarQuadro();
  desenharStatus(q2, ctx);
  assert.notDeepEqual(Array.from(q1), Array.from(q2));
  assert.ok(contar(q2, 10) > contar(q1, 10), 'o 2º está com fome: aparece rosa');
  // Com um peixe só não há "1/1": a tela é a mesma de antes (sem a posição, no canto de cima à direita).
  const { menu: m1, aq: aq1 } = novo({ peixes: 1 });
  const a = criarQuadro();
  desenharStatus(a, { aquario: aq1, config, textos, agoraMs: 20 * DIA_MS, menu: m1 });
  const b = criarQuadro();
  desenharStatus(b, { aquario: aq1, config, textos, agoraMs: 20 * DIA_MS });
  assert.deepEqual(Array.from(a), Array.from(b));
});

// --- Sexo ------------------------------------------------------------------------------------

test('sexo: só aparece quando o peixe é adulto (filhote e jovem mostram "?")', () => {
  const { aq } = novo({ peixes: 0 });
  const filhote = aq.adicionarPeixe({ sexo: 'femea', fase: 'filhote' }, 0);
  const jovem = aq.adicionarPeixe({ sexo: 'femea', fase: 'jovem' }, 0);
  const adulto = aq.adicionarPeixe({ sexo: 'femea', fase: 'adulto' }, 0);
  const idoso = aq.adicionarPeixe({ sexo: 'macho', fase: 'idoso' }, 0);
  assert.equal(sexoRevelado(filhote, 0), null);
  assert.equal(sexoRevelado(jovem, 0), null);
  assert.equal(sexoRevelado(adulto, 0), 'femea');
  assert.equal(sexoRevelado(idoso, 0), 'macho');
  // O filhote vira adulto com o tempo e o sexo aparece.
  assert.equal(sexoRevelado(filhote, INICIO_DA_FASE_MS.adulto + 1), 'femea');
});

test('status: o sexo e o parceiro aparecem na tela (o desenho muda com o parceiro)', () => {
  const { menu, aq, lista } = novo({ peixes: 1 });
  const ctx = { aquario: aq, config, textos, agoraMs: 0, menu };
  const sem = criarQuadro();
  desenharStatus(sem, ctx);
  aq.adotarParceiro(lista[0], { nome: 'Bia' });
  const com = criarQuadro();
  desenharStatus(com, { ...ctx, aquario: aq });
  assert.notDeepEqual(Array.from(sem), Array.from(com));
});

// --- HUD -------------------------------------------------------------------------------------

test('HUD: FOME e SAÚDE são do peixe em foco; PH, SUJO e TEMP são da água', () => {
  const { menu, aq, lista } = novo();
  lista[0].saciedade = 80; lista[1].saciedade = 40;
  const v0 = valoresDoHud(aq, config, textos, menu.peixeEmFoco(aq));
  menu.trocarFoco(aq, 1);
  const v1 = valoresDoHud(aq, config, textos, menu.peixeEmFoco(aq));
  assert.equal(v0.fome.texto, '80');
  assert.equal(v1.fome.texto, '40');
  assert.deepEqual(v0.ph, v1.ph);
  assert.deepEqual(v0.sujeira, v1.sujeira);
  assert.equal(valoresDoHud(aq, config, textos, null).fome.texto, textos.hud.semPeixe, 'null = sem peixe');
  assert.equal(valoresDoHud(aq, config, textos).fome.texto, '80', 'sem o argumento vale o primeiro (como antes)');
});

test('HUD: na tela do jogo desenha o peixe em foco', () => {
  const { menu, aq, lista } = novo();
  lista[1].saciedade = 5; // fome
  menu.apertar(aperto('b'), aq); // liga o HUD
  const q1 = criarQuadro();
  desenharTelas(q1, { menu, aquario: aq, config, textos, agoraMs: 0 });
  menu.apertar(aperto('c'), aq);
  menu.apertar(aperto('direita'), aq);
  menu.apertar(aperto('c'), aq); // volta ao jogo, já com o 2º em foco
  const q2 = criarQuadro();
  desenharTelas(q2, { menu, aquario: aq, config, textos, agoraMs: 0 });
  assert.ok(contar(q2, 10) > contar(q1, 10), 'a FOME do 2º aparece em rosa');
  const direto = criarQuadro();
  desenharIndicadores(direto, { aquario: aq, config, textos, peixe: lista[1] });
  assert.ok(contar(direto, 10) > 0);
});

// --- Adotar o parceiro pelo menu -------------------------------------------------------------

function abrirItemParceiro(menu, aq) {
  menu.apertar(aperto('a'), aq);
  while (ACOES[menu.item] !== 'parceiro') menu.apertar(aperto('baixo'), aq);
  menu.apertar(aperto('a'), aq);
}

test('menu: o 4º item é "Adotar parceiro" e abre a tela de adoção no modo parceiro, com o sexo oposto', () => {
  assert.equal(textos.menu.itens[ACOES.indexOf('parceiro')], 'Adotar parceiro');
  const { menu, aq, lista } = novo({ peixes: 1 }); // P1 é macho
  abrirItemParceiro(menu, aq);
  assert.equal(menu.tela, TELAS.ADOCAO);
  assert.equal(menu.modoAdocao, 'parceiro');
  assert.equal(menu.sexoDoParceiro, 'femea');
  const q = criarQuadro();
  desenharAdocao(q, { menu, textos });
  const normal = criarQuadro();
  const { menu: m2, aq: aq2 } = novo({ peixes: 0 });
  m2.abrirAdocao();
  desenharAdocao(normal, { menu: m2, textos });
  assert.notDeepEqual(Array.from(q), Array.from(normal), 'o título e a dica mudam');
  assert.equal(lista.length, 1);
  assert.equal(aq2.peixes.length, 0);
});

test('menu: escolher a cor e apertar A adota o parceiro, forma o casal, avisa e salva', () => {
  const { menu, aq, lista, chamadas } = novo({ peixes: 1 });
  abrirItemParceiro(menu, aq);
  menu.apertar(aperto('direita'), aq); // azul
  menu.apertar(aperto('a'), aq);
  assert.equal(menu.tela, TELAS.JOGO);
  assert.equal(aq.peixes.length, 2);
  const parceiro = aq.parceiroDe(lista[0]);
  assert.ok(parceiro);
  assert.equal(parceiro.cor, config.cores[1]);
  assert.equal(parceiro.sexo, 'femea');
  assert.equal(parceiro.fase, 'adulto');
  assert.equal(menu.mensagem, textos.mensagens.parceiroAdotado);
  assert.deepEqual(chamadas, ['parceiro'], 'avisou a interface (para salvar)');
});

test('menu: B cancela a adoção do parceiro e nada muda', () => {
  const { menu, aq, chamadas } = novo({ peixes: 1 });
  abrirItemParceiro(menu, aq);
  menu.apertar(aperto('b'), aq);
  assert.equal(menu.tela, TELAS.JOGO);
  assert.equal(aq.peixes.length, 1);
  assert.deepEqual(chamadas, []);
});

test('menu: o parceiro é do peixe em foco, não do primeiro', () => {
  const { menu, aq, lista } = novo({ peixes: 2 });
  menu.focar(aq, lista[1].id); // P2, fêmea
  abrirItemParceiro(menu, aq);
  assert.equal(menu.sexoDoParceiro, 'macho');
  menu.apertar(aperto('a'), aq);
  assert.ok(aq.parceiroDe(lista[1]));
  assert.equal(aq.parceiroDe(lista[0]), null);
});

test('menu: sem poder adotar, o item avisa o motivo e não abre a tela', () => {
  // Filhote.
  const a = novo({ peixes: 0 });
  const filhote = a.aq.adicionarPeixe({ fase: 'filhote' }, 0);
  abrirItemParceiro(a.menu, a.aq);
  assert.equal(a.menu.tela, TELAS.JOGO);
  assert.equal(a.menu.mensagem, textos.mensagens.parceiro.naoAdulto);
  assert.equal(a.aq.parceiroDe(filhote), null);
  // Já tem parceiro.
  const b = novo({ peixes: 1 });
  b.aq.adotarParceiro(b.lista[0]);
  abrirItemParceiro(b.menu, b.aq);
  assert.equal(b.menu.mensagem, textos.mensagens.parceiro.temParceiro);
  // Aquário cheio.
  const c = novo({ peixes: 5 });
  abrirItemParceiro(c.menu, c.aq);
  assert.equal(c.menu.tela, TELAS.JOGO);
  assert.equal(c.menu.mensagem, textos.mensagens.parceiro.cheio);
  assert.equal(c.aq.peixes.length, 5);
  // Sem peixe.
  const d = novo({ peixes: 0 });
  abrirItemParceiro(d.menu, d.aq);
  assert.equal(d.menu.mensagem, textos.mensagens.parceiro.morto);
});

test('menu: adotarParceiro (usado pelo painel) devolve o resultado e a mensagem', () => {
  const { menu, aq, lista } = novo({ peixes: 1 });
  const r = menu.adotarParceiro(aq, { cor: 'roxo' });
  assert.equal(r.ok, true);
  assert.equal(r.parceiro.cor, 'roxo');
  assert.equal(aq.parceiroDe(lista[0]), r.parceiro);
  const de_novo = menu.adotarParceiro(aq, { cor: 'roxo' });
  assert.deepEqual([de_novo.ok, de_novo.motivo], [false, 'temParceiro']);
  assert.equal(menu.mensagem, textos.mensagens.parceiro.temParceiro);
});

test('desenhar a tela de adoção em modo parceiro cabe na tela', () => {
  const { menu, aq } = novo({ peixes: 1 });
  abrirItemParceiro(menu, aq);
  const q = criarQuadro();
  assert.doesNotThrow(() => desenharTelas(q, { menu, aquario: aq, config, textos, agoraMs: 0 }));
  assert.ok(q.length === LARGURA * LARGURA);
});
