// Página de exercícios: etapa 1 (grandezas, do sketch original) e etapa 2 (desafios do banco).
/* global renderMathInElement */

import { gerarExercicio, avaliar, TIPOS, NIVEIS } from './banco-exercicios.js';
import { fmt, escaparHTML } from './format.js';
import { criarNewton } from './newton.js';
import { criarCosmos } from './cosmos.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

criarCosmos($('#cosmos'));
const newton = criarNewton($('#newton'), 'corpo');
const falar = (t) => { $('#fala-newton').textContent = t; };
const formulas = (el) => renderMathInElement(el, { delimiters: [{ left: '\\(', right: '\\)', display: false }], throwOnError: false });

// ---------------------------------------------------------------------------
// Etapa 1: grandezas físicas
// ---------------------------------------------------------------------------
const GRANDEZAS = [
  { nome: 'Velocidade inicial', unidade: 'm/s', correta: true },
  { nome: 'Volume', unidade: 'm³', correta: false },
  { nome: 'Altura inicial', unidade: 'm', correta: true },
  { nome: 'Largura', unidade: 'cm', correta: false },
  { nome: 'Aceleração gravitacional', unidade: 'm/s²', correta: true },
  { nome: 'Peso', unidade: 'N', correta: false },
  { nome: 'Tempo', unidade: 's', correta: true },
];
const opcoes = $('#opcoes');
opcoes.innerHTML = GRANDEZAS.map((g, i) => `
  <label class="opcao" for="gr-${i}">
    <input type="checkbox" id="gr-${i}" data-i="${i}">
    <span>${g.nome}</span>
    <span class="unidade">${g.unidade}</span>
  </label>`).join('');
opcoes.addEventListener('change', (ev) => {
  ev.target.closest('.opcao').classList.toggle('marcado', ev.target.checked);
  $('#feedback-grandezas').innerHTML = '';
});

function feedback(alvo, tipo, texto) {
  $(alvo).innerHTML = `<div class="feedback ${tipo}${tipo === 'erro' ? ' tremer' : ''}">${texto}</div>`;
}

$('#checar').addEventListener('click', () => {
  const marcados = [...opcoes.querySelectorAll('input')].map((cb) => cb.checked);
  if (GRANDEZAS.every((g, i) => g.correta === marcados[i])) {
    feedback('#feedback-grandezas', 'ok', 'Correto! O movimento depende só da altura inicial, da velocidade inicial, da gravidade e do tempo. A massa (e o peso) não influencia quando a resistência do ar é desprezada.');
    $('#ir-desafio').hidden = false;
    newton.reagir(2); falar('Correto! Vamos ver um lançamento?');
  } else {
    const faltando = GRANDEZAS.filter((g, i) => g.correta && !marcados[i]).length;
    const sobrando = GRANDEZAS.filter((g, i) => !g.correta && marcados[i]).length;
    const dicas = [];
    if (faltando) dicas.push(faltando > 1 ? `${faltando} grandezas necessárias não foram marcadas` : '1 grandeza necessária não foi marcada');
    if (sobrando) dicas.push(sobrando > 1 ? `${sobrando} grandezas marcadas não participam das equações` : '1 grandeza marcada não participa das equações');
    feedback('#feedback-grandezas', 'erro', `Incorreto. Tente novamente! (${dicas.join('; ')}.)`);
    newton.reagir(1, 3500); falar('Incorreto. Tente novamente!');
  }
});

function irPara(etapa) {
  $('#tela-grandezas').hidden = etapa !== 1;
  $('#tela-desafio').hidden = etapa !== 2;
  $('#etapa-1').classList.toggle('ativo', etapa === 1);
  $('#etapa-2').classList.toggle('ativo', etapa === 2);
  $('#titulo').innerHTML = etapa === 1
    ? 'Grandezas físicas. <span>Quais delas o lançamento vertical usa?</span>'
    : 'Desafios. <span>Resolva, peça dicas se precisar e confira no simulador.</span>';
  newton.reagir(0);
  falar(etapa === 1 ? 'Escolha com calma. Eu fico de olho.' : 'Ele escapou da bolinha. Agora é com você.');
  if (etapa === 2) $('#resposta').focus({ preventScroll: true });
}
$('#ir-desafio').addEventListener('click', () => irPara(2));
$('#etapa-1').addEventListener('click', () => irPara(1));
$('#etapa-2').addEventListener('click', () => irPara(2));

