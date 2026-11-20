// O retrato (GET /api/estado) e os comandos (POST /api/...) da página do celular (doc 13, passo 1).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { montarEstado, FASES_DO_JOGO } from '../src/core/estado-api.js';
import { executarComando } from '../src/core/comandos-api.js';
import { criarMenu } from '../src/core/menu.js';
import { criarClima } from '../src/core/clima.js';
import { criarAquario } from '../src/core/aquarium.js';
import { montar, config } from './ajuda.js';

const textos = JSON.parse(readFileSync(new URL('../config/textos.json', import.meta.url), 'utf8'));

// --- GET /api/estado ----------------------------------------------------------------------------

const estadoDe = (aq, extra = {}) => montarEstado(aq, { config, textos, agoraMs: 0, ...extra });

test('estado: jogando, com a água, o peixe e os limites', () => {
  const { aq } = montar(1);
  const e = estadoDe(aq);
  assert.equal(e.ligado, true);
  assert.equal(e.faseDoJogo, FASES_DO_JOGO.JOGANDO);
  assert.equal(e.agua.sujeira, 0);
  assert.equal(e.agua.ph.faixa, 'ideal');
  assert.equal(e.agua.ph.texto, '7,0');
  assert.equal(e.peixes.length, 1);
  assert.equal(e.peixes[0].fase, 'filhote');
  assert.equal(e.peixes[0].saude, 'saudavel');
  assert.equal(e.peixes[0].dia, 1);
  assert.equal(e.peixes[0].diasTotal, 30);
  assert.equal(e.limite, 5);
  assert.equal(e.vagas, 4);
  assert.equal(e.nomeMaximo, 12);
  assert.deepEqual(e.cores, config.cores);
  assert.equal(e.clima, null);
});

test('estado: o sexo fica escondido até o peixe ficar adulto', () => {
  const { aq } = montar(0);
  aq.adicionarPeixe({ fase: 'jovem', sexo: 'femea' }, 0);
  aq.adicionarPeixe({ fase: 'adulto', sexo: 'macho' }, 0);
  const e = estadoDe(aq, { agoraMs: 0 });
  assert.equal(e.peixes[0].sexo, null);
  assert.equal(e.peixes[1].sexo, 'macho');
});

test('estado: a saúde vira status e o doente/morto aparece', () => {
  const { aq } = montar(3);
  aq.peixes[0].saude = 50;
  aq.peixes[1].saude = 10;
  aq.matar(aq.peixes[2]);
  const e = estadoDe(aq);
  assert.deepEqual(e.peixes.map((p) => p.saude), ['doente', 'muitoDoente', 'morto']);
});

test('estado: avisos em texto (doente, fome, sujeira, filhote sem nome, clima)', () => {
  const { aq } = montar(1);
  aq.peixes[0].saude = 10;
  aq.peixes[0].saciedade = 5;
  aq.sujeira = 90;
  const clima = criarClima({ config });
  clima.forcarChuva(true);
  clima.atualizar(0, 12 * 60);
  const e = estadoDe(aq, { clima });
  assert.ok(e.avisos.includes('Beta não está bem'));
  assert.ok(e.avisos.includes('Beta está com fome'));
  assert.ok(e.avisos.includes('A água está suja'));
  assert.ok(e.avisos.some((a) => a.includes('dar um nome')));
  assert.equal(e.peixes[0].semNome, true);
  assert.equal(e.peixes[0].comFome, true);
});

test('estado: peixe com nome próprio não pede nome', () => {
  const { aq } = montar(1);
  aq.renomear(aq.peixes[0], 'Nemo');
  const e = estadoDe(aq);
  assert.equal(e.peixes[0].semNome, false);
  assert.equal(e.avisos.some((a) => a.includes('dar um nome')), false);
});

test('estado: sem jogo (adoção) não mostra peixes nem avisos', () => {
  const { aq } = montar(1);
  const e = estadoDe(aq, { aguardandoAdocao: true });
  assert.equal(e.faseDoJogo, FASES_DO_JOGO.ADOCAO);
  assert.deepEqual(e.peixes, []);
  assert.deepEqual(e.avisos, []);
});

