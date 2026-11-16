# Aquário Virtual

Tamagotchi de aquário rodando em um ESP32, com display colorido, joystick e botões.
Pode ser gerenciado pelo smartphone via WiFi e também funciona offline.

> Status: **v0.2 do simulador pronta** (Fase A). O firmware do ESP32 (Fase B) começa quando
> as peças chegarem.

## Como rodar o simulador

Precisa só do [Node.js](https://nodejs.org). Não há nada para instalar.

```
cd sim
node servidor.js
```

Depois abra **http://localhost:8080** no navegador. Para parar, use `Ctrl+C` no terminal.

- Testes: `node --test` (dentro de `sim/`).
- Outra porta: `PORT=8099 node servidor.js` (no PowerShell: `$env:PORT=8099; node servidor.js`).
- **PowerShell bloqueando o `npm`?** Use os comandos `node` acima, ou `npm.cmd start` /
  `npm.cmd test`.
- Se aparecer `EADDRINUSE`, a porta já está em uso (talvez o simulador esteja aberto em outro
  terminal). Feche o outro ou use outra porta.

## O que a v0.2 faz

Agora o beta é um **bichinho que precisa de cuidado**. Ele nasce filhote, cresce em tempo real
(filhote, jovem, adulto e idoso, em 30 dias) e:

- **sente fome** (a saciedade cai de 100 a 0 em 48 h);
- **suja a água** (sobe de 0 a 100 em 4 dias) e o **pH cai** com o tempo (quanto mais suja a água,
  mais rápido);
- tem uma **saúde** que sobe ou desce conforme a média dessas três coisas;
- **adoece** (saúde abaixo de 30: cores pálidas, nada devagar) e **morre** (saúde 0, ou 30 dias
  de idade);
- quando morre o último peixe, aparece o **Game Over**, com uma mensagem de condolências, e você
  pode começar de novo com um filhote.

Para não esperar, o painel acelera o tempo.

### Controles

| No aparelho | No teclado | Na tela do jogo | Com o menu aberto |
|---|---|---|---|
| Joystick | Setas ou WASD | Move a câmera | Escolhe o item |
| Botão A | **Z** | Abre o menu | Confirma |
| Botão B | **X** | (nada) | Volta |
| Botão C | **C** | Abre o status | (nada) |

O menu tem **Dar comida**, **Limpar aquário** e **Regular pH**. O jogo **não pausa** com o menu
aberto. No Game Over, **Z** começa com um filhote novo.

Avisos na tela: no cantinho de cima, **F** (fome), **S** (sujeira) e **P** (pH) aparecem quando
aquele indicador está ruim; sobre o peixe, **F** (fome) e **+** (doente).

### Painel ao lado da tela (só no simulador)

| Controle | O que faz |
|---|---|
| 1× / 60× / 3600× | Velocidade do tempo. A 3600×, 1 dia de vida leva 24 segundos |
| Pular fase | Vai direto para o começo da próxima fase |
| Reiniciar | Volta ao começo, com um filhote novo |
| Saciedade, sujeira, pH, saúde | Mostram os valores; escreva um número para testar |
| Dar comida, Limpar, Regular pH | Os mesmos cuidados do menu |
| Matar peixe | Para testar o Game Over |
| Tela 2× / 4× | Só aumenta a imagem no computador |

Ainda **não há**: salvamento, adoção e nomes, reprodução, clima, dia e noite, som.
Ver o roadmap em [docs/01-visao.md](docs/01-visao.md).

## Como ajustar o jogo

- **Números do jogo** (fome, sujeira, pH, saúde): `sim/config/jogo.json`.
- **Todos os textos** (menu, mensagens, status, condolências): `sim/config/textos.json`.
  Só dá para usar letras de A a Z (com acentos), números e `. , : ! ? - + / % ' ( ) >`.
  Se escrever algo que a fonte não tem, o teste `node --test` avisa qual é.
- Depois de mexer, **recarregue a página** (F5).
- **Quanto tempo o peixe aguenta?** Rode `node tools/balanco.js` (dentro de `sim/`). Ele mostra
  quando o peixe adoece e morre em cada rotina de cuidado, com os números do `jogo.json`.
  Para comparar uma ideia sem mexer no arquivo oficial: `node tools/balanco.js meu-teste.json`.

Com os números de hoje, o peixe morre em **3,7 dias sem cuidado nenhum**, e só vive os 30 dias se
você alimentar todo dia e limpar o aquário e regular o pH **a cada 2 dias**. Se achar exigente
demais, o `docs/08-plano-v0.2.md` (seção 6) mostra o que mexer: deixar o pH mais lento e a
sujeira mais devagar (por exemplo, pH em 48 / 36 / 18 h e `diasParaEncher` em 6) faz a rotina de
"a cada 3 dias" bastar.

Para desenvolvedores: abrindo `http://localhost:8080/?debug`, o objeto `__debug` fica
disponível no console do navegador (`camera`, `clock`, `config`, `textos`, `menu`, `aquario()`).

## Documentação

| Doc | Assunto | Status |
|---|---|---|
| [01-visao.md](docs/01-visao.md) | Visão, decisões fechadas, backlog e versões | fechado |
| [02-hardware.md](docs/02-hardware.md) | Peças, energia, pinagem | rascunho |
| [03-jogo.md](docs/03-jogo.md) | Regras: ciclo de vida, indicadores, reprodução | fechado (números a ajustar jogando) |
| [04-arte-render.md](docs/04-arte-render.md) | Sprites, câmera, tiles, escala, dia/noite | fechado |
| [05-arquitetura.md](docs/05-arquitetura.md) | Simulador, módulos, pastas, Git | fechado (Fase B, seção 9, é proposta) |
| [06-web.md](docs/06-web.md) | Página no celular, conexão, API | fechado |
| [07-plano-v0.1.md](docs/07-plano-v0.1.md) | Plano e resultado da v0.1 | concluído |
| [08-plano-v0.2.md](docs/08-plano-v0.2.md) | Plano e resultado da v0.2 | concluído |

## Como trabalhamos

1. Fechar cada bloco por escrito (docs acima).
2. Só depois codar, em versões pequenas (v0.1, v0.2, ...).
3. Decisões novas entram no doc correspondente.
4. Um commit por passo concluído e uma etiqueta (tag) por versão.
