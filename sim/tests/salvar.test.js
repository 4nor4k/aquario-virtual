// Salvar e carregar (doc 09, passo 1): ida e volta e recusa de arquivo estragado.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exportarJogo, importarJogo, ErroDeSalvamento, VERSAO_DO_SALVAMENTO } from '../src/core/salvar.js';
import { criarAquario } from '../src/core/aquarium.js';
import { config, montar } from './ajuda.js';

const SALVO_EM = 1_800_000_000_000;

// Simula gravar no arquivo e ler de volta (o JSON é o que vai para o disco).
function idaEVolta(aquario, tempoJogoMs = 12345) {
  const texto = JSON.stringify(exportarJogo(aquario, { tempoJogoMs, salvoEmMs: SALVO_EM }));
  return importarJogo(JSON.parse(texto), { config });
}

function dadosValidos() {
  const { aq } = montar(1);
  return exportarJogo(aq, { tempoJogoMs: 0, salvoEmMs: SALVO_EM });
}

const recusa = (dados, trecho) => assert.throws(
  () => importarJogo(dados, { config }),
  (e) => e instanceof ErroDeSalvamento && e.message.includes(trecho),
);

test('ida e volta: peixe vivo, saudável', () => {
  const { aq, passar } = montar(1);
  passar(10);
  aq.peixes[0].nome = 'Nemo';
  aq.peixes[0].cor = 'azul';
  const r = idaEVolta(aq, 777);
  assert.equal(r.tempoJogoMs, 777);
  assert.equal(r.salvoEmMs, SALVO_EM);
  assert.deepEqual(r.aquario.peixes.map(esconderNado), aq.peixes.map(esconderNado));
  assert.equal(r.aquario.sujeira, aq.sujeira);
  assert.equal(r.aquario.phPasso, aq.phPasso);
  assert.equal(r.aquario.phProgresso, aq.phProgresso);
  assert.equal(r.aquario.gameOver, false);
});

// O que o salvamento guarda do peixe (não guarda o nado nem o cocô: só animação em tempo real).
function esconderNado(p) {
  const { destino, movimento, espera, tempoAnimacao, cocoEm, cocoAleatorioEm, fazendoCoco, ...resto } = p;
  return resto;
}

test('ida e volta: peixe doente, peixe morto e Game Over', () => {
  const { aq, passar } = montar(1);
  passar(24 * 3.2); // sem cuidado: já está doente ou perto disso
  const doente = idaEVolta(aq);
  assert.equal(doente.aquario.peixes[0].estado, aq.peixes[0].estado);

  aq.peixes[0].saude = 10;
  aq.matar(aq.peixes[0], 'cuidado');
  assert.equal(aq.gameOver, true);
  const r = idaEVolta(aq);
  assert.equal(r.aquario.gameOver, true);
  assert.equal(r.aquario.causaDoGameOver, 'cuidado');
  assert.equal(r.aquario.peixes[0].estado, 'morto');
  assert.equal(r.aquario.peixes[0].causaDaMorte, 'cuidado');
});

test('ida e volta: o próximo id não repete ids antigos', () => {
  const { aq } = montar(3);
  aq.peixes.splice(1); // sobram só o id 1; o próximo continua sendo 4
  assert.equal(aq.proximoId, 4);
  const r = idaEVolta(aq);
  assert.equal(r.aquario.proximoId, 4);
  const novo = r.aquario.adicionarPeixe({}, 0);
  assert.equal(novo.id, 4);
});

test('o jogo carregado continua funcionando', () => {
  const { aq } = montar(1);
  const { aquario } = idaEVolta(aq);
  aquario.atualizar(0.05, 1000);
  aquario.atualizar(0.05, 2000);
  assert.equal(aquario.peixes[0].estado, 'saudavel');
});

test('o arquivo carregado não é o mesmo objeto (mexer num não muda o outro)', () => {
  const { aq } = montar(1);
  const { aquario } = idaEVolta(aq);
  aquario.peixes[0].saciedade = 1;
  assert.equal(aq.peixes[0].saciedade, 100);
});

test('o sexo é sorteado na adoção e fica guardado', () => {
  const aq = criarAquario({ config, semente: 5 });
  const sexos = new Set();
  for (let i = 0; i < 20; i++) sexos.add(aq.adicionarPeixe({}, 0).sexo);
  assert.deepEqual([...sexos].sort(), ['femea', 'macho']);
});

