// O ícone de frio e a temperatura no HUD (doc 11 passo 4; doc 03 seção 7: abaixo de 18 °C mostra o ícone).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { desenharHud, desenharIconeDeFrio, FLOCO, POSICAO_DO_FRIO } from '../src/render/hud.js';
import { valoresDoHud, desenharIndicadores, CELULAS } from '../src/render/indicadores.js';
import { desenharTelas } from '../src/render/telas.js';
import { desenharQuadro } from '../src/render/scene.js';
import { criarMenu } from '../src/core/menu.js';
import { criarClima } from '../src/core/clima.js';
import { gerarMapa } from '../src/render/cenario.js';
import { criarCamera } from '../src/render/camera.js';
import { criarQuadro, LARGURA, ALTURA, COR_SOLIDA } from '../src/render/tela.js';
import { COR, PALETA, COLORIDOS } from '../src/render/palette.js';
import { MUNDO_LARGURA, MUNDO_ALTURA } from '../src/core/mundo.js';
import { config, montar } from './ajuda.js';

const textos = JSON.parse(readFileSync(new URL('../config/textos.json', import.meta.url), 'utf8'));
const camera = () => criarCamera({
  mundoLargura: MUNDO_LARGURA, mundoAltura: MUNDO_ALTURA, janelaLargura: LARGURA, janelaAltura: ALTURA, x: 60, y: 32,
});
const contar = (q, cor) => q.reduce((n, c) => n + (c === cor ? 1 : 0), 0);

test('a cor do gelo existe, é sólida e é azul-clara', () => {
  assert.ok(COLORIDOS.includes(COR.GELO));
  assert.ok(COR_SOLIDA[COR.GELO]);
  const [r, g, b] = PALETA[COR.GELO];
  assert.ok(b > r && b >= g);
});

test('floco de neve: 7×7, simétrico, com o centro cheio', () => {
  assert.equal(FLOCO.length, 7);
  for (const linha of FLOCO) assert.equal(linha.length, 7);
  FLOCO.forEach((linha, y) => {
    assert.equal(linha, [...linha].reverse().join(''), `linha ${y} simétrica na horizontal`);
  });
  assert.deepEqual(FLOCO, [...FLOCO].reverse(), 'simétrico na vertical');
  assert.equal(FLOCO[3][3], 'X');
});

test('ícone de frio: aparece no canto de cima à direita, só com frio', () => {
  const { aq } = montar(1);
  const sem = criarQuadro();
  desenharHud(sem, { aquario: aq, config, camera: camera(), frio: false });
  assert.equal(contar(sem, COR.GELO), 0);
  const com = criarQuadro();
  desenharHud(com, { aquario: aq, config, camera: camera(), frio: true });
  const n = contar(com, COR.GELO);
  assert.ok(n >= 15 && n <= 25, `${n} pixels de gelo`);
  // Dentro do canto de cima à direita.
  for (let y = 0; y < ALTURA; y++) {
    for (let x = 0; x < LARGURA; x++) {
      if (com[y * LARGURA + x] === COR.GELO) {
        assert.ok(x >= POSICAO_DO_FRIO.x && x < LARGURA && y >= POSICAO_DO_FRIO.y && y < POSICAO_DO_FRIO.y + 7, `(${x}, ${y})`);
      }
    }
  }
  // O padrão (sem dizer nada) é sem frio.
  const padrao = criarQuadro();
  desenharHud(padrao, { aquario: aq, config, camera: camera() });
  assert.equal(contar(padrao, COR.GELO), 0);
});

test('ícone de frio: tem um fundo preto em volta, para aparecer mesmo sobre o céu claro', () => {
  const q = criarQuadro().fill(COR.CEU_RELAMPAGO);
  desenharIconeDeFrio(q);
  assert.equal(q[(POSICAO_DO_FRIO.y - 1) * LARGURA + POSICAO_DO_FRIO.x - 1], 13);
  assert.ok(contar(q, COR.GELO) > 0);
});

