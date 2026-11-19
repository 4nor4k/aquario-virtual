// Sprites provisórios do beta, desenhados em texto. Você pode editar à vontade!
//
// Cada letra é um "papel" de cor. Na hora de montar, cada papel vira um tom da cor do peixe
// (vermelho, azul...; veja COR.PEIXE e PAPEIS_DO_PEIXE em palette.js):
//   .  transparente
//   o  contorno (a linha escura em volta e entre as partes)
//   e  corpo (tom médio)     l  brilho (o corpo em cima, mais claro)     s  sombra (o corpo embaixo)
//   a  nadadeira/cauda: a base, perto do corpo
//   f  nadadeira/cauda: o meio
//   b  nadadeira/cauda: as pontas (o tom mais claro)
//   h  destaque: os raios coloridos (o "segundo tom")
//   c  branco (brilho do olho)     d  escuro (pupila)     (c e d ficam como estão)
//
// O desenho é virado para a DIREITA. Quando o peixe nada para a esquerda, o sprite é espelhado.
// Cada tamanho (filhote, jovem, adulto) tem:
//   - corpo:  o desenho inteiro, com a parte da cauda em branco;
//   - cauda:  só a parte da esquerda (a cauda), em repouso.
// Os 4 quadros da animação de nadar saem da cauda: repouso, ondula para cima, repouso, ondula para
// baixo (a ponta da cauda se mexe mais que a base; veja quadrosDaCauda).
import { LARGURA, ALTURA } from './tela.js';
import { COR, PAPEIS_DO_PEIXE, PALETA } from './palette.js';

// Papel de cada letra, como "molde": números FORA da paleta (a paleta tem menos de 248 cores),
// que na montagem viram os tons da cor do peixe. O olho (12) e a pupila (13) já são cores finais.
const MOLDE = { e: 248, l: 249, s: 250, a: 251, f: 252, b: 253, o: 254, h: 255, c: 12, d: 13 };
const PAPEL_DO_MOLDE = { 248: 'corpo', 249: 'brilho', 250: 'sombra', 251: 'nadadeira', 252: 'clara', 253: 'borda', 254: 'contorno', 255: 'destaque' };

const CORPO_ADULTO = [
  '................................',
  '................................',
  '...............ooooo............',
  '..............obbbbbo...........',
  '..............bbfbbfboo.........',
  '..............bfhffhfffo........',
  '..............ffhffhffhbo.......',
  '..............faaaooooofo.......',
  '..............aooollllloo.......',
  '..............ollllllllllo......',
  '..............lllllelellllooo...',
  '..............elelelelelslecdo..',
  '..............eeeeeeeeeeseeddeo.',
  '..............eeeeeeeeeeseeeeeeo',
  '..............eeeeeeeeeooseseso.',
  '..............ssseseseooooosso..',
  '..............sssssssoobbbooo...',
  '..............ossssssoobbbo.....',
  '..............aoosssssoooo......',
  '..............faaoooooooo.......',
  '..............ffhffhffho........',
  '..............bfhffhfbo.........',
  '..............obfbbfbo..........',
  '...............oooooo...........',
  '................................',
  '................................',
];
const CAUDA_ADULTO = [
  '..............',
  '..............',
  '......oo......',
  '.....obo......',
  '....obbbo....o',
  '...obbffo....o',
  '..obbfffbo..of',
  '.obbbbfhho..oh',
  '.obbbbfhhho.oh',
  '.obfbbffhho.oa',
  'obbffhfffhaooo',
  'obfffhhhhaooee',
  'obbbbffhhoeeee',
  'obbbbffffossss',
  'obbbfhhhhaosss',
  'obbffhhhffaoss',
  'obbffhfffhhooo',
  '.obbbbffhho.oa',
  '.obbbbbhhfo.oh',
  '..obbfffho..oh',
  '..obbfffbo..of',
  '...obbfbo....o',
  '....obbbo.....',
  '.....ooo......',
  '.......o......',
  '..............',
];

const CORPO_JOVEM = [
  '......................',
  '...........oo.........',
  '..........obboo.......',
  '.........obbbbbo......',
  '.........obaaaabo.....',
  '.........oaoooooo.....',
  '.........oollllllo....',
  '.........ollelelelocd.',
  '.........eeeeeeeeeeeo.',
  '.........eeeeeeeoeeeeo',
  '.........seseseoooeso.',
  '.........ossssoobooo..',
  '.........oosssoooo....',
  '.........oaoooooo.....',
  '.........obbaabo......',
  '.........obbbbo.......',
  '..........oooo........',
  '......................',
];
const CAUDA_JOVEM = [
  '.........',
  '.........',
  '...ooo...',
  '..obbo...',
  '.obbbfo..',
  '.obbffo..',
  'obbffffo.',
  'obbfffao.',
  'obbfffolo',
  'obbfffoee',
  'obbfffaoo',
  'obbffffo.',
  '.obbffo..',
  '.obbffo..',
  '..obbo...',
  '...obo...',
  '....o....',
  '.........',
];

