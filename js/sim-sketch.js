// Cena da simulação em p5.js: escala científica exata + arte do sketch original.
// Suporta tema claro/escuro, modo apresentação, régua, previsão e barras de energia.
/* global p5 */

import { estado, cenariosAtivos, tFimGlobal, alturaEscala, terminou, notificar } from './state.js';
import { fmt, fmtU, marcas, casasPara, passoBonito } from './format.js';
import { pintarCeu, animarCeu } from './cosmos.js';
import { paleta, corDe, fator } from './tema.js';
import { energia, temposNaAltura } from './physics.js';
import { desenharNewton } from './newton.js';

const MONO = 'Geist Mono';
const SANS = 'Geist';
const M = { esq: 64, dir: 22, topo: 66, base: 52 };

let geometria = null;            // última escala desenhada (para converter cliques em metros)
let filaEtiquetas = null;        // etiquetas desenhadas por último, por cima de tudo
const reacaoPrevisao = { mostrando: false, inicio: 0 };

export function criarSimulacao(container) {
  return new p5((p) => {
    let ceu = null;
    const impactos = new Map();

    const montarCeu = () => {
      if (p.width < 2 || p.height < 2) { ceu = null; return; }
      ceu?.remove();
      ceu = p.createGraphics(p.width, p.height);
      ceu.pixelDensity(1);
      pintarCeu(ceu, p.width, p.height, { densidade: 0.55, constelacao: true });
    };

    p.setup = () => {
      const cnv = p.createCanvas(container.clientWidth, container.clientHeight);
      p.textFont(SANS);
      montarCeu();
      new ResizeObserver(() => {
        if (container.clientWidth === p.width && container.clientHeight === p.height) return;
        p.resizeCanvas(container.clientWidth, container.clientHeight);
        montarCeu();
      }).observe(container);
      configurarFerramentas(cnv.elt);
    };
    p.draw = () => desenhar(p, ceu, impactos);
  }, container);
}

// ---------------------------------------------------------------------------
// Ferramentas de clique: régua de altura e previsão da altura máxima
// ---------------------------------------------------------------------------
function metrosNoPonto(elt, ev) {
  if (!geometria) return null;
  const r = elt.getBoundingClientRect();
  const x = ev.clientX - r.left, y = ev.clientY - r.top;
  const g = geometria;
  if (x < g.esq || x > g.W - g.dir || y < g.topo - 10 || y > g.ySolo + 4) return null;
  return Math.max(0, Math.min(g.yMax, (g.yMax * (g.ySolo - y)) / g.plotH));
}

function configurarFerramentas(elt) {
  let arrastando = false;
  const aplicar = (ev) => {
    const m = metrosNoPonto(elt, ev);
    if (m === null) return false;
    if (estado.ferramenta === 'regua') { estado.regua = m; notificar('regua'); }
    else if (estado.ferramenta === 'previsao') {
      if (estado.t > 0) return false; // palpite só antes do lançamento
      estado.previsao = m; notificar('previsao');
    }
    return true;
  };
  elt.addEventListener('pointerdown', (ev) => {
    if (!estado.ferramenta) return;
    if (aplicar(ev)) { arrastando = true; elt.setPointerCapture(ev.pointerId); }
  });
  elt.addEventListener('pointermove', (ev) => {
    elt.style.cursor = estado.ferramenta && metrosNoPonto(elt, ev) !== null ? 'ns-resize' : 'default';
    if (arrastando) aplicar(ev);
  });
  elt.addEventListener('pointerup', () => { arrastando = false; });
}

// ---------------------------------------------------------------------------
// Utilitários de desenho
// ---------------------------------------------------------------------------
const ctx = (p) => p.drawingContext;
const tracejado = (p, d) => ctx(p).setLineDash(d || []);
const alfa = (p, a) => { ctx(p).globalAlpha = a; };
const brilho = (p, cor, r) => { if (paleta().escuro) { ctx(p).shadowColor = cor; ctx(p).shadowBlur = r; } };
const semBrilho = (p) => { ctx(p).shadowBlur = 0; };
const tinta = (a) => { const t = paleta().tinta; return [t[0], t[1], t[2], paleta().escuro ? a : Math.min(255, a * 1.6)]; };
const ts = (p, n) => p.textSize(n * fator());

function pilula(p, x, y, texto, cor, alinhamento = 'esq') {
  if (filaEtiquetas) { filaEtiquetas.push([x, y, texto, cor, alinhamento, ctx(p).globalAlpha]); return; }
  desenharPilula(p, x, y, texto, cor, alinhamento);
}
function larguraPilula(p, texto) { p.textFont(MONO); ts(p, 10.5); return p.textWidth(texto) + 14 * fator(); }
function desenharPilula(p, x, y, texto, cor, alinhamento = 'esq') {
  const P = paleta(), F = fator();
  p.textFont(MONO); ts(p, 10.5);
  const w = p.textWidth(texto) + 14 * F, h = 19 * F;
  const x0 = alinhamento === 'dir' ? x - w : alinhamento === 'centro' ? x - w / 2 : x;
  p.noStroke(); p.fill(...P.fundoEtiqueta); p.rect(x0, y - h / 2, w, h, h / 2);
  p.stroke(...tinta(26)); p.noFill(); p.rect(x0, y - h / 2, w, h, h / 2);
  p.noStroke(); p.fill(cor); p.textAlign(p.LEFT, p.CENTER); p.text(texto, x0 + 7 * F, y + 0.5);
  p.textFont(SANS);
}

