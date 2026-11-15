// Servidor local mínimo, só para desenvolvimento.
// Existe porque o navegador não carrega módulos JavaScript de um arquivo aberto direto do disco.
// Uso: npm start  ->  http://localhost:8080
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const PASTA = resolve(fileURLToPath(new URL('.', import.meta.url)));
const PORTA = Number(process.env.PORT) || 8080;

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const servidor = createServer(async (req, res) => {
  try {
    let caminho = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (caminho.endsWith('/')) caminho += 'index.html';

    // Só serve arquivos de dentro da pasta sim/ (bloqueia "../")
    const arquivo = normalize(join(PASTA, caminho));
    if (arquivo !== PASTA && !arquivo.startsWith(PASTA + sep)) {
      res.writeHead(403).end('Acesso negado');
      return;
    }

    const dados = await readFile(arquivo);
    res.writeHead(200, {
      'Content-Type': TIPOS[extname(arquivo)] || 'application/octet-stream',
      'Cache-Control': 'no-store', // sempre pega a versão mais nova ao editar
    });
    res.end(dados);
  } catch {
    res.writeHead(404).end('Não encontrado');
  }
});

// 127.0.0.1: só este computador acessa, nada na rede.
servidor.listen(PORTA, '127.0.0.1', () => {
  console.log(`Simulador em http://localhost:${PORTA}  (Ctrl+C para parar)`);
});
