// A água suja (doc 04, seção 8). Tudo só visual (não muda o jogo), em quatro faixas de sujeira:
//
//    0 a 40   aquário limpo.
//   40 a 60   o CHÃO escurece aos poucos; aparecem partículas de sujeira paradas no chão e algumas
//             flutuando/caindo na água. A água ainda é transparente (preta).
//   60 a 90   a ÁGUA muda de cor (do preto para um marrom-esverdeado, sólido, sem pontilhado) e
//             aparecem mais partículas. A linha da superfície vai do azul ao amarelo-barrento.
//             Começa o BOLOR nas paredes de vidro do aquário (render/bolor.js), que vai até o 100.
//   90 a 100  água totalmente suja (a cor mais forte, o máximo de partículas).
//
// O que cada coisa faz em cada faixa está em fasesDaSujeira(). A cor da água, do chão e da superfície
// é trocada direto na PALETA (a tela usa as mesmas cores, a mesma lista), então vale para o próximo
// quadro. Só os pixels de ÁGUA (índice 1) são pintados: plantas, pedras e peixes ficam como estão.
//
// O nível que se vê na tela (0 a 1, igual a sujeira / 100) NÃO pula junto com a sujeira: ele anda
// até ela aos poucos. Por isso, ao limpar o aquário, tudo vai clareando em alguns segundos em vez de
// trocar de uma vez. O tempo aqui é o tempo REAL (visual), como a onda da superfície.
import { SUPERFICIE_Y, AREIA_Y, MUNDO_LARGURA } from '../core/mundo.js';
import { deslocamentoDaOnda } from './superficie.js';
import { ruido } from './filtro.js';
import { LARGURA, ALTURA } from './tela.js';
import { COR, PALETA } from './palette.js';

export const SEGUNDOS_PARA_MUDAR = 6;   // de totalmente limpo a totalmente sujo (ou o contrário)
export const PARTICULAS_MAXIMAS = 70;   // flutuando na água, no mundo todo, com a água no pior
export const ESPECAS_MAXIMAS = 60;      // grãos de sujeira no chão, com a água no pior

// Onde cada faixa começa (sujeira de 0 a 100).
export const SUJEIRA_CHAO_ESCURECE = 40;
export const SUJEIRA_AGUA_TURVA = 60;
export const SUJEIRA_AGUA_SUJA = 90;
export const SUJEIRA_MAXIMA = 100;

// Quanto da cor da água suja já aparece quando a sujeira chega a 90 (de 100 a cor é a inteira).
export const TURVO_EM_90 = 0.7;

const PROFUNDIDADE = AREIA_Y - SUPERFICIE_Y;

const limitar = (v, min, max) => Math.min(max, Math.max(min, v));
const trecho = (v, de, ate) => limitar((v - de) / (ate - de), 0, 1); // 0 em `de`, 1 em `ate`

// O que se vê para uma sujeira de 0 a 100. Tudo de 0 a 1:
//   chao        o quanto o chão já escureceu (40 -> 60)
//   agua        o quanto a água já mudou de cor (60 -> 90 vai até TURVO_EM_90; 90 -> 100 vai a 1)
//   particulas  a fração das partículas (flutuando e no chão) já visíveis
//   bolor       o quanto o vidro já tem de bolor (60 -> 100)
export function fasesDaSujeira(sujeira) {
  const s = Number.isFinite(sujeira) ? sujeira : 0;
  return {
    chao: trecho(s, SUJEIRA_CHAO_ESCURECE, SUJEIRA_AGUA_TURVA),
    agua: TURVO_EM_90 * trecho(s, SUJEIRA_AGUA_TURVA, SUJEIRA_AGUA_SUJA)
      + (1 - TURVO_EM_90) * trecho(s, SUJEIRA_AGUA_SUJA, SUJEIRA_MAXIMA),
    particulas: 0.3 * trecho(s, SUJEIRA_CHAO_ESCURECE, SUJEIRA_AGUA_TURVA)
      + 0.4 * trecho(s, SUJEIRA_AGUA_TURVA, SUJEIRA_AGUA_SUJA)
      + 0.3 * trecho(s, SUJEIRA_AGUA_SUJA, SUJEIRA_MAXIMA),
    bolor: trecho(s, SUJEIRA_AGUA_TURVA, SUJEIRA_MAXIMA),
  };
}

