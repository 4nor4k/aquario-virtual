import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { montarSite } from '../tools/montar-site.mjs';
import { desenharIcone, pixelDoIcone, COR_DO_FUNDO, TAMANHOS } from '../tools/icones.js';

const SIM = resolve(fileURLToPath(new URL('..', import.meta.url)));
const novaPasta = () => mkdtempSync(join(tmpdir(), 'aquario-site-'));

function montado() {
  const destino = join(novaPasta(), '_site');
  montarSite({ origem: SIM, destino });
  return destino;
}

// Endereços locais que uma página HTML ou o manifest pedem (ignora http, data e âncoras).
function enderecosLocais(html) {
  return [...html.matchAll(/\b(?:src|href)="([^"]+)"/g)]
    .map((m) => m[1])
    .filter((e) => !/^(https?:|data:|#|mailto:)/.test(e))
    .map((e) => e.split(/[?#]/)[0]);
}

test('site: a página do aparelho vira o index.html e todo arquivo que ela pede existe', () => {
  const site = montado();
  const html = readFileSync(join(site, 'index.html'), 'utf8');
  assert.match(html, /data-modo="aparelho"/, 'o index do site é a página do aparelho, não o painel de testes');
  const pedidos = enderecosLocais(html);
  assert.ok(pedidos.length >= 5);
  for (const pedido of pedidos) assert.ok(existsSync(join(site, pedido)), `falta ${pedido}`);
});

test('site: o jogo carrega seus números e textos pelos mesmos caminhos do navegador', () => {
  const site = montado();
  for (const arquivo of ['config/jogo.json', 'config/textos.json', 'src/main.js', 'sw.js', '.nojekyll']) {
    assert.ok(existsSync(join(site, arquivo)), `falta ${arquivo}`);
  }
  JSON.parse(readFileSync(join(site, 'config/jogo.json'), 'utf8')); // é JSON válido
});

test('site: manifest válido, com ícones que existem e start_url dentro do site', () => {
  const site = montado();
  const manifest = JSON.parse(readFileSync(join(site, 'manifest.webmanifest'), 'utf8'));
  assert.equal(manifest.display, 'standalone');
  assert.ok(manifest.name && manifest.short_name);
  assert.equal(manifest.start_url, './');
  assert.ok(manifest.icons.some((i) => i.sizes === '192x192'));
  assert.ok(manifest.icons.some((i) => i.sizes === '512x512'));
  for (const icone of manifest.icons) assert.ok(existsSync(join(site, icone.src)), `falta ${icone.src}`);
});

test('site: nada de fora entra (jogo salvo do usuário, servidor, testes, painel)', () => {
  const site = montado();
  const raiz = readdirSync(site).sort();
  assert.deepEqual(raiz, ['.nojekyll', 'config', 'estilo-aparelho.css', 'icones', 'index.html', 'manifest.webmanifest', 'src', 'sw.js']);
  for (const proibido of ['servidor.js', 'saves', 'tests', 'tools', 'web', 'aparelho.html', 'celular.js']) {
    assert.equal(existsSync(join(site, proibido)), false, proibido);
  }
});

test('site: nunca apaga nem mistura com uma pasta que já tem coisas', () => {
  const destino = novaPasta();
  writeFileSync(join(destino, 'importante.txt'), 'não apague');
  assert.throws(() => montarSite({ origem: SIM, destino }), /já tem arquivos/);
  assert.equal(readFileSync(join(destino, 'importante.txt'), 'utf8'), 'não apague');
});

test('site: pasta de destino vazia ou ainda inexistente funciona', () => {
  const vazia = novaPasta();
  montarSite({ origem: SIM, destino: vazia });
  assert.ok(existsSync(join(vazia, 'index.html')));
});

test('site: origem sem os arquivos avisa o que falta', () => {
  const origem = novaPasta();
  mkdirSync(join(origem, 'src'));
  assert.throws(() => montarSite({ origem, destino: join(novaPasta(), 'x') }), /Falta config/);
});

// ---------- ícones ----------

test('ícones: PNG de verdade, do tamanho certo, e os arquivos do repositório estão em dia', () => {
  for (const [nome, tamanho] of Object.entries(TAMANHOS)) {
    const png = desenharIcone(tamanho);
    assert.deepEqual([...png.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], `${nome}: assinatura PNG`);
    assert.equal(png.readUInt32BE(16), tamanho, `${nome}: largura`);
    assert.equal(png.readUInt32BE(20), tamanho, `${nome}: altura`);
    const gravado = readFileSync(join(SIM, 'icones', nome));
    assert.ok(gravado.equals(png), `${nome} está diferente do gerador: rode "node tools/icones.js" em sim/`);
  }
});

test('ícones: o peixe fica na área segura (os 10% de cada borda são só fundo, para o Android poder recortar)', () => {
  for (const tamanho of Object.values(TAMANHOS)) {
    const borda = Math.floor(tamanho * 0.1);
    for (let y = 0; y < tamanho; y++) {
      for (let x = 0; x < tamanho; x++) {
        if (x >= borda && x < tamanho - borda && y >= borda && y < tamanho - borda) continue;
        assert.deepEqual(pixelDoIcone(tamanho, x, y), COR_DO_FUNDO, `${tamanho}: pixel (${x}, ${y}) deveria ser fundo`);
      }
    }
  }
});

test('ícones: o peixe aparece (há pixels que não são fundo, no meio)', () => {
  for (const tamanho of Object.values(TAMANHOS)) {
    let diferentes = 0;
    for (let y = 0; y < tamanho; y++) {
      for (let x = 0; x < tamanho; x++) {
        const cor = pixelDoIcone(tamanho, x, y);
        if (cor.join() !== COR_DO_FUNDO.join()) diferentes++;
      }
    }
    assert.ok(diferentes > tamanho * tamanho * 0.1, `${tamanho}: o peixe deveria ocupar pelo menos 10% do ícone`);
  }
});

test('o servidor entrega o manifest com o tipo certo (para testar a instalação localmente)', async () => {
  const { criarServidorDoSimulador } = await import('../servidor.js');
  const servidor = criarServidorDoSimulador({ pasta: SIM, pastaSaves: join(novaPasta(), 'saves') });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  try {
    const { port } = servidor.address();
    const r = await fetch(`http://127.0.0.1:${port}/manifest.webmanifest`);
    assert.equal(r.status, 200);
    assert.match(r.headers.get('content-type'), /manifest\+json/);
    const png = await fetch(`http://127.0.0.1:${port}/icones/icone-192.png`);
    assert.match(png.headers.get('content-type'), /image\/png/);
  } finally {
    servidor.close();
  }
});
