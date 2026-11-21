// Junta várias entradas (teclado + toque) numa só, com a mesma forma: direcao(), segurando(), botoes().
// Todas são lidas SEMPRE a cada chamada, porque ler "gasta" os apertos guardados (direcao() e botoes()
// do teclado limpam o que foi apertado desde a última leitura).
export function combinarEntradas(...fontes) {
  return {
    // A primeira fonte que estiver mexendo no joystick manda (as outras ficam em segundo plano).
    direcao() {
      let escolhida = { x: 0, y: 0 };
      let achou = false;
      for (const fonte of fontes) {
        const d = fonte.direcao();
        if (!achou && (d.x !== 0 || d.y !== 0)) {
          escolhida = d;
          achou = true;
        }
      }
      return escolhida;
    },
    segurando(botao) {
      return fontes.some((fonte) => fonte.segurando(botao));
    },
    botoes() {
      const total = { a: false, b: false, c: false, cima: false, baixo: false, esquerda: false, direita: false };
      for (const fonte of fontes) {
        const lido = fonte.botoes();
        for (const nome of Object.keys(total)) total[nome] = total[nome] || Boolean(lido[nome]);
      }
      return total;
    },
  };
}