const CORPO_FILHOTE = [
  '..............',
  '......ooo.....',
  '......obboo...',
  '......ooooo...',
  '......lllelocd',
  '......eeeeeeeo',
  '......sseseso.',
  '......osssso..',
  '......boooo...',
  '......oooo....',
  '..............',
];
const CAUDA_FILHOTE = [
  '......',
  '..oo..',
  '.obo..',
  'obbboo',
  'obbboo',
  'obbaoe',
  'obbbos',
  'obbboo',
  '.obo.o',
  '..oo..',
  '......',
];

// --- Variações da cauda para a animação -------------------------------------------------

// A cauda ondula: cada coluna sobe ou desce algumas linhas, e quanto mais longe do corpo, mais ela
// se mexe (a ponta até 2 linhas no adulto, 1 nos menores; junto do corpo, nada).
// sinal = 0 (repouso), -1 (sobe) ou +1 (desce).
function ondularCauda(cauda, sinal, amplitude) {
  const altura = cauda.length;
  const largura = cauda[0].length;
  const linhas = Array.from({ length: altura }, () => Array(largura).fill('.'));
  for (let x = 0; x < largura; x++) {
    const longe = (largura - 1 - x) / Math.max(1, largura - 1); // 0 junto do corpo, 1 na ponta
    const deslocamento = sinal * Math.round(amplitude * longe ** 1.1);
    for (let y = 0; y < altura; y++) {
      const origem = y - deslocamento;
      if (origem >= 0 && origem < altura) linhas[y][x] = cauda[origem][x];
    }
  }
  return linhas.map((l) => l.join(''));
}

// Balanço da cauda: repouso, sobe, repouso, desce.
function quadrosDaCauda(cauda, amplitude) {
  return [cauda, ondularCauda(cauda, -1, amplitude), cauda, ondularCauda(cauda, 1, amplitude)];
}

// --- Montagem ---------------------------------------------------------------------------

// Junta a cauda (parte da esquerda) com o corpo e converte as letras nos moldes (números).
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
      if (linha[x] === '.') continue;
      const molde = MOLDE[linha[x]];
      if (molde === undefined) throw new Error(`sprite: letra desconhecida "${linha[x]}"`);
      pix[y * largura + x] = molde;
    }
  }
  return pix;
}

function montarSprite(corpo, cauda, amplitude) {
  return {
    largura: corpo[0].length,
    altura: corpo.length,
    quadros: quadrosDaCauda(cauda, amplitude).map((c) => montarQuadro(corpo, c)),
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

// As trocas de uma cor do peixe (COR.PEIXE em palette.js), em números da paleta:
//   vivo:   dos moldes para os tons da cor;
//   idoso:  os tons da cor viram os apagados (é assim que o idoso e o morto ficam "apagados");
//   doente: pálido; também troca os do idoso, para o idoso doente continuar parecendo doente.
function trocasDaCor(p) {
  const de = (origem, destino) => Object.fromEntries(PAPEIS_DO_PEIXE.map((papel) => [origem[papel], destino[papel]]));
  return {
    vivo: Object.fromEntries(Object.entries(PAPEL_DO_MOLDE).map(([molde, papel]) => [molde, p.vivo[papel]])),
    idoso: de(p.vivo, p.idoso),
    doente: { ...de(p.vivo, p.doente), ...de(p.idoso, p.doente) },
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
  const pintar = (corpo, cauda, amplitude) => recolorir(montarSprite(corpo, cauda, amplitude), trocas.vivo);
  const ADULTO = pintar(CORPO_ADULTO, CAUDA_ADULTO, 2);
  const normal = {
    beta: {
      filhote: pintar(CORPO_FILHOTE, CAUDA_FILHOTE, 1),
      jovem: pintar(CORPO_JOVEM, CAUDA_JOVEM, 1),
      adulto: ADULTO,
      idoso: recolorir(ADULTO, trocas.idoso),
    },
  };
  return { normal, doente: variar(normal, trocas.doente), morto: variar(normal, trocas.idoso) };
}

// Os moldes (248 a 255) precisam ficar fora da paleta, senão se confundem com cores de verdade.
if (PALETA.length >= 248) throw new Error('palette: a PALETA chegou a 248 cores; mude os moldes de sprites.js');

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
