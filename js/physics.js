// Motor físico do lançamento vertical.
// Módulo puro (sem DOM): usado pelo navegador, pela função serverless do
// assistente e pelos testes automatizados.
//
// Convenção: eixo vertical positivo para cima, solo em y = 0 e
// g informado em módulo (g >= 0), de modo que a(t) = -g no modelo ideal.

export const RHO_AR = 1.225; // densidade do ar ao nível do mar (kg/m³)
export const T_LIMITE = 60;  // duração máxima simulada quando o objeto não retorna ao solo (s)

export const LIMITES = {
  v0:    { min: -100,   max: 100, passo: 0.01,    padrao: 20,    unidade: 'm/s',  nome: 'Velocidade inicial' },
  y0:    { min: 0,      max: 500, passo: 0.01,    padrao: 10,    unidade: 'm',    nome: 'Altura inicial' },
  g:     { min: 0,      max: 30,  passo: 0.01,   padrao: 9.81,  unidade: 'm/s²', nome: 'Gravidade' },
  massa: { min: 0.01,   max: 50,  passo: 0.01,   padrao: 0.45,  unidade: 'kg',   nome: 'Massa' },
  cd:    { min: 0,      max: 2,   passo: 0.01,   padrao: 0.47,  unidade: '',     nome: 'Coeficiente de arrasto' },
  area:  { min: 0.0001, max: 1,   passo: 0.0001, padrao: 0.038, unidade: 'm²',   nome: 'Área frontal' },
};

export const PRESETS = {
  terra:    { nome: 'Terra',    g: 9.81 },
  lua:      { nome: 'Lua',      g: 1.62 },
  marte:    { nome: 'Marte',    g: 3.71 },
  mercurio: { nome: 'Mercúrio', g: 3.70 },
  venus:    { nome: 'Vênus',    g: 8.87 },
  jupiter:  { nome: 'Júpiter',  g: 24.79 },
};

/** Converte para número finito e limita ao intervalo permitido. */
export function limitar(chave, valor) {
  const lim = LIMITES[chave];
  let n = typeof valor === 'string' ? Number(valor.replace(',', '.')) : Number(valor);
  if (!Number.isFinite(n)) n = lim.padrao;
  return Math.min(lim.max, Math.max(lim.min, n));
}

/** Normaliza um objeto de parâmetros vindo da interface ou da rede. */
export function normalizarParametros(p = {}) {
  return {
    v0: limitar('v0', p.v0),
    y0: limitar('y0', p.y0),
    g: limitar('g', p.g),
    arrasto: Boolean(p.arrasto),
    massa: limitar('massa', p.massa),
    cd: limitar('cd', p.cd),
    area: limitar('area', p.area),
  };
}

// ---------------------------------------------------------------------------
// Modelo ideal (sem resistência do ar): solução analítica
// ---------------------------------------------------------------------------

/** Raiz positiva de y0 + v0·t − g·t²/2 = 0. Retorna Infinity se nunca atinge o solo. */
export function tempoAteSolo(y0, v0, g) {
  if (y0 <= 0 && v0 <= 0) return 0;              // já está no solo e não sobe
  if (g === 0) return v0 < 0 ? -y0 / v0 : Infinity;
  const raiz = Math.sqrt(v0 * v0 + 2 * g * y0);
  // Forma numericamente estável para lançamentos para baixo (evita cancelamento).
  return v0 >= 0 ? (v0 + raiz) / g : (2 * y0) / (raiz - v0);
}

function trajetoriaIdeal(p) {
  const { v0, y0, g } = p;
  const tTotal = tempoAteSolo(y0, v0, g);
  const atingeSolo = Number.isFinite(tTotal);

  let tSubida, hMax;
  if (v0 <= 0) {            // em repouso ou lançado para baixo: o ponto mais alto é o inicial
    tSubida = 0;
    hMax = y0;
  } else if (g === 0) {     // sobe para sempre, sem inversão
    tSubida = Infinity;
    hMax = Infinity;
  } else {
    tSubida = v0 / g;
    hMax = y0 + (v0 * v0) / (2 * g);
  }

  const parado = v0 === 0 && g === 0; // sem gravidade e sem velocidade: repouso
  const tFim = parado ? 0 : Math.min(tTotal, T_LIMITE);
  const vImpacto = atingeSolo ? v0 - g * tTotal : null;

  function estado(t) {
    if (atingeSolo && t > tTotal) return { t, y: 0, v: 0, a: 0, noSolo: true };
    const tc = Math.max(0, t);
    return {
      t,
      y: atingeSolo && tc === tTotal ? 0 : y0 + v0 * tc - (g * tc * tc) / 2,
      v: v0 - g * tc,
      a: -g,
      noSolo: atingeSolo && tc === tTotal,
    };
  }

  return { modelo: 'ideal', params: p, tTotal, atingeSolo, tSubida, hMax, vImpacto, tFim, parado, estado };
}

// ---------------------------------------------------------------------------
// Modelo com arrasto quadrático: integração numérica RK4 com passo adaptativo
//   F_arrasto = −½ ρ Cd A v|v|     a = −g − (k/m) v|v|,  k = ½ ρ Cd A
// ---------------------------------------------------------------------------

