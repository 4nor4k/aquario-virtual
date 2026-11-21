import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lerAnalogico, criarControlesToque, ligarToque, ZONA_MORTA } from '../src/input/toque.js';
import { criarTeclado } from '../src/input/keyboard.js';
import { combinarEntradas } from '../src/input/combinar.js';

const perto = (a, b, folga = 1e-9) => assert.ok(Math.abs(a - b) <= folga, `${a} deveria ser ~${b}`);

// ---------- lerAnalogico ----------

test('analógico: no centro e dentro da zona morta dá (0, 0)', () => {
  assert.deepEqual(lerAnalogico(0, 0, 50), { x: 0, y: 0 });
  assert.deepEqual(lerAnalogico(50 * ZONA_MORTA, 0, 50), { x: 0, y: 0 });
  assert.deepEqual(lerAnalogico(3, -3, 50), { x: 0, y: 0 });
});

test('analógico: sem -0 (o teste de igualdade estrita distingue -0 de 0)', () => {
  const v = lerAnalogico(-30, 0, 50);
  assert.ok(Object.is(v.y, 0), 'y deve ser 0 e não -0');
});

test('analógico: na borda dá força 1 e a direção certa; além da borda continua 1', () => {
  assert.deepEqual(lerAnalogico(50, 0, 50), { x: 1, y: 0 });
  assert.deepEqual(lerAnalogico(0, -50, 50), { x: 0, y: -1 });
  assert.deepEqual(lerAnalogico(500, 0, 50), { x: 1, y: 0 });
  const d = lerAnalogico(100, 100, 50);
  perto(Math.hypot(d.x, d.y), 1);
  perto(d.x, d.y);
});

test('analógico: é contínuo (empurrar mais dá mais força, e qualquer ângulo vale)', () => {
  const fraco = Math.hypot(...Object.values(lerAnalogico(20, 0, 50)));
  const medio = Math.hypot(...Object.values(lerAnalogico(30, 0, 50)));
  assert.ok(fraco > 0 && fraco < medio && medio < 1);
  const diag = lerAnalogico(25, 10, 50); // um ângulo que o teclado não consegue
  assert.ok(diag.x > 0 && diag.y > 0 && diag.x > diag.y);
});

test('analógico: raio inválido não quebra', () => {
  assert.deepEqual(lerAnalogico(10, 10, 0), { x: 0, y: 0 });
  assert.deepEqual(lerAnalogico(10, 10, NaN), { x: 0, y: 0 });
});

// ---------- controles (a lógica) ----------

test('controles: sem toque, direção (0, 0) e nada apertado', () => {
  const c = criarControlesToque();
  assert.deepEqual(c.direcao(), { x: 0, y: 0 });
  assert.equal(c.segurando('a'), false);
  assert.deepEqual(Object.values(c.botoes()), [false, false, false, false, false, false, false]);
});

test('controles: a direção segurada continua valendo a cada leitura até soltar', () => {
  const c = criarControlesToque();
  c.definirAnalogico(0.8, 0.2);
  assert.deepEqual(c.direcao(), { x: 0.8, y: 0.2 });
  assert.deepEqual(c.direcao(), { x: 0.8, y: 0.2 });
  c.soltarAnalogico();
  assert.deepEqual(c.direcao(), { x: 0, y: 0 });
});

test('controles: botão apertado conta uma vez; segurar não repete', () => {
  const c = criarControlesToque();
  c.apertarBotao('a');
  assert.equal(c.botoes().a, true);
  assert.equal(c.botoes().a, false, 'a segunda leitura não repete o aperto');
  assert.equal(c.segurando('a'), true, 'mas continua segurando');
  c.soltarBotao('a');
  assert.equal(c.segurando('a'), false);
});

test('controles: toque rápido (apertar e soltar antes da leitura) ainda conta uma vez', () => {
  const c = criarControlesToque();
  c.apertarBotao('c');
  c.soltarBotao('c');
  assert.equal(c.botoes().c, true);
  assert.equal(c.segurando('c'), false);
});

test('controles: B segurado e analógico ao mesmo tempo (a caçada)', () => {
  const c = criarControlesToque();
  c.apertarBotao('b');
  c.definirAnalogico(-1, 0);
  assert.equal(c.segurando('b'), true);
  assert.deepEqual(c.direcao(), { x: -1, y: 0 });
});

