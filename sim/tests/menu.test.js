import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  criarMenu, TELAS, ACOES, SEGUNDOS_DA_MENSAGEM, SEGUNDOS_ATE_O_GAME_OVER,
} from '../src/core/menu.js';
import { valorDoPh } from '../src/core/rules.js';
import { montar, config } from './ajuda.js';

const textos = JSON.parse(readFileSync(new URL('../config/textos.json', import.meta.url), 'utf8'));
const NADA = { a: false, b: false, c: false, cima: false, baixo: false, esquerda: false, direita: false };
const aperto = (...nomes) => Object.fromEntries(nomes.map((n) => [n, true]));

function novo() {
  let recomecos = 0;
  const menu = criarMenu({ textos, aoNovoJogo: () => { recomecos++; } });
  const t = montar();
  return { menu, aq: t.aq, recomecos: () => recomecos };
}

test('começa na tela do jogo, com a câmera livre', () => {
  const { menu } = novo();
  assert.equal(menu.tela, TELAS.JOGO);
  assert.equal(menu.cameraLivre(), true);
  assert.equal(menu.mensagem, null);
});

test('A abre o menu (câmera para) e B volta', () => {
  const { menu, aq } = novo();
  menu.apertar(aperto('a'), aq);
  assert.equal(menu.tela, TELAS.MENU);
  assert.equal(menu.item, 0);
  assert.equal(menu.cameraLivre(), false);
  menu.apertar(aperto('b'), aq);
  assert.equal(menu.tela, TELAS.JOGO);
});

test('o menu tem um item para cada ação, na mesma ordem', () => {
  const { menu } = novo();
  assert.deepEqual(ACOES, ['comida', 'limpar', 'ph', 'parceiro', 'cacar']);
  assert.equal(menu.itens.length, ACOES.length);
});

test('cima e baixo escolhem o item, dando a volta nas pontas', () => {
  const { menu, aq } = novo();
  menu.apertar(aperto('a'), aq);
  menu.apertar(aperto('baixo'), aq);
  assert.equal(menu.item, 1);
  menu.apertar(aperto('baixo'), aq);
  menu.apertar(aperto('baixo'), aq);
  menu.apertar(aperto('baixo'), aq);
  menu.apertar(aperto('baixo'), aq);
  assert.equal(menu.item, 0); // deu a volta
  menu.apertar(aperto('cima'), aq);
  assert.equal(menu.item, 4);
});

test('abrir o menu de novo começa no primeiro item', () => {
  const { menu, aq } = novo();
  menu.apertar(aperto('a'), aq);
  menu.apertar(aperto('baixo'), aq);
  menu.apertar(aperto('b'), aq);
  menu.apertar(aperto('a'), aq);
  assert.equal(menu.item, 0);
});

test('A no item "Dar comida" joga os grãos, volta ao jogo e mostra a mensagem', () => {
  const { menu, aq } = novo();
  aq.peixes[0].saciedade = 20;
  menu.apertar(aperto('a'), aq);
  menu.apertar(aperto('a'), aq);
  assert.equal(aq.graos.length, config.comida.graos);
  assert.equal(aq.peixes[0].saciedade, 20, 'a saciedade só sobe quando ele comer');
  assert.equal(menu.tela, TELAS.JOGO);
  assert.equal(menu.mensagem, textos.mensagens.comida);
});

test('comida com o peixe cheio: mensagem de que comer demais faz mal', () => {
  const { menu, aq } = novo();
  menu.apertar(aperto('a'), aq);
  menu.apertar(aperto('a'), aq); // saciedade 100: excesso
  assert.equal(menu.mensagem, textos.mensagens.comidaEmExcesso);
});

test('a comida cai onde a interface mandar (posicaoDaComida)', () => {
  const m = criarMenu({ textos, posicaoDaComida: () => 200 });
  const { aq } = novo();
  m.executar('comida', aq);
  for (const g of aq.graos) assert.ok(Math.abs(g.x - 200) <= config.comida.espalhamentoX, `grão em x=${g.x}`);
});

test('limpar aquário zera a sujeira e avisa', () => {
  const { menu, aq } = novo();
  aq.sujeira = 80;
  menu.apertar(aperto('a'), aq);
  menu.apertar(aperto('baixo'), aq);
  menu.apertar(aperto('a'), aq);
  assert.equal(aq.sujeira, 0);
  assert.equal(menu.mensagem, textos.mensagens.limpeza);
});

test('regular pH sobe um passo e diz o novo valor com vírgula; no máximo avisa', () => {
  const { menu, aq } = novo();
  const regular = () => {
    menu.apertar(aperto('a'), aq);
    menu.apertar(aperto('baixo'), aq);
    menu.apertar(aperto('baixo'), aq); // do primeiro item até o pH
    menu.apertar(aperto('a'), aq);
  };
  regular();
  assert.equal(menu.mensagem, 'pH subiu para 7,2');
  regular();
  assert.equal(menu.mensagem, 'pH subiu para 7,5');
  regular();
  assert.equal(menu.mensagem, textos.mensagens.phNoMaximo);
  assert.equal(valorDoPh(aq, config), 7.5);
});