function seta(p, x, y, comprimento, cor, rotulo) {
  if (Math.abs(comprimento) < 4) return;
  const F = fator();
  const yFim = y - comprimento, dir = Math.sign(comprimento), cab = 9 * F;
  brilho(p, cor, 8);
  p.stroke(cor); p.strokeWeight(2 * F); p.strokeCap(p.ROUND);
  p.line(x, y, x, yFim + dir * cab * 0.8);
  p.noStroke(); p.fill(cor);
  p.triangle(x, yFim, x - 4.5 * F, yFim + dir * cab, x + 4.5 * F, yFim + dir * cab);
  semBrilho(p);
  p.textFont(MONO); ts(p, 11); p.textAlign(p.CENTER, dir > 0 ? p.BOTTOM : p.TOP);
  p.text(rotulo, x, yFim - dir * 4);
  p.textFont(SANS);
}

/** Boneco do sketch original. pose: 0 segurando, 1 preparando, 2 braço erguido, 3 correndo. */
function boneco(p, x, chao, escala, pose, t, espelhar = false) {
  const P = paleta();
  p.push();
  p.translate(x, chao);
  p.scale(espelhar ? -escala : escala, escala);
  const joelhos = pose === 0 ? 6 + Math.sin(t * 7) * 3 : 0;
  if (pose === 3) { p.translate(0, -Math.abs(Math.sin(t * 13)) * 9); p.rotate(0.2); }
  p.translate(0, joelhos);
  const traco = Math.max(4.2, 2.3 / escala);
  p.stroke(P.boneco); p.strokeWeight(traco); p.strokeCap(p.ROUND); p.strokeJoin(p.ROUND);
  p.fill(P.escuro ? '#0b0e14' : '#ffffff');
  p.ellipse(0, -125, 39, 43);
  p.noFill();
  p.line(0, -104, 2, -58);
  if (pose === 3) {
    const passo = Math.sin(t * 13);
    p.line(2, -58, 23 * passo, -30); p.line(23 * passo, -30, 39 * passo, 0);
    p.line(2, -58, -23 * passo, -27); p.line(-23 * passo, -27, -39 * passo, -3);
    p.line(0, -96, -30 * passo, -83); p.line(-30 * passo, -83, -34 * passo, -112);
    p.line(0, -96, 30 * passo, -80); p.line(30 * passo, -80, 38 * passo, -58);
  } else {
    p.line(2, -58, -18, -29); p.line(-18, -29, -29, -joelhos);
    p.line(2, -58, 23, -32); p.line(23, -32, 34, -joelhos);
    if (pose === 0) {
      p.line(0, -96, 22, -76); p.line(22, -76, 38, -76);
      p.line(0, -96, -24, -76); p.line(-24, -76, 10, -65);
    } else if (pose === 1) {
      p.line(0, -96, 34, -96); p.line(34, -96, 58, -125);
      p.line(0, -96, -26, -73); p.line(-26, -73, -10, -53);
    } else {
      p.line(0, -96, 44, -104); p.line(44, -104, 12, -146);
      p.line(0, -96, -27, -76); p.line(-27, -76, -15 + Math.sin(t * 6) * 4, -54);
    }
  }
  p.noStroke(); p.fill(P.boneco);
  p.ellipse(6, -129, 4, 5); p.ellipse(14, -128, 4, 5);
  p.noFill(); p.stroke(P.boneco); p.strokeWeight(Math.max(2, 1.4 / escala));
  if (pose >= 2) p.ellipse(11, -116, 7, 9); else p.arc(9, -120, 13, 9, 0, p.PI);
  p.stroke(P.cachecol); p.strokeWeight(Math.max(5, 3 / escala));
  p.line(-9, -101, 9, -99);
  p.line(-8, -100, -14, -86);
  p.pop();
}

/** Bola com halo; sx/sy achatam a bola no impacto. */
function bola(p, x, y, cor, raio, sx = 1, sy = 1) {
  p.noStroke();
  const c = p.color(cor);
  if (paleta().escuro) {
    c.setAlpha(26); p.fill(c); p.ellipse(x, y, raio * 3.6 * sx, raio * 3.6 * sy);
    c.setAlpha(60); p.fill(c); p.ellipse(x, y, raio * 2.5 * sx, raio * 2.5 * sy);
  } else {
    c.setAlpha(45); p.fill(c); p.ellipse(x, y, raio * 2.9 * sx, raio * 2.9 * sy);
  }
  brilho(p, cor, 18); p.fill(cor); p.ellipse(x, y, raio * 2 * sx, raio * 2 * sy); semBrilho(p);
  p.fill(255, 248, 225, 220); p.ellipse(x - raio * 0.3 * sx, y - raio * 0.38 * sy, raio * 0.6 * sx, raio * 0.6 * sy);
}

