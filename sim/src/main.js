// Liga as partes do simulador e roda o laço do jogo.
import { criarQuadro, mostrarQuadro, LARGURA, ALTURA } from './render/tela.js';
import { criarCamera } from './render/camera.js';
import { criarSeguidorDeCamera } from './render/camera-segue.js';
import { gerarMapa } from './render/cenario.js';
import { gerarPlantas } from './render/plantas.js';
import { gerarFundo } from './render/fundo.js';
import { desenharQuadro } from './render/scene.js';
import { desenharTelas } from './render/telas.js';
import { criarTurvacao, nivelDaSujeira } from './render/turvacao.js';
import { atualizarPlanos, abrigoDaPedraGrande } from './render/profundidade.js';
import { criarTeclado } from './input/keyboard.js';
import { criarControlesToque } from './input/toque.js';
import { combinarEntradas } from './input/combinar.js';
import { criarPainel } from './sim/panel.js';
import { criarArmazenamentoLocal, nomeDoBackup } from './sim/armazenamento-local.js';
import { ligarAparelho } from './sim/aparelho-ui.js';
import { lerBackup, textoDoBackup } from './sim/backup.js';
import { MUNDO_LARGURA, MUNDO_ALTURA } from './core/mundo.js';
import { criarAquario } from './core/aquarium.js';
import { criarBolhas } from './core/bolhas.js';
import { criarClima } from './core/clima.js';
import { TAMANHO_POR_FASE } from './core/fish.js';
import { criarClock } from './core/clock.js';
import { criarMenu, TELAS } from './core/menu.js';
import { exportarJogo, importarJogo, ErroDeSalvamento } from './core/salvar.js';
import { calcularAusencia, aplicarAusencia } from './core/ausencia.js';
import { criarArmazenamento } from './sim/armazenamento.js';
import { criarPonteDoJogo } from './sim/ponte.js';
import { montarEstado } from './core/estado-api.js';
import { executarComando } from './core/comandos-api.js';
import { caracteresSemGlifo } from './render/fonte.js';
import { preencher } from './core/formatar.js';
import { criarSom } from './core/som.js';
import { criarObservadorDeSons } from './core/eventos-som.js';
import { criarAudio } from './sim/audio.js';
import { lerSomLigado, gravarSomLigado } from './sim/preferencia-som.js';
import { ligarSons } from './sim/sons-ui.js';

const PASSO_MS = 50;           // passo fixo: 20 por segundo (igual no ESP32)
const VELOCIDADE_CAMERA = 60;  // pixels por segundo

// Dois jeitos de abrir o mesmo jogo (doc 15):
//   - index.html   : o SIMULADOR no computador, com o painel de testes, salvando em sim/saves pelo servidor
//                    e servindo a página do celular (ponte);
//   - aparelho.html: o APARELHO na página do celular (GitHub Pages): tela, analógico e botões de toque, salvando
//                    no próprio navegador, sem painel e sem servidor.
const modoAparelho = document.body.dataset.modo === 'aparelho';

const canvas = document.getElementById('tela');
const ctx = canvas.getContext('2d');

const quadro = criarQuadro();
const mapa = gerarMapa();
const plantas = gerarPlantas(mapa);
const fundo = gerarFundo();
// Teclado e toque valem ao mesmo tempo: no computador o aparelho.html também joga com o teclado e o mouse.
const toque = criarControlesToque();
const entrada = combinarEntradas(criarTeclado(window), toque);
// Começa no meio do mundo, na altura do fundo (para ver areia e rochas).
const camera = criarCamera({
  mundoLargura: MUNDO_LARGURA,
  mundoAltura: MUNDO_ALTURA,
  janelaLargura: LARGURA,
  janelaAltura: ALTURA,
  x: (MUNDO_LARGURA - LARGURA) / 2,
  y: MUNDO_ALTURA - ALTURA,
});

// Enfeites que não afetam o jogo: bolhas e a onda da superfície, em tempo real (não aceleram).
const bolhas = criarBolhas();
// A fonte de bolhas da camada 3: sai de trás da pedra grande (camada mais longe, com paralaxe de 70%).
const bolhasDoFundo = criarBolhas({ semente: 21, emissores: [fundo.pedraGrande.x] });
let tempoVisual = 0;
// O quanto a água está turva na tela: acompanha a sujeira aos poucos (limpar clareia em segundos).
const turvacao = criarTurvacao();

// Câmera automática: segue o peixe quando o jogador está AFK e ele sai da tela.
const seguidor = criarSeguidorDeCamera({ camera, janelaLargura: LARGURA, janelaAltura: ALTURA });

