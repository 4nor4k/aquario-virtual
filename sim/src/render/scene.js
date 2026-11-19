// Monta um quadro de 120×120: camadas de baixo para cima (doc 04, seção 4).
import { TILE, COLUNAS, LINHAS } from '../core/mundo.js';
import { quadroDeNado } from '../core/fish.js';
import { pixelsDoTile } from './cenario.js';
import { spriteDoPeixe, desenharSprite } from './sprites.js';
import { desenharHud } from './hud.js';
import { desenharPlantas } from './plantas.js';
import { desenharFundo } from './fundo.js';
import { desenharFiltro } from './filtro.js';
import { desenharSuperficie } from './superficie.js';
import { desenharBolhas } from './bolhas.js';
import { desenharTurvacao } from './turvacao.js';
import { desenharBolor } from './bolor.js';
import { desenharGraos } from './comida.js';
import { desenharCocos } from './cocos.js';
import { desenharOvos } from './ovos.js';
import { desenharCoracoes } from './coracoes.js';
import { luzDoClima, restaurarPaleta, aplicarLuz } from './luz.js';
import { desenharCeu } from './ceu.js';
import { desenharChuva } from './chuva.js';
import { desenharRaiosDeLuz } from './raios.js';
import { desenharSpot } from './spot.js';
import { LARGURA, ALTURA } from './tela.js';

const COR_AGUA = 1;

// Desenha no quadro os blocos que aparecem dentro da janela da câmera. Os pixels de água (cor 1)
// não são pintados: deixam aparecer o que já está no quadro, o fundo com paralaxe.
export function desenharCenario(quadro, mapa, camera) {
  const cx = Math.round(camera.x);
  const cy = Math.round(camera.y);

  const col0 = Math.floor(cx / TILE);
  const col1 = Math.min(COLUNAS - 1, Math.floor((cx + LARGURA - 1) / TILE));
  const lin0 = Math.floor(cy / TILE);
  const lin1 = Math.min(LINHAS - 1, Math.floor((cy + ALTURA - 1) / TILE));

  for (let lin = lin0; lin <= lin1; lin++) {
    for (let col = col0; col <= col1; col++) {
      const pix = pixelsDoTile(mapa[lin * COLUNAS + col]);
      const ox = col * TILE - cx; // onde o bloco cai na tela
      const oy = lin * TILE - cy;
      for (let ty = 0; ty < TILE; ty++) {
        const y = oy + ty;
        if (y < 0 || y >= ALTURA) continue;
        for (let tx = 0; tx < TILE; tx++) {
          const x = ox + tx;
          if (x < 0 || x >= LARGURA) continue;
          const cor = pix[ty * TILE + tx];
          if (cor !== COR_AGUA) quadro[y * LARGURA + x] = cor;
        }
      }
    }
  }
}

// Desenha os peixes por cima do cenário. (x, y) do peixe é o centro dele no mundo.
export function desenharPeixes(quadro, peixes, camera) {
  const cx = Math.round(camera.x);
  const cy = Math.round(camera.y);
  for (const peixe of peixes) {
    const { sprite, inverter } = spriteDoPeixe(peixe);
    const x = Math.round(peixe.x - sprite.largura / 2) - cx;
    const y = Math.round(peixe.y - sprite.altura / 2) - cy;
    // O peixe morto não bate a cauda: fica sempre no quadro 0.
    const quadroDaAnimacao = peixe.estado === 'morto' ? 0 : quadroDeNado(peixe);
    desenharSprite(quadro, sprite, quadroDaAnimacao, x, y, peixe.direcao === -1, inverter, true);
  }
}

// aquario e config são opcionais: sem eles, desenha só o cenário e os peixes (sem avisos).
// tempo (segundos reais, só para animar a onda e o balanço das plantas), bolhas, plantas, fundo (paralaxe),
// turvacao (0 a 1: o quanto a água está turva) e graos (comida) também são opcionais.
export function desenharQuadro(quadro, {
  mapa, camera, peixes, aquario, config, bolhas = [], plantas = [], fundo, tempo = 0, turvacao = 0, graos = [],
  cocos = [], bolhasDoFundo = [], ovos = [], casais = [], agoraMs = null, clima = null,
}) {
  // clima (opcional, core/clima.js): a hora do dia, a chuva e o relâmpago. Sem ele a cena é a de sempre (dia).
  const luz = clima ? luzDoClima(clima, config?.clima?.horas) : null;
  if (luz) restaurarPaleta();                 // as cores do cenário voltam ao que eram, antes da luz de agora
  quadro.fill(COR_AGUA);                      // a água: preto sólido
  desenharBolor(quadro, camera, turvacao, tempo); // o bolor nas paredes de vidro: atrás de tudo
  // Os peixes nadam em três planos (peixe.plano, sem plano = frente): atrás da pedra grande (e das
  // algas), entre a pedra e as algas gigantes, ou na frente de tudo.
  const doPlano = (plano) => peixes.filter((p) => (p.plano ?? 'frente') === plano);
  const noFundo = () => desenharPeixes(quadro, doPlano('fundo'), camera);
  if (fundo) desenharFundo(quadro, fundo, camera, tempo, noFundo, bolhasDoFundo); // paralaxe, atrás de tudo
  else noFundo();
  desenharCenario(quadro, mapa, camera);
  desenharPeixes(quadro, doPlano('meio'), camera); // na frente da pedra e do cenário, atrás das algas
  desenharPlantas(quadro, plantas, camera, tempo);
  desenharSuperficie(quadro, camera, tempo);
  if (luz) desenharCeu(quadro, camera, luz, tempo); // estrelas de noite e o clarão do relâmpago (depois da superfície, que repinta o ar)
  if (luz) desenharChuva(quadro, camera, luz.chuvaNivel, tempo); // gotas no ar e anéis na superfície
  desenharFiltro(quadro, camera, tempo);     // caixa, bico e queda d'água, por cima da superfície
  desenharTurvacao(quadro, camera, turvacao, tempo); // a cor da água suja e as partículas: atrás dos peixes
  if (luz && luz.noite > 0.02) desenharSpot(quadro, camera); // o spot de luz da noite, na água ainda limpa
  if (luz && luz.dia > 0.02) desenharRaiosDeLuz(quadro, camera, tempo); // os reflexos de vidro do dia, na água ainda limpa
  desenharOvos(quadro, ovos, camera, { tempo, agoraMs }); // os ovos do casal, na areia
  desenharPeixes(quadro, doPlano('frente'), camera);
  if (config) desenharCoracoes(quadro, casais, camera, config); // os corações do namoro, por cima dos peixes
  if (config) desenharCocos(quadro, cocos, camera, config); // o cocô sai da cauda: por cima do peixe
  desenharGraos(quadro, graos, camera);
  desenharBolhas(quadro, bolhas, camera);
  if (luz) aplicarLuz(luz);                   // a luz do dia e da noite: troca as cores do cenário (nunca as da tela)
  if (aquario && config) desenharHud(quadro, { aquario, config, camera, frio: !!clima?.frio });
}
