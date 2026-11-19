// Adoção e nome (doc 09, passo 5): nome do peixe, tela "Adote um peixe" e o caminho do Game Over.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizarNome } from '../src/core/nome.js';
import { criarMenu, TELAS } from '../src/core/menu.js';
import { criarAquario } from '../src/core/aquarium.js';
import { exportarJogo, importarJogo } from '../src/core/salvar.js';
import { desenharAdocao, desenharTelas } from '../src/render/telas.js';
import { criarQuadro, LARGURA, ALTURA } from '../src/render/tela.js';
import { caracteresSemGlifo, larguraDoTexto, quebrarTexto } from '../src/render/fonte.js';
import { COR } from '../src/render/palette.js';
import { config, montar } from './ajuda.js';

const textos = JSON.parse(readFileSync(new URL('../config/textos.json', import.meta.url), 'utf8'));
const NADA = { a: false, b: false, c: false, cima: false, baixo: false, esquerda: false, direita: false };
const aperto = (...nomes) => ({ ...NADA, ...Object.fromEntries(nomes.map((n) => [n, true])) });
const aceitaFonte = (letra) => caracteresSemGlifo(letra).length === 0;

function novoMenu() {
  const adocoes = [];
  const menu = criarMenu({ textos, cores: config.cores, aoNovoJogo: (pedido) => adocoes.push(pedido) });
  return { menu, adocoes };
}

// --- Nome -------------------------------------------------------------------------------------

test('nome: corta as pontas, junta espaços e respeita o máximo de 12 letras', () => {
  const n = (s, aceita) => normalizarNome(s, config.nome, aceita);
  assert.equal(n('Nemo'), 'Nemo');
  assert.equal(n('  Nemo  '), 'Nemo');
  assert.equal(n('Capitão   Nemo'), 'Capitão Nemo');
  assert.equal(n('Capitão\tNemo\n'), 'Capitão Nemo');
  assert.equal(n('Abcdefghijklmnop'), 'Abcdefghijkl');
  assert.equal(n('Abcdefghijk mnop'), 'Abcdefghijk', 'não termina em espaço depois de cortar');
  assert.equal(n('Zé Pequeno Doce'), 'Zé Pequeno D');
});

test('nome: vazio, só espaços ou só letras proibidas viram o nome padrão', () => {
  assert.equal(normalizarNome('', config.nome), config.nome.padrao);
  assert.equal(normalizarNome('   ', config.nome), config.nome.padrao);
  assert.equal(normalizarNome(null, config.nome), config.nome.padrao);
  assert.equal(normalizarNome(undefined, config.nome), config.nome.padrao);
  assert.equal(normalizarNome('@@@', config.nome, aceitaFonte), config.nome.padrao);
});

test('nome: tira o que a fonte do aparelho não sabe desenhar e mantém os acentos', () => {
  assert.equal(normalizarNome('Pe@ixe#1', config.nome, aceitaFonte), 'Peixe1');
  assert.equal(normalizarNome('Çãõ Ângelo', config.nome, aceitaFonte), 'Çãõ Ângelo');
  assert.equal(normalizarNome('Nemo 🐟', config.nome, aceitaFonte), 'Nemo', 'emoji sai, e o espaço da ponta também');
});

test('nome: acento decomposto (a + til) vira a letra inteira e conta como uma letra só', () => {
  const decomposto = 'ã'.repeat(13); // 13 vezes "ã" escrito em duas partes
  const r = normalizarNome(decomposto, config.nome, aceitaFonte);
  assert.equal([...r].length, 12);
  assert.equal(r, 'ã'.repeat(12));
});

test('aquário.renomear aplica as regras e devolve o nome que ficou', () => {
  const { aq } = montar(1);
  const peixe = aq.peixes[0];
  assert.equal(aq.renomear(peixe, '  Nemo  '), 'Nemo');
  assert.equal(peixe.nome, 'Nemo');
  assert.equal(aq.renomear(peixe, ''), config.nome.padrao);
  assert.equal(aq.renomear(peixe, 'Muito muito comprido'), 'Muito muito');
});

