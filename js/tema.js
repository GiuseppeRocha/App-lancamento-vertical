// Paletas dos canvases para o tema escuro (padrão) e o tema claro de alto contraste (projetor).
import { estado } from './state.js';

const ESCURO = {
  escuro: true,
  ceu: ['#07080b', '#0a0d12', '#0d1116'],
  tinta: [255, 255, 255],          // cor base de linhas/grades (usada com alfa)
  texto: '#f7f8f8', suave: '#8a8f98', apagado: '#62666d',
  fundoEtiqueta: [8, 9, 10, 205],
  solo: [7, 10, 16, 240], linhaSolo: [65, 94, 110], hachura: [50, 76, 86],
  horizonte: 'rgba(61,220,190,0.075)',
  predio: [14, 17, 23, 238], janelaAcesa: [243, 202, 122, 95], janelaApagada: [255, 255, 255, 10],
  boneco: '#EDF3FF', cachecol: '#3DDCBE',
  velocidade: '#8BAEFF', aceleracao: '#FF798C',
  cenarios: ['#F3CA7A', '#3DDCBE', '#B9A4FF'],
  energia: { ec: '#8BAEFF', ep: '#F3CA7A', em: '#3DDCBE' },
  previsao: '#3DDCBE', regua: '#EDF3FF',
};

const CLARO = {
  escuro: false,
  ceu: ['#ffffff', '#f6f8fb', '#eef2f7'],
  tinta: [12, 16, 24],
  texto: '#0b0d12', suave: '#3d4552', apagado: '#5b6472',
  fundoEtiqueta: [255, 255, 255, 235],
  solo: [226, 231, 238, 255], linhaSolo: [60, 72, 88], hachura: [140, 152, 168],
  horizonte: 'rgba(15,159,134,0.08)',
  predio: [206, 213, 223, 255], janelaAcesa: [201, 138, 11, 200], janelaApagada: [255, 255, 255, 170],
  boneco: '#111827', cachecol: '#0F9F86',
  velocidade: '#1D4ED8', aceleracao: '#DC2626',
  cenarios: ['#C2410C', '#0F9F86', '#6D28D9'],
  energia: { ec: '#1D4ED8', ep: '#C2410C', em: '#0F9F86' },
  previsao: '#0F9F86', regua: '#111827',
};

export function paleta() { return estado.tema === 'claro' ? CLARO : ESCURO; }

/** Cor de um cenário no tema atual. */
export function corDe(cenario) {
  return paleta().cenarios[Math.max(0, estado.cenarios.indexOf(cenario))];
}

/** Fator de escala de texto e traços (modo apresentação). */
export function fator() { return estado.apresentacao ? 1.45 : 1; }
