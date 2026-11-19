// Liga as partes do simulador e roda o laço do jogo.
import { criarQuadro, mostrarQuadro, LARGURA, ALTURA } from './render/tela.js';
import { criarCamera } from './render/camera.js';
import { criarSeguidorDeCamera } from './render/camera-segue.js';
import { gerarMapa } from './render/cenario.js';
import { gerarPlantas } from './render/plantas.js';
import { gerarFundo } from './render/fundo.js';
import { desenharQuadro } from './render/scene.js';
import { desenharTelas } from './render/telas.js';
import { criarTeclado } from './input/keyboard.js';
import { criarPainel } from './sim/panel.js';
import { MUNDO_LARGURA, MUNDO_ALTURA } from './core/mundo.js';
import { criarAquario } from './core/aquarium.js';
import { criarBolhas } from './core/bolhas.js';
import { TAMANHO_POR_FASE } from './core/fish.js';
import { criarClock } from './core/clock.js';
import { criarMenu } from './core/menu.js';
import { exportarJogo, importarJogo, ErroDeSalvamento } from './core/salvar.js';
import { criarArmazenamento } from './sim/armazenamento.js';

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
let tempoVisual = 0;

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
let beta;
let numeroDoJogo = 0;

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
  if (salvamento.bloqueado) return;
  const agora = Date.now();
  const dados = exportarJogo(aquario, { tempoJogoMs: clock.agoraMs(), salvoEmMs: agora });
  const ok = await armazenamento.gravar(dados, { keepalive });
  salvamento.falhou = !ok;
  if (ok) salvamento.quando = agora;
}

// A semente do sorteio do nado muda a cada abertura, para o peixe não repetir o mesmo caminho.
const novaSemente = () => (Date.now() + numeroDoJogo) >>> 0;

// O menu e as telas (A abre o menu, C abre o status...). Ao apertar A no Game Over, recomeça.
const menu = criarMenu({ textos, aoNovoJogo: () => novoJogo(), aoAgir: () => salvar() });

// Começa (ou recomeça) com um filhote novo e o relógio em zero.
function novoJogo() {
  numeroDoJogo++;
  clock.reiniciar();
  menu.reiniciar();
  aquario = criarAquario({ semente: novaSemente(), config });
  beta = aquario.adicionarPeixe({ nome: 'Beta', especie: 'beta', x: 120, y: 80 }, clock.agoraMs());
  jaSalvouOGameOver = false;
  salvar();
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
    const { aquario: carregado, tempoJogoMs } = importarJogo(lido.dados, { config, semente: novaSemente() });
    clock.reiniciar();
    clock.avancar(tempoJogoMs);
    menu.reiniciar();
    aquario = carregado;
    beta = aquario.peixes[0];
    jaSalvouOGameOver = aquario.gameOver;
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

if (!(await carregarJogoSalvo())) novoJogo();

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
  obterPeixe: () => beta,
  obterSalvamento: () => salvamento,
  aoReiniciar: novoJogo,
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
  const { largura, altura } = TAMANHO_POR_FASE[beta.fase];
  seguidor.atualizar(dt, { alvo: { x: beta.x, y: beta.y, largura, altura }, joystick: dir, livre });
  aquario.atualizar(dt, clock.agoraMs());
  if (aquario.gameOver && !jaSalvouOGameOver) {
    jaSalvouOGameOver = true;
    salvar();
  }
  bolhas.atualizar(dt);
  tempoVisual += dt;
  menu.atualizar(dt, aquario);
}

function desenhar() {
  desenharQuadro(quadro, {
    mapa, camera, peixes: aquario.peixes, aquario, config, bolhas: bolhas.lista, plantas, fundo, tempo: tempoVisual,
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
  window.__debug = { camera, seguidor, clock, config, textos, menu, aquario: () => aquario, salvamento, salvar };
}

desenhar();
painel.atualizar(true);
requestAnimationFrame(ciclo);
