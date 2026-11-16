// A câmera: qual pedaço do mundo a janela mostra. Guarda o canto de cima à esquerda da janela.
// No aparelho, quem a move é o joystick; no simulador, o teclado.

export function criarCamera({ mundoLargura, mundoAltura, janelaLargura, janelaAltura, x = 0, y = 0 }) {
  const maxX = Math.max(0, mundoLargura - janelaLargura);
  const maxY = Math.max(0, mundoAltura - janelaAltura);
  let cx = limitar(x, 0, maxX);
  let cy = limitar(y, 0, maxY);

  return {
    get x() { return cx; },
    get y() { return cy; },
    get maxX() { return maxX; },
    get maxY() { return maxY; },

    // Move a câmera, sem deixar sair do mundo.
    mover(dx, dy) {
      cx = limitar(cx + dx, 0, maxX);
      cy = limitar(cy + dy, 0, maxY);
    },

    irPara(nx, ny) {
      cx = limitar(nx, 0, maxX);
      cy = limitar(ny, 0, maxY);
    },
  };
}

function limitar(v, min, max) {
  return Math.min(max, Math.max(min, v));
}