// O relógio do jogo: no simulador a fonte é o tempo do navegador e pode ser acelerado.
const clock = criarClock(() => performance.now());

// Os números do jogo (config/jogo.json) e os textos (config/textos.json) ficam em arquivos.
// O core não lê arquivos, então é aqui que o navegador carrega os JSON e entrega prontos.
async function carregarJson(caminho) {
  const resposta = await fetch(caminho);
  if (!resposta.ok) throw new Error(`Não consegui carregar ${caminho} (${resposta.status})`);
  return resposta.json();
}
const config = await carregarJson('config/jogo.json');
const textos = await carregarJson('config/textos.json');
const sonsConfig = await carregarJson('config/sons.json');

// O som (doc 16): o canal do "buzzer" decide qual efeito toca; o audio.js faz o barulho no navegador; o
// observador decide QUANDO cada efeito toca (eventos do core, telas, caçada, clima). A escolha liga/desliga fica no navegador.
const audio = criarAudio();
const som = criarSom({
  sons: sonsConfig.sons,
  ligado: lerSomLigado(),
  aoTocar: (_nome, notas) => audio.tocar(notas),
  aoCalar: () => audio.calar(),
});
const observadorDeSons = criarObservadorDeSons({ som });

// O clima e a hora do dia (doc 11). No simulador a hora é a do relógio do computador; o core não usa Date,
// então é aqui que se lê e se entrega.
const clima = criarClima({ semente: Date.now() >>> 0, config });
function minutosDoDiaReal() {
  const agora = new Date();
  return agora.getHours() * 60 + agora.getMinutes() + agora.getSeconds() / 60;
}

let aquario;
let numeroDoJogo = 0;
// true enquanto espera a (primeira) adoção: o aquário de trás é só um enfeite e NADA é salvo.
let semJogo = false;
// O aparelho só desenha o que a fonte de pixels tem: o nome só aceita essas letras.
const aceitaNoNome = (letra) => caracteresSemGlifo(letra).length === 0;

// --- Salvamento (doc 09) ------------------------------------------------------------------
// No simulador o jogo é gravado em sim/saves/aquario.json pelo servidor; na página do celular, no próprio
// navegador (localStorage). O core só transforma o aquário em dados (salvar.js); a hora REAL (Date.now) só
// existe aqui, na interface.
const armazenamento = modoAparelho ? criarArmazenamentoLocal() : criarArmazenamento();
const salvamento = {
  bloqueado: false, // true: não consegui ler o que existe; não posso gravar por cima
  quando: null,     // hora real da última gravação que deu certo
  falhou: false,    // a última gravação não deu certo
  aviso: null,      // texto para o painel (arquivo estragado, servidor fora...)
};
let jaSalvouOGameOver = false;

async function salvar({ keepalive = false } = {}) {
  if (salvamento.bloqueado || semJogo) return;
  const agora = Date.now();
  const dados = exportarJogo(aquario, { tempoJogoMs: clock.agoraMs(), salvoEmMs: agora, recordeCacada: menu.recorde });
  const ok = await armazenamento.gravar(dados, { keepalive });
  salvamento.falhou = !ok;
  if (ok) salvamento.quando = agora;
}

// A semente do sorteio do nado muda a cada abertura, para o peixe não repetir o mesmo caminho.
const novaSemente = () => (Date.now() + numeroDoJogo) >>> 0;

// O menu e as telas (A abre o menu, C abre o status...). No Game Over, A abre a adoção; adotar recomeça.
const menu = criarMenu({
  textos,
  cores: config.cores,
  config,
  semente: Date.now() >>> 0,
  aoNovoJogo: ({ cor }) => adotar({ cor }),
  aoAgir: (acao) => {
    observadorDeSons.aoAgir(acao);
    salvar();
  },
  // A comida cai no meio do que você está vendo.
  posicaoDaComida: () => camera.x + LARGURA / 2,
});

// Adota: começa um aquário novo, com um filhote da cor escolhida e o relógio em zero.
// Sem nome, ele se chama "Beta" até você mudar (pelo painel; o aparelho não tem teclado).
function adotar({ cor, nome }) {
  observadorDeSons.aoAgir('novoPeixe');
  numeroDoJogo++;
  clock.reiniciar();
  menu.reiniciar();
  aquario = criarAquario({ semente: novaSemente(), config });
  const peixe = aquario.adicionarPeixe({ nome: config.nome.padrao, especie: 'beta', cor, x: 120, y: 80 }, clock.agoraMs());
  if (nome != null) aquario.renomear(peixe, nome, aceitaNoNome);
  turvacao.irPara(nivelDaSujeira(aquario.sujeira));
  semJogo = false;
  jaSalvouOGameOver = false;
  salvar();
}

