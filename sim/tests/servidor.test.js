// O servidor do simulador e o armazenamento do jogo salvo (doc 09, passo 2).
// Usa uma pasta temporária para o jogo salvo: o seu jogo de verdade não é tocado.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, readdir, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { criarServidorDoSimulador, TAMANHO_MAXIMO_DO_SALVAMENTO } from '../servidor.js';
import { criarArmazenamento } from '../src/sim/armazenamento.js';
import { exportarJogo, importarJogo } from '../src/core/salvar.js';
import { config, montar } from './ajuda.js';

let servidor;
let base;
let pastaSaves;
let armazenamento;

before(async () => {
  pastaSaves = await mkdtemp(join(tmpdir(), 'aquario-saves-'));
  servidor = criarServidorDoSimulador({ pastaSaves });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  base = `http://127.0.0.1:${servidor.address().port}`;
  armazenamento = criarArmazenamento((url, opcoes) => fetch(base + url, opcoes));
});

after(async () => {
  await new Promise((ok) => servidor.close(ok));
  await rm(pastaSaves, { recursive: true, force: true });
});

const jogo = (tempoJogoMs = 1) => {
  const { aq } = montar(1);
  return exportarJogo(aq, { tempoJogoMs, salvoEmMs: 1_800_000_000_000 });
};

test('sem jogo salvo: carregar diz "vazio"', async () => {
  await armazenamento.apagar();
  assert.deepEqual(await armazenamento.carregar(), { estado: 'vazio' });
});

test('grava, lê de volta e o jogo carregado é igual ao gravado', async () => {
  const salvo = jogo(4242);
  assert.equal(await armazenamento.gravar(salvo), true);
  const lido = await armazenamento.carregar();
  assert.equal(lido.estado, 'ok');
  assert.deepEqual(lido.dados, salvo);
  assert.equal(importarJogo(lido.dados, { config }).tempoJogoMs, 4242);
});

test('gravar de novo troca o arquivo e não deixa temporário para trás', async () => {
  await armazenamento.gravar(jogo(1));
  await armazenamento.gravar(jogo(2));
  assert.equal((await armazenamento.carregar()).dados.tempoJogoMs, 2);
  assert.deepEqual(await readdir(pastaSaves), ['aquario.json']);
});

test('várias gravações ao mesmo tempo terminam com um arquivo inteiro e válido', async () => {
  await Promise.all([1, 2, 3, 4, 5, 6, 7, 8].map((n) => armazenamento.gravar(jogo(n))));
  const texto = await readFile(join(pastaSaves, 'aquario.json'), 'utf8');
  assert.ok(Number.isInteger(JSON.parse(texto).tempoJogoMs));
});

test('apagar remove o arquivo (e apagar sem arquivo não dá erro)', async () => {
  await armazenamento.gravar(jogo());
  assert.equal(await armazenamento.apagar(), true);
  assert.deepEqual(await armazenamento.carregar(), { estado: 'vazio' });
  assert.equal(await armazenamento.apagar(), true);
});

test('recusa corpo que não é JSON, que não parece jogo e que é grande demais', async () => {
  const pedir = (corpo) => fetch(`${base}/api/salvo`, { method: 'PUT', body: corpo });
  await armazenamento.apagar();
  assert.equal((await pedir('isto não é json')).status, 400);
  assert.equal((await pedir('[1,2,3]')).status, 400);
  assert.equal((await pedir('{"oi":1}')).status, 400);
  assert.equal((await pedir('null')).status, 400);
  const grande = JSON.stringify({ versao: 1, lixo: 'x'.repeat(TAMANHO_MAXIMO_DO_SALVAMENTO) });
  assert.equal((await pedir(grande)).status, 413);
  assert.deepEqual(await armazenamento.carregar(), { estado: 'vazio' }, 'nada foi gravado');
});

test('arquivo estragado: carregar diz "ilegível" e guardarComoCorrompido não apaga', async () => {
  const { writeFile } = await import('node:fs/promises');
  await writeFile(join(pastaSaves, 'aquario.json'), '{ quebrado', 'utf8');
  assert.deepEqual(await armazenamento.carregar(), { estado: 'ilegivel' });
  assert.equal(await armazenamento.guardarComoCorrompido(), true);
  assert.deepEqual(await armazenamento.carregar(), { estado: 'vazio' });
  assert.equal(await readFile(join(pastaSaves, 'aquario.corrompido.json'), 'utf8'), '{ quebrado');
  await rm(join(pastaSaves, 'aquario.corrompido.json'));
});

test('sem servidor: carregar diz "sem-servidor" e gravar devolve false', async () => {
  const fora = criarArmazenamento(() => Promise.reject(new TypeError('fetch failed')));
  assert.deepEqual(await fora.carregar(), { estado: 'sem-servidor' });
  assert.equal(await fora.gravar(jogo()), false);
  assert.equal(await fora.apagar(), false);
});

test('recusa pedidos da API com Host diferente de localhost', async () => {
  const { request } = await import('node:http');
  const status = await new Promise((ok, erro) => {
    const r = request({ host: '127.0.0.1', port: servidor.address().port, path: '/api/salvo', headers: { Host: 'site-malvado.com' } }, (res) => {
      res.resume();
      ok(res.statusCode);
    });
    r.on('error', erro);
    r.end();
  });
  assert.equal(status, 403);
});

// Pedido com o caminho exatamente como escrito (o fetch "arruma" o ../ antes de enviar).
async function pedirCaminho(porta, caminho) {
  const { request } = await import('node:http');
  return new Promise((ok, erro) => {
    const r = request({ host: '127.0.0.1', port: porta, path: caminho }, (res) => { res.resume(); ok(res.statusCode); });
    r.on('error', erro);
    r.end();
  });
}

test('o site continua sendo servido, sem sair da pasta sim/', async () => {
  const pagina = await fetch(`${base}/`);
  assert.equal(pagina.status, 200);
  assert.match(await pagina.text(), /Aquário/);
  const porta = servidor.address().port;
  assert.notEqual(await pedirCaminho(porta, '/../CLAUDE.md'), 200); // o URL já tira o ../
  assert.notEqual(await pedirCaminho(porta, '/%2e%2e/CLAUDE.md'), 200);
  assert.notEqual(await pedirCaminho(porta, '/../../Windows/win.ini'), 200);
});

test('a pasta do jogo salvo (sim/saves) não é servida como site', async () => {
  const padrao = criarServidorDoSimulador(); // pasta de verdade; só lê, nunca grava
  await new Promise((ok) => padrao.listen(0, '127.0.0.1', ok));
  try {
    assert.equal(await pedirCaminho(padrao.address().port, '/saves/aquario.json'), 403);
    assert.equal(await pedirCaminho(padrao.address().port, '/package.json'), 200);
  } finally {
    await new Promise((ok) => padrao.close(ok));
  }
});