test('o nome com acento e o nome renomeado sobrevivem ao salvar e carregar', () => {
  const { aq } = montar(1);
  aq.renomear(aq.peixes[0], 'Zé Çãõ');
  const { aquario } = importarJogo(JSON.parse(JSON.stringify(
    exportarJogo(aq, { tempoJogoMs: 0, salvoEmMs: 1 }),
  )), { config });
  assert.equal(aquario.peixes[0].nome, 'Zé Çãõ');
});

test('os textos da adoção existem, têm nome para toda cor e só usam letras da fonte', () => {
  for (const cor of config.cores) {
    assert.ok(textos.adocao.cores[cor], `falta o nome da cor ${cor}`);
    assert.deepEqual(caracteresSemGlifo(textos.adocao.cores[cor]), [], cor);
  }
  for (const k of ['titulo', 'escolher', 'dica']) {
    assert.deepEqual(caracteresSemGlifo(textos.adocao[k]), [], k);
    assert.ok(textos.adocao[k].length <= 26, k);
  }
  assert.deepEqual(caracteresSemGlifo('<>'), []);
  assert.ok(textos.gameOver.dica.length <= 26);
});

// --- Menu -------------------------------------------------------------------------------------

test('adoção: esquerda e direita trocam a cor (dando a volta), A adota a cor escolhida', () => {
  const { menu, adocoes } = novoMenu();
  const t = montar();
  menu.abrirAdocao();
  assert.equal(menu.tela, TELAS.ADOCAO);
  assert.equal(menu.corEscolhida, config.cores[0]);
  menu.apertar(aperto('direita'), t.aq);
  assert.equal(menu.corEscolhida, config.cores[1]);
  menu.apertar(aperto('esquerda'), t.aq);
  menu.apertar(aperto('esquerda'), t.aq);
  assert.equal(menu.corEscolhida, config.cores[config.cores.length - 1], 'dá a volta para o fim');
  menu.apertar(aperto('direita'), t.aq);
  assert.equal(menu.corEscolhida, config.cores[0], 'e para o começo');
  menu.apertar(aperto('direita'), t.aq);
  menu.apertar(aperto('direita'), t.aq);
  menu.apertar(aperto('a'), t.aq);
  assert.deepEqual(adocoes, [{ cor: config.cores[2] }]);
});

test('adoção: B, C, cima e baixo não fazem nada, e a câmera fica parada', () => {
  const { menu, adocoes } = novoMenu();
  const t = montar();
  menu.abrirAdocao();
  menu.apertar(aperto('b', 'c', 'cima', 'baixo'), t.aq);
  assert.equal(menu.tela, TELAS.ADOCAO);
  assert.equal(adocoes.length, 0);
  assert.equal(menu.cameraLivre(), false);
});

test('adoção: a tela fica aberta mesmo com Game Over e muito tempo passando', () => {
  const { menu } = novoMenu();
  const t = montar();
  t.aq.matar(t.aq.peixes[0]);
  menu.abrirAdocao();
  menu.atualizar(60, t.aq);
  assert.equal(menu.tela, TELAS.ADOCAO, 'não volta sozinha para o Game Over');
});

test('Game Over -> A -> adoção -> A -> adota; e reiniciar fecha a tela', () => {
  const { menu, adocoes } = novoMenu();
  const t = montar();
  t.aq.matar(t.aq.peixes[0]);
  menu.atualizar(6, t.aq);
  assert.equal(menu.tela, TELAS.GAME_OVER);
  menu.apertar(aperto('a'), t.aq);
  assert.equal(menu.tela, TELAS.ADOCAO);
  menu.apertar(aperto('a'), t.aq);
  assert.equal(adocoes.length, 1);
  menu.reiniciar();
  assert.equal(menu.tela, TELAS.JOGO);
});

