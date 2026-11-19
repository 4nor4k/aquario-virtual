// O tempo com o jogo fechado (doc 09, passo 3): calcular, aplicar às regras e mostrar o aviso.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calcularAusencia, aplicarAusencia } from '../src/core/ausencia.js';
import { exportarJogo, importarJogo } from '../src/core/salvar.js';
import { formatarDuracao } from '../src/core/formatar.js';
import { HORA_MS, DIA_MS, MINUTO_MS } from '../src/core/clock.js';
import { limitesDoPeixe } from '../src/core/fish.js';
import { criarMenu, TELAS } from '../src/core/menu.js';
import { desenharBemVindo, desenharTelas } from '../src/render/telas.js';
import { criarQuadro, LARGURA, ALTURA } from '../src/render/tela.js';
import { caracteresSemGlifo, quebrarTexto } from '../src/render/fonte.js';
import { config, configCalma, montar, perto } from './ajuda.js';

const textos = JSON.parse(readFileSync(new URL('../config/textos.json', import.meta.url), 'utf8'));

// Salva, "fecha" por `horas` e abre de novo: o que main.js faz ao carregar.
function dormir(aq, horas, cfg = config, tempoJogoMs = 0) {
  const salvoEmMs = 1_800_000_000_000;
  const dados = JSON.parse(JSON.stringify(exportarJogo(aq, { tempoJogoMs, salvoEmMs })));
  const carregado = importarJogo(dados, { config: cfg });
  const ausenciaMs = calcularAusencia(carregado.salvoEmMs, salvoEmMs + horas * HORA_MS);
  const r = aplicarAusencia(carregado.aquario, { ausenciaMs, horaDoJogoAntesMs: carregado.tempoJogoMs }, cfg);
  return { aquario: carregado.aquario, r };
}

test('calcularAusencia: diferença entre as horas reais; nunca negativa', () => {
  assert.equal(calcularAusencia(1000, 5000), 4000);
  assert.equal(calcularAusencia(1000, 1000), 0);
  assert.equal(calcularAusencia(5000, 1000), 0, 'relógio do computador voltou');
});

test('ausência de 0 não muda nada', () => {
  const { aq } = montar(1);
  const { aquario, r } = dormir(aq, 0);
  assert.equal(r.aplicadaMs, 0);
  assert.equal(r.morreu, false);
  assert.equal(aquario.peixes[0].saciedade, 100);
  assert.equal(aquario.sujeira, 0);
});

test('1 h, 10 h e 48 h fechado dão o mesmo que ficar jogando esse tempo', () => {
  for (const horas of [1, 10, 48]) {
    // passo de 15 min = o mesmo pedaço que as regras usam, então a conta é idêntica.
    const jogando = montar(1, 15 * MINUTO_MS);
    jogando.passar(horas);
    const parado = montar(1, 15 * MINUTO_MS);
    const { aquario, r } = dormir(parado.aq, horas);
    const a = jogando.aq;
    const msg = `${horas} h`;
    perto(aquario.peixes[0].saciedade, a.peixes[0].saciedade, 1e-6, `${msg} saciedade`);
    perto(aquario.sujeira, a.sujeira, 1e-6, `${msg} sujeira`);
    perto(aquario.peixes[0].saude, a.peixes[0].saude, 1e-6, `${msg} saúde`);
    assert.equal(aquario.phPasso, a.phPasso, `${msg} pH`);
    assert.equal(aquario.peixes[0].estado, a.peixes[0].estado, `${msg} estado`);
    assert.equal(r.horaDoJogoMs, horas * HORA_MS);
  }
});

test('5 dias sem cuidado: o peixe morre, é Game Over e ele está na superfície', () => {
  const { aq } = montar(1);
  const { aquario, r } = dormir(aq, 5 * 24);
  assert.equal(r.morreu, true);
  assert.equal(r.gameOver, true);
  assert.equal(aquario.gameOver, true);
  assert.equal(aquario.causaDoGameOver, 'cuidado');
  const p = aquario.peixes[0];
  assert.equal(p.estado, 'morto');
  assert.equal(p.y, limitesDoPeixe(p.fase).minY);
  assert.deepEqual(aquario.eventos.retirar(), [], 'os avisos da ausência não ficam na fila');
});

