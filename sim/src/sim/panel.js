// Painel de testes do simulador (doc 05, seção 6). NÃO existe no aparelho.
// Aqui ficam só botões e textos; as regras ficam no core.
import { idadeMs, msAteProximaFase, faseDaIdade } from '../core/fish.js';
import { formatarHoraDoJogo, formatarIdade, fimDaVidaNatural } from './formatar.js';

const INTERVALO_MS = 250; // o painel se atualiza 4 vezes por segundo

// Pede para o main: o relógio, o peixe atual (muda ao reiniciar) e o que fazer ao reiniciar.
export function criarPainel({ clock, obterPeixe, aoReiniciar, camera }) {
  const $ = (id) => document.getElementById(id);
  const botoesVelocidade = [...document.querySelectorAll('#velocidades button')];
  const botaoPular = $('pular');
  const botaoTamanho = $('tamanho');
  let ultimaAtualizacao = -Infinity;
  let escala = 2;

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

  // forcar = true atualiza já, sem esperar o intervalo.
  function atualizar(forcar = false) {
    const agora = performance.now();
    if (!forcar && agora - ultimaAtualizacao < INTERVALO_MS) return;
    ultimaAtualizacao = agora;

    const tempo = clock.agoraMs();
    const peixe = obterPeixe();
    const idade = idadeMs(peixe, tempo);

    $('hora-jogo').textContent = formatarHoraDoJogo(tempo);
    // A fase vem direto da idade, para o painel nunca ficar um passo atrás do relógio.
    $('peixe').textContent = `${peixe.nome} · ${faseDaIdade(idade)} · ${formatarIdade(idade)}`;
    $('aviso-vida').hidden = !fimDaVidaNatural(idade);

    for (const botao of botoesVelocidade) {
      botao.classList.toggle('ativo', Number(botao.dataset.vel) === clock.velocidade);
    }
    botaoPular.disabled = msAteProximaFase(peixe, tempo) === null;
    botaoTamanho.textContent = `Tela: ${escala}× (mudar para ${escala === 2 ? 4 : 2}×)`;
    $('camera').textContent =
      `x ${Math.round(camera.x)} de ${camera.maxX} · y ${Math.round(camera.y)} de ${camera.maxY}`;
  }

  return { atualizar };
}
