import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarArmazenamentoLocal, nomeDoBackup, CHAVE_DO_JOGO, CHAVE_CORROMPIDO } from '../src/sim/armazenamento-local.js';

// localStorage falso (o do navegador guarda só texto).
function guardaFalsa({ cheio = false, quebrado = false } = {}) {
  const itens = new Map();
  return {
    itens,
    getItem: (k) => {
      if (quebrado) throw new Error('bloqueado');
      return itens.has(k) ? itens.get(k) : null;
    },
    setItem: (k, v) => {
      if (quebrado) throw new Error('bloqueado');
      if (cheio) throw new Error('QuotaExceededError');
      itens.set(k, String(v));
    },
    removeItem: (k) => {
      if (quebrado) throw new Error('bloqueado');
      itens.delete(k);
    },
  };
}

test('sem nada guardado: vazio', async () => {
  const a = criarArmazenamentoLocal(guardaFalsa());
  assert.deepEqual(await a.carregar(), { estado: 'vazio' });
});

test('grava e lê de volta o mesmo jogo', async () => {
  const guarda = guardaFalsa();
  const a = criarArmazenamentoLocal(guarda);
  const jogo = { versao: 1, peixes: [{ nome: 'Beta', saude: 80 }], tempoJogoMs: 123 };
  assert.equal(await a.gravar(jogo), true);
  assert.equal(typeof guarda.itens.get(CHAVE_DO_JOGO), 'string', 'guarda como texto JSON');
  assert.deepEqual(await a.carregar(), { estado: 'ok', dados: jogo });
});

test('gravar de novo substitui o jogo (não acumula)', async () => {
  const a = criarArmazenamentoLocal(guardaFalsa());
  await a.gravar({ n: 1 });
  await a.gravar({ n: 2 });
  assert.deepEqual((await a.carregar()).dados, { n: 2 });
});

test('texto que não é JSON: ilegível', async () => {
  const guarda = guardaFalsa();
  guarda.itens.set(CHAVE_DO_JOGO, '{ isto não é json');
  const a = criarArmazenamentoLocal(guarda);
  assert.deepEqual(await a.carregar(), { estado: 'ilegivel' });
});

test('apagar remove o jogo', async () => {
  const a = criarArmazenamentoLocal(guardaFalsa());
  await a.gravar({ n: 1 });
  assert.equal(await a.apagar(), true);
  assert.deepEqual(await a.carregar(), { estado: 'vazio' });
});

test('guardar como corrompido: o texto ruim fica com outro nome e o lugar do jogo é liberado', async () => {
  const guarda = guardaFalsa();
  guarda.itens.set(CHAVE_DO_JOGO, '{ estragado');
  const a = criarArmazenamentoLocal(guarda);
  assert.equal(await a.guardarComoCorrompido(), true);
  assert.equal(guarda.itens.get(CHAVE_CORROMPIDO), '{ estragado', 'nada foi perdido');
  assert.deepEqual(await a.carregar(), { estado: 'vazio' });
});

test('guardar como corrompido sem nada guardado devolve false', async () => {
  const a = criarArmazenamentoLocal(guardaFalsa());
  assert.equal(await a.guardarComoCorrompido(), false);
});

test('sem espaço: gravar devolve false e o jogo antigo continua lá', async () => {
  const guarda = guardaFalsa();
  const bom = criarArmazenamentoLocal(guarda);
  await bom.gravar({ n: 1 });
  guarda.setItem = () => { throw new Error('QuotaExceededError'); };
  assert.equal(await bom.gravar({ n: 2 }), false);
  assert.deepEqual((await bom.carregar()).dados, { n: 1 });
});

test('navegador bloqueia o armazenamento: tudo indisponível, sem quebrar', async () => {
  const a = criarArmazenamentoLocal(guardaFalsa({ quebrado: true }));
  assert.deepEqual(await a.carregar(), { estado: 'sem-servidor' });
  assert.equal(await a.gravar({ n: 1 }), false);
  assert.equal(await a.apagar(), false);
  assert.equal(await a.guardarComoCorrompido(), false);
});

test('sem localStorage nenhum (null): indisponível', async () => {
  const a = criarArmazenamentoLocal(null);
  assert.deepEqual(await a.carregar(), { estado: 'sem-servidor' });
  assert.equal(await a.gravar({ n: 1 }), false);
});

test('gravar aceita o parâmetro keepalive do outro armazenamento', async () => {
  const a = criarArmazenamentoLocal(guardaFalsa());
  assert.equal(await a.gravar({ n: 1 }, { keepalive: true }), true);
});

test('nome do arquivo de backup leva a data', () => {
  assert.equal(nomeDoBackup(new Date(2026, 10, 20, 15, 30).getTime()), 'aquario-2026-11-20.json');
  assert.equal(nomeDoBackup(new Date(2027, 0, 5, 1).getTime()), 'aquario-2027-01-05.json');
});
