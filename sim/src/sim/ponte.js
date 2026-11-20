// O lado da aba do jogo na "ponte" do celular (doc 13). A cada meio segundo a aba:
//   1. manda ao servidor o retrato do jogo (o que o celular vai ler em GET /api/estado) e os
//      resultados dos comandos que executou;
//   2. recebe os comandos que o celular mandou (comida, limpar...), executa e guarda o resultado
//      para mandar logo em seguida.
// Só existe no simulador: no ESP32, o próprio aparelho responde ao celular.

export function criarPonteDoJogo({
  obterEstado, executar, buscar = (...a) => fetch(...a), intervaloMs = 500, agendar = setTimeout,
}) {
  let resultados = [];
  let ligada = false;
  let semServidor = false; // o último ciclo não chegou ao servidor

  async function ciclo() {
    let proximoEmMs = intervaloMs;
    try {
      const resposta = await buscar('/api/ponte/ciclo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: obterEstado(), resultados }),
      });
      if (!resposta.ok) throw new Error(`ponte: ${resposta.status}`);
      resultados = []; // chegaram
      const { comandos = [] } = await resposta.json();
      for (const c of comandos) {
        let r;
        try {
          r = executar({ metodo: c.metodo, caminho: c.caminho, corpo: c.corpo });
        } catch (erro) {
          r = { status: 500, corpo: { ok: false, erro: 'falhou', mensagem: String(erro?.message ?? erro) } };
        }
        resultados.push({ id: c.id, status: r.status, corpo: r.corpo });
      }
      if (comandos.length > 0) proximoEmMs = 0; // devolve o resultado já, sem esperar meio segundo
      semServidor = false;
    } catch {
      semServidor = true; // servidor fora do ar: tenta de novo no próximo ciclo
    }
    if (ligada) agendar(ciclo, proximoEmMs);
  }

  return {
    ligar() {
      if (ligada) return;
      ligada = true;
      ciclo();
    },
    desligar() { ligada = false; },
    get semServidor() { return semServidor; },
  };
}
