// Status da saúde (cruz verde/amarela/vermelha) e faixa do pH (azul/verde/amarelo): doc 12.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { statusDaSaude, faixaDoPh } from '../src/core/rules.js';
import { desenharStatus } from '../src/render/telas.js';
import { desenharIndicadores, CELULAS, LARGURA_CELULA, ALTURA_CELULA } from '../src/render/indicadores.js';
import { criarQuadro, LARGURA, ALTURA } from '../src/render/tela.js';
import { COR } from '../src/render/palette.js';
import { caracteresSemGlifo, larguraDoTexto } from '../src/render/fonte.js';
import { montar, config } from './ajuda.js';

const textos = JSON.parse(readFileSync(new URL('../config/textos.json', import.meta.url), 'utf8'));
const contar = (quadro, cor) => quadro.reduce((n, c) => n + (c === cor ? 1 : 0), 0);
const contarNaCelula = (quadro, celula, cor) => {
  let n = 0;
  for (let y = celula.y; y < celula.y + ALTURA_CELULA; y++) {
    for (let x = celula.x; x < celula.x + LARGURA_CELULA; x++) if (quadro[y * LARGURA + x] === cor) n++;
  }
  return n;
};

// --- Núcleo -----------------------------------------------------------------------------------

test('statusDaSaude: saudável de 70 a 100, doente de 30 a 69, muito doente abaixo de 30', () => {
  const peixe = { estado: 'saudavel', saude: 100 };
  const status = (saude, estado = 'saudavel') => statusDaSaude({ ...peixe, saude, estado }, config);
  assert.equal(status(100), 'saudavel');
  assert.equal(status(70), 'saudavel');
  assert.equal(status(69.9), 'doente');
  assert.equal(status(30), 'doente');
  assert.equal(status(29.9), 'muitoDoente');
  assert.equal(status(1), 'muitoDoente');
  assert.equal(status(0, 'morto'), 'morto');
  assert.equal(status(100, 'morto'), 'morto', 'morto é morto, qualquer que seja a saúde');
});

test('statusDaSaude: "muito doente" é o mesmo limite do estado interno "doente" (nada devagar)', () => {
  const { aq, passar } = montar();
  const peixe = aq.peixes[0];
  peixe.saude = 29;
  passar(0.1); // as regras marcam o estado
  assert.equal(peixe.estado, 'doente');
  assert.equal(statusDaSaude(peixe, config), 'muitoDoente');
  peixe.saude = 50;
  assert.equal(statusDaSaude(peixe, config), 'doente', 'doente (amarelo) ainda nada normal: o estado interno é outro');
});

test('faixaDoPh: ácido até 6,6, ideal de 6,8 a 7,2, alcalino em 7,5', () => {
  const esperado = { 6.2: 'acido', 6.4: 'acido', 6.6: 'acido', 6.8: 'ideal', 7.0: 'ideal', 7.2: 'ideal', 7.5: 'alcalino' };
  for (const valor of config.ph.valores) assert.equal(faixaDoPh(valor, config), esperado[valor], `pH ${valor}`);
  assert.equal(config.ph.valores.length, 7, 'se a lista de pH mudar, confira as faixas do config');
});

// --- Tela de status (botão C) ------------------------------------------------------------------

// A cruz da tela de status fica em x 46 a 52, y 55 a 61 (a linha da saúde).
const contarNaCruz = (quadro, cor) => {
  let n = 0;
  for (let y = 55; y < 62; y++) for (let x = 46; x < 53; x++) if (quadro[y * LARGURA + x] === cor) n++;
  return n;
};

test('tela de status: a cruz tem a cor do status', () => {
  const t = montar();
  const ctx = { aquario: t.aq, config, textos, agoraMs: 0 };
  const peixe = t.aq.peixes[0];
  for (const [saude, cor] of [[100, 'verde'], [50, 'amarelo'], [10, 'vermelho']]) {
    peixe.saude = saude;
    const q = criarQuadro();
    desenharStatus(q, ctx);
    assert.equal(contarNaCruz(q, COR.STATUS[cor]), 33, `saúde ${saude}: uma cruz ${cor} (33 pixels)`);
    for (const outra of Object.keys(COR.STATUS).filter((c) => c !== cor)) {
      assert.equal(contarNaCruz(q, COR.STATUS[outra]), 0, `saúde ${saude}: sem cruz ${outra}`);
    }
  }
});

