// A luz do dia e da noite, o céu e o spot da noite (render/luz.js, ceu.js, spot.js; doc 11 passo 2).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  luzDaHora, luzDoClima, restaurarPaleta, aplicarLuz, INDICES_DA_LUZ, TOM_DIA, TOM_AURORA, TOM_NOITE,
  ESCURECER_COM_CHUVA,
} from '../src/render/luz.js';
import { desenharCeu, ESTRELAS, QUANTAS_ESTRELAS, gerarEstrelas } from '../src/render/ceu.js';
import { LAMPADA_DE_DIA } from '../src/render/luz.js';
import { desenharSpot, intensidadeDoSpot, SPOT_X, ABERTURA_NO_FUNDO } from '../src/render/spot.js';
import { aplicarCores } from '../src/render/turvacao.js';
import { desenharQuadro } from '../src/render/scene.js';
import { gerarMapa } from '../src/render/cenario.js';
import { gerarFundo } from '../src/render/fundo.js';
import { criarCamera } from '../src/render/camera.js';
import { criarQuadro, LARGURA, ALTURA, COR_SOLIDA } from '../src/render/tela.js';
import { PALETA, COR, COLORIDOS, PAR_CLARO, PAR_MEIO } from '../src/render/palette.js';
import { SUPERFICIE_Y, MUNDO_LARGURA, MUNDO_ALTURA } from '../src/core/mundo.js';
import { config } from './ajuda.js';

const horas = config.clima.horas;
const H = (h) => h * 60;
const camera = (x = 60, y = 0) => criarCamera({
  mundoLargura: MUNDO_LARGURA, mundoAltura: MUNDO_ALTURA, janelaLargura: LARGURA, janelaAltura: ALTURA, x, y,
});
const contar = (q, cor) => q.reduce((n, c) => n + (c === cor ? 1 : 0), 0);
const copiaDaPaleta = () => PALETA.map((c) => [...c]);

// Guarda as cores de antes de cada teste e devolve depois (a paleta é um objeto só, de todos os testes do arquivo).
const ORIGINAL = copiaDaPaleta();
function limpar() {
  PALETA.forEach((c, i) => { c[0] = ORIGINAL[i][0]; c[1] = ORIGINAL[i][1]; c[2] = ORIGINAL[i][2]; });
}

// --- O tom de cada hora ----------------------------------------------------------------------

test('luz: de dia é exatamente o visual de sempre; de noite é escuro e azulado; entre os dois é alaranjado', () => {
  const dia = luzDaHora(H(12), horas);
  assert.deepEqual([dia.r, dia.g, dia.b], TOM_DIA);
  assert.equal(dia.dia, 1);
  const noite = luzDaHora(H(2), horas);
  assert.deepEqual([noite.r, noite.g, noite.b], TOM_NOITE);
  assert.equal(noite.noite, 1);
  assert.ok(noite.b > noite.r, 'azulada');
  const aurora = luzDaHora(H((horas.amanhecer + horas.dia) / 2), horas);
  assert.deepEqual([aurora.r, aurora.g, aurora.b], TOM_AURORA);
  assert.ok(aurora.r > aurora.b, 'alaranjada');
  const ocaso = luzDaHora(H((horas.entardecer + horas.noite) / 2), horas);
  assert.deepEqual([ocaso.r, ocaso.g, ocaso.b], TOM_AURORA);
});

test('luz: os horários do doc (noite até 5h30, dia de 6h30 a 17h30, noite a partir das 18h30)', () => {
  assert.deepEqual(horas, { amanhecer: 5.5, dia: 6.5, entardecer: 17.5, noite: 18.5 });
  assert.equal(luzDaHora(H(5.4), horas).noite, 1);
  assert.equal(luzDaHora(H(6.6), horas).dia, 1);
  assert.equal(luzDaHora(H(17.4), horas).dia, 1);
  assert.equal(luzDaHora(H(18.6), horas).noite, 1);
  assert.equal(luzDaHora(H(0), horas).noite, 1);
  assert.equal(luzDaHora(H(24), horas).noite, 1);
});

