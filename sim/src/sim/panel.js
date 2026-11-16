// Painel de testes do simulador (doc 05, seção 6). NÃO existe no aparelho.
// Aqui ficam só botões e campos; as regras ficam no core.
import { idadeMs, msAteProximaFase, faseDaIdade } from '../core/fish.js';
import { formatarPh } from '../core/formatar.js';
import { formatarHoraDoJogo, formatarIdade } from './formatar.js';
import { lerNumero } from './campos.js';

const INTERVALO_MS = 250; // o painel se atualiza 4 vezes por segundo

const TEXTO_DO_ESTADO = { doente: 'doente', morto: 'morto' };
const TEXTO_DA_CAUSA = { velhice: 'de velhice', cuidado: 'por falta de cuidado' };

// Pede para o main: o relógio, o menu (para as ações valerem como no aparelho, com mensagem na
// tela), o aquário e o peixe atuais (mudam ao reiniciar) e o que fazer ao reiniciar.
export function criarPainel({ clock, menu, config, obterAquario, obterPeixe, aoReiniciar, camera }) {
  const $ = (id) => document.getElementById(id);
  const botoesVelocidade = [...document.querySelectorAll('#velocidades button')];
  const botaoPular = $('pular');
  const botaoTamanho = $('tamanho');
  const campoSaciedade = $('campo-saciedade');
  const campoSujeira = $('campo-sujeira');
  const campoSaude = $('campo-saude');
  const campoPh = $('campo-ph');
  const botaoMatar = $('acao-matar');
  let ultimaAtualizacao = -Infinity;
  let escala = 2;

  // As opções do pH vêm do config: os mesmos valores do jogo.
  config.ph.valores.forEach((valor, i) => {
    campoPh.add(new Option(formatarPh(valor), String(i)));
  });

  for (const botao of botoesVelocidade) {
    botao.addEventListener('click', () => {
      clock.velocidade = Number(botao.dataset.vel);
      atualizar(true);
    });
  }

  botaoPular.addEventListener('click', () => {
    const ms = msAteProximaFase(obterPeixe(), clock.agoraMs());
    if (ms !== null) clock.avancar(ms);
    atualizar(true);
  });

  $('reiniciar').addEventListener('click', () => {
    aoReiniciar();
    atualizar(true);
  });

  // Só aumenta a imagem na tela do computador; o jogo continua em 120×120.
  botaoTamanho.addEventListener('click', () => {
    escala = escala === 2 ? 4 : 2;
    document.documentElement.style.setProperty('--escala', escala);
    atualizar(true);
  });

  // As ações são as mesmas do menu do aparelho (mesma função, mesma mensagem na tela).
  for (const [id, acao] of [['acao-comida', 'comida'], ['acao-limpar', 'limpar'], ['acao-ph', 'ph']]) {
    $(id).addEventListener('click', () => {
      menu.executar(acao, obterAquario());
      atualizar(true);
    });
  }
  botaoMatar.addEventListener('click', () => {
    obterAquario().matar(obterPeixe());
    atualizar(true);
  });

  // Editar os valores à mão (para testar sem esperar o tempo passar).
  function aoEditar(campo, aplicar) {
    campo.addEventListener('change', () => {
      const n = lerNumero(campo.value);
      if (n !== null) aplicar(n);
      atualizar(true);
    });
  }
  aoEditar(campoSaciedade, (n) => { obterPeixe().saciedade = n; });
  aoEditar(campoSujeira, (n) => { obterAquario().sujeira = n; });
  aoEditar(campoSaude, (n) => { obterPeixe().saude = n; });
  campoPh.addEventListener('change', () => {
    const aquario = obterAquario();
    aquario.phPasso = Number(campoPh.value);
    aquario.phProgresso = 0;
    atualizar(true);
  });

  // Mostra o valor no campo, menos se você estiver digitando nele agora.
  function mostrar(campo, texto) {
    if (document.activeElement !== campo) campo.value = texto;
  }

  // forcar = true atualiza já, sem esperar o intervalo.
  function atualizar(forcar = false) {
    const agora = performance.now();
    if (!forcar && agora - ultimaAtualizacao < INTERVALO_MS) return;
    ultimaAtualizacao = agora;

    const tempo = clock.agoraMs();
    const aquario = obterAquario();
    const peixe = obterPeixe();
    const idade = idadeMs(peixe, tempo);

    $('hora-jogo').textContent = formatarHoraDoJogo(tempo);
    // A fase vem direto da idade, para o painel nunca ficar um passo atrás do relógio.
    const estado = TEXTO_DO_ESTADO[peixe.estado];
    $('peixe').textContent =
      `${peixe.nome} · ${faseDaIdade(idade)} · ${formatarIdade(idade)}${estado ? ` · ${estado}` : ''}`;
    $('aviso-vida').hidden = !aquario.gameOver;
    if (aquario.gameOver) {
      $('aviso-vida').textContent =
        `Game Over: o peixe morreu ${TEXTO_DA_CAUSA[aquario.causaDoGameOver] ?? ''}. Use Reiniciar.`;
    }

    mostrar(campoSaciedade, Math.round(peixe.saciedade));
    mostrar(campoSujeira, Math.round(aquario.sujeira));
    mostrar(campoSaude, Math.round(peixe.saude));
    mostrar(campoPh, String(aquario.phPasso));
    // Depois do Game Over as regras ficam congeladas: não adianta editar.
    for (const campo of [campoSaciedade, campoSujeira, campoSaude, campoPh]) {
      campo.disabled = aquario.gameOver;
    }
    botaoMatar.disabled = peixe.estado === 'morto';

    for (const botao of botoesVelocidade) {
      botao.classList.toggle('ativo', Number(botao.dataset.vel) === clock.velocidade);
    }
    botaoPular.disabled = aquario.gameOver || msAteProximaFase(peixe, tempo) === null;
    botaoTamanho.textContent = `Tela: ${escala}× (mudar para ${escala === 2 ? 4 : 2}×)`;
    $('camera').textContent =
      `x ${Math.round(camera.x)} de ${camera.maxX} · y ${Math.round(camera.y)} de ${camera.maxY}`;
  }

  return { atualizar };
}
