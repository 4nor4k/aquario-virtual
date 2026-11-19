// A luz do dia e da noite (doc 11, seções 3 e 4): troca de paleta do CENÁRIO.
//
// Cada hora do dia tem um TOM (R, G, B), um número de 0 a 1 por canal que multiplica a cor de tudo o que
// é cenário: areia, plantas, pedras, peixes, água suja. Dia = 1, 1, 1 (exatamente o visual de sempre);
// amanhecer e entardecer = alaranjado; noite = escuro e azulado. A chuva escurece um pouco e o
// relâmpago clareia por um instante.
//
// Só mudam as cores COLORIDAS da paleta (as do cenário). O texto, os menus, o HUD, o olho do peixe e as
// BOLHAS são índices que não entram na troca (viram preto e branco no mono.js) e nunca mudam: de noite as
// bolhas e os olhos continuam brilhando.
//
// Como se usa, em todo quadro: restaurarPaleta() -> (a turvação reescreve as cores da água e da areia)
// -> aplicarLuz(luz). Assim nada escurece em dobro.
import { PALETA, COLORIDOS, COR } from './palette.js';
import { INDICES_DA_TURVACAO } from './turvacao.js';

// Os tons de referência.
export const TOM_DIA = [1, 1, 1];
export const TOM_AURORA = [1, 0.8, 0.66];  // amanhecer e entardecer
export const TOM_NOITE = [0.36, 0.46, 0.78];

export const ESCURECER_COM_CHUVA = 0.18;   // com chuva forte, o cenário perde 18% da luz
export const CLAREAR_COM_RAIO = 1.1;       // no pico do relâmpago o cenário fica 2,1× mais claro (limitado a 255)
export const COR_DO_CEU_NO_RAIO = [0x78, 0x90, 0xd0];

const HORAS_PADRAO = { amanhecer: 5.5, dia: 6.5, entardecer: 17.5, noite: 18.5 };

const misturar = (a, b, p) => a.map((v, i) => v + (b[i] - v) * p);

// Quanto "dia" há em cada tom (0 = noite, 1 = dia): serve para os raios de luz e as estrelas.
const DIA_DO_TOM = new Map([[TOM_NOITE, 0], [TOM_AURORA, 0.5], [TOM_DIA, 1]]);

// A luz de uma hora do dia (em minutos, de 0 a 1440): { r, g, b, dia, noite }. dia e noite de 0 a 1.
// A hora anda de um tom ao outro por ~1 hora, sem saltos.
export function luzDaHora(horaMin, horas = HORAS_PADRAO) {
  const h = (((horaMin / 60) % 24) + 24) % 24;
  const meioAmanhecer = (horas.amanhecer + horas.dia) / 2;
  const meioEntardecer = (horas.entardecer + horas.noite) / 2;
  // [hora, tom]: a luz é a mistura entre os dois pontos vizinhos.
  const pontos = [
    [0, TOM_NOITE], [horas.amanhecer, TOM_NOITE], [meioAmanhecer, TOM_AURORA], [horas.dia, TOM_DIA],
    [horas.entardecer, TOM_DIA], [meioEntardecer, TOM_AURORA], [horas.noite, TOM_NOITE], [24, TOM_NOITE],
  ];
  for (let i = 1; i < pontos.length; i++) {
    const [h1, t1] = pontos[i];
    if (h > h1) continue;
    const [h0, t0] = pontos[i - 1];
    const p = h1 === h0 ? 1 : (h - h0) / (h1 - h0);
    const [r, g, b] = misturar(t0, t1, p);
    const dia = DIA_DO_TOM.get(t0) + (DIA_DO_TOM.get(t1) - DIA_DO_TOM.get(t0)) * p;
    return { r, g, b, dia, noite: 1 - dia };
  }
  return { r: TOM_NOITE[0], g: TOM_NOITE[1], b: TOM_NOITE[2], dia: 0, noite: 1 };
}

// A luz de agora, com a chuva e o relâmpago: { r, g, b, dia, noite, chuvaNivel, raio }.
// clima: { horaMin, chuvaNivel, raio } (o objeto de core/clima.js serve).
export function luzDoClima(clima, horas = HORAS_PADRAO) {
  const base = luzDaHora(clima.horaMin, horas);
  const chuva = clima.chuvaNivel ?? 0;
  const raio = clima.raio ?? 0;
  const escurecer = 1 - ESCURECER_COM_CHUVA * chuva;
  const clarear = 1 + CLAREAR_COM_RAIO * raio;
  return {
    r: base.r * escurecer * clarear,
    g: base.g * escurecer * clarear,
    b: base.b * (1 - 0.6 * ESCURECER_COM_CHUVA * chuva) * clarear, // a chuva tira mais do vermelho e do verde
    dia: base.dia * (1 - 0.5 * chuva) * (raio > 0.3 ? 0.5 : 1),
    noite: base.noite,
    chuvaNivel: chuva,
    raio,
  };
}

// --- A paleta ---------------------------------------------------------------------------------

// As cores de antes de qualquer troca (a foto tirada quando este arquivo é carregado).
const ORIGINAIS = PALETA.map((cor) => [...cor]);

// Os índices que a luz NÃO multiplica: o céu do relâmpago e os raios de luz têm cor própria (a luz os
// calcula), e as estrelas e o gelo do ícone de frio têm de aparecer sempre.
const SEM_TOM = new Set([COR.CEU_RELAMPAGO, COR.RAIO_DE_LUZ, COR.ESTRELA_FRACA, COR.GELO]);
const DA_TURVACAO = new Set(INDICES_DA_TURVACAO);

// Os índices que recebem o tom: as cores sólidas do cenário.
export const INDICES_DA_LUZ = COLORIDOS.filter((i) => !SEM_TOM.has(i));

function pintar(indice, [r, g, b]) {
  const cor = PALETA[indice];
  cor[0] = r; cor[1] = g; cor[2] = b;
}

// Devolve ao cenário as cores de antes da luz. Menos as da turvação (a água e a areia), que a própria
// turvação reescreve do zero a cada quadro.
export function restaurarPaleta() {
  for (const i of INDICES_DA_LUZ) {
    if (!DA_TURVACAO.has(i)) pintar(i, ORIGINAIS[i]);
  }
}

const limitar255 = (v) => Math.max(0, Math.min(255, Math.round(v)));

// Aplica a luz à paleta (depois de restaurarPaleta e de a turvação mexer na água e na areia).
export function aplicarLuz(luz) {
  for (const i of INDICES_DA_LUZ) {
    const [r, g, b] = PALETA[i];
    pintar(i, [limitar255(r * luz.r), limitar255(g * luz.g), limitar255(b * luz.b)]);
  }
  // O céu só tem cor durante o clarão do relâmpago.
  pintar(COR.CEU_RELAMPAGO, misturar([0, 0, 0], COR_DO_CEU_NO_RAIO, Math.min(1, luz.raio)).map(limitar255));
  // Os raios de luz só existem de dia (e somem na chuva).
  pintar(COR.RAIO_DE_LUZ, ORIGINAIS[COR.RAIO_DE_LUZ].map((v) => limitar255(v * Math.max(0, luz.dia))));
}
