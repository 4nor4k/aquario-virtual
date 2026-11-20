// O menu e as telas do aparelho (doc 02, "Controles"; doc 05, módulo de interface).
// É só a LÓGICA: qual tela está aberta, qual item está selecionado e o que cada botão faz.
// Não desenha nada e não conhece o navegador (o desenho fica em render/telas.js).
//
// Controles:
//   tela do jogo : A abre o menu · C abre o status · B mostra/oculta o HUD de indicadores ·
//                  joystick move a câmera
//   menu         : joystick (cima/baixo) escolhe · A confirma · B volta
//   status       : C ou B voltam · joystick (esquerda/direita) troca o peixe em foco
//   game over    : A vai para a tela de adoção
//   adoção       : joystick (esquerda/direita) escolhe a cor · A adota (um filhote, ou o parceiro
//                  do peixe em foco, se veio do menu "Adotar parceiro"; B cancela)
//   caçada       : ver core/cacada.js (A pausa · joystick nada · B acelera)
//   bem-vindo    : A fecha o aviso de "seu peixe dormiu por ..." (vai ao Game Over se ele morreu)
// O jogo NÃO pausa com o menu aberto: o tempo continua passando.
import { formatarPh, preencher } from './formatar.js';
import { criarCacada } from './cacada.js';
import { criarRng } from './rng.js';
import { statusDaSaude } from './rules.js';

export const TELAS = { JOGO: 'jogo', MENU: 'menu', STATUS: 'status', GAME_OVER: 'gameover', BEM_VINDO: 'bemvindo', ADOCAO: 'adocao', CACADA: 'cacada' };

// Uma ação por item do menu, na mesma ordem de textos.menu.itens.
export const ACOES = ['comida', 'limpar', 'ph', 'parceiro', 'cacar'];

export const SEGUNDOS_DA_MENSAGEM = 2.5;
// Depois que o último peixe morre, a tela do jogo continua um pouco (tempo REAL) para você
// ver o peixe boiando; só então aparece o Game Over.
export const SEGUNDOS_ATE_O_GAME_OVER = 5;

