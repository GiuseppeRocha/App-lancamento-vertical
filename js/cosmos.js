// Céu do sketch original (prepararCeu + desenharFundo do LancamentoVertical.pde),
// portado para p5.js como fundo fixo da página.
/* global p5 */

/** Gerador pseudoaleatório com semente (o original usava java.util.Random(2026)). */
export function aleatorio(semente) {
  let s = semente >>> 0;
  const proximo = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  let reserva = null;
  const gauss = () => {
    if (reserva !== null) { const r = reserva; reserva = null; return r; }
    const u = Math.max(1e-12, proximo()), v = proximo();
    const m = Math.sqrt(-2 * Math.log(u));
    reserva = m * Math.sin(2 * Math.PI * v);
    return m * Math.cos(2 * Math.PI * v);
  };
  return { proximo, gauss };
}

/** Desenha o céu estático em um p5.Graphics de tamanho (w, h), nas proporções do original (900 × 900). */
export function pintarCeu(g, w, h, { densidade = 1, constelacao = true } = {}) {
  const sx = w / 900, sy = h / 900, k = Math.sqrt((w * h) / (900 * 900));
  const r = aleatorio(2026);
  g.clear();
  g.noStroke();
  // Via Láctea: faixa diagonal com distribuição gaussiana
  for (let i = 0; i < 2400 * k * densidade; i++) {
    const x = r.proximo() * 1100 - 100;
    const y = 770 - x * 0.7 + r.gauss() * 85;
    g.fill(200, 205, 224, 10 + r.proximo() * 30);
    const t = 0.4 + r.proximo() * 0.8;
    g.circle(x * sx, y * sy, t);
  }
  // Estrelas avulsas (uma em cada nove é âmbar, como no original)
  for (let i = 0; i < 620 * k * densidade; i++) {
    const x = r.proximo() * w, y = r.proximo() * h;
    const t = 0.65 + r.proximo() * 1.3;
    if (i % 9 === 0) g.fill(243, 216, 176, 90);
    else g.fill(215, 229, 251, 40 + r.proximo() * 95);
    g.circle(x, y, t);
  }
  if (constelacao) {
    const px = [660, 706, 779, 812, 756, 706], py = [232, 206, 230, 294, 324, 206];
    g.stroke(190, 205, 224, 30); g.strokeWeight(0.8);
    for (let i = 1; i < px.length; i++) g.line(px[i - 1] * sx, py[i - 1] * sy, px[i] * sx, py[i] * sy);
    g.noStroke(); g.fill(224, 233, 249, 160);
    for (let i = 0; i < px.length; i++) g.circle(px[i] * sx, py[i] * sy, 2.5);
  }
}

/** Estrelas que cintilam, órbitas e meteoro (parte animada do desenharFundo original). */
export function animarCeu(p, w, h, t, { orbitas = true, meteoro = true, cintilantes = 58, alfaOrbita = 1 } = {}) {
  const sx = w / 900, sy = h / 900;
  if (orbitas) {
    p.push();
    p.translate(744 * sx, 440 * sy);
    p.rotate(-0.48);
    p.noFill(); p.stroke(193, 210, 230, 22 * alfaOrbita); p.strokeWeight(1);
    p.ellipse(0, 0, 205 * sx, 460 * sy);
    p.ellipse(0, 0, 320 * sx, 610 * sy);
    p.noStroke();
    p.fill(221, 226, 238, 140);
    p.circle(102.5 * sx * Math.cos(t * 0.22), 230 * sy * Math.sin(t * 0.22), 4);
    p.fill(243, 202, 122, 120);
    p.circle(160 * sx * Math.cos(t * 0.13 + 2), 305 * sy * Math.sin(t * 0.13 + 2), 3);
    p.pop();
  }
  p.noStroke();
  for (let i = 0; i < cintilantes; i++) {
    const x = ((i * 137.37 + 27) % 900) * sx;
    const y = ((i * 89.59 + 13) % 900) * sy;
    p.fill(220, 235, 255, 30 + 95 * (0.5 + 0.5 * Math.sin(t * 1.4 + i * 2.7)));
    const tam = i % 7 === 0 ? 2.3 : 1.2;
    p.circle(x, y, tam);
  }
  if (meteoro) {
    const m = ((t * 1000) % 14000) / 1000 - 10.5;
    if (m >= 0 && m < 0.9) {
      const x = (780 - m * 510) * sx, y = (65 + m * 300) * sy;
      p.strokeWeight(1.3);
      for (let i = 0; i < 24; i++) {
        p.stroke(220, 235, 255, (1 - i / 24) * 160 * Math.sin((m / 0.9) * Math.PI));
        p.line(x + i * 3, y - i * 1.76, x + (i + 1) * 3, y - (i + 1) * 1.76);
      }
      p.noStroke();
    }
  }
}

/** Fundo fixo da página inteira. */
export function criarCosmos(elemento) {
  const reduzir = matchMedia('(prefers-reduced-motion: reduce)').matches;
  return new p5((p) => {
    let ceu;
    const montar = () => {
      if (p.width < 2 || p.height < 2) return;
      ceu?.remove();
      ceu = p.createGraphics(p.width, p.height);
      ceu.pixelDensity(1);
      pintarCeu(ceu, p.width, p.height, { constelacao: false });
    };
    p.setup = () => {
      p.createCanvas(window.innerWidth, window.innerHeight);
      p.frameRate(30);
      montar();
      if (reduzir) p.noLoop();
    };
    p.windowResized = () => { p.resizeCanvas(window.innerWidth, window.innerHeight); montar(); p.redraw(); };
    p.draw = () => {
      p.clear();
      if (ceu) p.image(ceu, 0, 0);
      animarCeu(p, p.width, p.height, p.millis() / 1000, { alfaOrbita: 0.5 });
    };
  }, elemento);
}
