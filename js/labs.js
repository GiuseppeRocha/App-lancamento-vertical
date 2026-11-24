// Laboratórios interativos da página de teoria (p5.js). Todos os números vêm do motor físico.
/* global p5, katex */

import { calcularTrajetoria, amostrar, PRESETS } from './physics.js';
import { fmt, fmtU, nLatex as n, marcas, casasPara } from './format.js';
import { paleta } from './tema.js';

const MONO = 'Geist Mono';

function deslizante(rotulo, min, max, passo, valor, unidade, aoMudar) {
  const el = document.createElement('label');
  el.className = 'lab-controle';
  el.innerHTML = `<span>${rotulo}<b class="mono"></b></span><input type="range" min="${min}" max="${max}" step="${passo}" value="${valor}">`;
  const b = el.querySelector('b'), r = el.querySelector('input');
  const mostrar = () => {
    b.textContent = `${fmt(Number(r.value), passo < 1 ? 2 : 0)} ${unidade}`;
    r.style.setProperty('--p', `${((r.value - min) / (max - min)) * 100}%`);
  };
  r.addEventListener('input', () => { mostrar(); aoMudar(Number(r.value)); });
  mostrar();
  return { el, set(v) { r.value = v; mostrar(); } };
}

function cabecalho(titulo, subtitulo) {
  return `<div class="lab-cab"><span class="fig">LABORATÓRIO</span><strong>${titulo}</strong><span class="suave">${subtitulo}</span></div>`;
}

/** Eixos e grade de um gráfico simples; devolve funções de escala. */
function eixos(p, x0, y0, w, h, tMax, vMin, vMax, rotY) {
  const P = paleta();
  const t = (a) => [...P.tinta, P.escuro ? a : Math.min(255, a * 1.6)];
  const my = marcas(vMin, vMax, 4), mt = marcas(0, tMax, 5);
  const lo = Math.min(my.lista[0], vMin), hi = Math.max(my.lista[my.lista.length - 1], vMax);
  const X = (v) => x0 + (v / tMax) * w, Y = (v) => y0 + h * (1 - (v - lo) / (hi - lo || 1));
  p.textFont(MONO); p.textSize(10); p.strokeWeight(1);
  for (const v of my.lista) {
    p.stroke(...t(v === 0 ? 40 : 12)); p.line(x0, Y(v), x0 + w, Y(v));
    p.noStroke(); p.fill(P.apagado); p.textAlign(p.RIGHT, p.CENTER); p.text(fmt(v, casasPara(my.passo)), x0 - 6, Y(v));
  }
  for (const v of mt.lista) {
    p.stroke(...t(12)); p.line(X(v), y0, X(v), y0 + h);
    p.noStroke(); p.fill(P.apagado); p.textAlign(p.CENTER, p.TOP); p.text(fmt(v, casasPara(mt.passo)), X(v), y0 + h + 5);
  }
  p.stroke(...t(46)); p.line(x0, y0, x0, y0 + h); p.line(x0, y0 + h, x0 + w, y0 + h);
  p.noStroke(); p.fill(P.apagado); p.textAlign(p.RIGHT, p.BOTTOM); p.text('t (s)', x0 + w, y0 + h + 28);
  p.textAlign(p.LEFT, p.BOTTOM); p.text(rotY, x0 + 4, y0 - 4);
  return { X, Y };
}

function curva(p, pts, X, Y, campo, cor, ate = Infinity, tracejada = false) {
  p.noFill(); p.stroke(cor); p.strokeWeight(tracejada ? 1.2 : 2);
  p.drawingContext.setLineDash(tracejada ? [4, 4] : []);
  p.beginShape();
  for (const s of pts) { if (s.t > ate) break; p.vertex(X(s.t), Y(s[campo])); }
  p.endShape();
  p.drawingContext.setLineDash([]);
}

function bolinha(p, x, y, cor, r = 8) {
  const c = p.color(cor); c.setAlpha(50);
  p.noStroke(); p.fill(c); p.circle(x, y, r * 3); p.fill(cor); p.circle(x, y, r * 2);
}