test('luz: a hora anda de um tom ao outro sem saltos, durante as 24 h', () => {
  let anterior = luzDaHora(0, horas);
  for (let m = 1; m <= 1440; m++) {
    const l = luzDaHora(m, horas);
    for (const k of ['r', 'g', 'b', 'dia']) assert.ok(Math.abs(l[k] - anterior[k]) < 0.05, `${k} saltou às ${m} min`);
    assert.ok(l.r >= 0.35 && l.r <= 1 && l.g >= 0.45 && l.g <= 1 && l.b >= 0.65 && l.b <= 1);
    anterior = l;
  }
});

test('luz: a mesma hora em dias diferentes (e hora negativa ou passando de 24) dão a mesma luz', () => {
  assert.deepEqual(luzDaHora(H(20), horas), luzDaHora(H(20) + 1440, horas));
  assert.deepEqual(luzDaHora(H(20), horas), luzDaHora(H(20) - 1440, horas));
});

test('luz: a chuva escurece um pouco e o relâmpago clareia; sem chuva nem raio a luz é a da hora', () => {
  const seca = luzDoClima({ horaMin: H(12) }, horas);
  assert.deepEqual([seca.r, seca.g, seca.b], TOM_DIA);
  const chuva = luzDoClima({ horaMin: H(12), chuvaNivel: 1 }, horas);
  assert.ok(chuva.r < 1 && Math.abs(chuva.r - (1 - ESCURECER_COM_CHUVA)) < 1e-9);
  assert.ok(chuva.b > chuva.r, 'a chuva tira mais vermelho do que azul');
  assert.ok(chuva.dia < 1, 'e tira dia (raios de luz somem)');
  const raio = luzDoClima({ horaMin: H(2), chuvaNivel: 1, raio: 1 }, horas);
  const sem = luzDoClima({ horaMin: H(2), chuvaNivel: 1, raio: 0 }, horas);
  assert.ok(raio.r > 2 * sem.r, 'o relâmpago clareia o cenário');
});

// --- A paleta --------------------------------------------------------------------------------

test('paleta: de dia a luz deixa o cenário exatamente igual; de noite escurece tudo; UI e bolhas não mudam', () => {
  limpar();
  const antes = copiaDaPaleta();
  restaurarPaleta();
  aplicarLuz(luzDoClima({ horaMin: H(12) }, horas));
  INDICES_DA_LUZ.forEach((i) => assert.deepEqual(PALETA[i], antes[i], `índice ${i} de dia`));

  restaurarPaleta();
  aplicarLuz(luzDoClima({ horaMin: H(2) }, horas));
  const claro = (c) => c[0] + c[1] + c[2];
  for (const i of INDICES_DA_LUZ) {
    assert.ok(claro(PALETA[i]) <= claro(antes[i]), `índice ${i} escureceu`);
  }
  assert.ok(claro(PALETA[COR.AREIA]) < 0.6 * claro(antes[COR.AREIA]), 'a areia ficou bem mais escura');
  const [r, g, b] = PALETA[COR.AREIA];
  assert.ok(b / (r + 1) > antes[COR.AREIA][2] / antes[COR.AREIA][0], 'e mais azulada');
  // Nunca mudam: os índices 0 a 15 que não são coloridos (texto, HUD, olho, bolhas) e os índices sem tom.
  for (let i = 0; i < 16; i++) {
    if (!COLORIDOS.includes(i)) assert.deepEqual(PALETA[i], antes[i], `índice ${i} (tela e bolhas)`);
  }
  assert.deepEqual(PALETA[12], [255, 255, 255], 'as bolhas e o texto continuam brancos');
  assert.deepEqual(PALETA[COR.GELO], antes[COR.GELO]);
  assert.deepEqual(PALETA[COR.ESTRELA_FRACA], antes[COR.ESTRELA_FRACA]);
  limpar();
});

test('paleta: aplicar a luz duas vezes (com restaurar entre elas) não escurece em dobro', () => {
  limpar();
  const luz = luzDoClima({ horaMin: H(2) }, horas);
  // Um quadro: restaurar, a turvação reescreve a água e a areia, aplicar (a mesma ordem da cena).
  const quadro = () => { restaurarPaleta(); aplicarCores(0); aplicarLuz(luz); };
  quadro();
  const uma = copiaDaPaleta();
  quadro();
  assert.deepEqual(copiaDaPaleta(), uma);
  // E voltando para o dia, tudo volta ao original.
  restaurarPaleta();
  aplicarLuz(luzDoClima({ horaMin: H(12) }, horas));
  assert.deepEqual(PALETA[COR.PEDRA], ORIGINAL[COR.PEDRA]);
  assert.deepEqual(PALETA[COR.VERDE_ALGA], ORIGINAL[COR.VERDE_ALGA]);
  limpar();
});

