// Os textos do painel de clima (sim/formatar.js, doc 11 passo 5).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { formatarHoraDoDia, formatarEstadoDoClima } from '../src/sim/formatar.js';
import { criarClima } from '../src/core/clima.js';
import { lerNumero } from '../src/sim/campos.js';
import { config } from './ajuda.js';

test('hora do dia: dois dígitos, dá a volta no dia', () => {
  assert.equal(formatarHoraDoDia(0), '00:00');
  assert.equal(formatarHoraDoDia(14 * 60 + 32), '14:32');
  assert.equal(formatarHoraDoDia(5.5 * 60), '05:30');
  assert.equal(formatarHoraDoDia(1439.9), '23:59');
  assert.equal(formatarHoraDoDia(1440 + 61), '01:01');
  assert.equal(formatarHoraDoDia(-30), '23:30');
});

test('estado do clima: hora, chuva, temperatura e frio; o que foi forçado aparece marcado', () => {
  const c = criarClima({ config });
  c.definirHora('fixa', 14.5);
  c.atualizar(0.1, 0);
  c.forcarChuva(false);
  c.forcarTemperatura(24);
  c.atualizar(0.1, 0);
  assert.equal(formatarEstadoDoClima(c), 'Hora 14:30 (fixa) · chuva: não (forçada) · 24 °C (forçada) · frio: não');
  c.forcarChuva(true);
  c.forcarTemperatura(9.4);
  c.atualizar(0.1, 0);
  assert.equal(formatarEstadoDoClima(c), 'Hora 14:30 (fixa) · chuva: sim (forçada) · 9 °C (forçada) · frio: sim');
  c.forcarChuva(null);
  c.forcarTemperatura(null);
  c.definirHora('relogio');
  c.atualizar(0.1, 7 * 60);
  const texto = formatarEstadoDoClima(c);
  assert.ok(texto.startsWith('Hora 07:00 · '), texto);
  assert.ok(!texto.includes('forçada'));
  c.definirHora('ciclo');
  assert.ok(formatarEstadoDoClima(c).includes('(ciclo rápido)'));
});

test('os campos do painel: temperatura vazia vira null (automática); fora dos limites é cortada', () => {
  assert.equal(lerNumero('', -30, 60), null);
  assert.equal(lerNumero('  ', -30, 60), null);
  assert.equal(lerNumero('abc', -30, 60), null);
  assert.equal(lerNumero('-12,5', -30, 60), -12.5);
  assert.equal(lerNumero('99', -30, 60), 60);
  assert.equal(lerNumero('-99', -30, 60), -30);
  assert.equal(lerNumero('30', 0, 23.99), 23.99, 'hora fixa nunca passa de 23,99');
});

test('o HTML do painel tem os campos de clima que o painel procura', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  for (const id of ['clima-estado', 'clima-hora-modo', 'clima-hora', 'clima-chuva', 'clima-temperatura']) {
    assert.ok(html.includes(`id="${id}"`), id);
  }
  for (const valor of ['relogio', 'ciclo', 'fixa', 'auto', 'ligada', 'desligada']) {
    assert.ok(html.includes(`value="${valor}"`), valor);
  }
  const js = readFileSync(new URL('../src/sim/panel.js', import.meta.url), 'utf8');
  for (const id of ['clima-estado', 'clima-hora-modo', 'clima-hora', 'clima-chuva', 'clima-temperatura']) {
    assert.ok(js.includes(`'${id}'`), `panel.js usa ${id}`);
  }
});
