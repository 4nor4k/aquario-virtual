// Service worker da página do celular (doc 15). Faz duas coisas simples:
//   1. deixa o navegador oferecer "Adicionar à tela inicial / Instalar" (PWA);
//   2. guarda uma cópia dos arquivos para o jogo ABRIR SEM INTERNET (o jogo todo roda no celular).
// Estratégia "rede primeiro": com internet, sempre pega a versão mais nova (e atualiza a cópia); sem internet,
// usa a cópia. Assim uma atualização do jogo chega na próxima abertura, sem ficar preso numa versão velha.
const CACHE = 'aquario-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (evento) => {
  const pedido = evento.request;
  if (pedido.method !== 'GET' || new URL(pedido.url).origin !== self.location.origin) return;
  evento.respondWith(
    fetch(pedido)
      .then((resposta) => {
        if (resposta.ok) {
          const copia = resposta.clone();
          caches.open(CACHE).then((cache) => cache.put(pedido, copia));
        }
        return resposta;
      })
      .catch(() => caches.match(pedido)),
  );
});
