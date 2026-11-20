// A ponte do celular no servidor do simulador (doc 13, passo 2).
// Pasta temporária para o jogo salvo e uma pasta web de mentira: nada do seu jogo é tocado.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { request } from 'node:http';
import { networkInterfaces } from 'node:os';
import { criarServidorDoSimulador } from '../servidor.js';
import { ehRedePrivada, origemDoPedido, ehRotaDoCelular } from '../celular.js';

let servidor;
let base;
let pasta;
let relogio = 1_000_000; // relógio falso (ms)

before(async () => {
  pasta = await mkdtemp(join(tmpdir(), 'aquario-celular-'));
  await mkdir(join(pasta, 'web'));
  await writeFile(join(pasta, 'web', 'index.html'), '<title>Aquário do celular</title>');
  await writeFile(join(pasta, 'web', 'app.js'), 'console.log(1)');
  servidor = criarServidorDoSimulador({
    pasta, // a pasta temporária faz o papel de sim/ (senão "../saves" cairia no jogo salvo de verdade)
    pastaSaves: join(pasta, 'saves'),
    pastaWeb: join(pasta, 'web'),
    agora: () => relogio,
    segundosDeEspera: 0.3, // curto: os testes que esperam a aba não demoram
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  base = `http://127.0.0.1:${servidor.address().port}`;
});

after(async () => {
  await new Promise((ok) => servidor.close(ok));
  await rm(pasta, { recursive: true, force: true });
});

const post = (caminho, corpo, metodo = 'POST') => fetch(base + caminho, {
  method: metodo, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo ?? {}),
});
// A aba do jogo: entrega o retrato e recebe a fila.
const ciclo = async (corpo) => (await post('/api/ponte/ciclo', corpo)).json();

test('sem a aba do jogo: o estado diz "desligado" e comando dá 503', async () => {
  const e = await fetch(`${base}/api/estado`);
  assert.equal(e.status, 503);
  assert.deepEqual(await e.json(), { ligado: false });
  const c = await post('/api/comida');
  assert.equal(c.status, 503);
  assert.equal((await c.json()).erro, 'desligado');
});

test('com a aba: o estado é o último retrato, e some de novo se a aba ficar muda', async () => {
  await ciclo({ estado: { faseDoJogo: 'jogando', peixes: [] } });
  const e = await fetch(`${base}/api/estado`);
  assert.equal(e.status, 200);
  assert.deepEqual(await e.json(), { faseDoJogo: 'jogando', peixes: [], ligado: true });
  relogio += 10_000; // 10 s sem a aba falar
  assert.equal((await fetch(`${base}/api/estado`)).status, 503);
  await ciclo({ estado: { faseDoJogo: 'jogando', peixes: [] } }); // voltou
  assert.equal((await fetch(`${base}/api/estado`)).status, 200);
});

test('comando: vai para a fila, a aba executa e o celular recebe o resultado', async () => {
  await ciclo({ estado: { x: 1 } });
  const pedido = post('/api/peixes', { cor: 'azul', nome: 'Nemo' });
  // a aba chega um instante depois e pega o comando
  await new Promise((ok) => setTimeout(ok, 30));
  const { comandos } = await ciclo({ estado: { x: 2 } });
  assert.equal(comandos.length, 1);
  assert.equal(comandos[0].metodo, 'POST');
  assert.equal(comandos[0].caminho, '/api/peixes');
  assert.deepEqual(comandos[0].corpo, { cor: 'azul', nome: 'Nemo' });
  // a fila esvazia depois de entregue
  assert.deepEqual((await ciclo({ estado: { x: 2 } })).comandos, []);
  await ciclo({ resultados: [{ id: comandos[0].id, status: 200, corpo: { ok: true, id: 7 } }] });
  const r = await pedido;
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { ok: true, id: 7 });
});

test('comando: se a aba não responde a tempo, o celular recebe 504 e o comando sai da fila', async () => {
  await ciclo({ estado: { x: 1 } });
  const r = await post('/api/comida');
  assert.equal(r.status, 504);
  assert.equal((await r.json()).erro, 'semResposta');
  assert.deepEqual((await ciclo({ estado: { x: 1 } })).comandos, []); // não executa depois
});