test('estado: Game Over traz a causa e nenhum aviso', () => {
  const { aq } = montar(1);
  aq.matar(aq.peixes[0], 'cuidado');
  const e = estadoDe(aq);
  assert.equal(e.faseDoJogo, FASES_DO_JOGO.GAME_OVER);
  assert.equal(e.causaDoGameOver, 'cuidado');
  assert.deepEqual(e.avisos, []);
});

test('estado: parceiro só para adulto sem parceiro; depois de adotar mostra o id', () => {
  const { aq } = montar(0);
  aq.adicionarPeixe({ fase: 'filhote' }, 0);
  const adulto = aq.adicionarPeixe({ fase: 'adulto', sexo: 'femea' }, 0);
  let e = estadoDe(aq);
  assert.deepEqual(e.peixes[0].parceiro, { ok: false, motivo: 'naoAdulto' });
  assert.deepEqual(e.peixes[1].parceiro, { ok: true, motivo: null });
  const par = aq.adotarParceiro(adulto, {}, 0);
  e = estadoDe(aq);
  assert.equal(e.peixes[1].parceiroId, par.id);
  assert.deepEqual(e.peixes[1].parceiro, { ok: false, motivo: 'temParceiro' });
});

test('estado: 5 peixes -> sem vagas; ovos contam', () => {
  const { aq } = montar(5);
  assert.equal(estadoDe(aq).vagas, 0);
});

test('estado: o clima entra arredondado', () => {
  const { aq } = montar(1);
  const clima = criarClima({ config });
  clima.atualizar(0, 13 * 60);
  const e = estadoDe(aq, { clima });
  assert.equal(e.clima.hora, 13);
  assert.equal(typeof e.clima.temperatura, 'number');
  assert.equal(typeof e.clima.frio, 'boolean');
});

test('estado: vira JSON e volta sem perder nada', () => {
  const { aq } = montar(2);
  const e = estadoDe(aq);
  assert.deepEqual(JSON.parse(JSON.stringify(e)), e);
});

// --- Comandos -----------------------------------------------------------------------------------

function ambiente({ peixes = 1, adocao = false } = {}) {
  const t = montar(peixes);
  const jogo = { aq: t.aq, adocao, adotados: [], salvos: 0 };
  const menu = criarMenu({ textos, cores: config.cores, aoNovoJogo: () => {} });
  const ctx = {
    get aquario() { return jogo.aq; },
    menu, config, textos,
    aguardandoAdocao: () => jogo.adocao,
    adotar: ({ cor, nome }) => {
      jogo.adotados.push({ cor, nome });
      jogo.adocao = false;
      jogo.aq = criarAquario({ config });
      const p = jogo.aq.adicionarPeixe({ cor }, 0);
      if (nome) jogo.aq.renomear(p, nome);
    },
    aceitaNoNome: () => true,
    salvar: () => { jogo.salvos++; },
  };
  const cmd = (metodo, caminho, corpo) => executarComando({ metodo, caminho, corpo }, ctx);
  return { jogo, ctx, cmd, aq: t.aq };
}

test('comando: comida solta grãos e diz a mensagem do aparelho', () => {
  const { cmd, aq } = ambiente();
  aq.peixes[0].saciedade = 40; // com fome (peixe cheio recebe o aviso de excesso)
  const r = cmd('POST', '/api/comida');
  assert.equal(r.status, 200);
  assert.equal(r.corpo.ok, true);
  assert.equal(r.corpo.mensagem, textos.mensagens.comida);
  assert.ok(aq.graos.length > 0);
});

test('comando: limpar zera a sujeira', () => {
  const { cmd, aq } = ambiente();
  aq.sujeira = 70;
  assert.equal(cmd('POST', '/api/limpar').corpo.mensagem, textos.mensagens.limpeza);
  assert.equal(aq.sujeira, 0);
});

test('comando: pH sobe um passo e no máximo avisa', () => {
  const { cmd, aq } = ambiente();
  const antes = aq.phPasso;
  const r = cmd('POST', '/api/ph');
  assert.equal(aq.phPasso, antes + 1);
  assert.match(r.corpo.mensagem, /pH subiu/);
  aq.phPasso = config.ph.valores.length - 1;
  assert.equal(cmd('POST', '/api/ph').corpo.mensagem, textos.mensagens.phNoMaximo);
});

