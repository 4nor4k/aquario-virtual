// Liga as partes do simulador e roda o laço do jogo.
import { criarQuadro, mostrarQuadro, LARGURA, ALTURA } from './render/tela.js';
import { criarCamera } from './render/camera.js';
import { criarSeguidorDeCamera } from './render/camera-segue.js';
import { gerarMapa } from './render/cenario.js';
import { gerarPlantas } from './render/plantas.js';
import { gerarFundo } from './render/fundo.js';
import { desenharQuadro } from './render/scene.js';
import { desenharTelas } from './render/telas.js';
import { criarTurvacao, nivelDaSujeira } from './render/turvacao.js';
import { atualizarPlanos } from './render/profundidade.js';
import { criarTeclado } from './input/keyboard.js';
import { criarPainel } from './sim/panel.js';
import { MUNDO_LARGURA, MUNDO_ALTURA } from './core/mundo.js';
import { criarAquario } from './core/aquarium.js';
import { criarBolhas } from './core/bolhas.js';
import { TAMANHO_POR_FASE } from './core/fish.js';
import { criarClock } from './core/clock.js';
import { criarMenu } from './core/menu.js';
import { exportarJogo, importarJogo, ErroDeSalvamento } from './core/salvar.js';
import { calcularAusencia, aplicarAusencia } from './core/ausencia.js';
import { criarArmazenamento } from './sim/armazenamento.js';
import { caracteresSemGlifo } from './render/fonte.js';

const PASSO_MS = 50;           // passo fixo: 20 por segundo (igual no ESP32)
const VELOCIDADE_CAMERA = 60;  // pixels por segundo

const canvas = document.getElementById('tela');
const ctx = canvas.getContext('2d');

const quadro = criarQuadro();
const mapa = gerarMapa();
const plantas = gerarPlantas(mapa);
const fundo = gerarFundo();
const teclado = criarTeclado(window);
// Começa no meio do mundo, na altura do fundo (para ver areia e rochas).
const camera = criarCamera({
  mundoLargura: MUNDO_LARGURA,
  mundoAltura: MUNDO_ALTURA,
  janelaLargura: LARGURA,
  janelaAltura: ALTURA,
  x: (MUNDO_LARGURA - LARGURA) / 2,
  y: MUNDO_ALTURA - ALTURA,
});

// Enfeites que não afetam o jogo: bolhas e a onda da superfície, em tempo real (não aceleram).
const bolhas = criarBolhas();
// A fonte de bolhas da camada 3: sai de trás da pedra grande (camada mais longe, com paralaxe de 70%).
const bolhasDoFundo = criarBolhas({ semente: 21, emissores: [fundo.pedraGrande.x] });
let tempoVisual = 0;
// O quanto a água está turva na tela: acompanha a sujeira aos poucos (limpar clareia em segundos).
const turvacao = criarTurvacao();

// Câmera automática: segue o peixe quando o jogador está AFK e ele sai da tela.
const seguidor = criarSeguidorDeCamera({ camera, janelaLargura: LARGURA, janelaAltura: ALTURA });

// O relógio do jogo: no simulador a fonte é o tempo do navegador e pode ser acelerado.
const clock = criarClock(() => performance.now());

// Os números do jogo (config/jogo.json) e os textos (config/textos.json) ficam em arquivos.
// O core não lê arquivos, então é aqui que o navegador carrega os JSON e entrega prontos.
async function carregarJson(caminho) {
  const resposta = await fetch(caminho);
  if (!resposta.ok) throw new Error(`Não consegui carregar ${caminho} (${resposta.status})`);
  return resposta.json();
}
const config = await carregarJson('config/jogo.json');
const textos = await carregarJson('config/textos.json');

let aquario;
let numeroDoJogo = 0;
// true enquanto espera a (primeira) adoção: o aquário de trás é só um enfeite e NADA é salvo.
let semJogo = false;
// O aparelho só desenha o que a fonte de pixels tem: o nome só aceita essas letras.
const aceitaNoNome = (letra) => caracteresSemGlifo(letra).length === 0;

// --- Salvamento (doc 09) ------------------------------------------------------------------
// O jogo é gravado em sim/saves/aquario.json pelo servidor. O core só transforma o aquário em
// dados (salvar.js); a hora REAL (Date.now) só existe aqui, na interface.
const armazenamento = criarArmazenamento();
const salvamento = {
  bloqueado: false, // true: não consegui ler o que existe; não posso gravar por cima
  quando: null,     // hora real da última gravação que deu certo
  falhou: false,    // a última gravação não deu certo
  aviso: null,      // texto para o painel (arquivo estragado, servidor fora...)
};
let jaSalvouOGameOver = false;

