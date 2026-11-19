import { test } from 'node:test';
import assert from 'node:assert/strict';
import { acesoNoDither, quadroParaMono, TOM_MAXIMO } from '../src/render/mono.js';
import { TONS, PALETA, COLORIDOS, COR } from '../src/render/palette.js';
import { desenharSprite, COR_DO_CONTORNO } from '../src/render/sprites.js';
import { criarQuadro, mostrarQuadro, LARGURA, ALTURA } from '../src/render/tela.js';

// Quantos dos 16 pixels de um bloco 4×4 ficam acesos para um tom.
const acesosNoBloco = (tom) => {
  let n = 0;
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) if (acesoNoDither(tom, x, y)) n++;
  return n;
};

test('dither: tom 0 é tudo preto e tom 16 é tudo branco', () => {
  assert.equal(acesosNoBloco(0), 0);
  assert.equal(acesosNoBloco(TOM_MAXIMO), 16);
});

test('dither: o tom é a quantidade de pontos acesos no bloco 4×4', () => {
  for (let tom = 0; tom <= TOM_MAXIMO; tom++) assert.equal(acesosNoBloco(tom), tom, `tom ${tom}`);
});

test('dither: um tom mais claro só acende pontos a mais (nunca apaga um aceso)', () => {
  for (let tom = 1; tom <= TOM_MAXIMO; tom++) {
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      if (acesoNoDither(tom - 1, x, y)) assert.ok(acesoNoDither(tom, x, y), `tom ${tom} em (${x}, ${y})`);
    }
  }
});

test('dither: o padrão se repete a cada 4 pixels e fica preso à tela', () => {
  for (const tom of [3, 8, 13]) {
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      assert.equal(acesoNoDither(tom, x, y), acesoNoDither(tom, x + 4, y + 4));
    }
  }
});

test('quadroParaMono: só gera 0 e 1 e respeita a tabela de tons', () => {
  const largura = 8;
  const quadro = new Uint8Array(largura * 8);
  quadro.fill(12);              // branco
  quadro[3] = 13;               // contorno (preto)
  const mono = quadroParaMono(quadro, largura, TONS);
  assert.equal(mono.length, quadro.length);
  assert.ok(mono.every((v) => v === 0 || v === 1));
  assert.equal(mono[0], 1, 'branco fica aceso');
  assert.equal(mono[3], 0, 'preto fica apagado');
});

test('quadroParaMono: o mesmo quadro dá sempre o mesmo resultado', () => {
  const quadro = new Uint8Array(LARGURA * ALTURA).map((_, i) => i % 16);
  assert.deepEqual(quadroParaMono(quadro, LARGURA, TONS), quadroParaMono(quadro, LARGURA, TONS));
});

test('tons: 16 entradas de 0 a 16; texto e destaques são branco sólido, o contorno é preto', () => {
  assert.equal(TONS.length, PALETA.length);
  assert.ok(TONS.every((t) => Number.isInteger(t) && t >= 0 && t <= TOM_MAXIMO));
  // Letras de 1 pixel de largura quebram com tom médio: tudo que é texto precisa ser sólido.
  for (const cor of [10, 11, 12, 15]) assert.equal(TONS[cor], TOM_MAXIMO, `índice ${cor}`);
  assert.equal(TONS[COR_DO_CONTORNO], 0);
});

test('tons: a água é preto sólido; texto e HUD seguem branco sólido; areia e peixe são cores sólidas', () => {
  assert.equal(TONS[1], 0, 'água e ar');
  for (const i of [COR.AREIA, COR.AREIA_ESCURA, ...COR.GRAOS, ...Object.values(COR.BETA)]) {
    assert.ok(COLORIDOS.includes(i), `índice ${i} devia ser colorido`);
  }
  assert.ok(!COLORIDOS.includes(12) && !COLORIDOS.includes(10) && !COLORIDOS.includes(11), 'o HUD e o texto continuam brancos');
});

