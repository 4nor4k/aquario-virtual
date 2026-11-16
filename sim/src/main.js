// Liga as partes do simulador e roda o laço do jogo.
import { criarQuadro, mostrarQuadro, LARGURA, ALTURA } from './render/tela.js';
import { criarCamera } from './render/camera.js';
import { gerarMapa } from './render/cenario.js';
import { desenharQuadro } from './render/scene.js';
import { criarTeclado } from './input/keyboard.js';
import { MUNDO_LARGURA, MUNDO_ALTURA } from './core/aquarium.js';

const PASSO_MS = 50;           // passo fixo: 20 por segundo (igual no ESP32)
const VELOCIDADE_CAMERA = 60;  // pixels por segundo

const canvas = document.getElementById('tela');
const ctx = canvas.getContext('2d');
const textoCamera = document.getElementById('camera');

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

// Um passo do jogo (dt em segundos).
function atualizar(dt) {
  const dir = teclado.direcao();
  camera.mover(dir.x * VELOCIDADE_CAMERA * dt, dir.y * VELOCIDADE_CAMERA * dt);
}

function desenhar() {
  desenharQuadro(quadro, { mapa, camera });
  mostrarQuadro(ctx, quadro);
  textoCamera.textContent =
    `Câmera: x ${Math.round(camera.x)} de ${camera.maxX} · y ${Math.round(camera.y)} de ${camera.maxY}`;
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
  requestAnimationFrame(ciclo);
}

desenhar();
requestAnimationFrame(ciclo);
