// As cores do beta (doc 09, passo 4): todas têm sprites completos e se distinguem.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CORES_DO_PEIXE, spritesDaCor, spriteDoPeixe, SPRITES } from '../src/render/sprites.js';
import { COR, PALETA, TONS, COLORIDOS, PAPEIS_DO_PEIXE } from '../src/render/palette.js';
import { FASES, criarPeixe } from '../src/core/fish.js';
import { desenharQuadro } from '../src/render/scene.js';
import { criarQuadro } from '../src/render/tela.js';
import { criarCamera } from '../src/render/camera.js';
import { gerarMapa } from '../src/render/cenario.js';
import { MUNDO_LARGURA, MUNDO_ALTURA } from '../src/core/mundo.js';
import { config } from './ajuda.js';


const tonsDe = (p) => [p.corpo, p.nadadeira, p.borda];
const saturacao = (i) => {
  const [r, g, b] = PALETA[i];
  const max = Math.max(r, g, b);
  return (max - Math.min(r, g, b)) / max;
};
const brilho = (i) => { const [r, g, b] = PALETA[i]; return 0.299 * r + 0.587 * g + 0.114 * b; };
const distancia = (a, b) => Math.hypot(...PALETA[a].map((v, i) => v - PALETA[b][i]));

test('as cores do config são as mesmas dos sprites, na mesma ordem', () => {
  assert.deepEqual(CORES_DO_PEIXE, config.cores);
  assert.equal(config.cores[0], 'vermelho', 'o vermelho continua sendo o primeiro');
});

test('toda cor tem todos os tons como cor sólida (fora do dithering)', () => {
  for (const cor of CORES_DO_PEIXE) {
    for (const estado of ['vivo', 'idoso', 'doente']) {
      for (const i of tonsDe(COR.PEIXE[cor][estado])) {
        assert.ok(COLORIDOS.includes(i), `${cor}/${estado}: índice ${i} devia ser colorido`);
        assert.equal(TONS[i], 16);
        assert.ok(i >= 27 && i < PALETA.length);
      }
    }
  }
});

test('cada cor, estado e fase tem sprite do mesmo tamanho do vermelho, com os tons certos', () => {
  const todosOsTons = new Set(CORES_DO_PEIXE.flatMap((c) => Object.values(COR.PEIXE[c]).flatMap(tonsDe)));
  for (const cor of CORES_DO_PEIXE) {
    const s = spritesDaCor(cor);
    for (const fase of FASES) {
      for (const [grupo, tons] of [['normal', fase === 'idoso' ? 'idoso' : 'vivo'], ['doente', 'doente'], ['morto', 'idoso']]) {
        const sprite = s[grupo].beta[fase];
        const ref = SPRITES.beta[fase];
        assert.equal(sprite.largura, ref.largura, `${cor}/${grupo}/${fase}`);
        assert.equal(sprite.altura, ref.altura);
        assert.equal(sprite.quadros.length, 4);
        const usados = new Set(sprite.quadros[0]);
        for (const t of tonsDe(COR.PEIXE[cor][tons])) assert.ok(usados.has(t), `${cor}/${grupo}/${fase}: falta o tom ${t}`);
        // Não sobra tom de OUTRA cor (nem o molde antigo de 4 bits) no desenho.
        const dela = new Set(Object.values(COR.PEIXE[cor]).flatMap(tonsDe));
        for (const u of usados) {
          if (todosOsTons.has(u)) assert.ok(dela.has(u), `${cor}/${grupo}/${fase}: tom ${u} é de outra cor`);
        }
        assert.ok(usados.has(12) && usados.has(13), 'o olho e a pupila continuam');
      }
    }
  }
});

test('em toda cor: vivo mais colorido que idoso, e idoso mais que doente; doente mais claro', () => {
  for (const cor of CORES_DO_PEIXE) {
    const { vivo, idoso, doente } = COR.PEIXE[cor];
    assert.ok(saturacao(vivo.corpo) > saturacao(idoso.corpo), `${cor}: vivo > idoso`);
    assert.ok(saturacao(idoso.corpo) > saturacao(doente.corpo), `${cor}: idoso > doente`);
    assert.ok(brilho(doente.corpo) > brilho(vivo.corpo), `${cor}: o doente é mais claro`);
    assert.ok(brilho(vivo.nadadeira) > brilho(vivo.corpo), `${cor}: a nadadeira é mais clara que o corpo`);
    assert.ok(brilho(vivo.borda) > brilho(vivo.nadadeira), `${cor}: a borda é a mais clara`);
  }
});

test('as cores se distinguem entre si (corpo vivo) e do verde das algas', () => {
  for (let a = 0; a < CORES_DO_PEIXE.length; a++) {
    for (let b = a + 1; b < CORES_DO_PEIXE.length; b++) {
      const d = distancia(COR.PEIXE[CORES_DO_PEIXE[a]].vivo.corpo, COR.PEIXE[CORES_DO_PEIXE[b]].vivo.corpo);
      assert.ok(d > 60, `${CORES_DO_PEIXE[a]} e ${CORES_DO_PEIXE[b]} são parecidas demais (${d.toFixed(0)})`);
    }
  }
});

