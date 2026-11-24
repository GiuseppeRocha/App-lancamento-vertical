import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calcularTrajetoria, tempoAteSolo, normalizarParametros, amostrar, resumo, RHO_AR, T_LIMITE,
  energia, temposNaAltura, PRESETS,
} from '../js/physics.js';

const perto = (real, esperado, tol = 1e-9, msg = '') =>
  assert.ok(Math.abs(real - esperado) <= tol, `${msg} esperado ${esperado}, obtido ${real}`);

test('caso clássico: v0 = 20 m/s, y0 = 0, g = 10', () => {
  const t = calcularTrajetoria({ v0: 20, y0: 0, g: 10 });
  perto(t.hMax, 20);
  perto(t.tSubida, 2);
  perto(t.tTotal, 4);
  perto(t.estado(1).y, 15);
  perto(t.estado(3).v, -10);
  perto(t.estado(2).v, 0);
  perto(t.vImpacto, -20);
  assert.equal(t.estado(1).a, -10);
});

test('queda livre: y0 = 50 m, v0 = 0, g = 9,81', () => {
  const t = calcularTrajetoria({ v0: 0, y0: 50, g: 9.81 });
  perto(t.tTotal, Math.sqrt(100 / 9.81), 1e-12);
  perto(t.vImpacto, -Math.sqrt(2 * 9.81 * 50), 1e-9);
  assert.equal(t.tSubida, 0);
  assert.equal(t.hMax, 50);
});

test('lançamento para baixo: v0 = −10, y0 = 15, g = 10 → t = 1 s', () => {
  const t = calcularTrajetoria({ v0: -10, y0: 15, g: 10 });
  perto(t.tTotal, 1, 1e-12);
  assert.equal(t.hMax, 15);
  assert.equal(t.tSubida, 0);
});

test('gravidade zero', () => {
  const desce = calcularTrajetoria({ v0: -5, y0: 10, g: 0 });
  perto(desce.tTotal, 2);
  const sobe = calcularTrajetoria({ v0: 5, y0: 10, g: 0 });
  assert.equal(sobe.atingeSolo, false);
  assert.equal(sobe.tFim, T_LIMITE);
  assert.equal(sobe.hMax, Infinity);
  const parado = calcularTrajetoria({ v0: 0, y0: 10, g: 0 });
  assert.equal(parado.parado, true);
  assert.equal(parado.tFim, 0);
});

test('objeto já no solo sem velocidade para cima não se move', () => {
  const t = calcularTrajetoria({ v0: 0, y0: 0, g: 9.81 });
  assert.equal(t.tTotal, 0);
  assert.equal(t.estado(1).y, 0);
});

test('o objeto para exatamente no solo e não continua após o impacto', () => {
  const t = calcularTrajetoria({ v0: 12.3, y0: 7.7, g: 9.81 });
  assert.equal(t.estado(t.tTotal).y, 0);
  const depois = t.estado(t.tTotal + 5);
  assert.deepEqual([depois.y, depois.v, depois.a], [0, 0, 0]);
});

test('fórmula do sketch original (Processing) coincide com o motor', () => {
  // No .pde: altura = y0 + v0·t + g·t²/2, com g negativo.
  const y0 = 23.45, v0 = 31.2, gNeg = -7.3, t = 1.85;
  const original = y0 + v0 * t + (gNeg * t * t) / 2;
  perto(calcularTrajetoria({ v0, y0, g: -gNeg }).estado(t).y, original, 1e-12);
});

test('estabilidade numérica de tempoAteSolo para lançamentos rápidos para baixo', () => {
  const t = tempoAteSolo(1e-6, -100, 9.81);
  perto(t, 1e-8, 1e-14);
});

test('arrasto com Cd = 0 reproduz o modelo ideal', () => {
  const ideal = calcularTrajetoria({ v0: 25, y0: 5, g: 9.81 });
  const zero = calcularTrajetoria({ v0: 25, y0: 5, g: 9.81, arrasto: true, cd: 0 });
  perto(zero.tTotal, ideal.tTotal, 1e-12);
});

