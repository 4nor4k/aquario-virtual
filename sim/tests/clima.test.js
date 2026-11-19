// O clima e a hora do dia (core/clima.js, doc 11 passo 1).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { criarClima, nivelDoRaio, MINUTOS_NO_DIA } from '../src/core/clima.js';
import { config } from './ajuda.js';

const cfg = config.clima;

// Roda o clima por `segundos` reais em passos de 0,1 s, com a hora real fixa em horaMin.
function rodar(clima, segundos, horaMin = 12 * 60, passo = 0.1) {
  for (let t = 0; t < segundos; t += passo) clima.atualizar(passo, horaMin);
}

// --- Hora do dia -----------------------------------------------------------------------------

test('hora: segue a hora real que vem de fora (e dá a volta no dia)', () => {
  const c = criarClima({ config });
  c.atualizar(0.1, 7 * 60 + 30);
  assert.equal(c.horaMin, 450);
  assert.equal(c.hora, 7.5);
  c.atualizar(0.1, 1440 + 30);
  assert.equal(c.horaMin, 30, '24h30 vira 0h30');
  c.atualizar(0.1, -60);
  assert.equal(c.horaMin, 1380, 'negativo também dá a volta');
});

test('hora: fixa fica parada, mesmo com o relógio andando', () => {
  const c = criarClima({ config });
  c.definirHora('fixa', 21.5);
  rodar(c, 5, 3 * 60);
  assert.equal(c.hora, 21.5);
  assert.equal(c.modoHora, 'fixa');
  c.definirHora('relogio');
  c.atualizar(0.1, 3 * 60);
  assert.equal(c.hora, 3);
});

test('hora: o ciclo rápido faz um dia inteiro em cicloRapidoSeg e continua da hora de agora', () => {
  const c = criarClima({ config });
  c.definirHora('fixa', 6);
  c.atualizar(0.1, 0);
  c.definirHora('ciclo');
  const comeco = c.horaMin;
  assert.equal(comeco, 360, 'continua da hora em que estava');
  rodar(c, cfg.cicloRapidoSeg / 4);
  assert.ok(Math.abs(c.horaMin - (360 + MINUTOS_NO_DIA / 4)) < 15, `um quarto do ciclo: ${c.horaMin}`);
  rodar(c, (cfg.cicloRapidoSeg * 3) / 4);
  assert.ok(Math.abs(c.horaMin - 360) < 25 || Math.abs(c.horaMin - 360 - MINUTOS_NO_DIA) < 25, `depois de um ciclo, volta: ${c.horaMin}`);
  const vistas = new Set();
  for (let i = 0; i < 600; i++) { c.atualizar(0.1); vistas.add(Math.floor(c.hora)); }
  assert.equal(vistas.size, 24, 'passa por todas as horas do dia');
});

test('hora: modo desconhecido é recusado', () => {
  assert.throws(() => criarClima({ config }).definirHora('lua'), RangeError);
});

// --- Chuva -----------------------------------------------------------------------------------

test('chuva: automática, começa sem chuva e alterna entre chover e não chover nos tempos do config', () => {
  const c = criarClima({ config, semente: 3 });
  assert.equal(c.chuva, false);
  let choveu = false;
  const duracoes = [];
  let desde = null;
  let anterior = false;
  for (let t = 0; t < 4 * 3600; t += 0.5) {
    c.atualizar(0.5, 720);
    if (c.chuva && !anterior) desde = t;
    if (!c.chuva && anterior) duracoes.push(t - desde);
    if (c.chuva) choveu = true;
    anterior = c.chuva;
  }
  assert.ok(choveu, 'choveu em 4 h');
  assert.ok(duracoes.length >= 3, `${duracoes.length} chuvas`);
  for (const d of duracoes) assert.ok(d >= cfg.chuva.duracaoMinSeg - 1 && d <= cfg.chuva.duracaoMaxSeg + 1, `duração ${d}`);
});

test('chuva: mesma semente, mesma chuva; semente diferente, outra', () => {
  const linha = (semente) => {
    const c = criarClima({ config, semente });
    const v = [];
    for (let t = 0; t < 3600; t += 1) { c.atualizar(1, 0); v.push(c.chuva ? 1 : 0); }
    return v.join('');
  };
  assert.equal(linha(5), linha(5));
  assert.notEqual(linha(5), linha(6));
});

test('chuva: o nível visual entra e sai aos poucos (não pula)', () => {
  const c = criarClima({ config });
  c.forcarChuva(true);
  c.atualizar(1, 0);
  assert.ok(c.chuvaNivel > 0 && c.chuvaNivel < 1, `${c.chuvaNivel}`);
  rodar(c, cfg.chuva.segundosParaMudar + 1);
  assert.equal(c.chuvaNivel, 1);
  c.forcarChuva(false);
  c.atualizar(1, 0);
  assert.ok(c.chuvaNivel > 0 && c.chuvaNivel < 1, 'saindo');
  rodar(c, cfg.chuva.segundosParaMudar + 1);
  assert.equal(c.chuvaNivel, 0);
});

test('chuva: forçada vence a automática, e null devolve a automática', () => {
  const c = criarClima({ config });
  c.forcarChuva(true);
  rodar(c, 5000, 0, 10); // muito tempo: a automática teria parado
  assert.equal(c.chuva, true);
  c.forcarChuva(false);
  rodar(c, 5000, 0, 10);
  assert.equal(c.chuva, false);
  assert.equal(c.chuvaForcada, false);
  c.forcarChuva(null);
  assert.equal(c.chuvaForcada, null);
});

