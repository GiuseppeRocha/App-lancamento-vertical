// Página de teoria: exemplos resolvidos com valores calculados pelo motor físico.
/* global renderMathInElement */

import { calcularTrajetoria, RHO_AR, LIMITES } from './physics.js';
import { fmt } from './format.js';
import { criarCosmos } from './cosmos.js';
import { estado } from './state.js';
import { labEquacao, labVetores, labArrasto } from './labs.js';
import { montarChecagem } from './checagem.js';

estado.tema = document.documentElement.dataset.tema === 'claro' ? 'claro' : 'escuro';

// Número formatado para LaTeX (vírgula decimal sem espaçamento extra).
const n = (v, c = 2) => fmt(v, c).replace('\u2212', '-').replace(',', '{,}');
const link = (p, t) => `index.html?v0=${p.v0}&y0=${p.y0}&g=${p.g}${t !== undefined ? `&t=${t}` : ''}`;

const exemplos = [];

{ // 1. Lançamento a partir do solo
  const p = { v0: 20, y0: 0, g: 9.81 };
  const tr = calcularTrajetoria(p);
  exemplos.push({
    titulo: 'Exemplo 1: bola lançada do solo',
    enunciado: `Uma bola é lançada verticalmente para cima a partir do solo com velocidade de 20 m/s, na Terra
      (\\(g = 9{,}81\\) m/s²). Determine o tempo de subida, a altura máxima e o tempo total de movimento.`,
    passos: [
      `Dados: \\(y_0 = 0\\), \\(v_0 = 20\\) m/s, \\(g = 9{,}81\\) m/s².`,
      `Tempo de subida: \\(t_s = \\dfrac{v_0}{g} = \\dfrac{20}{9{,}81} \\approx ${n(tr.tSubida)}\\) s.`,
      `Altura máxima: \\(H_{\\text{máx}} = y_0 + \\dfrac{v_0^2}{2g} = 0 + \\dfrac{20^2}{2 \\cdot 9{,}81} \\approx ${n(tr.hMax)}\\) m.`,
      `Como parte do solo e volta ao solo, a trajetória é simétrica: \\(t_{\\text{total}} = 2t_s \\approx ${n(tr.tTotal)}\\) s.`,
    ],
    resposta: `\\(t_s \\approx ${n(tr.tSubida)}\\) s, \\(H_{\\text{máx}} \\approx ${n(tr.hMax)}\\) m e \\(t_{\\text{total}} \\approx ${n(tr.tTotal)}\\) s.`,
    p,
  });
}

{ // 2. Lançamento do alto de um prédio
  const p = { v0: 15, y0: 30, g: 9.81 };
  const tr = calcularTrajetoria(p);
  const delta = p.v0 ** 2 + 2 * p.g * p.y0;
  exemplos.push({
    titulo: 'Exemplo 2: lançamento do alto de um prédio',
    enunciado: `Do topo de um prédio de 30 m, uma pedra é lançada para cima com 15 m/s. Calcule a altura máxima em relação
      ao solo, o tempo até atingir o solo e a velocidade de impacto.`,
    passos: [
      `Dados: \\(y_0 = 30\\) m, \\(v_0 = 15\\) m/s, \\(g = 9{,}81\\) m/s².`,
      `Altura máxima: \\(H_{\\text{máx}} = 30 + \\dfrac{15^2}{2 \\cdot 9{,}81} \\approx ${n(tr.hMax)}\\) m.`,
      `No solo, \\(y = 0\\): \\(\\dfrac{9{,}81}{2}t^2 - 15t - 30 = 0\\). O discriminante vale
        \\(v_0^2 + 2gy_0 = ${n(delta)}\\).`,
      `Raiz positiva: \\(t = \\dfrac{15 + \\sqrt{${n(delta)}}}{9{,}81} \\approx ${n(tr.tTotal)}\\) s.`,
      `Velocidade de impacto: \\(v = v_0 - gt = 15 - 9{,}81 \\cdot ${n(tr.tTotal)} \\approx ${n(tr.vImpacto)}\\) m/s
        (o sinal negativo indica movimento para baixo).`,
    ],
    resposta: `\\(H_{\\text{máx}} \\approx ${n(tr.hMax)}\\) m, \\(t \\approx ${n(tr.tTotal)}\\) s e \\(v \\approx ${n(tr.vImpacto)}\\) m/s.`,
    p,
  });
}

