// Gera os ícones da página do celular (icones/icone-*.png): um peixinho em pixel art no fundo da cor do aparelho.
// Rodar (em sim/): node tools/icones.js
// É provisório, como os sprites: o usuário troca por um desenho dele depois (basta pôr PNGs com os mesmos nomes).
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const COR = {
  '.': [0x2a, 0x6f, 0x86], // fundo: a cor da carcaça (estilo-aparelho.css)
  d: [0x6b, 0x1a, 0x1a],   // contorno
  b: [0xd9, 0x53, 0x4f],   // corpo
  f: [0xf2, 0xa6, 0x5a],   // nadadeiras
  w: [0xff, 0xff, 0xff],   // olho
  k: [0x10, 0x10, 0x10],   // pupila
};

// 16×16: peixe virado para a direita, com cauda em leque à esquerda.
export const DESENHO = [
  '................',
  '................',
  '................',
  '......dddd......',
  '..ff.dffffd.....',
  '.fff.dbbbbbd....',
  'ffff.dbbbbbbd...',
  'ffffdbbbbbwkbd..',
  'fffffbbbbbbbbd..',
  'ffff.dbbbbbbd...',
  '.fff.dbbbbbd....',
  '..ff.dfffffd....',
  '......dddd......',
  '................',
  '................',
  '................',
];

// ---- PNG mínimo (RGB, sem compressão de cor): o suficiente para ícones ----
const TABELA_CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = TABELA_CRC[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function bloco(tipo, dados) {
  const comprimento = Buffer.alloc(4);
  comprimento.writeUInt32BE(dados.length);
  const corpo = Buffer.concat([Buffer.from(tipo, 'ascii'), dados]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(corpo));
  return Buffer.concat([comprimento, corpo, crc]);
}
export function codificarPng(largura, altura, pixelRgb) {
  const linhas = Buffer.alloc((largura * 3 + 1) * altura);
  for (let y = 0; y < altura; y++) {
    const inicio = y * (largura * 3 + 1);
    linhas[inicio] = 0; // filtro "nenhum"
    for (let x = 0; x < largura; x++) {
      const [r, g, b] = pixelRgb(x, y);
      linhas.set([r, g, b], inicio + 1 + x * 3);
    }
  }
  const cabecalho = Buffer.alloc(13);
  cabecalho.writeUInt32BE(largura, 0);
  cabecalho.writeUInt32BE(altura, 4);
  cabecalho.set([8, 2, 0, 0, 0], 8); // 8 bits, cor RGB, sem interlace
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloco('IHDR', cabecalho),
    bloco('IDAT', deflateSync(linhas)),
    bloco('IEND', Buffer.alloc(0)),
  ]);
}

// O peixe ocupa ~75% do ícone (o resto é folga: assim também serve de ícone "maskable", que o Android recorta).
// A cor [r, g, b] do pixel (x, y) de um ícone quadrado de `tamanho` pixels.
export function pixelDoIcone(tamanho, x, y) {
  const vezes = Math.max(1, Math.floor((tamanho * 0.75) / 16));
  const lado = vezes * 16;
  const margem = Math.floor((tamanho - lado) / 2);
  const gx = Math.floor((x - margem) / vezes);
  const gy = Math.floor((y - margem) / vezes);
  const letra = gx >= 0 && gx < 16 && gy >= 0 && gy < 16 ? DESENHO[gy][gx] : '.';
  return COR[letra];
}

export function desenharIcone(tamanho) {
  return codificarPng(tamanho, tamanho, (x, y) => pixelDoIcone(tamanho, x, y));
}

export const COR_DO_FUNDO = COR['.'];

export const TAMANHOS = { 'icone-180.png': 180, 'icone-192.png': 192, 'icone-512.png': 512 };

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const pasta = join(fileURLToPath(new URL('..', import.meta.url)), 'icones');
  mkdirSync(pasta, { recursive: true });
  for (const [nome, tamanho] of Object.entries(TAMANHOS)) {
    writeFileSync(join(pasta, nome), desenharIcone(tamanho));
    console.log(`icones/${nome} (${tamanho}×${tamanho})`);
  }
}
