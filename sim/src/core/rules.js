// As regras do jogo (doc 03): o que muda sozinho com o passar do tempo.
// Nesta etapa: saciedade, sujeira e pH. (Saúde, doença e morte entram no passo 2 da v0.2.)
// Todos os números vêm do config (sim/config/jogo.json); aqui só ficam as fórmulas.
import { MINUTO_MS, HORA_MS } from './clock.js';

// Aplica o tempo de JOGO que passou (dtMs) a todo o aquário.
// O tempo é cortado em pedaços de no máximo `passoMaximoMin` minutos. Assim o resultado
// é praticamente o mesmo a 1×, 60× ou 3600×, e também depois de um "pular fase" de vários dias.
export function atualizarRegras(aquario, dtMs, config) {
  const passoMaximo = config.passoMaximoMin * MINUTO_MS;
  let resta = dtMs;
  while (resta > 0) {
    const passo = Math.min(resta, passoMaximo);
    aplicarPasso(aquario, passo / HORA_MS, config);
    resta -= passo;
  }
}

function aplicarPasso(aquario, horas, config) {
  // Saciedade: cada peixe fica com fome no mesmo ritmo.
  const queda = (100 / config.saciedade.horasParaZerar) * horas;
  for (const peixe of aquario.peixes) {
    peixe.saciedade = Math.max(0, peixe.saciedade - queda);
  }

  // Sujeira: cada peixe a mais acelera o ritmo. (Sem peixe nenhum conta como 1.)
  const cfgSujeira = config.sujeira;
  const fator = 1 + cfgSujeira.aumentoPorPeixeExtra * (Math.max(1, aquario.peixes.length) - 1);
  const subida = (100 / (cfgSujeira.diasParaEncher * 24)) * fator * horas;
  aquario.sujeira = Math.min(100, aquario.sujeira + subida);

  // pH: cai um passo de tempos em tempos; quanto mais suja a água, mais rápido.
  // phProgresso é "quanto do próximo passo já andou" (de 0 a 1).
  aquario.phProgresso += horas / horasPorPassoDoPh(aquario.sujeira, config.ph);
  while (aquario.phProgresso >= 1 && aquario.phPasso > 0) {
    aquario.phProgresso -= 1;
    aquario.phPasso -= 1;
  }
  // No fundo da escala não há para onde cair: não guarda progresso, senão o pH
  // despencaria de novo logo depois de ser regulado.
  if (aquario.phPasso === 0) aquario.phProgresso = 0;
}

// Quantas horas o pH leva para cair 1 passo, conforme a sujeira (doc 03, seção 2).
export function horasPorPassoDoPh(sujeira, cfgPh) {
  if (sujeira < cfgPh.sujeiraBaixaAbaixoDe) return cfgPh.horasPorPasso.sujeiraBaixa;
  if (sujeira > cfgPh.sujeiraAltaAcimaDe) return cfgPh.horasPorPasso.sujeiraAlta;
  return cfgPh.horasPorPasso.sujeiraMedia;
}

// O pH do aquário em número (ex.: 7.0) e a nota dele (0 a 100).
export function valorDoPh(aquario, config) {
  return config.ph.valores[aquario.phPasso];
}

export function notaDoPh(aquario, config) {
  return config.ph.notas[aquario.phPasso];
}
