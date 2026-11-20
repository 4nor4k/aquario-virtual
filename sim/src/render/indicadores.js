// O HUD de indicadores (doc 04, "HUD de indicadores"): aparece SOBRE o jogo, sem trocar de tela,
// quando você aperta B, e some quando aperta B de novo. Cinco caixinhas, uma em cada canto:
//
//   FOME (cima, esquerda)        SAÚDE (cima, direita)
//   PH (baixo, esquerda)  TEMP (baixo, meio)  SUJO (baixo, direita)
//
// Como são cinco indicadores e a tela só tem quatro cantos, a temperatura ficou no meio de baixo.
// Cada caixinha mostra o nome, o valor e uma barra. Exceções (doc 12): a TEMPERATURA não tem barra; a SAÚDE
// mostra só uma cruz verde, amarela ou vermelha (sem número); o PH mostra "PH 7,0" e um quadradinho na cor da
// faixa (azul ácido, verde ideal, amarelo alcalino), sem barra.
import { LARGURA, ALTURA } from './tela.js';
import { desenharTexto, larguraDoTexto } from './fonte.js';
import { preencherRetangulo, contornoRetangulo } from './formas.js';
import { desenharBarra, COR_RUIM } from './barra.js';
import { formatarPh } from '../core/formatar.js';
import { notaDoPh, valorDoPh, statusDaSaude, faixaDoPh } from '../core/rules.js';
import { desenharCruz, desenharQuadradinhoDoPh, LADO_DO_QUADRADINHO, CRUZ_DO_STATUS } from './hud.js';

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
// peixe: o peixe em foco (o padrão é o primeiro). Passe null para "sem peixe".
// temperatura: a do clima simulado (o padrão é o valor fixo do config, de antes do clima existir).
export function valoresDoHud(aquario, config, textos, peixe = aquario.peixes[0], temperatura = config.agua.temperatura) {
  const ph = notaDoPh(aquario, config);
  const faixa = faixaDoPh(valorDoPh(aquario, config), config);
  const status = peixe ? statusDaSaude(peixe, config) : null;
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
    // Saúde: sem número nem barra, só o status e a cruz na cor dele (doc 12). `cruz` null = sem cruz (sem peixe).
    saude: peixe
      ? { texto: textos.status.saudeNiveis[status], valor: null, status, cruz: CRUZ_DO_STATUS[status], ruim: peixe.saude < config.saude.doenteAbaixoDe }
      : { texto: textos.hud.semPeixe, valor: null, status: null, cruz: null, ruim: false },
    // pH: o número e uma faixa colorida no lugar da barra (azul = ácido, verde = ideal, amarelo = alcalino).
    ph: { texto: formatarPh(valorDoPh(aquario, config)), valor: null, faixa, ruim: ph <= config.ph.improprioNotaAte },
    temperatura: { texto: `${Math.round(temperatura)}°C`, valor: null, maximo: null, ideal: null, ruim: false },
    sujeira: {
      texto: String(Math.round(aquario.sujeira)), valor: aquario.sujeira, maximo: 100, ideal: null, ruim: aquario.sujeira > config.sujeira.improprioAcimaDe,
    },
  };
}

function desenharCelula(quadro, { x, y }, rotulo, v) {
  preencherRetangulo(quadro, x, y, LARGURA_CELULA, ALTURA_CELULA, FUNDO);
  contornoRetangulo(quadro, x, y, LARGURA_CELULA, ALTURA_CELULA, BORDA);
  const corValor = v.ruim ? COR_RUIM : TEXTO;
  if (v.cruz !== undefined) {
    // Saúde: o rótulo e a cruz colorida, numa linha só (sem cruz quando não há peixe vivo: "--").
    desenharTexto(quadro, rotulo, x + FOLGA, y + 6, TEXTO);
    const xDaCruz = x + LARGURA_CELULA - FOLGA - 7;
    if (v.cruz) desenharCruz(quadro, xDaCruz, y + 5, v.cruz);
    else desenharTexto(quadro, v.texto, x + LARGURA_CELULA - FOLGA - larguraDoTexto(v.texto), y + 6, TEXTO);
    return;
  }
  if (v.faixa) {
    // pH: "PH 7,0" e um quadradinho na cor da faixa, numa linha só (sem barra).
    desenharTexto(quadro, `${rotulo} ${v.texto}`, x + FOLGA, y + 6, corValor);
    desenharQuadradinhoDoPh(quadro, x + LARGURA_CELULA - FOLGA - LADO_DO_QUADRADINHO, y + 6, v.faixa);
    return;
  }
  desenharTexto(quadro, rotulo, x + FOLGA, y + 4, TEXTO);
  if (v.valor === null) {
    // Sem barra: o valor vai na segunda linha, no meio da caixinha.
    desenharTexto(quadro, v.texto, x + Math.floor((LARGURA_CELULA - larguraDoTexto(v.texto)) / 2), y + 11, corValor);
    return;
  }
  desenharTexto(quadro, v.texto, x + LARGURA_CELULA - FOLGA - larguraDoTexto(v.texto), y + 4, corValor);
  desenharBarra(quadro, x + FOLGA, y + 11, LARGURA_CELULA - 2 * FOLGA, v.valor, v.ruim ? COR_RUIM : DESTAQUE, v.maximo, v.ideal);
}

export function desenharIndicadores(quadro, { aquario, config, textos, peixe, temperatura }) {
  const v = valoresDoHud(aquario, config, textos, peixe, temperatura);
  for (const nome of Object.keys(CELULAS)) desenharCelula(quadro, CELULAS[nome], textos.hud[nome], v[nome]);
}
