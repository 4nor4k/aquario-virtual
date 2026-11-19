// Sprites provisórios do beta, desenhados em texto. Você pode editar à vontade!
//
// Cada letra é uma cor da paleta (palette.js), em hexadecimal, usada como "molde":
//   .  transparente      e  corpo      a  nadadeiras e cauda
//   b  borda da cauda    c  branco (olho)    d  escuro (pupila)
// Na hora de montar, o corpo (e), as nadadeiras (a) e a borda (b) viram os tons da cor do peixe
// (vermelho, azul...; veja COR.PEIXE em palette.js); o olho e a pupila ficam como estão.
//
// O desenho é virado para a DIREITA. Quando o peixe nada para a esquerda, o sprite é espelhado.
// Cada tamanho (filhote, jovem, adulto) tem:
//   - corpo:  o desenho inteiro, com a parte da cauda em branco;
//   - cauda:  só a parte da esquerda (a cauda), em repouso.
// Os 4 quadros da animação de nadar saem da cauda: repouso, para cima, repouso, para baixo.
import { LARGURA, ALTURA } from './tela.js';
import { COR } from './palette.js';

const CORPO_ADULTO = [
  '....................',
  '...........aa.......',
  '..........aaaa......',
  '..........aeeeee....',
  '..........eeeeeeee..',
  '.........eeeeeecde..',
  '.........eeeeeeeeee.',
  '.........eeeeeeeeee.',
  '.........eeeeeeeee..',
  '..........eeeeeee...',
  '...........eeeaa....',
  '..........aaaa......',
  '..........aa........',
  '....................',
];
const CAUDA_ADULTO = [
  '.........',
  '.........',
  'ba.......',
  'baaa.....',
  'baaaaaa..',
  'baaaaaaaa',
  'baaaaaaaa',
  'baaaaaaaa',
  'baaaaaaaa',
  'baaaaaaaa',
  'baaaaaa..',
  'baaa.....',
  'ba.......',
  '.........',
];

const CORPO_JOVEM = [
  '..............',
  '........aa....',
  '......aeeee...',
  '......eeeeee..',
  '......eeeeecde',
  '......eeeeeeee',
  '......eeeeeee.',
  '.......eeeaa..',
  '.......aaa....',
  '..............',
];
const CAUDA_JOVEM = [
  '......',
  '......',
  'b.....',
  'baa...',
  'baaaaa',
  'baaaaa',
  'baaaaa',
  'baaa..',
  'ba....',
  '......',
];

const CORPO_FILHOTE = [
  '..........',
  '......a...',
  '....eeee..',
  '....eeecd.',
  '....eeeeee',
  '....eeeee.',
  '.....eea..',
  '..........',
];
const CAUDA_FILHOTE = [
  '....',
  'b...',
  'baa.',
  'baaa',
  'baaa',
  'baaa',
  'baa.',
  'b...',
];

// --- Variações da cauda para a animação -------------------------------------------------

const vazia = (linha) => '.'.repeat(linha.length);

// Cauda sobe 1 pixel
const subir = (cauda) => [...cauda.slice(1), vazia(cauda[0])];
// Cauda desce 1 pixel
const descer = (cauda) => [vazia(cauda[0]), ...cauda.slice(0, -1)];

// Balanço da cauda: repouso, sobe, repouso, desce.
function quadrosDaCauda(cauda) {
  return [cauda, subir(cauda), cauda, descer(cauda)];
}

// --- Montagem ---------------------------------------------------------------------------

// Junta a cauda (parte da esquerda) com o corpo e converte as letras em números da paleta.
function montarQuadro(corpo, cauda) {
  const largura = corpo[0].length;
  const altura = corpo.length;
  const larguraCauda = cauda[0].length;
  if (cauda.length !== altura || corpo.some((l) => l.length !== largura)) {
    throw new Error('sprite: corpo e cauda precisam ter a mesma altura e linhas do mesmo tamanho');
  }
  const pix = new Uint8Array(largura * altura);
  for (let y = 0; y < altura; y++) {
    const linha = cauda[y] + corpo[y].slice(larguraCauda);
    for (let x = 0; x < largura; x++) {
      pix[y * largura + x] = linha[x] === '.' ? 0 : parseInt(linha[x], 16);
    }
  }
  return pix;
}

function montarSprite(corpo, cauda) {
  return {
    largura: corpo[0].length,
    altura: corpo.length,
    quadros: quadrosDaCauda(cauda).map((c) => montarQuadro(corpo, c)),
  };
}

// Troca cores de um sprite (é assim que o idoso fica "apagado" sem desenho novo).
// trocas: { corAntiga: corNova }, em números da paleta.
function recolorir(sprite, trocas) {
  return {
    largura: sprite.largura,
    altura: sprite.altura,
    quadros: sprite.quadros.map((q) => q.map((cor) => trocas[cor] ?? cor)),
  };
}