/** Prédio de onde parte o lançamento: platibanda, janelas em grade, porta e antena. */
function predio(p, esq, dir, topo, solo, semente, tSeg) {
  const P = paleta(), w = dir - esq, h = solo - topo;
  if (w < 24 || h < 8) return;
  p.noStroke(); p.fill(...P.predio); p.rect(esq, topo, w, h);
  p.stroke(...tinta(28)); p.strokeWeight(1); p.noFill(); p.rect(esq, topo, w, h);
  p.noStroke(); p.fill(...tinta(P.escuro ? 40 : 60)); p.rect(esq - 3, topo - 4, w + 6, 4, 1);
  const jw = 6, jh = 8, gx = 14, gy = 14;
  const cols = Math.max(0, Math.floor((w - 16 + gx - jw) / gx));
  const linhas = Math.max(0, Math.floor((h - 34 + gy - jh) / gy));
  const x0 = esq + (w - (cols * gx - (gx - jw))) / 2;
  let k = 0;
  for (let r = 0; r < linhas; r++) {
    for (let c = 0; c < cols; c++) {
      const acesa = ((k * 7919 + semente * 131) % 13) < 2;
      p.fill(...(acesa ? P.janelaAcesa : P.janelaApagada));
      p.rect(x0 + c * gx, topo + 12 + r * gy, jw, jh, 1.5);
      k++;
    }
  }
  if (h > 40) { p.fill(...tinta(P.escuro ? 22 : 70)); p.rect(esq + w / 2 - 6, solo - 16, 12, 16, 2, 2, 0, 0); }
  const ax = esq + w * 0.78;
  p.stroke(...tinta(70)); p.strokeWeight(1.2); p.line(ax, topo - 4, ax, topo - 20);
  p.noStroke(); p.fill(255, 90, 90, 120 + 135 * (0.5 + 0.5 * Math.sin(tSeg * 3 + semente)));
  p.circle(ax, topo - 21, 3.5);
}

/** Solo com grade em perspectiva fugindo para o horizonte. */
function solo(p, W, H, ySolo) {
  const P = paleta();
  const g = ctx(p).createLinearGradient(0, ySolo - 140, 0, ySolo);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, P.horizonte);
  ctx(p).fillStyle = g; ctx(p).fillRect(M.esq, ySolo - 140, W - M.esq - M.dir, 140);
  p.noStroke(); p.fill(...P.solo); p.rect(0, ySolo, W, H - ySolo);
  ctx(p).save();
  ctx(p).beginPath(); ctx(p).rect(0, ySolo, W, H - ySolo); ctx(p).clip();
  const cx = M.esq + (W - M.esq - M.dir) / 2, vy = ySolo - 90, prof = H - ySolo;
  p.stroke(...P.hachura); p.strokeWeight(1);
  alfa(p, 0.55);
  for (let i = -22; i <= 22; i++) {
    const xb = cx + i * 46;
    p.line(cx + (xb - cx) * 0.02, vy, xb + (xb - cx) * 1.2, H + prof);
  }
  for (let k = 1; k <= 6; k++) {
    const y = ySolo + prof * Math.pow(k / 6, 1.8);
    p.line(0, y, W, y);
  }
  alfa(p, 1);
  ctx(p).restore();
  p.stroke(...P.linhaSolo); p.strokeWeight(1.5); p.line(M.esq, ySolo, W - M.dir, ySolo);
}