// Sem jogo salvo (primeira vez, ou depois de apagar): mostra a tela de adoção. O aquário que
// fica atrás dela é só um enfeite, e nada é salvo até adotar.
function esperarAdocao() {
  numeroDoJogo++;
  clock.reiniciar();
  menu.reiniciar();
  aquario = criarAquario({ semente: novaSemente(), config });
  aquario.adicionarPeixe({ nome: config.nome.padrao, especie: 'beta', x: 120, y: 80 }, clock.agoraMs());
  turvacao.irPara(nivelDaSujeira(aquario.sujeira));
  semJogo = true;
  jaSalvouOGameOver = false;
  menu.abrirAdocao();
}

// Apaga o jogo salvo e volta à adoção (botão do painel).
async function apagarJogo() {
  if (!salvamento.bloqueado) await armazenamento.apagar();
  esperarAdocao();
  menu.definirRecorde(0); // apagar o jogo apaga também o recorde da caçada
}

// Tenta voltar ao jogo salvo. Devolve true se conseguiu.
async function carregarJogoSalvo() {
  const lido = await armazenamento.carregar();
  if (lido.estado === 'vazio') return false;
  if (lido.estado === 'sem-servidor') {
    salvamento.bloqueado = true;
    salvamento.aviso = modoAparelho
      ? 'Este navegador não deixa guardar o jogo (aba privada?): ele não será salvo.'
      : 'Não consegui falar com o servidor: este jogo não será salvo. Recarregue a página.';
    return false;
  }
  try {
    if (lido.estado === 'ilegivel') throw new ErroDeSalvamento('o arquivo não é um JSON válido');
    const { aquario: carregado, tempoJogoMs, salvoEmMs, recordeCacada } = importarJogo(lido.dados, { config, semente: novaSemente() });
    // O tempo com o jogo fechado conta: as regras rodam por ele todo (doc 03 e 09, seção 4).
    const ausenciaMs = calcularAusencia(salvoEmMs, Date.now());
    const r = aplicarAusencia(carregado, { ausenciaMs, horaDoJogoAntesMs: tempoJogoMs }, config);
    clock.reiniciar();
    clock.avancar(r.horaDoJogoMs);
    menu.reiniciar();
    menu.definirRecorde(recordeCacada);
    aquario = carregado;
    turvacao.irPara(nivelDaSujeira(aquario.sujeira)); // abre já com a água como estava
    jaSalvouOGameOver = aquario.gameOver;
    salvar(); // grava já o estado depois da ausência (e da hora de agora)
    // Só avisa se ficou fora por um tempo; dar F5 não mostra nada.
    if (ausenciaMs >= config.salvamento.ausenciaMinimaParaAvisarMin * 60 * 1000) {
      menu.mostrarBemVindo({ ausenciaMs, morreu: r.morreu });
    }
    return true;
  } catch (erro) {
    if (!(erro instanceof ErroDeSalvamento)) throw erro;
    // Não apago nada: o arquivo ruim fica guardado com outro nome e o jogo recomeça.
    const guardou = await armazenamento.guardarComoCorrompido();
    const ondeFicou = modoAparelho ? 'à parte, no navegador' : 'como saves/aquario.corrompido.json';
    salvamento.aviso = guardou
      ? `O jogo salvo estava estragado (${erro.message}). Guardei ${ondeFicou} e comecei um aquário novo.`
      : `O jogo salvo está estragado (${erro.message}) e não consegui guardá-lo. Nada foi gravado.`;
    if (!guardou) salvamento.bloqueado = true;
    return false;
  }
}

if (!(await carregarJogoSalvo())) esperarAdocao();

// Grava de tempos em tempos e quando a aba vai embora.
setInterval(() => salvar(), config.salvamento.intervaloSegundos * 1000);
addEventListener('pagehide', () => salvar({ keepalive: true }));
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') salvar({ keepalive: true });
});

// Exportar e importar o jogo como arquivo (só na página do aparelho; doc 15, seção 5).
async function exportarParaArquivo() {
  if (semJogo) return { ok: false, motivo: 'Ainda não há jogo para exportar: adote um peixe primeiro.' };
  const agora = Date.now();
  const dados = exportarJogo(aquario, { tempoJogoMs: clock.agoraMs(), salvoEmMs: agora, recordeCacada: menu.recorde });
  return { ok: true, nome: nomeDoBackup(agora), texto: textoDoBackup(dados) };
}

