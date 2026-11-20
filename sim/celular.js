// A "ponte" do celular (doc 13): faz o servidor do simulador responder como o ESP32 vai responder.
// O jogo roda dentro da aba do navegador, então o servidor só guarda o último retrato que a aba
// mandou e passa os comandos do celular para ela executar:
//
//   celular --GET /api/estado-------> servidor (devolve o último retrato)
//   celular --POST /api/comida------> servidor (põe na fila e espera a aba)
//   aba do jogo --POST /api/ponte/ciclo (retrato + resultados) --> servidor (devolve os comandos da fila)
//
// Só para desenvolvimento. No aparelho de verdade, o próprio ESP32 faz tudo isto.

export const LIMITE_DO_CORPO = 4 * 1024;        // um comando do celular tem poucos bytes
export const LIMITE_DO_CICLO = 64 * 1024;       // o retrato do jogo
const FILA_MAXIMA = 20;

// Rotas que o celular usa (a lista fechada: o resto da API não é do celular).
const ROTAS_DE_COMANDO = [
  ['POST', /^\/api\/(comida|limpar|ph|peixes)$/],
  ['PUT', /^\/api\/peixes\/\d+$/],
];

// Rotas do celular que só fazem sentido no aparelho de verdade (WiFi, cenário) ou que o simulador ignora (hora).
const SO_NO_APARELHO = [['PUT', '/api/wifi'], ['PUT', '/api/cenario']];

export function ehRotaDoCelular(metodo, caminho) {
  if (caminho === '/api/estado' && metodo === 'GET') return true;
  if (caminho === '/api/textos' && metodo === 'GET') return true;
  if (metodo === 'POST' && caminho === '/api/hora') return true;
  if (SO_NO_APARELHO.some(([m, c]) => m === metodo && c === caminho)) return true;
  return ROTAS_DE_COMANDO.some(([m, r]) => m === metodo && r.test(caminho));
}

// agora: de onde vem a hora (os testes trocam por um relógio falso).
// aoLer(caminho): devolve o texto de um arquivo do site (config/textos.json) ou null.
export function criarPonteDoCelular({
  agora = Date.now, aoLerTextos, segundosOnline = 4, segundosDeEspera = 4,
} = {}) {
  let retrato = null;
  let vistoEm = -Infinity;
  let proximoId = 1;
  const fila = [];              // comandos esperando a aba pegar: { id, metodo, caminho, corpo }
  const esperando = new Map();  // id -> função que responde ao celular

  const online = () => retrato !== null && agora() - vistoEm <= segundosOnline * 1000;

  // A aba do jogo chama isto a cada meio segundo.
  function ciclo({ estado, resultados = [] }) {
    retrato = estado ?? retrato;
    vistoEm = agora();
    for (const r of Array.isArray(resultados) ? resultados : []) {
      const responder = esperando.get(r?.id);
      if (responder) {
        esperando.delete(r.id);
        responder({ status: Number(r.status) || 500, corpo: r.corpo ?? {} });
      }
    }
    return { comandos: fila.splice(0) };
  }

  // O celular manda um comando: espera a aba executar e devolve o resultado.
  function comandar(metodo, caminho, corpo) {
    if (!online()) return Promise.resolve({ status: 503, corpo: { ok: false, erro: 'desligado' } });
    if (fila.length >= FILA_MAXIMA) return Promise.resolve({ status: 429, corpo: { ok: false, erro: 'ocupado' } });
    const id = proximoId++;
    fila.push({ id, metodo, caminho, corpo });
    return new Promise((ok) => {
      const timer = setTimeout(() => {
        esperando.delete(id);
        const i = fila.findIndex((c) => c.id === id);
        if (i >= 0) fila.splice(i, 1); // a aba nunca chegou a pegar: não executa depois
        ok({ status: 504, corpo: { ok: false, erro: 'semResposta' } });
      }, segundosDeEspera * 1000);
      esperando.set(id, (r) => { clearTimeout(timer); ok(r); });
    });
  }

  function estado() {
    if (!online()) return { status: 503, corpo: { ligado: false } };
    return { status: 200, corpo: { ...retrato, ligado: true } };
  }

  // Responde às rotas do celular que NÃO passam pela aba. Devolve null se for um comando da aba.
  function semAba(metodo, caminho) {
    if (caminho === '/api/estado') return estado();
    if (caminho === '/api/textos') {
      const texto = aoLerTextos?.();
      return texto ? { status: 200, texto } : { status: 404, corpo: { ok: false } };
    }
    if (caminho === '/api/hora') return { status: 200, corpo: { ok: true, ignorado: true } }; // o simulador usa a hora do PC
    if (SO_NO_APARELHO.some(([m, c]) => m === metodo && c === caminho)) {
      return { status: 501, corpo: { ok: false, erro: 'soNoAparelho' } };
    }
    return null;
  }

  return { ciclo, comandar, estado, semAba, online };
}

// --- Quem pode pedir o quê -------------------------------------------------------------------

const ENDERECOS_DO_PC = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

// 10.x, 172.16 a 31.x, 192.168.x (as redes de casa). Aceita o jeito "::ffff:192.168.0.5" do IPv6.
export function ehRedePrivada(ip) {
  const v4 = String(ip).replace(/^::ffff:/, '');
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(v4);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  if (m.slice(1).some((n) => Number(n) > 255)) return false;
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

// De onde veio o pedido?
//   'pc'   : do próprio computador, escrevendo localhost ou 127.0.0.1 (vê tudo)
//   'rede' : de um aparelho da rede de casa (só vê a página do celular e a API dele), e só no modo rede
//   null   : recusado
// Em ambos os casos o endereço escrito no pedido (Host) tem de ser localhost ou um número IP da rede:
// nada de nome de site, o que protege de páginas de fora que tentem "enganar" o servidor.
export function origemDoPedido({ enderecoRemoto, host, rede = false }) {
  const nome = String(host || '').replace(/:\d+$/, '');
  if (ENDERECOS_DO_PC.has(enderecoRemoto)) {
    return nome === 'localhost' || nome === '127.0.0.1' ? 'pc' : null;
  }
  if (rede && ehRedePrivada(enderecoRemoto) && ehRedePrivada(nome)) return 'rede';
  return null;
}
