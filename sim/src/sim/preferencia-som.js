// A escolha "som ligado ou desligado" (doc 16). É uma preferência do APARELHO, não parte do jogo salvo:
// fica no navegador (localStorage). No ESP32, mais tarde, será um item no menu guardado na memória do aparelho.
// Sem armazenamento (aba privada, dados bloqueados) o som fica ligado e a escolha só vale até fechar a página.
const CHAVE = 'aquario.som';

function armazem(storage) {
  try {
    return storage ?? globalThis.localStorage ?? null;
  } catch {
    return null; // até ler o localStorage pode dar erro em alguns navegadores
  }
}

// Padrão: ligado (só fica desligado se o jogador desligou).
export function lerSomLigado(storage) {
  try {
    return armazem(storage)?.getItem(CHAVE) !== '0';
  } catch {
    return true;
  }
}

export function gravarSomLigado(ligado, storage) {
  try {
    armazem(storage)?.setItem(CHAVE, ligado ? '1' : '0');
    return true;
  } catch {
    return false;
  }
}