async function importarDeArquivo(texto) {
  const lido = lerBackup(texto, { config, agoraMs: Date.now() });
  if (!lido.ok) return lido;
  // A página vai recarregar e, ao sair, salvar() gravaria o jogo de AGORA por cima do importado: bloqueia antes.
  const bloqueadoAntes = salvamento.bloqueado;
  salvamento.bloqueado = true;
  const gravou = await armazenamento.gravar(lido.dados);
  if (!gravou) {
    salvamento.bloqueado = bloqueadoAntes;
    return { ok: false, motivo: 'Não consegui guardar o jogo importado neste navegador.' };
  }
  return { ok: true };
}

// O painel de testes e a ponte do celular só existem no simulador do computador; na página do aparelho
// (o próprio celular) ficam desligados.
let painel = { atualizar() {} };
if (modoAparelho) {
  ligarAparelho({ controles: toque, aoExportar: exportarParaArquivo, aoImportar: importarDeArquivo, aoApagar: apagarJogo });
} else {
  painel = criarPainel({
    clock,
    camera,
    menu,
    config,
    obterAquario: () => aquario,
    obterPeixe: () => menu.peixeEmFoco(aquario),
    textos,
    obterSalvamento: () => salvamento,
    aguardandoAdocao: () => semJogo,
    podeAdotar: () => semJogo || aquario.gameOver,
    aoAdotar: (pedido) => adotar(pedido),
    aoRenomear: (bruto) => {
      const peixe = menu.peixeEmFoco(aquario);
      if (peixe) aquario.renomear(peixe, bruto, aceitaNoNome);
      salvar();
    },
    clima,
    aoAdotarParceiro: ({ nome, cor }) => {
      const r = menu.adotarParceiro(aquario, { cor });
      if (r.ok && nome) aquario.renomear(r.parceiro, nome, aceitaNoNome);
      return r;
    },
    aoApagar: apagarJogo,
  });

  // A página do celular (doc 13): a cada meio segundo a aba entrega o retrato do jogo ao servidor e executa os
  // comandos que o celular mandou (comida, limpar, adotar...) com as mesmas funções dos botões do aparelho.
  const ponte = criarPonteDoJogo({
    obterEstado: () => montarEstado(aquario, {
      config, textos, agoraMs: clock.agoraMs(), clima, aguardandoAdocao: semJogo,
    }),
    executar: (comando) => executarComando(comando, {
      get aquario() { return aquario; }, // o aquário é trocado ao adotar: sempre o de agora
      menu,
      config,
      textos,
      aguardandoAdocao: () => semJogo,
      adotar: (pedido) => adotar(pedido),
      aceitaNoNome,
      salvar: () => salvar(),
    }),
  });
  ponte.ligar();
}

// Um passo do jogo (dt em segundos reais).
function atualizar(dt) {
  const botoes = entrada.botoes();
  const dir = entrada.direcao();
  menu.apertar(botoes, aquario);
  // Com o menu aberto, o joystick escolhe o item e a câmera fica parada.
  const livre = menu.cameraLivre();
  if (livre) {
    camera.mover(dir.x * VELOCIDADE_CAMERA * dt, dir.y * VELOCIDADE_CAMERA * dt);
  }
  // Jogador parado e peixe fora da tela: a câmera vai atrás dele (câmera-segue.js).
  const foco = menu.peixeEmFoco(aquario);
  // Caçar (doc 14): o joystick nada com o peixe, B segurado acelera e a câmera fica TRAVADA nele.
  const cacando = menu.tela === TELAS.CACADA;
  if (cacando) {
    menu.cacada.atualizar(dt, { dir, acelerando: entrada.segurando('b') });
    const cacador = menu.cacada.peixe;
    if (cacador) camera.irPara(cacador.x - LARGURA / 2, cacador.y - ALTURA / 2);
  } else if (foco) {
    const { largura, altura } = TAMANHO_POR_FASE[foco.fase];
    seguidor.atualizar(dt, { alvo: { x: foco.x, y: foco.y, largura, altura }, joystick: dir, livre });
  }
  // Na pausa e no resultado da caçada o aquário congela (as regras recuperam o tempo parado no passo seguinte).
  const congelado = cacando && (menu.cacada.fase === 'pausa' || menu.cacada.fase === 'fim');
  // Chovendo, os peixes se escondem atrás da pedra grande (onde ela está na tela agora, por causa da paralaxe).
  if (!congelado) aquario.atualizar(dt, clock.agoraMs(), { chuvaNivel: clima.chuvaNivel, abrigo: abrigoDaPedraGrande({ fundo, camera }) });
  const eventos = mostrarAvisosDoCore();
  // Por onde o peixe passa (atrás ou na frente das algas e da pedra): troca quando não está sobre elas.
  atualizarPlanos(aquario.peixes, { plantas, fundo, camera });
  if (aquario.gameOver && !jaSalvouOGameOver) {
    jaSalvouOGameOver = true;
    salvar();
  }
  bolhas.atualizar(dt);
  bolhasDoFundo.atualizar(dt);
  clima.atualizar(dt, minutosDoDiaReal());
  turvacao.atualizar(dt, nivelDaSujeira(aquario.sujeira));
  tempoVisual += dt;
  menu.atualizar(dt, aquario);
  // Os efeitos sonoros (doc 16): olha o que aconteceu neste passo e toca o som que combina.
  observadorDeSons.passo({
    tela: menu.tela,
    mensagem: menu.mensagem,
    cacada: { fase: menu.cacada.fase, numero: menu.cacada.numeroDaContagem, pontos: menu.cacada.pontos, novoRecorde: menu.cacada.novoRecorde },
    relampago: clima.raio > 0,
    graos: aquario.graos.length,
    eventos,
  });
  som.atualizar(dt);
}

