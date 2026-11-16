// Formas simples para desenhar no quadro de 120×120 (caixas dos menus, barras, emblemas).
// Tudo é cortado na borda da tela: o que sai para fora é ignorado.
import { LARGURA, ALTURA } from './tela.js';

export function pixel(quadro, x, y, cor) {
  if (x < 0 || x >= LARGURA || y < 0 || y >= ALTURA) return;
  quadro[y * LARGURA + x] = cor;
}

// Retângulo cheio com o canto de cima à esquerda em (x, y).
export function preencherRetangulo(quadro, x, y, largura, altura, cor) {
  for (let py = y; py < y + altura; py++) {
    for (let px = x; px < x + largura; px++) pixel(quadro, px, py, cor);
  }
}

// Só a borda de 1 pixel de um retângulo.
export function contornoRetangulo(quadro, x, y, largura, altura, cor) {
  for (let px = x; px < x + largura; px++) {
    pixel(quadro, px, y, cor);
    pixel(quadro, px, y + altura - 1, cor);
  }
  for (let py = y; py < y + altura; py++) {
    pixel(quadro, x, py, cor);
    pixel(quadro, x + largura - 1, py, cor);
  }
}
