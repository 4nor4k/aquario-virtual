// Avisos do jogo para a interface (doc 05, módulo "events").
// O core só ANOTA o que aconteceu ("peixe adoeceu", "peixe morreu", "game over"...);
// quem mostra mensagem, toca som ou troca de tela é a interface, que retira a fila
// uma vez por passo. No ESP32 é o mesmo caminho que vai tocar o buzzer.
//
// Tipos de evento usados até agora:
//   { tipo: 'adoeceu',   peixeId }
//   { tipo: 'recuperou', peixeId }
//   { tipo: 'morreu',    peixeId, causa }   causa: 'velhice' ou 'cuidado'
//   { tipo: 'gameOver',  causa }            causa da morte do último peixe
export function criarEventos() {
  let fila = [];
  return {
    registrar(evento) {
      fila.push(evento);
    },
    // Devolve tudo o que aconteceu desde a última retirada e esvazia a fila.
    retirar() {
      const retirados = fila;
      fila = [];
      return retirados;
    },
  };
}