test('controles: empurrar o analógico "aperta" a seta uma vez só (menu)', () => {
  const c = criarControlesToque();
  c.definirAnalogico(0, 0.9);
  assert.equal(c.botoes().baixo, true);
  c.definirAnalogico(0, 0.95); // continua segurando
  assert.equal(c.botoes().baixo, false);
  c.definirAnalogico(0, 0.5);  // ainda acima do limite de soltar
  assert.equal(c.botoes().baixo, false);
  c.definirAnalogico(0, 0);    // voltou ao centro
  c.definirAnalogico(0, 0.9);
  assert.equal(c.botoes().baixo, true, 'depois de voltar ao centro, aperta de novo');
});

test('controles: tremer perto do limite não aperta várias vezes', () => {
  const c = criarControlesToque();
  c.definirAnalogico(0.65, 0);
  assert.equal(c.botoes().direita, true);
  for (const x of [0.55, 0.62, 0.5, 0.7, 0.45]) c.definirAnalogico(x, 0);
  assert.equal(c.botoes().direita, false);
});

test('controles: no menu só a seta do eixo mais forte aperta (diagonal não aperta duas)', () => {
  const c = criarControlesToque();
  c.definirAnalogico(0.9, 0.7);
  const l = c.botoes();
  assert.equal(l.direita, true);
  assert.equal(l.baixo, false);
});

test('controles: mudar de seta sem voltar ao centro aperta a nova', () => {
  const c = criarControlesToque();
  c.definirAnalogico(0.9, 0);
  c.botoes();
  c.definirAnalogico(-0.9, 0);
  assert.equal(c.botoes().esquerda, true);
});

test('controles: soltarTudo zera analógico, botões e apertos pendentes', () => {
  const c = criarControlesToque();
  c.apertarBotao('b');
  c.definirAnalogico(1, 0);
  c.soltarTudo();
  assert.equal(c.segurando('b'), false);
  assert.deepEqual(c.direcao(), { x: 0, y: 0 });
  assert.deepEqual(Object.values(c.botoes()), [false, false, false, false, false, false, false]);
});

// ---------- ligação com a página (elementos falsos) ----------

function elementoFalso(caixa = { left: 0, top: 0, width: 100, height: 100 }) {
  const el = new EventTarget();
  el.getBoundingClientRect = () => caixa;
  el.capturados = [];
  el.setPointerCapture = (id) => el.capturados.push(id);
  el.ponteiro = (tipo, id, x = 0, y = 0) => {
    const e = new Event(tipo, { cancelable: true });
    Object.assign(e, { pointerId: id, clientX: x, clientY: y });
    el.dispatchEvent(e);
    return e;
  };
  return el;
}

function montar() {
  const base = elementoFalso({ left: 0, top: 0, width: 100, height: 100 }); // centro (50, 50), raio 50
  const a = elementoFalso();
  const b = elementoFalso();
  const c = elementoFalso();
  const controles = criarControlesToque();
  const bolinha = [];
  const janela = new EventTarget();
  ligarToque({ base, botoes: { a, b, c } }, controles, { aoAnalogico: (p) => bolinha.push(p), janela });
  return { base, a, b, c, controles, bolinha, janela };
}

test('página: arrastar o dedo no disco move o analógico e soltar volta ao centro', () => {
  const { base, controles, bolinha } = montar();
  const descer = base.ponteiro('pointerdown', 1, 100, 50); // na borda da direita
  assert.equal(descer.defaultPrevented, true, 'não deixa a página rolar nem selecionar');
  assert.deepEqual(base.capturados, [1], 'o disco segura o dedo mesmo se ele sair de cima');
  assert.deepEqual(controles.direcao(), { x: 1, y: 0 });
  base.ponteiro('pointermove', 1, 50, 0); // para cima
  assert.deepEqual(controles.direcao(), { x: 0, y: -1 });
  base.ponteiro('pointerup', 1);
  assert.deepEqual(controles.direcao(), { x: 0, y: 0 });
  assert.deepEqual(bolinha.at(-1), { x: 0, y: 0 }, 'a bolinha volta ao centro');
});

test('página: a bolinha fica presa ao círculo mesmo com o dedo longe', () => {
  const { base, bolinha } = montar();
  base.ponteiro('pointerdown', 1, 500, 50);
  perto(bolinha.at(-1).x, 1);
  perto(bolinha.at(-1).y, 0);
});

test('página: outro dedo no disco é ignorado, e mover de outro dedo não mexe', () => {
  const { base, controles } = montar();
  base.ponteiro('pointerdown', 1, 100, 50);
  base.ponteiro('pointerdown', 2, 0, 50);
  base.ponteiro('pointermove', 2, 0, 50);
  assert.deepEqual(controles.direcao(), { x: 1, y: 0 });
  base.ponteiro('pointerup', 2); // o dedo 2 nunca foi o do analógico
  assert.deepEqual(controles.direcao(), { x: 1, y: 0 });
});