// ---------------------------------------------------------------------------
// Etapa 2: desafios
// ---------------------------------------------------------------------------
const sessao = { nivel: 'basico', tipo: 'altura_instante', numero: 0, pontos: 0, acertos: 0, tentados: 0, sequencia: 0 };
let ex = null, dicasUsadas = 0, resolvido = false, viuResolucao = false, primeiraTentativa = true;

function montarTipos() {
  const caixa = $('#tipos');
  const doNivel = Object.entries(TIPOS).filter(([, t]) => t.nivel === sessao.nivel);
  caixa.innerHTML = [['', { nome: 'Aleatório' }], ...doNivel].map(([k, t]) =>
    `<button type="button" data-tipo="${k}" class="${(sessao.tipo ?? '') === k ? 'ativo' : ''}">${t.nome}</button>`).join('');
  caixa.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
    sessao.tipo = b.dataset.tipo || null;
    montarTipos(); novoExercicio();
  }));
}
$$('[data-nivel]').forEach((b) => b.addEventListener('click', () => {
  sessao.nivel = b.dataset.nivel;
  sessao.tipo = null;
  $$('[data-nivel]').forEach((x) => x.classList.toggle('ativo', x === b));
  montarTipos(); novoExercicio();
}));

function atualizarPlacar() {
  $('#pl-pontos').textContent = sessao.pontos;
  $('#pl-acertos').textContent = `${sessao.acertos}/${sessao.tentados}`;
  $('#pl-sequencia').textContent = sessao.sequencia;
}

function novoExercicio() {
  ex = gerarExercicio({ tipo: sessao.tipo, nivel: sessao.nivel });
  sessao.numero += 1;
  dicasUsadas = 0; resolvido = false; viuResolucao = false; primeiraTentativa = true;
  $('#ex-numero').textContent = `#${String(sessao.numero).padStart(2, '0')}`;
  $('#ex-tipo').textContent = ex.nome;
  $('#ex-nivel').textContent = NIVEIS[ex.nivel];
  $('#enunciado').innerHTML = ex.enunciado;
  $('#dados').innerHTML = ex.dados.map(([nome, s, v]) => `<div class="dado"><span>${nome}<b>${s}</b></span><strong>${v}</strong></div>`).join('');
  $('#pergunta').textContent = ex.pergunta;
  $('#unidade').textContent = ex.unidade;
  $('#resposta').value = '';
  $('#feedback-desafio').innerHTML = '';
  $('#dicas').innerHTML = '';
  $('#resolucao').hidden = true;
  atualizarBotaoDica();
  const l = ex.link;
  $('#ver-simulador').href = `index.html?v0=${l.v0}&y0=${l.y0}&g=${l.g}${l.t !== undefined ? `&t=${l.t.toFixed(3)}` : ''}`;
  reiniciarCronometro();
  const card = document.querySelector('.enunciado');
  card.classList.remove('surgir'); void card.offsetWidth; card.classList.add('surgir');
  newton.reagir(0);
}

function atualizarBotaoDica() {
  const restam = ex.dicas.length - dicasUsadas;
  $('#dica').disabled = restam <= 0 || resolvido;
  $('#dica').textContent = restam > 0 ? `Pedir dica (${restam})` : 'Sem mais dicas';
}

$('#dica').addEventListener('click', () => {
  if (dicasUsadas >= ex.dicas.length) return;
  const li = document.createElement('li');
  li.className = 'surgir';
  li.innerHTML = `<span>DICA ${dicasUsadas + 1}</span><p>${ex.dicas[dicasUsadas]}</p>`;
  $('#dicas').appendChild(li);
  formulas(li);
  dicasUsadas += 1;
  atualizarBotaoDica();
  falar(dicasUsadas === 1 ? 'Comece pela equação certa.' : 'Agora é só fazer as contas.');
});

