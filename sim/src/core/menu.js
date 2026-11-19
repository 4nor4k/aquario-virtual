// O menu e as telas do aparelho (doc 02, "Controles"; doc 05, módulo de interface).
// É só a LÓGICA: qual tela está aberta, qual item está selecionado e o que cada botão faz.
// Não desenha nada e não conhece o navegador (o desenho fica em render/telas.js).
//
// Controles:
//   tela do jogo : A abre o menu · C abre o status · joystick move a câmera
//   menu         : joystick (cima/baixo) escolhe · A confirma · B volta
//   status       : C ou B voltam
//   game over    : A vai para a tela de adoção
//   adoção       : joystick (esquerda/direita) escolhe a cor · A adota um filhote
//   bem-vindo    : A fecha o aviso de "seu peixe dormiu por ..." (vai ao Game Over se ele morreu)
// O jogo NÃO pausa com o menu aberto: o tempo continua passando.
import { formatarPh, preencher } from './formatar.js';

export const TELAS = { JOGO: 'jogo', MENU: 'menu', STATUS: 'status', GAME_OVER: 'gameover', BEM_VINDO: 'bemvindo', ADOCAO: 'adocao' };

// Uma ação por item do menu, na mesma ordem de textos.menu.itens.
export const ACOES = ['comida', 'limpar', 'ph'];

export const SEGUNDOS_DA_MENSAGEM = 2.5;
// Depois que o último peixe morre, a tela do jogo continua um pouco (tempo REAL) para você
// ver o peixe boiando; só então aparece o Game Over.
export const SEGUNDOS_ATE_O_GAME_OVER = 5;

// textos: o conteúdo de config/textos.json. cores: os nomes das cores que se pode escolher ao
// adotar. aoNovoJogo({ cor }): o que fazer quando o jogador adota (aperta A na tela de adoção). aoAgir: avisa a interface depois de cada ação de
// cuidado (comida, limpar, pH), por exemplo para salvar o jogo.
export function criarMenu({ textos, cores = ['vermelho'], aoNovoJogo, aoAgir = () => {} }) {
  let tela = TELAS.JOGO;
  let item = 0;
  let mensagem = null; // { texto, restante } (segundos)
  let esperaGameOver = 0;
  let cor = 0; // posição da cor escolhida na tela de adoção (em `cores`)
  let bemVindo = null; // { ausenciaMs, morreu }: o que a tela de boas-vindas mostra

  // Faz a ação de cuidado e mostra a mensagem. É o que o menu e o painel de testes chamam.
  // Devolve o texto da mensagem.
  function executar(acao, aquario) {
    const t = textos.mensagens;
    let texto;
    if (acao === 'comida') {
      const r = aquario.darComida();
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

  // Abre a tela "Adote um peixe" (primeira vez, depois do Game Over ou de apagar o jogo).
  function abrirAdocao() {
    tela = TELAS.ADOCAO;
    cor = 0;
    mensagem = null;
  }

  return {
    get tela() { return tela; },
    get item() { return item; },
    get mensagem() { return mensagem ? mensagem.texto : null; },
    get bemVindo() { return bemVindo; },
    get corEscolhida() { return cores[cor]; },
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
        if (botoes.a) aoNovoJogo({ cor: cores[cor] });
      } else if (tela === TELAS.BEM_VINDO) {
        if (botoes.a) {
          bemVindo = null;
          // Se o peixe morreu enquanto você estava fora, não há mais o que ver: vai ao Game Over.
          tela = aquario.gameOver ? TELAS.GAME_OVER : TELAS.JOGO;
        }
      } else if (tela === TELAS.JOGO) {
        if (botoes.a) { tela = TELAS.MENU; item = 0; } else if (botoes.c) tela = TELAS.STATUS;
      } else if (tela === TELAS.MENU) {
        const n = ACOES.length;
        if (botoes.cima) item = (item - 1 + n) % n;
        if (botoes.baixo) item = (item + 1) % n;
        if (botoes.a) {
          executar(ACOES[item], aquario);
          tela = TELAS.JOGO;
        } else if (botoes.b) {
          tela = TELAS.JOGO;
        }
      } else if (tela === TELAS.STATUS) {
        if (botoes.c || botoes.b) tela = TELAS.JOGO;
      }
    },

    // dt = segundos REAIS do passo. Conta o tempo da mensagem e do atraso do Game Over.
    atualizar(dt, aquario) {
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
      bemVindo = null;
      tela = TELAS.JOGO;
      item = 0;
      mensagem = null;
      esperaGameOver = 0;
    },
  };
}
