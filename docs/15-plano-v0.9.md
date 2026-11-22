# 15 · Plano da v0.9 (jogo no GitHub, jogável no celular)

**Status (20/11/2026): código pronto e testado no navegador (774 testes); falta PUBLICAR (ligar o GitHub Pages) e testar no
celular de verdade.** A seção 5 foi respondida pelo usuário e a seção 7 tem o resultado. O que o usuário pediu está marcado
**[fechado]**; o que eu completei está marcado **[proposta]**.

## 1. O que o usuário pediu [fechado]

- Levar o jogo para o **GitHub**, numa **página web** que ele acessa pelo **celular**.
- A página deve **imitar um dispositivo de minigame**:
  - a **tela do jogo na parte de cima**;
  - embaixo, o **analógico** e os **botões** (A, B e C do aparelho).

## 2. Como as peças de hoje se encaixam

- O simulador já é **JavaScript puro e roda no navegador**; só falta um servidor porque hoje o jogo salvo e os arquivos
  `config/*.json` passam por `node servidor.js`. O GitHub Pages só serve **arquivos prontos** (sem Node, sem `/api/salvo`).
- O que depende do servidor e precisa mudar:
  - **Salvamento:** hoje grava em `sim/saves/aquario.json` por `/api/salvo` (`sim/src/sim/armazenamento.js`). Na página
    passa a gravar no **navegador do celular** (`localStorage`). O formato do arquivo (`core/salvar.js`) não muda.
  - **Ponte do celular** (`ponte.js`, página `web/`): não faz sentido na página. Fica desligada lá (o próprio celular **é** o aparelho).
  - **Painel de testes** (tempo 60×/3600×, editar valores): some na versão do celular (continua no PC).
- O que já funciona sem mudança: o `core/` não conhece DOM nem servidor, a tela é um quadro de 120×120 e o teclado
  já traduz para "joystick + botões" (`input/keyboard.js`): é só acrescentar **toque** como outra fonte da mesma coisa.

## 3. Como seria [proposta]

### 3.1 O visual do "aparelho"

```
┌────────────────────────┐
│  ┌──────────────────┐  │
│  │                  │  │   tela 120×120, ampliada em número inteiro
│  │      (jogo)      │  │   (nítida, sem borrar), no topo
│  │                  │  │
│  └──────────────────┘  │
│                        │
│    (  analógico  )     │   à esquerda: analógico na tela
│        ◯        C      │   à direita: botões A e B, e o C
│                  B  A  │
└────────────────────────┘
```

- **Celular em pé (retrato)**: tela em cima, controles embaixo. Em paisagem a tela ficaria à esquerda e os controles ao lado (opcional).
- **Analógico:** um disco que se arrasta com o dedo; a direção vira o mesmo `{x, y}` do joystick (hoje -1/0/1; o disco
  pode dar 8 direções para ficar igual ao teclado e ao ESP32, ou valor contínuo, que combina com a caçada). [Dúvida 2]
- **Botões A, B e C** grandes, com **multitoque** (segurar B e mexer o analógico ao mesmo tempo, como na caçada).
- Sem rolagem, sem zoom por toque duplo, sem seleção de texto, sem menu de pressão longa; tela cheia no que der.
- O visual do aparelho (cor da carcaça, formato) é **proposta minha** e ele ajusta depois, como foi com a página do celular.

### 3.2 Publicação

- Repositório no GitHub e **GitHub Pages**, publicado por uma **Action** a partir da pasta `sim/` (o Pages comum só publica a raiz ou `/docs`).
- Endereço do tipo `https://<usuario>.github.io/<repositorio>/`. Funciona em qualquer celular, sem instalar nada.
- **"Adicionar à tela inicial"** (PWA simples: um `manifest` e um ícone) deixa abrir em tela cheia, como um aplicativo. [Dúvida 3]

### 3.3 Cuidados com o jogo no celular

- **O tempo só anda com a página aberta e visível** (limite que o simulador já tem). O que a v0.3 já resolve: ao voltar, o tempo fechado
  conta inteiro (hora real do celular), e aparece "Seu peixe dormiu por X". Ou seja, o peixe **continua precisando de cuidado
  mesmo com o celular no bolso** (e pode morrer num fim de semana, como já é hoje).
- **Salvamento no navegador:** se ele limpar os dados do site, perde o jogo. Pode haver um botão **exportar/importar** o arquivo salvo
  (o formato já é um JSON simples). [Dúvida 4]
- A hora do dia e o clima (v0.5) usam o relógio do celular, que já é o que se quer.
- Sem som no simulador (o buzzer é do ESP32).

## 4. Passos prováveis

1. Fechar este plano (seção 5) e criar o repositório.
2. Camada de **entrada por toque** (analógico + A/B/C com multitoque) alimentando as mesmas funções do teclado, com testes.
3. **Salvamento no navegador** (`armazenamento` com `localStorage`), mantendo o servidor para o PC.
4. Página do aparelho (`index` do celular): moldura, tela ampliada, controles; painel de testes escondido.
5. Publicação (Action do Pages) e teste **no celular dele**.
6. Docs (resultado aqui, `06`, `CLAUDE.md`, memória), commit e tag `v0.9`.