// textos: o conteúdo de config/textos.json. cores: os nomes das cores que se pode escolher ao
// adotar. aoNovoJogo({ cor }): o que fazer quando o jogador adota (aperta A na tela de adoção). aoAgir: avisa a interface depois de cada ação de
// cuidado (comida, limpar, pH), por exemplo para salvar o jogo. posicaoDaComida: devolve o x do
// mundo de onde a comida cai (a interface entrega o meio da tela; sem ela cai sobre o peixe).
// config: os números do jogo (precisa dele para a caçada; sem ele o menu "Caçar" não funciona).
// semente: o sorteio das larvas da caçada. aoAgir('cacada') também avisa quando uma partida termina.
export function criarMenu({
  textos, cores = ['vermelho'], aoNovoJogo, aoAgir = () => {}, posicaoDaComida = () => undefined, config = null, semente = 1,
}) {
  let tela = TELAS.JOGO;
  let item = 0;
  let mensagem = null; // { texto, restante } (segundos)
  let esperaGameOver = 0;
  let cor = 0; // posição da cor escolhida na tela de adoção (em `cores`)
  let bemVindo = null; // { ausenciaMs, morreu }: o que a tela de boas-vindas mostra
  let hudVisivel = false; // o HUD de indicadores por cima do jogo (B liga e desliga; não é uma tela)
  let focoId = null;      // o peixe que a tela de status, o HUD e a câmera automática mostram
  let modoAdocao = 'primeiro'; // 'primeiro' (filhote novo) ou 'parceiro' (do peixe em foco)
  let parceiroDeId = null;     // no modo 'parceiro': de quem é o parceiro que se adota
  let sexoDoParceiro = null;   // e o sexo dele (o oposto ao do peixe em foco)

  // O minigame (core/cacada.js). Só existe se o menu recebeu o config.
  const cacada = config ? criarCacada({ config, rng: criarRng(semente), aoTerminar: () => aoAgir('cacada') }) : null;

  // Os peixes que se pode pôr em foco: os vivos (se não houver nenhum, todos, para ver o morto).
  const candidatos = (aquario) => (aquario.vivos().length > 0 ? aquario.vivos() : aquario.peixes);

  // O peixe em foco. Se o escolhido morreu ou sumiu, vale o primeiro vivo. Null se não há peixe.
  function peixeEmFoco(aquario) {
    const lista = candidatos(aquario);
    const atual = lista.find((p) => p.id === focoId) ?? lista[0] ?? null;
    focoId = atual ? atual.id : null;
    return atual;
  }

  // Passa o foco para o próximo (passo = 1) ou o anterior (passo = -1), dando a volta.
  function trocarFoco(aquario, passo) {
    const lista = candidatos(aquario);
    if (lista.length === 0) return;
    const i = lista.indexOf(peixeEmFoco(aquario));
    focoId = lista[(i + passo + lista.length) % lista.length].id;
  }

  // Põe a mensagem curta no rodapé.
  function avisar(texto) {
    mensagem = { texto, restante: SEGUNDOS_DA_MENSAGEM };
  }

  // Adota um parceiro para o peixe em foco (ou para `peixe`). Devolve { ok, motivo, parceiro }.
  // Mostra a mensagem do resultado. cor/nome: o que o jogador escolheu (o nome é opcional).
  function adotarParceiro(aquario, { cor, nome } = {}, peixe = peixeEmFoco(aquario)) {
    const r = peixe ? aquario.podeAdotarParceiro(peixe) : { ok: false, motivo: 'morto' };
    if (!r.ok) {
      avisar(textos.mensagens.parceiro[r.motivo]);
      return { ok: false, motivo: r.motivo, parceiro: null };
    }
    const parceiro = aquario.adotarParceiro(peixe, { cor, nome });
    avisar(textos.mensagens.parceiroAdotado);
    aoAgir('parceiro');
    return { ok: true, motivo: null, parceiro };
  }

  // Faz a ação de cuidado e mostra a mensagem. É o que o menu e o painel de testes chamam.
  // Devolve o texto da mensagem.
  function executar(acao, aquario) {
    const t = textos.mensagens;
    let texto;
    if (acao === 'comida') {
      const r = aquario.darComida({ x: posicaoDaComida() });
      texto = !r.alimentou ? t.semPeixe : r.excesso ? t.comidaEmExcesso : t.comida;
    } else if (acao === 'limpar') {
      aquario.limparAquario();
      texto = t.limpeza;
    } else if (acao === 'ph') {
      const r = aquario.regularPh();
      texto = r.mudou ? preencher(t.phSubiu, { ph: formatarPh(r.ph) }) : t.phNoMaximo;
    } else {
      throw new RangeError(`ação desconhecida: ${acao}`);
    }
    mensagem = { texto, restante: SEGUNDOS_DA_MENSAGEM };
    aoAgir(acao);
    return texto;
  }

  // O item "Caçar" do menu: começa a caçada com o peixe em foco, se ele puder. Senão, uma mensagem.
  function abrirCacada(aquario) {
    if (!cacada) throw new Error('criarMenu: falta o config para a caçada');
    const peixe = peixeEmFoco(aquario);
    let motivo = null;
    if (!peixe || peixe.estado === 'morto') motivo = 'morto';
    else if (statusDaSaude(peixe, config) !== 'saudavel') motivo = 'fraco';
    else if (peixe.namorando) motivo = 'namorando';
    if (motivo) {
      avisar(textos.mensagens.cacar[motivo]);
      tela = TELAS.JOGO;
      return;
    }
    cacada.iniciar(peixe);
    tela = TELAS.CACADA;
    mensagem = null;
  }

  // Abre a tela "Adote um peixe" (primeira vez, depois do Game Over ou de apagar o jogo).
  function abrirAdocao() {
    tela = TELAS.ADOCAO;
    modoAdocao = 'primeiro';
    cor = 0;
    mensagem = null;
  }

  // O item "Adotar parceiro" do menu: se der, abre a tela de adoção no modo parceiro.
  function abrirAdocaoDeParceiro(aquario) {
    const peixe = peixeEmFoco(aquario);
    const r = peixe ? aquario.podeAdotarParceiro(peixe) : { ok: false, motivo: 'morto' };
    if (!r.ok) {
      avisar(textos.mensagens.parceiro[r.motivo]);
      tela = TELAS.JOGO;
      return;
    }
    tela = TELAS.ADOCAO;
    modoAdocao = 'parceiro';
    parceiroDeId = peixe.id;
    sexoDoParceiro = peixe.sexo === 'macho' ? 'femea' : 'macho';
    cor = 0;
    mensagem = null;
  }

  return {
    get tela() { return tela; },
    get item() { return item; },
    get mensagem() { return mensagem ? mensagem.texto : null; },
    get bemVindo() { return bemVindo; },
    get hudVisivel() { return hudVisivel; },
    get corEscolhida() { return cores[cor]; },
    get modoAdocao() { return modoAdocao; },
    get sexoDoParceiro() { return sexoDoParceiro; },
    get cacada() { return cacada; },
    get recorde() { return cacada ? cacada.recorde : 0; },
    // O recorde da caçada vem do arquivo salvo (a interface entrega ao abrir o jogo).
    definirRecorde(valor) { if (cacada) cacada.definirRecorde(valor); },
    peixeEmFoco,
    trocarFoco,
    adotarParceiro,
    avisar,
    // Põe este peixe em foco (usado pelo seletor do painel).
    focar(aquario, id) {
      if (candidatos(aquario).some((p) => p.id === id)) focoId = id;
    },
    // { numero, total }: qual é o peixe em foco, de quantos.
    posicaoDoFoco(aquario) {
      const lista = candidatos(aquario);
      return { numero: lista.indexOf(peixeEmFoco(aquario)) + 1, total: lista.length };
    },
    cores,
    itens: textos.menu.itens,

    // Abre a tela "Bem-vindo de volta" (o jogo foi aberto depois de um tempo fechado).
    // morreu: o peixe não resistiu durante a ausência.
    mostrarBemVindo({ ausenciaMs, morreu }) {
      bemVindo = { ausenciaMs, morreu };
      tela = TELAS.BEM_VINDO;
      mensagem = null;
    },

    abrirAdocao,

    // A câmera só anda com a tela do jogo aberta (no menu, o joystick escolhe o item).
    cameraLivre() { return tela === TELAS.JOGO; },

    executar,

    // botoes: { a, b, c, cima, baixo } = o que foi apertado agora (uma vez por aperto).
    apertar(botoes, aquario) {
      if (tela === TELAS.GAME_OVER) {
        if (botoes.a) abrirAdocao();
      } else if (tela === TELAS.ADOCAO) {
        if (botoes.esquerda) cor = (cor - 1 + cores.length) % cores.length;
        if (botoes.direita) cor = (cor + 1) % cores.length;
        if (modoAdocao === 'parceiro') {
          if (botoes.a) {
            adotarParceiro(aquario, { cor: cores[cor] }, aquario.peixePorId(parceiroDeId));
            tela = TELAS.JOGO;
          } else if (botoes.b) {
            tela = TELAS.JOGO; // desistiu
          }
        } else if (botoes.a) aoNovoJogo({ cor: cores[cor] });
      } else if (tela === TELAS.BEM_VINDO) {
        if (botoes.a) {
          bemVindo = null;
          // Se o peixe morreu enquanto você estava fora, não há mais o que ver: vai ao Game Over.
          tela = aquario.gameOver ? TELAS.GAME_OVER : TELAS.JOGO;
        }
      } else if (tela === TELAS.JOGO) {
        if (botoes.a) { tela = TELAS.MENU; item = 0; } else if (botoes.c) tela = TELAS.STATUS;
        else if (botoes.b) hudVisivel = !hudVisivel; // o HUD é só uma camada: a tela continua a do jogo
      } else if (tela === TELAS.MENU) {
        const n = ACOES.length;
        if (botoes.cima) item = (item - 1 + n) % n;
        if (botoes.baixo) item = (item + 1) % n;
        if (botoes.a && ACOES[item] === 'parceiro') {
          abrirAdocaoDeParceiro(aquario);
        } else if (botoes.a && ACOES[item] === 'cacar') {
          abrirCacada(aquario);
        } else if (botoes.a) {
          executar(ACOES[item], aquario);
          tela = TELAS.JOGO;
        } else if (botoes.b) {
          tela = TELAS.JOGO;
        }
      } else if (tela === TELAS.CACADA) {
        if (cacada.apertar(botoes) === 'sair') tela = TELAS.JOGO;
      } else if (tela === TELAS.STATUS) {
        if (botoes.c || botoes.b) tela = TELAS.JOGO;
        if (botoes.esquerda) trocarFoco(aquario, -1);
        if (botoes.direita) trocarFoco(aquario, 1);
      }
    },

    // dt = segundos REAIS do passo. Conta o tempo da mensagem e do atraso do Game Over.
    atualizar(dt, aquario) {
      // O peixe da caçada morreu (ou o aquário mudou): a caçada acaba na hora.
      if (tela === TELAS.CACADA && (!cacada.peixe || cacada.peixe.estado === 'morto' || !aquario.peixes.includes(cacada.peixe))) {
        const nome = cacada.peixe ? cacada.peixe.nome : '';
        cacada.sair();
        tela = TELAS.JOGO;
        avisar(preencher(textos.mensagens.cacadaInterrompida, { nome }));
      }
      if (mensagem) {
        mensagem.restante -= dt;
        if (mensagem.restante <= 0) mensagem = null;
      }
      if (aquario.gameOver && tela !== TELAS.GAME_OVER && tela !== TELAS.BEM_VINDO
        && tela !== TELAS.ADOCAO) {
        esperaGameOver += dt;
        if (esperaGameOver >= SEGUNDOS_ATE_O_GAME_OVER) {
          tela = TELAS.GAME_OVER;
          mensagem = null;
        }
      }
    },

    // Volta ao estado de começo de jogo (novo filhote).
    reiniciar() {
      if (cacada && cacada.ativa) cacada.sair();
      bemVindo = null;
      focoId = null;
      modoAdocao = 'primeiro';
      tela = TELAS.JOGO;
      item = 0;
      mensagem = null;
      esperaGameOver = 0;
    },
  };
}
