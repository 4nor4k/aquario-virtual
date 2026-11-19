// Os corações do namoro: pequenos corações rosa de 5×5 pixels que sobem do ponto de encontro do
// casal enquanto os dois namoram (casal.namoro, ~6 s de tempo real). Cada coração sai um pouco depois
// do anterior, sobe balançando de leve e some no fim da subida.
import { LARGURA, ALTURA } from './tela.js';
import { COR } from './palette.js';

// O desenho (X = coração, o = brilho). 5 de largura por 5 de altura.
const CORACAO = [
  '.X.X.',
  'XoXXX',
  'XXXXX',
  '.XXX.',
  '..X..',
];

export const QUANTOS_CORACOES = 4;
export const VIDA_DO_CORACAO = 2.4;   // segundos que cada coração leva para subir e sumir
export const INTERVALO_ENTRE_CORACOES = 0.9;
export const SUBIDA = 16;             // quantos pixels sobe
export const ALTURA_INICIAL = 12;     // começa tantos pixels acima do peixe

// Os corações visíveis agora para um casal que namora (função pura, para testar).
// decorrido: segundos desde o começo do namoro. Devolve [{ x, y, indice }] (centro do coração, no mundo).
export function coracoesVisiveis(namoro, decorrido) {
  const lista = [];
  for (let k = 0; k < QUANTOS_CORACOES; k++) {
    const idade = decorrido - k * INTERVALO_ENTRE_CORACOES;
    if (idade < 0 || idade > VIDA_DO_CORACAO) continue;
    const progresso = idade / VIDA_DO_CORACAO;
    lista.push({
      x: namoro.x + (k % 2 === 0 ? -5 : 5) + 3 * Math.sin(idade * 3 + k),
      y: namoro.y - ALTURA_INICIAL - SUBIDA * progresso,
      indice: k,
      progresso,
    });
  }
  return lista;
}

export function desenharCoracoes(quadro, casais, camera, config) {
  const cx = Math.round(camera.x);
  const cy = Math.round(camera.y);
  for (const casal of casais) {
    if (!casal.namoro) continue;
    const decorrido = config.reproducao.namoroSegundos - casal.namoro.restante;
    for (const c of coracoesVisiveis(casal.namoro, decorrido)) {
      // Nos últimos instantes o coração pisca antes de sumir.
      if (c.progresso > 0.8 && Math.floor(decorrido * 8) % 2 === 1) continue;
      const x0 = Math.round(c.x) - 2 - cx;
      const y0 = Math.round(c.y) - 2 - cy;
      CORACAO.forEach((linha, dy) => {
        for (let dx = 0; dx < linha.length; dx++) {
          const letra = linha[dx];
          if (letra === '.') continue;
          const x = x0 + dx;
          const y = y0 + dy;
          if (x < 0 || x >= LARGURA || y < 0 || y >= ALTURA) continue;
          quadro[y * LARGURA + x] = letra === 'o' ? COR.CORACAO_CLARO : COR.CORACAO;
        }
      });
    }
  }
}