test('comando: o erro que a aba devolve chega ao celular com o mesmo status', async () => {
  await ciclo({ estado: { x: 1 } });
  const pedido = post('/api/ph');
  await new Promise((ok) => setTimeout(ok, 30));
  const { comandos } = await ciclo({});
  await ciclo({ resultados: [{ id: comandos[0].id, status: 409, corpo: { ok: false, erro: 'semJogo' } }] });
  const r = await pedido;
  assert.equal(r.status, 409);
  assert.equal((await r.json()).erro, 'semJogo');
});

test('renomear passa pela aba; rota que não é do celular não entra na fila', async () => {
  await ciclo({ estado: { x: 1 } });
  const pedido = post('/api/peixes/3', { nome: 'Lua' }, 'PUT');
  await new Promise((ok) => setTimeout(ok, 30));
  const { comandos } = await ciclo({});
  assert.equal(comandos[0].caminho, '/api/peixes/3');
  await ciclo({ resultados: [{ id: comandos[0].id, status: 200, corpo: { ok: true, nome: 'Lua' } }] });
  assert.equal((await pedido).status, 200);
  assert.equal((await post('/api/apagar-tudo')).status, 404);
  assert.equal((await fetch(`${base}/api/peixes/abc`, { method: 'PUT', body: '{}' })).status, 404);
});

test('hora, WiFi e cenário: o simulador não tem (hora é ignorada, o resto devolve 501)', async () => {
  const h = await post('/api/hora', { minutos: 600 });
  assert.equal(h.status, 200);
  assert.equal((await h.json()).ignorado, true);
  for (const caminho of ['/api/wifi', '/api/cenario']) {
    const r = await post(caminho, {}, 'PUT');
    assert.equal(r.status, 501);
    assert.equal((await r.json()).erro, 'soNoAparelho');
  }
});

test('corpo que não é JSON ou é grande demais é recusado', async () => {
  await ciclo({ estado: { x: 1 } });
  const ruim = await fetch(`${base}/api/comida`, { method: 'POST', body: 'isto não é json' });
  assert.equal(ruim.status, 400);
  const grande = await fetch(`${base}/api/comida`, { method: 'POST', body: JSON.stringify({ a: 'x'.repeat(5000) }) });
  assert.equal(grande.status, 413);
});

test('textos: o celular busca config/textos.json pela API', async () => {
  const r = await fetch(`${base}/api/textos`);
  // a pasta temporária não tem config/: 404 (o servidor de verdade tem)
  assert.ok([200, 404].includes(r.status));
});

test('a página do celular é servida em /app/, sem sair da pasta web/', async () => {
  const r = await fetch(`${base}/app/`);
  assert.equal(r.status, 200);
  assert.match(await r.text(), /Aquário do celular/);
  assert.equal((await fetch(`${base}/app/app.js`)).status, 200);
  assert.equal((await fetch(`${base}/app/nada.js`)).status, 404);
  const sem = await fetch(`${base}/app`, { redirect: 'manual' });
  assert.equal(sem.status, 301);
  const porta = servidor.address().port;
  for (const caminho of ['/app/../saves/aquario.json', '/app/..%5c..%5cpackage.json']) {
    const status = await new Promise((ok, erro) => {
      const q = request({ host: '127.0.0.1', port: porta, path: caminho }, (res) => { res.resume(); ok(res.statusCode); });
      q.on('error', erro);
      q.end();
    });
    assert.notEqual(status, 200, caminho);
  }
});

test('a ponte (do jogo) e o jogo salvo não são do celular', () => {
  assert.equal(ehRotaDoCelular('POST', '/api/ponte/ciclo'), false);
  assert.equal(ehRotaDoCelular('GET', '/api/salvo'), false);
  assert.equal(ehRotaDoCelular('PUT', '/api/salvo'), false);
  assert.equal(ehRotaDoCelular('DELETE', '/api/peixes/1'), false);
  assert.equal(ehRotaDoCelular('GET', '/api/estado'), true);
  assert.equal(ehRotaDoCelular('POST', '/api/comida'), true);
});

// --- Quem pode pedir o quê (modo rede) ----------------------------------------------------------

