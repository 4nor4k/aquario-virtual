// Sorteio com semente (algoritmo mulberry32).
// Com a mesma semente, sai sempre a mesma sequência: isso permite testar o jogo e,
// na Fase B, conferir se o C++ sorteia igual ao JavaScript.
// Só usa inteiros de 32 bits, então traduz quase linha a linha para C++.

export function criarRng(semente) {
  let estado = semente >>> 0; // força inteiro de 32 bits sem sinal

  // Próximo número inteiro entre 0 e 4294967295.
  function proximo() {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  }

  // Inteiro entre min e max, os dois incluídos. Ex.: inteiro(1, 3) dá 1, 2 ou 3.
  function inteiro(min, max) {
    if (!Number.isInteger(min) || !Number.isInteger(max) || min > max) {
      throw new RangeError(`inteiro(${min}, ${max}): intervalo inválido`);
    }
    return min + (proximo() % (max - min + 1));
  }

  // Número entre 0 (incluído) e 1 (excluído).
  function decimal() {
    return proximo() / 4294967296;
  }

  return { proximo, inteiro, decimal };
}