test('paleta: a água suja e a areia (que a turvação reescreve) também recebem a luz, sem acumular', () => {
  limpar();
  const quadroNoite = () => {
    restaurarPaleta();
    aplicarCores(1);              // água imunda, chão escuro
    aplicarLuz(luzDoClima({ horaMin: H(2) }, horas));
    return [PALETA[COR.AGUA_SUJA].slice(), PALETA[COR.AREIA].slice()];
  };
  const a = quadroNoite();
  const b = quadroNoite();
  assert.deepEqual(a, b, 'quadro após quadro dá o mesmo');
  restaurarPaleta();
  aplicarCores(1);
  const semLuz = PALETA[COR.AGUA_SUJA].slice();
  assert.ok(a[0][0] < semLuz[0], 'a água suja escureceu');
  aplicarCores(0);
  restaurarPaleta();
  limpar();
});

test('paleta: o céu do relâmpago só tem cor no clarão', () => {
  limpar();
  restaurarPaleta();
  aplicarLuz(luzDoClima({ horaMin: H(12) }, horas));
  assert.deepEqual(PALETA[COR.CEU_RELAMPAGO], [0, 0, 0]);
  restaurarPaleta();
  aplicarLuz(luzDoClima({ horaMin: H(2), chuvaNivel: 1, raio: 1 }, horas));
  assert.ok(PALETA[COR.CEU_RELAMPAGO][2] > 150, 'no clarão o céu fica azul-claro');
  limpar();
});

// --- O céu e as estrelas ---------------------------------------------------------------------

const quadroDoCeu = (luz, tempo = 0, cam = camera(60, 0)) => {
  const q = criarQuadro().fill(COR.AGUA); // o ar preto, como a cena o deixa depois da superfície
  desenharCeu(q, cam, luz, tempo);
  return q;
};
const noite = { noite: 1, chuvaNivel: 0, raio: 0 };

test('estrelas: sorteadas uma vez, no ar, e sempre as mesmas', () => {
  assert.equal(ESTRELAS.length, QUANTAS_ESTRELAS);
  assert.deepEqual(gerarEstrelas(), ESTRELAS);
  assert.notDeepEqual(gerarEstrelas(3), ESTRELAS);
  for (const e of ESTRELAS) {
    assert.ok(e.x > 0 && e.x < MUNDO_LARGURA && e.y > 0 && e.y < SUPERFICIE_Y - 3, `estrela em (${e.x}, ${e.y})`);
  }
});

test('estrelas: aparecem de noite, uma a uma conforme escurece, e não de dia nem com chuva', () => {
  const visiveis = (luz) => {
    const q = quadroDoCeu(luz, 0, camera(0, 0));
    return contar(q, COR.ESTRELA_FRACA) + contar(q, 12);
  };
  assert.equal(visiveis({ noite: 0, chuvaNivel: 0, raio: 0 }), 0, 'de dia, nenhuma');
  const pouca = visiveis({ noite: 0.6, chuvaNivel: 0, raio: 0 });
  const toda = visiveis({ noite: 1, chuvaNivel: 0, raio: 0 });
  assert.ok(pouca > 0 && toda > pouca, `${pouca} e ${toda}`);
  assert.equal(visiveis({ noite: 1, chuvaNivel: 1, raio: 0 }), 0, 'com chuva as estrelas somem (nuvens)');
});

test('estrelas: piscam com o tempo, mas no mesmo instante o céu é igual', () => {
  const a = quadroDoCeu(noite, 0, camera(0, 0));
  const b = quadroDoCeu(noite, 1.3, camera(0, 0));
  assert.notDeepEqual(Array.from(a), Array.from(b));
  assert.deepEqual(Array.from(quadroDoCeu(noite, 1.3, camera(0, 0))), Array.from(b));
});

