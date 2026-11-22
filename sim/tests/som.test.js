import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { criarSom } from '../src/core/som.js';
import { criarObservadorDeSons, SOM_DO_EVENTO, SOM_DA_ACAO } from '../src/core/eventos-som.js';
import { TELAS } from '../src/core/menu.js';
import { lerSomLigado, gravarSomLigado } from '../src/sim/preferencia-som.js';

const catalogo = JSON.parse(readFileSync(new URL('../config/sons.json', import.meta.url), 'utf8')).sons;
const textos = JSON.parse(readFileSync(new URL('../config/textos.json', import.meta.url), 'utf8'));

// --- o catálogo ----------------------------------------------------------------------------------------

test('catálogo: todo som tem prioridade de 1 a 3 e notas [Hz, ms] válidas', () => {
  const nomes = Object.keys(catalogo);
  assert.equal(nomes.length, 23);
  for (const nome of nomes) {
    const { prioridade, notas } = catalogo[nome];
    assert.ok([1, 2, 3].includes(prioridade), `${nome}: prioridade`);
    assert.ok(notas.length > 0, `${nome}: sem notas`);
    for (const [hz, ms] of notas) {
      assert.ok(Number.isFinite(hz) && (hz === 0 || (hz >= 100 && hz <= 4000)), `${nome}: frequência ${hz}`);
      assert.ok(Number.isInteger(ms) && ms >= 10 && ms <= 1000, `${nome}: duração ${ms}`);
    }
    assert.notEqual(notas.every(([hz]) => hz === 0), true, `${nome}: só silêncio`);
  }
});

test('catálogo: o que importa (Game Over, morreu, namoro, recorde) tem prioridade máxima; detalhes têm a mínima', () => {
  for (const nome of ['gameOver', 'morreu', 'adoeceu', 'namoro', 'recorde', 'adotar']) assert.equal(catalogo[nome].prioridade, 3, nome);
  for (const nome of ['comeu', 'larva', 'trovao']) assert.equal(catalogo[nome].prioridade, 1, nome);
});

test('catálogo: todo som que o jogo pede existe', () => {
  const pedidos = [
    ...Object.values(SOM_DO_EVENTO), ...Object.values(SOM_DA_ACAO),
    'ligar', 'bemvindo', 'voltar', 'status', 'negado', 'comeu', 'trovao',
    'contagem', 'vai', 'larva', 'pausa', 'fimCacada', 'recorde',
  ];
  for (const nome of pedidos) assert.ok(catalogo[nome], `falta o som ${nome}`);
  // E todo som do catálogo é usado por alguém (sem sobra esquecida).
  const usados = new Set(pedidos);
  for (const nome of Object.keys(catalogo)) assert.ok(usados.has(nome), `o som ${nome} não é tocado por nada`);
});

// --- o canal de som ------------------------------------------------------------------------------------

function canal(extra = {}) {
  const tocados = [];
  let calou = 0;
  const som = criarSom({ sons: catalogo, aoTocar: (nome) => tocados.push(nome), aoCalar: () => { calou++; }, ...extra });
  return { som, tocados, get calou() { return calou; } };
}

test('som: tocar avisa a interface e atualizar anda pelas notas e pelos silêncios', () => {
  const { som, tocados } = canal();
  assert.equal(som.tocar('negado'), true); // 330 (80 ms) · silêncio (30 ms) · 260 (100 ms)
  assert.deepEqual(tocados, ['negado']);
  assert.equal(som.atualizar(0.04), 330);
  assert.equal(som.atualizar(0.05), 0);    // 90 ms: dentro do silêncio
  assert.equal(som.atualizar(0.03), 260);  // 120 ms
  assert.equal(som.atualizar(0.2), 0);     // acabou
  assert.equal(som.tocando, null);
  assert.equal(som.atualizar(1), 0);
});

test('som: duracaoMs soma as notas', () => {
  const { som } = canal();
  assert.equal(som.duracaoMs('comeu'), 20);
  assert.equal(som.duracaoMs('negado'), 210);
  assert.throws(() => som.duracaoMs('nao-existe'), RangeError);
});

test('som: prioridade maior ou igual corta o que toca; menor é descartada', () => {
  const { som, tocados } = canal();
  assert.equal(som.tocar('gameOver'), true);          // 3
  assert.equal(som.tocar('comeu'), false);            // 1: descartado
  assert.equal(som.tocar('limpar'), false);           // 2: descartado
  assert.equal(som.tocar('morreu'), true);            // 3: igual, corta
  assert.equal(som.tocando, 'morreu');
  assert.deepEqual(tocados, ['gameOver', 'morreu']);
});

test('som: depois que o som acaba, qualquer prioridade volta a tocar', () => {
  const { som } = canal();
  som.tocar('adotar');
  som.atualizar(5);
  assert.equal(som.tocar('comeu'), true);
});

test('som: som desconhecido é erro de programação', () => {
  const { som } = canal();
  assert.throws(() => som.tocar('xyz'), RangeError);
});

