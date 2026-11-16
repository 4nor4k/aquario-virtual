// Ajuda para os testes: carrega os números do jogo (o navegador faz isso com fetch;
// nos testes lemos o mesmo arquivo do disco) e traz ferramentas comuns.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { criarAquario } from '../src/core/aquarium.js';
import { HORA_MS, MINUTO_MS } from '../src/core/clock.js';

export const config = JSON.parse(
  readFileSync(new URL('../config/jogo.json', import.meta.url), 'utf8'),
);

// Variações do config para isolar o que cada teste quer medir.
const copia = () => structuredClone(config);

// Indicadores "congelados": fome, sujeira e pH não mudam sozinhos. Para testes de idade.
export const configCalma = (() => {
  const c = copia();
  c.saciedade.horasParaZerar = 1e9;
  c.sujeira.diasParaEncher = 1e9;
  c.ph.horasPorPasso = { sujeiraBaixa: 1e9, sujeiraMedia: 1e9, sujeiraAlta: 1e9 };
  return c;
})();

// Saúde "congelada": os indicadores andam, mas a saúde nunca muda (só a velhice mata).
// Para testes dos indicadores, sem o peixe morrer no meio.
export const configImortal = (() => {
  const c = copia();
  c.saude.faixas = [{ mediaMinima: 0, porHora: 0 }];
  return c;
})();

// Aquário com N peixes e um "relógio" de teste. passar(horas) avança o tempo do jogo
// em passos de `passoMs` (como o laço do jogo faria). agora() diz a hora atual do jogo.
export function montar(peixes = 1, passoMs = 5 * MINUTO_MS, { cfg = config, dadosPeixe = {} } = {}) {
  const aq = criarAquario({ config: cfg });
  for (let i = 0; i < peixes; i++) aq.adicionarPeixe(dadosPeixe, 0);
  let agora = 0;
  aq.atualizar(0, 0);
  return {
    aq,
    agora: () => agora,
    passar(horas) {
      const alvo = agora + horas * HORA_MS;
      while (agora < alvo) {
        agora = Math.min(alvo, agora + passoMs);
        aq.atualizar(0, agora);
      }
    },
  };
}

export function perto(real, esperado, margem, msg) {
  assert.ok(Math.abs(real - esperado) <= margem, `${msg ?? ''} esperado ${esperado}, veio ${real}`);
}