test('estrelas: ficam acima da água e andam com o mundo (não com a tela)', () => {
  const q = quadroDoCeu(noite, 0, camera(0, 0));
  for (let y = SUPERFICIE_Y + 3; y < ALTURA; y++) for (let x = 0; x < LARGURA; x++) assert.equal(q[y * LARGURA + x], COR.AGUA, `(${x}, ${y})`);
  const a = quadroDoCeu(noite, 0, camera(0, 0));
  const b = quadroDoCeu(noite, 0, camera(10, 0));
  for (let y = 0; y < SUPERFICIE_Y; y++) for (let x = 0; x < 100; x++) assert.equal(b[y * LARGURA + x], a[y * LARGURA + x + 10]);
});

test('céu: só pinta o ar preto; o que já foi desenhado ali (filtro, comida) não é coberto', () => {
  const q = criarQuadro().fill(COR.AGUA);
  q[5 * LARGURA + 10] = COR.GRAO;
  desenharCeu(q, camera(0, 0), { noite: 1, chuvaNivel: 0, raio: 1 }, 0);
  assert.equal(q[5 * LARGURA + 10], COR.GRAO);
  const n = criarQuadro().fill(COR.AGUA);
  for (const e of ESTRELAS) n[e.y * LARGURA + e.x - 0] = COR.GRAO; // ocupa o lugar de todas as estrelas
  desenharCeu(n, camera(0, 0), noite, 0);
  assert.equal(contar(n, COR.ESTRELA_FRACA) + contar(n, 12), 0);
});

test('relâmpago: o ar (acima da linha da água) fica na cor do céu, e a água não', () => {
  const q = quadroDoCeu({ noite: 1, chuvaNivel: 1, raio: 1 }, 0, camera(60, 0));
  assert.ok(contar(q, COR.CEU_RELAMPAGO) > LARGURA * (SUPERFICIE_Y - 4), 'o ar inteiro');
  for (let x = 0; x < LARGURA; x++) assert.equal(q[(SUPERFICIE_Y + 4) * LARGURA + x], COR.AGUA, 'a água não muda');
  assert.equal(contar(q, COR.ESTRELA_FRACA), 0, 'sem estrelas no clarão');
  const normal = quadroDoCeu({ noite: 0, chuvaNivel: 1, raio: 0 });
  assert.equal(contar(normal, COR.CEU_RELAMPAGO), 0);
});

// --- O spot da noite (uma lâmpada em cima do aquário: brilho suave, e o que está na luz fica mais claro) ----

const claro = (c) => c[0] + c[1] + c[2];

test('spot: o brilho é mais forte no centro do topo e esmaece para as bordas e para o fundo, sem aresta', () => {
  assert.equal(intensidadeDoSpot(SPOT_X, 0), 1, 'o máximo é no centro do topo');
  for (const wy of [0, 30, 80, 120]) {
    let anterior = 2;
    for (let dx = 0; dx <= ABERTURA_NO_FUNDO + 2; dx++) {
      const v = intensidadeDoSpot(SPOT_X + dx, wy);
      assert.ok(v <= anterior + 1e-12, 'só diminui para os lados');
      assert.equal(v, intensidadeDoSpot(SPOT_X - dx, wy), 'simétrico');
      anterior = v;
    }
    assert.equal(intensidadeDoSpot(SPOT_X + ABERTURA_NO_FUNDO + 1, wy), 0, 'fora do cone não há luz');
  }
  assert.ok(intensidadeDoSpot(SPOT_X, 0) > intensidadeDoSpot(SPOT_X, 60) && intensidadeDoSpot(SPOT_X, 60) > intensidadeDoSpot(SPOT_X, 140), 'esmaece para baixo');
  // Suave: nenhum degrau grande entre pixels vizinhos.
  for (let dx = 0; dx < ABERTURA_NO_FUNDO; dx++) {
    assert.ok(Math.abs(intensidadeDoSpot(SPOT_X + dx, 100) - intensidadeDoSpot(SPOT_X + dx + 1, 100)) < 0.33);
  }
});

