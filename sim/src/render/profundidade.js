// Profundidade do peixe (doc 04, "Profundidade"): ele passa atrás ou na frente das algas gigantes
// e da pedra grande. O plano sorteado fica em peixe.planoDesejado (core/profundidade.js); aqui se
// decide QUANDO dá para trocar.
//
// Se o peixe trocasse de plano enquanto está em cima de uma folha, ele "pularia" para a frente (ou
// para trás) dela de uma hora para outra. Por isso o plano só muda quando o corpo dele NÃO toca em
// nenhum pixel do que mudaria de camada. Os pixels são conferidos de verdade (a silhueta das
// folhas e da pedra), não uma caixa em volta: o peixe pode estar entre duas folhas.
//
// Camadas (de trás para a frente): pedra pequena do fundo, PEDRA GRANDE, plantas escuras, cenário,
// ALGAS GRANDES (e as plantas pequenas), névoa, peixe da frente.
//   fundo  : atrás da pedra grande  · meio : na frente da pedra, atrás das algas  · frente : na frente
import { AREIA_Y } from '../core/mundo.js';
import { TAMANHO_POR_FASE } from '../core/fish.js';
import { MODELOS_GRANDES } from './plantas.js';
import { PEDRA_GRANDE } from './pedra-grande.js';
import { deslocamentoDoFundo } from './fundo.js';

const MARGEM = 2; // folga em volta do corpo (as folhas balançam um pouco)

// Algum pixel desenhado (não zero) do desenho \`modelo\`, posto em (ox, oy), cai dentro do retângulo?
function tocaPixel(modelo, ox, oy, x0, y0, x1, y1) {
  const { largura, altura, pix } = modelo;
  const de = Math.max(x0, ox);
  const ate = Math.min(x1, ox + largura);
  const cima = Math.max(y0, oy);
  const baixo = Math.min(y1, oy + altura);
  for (let y = cima; y < baixo; y++) {
    for (let x = de; x < ate; x++) {
      if (pix[(y - oy) * largura + (x - ox)] !== 0) return true;
    }
  }
  return false;
}

// O corpo do peixe toca em alguma alga gigante?
export function peixeSobreAlgaGrande(peixe, { plantas, camera }) {
  const { x0, y0, x1, y1, cx, cy } = retanguloDoPeixe(peixe, camera);
  for (const p of plantas) {
    const modelo = MODELOS_GRANDES[p.modelo];
    if (!modelo) continue;
    const ox = p.x - Math.floor(modelo.largura / 2) - cx;
    const oy = AREIA_Y - modelo.altura + 1 - cy;
    if (tocaPixel(modelo, ox, oy, x0, y0, x1, y1)) return true;
  }
  return false;
}

// O corpo do peixe toca na pedra grande (como ela aparece na tela, com o paralaxe)?
export function peixeSobrePedraGrande(peixe, { fundo, camera }) {
  if (!fundo || !fundo.pedraGrande) return false;
  const { x0, y0, x1, y1, cy } = retanguloDoPeixe(peixe, camera);
  const ox = fundo.pedraGrande.x - Math.floor(PEDRA_GRANDE.largura / 2) - deslocamentoDoFundo(camera);
  const oy = AREIA_Y - cy - PEDRA_GRANDE.altura + 1;
  return tocaPixel(PEDRA_GRANDE, ox, oy, x0, y0, x1, y1);
}

// Onde a pedra grande está AGORA, em coordenadas do mundo, para o peixe se abrigar perto dela quando chove
// (core/abrigo.js). A pedra anda a 85% da câmera (paralaxe), então o centro dela na tela é o x dela menos o
// deslocamento do fundo, e somando o x da câmera sai o x do mundo onde o peixe tem de estar para ficar atrás
// dela. Devolve { x, meiaLargura } (o centro e a meia largura da pedra) ou null se não há pedra grande.
export function abrigoDaPedraGrande({ fundo, camera }) {
  if (!fundo || !fundo.pedraGrande) return null;
  return {
    x: fundo.pedraGrande.x - deslocamentoDoFundo(camera) + Math.round(camera.x),
    meiaLargura: PEDRA_GRANDE.largura / 2,
  };
}

// O retângulo do corpo do peixe na tela, com a folga.
function retanguloDoPeixe(peixe, camera) {
  const cx = Math.round(camera.x);
  const cy = Math.round(camera.y);
  const { largura, altura } = TAMANHO_POR_FASE[peixe.fase];
  const x0 = Math.round(peixe.x - largura / 2) - cx - MARGEM;
  const y0 = Math.round(peixe.y - altura / 2) - cy - MARGEM;
  return { x0, y0, x1: x0 + largura + 2 * MARGEM, y1: y0 + altura + 2 * MARGEM, cx, cy };
}

// Trocar de \`de\` para \`para\` muda o peixe de lado em relação às algas? E em relação à pedra?
const ALGAS = (plano) => plano === 'frente' ? 1 : 0; // na frente das algas (1) ou atrás (0)
const PEDRA = (plano) => plano === 'fundo' ? 0 : 1;  // na frente da pedra (1) ou atrás (0)

// Dá para trocar agora sem o peixe pular? (função pura, para testar)
export function podeTrocarDePlano(peixe, de, para, contexto) {
  if (ALGAS(de) !== ALGAS(para) && peixeSobreAlgaGrande(peixe, contexto)) return false;
  if (PEDRA(de) !== PEDRA(para) && peixeSobrePedraGrande(peixe, contexto)) return false;
  return true;
}

// Atualiza o plano de cada peixe: se o sorteado é outro e já dá para trocar, troca.
// contexto: { plantas, fundo, camera } (as mesmas coisas que a cena desenha).
export function atualizarPlanos(peixes, contexto) {
  for (const peixe of peixes) {
    if (peixe.estado === 'morto') {
      peixe.plano = 'frente';
      continue;
    }
    if (peixe.plano === peixe.planoDesejado) continue;
    if (podeTrocarDePlano(peixe, peixe.plano, peixe.planoDesejado, contexto)) peixe.plano = peixe.planoDesejado;
  }
}
