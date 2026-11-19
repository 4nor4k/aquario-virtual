// O SPOT de luz da noite (pedidos do usuário em 19/11/2026): é como uma LÂMPADA acesa em cima do aquário. O
// feixe sai do centro do TOPO DO AQUÁRIO (a linha 0 do mundo, em cima do ar, e não da superfície da água),
// abre em cone para baixo e é um BRILHO suave (glow): forte no centro e no alto, esmaecendo para as bordas e
// para o fundo, sem contorno duro. Dois efeitos:
//   1. no ar e na água pura (cor 1) pinta um degradê de 7 degraus de azul (COR.SPOT);
//   2. onde o feixe ilumina, as cores do cenário (areia, plantas, pedras, água suja...) trocam para a gêmea
//      mais clara (PAR_CLARO, palette.js): o que está na luz fica mais claro que o que está fora dela. Na borda
//      do feixe as superfícies grandes passam antes por uma gêmea INTERMEDIÁRIA (PAR_MEIO): luz suave, sem salto.
// Os peixes não mudam (nem as estrelas, a chuva, os ovos...). A lâmpada fica sempre ligada: de noite é forte e
// o que ela ilumina fica mais claro; de dia só sobra um brilho fraco na água (as gêmeas claras são iguais às
// cores originais, então o aquário inteiro continua iluminado). As cores são calculadas pela luz.js.
// O feixe fica preso ao MUNDO (no meio do aquário), então anda na tela junto com a câmera.
import { AREIA_Y, MUNDO_LARGURA, MUNDO_ALTURA } from '../core/mundo.js';
import { LARGURA, ALTURA } from './tela.js';
import { COR, PAR_CLARO, PAR_MEIO } from './palette.js';

export const SPOT_X = MUNDO_LARGURA / 2;  // o centro do topo
export const ABERTURA_NO_TOPO = 50;       // meia largura do brilho no topo do aquário (era 5, depois 15 e 100; 50 a pedido do usuário)
export const ABERTURA_NO_FUNDO = 109;     // meia largura do brilho na areia (era 62; +75% a pedido do usuário)
export const ESMAECER_NO_FUNDO = 0.45;    // quanto o brilho perde da força do topo até a areia
export const NIVEIS = COR.SPOT.length;    // degraus do degradê
export const LIMITE_DO_CENARIO = 0.3;     // a partir desta intensidade (0 a 1) o cenário fica bem "iluminado"
export const LIMITE_DA_BORDA = 0.08;      // a partir desta, as superfícies grandes ficam "meio iluminadas" (borda suave)

// A intensidade do brilho (0 a 1) no ponto (wx, wy) do mundo: 1 no centro do topo, 0 fora do cone.
export function intensidadeDoSpot(wx, wy) {
  const p = Math.max(0, Math.min(1, wy / AREIA_Y));
  const meia = ABERTURA_NO_TOPO + (ABERTURA_NO_FUNDO - ABERTURA_NO_TOPO) * p;
  const d = Math.abs(wx - SPOT_X) / meia;
  if (d >= 1) return 0;
  const lateral = (1 - d * d) ** 2;            // suave: cai devagar no centro e some sem aresta na borda
  return lateral * (1 - ESMAECER_NO_FUNDO * p);
}

export function desenharSpot(quadro, camera) {
  const cx = Math.round(camera.x);
  const cy = Math.round(camera.y);
  const alcance = Math.ceil(ABERTURA_NO_FUNDO);
  const de = Math.max(0, SPOT_X - alcance - cx);
  const ate = Math.min(LARGURA - 1, SPOT_X + alcance - cx);
  for (let sy = 0; sy < ALTURA; sy++) {
    const wy = cy + sy;
    if (wy < 0 || wy >= MUNDO_ALTURA) continue;
    for (let sx = de; sx <= ate; sx++) {
      const forca = intensidadeDoSpot(cx + sx, wy);
      const degrau = Math.round(forca * NIVEIS);
      if (degrau <= 0) continue;
      const i = sy * LARGURA + sx;
      const cor = quadro[i];
      if (cor === COR.AGUA) quadro[i] = COR.SPOT[degrau - 1];
      else if (forca >= LIMITE_DO_CENARIO && PAR_CLARO.has(cor)) quadro[i] = PAR_CLARO.get(cor);
      else if (forca >= LIMITE_DA_BORDA && PAR_MEIO.has(cor)) quadro[i] = PAR_MEIO.get(cor);
    }
  }
}
