// O minigame "Caçar" (doc 14): por 1 minuto o peixe é controlado pelo joystick e caça larvas que fogem dele.
// É só a LÓGICA (tempo, larvas, pontos, pausa, recorde). Não desenha, não lê arquivo e não conhece a hora real:
// o tempo chega em `dt` (segundos REAIS, não acelera com o painel de tempo).
//
// Estados (cacada.fase): null (não está caçando) · 'contagem' (3, 2, 1) · 'jogando' · 'pausa' · 'fim'.
// Controles: ver apertar(). Os números estão em config/jogo.json, seção "cacada".
import { MUNDO_LARGURA } from './mundo.js';
import { TAMANHO_POR_FASE, atualizarPeixeControlado, limitesDoPeixe } from './fish.js';

export const FASES_DA_CACADA = { CONTAGEM: 'contagem', JOGANDO: 'jogando', PAUSA: 'pausa', FIM: 'fim' };
export const ITENS_DA_PAUSA = ['continuar', 'reiniciar', 'sair'];

const MARGEM_X = 4;
const FOLGA_Y = 4; // a larva pode ficar um pouco além de onde o centro do peixe chega (a captura alcança 6 px)

// Onde uma larva pode estar: dentro da água E onde a boca do peixe consegue chegar (o centro do peixe não
// passa de limitesDoPeixe, então uma larva mais longe que isso, no teto ou no chão, seria impossível de pegar).
export function limitesDaLarva(fase) {
  const lim = limitesDoPeixe(fase);
  return { minX: MARGEM_X, maxX: MUNDO_LARGURA - MARGEM_X, minY: lim.minY - FOLGA_Y, maxY: lim.maxY + FOLGA_Y };
}

const limitar = (v, min, max) => Math.min(max, Math.max(min, v));

// A boca do peixe: um ponto na frente do corpo (é ela que pega a larva).
export function bocaDoPeixe(peixe) {
  const { largura } = TAMANHO_POR_FASE[peixe.fase];
  return { x: peixe.x + peixe.direcao * (largura / 2 - 2), y: peixe.y };
}

