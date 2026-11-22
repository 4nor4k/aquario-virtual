// Quem decide QUANDO cada som toca (doc 16). Olha o que aconteceu no jogo a cada passo (eventos do core, troca de
// tela, caçada, relâmpago, comida) e manda o `som` tocar. Não faz som de verdade: usa o canal de core/som.js.
// O mesmo caminho vai tocar o buzzer no ESP32.
//
// Sem som de propósito: mover o joystick no menu e trocar o peixe em foco (em buzzer de verdade, cada passo cansa).
import { TELAS } from './menu.js';
import { FASES_DA_CACADA } from './cacada.js';

// Evento do core (core/events.js) -> som.
export const SOM_DO_EVENTO = {
  adoeceu: 'adoeceu',
  recuperou: 'recuperou',
  morreu: 'morreu',
  gameOver: 'gameOver',
  reproducao: 'namoro',
  nasceu: 'nasceu',
};

// Ação de cuidado (a que o menu avisa em aoAgir) -> som. 'cacada' não tem: a caçada toca os próprios sons.
export const SOM_DA_ACAO = {
  comida: 'comida',
  limpar: 'limpar',
  ph: 'ph',
  parceiro: 'adotar',   // adotou o parceiro
  novoPeixe: 'adotar',  // adotou o primeiro peixe (a interface avisa)
};

export function criarObservadorDeSons({ som }) {
  let acoes = [];          // ações feitas neste passo (ainda sem som)
  let anterior = null;     // o estado do passo anterior (null: ainda não olhou)

  function trocaDeTela(de, para, mensagemNova, fezAcao) {
    if (de === para) return;
    // Abrir o menu, entrar na caçada, sair do Game Over e fechar o aviso de ausência NÃO fazem som (o "clique" foi
    // tirado a pedido do usuário em 22/11/2026).
    if (de === TELAS.JOGO && para === TELAS.STATUS) som.tocar('status');
    else if (de === TELAS.STATUS && para === TELAS.JOGO) som.tocar('voltar');
    else if (de === TELAS.MENU && para === TELAS.JOGO) {
      if (fezAcao) return; // o som da ação toca no lugar
      som.tocar(mensagemNova ? 'negado' : 'voltar'); // com mensagem nova e sem ação: o menu recusou (peixe fraco, sem vaga...)
    } else if (de === TELAS.CACADA && para === TELAS.JOGO) som.tocar('voltar');
    else if (de === TELAS.ADOCAO && para === TELAS.JOGO) { if (!fezAcao) som.tocar('voltar'); } // desistiu do parceiro
    else if (para === TELAS.BEM_VINDO) som.tocar('bemvindo');
  }

  function somDaCacada(antes, agora) {
    // Contagem 3, 2, 1: um bip por número; ao zerar, o "vai".
    if (agora.fase === FASES_DA_CACADA.CONTAGEM) {
      if (agora.numero !== antes.numero && agora.numero > 0) som.tocar('contagem');
    }
    if (agora.fase === FASES_DA_CACADA.JOGANDO && antes.fase === FASES_DA_CACADA.CONTAGEM) som.tocar('vai');
    if (agora.fase === FASES_DA_CACADA.JOGANDO && antes.fase === FASES_DA_CACADA.JOGANDO && agora.pontos > antes.pontos) som.tocar('larva');
    if (agora.fase === FASES_DA_CACADA.PAUSA && antes.fase !== FASES_DA_CACADA.PAUSA) som.tocar('pausa');
    if (agora.fase === FASES_DA_CACADA.PAUSA && antes.fase === FASES_DA_CACADA.PAUSA) return;
    if (agora.fase === FASES_DA_CACADA.FIM && antes.fase !== FASES_DA_CACADA.FIM) som.tocar(agora.novoRecorde ? 'recorde' : 'fimCacada');
  }

  return {
    // A interface chama quando o jogador faz uma ação de cuidado (aoAgir do menu) ou adota um peixe.
    aoAgir(acao) { acoes.push(acao); },

    // Chamar UMA vez por passo do jogo, depois de tudo ter andado.
    //   estado = { tela, mensagem, cacada: { fase, numero, pontos, novoRecorde }, relampago (true/false),
    //              graos (quantos na água), eventos (o que o core anotou neste passo) }
    passo(estado) {
      const fezAcao = acoes.length > 0;
      const antes = anterior;
      anterior = {
        tela: estado.tela, mensagem: estado.mensagem, relampago: estado.relampago, graos: estado.graos,
        // O número da contagem só vale enquanto está contando (na pausa ele "some" e volta ao continuar).
        cacada: { ...estado.cacada, numero: estado.cacada.fase === FASES_DA_CACADA.CONTAGEM ? estado.cacada.numero : 0 },
      };
      if (antes) {
        const mensagemNova = Boolean(estado.mensagem) && estado.mensagem !== antes.mensagem;
        trocaDeTela(antes.tela, estado.tela, mensagemNova, fezAcao);
        somDaCacada(antes.cacada, anterior.cacada);
        if (estado.relampago && !antes.relampago) som.tocar('trovao');
        if (estado.graos < antes.graos) som.tocar('comeu');
      }
      for (const evento of estado.eventos) {
        const nome = SOM_DO_EVENTO[evento.tipo];
        if (nome) som.tocar(nome);
      }
      for (const acao of acoes) {
        const nome = SOM_DA_ACAO[acao];
        if (nome) som.tocar(nome);
      }
      acoes = [];
    },
  };
}
