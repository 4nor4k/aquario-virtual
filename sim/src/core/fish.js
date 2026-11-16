// O peixe: dados e comportamento de nado. (Idade e fases entram no passo 5.)
// São só dados simples + funções, para traduzir fácil para C++ na Fase B.
import { MUNDO_LARGURA, AREIA_Y } from './mundo.js';

export const FASES = ['filhote', 'jovem', 'adulto', 'idoso'];

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

export function criarPeixe({ id = 0, nome = 'Beta', especie = 'beta', fase = 'adulto', x, y }) {
  if (!TAMANHO_POR_FASE[fase]) throw new RangeError(`fase desconhecida: ${fase}`);
  return {
    id,
    nome,
    especie,
    fase,
    x,
    y,
    direcao: 1,            // 1 = olhando para a direita, -1 = para a esquerda
    destino: null,         // para onde está nadando: { x, y }
    estado: 'esperando',   // 'nadando' ou 'esperando'
    espera: 0.5,           // segundos que ainda vai ficar parado
    tempoAnimacao: 0,      // segundos acumulados, para escolher o quadro da animação
  };
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
  peixe.tempoAnimacao += dt;

  if (peixe.estado === 'esperando') {
    peixe.espera -= dt;
    if (peixe.espera <= 0) {
      peixe.destino = escolherDestino(peixe, rng);
      peixe.estado = 'nadando';
      virarParaODestino(peixe); // já vira antes de sair nadando
    }
    return;
  }

  const dx = peixe.destino.x - peixe.x;
  const dy = peixe.destino.y - peixe.y;
  const distancia = Math.sqrt(dx * dx + dy * dy);
  const passo = VELOCIDADE_NADO * dt;

  if (distancia <= passo) {
    peixe.x = peixe.destino.x;
    peixe.y = peixe.destino.y;
    peixe.destino = null;
    peixe.estado = 'esperando';
    peixe.espera = rng.inteiro(5, 30) / 10; // de 0,5 a 3 segundos
    return;
  }

  peixe.x += (dx / distancia) * passo;
  peixe.y += (dy / distancia) * passo;
  virarParaODestino(peixe);
}

// Olha para o lado do destino. Se o destino está quase na vertical, mantém o lado atual.
function virarParaODestino(peixe) {
  const dx = peixe.destino.x - peixe.x;
  if (Math.abs(dx) > 0.5) peixe.direcao = dx > 0 ? 1 : -1;
}