test('página: multitoque, B segurado enquanto o analógico mexe', () => {
  const { base, b, controles } = montar();
  b.ponteiro('pointerdown', 7);
  base.ponteiro('pointerdown', 8, 0, 50);
  assert.equal(controles.segurando('b'), true);
  assert.deepEqual(controles.direcao(), { x: -1, y: 0 });
  base.ponteiro('pointerup', 8);
  assert.equal(controles.segurando('b'), true, 'soltar o analógico não solta o B');
  b.ponteiro('pointerup', 7);
  assert.equal(controles.segurando('b'), false);
});

test('página: dois botões ao mesmo tempo (A e B)', () => {
  const { a, b, controles } = montar();
  a.ponteiro('pointerdown', 1);
  b.ponteiro('pointerdown', 2);
  assert.equal(controles.segurando('a'), true);
  assert.equal(controles.segurando('b'), true);
  a.ponteiro('pointercancel', 1); // o sistema tomou o dedo (ex.: gesto do celular)
  assert.equal(controles.segurando('a'), false);
  assert.equal(controles.segurando('b'), true);
});

test('página: botão ignora o segundo dedo e o dedo errado ao soltar', () => {
  const { a, controles } = montar();
  a.ponteiro('pointerdown', 1);
  a.ponteiro('pointerdown', 2);
  a.ponteiro('pointerup', 2);
  assert.equal(controles.segurando('a'), true);
  a.ponteiro('pointerup', 1);
  assert.equal(controles.segurando('a'), false);
});

test('página: perder o foco solta tudo', () => {
  const { base, a, controles, janela, bolinha } = montar();
  a.ponteiro('pointerdown', 1);
  base.ponteiro('pointerdown', 2, 100, 50);
  janela.dispatchEvent(new Event('blur'));
  assert.equal(controles.segurando('a'), false);
  assert.deepEqual(controles.direcao(), { x: 0, y: 0 });
  assert.deepEqual(bolinha.at(-1), { x: 0, y: 0 });
  // e o disco volta a aceitar um dedo novo
  base.ponteiro('pointerdown', 3, 0, 50);
  assert.deepEqual(controles.direcao(), { x: -1, y: 0 });
});

// ---------- combinar teclado + toque ----------

function novoAlvo() {
  const alvo = new EventTarget();
  alvo.apertar = (code) => {
    const e = new Event('keydown', { cancelable: true });
    e.code = code;
    alvo.dispatchEvent(e);
  };
  alvo.soltar = (code) => {
    const e = new Event('keyup');
    e.code = code;
    alvo.dispatchEvent(e);
  };
  return alvo;
}

test('combinar: teclado e toque valem juntos', () => {
  const alvo = novoAlvo();
  const teclado = criarTeclado(alvo);
  const toque = criarControlesToque();
  const entrada = combinarEntradas(teclado, toque);

  assert.deepEqual(entrada.direcao(), { x: 0, y: 0 });
  alvo.apertar('ArrowLeft');
  assert.deepEqual(entrada.direcao(), { x: -1, y: 0 });
  alvo.soltar('ArrowLeft');
  toque.definirAnalogico(0.4, 0.3);
  assert.deepEqual(entrada.direcao(), { x: 0.4, y: 0.3 });

  alvo.apertar('KeyZ');
  toque.apertarBotao('b');
  const l = entrada.botoes();
  assert.equal(l.a, true);
  assert.equal(l.b, true);
  assert.equal(l.c, false);
  assert.equal(entrada.segurando('b'), true);
  assert.equal(entrada.segurando('a'), true, 'Z ainda está apertado');
  alvo.soltar('KeyZ');
  assert.equal(entrada.segurando('a'), false);
});

test('combinar: lê todas as fontes a cada vez (não deixa aperto velho no teclado)', () => {
  const alvo = novoAlvo();
  const teclado = criarTeclado(alvo);
  const toque = criarControlesToque();
  const entrada = combinarEntradas(teclado, toque);
  alvo.apertar('KeyX');
  toque.apertarBotao('a');
  assert.equal(entrada.botoes().b, true);
  // se o teclado não tivesse sido lido, o B de cima ainda estaria guardado:
  assert.equal(entrada.botoes().b, false);
  assert.equal(entrada.botoes().a, false);
});

test('combinar: sem fontes não quebra', () => {
  const entrada = combinarEntradas();
  assert.deepEqual(entrada.direcao(), { x: 0, y: 0 });
  assert.equal(entrada.segurando('a'), false);
  assert.equal(entrada.botoes().a, false);
});
