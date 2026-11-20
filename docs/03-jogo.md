# 03 · Regras do jogo

Legenda: **[fechado]** decidido pelo usuário · **[proposta]** sugestão inicial, a ajustar jogando.

## 1. Ciclo de vida [fechado]

Vida natural: **30 dias reais**, em tempo real.

| Fase | Duração | Observação |
|---|---|---|
| Filhote | 5 dias | |
| Jovem | 10 dias | |
| Adulto | 12 dias | Desbloqueia adotar um parceiro e reproduzir |
| Idoso | 3 dias | Ao fim, morte natural |

Estados do peixe: **Saudável**, **Doente** e **Morto**.

## 2. Indicadores

Sujeira, pH e saúde são de 0 a 100. A saciedade é de **0 a 200** (veja abaixo).

### Fome / saciedade [fechado em 2026-11-19: escala 0 a 200 e comida em grãos]
- Por peixe. Vai de **0 a 200**. De 0 a 100 o peixe está "de boa" (100 = cheio); acima de 100 ele
  está comendo demais; **em 200 ele passa mal e fica doente na hora**.
- De 100 até 0 cai devagar: 100 pontos a cada ~48 h. **O excesso (acima de 100) é digerido bem
  mais depressa:** de 200 até 100 leva **5 horas** (`saciedade.horasParaDigerirExcesso`).
- Imprópria: saciedade abaixo de 30.
- **Dar comida:** joga **3 grãos** de cima, um depois do outro, no meio do que você está vendo. Os
  grãos caem **devagar** e os peixes vivos **vão atrás deles e comem, mesmo sem fome** (mais
  animados que no passeio). Cada grão comido dá **+7** de saciedade (pedido do usuário em
  2026-11-19): uma porção de 3 grãos vale **21**, e o peixe gasta ~50 por dia. Para manter a barra
  estável é preciso alimentar a cada 8 a 10 h (uma vez por dia é pouco). Passar de 100 não adoece:
  ele digere o excesso depressa (cada grão comido com ele já cheio só suja mais a água). Se achar
  apertado, os caminhos são mais grãos por porção (`comida.graos`) ou fome mais lenta
  (`saciedade.horasParaZerar`).
- A saciedade **só sobe quando o peixe come**, não na hora do botão.
- **A água suja DEPOIS de comer, aos poucos, nunca na hora** (pedido do usuário em 2026-11-19: não
  é realista a sujeira pular quando o peixe come). Cada grão comido vira uma "sujeira pendente" que
  só **começa a subir 5 segundos depois** de comer e vai entrando **bem devagar, ao longo de 6 horas
  de jogo**. Um grão normal rende **+1** de sujeira; comido com a saciedade já em 100 ou mais
  (**comer demais**), **+5**. O grão que ninguém come some depois de 20 s na areia e rende **+1**,
  do mesmo jeito. Jogar a comida não suja nada. A sujeira pendente é guardada no arquivo e também
  entra durante o tempo com o jogo fechado.
- **Passar mal** (pedido do usuário em 2026-11-19): só quem é empanturrado até **200** adoece: a
  saúde cai para logo abaixo do limite de doença. **A saúde só volta a melhorar quando a
  saciedade desce até 100** (enquanto estiver acima, fica parada). Como o excesso é digerido em 5 h,
  o peixe leva **uns 5 horas** para melhorar (5 h até chegar a 100 e uns 10 min para a saúde
  passar de 30), se a água estiver boa.
- Para a saúde, a **nota da saciedade** é a própria saciedade até 100 e depois **cai de volta**
  (150 vale 50, 200 vale 0): comer demais pesa como passar fome.
- Os grãos são só movimento em tempo real: não vão para o arquivo salvo.
- **Cocô** [fechado em 2026-11-19, só animação]: o peixe faz cocô **de vez em quando** (sorteio de 1 a 3
  minutos reais) e **10 segundos depois de comer** (a contagem recomeça a cada grão: uma refeição dá
  um cocô). Ele para por ~1 s, o cocô sai da cauda (cresce de 1 a 2 pixels), solta, cai devagar
  (7 px/s), fica 15 s na areia (piscando no fim) e some. **Não muda sujeira nem saúde** e não vai
  para o arquivo salvo. Números em `config.coco`.

