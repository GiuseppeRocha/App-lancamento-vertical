// Roteiro de aula guiado: passos prontos que ajustam o simulador e mostram uma frase na tela.
// O professor avança com → / Page Down (passador de slides) e volta com ← / Page Up.

const PASSOS = [
  {
    titulo: 'Lançamento vertical na Terra',
    texto: 'A bola é lançada para cima a 20 m/s. Observe o vetor velocidade (azul) encolher durante a subida.',
    aplicar: (c) => { c.modo('simples'); c.cenario({ v0: 20, y0: 0, g: 9.81, arrasto: false }); c.camadas({ vetores: true, trajetoria: true, energia: false }); c.reiniciar(); c.tocar('apice'); },
  },
  {
    titulo: 'No ponto mais alto',
    texto: 'Aqui v = 0, mas a aceleração continua −g. A bola está parada por um instante, não em equilíbrio.',
    aplicar: () => {},
  },
  {
    titulo: 'A descida',
    texto: 'Agora v e a têm o mesmo sentido: movimento acelerado. O tempo de descida é igual ao de subida.',
    aplicar: (c) => c.tocar('impacto'),
  },
  {
    titulo: 'Previsão: e na Lua?',
    texto: 'Mesma velocidade, gravidade 6 vezes menor. Até onde a bola sobe? Arraste o marcador na cena.',
    aplicar: (c) => { c.cenario({ v0: 20, y0: 0, g: 1.62, arrasto: false }); c.reiniciar(); c.ferramenta('previsao'); },
  },
  {
    titulo: 'Resultado na Lua',
    texto: 'A altura máxima é inversamente proporcional a g: Hmáx = v₀²/2g.',
    aplicar: (c) => { c.ferramenta(null); c.tocar('apice'); },
  },
  {
    titulo: 'Terra, Lua e Marte lado a lado',
    texto: 'Mesmo lançamento em três gravidades. Compare as alturas máximas na tabela.',
    aplicar: (c) => { c.comparar([9.81, 1.62, 3.71], { v0: 20, y0: 0 }); c.reiniciar(); c.tocar(); },
  },
  {
    titulo: 'Energia no vácuo',
    texto: 'Ec vira Ep na subida e volta na descida. A energia mecânica Em permanece constante.',
    aplicar: (c) => { c.modo('simples'); c.cenario({ v0: 20, y0: 0, g: 9.81, arrasto: false }); c.camadas({ energia: true }); c.reiniciar(); c.tocar(); },
  },
  {
    titulo: 'Com resistência do ar',
    texto: 'O arrasto dissipa energia: Em diminui, a bola sobe menos e a descida demora mais que a subida.',
    aplicar: (c) => { c.cenario({ v0: 30, y0: 0, g: 9.81, arrasto: true }); c.camadas({ energia: true }); c.reiniciar(); c.tocar(); },
  },
  {
    titulo: 'Duas passagens pela mesma altura',
    texto: 'Clique numa altura da cena: a bola passa por ela duas vezes, na subida e na descida.',
    aplicar: (c) => { c.cenario({ v0: 20, y0: 0, g: 9.81, arrasto: false }); c.camadas({ energia: false }); c.reiniciar(); c.ferramenta('regua'); c.regua(15); c.irPara(4.08); },
  },
];

export function criarRoteiro(controle) {
  const painel = document.getElementById('roteiro');
  const elPasso = document.getElementById('roteiro-passo');
  const elTitulo = document.getElementById('roteiro-titulo');
  const elTexto = document.getElementById('roteiro-texto');
  let indice = -1;

  function mostrar() {
    const p = PASSOS[indice];
    elPasso.textContent = `PASSO ${indice + 1} DE ${PASSOS.length}`;
    elTitulo.textContent = p.titulo;
    elTexto.textContent = p.texto;
    document.getElementById('roteiro-anterior').disabled = indice === 0;
    document.getElementById('roteiro-proximo').textContent = indice === PASSOS.length - 1 ? 'Concluir' : 'Próximo →';
  }
  function ir(i) {
    if (i < 0) return;
    if (i >= PASSOS.length) { fechar(); return; }
    indice = i;
    PASSOS[indice].aplicar(controle);
    mostrar();
  }
  function abrir() { painel.hidden = false; document.body.classList.add('com-roteiro'); ir(0); }
  function fechar() { painel.hidden = true; document.body.classList.remove('com-roteiro'); indice = -1; controle.ferramenta(null); }

  document.getElementById('roteiro-anterior').addEventListener('click', () => ir(indice - 1));
  document.getElementById('roteiro-proximo').addEventListener('click', () => ir(indice + 1));
  document.getElementById('roteiro-fechar').addEventListener('click', fechar);

  return {
    ativo: () => !painel.hidden,
    alternar: () => (painel.hidden ? abrir() : fechar()),
    proximo: () => ir(indice + 1),
    anterior: () => ir(indice - 1),
  };
}
