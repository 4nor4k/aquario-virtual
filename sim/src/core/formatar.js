// Textos curtos que a tela do aparelho também usa (por isso ficam no core, sem navegador).
import { DIA_MS } from './clock.js';
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
