# 06 · Página do celular

Legenda: **[fechado]** decidido pelo usuário · **[proposta]** sugestão a confirmar.

**Status: fechado em 2026-11-15** (todas as decisões da seção 8 foram aceitas). O design visual fica como etapa própria, depois do v0.5.

## 1. Princípio: função separada de visual [fechado]

A página é feita em três camadas independentes:

| Camada | O que é | Muda quando... |
|---|---|---|
| **Funções** | O que a página faz (seções 3 e 4) | o jogo ganha recursos |
| **Estrutura** | HTML: quais telas e botões existem e onde ficam | mudamos o layout |
| **Visual** | Um único `estilo.css`: cores, fontes, tamanhos, bordas | queremos **redesenhar** |

Assim, **trocar o design depois é mexer só no `estilo.css`** (e, se quiser outro layout, no
HTML). As funções e as regras do jogo não mudam. Cores e fontes ficam como variáveis no
topo do CSS (ex.: `--cor-fundo`, `--cor-botao`), então um redesign grande vira trocar uns
poucos valores.

Nesta primeira versão o visual é **simples e funcional**, pensado para o celular na vertical
e para toque (botões grandes). O design de verdade fica como etapa própria, depois.

## 2. Como o celular conversa com o aparelho

### Conexão [fechado: duas redes + QR code]

O ESP32 tem dois jeitos de ser alcançado:

| Modo | Quando | Como |
|---|---|---|
| **Rede de casa** | Aparelho e celular no mesmo WiFi | Celular abre `aquario.local` (ou o IP mostrado na tela do aparelho) |
| **Rede própria do aparelho** | Longe de casa, sem WiFi | O aparelho cria uma rede (ex.: `Aquario-XXXX`) e o celular entra nela; página em `192.168.4.1` |

- **QR code na tela do aparelho:** o menu mostra um QR que conecta o celular à rede do
  aparelho de uma vez, sem digitar senha. Depois abre a página.
- **Primeira configuração:** se o aparelho ainda não conhece o WiFi de casa, ele sobe a rede
  própria e a página tem uma tela para escolher o WiFi de casa e digitar a senha. Isso é feito
  uma vez só.
- O WiFi só liga quando necessário, para poupar bateria (ver `02-hardware.md`).
- **Limitação:** ligado na rede do aparelho, o celular fica sem internet por WiFi (usa o
  plano de dados). O aparelho também fica sem internet, então **sem clima e sem hora real**
  nesse modo.

### Hora pelo celular [fechado]

Ao abrir a página, o celular informa a hora ao aparelho. Isso resolve o "Tempo sem RTC"
(`02-hardware.md`) mesmo **sem internet**: basta abrir a página depois de ligar o aparelho,
que ele descobre quanto tempo ficou desligado. Vale como alternativa ao NTP.

### Mensagens entre página e aparelho [fechado]

A página pede dados e manda comandos por pedidos HTTP simples, em JSON:

| Pedido | Para que serve |
|---|---|
| `GET /api/estado` | Tudo que a página mostra: peixes, indicadores, clima, hora |
| `POST /api/comida` | Dar comida |
| `POST /api/limpar` | Limpar o aquário |
| `POST /api/ph` | Regular pH (sobe 1 passo) |
| `POST /api/peixes` | Adotar (espécie, cor, nome; ou parceiro) |
| `PUT /api/peixes/{id}` | Editar nome (e cor, se permitido) |
| `PUT /api/cenario` | Trocar cenário |
| `POST /api/hora` | Celular informa a hora |
| `PUT /api/wifi` | Salvar o WiFi de casa |

A página **pergunta o estado a cada ~5 segundos** (o jeito mais simples; não precisa de
conexão contínua).

**No simulador (Fase A):** a mesma página roda, mas em vez de chamar o aparelho ela chama
o `core` do jogo direto, por uma camada `Api` que tem a mesma forma. Na Fase B só trocamos
essa camada. Assim a página é escrita uma vez só.

## 3. Telas [fechado]

Navegação por uma barra embaixo, com 4 abas: **Aquário · Peixes · Adotar · Ajustes**.

### 3.1 Aquário (tela inicial)

```
+---------------------------+
| Aquário          ● online |
|---------------------------|
| Água                      |
|  Sujeira  [███░░░░░░] 30  |
|  pH       7,0       ideal |
|---------------------------|
| Peixes (2/5)              |
|  Nemo     Saudável        |
|    Fome  [██████░░░] 62   |
|    Saúde [█████████] 100  |
|  Filhote 1  Filhote       |
|    ! dar um nome          |
|---------------------------|
| [ Comida ] [ Limpar ] [pH]|
|---------------------------|
| Aquário Peixes Adotar Ajust|
+---------------------------+
```