test('arrasto: subida coincide com a solução analítica', () => {
  const m = 0.45, cd = 0.47, A = 0.038, g = 9.81, v0 = 30;
  const k = 0.5 * RHO_AR * cd * A;
  const t = calcularTrajetoria({ v0, y0: 0, g, arrasto: true, massa: m, cd, area: A });
  const hAnalitico = (m / (2 * k)) * Math.log(1 + (k * v0 * v0) / (m * g));
  const tAnalitico = Math.sqrt(m / (g * k)) * Math.atan(v0 * Math.sqrt(k / (m * g)));
  perto(t.hMax, hAnalitico, 1e-6, 'hMax');
  perto(t.tSubida, tAnalitico, 1e-6, 'tSubida');
  // Com arrasto a altura máxima é menor que no vácuo.
  assert.ok(t.hMax < (v0 * v0) / (2 * g));
});

test('arrasto: queda longa atinge a velocidade terminal', () => {
  const m = 0.45, cd = 0.47, A = 0.038, g = 9.81;
  const t = calcularTrajetoria({ v0: 0, y0: 500, g, arrasto: true, massa: m, cd, area: A });
  const vTerminal = Math.sqrt((m * g) / (0.5 * RHO_AR * cd * A));
  perto(Math.abs(t.vImpacto), vTerminal, 0.01 * vTerminal, 'velocidade terminal');
  assert.equal(t.estado(t.tTotal).y, 0);
});

test('arrasto: caso extremo continua estável (sem NaN)', () => {
  const t = calcularTrajetoria({ v0: 100, y0: 0, g: 9.81, arrasto: true, massa: 0.01, cd: 2, area: 1 });
  assert.ok(t.atingeSolo);
  for (const e of amostrar(t, 200)) {
    assert.ok(Number.isFinite(e.y) && Number.isFinite(e.v) && Number.isFinite(e.a));
  }
});

test('entradas inválidas são normalizadas', () => {
  const p = normalizarParametros({ v0: 'abc', y0: -5, g: 999, massa: '0,5' });
  assert.equal(p.v0, 20);
  assert.equal(p.y0, 0);
  assert.equal(p.g, 30);
  assert.equal(p.massa, 0.5);
});

test('resumo é serializável e contém os estados pedidos', () => {
  const r = resumo(calcularTrajetoria({ v0: 20, y0: 0, g: 10 }), [1, 3]);
  assert.equal(r.altura_maxima_m, 20);
  assert.equal(r.estados[0].altura_m, 15);
  assert.doesNotThrow(() => JSON.stringify(r));
});

test('energia mecânica se conserva no modelo ideal', () => {
  const t = calcularTrajetoria({ v0: 20, y0: 10, g: 9.81, massa: 2 });
  const e0 = energia(t, 0).em;
  perto(e0, 0.5 * 2 * 400 + 2 * 9.81 * 10, 1e-9);
  for (const tt of [0.5, 1.3, 2.04, 3.9, t.tTotal]) perto(energia(t, tt).em, e0, 1e-6, `t=${tt}`);
  perto(energia(t, t.tSubida).ec, 0, 1e-9, 'Ec no ápice');
});

test('com arrasto a energia mecânica só diminui', () => {
  const t = calcularTrajetoria({ v0: 30, y0: 0, g: 9.81, arrasto: true, massa: 0.45, cd: 0.47, area: 0.038 });
  let anterior = Infinity;
  for (let i = 0; i <= 50; i++) {
    const em = energia(t, (t.tTotal * i) / 50).em;
    assert.ok(em <= anterior + 1e-9, `aumentou em i=${i}`);
    anterior = em;
  }
  assert.ok(energia(t, t.tTotal).em < energia(t, 0).em * 0.9);
});

test('instantes de passagem por uma altura', () => {
  const t = calcularTrajetoria({ v0: 20, y0: 0, g: 10 });
  const [t1, t2] = temposNaAltura(t, 15);
  perto(t1, 1, 1e-12); perto(t2, 3, 1e-12);
  assert.deepEqual(temposNaAltura(t, 25), []);           // acima da altura máxima
  assert.equal(temposNaAltura(t, 20).length, 1);         // exatamente no ápice
  const ar = calcularTrajetoria({ v0: 20, y0: 0, g: 10, arrasto: true, massa: 0.45, cd: 0.47, area: 0.038 });
  const tempos = temposNaAltura(ar, 10);
  assert.equal(tempos.length, 2);
  for (const tt of tempos) perto(ar.estado(tt).y, 10, 1e-6);
});

test('presets dentro dos limites do simulador', () => {
  for (const p of Object.values(PRESETS)) {
    assert.equal(calcularTrajetoria({ v0: 10, y0: 0, g: p.g }).params.g, p.g);
  }
});