test('sem peixe vivo, dar comida só avisa', () => {
  const { menu, aq } = novo();
  aq.peixes[0].estado = 'morto';
  assert.equal(menu.executar('comida', aq), textos.mensagens.semPeixe);
});

test('executar aceita ação do painel de testes e recusa ação desconhecida', () => {
  const { menu, aq } = novo();
  assert.equal(menu.executar('limpar', aq), textos.mensagens.limpeza);
  assert.throws(() => menu.executar('voar', aq), RangeError);
});

test('a mensagem some depois de 2,5 segundos', () => {
  const { menu, aq } = novo();
  menu.executar('limpar', aq);
  menu.atualizar(SEGUNDOS_DA_MENSAGEM - 0.1, aq);
  assert.notEqual(menu.mensagem, null);
  menu.atualizar(0.2, aq);
  assert.equal(menu.mensagem, null);
});

test('C abre o status; C ou B fecham; A e as setas não fazem nada lá', () => {
  const { menu, aq } = novo();
  menu.apertar(aperto('c'), aq);
  assert.equal(menu.tela, TELAS.STATUS);
  assert.equal(menu.cameraLivre(), false);
  menu.apertar(aperto('a', 'cima', 'baixo'), aq);
  assert.equal(menu.tela, TELAS.STATUS);
  menu.apertar(aperto('c'), aq);
  assert.equal(menu.tela, TELAS.JOGO);
  menu.apertar(aperto('c'), aq);
  menu.apertar(aperto('b'), aq);
  assert.equal(menu.tela, TELAS.JOGO);
});

test('com o menu aberto, C não abre o status; na tela do jogo, B e as setas não fazem nada', () => {
  const { menu, aq } = novo();
  menu.apertar(aperto('b', 'cima', 'baixo', 'esquerda', 'direita'), aq);
  assert.equal(menu.tela, TELAS.JOGO);
  menu.apertar(aperto('a'), aq);
  menu.apertar(aperto('c'), aq);
  assert.equal(menu.tela, TELAS.MENU);
});

test('sem apertar nada, nada muda', () => {
  const { menu, aq } = novo();
  menu.apertar(NADA, aq);
  assert.equal(menu.tela, TELAS.JOGO);
});

test('o jogo continua passando com o menu aberto: o menu não pausa nada', () => {
  const t = montar();
  const menu = criarMenu({ textos, aoNovoJogo() {} });
  menu.apertar(aperto('a'), t.aq);
  const antes = t.aq.peixes[0].saciedade;
  t.passar(5);
  assert.ok(t.aq.peixes[0].saciedade < antes);
  assert.equal(menu.tela, TELAS.MENU);
});

// --- Game Over -----------------------------------------------------------------------------

test('o Game Over só aparece 5 segundos reais depois da morte do último peixe', () => {
  const { menu, aq } = novo();
  menu.atualizar(100, aq); // sem Game Over no aquário: nada acontece
  assert.equal(menu.tela, TELAS.JOGO);

  aq.matar(aq.peixes[0]);
  assert.equal(aq.gameOver, true);
  menu.atualizar(SEGUNDOS_ATE_O_GAME_OVER - 0.1, aq);
  assert.equal(menu.tela, TELAS.JOGO); // ainda dá para ver o peixe boiando
  menu.atualizar(0.2, aq);
  assert.equal(menu.tela, TELAS.GAME_OVER);
});

test('o Game Over aparece mesmo com o menu ou o status abertos', () => {
  for (const botao of ['a', 'c']) {
    const { menu, aq } = novo();
    menu.apertar(aperto(botao), aq);
    aq.matar(aq.peixes[0]);
    menu.atualizar(6, aq);
    assert.equal(menu.tela, TELAS.GAME_OVER, `aberto com ${botao}`);
  }
});

test('no Game Over só o A faz algo: abre a tela de adoção (o jogo só recomeça ao adotar)', () => {
  const { menu, aq, recomecos } = novo();
  aq.matar(aq.peixes[0]);
  menu.atualizar(6, aq);
  menu.apertar(aperto('b', 'c', 'cima', 'baixo', 'esquerda', 'direita'), aq);
  assert.equal(menu.tela, TELAS.GAME_OVER);
  menu.apertar(aperto('a'), aq);
  assert.equal(menu.tela, TELAS.ADOCAO);
  assert.equal(recomecos(), 0, 'ainda não adotou');
});

test('reiniciar volta ao começo: tela do jogo, sem mensagem e sem espera do Game Over', () => {
  const { menu, aq } = novo();
  aq.matar(aq.peixes[0]);
  menu.atualizar(6, aq);
  menu.reiniciar();
  assert.equal(menu.tela, TELAS.JOGO);
  assert.equal(menu.mensagem, null);

  // Um aquário novo (sem Game Over) não herda a espera do anterior.
  const novoAq = montar().aq;
  novoAq.matar(novoAq.peixes[0]);
  menu.atualizar(2, novoAq);
  assert.equal(menu.tela, TELAS.JOGO);
});