test('o vermelho continua exatamente como era (tons escolhidos à mão)', () => {
  assert.deepEqual(COR.PEIXE.vermelho, { vivo: COR.BETA, idoso: COR.BETA_IDOSO, doente: COR.BETA_DOENTE });
  // Os 3 tons principais continuam nos mesmos índices; os outros papéis vieram depois.
  assert.deepEqual([COR.BETA.corpo, COR.BETA.nadadeira, COR.BETA.borda], [27, 28, 29]);
  assert.deepEqual([COR.BETA_IDOSO.corpo, COR.BETA_IDOSO.nadadeira, COR.BETA_IDOSO.borda], [30, 31, 32]);
  assert.deepEqual([COR.BETA_DOENTE.corpo, COR.BETA_DOENTE.nadadeira, COR.BETA_DOENTE.borda], [33, 34, 35]);
});

test('toda cor tem os 8 papéis, todos diferentes e coloridos; o contorno é o mais escuro', () => {
  for (const cor of CORES_DO_PEIXE) {
    for (const estado of ['vivo', 'idoso', 'doente']) {
      const p = COR.PEIXE[cor][estado];
      const indices = PAPEIS_DO_PEIXE.map((papel) => p[papel]);
      assert.equal(new Set(indices).size, PAPEIS_DO_PEIXE.length, `${cor}/${estado}: índices repetidos`);
      for (const i of indices) assert.ok(COLORIDOS.includes(i) && TONS[i] === 16, `${cor}/${estado}: ${i} não é colorido`);
    }
    const v = COR.PEIXE[cor].vivo;
    assert.ok(brilho(v.contorno) < brilho(v.sombra) && brilho(v.sombra) < brilho(v.corpo), `${cor}: contorno < sombra < corpo`);
    assert.ok(brilho(v.corpo) < brilho(v.brilho), `${cor}: o brilho do corpo é mais claro que o corpo`);
    assert.ok(brilho(v.nadadeira) < brilho(v.clara) && brilho(v.clara) < brilho(v.borda), `${cor}: nadadeira < clara < borda`);
    assert.ok(distancia(v.destaque, v.nadadeira) > 40, `${cor}: o destaque precisa aparecer sobre a nadadeira`);
  }
});

test('o adulto (e o idoso) usam os 8 papéis da cor; todo sprite usa pelo menos os 3 principais', () => {
  for (const cor of CORES_DO_PEIXE) {
    const s = spritesDaCor(cor);
    const usados = new Set(s.normal.beta.adulto.quadros[0]);
    for (const papel of PAPEIS_DO_PEIXE) assert.ok(usados.has(COR.PEIXE[cor].vivo[papel]), `${cor}: o adulto não usa ${papel}`);
    const idoso = new Set(s.normal.beta.idoso.quadros[0]);
    for (const papel of PAPEIS_DO_PEIXE) assert.ok(idoso.has(COR.PEIXE[cor].idoso[papel]), `${cor}: o idoso não usa ${papel}`);
    for (const fase of FASES) {
      const todos = new Set(s.normal.beta[fase].quadros.flatMap((q) => [...q]));
      assert.ok(![...todos].some((c) => c >= 248), `${cor}/${fase}: sobrou molde sem trocar`);
    }
  }
});

test('spriteDoPeixe escolhe pela cor e pela saúde; cor desconhecida dá erro', () => {
  const azul = criarPeixe({ cor: 'azul', fase: 'adulto', x: 50, y: 50 });
  assert.equal(spriteDoPeixe(azul).sprite, spritesDaCor('azul').normal.beta.adulto);
  azul.estado = 'doente';
  assert.equal(spriteDoPeixe(azul).sprite, spritesDaCor('azul').doente.beta.adulto);
  azul.estado = 'morto';
  assert.deepEqual(spriteDoPeixe(azul), { sprite: spritesDaCor('azul').morto.beta.adulto, inverter: true });
  assert.throws(() => spriteDoPeixe({ ...azul, cor: 'preto' }), RangeError);
  assert.notEqual(spritesDaCor('azul').normal.beta.adulto, spritesDaCor('rosa').normal.beta.adulto);
});

test('na cena, o peixe aparece na cor dele', () => {
  const mapa = gerarMapa();
  const camera = criarCamera({
    mundoLargura: MUNDO_LARGURA, mundoAltura: MUNDO_ALTURA, janelaLargura: 120, janelaAltura: 120, x: 60, y: 32,
  });
  for (const cor of CORES_DO_PEIXE) {
    const peixe = criarPeixe({ cor, fase: 'adulto', x: 120, y: 80 });
    const quadro = criarQuadro();
    desenharQuadro(quadro, { mapa, camera, peixes: [peixe] });
    const corpo = COR.PEIXE[cor].vivo.corpo;
    assert.ok(quadro.includes(corpo), `${cor}: não achei o corpo (${corpo}) na cena`);
  }
});
