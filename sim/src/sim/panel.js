// Painel de testes do simulador (doc 05, seção 6). NÃO existe no aparelho.
// Aqui ficam só botões e campos; as regras ficam no core.
import { idadeMs, msAteProximaFase, faseDaIdade } from '../core/fish.js';
import { formatarPh } from '../core/formatar.js';
import { formatarHoraDoJogo, formatarIdade, formatarEstadoDoClima } from './formatar.js';
import { lerNumero } from './campos.js';
import { sexoRevelado } from '../render/telas.js';
import { MINUTO_MS } from '../core/clock.js';

const INTERVALO_MS = 250; // o painel se atualiza 4 vezes por segundo

const TEXTO_DO_ESTADO = { doente: 'doente', morto: 'morto' };
const TEXTO_DA_CAUSA = { velhice: 'de velhice', cuidado: 'por falta de cuidado' };
const TEXTO_DO_SEXO = { macho: 'macho', femea: 'fêmea' };
const MOTIVO_DO_PARCEIRO = {
  morto: 'esse peixe está morto',
  naoAdulto: 'só peixe adulto ganha parceiro',
  temParceiro: 'ele já tem parceiro',
  cheio: 'aquário cheio (5 peixes)',
};

// Pede para o main: o relógio, o menu (para as ações valerem como no aparelho, com mensagem na
// tela), o aquário e o peixe atuais (mudam ao adotar) e o que fazer ao adotar, renomear e apagar.
// O painel faz o papel da página do celular (doc 06): adotar e dar nome.
export function criarPainel({
  clock, menu, config, textos, obterAquario, obterPeixe, obterSalvamento, camera,
  aguardandoAdocao, podeAdotar, aoAdotar, aoRenomear, aoApagar, aoAdotarParceiro, clima,
}) {
  const $ = (id) => document.getElementById(id);
  const botoesVelocidade = [...document.querySelectorAll('#velocidades button')];
  const botaoPular = $('pular');
  const botaoTamanho = $('tamanho');
  const campoSaciedade = $('campo-saciedade');
  const campoSujeira = $('campo-sujeira');
  const campoSaude = $('campo-saude');
  const campoPh = $('campo-ph');
  const botaoMatar = $('acao-matar');
  const campoNome = $('campo-nome');
  const campoNomeAdocao = $('campo-nome-adocao');
  const campoCorAdocao = $('campo-cor-adocao');
  const botaoAdotar = $('adotar');
  const botaoParceiro = $('adotar-parceiro');
  const botaoNamorar = $('acao-namorar');
  const campoPeixe = $('campo-peixe');
  const campoHoraModo = $('clima-hora-modo');
  const campoHora = $('clima-hora');
  const campoChuva = $('clima-chuva');
  const campoTemperatura = $('clima-temperatura');
  const botaoApagar = $('apagar');
  const botaoZerarRecorde = $('zerar-recorde');
  let ultimaAtualizacao = -Infinity;
  let escala = 2;

  // As opções do pH vêm do config: os mesmos valores do jogo.
  config.ph.valores.forEach((valor, i) => {
    campoPh.add(new Option(formatarPh(valor), String(i)));
  });

  for (const cor of config.cores) {
    campoCorAdocao.add(new Option(textos.adocao.cores[cor] ?? cor, cor));
  }

  for (const botao of botoesVelocidade) {
    botao.addEventListener('click', () => {
      clock.velocidade = Number(botao.dataset.vel);
      atualizar(true);
    });
  }

  botaoPular.addEventListener('click', () => {
    // Só o peixe fica mais velho; o relógio e a água não andam (senão ele morreria de fome no caminho).
    const peixe = obterPeixe();
    if (!peixe) return;
    const ms = msAteProximaFase(peixe, clock.agoraMs());
    if (ms !== null) obterAquario().envelhecer(peixe, ms);
    atualizar(true);
  });

  // Apagar o jogo é sem volta: o primeiro clique só pede confirmação (vale por 4 segundos).
  let confirmandoApagar = null;
  botaoApagar.addEventListener('click', async () => {
    if (confirmandoApagar === null) {
      botaoApagar.textContent = 'Clique de novo para apagar';
      confirmandoApagar = setTimeout(() => {
        confirmandoApagar = null;
        botaoApagar.textContent = 'Apagar jogo';
      }, 4000);
      return;
    }
    clearTimeout(confirmandoApagar);
    confirmandoApagar = null;
    botaoApagar.textContent = 'Apagar jogo';
    await aoApagar();
    atualizar(true);
  });

  // O recorde do minigame Caçar: o próximo salvamento (a cada 10 s) já grava o zero.
  botaoZerarRecorde.addEventListener('click', () => {
    menu.definirRecorde(0);
    atualizar(true);
  });

  // Dar nome ao peixe: escreva e aperte Enter (ou saia do campo).
  campoNome.addEventListener('change', () => {
    aoRenomear(campoNome.value);
    atualizar(true);
  });

  botaoAdotar.addEventListener('click', () => {
    if (!podeAdotar()) return;
    aoAdotar({ nome: campoNomeAdocao.value, cor: campoCorAdocao.value });
    campoNomeAdocao.value = '';
    atualizar(true);
  });

  campoPeixe.addEventListener('change', () => {
    menu.focar(obterAquario(), Number(campoPeixe.value));
    atualizar(true);
  });

  botaoParceiro.addEventListener('click', () => {
    aoAdotarParceiro({ nome: campoNomeAdocao.value, cor: campoCorAdocao.value });
    campoNomeAdocao.value = '';
    atualizar(true);
  });

  // Teste: o casal do peixe escolhido já cumpriu o tempo e o intervalo; na próxima passada das
  // regras ele reproduz (se houver vaga).
  botaoNamorar.addEventListener('click', () => {
    const aquario = obterAquario();
    const peixe = obterPeixe();
    const casal = peixe && aquario.casalDe(peixe);
    if (!casal) return;
    casal.boasMs = config.reproducao.boasCondicoesMin * MINUTO_MS;
    casal.ultimaMs = null;
    for (const id of [casal.aId, casal.bId]) aquario.peixePorId(id).saude = 100;
    atualizar(true);
  });

  // Clima (doc 11): força a hora, a chuva e a temperatura do cenário. Não afeta o peixe.
  const aplicarHora = () => {
    clima.definirHora(campoHoraModo.value, lerNumero(campoHora.value, 0, 23.99) ?? 12);
    atualizar(true);
  };
  campoHoraModo.addEventListener('change', aplicarHora);
  campoHora.addEventListener('change', aplicarHora);
  campoChuva.addEventListener('change', () => {
    clima.forcarChuva({ auto: null, ligada: true, desligada: false }[campoChuva.value]);
    atualizar(true);
  });
  campoTemperatura.addEventListener('change', () => {
    clima.forcarTemperatura(lerNumero(campoTemperatura.value, -30, 60)); // vazio = automática
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
    if (obterPeixe()) obterAquario().matar(obterPeixe());
    atualizar(true);
  });

  // Editar os valores à mão (para testar sem esperar o tempo passar).
  function aoEditar(campo, aplicar, max = 100) {
    campo.addEventListener('change', () => {
      const n = lerNumero(campo.value, 0, max);
      if (n !== null) aplicar(n);
      atualizar(true);
    });
  }
  aoEditar(campoSaciedade, (n) => { if (obterPeixe()) obterPeixe().saciedade = n; }, config.saciedade.maximo);
  aoEditar(campoSujeira, (n) => { obterAquario().sujeira = n; });
  aoEditar(campoSaude, (n) => { if (obterPeixe()) obterPeixe().saude = n; });
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

  // Diz se o jogo está sendo salvo, e avisa quando algo deu errado.
  function mostrarSalvamento(s) {
    const linha = $('salvamento');
    const aviso = $('aviso-salvamento');
    if (s.bloqueado) {
      linha.textContent = 'Jogo NÃO está sendo salvo';
    } else if (s.falhou) {
      linha.textContent = 'Falha ao salvar: servidor fora do ar?';
    } else if (s.quando) {
      linha.textContent = `Salvo às ${new Date(s.quando).toLocaleTimeString('pt-BR')}`;
    } else {
      linha.textContent = 'Ainda não salvou';
    }
    aviso.hidden = !s.aviso;
    if (s.aviso) aviso.textContent = s.aviso;
  }

  // Mantém a lista de peixes do seletor igual ao aquário (só mexe nela quando muda).
  let assinaturaDaLista = '';
  function mostrarLista(aquario, peixe) {
    const lista = aquario.vivos().length > 0 ? aquario.vivos() : aquario.peixes;
    const assinatura = lista.map((p) => `${p.id}:${p.nome}`).join('|');
    if (assinatura !== assinaturaDaLista) {
      assinaturaDaLista = assinatura;
      campoPeixe.replaceChildren(...lista.map((p) => new Option(`${p.nome} (${p.cor})`, String(p.id))));
    }
    if (peixe) campoPeixe.value = String(peixe.id);
    campoPeixe.disabled = lista.length < 2;
  }

  // forcar = true atualiza já, sem esperar o intervalo.
  function atualizar(forcar = false) {
    const agora = performance.now();
    if (!forcar && agora - ultimaAtualizacao < INTERVALO_MS) return;
    ultimaAtualizacao = agora;

    const tempo = clock.agoraMs();
    const aquario = obterAquario();
    const peixe = obterPeixe(); // o peixe em foco (null se não há nenhum)

    $('hora-jogo').textContent = formatarHoraDoJogo(tempo);
    mostrarLista(aquario, peixe);
    if (peixe) {
      const idade = idadeMs(peixe, tempo);
      // A fase vem direto da idade, para o painel nunca ficar um passo atrás do relógio.
      const estado = TEXTO_DO_ESTADO[peixe.estado];
      const sexo = sexoRevelado(peixe, tempo);
      $('peixe').textContent =
        `${peixe.nome} · ${faseDaIdade(idade)} · ${formatarIdade(idade)} · ${sexo ? TEXTO_DO_SEXO[sexo] : 'sexo ainda oculto'}${estado ? ` · ${estado}` : ''}`;
    } else {
      $('peixe').textContent = 'Sem peixe (só ovos).';
    }
    const parceiro = peixe ? aquario.parceiroDe(peixe) : null;
    $('familia').textContent =
      `Vivos: ${aquario.vivos().length} de ${config.reproducao.limiteDePeixes} · ovos: ${aquario.ovos.length} · `
      + `parceiro: ${parceiro ? parceiro.nome : 'nenhum'}`;
    $('aviso-vida').hidden = !aquario.gameOver;
    if (aquario.gameOver) {
      $('aviso-vida').textContent =
        `Game Over: o peixe morreu ${TEXTO_DA_CAUSA[aquario.causaDoGameOver] ?? ''}. Adote outro (A no aparelho, ou aqui em Adoção).`;
    }

    mostrarSalvamento(obterSalvamento());
    $('recorde-cacada').textContent = `Recorde da caçada: ${menu.recorde} larva${menu.recorde === 1 ? '' : 's'}`;
    botaoZerarRecorde.disabled = menu.recorde === 0;

    // Adoção: o nome do peixe atual e a seção de adotar.
    const aguardando = aguardandoAdocao();
    mostrar(campoNome, peixe ? peixe.nome : '');
    campoNome.disabled = aguardando || !peixe;
    botaoAdotar.disabled = !podeAdotar();
    const podeParceiro = !aguardando && peixe ? aquario.podeAdotarParceiro(peixe) : null;
    botaoParceiro.disabled = !(podeParceiro && podeParceiro.ok);
    botaoParceiro.title = podeParceiro && !podeParceiro.ok ? MOTIVO_DO_PARCEIRO[podeParceiro.motivo] : '';
    botaoNamorar.disabled = aguardando || !peixe || !aquario.casalDe(peixe);
    $('adocao-estado').textContent = aguardando
      ? 'Aguardando a primeira adoção: escolha a cor no aparelho (ou aqui).'
      : aquario.gameOver ? 'O peixe morreu: pode adotar outro.'
        : `Há ${aquario.vivos().length} peixe(s) vivo(s). ${podeParceiro && !podeParceiro.ok ? `Parceiro: ${MOTIVO_DO_PARCEIRO[podeParceiro.motivo]}.` : ''}`;

    mostrar(campoSaciedade, peixe ? Math.round(peixe.saciedade) : '');
    mostrar(campoSujeira, Math.round(aquario.sujeira));
    mostrar(campoSaude, peixe ? Math.round(peixe.saude) : '');
    mostrar(campoPh, String(aquario.phPasso));
    // Depois do Game Over as regras ficam congeladas: não adianta editar.
    for (const campo of [campoSaciedade, campoSujeira, campoSaude, campoPh]) {
      campo.disabled = aquario.gameOver || aguardando;
    }
    botaoMatar.disabled = !peixe || peixe.estado === 'morto' || aguardando;

    $('clima-estado').textContent = formatarEstadoDoClima(clima);
    campoHora.disabled = clima.modoHora !== 'fixa';

    for (const botao of botoesVelocidade) {
      botao.classList.toggle('ativo', Number(botao.dataset.vel) === clock.velocidade);
    }
    botaoPular.disabled = aquario.gameOver || aguardando || !peixe || msAteProximaFase(peixe, tempo) === null;
    botaoTamanho.textContent = `Tela: ${escala}× (mudar para ${escala === 2 ? 4 : 2}×)`;
    $('camera').textContent =
      `x ${Math.round(camera.x)} de ${camera.maxX} · y ${Math.round(camera.y)} de ${camera.maxY}`;
  }

  return { atualizar };
}
