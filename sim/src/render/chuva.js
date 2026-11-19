// A chuva (doc 11, seção 5; doc 03, seção 7: "animação de chuva na superfície da água"):
//   - GOTAS que caem no ar, acima da água (risquinhos de 3 pixels, azul-acinzentados);
//   - ANÉIS que se abrem na superfície onde cada gota bate (pontinhos que se afastam para os lados).
// As gotas dependem só do número da gota e do tempo (como as partículas da água suja): mesma hora, mesma
// chuva, e andam com o MUNDO (ficam no lugar quando a câmera se mexe). O tempo é o tempo REAL.
// A quantidade de gotas cresce com o nível da chuva (0 a 1), então a chuva começa e para aos poucos.
import { ruido } from './filtro.js';
import { SUPERFICIE_Y, MUNDO_LARGURA } from '../core/mundo.js';
import { deslocamentoDaOnda } from './superficie.js';
import { LARGURA, ALTURA } from './tela.js';
import { COR } from './palette.js';

export const GOTAS_MAXIMAS = 130;     // no mundo todo, com a chuva forte
export const SEGUNDOS_DO_ANEL = 0.55; // quanto tempo o anel leva para abrir e sumir
const RAIO_MAXIMO_DO_ANEL = 4;

// De uma gota: onde cai (x do mundo), a velocidade (px/s) e o ciclo todo (cair + anel + pausa), em s.
export function dadosDaGota(k) {
  const a = ruido(k * 7 + 11);
  const b = ruido(k * 7 + 12);
  const c = ruido(k * 7 + 13);
  const velocidade = 58 + (b % 30);
  const queda = (SUPERFICIE_Y + 1) / velocidade;
  return {
    x: (a >>> 3) % MUNDO_LARGURA,
    velocidade,
    queda,
    ciclo: queda + SEGUNDOS_DO_ANEL + 0.1 + (c % 70) / 100,
    deslocamento: (c >>> 7) % 100 / 10, // cada gota começa num ponto diferente do ciclo
  };
}

// O que a gota k está fazendo no instante `tempo`: { fase: 'caindo', y } ou { fase: 'anel', raio } ou null.
export function estadoDaGota(k, tempo) {
  const g = dadosDaGota(k);
  const t = (tempo + g.deslocamento) % g.ciclo;
  if (t < g.queda) return { fase: 'caindo', y: t * g.velocidade, x: g.x };
  const u = t - g.queda;
  if (u < SEGUNDOS_DO_ANEL) return { fase: 'anel', raio: 1 + Math.floor((u / SEGUNDOS_DO_ANEL) * RAIO_MAXIMO_DO_ANEL), x: g.x };
  return null;
}

// O ar é a cor 1 (ou, no relâmpago, a cor do céu); a água é a cor 1, a água suja ou o raio de luz.
const E_AR = (c) => c === COR.AGUA || c === COR.CEU_RELAMPAGO;
const E_AGUA = (c) => c === COR.AGUA || c === COR.AGUA_SUJA || c === COR.RAIO_DE_LUZ;

// chuvaNivel: 0 a 1 (de core/clima.js). Chame depois da superfície e do céu.
export function desenharChuva(quadro, camera, chuvaNivel, tempo = 0) {
  if (!(chuvaNivel > 0.02)) return;
  const cx = Math.round(camera.x);
  const cy = Math.round(camera.y);
  const quantas = Math.ceil(GOTAS_MAXIMAS * Math.min(1, chuvaNivel));
  const pixel = (wx, wy, podeSer) => {
    const x = wx - cx;
    const y = wy - cy;
    if (x < 0 || x >= LARGURA || y < 0 || y >= ALTURA) return;
    if (podeSer(quadro[y * LARGURA + x])) quadro[y * LARGURA + x] = COR.CHUVA;
  };
  for (let k = 0; k < quantas; k++) {
    const e = estadoDaGota(k, tempo);
    if (!e) continue;
    const linhaEm = (wx) => SUPERFICIE_Y + deslocamentoDaOnda(wx, tempo); // a onda muda de coluna para coluna
    const linha = linhaEm(e.x);
    if (e.fase === 'caindo') {
      const y = Math.round(e.y);
      if (y < linha) pixel(e.x, y, E_AR);
      for (let cauda = 1; cauda <= 2; cauda++) { // o risquinho tem 3 pixels (a gota e a cauda atrás dela)
        if (y - cauda >= 0 && y - cauda < linha) pixel(e.x, y - cauda, E_AR);
      }
    } else {
      // O anel se abre: pontinhos para os dois lados da gota, logo abaixo da linha da água.
      const esq = e.x - e.raio;
      const dir = e.x + e.raio;
      pixel(esq, linhaEm(esq) + 1, E_AGUA);
      pixel(dir, linhaEm(dir) + 1, E_AGUA);
      if (e.raio >= 3) { pixel(esq + 1, linhaEm(esq + 1) + 2, E_AGUA); pixel(dir - 1, linhaEm(dir - 1) + 2, E_AGUA); }
    }
  }
}
