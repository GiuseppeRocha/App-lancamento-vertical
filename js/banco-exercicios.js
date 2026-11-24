// Banco de exercícios de lançamento vertical. Cada gerador sorteia parâmetros e calcula a
// resposta pelo motor físico, com dicas progressivas e resolução passo a passo.
// Módulo puro (sem DOM): testado em tests/banco.test.js.

import { calcularTrajetoria, PRESETS } from './physics.js';
import { fmt, nLatex as n } from './format.js';

const sortear = (r, min, max, casas = 2) => Math.round((min + r() * (max - min)) * 10 ** casas) / 10 ** casas;
const escolher = (r, lista) => lista[Math.floor(r() * lista.length) % lista.length];
const G = 9.81;

export const NIVEIS = {
  basico: 'Básico',
  intermediario: 'Intermediário',
  avancado: 'Avançado',
};

export const TIPOS = {
  altura_instante: {
    nome: 'Altura num instante', nivel: 'basico',
    // O desafio do sketch original, com as mesmas faixas aleatórias
    gerar(r) {
      const y0 = sortear(r, 5, 50), v0 = sortear(r, 20, 50), g = sortear(r, 1, 10), t = sortear(r, 0.5, 3);
      const tr = calcularTrajetoria({ v0, y0, g });
      const y = tr.estado(t).y, a = v0 * t, b = (g * t * t) / 2;
      return {
        enunciado: `Uma bolinha é lançada verticalmente para cima com ${fmt(v0)} m/s, a partir de ${fmt(y0)} m de altura, num local onde g = ${fmt(g)} m/s². Calcule a altura da bolinha após <strong>${fmt(t)} s</strong>.`,
        dados: [['Altura inicial', 'y₀', `${fmt(y0)} m`], ['Velocidade inicial', 'v₀', `${fmt(v0)} m/s`], ['Gravidade', 'g', `${fmt(g)} m/s²`], ['Tempo', 't', `${fmt(t)} s`]],
        pergunta: 'Altura', unidade: 'm', resposta: y,
        dicas: [
          'A posição em qualquer instante vem da equação horária: \\(y(t) = y_0 + v_0 t - \\dfrac{g t^2}{2}\\).',
          `Substitua os valores: \\(y = ${n(y0)} + ${n(v0)} \\cdot ${n(t)} - \\dfrac{${n(g)} \\cdot ${n(t)}^2}{2}\\).`,
        ],
        passos: [
          '\\(y(t) = y_0 + v_0 t - \\dfrac{g t^2}{2}\\)',
          `\\(v_0 t = ${n(v0)} \\cdot ${n(t)} = ${n(a)}\\) m`,
          `\\(\\dfrac{g t^2}{2} = \\dfrac{${n(g)} \\cdot ${n(t)}^2}{2} = ${n(b)}\\) m`,
          `\\(y = ${n(y0)} + ${n(a)} - ${n(b)} \\approx ${n(y)}\\) m`,
        ],
        link: { v0, y0, g, t },
      };
    },
  },

  altura_maxima: {
    nome: 'Altura máxima', nivel: 'basico',
    gerar(r) {
      const v0 = sortear(r, 5, 30, 1), y0 = escolher(r, [0, 0, sortear(r, 2, 20, 1)]);
      const tr = calcularTrajetoria({ v0, y0, g: G });
      const sobe = (v0 * v0) / (2 * G);
      return {
        enunciado: `Um objeto é lançado para cima com ${fmt(v0, 1)} m/s${y0 > 0 ? ` a partir de ${fmt(y0, 1)} m de altura` : ' a partir do solo'}. Qual é a <strong>altura máxima</strong> atingida? Use g = 9,81 m/s².`,
        dados: [['Velocidade inicial', 'v₀', `${fmt(v0, 1)} m/s`], ['Altura inicial', 'y₀', `${fmt(y0, 1)} m`], ['Gravidade', 'g', '9,81 m/s²']],
        pergunta: 'Altura máxima', unidade: 'm', resposta: tr.hMax,
        dicas: [
          'No ponto mais alto a velocidade é zero. Use Torricelli com v = 0.',
          `\\(H_{\\text{máx}} = y_0 + \\dfrac{v_0^2}{2g} = ${n(y0, 1)} + \\dfrac{${n(v0, 1)}^2}{2 \\cdot 9{,}81}\\)`,
        ],
        passos: [
          '\\(0 = v_0^2 - 2g\\,(H_{\\text{máx}} - y_0)\\)',
          `\\(\\Delta y = \\dfrac{v_0^2}{2g} = \\dfrac{${n(v0 * v0)}}{19{,}62} \\approx ${n(sobe)}\\) m`,
          `\\(H_{\\text{máx}} = ${n(y0, 1)} + ${n(sobe)} \\approx ${n(tr.hMax)}\\) m`,
        ],
        link: { v0, y0, g: G, t: tr.tSubida },
      };
    },
  },

  tempo_subida: {
    nome: 'Tempo de subida', nivel: 'basico',
    gerar(r) {
      const v0 = sortear(r, 5, 40, 1), planeta = escolher(r, ['terra', 'terra', 'lua', 'marte']);
      const g = PRESETS[planeta].g;
      const ts = v0 / g;
      return {
        enunciado: `Na ${planeta === 'terra' ? 'Terra' : PRESETS[planeta].nome} (g = ${fmt(g)} m/s²), uma pedra é lançada para cima com ${fmt(v0, 1)} m/s. Quanto tempo ela leva para chegar ao <strong>ponto mais alto</strong>?`,
        dados: [['Velocidade inicial', 'v₀', `${fmt(v0, 1)} m/s`], ['Gravidade', 'g', `${fmt(g)} m/s²`]],
        pergunta: 'Tempo de subida', unidade: 's', resposta: ts,
        dicas: [
          'No ápice a velocidade se anula: \\(v(t) = v_0 - g t = 0\\).',
          `Isolando t: \\(t = \\dfrac{v_0}{g} = \\dfrac{${n(v0, 1)}}{${n(g)}}\\)`,
        ],
        passos: [
          '\\(0 = v_0 - g\\,t_s\\)',
          `\\(t_s = \\dfrac{v_0}{g} = \\dfrac{${n(v0, 1)}}{${n(g)}} \\approx ${n(ts)}\\) s`,
        ],
        link: { v0, y0: 0, g, t: ts },
      };
    },
  },

  velocidade_instante: {
    nome: 'Velocidade num instante', nivel: 'intermediario',
    gerar(r) {
      const v0 = sortear(r, 10, 30, 1);
      const tTotal = (2 * v0) / G;
      const t = sortear(r, 0.3, tTotal * 0.95, 2);
      const v = v0 - G * t;
      return {
        enunciado: `Uma bola é lançada para cima, do solo, com ${fmt(v0, 1)} m/s. Qual é a sua <strong>velocidade</strong> ${fmt(t)} s após o lançamento? Indique o sinal (positivo para cima). g = 9,81 m/s².`,
        dados: [['Velocidade inicial', 'v₀', `${fmt(v0, 1)} m/s`], ['Tempo', 't', `${fmt(t)} s`], ['Gravidade', 'g', '9,81 m/s²']],
        pergunta: 'Velocidade (com sinal)', unidade: 'm/s', resposta: v,
        dicas: [
          'A velocidade varia linearmente: \\(v(t) = v_0 - g t\\). O sinal diz se a bola sobe (+) ou desce (−).',
          `\\(v = ${n(v0, 1)} - 9{,}81 \\cdot ${n(t)}\\)`,
        ],
        passos: [
          '\\(v(t) = v_0 - g\\,t\\)',
          `\\(g\\,t = 9{,}81 \\cdot ${n(t)} = ${n(G * t)}\\) m/s`,
          `\\(v = ${n(v0, 1)} - ${n(G * t)} \\approx ${n(v)}\\) m/s — a bola está ${v > 0 ? 'subindo' : 'descendo'}.`,
        ],
        link: { v0, y0: 0, g: G, t },
      };
    },
  },

  tempo_total: {
    nome: 'Tempo até o solo', nivel: 'intermediario',
    gerar(r) {
      const y0 = sortear(r, 5, 60, 1), v0 = sortear(r, 5, 25, 1);
      const tr = calcularTrajetoria({ v0, y0, g: G });
      const delta = v0 * v0 + 2 * G * y0;
      return {
        enunciado: `Do alto de uma torre de ${fmt(y0, 1)} m, uma pedra é lançada para cima com ${fmt(v0, 1)} m/s. Em quanto tempo ela <strong>atinge o solo</strong>? g = 9,81 m/s².`,
        dados: [['Altura inicial', 'y₀', `${fmt(y0, 1)} m`], ['Velocidade inicial', 'v₀', `${fmt(v0, 1)} m/s`], ['Gravidade', 'g', '9,81 m/s²']],
        pergunta: 'Tempo até o solo', unidade: 's', resposta: tr.tTotal,
        dicas: [
          'No solo, y = 0. Isso dá uma equação do 2º grau em t: \\(\\dfrac{g}{2}t^2 - v_0 t - y_0 = 0\\). Só a raiz positiva vale.',
          `Discriminante: \\(\\Delta = v_0^2 + 2 g y_0 = ${n(v0, 1)}^2 + 2 \\cdot 9{,}81 \\cdot ${n(y0, 1)}\\)`,
        ],
        passos: [
          `\\(0 = ${n(y0, 1)} + ${n(v0, 1)}\\,t - 4{,}905\\,t^2\\)`,
          `\\(\\Delta = v_0^2 + 2 g y_0 = ${n(delta)}\\)`,
          `\\(t = \\dfrac{v_0 + \\sqrt{\\Delta}}{g} = \\dfrac{${n(v0, 1)} + ${n(Math.sqrt(delta))}}{9{,}81} \\approx ${n(tr.tTotal)}\\) s`,
        ],
        link: { v0, y0, g: G, t: tr.tTotal },
      };
    },
  },

  velocidade_impacto: {
    nome: 'Velocidade de impacto', nivel: 'avancado',
    gerar(r) {
      const y0 = sortear(r, 10, 80, 1), v0 = sortear(r, 0, 20, 1);
      const tr = calcularTrajetoria({ v0, y0, g: G });
      const modulo = Math.abs(tr.vImpacto);
      return {
        enunciado: `Um objeto é lançado para cima com ${fmt(v0, 1)} m/s do alto de um prédio de ${fmt(y0, 1)} m. Qual é o <strong>módulo da velocidade</strong> com que ele atinge o solo? g = 9,81 m/s².`,
        dados: [['Altura inicial', 'y₀', `${fmt(y0, 1)} m`], ['Velocidade inicial', 'v₀', `${fmt(v0, 1)} m/s`], ['Gravidade', 'g', '9,81 m/s²']],
        pergunta: 'Módulo da velocidade', unidade: 'm/s', resposta: modulo,
        dicas: [
          'Não precisa do tempo! Use Torricelli entre o lançamento (y₀) e o solo (y = 0): \\(v^2 = v_0^2 + 2 g y_0\\).',
          `\\(|v| = \\sqrt{${n(v0, 1)}^2 + 2 \\cdot 9{,}81 \\cdot ${n(y0, 1)}}\\)`,
        ],
        passos: [
          '\\(v^2 = v_0^2 - 2g\\,(0 - y_0) = v_0^2 + 2 g y_0\\)',
          `\\(v^2 = ${n(v0 * v0)} + ${n(2 * G * y0)} = ${n(v0 * v0 + 2 * G * y0)}\\)`,
          `\\(|v| = \\sqrt{${n(v0 * v0 + 2 * G * y0)}} \\approx ${n(modulo)}\\) m/s`,
        ],
        link: { v0, y0, g: G, t: tr.tTotal },
      };
    },
  },

  lancamento_baixo: {
    nome: 'Lançamento para baixo', nivel: 'avancado',
    gerar(r) {
      const v = sortear(r, 2, 15, 1), y0 = sortear(r, 20, 80, 1);
      const v0 = -v;
      const tr = calcularTrajetoria({ v0, y0, g: G });
      const delta = v0 * v0 + 2 * G * y0;
      return {
        enunciado: `Uma chave é arremessada <strong>para baixo</strong> com ${fmt(v, 1)} m/s de uma janela a ${fmt(y0, 1)} m do chão. Em quanto tempo ela chega ao solo? g = 9,81 m/s².`,
        dados: [['Altura inicial', 'y₀', `${fmt(y0, 1)} m`], ['Velocidade inicial', 'v₀', `${fmt(v0, 1)} m/s`], ['Gravidade', 'g', '9,81 m/s²']],
        pergunta: 'Tempo até o solo', unidade: 's', resposta: tr.tTotal,
        dicas: [
          'Cuidado com o sinal: com o eixo para cima, lançar para baixo significa v₀ negativa.',
          `\\(0 = ${n(y0, 1)} ${n(v0, 1)}\\,t - 4{,}905\\,t^2\\), com \\(\\Delta = v_0^2 + 2 g y_0\\).`,
        ],
        passos: [
          `\\(v_0 = ${n(v0, 1)}\\) m/s (para baixo)`,
          `\\(\\Delta = (${n(v0, 1)})^2 + 2 \\cdot 9{,}81 \\cdot ${n(y0, 1)} = ${n(delta)}\\)`,
          `\\(t = \\dfrac{v_0 + \\sqrt{\\Delta}}{g} = \\dfrac{${n(v0, 1)} + ${n(Math.sqrt(delta))}}{9{,}81} \\approx ${n(tr.tTotal)}\\) s`,
        ],
        link: { v0, y0, g: G, t: tr.tTotal },
      };
    },
  },

  comparacao_planetas: {
    nome: 'Terra × outro planeta', nivel: 'avancado',
    gerar(r) {
      const v0 = sortear(r, 8, 30, 1);
      const chave = escolher(r, ['lua', 'marte', 'mercurio', 'venus', 'jupiter']);
      const pl = PRESETS[chave];
      const hT = calcularTrajetoria({ v0, y0: 0, g: G }).hMax;
      const hP = calcularTrajetoria({ v0, y0: 0, g: pl.g }).hMax;
      const razao = hP / hT;
      const artigo = ['lua', 'terra'].includes(chave) ? 'na' : 'em';
      return {
        enunciado: `O mesmo lançamento (${fmt(v0, 1)} m/s para cima, do solo) é feito na Terra e ${artigo} ${pl.nome} (g = ${fmt(pl.g)} m/s²). Quantas vezes a <strong>altura máxima ${artigo} ${pl.nome}</strong> é maior (ou menor) que na Terra?`,
        dados: [['Velocidade inicial', 'v₀', `${fmt(v0, 1)} m/s`], ['g na Terra', 'g₁', '9,81 m/s²'], [`g ${artigo} ${pl.nome}`, 'g₂', `${fmt(pl.g)} m/s²`]],
        pergunta: 'Razão H₂/H₁', unidade: '×', resposta: razao,
        dicas: [
          'Como \\(H_{\\text{máx}} = \\dfrac{v_0^2}{2g}\\), para o mesmo v₀ a altura é inversamente proporcional a g.',
          `\\(\\dfrac{H_2}{H_1} = \\dfrac{g_1}{g_2} = \\dfrac{9{,}81}{${n(pl.g)}}\\)`,
        ],
        passos: [
          `\\(H_1 = \\dfrac{${n(v0, 1)}^2}{2 \\cdot 9{,}81} \\approx ${n(hT)}\\) m e \\(H_2 = \\dfrac{${n(v0, 1)}^2}{2 \\cdot ${n(pl.g)}} \\approx ${n(hP)}\\) m`,
          `\\(\\dfrac{H_2}{H_1} = \\dfrac{g_1}{g_2} = \\dfrac{9{,}81}{${n(pl.g)}} \\approx ${n(razao)}\\)`,
        ],
        link: { v0, y0: 0, g: pl.g, t: calcularTrajetoria({ v0, y0: 0, g: pl.g }).tSubida },
      };
    },
  },
};

