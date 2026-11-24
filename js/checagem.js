// Checagem rápida de múltipla escolha com explicação imediata (boa para a turma votar).
/* global renderMathInElement */

const LETRAS = ['A', 'B', 'C', 'D'];

function formulas(el) {
  if (typeof renderMathInElement === 'function') {
    renderMathInElement(el, { delimiters: [{ left: '\\(', right: '\\)', display: false }], throwOnError: false });
  }
}

/** q: { pergunta, opcoes: string[], correta: número, explicacao } */
export function montarChecagem(el, q) {
  el.innerHTML = `
    <span class="checagem-rotulo">CHECAGEM RÁPIDA</span>
    <p class="checagem-pergunta">${q.pergunta}</p>
    <div class="checagem-opcoes">${q.opcoes.map((o, i) =>
      `<button type="button" data-i="${i}"><b>${LETRAS[i]}</b><span>${o}</span></button>`).join('')}</div>
    <div class="checagem-retorno" aria-live="polite"></div>`;
  const botoes = [...el.querySelectorAll('.checagem-opcoes button')];
  const retorno = el.querySelector('.checagem-retorno');
  botoes.forEach((b) => b.addEventListener('click', () => {
    const i = Number(b.dataset.i);
    if (i !== q.correta) {
      // Errar não entrega a resposta: marca só a alternativa e deixa tentar outra
      b.disabled = true; b.classList.add('errada');
      retorno.innerHTML = '<p><strong>Ainda não.</strong> Pense de novo e tente outra alternativa.</p>';
      return;
    }
    botoes.forEach((x, k) => { x.disabled = true; x.classList.toggle('correta', k === q.correta); });
    retorno.innerHTML = `<p><strong>Isso!</strong> ${q.explicacao}</p>`;
    el.classList.add('acertou');
    formulas(retorno);
  }));
  formulas(el);
}