test('comando: sem jogo, cuidar do aquário é recusado', () => {
  const { cmd } = ambiente({ adocao: true });
  for (const caminho of ['/api/comida', '/api/limpar', '/api/ph']) {
    const r = cmd('POST', caminho);
    assert.equal(r.status, 409);
    assert.equal(r.corpo.erro, 'semJogo');
  }
});

test('comando: adotar o primeiro peixe (com nome e cor)', () => {
  const { cmd, jogo } = ambiente({ adocao: true });
  const r = cmd('POST', '/api/peixes', { cor: 'azul', nome: 'Nemo' });
  assert.equal(r.status, 200);
  assert.deepEqual(jogo.adotados, [{ cor: 'azul', nome: 'Nemo' }]);
});

test('comando: adotar com jogo em andamento é recusado; depois do Game Over, pode', () => {
  const { cmd, aq, jogo } = ambiente();
  assert.equal(cmd('POST', '/api/peixes', { cor: 'azul' }).corpo.erro, 'jaTemJogo');
  aq.matar(aq.peixes[0]);
  assert.equal(cmd('POST', '/api/peixes', { cor: 'azul' }).status, 200);
  assert.equal(jogo.adotados.length, 1);
});

test('comando: cor que não existe é recusada', () => {
  const { cmd } = ambiente({ adocao: true });
  const r = cmd('POST', '/api/peixes', { cor: 'dourado' });
  assert.equal(r.status, 400);
  assert.equal(r.corpo.erro, 'corInvalida');
});

test('comando: adotar parceiro (adulto) forma o casal, com nome', () => {
  const { cmd, aq, jogo } = ambiente({ peixes: 0 });
  const adulto = aq.adicionarPeixe({ fase: 'adulto', sexo: 'macho' }, 0);
  const r = cmd('POST', '/api/peixes', { parceiroDe: adulto.id, cor: 'rosa', nome: 'Lua' });
  assert.equal(r.status, 200);
  const par = aq.parceiroDe(adulto);
  assert.equal(par.nome, 'Lua');
  assert.equal(par.cor, 'rosa');
  assert.equal(par.sexo, 'femea');
  assert.equal(jogo.salvos, 1);
});

test('comando: parceiro de filhote é recusado com o motivo', () => {
  const { cmd, aq } = ambiente();
  const r = cmd('POST', '/api/peixes', { parceiroDe: aq.peixes[0].id, cor: 'rosa' });
  assert.equal(r.status, 409);
  assert.equal(r.corpo.erro, 'naoAdulto');
  assert.equal(r.corpo.mensagem, textos.mensagens.parceiro.naoAdulto);
});

test('comando: parceiro de peixe que não existe', () => {
  const { cmd } = ambiente();
  assert.equal(cmd('POST', '/api/peixes', { parceiroDe: 99, cor: 'rosa' }).corpo.erro, 'peixeInvalido');
});

test('comando: trocar o nome aplica as regras (corta em 12, vazio vira Beta) e salva', () => {
  const { cmd, aq, jogo } = ambiente();
  const id = aq.peixes[0].id;
  assert.equal(cmd('PUT', `/api/peixes/${id}`, { nome: 'Capitão Nemo Júnior' }).corpo.nome, 'Capitão Nemo');
  assert.equal(aq.peixes[0].nome, 'Capitão Nemo');
  assert.equal(cmd('PUT', `/api/peixes/${id}`, { nome: '   ' }).corpo.nome, 'Beta');
  assert.equal(jogo.salvos, 2);
});

test('comando: renomear peixe inexistente ou morto', () => {
  const { cmd, aq } = ambiente({ peixes: 2 });
  assert.equal(cmd('PUT', '/api/peixes/77', { nome: 'X' }).status, 404);
  aq.matar(aq.peixes[0]);
  assert.equal(cmd('PUT', `/api/peixes/${aq.peixes[0].id}`, { nome: 'X' }).corpo.erro, 'peixeMorto');
});

test('comando: pedido que não existe', () => {
  const { cmd } = ambiente();
  assert.equal(cmd('POST', '/api/xyz').status, 404);
  assert.equal(cmd('GET', '/api/comida').status, 404);
});
