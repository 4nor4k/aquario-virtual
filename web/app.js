// As telas da página do celular (doc 06 e 13). Aqui ficam as FUNÇÕES: o que aparece e o que cada
// botão faz. O visual está em estilo.css e a estrutura em index.html.
// Tudo que é texto de jogo (fases, status...) vem de /api/textos (o mesmo config/textos.json do aparelho).
import { api } from './api.js';

const INTERVALO_MS = 5000; // a página pergunta o estado a cada ~5 s (doc 06)
const $ = (id) => document.getElementById(id);

// Cria um elemento. Sempre textContent (nunca innerHTML): nome de peixe é texto digitado por gente.
function el(tag, { classe, texto, attrs } = {}, ...filhos) {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texto != null) e.textContent = texto;
  for (const [k, v] of Object.entries(attrs ?? {})) e.setAttribute(k, v);
  e.append(...filhos);
  return e;
}

let textos = null;      // config/textos.json
let estado = null;      // o último retrato do jogo
let aba = 'aquario';
let peixeAberto = null; // id do peixe aberto na aba Peixes
let corEscolhida = null;
let ocupado = false;    // esperando o aparelho responder a um comando

// --- Textos -------------------------------------------------------------------------------------

const t = {
  fase: (f) => textos?.status.fases[f] ?? f,
  saude: (s) => textos?.status.saudeNiveis[s] ?? s,
  sexo: (s) => (s ? textos?.status.sexos[s] ?? s : '?'),
  cor: (c) => textos?.adocao.cores[c] ?? c,
  faixaPh: (f) => ({ acido: 'ácido', ideal: 'ideal', alcalino: 'alcalino' }[f] ?? f),
  erro: (corpo) => corpo?.mensagem ?? textos?.celular.erros[corpo?.erro] ?? 'Não deu certo. Tente de novo.',
};

// --- Aviso rápido (toast) -----------------------------------------------------------------------

let timerDoAviso = null;
function avisar(texto, { erro = false } = {}) {
  const caixa = $('aviso-toast');
  caixa.textContent = texto;
  caixa.className = erro ? 'toast erro' : 'toast';
  caixa.hidden = false;
  clearTimeout(timerDoAviso);
  timerDoAviso = setTimeout(() => { caixa.hidden = true; }, 3000);
}

// --- Abas ---------------------------------------------------------------------------------------

function irParaAba(nome) {
  aba = nome;
  for (const tela of document.querySelectorAll('.tela')) tela.hidden = tela.id !== `tela-${nome}`;
  for (const b of document.querySelectorAll('.aba')) b.classList.toggle('aba-ativa', b.dataset.aba === nome);
  desenhar();
  window.scrollTo(0, 0);
}

// --- Peças pequenas -----------------------------------------------------------------------------

function barra(valor, maximo, { marca = null, classe = '' } = {}) {
  const cheia = el('div', { classe: `barra-cheia ${classe}` });
  cheia.style.width = `${Math.max(0, Math.min(100, (valor / maximo) * 100))}%`;
  const b = el('div', { classe: 'barra' }, cheia);
  if (marca != null) {
    const m = el('div', { classe: 'barra-marca' });
    m.style.left = `${(marca / maximo) * 100}%`;
    b.append(m);
  }
  return b;
}

const classeDaSujeira = (v) => (v > 60 ? 'ruim' : v > 40 ? 'atencao' : '');

function cruz(status) {
  return el('span', { classe: 'saude' },
    el('span', { classe: `cruz ${status}`, texto: status === 'morto' ? '×' : '+', attrs: { 'aria-hidden': 'true' } }),
    el('span', { texto: t.saude(status) }));
}

// Um peixe como linha (nome, cor, saúde e fome). Usado no resumo e na lista.
function linhaDoPeixe(p) {
  const bolinha = el('span', { classe: 'peixe-cor' });
  bolinha.style.background = `var(--peixe-${p.cor})`;
  const sub = `${t.fase(p.fase)} · dia ${p.dia} de ${p.diasTotal}`;
  const linha = el('div', { classe: 'peixe' },
    bolinha,
    el('div', {}, el('div', { classe: 'peixe-nome', texto: p.nome }), el('div', { classe: 'peixe-sub', texto: sub })),
    cruz(p.saude));
  if (p.saude !== 'morto') {
    linha.append(el('div', { classe: 'peixe-fome' }, el('span', { texto: 'Fome' }),
      barra(Math.min(p.saciedade, 200), 200, { marca: 100, classe: p.comFome || p.saciedade > 150 ? 'ruim' : '' })));
  }
  if (p.semNome) linha.append(el('div', { classe: 'peixe-dica', texto: 'Dê um nome ao seu peixe' }));
  return linha;
}

