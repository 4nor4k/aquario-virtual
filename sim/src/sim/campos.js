// Leitura dos campos numéricos do painel. Função pura, para testar sem navegador.

// Converte o que foi digitado em número entre min e max.
// Devolve null se não der para entender (vazio, letras...): nesse caso o painel ignora a edição.
export function lerNumero(texto, min = 0, max = 100) {
  const limpo = String(texto).trim().replace(',', '.');
  if (limpo === '') return null;
  const n = Number(limpo);
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, n));
}
