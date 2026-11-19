// Medidas do mundo do aquário. Tudo em pixels de render, como no aparelho.

export const TILE = 8;                       // cada bloco do cenário mede 8×8
export const COLUNAS = 30;                   // 30 blocos de largura
export const LINHAS = 19;                    // 19 blocos de altura (eram 20: a areia perdeu uma camada)
export const MUNDO_LARGURA = COLUNAS * TILE; // 240 (duas janelas de largura)
export const MUNDO_ALTURA = LINHAS * TILE;   // 152 (uma janela e um quarto de altura)

// A superfície da água: acima dela é ar. A linha da água sobe e desce com uma onda de até
// AMPLITUDE_ONDA pixels (desenhada em render/superficie.js), e os peixes ficam abaixo dela.
export const SUPERFICIE_Y = 20; // 20 pixels de ar em cima: cabe o filtro e a queda d'água
export const AMPLITUDE_ONDA = 2;

// Da superfície até a linha 15 é água; a partir da linha 16 é areia (3 camadas: linhas 16, 17 e 18).
export const LINHA_AREIA = 16;
export const AREIA_Y = LINHA_AREIA * TILE;   // 128: onde a areia começa (os peixes ficam acima)
