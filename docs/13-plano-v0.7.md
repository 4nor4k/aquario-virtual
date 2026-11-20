# 13 · Plano da v0.7 (a página do celular)

Escrito em 19/11/2026. **Status: implementado em 19/11/2026 (o usuário disse "pode" e aceitou as recomendações da seção 8).
Testado no celular de verdade em 20/11/2026 (seção 9.2): tudo funcionou. Tag `v0.7`.**
Legenda: **[fechado]** decidido pelo usuário (inclusive em docs anteriores) · **[proposta]** sugestão minha, a confirmar.

## 1. O que o usuário pediu [fechado]

"Construir a aplicação que rodará no mobile para interagir com o ESP32." Isso é a **página do celular** do
`06-web.md` (HTML servido pelo próprio ESP32, aberta no navegador do celular; não é um app instalado).
As telas, a API e as regras de segurança já estão **fechadas no `06`** e não mudam aqui.

Sobre como testar antes de ter o ESP32, o usuário escolheu (19/11/2026): **celular de verdade via WiFi de casa**,
com o servidor do simulador fazendo o papel do ESP32.

## 2. A ideia em um desenho [fechado: escolha do usuário]

```
  Hoje (v0.7, simulador)                          Depois (v1.1, hardware)

  [Celular]  --WiFi-->  [servidor.js no PC]       [Celular]  --WiFi-->  [ESP32]
   página web             |   ^                    mesma página          mesmos pedidos /api/...
                          v   |                    mesmos pedidos
                  [aba do jogo no navegador]
```

- A **página é a mesma** nos dois casos e fala só em pedidos HTTP (`GET /api/estado`, `POST /api/comida`...,
  tabela do `06`, seção 2). Na Fase B troca quem responde: o ESP32 no lugar do `servidor.js`.
- **Por que uma "ponte"?** O jogo do simulador roda **dentro da aba do navegador** do PC (`main.js`), não
  no servidor, então o celular não consegue falar com ele direto. O servidor fica no meio: guarda o último
  retrato do jogo (que a aba envia) e passa os comandos do celular para a aba executar.
  Se a aba do jogo estiver fechada, a página do celular mostra "aparelho desligado" (bom teste do estado offline).

## 3. Peças novas

| Peça | Onde | O que faz |
|---|---|---|
| `core/estado-api.js` | `sim/src/core/` | Função pura que monta o JSON do `GET /api/estado` a partir do aquário. Sem navegador, testável no Node, vira C++ depois. |
| Ponte | `sim/servidor.js` | Guarda o retrato, enfileira comandos, responde ao celular. Só para o simulador. |
| Cliente da ponte | `sim/src/sim/ponte.js` + ligação no `main.js` | A aba envia o retrato (a cada 1 s) e busca comandos (a cada 0,5 s), executa e devolve o resultado. |
| A página | `web/` (raiz do projeto, como no `05`) | `index.html`, `estilo.css`, `app.js` (telas), `api.js` (pedidos HTTP). |

Cada comando do celular chama **as mesmas funções que os botões do aparelho já usam** (comida, limpar, pH,
adotar, adotar parceiro, renomear). Nenhuma regra nova é escrita: o celular é só outra "mão" no jogo.

### 3.1 Como a página é servida [proposta]

- No simulador: `http://IP-DO-PC:8080/app/` (o servidor serve a pasta `web/` nesse caminho).
- No ESP32: `http://aquario.local/` (mesma pasta, gravada na flash).
- A página usa caminhos **relativos** para os próprios arquivos e **`/api/...` absoluto**, então funciona nos dois sem mudar.

## 4. O que o `GET /api/estado` devolve [proposta]

Tudo que as 4 telas precisam, em um só pedido (a página repete a cada ~5 s, `06`):

- `ligado`: o aparelho respondeu? (a ponte devolve `false` com aviso se a aba sumiu)
- `fase_do_jogo`: `jogando` | `adocao` (sem peixe ainda) | `gameover`
- `agua`: sujeira (0-100), pH (valor + faixa `acido`/`ideal`/`alcalino`)
- `peixes[]` (até 5): id, nome, espécie, cor, fase, dia de vida (e "de 30"), sexo (`null` até adulto),
  saúde como **status** (`saudavel`/`doente`/`muito doente`, igual à v0.6) e saciedade, estado, avisos do peixe
- `vagas`, `limite` (5), `podeAdotarParceiro`
- `clima`: hora do dia, chovendo, temperatura, frio
- `avisos`: lista de textos do topo (peixe doente, ovos, filhote sem nome, frio/chuva), vindos de `textos.json`
- `cores`: as 6 cores de beta disponíveis para adotar

Os **textos** continuam em `config/textos.json`, não dentro do código da página.

## 5. Telas [fechado no `06`; detalhes visuais são proposta]

4 abas embaixo: **Aquário · Peixes · Adotar · Ajustes**, como no `06`, seção 3.

