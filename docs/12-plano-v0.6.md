# 12 · Plano da v0.6 (ajustes de jogabilidade e indicadores)

Escrito e **implementado em 19/11/2026** (resultado na seção 9; o usuário disse "pode" e aceitou as 4
recomendações da seção 7). Nasceu de três pedidos do usuário feitos logo depois da v0.5. O que o usuário
pediu está marcado **[fechado]**; tudo o que eu completei para fazer funcionar está marcado **[proposta]**.
As seções 2 a 5 abaixo são o plano original; **o que mudou na hora de fazer está na seção 9, e os 3 ajustes pedidos
depois de ver funcionando estão na seção 9.1** (peixe mais rápido e circulando pela pedra, pH como "valor + quadradinho",
sem cruz sobre o peixe).

## 1. O que o usuário pediu [fechado]

1. **Chuva:** "quando estiver chovendo o peixe fica mais quieto atrás da pedra, como se estivesse se
   escondendo da chuva. Ele fica mais perto do solo."
2. **Saúde:** deixa de ser um número de 0 a 100 na tela e vira um **status**: *saudável*, *doente*,
   *muito doente*, indicado por **cor**, com um sinal de cruz "+" que muda para **verde, amarelo ou vermelho**.
3. **pH:** também indicado por **cor**, indo do **amarelo (alcalino)** ao **azul (ácido)**.

## 2. Peixe se esconde da chuva

**Como é hoje:** o peixe sorteia destinos pela água toda (`core/fish.js`, `atualizarPeixe`). O clima
(`core/clima.js`) só muda o visual. A pedra grande é desenhada na camada de fundo (`render/pedra-grande.js`,
66×40 px, apoiada na areia) e o peixe pode passar atrás dela (plano `fundo`).

**Proposta:**
- **Quando:** a chuva está chegando (`chuvaNivel` passou de 0,5) e o peixe está vivo.
- **Para onde:** vai para **trás da pedra grande**, no plano `fundo`, **colado no chão** (a altura mínima
  permitida, com 0 a 6 px de sorteio). Cada peixe pega um ponto diferente ao longo da largura da pedra
  (66 px), para não ficarem todos empilhados.
- **Quieto:** depois de chegar, fica parado e só se mexe de vez em quando (pequenos passos de até 8 px, com
  esperas longas de 4 a 10 s). Não nada pela água toda enquanto chove.
- **Quando sai:** a chuva acabou (`chuvaNivel` abaixo de 0,2). Cada peixe espera de 3 a 8 s (cada um um
  tempo, para não saírem juntos) e volta ao passeio normal.
- **Prioridades:** comida na água > esconder (ele sai para comer e depois volta se ainda chove);
  namoro e cocô continuam como são; peixe morto não muda.
- **Não muda regras do jogo:** não mexe em saúde, fome nem pH; não vai para o arquivo salvo (chuva também
  não é salva).
- **Cuidado técnico (paralaxe):** a pedra anda a 85% da câmera, então o lugar dela na tela muda quando a
  câmera se move. O `core/` não conhece o desenho, então a interface (`main.js`) calcula "onde está a
  pedra agora, em coordenadas do mundo" e entrega ao `atualizarPeixe` como `abrigo = { x, y }`, do mesmo
  jeito que já entrega a comida. O alvo é recalculado a cada quadro e o peixe só se reajusta se estiver a
  mais de 6 px do ponto. Se a câmera se mexer muito, ele pode ficar parte do corpo para fora por
  alguns segundos até se ajustar.
- **Peixe visível ou escondido?** Um adulto (32×26) cabe inteiro atrás da pedra (66×40), então **fica
  totalmente escondido**. Os emblemas F e + do HUD continuam aparecendo em cima dele (pela borda da pedra),
  então dá para ver se ele precisa de cuidado. Ver pergunta 1 na seção 7.

## 3. Saúde por status e cor

**Como é hoje:** saúde de 0 a 100 (`peixe.saude`). Abaixo de 30 o peixe fica *doente* (nada na metade da
velocidade, emblema "+" laranja em cima dele); em 0 morre. A tela de status e o HUD de indicadores (botão B)
mostram número e barra.

**Proposta:** o número continua existindo por dentro (as regras não mudam; o painel de testes continua
editando o número), mas **o jogador vê só o status**:

| Status | Saúde | Cor do "+" | Efeito no peixe |
|---|---|---|---|
| Saudável | 70 a 100 | verde | nenhum |
| Doente | 30 a 69 | amarelo | nenhum (só o aviso) |
| Muito doente | 0 a 29 | vermelho | o de hoje: nada devagar, "+" em cima dele |

- O **"+"** é um desenho de 7×7 pixels (uma cruz).
- **Tela de status (botão C):** a linha "Saúde" vira o "+" colorido mais o texto do status (cabe, a tela é larga).
  A linha "Estado" que existe hoje some, porque diz o mesmo.
- **HUD de indicadores (botão B):** a caixinha de SAÚDE mostra o rótulo e o "+" colorido, **sem barra e sem
  número**. O texto do status não cabe na caixinha (37 px).
- **Sobre o peixe:** o "+" aparece quando o status não é *saudável*, amarelo ou vermelho (hoje é laranja
  e só no *doente*).
- Os limites 70 e 30 ficam no `jogo.json` (`saude.niveis`), para o usuário ajustar. O 30 já existe
  (`doenteAbaixoDe`); o 70 é o mesmo limite que as regras usam para a saúde subir.

## 4. pH por cor

**Como é hoje:** valores 6,2 · 6,4 · 6,6 · 6,8 · 7,0 · 7,2 · 7,5 (começa em 7,0 e vai caindo com a sujeira;
"Regular pH" sobe um passo). As notas: 6,8 a 7,2 = ideal (100); 6,6 e 7,5 = aceitável (60); 6,4 = ruim (30);
6,2 = péssimo (0). A tela de status e o HUD mostram o número e a barra.

**Proposta (seguindo o sentido do usuário: amarelo = alcalino, azul = ácido):**

| pH | Faixa | Cor |
|---|---|---|
| 6,2 a 6,6 | ácido | azul |
| 6,8 a 7,2 | ideal | verde |
| 7,5 | alcalino | amarelo |

- Um quadradinho colorido (uma "gota" ou quadrado de 5×5) ao lado do número do pH; **o número fica**, porque o
  jogador precisa saber quanto falta para o "Regular pH" resolver.
- No HUD de indicadores (B), a barra do pH é trocada pelo quadrado colorido; na tela de status vai junto
  do texto "pH 7,0 - ideal".
- Aviso: no mundo dos testes de aquário o azul costuma ser alcalino e o amarelo ácido, ao contrário do
  seu pedido. **Fica como o usuário pediu**: é só um jogo, e o doc fica registrado assim.
- Com poucas cores livres na paleta (seção 5), são **3 faixas**, não um degradê contínuo. Um degradê de 5 a 7
  tons exigiria liberar espaço na paleta (ver pergunta 3).

## 5. Paleta

A paleta tem 244 cores e o limite é 248 (os índices 248 a 255 são dos moldes dos sprites). Hoje o HUD é
preto e branco com dithering (cores de interface passam pelo `mono.js`); cores sólidas precisam ser
índices em `COLORIDOS`, e na lista `SEM_TOM` da `luz.js` para a noite e a chuva não escurecerem.

Entram **4 cores sólidas novas**: verde, amarelo, vermelho e azul (o verde serve de saúde saudável e de pH
ideal; o amarelo, de saúde "doente" e de pH alcalino). **A paleta fica cheia (248).** Qualquer cor nova
depois disso (por exemplo um degradê de pH) exige liberar índices, por exemplo reduzindo os 7 degraus do
brilho da lâmpada ou juntando cores parecidas.

## 6. Arquivos e testes

- `core/fish.js`: `atualizarPeixe` ganha o parâmetro `abrigo` e o comportamento de esconder (quieto);
  funções puras para os testes.
- `core/rules.js` (ou `core/saude.js`): `statusDaSaude(saude, config)` → `'saudavel' | 'doente' | 'muitoDoente'`;
  `faixaDoPh(valor, config)` → `'acido' | 'ideal' | 'alcalino'`.
- `render/hud.js` (emblema do peixe e `FLOCO`/cruz), `render/indicadores.js` (caixinhas de saúde e pH),
  `render/telas.js` (tela de status), `render/palette.js` e `render/luz.js` (4 cores, fora do tom da luz).
- `main.js`: calcula o `abrigo` (pedra grande em coordenadas do mundo) e `planoDesejado = 'fundo'`.
- `config/jogo.json` (`saude.niveis`, `ph.faixas`, bloco `abrigoDaChuva` com os tempos e limites),
  `config/textos.json` (status "Saudável", "Doente", "Muito doente").
