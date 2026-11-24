// Gráficos científicos em p5.js: posição, velocidade, aceleração e energia em função do tempo.
// Clicar ou arrastar sobre um gráfico seleciona o instante correspondente na simulação.
/* global p5 */

import { estado, cenariosAtivos, tFimGlobal, notificar } from './state.js';
import { amostrar, temposNaAltura } from './physics.js';
import { fmt, fmtU, marcas, casasPara } from './format.js';
import { paleta, corDe, fator } from './tema.js';

const MONO = 'Geist Mono';
const cacheAmostras = new WeakMap();
function amostras(traj) {
  if (!cacheAmostras.has(traj)) cacheAmostras.set(traj, amostrar(traj, 600));
  return cacheAmostras.get(traj);
}

/** Séries a desenhar: uma por cenário, ou as três energias do cenário selecionado. */
function series(cfg) {
  const P = paleta();
  if (cfg.tipo === 'energia') {
    const c = estado.cenarios[estado.modo === 'simples' ? 0 : estado.selecionado];
    const { massa, g } = c.traj.params;
    return [
      { traj: c.traj, cor: P.energia.ec, nome: 'Ec', valor: (s) => 0.5 * massa * s.v * s.v },
      { traj: c.traj, cor: P.energia.ep, nome: 'Ep', valor: (s) => massa * g * s.y },
      { traj: c.traj, cor: P.energia.em, nome: 'Em', valor: (s) => 0.5 * massa * s.v * s.v + massa * g * s.y },
    ];
  }
  const ativos = cenariosAtivos();
  return ativos.map((c) => ({ traj: c.traj, cor: corDe(c), nome: ativos.length > 1 ? c.id : '', valor: (s) => s[cfg.tipo], cenario: c }));
}

/**
 * @param {HTMLElement} container
 * @param {{tipo: 'y'|'v'|'a'|'energia', unidade: string, marcar?: 'apice'|'vzero'}} cfg
 */
export function criarGrafico(container, cfg) {
  return new p5((p) => {
    let escala = null;
    p.setup = () => {
      const cnv = p.createCanvas(container.clientWidth, container.clientHeight);
      p.textFont(MONO);
      new ResizeObserver(() => p.resizeCanvas(container.clientWidth, container.clientHeight)).observe(container);
      let arrastando = false;
      const selecionar = (ev) => {
        if (!escala) return;
        const r = cnv.elt.getBoundingClientRect();
        estado.t = Math.min(Math.max(0, escala.T(ev.clientX - r.left)), escala.tMax);
        estado.rodando = false;
        notificar('instante');
      };
      cnv.elt.addEventListener('pointerdown', (ev) => {
        if (!escala || !escala.dentro(ev, cnv.elt)) return;
        arrastando = true; cnv.elt.setPointerCapture(ev.pointerId); selecionar(ev);
      });
      cnv.elt.addEventListener('pointermove', (ev) => { if (arrastando) selecionar(ev); });
      cnv.elt.addEventListener('pointerup', () => { arrastando = false; });
    };
    p.draw = () => { escala = desenharGrafico(p, cfg); };
  }, container);
}

