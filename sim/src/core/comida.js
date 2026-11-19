// A comida do aquário: grãos que caem devagar e os peixes vão atrás (doc 03, "Comida").
// Os grãos são só movimento e tempo REAL (como o nado), não entram no arquivo salvo: duram
// poucos segundos. Quando um peixe come um grão, quem aplica o efeito é rules.js (peixeComeu).
import { SUPERFICIE_Y, AREIA_Y, MUNDO_LARGURA } from './mundo.js';
import { TAMANHO_POR_FASE } from './fish.js';
import { peixeComeu, sujar } from './rules.js';

// Os grãos nascem um pouco acima da água (jogados de cima) e param em cima da areia.
export const GRAO_Y_INICIAL = SUPERFICIE_Y - 6;
export const GRAO_Y_AREIA = AREIA_Y - 2;
const MARGEM_X = 4;      // os grãos não caem colados na parede
const BALANCO = 1.5;     // quanto o grão balança de um lado ao outro, em pixels
const VELOCIDADE_BALANCO = 2.2;

// Solta os grãos de uma porção. Cada um espera um tempinho para cair (um depois do outro).
// centroX: onde a mão joga a comida; rng: o sorteio da comida (separado do nado).
// Devolve quantos grãos entraram na água (o limite do config pode cortar alguns).
export function soltarGraos(graos, { centroX, config, rng }) {
  const cfg = config.comida;
  let entraram = 0;
  for (let i = 0; i < cfg.graos && graos.length < cfg.maximoNaAgua; i++) {
    const x = Math.round(centroX) + rng.inteiro(-cfg.espalhamentoX, cfg.espalhamentoX);
    const baseX = Math.min(MUNDO_LARGURA - MARGEM_X, Math.max(MARGEM_X, x));
    graos.push({
      x: baseX,
      baseX,
      y: GRAO_Y_INICIAL,
      espera: i * cfg.intervaloEntreGraosSeg, // segundos até aparecer
      tempo: 0,                               // segundos desde que apareceu (balanço)
      fase: rng.inteiro(0, 628) / 100,        // cada grão balança em um ponto diferente
      naAreia: false,
      segundosNaAreia: 0,
    });
    entraram++;
  }
  return entraram;
}

// Só o que já apareceu e já está na água pode ser perseguido.
export function visivel(grao) {
  return grao.espera <= 0;
}

export function graoNaAgua(grao) {
  return visivel(grao) && grao.y >= SUPERFICIE_Y;
}

// O grão mais perto do peixe (ou null se não há nenhum na água).
export function graoMaisPerto(peixe, graos) {
  let melhor = null;
  let menor = Infinity;
  for (const g of graos) {
    if (!graoNaAgua(g)) continue;
    const d = (g.x - peixe.x) ** 2 + (g.y - peixe.y) ** 2;
    if (d < menor) {
      menor = d;
      melhor = g;
    }
  }
  return melhor;
}

// O grão encostou no corpo do peixe? (o peixe é um retângulo em volta do centro dele)
export function peixeAlcancaGrao(peixe, grao) {
  const { largura, altura } = TAMANHO_POR_FASE[peixe.fase];
  return Math.abs(grao.x - peixe.x) <= largura / 2 && Math.abs(grao.y - peixe.y) <= altura / 2 + 1;
}

// Um passo da comida (dt em segundos reais): os grãos caem, os peixes vivos comem o que alcançam
// e o que sobra na areia some depois de um tempo, sujando a água.
export function atualizarGraos(aquario, dt, config, agoraMs = 0) {
  const cfg = config.comida;
  const graos = aquario.graos;
  const vivos = aquario.vivos();

  for (let i = graos.length - 1; i >= 0; i--) {
    const g = graos[i];
    if (g.espera > 0) {
      g.espera -= dt;
      continue;
    }

    if (!g.naAreia) {
      g.tempo += dt;
      g.y = Math.min(GRAO_Y_AREIA, g.y + cfg.velocidadeQueda * dt);
      g.x = g.baseX + BALANCO * Math.sin(g.fase + g.tempo * VELOCIDADE_BALANCO);
      if (g.y >= GRAO_Y_AREIA) g.naAreia = true;
    } else {
      g.segundosNaAreia += dt;
    }

    // Quem estiver mais perto come primeiro; basta um peixe alcançar.
    const comedor = graoNaAgua(g) ? vivos.find((p) => peixeAlcancaGrao(p, g)) : undefined;
    if (comedor) {
      peixeComeu(aquario, comedor, config, agoraMs);
      graos.splice(i, 1);
    } else if (g.naAreia && g.segundosNaAreia >= cfg.segundosNaAreia) {
      sujar(aquario, config.sujeira.porGraoPerdido, agoraMs, config);
      graos.splice(i, 1);
    }
  }
}