// ---------------------------------------------------------------------------
// Quadro
// ---------------------------------------------------------------------------
function desenhar(p, ceu, impactos) {
  const P = paleta(), F = fator();
  const W = p.width, H = p.height;
  const estreito = W < 640;
  const ativos = cenariosAtivos();
  const simples = ativos.length === 1;
  const valoresNoTopo = estado.mostrar.valores && simples;
  M.esq = Math.round(64 + (F - 1) * 36);
  M.topo = Math.round((estreito && valoresNoTopo ? 96 : 68) * F);
  M.base = Math.round((simples ? 52 : 66) * F);
  const tSeg = p.millis() / 1000;

  p.clear();
  const grad = ctx(p).createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, P.ceu[0]); grad.addColorStop(0.75, P.ceu[1]); grad.addColorStop(1, P.ceu[2]);
  ctx(p).fillStyle = grad; ctx(p).fillRect(0, 0, W, H);
  if (P.escuro) {
    if (ceu) { alfa(p, 0.9); p.image(ceu, 0, 0); alfa(p, 1); }
    animarCeu(p, W, H, tSeg, { orbitas: W > 700 && !estado.apresentacao, meteoro: true, cintilantes: 34 });
  }

  const plotW = W - M.esq - M.dir, plotH = H - M.topo - M.base;
  if (plotW < 60 || plotH < 60) return;

  // Escala vertical com folga para o boneco no topo do prédio
  const escalaBoneco = Math.max(0.3, Math.min(0.55, plotH / 1050)) * (simples ? 1 : 0.85) * (estado.apresentacao ? 1.1 : 1);
  const folgaBoneco = (150 - 76) * escalaBoneco + 24;
  const y0Max = Math.max(...ativos.map((c) => c.traj.params.y0));
  const alvo = Math.max(alturaEscala() * 1.08, plotH > folgaBoneco ? (y0Max * plotH) / (plotH - folgaBoneco) : 0,
    estado.previsao !== null && simples ? estado.previsao * 1.05 : 0);
  const { lista: ticks, passo } = marcas(0, alvo, estreito ? 5 : 7);
  const yMax = Math.max(ticks[ticks.length - 1], passo, alvo);
  const ySolo = M.topo + plotH;
  const Y = (m) => M.topo + plotH * (1 - m / yMax);
  geometria = { esq: M.esq, dir: M.dir, topo: M.topo, plotH, yMax, ySolo, W };

  p.textFont(MONO); ts(p, 10.5); p.textAlign(p.RIGHT, p.CENTER);
  for (const v of ticks) {
    const y = Y(v);
    p.stroke(...tinta(12)); p.strokeWeight(1); p.line(M.esq, y, W - M.dir, y);
    p.stroke(...tinta(70)); p.line(M.esq - 6, y, M.esq, y);
    p.noStroke(); p.fill(P.apagado); p.text(fmt(v, casasPara(passo)), M.esq - 10, y);
  }
  p.stroke(...tinta(30));
  for (let v = 0; v <= yMax + 1e-9; v += passo / 5) p.line(M.esq - 3, Y(v), M.esq, Y(v));
  p.stroke(...tinta(50)); p.line(M.esq, M.topo - 10, M.esq, ySolo);
  if (!estreito) {
    p.push(); p.translate(15, M.topo + plotH / 2); p.rotate(-p.HALF_PI);
    p.noStroke(); p.fill(P.apagado); p.textAlign(p.CENTER, p.CENTER); ts(p, 10); p.text('ALTURA (m)', 0, 0); p.pop();
  }
  p.textFont(SANS);

  solo(p, W, H, ySolo);

  const tFim = tFimGlobal();
  const dtMarca = passoBonito(Math.max(tFim, 0.1), 24);
  let vRef = 1, aRef = 1;
  for (const c of ativos) {
    const tr = c.traj;
    vRef = Math.max(vRef, Math.abs(tr.params.v0), Math.abs(tr.vImpacto || 0),
      Number.isFinite(tr.hMax) ? Math.sqrt(2 * tr.params.g * Math.max(0, tr.hMax)) : 0);
    aRef = Math.max(aRef, tr.params.g);
  }
  const escV = (plotH * 0.22) / vRef, escA = (plotH * 0.14) / aRef, limiteSeta = plotH * 0.32;

  filaEtiquetas = [];
  const colW = plotW / ativos.length;
  const reservaEnergia = estado.mostrar.energia && simples ? 150 * F : 0;

  if (estado.regua !== null) {
    const yr = Y(estado.regua);
    tracejado(p, [8, 5]); p.stroke(P.regua); p.strokeWeight(1.2 * F); alfa(p, 0.75);
    p.line(M.esq, yr, W - M.dir, yr); tracejado(p); alfa(p, 1);
    pilula(p, M.esq + 8, yr - 14 * F, `régua h = ${fmtU(estado.regua, 'm')}`, P.regua);
  }

  ativos.forEach((c, i) => {
    const tr = c.traj, pr = tr.params, cor = corDe(c);
    const colEsq = M.esq + colW * i;
    const largUtil = colW - (simples ? reservaEnergia : 0);
    const x = colEsq + largUtil * (simples ? 0.56 : 0.6);
    const e = tr.estado(estado.t);
    const meia = Math.min(largUtil * 0.3, 120);
    const colDir = colEsq + largUtil - 4;
    const fimLinha = simples ? Math.min(Math.max(x + meia, colDir - 120 * F), colDir - 118 * F) : colDir - 4;

    const raio = (simples ? 10.5 : 9) * F;
    const altMao = 76 * escalaBoneco;
    const yTopo = Y(pr.y0) + altMao;
    const temPredio = yTopo < ySolo - 6;
    const pesEm = temPredio ? yTopo : ySolo;
    const predioDir = x - 16, predioEsq = Math.max(colEsq + 10, predioDir - Math.min(170, largUtil * 0.42));
    if (temPredio) predio(p, predioEsq, predioDir, yTopo, ySolo, i + 1, tSeg);

    const yY0 = Y(pr.y0);
    tracejado(p, [3, 4]); p.stroke(...tinta(60)); p.strokeWeight(1);
    p.line(x - 16 * F, yY0, fimLinha, yY0); tracejado(p);
    const temHmax = Number.isFinite(tr.hMax) && tr.tSubida > 0;
    const yH = temHmax ? Y(tr.hMax) : null;
    const cabecaBoneco = pesEm - 160 * escalaBoneco;
    const hmaxNoBoneco = temHmax && yH > cabecaBoneco - 10 && yH < pesEm + 4;
    if (temHmax) {
      const atingida = estado.t >= tr.tSubida;
      tracejado(p, [6, 5]); p.stroke(cor); p.strokeWeight(1); alfa(p, atingida ? 0.95 : 0.4);
      p.line(hmaxNoBoneco ? x - 16 * F : x - meia, yH, fimLinha, yH); tracejado(p); alfa(p, 1);
    }
    if (simples) {
      pilula(p, fimLinha + 6, yY0, `y0 ${fmtU(pr.y0, 'm')}`, P.suave);
      if (temHmax) {
        const esconder = estado.previsao !== null && estado.t < tr.tSubida;
        const yEt = Math.abs(yH - yY0) < 22 * F ? yY0 - 22 * F : yH;
        alfa(p, estado.t >= tr.tSubida ? 1 : 0.6);
        pilula(p, fimLinha + 6, yEt, esconder ? 'Hmáx ?' : `Hmáx ${fmtU(tr.hMax, 'm')}`, cor);
        alfa(p, 1);
      }
    } else if (temHmax) {
      const txt = `Hmáx ${fmt(tr.hMax, 1)}`;
      const larg = larguraPilula(p, txt);
      const xEsq = x - meia - 6;
      const colideBoneco = yH > cabecaBoneco - 14 && yH < pesEm + 4;
      alfa(p, estado.t >= tr.tSubida ? 1 : 0.6);
      if (xEsq - larg >= colEsq + 2 && !colideBoneco) pilula(p, xEsq, yH, txt, cor, 'dir');
      else pilula(p, Math.min(x + meia + 6, colDir - larg), yH, txt, cor);
      alfa(p, 1);
    }

    if (simples && estado.previsao !== null) {
      const yp = Y(estado.previsao);
      tracejado(p, [2, 4]); p.stroke(P.previsao); p.strokeWeight(2 * F); p.line(x - meia - 20, yp, fimLinha, yp); tracejado(p);
      p.noStroke(); p.fill(P.previsao);
      p.triangle(x - meia - 20, yp, x - meia - 30, yp - 6, x - meia - 30, yp + 6);
      pilula(p, x - meia - 34, yp, `palpite ${fmtU(estado.previsao, 'm')}`, P.previsao, 'dir');
    }

    const grd = ctx(p).createLinearGradient(0, M.topo, 0, ySolo);
    grd.addColorStop(0, 'rgba(128,128,128,0)'); grd.addColorStop(1, P.escuro ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.12)');
    ctx(p).strokeStyle = grd; ctx(p).lineWidth = 1;
    ctx(p).beginPath(); ctx(p).moveTo(x, M.topo); ctx(p).lineTo(x, ySolo); ctx(p).stroke();

    if (estado.mostrar.trajetoria) {
      p.noStroke();
      for (let tk = 0; tk <= Math.min(estado.t, tr.tFim) + 1e-9; tk += dtMarca) {
        const s = tr.estado(tk);
        p.fill(cor); alfa(p, 0.45);
        p.circle(x + (s.v > 0 ? -11 : 11) * F, Y(s.y), 4 * F);
      }
      for (let k = 8; k >= 1; k--) {
        const tp = Math.max(0, Math.min(estado.t, tr.tFim) - k * 0.018 * Math.max(1, tFim / 3));
        alfa(p, 0.32 * (1 - k / 9));
        p.fill(cor); p.circle(x, Y(tr.estado(tp).y), (16 - k) * F);
      }
      alfa(p, 1);
    }

    if (estado.regua !== null) {
      const tempos = temposNaAltura(tr, estado.regua);
      const yr = Y(estado.regua);
      p.noFill(); p.stroke(cor); p.strokeWeight(2 * F);
      tempos.forEach((tt, k) => p.circle(x + (k === 0 && tempos.length > 1 ? -12 : 12) * F, yr, 9 * F));
      const txt = simples
        ? (tempos.length ? tempos.map((tt, k) => `t${k + 1} ${fmt(tt, 2)} s`).join('  ') : 'não alcança')
        : (tempos.length ? tempos.map((tt) => fmt(tt, 2)).join(' · ') + ' s' : 'não alcança');
      pilula(p, simples ? x + 30 * F : x, yr + 16 * F, txt, cor, simples ? 'esq' : 'centro');
    }

    {
      const t = estado.t;
      const fugindo = tr.tSubida > 0 && Number.isFinite(tr.tSubida) && t > tr.tSubida && t <= tr.tFim + 0.01;
      const xBase = x - 38 * escalaBoneco - raio * 0.55;
      let bx = xBase, pose = 0, espelhar = false;
      if (t === 0) pose = 0;
      else if (!fugindo) pose = t < Math.min(0.12, tr.tFim / 6) ? 1 : 2;
      else {
        const f = ((t - tr.tSubida) / Math.max(tr.tFim - tr.tSubida, 0.3)) * 4;
        const dx = (190 * f + 40 * f * f) * escalaBoneco;
        const limite = temPredio ? predioEsq + 24 * escalaBoneco : colEsq + 26 * escalaBoneco + 14;
        bx = Math.max(limite, xBase - dx);
        const parado = bx <= limite + 0.5;
        pose = parado ? 2 : 3; espelhar = !parado;
      }
      if (terminou() && t > 0 && tr.tSubida > 0) pose = 2;
      p.noStroke(); p.fill(0, 0, 0, P.escuro ? 90 : 28); p.ellipse(bx + 3, pesEm + 1, 74 * escalaBoneco, 8 * escalaBoneco);
      boneco(p, bx, pesEm, escalaBoneco, pose, tSeg, espelhar);
      if (pose === 3) {
        p.stroke(...tinta(90)); p.strokeWeight(1.5);
        for (let k = 0; k < 3; k++) {
          const yy = pesEm - (90 - k * 23) * escalaBoneco;
          p.line(bx + (50 + k * 6) * escalaBoneco, yy, bx + 28 * escalaBoneco, yy);
        }
      }
    }

    let sx = 1, sy = 1;
    if (tr.atingeSolo && estado.t >= tr.tTotal && tr.tTotal > 0) {
      if (!impactos.has(c.id)) impactos.set(c.id, p.millis());
      const d = (p.millis() - impactos.get(c.id)) / 1000;
      if (d < 0.9) {
        p.noFill(); p.strokeWeight(2);
        const cc = p.color(cor);
        cc.setAlpha(170 * (1 - d / 0.9)); p.stroke(cc); p.ellipse(x, ySolo, 26 + d * 150, 6 + d * 26);
        cc.setAlpha(90 * (1 - d / 0.9)); p.stroke(cc); p.ellipse(x, ySolo, 14 + d * 80, 3 + d * 14);
      }
      const amort = Math.exp(-d * 9) * Math.cos(d * 26);
      sy = 1 - 0.38 * Math.max(0, amort); sx = 1 + 0.32 * Math.max(0, amort);
    } else impactos.delete(c.id);

    const yObj = Y(e.y);
    bola(p, x, Math.min(yObj, ySolo - raio * sy), cor, raio, sx, sy);

    p.noStroke(); p.fill(cor);
    p.triangle(M.esq + 1, yObj, M.esq + 9 * F, yObj - 5 * F, M.esq + 9 * F, yObj + 5 * F);
    if (i === indiceSelecionado(ativos)) {
      p.stroke(cor); p.strokeWeight(1); tracejado(p, [2, 4]); alfa(p, 0.45);
      p.line(M.esq + 12, yObj, x - 16, yObj); tracejado(p); alfa(p, 1);
    }

    if (estado.mostrar.vetores && !e.noSolo) {
      seta(p, x + 24 * F, yObj, Math.max(-limiteSeta, Math.min(limiteSeta, e.v * escV)), P.velocidade, 'v');
      seta(p, x + 46 * F, yObj, Math.max(-limiteSeta, Math.min(limiteSeta, e.a * escA)), P.aceleracao, 'a');
    }

    p.noStroke(); p.textFont(MONO); ts(p, 10.5); p.textAlign(p.CENTER, p.TOP);
    let yLinha = ySolo + 10;
    if (!simples) {
      p.fill(cor); p.text(`CENÁRIO ${c.id} · g ${fmt(pr.g, 2)}`, x, yLinha); yLinha += 15 * F;
      if (estado.mostrar.valores) {
        p.fill(P.texto); p.text(`y ${fmt(e.y, 1)} m   v ${fmt(e.v, 1)} m/s`, x, yLinha); yLinha += 15 * F;
      }
    }
    if (estado.t >= tr.tFim && estado.t > 0) {
      p.fill(P.suave);
      p.text(tr.atingeSolo ? `impacto em ${fmtU(tr.tTotal, 's')}` : 'não retorna ao solo', x, yLinha);
    }
    p.textFont(SANS);
  });

  if (estado.mostrar.energia && simples) desenharEnergia(p, ativos[0], W - M.dir - reservaEnergia + 14 * F, M.topo + 8, reservaEnergia - 18 * F, ySolo - 12);

  if (simples && estado.previsao !== null) desenharResultadoPrevisao(p, ativos[0], W, ySolo);
  else reacaoPrevisao.mostrando = false;

  const fila = filaEtiquetas; filaEtiquetas = null;
  for (const [x, y, t, cor, al, a] of fila) { alfa(p, a); desenharPilula(p, x, y, t, cor, al); }
  alfa(p, 1);

  desenharFaixaSuperior(p, W, ativos, valoresNoTopo, estreito, dtMarca, escV, escA);

  if (simples && !estreito) {
    p.noStroke(); p.fill(P.apagado); p.textFont(MONO); ts(p, 9.5); p.textAlign(p.LEFT, p.BOTTOM);
    p.text('BONECO E PRÉDIO FORA DE ESCALA', M.esq + 4, H - 8);
    p.textFont(SANS);
  }

  if (estado.aviso && performance.now() < estado.aviso.ate) {
    const resta = (estado.aviso.ate - performance.now()) / 400;
    alfa(p, Math.min(1, resta));
    p.textFont(SANS); ts(p, 15);
    const w = p.textWidth(estado.aviso.texto) + 36 * F, h = 38 * F;
    const xa = M.esq + plotW / 2 - w / 2, ya = M.topo + 8;
    p.noStroke(); p.fill(...P.fundoEtiqueta); p.rect(xa, ya, w, h, h / 2);
    p.stroke(P.escuro ? 'rgba(61,220,190,0.6)' : 'rgba(15,159,134,0.7)'); p.strokeWeight(1.5); p.noFill(); p.rect(xa, ya, w, h, h / 2);
    p.noStroke(); p.fill(P.texto); p.textAlign(p.CENTER, p.CENTER); p.text(estado.aviso.texto, xa + w / 2, ya + h / 2 + 1);
    alfa(p, 1);
  }

  if (terminou() && ativos.every((c) => !c.traj.atingeSolo) && tFim > 0) {
    p.noStroke(); p.fill(P.suave); p.textAlign(p.CENTER, p.CENTER); ts(p, 12);
    p.text(`Limite de simulação de ${fmt(tFim, 0)} s atingido.`, M.esq + plotW / 2, M.topo + 4);
  }
}

