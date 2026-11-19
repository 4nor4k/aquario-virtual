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

  // Saciedade: cada peixe vivo fica com fome no mesmo ritmo (e digere o excesso mais depressa).
  for (const peixe of vivos) {
    peixe.saciedade = saciedadeDepoisDe(peixe.saciedade, horas, config.saciedade);
  }

  // Sujeira: cada peixe vivo a mais acelera o ritmo.
  const cfgSujeira = config.sujeira;
  const fator = 1 + cfgSujeira.aumentoPorPeixeExtra * (vivos.length - 1);
  const subida = (100 / (cfgSujeira.diasParaEncher * 24)) * fator * horas;
  aquario.sujeira = Math.min(100, aquario.sujeira + subida);
  // E o que os peixes comeram vai sujando a água aos poucos (veja sujar).
  liberarSujeiraPendente(aquario, agoraMs - horas * HORA_MS, agoraMs);

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

    let variacao = taxaDaSaude(mediaDoPeixe(peixe, aquario, config), config.saude) * horas;
    // Comeu demais: a saúde só volta a melhorar quando a barriga desce até o ideal (100).
    if (variacao > 0 && peixe.saciedade > config.saciedade.ideal) variacao = 0;
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

  if (causaDaUltimaMorte) verificarGameOver(aquario, causaDaUltimaMorte);
}

function morrer(aquario, peixe, causa) {
  peixe.estado = 'morto';
  peixe.causaDaMorte = causa;
  if (causa === 'cuidado') peixe.saude = 0;
  aquario.eventos.registrar({ tipo: 'morreu', peixeId: peixe.id, causa });
}

// Game Over: quando não resta nenhum peixe vivo.
function verificarGameOver(aquario, causa) {
  if (aquario.gameOver || aquario.vivos().length > 0) return;
  aquario.gameOver = true;
  aquario.causaDoGameOver = causa;
  aquario.eventos.registrar({ tipo: 'gameOver', causa });
}

// Mata um peixe de fora das regras (botão "Matar peixe" do painel de testes).
export function matarPeixe(aquario, peixe, causa = 'cuidado') {
  if (peixe.estado === 'morto') return;
  morrer(aquario, peixe, causa);
  verificarGameOver(aquario, causa);
}

// --- Avisos (o que está "impróprio", doc 03 e doc 04: HUD mínimo) ------------------------------

export function peixeComFome(peixe, config) {
  return peixe.saciedade < config.saciedade.improprioAbaixoDe;
}

// Quais indicadores do aquário estão impróprios agora. Sem peixe vivo, nada a avisar.
export function avisosDoAquario(aquario, config) {
  const vivos = aquario.vivos();
  if (vivos.length === 0) return { fome: false, sujeira: false, ph: false };
  return {
    fome: vivos.some((p) => peixeComFome(p, config)),
    sujeira: aquario.sujeira > config.sujeira.improprioAcimaDe,
    ph: notaDoPh(aquario, config) <= config.ph.improprioNotaAte,
  };
}

// Como a saciedade muda em `horas` horas sem ninguém comer. Até o ideal (100) ela cai devagar:
// 100 pontos a cada `horasParaZerar` (48 h). O que passa do ideal (comer demais) é digerido bem
// mais depressa: de 200 até 100 leva `horasParaDigerirExcesso` (5 h). Se o tempo do passo atravessa
// o 100, a parte de cima usa o ritmo rápido e o resto o ritmo normal (o resultado é o mesmo em
// passos pequenos ou grandes).
export function saciedadeDepoisDe(saciedade, horas, cfg) {
  let s = saciedade;
  let resta = horas;
  if (s > cfg.ideal) {
    const porHora = (cfg.maximo - cfg.ideal) / cfg.horasParaDigerirExcesso;
    const gasta = Math.min(resta, (s - cfg.ideal) / porHora);
    s -= porHora * gasta;
    resta -= gasta;
  }
  return Math.max(0, s - (100 / cfg.horasParaZerar) * resta);
}

