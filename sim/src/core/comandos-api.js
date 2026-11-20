// Os comandos que a página do celular manda (POST/PUT /api/..., doc 06 e doc 13).
// Cada um chama as MESMAS funções que os botões do aparelho usam (menu.executar, adotar...):
// o celular é só outra "mão" no jogo, nenhuma regra nova mora aqui. Sem navegador nem rede.
//
// executarComando({ metodo, caminho, corpo }, contexto) -> { status, corpo }
// contexto: {
//   aquario, menu, config, textos,
//   aguardandoAdocao(): ainda não há jogo?
//   adotar({ cor, nome }): começa um jogo novo (a interface refaz o aquário e salva)
//   aceitaNoNome(letra): o que a fonte do aparelho consegue desenhar
//   salvar(): grava o jogo
// }

const resposta = (status, corpo) => ({ status, corpo });
const erro = (status, codigo, textos) => resposta(status, { ok: false, erro: codigo, mensagem: textos.celular.erros[codigo] ?? codigo });

export function executarComando({ metodo, caminho, corpo }, ctx) {
  const { aquario, menu, config, textos } = ctx;
  const dados = corpo && typeof corpo === 'object' ? corpo : {};

  // Dar comida, limpar e regular o pH (os 3 botões da tela inicial).
  const acao = { '/api/comida': 'comida', '/api/limpar': 'limpar', '/api/ph': 'ph' }[caminho];
  if (metodo === 'POST' && acao) {
    if (ctx.aguardandoAdocao()) return erro(409, 'semJogo', textos);
    const mensagem = menu.executar(acao, aquario);
    return resposta(200, { ok: true, mensagem });
  }

  // Adotar: o primeiro peixe (ou depois do Game Over), ou um parceiro para um peixe.
  if (metodo === 'POST' && caminho === '/api/peixes') {
    const cor = dados.cor ?? config.cores[0];
    if (!config.cores.includes(cor)) return erro(400, 'corInvalida', textos);

    if (dados.parceiroDe != null) {
      if (ctx.aguardandoAdocao()) return erro(409, 'semJogo', textos);
      const peixe = aquario.peixePorId(Number(dados.parceiroDe));
      if (!peixe) return erro(400, 'peixeInvalido', textos);
      const r = menu.adotarParceiro(aquario, { cor }, peixe);
      if (!r.ok) {
        return resposta(409, { ok: false, erro: r.motivo, mensagem: textos.mensagens.parceiro[r.motivo] });
      }
      if (dados.nome) aquario.renomear(r.parceiro, dados.nome, ctx.aceitaNoNome);
      ctx.salvar();
      return resposta(200, { ok: true, id: r.parceiro.id, mensagem: textos.mensagens.parceiroAdotado });
    }

    if (!(ctx.aguardandoAdocao() || aquario.gameOver)) return erro(409, 'jaTemJogo', textos);
    ctx.adotar({ cor, nome: dados.nome });
    return resposta(200, { ok: true });
  }

  // Trocar o nome de um peixe: PUT /api/peixes/{id}
  const m = /^\/api\/peixes\/(\d+)$/.exec(caminho);
  if (metodo === 'PUT' && m) {
    if (ctx.aguardandoAdocao()) return erro(409, 'semJogo', textos);
    const peixe = aquario.peixePorId(Number(m[1]));
    if (!peixe) return erro(404, 'peixeInvalido', textos);
    if (peixe.estado === 'morto') return erro(409, 'peixeMorto', textos);
    const nome = aquario.renomear(peixe, dados.nome, ctx.aceitaNoNome);
    ctx.salvar();
    return resposta(200, { ok: true, nome });
  }

  return erro(404, 'pedidoInvalido', textos);
}
