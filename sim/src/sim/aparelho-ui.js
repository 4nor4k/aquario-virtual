// A página do celular (aparelho.html, doc 15): liga os elementos da tela aos controles de toque, ajusta o
// tamanho da tela do jogo e cuida do painel de Opções (exportar, importar e apagar o jogo).
// O jogo em si não sabe nada disto: o main.js só entrega as três funções ao criar (aoExportar, aoImportar, aoApagar).
import { ligarToque } from '../input/toque.js';

const LADO_DA_TELA = 120; // o jogo desenha 120×120 pixels

// O tamanho (em pixels CSS) da tela do jogo: o MAIOR número inteiro de vezes 120 pixels que cabe, contando em
// pixels REAIS do aparelho (o celular tem 2 ou 3 pixels reais por pixel CSS). Assim cada pixel do jogo vira um
// quadrado perfeito, sem borrar nem ficar com listras. Nunca menor que 1×.
export function tamanhoDaTela(larguraDisponivel, alturaDisponivel, pixelsPorPixelCss = 1, lado = LADO_DA_TELA) {
  const menor = Math.min(larguraDisponivel, alturaDisponivel);
  const dpr = pixelsPorPixelCss > 0 ? pixelsPorPixelCss : 1;
  const vezes = Math.max(1, Math.floor((menor * dpr) / lado));
  return (vezes * lado) / dpr;
}

const numeroCss = (texto, padrao) => {
  const n = parseFloat(texto);
  return Number.isFinite(n) ? n : padrao;
};

export function ligarAparelho({ controles, aoExportar, aoImportar, aoApagar, janela = window, documento = document }) {
  const $ = (id) => documento.getElementById(id);
  const tela = $('tela');

  // ---------- o analógico e os botões ----------
  const bolinha = $('bolinha');
  const mexerBolinha = ({ x, y }) => {
    bolinha.style.transform = `translate(${x * 58}%, ${y * 58}%)`; // a bolinha anda até a borda do disco
  };
  const botoes = { a: $('botao-a'), b: $('botao-b'), c: $('botao-c') };
  ligarToque({ base: $('analogico'), botoes }, controles, { aoAnalogico: mexerBolinha, janela });

  // O botão afunda enquanto o dedo está nele (só visual; quem manda no jogo é o ligarToque).
  for (const elemento of Object.values(botoes)) {
    elemento.addEventListener('pointerdown', () => elemento.classList.add('apertado'));
    for (const fim of ['pointerup', 'pointercancel']) {
      elemento.addEventListener(fim, () => elemento.classList.remove('apertado'));
    }
  }

  // Nada de menu de segurar, zoom por pinça ou seleção: é um jogo (o CSS cuida do resto).
  documento.addEventListener('contextmenu', (e) => e.preventDefault());
  documento.addEventListener('gesturestart', (e) => e.preventDefault()); // zoom por pinça no Safari do iPhone
  // Esconder a aba (trocar de aplicativo): solta o que estiver apertado.
  documento.addEventListener('visibilitychange', () => {
    if (documento.visibilityState === 'hidden') {
      controles.soltarTudo();
      mexerBolinha({ x: 0, y: 0 });
      for (const el of Object.values(botoes)) el.classList.remove('apertado');
    }
  });

  // ---------- o tamanho da tela ----------
  function ajustarTela() {
    const estilo = janela.getComputedStyle(documento.documentElement);
    const disco = numeroCss(estilo.getPropertyValue('--tamanho-disco'), 150);
    const botao = numeroCss(estilo.getPropertyValue('--tamanho-botao'), 62);
    const deitado = janela.innerWidth > janela.innerHeight;
    // Os mesmos números do estilo-aparelho.css: moldura da tela 4 px de cada lado, margem lateral 6 px,
    // em cima 12 px e embaixo 16 px, espaço entre as partes 12 px.
    const moldura = 8;
    const margemLateral = 12;
    let largura;
    let altura;
    if (deitado) {
      const lado = Math.max(disco, botao * 2.4); // cada lado do aparelho precisa de espaço para os controles
      largura = janela.innerWidth - 2 * lado - 2 * 12 - margemLateral - moldura;
      altura = janela.innerHeight - 12 - 16 - moldura;
    } else {
      largura = janela.innerWidth - margemLateral - moldura;
      altura = janela.innerHeight - disco - 76 - moldura; // sobra para o analógico e os botões embaixo
    }
    const lado = tamanhoDaTela(largura, altura, janela.devicePixelRatio || 1);
    tela.style.width = `${lado}px`;
    tela.style.height = `${lado}px`;
  }
  janela.addEventListener('resize', ajustarTela);
  janela.addEventListener('orientationchange', ajustarTela);
  ajustarTela();

  // ---------- Opções ----------
  const opcoes = $('opcoes');
  const aviso = $('opcoes-aviso');
  const botaoApagar = $('apagar');
  let temporizadorDoApagar = null;

  function mostrarAviso(texto) {
    aviso.textContent = texto;
    aviso.hidden = !texto;
  }
  function desarmarApagar() {
    clearTimeout(temporizadorDoApagar);
    botaoApagar.classList.remove('confirmando');
    botaoApagar.textContent = 'Apagar jogo';
  }
  function abrir() {
    controles.soltarTudo();
    mostrarAviso('');
    desarmarApagar();
    opcoes.hidden = false;
  }
  function fechar() {
    desarmarApagar();
    opcoes.hidden = true;
  }
  $('abrir-opcoes').addEventListener('click', abrir);
  $('fechar-opcoes').addEventListener('click', fechar);
  opcoes.addEventListener('click', (e) => {
    if (e.target === opcoes) fechar(); // tocar fora da folha fecha
  });

  $('exportar').addEventListener('click', async () => {
    const r = await aoExportar();
    if (!r.ok) return mostrarAviso(r.motivo);
    baixarArquivo(documento, r.nome, r.texto);
    mostrarAviso(`Arquivo "${r.nome}" gerado. Guarde-o num lugar seguro.`);
  });

  $('importar').addEventListener('change', async (e) => {
    const arquivo = e.target.files?.[0];
    e.target.value = ''; // permite escolher o mesmo arquivo de novo depois
    if (!arquivo) return;
    let texto;
    try {
      texto = await arquivo.text();
    } catch {
      return mostrarAviso('Não consegui ler o arquivo.');
    }
    const r = await aoImportar(texto);
    if (!r.ok) return mostrarAviso(r.motivo);
    mostrarAviso('Jogo importado! Carregando...');
    janela.location.reload();
  });

  // Apagar pede dois toques (sem janelinha de confirmação, que bloqueia o navegador).
  botaoApagar.addEventListener('click', async () => {
    if (!botaoApagar.classList.contains('confirmando')) {
      botaoApagar.classList.add('confirmando');
      botaoApagar.textContent = 'Toque de novo para apagar';
      temporizadorDoApagar = setTimeout(desarmarApagar, 4000);
      return;
    }
    desarmarApagar();
    await aoApagar();
    fechar();
  });

  return { abrirOpcoes: abrir, fecharOpcoes: fechar, ajustarTela };
}

// Baixa um texto como arquivo (cria um link temporário e "clica" nele).
function baixarArquivo(documento, nome, texto) {
  const blob = new Blob([texto], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = documento.createElement('a');
  link.href = url;
  link.download = nome;
  documento.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
