// O cocô do peixe (doc 03, "Cocô"): é só uma animação, não muda saúde nem sujeira.
// O peixe faz cocô de vez em quando (um sorteio de 1 a 3 minutos) e também 10 segundos depois
// de comer. Ele para um instante, o cocô vai saindo da cauda, solta, cai devagar até a areia,
// fica parado um tempo e some. Tudo em tempo REAL (como o nado) e fora do arquivo salvo.
import { AREIA_Y } from './mundo.js';
import { TAMANHO_POR_FASE } from './fish.js';

export const COCO_Y_AREIA = AREIA_Y - 2; // o cocô para em cima da areia, como os grãos
const BALANCO = 0.8;         // quanto balança de um lado ao outro enquanto cai, em pixels
const VELOCIDADE_BALANCO = 1.6;

// De onde o cocô sai: a cauda do peixe (o lado oposto ao que ele olha), um pouco abaixo do meio.
export function posicaoDaSaida(peixe) {
  const { largura, altura } = TAMANHO_POR_FASE[peixe.fase];
  return { x: peixe.x - peixe.direcao * (largura / 2), y: peixe.y + Math.floor(altura / 4) };
}

// Tempo até o próximo cocô "sem motivo" (sorteado entre o mínimo e o máximo do config).
export function sortearIntervalo(config, rng) {
  const { intervaloMinSeg, intervaloMaxSeg } = config.coco;
  return intervaloMinSeg + rng.decimal() * (intervaloMaxSeg - intervaloMinSeg);
}

// O peixe começa a fazer cocô agora. Devolve false se ele já está fazendo ou se há cocô demais.
export function iniciarCoco(aquario, peixe, config, rng) {
  if (peixe.fazendoCoco > 0 || aquario.cocos.length >= config.coco.maximo) return false;
  const { x, y } = posicaoDaSaida(peixe);
  peixe.fazendoCoco = config.coco.segundosSaindo;
  aquario.cocos.push({
    x, y, baseX: x, estado: 'saindo', tempo: 0, dono: peixe, fase: rng.decimal() * Math.PI * 2,
  });
  return true;
}

// Um passo do cocô (dt em segundos reais): os sorteios e contagens dos peixes e o movimento de
// cada cocô. 'saindo' (preso na cauda) -> 'caindo' -> 'parado' (na areia) -> some.
export function atualizarCocos(aquario, dt, config, rng) {
  const cfg = config.coco;

  for (const peixe of aquario.vivos()) {
    if (peixe.fazendoCoco > 0) peixe.fazendoCoco = Math.max(0, peixe.fazendoCoco - dt);

    // Depois de comer: 10 segundos depois (a contagem recomeça a cada grão).
    if (peixe.cocoEm !== null) {
      peixe.cocoEm -= dt;
      if (peixe.cocoEm <= 0) peixe.cocoEm = iniciarCoco(aquario, peixe, config, rng) ? null : 1; // ocupado: tenta já já
    }

    // De vez em quando, sem motivo.
    if (peixe.cocoAleatorioEm === null) peixe.cocoAleatorioEm = sortearIntervalo(config, rng);
    peixe.cocoAleatorioEm -= dt;
    if (peixe.cocoAleatorioEm <= 0) {
      peixe.cocoAleatorioEm = iniciarCoco(aquario, peixe, config, rng) ? sortearIntervalo(config, rng) : 1;
    }
  }

  const cocos = aquario.cocos;
  for (let i = cocos.length - 1; i >= 0; i--) {
    const c = cocos[i];
    c.tempo += dt;
    if (c.estado === 'saindo') {
      if (c.dono.estado !== 'morto' && c.tempo < cfg.segundosSaindo) {
        const { x, y } = posicaoDaSaida(c.dono); // acompanha a cauda
        c.x = x;
        c.y = y;
        c.baseX = x;
      } else {
        c.estado = 'caindo';
        c.tempo = 0;
        if (c.dono.estado === 'morto') c.dono.fazendoCoco = 0;
      }
    } else if (c.estado === 'caindo') {
      c.y = Math.min(COCO_Y_AREIA, c.y + cfg.velocidadeQueda * dt);
      c.x = c.baseX + BALANCO * Math.sin(c.fase + c.tempo * VELOCIDADE_BALANCO);
      if (c.y >= COCO_Y_AREIA) {
        c.estado = 'parado';
        c.tempo = 0;
      }
    } else if (c.tempo >= cfg.segundosNaAreia) {
      cocos.splice(i, 1);
    }
  }
}
