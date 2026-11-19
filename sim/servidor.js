// Servidor local mínimo, só para desenvolvimento.
// Faz duas coisas:
//   1. Serve os arquivos da pasta sim/ (o navegador não carrega módulos JavaScript de um arquivo
//      aberto direto do disco).
//   2. Guarda o jogo salvo em sim/saves/aquario.json (o navegador não escreve em arquivo).
// Uso: npm start  ->  http://localhost:8080
import { createServer } from 'node:http';
import { readFile, writeFile, rename, mkdir, rm } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const PASTA_PADRAO = resolve(fileURLToPath(new URL('.', import.meta.url)));

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

export const TAMANHO_MAXIMO_DO_SALVAMENTO = 64 * 1024; // 64 KB: o jogo salvo tem ~1 KB

// pasta: de onde sai o site. pastaSaves: onde fica o jogo salvo (os testes usam uma pasta
// temporária para não mexer no seu jogo de verdade).
export function criarServidorDoSimulador({ pasta = PASTA_PADRAO, pastaSaves = join(pasta, 'saves') } = {}) {
  const arquivoSalvo = join(pastaSaves, 'aquario.json');
  const arquivoRuim = join(pastaSaves, 'aquario.corrompido.json');

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

  async function lerCorpo(req) {
    const pedacos = [];
    let total = 0;
    for await (const pedaco of req) {
      total += pedaco.length;
      if (total > TAMANHO_MAXIMO_DO_SALVAMENTO) return null;
      pedacos.push(pedaco);
    }
    return Buffer.concat(pedacos).toString('utf8');
  }

  const resposta = (res, codigo, corpo = '', tipo = 'text/plain; charset=utf-8') => {
    res.writeHead(codigo, { 'Content-Type': tipo, 'Cache-Control': 'no-store' });
    res.end(corpo);
  };

  async function api(req, res, caminho) {
    // Só aceita pedidos feitos para localhost (protege contra páginas de fora que tentem
    // "enganar" o nome do servidor).
    const host = String(req.headers.host || '').replace(/:\d+$/, '');
    if (host !== 'localhost' && host !== '127.0.0.1') return resposta(res, 403, 'Host não aceito');

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
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const porta = Number(process.env.PORT) || 8080;
  // 127.0.0.1: só este computador acessa, nada na rede.
  criarServidorDoSimulador().listen(porta, '127.0.0.1', () => {
    console.log(`Simulador em http://localhost:${porta}  (Ctrl+C para parar)`);
  });
}