function desenharFaixaSuperior(p, W, ativos, valoresNoTopo, estreito, dtMarca, escV, escA) {
  const P = paleta(), F = fator();
  const faixa = ctx(p).createLinearGradient(0, 0, 0, M.topo);
  faixa.addColorStop(0, P.escuro ? 'rgba(7,8,10,0.92)' : 'rgba(255,255,255,0.95)');
  faixa.addColorStop(1, P.escuro ? 'rgba(7,8,10,0)' : 'rgba(255,255,255,0)');
  ctx(p).fillStyle = faixa; ctx(p).fillRect(0, 0, W, M.topo - 8);
  p.noStroke(); p.textFont(MONO);
  const grupo = (x0, y0, rotulo, valor, cor) => {
    p.textAlign(p.LEFT, p.CENTER);
    ts(p, 10); p.fill(P.apagado); p.text(rotulo, x0, y0);
    const wr = p.textWidth(rotulo);
    ts(p, 17); p.fill(cor); p.text(valor, x0, y0 + 20 * F);
    return Math.max(p.textWidth(valor), wr);
  };
  let hx = M.esq + 2;
  hx += grupo(hx, 16 * F, 'TEMPO', fmtU(estado.t, 's'), P.texto) + 10;
  ts(p, 10.5); p.fill(P.suave); p.textAlign(p.LEFT, p.CENTER);
  p.text(`${String(estado.velocidade).replace('.', ',')}×`, hx, 37 * F);
  hx += 40 * F;
  if (valoresNoTopo) {
    const e0 = ativos[0].traj.estado(estado.t);
    const itens = [['ALTURA', fmtU(e0.y, 'm'), P.texto], ['VELOCIDADE', fmtU(e0.v, 'm/s'), P.velocidade], ['ACELERAÇÃO', fmtU(e0.a, 'm/s²'), P.aceleracao]];
    let vx = hx, vy = 16 * F;
    if (estreito) { vx = M.esq + 2; vy = 56; }
    for (const [r, v, cor] of itens) {
      p.stroke(...tinta(20)); p.strokeWeight(1); p.line(vx - 14 * F, vy - 6, vx - 14 * F, vy + 28 * F); p.noStroke();
      vx += grupo(vx, vy, r, v, cor) + 30 * F;
    }
    if (!estreito) hx = vx;
  }
  const fimValores = hx;
  if (!estreito) {
    p.textAlign(p.RIGHT, p.CENTER); ts(p, 10); p.noStroke();
    const tRastro = `RASTRO A CADA ${fmtU(dtMarca, 's', casasPara(dtMarca)).toUpperCase()}`;
    if (estado.mostrar.trajetoria && W - M.dir - p.textWidth(tRastro) > (valoresNoTopo ? fimValores + 24 : 0)) {
      p.fill(P.apagado); p.text(tRastro, W - M.dir, 16 * F);
    }
    // Escala dos vetores: rodapé à direita no modo simples; topo na comparação
    const yd = valoresNoTopo ? p.height - 14 * F : 36 * F;
    if (estado.mostrar.vetores) {
      // Escala dos vetores: um traço de comprimento conhecido para cada grandeza
      const nv = passoBonito((80 * F) / escV, 1), na = passoBonito((80 * F) / escA, 1);
      const lv = nv * escV, la = na * escA;
      let xd = W - M.dir;
      const tA = `${fmt(na, casasPara(na))} m/s²`, tV = `${fmt(nv, casasPara(nv))} m/s`;
      const traco = (x1, x2, cor) => {
        p.stroke(cor); p.strokeWeight(2 * F); p.line(x1, yd, x2, yd);
        p.strokeWeight(1.5); p.line(x1, yd - 3, x1, yd + 3); p.line(x2, yd - 3, x2, yd + 3); p.noStroke();
      };
      p.fill(P.apagado); p.text(tA, xd, yd); xd -= p.textWidth(tA) + 6;
      traco(xd - la, xd, P.aceleracao); xd -= la + 14;
      p.fill(P.apagado); p.text(tV, xd, yd); xd -= p.textWidth(tV) + 6;
      traco(xd - lv, xd, P.velocidade); xd -= lv + 10;
      p.fill(P.apagado); p.text('ESCALA', xd, yd);
    }
  }
  p.textFont(SANS);
}

