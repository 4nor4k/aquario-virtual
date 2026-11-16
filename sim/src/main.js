// Liga as partes do simulador e roda o laço do jogo.
import { criarQuadro, mostrarQuadro, LARGURA, ALTURA } from './render/tela.js';
import { criarCamera } from './render/camera.js';
import { gerarMapa } from './render/cenario.js';
import { desenharQuadro } from './render/scene.js';
import { criarTeclado } from './input/keyboard.js';
import { criarPainel } from './sim/panel.js';
import { MUNDO_LARGURA, MUNDO_ALTURA } from './core/mundo.js';
import { criarAquario } from './core/aquarium.js';
import { criarClock } from './core/clock.js';

const PASSO_MS = 50;           // passo fixo: 20 por segundo (igual no ESP32)
const VELOCIDADE_CAMERA = 60;  // pixels por segundo

const canvas = document.getElementById('tela');
const ctx = canvas.getContext('2d');

const quadro = criarQuadro();
const mapa = gerarMapa();
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

// O relógio do jogo: no simulador a fonte é o tempo do navegador e pode ser acelerado.
const clock = criarClock(() => performance.now());

let aquario;
let beta;
let numeroDoJogo = 0;

// Os números do jogo ficam em config/jogo.json. O core não lê arquivos, então é aqui que
// o navegador carrega o JSON e entrega pronto.
const respostaConfig = await fetch('config/jogo.json');
if (!respostaConfig.ok) throw new Error(`Não consegui carregar config/jogo.json (${respostaConfig.status})`);
const config = await respostaConfig.json();

// Começa (ou recomeça) com um filhote novo e o relógio em zero.
function novoJogo() {
  numeroDoJogo++;
  clock.reiniciar();
  aquario = criarAquario({ semente: numeroDoJogo, config });
  beta = aquario.adicionarPeixe({ nome: 'Beta', especie: 'beta', x: 180, y: 150 }, clock.agoraMs());
}
novoJogo();

const painel = criarPainel({
  clock,
  camera,
  obterAquario: () => aquario,
  obterPeixe: () => beta,
  aoReiniciar: novoJogo,
});

// Um passo do jogo (dt em segundos reais).
function atualizar(dt) {
  const dir = teclado.direcao();
  camera.mover(dir.x * VELOCIDADE_CAMERA * dt, dir.y * VELOCIDADE_CAMERA * dt);
  aquario.atualizar(dt, clock.agoraMs());
}

function desenhar() {
  desenharQuadro(quadro, { mapa, camera, peixes: aquario.peixes, aquario, config });
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
  window.__debug = { camera, clock, config, aquario: () => aquario };
}

desenhar();
painel.atualizar(true);
requestAnimationFrame(ciclo);
