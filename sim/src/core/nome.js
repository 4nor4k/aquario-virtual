// O nome do peixe (doc 06, seção 3.3: até 12 caracteres, pode repetir).
// O aparelho só consegue desenhar o que a fonte de pixels tem; quem sabe isso é a interface,
// que entrega uma função `aceita(letra)`. O core só aplica as regras.

// bruto: o que a pessoa digitou. cfgNome: config.nome ({ padrao, maximo }).
// aceita: devolve true para cada caractere permitido (por padrão, todos).
// Regras: espaços repetidos viram um só, as pontas são cortadas, o que não é aceito sai,
// passou do máximo é cortado, e vazio vira o nome padrão.
export function normalizarNome(bruto, cfgNome, aceita = () => true) {
  const letras = [...String(bruto ?? '').normalize('NFC').replace(/\s+/g, ' ')].filter((c) => aceita(c));
  const limpo = letras.join('').trim();
  const cortado = [...limpo].slice(0, cfgNome.maximo).join('').trim();
  return cortado || cfgNome.padrao;
}
