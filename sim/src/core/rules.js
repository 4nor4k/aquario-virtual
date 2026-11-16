// As regras do jogo (doc 03): o que muda sozinho com o passar do tempo.
// Saciedade, sujeira, pH, saúde, doença, morte e Game Over.
// Todos os números vêm do config (sim/config/jogo.json); aqui só ficam as fórmulas.
import { MINUTO_MS, HORA_MS } from './clock.js';
import { idadeMs, fimDaVidaNatural } from './fish.js';

// Aplica o tempo de JOGO que passou (dtMs) a todo o aquário. agoraMs é a hora do jogo
// no FIM desse trecho (de onde sai a idade dos peixes).
// O tempo é cortado em pedaços de no máximo `passoMaximoMin` minutos. Assim o resultado
// é praticamente o mesmo a 1×, 60× ou 3600×, e também depois de um "pular fase" de vários dias.
// Depois do Game Over as regras ficam congeladas.
export function atualizarRegras(aquario, dtMs, agoraMs, config) {
  const passoMaximo = config.passoMaximoMin * MINUTO_MS;
  let resta = dtMs;
  let hora = agoraMs - dtMs; // hora do jogo no começo do pedaço
  while (resta > 0 && !aquario.gameOver) {
    const passo = Math.min(resta, passoMaximo);
    resta -= passo;
    hora += passo;
    aplicarPasso(aquario, passo / HORA_MS, hora, config);
  }
}

function aplicarPasso(aquario, horas, agoraMs, config) {
  const vivos = aquario.vivos();
  if (vivos.length === 0) return;

  // Saciedade: cada peixe vivo fica com fome no mesmo ritmo.
  const queda = (100 / config.saciedade.horasParaZerar) * horas;
  for (const peixe of vivos) {
    peixe.saciedade = Math.max(0, peixe.saciedade - queda);
  }

  // Sujeira: cada peixe vivo a mais acelera o ritmo.
  const cfgSujeira = config.sujeira;
  const fator = 1 + cfgSujeira.aumentoPorPeixeExtra * (vivos.length - 1);
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

  // Saúde, doença e morte de cada peixe vivo.
  let causaDaUltimaMorte = null;
  for (const peixe of vivos) {
    if (fimDaVidaNatural(idadeMs(peixe, agoraMs))) {
      morrer(aquario, peixe, 'velhice');
      causaDaUltimaMorte = 'velhice';
      continue;
    }

    const variacao = taxaDaSaude(mediaDoPeixe(peixe, aquario, config), config.saude) * horas;
    peixe.saude = Math.min(100, Math.max(0, peixe.saude + variacao));
    if (peixe.saude <= 0) {
      morrer(aquario, peixe, 'cuidado');
      causaDaUltimaMorte = 'cuidado';
      continue;
    }

    const doente = peixe.saude < config.saude.doenteAbaixoDe;
    if (doente && peixe.estado === 'saudavel') {
      peixe.estado = 'doente';
      aquario.eventos.registrar({ tipo: 'adoeceu', peixeId: peixe.id });
    } else if (!doente && peixe.estado === 'doente') {
      peixe.estado = 'saudavel';
      aquario.eventos.registrar({ tipo: 'recuperou', peixeId: peixe.id });
    }
  }

  // Game Over: quando não resta nenhum peixe vivo.
  if (causaDaUltimaMorte && aquario.vivos().length === 0) {
    aquario.gameOver = true;
    aquario.eventos.registrar({ tipo: 'gameOver', causa: causaDaUltimaMorte });
  }
}

function morrer(aquario, peixe, causa) {
  peixe.estado = 'morto';
  peixe.causaDaMorte = causa;
  if (causa === 'cuidado') peixe.saude = 0;
  aquario.eventos.registrar({ tipo: 'morreu', peixeId: peixe.id, causa });
}

// Média dos três indicadores, de 0 a 100, com pesos iguais (doc 03, seção 3).
export function mediaDoPeixe(peixe, aquario, config) {
  return (peixe.saciedade + (100 - aquario.sujeira) + notaDoPh(aquario, config)) / 3;
}

// Quanto a saúde muda por hora, conforme a média (faixas do config, da maior para a menor).
export function taxaDaSaude(media, cfgSaude) {
  for (const faixa of cfgSaude.faixas) {
    if (media >= faixa.mediaMinima) return faixa.porHora;
  }
  return cfgSaude.faixas[cfgSaude.faixas.length - 1].porHora;
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