{ // 3. Lançamento para baixo
  const p = { v0: -5, y0: 40, g: 9.81 };
  const tr = calcularTrajetoria(p);
  exemplos.push({
    titulo: 'Exemplo 3: lançamento para baixo',
    enunciado: `Uma chave é arremessada para baixo, com 5 m/s, de uma janela a 40 m do chão. Em quanto tempo ela chega ao
      solo e com que velocidade?`,
    passos: [
      `Com o eixo positivo para cima, a velocidade inicial é negativa: \\(v_0 = -5\\) m/s.`,
      `Como \\(v_0 < 0\\), não há subida: a altura máxima é a inicial, \\(${n(tr.hMax)}\\) m.`,
      `\\(0 = 40 - 5t - 4{,}905\\,t^2 \\Rightarrow t = \\dfrac{-5 + \\sqrt{25 + 2 \\cdot 9{,}81 \\cdot 40}}{9{,}81} \\approx ${n(tr.tTotal)}\\) s.`,
      `\\(v = -5 - 9{,}81 \\cdot ${n(tr.tTotal)} \\approx ${n(tr.vImpacto)}\\) m/s.`,
    ],
    resposta: `\\(t \\approx ${n(tr.tTotal)}\\) s e \\(v \\approx ${n(tr.vImpacto)}\\) m/s.`,
    p,
  });
}

{ // 4. Terra × Lua
  const terra = calcularTrajetoria({ v0: 10, y0: 0, g: 9.81 });
  const lua = calcularTrajetoria({ v0: 10, y0: 0, g: 1.62 });
  exemplos.push({
    titulo: 'Exemplo 4: o mesmo lançamento na Terra e na Lua',
    enunciado: `Um astronauta lança uma ferramenta para cima com 10 m/s a partir do solo. Compare a altura máxima na Terra
      (\\(g = 9{,}81\\) m/s²) e na Lua (\\(g = 1{,}62\\) m/s²).`,
    passos: [
      `Terra: \\(H = \\dfrac{10^2}{2 \\cdot 9{,}81} \\approx ${n(terra.hMax)}\\) m, com tempo total de \\(${n(terra.tTotal)}\\) s.`,
      `Lua: \\(H = \\dfrac{10^2}{2 \\cdot 1{,}62} \\approx ${n(lua.hMax)}\\) m, com tempo total de \\(${n(lua.tTotal)}\\) s.`,
      `Como \\(H \\propto 1/g\\), a razão entre as alturas é \\(9{,}81/1{,}62 \\approx ${n(lua.hMax / terra.hMax)}\\).`,
    ],
    resposta: `Na Lua a ferramenta sobe cerca de \\(${n(lua.hMax / terra.hMax)}\\) vezes mais alto.`,
    p: { v0: 10, y0: 0, g: 1.62 },
  });
}

{ // 5. Altura em um instante (o desafio do sketch original)
  const p = { v0: 25, y0: 12, g: 9.81 };
  const t = 1.5;
  const tr = calcularTrajetoria(p);
  const e = tr.estado(t);
  exemplos.push({
    titulo: 'Exemplo 5: altura em um instante dado',
    enunciado: `Uma bolinha é lançada para cima com 25 m/s a partir de 12 m de altura. Qual é sua altura e sua velocidade
      1,5 s após o lançamento?`,
    passos: [
      `\\(y(1{,}5) = 12 + 25 \\cdot 1{,}5 - \\dfrac{9{,}81 \\cdot 1{,}5^2}{2} \\approx ${n(e.y)}\\) m.`,
      `\\(v(1{,}5) = 25 - 9{,}81 \\cdot 1{,}5 \\approx ${n(e.v)}\\) m/s. Como \\(v > 0\\), a bolinha ainda está subindo
        (o ápice ocorre em \\(t_s \\approx ${n(tr.tSubida)}\\) s).`,
    ],
    resposta: `\\(y \\approx ${n(e.y)}\\) m e \\(v \\approx ${n(e.v)}\\) m/s.`,
    p, t,
  });
}