function passoRK4(y, v, dt, g, km) {
  const acc = (vel) => -g - km * vel * Math.abs(vel);
  const k1y = v,                 k1v = acc(v);
  const k2y = v + 0.5 * dt * k1v, k2v = acc(v + 0.5 * dt * k1v);
  const k3y = v + 0.5 * dt * k2v, k3v = acc(v + 0.5 * dt * k2v);
  const k4y = v + dt * k3v,       k4v = acc(v + dt * k3v);
  return [
    y + (dt / 6) * (k1y + 2 * k2y + 2 * k3y + k4y),
    v + (dt / 6) * (k1v + 2 * k2v + 2 * k3v + k4v),
  ];
}

/** Bisseção no tamanho do passo para localizar com precisão um evento dentro do passo. */
function refinarEvento(y, v, dt, g, km, funcao) {
  let lo = 0, hi = dt;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    const [ym, vm] = passoRK4(y, v, mid, g, km);
    if (funcao(ym, vm) > 0) lo = mid; else hi = mid;
  }
  const [yf, vf] = passoRK4(y, v, hi, g, km);
  return { dt: hi, y: yf, v: vf };
}

function trajetoriaArrasto(p) {
  const { v0, y0, g, massa, cd, area } = p;
  const km = (0.5 * RHO_AR * cd * area) / massa;
  const acc = (vel) => -g - km * vel * Math.abs(vel);

  const ts = [0], ys = [y0], vs = [v0];
  let t = 0, y = y0, v = v0;
  let tSubida = v0 > 0 ? null : 0;
  let hMax = v0 > 0 ? null : y0;
  let tTotal = Infinity;
  const parado = v0 === 0 && g === 0;

  if (y0 <= 0 && v0 <= 0) {
    tTotal = 0;
  } else if (!parado) {
    const DT_MAX = 1e-3;
    let passos = 0;
    while (t < T_LIMITE && passos < 3_000_000) {
      passos++;
      // Estabilidade do RK4: |λ·dt| deve ficar bem abaixo de ~2,78, com λ = 2(k/m)|v|.
      const lambda = 2 * km * Math.abs(v);
      let dt = Math.min(DT_MAX, lambda > 0 ? 0.5 / lambda : DT_MAX, T_LIMITE - t);
      let [yn, vn] = passoRK4(y, v, dt, g, km);

      // Evento: inversão do sentido (v cruza zero de cima para baixo).
      if (tSubida === null && v > 0 && vn <= 0) {
        const ev = refinarEvento(y, v, dt, g, km, (_, vm) => vm);
        tSubida = t + ev.dt;
        hMax = ev.y;
      }
      // Evento: impacto com o solo.
      if (yn <= 0) {
        const ev = refinarEvento(y, v, dt, g, km, (ym) => ym);
        t += ev.dt;
        ts.push(t); ys.push(0); vs.push(ev.v);
        tTotal = t;
        break;
      }
      t += dt; y = yn; v = vn;
      ts.push(t); ys.push(y); vs.push(v);
    }
  }

  if (tSubida === null) { // nunca inverteu dentro do limite (ex.: g = 0)
    tSubida = Infinity;
    hMax = Infinity;
  }
  const atingeSolo = Number.isFinite(tTotal);
  const tFim = parado ? 0 : Math.min(tTotal, ts[ts.length - 1]);
  const vImpacto = atingeSolo ? vs[vs.length - 1] : null;

  function estado(tq) {
    if (atingeSolo && tq > tTotal) return { t: tq, y: 0, v: 0, a: 0, noSolo: true };
    if (parado || ts.length === 1) return { t: tq, y: y0, v: v0, a: acc(v0), noSolo: tTotal === 0 };
    const tc = Math.min(Math.max(0, tq), ts[ts.length - 1]);
    // Busca binária do intervalo [i, i+1] que contém tc.
    let lo = 0, hi = ts.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (ts[mid] <= tc) lo = mid; else hi = mid;
    }
    const h = ts[hi] - ts[lo];
    const s = h > 0 ? (tc - ts[lo]) / h : 0;
    // Interpolação de Hermite cúbica (usa v como derivada de y; a como derivada de v).
    const h00 = 2 * s ** 3 - 3 * s ** 2 + 1, h10 = s ** 3 - 2 * s ** 2 + s;
    const h01 = -2 * s ** 3 + 3 * s ** 2,     h11 = s ** 3 - s ** 2;
    const yv = h00 * ys[lo] + h10 * h * vs[lo] + h01 * ys[hi] + h11 * h * vs[hi];
    const vv = h00 * vs[lo] + h10 * h * acc(vs[lo]) + h01 * vs[hi] + h11 * h * acc(vs[hi]);
    const noSolo = atingeSolo && tc === tTotal;
    return { t: tq, y: noSolo ? 0 : Math.max(0, yv), v: vv, a: acc(vv), noSolo };
  }

  return { modelo: 'arrasto', params: p, tTotal, atingeSolo, tSubida, hMax, vImpacto, tFim, parado, estado, km };
}