- Testes novos: status da saúde nos limites (29/30/69/70), faixa do pH nos 7 valores, comportamento do abrigo
  (vai, fica quieto, sai com a chuva parando, comida tem prioridade, morto ignora), emblema do peixe.
- Docs: `03` (seções 3 e pH), `04` (seção 8) e o `CLAUDE.md` quando fechar.

## 7. Perguntas para o usuário

1. **Escondido por inteiro ou espiando?** Recomendo **por inteiro**, atrás da pedra (é o "se escondendo"
   do pedido); os emblemas F e + continuam aparecendo. A outra opção é deixar a cauda ou uma parte do corpo
   para fora.
2. **Limites da saúde:** *saudável* de 70 a 100, *doente* de 30 a 69, *muito doente* de 0 a 29? Recomendo
   assim. O efeito no peixe (nadar devagar, etc.) fica só em *muito doente*, como hoje.
3. **pH em 3 faixas** (azul / verde / amarelo) e a paleta fica cheia? Recomendo **sim**: simples e cabe. Se
   quiser um degradê de verdade, eu libero espaço na paleta antes (um passo a mais).
4. **O "+" em cima do peixe** aparece também no amarelo (*doente*)? Recomendo **sim**, é o aviso antecipado.

## 8. Passos (feitos)

1. Núcleo: `statusDaSaude`, `faixaDoPh`, config e textos + testes.
2. Cores novas na paleta e fora do tom da luz.
3. Interface: o "+" colorido (HUD B, tela C, emblema do peixe) e o quadrado do pH.
4. Abrigo da chuva (`fish.js` + `main.js`) + testes.
5. Conferência no navegador (peixe escondido na chuva, "+" nos 3 estados forçados pelo painel, pH nos 7
   valores) e registro do resultado neste doc e no `CLAUDE.md`.

## 9. Resultado (19/11/2026, 630 testes, ainda sem tag)

O usuário respondeu "pode": ficaram as 4 recomendações da seção 7 (peixe totalmente escondido, limites 70 e 30,
pH em 3 faixas, cruz também no amarelo). O que **mudou em relação ao plano**:

- **Paleta (seção 5 estava errada).** O limite real é **247**, não 248: o `sprites.js` lança erro se a paleta
  chegar a 248, então só havia **3** índices livres, e 4 cores novas não cabiam. As 4 cores do status
  (`COR.STATUS`: verde, amarelo, vermelho, azul) **apontam para tons que já existem nas cores de peixe**
  (verde = nadadeira do peixe verde, amarelo = destaque do laranja, vermelho = nadadeira do beta, azul =
  nadadeira do azul). São sólidos e a luz não os escurece (já estão em `CORES_DO_PEIXE`). **A paleta continua
  em 244 cores, com 3 índices livres** (dá para um degradê de pH no futuro). Contrapartida: **se o usuário
  refizer os tons dos peixes, as cores do HUD mudam junto**; é só conferir o HUD depois.
- **pH na tela (passo intermediário, substituído; ver 9.1):** primeiro uma faixa colorida no HUD e um quadrado
  à direita com o nome da faixa na tela de status.
- **Tela de status:** a linha "Estado" saiu (a saúde já diz); morto aparece como "Morto" sem cruz. Sexo e parceiro
  subiram um pouco. O texto interno `estados.doente` virou "muito doente" (o estado interno "doente" é o de
  saúde abaixo de 30, que o jogador vê como *muito doente*).
- **Abrigo: zona alta da pedra (passo intermediário, depois substituído; ver 9.1).** A pedra (66×40 px) só passa de
  28 px de altura no meio. Primeiro fiz o peixe ficar parado no meio dessa zona; o usuário preferiu vê-lo se mexendo
  (9.1) e o código da zona foi removido. Ficou `abrigoDaChuva.alturaNoChaoPx` de 6 para **2**.
- **Passar para trás da pedra:** o plano só troca quando o peixe não toca a pedra (regra da v0.4, para ele não
  "pular"). Por isso o peixe que está na frente da pedra primeiro vai até a borda dela (de fora) e só então entra
  por trás (`alvoDoAbrigo`).

### O que foi feito
- `core/rules.js`: `statusDaSaude` (saudável ≥ 70, doente 30 a 69, muito doente < 30, morto) e `faixaDoPh`.
- `core/abrigo.js` (novo), `core/fish.js` (`atualizarPeixeAbrigado`, passo de movimento reaproveitado),
  `core/aquarium.js` (`atualizar(dt, agoraMs, ambiente)`, sorteio próprio do abrigo, a comida tem prioridade).