// O nível visto na tela (0 a 1) para uma sujeira de 0 a 100.
export function nivelDaSujeira(sujeira) {
  return limitar((Number.isFinite(sujeira) ? sujeira : 0) / SUJEIRA_MAXIMA, 0, 1);
}

// As fases a partir do nível visto (0 a 1).
export const fasesDoNivel = (nivel) => fasesDaSujeira(limitar(nivel, 0, 1) * SUJEIRA_MAXIMA);

export function criarTurvacao(inicial = 0) {
  let nivel = limitar(inicial, 0, 1);
  return {
    get nivel() {
      return nivel;
    },
    // Vai direto para este nível, sem transição (ao abrir o jogo ou começar outro).
    irPara(novo) {
      nivel = limitar(novo, 0, 1);
    },
    // dt em segundos reais; alvo de 0 a 1.
    atualizar(dt, alvo) {
      const passo = dt / SEGUNDOS_PARA_MUDAR;
      nivel = nivel < alvo ? Math.min(alvo, nivel + passo) : Math.max(alvo, nivel - passo);
    },
  };
}

// --- As cores ----------------------------------------------------------------------------------

// A COR DA SUPERFÍCIE: a linha da água (e a água que cai do filtro, que é a mesma água, no mesmo
// índice da paleta) vai do azul claro ao amarelo-barrento. A cor limpa é a que a paleta tem ao abrir.
export const COR_SUPERFICIE_LIMPA = [...PALETA[COR.AZUL_AGUA]];
export const COR_SUPERFICIE_SUJA = [0xb8, 0xaa, 0x5e];

// A ÁGUA: do preto (limpa) a um marrom-esverdeado escuro (o mais sujo). Parte do preto, então o
// começo da mudança mal aparece e vai ficando mais forte.
export const COR_AGUA_LIMPA = [0x00, 0x00, 0x00];
export const COR_AGUA_SUJA = [0x58, 0x4f, 0x24];

// O CHÃO: cada cor da areia (e dos grãos) caminha até uma versão escura, mais acastanhada.
const AREIA_INDICES = [COR.AREIA, COR.AREIA_ESCURA, ...COR.GRAOS];
// Os índices da paleta cuja cor esta tela reescreve a cada quadro (a luz do dia e da noite, em luz.js,
// parte da cor que ela deixou e não pode restaurá-los do original).
export const INDICES_DA_TURVACAO = [COR.AZUL_AGUA, COR.AGUA_SUJA, ...AREIA_INDICES];
const AREIA_ORIGINAL = AREIA_INDICES.map((i) => [...PALETA[i]]);
export const COR_CHAO_ESCURO = [0x24, 0x1e, 0x10];
export const FORCA_DO_CHAO_ESCURO = 0.65; // com o chão no pior, 65% do caminho até a cor escura

const misturar = (a, b, parte) => a.map((v, i) => Math.round(v + (b[i] - v) * parte));

// A cor da superfície ([r, g, b]) para um nível de 0 a 1: a mistura das duas pontas. Ela muda junto
// com a água (de 60 a 100), não antes.
export function corDaSuperficie(nivel) {
  return misturar(COR_SUPERFICIE_LIMPA, COR_SUPERFICIE_SUJA, limitar(nivel, 0, 1));
}

export const corDaAgua = (agua) => misturar(COR_AGUA_LIMPA, COR_AGUA_SUJA, limitar(agua, 0, 1));

export const corDaAreia = (indice, chao) => misturar(
  AREIA_ORIGINAL[AREIA_INDICES.indexOf(indice)], COR_CHAO_ESCURO, FORCA_DO_CHAO_ESCURO * limitar(chao, 0, 1),
);

function pintarNaPaleta(indice, [r, g, b]) {
  const cor = PALETA[indice];
  cor[0] = r; cor[1] = g; cor[2] = b;
}

// Põe na paleta as cores da água, da superfície e do chão que valem para este nível (0 a 1).
export function aplicarCores(nivel) {
  const f = fasesDoNivel(nivel);
  pintarNaPaleta(COR.AZUL_AGUA, corDaSuperficie(f.agua));
  pintarNaPaleta(COR.AGUA_SUJA, corDaAgua(f.agua));
  for (const i of AREIA_INDICES) pintarNaPaleta(i, corDaAreia(i, f.chao));
}

