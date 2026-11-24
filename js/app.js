// Página do simulador: liga controles, relógio, painéis, gráficos, sala de aula e assistente.

import {
  estado, aoMudar, notificar, recalcular, cenariosAtivos, tFimGlobal, terminou,
} from './state.js';
import { LIMITES, PRESETS, RHO_AR, T_LIMITE, limitar, resumo } from './physics.js';
import { fmt, fmtU } from './format.js';
import { criarSimulacao } from './sim-sketch.js';
import { criarGrafico } from './charts.js';
import { iniciarChat } from './chat.js';
import { iniciarLinhaTempo } from './linha-tempo.js';
import { criarRoteiro } from './roteiro.js';
import { iniciarSala } from './sala.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

function presetDe(g) {
  return Object.keys(PRESETS).find((k) => Math.abs(PRESETS[k].g - g) < 1e-9) || null;
}

// Parâmetros vindos da URL (ex.: link "ver no simulador" da página de exercícios)
(function lerURL() {
  const q = new URLSearchParams(location.search);
  const c = estado.cenarios[0];
  let alterou = false;
  for (const k of ['v0', 'y0', 'g']) {
    if (q.has(k)) { c.params[k] = limitar(k, q.get(k)); alterou = true; }
  }
  if (alterou) { c.preset = presetDe(c.params.g); recalcular(0); }
  if (q.has('t')) {
    const t = Number(q.get('t'));
    if (Number.isFinite(t)) estado.t = Math.min(Math.max(0, t), c.traj.tFim);
  }
})();

// ---------------------------------------------------------------------------
// Avisos
// ---------------------------------------------------------------------------
let timerAviso;
function avisar(msg) {
  const el = $('#aviso');
  el.textContent = msg;
  el.classList.add('visivel');
  clearTimeout(timerAviso);
  timerAviso = setTimeout(() => el.classList.remove('visivel'), 3200);
}
/** Mensagem destacada dentro da cena (legível no projetor). */
function destacar(texto, ms = 3800) { estado.aviso = { texto, ate: performance.now() + ms }; }

// ---------------------------------------------------------------------------
// Controles da simulação
// ---------------------------------------------------------------------------
let pausaUnica = null; // 'apice' | 'impacto' pedido por um passo do roteiro

function reiniciar() {
  estado.t = 0;
  estado.rodando = false;
  notificar('reinicio');
}

function alternarPlay() {
  if (estado.rodando) {
    estado.rodando = false;
  } else {
    if (terminou()) estado.t = 0;
    if (tFimGlobal() <= 0) { avisar('Não há movimento para os parâmetros atuais.'); return; }
    if (estado.ferramenta === 'previsao' && estado.previsao === null && estado.t === 0) {
      avisar('Faça seu palpite primeiro: clique na cena na altura que a bola vai alcançar.');
      return;
    }
    estado.rodando = true;
  }
  notificar('play');
}

function passoQuadro(sentido, grande) {
  const fim = tFimGlobal();
  if (fim <= 0) return;
  estado.rodando = false;
  const passo = fim / (grande ? 24 : 240);
  estado.t = Math.min(fim, Math.max(0, estado.t + sentido * passo));
  notificar('instante');
}

$('#btn-play').addEventListener('click', alternarPlay);
$('#btn-reiniciar').addEventListener('click', reiniciar);

$$('#velocidades button').forEach((b) => b.addEventListener('click', () => {
  estado.velocidade = Number(b.dataset.vel);
  $$('#velocidades button').forEach((x) => x.classList.toggle('ativo', x === b));
}));

function sincronizarCamadas() {
  $$('[data-mostrar]').forEach((cb) => { cb.checked = !!estado.mostrar[cb.dataset.mostrar]; });
}
$$('[data-mostrar]').forEach((cb) => cb.addEventListener('change', () => {
  estado.mostrar[cb.dataset.mostrar] = cb.checked;
}));

$('#pausar-eventos').addEventListener('change', (ev) => { estado.pausarEventos = ev.target.checked; });

