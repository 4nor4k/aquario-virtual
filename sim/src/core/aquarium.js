// O mundo do aquário: tamanhos e medidas. (Nos próximos passos entram também os peixes.)
// Tudo em pixels de render, como no aparelho.

export const TILE = 8;                       // cada bloco do cenário mede 8×8
export const COLUNAS = 45;                   // 45 blocos de largura
export const LINHAS = 30;                    // 30 blocos de altura
export const MUNDO_LARGURA = COLUNAS * TILE; // 360
export const MUNDO_ALTURA = LINHAS * TILE;   // 240

// Do alto até a linha 25 é água; a partir da linha 26 é areia.
export const LINHA_AREIA = 26;
export const AREIA_Y = LINHA_AREIA * TILE;   // 208: onde a areia começa (os peixes ficam acima)