function desenharGrafico(p, cfg) {
  const P = paleta(), F = fator();
  const tinta = (a) => [...P.tinta, P.escuro ? a : Math.min(255, a * 1.6)];
  const M = { esq: 52 * F, dir: 14, topo: 14, base: 30 * F };
  const W = p.width, H = p.height;
  p.clear();
  const plotW = W - M.esq - M.dir, plotH = H - M.topo - M.base;
  if (plotW < 40 || plotH < 30) return null;

  const tMax = tFimGlobal();
  if (tMax <= 0) {
    p.noStroke(); p.fill(P.apagado); p.textAlign(p.CENTER, p.CENTER); p.textSize(11 * F);
    p.text('Sem movimento para os parâmetros atuais.', W / 2, H / 2);
    return null;
  }

  const lista = series(cfg);
  let vMin = 0, vMax = 0;
  for (const s of lista) for (const a of amostras(s.traj)) { const v = s.valor(a); vMin = Math.min(vMin, v); vMax = Math.max(vMax, v); }
  if (vMax - vMin < 1e-9) { vMax += 1; vMin -= 1; }
  const folga = (vMax - vMin) * 0.08;
  const my = marcas(vMin - (vMin < 0 ? folga : 0), vMax + (vMax > 0 ? folga : 0), 5);
  const yLo = Math.min(my.lista[0], vMin - (vMin < 0 ? folga : 0));
  const yHi = Math.max(my.lista[my.lista.length - 1], vMax + (vMax > 0 ? folga : 0));
  const mt = marcas(0, tMax, W < 360 ? 4 : 6);

  const X = (t) => M.esq + (t / tMax) * plotW;
  const Y = (v) => M.topo + plotH * (1 - (v - yLo) / (yHi - yLo));
  const T = (x) => ((x - M.esq) / plotW) * tMax;

  p.textSize(10 * F); p.strokeWeight(1);
  for (const v of my.lista) {
    if (v < yLo - 1e-9 || v > yHi + 1e-9) continue;
    p.stroke(...tinta(v === 0 ? 40 : 13)); p.line(M.esq, Y(v), W - M.dir, Y(v));
    p.noStroke(); p.fill(P.apagado); p.textAlign(p.RIGHT, p.CENTER);
    p.text(fmt(v, casasPara(my.passo)), M.esq - 7, Y(v));
  }
  for (const t of mt.lista) {
    p.stroke(...tinta(13)); p.line(X(t), M.topo, X(t), M.topo + plotH);
    p.noStroke(); p.fill(P.apagado); p.textAlign(p.CENTER, p.TOP);
    p.text(fmt(t, casasPara(mt.passo)), X(t), M.topo + plotH + 6);
  }
  p.stroke(...tinta(46)); p.line(M.esq, M.topo, M.esq, M.topo + plotH); p.line(M.esq, M.topo + plotH, W - M.dir, M.topo + plotH);
  p.noStroke(); p.fill(P.apagado); p.textAlign(p.RIGHT, p.BOTTOM); p.text('t (s)', W - M.dir, H - 2);

  const c2d = p.drawingContext;
  c2d.save(); c2d.beginPath(); c2d.rect(M.esq, M.topo - 2, plotW + 2, plotH + 4); c2d.clip();

  // Régua refletida no gráfico de posição
  if (cfg.tipo === 'y' && estado.regua !== null) {
    c2d.setLineDash([6, 4]); p.stroke(P.regua); p.strokeWeight(1); c2d.globalAlpha = 0.7;
    p.line(M.esq, Y(estado.regua), W - M.dir, Y(estado.regua));
    for (const s of lista) for (const tt of temposNaAltura(s.traj, estado.regua)) {
      p.stroke(s.cor); p.line(X(tt), Y(estado.regua), X(tt), M.topo + plotH);
    }
    c2d.setLineDash([]); c2d.globalAlpha = 1;
  }

  const marcacoes = [];
  for (const s of lista) {
    const pts = amostras(s.traj);
    p.noFill(); p.stroke(s.cor); p.strokeWeight(1);
    c2d.globalAlpha = P.escuro ? 0.22 : 0.35; c2d.setLineDash([3, 4]);
    p.beginShape(); for (const a of pts) p.vertex(X(a.t), Y(s.valor(a))); p.endShape();
    c2d.globalAlpha = 1; c2d.setLineDash([]);
    p.strokeWeight(2 * F);
    if (P.escuro) { c2d.shadowColor = s.cor; c2d.shadowBlur = 10; }
    p.beginShape();
    for (const a of pts) { if (a.t > estado.t) break; p.vertex(X(a.t), Y(s.valor(a))); }
    const tAtual = Math.min(estado.t, s.traj.tFim);
    const atual = s.traj.estado(tAtual);
    p.vertex(X(tAtual), Y(s.valor(atual)));
    p.endShape();
    p.noStroke(); p.fill(s.cor); p.circle(X(tAtual), Y(s.valor(atual)), 7 * F);
    c2d.shadowBlur = 0;

    const tr = s.traj;
    if (cfg.marcar && s.cenario && Number.isFinite(tr.tSubida) && tr.tSubida > 0 && tr.tSubida <= tr.tFim) {
      const alvoY = cfg.marcar === 'apice' ? tr.hMax : 0;
      const xs = X(tr.tSubida), ys = Y(alvoY);
      p.stroke(s.cor); p.strokeWeight(1); c2d.setLineDash([3, 3]);
      p.line(xs, ys, xs, M.topo + plotH); c2d.setLineDash([]);
      marcacoes.push({ cor: s.cor, xs, ys, txt: cfg.marcar === 'apice' ? `Hmáx ${fmtU(tr.hMax, 'm')}` : `v = 0 em ${fmtU(tr.tSubida, 's')}` });
    }
  }
  c2d.restore();

  p.textSize(10 * F);
  const ocupados = [];
  for (const m of marcacoes) {
    p.stroke(m.cor); p.fill(P.escuro ? '#08090a' : '#ffffff'); p.strokeWeight(2); p.circle(m.xs, m.ys, 8);
    const larg = p.textWidth(m.txt);
    const direita = m.xs + larg + 10 < W - M.dir;
    const x0 = direita ? m.xs + 6 : m.xs - 6 - larg;
    let yb = m.ys - 5;
    if (yb - 11 < M.topo) yb = m.ys + 17;
    while (ocupados.some((o) => x0 < o.x1 + 4 && x0 + larg > o.x0 - 4 && Math.abs(yb - o.y) < 13 * F)) yb += 13 * F;
    ocupados.push({ x0, x1: x0 + larg, y: yb });
    p.noStroke(); p.fill(P.escuro ? 'rgba(8,9,10,0.85)' : 'rgba(255,255,255,0.9)'); p.rect(x0 - 2, yb - 12 * F, larg + 4, 14 * F, 3);
    p.fill(m.cor); p.textAlign(p.LEFT, p.BOTTOM); p.text(m.txt, x0, yb);
  }
  if (cfg.tipo === 'energia') {
    let lx = M.esq + 8;
    p.textAlign(p.LEFT, p.CENTER);
    for (const s of lista) {
      p.noStroke(); p.fill(s.cor); p.rect(lx, M.topo + 6, 10, 3, 2);
      p.fill(P.suave); p.text(s.nome, lx + 14, M.topo + 8);
      lx += 14 + p.textWidth(s.nome) + 14;
    }
  }

  const xt = X(Math.min(estado.t, tMax));
  p.stroke(P.texto); p.strokeWeight(1); c2d.globalAlpha = 0.35;
  p.line(xt, M.topo, xt, M.topo + plotH); c2d.globalAlpha = 1;

  const mx = p.mouseX, myy = p.mouseY;
  if (mx >= M.esq && mx <= W - M.dir && myy >= M.topo && myy <= M.topo + plotH) {
    const tm = T(mx);
    p.stroke(P.suave); c2d.setLineDash([2, 3]); p.line(mx, M.topo, mx, M.topo + plotH); c2d.setLineDash([]);
    const linhas = [[P.texto, `t = ${fmtU(tm, 's')}`]];
    for (const s of lista) {
      const a = s.traj.estado(Math.min(tm, s.traj.tFim));
      linhas.push([s.cor, `${s.nome ? s.nome + ': ' : ''}${fmtU(s.valor(a), cfg.unidade)}`]);
    }
    p.textSize(10.5 * F);
    const larg = Math.max(...linhas.map(([, l]) => p.textWidth(l))) + 16;
    const alt = linhas.length * 15 * F + 10;
    let bx = mx + 10; if (bx + larg > W - 4) bx = mx - 10 - larg;
    const by = M.topo + 4;
    p.noStroke(); p.fill(P.escuro ? 'rgba(10,11,13,0.94)' : 'rgba(255,255,255,0.96)'); p.rect(bx, by, larg, alt, 7);
    p.stroke(...tinta(24)); p.noFill(); p.rect(bx, by, larg, alt, 7); p.noStroke();
    p.textAlign(p.LEFT, p.TOP);
    linhas.forEach(([cor, l], k) => { p.fill(cor); p.text(l, bx + 8, by + 6 + k * 15 * F); });
  }

  const dentro = (ev, elt) => {
    const r = elt.getBoundingClientRect();
    const x = ev.clientX - r.left, y = ev.clientY - r.top;
    return x >= M.esq && x <= r.width - M.dir && y >= M.topo && y <= r.height - M.base;
  };
  return { T, tMax, dentro };
}