// O que o core anotou (namoro, nascimento...) vira mensagem na tela. Devolve a lista, para o som também usar.
function mostrarAvisosDoCore() {
  const eventos = aquario.eventos.retirar();
  for (const evento of eventos) {
    if (evento.tipo === 'reproducao') menu.avisar(textos.mensagens.namoro);
    else if (evento.tipo === 'nasceu') menu.avisar(textos.mensagens.nasceu);
    else if (evento.tipo === 'morreu' && !aquario.gameOver) {
      // O morto sai logo do aquário, então avisa quem foi (no Game Over a tela já diz tudo).
      const peixe = aquario.peixePorId(evento.peixeId);
      if (peixe) menu.avisar(preencher(textos.mensagens.morreu, { nome: peixe.nome }));
    }
  }
  return eventos;
}

function desenhar() {
  desenharQuadro(quadro, {
    mapa, camera, peixes: aquario.peixes, aquario, config, bolhas: bolhas.lista, bolhasDoFundo: bolhasDoFundo.lista, plantas, fundo, tempo: tempoVisual,
    turvacao: turvacao.nivel, graos: aquario.graos, cocos: aquario.cocos, ovos: aquario.ovos, casais: aquario.casais, agoraMs: clock.agoraMs(), clima, larvas: menu.cacada.larvas,
  });
  desenharTelas(quadro, { menu, aquario, config, textos, agoraMs: clock.agoraMs(), clima });
  mostrarQuadro(ctx, quadro);
}

// Laço: acumula o tempo real e roda passos fixos de 50 ms.
let acumulado = 0;
let ultimo = performance.now();
function ciclo(agora) {
  acumulado += Math.min(agora - ultimo, 250); // teto: se a aba ficou parada, não "recupera" tudo
  ultimo = agora;
  let passos = 0;
  while (acumulado >= PASSO_MS) {
    atualizar(PASSO_MS / 1000);
    acumulado -= PASSO_MS;
    passos++;
  }
  if (passos > 0) desenhar();
  painel.atualizar();
  requestAnimationFrame(ciclo);
}

// Ajuda para desenvolver: abrindo http://localhost:8080/?debug, dá para mexer no jogo pelo
// console do navegador (ex.: __debug.camera.irPara(0, 0)). Sem "?debug" nada disso existe.
if (new URLSearchParams(location.search).has('debug')) {
  window.__debug = { som, clima, camera, seguidor, clock, config, textos, menu, turvacao, aquario: () => aquario, salvamento, salvar };
}

// O interruptor de som e a lista de teste (nas Opções do celular e no painel do computador).
ligarSons({ som, nomes: Object.keys(sonsConfig.sons), aoMudar: (ligado) => gravarSomLigado(ligado) });
// O navegador só libera som depois do primeiro toque: é aí que o aparelho "liga" (ou dá boas-vindas).
audio.aoPrimeiroGesto(() => som.tocar(menu.tela === TELAS.BEM_VINDO ? 'bemvindo' : 'ligar'));

desenhar();
painel.atualizar(true);
requestAnimationFrame(ciclo);