// ---------------------------------------------------------------------------
// 1. Equação horária ao vivo
// ---------------------------------------------------------------------------
export function labEquacao(el) {
  const st = { v0: 20, y0: 10, g: 9.81, t: 1.2, tocando: false };
  el.innerHTML = cabecalho('Equação horária ao vivo', 'Mexa nos controles e veja os números entrarem nas equações.') + `
    <div class="lab-corpo">
      <div class="lab-canvas"></div>
      <div class="lab-lado">
        <div class="lab-controles"></div>
        <div class="lab-planetas"></div>
        <div class="eq-viva" aria-live="polite"></div>
      </div>
    </div>`;
  const ctrl = el.querySelector('.lab-controles');
  let traj = calcularTrajetoria(st), pts = amostrar(traj, 300);
  const recalcular = () => {
    traj = calcularTrajetoria(st); pts = amostrar(traj, 300);
    st.t = Math.min(st.t, traj.tFim); cT.set(st.t);
    cT.el.querySelector('input').max = traj.tFim.toFixed(2);
    equacoes();
  };
  ctrl.append(
    deslizante('Velocidade inicial v₀', 0, 40, 0.5, st.v0, 'm/s', (v) => { st.v0 = v; recalcular(); }).el,
    deslizante('Altura inicial y₀', 0, 40, 0.5, st.y0, 'm', (v) => { st.y0 = v; recalcular(); }).el,
  );
  const cT = deslizante('Instante t', 0, traj.tFim, 0.01, st.t, 's', (v) => { st.t = v; st.tocando = false; equacoes(); });
  ctrl.append(cT.el);
  const planetas = el.querySelector('.lab-planetas');
  for (const k of ['terra', 'lua', 'marte', 'jupiter']) {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = PRESETS[k].nome; b.className = k === 'terra' ? 'ativo' : '';
    b.addEventListener('click', () => { st.g = PRESETS[k].g; planetas.querySelectorAll('button').forEach((x) => x.classList.toggle('ativo', x === b)); recalcular(); });
    planetas.appendChild(b);
  }
  const play = document.createElement('button');
  play.type = 'button'; play.className = 'botao escuro pequeno'; play.textContent = 'Animar';
  play.addEventListener('click', () => { if (st.t >= traj.tFim - 1e-6) st.t = 0; st.tocando = !st.tocando; play.textContent = st.tocando ? 'Pausar' : 'Animar'; });
  planetas.appendChild(play);

  const eq = el.querySelector('.eq-viva');
  function equacoes() {
    const e = traj.estado(st.t);
    const linhas = [
      `y = ${n(st.y0)} + ${n(st.v0)}\\cdot ${n(st.t)} - \\tfrac{1}{2}\\cdot ${n(st.g)}\\cdot ${n(st.t)}^2`,
      `y(${n(st.t)}) = \\mathbf{${n(e.y)}}\\ \\text{m}`,
      `v(${n(st.t)}) = ${n(st.v0)} - ${n(st.g)}\\cdot ${n(st.t)} = \\mathbf{${n(e.v)}}\\ \\text{m/s}`,
      `H_{\\text{máx}} = ${n(st.y0)} + \\tfrac{${n(st.v0)}^2}{2\\cdot ${n(st.g)}} = \\mathbf{${n(traj.hMax)}}\\ \\text{m}`,
    ];
    eq.innerHTML = linhas.map((l) => `<div class="eq-linha"></div>`).join('');
    eq.querySelectorAll('.eq-linha').forEach((d, i) => katex.render(linhas[i], d, { throwOnError: false, displayMode: false }));
  }
  equacoes();

  const caixa = el.querySelector('.lab-canvas');
  new p5((p) => {
    p.setup = () => { p.createCanvas(caixa.clientWidth, caixa.clientHeight); new ResizeObserver(() => p.resizeCanvas(caixa.clientWidth, caixa.clientHeight)).observe(caixa); };
    p.draw = () => {
      const P = paleta();
      if (st.tocando) {
        st.t = Math.min(traj.tFim, st.t + p.deltaTime / 1000);
        cT.set(st.t); equacoes();
        if (st.t >= traj.tFim) { st.tocando = false; play.textContent = 'Animar'; }
      }
      p.clear();
      const W = p.width, H = p.height, tira = 56;
      const hMax = Math.max(1, traj.hMax, st.y0) * 1.1;
      const { X, Y } = eixos(p, 46 + tira, 22, W - 64 - tira, H - 56, Math.max(traj.tFim, 0.1), 0, hMax, 'y (m)');
      curva(p, pts, X, Y, 'y', P.cenarios[0], Infinity, true);
      curva(p, pts, X, Y, 'y', P.cenarios[0], st.t);
      const e = traj.estado(st.t);
      // Tira vertical com a bola na altura real
      p.stroke(...P.tinta, 30); p.line(tira / 2 + 8, Y(0), tira / 2 + 8, Y(hMax / 1.1));
      bolinha(p, tira / 2 + 8, Y(e.y), P.cenarios[0], 7);
      p.drawingContext.setLineDash([2, 3]); p.stroke(P.cenarios[0]); p.line(tira / 2 + 18, Y(e.y), X(st.t), Y(e.y)); p.drawingContext.setLineDash([]);
      bolinha(p, X(st.t), Y(e.y), P.cenarios[0], 5);
      if (traj.tSubida > 0 && Number.isFinite(traj.tSubida)) {
        p.noStroke(); p.fill(P.suave); p.textAlign(p.LEFT, p.BOTTOM); p.textSize(10);
        p.text(`Hmáx ${fmtU(traj.hMax, 'm')}`, X(traj.tSubida) + 6, Y(traj.hMax) - 4);
      }
    };
  }, caixa);
}

