// Desenho da caçada (doc 14): as larvas na água e, por cima, a faixa de placar, a contagem, a pausa e o fim.
// A lógica está em core/cacada.js; aqui só se desenha.
import { LARGURA, ALTURA } from './tela.js';
import { COR } from './palette.js';
import { desenharTexto, larguraDoTexto, ALTURA_LINHA } from './fonte.js';
import { preencherRetangulo, contornoRetangulo, pixel } from './formas.js';
import { preencher } from '../core/formatar.js';
import { ITENS_DA_PAUSA } from '../core/cacada.js';

const FUNDO = 13;      // preto (contorno)
const BORDA = 11;      // ciano
const TEXTO = 12;      // branco
const TITULO = 15;     // laranja
const DESTAQUE = 11;
const CURSOR = 10;     // rosa
const ALTURA_DA_FAIXA = 9;
const SEGMENTOS = 7;   // uma larva mede 7 pixels de comprimento por 2 de espessura

const centralizado = (texto, escala = 1) => Math.floor((LARGURA - larguraDoTexto(texto, escala)) / 2);

// "1:00", "0:42"... (arredonda para cima: com 0,3 s sobrando ainda mostra 0:01).
export function formatarTempoDaCacada(segundos) {
  const total = Math.max(0, Math.ceil(segundos));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

// A minhoca: uma fileira de quadradinhos 2×2 que ondula (cabeça clara). Anda na direção em que nada (l.ang);
// quando foge, ondula mais depressa e fica mais encolhida.
export function desenharLarvas(quadro, larvas, camera) {
  const cx = Math.round(camera.x);
  const cy = Math.round(camera.y);
  for (const l of larvas) {
    const dx = Math.cos(l.ang);
    const dy = Math.sin(l.ang);
    for (let i = SEGMENTOS - 1; i >= 0; i--) {
      // Cada segmento fica atrás do anterior; a ondulação empurra de lado (perpendicular ao corpo).
      const onda = Math.sin(l.fase - i * 0.9) * (0.4 + i * 0.12);
      const x = Math.round(l.x - dx * i * 0.9 - dy * onda) - cx;
      const y = Math.round(l.y - dy * i * 0.9 + dx * onda) - cy;
      const cor = i === 0 ? COR.CORACAO_CLARO : COR.CORACAO;
      for (let oy = 0; oy < 2; oy++) for (let ox = 0; ox < 2; ox++) pixel(quadro, x + ox, y + oy, cor);
    }
  }
}

function caixa(quadro, largura, altura) {
  const x = Math.floor((LARGURA - largura) / 2);
  const y = Math.floor((ALTURA - altura) / 2);
  preencherRetangulo(quadro, x, y, largura, altura, FUNDO);
  contornoRetangulo(quadro, x, y, largura, altura, BORDA);
  return { x, y };
}

function desenharFaixa(quadro, cacada, textos) {
  const t = textos.cacada;
  preencherRetangulo(quadro, 0, 0, LARGURA, ALTURA_DA_FAIXA, FUNDO);
  desenharTexto(quadro, formatarTempoDaCacada(cacada.restante), 3, 2, TEXTO);
  const larvas = `${t.larvas} ${cacada.pontos}`;
  desenharTexto(quadro, larvas, centralizado(larvas), 2, TITULO);
  const recorde = `${t.recorde} ${cacada.recorde}`;
  desenharTexto(quadro, recorde, LARGURA - 3 - larguraDoTexto(recorde), 2, DESTAQUE);
}

function desenharPausa(quadro, cacada, textos) {
  const t = textos.cacada.pausa;
  const largura = 84;
  const altura = 14 + ITENS_DA_PAUSA.length * 10 + 14;
  const { x, y } = caixa(quadro, largura, altura);
  desenharTexto(quadro, t.titulo, centralizado(t.titulo), y + 5, TITULO);
  t.itens.forEach((nome, i) => {
    const escolhido = i === cacada.item;
    const ty = y + 17 + i * 10;
    if (escolhido) desenharTexto(quadro, '>', x + 6, ty, CURSOR);
    desenharTexto(quadro, nome, x + 14, ty, escolhido ? DESTAQUE : TEXTO);
  });
  desenharTexto(quadro, t.dica, centralizado(t.dica), y + altura - 9, TEXTO);
}

function desenharFim(quadro, cacada, textos) {
  const t = textos.cacada.fim;
  const { y } = caixa(quadro, 92, 58);
  desenharTexto(quadro, t.titulo, centralizado(t.titulo), y + 5, TITULO);
  const linha1 = preencher(t.larvas, { n: cacada.pontos });
  const linha2 = preencher(t.recorde, { n: cacada.recorde });
  desenharTexto(quadro, linha1, centralizado(linha1), y + 16, TEXTO);
  desenharTexto(quadro, linha2, centralizado(linha2), y + 16 + ALTURA_LINHA, DESTAQUE);
  if (cacada.novoRecorde) desenharTexto(quadro, t.novoRecorde, centralizado(t.novoRecorde), y + 16 + ALTURA_LINHA * 2, TITULO);
  desenharTexto(quadro, t.dica, centralizado(t.dica), y + 58 - 9, TEXTO);
}

// Tudo o que vai por cima do aquário durante a caçada (as larvas são desenhadas junto da cena).
export function desenharCacada(quadro, { cacada, textos }) {
  desenharFaixa(quadro, cacada, textos);
  if (cacada.numeroDaContagem > 0 && cacada.fase === 'contagem') {
    const n = String(cacada.numeroDaContagem);
    desenharTexto(quadro, n, centralizado(n, 4), Math.floor(ALTURA / 2) - 10, TITULO, 4);
  }
  if (cacada.fase === 'pausa') desenharPausa(quadro, cacada, textos);
  if (cacada.fase === 'fim') desenharFim(quadro, cacada, textos);
}