test('spot: um cone que sai do topo do aquário e abre para baixo, em vários degraus de azul', () => {
  const q = criarQuadro().fill(COR.AGUA);
  desenharSpot(q, camera(60, 0));
  const colunasEm = (sy) => [...Array(LARGURA).keys()].filter((x) => q[sy * LARGURA + x] !== COR.AGUA);
  const largura = (sy) => colunasEm(sy).length;
  const usados = COR.SPOT.filter((c) => contar(q, c) > 0);
  assert.ok(usados.length >= 5, `${usados.length} degraus em uso`);
  // (com o topo largo a tela já enche; a abertura se confere pela intensidade, sem o corte da tela)
  assert.ok(intensidadeDoSpot(SPOT_X + 105, 0) === 0 && intensidadeDoSpot(SPOT_X + 105, 140) > 0, 'abre para baixo');
  assert.ok(colunasEm(0).length >= 1 && colunasEm(0).length <= 2 * 100, 'a largura do topo respeita a abertura (o topo do aquário)');
  assert.ok(colunasEm(SUPERFICIE_Y - 10).length > 0, 'já existe no ar, acima da água');
  const colunas = colunasEm(SUPERFICIE_Y + 40);
  assert.ok(Math.abs((colunas[0] + colunas.at(-1)) / 2 - (MUNDO_LARGURA / 2 - 60)) <= 1, 'centrado no meio do aquário');
  // O centro é o degrau mais forte e a borda, mais fraco.
  const linha = SUPERFICIE_Y + 20;
  assert.ok(q[linha * LARGURA + (SPOT_X - 60)] > q[linha * LARGURA + colunasEm(linha)[0]], 'centro mais forte que a borda');
  // Anda com o mundo quando a câmera anda.
  const outra = criarQuadro().fill(COR.AGUA);
  desenharSpot(outra, camera(100, 0));
  assert.notDeepEqual(Array.from(q), Array.from(outra));
});

test('spot: no cenário troca só pela cor iluminada (gêmea); peixe, ovo e chuva não mudam; fora do feixe nada muda', () => {
  const q = criarQuadro().fill(COR.AGUA);
  const x0 = SPOT_X - 60; // a coluna do centro do feixe, com a câmera em x=60
  const proprios = [COR.AREIA, COR.PEDRA, COR.VERDE_ALGA, COR.AGUA_SUJA];
  proprios.forEach((c, n) => { for (let dx = 0; dx < 4; dx++) q[60 * LARGURA + x0 - 8 + n * 4 + dx] = c; });
  q[60 * LARGURA + x0 + 10] = COR.PEIXE.vermelho.vivo.corpo;
  q[60 * LARGURA + x0 + 11] = COR.OVO;
  q[60 * LARGURA + x0 + 12] = COR.CHUVA;
  const antes = Array.from(q);
  desenharSpot(q, camera(60, 0));
  for (const c of proprios) {
    const gemea = PAR_CLARO.get(c);
    assert.ok(gemea > 0 && gemea !== c);
    assert.ok(q.includes(gemea), `a cor ${c} virou a gêmea ${gemea}`);
  }
  for (const dx of [10, 11, 12]) assert.equal(q[60 * LARGURA + x0 + dx], antes[60 * LARGURA + x0 + dx]);
  const longe = criarQuadro().fill(COR.PEDRA);
  desenharSpot(longe, camera(0, 0)); // com a câmera em x=0 o feixe passa a 120 px: fora da tela, a cor 0 fica
  assert.equal(contar(longe, COR.PEDRA) + contar(longe, PAR_CLARO.get(COR.PEDRA)) + contar(longe, PAR_MEIO.get(COR.PEDRA)), LARGURA * ALTURA);
  assert.equal(longe[60 * LARGURA + 0], COR.PEDRA);
});