function definirModo(m) {
  if (estado.modo === m) return;
  estado.modo = m;
  if (m === 'simples') estado.selecionado = 0;
  if (m === 'comparacao' && estado.ferramenta === 'previsao') definirFerramenta(null);
  $$('[data-modo]').forEach((x) => x.classList.toggle('ativo', x.dataset.modo === estado.modo));
  estado.t = 0; estado.rodando = false;
  montarPainel();
  notificar('modo');
}
$$('[data-modo]').forEach((b) => b.addEventListener('click', () => definirModo(b.dataset.modo)));

// Ferramentas de clique na cena
function definirFerramenta(f) {
  if (f === 'previsao' && estado.modo !== 'simples') { avisar('A previsão funciona no modo simples.'); f = null; }
  const anterior = estado.ferramenta;
  estado.ferramenta = f;
  if (anterior === 'regua' && f !== 'regua') estado.regua = null;
  if (anterior === 'previsao' && f !== 'previsao') estado.previsao = null;
  if (f === 'previsao') {
    estado.previsao = null; reiniciar();
    destacar('Previsão: clique na cena na altura máxima que você espera');
  }
  if (f === 'regua') destacar('Régua: clique em uma altura da cena');
  $$('[data-ferramenta]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.ferramenta === f)));
  notificar('ferramenta');
}
$$('[data-ferramenta]').forEach((b) => b.addEventListener('click', () =>
  definirFerramenta(estado.ferramenta === b.dataset.ferramenta ? null : b.dataset.ferramenta)));

function atualizarBotoes() {
  const rotulo = estado.rodando ? 'Pausar' : (estado.t > 0 && !terminou() ? 'Continuar' : 'Iniciar');
  if ($('#rotulo-play').textContent !== rotulo) $('#rotulo-play').textContent = rotulo;
  $('#icone-play').setAttribute('d', estado.rodando ? 'M6 4h4v16H6zM14 4h4v16h-4z' : 'M7 4l13 8-13 8z');
  const st = $('#status');
  let txt, est;
  if (estado.rodando) { txt = 'Em execução'; est = 'rodando'; }
  else if (terminou()) {
    const ativos = cenariosAtivos();
    txt = ativos.every((c) => c.traj.atingeSolo) ? 'Concluído — todos os objetos pararam no solo' : `Concluído — limite de ${T_LIMITE} s`;
    est = 'fim';
  } else if (estado.t > 0) { txt = 'Pausado'; est = 'pausado'; }
  else { txt = 'Pronto'; est = ''; }
  if (st.textContent !== txt) { st.textContent = txt; st.dataset.estado = est; }
}

// ---------------------------------------------------------------------------
// Painel de parâmetros
// ---------------------------------------------------------------------------
function indiceEditado() { return estado.modo === 'simples' ? 0 : estado.selecionado; }

function definirParametro(i, chave, valor) {
  const c = estado.cenarios[i];
  if (c.params[chave] === valor) return false;
  c.params[chave] = valor;
  if (chave === 'g') c.preset = presetDe(valor);
  recalcular(i);
  const reiniciou = estado.t > 0 || estado.rodando;
  if (reiniciou) {
    estado.t = 0; estado.rodando = false;
    avisar('Parâmetros alterados: simulação reiniciada.');
  }
  notificar('params');
  return reiniciou;
}

function controleNumerico(i, chave, rotulo) {
  const lim = LIMITES[chave];
  const casas = Math.max(0, -Math.floor(Math.log10(lim.passo)));
  const valor = estado.cenarios[i].params[chave];
  const wrap = document.createElement('div');
  wrap.className = 'controle';
  wrap.innerHTML = `
    <div class="controle-topo">
      <label for="num-${chave}">${rotulo || lim.nome}</label>
      <span class="campo-num"><input id="num-${chave}" type="text" inputmode="decimal" autocomplete="off"
        aria-describedby="lim-${chave}"><span>${lim.unidade}</span></span>
    </div>
    <input type="range" min="${lim.min}" max="${lim.max}" step="${lim.passo}" aria-label="${lim.nome}">
    <div class="limites" id="lim-${chave}"><span>${fmt(lim.min, casas)}</span><span>${fmt(lim.max, casas)}</span></div>`;
  const num = wrap.querySelector('input[type=text]');
  const rng = wrap.querySelector('input[type=range]');
  const caixa = wrap.querySelector('.campo-num');
  const mostrar = (v) => {
    num.value = fmt(v, casas).replace('−', '-').replace(/\./g, '');
    rng.value = v;
    rng.style.setProperty('--p', `${((v - lim.min) / (lim.max - lim.min)) * 100}%`);
  };
  mostrar(valor);
  rng.addEventListener('input', () => { const v = limitar(chave, rng.value); mostrar(v); definirParametro(i, chave, v); });
  const confirmar = () => {
    const texto = num.value.trim().replace(/\s/g, '').replace(',', '.');
    const bruto = Number(texto);
    if (texto === '' || !Number.isFinite(bruto)) {
      caixa.classList.remove('invalido'); void caixa.offsetWidth; caixa.classList.add('invalido');
      avisar(`Valor inválido para ${lim.nome.toLowerCase()}.`);
      mostrar(estado.cenarios[i].params[chave]);
      return;
    }
    const v = limitar(chave, bruto);
    mostrar(v);
    const reiniciou = definirParametro(i, chave, v);
    if (v !== bruto) {
      caixa.classList.remove('invalido'); void caixa.offsetWidth; caixa.classList.add('invalido');
      avisar(`${lim.nome}: valor limitado ao intervalo de ${fmt(lim.min, casas)} a ${fmt(lim.max, casas)} ${lim.unidade}.`
        + (reiniciou ? ' Simulação reiniciada.' : ''));
    }
  };
  num.addEventListener('change', confirmar);
  num.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); confirmar(); num.blur(); } });
  return wrap;
}

