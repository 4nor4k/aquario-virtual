// O peixe: dados, idade, fases e comportamento de nado.
// São só dados simples + funções, para traduzir fácil para C++ na Fase B.
import { MUNDO_LARGURA, AREIA_Y, SUPERFICIE_Y, AMPLITUDE_ONDA } from './mundo.js';
import { DIA_MS } from './clock.js';

export const FASES = ['filhote', 'jovem', 'adulto', 'idoso'];

// Duração de cada fase, em dias reais (doc 03, seção 1). Somam 30 dias de vida natural.
export const DURACAO_FASE_DIAS = { filhote: 5, jovem: 10, adulto: 12, idoso: 3 };
export const VIDA_NATURAL_DIAS = 30;

// Em que idade (ms) cada fase começa: filhote 0, jovem 5 dias, adulto 15 dias, idoso 27 dias.
export const INICIO_DA_FASE_MS = {};
{
  let acumulado = 0;
  for (const fase of FASES) {
    INICIO_DA_FASE_MS[fase] = acumulado * DIA_MS;
    acumulado += DURACAO_FASE_DIAS[fase];
  }
}

// Tamanho do sprite em cada fase (doc 04, seção 5). O idoso usa o tamanho do adulto.
export const TAMANHO_POR_FASE = {
  filhote: { largura: 14, altura: 11 },
  jovem: { largura: 22, altura: 18 },
  adulto: { largura: 32, altura: 26 },
  idoso: { largura: 32, altura: 26 },
};

export const VELOCIDADE_NADO = 15;      // pixels por segundo
export const QUADROS_POR_SEGUNDO = 6;   // velocidade da animação de nadar
export const QUADROS_DE_NADO = 4;
export const FATOR_VELOCIDADE_DOENTE = 0.5; // peixe doente: metade da velocidade
export const FATOR_VELOCIDADE_COMIDA = 1.6; // indo atrás de comida, nada mais animado
export const VELOCIDADE_BOIA = 8;           // peixe morto sobe a 8 pixels por segundo

const MARGEM_SUPERFICIE = 4;  // o peixe não encosta na superfície (nem na crista da onda)
const MARGEM_AREIA = 2;       // nem na areia
const DISTANCIA_MINIMA_X = 20; // cada destino fica a pelo menos 20 pixels de lado
const VARIACAO_Y = 30;        // e muda de altura em até 30 pixels

// Até onde o centro do peixe pode ir, conforme o tamanho dele.
export function limitesDoPeixe(fase) {
  const { largura, altura } = TAMANHO_POR_FASE[fase];
  const meiaL = Math.ceil(largura / 2);
  const meiaA = Math.ceil(altura / 2);
  return {
    minX: meiaL,
    maxX: MUNDO_LARGURA - meiaL,
    minY: SUPERFICIE_Y + AMPLITUDE_ONDA + MARGEM_SUPERFICIE + meiaA,
    maxY: AREIA_Y - meiaA - MARGEM_AREIA,
  };
}

export const SEXOS = ['macho', 'femea'];

// Em que "plano" o peixe nada, de trás para a frente (só para o desenho): no FUNDO ele passa atrás
// da pedra grande (e, por consequência, atrás das algas), no MEIO passa na frente da pedra mas atrás
// das algas gigantes, e na FRENTE passa na frente de tudo. Ele sorteia o plano a cada novo trajeto.
export const PLANOS = ['fundo', 'meio', 'frente'];

