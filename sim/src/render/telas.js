// Desenho das telas por cima do aquário: mensagem curta, menu, status e Game Over (doc 02/04).
// A lógica (qual tela, qual item) está em core/menu.js; aqui só se desenha.
import { LARGURA, ALTURA } from './tela.js';
import {
  desenharTexto, larguraDoTexto, quebrarTexto, ALTURA_LINHA,
} from './fonte.js';
import { preencherRetangulo, contornoRetangulo } from './formas.js';
import { TELAS } from '../core/menu.js';
import { idadeMs } from '../core/fish.js';
import { diaDaVida, formatarDuracao, formatarPh, preencher } from '../core/formatar.js';
import { notaDoPh, valorDoPh } from '../core/rules.js';

// Cores da paleta (palette.js)
const FUNDO_DA_TELA = 13;  // preto liso (a água em pontinhos atrapalharia a leitura)
const FUNDO_DA_CAIXA = 13; // contorno escuro
const BORDA = 11;          // ciano
const BORDA_SUAVE = 12;    // branco (em preto e branco, um tom médio não forma linha)
const TEXTO = 12;          // branco
const TITULO = 15;         // laranja
const DESTAQUE = 11;       // ciano (em preto e branco também vira branco)
const CURSOR = 10;         // rosa
const DICA = 12;           // branco (tom médio quebraria as letras)
const RUIM = 10;           // rosa (indicador impróprio)

const MARGEM = 6;

const centralizado = (texto, escala = 1) => Math.floor((LARGURA - larguraDoTexto(texto, escala)) / 2);

// --- Mensagem curta no rodapé ------------------------------------------------------------------

export function desenharMensagem(quadro, texto) {
  const linhas = quebrarTexto(texto, 26);
  const altura = linhas.length * ALTURA_LINHA + 4;
  const largura = Math.max(...linhas.map((l) => larguraDoTexto(l))) + 8;
  const x = Math.floor((LARGURA - largura) / 2);
  const y = ALTURA - altura - 4;
  preencherRetangulo(quadro, x, y, largura, altura, FUNDO_DA_CAIXA);
  contornoRetangulo(quadro, x, y, largura, altura, BORDA);
  linhas.forEach((linha, i) => {
    desenharTexto(quadro, linha, x + 4, y + 3 + i * ALTURA_LINHA, TEXTO);
  });
}

// --- Menu de ações -----------------------------------------------------------------------------

export function desenharMenu(quadro, menu, textos) {
  const itens = menu.itens;
  const largura = 96;
  const altura = 14 + itens.length * 10 + 14;
  const x = Math.floor((LARGURA - largura) / 2);
  const y = Math.floor((ALTURA - altura) / 2);
  preencherRetangulo(quadro, x, y, largura, altura, FUNDO_DA_CAIXA);
  contornoRetangulo(quadro, x, y, largura, altura, BORDA);

  desenharTexto(quadro, textos.menu.titulo, centralizado(textos.menu.titulo), y + 5, TITULO);
  itens.forEach((nome, i) => {
    const escolhido = i === menu.item;
    const ty = y + 17 + i * 10;
    if (escolhido) desenharTexto(quadro, '>', x + 6, ty, CURSOR);
    desenharTexto(quadro, nome, x + 14, ty, escolhido ? DESTAQUE : TEXTO);
  });
  desenharTexto(quadro, textos.menu.dica, centralizado(textos.menu.dica), y + altura - 9, DICA);
}

// --- Tela de status (botão C) ------------------------------------------------------------------

// Barra de 0 a 100: borda de 1 pixel e preenchimento por dentro.
function desenharBarra(quadro, x, y, largura, valor, cor) {
  contornoRetangulo(quadro, x, y, largura, 5, BORDA_SUAVE);
  const cheio = Math.round(((largura - 2) * Math.max(0, Math.min(100, valor))) / 100);
  if (cor !== RUIM) {
    preencherRetangulo(quadro, x + 1, y + 1, cheio, 3, cor);
    return;
  }
  // Em preto e branco o rosa e o ciano são os dois brancos; a barra imprópria vira xadrez
  // (meio apagada) para continuar parecendo um aviso.
  for (let by = 0; by < 3; by++) {
    for (let bx = 0; bx < cheio; bx++) {
      if ((bx + by) % 2 === 0) quadro[(y + 1 + by) * LARGURA + x + 1 + bx] = cor;
    }
  }
}

function linhaDeBarra(quadro, y, rotulo, valor, cor) {
  desenharTexto(quadro, rotulo, MARGEM, y, TEXTO);
  desenharBarra(quadro, 46, y, 50, valor, cor);
  const numero = String(Math.round(valor));
  desenharTexto(quadro, numero, LARGURA - MARGEM - larguraDoTexto(numero), y, TEXTO);
}