function montarAbas() {
  const abas = $('#abas');
  $('#grupo-abas').hidden = estado.modo === 'simples';
  abas.innerHTML = '';
  estado.cenarios.forEach((c, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `aba${i === estado.selecionado ? ' ativo' : ''}${c.habilitado ? '' : ' desabilitado'}`;
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', String(i === estado.selecionado));
    b.innerHTML = `<span class="ponto" style="background:${c.cor}"></span>${c.id}`;
    b.addEventListener('click', () => { estado.selecionado = i; montarPainel(); notificar('selecao'); });
    abas.appendChild(b);
  });
}

function montarPainel() {
  montarAbas();
  const i = indiceEditado();
  const c = estado.cenarios[i];
  const raiz = $('#parametros');
  raiz.innerHTML = '';

  if (estado.modo === 'comparacao') {
    const hab = document.createElement('label');
    hab.className = 'interruptor';
    hab.style.margin = '0 0 16px';
    hab.innerHTML = `<span>Exibir cenário ${c.id}</span><input type="checkbox" ${c.habilitado ? 'checked' : ''}><span class="trilho"></span>`;
    hab.querySelector('input').addEventListener('change', (ev) => {
      if (!ev.target.checked && estado.cenarios.filter((x) => x.habilitado).length === 1) {
        ev.target.checked = true; avisar('Mantenha ao menos um cenário ativo.'); return;
      }
      c.habilitado = ev.target.checked;
      estado.t = 0; estado.rodando = false;
      montarAbas(); notificar('params');
    });
    raiz.appendChild(hab);
  }

  const pre = document.createElement('div');
  pre.className = 'grupo-lateral';
  pre.innerHTML = '<span class="rotulo-lateral">Gravidade</span>';
  const grade = document.createElement('div');
  grade.className = 'presets';
  for (const [k, ps] of Object.entries(PRESETS)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = c.preset === k ? 'ativo' : '';
    b.innerHTML = `${ps.nome}<small>${fmt(ps.g, 2)}</small>`;
    b.title = `g = ${fmt(ps.g, 2)} m/s²`;
    b.addEventListener('click', () => { definirParametro(i, 'g', ps.g); montarPainel(); });
    grade.appendChild(b);
  }
  pre.appendChild(grade);
  raiz.appendChild(pre);

  const basicos = document.createElement('div');
  basicos.className = 'grupo-lateral';
  basicos.innerHTML = '<span class="rotulo-lateral">Lançamento</span>';
  for (const k of ['v0', 'y0', 'g']) basicos.appendChild(controleNumerico(i, k));
  basicos.appendChild(controleNumerico(i, 'massa', 'Massa'));
  const notaSinal = document.createElement('p');
  notaSinal.className = 'nota';
  notaSinal.textContent = 'Eixo positivo para cima: v₀ negativa é um lançamento para baixo. g em módulo. A massa só afeta a energia e o arrasto.';
  basicos.appendChild(notaSinal);
  raiz.appendChild(basicos);

  const ar = document.createElement('div');
  ar.className = 'grupo-lateral';
  ar.innerHTML = `
    <label class="interruptor"><span class="rotulo-lateral" style="margin:0">Resistência do ar</span>
      <input type="checkbox" ${c.params.arrasto ? 'checked' : ''}><span class="trilho"></span></label>`;
  ar.querySelector('input').addEventListener('change', (ev) => { definirParametro(i, 'arrasto', ev.target.checked); montarPainel(); });
  if (c.params.arrasto) {
    const corpo = document.createElement('div');
    corpo.style.marginTop = '16px';
    for (const k of ['cd', 'area']) corpo.appendChild(controleNumerico(i, k));
    const nota = document.createElement('p');
    nota.className = 'nota';
    nota.innerHTML = `F<sub>arrasto</sub> = −½ ρ C<sub>d</sub> A v|v|, com ρ = <span class="mono">${fmt(RHO_AR, 3)} kg/m³</span>.
      Integração numérica por Runge–Kutta de 4ª ordem com passo adaptativo.`;
    corpo.appendChild(nota);
    ar.appendChild(corpo);
  } else {
    const nota = document.createElement('p');
    nota.className = 'nota';
    nota.textContent = 'Desligada: modelo ideal com solução analítica.';
    ar.appendChild(nota);
  }
  raiz.appendChild(ar);
}

