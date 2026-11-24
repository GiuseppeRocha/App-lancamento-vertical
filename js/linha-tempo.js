// Linha do tempo arrastável com marcos de ápice e impacto (um por cenário ativo).
import { estado, cenariosAtivos, tFimGlobal, notificar } from './state.js';
import { fmt } from './format.js';
import { corDe } from './tema.js';

export function iniciarLinhaTempo() {
  const trilha = document.getElementById('lt-trilha');
  const progresso = trilha.querySelector('.lt-progresso');
  const cursor = trilha.querySelector('.lt-cursor');
  const marcos = trilha.querySelector('.lt-marcos');
  const rotuloT = document.getElementById('lt-tempo');
  const rotuloFim = document.getElementById('lt-fim');

  const tempoNoPonto = (ev) => {
    const r = trilha.getBoundingClientRect();
    const k = Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width));
    return k * tFimGlobal();
  };
  let arrastando = false;
  trilha.addEventListener('pointerdown', (ev) => {
    if (tFimGlobal() <= 0) return;
    arrastando = true; trilha.setPointerCapture(ev.pointerId);
    estado.rodando = false; estado.t = tempoNoPonto(ev); notificar('instante');
  });
  trilha.addEventListener('pointermove', (ev) => { if (arrastando) { estado.t = tempoNoPonto(ev); notificar('instante'); } });
  trilha.addEventListener('pointerup', () => { arrastando = false; });

  function montarMarcos() {
    const fim = tFimGlobal();
    marcos.innerHTML = '';
    rotuloFim.textContent = `${fmt(fim, 2)} s`;
    if (fim <= 0) return;
    const ativos = cenariosAtivos();
    // Rótulos só quando há espaço entre ápice e impacto na trilha
    const t0 = ativos[0].traj;
    const distancia = Number.isFinite(t0.tSubida) && t0.atingeSolo ? ((t0.tTotal - t0.tSubida) / fim) * trilha.clientWidth : Infinity;
    const rotulos = distancia > 100 && trilha.clientWidth > 220;
    ativos.forEach((c, i) => {
      const tr = c.traj, cor = corDe(c);
      const add = (t, tipo, texto) => {
        const el = document.createElement('button');
        el.type = 'button';
        el.className = `lt-marco ${tipo}`;
        el.style.left = `${(t / fim) * 100}%`;
        el.style.setProperty('--c', cor);
        el.style.setProperty('--linha', i);
        el.title = `${ativos.length > 1 ? `Cenário ${c.id}: ` : ''}${texto} em ${fmt(t, 2)} s`;
        el.setAttribute('aria-label', el.title);
        el.addEventListener('pointerdown', (ev) => ev.stopPropagation());
        el.addEventListener('click', () => { estado.rodando = false; estado.t = t; notificar('instante'); });
        if (ativos.length === 1 && rotulos) el.innerHTML = `<span>${texto}</span>`;
        marcos.appendChild(el);
      };
      if (Number.isFinite(tr.tSubida) && tr.tSubida > 0 && tr.tSubida < tr.tFim) add(tr.tSubida, 'apice', 'ápice');
      if (tr.atingeSolo && tr.tTotal > 0) add(tr.tTotal, 'impacto', 'impacto');
    });
  }

  function atualizar() {
    const fim = tFimGlobal();
    const k = fim > 0 ? Math.min(1, estado.t / fim) : 0;
    progresso.style.transform = `scaleX(${k})`;
    cursor.style.left = `${k * 100}%`;
    const texto = `${fmt(estado.t, 2)} s`;
    if (rotuloT.textContent !== texto) rotuloT.textContent = texto;
    trilha.setAttribute('aria-valuenow', estado.t.toFixed(2));
    trilha.setAttribute('aria-valuemax', fim.toFixed(2));
  }

  new ResizeObserver(() => montarMarcos()).observe(trilha);
  return { montarMarcos, atualizar };
}