test('o sexo não muda o sorteio do nado (mesma semente, mesmo caminho)', () => {
  const a = criarAquario({ config, semente: 9 });
  const b = criarAquario({ config, semente: 9 });
  a.adicionarPeixe({ sexo: 'macho' }, 0);
  b.adicionarPeixe({ sexo: 'femea' }, 0);
  for (let i = 1; i <= 400; i++) { a.atualizar(0.05, i * 50); b.atualizar(0.05, i * 50); }
  assert.equal(a.peixes[0].x, b.peixes[0].x);
  assert.equal(a.peixes[0].y, b.peixes[0].y);
});

test('recusa versão desconhecida, arquivo que não é objeto e lista vazia', () => {
  recusa({ ...dadosValidos(), versao: VERSAO_DO_SALVAMENTO + 1 }, 'versão');
  recusa(null, 'objeto');
  recusa([], 'objeto');
  recusa({ ...dadosValidos(), peixes: [] }, 'peixes');
  recusa({ ...dadosValidos(), peixes: 'oi' }, 'peixes');
});

test('recusa valores fora do limite ou do tipo certo', () => {
  const quebrar = (mexer, trecho) => {
    const d = dadosValidos();
    mexer(d);
    recusa(d, trecho);
  };
  quebrar((d) => { delete d.peixes[0].saude; }, 'saude');
  quebrar((d) => { d.peixes[0].saude = 101; }, 'saude');
  quebrar((d) => { d.peixes[0].saciedade = -1; }, 'saciedade');
  quebrar((d) => { d.peixes[0].saciedade = '50'; }, 'saciedade');
  quebrar((d) => { d.peixes[0].x = NaN; }, '.x');
  quebrar((d) => { d.peixes[0].fase = 'bebe'; }, 'fase');
  quebrar((d) => { d.peixes[0].cor = 'preto'; }, 'cor');
  quebrar((d) => { d.peixes[0].especie = 'guppy'; }, 'especie');
  quebrar((d) => { d.peixes[0].sexo = 'x'; }, 'sexo');
  quebrar((d) => { d.peixes[0].direcao = 0; }, 'direcao');
  quebrar((d) => { d.peixes[0].nome = ''; }, 'nome');
  quebrar((d) => { d.peixes[0].nome = 'a'.repeat(13); }, 'nome');
  quebrar((d) => { d.peixes[0].estado = 'dormindo'; }, 'estado');
  quebrar((d) => { d.aquario.sujeira = 150; }, 'sujeira');
  quebrar((d) => { d.aquario.phPasso = 7; }, 'phPasso');
  quebrar((d) => { d.aquario.phPasso = 1.5; }, 'phPasso');
  quebrar((d) => { d.aquario.phProgresso = 2; }, 'phProgresso');
  quebrar((d) => { d.tempoJogoMs = -5; }, 'tempoJogoMs');
  quebrar((d) => { d.salvoEmMs = 'ontem'; }, 'salvoEmMs');
});

test('recusa estados que não combinam entre si', () => {
  const quebrar = (mexer, trecho) => {
    const d = dadosValidos();
    mexer(d);
    recusa(d, trecho);
  };
  quebrar((d) => { d.aquario.gameOver = true; d.aquario.causaDoGameOver = 'cuidado'; }, 'Game Over');
  quebrar((d) => { d.peixes[0].estado = 'morto'; }, 'causaDaMorte');
  quebrar((d) => { d.peixes[0].causaDaMorte = 'velhice'; }, 'causaDaMorte');
  quebrar((d) => { d.aquario.causaDoGameOver = 'velhice'; }, 'causaDoGameOver');
  quebrar((d) => { d.peixes.push({ ...d.peixes[0] }); }, 'duas vezes');
  quebrar((d) => { d.aquario.proximoId = 1; }, 'proximoId');
  quebrar((d) => { d.peixes = Array.from({ length: 6 }, (_, i) => ({ ...d.peixes[0], id: i + 1 })); d.aquario.proximoId = 7; }, 'peixes');
});

test('campos a mais no arquivo são ignorados, não vão parar no peixe', () => {
  const d = dadosValidos();
  d.peixes[0].segredo = 'x';
  const { aquario } = importarJogo(d, { config });
  assert.equal('segredo' in aquario.peixes[0], false);
});
