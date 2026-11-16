// O peixe: dados, idade, fases e comportamento de nado.
// São só dados simples + funções, para traduzir fácil para C++ na Fase B.
import { MUNDO_LARGURA, AREIA_Y } from './mundo.js';
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
  filhote: { largura: 10, altura: 8 },
  jovem: { largura: 14, altura: 10 },
  adulto: { largura: 20, altura: 14 },
  idoso: { largura: 20, altura: 14 },
};

export const VELOCIDADE_NADO = 15;      // pixels por segundo
export const QUADROS_POR_SEGUNDO = 6;   // velocidade da animação de nadar
export const QUADROS_DE_NADO = 4;
export const FATOR_VELOCIDADE_DOENTE = 0.5; // peixe doente: metade da velocidade
export const VELOCIDADE_BOIA = 8;           // peixe morto sobe a 8 pixels por segundo

const MARGEM_SUPERFICIE = 4;  // o peixe não encosta na superfície
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
    minY: meiaA + MARGEM_SUPERFICIE,
    maxY: AREIA_Y - meiaA - MARGEM_AREIA,
  };
}

export function criarPeixe({
  id = 0, nome = 'Beta', especie = 'beta', fase = 'filhote', saciedade = 100, saude = 100,
  nascimentoMs = 0, x, y,
}) {
  if (!TAMANHO_POR_FASE[fase]) throw new RangeError(`fase desconhecida: ${fase}`);
  return {
    id,
    nome,
    especie,
    fase,
    saciedade,             // 0 a 100 (100 = de barriga cheia)
    saude,                 // 0 a 100 (em 0 o peixe morre)
    estado: 'saudavel',    // 'saudavel', 'doente' ou 'morto'
    causaDaMorte: null,    // 'velhice' ou 'cuidado' (falta de cuidado), só depois de morrer
    nascimentoMs,          // hora do jogo em que nasceu (a idade é "agora" menos isto)
    x,
    y,
    direcao: 1,            // 1 = olhando para a direita, -1 = para a esquerda
    destino: null,         // para onde está nadando: { x, y }
    movimento: 'esperando', // 'nadando' ou 'esperando' (o que está fazendo; não é a saúde)
    espera: 0.5,           // segundos que ainda vai ficar parado
    tempoAnimacao: 0,      // segundos acumulados, para escolher o quadro da animação
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
export function atualizarPeixe(peixe, dt, rng) {
  // Peixe doente nada e bate a cauda na metade da velocidade (doc 03 e 04).
  const ritmo = peixe.estado === 'doente' ? FATOR_VELOCIDADE_DOENTE : 1;
  peixe.tempoAnimacao += dt * ritmo;

  if (peixe.movimento === 'esperando') {
    peixe.espera -= dt;
    if (peixe.espera <= 0) {
      peixe.destino = escolherDestino(peixe, rng);
      peixe.movimento = 'nadando';
      virarParaODestino(peixe); // já vira antes de sair nadando
    }
    return;
  }

  const dx = peixe.destino.x - peixe.x;
  const dy = peixe.destino.y - peixe.y;
  const distancia = Math.sqrt(dx * dx + dy * dy);
  const passo = VELOCIDADE_NADO * ritmo * dt;

  if (distancia <= passo) {
    peixe.x = peixe.destino.x;
    peixe.y = peixe.destino.y;
    peixe.destino = null;
    peixe.movimento = 'esperando';
    peixe.espera = rng.inteiro(5, 30) / 10; // de 0,5 a 3 segundos
    return;
  }

  peixe.x += (dx / distancia) * passo;
  peixe.y += (dy / distancia) * passo;
  virarParaODestino(peixe);
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