// ---------------------------------------------------------------------------
// 2. Vetores na inversão do movimento
// ---------------------------------------------------------------------------
export function labVetores(el) {
  const traj = calcularTrajetoria({ v0: 15, y0: 0, g: 9.81 });
  const st = { t: 0, tocando: true, pausa: 0 };
  el.innerHTML = cabecalho('Velocidade e aceleração na subida e na descida', 'Observe o vetor velocidade encolher, sumir e inverter, enquanto a aceleração não muda.') + `
    <div class="lab-corpo vetores">
      <div class="lab-canvas"></div>
      <div class="lab-lado">
        <div class="fase" aria-live="polite"></div>
        <div class="lab-botoes">
          <button type="button" class="botao escuro pequeno" data-ir="0.9">Subida</button>
          <button type="button" class="botao escuro pequeno" data-ir="${traj.tSubida}">Ápice</button>
          <button type="button" class="botao escuro pequeno" data-ir="${traj.tSubida + 0.9}">Descida</button>
          <button type="button" class="botao claro pequeno" data-tocar>Pausar</button>
        </div>
      </div>
    </div>`;
  const fase = el.querySelector('.fase');
  const tocar = el.querySelector('[data-tocar]');
  el.querySelectorAll('[data-ir]').forEach((b) => b.addEventListener('click', () => { st.t = Number(b.dataset.ir); st.tocando = false; tocar.textContent = 'Animar'; }));
  tocar.addEventListener('click', () => { st.tocando = !st.tocando; tocar.textContent = st.tocando ? 'Pausar' : 'Animar'; });
  let faseAtual = '';
  const caixa = el.querySelector('.lab-canvas');
  new p5((p) => {
    p.setup = () => { p.createCanvas(caixa.clientWidth, caixa.clientHeight); new ResizeObserver(() => p.resizeCanvas(caixa.clientWidth, caixa.clientHeight)).observe(caixa); };
    p.draw = () => {
      const P = paleta();
      if (st.tocando) {
        if (st.pausa > 0) st.pausa -= p.deltaTime / 1000;
        else {
          const antes = st.t;
          st.t += (p.deltaTime / 1000) * 0.7;
          if (antes < traj.tSubida && st.t >= traj.tSubida) { st.t = traj.tSubida; st.pausa = 1.4; }
          if (st.t > traj.tTotal) { st.t = 0; st.pausa = 0.6; }
        }
      }
      const e = traj.estado(Math.min(st.t, traj.tTotal));
      const W = p.width, H = p.height, base = H - 30, topo = 26;
      const Y = (m) => base - ((base - topo) * m) / (traj.hMax * 1.05);
      p.clear();
      const cx = W * 0.32;
      p.stroke(...P.tinta, 30); p.line(cx, topo, cx, base);
      p.stroke(...P.linhaSolo); p.strokeWeight(1.5); p.line(20, base, W - 20, base); p.strokeWeight(1);
      // Vetores
      const escV = 4.2, escA = 5;
      const seta = (x, y, comp, cor, rot) => {
        if (Math.abs(comp) < 3) return;
        const fy = y - comp, d = Math.sign(comp);
        p.stroke(cor); p.strokeWeight(2.4); p.line(x, y, x, fy + d * 8);
        p.noStroke(); p.fill(cor); p.triangle(x, fy, x - 5, fy + d * 10, x + 5, fy + d * 10);
        p.textFont(MONO); p.textSize(11); p.textAlign(p.LEFT, p.CENTER); p.text(rot, x + 9, fy + d * 8);
      };
      const yb = Y(e.y);
      seta(cx + 34, yb, e.v * escV, P.velocidade, `v = ${fmt(e.v, 1)} m/s`);
      seta(cx - 34, yb, e.a * escA, P.aceleracao, '');
      p.noStroke(); p.fill(P.aceleracao); p.textFont(MONO); p.textSize(11); p.textAlign(p.RIGHT, p.CENTER);
      p.text(`a = ${fmt(e.a, 2)} m/s²`, cx - 46, yb + Math.abs(e.a * escA) * 0.6);
      bolinha(p, cx, yb, P.cenarios[0], 9);
      // Gráfico v(t) à direita
      const gx = W * 0.6, gw = W * 0.36, gy = topo + 10, gh = base - topo - 30;
      const V = (v) => gy + gh / 2 - (v / 15) * (gh / 2), T = (t) => gx + (t / traj.tTotal) * gw;
      p.stroke(...P.tinta, 40); p.line(gx, gy + gh / 2, gx + gw, gy + gh / 2); p.line(gx, gy, gx, gy + gh);
      p.stroke(P.velocidade); p.strokeWeight(2); p.line(T(0), V(15), T(Math.min(st.t, traj.tTotal)), V(e.v));
      p.drawingContext.setLineDash([3, 4]); p.strokeWeight(1); p.line(T(0), V(15), T(traj.tTotal), V(-15)); p.drawingContext.setLineDash([]);
      p.noStroke(); p.fill(P.velocidade); p.circle(T(Math.min(st.t, traj.tTotal)), V(e.v), 7);
      p.fill(P.apagado); p.textSize(10); p.textAlign(p.LEFT, p.BOTTOM); p.text('v (m/s) × t', gx + 4, gy - 4);
      p.textAlign(p.RIGHT, p.CENTER); p.text('0', gx - 5, gy + gh / 2);
      // Fase do movimento
      const nova = Math.abs(e.v) < 0.15 ? 'apice' : e.v > 0 ? 'subida' : 'descida';
      if (nova !== faseAtual) {
        faseAtual = nova;
        fase.className = `fase ${nova}`;
        fase.innerHTML = {
          subida: '<strong>Subindo: movimento retardado</strong><span>v &gt; 0 e a &lt; 0 têm sentidos opostos, então a velocidade diminui 9,81 m/s a cada segundo.</span>',
          apice: '<strong>Ápice: v = 0, mas a = −g</strong><span>A bola para por um instante, mas não está em equilíbrio. A aceleração continua apontando para baixo.</span>',
          descida: '<strong>Descendo: movimento acelerado</strong><span>v &lt; 0 e a &lt; 0 têm o mesmo sentido, então a rapidez aumenta.</span>',
        }[nova];
      }
    };
  }, caixa);
}