test('spot: a lâmpada fica ligada de dia, mais fraca (35%), e o cenário só ganha claridade extra à noite', () => {
  limpar();
  restaurarPaleta();
  aplicarLuz(luzDoClima({ horaMin: H(12) }, horas));
  for (const c of COR.SPOT) {
    assert.deepEqual(PALETA[c], ORIGINAL[c].map((v) => Math.round(v * LAMPADA_DE_DIA)), 'de dia: 35% do brilho da noite');
  }
  assert.ok(claro(PALETA[COR.SPOT[6]]) > 0);
  for (const [escura, clara] of PAR_CLARO) assert.deepEqual(PALETA[clara], PALETA[escura], 'de dia o cenário na luz é igual ao resto: o aquário inteiro está iluminado');
  restaurarPaleta();
  aplicarLuz(luzDoClima({ horaMin: H(2) }, horas));
  COR.SPOT.forEach((c) => assert.deepEqual(PALETA[c], ORIGINAL[c], 'de noite: a cor cheia'));
  for (let k = 1; k < COR.SPOT.length; k++) assert.ok(claro(PALETA[COR.SPOT[k]]) > claro(PALETA[COR.SPOT[k - 1]]), 'degraus cada vez mais claros');
  for (const [escura, clara] of PAR_CLARO) {
    assert.ok(claro(PALETA[clara]) >= claro(PALETA[escura]), `gêmea ${clara} não é mais escura`);
  }
  assert.ok(claro(PALETA[PAR_CLARO.get(COR.AREIA)]) > 1.5 * claro(PALETA[COR.AREIA]), 'a areia na luz é bem mais clara');
  const noiteDaAreia = PALETA[COR.AREIA].slice();
  restaurarPaleta();
  aplicarCores(0); // como na cena: a turvação reescreve a areia antes da luz
  aplicarLuz(luzDoClima({ horaMin: H(2) }, horas));
  assert.deepEqual(PALETA[COR.AREIA], noiteDaAreia, 'aplicar de novo não acumula');
  restaurarPaleta();
  aplicarLuz(luzDoClima({ horaMin: H(2), raio: 1 }, horas));
  assert.ok(claro(PALETA[COR.SPOT[6]]) < claro(ORIGINAL[COR.SPOT[6]]), 'no relâmpago o brilho fica mais fraco');
  limpar();
});

test('spot: a borda da luz é suave: areia e pedras passam por um degrau intermediário entre escuro e iluminado', () => {
  limpar();
  // Uma linha de areia na altura 100 cortando o feixe de ponta a ponta (câmera no meio).
  const q = criarQuadro().fill(COR.AREIA);
  desenharSpot(q, camera(60, 32));
  const meio = PAR_MEIO.get(COR.AREIA);
  const forte = PAR_CLARO.get(COR.AREIA);
  assert.ok(contar(q, meio) > 20, 'há areia meio iluminada');
  assert.ok(contar(q, forte) > contar(q, meio), 'e mais areia bem iluminada do que meio iluminada');
  // Nenhuma areia meio iluminada encosta direto na escura sem passar... (a ordem de fora para dentro é escura, meio, forte).
  for (let y = 0; y < ALTURA; y++) {
    const linha = Array.from(q.slice(y * LARGURA, (y + 1) * LARGURA));
    const esquerda = linha.slice(0, linha.length / 2);
    for (let x = 1; x < esquerda.length; x++) {
      assert.ok(!(esquerda[x - 1] === COR.AREIA && esquerda[x] === forte), 'sem salto direto da escura para a forte');
    }
  }
  // A cor do meio fica entre a escura e a forte, de noite.
  restaurarPaleta();
  aplicarCores(0);
  aplicarLuz(luzDoClima({ horaMin: H(2) }, horas));
  const [a, m, f] = [COR.AREIA, meio, forte].map((c) => claro(PALETA[c]));
  assert.ok(a < m && m < f, 'escura < meio < forte');
  // De dia as três são iguais.
  restaurarPaleta();
  aplicarCores(0);
  aplicarLuz(luzDoClima({ horaMin: H(12) }, horas));
  assert.deepEqual(PALETA[meio], PALETA[COR.AREIA]);
  limpar();
});

test('cena: de noite o cenário no feixe fica mais claro; de dia só há o brilho fraco e o aquário inteiro está iluminado', () => {
  limpar();
  const noite = cena({ horaMin: H(2), chuvaNivel: 0, raio: 0 });
  assert.ok(COR.SPOT.some((c) => contar(noite, c) > 0));
  assert.ok([...PAR_CLARO.values()].some((c) => contar(noite, c) > 0), 'há cenário iluminado');
  const dia = cena({ horaMin: H(12), chuvaNivel: 0, raio: 0 });
  assert.ok(COR.SPOT.some((c) => contar(dia, c) > 0), 'de dia o brilho fraco da lâmpada existe');
  // Mas o cenário "iluminado" tem a mesma cor do resto (as gêmeas são iguais às originais de dia).
  for (const [escura, clara] of PAR_CLARO) assert.deepEqual(PALETA[clara], PALETA[escura]);
  limpar();
});

