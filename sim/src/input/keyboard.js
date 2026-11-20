// Teclado -> joystick e botões (doc 05, seção 7).
//   Setas ou WASD = joystick     Z = botão A     X = botão B     C = botão C
//
// Duas leituras diferentes:
//   direcao() : o joystick "segurado" (a câmera anda enquanto você segura a tecla);
//   botoes()  : o que foi APERTADO desde a última leitura, uma vez por aperto (o menu usa isto:
//               segurar a seta não pode passar por todos os itens de uma vez).

const TECLAS = {
  esquerda: ['ArrowLeft', 'KeyA'],
  direita: ['ArrowRight', 'KeyD'],
  cima: ['ArrowUp', 'KeyW'],
  baixo: ['ArrowDown', 'KeyS'],
};
const BOTOES = {
  a: ['KeyZ'],
  b: ['KeyX'],
  c: ['KeyC'],
};
const TODAS = new Set([...Object.values(TECLAS).flat(), ...Object.values(BOTOES).flat()]);

export function criarTeclado(alvo) {
  const seguradas = new Set(); // teclas que estão apertadas agora
  const toques = new Set();    // teclas apertadas desde a última leitura de direcao()
  const apertos = new Set();   // teclas apertadas desde a última leitura de botoes() (sem repetição)

  alvo.addEventListener('keydown', (e) => {
    if (!TODAS.has(e.code)) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return; // não rouba atalhos como Ctrl+C ou Alt+seta
    e.preventDefault(); // setas não rolam a página
    seguradas.add(e.code);
    toques.add(e.code);
    if (!e.repeat) apertos.add(e.code); // segurar a tecla não vale como vários apertos
  });
  alvo.addEventListener('keyup', (e) => {
    seguradas.delete(e.code);
  });
  // Se a janela perde o foco, solta tudo (senão a câmera ficaria andando sozinha).
  alvo.addEventListener('blur', () => { seguradas.clear(); toques.clear(); apertos.clear(); });

  const ativa = (nomes) => nomes.some((c) => seguradas.has(c) || toques.has(c));
  const apertou = (nomes) => nomes.some((c) => apertos.has(c));

  return {
    // Direção do "joystick": x e y valem -1, 0 ou 1. Chame uma vez por passo do jogo.
    direcao() {
      const x = (ativa(TECLAS.direita) ? 1 : 0) - (ativa(TECLAS.esquerda) ? 1 : 0);
      const y = (ativa(TECLAS.baixo) ? 1 : 0) - (ativa(TECLAS.cima) ? 1 : 0);
      toques.clear();
      return { x, y };
    },

    // O botão ('a', 'b' ou 'c') está apertado AGORA? (a caçada usa o B segurado para acelerar)
    segurando(botao) {
      return (BOTOES[botao] ?? []).some((c) => seguradas.has(c));
    },

    // O que foi apertado desde a última chamada: { a, b, c, cima, baixo, esquerda, direita }.
    // Chame uma vez por passo do jogo.
    botoes() {
      const lido = {
        a: apertou(BOTOES.a),
        b: apertou(BOTOES.b),
        c: apertou(BOTOES.c),
        cima: apertou(TECLAS.cima),
        baixo: apertou(TECLAS.baixo),
        esquerda: apertou(TECLAS.esquerda),
        direita: apertou(TECLAS.direita),
      };
      apertos.clear();
      return lido;
    },
  };
}
