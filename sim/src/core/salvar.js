// Salvar e carregar o jogo (doc 09, seção 3).
// Aqui só se TRANSFORMA o aquário em dados simples e os dados de volta em aquário.
// Ler e gravar o arquivo é da interface (o core não conhece arquivo, navegador nem a hora real:
// ela chega de fora, em salvoEmMs).
import { criarAquario } from './aquarium.js';
import { FASES, SEXOS } from './fish.js';
import { OVO_Y_AREIA } from './reproducao.js';

export const VERSAO_DO_SALVAMENTO = 1;
// No máximo 5 peixes VIVOS (mais os ovos) ao mesmo tempo: o número está em config.reproducao.limiteDePeixes.
// Na lista cabem também os mortos que ainda não sumiram (1 min depois de morrer).
export const MAXIMO_NA_LISTA = 20;
const MAXIMO_DE_OVOS = 5;
const MAXIMO_DE_PENDENTES = 200; // cada grão comido vira uma entrada e some em ~6 h

const ESTADOS = ['saudavel', 'doente', 'morto'];
const CAUSAS = ['velhice', 'cuidado'];
const ESPECIES = ['beta'];

// O arquivo é inválido, ilegível ou de uma versão que não conheço.
export class ErroDeSalvamento extends Error {
  constructor(mensagem) {
    super(mensagem);
    this.name = 'ErroDeSalvamento';
  }
}

// Transforma o jogo em um objeto simples, pronto para virar JSON.
// tempoJogoMs: a hora do jogo (o relógio). salvoEmMs: a hora REAL de agora (ms desde 1970).
export function exportarJogo(aquario, { tempoJogoMs, salvoEmMs }) {
  return {
    versao: VERSAO_DO_SALVAMENTO,
    salvoEmMs,
    tempoJogoMs,
    aquario: {
      sujeira: aquario.sujeira,
      sujeiraPendente: aquario.sujeiraPendente.map((e) => ({ inicioMs: e.inicioMs, duracaoMs: e.duracaoMs, total: e.total })),
      phPasso: aquario.phPasso,
      phProgresso: aquario.phProgresso,
      gameOver: aquario.gameOver,
      causaDoGameOver: aquario.causaDoGameOver,
      proximoId: aquario.proximoId,
      filhotesNascidos: aquario.filhotesNascidos,
      // O namoro em andamento (animação) não é salvo: ao abrir, os ovos já estão na areia.
      casais: aquario.casais.map((c) => ({ aId: c.aId, bId: c.bId, boasMs: c.boasMs, ultimaMs: c.ultimaMs })),
      ovos: aquario.ovos.map((o) => ({ x: o.x, eclodeEmMs: o.eclodeEmMs, cor: o.cor, sexo: o.sexo })),
    },
    peixes: aquario.peixes.map((p) => ({
      id: p.id,
      nome: p.nome,
      especie: p.especie,
      cor: p.cor,
      sexo: p.sexo,
      fase: p.fase,
      saciedade: p.saciedade,
      saude: p.saude,
      estado: p.estado,
      causaDaMorte: p.causaDaMorte,
      nascimentoMs: p.nascimentoMs,
      morteMs: p.morteMs,
      x: p.x,
      y: p.y,
      direcao: p.direcao,
    })),
  };
}

