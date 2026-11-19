// O aquário: a lista de peixes, a água (sujeira e pH) e as ações de cuidado.
// As regras que mudam tudo com o tempo ficam em rules.js.
import { criarRng } from './rng.js';
import { criarEventos } from './events.js';
import {
  criarPeixe, atualizarPeixe, atualizarPeixeMorto, atualizarPeixeParado, atualizarIdade, limitesDoPeixe,
  INICIO_DA_FASE_MS,
} from './fish.js';
import { atualizarCocos } from './coco.js';
import { sortearPlano } from './profundidade.js';
import { atualizarRegras, matarPeixe, valorDoPh } from './rules.js';
import { normalizarNome } from './nome.js';
import { soltarGraos, atualizarGraos, graoMaisPerto } from './comida.js';
import { MUNDO_LARGURA, AREIA_Y } from './mundo.js';

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
  const peixes = [];
  let proximoId = 1;
  let ultimoMs = null; // hora do jogo no passo anterior (para saber quanto tempo passou)

  const aquario = {
    peixes,
    graos: [],                       // grãos de comida na água (core/comida.js); não vão para o arquivo salvo
    cocos: [],                       // cocôs caindo ou na areia (core/coco.js); só animação, não são salvos
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
    atualizar(dt, agoraMs = 0) {
      if (ultimoMs === null) ultimoMs = agoraMs;
      const passouMs = Math.max(0, agoraMs - ultimoMs);
      ultimoMs = agoraMs;
      atualizarRegras(aquario, passouMs, agoraMs, config);

      for (const peixe of peixes) {
        if (peixe.estado === 'morto') {
          atualizarPeixeMorto(peixe, dt);
          peixe.plano = peixe.planoDesejado = 'frente'; // boiando na superfície, na frente de tudo
          continue;
        }
        atualizarIdade(peixe, agoraMs);
        if (peixe.fazendoCoco > 0) {
          atualizarPeixeParado(peixe, dt); // parado um instante, fazendo cocô
          continue;
        }
        // Com comida na água o peixe vai atrás do grão mais perto, mesmo sem fome.
        atualizarPeixe(peixe, dt, rng, graoMaisPerto(peixe, aquario.graos));
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

    // Zera a sujeira.
    limparAquario() {
      aquario.sujeira = 0;
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