// --- Relâmpago -------------------------------------------------------------------------------

test('relâmpago: só com chuva, a cada 4 a 12 s, e dura a duração do config', () => {
  const sem = criarClima({ config, semente: 2 });
  sem.forcarChuva(false);
  let achou = false;
  for (let t = 0; t < 300; t += 0.05) { sem.atualizar(0.05, 0); if (sem.raio > 0) achou = true; }
  assert.equal(achou, false, 'sem chuva, sem relâmpago');

  const com = criarClima({ config, semente: 2 });
  com.forcarChuva(true);
  const inicios = [];
  const fins = [];
  let aceso = false;
  const passo = 0.02;
  for (let t = 0; t < 300; t += passo) {
    com.atualizar(passo, 0);
    const agora = com.raio > 0;
    if (agora && !aceso) inicios.push(t);
    if (!agora && aceso) fins.push(t);
    aceso = agora;
  }
  assert.ok(inicios.length >= 15, `${inicios.length} relâmpagos em 5 min`);
  for (let i = 1; i < inicios.length; i++) {
    const intervalo = inicios[i] - inicios[i - 1];
    assert.ok(intervalo >= cfg.relampago.intervaloMinSeg - 0.1 && intervalo <= cfg.relampago.intervaloMaxSeg + cfg.relampago.duracaoSeg + 0.1, `intervalo ${intervalo}`);
  }
});

test('relâmpago: a piscada tem dois clarões e apaga (função pura)', () => {
  assert.equal(nivelDoRaio(-0.1), 0);
  assert.equal(nivelDoRaio(0.1), 1);
  assert.ok(nivelDoRaio(0.3) < 0.2, 'respiro');
  assert.ok(nivelDoRaio(0.5) > 0.8, 'segundo clarão');
  assert.ok(nivelDoRaio(0.9) < nivelDoRaio(0.5), 'apagando');
  assert.equal(nivelDoRaio(1), 0);
  for (let p = 0; p <= 1; p += 0.01) { const n = nivelDoRaio(p); assert.ok(n >= 0 && n <= 1); }
});

test('relâmpago: parar a chuva apaga o relâmpago na hora', () => {
  const c = criarClima({ config, semente: 2 });
  c.forcarChuva(true);
  for (let t = 0; t < 30 && c.raio === 0; t += 0.02) c.atualizar(0.02, 0);
  assert.ok(c.raio > 0);
  c.forcarChuva(false);
  c.atualizar(0.02, 0);
  assert.equal(c.raio, 0);
});

// --- Temperatura e frio ----------------------------------------------------------------------

test('temperatura: mais fria de madrugada, mais quente à tarde, sempre entre 14 e 30', () => {
  const c = criarClima({ config });
  const em = (h) => { c.definirHora('fixa', h); c.atualizar(0.1, 0); return c.temperatura; };
  assert.ok(em(15) > em(3) + 8, `tarde ${em(15)} contra madrugada ${em(3)}`);
  for (let h = 0; h < 24; h += 0.5) {
    const t = em(h);
    assert.ok(t >= cfg.temperaturaMedia - cfg.temperaturaAmplitude - cfg.temperaturaVariacao - 0.01
      && t <= cfg.temperaturaMedia + cfg.temperaturaAmplitude + cfg.temperaturaVariacao + 0.01, `${h}h: ${t}`);
  }
});

test('temperatura: a variação lenta mexe um pouco com o tempo, sem pular', () => {
  const c = criarClima({ config });
  c.definirHora('fixa', 12);
  const lista = [];
  for (let t = 0; t < 600; t += 1) { c.atualizar(1, 0); lista.push(c.temperatura); }
  assert.ok(Math.max(...lista) - Math.min(...lista) > 1, 'varia');
  for (let i = 1; i < lista.length; i++) assert.ok(Math.abs(lista[i] - lista[i - 1]) < 0.1, 'sem saltos');
});

test('frio: vale abaixo de 18 °C (e só abaixo), com a temperatura automática e a forçada', () => {
  assert.equal(cfg.friaAbaixoDe, 18);
  const c = criarClima({ config });
  c.forcarTemperatura(17.9);
  assert.equal(c.frio, true);
  c.forcarTemperatura(18);
  assert.equal(c.frio, false, '18 não é frio');
  c.forcarTemperatura(30);
  assert.equal(c.frio, false);
  c.forcarTemperatura(null);
  c.definirHora('fixa', 4);
  c.atualizar(0.1, 0);
  assert.equal(c.frio, true, 'de madrugada faz frio');
  c.definirHora('fixa', 15);
  c.atualizar(0.1, 0);
  assert.equal(c.frio, false, 'de tarde não');
});

test('temperatura: forçada vence a automática, e null devolve a automática', () => {
  const c = criarClima({ config });
  c.definirHora('fixa', 15);
  c.atualizar(0.1, 0);
  const auto = c.temperatura;
  c.forcarTemperatura(5);
  assert.equal(c.temperatura, 5);
  assert.equal(c.temperaturaForcada, 5);
  c.forcarTemperatura(null);
  assert.ok(Math.abs(c.temperatura - auto) < 0.1);
});

// --- Pureza do núcleo ------------------------------------------------------------------------

test('o clima não usa Date, document, window nem fetch (regra do core)', () => {
  const fonte = readFileSync(new URL('../src/core/clima.js', import.meta.url), 'utf8');
  const semComentarios = fonte.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
  for (const proibido of ['Date', 'document', 'window', 'fetch', 'localStorage', 'Math.random']) {
    assert.ok(!semComentarios.includes(proibido), proibido);
  }
});
