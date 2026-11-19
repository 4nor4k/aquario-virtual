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

// A hora do dia (em minutos, de 0 a 1440) como "14:32".
export function formatarHoraDoDia(minutos) {
  const total = Math.floor(((minutos % 1440) + 1440) % 1440);
  return `${doisDigitos(Math.floor(total / 60))}:${doisDigitos(total % 60)}`;
}

// O que está valendo no clima agora, para a linha do painel.
// Ex.: "Hora 14:32 · chuva: não · 24 °C · frio: não". O que o painel forçou aparece marcado.
export function formatarEstadoDoClima(clima) {
  const forcada = (valor) => (valor !== null ? ' (forçada)' : '');
  const modo = { relogio: '', ciclo: ' (ciclo rápido)', fixa: ' (fixa)' }[clima.modoHora];
  return [
    `Hora ${formatarHoraDoDia(clima.horaMin)}${modo}`,
    `chuva: ${clima.chuva ? 'sim' : 'não'}${forcada(clima.chuvaForcada)}`,
    `${Math.round(clima.temperatura)} °C${forcada(clima.temperaturaForcada)}`,
    `frio: ${clima.frio ? 'sim' : 'não'}`,
  ].join(' · ');
}
