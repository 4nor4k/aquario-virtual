// Textos do painel. Funções puras (só recebem números e devolvem texto), fáceis de testar.
import { DIA_MS, HORA_MS, MINUTO_MS } from '../core/clock.js';

// A idade em texto também é usada na tela do aparelho, então mora no core.
export { formatarIdade } from '../core/formatar.js';

const doisDigitos = (n) => String(n).padStart(2, '0');

// Hora do jogo desde o começo. Ex.: 11 dias, 8 h e 30 min -> "Dia 12 · 08:30"
export function formatarHoraDoJogo(ms) {
  const dia = Math.floor(ms / DIA_MS) + 1;
  const resto = ms % DIA_MS;
  const horas = Math.floor(resto / HORA_MS);
  const minutos = Math.floor((resto % HORA_MS) / MINUTO_MS);
  return `Dia ${dia} · ${doisDigitos(horas)}:${doisDigitos(minutos)}`;
}