async function salvar({ keepalive = false } = {}) {
  if (salvamento.bloqueado || semJogo) return;
  const agora = Date.now();
  const dados = exportarJogo(aquario, { tempoJogoMs: clock.agoraMs(), salvoEmMs: agora });
  const ok = await armazenamento.gravar(dados, { keepalive });
  salvamento.falhou = !ok;
  if (ok) salvamento.quando = agora;
}

// A semente do sorteio do nado muda a cada abertura, para o peixe não repetir o mesmo caminho.
const novaSemente = () => (Date.now() + numeroDoJogo) >>> 0;

// O menu e as telas (A abre o menu, C abre o status...). No Game Over, A abre a adoção; adotar recomeça.
const menu = criarMenu({
  textos,
  cores: config.cores,
  aoNovoJogo: ({ cor }) => adotar({ cor }),
  aoAgir: () => salvar(),
  // A comida cai no meio do que você está vendo.
  posicaoDaComida: () => camera.x + LARGURA / 2,
});

// Adota: começa um aquário novo, com um filhote da cor escolhida e o relógio em zero.
// Sem nome, ele se chama "Beta" até você mudar (pelo painel; o aparelho não tem teclado).
function adotar({ cor, nome }) {
  numeroDoJogo++;
  clock.reiniciar();
  menu.reiniciar();
  aquario = criarAquario({ semente: novaSemente(), config });
  const peixe = aquario.adicionarPeixe({ nome: config.nome.padrao, especie: 'beta', cor, x: 120, y: 80 }, clock.agoraMs());
  if (nome != null) aquario.renomear(peixe, nome, aceitaNoNome);
  turvacao.irPara(nivelDaSujeira(aquario.sujeira));
  semJogo = false;
  jaSalvouOGameOver = false;
  salvar();
}

// Sem jogo salvo (primeira vez, ou depois de apagar): mostra a tela de adoção. O aquário que
// fica atrás dela é só um enfeite, e nada é salvo até adotar.
function esperarAdocao() {
  numeroDoJogo++;
  clock.reiniciar();
  menu.reiniciar();
  aquario = criarAquario({ semente: novaSemente(), config });
  aquario.adicionarPeixe({ nome: config.nome.padrao, especie: 'beta', x: 120, y: 80 }, clock.agoraMs());
  turvacao.irPara(nivelDaSujeira(aquario.sujeira));
  semJogo = true;
  jaSalvouOGameOver = false;
  menu.abrirAdocao();
}

// Apaga o jogo salvo e volta à adoção (botão do painel).
async function apagarJogo() {
  if (!salvamento.bloqueado) await armazenamento.apagar();
  esperarAdocao();
}

// Tenta voltar ao jogo salvo. Devolve true se conseguiu.
async function carregarJogoSalvo() {
  const lido = await armazenamento.carregar();
  if (lido.estado === 'vazio') return false;
  if (lido.estado === 'sem-servidor') {
    salvamento.bloqueado = true;
    salvamento.aviso = 'Não consegui falar com o servidor: este jogo não será salvo. Recarregue a página.';
    return false;
  }
  try {
    if (lido.estado === 'ilegivel') throw new ErroDeSalvamento('o arquivo não é um JSON válido');
    const { aquario: carregado, tempoJogoMs, salvoEmMs } = importarJogo(lido.dados, { config, semente: novaSemente() });
    // O tempo com o jogo fechado conta: as regras rodam por ele todo (doc 03 e 09, seção 4).
    const ausenciaMs = calcularAusencia(salvoEmMs, Date.now());
    const r = aplicarAusencia(carregado, { ausenciaMs, horaDoJogoAntesMs: tempoJogoMs }, config);
    clock.reiniciar();
    clock.avancar(r.horaDoJogoMs);
    menu.reiniciar();
    aquario = carregado;
    turvacao.irPara(nivelDaSujeira(aquario.sujeira)); // abre já com a água como estava
    jaSalvouOGameOver = aquario.gameOver;
    salvar(); // grava já o estado depois da ausência (e da hora de agora)
    // Só avisa se ficou fora por um tempo; dar F5 não mostra nada.
    if (ausenciaMs >= config.salvamento.ausenciaMinimaParaAvisarMin * 60 * 1000) {
      menu.mostrarBemVindo({ ausenciaMs, morreu: r.morreu });
    }
    return true;
  } catch (erro) {
    if (!(erro instanceof ErroDeSalvamento)) throw erro;
    // Não apago nada: o arquivo ruim fica guardado com outro nome e o jogo recomeça.
    const guardou = await armazenamento.guardarComoCorrompido();
    salvamento.aviso = guardou
      ? `O jogo salvo estava estragado (${erro.message}). Guardei como saves/aquario.corrompido.json e comecei um aquário novo.`
      : `O jogo salvo está estragado (${erro.message}) e não consegui guardá-lo. Nada foi gravado.`;
    if (!guardou) salvamento.bloqueado = true;
    return false;
  }
}

