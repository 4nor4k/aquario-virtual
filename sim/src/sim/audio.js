// O som do simulador no navegador (doc 16): toca as notas de config/sons.json com o Web Audio, numa onda
// QUADRADA (o timbre de um buzzer). É o único arquivo que fala com o áudio do navegador; o jogo só pede
// "toque este som" ao canal de core/som.js, que chama aqui.
//
// As notas são agendadas no relógio do próprio áudio (preciso), não no passo de 50 ms do jogo: assim um bip de
// 25 ms soa certinho.
// Navegadores só liberam som depois do primeiro toque/tecla do usuário: aoPrimeiroGesto() avisa quando liberou.
const VOLUME = 0.06; // onda quadrada é "alta": baixinho para não assustar

export function criarAudio({ janela = globalThis.window, AudioContexto = globalThis.AudioContext ?? globalThis.webkitAudioContext } = {}) {
  let contexto = null;
  let atual = null; // { osc, ganho }
  const quandoLiberar = [];
  let liberado = false;

  function garantir() {
    if (!AudioContexto) return null;
    if (!contexto) contexto = new AudioContexto();
    return contexto;
  }

  function parar() {
    if (!atual) return;
    try {
      atual.ganho.gain.cancelScheduledValues(0);
      atual.ganho.gain.value = 0;
      atual.osc.stop();
    } catch { /* já tinha parado */ }
    atual = null;
  }

  // notas: [[Hz, ms], ...]. Corta o que estiver tocando.
  function tocar(notas) {
    const ctx = garantir();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    parar();
    const osc = ctx.createOscillator();
    const ganho = ctx.createGain();
    osc.type = 'square';
    ganho.gain.value = 0;
    osc.connect(ganho);
    ganho.connect(ctx.destination);
    let t = ctx.currentTime + 0.005;
    for (const [hz, ms] of notas) {
      if (hz > 0) osc.frequency.setValueAtTime(hz, t);
      ganho.gain.setValueAtTime(hz > 0 ? VOLUME : 0, t);
      t += ms / 1000;
    }
    ganho.gain.setValueAtTime(0, t);
    osc.start();
    osc.stop(t + 0.02);
    atual = { osc, ganho };
  }

  function liberar() {
    if (liberado) return;
    liberado = true;
    const ctx = garantir();
    if (ctx && ctx.state === 'suspended') ctx.resume();
    for (const f of quandoLiberar) f();
  }
  if (janela) {
    for (const evento of ['pointerdown', 'keydown']) janela.addEventListener(evento, liberar, { once: true, passive: true });
  }

  return {
    tocar,
    calar: parar,
    // cb roda UMA vez, no primeiro toque ou tecla do usuário (a partir dali o navegador deixa tocar).
    aoPrimeiroGesto(cb) {
      if (liberado) cb();
      else quandoLiberar.push(cb);
    },
  };
}