test('som: desligado não toca; desligar no meio cala na hora', () => {
  const c = canal();
  c.som.tocar('namoro');
  c.som.ligado = false;
  assert.equal(c.calou, 1);
  assert.equal(c.som.tocando, null);
  assert.equal(c.som.tocar('adotar'), false);
  assert.deepEqual(c.tocados, ['namoro']);
  c.som.ligado = true;
  assert.equal(c.som.tocar('adotar'), true);
});

test('som: calar sem nada tocando não avisa', () => {
  const c = canal();
  c.som.calar();
  assert.equal(c.calou, 0);
});

// --- quando cada som toca (observador) -----------------------------------------------------------------

const SEM_CACADA = { fase: null, numero: 0, pontos: 0, novoRecorde: false };
function estado(extra = {}) {
  return { tela: TELAS.JOGO, mensagem: null, cacada: SEM_CACADA, relampago: false, graos: 0, eventos: [], ...extra };
}
function observador() {
  const tocados = [];
  const som = criarSom({ sons: catalogo, aoTocar: (nome) => tocados.push(nome) });
  const obs = criarObservadorDeSons({ som });
  // Cada passo "gasta" tempo suficiente para o som anterior acabar, para ver só o que o passo pediu.
  const passo = (e) => { som.atualizar(10); obs.passo(e); return tocados.splice(0); };
  return { obs, passo, som };
}

test('observador: o primeiro passo só marca o ponto de partida (nada toca ao abrir)', () => {
  const { passo } = observador();
  assert.deepEqual(passo(estado({ tela: TELAS.BEM_VINDO })), []);
});

test('observador: A abre o menu (sem som), C abre o status, B volta', () => {
  const { passo } = observador();
  passo(estado());
  assert.deepEqual(passo(estado({ tela: TELAS.MENU })), []);
  assert.deepEqual(passo(estado({ tela: TELAS.JOGO })), ['voltar']);
  assert.deepEqual(passo(estado({ tela: TELAS.STATUS })), ['status']);
  assert.deepEqual(passo(estado({ tela: TELAS.JOGO })), ['voltar']);
});

test('observador: mover o joystick no menu e ficar parado não faz som', () => {
  const { passo } = observador();
  passo(estado({ tela: TELAS.MENU }));
  assert.deepEqual(passo(estado({ tela: TELAS.MENU })), []);
  assert.deepEqual(passo(estado({ tela: TELAS.MENU })), []);
});

test('observador: ação do menu toca o som da ação, não o "voltar"', () => {
  const { obs, passo } = observador();
  passo(estado({ tela: TELAS.MENU }));
  obs.aoAgir('limpar');
  assert.deepEqual(passo(estado({ tela: TELAS.JOGO, mensagem: textos.mensagens.limpeza })), ['limpar']);
  passo(estado({ tela: TELAS.MENU }));
  obs.aoAgir('comida');
  assert.deepEqual(passo(estado({ tela: TELAS.JOGO, mensagem: textos.mensagens.comida })), ['comida']);
  passo(estado({ tela: TELAS.MENU }));
  obs.aoAgir('ph');
  assert.deepEqual(passo(estado({ tela: TELAS.JOGO, mensagem: 'pH' })), ['ph']);
});

test('observador: o menu recusar (mensagem nova, sem ação) toca "negado"', () => {
  const { passo } = observador();
  passo(estado({ tela: TELAS.MENU }));
  assert.deepEqual(passo(estado({ tela: TELAS.JOGO, mensagem: textos.mensagens.cacar.fraco })), ['negado']);
});

test('observador: adotar parceiro ou primeiro peixe toca "adotar"; desistir do parceiro toca "voltar"', () => {
  const { obs, passo } = observador();
  passo(estado({ tela: TELAS.ADOCAO }));
  obs.aoAgir('novoPeixe');
  assert.deepEqual(passo(estado({ tela: TELAS.JOGO })), ['adotar']);
  passo(estado({ tela: TELAS.ADOCAO }));
  obs.aoAgir('parceiro');
  assert.deepEqual(passo(estado({ tela: TELAS.JOGO, mensagem: 'adotado' })), ['adotar']);
  passo(estado({ tela: TELAS.ADOCAO }));
  assert.deepEqual(passo(estado({ tela: TELAS.JOGO })), ['voltar']);
});

test('observador: Game Over -> adoção e fechar o aviso de ausência são sem som; o aviso abre com som', () => {
  const { passo } = observador();
  passo(estado({ tela: TELAS.GAME_OVER }));
  assert.deepEqual(passo(estado({ tela: TELAS.ADOCAO })), []);
  passo(estado());
  assert.deepEqual(passo(estado({ tela: TELAS.BEM_VINDO })), ['bemvindo']);
  assert.deepEqual(passo(estado({ tela: TELAS.JOGO })), []);
});

test('observador: cada evento do core tem seu som', () => {
  const { passo } = observador();
  passo(estado());
  for (const [tipo, nome] of Object.entries(SOM_DO_EVENTO)) {
    assert.deepEqual(passo(estado({ eventos: [{ tipo, peixeId: 1 }] })), [nome], tipo);
  }
  assert.deepEqual(passo(estado({ eventos: [{ tipo: 'desconhecido' }] })), []);
});

