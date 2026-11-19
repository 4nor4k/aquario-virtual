// Confere config/textos.json: todo texto precisa poder ser desenhado pela fonte de pixels.
// Se você escrever uma letra que a fonte não tem, estes testes avisam qual é.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { caracteresSemGlifo, quebrarTexto } from '../src/render/fonte.js';
import { ACOES } from '../src/core/menu.js';
import { preencher } from '../src/core/formatar.js';

const textos = JSON.parse(readFileSync(new URL('../config/textos.json', import.meta.url), 'utf8'));

// Todas as frases do arquivo, com o caminho de cada uma (ex.: "mensagens.limpeza").
function frases(objeto, caminho = '') {
  return Object.entries(objeto).flatMap(([chave, valor]) => {
    const aqui = caminho ? `${caminho}.${chave}` : chave;
    if (typeof valor === 'string') return [[aqui, valor]];
    if (Array.isArray(valor)) return valor.map((v, i) => [`${aqui}[${i}]`, v]);
    return frases(valor, aqui);
  });
}

test('todas as letras dos textos existem na fonte', () => {
  for (const [onde, texto] of frases(textos)) {
    const semMoldes = texto.replace(/\{\w+\}/g, ''); // {ph}, {dia}... são trocados antes de desenhar
    assert.deepEqual(caracteresSemGlifo(semMoldes), [], `${onde}: "${texto}"`);
  }
});

test('há um nome de item de menu para cada ação', () => {
  assert.equal(textos.menu.itens.length, ACOES.length);
});

test('os moldes {ph}, {dia} e {total} estão onde precisam', () => {
  assert.match(textos.mensagens.phSubiu, /\{ph\}/);
  assert.match(textos.status.idade, /\{dia\}/);
  assert.match(textos.status.idade, /\{total\}/);
  assert.equal(preencher(textos.mensagens.phSubiu, { ph: '7,2' }).includes('{'), false);
  assert.equal(preencher(textos.status.idade, { dia: 12, total: 30 }), 'dia 12 de 30');
});

test('existe texto para toda fase, estado, causa de morte e nota de pH', () => {
  for (const fase of ['filhote', 'jovem', 'adulto', 'idoso']) assert.ok(textos.status.fases[fase], fase);
  for (const estado of ['saudavel', 'doente', 'morto']) assert.ok(textos.status.estados[estado], estado);
  for (const causa of ['velhice', 'cuidado']) {
    assert.ok(textos.status.causas[causa], causa);
    assert.ok(textos.gameOver.condolencias[causa], causa);
  }
  for (const nota of ['ideal', 'aceitavel', 'ruim']) assert.ok(textos.status.phNotas[nota], nota);
});

test('as mensagens curtas cabem em até 3 linhas no rodapé (26 letras por linha)', () => {
  for (const [nome, texto] of frases(textos.mensagens)) {
    const linhas = quebrarTexto(preencher(texto, { ph: '7,5', nome: 'Doze letras' }), 26);
    assert.ok(linhas.length <= 3, `${nome}: ${linhas.length} linhas`);
  }
});

test('os textos do menu e do status cabem nas caixas (largura em letras)', () => {
  for (const item of textos.menu.itens) assert.ok(item.length <= 16, `item "${item}"`);
  assert.ok(textos.menu.dica.length <= 22, 'dica do menu');
  assert.ok(textos.status.dica.length <= 26, 'dica do status');
  assert.ok(textos.status.dicaVarios.length <= 26, 'dica do status com vários peixes');
  assert.ok(textos.adocao.dicaParceiro.length <= 26, 'dica da adoção de parceiro');
  for (const t of [textos.adocao.titulo, textos.adocao.tituloMacho, textos.adocao.tituloFemea]) assert.ok(t.length <= 26, t);
  for (const sexo of ['macho', 'femea']) assert.ok(textos.status.sexos[sexo], sexo);
  assert.ok(textos.status.sexos.oculto);
  assert.ok(textos.gameOver.dica.length <= 26, 'dica do Game Over');
});