test('abrir a adoção de novo volta a escolher a primeira cor', () => {
  const { menu } = novoMenu();
  const t = montar();
  menu.abrirAdocao();
  menu.apertar(aperto('direita'), t.aq);
  menu.abrirAdocao();
  assert.equal(menu.corEscolhida, config.cores[0]);
});

// --- Tela -------------------------------------------------------------------------------------

test('tela de adoção: cobre a tela, mostra o peixe na cor escolhida e as duas setas', () => {
  const t = montar();
  for (let i = 0; i < config.cores.length; i++) {
    const { menu } = novoMenu();
    menu.abrirAdocao();
    for (let k = 0; k < i; k++) menu.apertar(aperto('direita'), t.aq);
    const q = criarQuadro();
    desenharAdocao(q, { menu, textos, agoraMs: 0 });
    assert.equal(q.reduce((n, c) => n + (c === 0 ? 1 : 0), 0), 0, 'cobre a tela inteira');
    const corpo = COR.PEIXE[config.cores[i]].vivo.corpo;
    assert.ok(q.includes(corpo), `${config.cores[i]}: o corpo do peixe não apareceu`);
    // As cores das outras não aparecem.
    for (const outra of config.cores.filter((c) => c !== config.cores[i])) {
      assert.ok(!q.includes(COR.PEIXE[outra].vivo.corpo), `${outra} apareceu na tela de ${config.cores[i]}`);
    }
  }
});

test('tela de adoção: a cauda bate com o tempo', () => {
  const { menu } = novoMenu();
  menu.abrirAdocao();
  const a = criarQuadro();
  const b = criarQuadro();
  desenharAdocao(a, { menu, textos, agoraMs: 0 });
  desenharAdocao(b, { menu, textos, agoraMs: 250 });
  assert.notDeepEqual(Array.from(a), Array.from(b));
});

test('tela de adoção: peixe e textos cabem dentro das bordas, e o nome da cor fica centralizado', () => {
  for (const cor of config.cores) {
    const { menu } = novoMenu();
    menu.abrirAdocao();
    while (menu.corEscolhida !== cor) menu.apertar(aperto('direita'), montar().aq);
    const q = criarQuadro();
    desenharAdocao(q, { menu, textos });
    for (let y = 2; y < ALTURA - 2; y++) {
      for (const x of [1, 2, LARGURA - 3, LARGURA - 2]) {
        // Só as setas (x 8 e LARGURA-12) ficam perto das bordas; na faixa de 2 pixels é sempre fundo.
        assert.equal(q[y * LARGURA + x], 13, `${cor}: pixel (${x}, ${y})`);
      }
    }
    const nome = textos.adocao.cores[cor];
    assert.ok(larguraDoTexto(nome) < LARGURA - 20);
    assert.equal(quebrarTexto(textos.adocao.escolher, 26).length, 1);
  }
});

test('desenharTelas mostra a adoção quando ela está aberta', () => {
  const t = montar();
  const { menu } = novoMenu();
  menu.abrirAdocao();
  const q = criarQuadro();
  desenharTelas(q, { menu, aquario: t.aq, config, textos, agoraMs: 0 });
  assert.equal(q.reduce((n, c) => n + (c === 0 ? 1 : 0), 0), 0);
  assert.ok(q.includes(COR.PEIXE[config.cores[0]].vivo.corpo));
});

test('adotar cria um aquário novo: filhote da cor escolhida, sexo sorteado, vivo e sem sujeira', () => {
  const aq = criarAquario({ config, semente: 7 });
  const p = aq.adicionarPeixe({ nome: config.nome.padrao, cor: 'azul' }, 0);
  assert.equal(p.cor, 'azul');
  assert.equal(p.fase, 'filhote');
  assert.equal(p.estado, 'saudavel');
  assert.ok(['macho', 'femea'].includes(p.sexo));
  assert.equal(aq.sujeira, 0);
  assert.equal(aq.gameOver, false);
});