export function criarPeixe({
  id = 0, nome = 'Beta', especie = 'beta', cor = 'vermelho', sexo = 'macho', fase = 'filhote',
  saciedade = 100, saude = 100, estado = 'saudavel', causaDaMorte = null, direcao = 1,
  nascimentoMs = 0, morteMs = null, x, y,
}) {
  if (!TAMANHO_POR_FASE[fase]) throw new RangeError(`fase desconhecida: ${fase}`);
  return {
    id,
    nome,
    especie,
    cor,                   // nome da cor (config.cores), ex.: 'vermelho'
    sexo,                  // 'macho' ou 'femea'; sorteado na adoção, só é revelado na v0.4
    fase,
    saciedade,             // 0 a 200: até 100 está bem (100 = cheio); acima é comer demais; 200 = passa mal
    saude,                 // 0 a 100 (em 0 o peixe morre)
    estado,                // 'saudavel', 'doente' ou 'morto'
    causaDaMorte,          // 'velhice' ou 'cuidado' (falta de cuidado), só depois de morrer
    nascimentoMs,          // hora do jogo em que nasceu (a idade é "agora" menos isto)
    morteMs,               // hora do jogo em que morreu (null enquanto vive); o morto some depois de um tempo
    namorando: null,       // durante o namoro: { x, y, olharPara } = onde ele fica, e para que lado olha (só animação)
    x,
    y,
    direcao,               // 1 = olhando para a direita, -1 = para a esquerda
    destino: null,         // para onde está nadando: { x, y }
    movimento: 'esperando', // 'nadando' ou 'esperando' (o que está fazendo; não é a saúde)
    espera: 0.5,           // segundos que ainda vai ficar parado
    tempoAnimacao: 0,      // segundos acumulados, para escolher o quadro da animação
    // O cocô (core/coco.js): contagens em segundos REAIS, só da animação, fora do arquivo salvo.
    cocoEm: null,          // segundos até o cocô de "depois de comer" (null = nenhum agendado)
    cocoAleatorioEm: null, // segundos até o cocô "de vez em quando" (sorteado na primeira vez)
    fazendoCoco: 0,        // segundos que ainda fica parado fazendo cocô
    // A profundidade (só desenho, não é salva): o plano onde ele está e o que sorteou para o
    // trajeto atual. A interface só troca de um para o outro quando ele não está sobre uma alga
    // gigante nem sobre a pedra grande (render/profundidade.js), para ele não "pular" na frente.
    plano: 'frente',
    planoDesejado: 'frente',
    trajeto: 0,            // conta os trajetos (cada vez que escolhe um destino novo)
    trajetoDoPlano: 0,     // o trajeto para o qual o plano já foi sorteado
    // O abrigo da chuva (core/abrigo.js): só animação, fora do arquivo salvo.
    abrigado: false,       // escondido atrás da pedra grande (ou a caminho), enquanto chove
    abrigoSaiEm: null,     // com a chuva já passada: segundos até sair (null = ainda não começou a contar)
    abrigoDx: 0,           // onde fica atrás da pedra: deslocamento em x a partir do centro dela
    abrigoDy: 0,           // e quantos pixels acima da altura mínima (0 = colado no chão)
  };
}

// --- Idade e fases ------------------------------------------------------------------------

// A partir dos 30 dias o peixe morre de velhice (quem aplica é o rules.js).
export function fimDaVidaNatural(idadeMs) {
  return idadeMs >= VIDA_NATURAL_DIAS * DIA_MS;
}

// Fase correspondente a uma idade. Depois dos 30 dias continua "idoso".
export function faseDaIdade(idadeMs) {
  if (idadeMs >= INICIO_DA_FASE_MS.idoso) return 'idoso';
  if (idadeMs >= INICIO_DA_FASE_MS.adulto) return 'adulto';
  if (idadeMs >= INICIO_DA_FASE_MS.jovem) return 'jovem';
  return 'filhote';
}

export function idadeMs(peixe, agoraMs) {
  return Math.max(0, agoraMs - peixe.nascimentoMs);
}

// Quantos ms faltam para a próxima fase começar, ou null se já é idoso.
// Arredonda para cima para nunca ficar 1 ms antes da fronteira.
export function msAteProximaFase(peixe, agoraMs) {
  const proxima = FASES[FASES.indexOf(faseDaIdade(idadeMs(peixe, agoraMs))) + 1];
  if (!proxima) return null;
  return Math.ceil(INICIO_DA_FASE_MS[proxima] - idadeMs(peixe, agoraMs));
}

// Troca a fase conforme a idade. Se o peixe cresceu, o corpo ficou maior:
// puxa o peixe (e o destino dele) para dentro dos novos limites.
export function atualizarIdade(peixe, agoraMs) {
  const fase = faseDaIdade(idadeMs(peixe, agoraMs));
  if (fase === peixe.fase) return;
  peixe.fase = fase;
  const lim = limitesDoPeixe(fase);
  peixe.x = limitar(peixe.x, lim.minX, lim.maxX);
  peixe.y = limitar(peixe.y, lim.minY, lim.maxY);
  if (peixe.destino) {
    peixe.destino = {
      x: limitar(peixe.destino.x, lim.minX, lim.maxX),
      y: limitar(peixe.destino.y, lim.minY, lim.maxY),
    };
  }
}