// --- Desenho de cada aba ------------------------------------------------------------------------

function desenharConexao() {
  const ligado = !!estado?.ligado;
  $('conexao').className = `conexao ${ligado ? 'conexao-on' : 'conexao-off'}`;
  $('conexao-texto').textContent = ligado ? 'online' : estado ? 'desconectado' : 'conectando…';
  const faixa = $('faixa-offline');
  faixa.hidden = ligado;
  faixa.textContent = textos?.celular.erros.desligado ?? 'O aparelho não está respondendo.';
  const avisos = $('avisos');
  avisos.replaceChildren(...(ligado ? estado.avisos : []).map((a) => el('li', { texto: a })));
}

function desenharAquario() {
  const e = estado?.semDados ? null : estado;
  const jogando = e?.faseDoJogo === 'jogando';
  const ligado = !!e?.ligado;

  // Sem nenhum retrato ainda (aparelho desligado desde o começo): nada a mostrar e nada a apertar.
  if (!e) {
    for (const id of ['acao-comida', 'acao-limpar', 'acao-ph']) $(id).disabled = true;
    $('cartao-jogo').hidden = true;
    $('valor-sujeira').textContent = '—';
    $('valor-ph').textContent = '—';
    $('faixa-ph').textContent = '';
    $('barra-sujeira').style.width = '0';
    $('contagem').textContent = '';
    $('peixes-resumo').replaceChildren(el('p', { classe: 'suave', texto: 'Sem dados do aparelho.' }));
    return;
  }

  // Cartão de Game Over / primeiro peixe
  const cartao = $('cartao-jogo');
  cartao.hidden = jogando;
  if (!jogando) {
    const fim = e.faseDoJogo === 'gameover';
    $('jogo-titulo').textContent = fim ? textos?.gameOver.titulo ?? 'Game Over' : 'Bem-vindo ao Aquário';
    $('jogo-texto').textContent = fim
      ? textos?.gameOver.condolencias[e.causaDoGameOver] ?? ''
      : 'Você ainda não tem um peixe. Adote o primeiro!';
    $('jogo-adotar').textContent = fim ? 'Adotar um novo peixe' : 'Adotar o primeiro peixe';
  }

  $('barra-sujeira').style.width = `${e.agua.sujeira}%`;
  $('barra-sujeira').className = `barra-cheia ${classeDaSujeira(e.agua.sujeira)}`;
  $('valor-sujeira').textContent = e.agua.sujeira;
  $('valor-ph').textContent = e.agua.ph.texto;
  const faixa = $('faixa-ph');
  faixa.textContent = t.faixaPh(e.agua.ph.faixa);
  faixa.className = `pilula ${e.agua.ph.faixa}`;

  const vivos = e.peixes.filter((p) => p.saude !== 'morto').length;
  $('contagem').textContent = `(${vivos}/${e.limite})`;
  $('peixes-resumo').replaceChildren(...(e.peixes.length
    ? e.peixes.map(linhaDoPeixe)
    : [el('p', { classe: 'suave', texto: 'Nenhum peixe.' })]));

  const temMorto = e.peixes.some((p) => p.saude === 'morto');
  $('acao-comida').disabled = !ligado || ocupado || !jogando || vivos === 0;
  $('acao-limpar').disabled = !ligado || ocupado || !jogando || (e.agua.sujeira === 0 && !temMorto);
  $('acao-ph').disabled = !ligado || ocupado || !jogando || e.agua.ph.noMaximo;
}