- Mostra os três indicadores e a saúde de cada peixe (valores do `03-jogo.md`).
- Os três botões de ação ficam sempre à vista. Cada um confirma o que fez ("+60 de
  saciedade") e fica desabilitado quando não faz sentido (ex.: limpar com sujeira zero).
- Avisos no topo: peixe doente, reprodução em andamento, ovos eclodindo, filhote sem nome,
  frio ou chuva lá fora.

### 3.2 Peixes

- Lista dos peixes, com o contador **n/5**.
- Ao tocar em um: nome (editável), espécie, cor, **fase** (filhote, jovem, adulto, idoso),
  dia de vida (ex.: "dia 12 de 30"), saúde, saciedade e estado.
- O **sexo** aparece como "?" até o peixe ficar adulto (regra do `03-jogo.md`).
- Peixe morto: aparece como lembrança com a data por **24 h** e depois some [fechado].

### 3.3 Adotar

1. **Espécie**: na v1 só **beta** (guppy e neon entram depois).
2. **Cor**: paleta de opções.
3. **Nome**: até **12 caracteres**, e pode repetir [fechado].
4. Botão **Adotar** → chega um filhote (sexo sorteado e escondido).

Regras que a tela aplica:
- Com **5 peixes**, o botão fica desabilitado, com a explicação.
- **Adotar parceiro:** só aparece se houver um peixe adulto. O parceiro chega já adulto e
  do sexo oposto.
- **Game Over:** a tela mostra a mensagem de condolências e oferece adotar um novo filhote.

### 3.4 Ajustes

- **Cenário:** trocar entre os disponíveis. Começa com 1, com a opção já preparada [fechado].
- **WiFi de casa:** escolher a rede e a senha.
- **Cidade** para o clima.
- **Aparelho:** bateria, versão, "mostrar QR de novo".

## 4. O que fica fora da v1 [fechado]

- **Adicionar moradores** (camarão, caramujo) e tarefas de filtro/plantas: é backlog do
  `01-visao.md` (v2+). A página não mostra isso até existirem.
- **Outras espécies:** só beta na primeira versão.

## 5. Em que versão cada coisa chega [fechado]

| Versão | O que a página faz |
|---|---|
| v0.3 | Painel no simulador: adotar, nomear, espécie, cor (ainda sem cara de celular) |
| v0.5 | Telas completas no simulador, incluindo clima e hora |
| v1.1 | Servida pelo ESP32: conexão, QR code, WiFi, hora pelo celular |

O painel de testes do simulador (`05`, seção 6) é **separado** desta página: ele tem ajudas
de desenvolvimento (acelerar o tempo, forçar Game Over) que não existem no celular.

## 6. Limites do ESP32 [fechado]

- A página fica na memória flash (LittleFS) e deve ser **pequena** (meta: abaixo de 100 KB
  no total), sem frameworks e sem bibliotecas externas. O celular não pode depender da internet
  para carregar nada.
- O ESP32 atende poucos celulares ao mesmo tempo; para este projeto, **1 celular** basta.
- Texto e ícones simples (emoji ou SVG pequeno), sem imagens pesadas.

## 7. Segurança [fechado]

- Na **rede própria do aparelho**, a senha da rede protege (WPA2, senha gerada e mostrada no QR).
- Na **rede de casa**, qualquer aparelho conectado ao mesmo WiFi poderia abrir a página.
  Para um brinquedo isso costuma bastar, então na v1.1 **sem login**. Se virar problema,
  entra um PIN de 4 dígitos.

## 8. Decisões tomadas [fechado]

1. Conexão: duas redes (casa e rede própria do aparelho) + QR code.
2. Hora pelo celular: aceita como alternativa ao NTP.
3. Cores dos peixes: paleta fixa de poucas opções (as cores exatas dependem da arte, `04`).
4. Cenários na v1: só 1, com a troca já preparada.
5. Peixe morto: lembrança por 24 h.
6. Nome: até 12 caracteres, pode repetir.
7. Segurança: sem login na v1.1; PIN de 4 dígitos só se virar problema.
8. Design: etapa própria depois do v0.5.

## 9. Em aberto

- Cores exatas da paleta de peixes (definir com a arte).
- Visual final da página (etapa de design, depois do v0.5).
