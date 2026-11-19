// Casal, namoro, ovos e filhotes (doc 03, seções 5 e 6; plano em doc 10).
//
// O CASAL se forma quando se adota o parceiro (aquario.adotarParceiro). Cada peixe tem no máximo um
// parceiro. Um casal reproduz quando os dois são ADULTOS (idoso não), com saúde de 90 ou mais por 30
// minutos seguidos, já passaram 3 dias do último namoro e cabe pelo menos mais um peixe (o limite de
// 5 conta peixes vivos + ovos).
//
// Quando reproduz: o casal NAMORA (os dois nadam até se encontrar, aparecem corações, ~6 s de tempo
// REAL), surgem 1 a 3 ovos (cortados pelo que cabe), que caem até a areia e ECLODEM 1 hora depois
// (hora do JOGO: acelera com o relógio). Cada filhote tem sexo sorteado e a cor de um dos pais.
//
// Duas camadas, como no cocô: as REGRAS andam em tempo de jogo (atualizarCasais, eclodirOvos, chamadas
// por rules.js, também durante a ausência) e a ANIMAÇÃO anda em tempo real (atualizarNamoros, chamada
// por aquarium.atualizar). Com o jogo fechado não há animação: os ovos já nascem parados na areia.
import { MINUTO_MS, HORA_MS, DIA_MS } from './clock.js';
import { faseDaIdade, idadeMs, limitesDoPeixe } from './fish.js';
import { AREIA_Y } from './mundo.js';

export const OVO_Y_AREIA = AREIA_Y - 3;    // o ovo (3 pixels de altura) para em cima da areia
export const DISTANCIA_DO_NAMORO = 17;     // os dois ficam a 17 px do ponto de encontro, de frente um para o outro

// { ok, motivo }: este peixe pode ganhar um parceiro agora?
export function podeAdotarParceiro(aquario, peixe, agoraMs) {
  if (peixe.estado === 'morto') return { ok: false, motivo: 'morto' };
  if (faseDaIdade(idadeMs(peixe, agoraMs)) !== 'adulto') return { ok: false, motivo: 'naoAdulto' };
  if (aquario.casalDe(peixe)) return { ok: false, motivo: 'temParceiro' };
  if (aquario.vagas() < 1) return { ok: false, motivo: 'cheio' };
  return { ok: true, motivo: null };
}

// O casal está em condições de reproduzir AGORA (os dois vivos, adultos e com saúde)?
function emBoasCondicoes(a, b, agoraMs, cfg) {
  return [a, b].every((p) => p && p.estado !== 'morto'
    && faseDaIdade(idadeMs(p, agoraMs)) === 'adulto' && p.saude >= cfg.saudeMinima);
}

// Passo das regras (tempo de jogo): conta os 30 min e, se der, o casal reproduz.
// passoMs = quanto tempo de jogo passou; agoraMs = a hora do jogo no fim do passo.
// animar: false durante a ausência (os ovos já aparecem na areia, sem namoro).
export function atualizarCasais(aquario, passoMs, agoraMs, config, { animar = true } = {}) {
  const cfg = config.reproducao;
  for (const casal of aquario.casais) {
    const a = aquario.peixePorId(casal.aId);
    const b = aquario.peixePorId(casal.bId);
    if (!emBoasCondicoes(a, b, agoraMs, cfg)) {
      casal.boasMs = 0; // qualquer falha zera a contagem
      continue;
    }
    casal.boasMs += passoMs;
    if (casal.boasMs < cfg.boasCondicoesMin * MINUTO_MS) continue;
    if (casal.ultimaMs !== null && agoraMs - casal.ultimaMs < cfg.intervaloEntreNinhadasDias * DIA_MS) continue;
    if (aquario.vagas() < 1) continue; // sem vaga: a contagem segue e reproduz quando abrir uma
    namorar(aquario, casal, a, b, agoraMs, config, animar);
  }
}

// O ponto onde o casal se encontra: no meio dos dois, longe o bastante das bordas para caberem.
function pontoDeEncontro(a, b) {
  const lim = limitesDoPeixe(a.fase);
  const folga = DISTANCIA_DO_NAMORO;
  const x = Math.min(lim.maxX - folga, Math.max(lim.minX + folga, (a.x + b.x) / 2));
  const y = Math.min(lim.maxY, Math.max(lim.minY, (a.y + b.y) / 2));
  return { x, y };
}

