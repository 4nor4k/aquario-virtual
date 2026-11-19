// O clima e a hora do dia (doc 11; doc 03 seção 7; doc 05, módulo "weather").
//
// Só afeta o CENÁRIO: o clima não muda a saúde do peixe. No simulador tudo é simulado; no ESP32 a
// hora virá do NTP ou do celular e o clima da cidade real, entregues a este mesmo objeto.
//
// Este módulo NÃO usa Date: a hora do dia (em minutos, de 0 a 1440) chega de fora, em
// atualizar(dt, horaRealMin). O tempo aqui é o tempo REAL (dt em segundos), não o do jogo: o dia não
// passa voando quando o jogo está a 3600×.
//
// O painel de testes pode FORÇAR a hora (fixa ou em ciclo rápido), a chuva e a temperatura; o que está
// forçado vence o automático.
import { criarRng } from './rng.js';

export const MINUTOS_NO_DIA = 1440;

// A intensidade do clarão do relâmpago (0 a 1) em um instante da piscada (progresso de 0 a 1):
// uma piscada forte, um respiro, uma segunda piscada e o apagar.
export function nivelDoRaio(progresso) {
  if (progresso < 0 || progresso >= 1) return 0;
  if (progresso < 0.2) return 1;
  if (progresso < 0.4) return 0.1;
  if (progresso < 0.75) return 0.9;
  return 0.9 * (1 - (progresso - 0.75) / 0.25);
}

export function criarClima({ semente = 1, config }) {
  const cfg = config.clima;
  const rng = criarRng((semente ^ 0xc11a) >>> 0);
  const entre = (min, max) => min + rng.decimal() * (max - min);
  const faseDaTemperatura = rng.decimal() * Math.PI * 2;

  let modoHora = 'relogio';          // 'relogio' (hora real), 'ciclo' (um dia em cicloRapidoSeg) ou 'fixa'
  let horaMin = 12 * 60;             // a hora do dia agora, em minutos (0 a 1440)
  let horaFixaMin = 12 * 60;
  let chuva = false;                 // está chovendo (de verdade, não só o nível visual)?
  let chuvaForcada = null;           // null = automática; true/false = forçada pelo painel
  let restanteDaChuva = entre(cfg.chuva.semChuvaMinSeg, cfg.chuva.semChuvaMaxSeg);
  let chuvaNivel = 0;                // 0 a 1: a chuva entra e sai aos poucos
  let raioAtivo = false;
  let raioTempo = 0;
  let proximoRaio = entre(cfg.relampago.intervaloMinSeg, cfg.relampago.intervaloMaxSeg);
  let temperaturaForcada = null;     // null = automática
  let tempoTotal = 0;                // segundos reais desde que começou (para a variação lenta)

  // A temperatura automática: uma curva do dia (mais fria de madrugada, mais quente à tarde) mais
  // uma variação lenta.
  function temperaturaAutomatica() {
    const h = horaMin / 60;
    const doDia = cfg.temperaturaMedia + cfg.temperaturaAmplitude * Math.sin(((h - 9) / 24) * Math.PI * 2);
    const lenta = cfg.temperaturaVariacao * Math.sin((tempoTotal / 540) * Math.PI * 2 + faseDaTemperatura);
    return doDia + lenta;
  }

  return {
    get horaMin() { return horaMin; },
    get hora() { return horaMin / 60; },
    get modoHora() { return modoHora; },
    get chuva() { return chuva; },
    get chuvaNivel() { return chuvaNivel; },
    get chuvaForcada() { return chuvaForcada; },
    get temperaturaForcada() { return temperaturaForcada; },
    get temperatura() { return temperaturaForcada ?? temperaturaAutomatica(); },
    get frio() { return (temperaturaForcada ?? temperaturaAutomatica()) < cfg.friaAbaixoDe; },
    // O clarão do relâmpago agora (0 a 1).
    get raio() { return raioAtivo ? nivelDoRaio(raioTempo / cfg.relampago.duracaoSeg) : 0; },

    // dt: segundos reais; horaRealMin: a hora de agora, em minutos do dia (de fora, do relógio).
    atualizar(dt, horaRealMin = horaMin) {
      tempoTotal += dt;
      if (modoHora === 'relogio') horaMin = ((horaRealMin % MINUTOS_NO_DIA) + MINUTOS_NO_DIA) % MINUTOS_NO_DIA;
      else if (modoHora === 'ciclo') horaMin = (horaMin + (dt * MINUTOS_NO_DIA) / cfg.cicloRapidoSeg) % MINUTOS_NO_DIA;
      else horaMin = horaFixaMin;

      // Chuva: automática (alterna entre chover e não chover) ou forçada.
      if (chuvaForcada === null) {
        restanteDaChuva -= dt;
        if (restanteDaChuva <= 0) {
          chuva = !chuva;
          restanteDaChuva = chuva
            ? entre(cfg.chuva.duracaoMinSeg, cfg.chuva.duracaoMaxSeg)
            : entre(cfg.chuva.semChuvaMinSeg, cfg.chuva.semChuvaMaxSeg);
        }
      } else {
        chuva = chuvaForcada;
      }
      const passo = dt / cfg.chuva.segundosParaMudar;
      chuvaNivel = chuva ? Math.min(1, chuvaNivel + passo) : Math.max(0, chuvaNivel - passo);

      // Relâmpago: só com chuva.
      if (!chuva) {
        raioAtivo = false;
      } else if (raioAtivo) {
        raioTempo += dt;
        if (raioTempo >= cfg.relampago.duracaoSeg) raioAtivo = false;
      } else {
        proximoRaio -= dt;
        if (proximoRaio <= 0) {
          raioAtivo = true;
          raioTempo = 0;
          proximoRaio = entre(cfg.relampago.intervaloMinSeg, cfg.relampago.intervaloMaxSeg);
        }
      }
    },

    // --- O que o painel de testes força ---------------------------------------------------------

    // modo: 'relogio', 'ciclo' ou 'fixa'. hora: de 0 a 24 (só na 'fixa'). O ciclo continua da hora de agora.
    definirHora(modo, hora = horaMin / 60) {
      if (!['relogio', 'ciclo', 'fixa'].includes(modo)) throw new RangeError(`modo de hora desconhecido: ${modo}`);
      modoHora = modo;
      horaFixaMin = ((hora * 60) % MINUTOS_NO_DIA + MINUTOS_NO_DIA) % MINUTOS_NO_DIA;
      if (modo === 'fixa') horaMin = horaFixaMin;
    },
    // true (chove), false (não chove) ou null (automática).
    forcarChuva(valor) {
      chuvaForcada = valor;
      if (valor !== null) chuva = valor;
    },
    // Um valor em °C, ou null (automática).
    forcarTemperatura(valor) {
      temperaturaForcada = valor;
    },
  };
}
