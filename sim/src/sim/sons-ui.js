// A parte "Som" do painel (computador) e das Opções (celular): o interruptor ligado/desligado e a lista de
// teste, com um botão ▶ por efeito para ouvir cada um (doc 16). As duas páginas têm os mesmos elementos:
//   #som-ligado (caixinha) e #som-lista (onde nascem os botões). Se não existirem, não faz nada.
export function ligarSons({ som, nomes, aoMudar = () => {}, documento = globalThis.document }) {
  const caixa = documento?.getElementById('som-ligado');
  const lista = documento?.getElementById('som-lista');
  if (!caixa || !lista) return;

  const botoes = [];
  for (const nome of nomes) {
    const botao = documento.createElement('button');
    botao.type = 'button';
    botao.textContent = `▶ ${nome}`;
    botao.title = `${som.duracaoMs(nome)} ms`;
    botao.addEventListener('click', () => {
      som.calar();   // o teste sempre toca, mesmo que outro som esteja soando
      som.tocar(nome);
    });
    lista.appendChild(botao);
    botoes.push(botao);
  }

  function mostrar() {
    caixa.checked = som.ligado;
    for (const b of botoes) b.disabled = !som.ligado;
  }
  caixa.addEventListener('change', () => {
    som.ligado = caixa.checked;
    mostrar();
    aoMudar(som.ligado);
  });
  mostrar();
}
