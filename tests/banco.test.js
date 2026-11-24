import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TIPOS, gerarExercicio, avaliar } from '../js/banco-exercicios.js';

// Gerador pseudoaleatório determinístico para testes reprodutíveis
function semente(s) {
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

// Respostas recalculadas com fórmulas fechadas, independentes do motor
const INDEPENDENTE = {
  altura_instante: ({ v0, y0, g, t }) => y0 + v0 * t - (g * t * t) / 2,
  altura_maxima: ({ v0, y0, g }) => y0 + (v0 * v0) / (2 * g),
  tempo_subida: ({ v0, g }) => v0 / g,
  velocidade_instante: ({ v0, g, t }) => v0 - g * t,
  tempo_total: ({ v0, y0, g }) => (v0 + Math.sqrt(v0 * v0 + 2 * g * y0)) / g,
  velocidade_impacto: ({ v0, y0, g }) => Math.sqrt(v0 * v0 + 2 * g * y0),
  lancamento_baixo: ({ v0, y0, g }) => (2 * y0) / (Math.sqrt(v0 * v0 + 2 * g * y0) - v0),
  comparacao_planetas: ({ g }) => 9.81 / g,
};

test('todos os tipos geram respostas corretas e coerentes', () => {
  const r = semente(42);
  for (const tipo of Object.keys(TIPOS)) {
    for (let i = 0; i < 200; i++) {
      const ex = gerarExercicio({ tipo, rand: r });
      assert.ok(Number.isFinite(ex.resposta), `${tipo}: resposta não finita`);
      const esperado = INDEPENDENTE[tipo](ex.link);
      assert.ok(Math.abs(ex.resposta - esperado) < 1e-6, `${tipo}: ${ex.resposta} ≠ ${esperado}`);
      assert.ok(ex.passos.length >= 2 && ex.dicas.length >= 1);
    }
  }
});

test('altura num instante usa as faixas do sketch original', () => {
  const r = semente(7);
  for (let i = 0; i < 100; i++) {
    const { link } = gerarExercicio({ tipo: 'altura_instante', rand: r });
    assert.ok(link.y0 >= 5 && link.y0 <= 50 && link.v0 >= 20 && link.v0 <= 50);
    assert.ok(link.g >= 1 && link.g <= 10 && link.t >= 0.5 && link.t <= 3);
  }
});

test('o nível filtra os tipos sorteados', () => {
  const r = semente(3);
  for (let i = 0; i < 50; i++) assert.equal(gerarExercicio({ nivel: 'avancado', rand: r }).nivel, 'avancado');
});

test('avaliação de respostas', () => {
  assert.equal(avaliar(12.35, 12.3456), 'certo');
  assert.equal(avaliar(12.34, 12.3456), 'quase');
  assert.equal(avaliar(-12.35, 12.3456), 'sinal');
  assert.equal(avaliar(20, 12.3456), 'errado');
  assert.equal(avaliar(NaN, 1), 'invalido');
});