test('paleta: uma cor e um tom por índice, e os desenhos guardados (hex) só usam 0 a 15 ou as letras extras', () => {
  assert.equal(PALETA.length, 60 + 5 * 3 + 5 * 24,
    '60 fixas (com o turvo, a água suja, o bolor, a comida, o cocô, o ovo, o coração e o clima) + 5 papéis a mais nos 3 estados do vermelho + 8 papéis × 3 estados em cada uma das 5 cores novas');
  assert.equal(TONS.length, PALETA.length);
  assert.ok(COLORIDOS.every((i) => i >= 0 && i < PALETA.length));
  assert.equal(new Set(COLORIDOS).size, COLORIDOS.length, 'sem índice repetido');
});

test('mostrarQuadro: preto e branco com dithering, e cor sólida nos índices COLORIDOS', () => {
  const quadro = criarQuadro();
  quadro.forEach((_, i) => { quadro[i] = i % PALETA.length; }); // todas as cores da paleta
  let enviado;
  const ctx = {
    createImageData: (l, a) => ({ data: new Uint8ClampedArray(l * a * 4) }),
    putImageData: (imagem) => { enviado = imagem.data; },
  };
  mostrarQuadro(ctx, quadro);
  assert.equal(enviado.length, LARGURA * ALTURA * 4);
  const coloridos = new Set();
  for (let i = 0; i < enviado.length; i += 4) {
    const cor = Array.from(enviado.slice(i, i + 3));
    const indice = quadro[i / 4];
    assert.equal(enviado[i + 3], 255);
    if (COLORIDOS.includes(indice)) {
      assert.deepEqual(cor, PALETA[indice], `pixel ${i / 4}: índice ${indice} deve ser sólido, na cor da paleta`);
      coloridos.add(indice);
    } else {
      const preto = cor.every((v) => v === 0);
      const branco = cor.every((v) => v === 255);
      assert.ok(preto || branco, `pixel ${i / 4}: índice ${indice} deve ser preto ou branco, veio ${cor}`);
    }
  }
  assert.equal(coloridos.size, COLORIDOS.length, 'todas as cores sólidas aparecem');
});

test('cores sólidas: o verde das algas é #10AB8C e os verdes das plantas são variações pequenas dele', () => {
  assert.deepEqual(PALETA[COR.VERDE_ALGA], [0x10, 0xab, 0x8c]);
  for (const i of COR.VERDES_PLANTA) {
    const [r, g, b] = PALETA[i];
    const [r0, g0, b0] = PALETA[COR.VERDE_ALGA];
    assert.ok(g > r && g > b, `índice ${i} não é verde`);
    assert.ok(Math.abs(r - r0) <= 20 && Math.abs(g - g0) <= 20 && Math.abs(b - b0) <= 20, `índice ${i} está longe do verde das algas`);
    assert.notDeepEqual(PALETA[i], PALETA[COR.VERDE_ALGA], 'tem de ser uma variação, não o mesmo');
  }
  assert.equal(new Set(COR.VERDES_PLANTA.map((i) => PALETA[i].join())).size, 3, 'três variações diferentes');
});

test('o peixe é vermelho: três tons por estado, o saudável é o mais vivo e o doente o mais pálido', () => {
  const [vivo, apagado, palido] = [COR.BETA, COR.BETA_IDOSO, COR.BETA_DOENTE];
  for (const estado of [vivo, apagado, palido]) {
    for (const i of Object.values(estado)) {
      const [r, g, b] = PALETA[i];
      assert.ok(r > g && r > b, `índice ${i} não é vermelho`);
    }
  }
  const saturacao = (i) => { const [r, g, b] = PALETA[i]; return (r - Math.min(g, b)) / r; };
  assert.ok(saturacao(vivo.corpo) > saturacao(apagado.corpo) && saturacao(apagado.corpo) > saturacao(palido.corpo), 'vivo > apagado > pálido');
  assert.ok(PALETA[vivo.nadadeira][1] > PALETA[vivo.corpo][1], 'a nadadeira é mais clara que o corpo');
});

