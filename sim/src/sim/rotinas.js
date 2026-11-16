// Simula um peixe vivendo com uma rotina de cuidado, do nascimento até morrer (ou até o limite).
// Serve para ajustar o balanceamento: mexa em config/jogo.json e veja quantos dias ele aguenta
// (ferramenta: node tools/balanco.js). Não existe no aparelho.
import { criarAquario } from '../core/aquarium.js';
import { HORA_MS, MINUTO_MS } from '../core/clock.js';

const PASSO_MS = 10 * MINUTO_MS; // o jogo é simulado de 10 em 10 minutos

// rotina: de quantas em quantas HORAS faz cada cuidado (ausente ou 0 = nunca).
//   comidaH, limparH, phH, e maxDias (limite da simulação, padrão 40).
// Devolve { doenteDias, morteDias, causa }; doenteDias e morteDias são null se não aconteceu.
export function viverComRotina(config, { comidaH, limparH, phH, maxDias = 40 } = {}) {
  const aquario = criarAquario({ config });
  const peixe = aquario.adicionarPeixe({}, 0);
  let agora = 0;
  let horas = 0;
  let doenteH = null;
  aquario.atualizar(0, 0);

  while (!aquario.gameOver && horas < maxDias * 24) {
    for (let t = 0; t < HORA_MS; t += PASSO_MS) {
      agora += PASSO_MS;
      aquario.atualizar(0, agora);
    }
    horas += 1;
    if (peixe.estado === 'doente' && doenteH === null) doenteH = horas;
    if (comidaH && horas % comidaH === 0) aquario.darComida();
    if (limparH && horas % limparH === 0) aquario.limparAquario();
    if (phH && horas % phH === 0) aquario.regularPh();
  }

  return {
    doenteDias: doenteH === null ? null : doenteH / 24,
    morteDias: aquario.gameOver ? horas / 24 : null,
    causa: peixe.causaDaMorte,
  };
}