function desenharEnergia(p, cenario, x0, yTopo, larg, yBase) {
  const P = paleta(), F = fator();
  const tr = cenario.traj;
  const en = energia(tr, Math.min(estado.t, tr.tFim));
  const e0 = energia(tr, 0).em;
  const eMax = Math.max(e0, en.em, en.ec, en.ep, 1e-9);
  const altura = Math.max(60, yBase - yTopo - 70 * F);
  p.noStroke(); p.fill(...P.fundoEtiqueta); p.rect(x0 - 10, yBase - altura - 60 * F, larg + 4, altura + 72 * F, 10);
  p.stroke(...tinta(24)); p.noFill(); p.rect(x0 - 10, yBase - altura - 60 * F, larg + 4, altura + 72 * F, 10);
  p.noStroke(); p.textFont(MONO); ts(p, 10); p.fill(P.apagado); p.textAlign(p.LEFT, p.TOP);
  p.text('ENERGIA (J)', x0, yBase - altura - 50 * F);
  const barras = [['Ec', en.ec, P.energia.ec], ['Ep', en.ep, P.energia.ep], ['Em', en.em, P.energia.em]];
  const bw = Math.min(26 * F, (larg - 24) / 3 - 8), gap = (larg - 3 * bw) / 3;
  barras.forEach(([nome, val, cor], k) => {
    const bx = x0 + gap / 2 + k * (bw + gap);
    const h = (Math.max(0, val) / eMax) * altura;
    p.fill(...tinta(14)); p.rect(bx, yBase - altura - 10, bw, altura, 4);
    brilho(p, cor, 10); p.fill(cor); p.rect(bx, yBase - 10 - h, bw, h, 4); semBrilho(p);
    p.textAlign(p.CENTER, p.TOP); ts(p, 10.5); p.fill(P.texto); p.text(nome, bx + bw / 2, yBase - 4);
    p.textAlign(p.CENTER, p.BOTTOM); ts(p, 9.5); p.fill(P.suave); p.text(fmt(val, val >= 100 ? 0 : 1), bx + bw / 2, yBase - altura - 14);
  });
  const yE0 = yBase - 10 - (e0 / eMax) * altura;
  tracejado(p, [3, 3]); p.stroke(P.energia.em); p.strokeWeight(1); alfa(p, 0.6);
  p.line(x0 - 4, yE0, x0 + larg - 8, yE0); tracejado(p); alfa(p, 1);
  p.textFont(SANS);
}