### Sujeira da água [proposta]
- Do aquário. Sobe de 0 a 100 em ~4 dias.
- Cada peixe a mais acelera 25% o ritmo. Comer também suja, mas devagar e depois (veja "Fome / saciedade").
- Imprópria: acima de 70.
- Comida: ver "Fome / saciedade". A sujeira da comida entra aos poucos, 5 s depois de comer (mudou em
  2026-11-19; antes era +3 na hora de dar comida e +15 de uma vez em excesso).
- **Limpar aquário:** zera a sujeira.

### pH [proposta, faixa fechada]
- Valores possíveis: 6,2 · 6,4 · 6,6 · 6,8 · 7,0 · 7,2 · 7,5.
- Quanto mais suja a água, mais rápido o pH cai:
  - sujeira abaixo de 30: 1 passo a cada 36 h
  - sujeira entre 30 e 70: 1 passo a cada 24 h
  - sujeira acima de 70: 1 passo a cada 12 h
  - *(mudou em 2026-11-16: eram 18 / 12 / 6 h; com esses valores o peixe morria em 3 dias
    sem cuidado e exigia limpar e regular o pH a cada 2 dias. Ver `08-plano-v0.2.md`, seção 6.)*
- **Regular pH:** adiciona solução alcalina, que sobe 1 passo.
- Início do jogo: 7,0.

| pH | Nota |
|---|---|
| 6,8 · 7,0 · 7,2 | 100 (ideal) |
| 6,6 · 7,5 | 60 |
| 6,4 | 30 |
| 6,2 | 0 |

**Como o pH aparece na tela [fechado em 2026-11-19, pedido do usuário; faixas = proposta]:** "pH valor" e um
**quadradinho com a cor** da faixa (sem barra). Do **amarelo (alcalino)** ao **azul (ácido)**, passando pelo verde. São 3 faixas: **azul** de 6,2 a 6,6
(ácido), **verde** de 6,8 a 7,2 (ideal) e **amarelo** em 7,5 (alcalino). Limites em `jogo.json` (`ph.faixas`).
Detalhes em `12-plano-v0.6.md`.

### Tempo com o aparelho desligado [fechado em 2026-11-19]
O tempo em que o jogo ficou fechado ou desligado **conta**: ao voltar, o jogo compara a hora
em que foi salvo com a hora de agora e aplica esse tempo todo às regras (fome, sujeira, pH,
saúde, idade, morte). A tela mostra uma mensagem de boas-vindas, por exemplo "Seu peixe dormiu
por 5 h 20 min. Bem-vindo de volta!". Detalhes e números em `09-plano-v0.3.md`.

## 3. Saúde [fechado: pesos e limite de doença]

- Os três indicadores têm **peso igual**.
- **Média** = (nota da saciedade + (100 − sujeira) + nota do pH) / 3. A nota da saciedade vai de 0
  a 100 (veja "Fome / saciedade").
- A saúde (0 a 100) muda lentamente, conforme a média [proposta]:

| Média | Efeito na saúde |
|---|---|
| 70 ou mais | recupera 6 pontos por hora |
| 40 a 69 | estável |
| 15 a 39 | cai 3 pontos por hora |
| abaixo de 15 | cai 5 pontos por hora |

- Saúde abaixo de **30%**: o peixe fica **doente** (visual de doente, nada mais lento).
- Saúde em **0%**: o peixe **morre**.
- **O que o jogador vê [fechado em 2026-11-19, pedido do usuário; limites = proposta aceita]:** a saúde **não aparece
  como número**, e sim como um status com uma **cruz "+" colorida**: **saudável** (70 a 100, verde), **doente**
  (30 a 69, amarelo) e **muito doente** (abaixo de 30, vermelho). O efeito no peixe (nadar devagar, visual
  pálido) só vale em *muito doente*, como antes (o estado interno "doente" de cima é o *muito doente* da tela).
  A cruz aparece na tela de status e no HUD de indicadores (**não** acompanha o peixe: sobre ele fica só o F da
  fome). O número continua existindo por dentro e no painel de testes. Limites em `jogo.json` (`saude`). Ver `12-plano-v0.6.md`.
- Com média 0, o peixe leva cerca de 20 h para morrer. Isso protege os períodos longe de casa.
- Tempo com o aparelho desligado conta com um **teto máximo** (ver `02-hardware.md`).

## 4. Game Over [fechado]

Quando **não resta nenhum peixe** (por doença, velhice ou outro motivo), aparece a tela
de **Game Over** com uma **mensagem de condolências**. Depois ela oferece adotar um novo filhote.

Vale também para morte natural: se o único peixe chegar ao fim dos 30 dias sem ter
deixado descendentes, é Game Over.