test('2 dias sem cuidado: vivo, mas com fome e a água suja', () => {
  const { aq } = montar(1);
  const { aquario, r } = dormir(aq, 48);
  assert.equal(r.morreu, false);
  assert.ok(aquario.peixes[0].saciedade < 1, 'a fome chegou a zero em 48 h');
  assert.ok(aquario.sujeira > 40);
});

test('velhice durante a ausência: causa certa', () => {
  const { aq } = montar(1, 5 * MINUTO_MS, { cfg: configCalma });
  const { aquario, r } = dormir(aq, 40 * 24, configCalma);
  assert.equal(r.morreu, true);
  assert.equal(aquario.causaDoGameOver, 'velhice');
});

test('o peixe cresce durante a ausência', () => {
  const { aq } = montar(1, 5 * MINUTO_MS, { cfg: configCalma });
  assert.equal(aq.peixes[0].fase, 'filhote');
  const { aquario } = dormir(aq, 6 * 24, configCalma);
  assert.equal(aquario.peixes[0].fase, 'jovem');
  const lim = limitesDoPeixe('jovem');
  assert.ok(aquario.peixes[0].y >= lim.minY && aquario.peixes[0].y <= lim.maxY);
});

test('teto no config: só conta até o limite, mas a ausência real é devolvida', () => {
  const cfg = structuredClone(configCalma);
  cfg.salvamento.ausenciaMaximaHoras = 10;
  const { aq } = montar(1, 5 * MINUTO_MS, { cfg });
  const { r } = dormir(aq, 100, cfg, 2 * HORA_MS);
  assert.equal(r.ausenciaMs, 100 * HORA_MS);
  assert.equal(r.aplicadaMs, 10 * HORA_MS);
  assert.equal(r.horaDoJogoMs, 12 * HORA_MS);
});

test('sem teto (null) conta tudo', () => {
  assert.equal(config.salvamento.ausenciaMaximaHoras, null);
  const { aq } = montar(1, 5 * MINUTO_MS, { cfg: configCalma });
  const { r } = dormir(aq, 1000, configCalma);
  assert.equal(r.aplicadaMs, 1000 * HORA_MS);
});

test('Game Over já salvo: abrir de novo não muda nada e não diz que morreu agora', () => {
  const { aq } = montar(1);
  aq.matar(aq.peixes[0], 'cuidado');
  const { aquario, r } = dormir(aq, 24);
  assert.equal(r.morreu, false);
  assert.equal(r.gameOver, true);
  assert.equal(aquario.causaDoGameOver, 'cuidado');
});

// --- formatarDuracao -------------------------------------------------------------------------

test('formatarDuracao: minutos, horas e dias', () => {
  assert.equal(formatarDuracao(0), 'menos de 1 min');
  assert.equal(formatarDuracao(59_000), 'menos de 1 min');
  assert.equal(formatarDuracao(10 * MINUTO_MS), '10 min');
  assert.equal(formatarDuracao(45 * MINUTO_MS), '45 min');
  assert.equal(formatarDuracao(HORA_MS), '1 h');
  assert.equal(formatarDuracao(5 * HORA_MS + 20 * MINUTO_MS), '5 h 20 min');
  assert.equal(formatarDuracao(5 * HORA_MS + 20 * MINUTO_MS + 59_000), '5 h 20 min', 'arredonda para baixo');
  assert.equal(formatarDuracao(23 * HORA_MS + 59 * MINUTO_MS), '23 h 59 min');
  assert.equal(formatarDuracao(DIA_MS), '1 dia');
  assert.equal(formatarDuracao(2 * DIA_MS + 3 * HORA_MS), '2 dias e 3 h');
  assert.equal(formatarDuracao(2 * DIA_MS + 40 * MINUTO_MS), '2 dias');
  assert.equal(formatarDuracao(-5), 'menos de 1 min');
});