// Devolve { aquario, tempoJogoMs, salvoEmMs }. Se algo estiver errado, lança ErroDeSalvamento
// em vez de adivinhar. semente: para o sorteio do nado (nada do que foi salvo depende dela).
export function importarJogo(dados, { config, semente = 1 }) {
  const raiz = objeto(dados, 'arquivo');
  if (raiz.versao !== VERSAO_DO_SALVAMENTO) {
    throw new ErroDeSalvamento(`versão ${raiz.versao} do salvamento não é conhecida`);
  }
  const salvoEmMs = numero(raiz.salvoEmMs, 'salvoEmMs', 0);
  const tempoJogoMs = numero(raiz.tempoJogoMs, 'tempoJogoMs', 0);

  const a = objeto(raiz.aquario, 'aquario');
  const sujeira = numero(a.sujeira, 'sujeira', 0, 100);
  // Arquivos de antes da comida em grãos não têm este campo: vale lista vazia.
  const pendente = a.sujeiraPendente === undefined ? [] : lista(a.sujeiraPendente, 'sujeiraPendente', MAXIMO_DE_PENDENTES).map((e, i) => {
    const r = objeto(e, `sujeiraPendente[${i}]`);
    return {
      inicioMs: numero(r.inicioMs, `sujeiraPendente[${i}].inicioMs`, 0),
      duracaoMs: numero(r.duracaoMs, `sujeiraPendente[${i}].duracaoMs`, 1),
      total: numero(r.total, `sujeiraPendente[${i}].total`, 0, 100),
    };
  });
  const phPasso = inteiro(a.phPasso, 'phPasso', 0, config.ph.valores.length - 1);
  const phProgresso = numero(a.phProgresso, 'phProgresso', 0, 1);
  const gameOver = booleano(a.gameOver, 'gameOver');
  const causaDoGameOver = opcao(a.causaDoGameOver, 'causaDoGameOver', CAUSAS, true);
  const proximoId = inteiro(a.proximoId, 'proximoId', 1);

  // Arquivos de antes da reprodução (v0.3) não têm estes campos: valem "sem casal, sem ovos".
  const filhotesNascidos = a.filhotesNascidos === undefined ? 0 : inteiro(a.filhotesNascidos, 'filhotesNascidos', 0);
  const ovos = a.ovos === undefined ? [] : lista(a.ovos, 'ovos', MAXIMO_DE_OVOS).map((bruto, i) => {
    const r = objeto(bruto, `ovos[${i}]`);
    return {
      x: numero(r.x, `ovos[${i}].x`),
      eclodeEmMs: numero(r.eclodeEmMs, `ovos[${i}].eclodeEmMs`, 0),
      cor: opcao(r.cor, `ovos[${i}].cor`, config.cores),
      sexo: opcao(r.sexo, `ovos[${i}].sexo`, SEXOS),
    };
  });

  if (!Array.isArray(raiz.peixes) || raiz.peixes.length > MAXIMO_NA_LISTA || (raiz.peixes.length < 1 && ovos.length < 1)) {
    throw new ErroDeSalvamento(`peixes: precisa ser uma lista de 1 a ${MAXIMO_NA_LISTA} (ou vazia, se há ovos)`);
  }
  const ids = new Set();
  const peixes = raiz.peixes.map((bruto, i) => {
    const rotulo = `peixes[${i}]`;
    const p = objeto(bruto, rotulo);
    const id = inteiro(p.id, `${rotulo}.id`, 1);
    if (ids.has(id)) throw new ErroDeSalvamento(`${rotulo}.id: ${id} aparece duas vezes`);
    ids.add(id);
    if (id >= proximoId) throw new ErroDeSalvamento(`${rotulo}.id: ${id} é maior que proximoId`);
    const nome = texto(p.nome, `${rotulo}.nome`, 1, config.nome.maximo);
    const estado = opcao(p.estado, `${rotulo}.estado`, ESTADOS);
    const causaDaMorte = opcao(p.causaDaMorte, `${rotulo}.causaDaMorte`, CAUSAS, true);
    if ((estado === 'morto') !== (causaDaMorte !== null)) {
      throw new ErroDeSalvamento(`${rotulo}: causaDaMorte só existe em peixe morto`);
    }
    return {
      id,
      nome,
      especie: opcao(p.especie, `${rotulo}.especie`, ESPECIES),
      cor: opcao(p.cor, `${rotulo}.cor`, config.cores),
      sexo: opcao(p.sexo, `${rotulo}.sexo`, SEXOS),
      fase: opcao(p.fase, `${rotulo}.fase`, FASES),
      saciedade: numero(p.saciedade, `${rotulo}.saciedade`, 0, config.saciedade.maximo),
      saude: numero(p.saude, `${rotulo}.saude`, 0, 100),
      estado,
      causaDaMorte,
      nascimentoMs: numero(p.nascimentoMs, `${rotulo}.nascimentoMs`),
      // Sem a hora da morte (arquivo antigo), vale a hora da gravação: o morto some 1 min depois dela.
      morteMs: estado !== 'morto' ? null : (p.morteMs === undefined || p.morteMs === null ? tempoJogoMs : numero(p.morteMs, `${rotulo}.morteMs`, 0)),
      x: numero(p.x, `${rotulo}.x`),
      y: numero(p.y, `${rotulo}.y`),
      direcao: opcao(p.direcao, `${rotulo}.direcao`, [1, -1]),
    };
  });

  const vivos = peixes.filter((p) => p.estado !== 'morto').length;
  if (vivos + ovos.length > config.reproducao.limiteDePeixes) {
    throw new ErroDeSalvamento(`mais de ${config.reproducao.limiteDePeixes} peixes vivos (contando os ovos)`);
  }
  if (gameOver === (vivos > 0 || ovos.length > 0)) {
    throw new ErroDeSalvamento('gameOver não combina com os peixes (Game Over só sem peixe vivo e sem ovo)');
  }

  const porId = new Map(peixes.map((p) => [p.id, p]));
  const emCasal = new Set();
  const casais = a.casais === undefined ? [] : lista(a.casais, 'casais', 10).map((bruto, i) => {
    const r = objeto(bruto, `casais[${i}]`);
    const aId = inteiro(r.aId, `casais[${i}].aId`, 1);
    const bId = inteiro(r.bId, `casais[${i}].bId`, 1);
    for (const id of [aId, bId]) {
      const p = porId.get(id);
      if (!p || p.estado === 'morto') throw new ErroDeSalvamento(`casais[${i}]: o peixe ${id} não existe ou morreu`);
      if (emCasal.has(id)) throw new ErroDeSalvamento(`casais[${i}]: o peixe ${id} já está em outro casal`);
      emCasal.add(id);
    }
    if (aId === bId) throw new ErroDeSalvamento(`casais[${i}]: um peixe não forma casal com ele mesmo`);
    const ultimaMs = r.ultimaMs === null ? null : numero(r.ultimaMs, `casais[${i}].ultimaMs`, 0);
    return { aId, bId, boasMs: numero(r.boasMs, `casais[${i}].boasMs`, 0), ultimaMs, namoro: null };
  });
  if (gameOver !== (causaDoGameOver !== null)) {
    throw new ErroDeSalvamento('causaDoGameOver só existe no Game Over');
  }

  const aquario = criarAquario({ semente, config });
  aquario.sujeira = sujeira;
  aquario.sujeiraPendente.push(...pendente);
  aquario.phPasso = phPasso;
  aquario.phProgresso = phProgresso;
  aquario.gameOver = gameOver;
  aquario.causaDoGameOver = causaDoGameOver;
  for (const p of peixes) aquario.restaurarPeixe(p);
  aquario.filhotesNascidos = filhotesNascidos;
  aquario.casais.push(...casais);
  // Os ovos voltam já na areia, sem a animação da queda.
  for (const o of ovos) {
    aquario.ovos.push({
      x: o.x, baseX: o.x, y: OVO_Y_AREIA, estado: 'parado', espera: 0, tempo: 0, fase: 0,
      eclodeEmMs: o.eclodeEmMs, cor: o.cor, sexo: o.sexo,
    });
  }
  // Os ids já usados não podem voltar, mesmo que o peixe maior tenha morrido e sumido.
  aquario.garantirProximoId(proximoId);
  return { aquario, tempoJogoMs, salvoEmMs };
}