// Exemplos com passos revelados um a um (o professor pode pedir que a turma tente antes)
document.getElementById('lista-exemplos').innerHTML = exemplos.map((ex, k) => `
  <article class="exemplo" data-exemplo="${k}">
    <h3>${ex.titulo}</h3>
    <p>${ex.enunciado}</p>
    <ol class="passos">${ex.passos.map((s) => `<li hidden>${s}</li>`).join('')}</ol>
    <p class="resposta" hidden>Resposta: ${ex.resposta}</p>
    <div class="exemplo-acoes">
      <button type="button" class="botao claro pequeno" data-proximo>Revelar 1º passo</button>
      <button type="button" class="botao escuro pequeno" data-tudo>Mostrar tudo</button>
      <a class="link-sim" href="${link(ex.p, ex.t)}">Ver no simulador →</a>
    </div>
  </article>`).join('');

document.querySelectorAll('[data-exemplo]').forEach((art) => {
  const passos = [...art.querySelectorAll('.passos li')];
  const resposta = art.querySelector('.resposta');
  const proximo = art.querySelector('[data-proximo]');
  const atualizar = () => {
    const ocultos = passos.filter((li) => li.hidden).length;
    if (ocultos === 0) {
      resposta.hidden = false;
      proximo.hidden = true; art.querySelector('[data-tudo]').hidden = true;
    } else proximo.textContent = `Revelar ${passos.length - ocultos + 1}º passo`;
  };
  proximo.addEventListener('click', () => { const li = passos.find((x) => x.hidden); if (li) { li.hidden = false; li.classList.add('surgir'); } atualizar(); });
  art.querySelector('[data-tudo]').addEventListener('click', () => { passos.forEach((li) => { li.hidden = false; }); atualizar(); });
});

{ // Velocidade terminal de uma bola de futebol (parâmetros padrão do simulador)
  const m = LIMITES.massa.padrao, cd = LIMITES.cd.padrao, A = LIMITES.area.padrao;
  const vt = Math.sqrt((m * 9.81) / (0.5 * RHO_AR * cd * A));
  const ideal = calcularTrajetoria({ v0: 20, y0: 0, g: 9.81 });
  const ar = calcularTrajetoria({ v0: 20, y0: 0, g: 9.81, arrasto: true, massa: m, cd, area: A });
  document.getElementById('exemplo-terminal').innerHTML = `
    Exemplo: para uma bola com \\(m = ${n(m)}\\) kg, \\(C_d = ${n(cd)}\\) e \\(A = ${n(A, 3)}\\) m², a velocidade terminal é
    \\(v_t \\approx ${n(vt)}\\) m/s. Lançada para cima a 20 m/s, ela sobe \\(${n(ar.hMax)}\\) m em vez dos
    \\(${n(ideal.hMax)}\\) m do modelo ideal, e sua subida (\\(${n(ar.tSubida)}\\) s) é mais curta que a descida
    (\\(${n(ar.tTotal - ar.tSubida)}\\) s).`;
}

renderMathInElement(document.body, {
  delimiters: [
    { left: '$$', right: '$$', display: true },
    { left: '\\(', right: '\\)', display: false },
  ],
  throwOnError: false,
});