function desenharPeixes() {
  const e = estado?.semDados ? null : estado;
  if (!e) return;
  const aberto = e.peixes.find((p) => p.id === peixeAberto);
  $('lista-peixes').hidden = !!aberto;
  $('detalhe').hidden = !aberto;
  const vivos = e.peixes.filter((p) => p.saude !== 'morto').length;
  $('contagem-lista').textContent = `(${vivos}/${e.limite})`;

  $('peixes-lista').replaceChildren(...(e.peixes.length
    ? e.peixes.map((p) => {
      const botao = el('button', { classe: 'peixe-cartao', attrs: { type: 'button' } }, linhaDoPeixe(p));
      botao.addEventListener('click', () => abrirPeixe(p.id));
      return botao;
    })
    : [el('p', { classe: 'suave', texto: 'Nenhum peixe ainda.' })]));

  if (!aberto) { peixeAberto = null; return; }
  $('detalhe-titulo').textContent = aberto.nome;
  const parceiro = e.peixes.find((p) => p.id === aberto.parceiroId);
  const dados = [
    ['Espécie', 'Beta'],
    ['Cor', t.cor(aberto.cor)],
    ['Fase', t.fase(aberto.fase)],
    ['Vida', `dia ${aberto.dia} de ${aberto.diasTotal}`],
    ['Sexo', t.sexo(aberto.sexo)],
    ['Saúde', t.saude(aberto.saude)],
    ['Saciedade', aberto.saude === 'morto' ? '—' : `${aberto.saciedade} (ideal 100)`],
    ['Parceiro', parceiro ? parceiro.nome : 'nenhum'],
  ];
  $('detalhe-dados').replaceChildren(...dados.flatMap(([k, v]) => [el('dt', { texto: k }), el('dd', { texto: v })]));
  const morto = aberto.saude === 'morto';
  $('detalhe-nome').disabled = morto || !e.ligado;
  $('detalhe-salvar').disabled = morto || !e.ligado || ocupado;
}

function abrirPeixe(id) {
  peixeAberto = id;
  const p = estado?.peixes.find((x) => x.id === id);
  $('detalhe-nome').value = p?.nome ?? '';
  desenhar();
}

function desenharAdotar() {
  const e = estado?.semDados ? null : estado;
  if (!e) { $('adotar-botao').disabled = true; return; }
  const primeiro = e.faseDoJogo !== 'jogando'; // sem peixe ou Game Over: adota um filhote
  $('adotar-max').textContent = e.nomeMaximo;
  $('adotar-nome').maxLength = e.nomeMaximo * 2; // o aparelho corta; aqui só evita textos enormes
  $('adotar-parceiro-campo').hidden = primeiro;

  // As cores (montadas uma vez)
  const cores = $('adotar-cores');
  if (cores.children.length !== e.cores.length) {
    corEscolhida ??= e.cores[0];
    cores.replaceChildren(...e.cores.map((c) => {
      const b = el('button', { classe: `cor cor-${c}`, attrs: { type: 'button', role: 'radio', 'aria-label': t.cor(c), 'data-cor': c } });
      b.addEventListener('click', () => { corEscolhida = c; desenharAdotar(); });
      return b;
    }));
  }
  for (const b of cores.children) b.setAttribute('aria-checked', String(b.dataset.cor === corEscolhida));

  let podeAdotar = e.ligado && !ocupado;
  if (primeiro) {
    $('adotar-titulo').textContent = 'Adotar um peixe';
    $('adotar-texto').textContent = e.faseDoJogo === 'gameover'
      ? 'Seu peixe se foi. Que tal começar de novo com um filhote?'
      : 'Escolha a cor e o nome do seu primeiro filhote.';
    $('adotar-botao').textContent = 'Adotar filhote';
  } else {
    $('adotar-titulo').textContent = 'Adotar um parceiro';
    const elegiveis = e.peixes.filter((p) => p.parceiro.ok);
    const select = $('adotar-parceiro-de');
    const atual = select.value;
    select.replaceChildren(...elegiveis.map((p) => el('option', { texto: p.nome, attrs: { value: String(p.id) } })));
    if (elegiveis.some((p) => String(p.id) === atual)) select.value = atual;
    if (elegiveis.length === 0) {
      // Explica por quê: usa o motivo do primeiro peixe vivo
      const vivo = e.peixes.find((p) => p.saude !== 'morto');
      $('adotar-texto').textContent = (vivo && textos?.mensagens.parceiro[vivo.parceiro.motivo]) || 'Não dá para adotar um parceiro agora.';
      podeAdotar = false;
    } else {
      $('adotar-texto').textContent = `O parceiro chega adulto e do sexo oposto. Vagas: ${e.vagas}.`;
    }
    $('adotar-botao').textContent = 'Adotar parceiro';
  }
  $('adotar-botao').disabled = !podeAdotar;
  $('adotar-parceiro-de').disabled = !podeAdotar;
}

