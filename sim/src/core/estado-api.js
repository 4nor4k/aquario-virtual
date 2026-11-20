// O retrato do jogo que a página do celular recebe (GET /api/estado, doc 06 e doc 13).
// Função pura: só lê o aquário e devolve dados simples (JSON). Não conhece navegador nem rede,
// então no ESP32 vira a mesma montagem de JSON em C++.
// Os textos da tela (nomes das fases, status...) NÃO vão aqui: a página busca config/textos.json uma
// vez. Aqui vão códigos ('adulto', 'muitoDoente'...) e os avisos já escritos (vêm de textos.celular).
import { idadeMs, sexoRevelado } from './fish.js';
import {
  statusDaSaude, faixaDoPh, valorDoPh, avisosDoAquario, peixeComFome,
} from './rules.js';
import { diaDaVida, formatarPh, preencher } from './formatar.js';

// Os modos do jogo, do ponto de vista da página.
export const FASES_DO_JOGO = { JOGANDO: 'jogando', ADOCAO: 'adocao', GAME_OVER: 'gameover' };

// Peixe que ainda tem o nome que o jogo deu ("Beta" ou "Filhote 3"): a página sugere dar um nome.
export function peixeSemNome(peixe, config) {
  return peixe.nome === config.nome.padrao || /^Filhote \d+$/.test(peixe.nome);
}

function montarPeixe(aquario, peixe, { config, agoraMs }) {
  const { dia, total } = diaDaVida(idadeMs(peixe, agoraMs));
  const parceiro = aquario.parceiroDe(peixe);
  const r = aquario.podeAdotarParceiro(peixe);
  return {
    id: peixe.id,
    nome: peixe.nome,
    especie: peixe.especie,
    cor: peixe.cor,
    fase: peixe.fase,
    dia,
    diasTotal: total,
    sexo: sexoRevelado(peixe, agoraMs), // null até ficar adulto
    saude: statusDaSaude(peixe, config), // 'saudavel' | 'doente' | 'muitoDoente' | 'morto'
    saciedade: Math.round(peixe.saciedade), // 0 a 200 (100 = cheio)
    comFome: peixe.estado !== 'morto' && peixeComFome(peixe, config),
    semNome: peixe.estado !== 'morto' && peixeSemNome(peixe, config),
    parceiroId: parceiro ? parceiro.id : null,
    // { ok, motivo }: pode ganhar um parceiro agora? (motivo: 'morto', 'naoAdulto', 'temParceiro', 'cheio')
    parceiro: { ok: r.ok, motivo: r.ok ? null : r.motivo },
  };
}

// Os avisos do topo da tela do celular, já em texto. Só do que o jogador pode agir ou saber agora.
function montarAvisos(aquario, vivos, { config, textos, clima }) {
  const t = textos.celular.avisos;
  const lista = [];
  if (aquario.gameOver) return lista;
  for (const p of vivos) {
    if (statusDaSaude(p, config) !== 'saudavel') lista.push(preencher(t.doente, { nome: p.nome }));
  }
  const im = avisosDoAquario(aquario, config);
  for (const p of vivos) {
    if (peixeComFome(p, config)) lista.push(preencher(t.fome, { nome: p.nome }));
  }
  if (im.sujeira) lista.push(t.sujeira);
  if (im.ph) lista.push(t.ph);
  if (aquario.ovos.length > 0) lista.push(t.ovos);
  for (const p of vivos) {
    if (peixeSemNome(p, config)) lista.push(preencher(t.semNome, { nome: p.nome }));
  }
  if (clima?.frio) lista.push(t.frio);
  if (clima?.chuva) lista.push(t.chuva);
  return lista;
}

// aquario: o aquário. aguardandoAdocao: ainda não há jogo (primeira vez ou depois de apagar).
// agoraMs: a hora do jogo. clima: o clima (pode faltar).
export function montarEstado(aquario, {
  config, textos, agoraMs, clima = null, aguardandoAdocao = false,
}) {
  const vivos = aquario.vivos();
  const faseDoJogo = aguardandoAdocao ? FASES_DO_JOGO.ADOCAO
    : aquario.gameOver ? FASES_DO_JOGO.GAME_OVER : FASES_DO_JOGO.JOGANDO;
  const ph = valorDoPh(aquario, config);
  const estado = {
    ligado: true,
    faseDoJogo,
    agua: {
      sujeira: Math.round(aquario.sujeira),
      ph: {
        valor: ph,
        texto: formatarPh(ph),
        faixa: faixaDoPh(ph, config),
        noMaximo: aquario.phPasso >= config.ph.valores.length - 1, // "Regular pH" não sobe mais
      },
    },
    peixes: aguardandoAdocao ? [] : aquario.peixes.map((p) => montarPeixe(aquario, p, { config, agoraMs })),
    limite: config.reproducao.limiteDePeixes,
    vagas: aquario.vagas(),
    ovos: aquario.ovos.length,
    nomeMaximo: config.nome.maximo,
    cores: config.cores,
    avisos: aguardandoAdocao ? [] : montarAvisos(aquario, vivos, { config, textos, clima }),
    causaDoGameOver: aquario.gameOver ? aquario.causaDoGameOver : null,
    clima: clima ? {
      hora: Math.round(clima.hora * 10) / 10,
      chovendo: clima.chuva,
      temperatura: Math.round(clima.temperatura * 10) / 10,
      frio: clima.frio,
    } : null,
  };
  return estado;
}