function verificar() {
  if (resolvido) return;
  const texto = $('#resposta').value.trim().replace(/\s/g, '').replace(',', '.');
  const resultado = avaliar(texto === '' ? NaN : Number(texto), ex.resposta);
  if (resultado === 'invalido') { feedback('#feedback-desafio', 'erro', 'Digite um número.'); newton.reagir(1, 1800); falar(`Preciso de um número, em ${ex.unidade}.`); return; }
  if (primeiraTentativa) { sessao.tentados += 1; primeiraTentativa = false; }
  if (resultado === 'certo') {
    resolvido = true;
    const ganho = viuResolucao ? 0 : Math.max(1, 3 - dicasUsadas);
    sessao.pontos += ganho; sessao.acertos += 1; sessao.sequencia += 1;
    feedback('#feedback-desafio', 'ok', `Correto! ${fmt(Math.round(ex.resposta * 100) / 100)} ${ex.unidade}. ${ganho ? `+${ganho} ponto${ganho > 1 ? 's' : ''}.` : ''}`);
    newton.reagir(2); falar(sessao.sequencia >= 3 ? `${sessao.sequencia} seguidas! A gravidade não tem segredos para você.` : 'Isso! Exatamente o que a física previu.');
    atualizarBotaoDica();
  } else if (resultado === 'quase') {
    feedback('#feedback-desafio', 'quase', 'Muito perto! Provavelmente é arredondamento: use os valores completos nas contas e arredonde só no final.');
    newton.reagir(0); falar('Quase lá...');
  } else if (resultado === 'sinal') {
    feedback('#feedback-desafio', 'quase', 'O valor está certo, mas o sinal não. Lembre: o eixo é positivo para cima.');
    newton.reagir(0); falar('Confira o sentido do movimento.');
  } else {
    sessao.sequencia = 0;
    feedback('#feedback-desafio', 'erro', 'Ainda não. Confira os cálculos ou peça uma dica.');
    newton.reagir(1, 3500); falar('Quase... tente pedir uma dica.');
  }
  atualizarPlacar();
}

function mostrarResolucao() {
  viuResolucao = true;
  $('#resolucao').innerHTML = `
    <h3>Resolução</h3>
    <ol>${ex.passos.map((p) => `<li>${p}</li>`).join('')}</ol>
    <p class="resposta">Resposta: ${escaparHTML(fmt(Math.round(ex.resposta * 100) / 100))} ${ex.unidade}</p>`;
  $('#resolucao').hidden = false;
  formulas($('#resolucao'));
}

$('#verificar').addEventListener('click', verificar);
$('#resposta').addEventListener('keydown', (ev) => { if (ev.key === 'Enter') verificar(); });
$('#resposta').addEventListener('input', (ev) => {
  ev.target.value = ev.target.value.replace(/[^\d.,-]/g, '').replace(/(?!^)-/g, '').replace(/([.,].*)[.,]/g, '$1');
});
$('#mostrar-resolucao').addEventListener('click', mostrarResolucao);
$('#novo').addEventListener('click', novoExercicio);

// ---------------------------------------------------------------------------
// Modo turma: questão em tela grande, cronômetro e revelação da resposta
// ---------------------------------------------------------------------------
const DURACAO = 60;
let restante = DURACAO, cronometro = null;
const arco = $('#cron-arco');
const comprimento = 2 * Math.PI * 19;
arco.style.strokeDasharray = comprimento;
function desenharCronometro() {
  $('#cron-texto').textContent = Math.ceil(restante);
  arco.style.strokeDashoffset = comprimento * (1 - restante / DURACAO);
  $('.cronometro').classList.toggle('acabando', restante <= 10);
}
function reiniciarCronometro() {
  clearInterval(cronometro); cronometro = null; restante = DURACAO;
  $('#cron-iniciar').textContent = 'Iniciar cronômetro';
  desenharCronometro();
}
$('#cron-iniciar').addEventListener('click', () => {
  if (cronometro) { clearInterval(cronometro); cronometro = null; $('#cron-iniciar').textContent = 'Continuar'; return; }
  if (restante <= 0) restante = DURACAO;
  $('#cron-iniciar').textContent = 'Pausar';
  cronometro = setInterval(() => {
    restante = Math.max(0, restante - 0.1);
    desenharCronometro();
    if (restante <= 0) { clearInterval(cronometro); cronometro = null; $('#cron-iniciar').textContent = 'Recomeçar'; falar('Tempo! Quem chegou na resposta?'); }
  }, 100);
});
$('#revelar').addEventListener('click', () => { clearInterval(cronometro); cronometro = null; mostrarResolucao(); newton.reagir(2); falar('Conferiram? Vamos para o próximo.'); });
$('#modo-turma').addEventListener('click', () => {
  const ativo = document.body.classList.toggle('modo-turma');
  $('#modo-turma').setAttribute('aria-pressed', String(ativo));
  $('#turma').hidden = !ativo;
  if (ativo) irPara(2);
});

montarTipos();
novoExercicio();
atualizarPlacar();