function desenharAjustes() {
  const e = estado?.semDados ? null : estado;
  $('ajuste-conexao').textContent = e?.ligado ? 'conectado ao aparelho' : 'sem resposta';
  const c = e?.clima;
  const hora = c ? `${String(Math.floor(c.hora)).padStart(2, '0')}:${String(Math.round((c.hora % 1) * 60) % 60).padStart(2, '0')}` : '—';
  $('ajuste-hora').textContent = hora;
  $('ajuste-temperatura').textContent = c ? `${c.temperatura.toFixed(1).replace('.', ',')} °C` : '—';
  $('ajuste-tempo').textContent = c ? [c.chovendo ? 'chovendo' : 'sem chuva', c.frio ? 'frio' : null].filter(Boolean).join(', ') : '—';
}

function desenhar() {
  desenharConexao();
  if (aba === 'aquario') desenharAquario();
  else if (aba === 'peixes') desenharPeixes();
  else if (aba === 'adotar') desenharAdotar();
  else desenharAjustes();
}

// --- Falar com o aparelho -----------------------------------------------------------------------

async function atualizar() {
  const r = await api.estado();
  if (r.status === 200) estado = r.corpo;
  else estado = estado ? { ...estado, ligado: false } : { ligado: false, semDados: true }; // guarda o último retrato
  desenhar();
}

// Roda um comando: bloqueia os botões, mostra o resultado e já pede o estado novo.
async function comandar(fazer, { aoDarCerto, mensagem } = {}) {
  if (ocupado) return;
  ocupado = true;
  desenhar();
  const r = await fazer();
  ocupado = false;
  if (r.status >= 200 && r.status < 300 && r.corpo.ok !== false) {
    avisar(r.corpo.mensagem ?? mensagem?.(r.corpo) ?? 'Feito!');
    aoDarCerto?.(r.corpo);
  } else {
    avisar(t.erro(r.corpo), { erro: true });
  }
  await atualizar();
}

function ligarBotoes() {
  for (const b of document.querySelectorAll('.aba')) b.addEventListener('click', () => irParaAba(b.dataset.aba));
  $('acao-comida').addEventListener('click', () => comandar(api.comida));
  $('acao-limpar').addEventListener('click', () => comandar(api.limpar));
  $('acao-ph').addEventListener('click', () => comandar(api.ph));
  $('jogo-adotar').addEventListener('click', () => irParaAba('adotar'));
  $('detalhe-voltar').addEventListener('click', () => { peixeAberto = null; desenhar(); });
  $('detalhe-salvar').addEventListener('click', () => {
    const id = peixeAberto;
    comandar(() => api.renomear(id, $('detalhe-nome').value), {
      mensagem: (c) => `Nome salvo: ${c.nome}`,
      aoDarCerto: (c) => { $('detalhe-nome').value = c.nome; },
    });
  });
  $('adotar-botao').addEventListener('click', () => {
    const nome = $('adotar-nome').value.trim();
    const primeiro = estado?.faseDoJogo !== 'jogando';
    const pedido = primeiro
      ? () => api.adotar({ cor: corEscolhida, nome })
      : () => api.adotarParceiro({ parceiroDe: Number($('adotar-parceiro-de').value), cor: corEscolhida, nome });
    comandar(pedido, {
      aoDarCerto: () => { $('adotar-nome').value = ''; irParaAba('aquario'); },
    });
  });
}

async function iniciar() {
  ligarBotoes();
  const r = await api.textos();
  if (r.status === 200) textos = r.corpo;
  // O celular informa a hora ao aparelho (doc 06): resolve o "tempo sem RTC" mesmo sem internet.
  const agora = new Date();
  api.hora(agora.getHours() * 60 + agora.getMinutes());
  await atualizar();
  setInterval(atualizar, INTERVALO_MS);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) atualizar(); });
}

iniciar();