- **Aquário:** sujeira (barra), pH (valor + quadradinho de cor, igual ao aparelho), cada peixe com saúde
  (cruz colorida) e fome (barra), avisos no topo, botões **Comida / Limpar / pH** sempre à vista, desabilitados
  quando não fazem sentido, e cada um confirma o que fez ("Comida servida").
- **Peixes:** lista com n/5; tocar abre nome (editável, até 12 letras, só caracteres que a fonte do aparelho
  desenha), fase, dia de vida, sexo "?" até adulto, saúde, saciedade.
- **Adotar:** 6 cores, nome, botão Adotar; **Adotar parceiro** só com adulto; desabilitado com 5 peixes; no
  Game Over mostra a condolência e oferece novo filhote.
- **Ajustes:** no simulador mostra o que existe (versão, estado da conexão). **WiFi de casa, cidade e bateria
  aparecem desabilitados com "disponível no aparelho"** [proposta]: só fazem sentido com o ESP32 de verdade.
- **Saúde no celular:** mostrada como status colorido, não número, para ficar igual ao aparelho (v0.6) [proposta].
  O `06` desenhava uma barra de saúde: troco por isso e atualizo o `06`.
- **Visual:** simples e funcional, vertical, botões grandes (`06`, seção 1). Todo o visual em `estilo.css`,
  cores como variáveis no topo. O design de verdade fica como etapa própria depois.
- **Limite:** meta de **menos de 100 KB** no total, sem frameworks, sem nada vindo da internet (`06`, seção 6).

## 6. Segurança do servidor (importante) [proposta]

Hoje o `servidor.js` escuta só no próprio PC (`127.0.0.1`) e recusa qualquer outro nome de host. Para o celular
entrar, precisa abrir para a rede de casa. Para não expor o resto:

1. **Desligado por padrão.** Só abre para a rede quando você inicia com `REDE=1 node servidor.js`
   (o jeito normal, sem `REDE`, continua igual a hoje).
2. Na rede, o celular só alcança **a página (`/app/`) e a API do celular** (`/api/estado`, comandos).
   O **salvamento** (`/api/salvo`), a **ponte** (usada pela aba do jogo) e a pasta `sim/` continuam **só do PC**.
3. Só aceita origem da **rede privada** (192.168.x.x, 10.x, 172.16-31.x): nada de fora.
4. Sem login, como o `06` fecha para a v1.1. Quem estiver no seu WiFi poderia abrir a página enquanto o
   servidor estiver em modo rede; é só para testar em casa.
5. **Windows:** na primeira vez, o firewall vai perguntar se o Node pode usar a rede. Precisa permitir
   em **rede privada** (eu explico passo a passo na hora).
6. O celular e o PC precisam estar no **mesmo WiFi** (alguns roteadores têm "isolamento de clientes" que
   impede; se acontecer, eu mostro como conferir).

## 7. Passos e testes

| # | Passo | Como confirmo |
|---|---|---|
| 1 | `core/estado-api.js` + testes | `node --test`: estado em adoção, jogando, doente, Game Over, 5 peixes, sexo oculto |
| 2 | Ponte e modo rede no `servidor.js` + testes | testes com servidor em pasta temporária: celular lê estado, manda comando, aba offline devolve "desligado", rotas só-do-PC recusam IP de fora |
| 3 | Cliente da ponte no `main.js` | no navegador, em outra porta (o servidor do usuário na 8080 não é tocado) |
| 4 | Página `web/` (4 abas) | no navegador em tamanho de celular, com o jogo aberto em outra aba |
| 5 | Teste no celular de verdade | **você** abre no celular e confere; eu preparo o roteiro |
| 6 | Docs: resultado aqui, ajuste no `06`, `CLAUDE.md`, memória; commit e tag `v0.7` | |

Ficam **fora** desta versão: WiFi/cidade/bateria reais, QR code, rede própria do aparelho, hora pelo celular
(o simulador usa a hora do PC), cenário extra, PIN. Tudo isso é do v1.1 com o hardware.

## 8. Para você confirmar

1. A **ponte** pelo `servidor.js` (seção 2) e o **modo rede só com `REDE=1`** (seção 6)? **Recomendo sim.**
2. **Saúde como status colorido** no celular, e não barra com número (seção 5)? **Recomendo sim**, fica igual ao aparelho.
3. **Ajustes** com WiFi/cidade/bateria desabilitados por enquanto (seção 5)? **Recomendo sim.**
4. Visual simples agora e design depois (já era o combinado). **Mantido.**

## 9. Resultado

Passos 1 a 4 e 6 feitos; **674 testes passando** (eram 630). Conferido no navegador (porta 8091, jogo numa aba e a
página em outra): adotar com cor e nome, comida, pH, renomear (corta em 12 letras), página sem o jogo aberto
("desconectado", botões desabilitados), volta sozinha quando a aba do jogo volta, e sem rolagem lateral em 360 px.
A página inteira pesa **30 KB** (meta: 100 KB).

