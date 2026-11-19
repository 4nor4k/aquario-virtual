// A chuva (render/chuva.js, doc 11 passo 3): gotas no ar e anéis na superfície.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  desenharChuva, dadosDaGota, estadoDaGota, GOTAS_MAXIMAS, SEGUNDOS_DO_ANEL,
} from '../src/render/chuva.js';
import { desenharQuadro } from '../src/render/scene.js';
import { deslocamentoDaOnda } from '../src/render/superficie.js';
import { gerarMapa } from '../src/render/cenario.js';
import { criarCamera } from '../src/render/camera.js';
import { criarQuadro, LARGURA, ALTURA } from '../src/render/tela.js';
import { COR, PALETA } from '../src/render/palette.js';
import { SUPERFICIE_Y, MUNDO_LARGURA, MUNDO_ALTURA } from '../src/core/mundo.js';
import { config } from './ajuda.js';

const camera = (x = 60, y = 0) => criarCamera({
  mundoLargura: MUNDO_LARGURA, mundoAltura: MUNDO_ALTURA, janelaLargura: LARGURA, janelaAltura: ALTURA, x, y,
});
const contar = (q, cor) => q.reduce((n, c) => n + (c === cor ? 1 : 0), 0);
const chuvaEm = (nivel, tempo = 0, cam = camera(0, 0)) => {
  const q = criarQuadro().fill(COR.AGUA);
  desenharChuva(q, cam, nivel, tempo);
  return q;
};

test('a cor da chuva existe, é sólida e é azul-acinzentada', () => {
  const [r, g, b] = PALETA[COR.CHUVA];
  assert.ok(b > r && b >= g, 'azulada');
});

test('chuva: sem chuva nada aparece; com chuva aparecem gotas e anéis', () => {
  assert.equal(contar(chuvaEm(0), COR.CHUVA), 0);
  assert.equal(contar(chuvaEm(0.01), COR.CHUVA), 0, 'quase nada: ainda nada');
  assert.ok(contar(chuvaEm(1, 3.3), COR.CHUVA) > 10);
});

test('chuva: quanto mais forte, mais gotas (a chuva começa e para aos poucos)', () => {
  const n = [0.2, 0.5, 0.8, 1].map((nivel) => {
    let total = 0;
    for (let t = 0; t < 4; t += 0.25) total += contar(chuvaEm(nivel, t), COR.CHUVA);
    return total;
  });
  for (let i = 1; i < n.length; i++) assert.ok(n[i] > n[i - 1], `${n}`);
});

test('chuva: as gotas ficam no ar, acima da linha da água, e os anéis logo abaixo dela', () => {
  for (const t of [0.4, 1.7, 5.2]) {
    const q = chuvaEm(1, t, camera(0, 0));
    for (let x = 0; x < LARGURA; x++) {
      const linha = SUPERFICIE_Y + deslocamentoDaOnda(x, t);
      for (let y = 0; y < ALTURA; y++) {
        if (q[y * LARGURA + x] !== COR.CHUVA) continue;
        assert.ok(y < linha || (y > linha && y <= linha + 2), `(${x}, ${y}) fora do ar e do anel (linha em ${linha})`);
      }
    }
  }
});

test('chuva: nunca cobre o que já foi desenhado (peixe, planta, filtro) nem a linha da água', () => {
  const q = criarQuadro().fill(COR.PEDRA); // tudo ocupado
  desenharChuva(q, camera(0, 0), 1, 2);
  assert.equal(contar(q, COR.CHUVA), 0);
});

test('chuva: cada gota cai, bate e abre o anel (e o ciclo recomeça)', () => {
  for (let k = 0; k < GOTAS_MAXIMAS; k++) {
    const g = dadosDaGota(k);
    assert.ok(g.x >= 0 && g.x < MUNDO_LARGURA);
    assert.ok(g.velocidade >= 58 && g.velocidade < 90);
    assert.ok(g.ciclo > g.queda + SEGUNDOS_DO_ANEL, 'o ciclo cabe a queda e o anel');
    let caiu = false;
    let anel = false;
    for (let t = 0; t < 3 * g.ciclo; t += 0.02) {
      const e = estadoDaGota(k, t);
      if (e?.fase === 'caindo') {
        caiu = true;
        assert.ok(e.y >= 0 && e.y <= SUPERFICIE_Y + 3);
      }
      if (e?.fase === 'anel') { anel = true; assert.ok(e.raio >= 1 && e.raio <= 5); }
    }
    assert.ok(caiu && anel, `gota ${k}`);
  }
});

test('chuva: o anel se abre (o raio só cresce enquanto dura)', () => {
  const k = 3;
  const g = dadosDaGota(k);
  let anterior = 0;
  for (let u = 0; u < SEGUNDOS_DO_ANEL; u += 0.01) {
    const t = g.queda + u - g.deslocamento;
    const e = estadoDaGota(k, t + g.ciclo * 5);
    if (e?.fase !== 'anel') continue;
    assert.ok(e.raio >= anterior);
    anterior = e.raio;
  }
  assert.ok(anterior >= 3);
});

test('chuva: a mesma gota sempre faz a mesma coisa, e a chuva muda com o tempo', () => {
  assert.deepEqual(estadoDaGota(5, 9.3), estadoDaGota(5, 9.3));
  assert.deepEqual(Array.from(chuvaEm(1, 2.2)), Array.from(chuvaEm(1, 2.2)));
  assert.notDeepEqual(Array.from(chuvaEm(1, 2.2)), Array.from(chuvaEm(1, 2.5)));
});

test('chuva: presa ao mundo (andar a câmera 10 px desloca a chuva 10 px)', () => {
  const a = chuvaEm(1, 1.1, camera(0, 0));
  const b = chuvaEm(1, 1.1, camera(10, 0));
  for (let y = 0; y < 26; y++) for (let x = 0; x < 100; x++) assert.equal(b[y * LARGURA + x], a[y * LARGURA + x + 10], `(${x}, ${y})`);
});

test('chuva: no clarão do relâmpago as gotas continuam aparecendo sobre o céu claro', () => {
  const q = criarQuadro().fill(COR.CEU_RELAMPAGO);
  desenharChuva(q, camera(0, 0), 1, 1.2);
  assert.ok(contar(q, COR.CHUVA) > 0);
});

test('cena: a chuva aparece na cena com clima chovendo e some sem chuva', () => {
  const mapa = gerarMapa();
  const cena = (chuvaNivel) => {
    const q = criarQuadro();
    desenharQuadro(q, { mapa, camera: camera(60, 0), peixes: [], tempo: 2.4, config, clima: { horaMin: 720, chuvaNivel, raio: 0 } });
    return q;
  };
  assert.equal(contar(cena(0), COR.CHUVA), 0);
  assert.ok(contar(cena(1), COR.CHUVA) > 10);
  // Sem o clima (o visual de sempre) também não há chuva.
  const q = criarQuadro();
  desenharQuadro(q, { mapa, camera: camera(60, 0), peixes: [], tempo: 2.4, config });
  assert.equal(contar(q, COR.CHUVA), 0);
});
