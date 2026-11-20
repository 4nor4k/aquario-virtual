// Balanceamento da caçada (doc 14, seção 6): bots jogam 60 s e mostram quantas larvas pegam.
// Rodar (em sim/): node tools/cacada.js
//   "guloso"   : vai atrás da larva mais perto e segura o B quando ela está perto (jogador esperto)
//   "sem B"    : o mesmo, mas nunca acelera
//   "sempre B" : o mesmo, mas com o B sempre apertado
import { readFileSync } from 'node:fs';
import { criarCacada, bocaDoPeixe } from '../src/core/cacada.js';
import { criarRng } from '../src/core/rng.js';
import { criarAquario } from '../src/core/aquarium.js';

const config = JSON.parse(readFileSync(new URL('../config/jogo.json', import.meta.url), 'utf8'));

function direcaoPara(de, para) {
  const dx = para.x - de.x;
  const dy = para.y - de.y;
  return { x: Math.abs(dx) < 2 ? 0 : Math.sign(dx), y: Math.abs(dy) < 2 ? 0 : Math.sign(dy) };
}

function partida(semente, modo) {
  const aq = criarAquario({ config });
  const peixe = aq.adicionarPeixe({ fase: 'adulto', x: 120, y: 80 }, 0);
  const c = criarCacada({ config, rng: criarRng(semente) });
  c.iniciar(peixe);
  const passo = 0.05;
  while (c.fase !== 'fim') {
    const boca = bocaDoPeixe(peixe);
    let alvo = null;
    let melhor = Infinity;
    for (const l of c.larvas) {
      const d = Math.hypot(l.x - boca.x, l.y - boca.y);
      if (d < melhor) { melhor = d; alvo = l; }
    }
    const dir = alvo ? direcaoPara(boca, alvo) : { x: 0, y: 0 };
    const acelerando = modo === 'sempre' || (modo === 'guloso' && melhor < 60);
    c.atualizar(passo, { dir, acelerando });
  }
  return c.pontos;
}

const modos = { guloso: 'guloso (B perto da larva)', semB: 'sem B', sempre: 'sempre B' };
for (const [modo, nome] of Object.entries(modos)) {
  const notas = [];
  for (let s = 1; s <= 40; s++) notas.push(partida(s, modo));
  const media = notas.reduce((a, b) => a + b, 0) / notas.length;
  console.log(`${nome.padEnd(28)} média ${media.toFixed(1)}  (mín ${Math.min(...notas)}, máx ${Math.max(...notas)})`);
}
