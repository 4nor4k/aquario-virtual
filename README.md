# Aquário Virtual

Tamagotchi de aquário rodando em um ESP32, com display colorido, joystick e botões.
Pode ser gerenciado pelo smartphone via WiFi e também funciona offline.

> Status: **v0.1 do simulador pronta** (Fase A). O firmware do ESP32 (Fase B) começa quando
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

### O que a v0.1 faz

Um beta nada no aquário de 360×240 (tela de 120×120 em escala 2×) e **envelhece em tempo
real**: filhote, jovem, adulto e idoso, em 30 dias. Para não esperar, o painel acelera o tempo.

| Controle | O que faz |
|---|---|
| Setas ou WASD | Movem a câmera pelo aquário (ela não segue o peixe) |
| 1× / 60× / 3600× | Velocidade do tempo. A 3600×, a vida inteira leva cerca de 12 minutos |
| Pular fase | Vai direto para o começo da próxima fase |
| Reiniciar | Volta ao começo, com um filhote novo |
| Tela 2× / 4× | Só aumenta a imagem no computador |

Ainda **não há**: fome, sujeira, pH, saúde, morte, salvamento, reprodução, clima, som.
Ver o roadmap em [docs/01-visao.md](docs/01-visao.md).

Para desenvolvedores: abrindo `http://localhost:8080/?debug`, o objeto `__debug` fica
disponível no console do navegador (`camera`, `clock`, `aquario()`).

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

## Como trabalhamos

1. Fechar cada bloco por escrito (docs acima).
2. Só depois codar, em versões pequenas (v0.1, v0.2, ...).
3. Decisões novas entram no doc correspondente.
4. Um commit por passo concluído e uma etiqueta (tag) por versão.