// --- Tela e menu ----------------------------------------------------------------------------

const menuNovo = () => criarMenu({ textos, aoNovoJogo() {} });
const A = { a: true, b: false, c: false, cima: false, baixo: false };

test('o texto do aviso é o combinado e só usa letras que a fonte tem', () => {
  assert.equal(
    textos.bemVindo.vivo.replace('{tempo}', formatarDuracao(5 * HORA_MS + 20 * MINUTO_MS)),
    'Seu peixe dormiu por 5 h 20 min. Bem-vindo de volta!',
  );
  for (const k of ['vivo', 'morto', 'dica']) {
    assert.deepEqual(caracteresSemGlifo(textos.bemVindo[k].replace(/\{\w+\}/g, '')), [], k);
  }
  assert.ok(textos.bemVindo.dica.length <= 26);
});

test('menu: a tela de boas-vindas fecha com A e volta ao jogo', () => {
  const t = montar();
  const menu = menuNovo();
  menu.mostrarBemVindo({ ausenciaMs: 5 * HORA_MS, morreu: false });
  assert.equal(menu.tela, TELAS.BEM_VINDO);
  assert.equal(menu.cameraLivre(), false);
  menu.apertar({ ...A, a: false, c: true }, t.aq); // outros botões não fecham
  assert.equal(menu.tela, TELAS.BEM_VINDO);
  menu.apertar(A, t.aq);
  assert.equal(menu.tela, TELAS.JOGO);
  assert.equal(menu.bemVindo, null);
});

test('menu: se o peixe morreu na ausência, A leva direto ao Game Over (sem os 5 s)', () => {
  const t = montar();
  const menu = menuNovo();
  t.aq.matar(t.aq.peixes[0], 'cuidado');
  menu.mostrarBemVindo({ ausenciaMs: 5 * DIA_MS, morreu: true });
  menu.atualizar(60, t.aq); // mesmo esperando, o aviso fica
  assert.equal(menu.tela, TELAS.BEM_VINDO);
  menu.apertar(A, t.aq);
  assert.equal(menu.tela, TELAS.GAME_OVER);
});

test('desenhar: cobre a tela, texto fica dentro das bordas, mesmo com durações enormes', () => {
  const casos = [
    [10 * MINUTO_MS, false],
    [23 * HORA_MS + 59 * MINUTO_MS, false],
    [365 * DIA_MS + 23 * HORA_MS, false],
    [29 * DIA_MS + 23 * HORA_MS, true],
  ];
  for (const [ausenciaMs, morreu] of casos) {
    const menu = menuNovo();
    menu.mostrarBemVindo({ ausenciaMs, morreu });
    const q = criarQuadro();
    desenharBemVindo(q, { menu, textos });
    assert.equal(q.reduce((n, c) => n + (c === 0 ? 1 : 0), 0), 0, 'cobre a tela inteira');
    for (let y = 2; y < ALTURA - 2; y++) {
      for (const x of [2, 3, LARGURA - 4, LARGURA - 3]) {
        assert.equal(q[y * LARGURA + x], 13, `pixel (${x}, ${y}) deveria ser fundo`);
      }
    }
    const texto = textos.bemVindo[morreu ? 'morto' : 'vivo'].replace('{tempo}', formatarDuracao(ausenciaMs));
    assert.ok(quebrarTexto(texto, 26).length <= 5);
  }
});

test('desenharTelas mostra a tela de boas-vindas quando ela está aberta', () => {
  const t = montar();
  const menu = menuNovo();
  menu.mostrarBemVindo({ ausenciaMs: 5 * HORA_MS, morreu: false });
  const q = criarQuadro();
  desenharTelas(q, { menu, aquario: t.aq, config, textos, agoraMs: 0 });
  assert.equal(q.reduce((n, c) => n + (c === 0 ? 1 : 0), 0), 0);
});