// Céu de fundo e destaque do sumário conforme a rolagem
criarCosmos(document.getElementById('cosmos'));
const links = [...document.querySelectorAll('.sumario a')];
const secoes = links.map((a) => document.querySelector(a.getAttribute('href')));
const espiao = new IntersectionObserver((entradas) => {
  for (const e of entradas) {
    if (!e.isIntersecting) continue;
    links.forEach((a) => a.classList.toggle('ativo', a.getAttribute('href') === '#' + e.target.id));
  }
}, { rootMargin: '-30% 0px -60% 0px' });
secoes.forEach((s) => s && espiao.observe(s));

// Laboratórios interativos e checagens rápidas
const LABS = { equacao: labEquacao, vetores: labVetores, arrasto: labArrasto };
document.querySelectorAll('[data-lab]').forEach((el) => LABS[el.dataset.lab]?.(el));

const CHECAGENS = {
  massa: {
    pergunta: 'Duas bolas, uma de 0,1 kg e outra de 5 kg, são lançadas para cima com a mesma velocidade, no vácuo. Qual sobe mais?',
    opcoes: ['A mais pesada', 'A mais leve', 'As duas sobem a mesma altura', 'Depende do tamanho'],
    correta: 2,
    explicacao: 'A aceleração é \\(g\\) para qualquer massa, então as equações horárias não dependem de m. A massa só importa quando há resistência do ar.',
  },
  velocidade: {
    pergunta: 'Durante a subida, na Terra, o que acontece com a velocidade da bola a cada segundo?',
    opcoes: ['Aumenta 9,81 m/s', 'Diminui 9,81 m/s', 'Fica constante', 'Cai para zero imediatamente'],
    correta: 1,
    explicacao: 'Como \\(v = v_0 - gt\\), a velocidade perde \\(g \\approx 9{,}81\\) m/s a cada segundo até chegar a zero no ápice.',
  },
  dobro: {
    pergunta: 'Se dobrarmos a velocidade inicial, quanto a bola sobe acima do ponto de lançamento?',
    opcoes: ['O dobro', 'O quádruplo', 'A mesma altura', 'A metade'],
    correta: 1,
    explicacao: 'A subida vale \\(v_0^2/2g\\). Com \\(2v_0\\), fica \\((2v_0)^2/2g = 4 \\cdot v_0^2/2g\\): quatro vezes mais.',
  },
  apice: {
    pergunta: 'No ponto mais alto da trajetória, a aceleração da bola é:',
    opcoes: ['Zero', '−g (para baixo)', '+g (para cima)', 'Depende da massa'],
    correta: 1,
    explicacao: 'Só a velocidade é zero no ápice. A gravidade continua agindo, por isso a bola volta a cair.',
  },
  raiz: {
    pergunta: 'Ao resolver \\(\\tfrac{g}{2}t^2 - v_0 t - y_0 = 0\\) aparecem duas raízes. Qual é o tempo até o solo?',
    opcoes: ['A raiz negativa', 'A raiz positiva', 'A soma das duas', 'A média das duas'],
    correta: 1,
    explicacao: 'A raiz negativa corresponde a um instante antes do lançamento, sem sentido físico aqui.',
  },
  arrasto: {
    pergunta: 'Com resistência do ar, como o tempo de descida se compara ao de subida?',
    opcoes: ['É menor', 'É igual', 'É maior', 'É zero'],
    correta: 2,
    explicacao: 'O ar dissipa energia: a bola volta mais devagar do que subiu, então a descida demora mais. Confira no laboratório acima.',
  },
};
document.querySelectorAll('[data-checagem]').forEach((el) => montarChecagem(el, CHECAGENS[el.dataset.checagem]));

// Barra de progresso de leitura
const barra = document.getElementById('progresso-leitura');
const progresso = () => {
  const total = document.documentElement.scrollHeight - innerHeight;
  barra.style.transform = `scaleX(${total > 0 ? Math.min(1, scrollY / total) : 0})`;
};
addEventListener('scroll', progresso, { passive: true });
progresso();
