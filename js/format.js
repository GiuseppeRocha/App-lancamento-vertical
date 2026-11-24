// Utilitários de formatação e de escala compartilhados pelas páginas.

export const CORES = {
  // Paleta do sketch original (LancamentoVertical.pde) sobre a base escura no estilo Linear
  fundo: '#08090a',
  superficie: '#0f1011',
  borda: 'rgba(255,255,255,0.08)',
  grade: 'rgba(255,255,255,0.05)',
  texto: '#f7f8f8',
  suave: '#8a8f98',
  apagado: '#62666d',
  verde: '#3DDCBE',
  branco: '#EDF3FF',
  cinza: '#99A9C1',
  vermelho: '#FF798C',
  azul: '#8BAEFF',
  amarelo: '#F3CA7A',
  destaque: '#3DDCBE',
  velocidade: '#8BAEFF',
  aceleracao: '#FF798C',
  cenarios: ['#F3CA7A', '#3DDCBE', '#B9A4FF'],
};

const MENOS = '−';

/** Número em pt-BR com casas fixas; trata infinito e nulo. */
export function fmt(valor, casas = 2) {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return '—';
  if (valor === Infinity) return '∞';
  if (valor === -Infinity) return MENOS + '∞';
  const v = Math.abs(valor) < 0.5 * 10 ** -casas ? 0 : valor; // evita "−0,00"
  return v
    .toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
    .replace('-', MENOS);
}

/** Número com unidade, ex.: "12,34 m". */
export function fmtU(valor, unidade, casas = 2) {
  const s = fmt(valor, casas);
  return unidade && s !== '—' ? `${s} ${unidade}` : s;
}

/** Passo "bonito" (1, 2, 5 × 10ⁿ) para ~alvo divisões. */
export function passoBonito(intervalo, alvo = 6) {
  if (!(intervalo > 0)) return 1;
  const bruto = intervalo / alvo;
  const pot = 10 ** Math.floor(Math.log10(bruto));
  const n = bruto / pot;
  return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * pot;
}

/** Marcas de eixo entre min e max. */
export function marcas(min, max, alvo = 6) {
  const passo = passoBonito(max - min, alvo);
  const inicio = Math.ceil(min / passo - 1e-9) * passo;
  const lista = [];
  for (let v = inicio; v <= max + passo * 1e-9; v += passo) lista.push(Math.abs(v) < passo * 1e-9 ? 0 : v);
  return { lista, passo };
}

/** Casas decimais adequadas para rótulos de um eixo com determinado passo. */
export function casasPara(passo) {
  return Math.max(0, Math.min(3, -Math.floor(Math.log10(passo) + 1e-9)));
}

export function escaparHTML(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** Número formatado para LaTeX: vírgula decimal sem espaçamento extra. */
export function nLatex(v, casas = 2) {
  return fmt(v, casas).replace('\u2212', '-').replace(',', '{,}');
}
