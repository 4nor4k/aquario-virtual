// Os pedidos da página ao aparelho (doc 06, seção 2). É a ÚNICA parte da página que sabe falar com
// o aparelho: no simulador quem responde é o servidor (ponte); no ESP32, ele mesmo. Os caminhos
// começam com "/api" e são absolutos, então valem nos dois.
//
// Nunca lança erro: devolve sempre { status, corpo }. status 0 = nem chegou ao aparelho (sem rede).

async function pedir(metodo, caminho, corpo, { tempoMs = 8000 } = {}) {
  const controle = new AbortController();
  const timer = setTimeout(() => controle.abort(), tempoMs);
  try {
    const resposta = await fetch(caminho, {
      method: metodo,
      headers: corpo === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
      cache: 'no-store',
      signal: controle.signal,
    });
    let dados = {};
    try { dados = await resposta.json(); } catch { /* resposta sem corpo */ }
    return { status: resposta.status, corpo: dados };
  } catch {
    return { status: 0, corpo: { ok: false, erro: 'desligado' } };
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  estado: () => pedir('GET', '/api/estado'),
  textos: () => pedir('GET', '/api/textos'),
  comida: () => pedir('POST', '/api/comida', {}),
  limpar: () => pedir('POST', '/api/limpar', {}),
  ph: () => pedir('POST', '/api/ph', {}),
  // Primeiro peixe (ou depois do Game Over): { cor, nome }
  adotar: ({ cor, nome }) => pedir('POST', '/api/peixes', { cor, nome }),
  // Parceiro de um peixe adulto: { parceiroDe: id, cor, nome }
  adotarParceiro: ({ parceiroDe, cor, nome }) => pedir('POST', '/api/peixes', { parceiroDe, cor, nome }),
  renomear: (id, nome) => pedir('PUT', `/api/peixes/${id}`, { nome }),
  // O celular informa a hora (minutos desde a meia-noite): resolve o "tempo sem RTC" do aparelho.
  hora: (minutos) => pedir('POST', '/api/hora', { minutos }),
};