## 5. Reprodução [fechado, salvo o que está marcado como proposta]

**Condições:**
- Dois peixes adultos, um macho e uma fêmea, da mesma espécie.
- **Saúde de ambos de pelo menos 90%.**
- Tempo mínimo em boas condições seguidas: 30 min [proposta].
- Intervalo mínimo entre reproduções do mesmo casal: 3 dias [proposta].

**Evento:**
1. Sinal sonoro de aviso e mensagem na tela.
2. Animação: os peixes se aproximam, aparecem corações, surgem **1 a 3 ovos** (sorteio).
3. Os ovos **eclodem em 1 hora** (tempo real) e nascem os filhotes.
4. O **sexo de cada filhote é sorteado**.
5. O filhote nasce com um nome provisório (ex.: "Filhote 1") até você dar o nome pelo celular.

## 6. Peixes e adoção

- Cada peixe tem: nome, espécie, cor, sexo, data de nascimento, saúde e fome.
- A espécie e a cor são escolhidas ao adotar, pelo celular.
- Primeira versão: apenas **beta**. Depois, guppy e neon.
- O **sexo do primeiro peixe é sorteado** na adoção e só é revelado quando ele fica adulto.
- O parceiro só pode ser adotado quando existir um peixe adulto.
- O parceiro é adotado **já adulto e do sexo oposto** ao do peixe que vai formar o casal.
- **Limite de 5 peixes** no aquário no total (adultos e filhotes). Com 5, não dá para adotar
  e a reprodução fica bloqueada até abrir vaga.

## 7. Cenário e clima [fechado]

- **Frio:** temperatura abaixo de **18 °C** mostra o ícone de frio.
- **Chuva:** relâmpagos e animação de chuva na superfície da água.
- O clima não afeta a saúde do peixe.
- **Peixe se abriga da chuva [fechado em 2026-11-19, pedido do usuário]:** quando chove, o peixe vai depressa para
  perto da pedra grande, rente ao chão, e fica indo e vindo ao longo dela (às vezes atrás, às vezes aparecendo nas
  pontas), para o jogador ver que ele está ali. Sai pouco depois que a chuva passa. É só animação (não muda fome, saúde nem pH). A comida tem prioridade. Ver `12-plano-v0.6.md`, seção 2.
- Calor: sem regra por enquanto.

## 7.1 Minigame "Caçar" (v0.8)

Menu > **Caçar**: 1 minuto caçando larvas com o peixe em foco (joystick nada, **B** acelera, **A** pausa). É só
diversão: **não mexe em fome, saúde nem sujeira**. Só caça peixe saudável e fora do namoro. Recorde único salvo no
arquivo. Detalhes e números em `14-plano-v0.8.md`.

## 8. Em aberto

1. Os números das seções 2 e 3 são valores iniciais; serão ajustados testando no aparelho.

**Decididas em 2026-11-19 (plano da v0.4, `10-plano-v0.4.md`):**
- **Casal** é o que se forma **ao adotar o parceiro**: cada peixe tem no máximo **um** parceiro.
  Filho não forma casal sozinho (adota-se um parceiro para ele). Se um dos dois morre, o que sobrou
  fica livre para ganhar outro parceiro.
- **Só adulto reproduz** (idoso não). A saúde mínima de 90 de ambos precisa durar 30 minutos
  seguidos; se qualquer um cair abaixo de 90, a contagem volta a zero. O primeiro namoro não
  espera os 3 dias.
- **Limite de 5** = peixes **vivos + ovos** ainda não eclodidos. A ninhada sorteada (1 a 3) é
  **cortada pelo que cabe**; com 5, a reprodução espera abrir vaga.
- O **filhote** tem a cor de **um dos pais** (sorteio) e sexo sorteado; nome "Filhote 1",
  "Filhote 2"... até ser renomeado.
- **Peixe morto**: "Limpar" o retira; se ninguém limpar, ele é **retirado 1 minuto depois** de morrer (tempo de boiar até a superfície; o usuário pediu em 19/11/2026 que o morto saia do aquário, no lugar das 12 h do plano). Avisa "Fulano morreu" na tela.
  Morto não conta no limite de 5.
- **Ovos seguram o Game Over**: só é Game Over sem peixe vivo **e sem ovo**.
- O **sexo** só aparece em texto (tela de status e painel), quando o peixe vira adulto.
- O simulador não tem som; o aviso da reprodução é um evento (buzzer no ESP32).