// --- As partículas -----------------------------------------------------------------------------

// Posição (no mundo) de uma partícula que flutua e cai, no instante `tempo`. A mesma partícula
// sempre faz o mesmo caminho: ela só depende do número k e do tempo.
export function posicaoDaParticula(k, tempo) {
  const a = ruido(k * 5 + 1);
  const b = ruido(k * 5 + 2);
  const c = ruido(k * 5 + 3);
  const velocidadeX = ((a % 5) - 2) * 0.8;      // -1,6 a 1,6 px/s para os lados
  const velocidadeY = 1.5 + (b % 20) / 10;      // 1,5 a 3,4 px/s afundando
  const altura = PROFUNDIDADE - 10;
  const x = (((a >>> 8) % MUNDO_LARGURA) + tempo * velocidadeX + 2 * Math.sin(tempo * 0.7 + k)) % MUNDO_LARGURA;
  const y = SUPERFICIE_Y + 6 + (((c % altura) + tempo * velocidadeY) % altura);
  return { x: (x + MUNDO_LARGURA) % MUNDO_LARGURA, y, largura: k % 3 === 0 ? 2 : 1 };
}

// Onde (no mundo) fica o grão número k de sujeira no chão. Parado. Metade fica no fundo da água,
// em cima da areia (y = AREIA_Y - 1, aparece como pontinho claro); a outra metade fica na própria
// areia (y = AREIA_Y, aparece como pontinho escuro).
export function posicaoDaEspeca(k) {
  const x = (ruido(k * 3 + 700) >>> 4) % MUNDO_LARGURA;
  return { x, y: k % 2 === 0 ? AREIA_Y - 1 : AREIA_Y, claro: k % 2 === 0 };
}

// --- O desenho ---------------------------------------------------------------------------------

// Pinta a água suja: a cor da água (só onde há água), os grãos no chão e as partículas. Também
// ajusta as cores da paleta (água, superfície e chão), então deve ser chamada em todo quadro, até
// com a água limpa (para as cores voltarem ao normal). O que for desenhado depois (peixes, comida,
// bolhas) fica por cima.
export function desenharTurvacao(quadro, camera, nivel, tempo = 0) {
  aplicarCores(nivel);
  const f = fasesDoNivel(nivel);
  const cx = Math.round(camera.x);
  const cy = Math.round(camera.y);

  // A água: todo pixel de água (índice 1) abaixo da linha da superfície vira a cor da água suja.
  if (f.agua > 0) {
    for (let sx = 0; sx < LARGURA; sx++) {
      const linha = SUPERFICIE_Y + deslocamentoDaOnda(cx + sx, tempo);
      for (let sy = Math.max(0, linha + 1 - cy); sy < ALTURA; sy++) {
        if (quadro[sy * LARGURA + sx] === COR.AGUA) quadro[sy * LARGURA + sx] = COR.AGUA_SUJA;
      }
    }
  }

  // Os grãos no chão: aparecem um a um e ficam.
  const especas = Math.round(f.particulas * ESPECAS_MAXIMAS);
  for (let k = 0; k < especas; k++) {
    const e = posicaoDaEspeca(k);
    const x = e.x - cx;
    const y = e.y - cy;
    if (x >= 0 && x < LARGURA && y >= 0 && y < ALTURA) quadro[y * LARGURA + x] = e.claro ? COR.TURVO_CLARO : COR.TURVO;
  }

  // As partículas que flutuam e caem devagar.
  const quantas = Math.round(f.particulas * PARTICULAS_MAXIMAS);
  for (let k = 0; k < quantas; k++) {
    const p = posicaoDaParticula(k, tempo);
    const y = Math.round(p.y) - cy;
    if (y < 0 || y >= ALTURA) continue;
    for (let i = 0; i < p.largura; i++) {
      const x = Math.round(p.x) + i - cx;
      if (x >= 0 && x < LARGURA) quadro[y * LARGURA + x] = COR.TURVO_CLARO;
    }
  }
}
