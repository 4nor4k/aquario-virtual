// Guarda o jogo salvo DENTRO DO NAVEGADOR (localStorage), para a página do celular no GitHub Pages, onde não
// existe servidor (doc 15, seção 2). Tem a mesma interface de armazenamento.js (carregar, gravar, apagar,
// guardarComoCorrompido), então o main.js só escolhe qual usar. O formato do que se guarda é o mesmo
// (core/salvar.js): um JSON simples.
//
// Limite que o usuário precisa saber: se ele limpar os "dados do site" no navegador, o jogo some.
// Por isso a página tem Exportar/Importar (doc 15, seção 5).

export const CHAVE_DO_JOGO = 'aquario.jogo';
export const CHAVE_CORROMPIDO = 'aquario.jogo.corrompido';

// guarda: o localStorage (os testes passam um falso). Em alguns navegadores (aba privada, dados bloqueados)
// até ler o localStorage dá erro: nesse caso tudo devolve "indisponível" e o main.js avisa.
export function criarArmazenamentoLocal(guarda = acharLocalStorage()) {
  return {
    // Devolve { estado: 'vazio' } (nunca salvou), { estado: 'ok', dados }, { estado: 'ilegivel' } (existe mas não é
    // JSON) ou { estado: 'sem-servidor' } (o navegador não deixa guardar nada; o nome é o mesmo do outro armazenamento).
    async carregar() {
      if (!guarda) return { estado: 'sem-servidor' };
      let texto;
      try {
        texto = guarda.getItem(CHAVE_DO_JOGO);
      } catch {
        return { estado: 'sem-servidor' };
      }
      if (texto === null || texto === undefined) return { estado: 'vazio' };
      try {
        return { estado: 'ok', dados: JSON.parse(texto) };
      } catch {
        return { estado: 'ilegivel' };
      }
    },

    // true se gravou. (O parâmetro keepalive existe só para ficar igual ao outro armazenamento: gravar aqui é
    // instantâneo, então não há o que "deixar terminar" quando a aba fecha.)
    async gravar(dados) {
      if (!guarda) return false;
      try {
        guarda.setItem(CHAVE_DO_JOGO, JSON.stringify(dados));
        return true;
      } catch {
        return false; // sem espaço, ou o navegador bloqueou
      }
    },

    async apagar() {
      if (!guarda) return false;
      try {
        guarda.removeItem(CHAVE_DO_JOGO);
        return true;
      } catch {
        return false;
      }
    },

    // Guarda o que não deu para ler com outro nome (não apaga nada) e libera o lugar do jogo.
    async guardarComoCorrompido() {
      if (!guarda) return false;
      try {
        const texto = guarda.getItem(CHAVE_DO_JOGO);
        if (texto === null || texto === undefined) return false;
        guarda.setItem(CHAVE_CORROMPIDO, texto);
        guarda.removeItem(CHAVE_DO_JOGO);
        return true;
      } catch {
        return false;
      }
    },
  };
}

function acharLocalStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null; // o navegador bloqueia o acesso
  }
}

// Nome do arquivo de backup: aquario-2026-11-20.json (a data de hoje no relógio do aparelho).
export function nomeDoBackup(agoraMs) {
  const d = new Date(agoraMs);
  const dois = (n) => String(n).padStart(2, '0');
  return `aquario-${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}.json`;
}
