// O aquário: a lista de peixes, a água (sujeira e pH) e as ações de cuidado.
// As regras que mudam tudo com o tempo ficam em rules.js.
import { criarRng } from './rng.js';
import { criarEventos } from './events.js';
import {
  criarPeixe, atualizarPeixe, atualizarPeixeMorto, atualizarPeixeParado, atualizarPeixeNamorando, atualizarPeixeAbrigado,
  atualizarIdade, limitesDoPeixe, INICIO_DA_FASE_MS,
} from './fish.js';
import { atualizarAbrigo, alvoDoAbrigo } from './abrigo.js';
import { atualizarCocos } from './coco.js';
import { sortearPlano } from './profundidade.js';
import { atualizarRegras, matarPeixe, valorDoPh } from './rules.js';
import { normalizarNome } from './nome.js';
import { soltarGraos, atualizarGraos, graoMaisPerto } from './comida.js';
import { MUNDO_LARGURA, AREIA_Y } from './mundo.js';
import { podeAdotarParceiro, atualizarNamoros, terminarNamoroDoPeixe } from './reproducao.js';

// config: os números do jogo (sim/config/jogo.json). Quem cria o aquário entrega pronto,
// porque o core não lê arquivos (no navegador e no ESP32 isso é feito de jeitos diferentes).
export function criarAquario({ semente = 1, config } = {}) {
  if (!config) throw new TypeError('criarAquario: falta o config (sim/config/jogo.json)');
  const rng = criarRng(semente);
  // O sexo tem sorteio próprio, para não mexer na sequência do nado (e dos testes com semente).
  const rngSexo = criarRng((semente ^ 0x5e8d) >>> 0);
  const rngComida = criarRng((semente ^ 0xf00d) >>> 0); // onde caem os grãos
  const rngCoco = criarRng((semente ^ 0xc0c0) >>> 0);   // quando o peixe faz cocô
  const rngPlano = criarRng((semente ^ 0x91a0) >>> 0);  // por onde o peixe passa (atrás ou na frente)
  const rngReproducao = criarRng((semente ^ 0x4e90) >>> 0); // ninhadas: quantos ovos, cor e sexo dos filhotes
  const rngAbrigo = criarRng((semente ^ 0xa0b1) >>> 0);     // o abrigo da chuva (só sorteia quando chove)
  const peixes = [];
  let proximoId = 1;
  let ultimoMs = null; // hora do jogo no passo anterior (para saber quanto tempo passou)

  const agoraMsDoAquario = () => ultimoMs ?? 0;

  const aquario = {
    peixes,
    graos: [],                       // grãos de comida na água (core/comida.js); não vão para o arquivo salvo
    cocos: [],                       // cocôs caindo ou na areia (core/coco.js); só animação, não são salvos
    casais: [],                      // os casais: { aId, bId, boasMs, ultimaMs, namoro } (core/reproducao.js)
    ovos: [],                        // ovos esperando para eclodir (core/reproducao.js)
    filhotesNascidos: 0,             // conta os filhotes já nascidos aqui, para o nome "Filhote N"
    rngReproducao,                   // o sorteio das ninhadas (semente própria, não mexe nos outros)
    sujeira: config.inicial.sujeira, // 0 a 100 (0 = água limpa)
    sujeiraPendente: [],             // sujeira que ainda vai entrar na água, aos poucos: { inicioMs, duracaoMs, total }
    phPasso: config.inicial.phPasso, // posição na lista de pH (0 = o mais ácido)
    phProgresso: 0,                  // 0 a 1: quanto do próximo passo do pH já andou
    gameOver: false,                 // vira true quando o último peixe vivo morre
    causaDoGameOver: null,           // 'velhice' ou 'cuidado' (a causa da morte do último peixe)
    eventos: criarEventos(),         // avisos para a interface (eventos.retirar())

    // Os peixes que ainda estão vivos (saudáveis ou doentes).
    vivos() {
      return peixes.filter((p) => p.estado !== 'morto');
    },

    // A hora do jogo no último passo (0 antes do primeiro). Serve para marcar a hora de uma morte.
    get agoraMs() {
      return ultimoMs ?? 0;
    },

    // Quantos peixes ainda cabem: o limite (5) menos os vivos e os ovos que vão eclodir.
    vagas() {
      return Math.max(0, config.reproducao.limiteDePeixes - aquario.vivos().length - aquario.ovos.length);
    },

    peixePorId(id) {
      return peixes.find((p) => p.id === id) ?? null;
    },

    // O casal de um peixe (ou null).
    casalDe(peixe) {
      return aquario.casais.find((c) => c.aId === peixe.id || c.bId === peixe.id) ?? null;
    },

    // O parceiro de um peixe (ou null).
    parceiroDe(peixe) {
      const casal = aquario.casalDe(peixe);
      if (!casal) return null;
      return aquario.peixePorId(casal.aId === peixe.id ? casal.bId : casal.aId);
    },

    // Desfaz o casal deste peixe, se houver (quando um dos dois morre ou some).
    desfazerCasalDe(peixe) {
      const casal = aquario.casalDe(peixe);
      if (!casal) return;
      aquario.casais.splice(aquario.casais.indexOf(casal), 1);
      for (const id of [casal.aId, casal.bId]) {
        const p = aquario.peixePorId(id);
        if (p?.namorando) terminarNamoroDoPeixe(p);
      }
    },

    // Tira um peixe do aquário (o morto que já passou tempo demais, ou o "Limpar").
    removerPeixe(peixe) {
      const i = peixes.indexOf(peixe);
      if (i < 0) return;
      aquario.desfazerCasalDe(peixe);
      peixes.splice(i, 1);
    },

    // { ok, motivo }: este peixe pode ganhar um parceiro agora? motivo: 'morto', 'naoAdulto',
    // 'temParceiro' ou 'cheio'.
    podeAdotarParceiro(peixe) {
      return podeAdotarParceiro(aquario, peixe, agoraMsDoAquario());
    },

    // Adota um parceiro para este peixe: já ADULTO e do sexo OPOSTO (doc 03, seção 6). Forma o casal.
    // Devolve o parceiro. Lança erro se não pode (confira antes com podeAdotarParceiro).
    adotarParceiro(peixe, { nome, cor } = {}, agoraMs = agoraMsDoAquario()) {
      const r = podeAdotarParceiro(aquario, peixe, agoraMs);
      if (!r.ok) throw new RangeError(`não dá para adotar um parceiro: ${r.motivo}`);
      const parceiro = aquario.adicionarPeixe({
        nome: nome ?? config.nome.padrao,
        especie: peixe.especie,
        cor: cor ?? peixe.cor,
        sexo: peixe.sexo === 'macho' ? 'femea' : 'macho',
        fase: 'adulto',
        x: peixe.x,
        y: peixe.y,
      }, agoraMs);
      aquario.casais.push({ aId: peixe.id, bId: parceiro.id, boasMs: 0, ultimaMs: null, namoro: null });
      return parceiro;
    },

    // O número que o próximo peixe adotado vai receber (vai para o arquivo salvo).
    get proximoId() {
      return proximoId;
    },

    // Garante que o próximo id seja pelo menos este (ao carregar o jogo salvo).
    garantirProximoId(minimo) {
      proximoId = Math.max(proximoId, minimo);
    },

    // Devolve um peixe guardado ao aquário (usado ao carregar o jogo salvo). Mantém o id dele
    // e garante que os próximos ids não se repitam.
    restaurarPeixe(dados) {
      const peixe = criarPeixe(dados);
      peixes.push(peixe);
      proximoId = Math.max(proximoId, peixe.id + 1);
      return peixe;
    },

    // Põe um peixe no aquário. Sem fase, nasce filhote agora. Com fase, entra já com a idade
    // em que essa fase começa. Sem posição, aparece no meio da água.
    // agoraMs: a hora do jogo neste momento (do relógio).
    adicionarPeixe(dados = {}, agoraMs = 0) {
      const fase = dados.fase || 'filhote';
      const lim = limitesDoPeixe(fase);
      const peixe = criarPeixe({
        ...dados,
        id: proximoId++,
        sexo: dados.sexo ?? (rngSexo.inteiro(0, 1) === 1 ? 'femea' : 'macho'),
        fase,
        saciedade: dados.saciedade ?? config.inicial.saciedade,
        saude: dados.saude ?? config.inicial.saude,
        nascimentoMs: dados.nascimentoMs ?? agoraMs - INICIO_DA_FASE_MS[fase],
        x: dados.x ?? Math.round(MUNDO_LARGURA / 2),
        y: dados.y ?? Math.round((lim.minY + Math.min(lim.maxY, AREIA_Y)) / 2),
      });
      peixes.push(peixe);
      return peixe;
    },

    // Um passo do jogo. dt = segundos reais do passo (movimento e animação);
    // agoraMs = hora do jogo (já acelerada pelo relógio), de onde saem a idade e as regras.
    // ambiente (opcional): { chuvaNivel, abrigo: { x, meiaLargura } }. Com chuva, os peixes vão se esconder atrás
    // do abrigo (a pedra grande, já na posição de agora na tela; core/abrigo.js). Sem ele, ninguém se esconde.
    atualizar(dt, agoraMs = 0, ambiente = null) {
      if (ultimoMs === null) ultimoMs = agoraMs;
      const passouMs = Math.max(0, agoraMs - ultimoMs);
      ultimoMs = agoraMs;
      atualizarRegras(aquario, passouMs, agoraMs, config);

      atualizarNamoros(aquario, dt, config); // o namoro e os ovos (animação, tempo real)
      for (const peixe of peixes) {
        if (peixe.estado === 'morto') {
          atualizarPeixeMorto(peixe, dt);
          peixe.plano = peixe.planoDesejado = 'frente'; // boiando na superfície, na frente de tudo
          continue;
        }
        atualizarIdade(peixe, agoraMs);
        if (peixe.namorando) {
          atualizarPeixeNamorando(peixe, dt, peixe.namorando); // vai ao encontro do parceiro
          continue;
        }
        if (peixe.fazendoCoco > 0) {
          atualizarPeixeParado(peixe, dt); // parado um instante, fazendo cocô
          continue;
        }
        // Com comida na água o peixe vai atrás do grão mais perto, mesmo sem fome.
        const grao = graoMaisPerto(peixe, aquario.graos);
        // Chovendo, ele se esconde atrás da pedra e fica quieto; a comida tem prioridade (ele sai para comer).
        atualizarAbrigo(peixe, dt, rngAbrigo, ambiente, config.abrigoDaChuva);
        if (peixe.abrigado && !grao) {
          peixe.planoDesejado = 'fundo'; // para passar para trás da pedra (a interface troca quando dá)
          atualizarPeixeAbrigado(peixe, dt, rngAbrigo, alvoDoAbrigo(peixe, ambiente.abrigo), config.abrigoDaChuva);
          continue;
        }
        atualizarPeixe(peixe, dt, rng, grao);
        // A cada trajeto novo ele sorteia de novo por onde passa: atrás ou na frente do cenário.
        if (peixe.trajetoDoPlano !== peixe.trajeto) {
          peixe.trajetoDoPlano = peixe.trajeto;
          peixe.planoDesejado = sortearPlano(rngPlano, config.profundidade);
        }
      }
      atualizarGraos(aquario, dt, config, agoraMs); // os grãos caem e quem alcançar come
      atualizarCocos(aquario, dt, config, rngCoco); // o cocô sai, cai e some
    },

    // --- Ações de cuidado (menu do aparelho e página do celular chamam estas) ---------------

    // Joga uma porção de comida (3 grãos) de cima. Ela cai devagar e os peixes vão atrás: a
    // saciedade só sobe quando um peixe come o grão (comida.js), e a água só suja DEPOIS, aos
    // poucos (rules.js, sujar). Devolve { alimentou, excesso }; excesso = algum peixe já está cheio
    // (comer mais faz mal).
    // x: de onde a comida cai (padrão: em cima do primeiro peixe vivo).
    darComida({ x } = {}) {
      const vivos = aquario.vivos();
      if (vivos.length === 0) return { alimentou: false, excesso: false };
      const excesso = vivos.some((p) => p.saciedade >= config.saciedade.excessoAcimaDe);
      soltarGraos(aquario.graos, { centroX: x ?? vivos[0].x, config, rng: rngComida });
      return { alimentou: true, excesso };
    },

    // Troca o nome de um peixe (aplica as regras do nome: até 12 letras, sem o que a fonte não
    // tem, vazio vira o padrão). Devolve o nome que ficou.
    renomear(peixe, bruto, aceita) {
      peixe.nome = normalizarNome(bruto, config.nome, aceita);
      return peixe.nome;
    },

    // Deixa o peixe mais velho em `ms`, sem passar o tempo do mundo: fome, sujeira e pH ficam como
    // estão. Usado pelo "Pular fase" do painel de testes (avançar o relógio faria o peixe morrer
    // de falta de cuidado antes de chegar à fase seguinte).
    envelhecer(peixe, ms) {
      peixe.nascimentoMs -= Math.max(0, ms);
    },

    // Mata um peixe de fora das regras (usado pelo painel de testes do simulador).
    matar(peixe, causa = 'cuidado') {
      matarPeixe(aquario, peixe, causa);
    },

    // Zera a sujeira e retira os peixes mortos (menos no Game Over, quando o peixe boiando faz parte da tela).
    limparAquario() {
      aquario.sujeira = 0;
      if (aquario.gameOver) return;
      for (const morto of peixes.filter((p) => p.estado === 'morto')) aquario.removerPeixe(morto);
    },

    // Sobe o pH 1 passo. Devolve { mudou, ph }; no máximo (7,5) não muda nada.
    regularPh() {
      const mudou = aquario.phPasso < config.ph.valores.length - 1;
      if (mudou) aquario.phPasso += 1;
      return { mudou, ph: valorDoPh(aquario, config) };
    },
  };

  return aquario;
}