// As trocas de cor de uma cor do peixe (COR.PEIXE em palette.js), em números da paleta:
//   vivo:   do molde (14 corpo, 10 nadadeira, 11 borda) para os tons da cor;
//   idoso:  os tons da cor viram os apagados (é assim que o idoso e o morto ficam "apagados");
//   doente: pálido; também troca os do idoso, para o idoso doente continuar parecendo doente.
function trocasDaCor(p) {
  return {
    vivo: { 14: p.vivo.corpo, 10: p.vivo.nadadeira, 11: p.vivo.borda },
    idoso: {
      [p.vivo.corpo]: p.idoso.corpo, [p.vivo.nadadeira]: p.idoso.nadadeira, [p.vivo.borda]: p.idoso.borda,
    },
    doente: {
      [p.vivo.corpo]: p.doente.corpo, [p.vivo.nadadeira]: p.doente.nadadeira, [p.vivo.borda]: p.doente.borda,
      [p.idoso.corpo]: p.doente.corpo, [p.idoso.nadadeira]: p.doente.nadadeira, [p.idoso.borda]: p.doente.borda,
    },
  };
}

// Mesmos desenhos nas variações de saúde: nenhum desenho novo, só troca de cores.
const variar = (porEspecie, trocas) => Object.fromEntries(
  Object.entries(porEspecie).map(([especie, fases]) => [
    especie,
    Object.fromEntries(Object.entries(fases).map(([fase, s]) => [fase, recolorir(s, trocas)])),
  ]),
);

// Todos os sprites de uma cor: { normal, doente, morto }, cada um por espécie e fase.
function montarCor(cor) {
  const trocas = trocasDaCor(COR.PEIXE[cor]);
  const pintar = (corpo, cauda) => recolorir(montarSprite(corpo, cauda), trocas.vivo);
  const ADULTO = pintar(CORPO_ADULTO, CAUDA_ADULTO);
  const normal = {
    beta: {
      filhote: pintar(CORPO_FILHOTE, CAUDA_FILHOTE),
      jovem: pintar(CORPO_JOVEM, CAUDA_JOVEM),
      adulto: ADULTO,
      idoso: recolorir(ADULTO, trocas.idoso),
    },
  };
  return { normal, doente: variar(normal, trocas.doente), morto: variar(normal, trocas.idoso) };
}

// As cores que existem e o que foi montado para cada uma (montado uma vez, ao abrir).
export const CORES_DO_PEIXE = Object.keys(COR.PEIXE);
const POR_COR = Object.fromEntries(CORES_DO_PEIXE.map((cor) => [cor, montarCor(cor)]));

export function spritesDaCor(cor) {
  const s = POR_COR[cor];
  if (!s) throw new RangeError(`cor de peixe desconhecida: ${cor}`);
  return s;
}

// O beta vermelho (a cor de sempre), por espécie e fase.
export const SPRITES = POR_COR.vermelho.normal;
export const SPRITES_DOENTES = POR_COR.vermelho.doente;
export const SPRITES_MORTOS = POR_COR.vermelho.morto; // apagado, como o idoso

// Qual sprite usar para o peixe agora (pela cor, espécie, fase e saúde), e se deve ser desenhado
// de cabeça para baixo (o morto boia de barriga para cima).
export function spriteDoPeixe(peixe) {
  const s = spritesDaCor(peixe.cor);
  const grupo = peixe.estado === 'morto' ? s.morto : peixe.estado === 'doente' ? s.doente : s.normal;
  return { sprite: grupo[peixe.especie][peixe.fase], inverter: peixe.estado === 'morto' };
}

// --- Desenho ----------------------------------------------------------------------------

// Desenha um quadro de sprite no quadro da tela, com o canto de cima à esquerda em (x, y),
// já em coordenadas da tela. A cor 0 é transparente. O que sai da tela é cortado.
// espelhar = vira esquerda/direita; inverter = vira de cabeça para baixo.
// contorno = true desenha antes um halo preto de 1 pixel em volta do sprite (em preto e branco,
// é ele que separa o peixe do pontilhado da água).
export const COR_DO_CONTORNO = 13;
export function desenharSprite(quadroTela, sprite, indice, x, y, espelhar = false, inverter = false, contorno = false) {
  const { largura, altura } = sprite;
  const pix = sprite.quadros[indice];
  if (contorno) desenharHalo(quadroTela, sprite, pix, x, y, espelhar, inverter);
  for (let sy = 0; sy < altura; sy++) {
    const ty = y + sy;
    if (ty < 0 || ty >= ALTURA) continue;
    const linhaOrigem = inverter ? altura - 1 - sy : sy;
    for (let sx = 0; sx < largura; sx++) {
      const tx = x + sx;
      if (tx < 0 || tx >= LARGURA) continue;
      const cor = pix[linhaOrigem * largura + (espelhar ? largura - 1 - sx : sx)];
      if (cor !== 0) quadroTela[ty * LARGURA + tx] = cor;
    }
  }
}

// Pinta de preto os pixels vizinhos (nas 8 direções) de cada pixel do sprite.
// Quem desenha o sprite depois cobre o miolo; sobra só a borda de 1 pixel.
function desenharHalo(quadroTela, sprite, pix, x, y, espelhar, inverter) {
  const { largura, altura } = sprite;
  for (let sy = 0; sy < altura; sy++) {
    const linhaOrigem = inverter ? altura - 1 - sy : sy;
    for (let sx = 0; sx < largura; sx++) {
      if (pix[linhaOrigem * largura + (espelhar ? largura - 1 - sx : sx)] === 0) continue;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const tx = x + sx + dx;
          const ty = y + sy + dy;
          if (tx < 0 || tx >= LARGURA || ty < 0 || ty >= ALTURA) continue;
          quadroTela[ty * LARGURA + tx] = COR_DO_CONTORNO;
        }
      }
    }
  }
}
