// Fala com o servidor para ler e gravar o jogo salvo (doc 09, seção 3).
// É a "interface": o core não conhece arquivo nem rede. No ESP32 isto vira leitura e escrita
// de um arquivo na memória flash.

// buscar: a função fetch (os testes passam uma com o endereço do servidor de teste).
export function criarArmazenamento(buscar = (...a) => fetch(...a)) {
  const URL_SALVO = '/api/salvo';

  return {
    // Devolve { estado: 'vazio' } (nunca salvou), { estado: 'ok', dados },
    // { estado: 'ilegivel' } (o arquivo existe mas não é JSON) ou { estado: 'sem-servidor' }.
    async carregar() {
      let resposta;
      try {
        resposta = await buscar(URL_SALVO, { cache: 'no-store' });
      } catch {
        return { estado: 'sem-servidor' };
      }
      if (resposta.status === 404) return { estado: 'vazio' };
      if (!resposta.ok) return { estado: 'sem-servidor' };
      try {
        return { estado: 'ok', dados: await resposta.json() };
      } catch {
        return { estado: 'ilegivel' };
      }
    },

    // true se gravou. keepalive deixa o pedido terminar mesmo se a aba estiver fechando.
    async gravar(dados, { keepalive = false } = {}) {
      try {
        const resposta = await buscar(URL_SALVO, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dados),
          keepalive,
        });
        return resposta.ok;
      } catch {
        return false;
      }
    },

    async apagar() {
      try {
        return (await buscar(URL_SALVO, { method: 'DELETE' })).ok;
      } catch {
        return false;
      }
    },

    // Guarda o arquivo que não deu para ler com outro nome (não apaga nada).
    async guardarComoCorrompido() {
      try {
        return (await buscar(`${URL_SALVO}/corrompido`, { method: 'POST' })).ok;
      } catch {
        return false;
      }
    },
  };
}