## 5. Decisões (respondidas em 20/11/2026) [fechado]

- **1. Repositório público:** sim. Já publicado em `https://github.com/4nor4k/aquario-virtual` (54 commits e tags `v0.1` a `v0.8`;
  o autor dos commits foi trocado para o e-mail anônimo `...@users.noreply.github.com` antes do envio). **Ligar o GitHub Pages
  (publicar a página do jogo) ainda pede um novo sim explícito, quando a página estiver pronta.**
- **2. Analógico:** **contínuo** (a posição do dedo vira um valor de -1 a 1, com zona morta pequena).
- **3. PWA:** **sim** ("Adicionar à tela inicial", tela cheia).
- **4. Exportar/importar o jogo salvo:** **sim**.
- **5. Conta:** `4nor4k`, repositório `aquario-virtual`, `gh` logado neste PC (a conta `KatyJu` também está no `gh`, inativa).

### Perguntas originais (para registro)

1. **O repositório vira público?** O GitHub Pages **gratuito exige repositório público**: qualquer pessoa com o link vê o código e
   os docs. Aceita? (Alternativa: página em outro lugar, ou plano pago do GitHub.) **Preciso de um sim explícito antes de publicar qualquer coisa.**
2. **Analógico:** 8 direções (igual ao teclado e ao aparelho de verdade) ou **contínuo** (mais suave)? **Recomendo contínuo** no toque,
   mas depois de testar no celular.
3. **PWA** ("Adicionar à tela inicial", tela cheia)? **Recomendo sim,** é pouco trabalho.
4. **Exportar/importar o jogo salvo** na página? **Recomendo sim** (protege do "limpar dados do navegador").
5. Qual **nome de usuário/repositório** no GitHub? (O nome do projeto ainda é provisório: "Aquário".) E já existe uma conta e o `gh` logado neste PC?

## 6. Fora desta versão

Placar online, ranking, vários jogadores, notificação com o celular bloqueado (página não consegue rodar em segundo plano),
som, instalar como app da loja. A página do celular que **controla o aparelho ESP32** (v0.7, `web/`) continua sendo outra coisa e só
faz sentido com o hardware.

## 7. Resultado (20/11/2026)

**Entregue (código pronto, 774 testes passando, conferido no navegador; ainda sem commit de tag, sem publicar):**

- **Página do aparelho** `sim/aparelho.html` + `sim/estilo-aparelho.css`: tela em cima (ampliada em número **inteiro** de vezes, contando
  pixels reais do celular, `tamanhoDaTela`), **analógico à esquerda** (disco com bolinha), **botões A, B e C à direita**, engrenagem "⋯"
  para as Opções. Em pé: tela em cima e controles embaixo. **Deitado:** analógico | tela | botões. Sem rolagem, sem zoom, sem menu de segurar.
  Todas as cores, formas e tamanhos ficam no CSS (variáveis no topo): a aparência é **[proposta]** minha, para o usuário ajustar.
- **Entrada por toque** `sim/src/input/toque.js` (lógica sem navegador + ligação por eventos de ponteiro, com **multitoque**: cada dedo
  tem seu número, então dá para segurar B e mexer o analógico) e `combinar.js` (teclado + toque valem juntos, inclusive no PC).
  Analógico **contínuo** (decisão 2): zona morta de 15%; o menu recebe "apertos" de seta com histerese (aperta ao passar de 60%, só aperta de
  novo depois de cair abaixo de 40%). Na caçada o analógico muda só o **ângulo** do nado (o jogo já normaliza a velocidade); na câmera a
  velocidade acompanha o quanto se empurra.
- **Salvamento no navegador** `sim/src/sim/armazenamento-local.js` (`localStorage`, mesma interface do armazenamento do servidor; mesmo
  formato de arquivo). O `main.js` escolhe pelo `data-modo="aparelho"` do `<body>`: no aparelho não há painel, nem ponte, nem servidor.
  O simulador do PC (`index.html`) continua igual e foi reconferido.
- **Exportar / importar / apagar o jogo** (Opções): `sim/src/sim/backup.js` + `aparelho-ui.js`. Exportar baixa `aquario-AAAA-MM-DD.json`;
  importar confere o arquivo inteiro antes de aceitar (vazio, não-JSON, versão errada, campo estragado, grande demais: recusa com o
  motivo e **não toca no jogo atual**); apagar pede **dois toques** (sem janelinha de confirmação). Ao importar o `main.js` bloqueia o
  salvamento antes de recarregar: sem isso o "salvar ao sair" gravaria o jogo de agora por cima do importado.