test('a areia é cor de areia (quente) e os grãos têm tons diferentes', () => {
  const [r, g, b] = PALETA[COR.AREIA];
  assert.ok(r > g && g > b && r > 0xc8, 'areia clara, quente');
  const tons = [COR.AREIA, COR.AREIA_ESCURA, ...COR.GRAOS].map((i) => PALETA[i].join());
  assert.equal(new Set(tons).size, tons.length, 'todos diferentes');
  assert.ok(PALETA[COR.GRAOS[0]][0] > PALETA[COR.AREIA][0], 'tem grão mais claro que a areia');
  assert.ok(PALETA[COR.AREIA_ESCURA][0] < PALETA[COR.AREIA][0], 'e mais escuro');
});

test('cores sólidas: a água do filtro e a superfície são azul claro, e as pedras são cinza', () => {
  const [r, g, b] = PALETA[COR.AZUL_AGUA];
  assert.ok(b > g && g > r && r > 0x60, 'azul claro');
  for (const i of [COR.PEDRA, COR.PEDRA_SOMBRA, COR.PEDRA_FUNDO, COR.PEDRA_FUNDO_BORDA]) {
    const [pr, pg, pb] = PALETA[i];
    assert.ok(Math.max(pr, pg, pb) - Math.min(pr, pg, pb) <= 16, `índice ${i} não é cinza`);
  }
  // Mais longe = mais escuro.
  assert.ok(PALETA[COR.PEDRA_FUNDO][0] < PALETA[COR.PEDRA][0], 'pedras do fundo mais escuras que as da frente');
  assert.ok(PALETA[COR.VERDE_FUNDO][1] < PALETA[COR.VERDES_PLANTA[0]][1], 'verde do fundo mais escuro que o da frente');
});

// --- Contorno do sprite -------------------------------------------------------------------

const SPRITE_UM_PIXEL = { largura: 1, altura: 1, quadros: [Uint8Array.of(12)] };

test('contorno: um sprite de 1 pixel ganha um halo preto de 3×3 em volta', () => {
  const q = criarQuadro();
  q.fill(5);
  desenharSprite(q, SPRITE_UM_PIXEL, 0, 10, 10, false, false, true);
  assert.equal(q[10 * LARGURA + 10], 12, 'o pixel do sprite fica por cima');
  for (const [x, y] of [[9, 9], [10, 9], [11, 9], [9, 10], [11, 10], [9, 11], [10, 11], [11, 11]]) {
    assert.equal(q[y * LARGURA + x], COR_DO_CONTORNO, `halo em (${x}, ${y})`);
  }
  assert.equal(q[8 * LARGURA + 10], 5, 'o que está a 2 pixels não muda');
});

test('contorno: desligado por padrão (o desenho antigo não muda)', () => {
  const q = criarQuadro();
  q.fill(5);
  desenharSprite(q, SPRITE_UM_PIXEL, 0, 10, 10);
  assert.equal(q[10 * LARGURA + 11], 5);
});

test('contorno: não pinta onde o sprite é transparente nem fora da tela', () => {
  const q = criarQuadro();
  const sprite = { largura: 2, altura: 1, quadros: [Uint8Array.of(0, 12)] };
  desenharSprite(q, sprite, 0, 0, 0, false, false, true);
  // O pixel transparente (0,0) não gera halo, mas é vizinho do opaco (1,0): fica preto.
  assert.equal(q[0], COR_DO_CONTORNO);
  // Colado no canto: não deve dar erro nem escrever fora do quadro.
  desenharSprite(q, SPRITE_UM_PIXEL, 0, -1, -1, false, false, true);
  desenharSprite(q, SPRITE_UM_PIXEL, 0, LARGURA, ALTURA, false, false, true);
  assert.equal(q.length, LARGURA * ALTURA);
});