/** Gera um exercício do tipo pedido (ou aleatório dentro do nível). */
export function gerarExercicio({ tipo = null, nivel = 'basico', rand = Math.random } = {}) {
  const chaves = tipo ? [tipo] : Object.keys(TIPOS).filter((k) => TIPOS[k].nivel === nivel);
  const chave = chaves[Math.floor(rand() * chaves.length) % chaves.length];
  return { tipo: chave, nivel: TIPOS[chave].nivel, nome: TIPOS[chave].nome, ...TIPOS[chave].gerar(rand) };
}

/**
 * Avalia uma resposta. Retorna 'certo' (igual à resposta arredondada a 2 casas),
 * 'quase' (diferença pequena: arredondamento intermediário), 'sinal' (sinal trocado) ou 'errado'.
 */
export function avaliar(valor, resposta) {
  if (!Number.isFinite(valor)) return 'invalido';
  const r2 = Math.round(resposta * 100) / 100;
  if (Math.abs(valor - r2) < 0.005 + 1e-9) return 'certo';
  if (Math.abs(resposta) > 0.05 && Math.abs(valor + r2) < 0.005 + 1e-9) return 'sinal';
  if (Math.abs(valor - resposta) <= Math.max(0.02, 0.01 * Math.abs(resposta))) return 'quase';
  return 'errado';
}