/** Calcula a trajetória completa para um conjunto de parâmetros. */
export function calcularTrajetoria(entrada) {
  const p = normalizarParametros(entrada);
  // Arrasto com Cd = 0 é fisicamente idêntico ao modelo ideal.
  return p.arrasto && p.cd > 0 ? trajetoriaArrasto(p) : { ...trajetoriaIdeal(p), modelo: p.arrasto ? 'arrasto' : 'ideal' };
}

/** Altura máxima atingida dentro do intervalo simulado (para escalas de desenho). */
export function alturaMaximaVisivel(traj) {
  if (Number.isFinite(traj.hMax)) return traj.hMax;
  return traj.estado(traj.tFim).y;
}

/** Amostra a trajetória em n pontos entre 0 e tFim, incluindo o instante da altura máxima. */
export function amostrar(traj, n = 400) {
  const tFim = traj.tFim;
  const tempos = [];
  for (let i = 0; i <= n; i++) tempos.push((tFim * i) / n);
  if (Number.isFinite(traj.tSubida) && traj.tSubida > 0 && traj.tSubida < tFim) {
    tempos.push(traj.tSubida);
    tempos.sort((a, b) => a - b);
  }
  return tempos.map((t) => traj.estado(t));
}

/** Resumo serializável (usado como contexto do assistente e nos testes). */
export function resumo(traj, tempos = []) {
  const r = (x) => (x === null ? null : Number.isFinite(x) ? Math.round(x * 1e4) / 1e4 : 'infinito');
  const p = traj.params;
  return {
    modelo: traj.modelo === 'ideal' ? 'ideal (sem resistência do ar)' : 'com resistência do ar (arrasto quadrático, RK4)',
    parametros: {
      velocidade_inicial_m_s: p.v0,
      altura_inicial_m: p.y0,
      gravidade_m_s2: p.g,
      ...(traj.modelo === 'arrasto'
        ? { massa_kg: p.massa, coef_arrasto: p.cd, area_frontal_m2: p.area, densidade_ar_kg_m3: RHO_AR }
        : {}),
    },
    altura_maxima_m: r(traj.hMax),
    tempo_subida_s: r(traj.tSubida),
    tempo_total_s: r(traj.tTotal),
    atinge_o_solo: traj.atingeSolo,
    velocidade_impacto_m_s: r(traj.vImpacto),
    estados: tempos.map((t) => {
      const e = traj.estado(t);
      return { t_s: r(t), altura_m: r(e.y), velocidade_m_s: r(e.v), aceleracao_m_s2: r(e.a), no_solo: e.noSolo };
    }),
  };
}

// ---------------------------------------------------------------------------
// Energia e instantes de passagem por uma altura
// ---------------------------------------------------------------------------

/** Energias (J) no instante t: cinética ½mv², potencial mgy (referência no solo) e mecânica. */
export function energia(traj, t) {
  const e = traj.estado(t);
  const { massa, g } = traj.params;
  const ec = 0.5 * massa * e.v * e.v;
  const ep = massa * g * e.y;
  return { t, ec, ep, em: ec + ep, noSolo: e.noSolo };
}

/**
 * Instantes (s) em que o objeto passa pela altura h, dentro do intervalo simulado.
 * Modelo ideal: raízes de y0 + v0·t − g·t²/2 = h. Com arrasto: varredura + bisseção.
 */
export function temposNaAltura(traj, h) {
  const { v0, y0, g } = traj.params;
  const tFim = traj.tFim;
  if (!(tFim > 0) || !Number.isFinite(h) || h < 0) return [];
  let tempos = [];
  if (traj.modelo === 'ideal' || traj.km === undefined) {
    if (g === 0) {
      if (v0 !== 0) tempos = [(h - y0) / v0];
    } else {
      const delta = v0 * v0 - 2 * g * (h - y0);
      if (delta >= 0) {
        const r = Math.sqrt(delta);
        tempos = [(v0 - r) / g, (v0 + r) / g];
      }
    }
  } else {
    const n = 2000;
    let tAnt = 0, fAnt = traj.estado(0).y - h;
    for (let i = 1; i <= n; i++) {
      const t = (tFim * i) / n, f = traj.estado(t).y - h;
      if (fAnt === 0) tempos.push(tAnt);
      else if (fAnt * f < 0) {
        let lo = tAnt, hi = t, flo = fAnt;
        for (let k = 0; k < 50; k++) {
          const mid = (lo + hi) / 2, fm = traj.estado(mid).y - h;
          if (flo * fm <= 0) hi = mid; else { lo = mid; flo = fm; }
        }
        tempos.push((lo + hi) / 2);
      }
      tAnt = t; fAnt = f;
    }
  }
  const unicos = [];
  for (const t of tempos.filter((t) => t >= -1e-9 && t <= tFim + 1e-9).sort((a, b) => a - b)) {
    if (!unicos.length || Math.abs(t - unicos[unicos.length - 1]) > 1e-6) unicos.push(Math.max(0, Math.min(tFim, t)));
  }
  return unicos;
}
