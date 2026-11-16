// Teclado -> joystick. Setas ou WASD movem a câmera (doc 05, seção 7).
// Depois entram Z / X / C para os botões A / B / C.

const TECLAS = {
  esquerda: ['ArrowLeft', 'KeyA'],
  direita: ['ArrowRight', 'KeyD'],
  cima: ['ArrowUp', 'KeyW'],
  baixo: ['ArrowDown', 'KeyS'],
};
const TODAS = new Set(Object.values(TECLAS).flat());

export function criarTeclado(alvo) {
  const seguradas = new Set(); // teclas que estão apertadas agora
  const toques = new Set();    // teclas apertadas desde a última leitura (mesmo se já soltas)

  alvo.addEventListener('keydown', (e) => {
    if (!TODAS.has(e.code)) return;
    e.preventDefault(); // setas não rolam a página
    seguradas.add(e.code);
    toques.add(e.code);
  });
  alvo.addEventListener('keyup', (e) => {
    seguradas.delete(e.code);
  });
  // Se a janela perde o foco, solta tudo (senão a câmera ficaria andando sozinha).
  alvo.addEventListener('blur', () => { seguradas.clear(); toques.clear(); });

  const ativa = (nomes) => nomes.some((c) => seguradas.has(c) || toques.has(c));

  return {
    // Direção do "joystick": x e y valem -1, 0 ou 1. Chame uma vez por passo do jogo.
    direcao() {
      const x = (ativa(TECLAS.direita) ? 1 : 0) - (ativa(TECLAS.esquerda) ? 1 : 0);
      const y = (ativa(TECLAS.baixo) ? 1 : 0) - (ativa(TECLAS.cima) ? 1 : 0);
      toques.clear();
      return { x, y };
    },
  };
}
