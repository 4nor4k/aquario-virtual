import { test } from 'node:test';
import assert from 'node:assert/strict';
import { config } from './ajuda.js';
import { criarAquario } from '../src/core/aquarium.js';
import { exportarJogo, importarJogo } from '../src/core/salvar.js';
import { lerBackup, textoDoBackup, TAMANHO_MAXIMO_DO_BACKUP } from '../src/sim/backup.js';
import { HORA_MS } from '../src/core/clock.js';

function jogoSalvo(salvoEmMs) {
  const aquario = criarAquario({ semente: 1, config });
  aquario.adicionarPeixe({ nome: 'Nemo', especie: 'beta', cor: 'azul', x: 100, y: 70 }, 0);
  return exportarJogo(aquario, { tempoJogoMs: 5 * HORA_MS, salvoEmMs, recordeCacada: 12 });
}

test('um jogo exportado como texto volta como jogo válido', () => {
  const agora = Date.UTC(2026, 10, 20, 12);
  const r = lerBackup(textoDoBackup(jogoSalvo(agora - 1000)), { config, agoraMs: agora });
  assert.equal(r.ok, true);
  const { aquario, recordeCacada } = importarJogo(r.dados, { config });
  assert.equal(aquario.peixes[0].nome, 'Nemo');
  assert.equal(aquario.peixes[0].cor, 'azul');
  assert.equal(recordeCacada, 12, 'o recorde da caçada vai junto');
});

test('o tempo entre o backup e a importação não conta: salvoEmMs vira "agora"', () => {
  const agora = Date.UTC(2026, 10, 27, 12);
  const umaSemanaAntes = agora - 7 * 24 * HORA_MS;
  const r = lerBackup(textoDoBackup(jogoSalvo(umaSemanaAntes)), { config, agoraMs: agora });
  assert.equal(r.ok, true);
  assert.equal(r.dados.salvoEmMs, agora);
  assert.equal(r.dados.tempoJogoMs, 5 * HORA_MS, 'a hora do jogo não muda');
});

test('o texto original não é alterado (a conferência não mexe no que veio)', () => {
  const original = jogoSalvo(1000);
  const antes = JSON.stringify(original);
  lerBackup(JSON.stringify(original), { config, agoraMs: 999999 });
  assert.equal(JSON.stringify(original), antes);
});

test('arquivo vazio, em branco ou sem ser texto é recusado com motivo', () => {
  for (const ruim of ['', '   \n ', null, undefined, 42]) {
    const r = lerBackup(ruim, { config, agoraMs: 1 });
    assert.equal(r.ok, false);
    assert.match(r.motivo, /vazio/);
  }
});

test('texto que não é JSON é recusado', () => {
  const r = lerBackup('{ isto não é json', { config, agoraMs: 1 });
  assert.equal(r.ok, false);
  assert.match(r.motivo, /JSON/);
});

test('JSON de outra coisa (não é um jogo salvo) é recusado, sem quebrar', () => {
  for (const ruim of ['[]', '42', 'null', '{}', '{"versao": 99}', '{"versao": 1}', '"texto"']) {
    const r = lerBackup(ruim, { config, agoraMs: 1 });
    assert.equal(r.ok, false, ruim);
    assert.match(r.motivo, /não é um jogo salvo/);
  }
});

test('jogo salvo com um campo estragado é recusado', () => {
  const dados = jogoSalvo(1000);
  dados.peixes[0].saude = 'muita';
  const r = lerBackup(JSON.stringify(dados), { config, agoraMs: 1 });
  assert.equal(r.ok, false);
});

test('arquivo grande demais é recusado antes de ler', () => {
  const r = lerBackup(' '.repeat(TAMANHO_MAXIMO_DO_BACKUP + 1) + '{}', { config, agoraMs: 1 });
  assert.equal(r.ok, false);
  assert.match(r.motivo, /grande demais/);
});

test('o texto exportado é JSON legível (com quebras de linha)', () => {
  const texto = textoDoBackup(jogoSalvo(1));
  assert.ok(texto.includes('\n'));
  assert.deepEqual(JSON.parse(texto), jogoSalvo(1));
});
