// O peixe se abriga da chuva (doc 12, seção 2): quando a chuva chega ele vai para TRÁS DA PEDRA GRANDE, perto do
// chão, e fica por ali, indo e vindo ao longo da pedra (entrando e saindo de trás dela), para o jogador ver que ele
// está lá. Só animação: não mexe em fome, saúde nem pH e nada disto vai para o arquivo salvo.
//
// O core não conhece o desenho, então a interface entrega o lugar da pedra (já com a paralaxe da câmera):
//   ambiente = { chuvaNivel, abrigo: { x, meiaLargura } }   (x em coordenadas do mundo, o centro da pedra)
// Quem faz o peixe andar é fish.js (atualizarPeixeAbrigado); aqui se decide SE ele está abrigado e PARA ONDE ir.
import { limitesDoPeixe, TAMANHO_POR_FASE } from './fish.js';

const FOLGA_FORA = 3; // ponto de espera ao lado da pedra, de onde dá para passar para trás dela

// Entra e sai do abrigo conforme a chuva (com duas marcas, 0,5 e 0,2, para não ficar entrando e saindo).
// Ao entrar sorteia o ponto dele ao longo da pedra; ao sair espera um tempo só dele (3 a 8 s), para os peixes
// não saírem todos juntos. cfg = config.abrigoDaChuva.
export function atualizarAbrigo(peixe, dt, rng, ambiente, cfg) {
  const abrigo = ambiente?.abrigo ?? null;
  const chuva = ambiente?.chuvaNivel ?? 0;
  if (!abrigo) {
    if (peixe.abrigado) sairDoAbrigo(peixe);
    return;
  }
  if (!peixe.abrigado) {
    if (chuva <= cfg.entraComChuvaAcimaDe) return;
    peixe.abrigado = true;
    peixe.abrigoSaiEm = null;
    peixe.abrigoDx = rng.inteiro(-Math.floor(abrigo.meiaLargura), Math.floor(abrigo.meiaLargura)); // onde ele chega
    peixe.abrigoDy = rng.inteiro(0, cfg.alturaNoChaoPx);                                              // e a que altura
    return;
  }
  if (chuva >= cfg.saiComChuvaAbaixoDe) {
    peixe.abrigoSaiEm = null; // ainda chove (ou voltou a chover): continua abrigado
    return;
  }
  if (peixe.abrigoSaiEm === null) {
    peixe.abrigoSaiEm = rng.inteiro(cfg.saiDepoisDeSeg[0] * 10, cfg.saiDepoisDeSeg[1] * 10) / 10;
    return;
  }
  peixe.abrigoSaiEm -= dt;
  if (peixe.abrigoSaiEm <= 0) sairDoAbrigo(peixe);
}

function sairDoAbrigo(peixe) {
  peixe.abrigado = false;
  peixe.abrigoSaiEm = null;
  peixe.destino = null;
  peixe.movimento = 'esperando';
  peixe.espera = 0.5; // logo sorteia um destino e volta a passear (o plano é sorteado de novo nesse trajeto)
}

// Para onde o peixe abrigado vai: { x, y, minX, maxX } (x, y = onde chega; minX e maxX = até onde ele vai e vem,
// o centro do corpo, ao longo da pedra). Se ele ainda não está no plano "fundo" (atrás da pedra), primeiro vai até
// a borda da pedra mais perto, fora da silhueta, porque é lá que a interface o deixa passar para trás dela sem
// "pular" (render/profundidade.js). Depois entra e fica por ali.
export function alvoDoAbrigo(peixe, abrigo) {
  const lim = limitesDoPeixe(peixe.fase);
  const meia = TAMANHO_POR_FASE[peixe.fase].largura / 2;
  const y = Math.max(lim.minY, lim.maxY - peixe.abrigoDy);
  const entre = (x) => Math.min(lim.maxX, Math.max(lim.minX, x));
  if (peixe.plano !== 'fundo') {
    const lado = peixe.x < abrigo.x ? -1 : 1;
    const x = entre(abrigo.x + lado * (abrigo.meiaLargura + meia + FOLGA_FORA));
    return { x, y, minX: x, maxX: x };
  }
  const minX = entre(abrigo.x - abrigo.meiaLargura);
  const maxX = entre(abrigo.x + abrigo.meiaLargura);
  return { x: Math.min(maxX, Math.max(minX, abrigo.x + peixe.abrigoDx)), y, minX, maxX };
}