// ---------------------------------------------------------------------------
// 3. Vácuo × ar
// ---------------------------------------------------------------------------
export function labArrasto(el) {
  const st = { v0: 30, cd: 0.47, massa: 0.45 };
  el.innerHTML = cabecalho('Vácuo × resistência do ar', 'Aumente o arrasto ou diminua a massa e compare as duas curvas.') + `
    <div class="lab-corpo">
      <div class="lab-canvas"></div>
      <div class="lab-lado">
        <div class="lab-controles"></div>
        <table class="lab-tabela"><thead><tr><th></th><th>Vácuo</th><th>Com ar</th></tr></thead><tbody></tbody></table>
        <p class="lab-conclusao"></p>
      </div>
    </div>`;
  const ctrl = el.querySelector('.lab-controles');
  let ideal, ar, ptsI, ptsA;
  const corpo = el.querySelector('tbody'), conclusao = el.querySelector('.lab-conclusao');
  const recalcular = () => {
    ideal = calcularTrajetoria({ v0: st.v0, y0: 0, g: 9.81 });
    ar = calcularTrajetoria({ v0: st.v0, y0: 0, g: 9.81, arrasto: true, cd: st.cd, massa: st.massa, area: 0.038 });
    ptsI = amostrar(ideal, 300); ptsA = amostrar(ar, 300);
    const linha = (nome, a, b, u) => `<tr><td>${nome}</td><td>${fmtU(a, u)}</td><td>${fmtU(b, u)}</td></tr>`;
    corpo.innerHTML = linha('Altura máxima', ideal.hMax, ar.hMax, 'm') + linha('Subida', ideal.tSubida, ar.tSubida, 's')
      + linha('Descida', ideal.tTotal - ideal.tSubida, ar.tTotal - ar.tSubida, 's') + linha('Impacto', Math.abs(ideal.vImpacto), Math.abs(ar.vImpacto), 'm/s');
    const perda = 1 - ar.hMax / ideal.hMax;
    conclusao.innerHTML = st.cd === 0
      ? 'Sem arrasto, as duas curvas coincidem: o modelo ideal é exato.'
      : `Com ar, a bola sobe <strong>${fmt(perda * 100, 0)}% menos</strong> e a descida dura <strong>${fmt(ar.tTotal - ar.tSubida - ar.tSubida, 2)} s a mais</strong> que a subida.`;
  };
  ctrl.append(
    deslizante('Velocidade inicial', 5, 50, 1, st.v0, 'm/s', (v) => { st.v0 = v; recalcular(); }).el,
    deslizante('Coeficiente de arrasto Cd', 0, 1.5, 0.01, st.cd, '', (v) => { st.cd = v; recalcular(); }).el,
    deslizante('Massa', 0.05, 2, 0.01, st.massa, 'kg', (v) => { st.massa = v; recalcular(); }).el,
  );
  recalcular();
  const caixa = el.querySelector('.lab-canvas');
  new p5((p) => {
    p.setup = () => { p.createCanvas(caixa.clientWidth, caixa.clientHeight); new ResizeObserver(() => p.resizeCanvas(caixa.clientWidth, caixa.clientHeight)).observe(caixa); };
    p.draw = () => {
      const P = paleta();
      p.clear();
      const { X, Y } = eixos(p, 46, 22, p.width - 64, p.height - 56, Math.max(ideal.tTotal, ar.tTotal), 0, ideal.hMax * 1.1, 'y (m)');
      curva(p, ptsI, X, Y, 'y', P.suave, Infinity, true);
      curva(p, ptsA, X, Y, 'y', P.cenarios[0]);
      p.noStroke(); p.textFont(MONO); p.textSize(10.5); p.textAlign(p.LEFT, p.CENTER);
      p.fill(P.suave); p.text('vácuo', X(ideal.tSubida) + 8, Y(ideal.hMax) - 8);
      p.fill(P.cenarios[0]); p.text('com ar', X(ar.tSubida) + 8, Y(ar.hMax) + 12);
    };
  }, caixa);
}