export function desenharStatus(quadro, { aquario, config, textos, agoraMs }) {
  const t = textos.status;
  preencherRetangulo(quadro, 0, 0, LARGURA, ALTURA, FUNDO_DA_TELA);
  contornoRetangulo(quadro, 0, 0, LARGURA, ALTURA, BORDA);

  const peixe = aquario.peixes[0];
  if (!peixe) {
    desenharTexto(quadro, t.semPeixe, centralizado(t.semPeixe), 56, TEXTO);
  } else {
    desenharTexto(quadro, peixe.nome, MARGEM, 8, TITULO);
    const idade = preencher(t.idade, diaDaVida(idadeMs(peixe, agoraMs)));
    desenharTexto(quadro, `${t.fases[peixe.fase]} - ${idade}`, MARGEM, 18, TEXTO);

    const cfg = config;
    linhaDeBarra(quadro, 32, t.saciedade, peixe.saciedade,
      peixe.saciedade < cfg.saciedade.improprioAbaixoDe ? RUIM : DESTAQUE);
    linhaDeBarra(quadro, 44, t.sujeira, aquario.sujeira,
      aquario.sujeira > cfg.sujeira.improprioAcimaDe ? RUIM : DESTAQUE);
    linhaDeBarra(quadro, 56, t.saude, peixe.saude,
      peixe.saude < cfg.saude.doenteAbaixoDe ? RUIM : DESTAQUE);

    const nota = notaDoPh(aquario, cfg);
    const notaTexto = nota >= 100 ? t.phNotas.ideal : nota > cfg.ph.improprioNotaAte ? t.phNotas.aceitavel : t.phNotas.ruim;
    desenharTexto(quadro, `${t.ph} ${formatarPh(valorDoPh(aquario, cfg))} - ${notaTexto}`, MARGEM, 72,
      nota <= cfg.ph.improprioNotaAte ? RUIM : TEXTO);

    desenharTexto(quadro, `${t.estado}: ${t.estados[peixe.estado]}`, MARGEM, 86,
      peixe.estado === 'saudavel' ? TEXTO : RUIM);
    if (peixe.causaDaMorte) {
      desenharTexto(quadro, `(${t.causas[peixe.causaDaMorte]})`, MARGEM, 96, RUIM);
    }
  }
  desenharTexto(quadro, t.dica, centralizado(t.dica), ALTURA - 11, DICA);
}

// --- Game Over ---------------------------------------------------------------------------------

export function desenharGameOver(quadro, { aquario, textos }) {
  const g = textos.gameOver;
  preencherRetangulo(quadro, 0, 0, LARGURA, ALTURA, FUNDO_DA_CAIXA);
  contornoRetangulo(quadro, 0, 0, LARGURA, ALTURA, RUIM);

  desenharTexto(quadro, g.titulo, centralizado(g.titulo, 2), 14, RUIM, 2);

  // A mensagem de condolências depende de como o último peixe morreu.
  const mensagem = g.condolencias[aquario.causaDoGameOver] ?? g.condolencias.cuidado;
  quebrarTexto(mensagem, 26).forEach((linha, i) => {
    desenharTexto(quadro, linha, MARGEM + 2, 42 + i * ALTURA_LINHA, TEXTO);
  });

  desenharTexto(quadro, g.dica, centralizado(g.dica), ALTURA - 14, DESTAQUE);
}

// --- Bem-vindo de volta -------------------------------------------------------------------------

// Aparece ao abrir o jogo depois de um tempo fechado: "Seu peixe dormiu por 5 h 20 min...".
export function desenharBemVindo(quadro, { menu, textos }) {
  const b = textos.bemVindo;
  const { ausenciaMs, morreu } = menu.bemVindo ?? { ausenciaMs: 0, morreu: false };
  preencherRetangulo(quadro, 0, 0, LARGURA, ALTURA, FUNDO_DA_CAIXA);
  contornoRetangulo(quadro, 0, 0, LARGURA, ALTURA, morreu ? RUIM : BORDA);

  const mensagem = preencher(morreu ? b.morto : b.vivo, { tempo: formatarDuracao(ausenciaMs) });
  const linhas = quebrarTexto(mensagem, 26);
  // Centraliza o bloco de texto na vertical.
  const topo = Math.floor((ALTURA - linhas.length * ALTURA_LINHA) / 2) - 4;
  linhas.forEach((linha, i) => {
    desenharTexto(quadro, linha, centralizado(linha), topo + i * ALTURA_LINHA, morreu ? RUIM : TEXTO);
  });
  desenharTexto(quadro, b.dica, centralizado(b.dica), ALTURA - 14, DESTAQUE);
}

// --- Qual tela mostrar -------------------------------------------------------------------------

// Desenha por cima do aquário o que a tela atual pede.
export function desenharTelas(quadro, { menu, aquario, config, textos, agoraMs }) {
  if (menu.tela === TELAS.BEM_VINDO) {
    desenharBemVindo(quadro, { menu, textos });
    return;
  }
  if (menu.tela === TELAS.GAME_OVER) {
    desenharGameOver(quadro, { aquario, textos });
    return;
  }
  if (menu.tela === TELAS.STATUS) {
    desenharStatus(quadro, { aquario, config, textos, agoraMs });
    return;
  }
  if (menu.tela === TELAS.MENU) desenharMenu(quadro, menu, textos);
  if (menu.mensagem) desenharMensagem(quadro, menu.mensagem);
}
