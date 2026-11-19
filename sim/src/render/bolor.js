// O bolor no vidro do aquário: manchas verdes que crescem nas PAREDES DE VIDRO do aquário (as duas
// laterais), por dentro da água, a partir da sujeira 60 até 100 (ver fasesDaSujeira em turvacao.js).
//
// Ele é do AQUÁRIO, não da câmera: as manchas ficam presas ao mundo, no vidro da esquerda e no da
// direita, então só aparecem quando a câmera chega perto de uma parede. Como é o vidro, é desenhado
// ANTES de todo o resto do cenário (o fundo, a areia, as pedras, as plantas e os peixes ficam na
// frente dele). Só aparece abaixo da linha da água e acima da areia (a areia encosta no vidro e o
// cobre). Some aos poucos quando o aquário é limpo (o nível que chega aqui já é o visual, que anda
// devagar). As manchas são sorteadas uma vez, com semente, então são sempre as mesmas.
import { criarRng } from '../core/rng.js';
import { SUPERFICIE_Y, AREIA_Y, MUNDO_LARGURA } from '../core/mundo.js';
import { deslocamentoDaOnda } from './superficie.js';
import { LARGURA, ALTURA } from './tela.js';
import { COR } from './palette.js';
import { fasesDoNivel } from './turvacao.js';

export const QUANTAS_MANCHAS = 20;           // 10 em cada parede
export const RAIO_MAXIMO = [5, 11];          // sorteio entre esses valores (px), com a mancha totalmente crescida

// Sorteia as manchas, em coordenadas do MUNDO: metade no vidro da esquerda e metade no da direita.
export function gerarManchas(semente = 20261119) {
  const rng = criarRng(semente);
  const manchas = [];
  for (let i = 0; i < QUANTAS_MANCHAS; i++) {
    const naEsquerda = i % 2 === 0;
    const entrando = rng.inteiro(0, 2); // o quanto o centro entra na água, a partir do vidro
    manchas.push({
      x: naEsquerda ? entrando : MUNDO_LARGURA - 1 - entrando,
      y: rng.inteiro(SUPERFICIE_Y + 6, AREIA_Y - 1),
      raio: rng.inteiro(...RAIO_MAXIMO),
      fase: rng.decimal() * 6.28, // dá a cada mancha um contorno irregular diferente
      // cada mancha começa a crescer um pouco antes ou depois das outras
      atraso: rng.decimal() * 0.25,
    });
  }
  return manchas;
}

export const MANCHAS = gerarManchas();

// O quanto a mancha já cresceu (0 a 1) para um bolor de 0 a 1.
export const crescimentoDaMancha = (mancha, bolor) => Math.min(1, Math.max(0, (bolor - mancha.atraso) / (1 - mancha.atraso)));

// Desenha o bolor no quadro. `nivel` é o nível visual da sujeira (0 a 1), o mesmo da turvação.
// Chame logo depois de pintar a água, antes do fundo e do cenário.
export function desenharBolor(quadro, camera, nivel, tempo = 0) {
  const { bolor } = fasesDoNivel(nivel);
  if (bolor <= 0) return;
  const cx = Math.round(camera.x);
  const cy = Math.round(camera.y);
  for (const m of MANCHAS) {
    const crescimento = crescimentoDaMancha(m, bolor);
    if (crescimento <= 0) continue;
    const r = 1.2 + (m.raio - 1.2) * crescimento; // começa como um pontinho e vai crescendo
    const alcance = Math.ceil(r * 1.25) + 1;
    for (let dy = -alcance; dy <= alcance; dy++) {
      for (let dx = -alcance; dx <= alcance; dx++) {
        const wx = m.x + dx;
        const wy = m.y + dy;
        if (wx < 0 || wx >= MUNDO_LARGURA || wy >= AREIA_Y) continue; // fora do vidro, ou onde a areia cobre
        if (wy <= SUPERFICIE_Y + deslocamentoDaOnda(wx, tempo)) continue; // acima da água
        const x = wx - cx;
        const y = wy - cy;
        if (x < 0 || x >= LARGURA || y < 0 || y >= ALTURA) continue;
        const d = Math.hypot(dx, dy);
        // Contorno irregular: o raio varia com o ângulo.
        const angulo = Math.atan2(dy, dx);
        const limite = r * (0.85 + 0.25 * Math.sin(angulo * 3 + m.fase) + 0.1 * Math.sin(angulo * 7 - m.fase));
        if (d > limite) continue;
        // A borda da mancha e o lado de cima/esquerda ficam mais claros (o vidro pegando luz).
        const naBorda = d > limite - 1.2 || (dx + dy < -r * 0.5 && d > limite * 0.6);
        quadro[y * LARGURA + x] = naBorda ? COR.BOLOR_CLARO : COR.BOLOR;
      }
    }
  }
}