function limitar(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

// Quadro da animação de nadar (0 a 3) neste instante.
export function quadroDeNado(peixe) {
  return Math.floor(peixe.tempoAnimacao * QUADROS_POR_SEGUNDO) % QUADROS_DE_NADO;
}

function escolherDestino(peixe, rng) {
  const lim = limitesDoPeixe(peixe.fase);
  const podeEsquerda = peixe.x - DISTANCIA_MINIMA_X >= lim.minX;
  const podeDireita = peixe.x + DISTANCIA_MINIMA_X <= lim.maxX;

  let vaiDireita;
  if (podeEsquerda && podeDireita) vaiDireita = rng.inteiro(0, 1) === 1;
  else vaiDireita = podeDireita;

  const x = vaiDireita
    ? rng.inteiro(Math.ceil(peixe.x + DISTANCIA_MINIMA_X), lim.maxX)
    : rng.inteiro(lim.minX, Math.floor(peixe.x - DISTANCIA_MINIMA_X));

  const yMin = Math.max(lim.minY, Math.ceil(peixe.y - VARIACAO_Y));
  const yMax = Math.min(lim.maxY, Math.floor(peixe.y + VARIACAO_Y));
  const y = rng.inteiro(yMin, yMax);
  return { x, y };
}

// Um passo do peixe (dt em segundos): nada até o destino, espera um pouco e sorteia outro.
// comida: o grão que ele deve perseguir agora ({ x, y }), ou null. Com comida na água ele vai atrás
// dela, esteja com fome ou não, e deixa o passeio para depois.
export function atualizarPeixe(peixe, dt, rng, comida = null) {
  // Peixe doente nada e bate a cauda na metade da velocidade (doc 03 e 04).
  const ritmo = peixe.estado === 'doente' ? FATOR_VELOCIDADE_DOENTE : 1;
  peixe.tempoAnimacao += dt * ritmo;

  if (comida) {
    const lim = limitesDoPeixe(peixe.fase);
    peixe.destino = { x: limitar(comida.x, lim.minX, lim.maxX), y: limitar(comida.y, lim.minY, lim.maxY) };
    peixe.movimento = 'nadando';
  } else if (peixe.movimento === 'esperando') {
    peixe.espera -= dt;
    if (peixe.espera <= 0) {
      peixe.destino = escolherDestino(peixe, rng);
      peixe.trajeto++;
      peixe.movimento = 'nadando';
      virarParaODestino(peixe); // já vira antes de sair nadando
    }
    return;
  }

  const passo = VELOCIDADE_NADO * ritmo * (comida ? FATOR_VELOCIDADE_COMIDA : 1) * dt;
  if (darPasso(peixe, passo)) {
    peixe.movimento = 'esperando';
    peixe.espera = rng.inteiro(5, 30) / 10; // de 0,5 a 3 segundos
  }
}

// Anda `passo` pixels em direção ao destino. Devolve true se chegou (e então destino vira null).
function darPasso(peixe, passo) {
  const dx = peixe.destino.x - peixe.x;
  const dy = peixe.destino.y - peixe.y;
  const distancia = Math.sqrt(dx * dx + dy * dy);
  if (distancia <= passo) {
    peixe.x = peixe.destino.x;
    peixe.y = peixe.destino.y;
    peixe.destino = null;
    return true;
  }
  peixe.x += (dx / distancia) * passo;
  peixe.y += (dy / distancia) * passo;
  virarParaODestino(peixe);
  return false;
}

// Peixe abrigado da chuva (core/abrigo.js): vai depressa até a pedra e fica por ali, indo e vindo ao longo dela
// (às vezes por trás, às vezes aparecendo nas pontas), para o jogador ver que ele está lá.
// alvo = { x, y, minX, maxX } (alvoDoAbrigo). Se ele está fora da faixa por mais de toleranciaPx (por exemplo
// porque a câmera mexeu na pedra, que anda em paralaxe), volta para o alvo na hora. cfg = config.abrigoDaChuva.
export function atualizarPeixeAbrigado(peixe, dt, rng, alvo, cfg) {
  const ritmo = peixe.estado === 'doente' ? FATOR_VELOCIDADE_DOENTE : 1;
  peixe.tempoAnimacao += dt * ritmo;
  const lim = limitesDoPeixe(peixe.fase);
  const tx = limitar(alvo.x, lim.minX, lim.maxX);
  const ty = limitar(alvo.y, lim.minY, lim.maxY);
  // Dentro da faixa do vai e vem (com folga) e perto do chão: está bem onde está.
  const aposto = peixe.x >= alvo.minX - cfg.toleranciaPx && peixe.x <= alvo.maxX + cfg.toleranciaPx
    && peixe.y >= ty - cfg.subidaPx - cfg.toleranciaPx && peixe.y <= ty + cfg.toleranciaPx;

  if (peixe.movimento === 'nadando' && !peixe.destino) peixe.movimento = 'esperando'; // sobrou de outro passeio
  if (peixe.movimento === 'esperando') {
    peixe.espera -= dt;
    if (aposto && peixe.espera > 0) return; // parado um instante
    if (!aposto) {
      peixe.destino = { x: tx, y: ty };
    } else {
      // Já está na faixa e a espera acabou: vai a outro ponto da pedra (nunca ao mesmo lugar, para se ver o movimento).
      let x = rng.inteiro(alvo.minX, alvo.maxX);
      if (Math.abs(x - peixe.x) < cfg.passoMinimoPx) x = peixe.x < (alvo.minX + alvo.maxX) / 2 ? alvo.maxX : alvo.minX;
      peixe.destino = { x: limitar(x, lim.minX, lim.maxX), y: limitar(ty - rng.inteiro(0, cfg.subidaPx), lim.minY, lim.maxY) };
    }
    peixe.movimento = 'nadando';
    virarParaODestino(peixe);
  }
  if (darPasso(peixe, VELOCIDADE_NADO * ritmo * cfg.velocidade * dt)) {
    peixe.movimento = 'esperando';
    peixe.espera = rng.inteiro(cfg.esperaSeg[0] * 10, cfg.esperaSeg[1] * 10) / 10;
  }
}

// Peixe namorando: nada (mais animado) até o lugar do encontro e, ao chegar, fica ali olhando para
// o parceiro. alvo = { x, y, olharPara } (olharPara: 1 ou -1).
export function atualizarPeixeNamorando(peixe, dt, alvo) {
  const ritmo = peixe.estado === 'doente' ? FATOR_VELOCIDADE_DOENTE : 1;
  peixe.tempoAnimacao += dt * ritmo;
  const lim = limitesDoPeixe(peixe.fase);
  const tx = limitar(alvo.x, lim.minX, lim.maxX);
  const ty = limitar(alvo.y, lim.minY, lim.maxY);
  const dx = tx - peixe.x;
  const dy = ty - peixe.y;
  const distancia = Math.sqrt(dx * dx + dy * dy);
  const passo = VELOCIDADE_NADO * ritmo * FATOR_VELOCIDADE_COMIDA * dt;
  peixe.destino = null;
  if (distancia <= passo) {
    peixe.x = tx;
    peixe.y = ty;
    peixe.movimento = 'esperando';
    peixe.direcao = alvo.olharPara;
  } else {
    peixe.x += (dx / distancia) * passo;
    peixe.y += (dy / distancia) * passo;
    peixe.movimento = 'nadando';
    if (Math.abs(dx) > 0.5) peixe.direcao = dx > 0 ? 1 : -1;
  }
}

// Peixe parado (fazendo cocô): não sai do lugar, mas a cauda continua batendo.
export function atualizarPeixeParado(peixe, dt) {
  const ritmo = peixe.estado === 'doente' ? FATOR_VELOCIDADE_DOENTE : 1;
  peixe.tempoAnimacao += dt * ritmo;
}

// Peixe morto: não nada; sobe devagar até a superfície e fica boiando lá, de barriga para cima.
export function atualizarPeixeMorto(peixe, dt) {
  const { minY } = limitesDoPeixe(peixe.fase);
  peixe.y = Math.max(minY, peixe.y - VELOCIDADE_BOIA * dt);
}

// Olha para o lado do destino. Se o destino está quase na vertical, mantém o lado atual.
function virarParaODestino(peixe) {
  const dx = peixe.destino.x - peixe.x;
  if (Math.abs(dx) > 0.5) peixe.direcao = dx > 0 ? 1 : -1;
}