test('observador: morreu e gameOver no mesmo passo: vence o Game Over', () => {
  const { passo, som } = observador();
  passo(estado());
  const tocados = passo(estado({ eventos: [{ tipo: 'morreu', peixeId: 1 }, { tipo: 'gameOver' }] }));
  assert.deepEqual(tocados, ['morreu', 'gameOver']);
  assert.equal(som.tocando, 'gameOver');
});

test('observador: trovão só na hora em que o relâmpago começa; grão que some soa como "comeu"', () => {
  const { passo } = observador();
  passo(estado());
  assert.deepEqual(passo(estado({ relampago: true })), ['trovao']);
  assert.deepEqual(passo(estado({ relampago: true })), []);
  assert.deepEqual(passo(estado({ relampago: false })), []);
  assert.deepEqual(passo(estado({ graos: 3 })), []);   // jogou comida: sem "comeu"
  assert.deepEqual(passo(estado({ graos: 2 })), ['comeu']);
  assert.deepEqual(passo(estado({ graos: 2 })), []);
});

test('observador: caçada — contagem 3·2·1, vai, larva, pausa, fim e recorde', () => {
  const { passo } = observador();
  const c = (fase, numero = 0, pontos = 0, novoRecorde = false) => estado({ tela: TELAS.CACADA, cacada: { fase, numero, pontos, novoRecorde } });
  passo(estado({ tela: TELAS.MENU }));
  assert.deepEqual(passo(c('contagem', 3)), ['contagem']);
  assert.deepEqual(passo(c('contagem', 3)), []);
  assert.deepEqual(passo(c('contagem', 2)), ['contagem']);
  assert.deepEqual(passo(c('contagem', 1)), ['contagem']);
  assert.deepEqual(passo(c('jogando', 0)), ['vai']);
  assert.deepEqual(passo(c('jogando', 0, 1)), ['larva']);
  assert.deepEqual(passo(c('jogando', 0, 1)), []);
  assert.deepEqual(passo(c('pausa', 0, 1)), ['pausa']);
  assert.deepEqual(passo(c('pausa', 0, 1)), []);
  assert.deepEqual(passo(c('jogando', 0, 1)), []); // continuar: sem som
  assert.deepEqual(passo(c('fim', 0, 5, false)), ['fimCacada']);
  assert.deepEqual(passo(c('fim', 0, 5, false)), []);
  assert.deepEqual(passo(estado({ tela: TELAS.JOGO })), ['voltar']);
});

test('observador: caçada com novo recorde toca a fanfarra, e jogar de novo recomeça a contagem', () => {
  const { passo } = observador();
  const c = (fase, numero = 0, pontos = 0, novoRecorde = false) => estado({ tela: TELAS.CACADA, cacada: { fase, numero, pontos, novoRecorde } });
  passo(c('jogando', 0, 7));
  assert.deepEqual(passo(c('fim', 0, 8, true)), ['recorde']);
  assert.deepEqual(passo(c('contagem', 3)), ['contagem']);
});

test('observador: pausar e continuar durante a contagem repete o bip do número', () => {
  const { passo } = observador();
  const c = (fase, numero = 0) => estado({ tela: TELAS.CACADA, cacada: { fase, numero, pontos: 0, novoRecorde: false } });
  passo(c('contagem', 2));
  assert.deepEqual(passo(c('pausa', 2)), ['pausa']);
  assert.deepEqual(passo(c('contagem', 2)), ['contagem']); // continuar na contagem: volta o bip
});

test('observador: um som fraco no mesmo passo não atropela um importante', () => {
  const { obs, passo, som } = observador();
  passo(estado({ tela: TELAS.MENU }));
  obs.aoAgir('comida');
  passo(estado({ tela: TELAS.JOGO, eventos: [{ tipo: 'adoeceu', peixeId: 1 }] }));
  assert.equal(som.tocando, 'adoeceu');
});

// --- a preferência ligado/desligado --------------------------------------------------------------------

function armazemFalso(inicial = {}) {
  const dados = { ...inicial };
  return { getItem: (k) => (k in dados ? dados[k] : null), setItem: (k, v) => { dados[k] = String(v); } };
}

test('preferência: o padrão é ligado; desligar e religar é lembrado', () => {
  const armazem = armazemFalso();
  assert.equal(lerSomLigado(armazem), true);
  assert.equal(gravarSomLigado(false, armazem), true);
  assert.equal(lerSomLigado(armazem), false);
  gravarSomLigado(true, armazem);
  assert.equal(lerSomLigado(armazem), true);
});

test('preferência: armazenamento que dá erro não quebra (som fica ligado)', () => {
  const quebrado = { getItem() { throw new Error('bloqueado'); }, setItem() { throw new Error('bloqueado'); } };
  assert.equal(lerSomLigado(quebrado), true);
  assert.equal(gravarSomLigado(false, quebrado), false);
});