- **PWA** (decisão 3): `manifest.webmanifest`, ícones `icones/icone-180/192/512.png` (peixinho em pixel art, gerado por `node tools/icones.js`;
  provisório, é só trocar os PNGs) e `sw.js` (service worker "rede primeiro": instala na tela inicial e abre **sem internet**; só registra
  em https, então nos testes locais nunca pega cópia velha).
- **Publicação:** `sim/tools/montar-site.mjs` monta a pasta do site (só o que a página precisa; `aparelho.html` vira o `index.html`; nunca
  inclui `saves/`, servidor, testes, `web/` nem o painel; recusa uma pasta de destino que já tenha arquivos) e
  `.github/workflows/pages.yml` roda os testes e só publica se todos passarem.
- Servidor do simulador passou a entregar `.webmanifest` com o tipo certo.

**Propostas minhas (a confirmar):**

- **Importar um backup não conta o tempo passado desde a cópia**: `salvoEmMs` vira "agora" (o jogo conta o tempo com a página fechada, doc 09;
  se contasse, quem trocasse de celular uma semana depois acharia o peixe morto). Testado no navegador com um backup de 7 dias: peixe vivo e
  saudável. Efeito colateral: dá para "voltar atrás" importando um backup velho (jogo de um jogador só, sem ranking: não é problema).
- O texto das Opções e dos avisos fica no HTML e no `aparelho-ui.js` (não no `textos.json`: esse é só do que o display desenha com a fonte de pixels).
- A engrenagem fica embaixo no meio (em pé) ou no canto de cima à direita (deitado), para nunca cobrir a tela.

**Testado no navegador (porta 8092 e um "Pages simulado" na 8093 que serve só arquivos estáticos, como o Pages):** arrastar o analógico
escolhe a cor (uma passada = um passo); A adota; o jogo volta do `localStorage` depois de recarregar; Opções abrem; exportar gera o arquivo
certo; as 3 importações inválidas mostram o motivo e não mexem no jogo; a importação válida recarrega com o nome novo e o peixe vivo; apagar
pede dois toques e volta à adoção; o site montado não faz nenhum pedido a `/api` e não dá erro no console; teclado continua funcionando.

**Não testado (precisa de celular de verdade):** multitoque real (B segurado + analógico na caçada; os testes automáticos cobrem a lógica com
elementos falsos), tamanho da tela e posição dos controles em celulares de verdade, "Adicionar à tela inicial" (PWA), service worker em https,
download do arquivo de backup no celular, funcionar com o celular bloqueado (não funciona: a página não roda em segundo plano).

### 7.1 Para publicar (ainda NÃO feito: precisa de um "sim" explícito do usuário)

1. Commitar e enviar (`git push`) a v0.9 para `github.com/4nor4k/aquario-virtual` (conta `4nor4k` ativa no `gh`).
2. Ligar o Pages com a fonte "GitHub Actions" (Settings > Pages, ou `gh api -X POST repos/4nor4k/aquario-virtual/pages -f build_type=workflow`).
3. A Action roda sozinha a cada envio para `main`; o endereço será `https://4nor4k.github.io/aquario-virtual/`.
4. Conferir na aba Actions que os testes e a publicação passaram (as versões das actions no `pages.yml` são as que eu conheço: se o GitHub
   avisar que alguma está velha, é só subir o número).
5. Abrir no celular, jogar, instalar na tela inicial e conferir a seção "Não testado" acima. Depois disso: tag `v0.9`.

## 8. Mudança de estética (22/11/2026, pedido do usuário)

O usuário pediu, antes de enviar a v0.10 ao GitHub: **botões do PlayStation** (X, Quadrado, Bolinha e Triângulo), **carcaça escura em tons de cinza texturizada**,
mantendo o relevo, e o **analógico no estilo de duas fotos de referência** (prato côncavo cinza). Feito só em `aparelho.html`, `estilo-aparelho.css` e `aparelho-ui.js`:
- **Losango do PlayStation:** Triângulo em cima, Quadrado à esquerda, Bolinha à direita, X embaixo. **[proposta]** o mapa para o jogo segue o costume do PlayStation:
  **X = A** (abre o menu e confirma), **Bolinha = B** (volta; acelera na caçada), **Triângulo = C** (status). O **Quadrado não faz nada ainda**
  (o jogo tem 3 funções); é só dar uma função quando quiser. Os ids no código continuam `botao-a/b/c` (o quadrado é `botao-d`).
- **Cinza com grão:** um ruído fino (SVG em `--grao`) sobre degradês cinza na carcaça, na placa, na moldura e nas Opções. Todas as cores estão no topo do CSS.
- **Símbolos gravados** em tom escuro sobre a borracha (como na foto); para colorir como no PlayStation (azul, vermelho, verde, rosa) é trocar `--simbolo`.
- **Analógico:** encaixe cinza e um prato côncavo grande com borda fina; o prato anda 28% do tamanho dele (`aparelho-ui.js`).
- **Não mudou:** o ícone do aplicativo e as cores do `manifest` (ainda azul-grafite) e os **textos dentro do jogo**, que ainda dizem "A:", "B:" e "C:".
