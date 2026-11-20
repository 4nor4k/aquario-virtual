// O lado da aba do jogo na ponte do celular (doc 13, passo 3).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarPonteDoJogo } from '../src/sim/ponte.js';

// Um servidor de mentira: guarda o que a aba mandou e devolve os comandos combinados.
function montar({ comandos = [], falha = false, status = 200 } = {}) {
  const enviados = [];
  const agendados = [];
  const buscar = async (url, opcoes) => {
    if (falha) throw new Error('sem rede');
    enviados.push({ url, ...JSON.parse(opcoes.body) });
    const entrega = comandos.splice(0);
    return { ok: status === 200, status, json: async () => ({ comandos: entrega }) };
  };
  const agendar = (fn, ms) => agendados.push({ fn, ms });
  return { enviados, agendados, buscar, agendar, comandos };
}

const esperar = () => new Promise((ok) => setImmediate(ok));

test('manda o retrato e agenda o próximo ciclo em meio segundo', async () => {
  const m = montar();
  const ponte = criarPonteDoJogo({ obterEstado: () => ({ ok: 1 }), executar: () => ({}), buscar: m.buscar, agendar: m.agendar });
  ponte.ligar();
  await esperar();
  assert.equal(m.enviados.length, 1);
  assert.equal(m.enviados[0].url, '/api/ponte/ciclo');
  assert.deepEqual(m.enviados[0].estado, { ok: 1 });
  assert.deepEqual(m.enviados[0].resultados, []);
  assert.equal(m.agendados[0].ms, 500);
});

test('executa os comandos e devolve o resultado logo no ciclo seguinte (sem esperar)', async () => {
  const m = montar({ comandos: [{ id: 5, metodo: 'POST', caminho: '/api/comida', corpo: {} }] });
  const feitos = [];
  const ponte = criarPonteDoJogo({
    obterEstado: () => ({}),
    executar: (c) => { feitos.push(c); return { status: 200, corpo: { ok: true } }; },
    buscar: m.buscar,
    agendar: m.agendar,
  });
  ponte.ligar();
  await esperar();
  assert.deepEqual(feitos, [{ metodo: 'POST', caminho: '/api/comida', corpo: {} }]);
  assert.equal(m.agendados[0].ms, 0, 'tinha comando: o próximo ciclo é já');
  m.agendados[0].fn();
  await esperar();
  assert.deepEqual(m.enviados[1].resultados, [{ id: 5, status: 200, corpo: { ok: true } }]);
  m.agendados[1].fn();
  await esperar();
  assert.deepEqual(m.enviados[2].resultados, [], 'o resultado só vai uma vez');
});

test('um comando que quebra vira erro 500 e não derruba a ponte', async () => {
  const m = montar({ comandos: [{ id: 1, metodo: 'POST', caminho: '/api/ph', corpo: {} }] });
  const ponte = criarPonteDoJogo({
    obterEstado: () => ({}),
    executar: () => { throw new Error('bug'); },
    buscar: m.buscar,
    agendar: m.agendar,
  });
  ponte.ligar();
  await esperar();
  m.agendados[0].fn();
  await esperar();
  assert.equal(m.enviados[1].resultados[0].status, 500);
  assert.equal(m.enviados[1].resultados[0].corpo.ok, false);
});

test('servidor fora do ar: tenta de novo no ritmo normal e volta a funcionar sozinho', async () => {
  const m = montar({ falha: true });
  const ponte = criarPonteDoJogo({ obterEstado: () => ({}), executar: () => ({}), buscar: m.buscar, agendar: m.agendar });
  ponte.ligar();
  await esperar();
  assert.equal(ponte.semServidor, true);
  assert.equal(m.agendados[0].ms, 500);
  // o servidor volta
  const volta = montar();
  const ponte2 = criarPonteDoJogo({ obterEstado: () => ({}), executar: () => ({}), buscar: volta.buscar, agendar: volta.agendar });
  ponte2.ligar();
  await esperar();
  assert.equal(ponte2.semServidor, false);
});

test('desligar para o laço', async () => {
  const m = montar();
  const ponte = criarPonteDoJogo({ obterEstado: () => ({}), executar: () => ({}), buscar: m.buscar, agendar: m.agendar });
  ponte.ligar();
  await esperar();
  ponte.desligar();
  m.agendados[0].fn();
  await esperar();
  assert.equal(m.agendados.length, 1, 'não agendou outro');
});