### 9.1 O que foi construído

| Peça | Arquivo | Observação |
|---|---|---|
| Retrato do jogo | `sim/src/core/estado-api.js` | `montarEstado`: puro, sem navegador. Códigos (`muitoDoente`, `adulto`...) e avisos já em texto. |
| Comandos | `sim/src/core/comandos-api.js` | `executarComando`: usa `menu.executar`, `menu.adotarParceiro`, `aquario.renomear`. Nenhuma regra nova. |
| Ponte (servidor) | `sim/celular.js` + `sim/servidor.js` | Retrato, fila de comandos, "online" por 4 s, espera de até 4 s pela aba (senão 504). |
| Ponte (aba do jogo) | `sim/src/sim/ponte.js` + `main.js` | A cada 0,5 s; com comando na fila, devolve o resultado na hora. |
| A página | `web/` (`index.html`, `estilo.css`, `api.js`, `app.js`) | Servida em `/app/`. Só `api.js` sabe falar com o aparelho. |
| Textos | `sim/config/textos.json`, seção `celular` | avisos e erros; a página busca o arquivo todo em `GET /api/textos`. |

- `sexoRevelado` saiu de `render/telas.js` para `core/fish.js` (o core não pode importar o desenho); `telas.js` reexporta.
- **Rotas do celular** (as do `06`): `GET /api/estado`, `GET /api/textos`, `POST /api/comida|limpar|ph`, `POST /api/peixes`
  (`{cor, nome}` ou `{parceiroDe, cor, nome}`), `PUT /api/peixes/{id}` (`{nome}`), `POST /api/hora` (o simulador ignora),
  `PUT /api/wifi` e `PUT /api/cenario` (501: só no aparelho). `GET /api/textos` é novo (não estava no `06`).
- **Adotar filhote só no começo e depois do Game Over** (mesma regra do painel); com jogo em andamento a aba Adotar
  oferece só o **parceiro**, para um adulto sem parceiro e com vaga. O `06` não deixava isso claro [proposta minha].
- **Segurança (seção 6):** `REDE=1 node servidor.js` abre para a rede de casa (escuta em `0.0.0.0` e mostra os endereços).
  Sem `REDE` nada muda (só `127.0.0.1`). Com `REDE`, quem vem da rede só vê `/app/` e as rotas do celular; o resto (jogo
  salvo, ponte, `sim/`) dá 403. Só IPs de rede privada, e o nome no endereço precisa ser um IP (nada de nome de site).
  Testado de verdade pelo IP de rede do próprio PC (`tests/celular-servidor.test.js`).
- **Aparência:** simples, tema escuro, tudo em `estilo.css` (variáveis no topo). É **proposta minha**, a ajustar na etapa de design.
- **Cruz de saúde:** o `06` desenhava barra de saúde; a página mostra a cruz colorida + o texto (Saudável/Doente/Muito doente), como no aparelho.

### 9.2 Limites conhecidos e o que falta

- **A aba do jogo precisa ficar visível no PC.** O jogo só anda enquanto a aba está aberta e à vista (o navegador
  para o desenho de abas escondidas); a ponte continua, mas o peixe fica parado e o relógio do jogo também. Com o
  jogo fechado, o celular mostra "desconectado". Isso só existe no simulador: no ESP32 o jogo é o próprio aparelho.
- **Teste no celular de verdade feito em 20/11/2026: tudo funcionou** (página abriu pelo WiFi, online, adotar, comida,
  limpar, pH, nome, parceiro). O IP do PC mudou entre tentativas (192.168.1.101 → .100): ele vem do DHCP do roteador;
  releia com `ipconfig` ou use o endereço que o servidor mostra ao iniciar. Roteiro usado:
  1. No PowerShell, na pasta `sim`: `$env:REDE = "1"; node servidor.js` (ou outra porta: `$env:PORT = "8091"`).
  2. O Windows vai perguntar sobre o firewall: marque **Redes privadas** e permita.
  3. No PC, abra o jogo em `http://localhost:8080/` e deixe a aba à vista.
  4. No celular, no **mesmo WiFi**, abra `http://192.168.1.101:8080/app/` (o endereço certo aparece no terminal).
  5. Confira: ponto "online", adotar, comida, limpar, pH, nome, parceiro, e o que o PC mostra.
  6. Se não abrir, pode ser "isolamento de clientes" no roteador (ou o celular está em outra rede/4G).
- Não feito (fica para o v1.1): WiFi/cidade/bateria reais, QR code, rede própria do aparelho, hora pelo celular de
  verdade, cenário extra, PIN.
- Pendente do doc 06: atualizar a tabela de rotas (`/api/textos`) e a seção 3.1 (saúde por cruz) — feito junto desta versão.
