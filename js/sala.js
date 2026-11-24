// Recursos para apresentar em sala de aula: modo apresentação, ponteiro luminoso,
// tela preta, tela cheia da cena e tema claro de alto contraste para projetores.
import { estado, notificar } from './state.js';

const guardar = (k, v) => { try { localStorage.setItem(k, v); } catch { /* sem armazenamento */ } };
const ler = (k) => { try { return localStorage.getItem(k); } catch { return null; } };

export function iniciarSala(avisar) {
  const raiz = document.documentElement;
  const laser = document.getElementById('laser');
  const preta = document.getElementById('tela-preta');
  let laserLigado = false;

  // Tema (lembrado entre visitas)
  function aplicarTema(tema) {
    estado.tema = tema;
    raiz.dataset.tema = tema;
    guardar('lv-tema', tema);
    document.querySelectorAll('[data-acao="tema"]').forEach((b) => b.setAttribute('aria-pressed', String(tema === 'claro')));
    notificar('tema');
  }
  aplicarTema(ler('lv-tema') === 'claro' ? 'claro' : 'escuro');

  function alternarApresentacao(forcar) {
    estado.apresentacao = forcar ?? !estado.apresentacao;
    document.body.classList.toggle('apresentacao', estado.apresentacao);
    laserLigado = estado.apresentacao;
    laser.hidden = !laserLigado;
    document.body.classList.toggle('com-laser', laserLigado);
    document.querySelectorAll('[data-acao="apresentar"]').forEach((b) => b.setAttribute('aria-pressed', String(estado.apresentacao)));
    if (estado.apresentacao) avisar('Modo apresentação · P para sair · L liga/desliga o ponteiro · B tela preta');
    notificar('apresentacao');
  }

  function alternarLaser() {
    laserLigado = !laserLigado;
    laser.hidden = !laserLigado;
    document.body.classList.toggle('com-laser', laserLigado);
  }
  window.addEventListener('pointermove', (ev) => {
    if (laserLigado) laser.style.transform = `translate(${ev.clientX}px, ${ev.clientY}px)`;
  });

  function alternarTelaPreta() { preta.hidden = !preta.hidden; }
  preta.addEventListener('click', alternarTelaPreta);

  async function telaCheia() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.querySelector('.palco').requestFullscreen();
    } catch { avisar('O navegador não permitiu tela cheia.'); }
  }

  document.querySelectorAll('[data-acao="tema"]').forEach((b) => b.addEventListener('click', () => aplicarTema(estado.tema === 'claro' ? 'escuro' : 'claro')));
  document.querySelectorAll('[data-acao="apresentar"]').forEach((b) => b.addEventListener('click', () => alternarApresentacao()));
  document.querySelectorAll('[data-acao="tela-cheia"]').forEach((b) => b.addEventListener('click', telaCheia));

  return { alternarApresentacao, alternarLaser, alternarTelaPreta, telaCheia, aplicarTema };
}