- `render/hud.js` (cruz 7×7 de braços de 3 px, emblema do peixe), `render/indicadores.js`, `render/telas.js`,
  `render/palette.js` (`COR.STATUS`), `render/profundidade.js` (`abrigoDaPedraGrande`),
  `main.js` (entrega a chuva e o lugar da pedra).
- `config/jogo.json`: `saude.saudavelAPartirDe` (70), `ph.faixas` (`acidoAte` 6,6; `alcalinoDe` 7,5) e o bloco
  `abrigoDaChuva`. `config/textos.json`: `status.saudeNiveis` e `status.phFaixas`.
- Testes: `tests/status.test.js` e `tests/abrigo.test.js` (novos) e ajustes em `hud.test.js` e
  `hud-indicadores.test.js`. Um teste de integração prova que o peixe da frente da pedra passa para trás dela e
  que o desenho mostra no máximo 10% dele.

### Conferido no navegador (servidor de teste na porta 8091)
- Chuva forçada: o peixe foi para o plano `fundo`, atrás da pedra, perto do chão (y 105 a 109; o chão é 113) e
  **não aparece na tela** (só o "+" amarelo em cima, quando está doente); sem chuva, sai e volta a passear.
- HUD (B): saúde 100, 50 e 20 deram cruz verde, amarela e vermelha (33 pixels de `#e85a4f` no vermelho); pH 6,4
  deu faixa azul, 7,0 verde e 7,5 amarela. Tela de status (C): "Saúde" com a cruz e o nome, "pH 7,0 - ideal" com
  o quadrado verde. Sem erros no console.

### Ainda não conferido à mão
- Muitos peixes juntos se escondendo na mesma chuva e a câmera andando durante a chuva (só pelos testes).
- A chuva automática (de 5 a 20 min) com o peixe se escondendo em tempo real.
- O visual da cruz e das cores é proposta minha: o usuário deve olhar e pedir ajustes (cores, tamanho da cruz,
  limites 70 e 30 em `jogo.json`).

### 9.1 Três ajustes pedidos depois de ver funcionando (19/11/2026) [fechado: pedido do usuário]

1. **Abrigo mais rápido e visível.** "O movimento do peixe quando se esconde precisa ser mais rápido; ele pode se
   movimentar perto da pedra para eu saber que ele está lá." Então o peixe não fica mais parado atrás da pedra:
   ele nada **2× mais rápido** (`abrigoDaChuva.velocidade`) e **vai e vem ao longo da largura da pedra**, ora
   escondido atrás dela, ora aparecendo nas pontas, sempre perto do chão (no máximo 2 + 4 px acima do mínimo). Esperas
   de 1 a 3 s entre um trecho e outro; cada trecho tem pelo menos 12 px (`passoMinimoPx`) para o movimento ser visto.
   O resto vale como antes (entra com a chuva acima de 0,5, sai de 3 a 8 s depois de ela ficar abaixo de 0,2, a
   comida tem prioridade, dá a volta pela borda da pedra para passar para trás dela). A "zona alta" da pedra foi
   removida do código. *Medido nos testes:* no meio da pedra aparece no máximo 15% do peixe; na ponta, pelo menos 30%.
2. **pH como "valor + quadradinho".** HUD (B): `PH 7,0` e um quadradinho de 5×5 na cor da faixa, numa linha só, sem
   barra. Tela de status (C): `pH 7,0` e o quadradinho logo depois; o texto da faixa (*ácido/ideal/alcalino*) saiu.
   As cores são as mesmas: azul (6,2 a 6,6), verde (6,8 a 7,2), amarelo (7,5).
3. **A cruz da saúde não acompanha o peixe.** Sobre o peixe fica só o **F** da fome. A cruz verde/amarela/vermelha
   existe só no HUD de indicadores (B) e na tela de status (C). Isso tira o aviso de peixe doente em cima dele; o
   peixe *muito doente* continua nadando devagar e pálido.

Conferido no navegador (porta 8091): com a chuva forçada o peixe foi e voltou pela pedra, aparecendo à esquerda e à
direita dela e sem cruz sobre ele; HUD com `PH 6,4` + quadradinho azul e `SAÚDE` + cruz vermelha; tela de status com
`pH 6,4` + quadradinho azul e a cruz com "Muito doente". 630 testes.
