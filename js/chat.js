// Painel do assistente de física. Envia a conversa e o contexto real da simulação
// para a função serverless /api/chat, que consulta o Claude.
/* global renderMathInElement */

import { escaparHTML } from './format.js';
import { criarNewton } from './newton.js';

const SUGESTOES = [
  'Por que a velocidade diminui durante a subida?',
  'Por que a aceleração continua negativa?',
  'O que acontece no ponto mais alto?',
  'Compare os cenários ativos.',
  'Resolva passo a passo a altura no instante atual.',
  'Gere um novo exercício com resposta.',
];

const MAX_HISTORICO = 20;

/** Markdown mínimo e seguro (escapa HTML) preservando trechos LaTeX para o KaTeX. */
export function renderizarMarkdown(texto) {
  const formulas = [];
  const guardar = (m) => `\u0000${formulas.push(m) - 1}\u0000`;
  let s = texto.replace(/\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|\$[^$\n]+?\$/g, guardar);
  s = escaparHTML(s);

  const inline = (t) => t
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');

  const blocos = [];
  let lista = null;
  const fecharLista = () => { if (lista) { blocos.push(`<${lista.tipo}>${lista.itens.join('')}</${lista.tipo}>`); lista = null; } };
  let paragrafo = [];
  const fecharParagrafo = () => { if (paragrafo.length) { blocos.push(`<p>${inline(paragrafo.join('<br>'))}</p>`); paragrafo = []; } };

  for (const linha of s.split('\n')) {
    const l = linha.trimEnd();
    let m;
    if (!l.trim()) { fecharParagrafo(); fecharLista(); continue; }
    if ((m = l.match(/^#{1,4}\s+(.*)/))) { fecharParagrafo(); fecharLista(); blocos.push(`<h4>${inline(m[1])}</h4>`); continue; }
    if ((m = l.match(/^\s*[-*]\s+(.*)/)) || (m = l.match(/^\s*\d+[.)]\s+(.*)/))) {
      fecharParagrafo();
      const tipo = /^\s*\d/.test(l) ? 'ol' : 'ul';
      if (!lista || lista.tipo !== tipo) { fecharLista(); lista = { tipo, itens: [] }; }
      lista.itens.push(`<li>${inline(m[1])}</li>`);
      continue;
    }
    fecharLista();
    paragrafo.push(l);
  }
  fecharParagrafo(); fecharLista();

  return blocos.join('').replace(/\u0000(\d+)\u0000/g, (_, i) => escaparHTML(formulas[Number(i)]));
}

function renderizarFormulas(el) {
  if (typeof renderMathInElement !== 'function') return;
  renderMathInElement(el, {
    delimiters: [
      { left: '$$', right: '$$', display: true },
      { left: '\\[', right: '\\]', display: true },
      { left: '\\(', right: '\\)', display: false },
      { left: '$', right: '$', display: false },
    ],
    throwOnError: false,
  });
}

export function iniciarChat(obterContexto) {
  const painel = document.getElementById('chat');
  const lista = document.getElementById('chat-mensagens');
  const form = document.getElementById('chat-form');
  const entrada = document.getElementById('chat-entrada');
  const enviar = document.getElementById('chat-enviar');
  const btnAbrir = document.getElementById('abrir-chat');
  const historico = []; // { role: 'user' | 'assistant', content: string }
  let ocupado = false;
  let newton = null;
  const avatar = document.getElementById('avatar-newton');

  lista.innerHTML = `<div class="chat-vazio"><strong>Olá! Eu sou o Newton.</strong>
    <p>Pergunte qualquer coisa sobre o lançamento na tela. Eu recebo os valores do simulador e uso o motor físico para qualquer conta nova, então não invento números.</p></div>`;

  const sug = document.getElementById('chat-sugestoes');
  for (const s of SUGESTOES) {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = s;
    b.addEventListener('click', () => perguntar(s));
    sug.appendChild(b);
  }

  const abrir = (sim) => {
    painel.hidden = !sim;
    btnAbrir.setAttribute('aria-expanded', String(sim));
    if (sim) {
      if (!newton && avatar) newton = criarNewton(avatar, 'rosto');
      entrada.focus();
    }
  };
  btnAbrir.addEventListener('click', () => abrir(painel.hidden));
  document.getElementById('fechar-chat').addEventListener('click', () => abrir(false));
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && !painel.hidden) abrir(false); });

  function adicionar(classe, html) {
    lista.querySelector('.chat-vazio')?.remove();
    const div = document.createElement('div');
    div.className = `msg ${classe}`;
    div.innerHTML = html;
    lista.appendChild(div);
    lista.scrollTop = lista.scrollHeight;
    return div;
  }

  async function perguntar(texto) {
    texto = texto.trim();
    if (!texto || ocupado) return;
    ocupado = true; enviar.disabled = true;
    adicionar('usuario', escaparHTML(texto).replace(/\n/g, '<br>'));
    historico.push({ role: 'user', content: texto });
    const carregando = adicionar('assistente carregando', 'Calculando');

    try {
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensagens: historico.slice(-MAX_HISTORICO), contexto: obterContexto() }),
      });
      const dados = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(dados.erro || `Falha na requisição (${resp.status}).`);
      carregando.remove();
      const div = adicionar('assistente', renderizarMarkdown(dados.resposta));
      renderizarFormulas(div);
      historico.push({ role: 'assistant', content: dados.resposta });
      newton?.reagir(2, 2600);
    } catch (err) {
      carregando.remove();
      historico.pop(); // remove a pergunta sem resposta para manter a alternância user/assistant
      adicionar('assistente erro', escaparHTML(err.message || 'Não foi possível falar com o assistente.'));
      newton?.reagir(1, 3200);
    } finally {
      ocupado = false; enviar.disabled = false;
      lista.scrollTop = lista.scrollHeight;
    }
  }

  // Em sala de aula, sem internet ou sem chave configurada, o botão some para não exibir erros à turma.
  async function verificarDisponibilidade() {
    let ok = navigator.onLine;
    if (ok) {
      try {
        const r = await fetch('/api/chat', { method: 'GET', cache: 'no-store' });
        ok = r.ok && (await r.json()).disponivel === true;
      } catch { ok = false; }
    }
    btnAbrir.hidden = !ok;
    document.querySelectorAll('[data-abrir-chat]').forEach((b) => { b.hidden = !ok; });
    if (!ok && !painel.hidden) abrir(false);
  }
  verificarDisponibilidade();
  window.addEventListener('online', verificarDisponibilidade);
  window.addEventListener('offline', verificarDisponibilidade);

  form.addEventListener('submit', (ev) => { ev.preventDefault(); const t = entrada.value; entrada.value = ''; perguntar(t); });
  entrada.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); form.requestSubmit(); }
  });
}
