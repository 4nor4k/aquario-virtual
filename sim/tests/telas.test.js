import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { desenharMensagem, desenharMenu, desenharStatus, desenharTelas } from '../src/render/telas.js';
import { criarQuadro, LARGURA, ALTURA } from '../src/render/tela.js';
import { criarMenu } from '../src/core/menu.js';
import { DIA_MS } from '../src/core/clock.js';
import { montar, config } from './ajuda.js';

const textos = JSON.parse(readFileSync(new URL('../config/textos.json', import.meta.url), 'utf8'));
const contar = (quadro, cor) => quadro.reduce((n, c) => n + (c === cor ? 1 : 0), 0);
const linhasCom = (quadro, cor) => {
  const linhas = [];
  for (let y = 0; y < ALTURA; y++) {
    for (let x = 0; x < LARGURA; x++) if (quadro[y * LARGURA + x] === cor) { linhas.push(y); break; }
  }
  return linhas;
};
const menuNovo = () => criarMenu({ textos, aoNovoJogo() {} });

test('mensagem: caixa no rodapé, centralizada, e mais alta se o texto for maior', () => {
  const curta = criarQuadro();
  desenharMensagem(curta, 'Aquário limpo');
  const longa = criarQuadro();
  desenharMensagem(longa, 'Ele já estava cheio! A água suja demais agora.');

  const ys = (q) => linhasCom(q, 13).concat(linhasCom(q, 11));
  assert.ok(Math.max(...ys(curta)) <= ALTURA - 4, 'não passa da borda de baixo');
  assert.ok(Math.min(...ys(longa)) < Math.min(...ys(curta)), 'duas linhas dão uma caixa mais alta');
  assert.equal(curta[0], 0); // o resto da tela não é tocado
  assert.ok(contar(curta, 12) > 20, 'tem texto branco');
});

test('mensagem com acentos e cedilha não sai da tela nem dá erro', () => {
  const q = criarQuadro();
  desenharMensagem(q, 'Ação concluída! Água não está ruim.');
  assert.equal(q.length, LARGURA * ALTURA);
});

test('menu: caixa no meio, título laranja e a seta rosa acompanha o item escolhido', () => {
  const menu = menuNovo();
  const t = montar();
  const q0 = criarQuadro();
  desenharMenu(q0, menu, textos);
  assert.equal(q0[60 * LARGURA + 100], 13, 'fundo da caixa (canto livre de texto)');
  assert.ok(contar(q0, 15) > 0, 'título');
  const seta0 = linhasCom(q0, 10);

  menu.apertar({ a: true }, t.aq); // abre
  menu.apertar({ baixo: true }, t.aq);
  const q1 = criarQuadro();
  desenharMenu(q1, menu, textos);
  const seta1 = linhasCom(q1, 10);
  assert.equal(seta1[0] - seta0[0], 10, 'a seta desceu 10 pixels (um item)');
});

test('status: barras cheias e vazias, e o rosa avisa o que está impróprio', () => {
  const t = montar();
  const ctx = { aquario: t.aq, config, textos, agoraMs: 0 };

  const bom = criarQuadro();
  desenharStatus(bom, ctx);
  const ciano = contar(bom, 11);
  assert.equal(contar(bom, 10), 0, 'tudo bem: nada rosa');

  t.aq.peixes[0].saciedade = 10;  // fome
  t.aq.sujeira = 90;              // água suja
  t.aq.phPasso = 1;               // pH ruim
  t.aq.peixes[0].saude = 20;      // saúde baixa
  const ruim = criarQuadro();
  desenharStatus(ruim, ctx);
  assert.ok(contar(ruim, 10) > 0, 'aparece rosa');
  assert.ok(contar(ruim, 10) > contar(bom, 10));
  assert.ok(contar(ruim, 11) < ciano, 'as barras cianas diminuem');
});

test('status: peixe morto mostra a causa; sem peixe não dá erro', () => {
  const t = montar();
  const q1 = criarQuadro();
  desenharStatus(q1, { aquario: t.aq, config, textos, agoraMs: 0 });

  t.aq.matar(t.aq.peixes[0], 'velhice');
  const q2 = criarQuadro();
  desenharStatus(q2, { aquario: t.aq, config, textos, agoraMs: 30 * DIA_MS });
  assert.ok(contar(q2, 10) > contar(q1, 10), 'estado e causa em rosa');

  const vazio = montar(0);
  const q3 = criarQuadro();
  desenharStatus(q3, { aquario: vazio.aq, config, textos, agoraMs: 0 });
  assert.ok(contar(q3, 12) > 0);
});

test('status: a barra de saciedade enche na proporção do valor', () => {
  const t = montar();
  const ctx = { aquario: t.aq, config, textos, agoraMs: 0 };
  const cheiosDe = (saciedade) => {
    t.aq.peixes[0].saciedade = saciedade;
    const q = criarQuadro();
    desenharStatus(q, ctx);
    // A barra de saciedade fica na linha y = 32+1..3 (3 linhas por dentro), x de 47 a 94.
    let n = 0;
    for (let x = 47; x < 95; x++) if (q[33 * LARGURA + x] === 11 || q[33 * LARGURA + x] === 10) n++;
    return n;
  };
  assert.equal(cheiosDe(100), 48);
  assert.equal(cheiosDe(50), 24);
  assert.equal(cheiosDe(0), 0);
});

test('desenharTelas: tela do jogo não desenha nada; menu e status sim', () => {
  const t = montar();
  const menu = menuNovo();
  const ctx = { menu, aquario: t.aq, config, textos, agoraMs: 0 };

  const jogo = criarQuadro();
  desenharTelas(jogo, ctx);
  assert.equal(contar(jogo, 0), LARGURA * ALTURA);

  menu.apertar({ a: true }, t.aq);
  const comMenu = criarQuadro();
  desenharTelas(comMenu, ctx);
  assert.ok(contar(comMenu, 0) < LARGURA * ALTURA);

  menu.apertar({ b: true }, t.aq);
  menu.apertar({ c: true }, t.aq);
  const status = criarQuadro();
  desenharTelas(status, ctx);
  assert.equal(contar(status, 0), 0, 'o status cobre a tela inteira');

  menu.apertar({ c: true }, t.aq);
  menu.executar('limpar', t.aq); // mensagem
  const msg = criarQuadro();
  desenharTelas(msg, ctx);
  assert.ok(contar(msg, 13) > 0);
});