// ---------------------------------------------------------------------------
// Resultados
// ---------------------------------------------------------------------------
const METRICAS = [
  ['tempo', 'Tempo', 's'],
  ['altura', 'Altura', 'm'],
  ['velocidade', 'Velocidade', 'm/s'],
  ['aceleracao', 'Aceleração', 'm/s²'],
  ['hmax', 'Altura máx.', 'm', true],
  ['tsubida', 'Subida', 's', true],
  ['ttotal', 'Tempo total', 's', true],
];
$('#metricas').innerHTML = METRICAS.map(([id, nome, , teorica]) =>
  `<div class="metrica${teorica ? ' teorica' : ''}"><span>${nome}</span><strong id="m-${id}">—</strong></div>`).join('');

const cacheTexto = {};
function escrever(id, html) {
  if (cacheTexto[id] === html) return;
  cacheTexto[id] = html;
  document.getElementById(id).innerHTML = html;
}
const comUnidade = (v, u, casas = 2) => (v === null || v === undefined || v === Infinity)
  ? (v === Infinity ? '∞' : '—')
  : `${fmt(v, casas)}<small>${u}</small>`;

function atualizarResultados() {
  const c = estado.cenarios[indiceEditado()];
  const tr = c.traj;
  const e = tr.estado(estado.t);
  const escondido = estado.previsao !== null && estado.modo === 'simples' && estado.t < tr.tSubida;
  escrever('m-tempo', comUnidade(estado.t, 's'));
  escrever('m-altura', comUnidade(e.y, 'm'));
  escrever('m-velocidade', comUnidade(e.v, 'm/s'));
  escrever('m-aceleracao', comUnidade(e.a, 'm/s²'));
  escrever('m-hmax', escondido ? '<span class="suave">?</span>' : Number.isFinite(tr.hMax) ? comUnidade(tr.hMax, 'm') : '<span class="suave">sem inversão</span>');
  escrever('m-tsubida', Number.isFinite(tr.tSubida) ? comUnidade(tr.tSubida, 's') : '<span class="suave">sem inversão</span>');
  escrever('m-ttotal', tr.atingeSolo ? comUnidade(tr.tTotal, 's') : '<span class="suave">não atinge o solo</span>');
  escrever('migalha-texto', `Cenário ${c.id}${c.preset ? ' · ' + PRESETS[c.preset].nome : ''}`);
  $('#migalha-cor').style.background = c.cor;
  const selo = $('#selo-modelo');
  const arrasto = tr.modelo === 'arrasto';
  const txt = arrasto ? 'Resistência do ar · RK4' : 'Modelo ideal';
  if (selo.textContent !== txt) { selo.textContent = txt; selo.classList.toggle('arrasto', arrasto); }
  atualizarBotoes();
}

