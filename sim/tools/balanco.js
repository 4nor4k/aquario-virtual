// Mostra quanto tempo o peixe aguenta em cada rotina de cuidado, com os números do config.
// Uso (dentro de sim/):
//   node tools/balanco.js                  usa config/jogo.json
//   node tools/balanco.js outro-jogo.json  usa outro arquivo (para comparar ideias sem mexer no oficial)
// Edite config/jogo.json, rode de novo e veja o efeito.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { viverComRotina } from '../src/sim/rotinas.js';

const arquivo = resolve(process.argv[2] ?? fileURLToPath(new URL('../config/jogo.json', import.meta.url)));
const config = JSON.parse(readFileSync(arquivo, 'utf8'));

const ROTINAS = [
  ['Nenhum cuidado', {}],
  ['Só comida, 1 vez por dia', { comidaH: 24 }],
  ['Comida diária; limpar e pH a cada 2 dias', { comidaH: 24, limparH: 48, phH: 48 }],
  ['Comida diária; limpar e pH a cada 3 dias', { comidaH: 24, limparH: 72, phH: 72 }],
  ['Comida diária; limpar e pH a cada 4 dias', { comidaH: 24, limparH: 96, phH: 96 }],
  ['Comida diária; limpar e pH a cada 7 dias', { comidaH: 24, limparH: 168, phH: 168 }],
];
const CAUSAS = { velhice: 'velhice', cuidado: 'falta de cuidado' };
const dias = (d) => (d === null ? '—' : `${d.toFixed(1).replace('.', ',')} dias`);

console.log(`Config: ${arquivo}\n`);
console.log('Rotina'.padEnd(46) + 'Fica doente'.padEnd(14) + 'Morre');
for (const [nome, rotina] of ROTINAS) {
  const r = viverComRotina(config, rotina);
  const morte = r.morteDias === null ? 'não morre em 40 dias' : `${dias(r.morteDias)} (${CAUSAS[r.causa]})`;
  console.log(nome.padEnd(46) + dias(r.doenteDias).padEnd(14) + morte);
}
console.log('\nA vida natural é de 30 dias: quem chega lá morre de velhice.');
