// Toque -> joystick e botões (doc 15, seção 3.1). Tem a mesma "forma" do teclado (keyboard.js):
//   direcao()  : o analógico "segurado" agora, { x, y } de -1 a 1 (contínuo; o teclado dá só -1, 0 ou 1);
//   segurando(): o botão ('a', 'b' ou 'c') está apertado agora?
//   botoes()   : o que foi APERTADO desde a última leitura (uma vez por aperto), inclusive cima/baixo/
//                esquerda/direita, que o menu usa para escolher itens: o analógico "aperta" uma direção
//                quando passa de um ponto e só aperta de novo depois de voltar para perto do centro.
//
// Este arquivo tem duas partes: a LÓGICA (criarControlesToque, sem navegador, com testes) e a LIGAÇÃO
// com os elementos da página (ligarToque, que só traduz eventos de ponteiro).

export const ZONA_MORTA = 0.15;      // até aqui o analógico conta como centro (o dedo nunca fica parado)
const LIMITE_APERTO = 0.6;           // empurrou até aqui: conta como "apertou a seta"
const LIMITE_SOLTAR = 0.4;           // só volta a poder apertar depois de cair abaixo disto (evita tremer)

// Transforma o quanto o dedo saiu do centro (dx, dy em pixels) numa direção de comprimento 0 a 1.
// raio = a distância do centro até a borda do analógico. Dentro da zona morta dá (0, 0).
export function lerAnalogico(dx, dy, raio, zonaMorta = ZONA_MORTA) {
  const distancia = Math.hypot(dx, dy);
  if (!(raio > 0) || distancia === 0) return { x: 0, y: 0 };
  const m = distancia / raio;
  if (m <= zonaMorta) return { x: 0, y: 0 };
  const forca = Math.min(1, (m - zonaMorta) / (1 - zonaMorta)); // a zona morta sai da conta: começa em 0
  return { x: (dx / distancia) * forca || 0, y: (dy / distancia) * forca || 0 }; // "|| 0" troca -0 por 0
}

export function criarControlesToque() {
  let analogico = { x: 0, y: 0 };
  let direcaoApertada = null;          // a seta que o analógico está "segurando" (para detectar o aperto)
  const seguradas = new Set();         // botões apertados agora
  const apertos = new Set();           // apertos desde a última leitura de botoes()

  // Qual das quatro setas o analógico está apontando (a do eixo mais forte), ou null.
  function setaDoAnalogico() {
    const ax = Math.abs(analogico.x);
    const ay = Math.abs(analogico.y);
    const limite = direcaoApertada ? LIMITE_SOLTAR : LIMITE_APERTO;
    if (Math.max(ax, ay) < limite) return null;
    if (ax >= ay) return analogico.x > 0 ? 'direita' : 'esquerda';
    return analogico.y > 0 ? 'baixo' : 'cima';
  }

  return {
    // x e y de -1 a 1 (já sem a zona morta; ver lerAnalogico).
    definirAnalogico(x, y) {
      analogico = { x, y };
      const seta = setaDoAnalogico();
      if (seta && seta !== direcaoApertada) apertos.add(seta);
      direcaoApertada = seta;
    },
    soltarAnalogico() {
      analogico = { x: 0, y: 0 };
      direcaoApertada = null;
    },
    apertarBotao(botao) {
      seguradas.add(botao);
      apertos.add(botao); // toque rápido (apertar e soltar antes da leitura) ainda conta uma vez
    },
    soltarBotao(botao) {
      seguradas.delete(botao);
    },
    // Quando a página perde o foco: solta tudo, senão o peixe ficaria nadando sozinho.
    soltarTudo() {
      this.soltarAnalogico();
      seguradas.clear();
      apertos.clear();
    },

    direcao() {
      return { x: analogico.x, y: analogico.y };
    },
    segurando(botao) {
      return seguradas.has(botao);
    },
    botoes() {
      const lido = {
        a: apertos.has('a'),
        b: apertos.has('b'),
        c: apertos.has('c'),
        cima: apertos.has('cima'),
        baixo: apertos.has('baixo'),
        esquerda: apertos.has('esquerda'),
        direita: apertos.has('direita'),
      };
      apertos.clear();
      return lido;
    },
  };
}

// Liga os elementos da página aos controles. Cada dedo é um "ponteiro" com número próprio, então o
// analógico e os botões funcionam ao mesmo tempo (multitoque: segurar B e mexer o analógico).
//   elementos = { base, botoes: { a, b, c } }   (base = o disco do analógico)
//   aoAnalogico({ x, y }) : avisa onde o dedo está (-1 a 1, sem zona morta) para a página mover a bolinha
export function ligarToque({ base, botoes }, controles, { aoAnalogico = () => {}, janela = null } = {}) {
  let dedoDoAnalogico = null;

  function seguirDedo(e) {
    const caixa = base.getBoundingClientRect();
    const raio = caixa.width / 2;
    const dx = e.clientX - (caixa.left + raio);
    const dy = e.clientY - (caixa.top + caixa.height / 2);
    const v = lerAnalogico(dx, dy, raio);
    controles.definirAnalogico(v.x, v.y);
    // Para desenhar a bolinha: onde o dedo está, preso ao círculo.
    const m = Math.hypot(dx, dy) / raio;
    const k = m > 1 ? 1 / m : 1;
    aoAnalogico({ x: (dx / raio) * k, y: (dy / raio) * k });
  }

  base.addEventListener('pointerdown', (e) => {
    if (dedoDoAnalogico !== null) return;
    e.preventDefault();
    dedoDoAnalogico = e.pointerId;
    base.setPointerCapture?.(e.pointerId);
    seguirDedo(e);
  });
  base.addEventListener('pointermove', (e) => {
    if (e.pointerId !== dedoDoAnalogico) return;
    seguirDedo(e);
  });
  const largarAnalogico = (e) => {
    if (e.pointerId !== dedoDoAnalogico) return;
    dedoDoAnalogico = null;
    controles.soltarAnalogico();
    aoAnalogico({ x: 0, y: 0 });
  };
  base.addEventListener('pointerup', largarAnalogico);
  base.addEventListener('pointercancel', largarAnalogico);

  for (const [nome, elemento] of Object.entries(botoes)) {
    let dedo = null;
    elemento.addEventListener('pointerdown', (e) => {
      if (dedo !== null) return;
      e.preventDefault();
      dedo = e.pointerId;
      elemento.setPointerCapture?.(e.pointerId);
      controles.apertarBotao(nome);
    });
    const largar = (e) => {
      if (e.pointerId !== dedo) return;
      dedo = null;
      controles.soltarBotao(nome);
    };
    elemento.addEventListener('pointerup', largar);
    elemento.addEventListener('pointercancel', largar);
  }

  // Aba escondida ou janela sem foco: solta tudo.
  if (janela) {
    janela.addEventListener('blur', () => {
      dedoDoAnalogico = null;
      controles.soltarTudo();
      aoAnalogico({ x: 0, y: 0 });
    });
  }
}