test('tela de status: peixe morto não tem cruz (só o texto "Morto")', () => {
  const t = montar();
  t.aq.matar(t.aq.peixes[0], 'velhice');
  const q = criarQuadro();
  desenharStatus(q, { aquario: t.aq, config, textos, agoraMs: 0 });
  for (const cor of Object.keys(COR.STATUS)) assert.equal(contarNaCruz(q, COR.STATUS[cor]), 0, `sem cruz ${cor}`);
});

// O quadradinho do pH (5×5) fica logo depois do texto "pH 7,0", na linha y = 72 a 76.
const contarNaLinhaDoPh = (quadro, cor) => {
  let n = 0;
  for (let y = 72; y < 77; y++) for (let x = 0; x < LARGURA; x++) if (quadro[y * LARGURA + x] === cor) n++;
  return n;
};

test('tela de status: "pH valor" e um quadradinho com a cor da faixa (e só isso)', () => {
  const t = montar();
  const ctx = { aquario: t.aq, config, textos, agoraMs: 0 };
  for (const [passo, cor] of [[0, 'azul'], [2, 'azul'], [3, 'verde'], [5, 'verde'], [6, 'amarelo']]) {
    t.aq.phPasso = passo;
    const q = criarQuadro();
    desenharStatus(q, ctx);
    assert.equal(contarNaLinhaDoPh(q, COR.STATUS[cor]), 25, `pH ${config.ph.valores[passo]}: um quadradinho ${cor} de 5×5`);
    for (const outra of Object.keys(COR.STATUS).filter((c) => c !== cor)) {
      assert.equal(contarNaLinhaDoPh(q, COR.STATUS[outra]), 0, `pH ${config.ph.valores[passo]}: sem ${outra}`);
    }
  }
});

// --- HUD de indicadores (botão B) --------------------------------------------------------------

test('HUD: a caixinha da saúde tem só a cruz colorida; a do pH tem "PH valor" e o quadradinho colorido', () => {
  const t = montar();
  const peixe = t.aq.peixes[0];
  for (const [saude, cor] of [[100, 'verde'], [50, 'amarelo'], [10, 'vermelho']]) {
    peixe.saude = saude;
    const q = criarQuadro();
    desenharIndicadores(q, { aquario: t.aq, config, textos });
    assert.equal(contarNaCelula(q, CELULAS.saude, COR.STATUS[cor]), 33, `saúde ${saude}: cruz ${cor}`);
  }
  for (const [passo, cor] of [[1, 'azul'], [4, 'verde'], [6, 'amarelo']]) {
    t.aq.phPasso = passo;
    const q = criarQuadro();
    desenharIndicadores(q, { aquario: t.aq, config, textos });
    assert.equal(contarNaCelula(q, CELULAS.ph, COR.STATUS[cor]), 25, `pH passo ${passo}: quadradinho ${cor} de 5×5`);
  }
});

test('HUD: sem peixe vivo a saúde mostra "--" e não desenha cruz', () => {
  const t = montar(0);
  const q = criarQuadro();
  desenharIndicadores(q, { aquario: t.aq, config, textos });
  for (const cor of ['verde', 'amarelo', 'vermelho']) assert.equal(contarNaCelula(q, CELULAS.saude, COR.STATUS[cor]), 0);
});

// --- Textos ------------------------------------------------------------------------------------

test('textos do status e do pH só usam letras da fonte e cabem na tela de status', () => {
  for (const nome of Object.values(textos.status.saudeNiveis)) assert.deepEqual(caracteresSemGlifo(nome), [], nome);
  // "Muito doente" começa em x = 56 e a tela tem 120 de largura
  assert.ok(56 + larguraDoTexto(textos.status.saudeNiveis.muitoDoente) < LARGURA - 6);
  // "pH 7,5" e o quadradinho (3 px de folga + 5 px) cabem na tela de status e "PH 7,5" na caixinha do HUD
  assert.ok(6 + larguraDoTexto(`${textos.status.ph} 7,5`) + 3 + 5 < LARGURA - 6);
  assert.ok(2 + larguraDoTexto(`${textos.hud.ph} 7,5`) + 2 + 5 <= LARGURA_CELULA - 2, 'HUD: texto e quadradinho cabem na caixinha');
  assert.ok(ALTURA >= 100);
});