test('ícone de frio: não escurece de noite (a luz não mexe no gelo)', () => {
  const antes = [...PALETA[COR.GELO]];
  const mapa = gerarMapa();
  const q = criarQuadro();
  desenharQuadro(q, {
    mapa, camera: camera(), peixes: [], tempo: 1, config, aquario: montar(1).aq,
    clima: { horaMin: 120, chuvaNivel: 0, raio: 0, frio: true },
  });
  assert.deepEqual(PALETA[COR.GELO], antes);
  assert.ok(contar(q, COR.GELO) > 0, 'e aparece na cena de noite');
});

test('cena: o clima com frio mostra o ícone e sem frio não mostra', () => {
  const mapa = gerarMapa();
  const { aq } = montar(1);
  const cena = (frio) => {
    const q = criarQuadro();
    desenharQuadro(q, { mapa, camera: camera(), peixes: aq.peixes, aquario: aq, config, tempo: 1, clima: { horaMin: 720, chuvaNivel: 0, raio: 0, frio } });
    return q;
  };
  assert.ok(contar(cena(true), COR.GELO) > 0);
  assert.equal(contar(cena(false), COR.GELO), 0);
  // E o objeto de verdade do clima: de madrugada faz frio, de tarde não.
  const c = criarClima({ config });
  c.definirHora('fixa', 4); c.atualizar(0.1, 0);
  const q = criarQuadro();
  desenharQuadro(q, { mapa, camera: camera(), peixes: aq.peixes, aquario: aq, config, tempo: 1, clima: c });
  assert.ok(contar(q, COR.GELO) > 0, 'às 4h o clima de verdade mostra o ícone');
  c.definirHora('fixa', 15); c.atualizar(0.1, 0);
  const q2 = criarQuadro();
  desenharQuadro(q2, { mapa, camera: camera(), peixes: aq.peixes, aquario: aq, config, tempo: 1, clima: c });
  assert.equal(contar(q2, COR.GELO), 0, 'às 15h não');
});

// --- Temperatura no HUD ----------------------------------------------------------------------

test('TEMP: sem clima mostra o valor fixo de antes; com temperatura mostra o valor arredondado', () => {
  const { aq } = montar(1);
  assert.equal(valoresDoHud(aq, config, textos).temperatura.texto, `${Math.round(config.agua.temperatura)}°C`);
  assert.equal(valoresDoHud(aq, config, textos, aq.peixes[0], 23.6).temperatura.texto, '24°C');
  assert.equal(valoresDoHud(aq, config, textos, aq.peixes[0], 12.2).temperatura.texto, '12°C');
  assert.equal(valoresDoHud(aq, config, textos, aq.peixes[0], 12.2).temperatura.valor, null, 'sem barra');
  assert.equal(valoresDoHud(aq, config, textos, aq.peixes[0], 5).temperatura.ruim, false, 'o clima não é problema do peixe');
});

test('TEMP: o HUD da tela do jogo desenha a temperatura do clima (e muda quando ela muda)', () => {
  const { aq } = montar(1);
  const menu = criarMenu({ textos });
  menu.apertar({ b: true }, aq); // liga o HUD
  const tela = (temperatura) => {
    const clima = criarClima({ config });
    clima.forcarTemperatura(temperatura);
    const q = criarQuadro();
    desenharTelas(q, { menu, aquario: aq, config, textos, agoraMs: 0, clima });
    return q;
  };
  assert.notDeepEqual(Array.from(tela(10)), Array.from(tela(27)));
  assert.deepEqual(Array.from(tela(10)), Array.from(tela(10)));
  // Direto: a caixinha da temperatura.
  const q = criarQuadro();
  desenharIndicadores(q, { aquario: aq, config, textos, temperatura: 9 });
  const q2 = criarQuadro();
  desenharIndicadores(q2, { aquario: aq, config, textos, temperatura: 31 });
  const { x, y } = CELULAS.temperatura;
  let diferentes = 0;
  for (let j = y; j < y + 18; j++) for (let i = x; i < x + 37; i++) if (q[j * LARGURA + i] !== q2[j * LARGURA + i]) diferentes++;
  assert.ok(diferentes > 0, 'só a caixinha da TEMP muda');
});

test('temperaturas negativas e de 3 dígitos cabem na caixinha da TEMP', () => {
  const { aq } = montar(1);
  for (const t of [-12, 0, 8, 38, 100]) {
    const v = valoresDoHud(aq, config, textos, aq.peixes[0], t).temperatura;
    assert.ok(v.texto.length <= 6, v.texto);
  }
});
