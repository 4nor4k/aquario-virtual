// Câmera automática: quando o jogador some (AFK) e o peixe sai da tela, a câmera vai atrás dele.
//
// Regra:
//   1. O peixe fica TODO fora da janela por 5 segundos seguidos  ->  a câmera começa a seguir.
//   2. Ela segue por 10 segundos e então para (fica onde parou).
//   3. Mexer o joystick cancela tudo e zera a contagem.
//   4. Com o menu aberto (câmera não livre) a contagem fica congelada.
//
// Os tempos são em segundos REAIS (dt do laço), não do relógio acelerado do jogo.
// O módulo não conhece o DOM nem o relógio: recebe o dt, então é testável e vale igual no ESP32.

export const ESPERA_FORA_S = 5;        // peixe fora da tela por tanto tempo...
export const DURACAO_SEGUIR_S = 10;    // ...e a câmera o segue por tanto tempo
export const VELOCIDADE_MAXIMA = 60;   // pixels por segundo (a mesma do joystick)
export const SUAVIDADE = 1.5;          // quanto maior, mais rápido ela "cola" no peixe

export function criarSeguidorDeCamera({
  camera,
  janelaLargura,
  janelaAltura,
  esperaForaS = ESPERA_FORA_S,
  duracaoSeguirS = DURACAO_SEGUIR_S,
}) {
  let seguindo = false;
  let tempoFora = 0;     // há quanto tempo o peixe está fora da tela
  let tempoSeguindo = 0; // há quanto tempo estamos seguindo

  function peixeForaDaTela(alvo) {
    const metaL = (alvo.largura ?? 0) / 2;
    const metaA = (alvo.altura ?? 0) / 2;
    return (
      alvo.x + metaL <= camera.x ||
      alvo.x - metaL >= camera.x + janelaLargura ||
      alvo.y + metaA <= camera.y ||
      alvo.y - metaA >= camera.y + janelaAltura
    );
  }

  function parar() {
    seguindo = false;
    tempoFora = 0;
    tempoSeguindo = 0;
  }

  // Um passo. alvo = { x, y, largura, altura } do peixe (x,y = centro). joystick = { x, y }.
  // livre = false quando o menu está aberto.
  function atualizar(dt, { alvo, joystick = { x: 0, y: 0 }, livre = true }) {
    if (!livre) return;

    if (joystick.x !== 0 || joystick.y !== 0) {
      parar();
      return;
    }

    if (!seguindo) {
      tempoFora = peixeForaDaTela(alvo) ? tempoFora + dt : 0;
      if (tempoFora < esperaForaS) return;
      seguindo = true;
      tempoSeguindo = 0;
    }

    // Seguindo: anda em direção ao peixe, devagar ao chegar perto (sem trancos).
    const dx = alvo.x - janelaLargura / 2 - camera.x;
    const dy = alvo.y - janelaAltura / 2 - camera.y;
    const distancia = Math.hypot(dx, dy);
    if (distancia > 0) {
      const passo = Math.min(distancia, Math.min(VELOCIDADE_MAXIMA, distancia * SUAVIDADE) * dt);
      camera.mover((dx / distancia) * passo, (dy / distancia) * passo);
    }

    tempoSeguindo += dt;
    if (tempoSeguindo >= duracaoSeguirS) parar();
  }

  return {
    atualizar,
    get seguindo() { return seguindo; },
    get tempoFora() { return tempoFora; },
  };
}