function atualizarComparacao() {
  const caixa = $('#comparacao');
  caixa.hidden = estado.modo !== 'comparacao';
  if (caixa.hidden) return;
  $('#tabela-comparacao').innerHTML = cenariosAtivos().map((c) => {
    const tr = c.traj, p = tr.params;
    return `<tr>
      <td><span class="ponto-cor" style="background:${c.cor}"></span>${c.id}${c.preset ? ` <span class="suave">· ${PRESETS[c.preset].nome}</span>` : ''}</td>
      <td>${fmt(p.g, 2)}</td><td>${fmt(p.v0, 2)}</td><td>${fmt(p.y0, 2)}</td>
      <td>${tr.modelo === 'arrasto' ? 'com ar' : 'ideal'}</td>
      <td>${Number.isFinite(tr.hMax) ? fmtU(tr.hMax, 'm') : 'sem inversão'}</td>
      <td>${Number.isFinite(tr.tSubida) ? fmtU(tr.tSubida, 's') : 'sem inversão'}</td>
      <td>${tr.atingeSolo ? fmtU(tr.tTotal, 's') : 'não atinge o solo'}</td>
    </tr>`;
  }).join('');
}

const linhaTempo = iniciarLinhaTempo();
aoMudar((motivo) => {
  if (['params', 'modo', 'selecao'].includes(motivo)) atualizarComparacao();
  if (['params', 'modo', 'selecao', 'tema'].includes(motivo)) linhaTempo.montarMarcos();
  atualizarResultados();
});

// ---------------------------------------------------------------------------
// Relógio único, com pausas automáticas no ápice
// ---------------------------------------------------------------------------
let ultimo = performance.now();
function tick(agora) {
  const dt = Math.min(0.1, (agora - ultimo) / 1000);
  ultimo = agora;
  if (estado.rodando) {
    const antes = estado.t;
    estado.t += dt * estado.velocidade;
    const pausarApice = pausaUnica === 'apice' || estado.pausarEventos;
    if (pausarApice) {
      const apices = cenariosAtivos().map((c) => c.traj.tSubida)
        .filter((ts) => Number.isFinite(ts) && ts > 0 && antes < ts && estado.t >= ts);
      if (apices.length) {
        estado.t = Math.min(...apices);
        estado.rodando = false;
        if (pausaUnica === 'apice') pausaUnica = null;
        destacar('Ápice: v = 0, mas a = −g');
        notificar('apice');
      }
    }
    const fim = tFimGlobal();
    if (estado.rodando && estado.t >= fim) {
      estado.t = fim; estado.rodando = false;
      if (pausaUnica === 'impacto') pausaUnica = null;
      const c0 = cenariosAtivos()[0];
      if (c0.traj.atingeSolo && cenariosAtivos().length === 1) destacar(`Impacto: v = ${fmtU(c0.traj.vImpacto, 'm/s')}`);
      notificar('fim');
    }
  }
  atualizarResultados();
  linhaTempo.atualizar();
  requestAnimationFrame(tick);
}

// ---------------------------------------------------------------------------
// Sala de aula: roteiro, apresentação, teclado e passador de slides
// ---------------------------------------------------------------------------
const sala = iniciarSala(avisar);