function desenharResultadoPrevisao(p, cenario, W, ySolo) {
  const P = paleta(), F = fator();
  const tr = cenario.traj;
  if (!(tr.tSubida > 0) || !Number.isFinite(tr.hMax) || estado.t < tr.tSubida) { reacaoPrevisao.mostrando = false; return; }
  const erro = Math.abs(estado.previsao - tr.hMax) / tr.hMax;
  if (!reacaoPrevisao.mostrando) { reacaoPrevisao.mostrando = true; reacaoPrevisao.inicio = p.millis(); }
  const humor = erro <= 0.1 ? 2 : erro <= 0.25 ? 0 : 1;
  const msg = erro <= 0.1 ? 'Excelente previsão!' : erro <= 0.25 ? 'Chegou perto.' : 'A gravidade surpreendeu!';
  const wCaixa = 300 * F, hCaixa = 104 * F;
  const xc = W - M.dir - wCaixa - (estado.mostrar.energia ? 150 * F : 0), yc = ySolo - hCaixa - 14;
  p.noStroke(); p.fill(...P.fundoEtiqueta); p.rect(xc, yc, wCaixa, hCaixa, 12);
  p.stroke(P.previsao); p.strokeWeight(1.2); p.noFill(); p.rect(xc, yc, wCaixa, hCaixa, 12);
  desenharNewton(p, xc + 46 * F, yc + hCaixa - 8, 0.36 * F, humor, reacaoPrevisao.inicio);
  p.noStroke(); p.textFont(SANS); p.textAlign(p.LEFT, p.TOP);
  ts(p, 14); p.fill(P.texto); p.text(msg, xc + 94 * F, yc + 14 * F);
  p.textFont(MONO); ts(p, 11); p.fill(P.suave);
  p.text(`palpite  ${fmtU(estado.previsao, 'm')}`, xc + 94 * F, yc + 40 * F);
  p.text(`real     ${fmtU(tr.hMax, 'm')}`, xc + 94 * F, yc + 56 * F);
  p.fill(humor === 2 ? P.previsao : humor === 1 ? P.aceleracao : P.texto);
  p.text(`erro     ${fmt(erro * 100, 1)} %`, xc + 94 * F, yc + 72 * F);
  p.textFont(SANS);
}

function indiceSelecionado(ativos) {
  const alvo = estado.cenarios[estado.modo === 'simples' ? 0 : estado.selecionado];
  return Math.max(0, ativos.indexOf(alvo));
}