test('o peixe tem as mesmas cores de dia e de noite (e na chuva e no relâmpago)', () => {
  limpar();
  const cores = Object.values(COR.PEIXE).flatMap((e) => Object.values(e).flatMap((p) => Object.values(p)));
  assert.ok(cores.length > 100);
  for (const clima of [{ horaMin: H(2) }, { horaMin: H(6) }, { horaMin: H(2), chuvaNivel: 1, raio: 1 }]) {
    restaurarPaleta();
    aplicarLuz(luzDoClima(clima, horas));
    for (const i of cores) assert.deepEqual(PALETA[i], ORIGINAL[i], `cor de peixe ${i}`);
  }
  assert.ok(!INDICES_DA_LUZ.some((i) => cores.includes(i)));
  limpar();
});

// --- Na cena ---------------------------------------------------------------------------------

function cena(clima, cam = camera(60, 32), extra = {}) {
  const q = criarQuadro();
  desenharQuadro(q, { mapa: gerarMapa(), camera: cam, peixes: [], tempo: 1, fundo: gerarFundo(), config, clima, ...extra });
  return q;
}
const rgbDe = (q, x, y) => COR_SOLIDA[q[y * LARGURA + x]] ?? [255, 255, 255];

test('cena: sem clima é o visual de sempre; com o clima de dia é igual', () => {
  limpar();
  const sem = cena(null);
  const dia = cena({ horaMin: H(12), chuvaNivel: 0, raio: 0 });
  // A areia (embaixo) é idêntica nas duas.
  for (let x = 0; x < LARGURA; x++) assert.equal(rgbDe(sem, x, 110).join(), rgbDe(dia, x, 110).join());
  assert.ok(COR.SPOT.some((c) => contar(dia, c) > 0), 'a lâmpada de dia fica ligada, fraca');
  limpar();
});

test('cena: de noite as cores da tela ficam mais escuras, mas as bolhas continuam brancas', () => {
  limpar();
  const dia = cena({ horaMin: H(12), chuvaNivel: 0, raio: 0 }, camera(0, 32));
  const diaAreia = rgbDe(dia, 0, 110).slice(); // longe do feixe do spot (que clareia o que ilumina)
  const noite = cena({ horaMin: H(2), chuvaNivel: 0, raio: 0 }, camera(0, 32));
  const noiteAreia = rgbDe(noite, 0, 110);
  assert.ok(noiteAreia[0] + noiteAreia[1] + noiteAreia[2] < 0.6 * (diaAreia[0] + diaAreia[1] + diaAreia[2]));
  const q = criarQuadro();
  desenharQuadro(q, {
    mapa: gerarMapa(), camera: camera(60, 32), peixes: [], tempo: 1, config, clima: { horaMin: H(2), chuvaNivel: 0, raio: 0 },
    bolhas: [{ x: 90, y: 80, tamanho: 1 }],
  });
  assert.equal(q[(80 - 32) * LARGURA + 90 - 60], 12);
  assert.deepEqual(PALETA[12], [255, 255, 255]);
  limpar();
});

test('cena: dá para ir do dia para a noite e voltar e tudo volta exatamente ao que era', () => {
  limpar();
  const d1 = cena({ horaMin: H(12), chuvaNivel: 0, raio: 0 });
  const antes = copiaDaPaleta();
  cena({ horaMin: H(2), chuvaNivel: 1, raio: 0.5 });
  cena({ horaMin: H(18), chuvaNivel: 0, raio: 0 });
  const d2 = cena({ horaMin: H(12), chuvaNivel: 0, raio: 0 });
  assert.deepEqual(Array.from(d2), Array.from(d1));
  assert.deepEqual(copiaDaPaleta().slice(0, 66), antes.slice(0, 66));
  limpar();
});

// --- Pureza ----------------------------------------------------------------------------------

test('a luz e o céu não usam Math.random nem Date (o sorteio tem semente)', () => {
  for (const arq of ['luz.js', 'ceu.js', 'spot.js']) {
    const fonte = readFileSync(new URL(`../src/render/${arq}`, import.meta.url), 'utf8');
    const semComentarios = fonte.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
    assert.ok(!semComentarios.includes('Math.random'), arq);
    assert.ok(!semComentarios.includes('Date'), arq);
  }
});