const controle = {
  modo: definirModo,
  cenario(params) {
    const c = estado.cenarios[0];
    Object.assign(c.params, params);
    c.preset = presetDe(c.params.g);
    recalcular(0); montarPainel(); notificar('params');
  },
  comparar(gs, base) {
    gs.forEach((g, i) => {
      const c = estado.cenarios[i];
      Object.assign(c.params, base, { g, arrasto: false });
      c.habilitado = true; c.preset = presetDe(g); recalcular(i);
    });
    if (estado.modo !== 'comparacao') definirModo('comparacao');
    else { montarPainel(); notificar('params'); }
  },
  camadas(obj) { Object.assign(estado.mostrar, obj); sincronizarCamadas(); },
  reiniciar,
  tocar(pausa = null) { pausaUnica = pausa; if (terminou()) estado.t = 0; if (tFimGlobal() > 0) estado.rodando = true; notificar('play'); },
  ferramenta: definirFerramenta,
  regua(h) { estado.regua = h; },
  irPara(t) { estado.rodando = false; estado.t = Math.min(t, tFimGlobal()); notificar('instante'); },
};
const roteiro = criarRoteiro(controle);
$('#btn-roteiro').addEventListener('click', () => roteiro.alternar());

const painelAtalhos = $('#atalhos');
document.addEventListener('keydown', (ev) => {
  const alvo = ev.target;
  if (alvo.closest('input[type=text], textarea, [contenteditable]')) return;
  if (alvo.closest('button, [role=slider]') && (ev.code === 'Space' || ev.key === 'Enter')) return;
  if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
  const k = ev.key;
  const roteiroAtivo = roteiro.ativo();
  if (ev.code === 'Space') { ev.preventDefault(); alternarPlay(); }
  else if (k === 'ArrowRight') { ev.preventDefault(); roteiroAtivo ? roteiro.proximo() : passoQuadro(1, ev.shiftKey); }
  else if (k === 'ArrowLeft') { ev.preventDefault(); roteiroAtivo ? roteiro.anterior() : passoQuadro(-1, ev.shiftKey); }
  else if (k === 'PageDown') { ev.preventDefault(); roteiroAtivo ? roteiro.proximo() : alternarPlay(); }
  else if (k === 'PageUp') { ev.preventDefault(); roteiroAtivo ? roteiro.anterior() : reiniciar(); }
  else if (k === 'r' || k === 'R') reiniciar();
  else if (k === 'g' || k === 'G') roteiro.alternar();
  else if (k === 'p' || k === 'P') sala.alternarApresentacao();
  else if (k === 'l' || k === 'L') sala.alternarLaser();
  else if (k === 'b' || k === 'B' || k === '.') sala.alternarTelaPreta();
  else if (k === 'f' || k === 'F') sala.telaCheia();
  else if (k === 't' || k === 'T') $('[data-acao="tema"]').click();
  else if (k === '?') painelAtalhos.hidden = !painelAtalhos.hidden;
  else if (k === 'Escape') {
    if (!painelAtalhos.hidden) painelAtalhos.hidden = true;
    else if (estado.ferramenta) definirFerramenta(null);
    else if (estado.apresentacao) sala.alternarApresentacao(false);
  }
});
painelAtalhos.addEventListener('click', () => { painelAtalhos.hidden = true; });

// ---------------------------------------------------------------------------
// Inicialização
// ---------------------------------------------------------------------------
montarPainel();
atualizarComparacao();
linhaTempo.montarMarcos();
criarSimulacao($('#sim'));
criarGrafico($('#graf-y'), { tipo: 'y', unidade: 'm', marcar: 'apice' });
criarGrafico($('#graf-v'), { tipo: 'v', unidade: 'm/s', marcar: 'vzero' });
criarGrafico($('#graf-a'), { tipo: 'a', unidade: 'm/s²' });
criarGrafico($('#graf-e'), { tipo: 'energia', unidade: 'J' });
requestAnimationFrame(tick);

// Contexto real da simulação enviado ao assistente: todos os números vêm do motor físico.
iniciarChat(() => ({
  modo: estado.modo === 'simples' ? 'simples' : 'comparação de cenários',
  instante_atual_s: Math.round(estado.t * 1e4) / 1e4,
  simulacao: estado.rodando ? 'em execução' : terminou() ? 'concluída' : estado.t > 0 ? 'pausada' : 'parada no início',
  cenarios: cenariosAtivos().map((c) => ({ cenario: c.id, massa_kg: c.traj.params.massa, ...resumo(c.traj, [estado.t]) })),
}));
