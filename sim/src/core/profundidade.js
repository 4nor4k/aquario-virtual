// Por onde o peixe passa (doc 04, "Profundidade"): às vezes atrás das algas gigantes e da pedra
// grande, às vezes na frente. Aqui só se SORTEIA o plano; quem desenha e quem decide quando dá
// para trocar sem o peixe "pular" é a interface (render/profundidade.js).
//
// cfg = config.profundidade: { chanceNoFundo, chanceNoMeio }. O resto das vezes é na frente.
//   fundo  = atrás da pedra grande (e das algas)
//   meio   = na frente da pedra grande, atrás das algas gigantes
//   frente = na frente de tudo
export function sortearPlano(rng, cfg) {
  const sorteio = rng.decimal();
  if (sorteio < cfg.chanceNoFundo) return 'fundo';
  if (sorteio < cfg.chanceNoFundo + cfg.chanceNoMeio) return 'meio';
  return 'frente';
}