// rng: o sorteio com semente (core/rng.js). recorde: o melhor resultado já feito (vem do arquivo salvo).
// aoTerminar({ pontos, novoRecorde }): chamado quando o tempo acaba (a interface salva o jogo).
export function criarCacada({ config, rng, recorde = 0, aoTerminar = () => {} }) {
  const cfg = config.cacada;
  let fase = null;
  let anterior = null;       // o que estava antes da pausa ('contagem' ou 'jogando')
  let peixe = null;
  let restante = 0;          // segundos até o fim da partida
  let contagem = 0;          // segundos até começar
  let pontos = 0;
  let novoRecorde = false;
  let melhor = recorde;
  let item = 0;              // o item escolhido na pausa
  let larvas = [];
  let reaparecem = [];       // contagens (s) para cada larva comida voltar
  let tempo = 0;             // segundos desde o começo da partida (só para animar)

  function sortearAngulo() { return rng.decimal() * Math.PI * 2; }
  function sortearTroca() {
    const [min, max] = cfg.trocaDirecaoSeg;
    return min + rng.decimal() * (max - min);
  }

  // Uma larva nova, longe do peixe (e não tão longe que saia da tela).
  function novaLarva() {
    const L = limitesDaLarva(peixe.fase);
    let ponto = null;   // o que serve: nem perto demais nem longe demais
    let reserva = null; // se nada servir, qualquer ponto que ao menos não seja perto demais
    for (let i = 0; i < 30 && !ponto; i++) {
      const x = L.minX + rng.decimal() * (L.maxX - L.minX);
      const y = L.minY + rng.decimal() * (L.maxY - L.minY);
      const d = Math.hypot(x - peixe.x, y - peixe.y);
      if (d >= cfg.distanciaMinimaAoNascer && d <= cfg.distanciaMaximaAoNascer) ponto = { x, y };
      else if (d >= cfg.distanciaMinimaAoNascer) reserva = { x, y };
    }
    // Sem lugar longe o bastante (mundo pequeno): cai no canto mais afastado.
    ponto = ponto ?? reserva ?? { x: peixe.x < MUNDO_LARGURA / 2 ? L.maxX : L.minX, y: limitar(peixe.y, L.minY, L.maxY) };
    return {
      x: ponto.x, y: ponto.y, ang: sortearAngulo(), mudaEm: sortearTroca(), desvio: 0, fugindo: false, fase: rng.decimal() * Math.PI * 2,
    };
  }

  function comecar() {
    restante = cfg.duracaoSeg;
    contagem = cfg.contagemSeg;
    pontos = 0;
    novoRecorde = false;
    tempo = 0;
    item = 0;
    anterior = null;
    reaparecem = [];
    larvas = [];
    fase = FASES_DA_CACADA.CONTAGEM;
    for (let i = 0; i < cfg.larvas; i++) larvas.push(novaLarva());
  }

  function atualizarLarva(l, dt) {
    const dist = Math.hypot(l.x - peixe.x, l.y - peixe.y);
    const fugindo = dist < cfg.raioSusto;
    l.fugindo = fugindo;
    l.mudaEm -= dt;
    if (fugindo) {
      // Foge para longe do peixe, mas em zigue-zague: a cada instante sorteia um desvio.
      if (l.mudaEm <= 0 || !l.estavaFugindo) {
        l.desvio = (rng.decimal() * 2 - 1) * (cfg.zigueZagueGraus * Math.PI) / 180;
        l.mudaEm = 0.25 + rng.decimal() * 0.25;
      }
      // Encostada numa parede, ela escorrega ao longo dela (só no canto fica sem saída).
      const L = limitesDaLarva(peixe.fase);
      let ax = l.x - peixe.x;
      let ay = l.y - peixe.y;
      const foraX = (l.x <= L.minX + 1 && ax < 0) || (l.x >= L.maxX - 1 && ax > 0);
      const foraY = (l.y <= L.minY + 1 && ay < 0) || (l.y >= L.maxY - 1 && ay > 0);
      if (foraX && !foraY) { ax = 0; ay = ay >= 0 ? 1 : -1; }
      else if (foraY && !foraX) { ay = 0; ax = ax >= 0 ? 1 : -1; }
      l.ang = Math.atan2(ay, ax) + (foraX !== foraY ? l.desvio * 0.3 : l.desvio);
    } else if (l.mudaEm <= 0) {
      l.ang = sortearAngulo();
      l.mudaEm = sortearTroca();
    }
    l.estavaFugindo = fugindo;
    const v = fugindo ? cfg.velocidadeFuga : cfg.velocidadePasseio;
    const L = limitesDaLarva(peixe.fase);
    // Na parede ela só escorrega: o que bate num limite zera aquele eixo (por isso larva no canto é presa fácil).
    l.x = limitar(l.x + Math.cos(l.ang) * v * dt, L.minX, L.maxX);
    l.y = limitar(l.y + Math.sin(l.ang) * v * dt, L.minY, L.maxY);
    l.fase += dt * (fugindo ? 14 : 6); // a minhoca ondula mais depressa quando foge
  }

  function pegarLarvas() {
    const boca = bocaDoPeixe(peixe);
    for (let i = larvas.length - 1; i >= 0; i--) {
      if (Math.hypot(larvas[i].x - boca.x, larvas[i].y - boca.y) <= cfg.raioCaptura) {
        larvas.splice(i, 1);
        pontos++;
        reaparecem.push(cfg.reaparecerSeg);
      }
    }
  }

  function terminar() {
    fase = FASES_DA_CACADA.FIM;
    item = 0;
    larvas = [];
    reaparecem = [];
    if (pontos > melhor) {
      melhor = pontos;
      novoRecorde = true;
    }
    aoTerminar({ pontos, novoRecorde });
  }

  function pausar() {
    if (fase !== FASES_DA_CACADA.JOGANDO && fase !== FASES_DA_CACADA.CONTAGEM) return;
    anterior = fase;
    fase = FASES_DA_CACADA.PAUSA;
    item = 0;
  }

  function continuar() {
    if (fase !== FASES_DA_CACADA.PAUSA) return;
    fase = anterior ?? FASES_DA_CACADA.JOGANDO;
    anterior = null;
  }

  function sair() {
    if (peixe) {
      peixe.controlado = false;
      peixe.movimento = 'esperando';
      peixe.destino = null;
      peixe.espera = 0.5;
    }
    fase = null;
    anterior = null;
    larvas = [];
    reaparecem = [];
    peixe = null;
  }

  return {
    get fase() { return fase; },
    get ativa() { return fase !== null; },
    get peixe() { return peixe; },
    get larvas() { return larvas; },
    get pontos() { return pontos; },
    get recorde() { return melhor; },
    get novoRecorde() { return novoRecorde; },
    get restante() { return restante; },
    get tempo() { return tempo; },
    get item() { return item; },
    // O número da contagem (3, 2, 1) ou 0 fora dela.
    get numeroDaContagem() { return fase === FASES_DA_CACADA.CONTAGEM || (fase === FASES_DA_CACADA.PAUSA && anterior === FASES_DA_CACADA.CONTAGEM) ? Math.ceil(contagem) : 0; },

    definirRecorde(valor) { melhor = Math.max(0, Math.floor(valor) || 0); },

    // Começa a caçada com este peixe (o menu confere antes se ele pode).
    iniciar(quem) {
      peixe = quem;
      peixe.controlado = true;
      peixe.namorando = null;
      peixe.fazendoCoco = 0;
      comecar();
    },

    reiniciar() {
      if (peixe) comecar();
    },

    pausar,
    continuar,
    sair,

    // botoes: { a, b, cima, baixo } = o que foi apertado agora. Devolve 'sair' quando o jogador sai do modo.
    //   contagem / jogando : A pausa
    //   pausa              : cima/baixo escolhem · A confirma (Continuar, Reiniciar ou Sair) · B continua
    //   fim                : A joga de novo · B sai
    apertar(botoes) {
      if (fase === FASES_DA_CACADA.JOGANDO || fase === FASES_DA_CACADA.CONTAGEM) {
        if (botoes.a) pausar();
      } else if (fase === FASES_DA_CACADA.PAUSA) {
        const n = ITENS_DA_PAUSA.length;
        if (botoes.cima) item = (item - 1 + n) % n;
        if (botoes.baixo) item = (item + 1) % n;
        if (botoes.b) continuar();
        else if (botoes.a) {
          const escolha = ITENS_DA_PAUSA[item];
          if (escolha === 'continuar') continuar();
          else if (escolha === 'reiniciar') comecar();
          else { sair(); return 'sair'; }
        }
      } else if (fase === FASES_DA_CACADA.FIM) {
        if (botoes.a) comecar();
        else if (botoes.b) { sair(); return 'sair'; }
      }
      return null;
    },

    // Um passo (dt em segundos reais). entrada: { dir: { x, y }, acelerando } (joystick e B segurado).
    atualizar(dt, { dir = { x: 0, y: 0 }, acelerando = false } = {}) {
      if (fase === FASES_DA_CACADA.CONTAGEM) {
        contagem -= dt;
        if (contagem <= 0) fase = FASES_DA_CACADA.JOGANDO;
        return;
      }
      if (fase !== FASES_DA_CACADA.JOGANDO) return; // pausa e fim: tudo congelado
      tempo += dt;
      restante = Math.max(0, restante - dt);
      atualizarPeixeControlado(peixe, dt, dir, acelerando ? cfg.velocidadeComB : cfg.velocidadePeixe, acelerando ? 2 : 1);
      for (const l of larvas) atualizarLarva(l, dt);
      pegarLarvas();
      for (let i = reaparecem.length - 1; i >= 0; i--) {
        reaparecem[i] -= dt;
        if (reaparecem[i] <= 0) {
          reaparecem.splice(i, 1);
          larvas.push(novaLarva());
        }
      }
      if (restante <= 0) terminar();
    },
  };
}