function namorar(aquario, casal, a, b, agoraMs, config, animar) {
  const cfg = config.reproducao;
  const rng = aquario.rngReproducao;
  const quantos = Math.min(rng.inteiro(cfg.ovosMin, cfg.ovosMax), aquario.vagas());
  const ponto = pontoDeEncontro(a, b);

  for (let i = 0; i < quantos; i++) {
    const x = ponto.x + (i - (quantos - 1) / 2) * 3; // lado a lado
    aquario.ovos.push({
      x,
      baseX: x,
      y: animar ? ponto.y : OVO_Y_AREIA,
      estado: animar ? 'esperando' : 'parado', // 'esperando' (ainda não apareceu) -> 'caindo' -> 'parado'
      espera: animar ? cfg.namoroSegundos : 0,
      tempo: 0,
      eclodeEmMs: agoraMs + cfg.eclosaoMin * MINUTO_MS,
      cor: rng.inteiro(0, 1) === 0 ? a.cor : b.cor,
      sexo: rng.inteiro(0, 1) === 0 ? 'macho' : 'femea',
      fase: rng.decimal() * Math.PI * 2, // para o balanço na queda
    });
  }
  casal.ultimaMs = agoraMs;
  casal.boasMs = 0;
  if (animar) {
    const esquerda = a.x <= b.x ? a : b;
    const direita = esquerda === a ? b : a;
    casal.namoro = { restante: cfg.namoroSegundos, x: ponto.x, y: ponto.y };
    esquerda.namorando = { x: ponto.x - DISTANCIA_DO_NAMORO, y: ponto.y, olharPara: 1 };
    direita.namorando = { x: ponto.x + DISTANCIA_DO_NAMORO, y: ponto.y, olharPara: -1 };
  }
  aquario.eventos.registrar({ tipo: 'reproducao', peixeIds: [a.id, b.id], ovos: quantos });
}

// Os ovos que já passou a hora de eclodir viram filhotes (tempo de jogo). Cada filhote nasce na
// hora exata em que o ovo devia eclodir, então a idade dele está certa mesmo depois de uma ausência.
export function eclodirOvos(aquario, agoraMs, config) {
  const cfg = config.reproducao;
  for (const ovo of [...aquario.ovos]) {
    if (ovo.estado === 'esperando' || agoraMs < ovo.eclodeEmMs) continue;
    aquario.ovos.splice(aquario.ovos.indexOf(ovo), 1);
    aquario.filhotesNascidos += 1;
    const lim = limitesDoPeixe('filhote');
    const filhote = aquario.adicionarPeixe({
      nome: `${cfg.nomeDoFilhote} ${aquario.filhotesNascidos}`,
      cor: ovo.cor,
      sexo: ovo.sexo,
      fase: 'filhote',
      x: Math.min(lim.maxX, Math.max(lim.minX, ovo.x)),
      y: Math.min(lim.maxY, Math.max(lim.minY, ovo.y)),
    }, ovo.eclodeEmMs);
    aquario.eventos.registrar({ tipo: 'nasceu', peixeId: filhote.id });
  }
}

// O morto que já passou tempo demais some sozinho (tempo de jogo).
export function removerMortosAntigos(aquario, agoraMs, config) {
  const limite = config.reproducao.morteSomeEmHoras * HORA_MS;
  for (const peixe of [...aquario.peixes]) {
    if (peixe.estado === 'morto' && peixe.morteMs !== null && agoraMs - peixe.morteMs >= limite) {
      aquario.removerPeixe(peixe);
    }
  }
}

// O peixe sai do namoro e volta a passear: para onde estava indo e espera um instante.
export function terminarNamoroDoPeixe(peixe) {
  peixe.namorando = null;
  peixe.destino = null;
  peixe.movimento = 'esperando';
  peixe.espera = 0.5;
}

// A animação (dt em segundos REAIS): os peixes do casal vão até o encontro, os ovos aparecem e caem.
export function atualizarNamoros(aquario, dt, config) {
  const cfg = config.reproducao;
  for (const casal of aquario.casais) {
    if (!casal.namoro) continue;
    casal.namoro.restante -= dt;
    if (casal.namoro.restante <= 0) {
      casal.namoro = null;
      for (const id of [casal.aId, casal.bId]) {
        const p = aquario.peixePorId(id);
        if (p) terminarNamoroDoPeixe(p);
      }
    }
  }
  for (const ovo of aquario.ovos) {
    if (ovo.estado === 'esperando') {
      ovo.espera -= dt;
      if (ovo.espera <= 0) { ovo.estado = 'caindo'; ovo.tempo = 0; }
    } else if (ovo.estado === 'caindo') {
      ovo.tempo += dt;
      ovo.y = Math.min(OVO_Y_AREIA, ovo.y + cfg.velocidadeQuedaOvo * dt);
      ovo.x = ovo.baseX + 0.6 * Math.sin(ovo.fase + ovo.tempo * 1.6);
      if (ovo.y >= OVO_Y_AREIA) { ovo.estado = 'parado'; ovo.x = ovo.baseX; }
    }
  }
}
