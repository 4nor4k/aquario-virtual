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

Os indicadores são de 0 a 100, onde 100 é o ideal.

### Fome / saciedade [proposta]
- Por peixe. Cai de 100 para 0 em ~48 h.
- Uma refeição por dia mantém o peixe bem; duas também.
- Imprópria: saciedade abaixo de 30.
- **Dar comida:** +60 de saciedade (máx. 100) e alimenta todos os peixes.
- Excesso de comida (saciedade acima de 80 ao alimentar) suja a água.

### Sujeira da água [proposta]
- Do aquário. Sobe de 0 a 100 em ~4 dias.
- Cada peixe a mais acelera 25% o ritmo; dar comida sobe a sujeira um pouco.
- Imprópria: acima de 70.
- **Limpar aquário:** zera a sujeira.

### pH [proposta, faixa fechada]
- Valores possíveis: 6,2 · 6,4 · 6,6 · 6,8 · 7,0 · 7,2 · 7,5.
- Quanto mais suja a água, mais rápido o pH cai:
  - sujeira abaixo de 30: 1 passo a cada 18 h
  - sujeira entre 30 e 70: 1 passo a cada 12 h
  - sujeira acima de 70: 1 passo a cada 6 h
- **Regular pH:** adiciona solução alcalina, que sobe 1 passo.
- Início do jogo: 7,0.

| pH | Nota |
|---|---|
| 6,8 · 7,0 · 7,2 | 100 (ideal) |
| 6,6 · 7,5 | 60 |
| 6,4 | 30 |
| 6,2 | 0 |

## 3. Saúde [fechado: pesos e limite de doença]

- Os três indicadores têm **peso igual**.
- **Média** = (saciedade + (100 − sujeira) + nota do pH) / 3.
- A saúde (0 a 100) muda lentamente, conforme a média [proposta]:

| Média | Efeito na saúde |
|---|---|
| 70 ou mais | recupera 6 pontos por hora |
| 40 a 69 | estável |
| 15 a 39 | cai 3 pontos por hora |
| abaixo de 15 | cai 5 pontos por hora |

- Saúde abaixo de **30%**: o peixe fica **doente** (visual de doente, nada mais lento).
- Saúde em **0%**: o peixe **morre**.
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
- Calor: sem regra por enquanto.

## 8. Em aberto

1. Os números das seções 2 e 3 são valores iniciais; serão ajustados testando no aparelho.
2. Se há 5 peixes e nasce uma ninhada de 3, os ovos que passam do limite não eclodem
   (proposta) ou a reprodução já nem acontece (mais simples; é o que está na seção 6).
3. O peixe que já formou casal pode ter um segundo parceiro? (a decidir mais tarde)
