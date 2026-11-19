// Textos curtos que a tela do aparelho também usa (por isso ficam no core, sem navegador).
import { DIA_MS, MINUTO_MS } from './clock.js';
import { VIDA_NATURAL_DIAS } from './fish.js';

// Em que dia da vida o peixe está: { dia: 12, total: 30 }. Depois dos 30 dias fica no dia 30.
export function diaDaVida(idadeMs) {
  return {
    dia: Math.min(VIDA_NATURAL_DIAS, Math.floor(idadeMs / DIA_MS) + 1),
    total: VIDA_NATURAL_DIAS,
  };
}

// Idade do peixe em texto. Ex.: "dia 12 de 30".
export function formatarIdade(idadeMs) {
  const { dia, total } = diaDaVida(idadeMs);
  return `dia ${dia} de ${total}`;
}

// pH em texto, com vírgula como no Brasil. Ex.: 7 -> "7,0"; 6.2 -> "6,2".
export function formatarPh(valor) {
  return valor.toFixed(1).replace('.', ',');
}

// Troca {nome} pelo valor. Ex.: preencher('pH subiu para {ph}', { ph: '7,2' }) -> "pH subiu para 7,2"
export function preencher(texto, valores) {
  return texto.replace(/\{(\w+)\}/g, (inteiro, nome) => (nome in valores ? String(valores[nome]) : inteiro));
}

// Quanto tempo passou, em texto curto (usado na mensagem "Seu peixe dormiu por ...").
// Menos de 1 min: "menos de 1 min" · menos de 1 h: "45 min" · menos de 1 dia: "5 h 20 min"
// (ou "5 h") · 1 dia ou mais: "2 dias e 3 h" (ou "2 dias"). Sempre arredonda para baixo.
export function formatarDuracao(ms) {
  const minutosTotais = Math.floor(Math.max(0, ms) / MINUTO_MS);
  if (minutosTotais < 1) return 'menos de 1 min';
  const dias = Math.floor(minutosTotais / (24 * 60));
  const horas = Math.floor((minutosTotais % (24 * 60)) / 60);
  const minutos = minutosTotais % 60;
  if (dias >= 1) {
    const d = `${dias} ${dias === 1 ? 'dia' : 'dias'}`;
    return horas > 0 ? `${d} e ${horas} h` : d;
  }
  if (horas >= 1) return minutos > 0 ? `${horas} h ${minutos} min` : `${horas} h`;
  return `${minutos} min`;
}
