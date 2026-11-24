// Estado central da aplicação: cenários, trajetórias calculadas e relógio da simulação.
// A simulação, os gráficos e os painéis leem daqui, o que os mantém sincronizados.

import { calcularTrajetoria, alturaMaximaVisivel, LIMITES, PRESETS } from './physics.js';
import { CORES } from './format.js';

const padrao = (g) => ({
  v0: LIMITES.v0.padrao, y0: LIMITES.y0.padrao, g,
  arrasto: false, massa: LIMITES.massa.padrao, cd: LIMITES.cd.padrao, area: LIMITES.area.padrao,
});

export const estado = {
  modo: 'simples',            // 'simples' | 'comparacao'
  selecionado: 0,             // índice do cenário editado no painel
  cenarios: [
    { id: 'A', cor: CORES.cenarios[0], habilitado: true, preset: 'terra', params: padrao(PRESETS.terra.g) },
    { id: 'B', cor: CORES.cenarios[1], habilitado: true, preset: 'lua',   params: padrao(PRESETS.lua.g) },
    { id: 'C', cor: CORES.cenarios[2], habilitado: true, preset: 'marte', params: padrao(PRESETS.marte.g) },
  ],
  t: 0,
  rodando: false,
  velocidade: 1,
  mostrar: { vetores: true, trajetoria: true, valores: true, energia: false },
  ferramenta: null,           // null | 'regua' | 'previsao'
  regua: null,                // altura (m) marcada com a régua
  previsao: null,             // palpite (m) da altura máxima
  pausarEventos: false,       // pausa automática no ápice
  tema: 'escuro',             // 'escuro' | 'claro'
  apresentacao: false,
  aviso: null,                // { texto, ate } mensagem destacada na cena (roteiro, eventos)
};

const ouvintes = new Set();
export function aoMudar(fn) { ouvintes.add(fn); }
export function notificar(motivo) { for (const fn of ouvintes) fn(motivo); }

/** Recalcula a trajetória de um cenário a partir dos parâmetros atuais. */
export function recalcular(i) {
  const c = estado.cenarios[i];
  c.traj = calcularTrajetoria(c.params);
}
estado.cenarios.forEach((_, i) => recalcular(i));

/** Cenários exibidos no momento (somente A no modo simples). */
export function cenariosAtivos() {
  return estado.modo === 'simples'
    ? [estado.cenarios[0]]
    : estado.cenarios.filter((c) => c.habilitado);
}

/** Instante final da simulação: o maior tFim entre os cenários ativos. */
export function tFimGlobal() {
  return Math.max(0, ...cenariosAtivos().map((c) => c.traj.tFim));
}

/** Maior altura relevante entre os cenários ativos (para a escala vertical). */
export function alturaEscala() {
  return Math.max(1, ...cenariosAtivos().map((c) => Math.max(c.traj.params.y0, alturaMaximaVisivel(c.traj))));
}

export function terminou() {
  return estado.t >= tFimGlobal() && estado.t > 0;
}
