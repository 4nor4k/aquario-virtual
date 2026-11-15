// Liga as partes do simulador. Passo 1: só mostra a paleta de 16 cores.
import { criarQuadro, mostrarQuadro, LARGURA, ALTURA } from './render/tela.js';

const canvas = document.getElementById('tela');
const ctx = canvas.getContext('2d');

// Grade 4×4: cada cor ocupa um quadrado de 30×30 pixels.
const quadro = criarQuadro();
const LADO = LARGURA / 4;
for (let y = 0; y < ALTURA; y++) {
  for (let x = 0; x < LARGURA; x++) {
    const cor = Math.floor(y / LADO) * 4 + Math.floor(x / LADO);
    quadro[y * LARGURA + x] = cor;
  }
}
mostrarQuadro(ctx, quadro);
