// Servidor local mínimo, só para desenvolvimento.
// Faz duas coisas:
//   1. Serve os arquivos da pasta sim/ (o navegador não carrega módulos JavaScript de um arquivo
//      aberto direto do disco).
//   2. Guarda o jogo salvo em sim/saves/aquario.json (o navegador não escreve em arquivo).
// Uso: npm start  ->  http://localhost:8080
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { readFile, writeFile, rename, mkdir, rm } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { networkInterfaces } from 'node:os';
import {
  criarPonteDoCelular, ehRotaDoCelular, origemDoPedido, LIMITE_DO_CORPO, LIMITE_DO_CICLO,
} from './celular.js';

const PASTA_PADRAO = resolve(fileURLToPath(new URL('.', import.meta.url)));
const PASTA_WEB_PADRAO = resolve(PASTA_PADRAO, '..', 'web'); // a página do celular (no aparelho, vai na flash)

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

export const TAMANHO_MAXIMO_DO_SALVAMENTO = 64 * 1024; // 64 KB: o jogo salvo tem ~1 KB

// pasta: de onde sai o site. pastaSaves: onde fica o jogo salvo (os testes usam uma pasta
// temporária para não mexer no seu jogo de verdade).
// rede: abre a página do celular e a API dele para os aparelhos da rede de casa (doc 13, seção 6).
// Desligado, só o próprio PC acessa. Mesmo ligado, a rede não alcança o jogo salvo, a ponte nem a pasta sim/.
// pastaWeb: a página do celular, servida em /app/. agora: relógio (os testes trocam por um falso).
export function criarServidorDoSimulador({
  pasta = PASTA_PADRAO, pastaSaves = join(pasta, 'saves'), pastaWeb = PASTA_WEB_PADRAO, rede = false, agora = Date.now,
  segundosOnline, segundosDeEspera,
} = {}) {
  const arquivoSalvo = join(pastaSaves, 'aquario.json');
  const arquivoRuim = join(pastaSaves, 'aquario.corrompido.json');
  const ponte = criarPonteDoCelular({
    agora,
    segundosOnline,
    segundosDeEspera,
    aoLerTextos: () => readFileSync(join(pasta, 'config', 'textos.json'), 'utf8'),
  });

  // Uma gravação de cada vez, na ordem em que chegaram (senão duas poderiam se misturar).
  let fila = Promise.resolve();
  const naFila = (tarefa) => {
    const resultado = fila.then(tarefa);
    fila = resultado.catch(() => {});
    return resultado;
  };

  // Escreve num arquivo temporário e troca de nome: se faltar luz no meio, o bom continua lá.
  async function gravarSalvo(texto) {
    await mkdir(pastaSaves, { recursive: true });
    const temporario = `${arquivoSalvo}.tmp`;
    await writeFile(temporario, texto, 'utf8');
    await rename(temporario, arquivoSalvo);
  }

  async function lerCorpo(req, limite = TAMANHO_MAXIMO_DO_SALVAMENTO) {
    const pedacos = [];
    let total = 0;
    for await (const pedaco of req) {
      total += pedaco.length;
      if (total > limite) return null;
      pedacos.push(pedaco);
    }
    return Buffer.concat(pedacos).toString('utf8');
  }

  const resposta = (res, codigo, corpo = '', tipo = 'text/plain; charset=utf-8') => {
    res.writeHead(codigo, { 'Content-Type': tipo, 'Cache-Control': 'no-store' });
    res.end(corpo);
  };

  const json = (res, codigo, corpo) => resposta(res, codigo, JSON.stringify(corpo), TIPOS['.json']);

  // Lê o corpo (JSON) de um pedido. Se não der, já responde o erro e devolve null.
  async function lerJson(req, res, limite) {
    const texto = await lerCorpo(req, limite);
    if (texto === null) { resposta(res, 413, 'Grande demais'); return null; }
    if (texto.trim() === '') return {};
    try {
      const dados = JSON.parse(texto);
      if (dados === null || typeof dados !== 'object' || Array.isArray(dados)) throw new Error('não é objeto');
      return dados;
    } catch {
      resposta(res, 400, 'Não é JSON');
      return null;
    }
  }

  // A API do celular (a mesma que o ESP32 vai ter) e a ponte com a aba do jogo.
  async function apiDoCelular(req, res, caminho) {
    const direta = ponte.semAba(req.method, caminho);
    if (direta) {
      return direta.texto !== undefined
        ? resposta(res, direta.status, direta.texto, TIPOS['.json'])
        : json(res, direta.status, direta.corpo);
    }
    const corpo = await lerJson(req, res, LIMITE_DO_CORPO);
    if (corpo === null) return undefined;
    const r = await ponte.comandar(req.method, caminho, corpo);
    return json(res, r.status, r.corpo);
  }

  // A aba do jogo (só do PC): entrega o retrato e os resultados, recebe os comandos.
  async function pontePc(req, res) {
    const dados = await lerJson(req, res, LIMITE_DO_CICLO);
    if (dados === null) return undefined;
    return json(res, 200, ponte.ciclo(dados));
  }

  // A página do celular (pasta web/), em /app/. Só arquivos de dentro dela.
  async function paginaDoCelular(res, caminho) {
    let relativo = caminho.slice('/app'.length);
    if (relativo === '' || relativo.endsWith('/')) relativo += 'index.html';
    const arquivo = normalize(join(pastaWeb, relativo));
    if (arquivo !== pastaWeb && !arquivo.startsWith(pastaWeb + sep)) return resposta(res, 403, 'Acesso negado');
    try {
      const dados = await readFile(arquivo);
      res.writeHead(200, { 'Content-Type': TIPOS[extname(arquivo)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      return res.end(dados);
    } catch {
      return resposta(res, 404, 'Não encontrado');
    }
  }

  async function api(req, res, caminho) {
    if (caminho === '/api/salvo') {
      if (req.method === 'GET') {
        try {
          return resposta(res, 200, await readFile(arquivoSalvo, 'utf8'), TIPOS['.json']);
        } catch {
          return resposta(res, 404, 'Sem jogo salvo');
        }
      }
      if (req.method === 'PUT') {
        const texto = await lerCorpo(req);
        if (texto === null) return resposta(res, 413, 'Grande demais');
        let dados;
        try {
          dados = JSON.parse(texto);
        } catch {
          return resposta(res, 400, 'Não é JSON');
        }
        if (dados === null || typeof dados !== 'object' || Array.isArray(dados) || typeof dados.versao !== 'number') {
          return resposta(res, 400, 'Não parece um jogo salvo');
        }
        await naFila(() => gravarSalvo(texto));
        return resposta(res, 204);
      }
      if (req.method === 'DELETE') {
        await naFila(() => rm(arquivoSalvo, { force: true }));
        return resposta(res, 204);
      }
    }

    // O arquivo existe mas o jogo não conseguiu ler: guarda com outro nome, sem apagar.
    if (caminho === '/api/salvo/corrompido' && req.method === 'POST') {
      try {
        await naFila(() => rename(arquivoSalvo, arquivoRuim));
        return resposta(res, 204);
      } catch {
        return resposta(res, 404, 'Sem jogo salvo');
      }
    }
    return resposta(res, 404, 'Não encontrado');
  }

  return createServer(async (req, res) => {
    try {
      let caminho = decodeURIComponent(new URL(req.url, 'http://x').pathname);

      // De onde veio? Só o PC vê tudo; a rede de casa (se ligada) só vê o que é do celular.
      const origem = origemDoPedido({ enderecoRemoto: req.socket.remoteAddress, host: req.headers.host, rede });
      if (!origem) return resposta(res, 403, 'Host não aceito');
      const doCelular = caminho === '/app' || caminho.startsWith('/app/') || ehRotaDoCelular(req.method, caminho);
      if (origem === 'rede' && !doCelular) return resposta(res, 403, 'Acesso negado');

      if (caminho === '/app') {
        res.writeHead(301, { Location: '/app/' });
        return res.end();
      }
      if (caminho.startsWith('/app/')) return await paginaDoCelular(res, caminho);
      if (caminho === '/api/ponte/ciclo' && req.method === 'POST') return await pontePc(req, res);
      if (ehRotaDoCelular(req.method, caminho)) return await apiDoCelular(req, res, caminho);
      if (caminho.startsWith('/api/')) return await api(req, res, caminho);
      if (caminho.endsWith('/')) caminho += 'index.html';

      // Só serve arquivos de dentro da pasta sim/ (bloqueia "../") e nunca a pasta do jogo salvo.
      const arquivo = normalize(join(pasta, caminho));
      const dentro = arquivo === pasta || arquivo.startsWith(pasta + sep);
      if (!dentro || arquivo.startsWith(pastaSaves + sep)) {
        return resposta(res, 403, 'Acesso negado');
      }

      const dados = await readFile(arquivo);
      res.writeHead(200, {
        'Content-Type': TIPOS[extname(arquivo)] || 'application/octet-stream',
        'Cache-Control': 'no-store', // sempre pega a versão mais nova ao editar
      });
      res.end(dados);
    } catch {
      resposta(res, 404, 'Não encontrado');
    }
  });
}

// Só liga o servidor quando este arquivo é executado (node servidor.js), não quando é importado.
//   node servidor.js          só este computador acessa (127.0.0.1)
//   REDE=1 node servidor.js   o celular, na mesma rede de casa, também abre a página (doc 13)
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const porta = Number(process.env.PORT) || 8080;
  const rede = process.env.REDE === '1';
  // Sem REDE: 127.0.0.1, nada na rede. Com REDE: escuta em todas as placas, e o servidor
  // recusa tudo o que não é do celular (veja origemDoPedido em celular.js).
  criarServidorDoSimulador({ rede }).listen(porta, rede ? '0.0.0.0' : '127.0.0.1', () => {
    console.log(`Simulador em http://localhost:${porta}  (Ctrl+C para parar)`);
    if (!rede) return;
    console.log('Modo rede LIGADO: abra no celular (mesmo WiFi), um destes endereços:');
    for (const lista of Object.values(networkInterfaces())) {
      for (const i of lista ?? []) if (i.family === 'IPv4' && !i.internal) console.log(`  http://${i.address}:${porta}/app/`);
    }
  });
}