// A nota da saciedade, de 0 a 100: até o ideal (100) a nota é a própria saciedade; passou disso é
// comer demais, e a nota cai de volta (200 vale 0, como estar de barriga vazia).
export function notaDaSaciedade(saciedade, cfgSaciedade) {
  const { ideal, maximo } = cfgSaciedade;
  if (saciedade <= ideal) return saciedade;
  return Math.max(0, (100 * (maximo - saciedade)) / (maximo - ideal));
}

// Média dos três indicadores, de 0 a 100, com pesos iguais (doc 03, seção 3).
export function mediaDoPeixe(peixe, aquario, config) {
  const fome = notaDaSaciedade(peixe.saciedade, config.saciedade);
  return (fome + (100 - aquario.sujeira) + notaDoPh(aquario, config)) / 3;
}

// A água NÃO suja na hora: o que o peixe comeu (ou o grão que ficou na areia) vira sujeira
// pendente, que só começa a subir depois de `atrasoSeg` segundos e vai entrando aos poucos,
// ao longo de `duracaoHoras` horas de jogo. Tudo em hora do jogo, então o resultado é o mesmo
// a 1×, 60× ou 3600×. agoraMs = a hora do jogo de agora.
export function sujar(aquario, quantidade, agoraMs, config) {
  if (!(quantidade > 0)) return;
  const cfg = config.sujeira;
  aquario.sujeiraPendente.push({
    inicioMs: agoraMs + cfg.atrasoSeg * 1000,
    duracaoMs: cfg.duracaoHoras * HORA_MS,
    total: quantidade,
  });
}

// Põe na água a parte da sujeira pendente que cai entre deMs e ateMs (hora do jogo).
function liberarSujeiraPendente(aquario, deMs, ateMs) {
  const lista = aquario.sujeiraPendente;
  let soma = 0;
  for (let i = lista.length - 1; i >= 0; i--) {
    const e = lista[i];
    const fim = e.inicioMs + e.duracaoMs;
    const de = Math.max(deMs, e.inicioMs);
    const ate = Math.min(ateMs, fim);
    if (ate > de) soma += (e.total * (ate - de)) / e.duracaoMs;
    if (ateMs >= fim) lista.splice(i, 1); // já entrou tudo
  }
  aquario.sujeira = Math.min(100, aquario.sujeira + soma);
}

// O peixe comeu um grão (core/comida.js chama). Devolve { excesso, passouMal }:
//   excesso   = ele já estava cheio (saciedade a partir de `excessoAcimaDe`): suja mais, devagar;
//   passouMal = chegou no máximo (200): comeu demais e fica doente na hora.
export function peixeComeu(aquario, peixe, config, agoraMs = 0) {
  const cfg = config.saciedade;
  const excesso = peixe.saciedade >= cfg.excessoAcimaDe;
  peixe.saciedade = Math.min(cfg.maximo, peixe.saciedade + config.comida.ganhoPorGrao);
  sujar(aquario, excesso ? config.sujeira.porGraoEmExcesso : config.sujeira.porGrao, agoraMs, config);
  peixe.cocoEm = config.coco.segundosAposComer; // faz cocô 10 s depois de comer (recomeça a cada grão)

  const passouMal = peixe.saciedade >= cfg.maximo;
  if (passouMal) {
    // A saúde cai para logo abaixo do limite de doença. Ele se recupera sozinho conforme a
    // barriga esvazia (a nota da saciedade volta a subir), se a água estiver boa.
    peixe.saude = Math.min(peixe.saude, config.saude.doenteAbaixoDe - 1);
    if (peixe.estado === 'saudavel') {
      peixe.estado = 'doente';
      aquario.eventos.registrar({ tipo: 'adoeceu', peixeId: peixe.id, motivo: 'comeuDemais' });
    }
  }
  return { excesso, passouMal };
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
