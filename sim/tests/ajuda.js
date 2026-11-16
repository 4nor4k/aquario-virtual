// Ajuda para os testes: carrega os números do jogo (o navegador faz isso com fetch;
// nos testes lemos o mesmo arquivo do disco).
import { readFileSync } from 'node:fs';

export const config = JSON.parse(
  readFileSync(new URL('../config/jogo.json', import.meta.url), 'utf8'),
);
