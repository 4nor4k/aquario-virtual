// O HUD de indicadores (doc 04, "HUD de indicadores"): aparece SOBRE o jogo, sem trocar de tela,
// quando você aperta B, e some quando aperta B de novo. Cinco caixinhas, uma em cada canto:
//
//   FOME (cima, esquerda)        SAÚDE (cima, direita)
//   PH (baixo, esquerda)  TEMP (baixo, meio)  SUJO (baixo, direita)
//
// Como são cinco indicadores e a tela só tem quatro cantos, a temperatura ficou no meio de baixo.
// Cada caixinha mostra o nome, o valor e uma barra (a temperatura não tem barra).
import { LARGURA, ALTURA } from './tela.js';
import { desenharTexto, larguraDoTexto } from './fonte.js';
import { preencherRetangulo, contornoRetangulo } from './formas.js';
import { desenharBarra, COR_RUIM } from './barra.js';
import { formatarPh } from '../core/formatar.js';
import { notaDoPh, valorDoPh } from '../core/rules.js';

export const LARGURA_CELULA = 37;
export const ALTURA_CELULA = 18;
const MARGEM = 2;
export const FOLGA = 2; // espaço entre a borda da caixinha e o que há dentro

const FUNDO = 13;     // preto liso
const BORDA = 11;     // ciano (em preto e branco, branco)
const TEXTO = 12;     // branco
const DESTAQUE = 11;  // cor da barra (ciano)

const BAIXO = ALTURA - MARGEM - ALTURA_CELULA;
const DIREITA = LARGURA - MARGEM - LARGURA_CELULA;
// O canto de cima à esquerda de cada caixinha.
export const CELULAS = {
  fome: { x: MARGEM, y: MARGEM },
  saude: { x: DIREITA, y: MARGEM },
  ph: { x: MARGEM, y: BAIXO },
  temperatura: { x: Math.floor((LARGURA - LARGURA_CELULA) / 2), y: BAIXO },
  sujeira: { x: DIREITA, y: BAIXO },
};

// O que cada caixinha mostra (função pura, para testar): { texto, valor, maximo, ideal, ruim }.
// valor = null: sem barra. Sem peixe vivo, fome e saúde viram "--".
export function valoresDoHud(aquario, config, textos) {
  const peixe = aquario.peixes[0];
  const ph = notaDoPh(aquario, config);
  return {
    fome: peixe
      ? {
        texto: String(Math.round(peixe.saciedade)),
        valor: peixe.saciedade,
        maximo: config.saciedade.maximo,
        ideal: config.saciedade.ideal,
        ruim: peixe.saciedade < config.saciedade.improprioAbaixoDe,
      }
      : { texto: textos.hud.semPeixe, valor: 0, maximo: config.saciedade.maximo, ideal: config.saciedade.ideal, ruim: false },
    saude: peixe
      ? { texto: String(Math.round(peixe.saude)), valor: peixe.saude, maximo: 100, ideal: null, ruim: peixe.saude < config.saude.doenteAbaixoDe }
      : { texto: textos.hud.semPeixe, valor: 0, maximo: 100, ideal: null, ruim: false },
    ph: { texto: formatarPh(valorDoPh(aquario, config)), valor: ph, maximo: 100, ideal: null, ruim: ph <= config.ph.improprioNotaAte },
    temperatura: { texto: `${Math.round(config.agua.temperatura)}°C`, valor: null, maximo: null, ideal: null, ruim: false },
    sujeira: {
      texto: String(Math.round(aquario.sujeira)), valor: aquario.sujeira, maximo: 100, ideal: null, ruim: aquario.sujeira > config.sujeira.improprioAcimaDe,
    },
  };
}

function desenharCelula(quadro, { x, y }, rotulo, v) {
  preencherRetangulo(quadro, x, y, LARGURA_CELULA, ALTURA_CELULA, FUNDO);
  contornoRetangulo(quadro, x, y, LARGURA_CELULA, ALTURA_CELULA, BORDA);
  const corValor = v.ruim ? COR_RUIM : TEXTO;
  desenharTexto(quadro, rotulo, x + FOLGA, y + 4, TEXTO);
  if (v.valor === null) {
    // Sem barra: o valor vai na segunda linha, no meio da caixinha.
    desenharTexto(quadro, v.texto, x + Math.floor((LARGURA_CELULA - larguraDoTexto(v.texto)) / 2), y + 11, corValor);
    return;
  }
  desenharTexto(quadro, v.texto, x + LARGURA_CELULA - FOLGA - larguraDoTexto(v.texto), y + 4, corValor);
  desenharBarra(quadro, x + FOLGA, y + 11, LARGURA_CELULA - 2 * FOLGA, v.valor, v.ruim ? COR_RUIM : DESTAQUE, v.maximo, v.ideal);
}

export function desenharIndicadores(quadro, { aquario, config, textos }) {
  const v = valoresDoHud(aquario, config, textos);
  for (const nome of Object.keys(CELULAS)) desenharCelula(quadro, CELULAS[nome], textos.hud[nome], v[nome]);
}