test('redes privadas: 192.168.x, 10.x e 172.16 a 31; o resto não', () => {
  for (const ip of ['192.168.0.12', '10.0.0.5', '172.16.0.1', '172.31.255.255', '::ffff:192.168.1.2']) {
    assert.equal(ehRedePrivada(ip), true, ip);
  }
  for (const ip of ['8.8.8.8', '172.32.0.1', '172.15.0.1', '192.169.0.1', '11.0.0.1', '999.168.0.1', 'meusite.com', '', undefined]) {
    assert.equal(ehRedePrivada(ip), false, String(ip));
  }
});

test('origem: o PC vê tudo, só pelo nome localhost; a rede só com o modo rede ligado', () => {
  const pc = { enderecoRemoto: '127.0.0.1' };
  assert.equal(origemDoPedido({ ...pc, host: 'localhost:8080' }), 'pc');
  assert.equal(origemDoPedido({ ...pc, host: '127.0.0.1:8080' }), 'pc');
  assert.equal(origemDoPedido({ ...pc, host: 'site-malvado.com' }), null);
  assert.equal(origemDoPedido({ enderecoRemoto: '::1', host: 'localhost' }), 'pc');

  const celular = { enderecoRemoto: '192.168.0.20', host: '192.168.0.10:8080' };
  assert.equal(origemDoPedido({ ...celular, rede: true }), 'rede');
  assert.equal(origemDoPedido({ ...celular, rede: false }), null, 'sem o modo rede, ninguém de fora entra');
  assert.equal(origemDoPedido({ ...celular, host: 'site-malvado.com', rede: true }), null, 'nome de site: recusado');
  assert.equal(origemDoPedido({ enderecoRemoto: '203.0.113.9', host: '192.168.0.10', rede: true }), null, 'de fora da rede de casa');
});

// De verdade: o pedido sai pelo endereço da rede de casa do próprio PC (192.168.x.x...), então o servidor
// o enxerga como um aparelho da rede. Sem placa de rede privada (ex.: sem WiFi), o teste é pulado.
const meuIpDeRede = Object.values(networkInterfaces()).flat().find((i) => i && i.family === 'IPv4' && !i.internal && ehRedePrivada(i.address))?.address;
const semRede = !meuIpDeRede && 'sem IP de rede privada';

// Liga um servidor em todas as placas (porta livre) e devolve o endereço de rede dele.
async function servidorNaRede(opcoes) {
  const s = criarServidorDoSimulador({ pastaWeb: join(pasta, 'web'), agora: () => relogio, ...opcoes });
  await new Promise((ok) => s.listen(0, '0.0.0.0', ok));
  return { s, rede: 'http://' + meuIpDeRede + ':' + s.address().port };
}

test('modo rede: o celular vê a página e a API dele, e mais nada', { skip: semRede }, async () => {
  const { s, rede } = await servidorNaRede({ pastaSaves: join(pasta, 'saves2'), rede: true });
  try {
    assert.equal((await fetch(rede + '/app/')).status, 200);
    assert.equal((await fetch(rede + '/api/estado')).status, 503); // a API do celular responde (aba desligada)
    // o resto é do PC: jogo salvo, ponte, o simulador, a pasta sim/
    assert.equal((await fetch(rede + '/api/salvo')).status, 403);
    assert.equal((await fetch(rede + '/api/salvo', { method: 'DELETE' })).status, 403);
    assert.equal((await fetch(rede + '/api/ponte/ciclo', { method: 'POST', body: '{}' })).status, 403);
    assert.equal((await fetch(rede + '/')).status, 403);
    assert.equal((await fetch(rede + '/package.json')).status, 403);
    assert.equal((await fetch(rede + '/src/core/aquarium.js')).status, 403);
  } finally {
    await new Promise((ok) => s.close(ok));
  }
});

test('sem o modo rede, o endereço de rede é recusado até para a página', { skip: semRede }, async () => {
  const { s, rede } = await servidorNaRede({ pastaSaves: join(pasta, 'saves3') });
  try {
    assert.equal((await fetch(rede + '/app/')).status, 403);
  } finally {
    await new Promise((ok) => s.close(ok));
  }
});

