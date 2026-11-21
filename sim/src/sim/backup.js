// Exportar e importar o jogo salvo como ARQUIVO (doc 15, seção 5). Só as contas: o botão, o download e a leitura
// do arquivo ficam em aparelho-ui.js. O formato é o mesmo do salvamento (core/salvar.js).
import { importarJogo, ErroDeSalvamento } from '../core/salvar.js';

// Um jogo salvo tem ~1 KB (o servidor aceita até 64 KB). Um arquivo bem maior que isso não é um jogo salvo.
export const TAMANHO_MAXIMO_DO_BACKUP = 64 * 1024;

// Devolve o texto do arquivo (JSON legível, para quem abrir no bloco de notas).
export function textoDoBackup(dados) {
  return JSON.stringify(dados, null, 2);
}

// Confere o texto de um arquivo escolhido pelo usuário. Devolve { ok: true, dados } ou { ok: false, motivo }.
//
// [proposta] O tempo entre o dia do backup e o dia da importação NÃO conta: o jogo continua do momento em que
// foi exportado, com a hora real de agora (salvoEmMs = agoraMs). Se contasse, quem exporta e importa no celular
// novo uma semana depois acharia o peixe morto (o jogo conta o tempo com a página fechada: doc 09, seção 4).
export function lerBackup(texto, { config, agoraMs }) {
  if (typeof texto !== 'string' || texto.trim() === '') {
    return { ok: false, motivo: 'O arquivo está vazio.' };
  }
  if (texto.length > TAMANHO_MAXIMO_DO_BACKUP) {
    return { ok: false, motivo: 'O arquivo é grande demais para ser um jogo salvo do Aquário.' };
  }
  let dados;
  try {
    dados = JSON.parse(texto);
  } catch {
    return { ok: false, motivo: 'Este arquivo não é um jogo salvo do Aquário (não é um JSON válido).' };
  }
  try {
    importarJogo(dados, { config }); // só confere: se algo estiver errado, lança ErroDeSalvamento
  } catch (erro) {
    if (!(erro instanceof ErroDeSalvamento)) throw erro;
    return { ok: false, motivo: `Este arquivo não é um jogo salvo válido: ${erro.message}.` };
  }
  return { ok: true, dados: { ...dados, salvoEmMs: agoraMs } };
}
