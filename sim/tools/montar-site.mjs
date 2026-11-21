// Monta a pasta do site que o GitHub Pages publica (doc 15, seção 3.2): só o que a página do celular precisa.
// Rodar (na raiz do repositório): node sim/tools/montar-site.mjs _site
//
// Fica FORA do site: servidor.js, saves/ (o jogo salvo do usuário), tests/, tools/, web/ (a página que controla
// o aparelho ESP32) e o painel de testes (index.html). A página do aparelho (aparelho.html) vira o index.html do site.
import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ITENS_DO_SITE = ['src', 'config', 'icones', 'estilo-aparelho.css', 'manifest.webmanifest', 'sw.js'];

// origem: a pasta sim/. destino: uma pasta que NÃO existe ainda (ou está vazia): nunca apaga nada.
export function montarSite({ origem, destino }) {
  if (existsSync(destino) && readdirSync(destino).length > 0) {
    throw new Error(`A pasta de destino já tem arquivos (${destino}). Use uma pasta nova.`);
  }
  mkdirSync(destino, { recursive: true });
  for (const item of ITENS_DO_SITE) {
    const de = join(origem, item);
    if (!existsSync(de)) throw new Error(`Falta ${item} em ${origem}.`);
    cpSync(de, join(destino, item), { recursive: true });
  }
  cpSync(join(origem, 'aparelho.html'), join(destino, 'index.html'));
  writeFileSync(join(destino, '.nojekyll'), ''); // o Pages não precisa processar nada (Jekyll ignoraria pastas com "_")
  return destino;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const origem = resolve(fileURLToPath(new URL('..', import.meta.url)));
  const destino = resolve(process.argv[2] ?? '_site');
  montarSite({ origem, destino });
  console.log(`Site montado em ${destino}`);
}