// --- Conferência dos campos ---------------------------------------------------------------

function objeto(v, nome) {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) {
    throw new ErroDeSalvamento(`${nome}: precisa ser um objeto`);
  }
  return v;
}

function numero(v, nome, min = -Infinity, max = Infinity) {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) {
    throw new ErroDeSalvamento(`${nome}: número inválido (${JSON.stringify(v)})`);
  }
  return v;
}

function inteiro(v, nome, min = -Infinity, max = Infinity) {
  if (!Number.isInteger(v) || v < min || v > max) {
    throw new ErroDeSalvamento(`${nome}: inteiro inválido (${JSON.stringify(v)})`);
  }
  return v;
}

function lista(v, nome, maximo) {
  if (!Array.isArray(v) || v.length > maximo) {
    throw new ErroDeSalvamento(`${nome}: precisa ser uma lista de até ${maximo}`);
  }
  return v;
}

function booleano(v, nome) {
  if (typeof v !== 'boolean') throw new ErroDeSalvamento(`${nome}: precisa ser verdadeiro ou falso`);
  return v;
}

function texto(v, nome, min, max) {
  if (typeof v !== 'string' || [...v].length < min || [...v].length > max) {
    throw new ErroDeSalvamento(`${nome}: texto inválido (${JSON.stringify(v)})`);
  }
  return v;
}

function opcao(v, nome, validos, podeSerNulo = false) {
  if (podeSerNulo && v === null) return null;
  if (!validos.includes(v)) {
    throw new ErroDeSalvamento(`${nome}: valor inválido (${JSON.stringify(v)})`);
  }
  return v;
}