if (!(await carregarJogoSalvo())) esperarAdocao();

// Grava de tempos em tempos e quando a aba vai embora.
setInterval(() => salvar(), config.salvamento.intervaloSegundos * 1000);
addEventListener('pagehide', () => salvar({ keepalive: true }));
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') salvar({ keepalive: true });
});

const painel = criarPainel({
  clock,
  camera,
  menu,
  config,
  obterAquario: () => aquario,
  obterPeixe: () => menu.peixeEmFoco(aquario),
  textos,
  obterSalvamento: () => salvamento,
  aguardandoAdocao: () => semJogo,
  podeAdotar: () => semJogo || aquario.gameOver,
  aoAdotar: (pedido) => adotar(pedido),
  aoRenomear: (bruto) => {
    const peixe = menu.peixeEmFoco(aquario);
    if (peixe) aquario.renomear(peixe, bruto, aceitaNoNome);
    salvar();
  },
  aoAdotarParceiro: ({ nome, cor }) => {
    const r = menu.adotarParceiro(aquario, { cor });
    if (r.ok && nome) aquario.renomear(r.parceiro, nome, aceitaNoNome);
    return r;
  },
  aoApagar: apagarJogo,
});

// Um passo do jogo (dt em segundos reais).
function atualizar(dt) {
  const botoes = teclado.botoes();
  const dir = teclado.direcao();
  menu.apertar(botoes, aquario);
  // Com o menu aberto, o joystick escolhe o item e a câmera fica parada.
  const livre = menu.cameraLivre();
  if (livre) {
    camera.mover(dir.x * VELOCIDADE_CAMERA * dt, dir.y * VELOCIDADE_CAMERA * dt);
  }
  // Jogador parado e peixe fora da tela: a câmera vai atrás dele (câmera-segue.js).
  const foco = menu.peixeEmFoco(aquario);
  if (foco) {
    const { largura, altura } = TAMANHO_POR_FASE[foco.fase];
    seguidor.atualizar(dt, { alvo: { x: foco.x, y: foco.y, largura, altura }, joystick: dir, livre });
  }
  aquario.atualizar(dt, clock.agoraMs());
  mostrarAvisosDoCore();
  // Por onde o peixe passa (atrás ou na frente das algas e da pedra): troca quando não está sobre elas.
  atualizarPlanos(aquario.peixes, { plantas, fundo, camera });
  if (aquario.gameOver && !jaSalvouOGameOver) {
    jaSalvouOGameOver = true;
    salvar();
  }
  bolhas.atualizar(dt);
  bolhasDoFundo.atualizar(dt);
  turvacao.atualizar(dt, nivelDaSujeira(aquario.sujeira));
  tempoVisual += dt;
  menu.atualizar(dt, aquario);
}

// O que o core anotou (namoro, nascimento...) vira mensagem na tela. O resto da fila é descartado.
function mostrarAvisosDoCore() {
  for (const evento of aquario.eventos.retirar()) {
    if (evento.tipo === 'reproducao') menu.avisar(textos.mensagens.namoro);
    else if (evento.tipo === 'nasceu') menu.avisar(textos.mensagens.nasceu);
  }
}

function desenhar() {
  desenharQuadro(quadro, {
    mapa, camera, peixes: aquario.peixes, aquario, config, bolhas: bolhas.lista, bolhasDoFundo: bolhasDoFundo.lista, plantas, fundo, tempo: tempoVisual,
    turvacao: turvacao.nivel, graos: aquario.graos, cocos: aquario.cocos, ovos: aquario.ovos, casais: aquario.casais, agoraMs: clock.agoraMs(),
  });
  desenharTelas(quadro, { menu, aquario, config, textos, agoraMs: clock.agoraMs() });
  mostrarQuadro(ctx, quadro);
}

// Laço: acumula o tempo real e roda passos fixos de 50 ms.
let acumulado = 0;
let ultimo = performance.now();
function ciclo(agora) {
  acumulado += Math.min(agora - ultimo, 250); // teto: se a aba ficou parada, não "recupera" tudo
  ultimo = agora;
  let passos = 0;
  while (acumulado >= PASSO_MS) {
    atualizar(PASSO_MS / 1000);
    acumulado -= PASSO_MS;
    passos++;
  }
  if (passos > 0) desenhar();
  painel.atualizar();
  requestAnimationFrame(ciclo);
}

// Ajuda para desenvolver: abrindo http://localhost:8080/?debug, dá para mexer no jogo pelo
// console do navegador (ex.: __debug.camera.irPara(0, 0)). Sem "?debug" nada disso existe.
if (new URLSearchParams(location.search).has('debug')) {
  window.__debug = { camera, seguidor, clock, config, textos, menu, turvacao, aquario: () => aquario, salvamento, salvar };
}

desenhar();
painel.atualizar(true);
requestAnimationFrame(ciclo);
