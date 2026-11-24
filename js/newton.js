// Mascote "Newton" do sketch original (desenharNewton), portado para p5.js.
// Estados: 0 = neutro (olhos seguem o mouse), 1 = errou (treme e chora), 2 = acertou (pula com a maçã).
/* global p5 */

export function desenharNewton(p, x, y, tamanho, estado, inicioReacao) {
  p.push();
  const t = p.millis() / 1000;
  const reacao = Math.max(0, (p.millis() - inicioReacao) / 1000);
  const tremor = estado === 1 ? Math.sin(t * 25) * 1.6 : 0;
  const salto = estado === 2 ? -Math.abs(Math.sin(Math.min(reacao, 2) * Math.PI * 2)) * Math.max(0, 8 - reacao * 4) : 0;
  p.translate(x + tremor, y + Math.sin(t * 2) * 1.5 + salto);
  p.scale(tamanho);

  p.noStroke();
  p.fill(3, 5, 10, 140);
  p.ellipse(0, 6, 125, 20);
  p.stroke(225, 228, 236, 210);
  p.strokeWeight(3);
  p.strokeCap(p.ROUND);
  p.noFill();
  p.line(0, -126, 6, -62);
  p.line(6, -62, -18, -29);
  p.line(-18, -29, -30, 0);
  p.line(6, -62, 31, -29);
  p.line(31, -29, 43, 0);
  p.line(-30, 0, -43, 1);
  p.line(43, 0, 54, -1);

  if (estado === 1) {
    p.line(0, -111, -32, -99);
    p.line(-32, -99, -13, -147 + Math.sin(t * 8) * 2);
    p.line(0, -111, 29, -91);
    p.line(29, -91, 17, -61);
  } else {
    p.line(0, -111, -26, -88);
    p.line(-26, -88, -12, -65);
    p.line(0, -111, 27, -89);
    p.line(27, -89, 41, estado === 2 ? -125 + Math.sin(t * 8) * 5 : -69);
  }

  // Peruca
  p.noStroke();
  p.fill(108, 113, 127);
  p.ellipse(-25, -139, 27, 72);
  p.ellipse(25, -139, 27, 72);
  p.ellipse(0, -174, 64, 32);
  p.stroke(171, 175, 186);
  p.strokeWeight(1);
  for (let lado = -1; lado <= 1; lado += 2) {
    for (let i = 0; i < 7; i++) {
      const yy = -174 + i * 10;
      const xx = lado * (25 + Math.sin(i * 1.7) * 3);
      p.fill(151 + i * 4, 155 + i * 4, 166 + i * 4);
      p.ellipse(xx, yy, 17, 19);
      p.noFill();
      p.arc(xx + lado, yy, 9, 12, -p.HALF_PI, p.PI);
    }
  }

  // Rosto
  p.fill(240, 237, 226);
  p.stroke(223, 221, 215);
  p.ellipse(0, -155, 45, 52);
  p.noStroke();
  p.fill(190, 193, 202);
  for (let i = 0; i < 5; i++) p.ellipse(-21 + i * 10, -178 - Math.sin(i * 0.8) * 5, 17, 17);

  const olharX = p.constrain((p.mouseX - x) / 160, -2.5, 2.5);
  const olharY = p.constrain((p.mouseY - (y - 155 * tamanho)) / 240, -1.8, 1.8);
  p.stroke(28, 31, 39);
  p.strokeWeight(2);
  p.noFill();

  if (estado === 1) {
    p.line(-15, -164, -5, -168);
    p.line(5, -168, 15, -164);
    p.arc(-9, -155, 9, 6, p.PI, p.TWO_PI);
    p.arc(9, -155, 9, 6, p.PI, p.TWO_PI);
    p.arc(0, -138, 17, 12, p.PI, p.TWO_PI);
    p.noStroke();
    for (let lado = -1; lado <= 1; lado += 2) {
      for (let i = 0; i < 3; i++) {
        const queda = (t * 0.9 + i / 3) % 1;
        p.fill(124, 196, 255, 230 * (1 - queda));
        p.ellipse(lado * 11, -150 + queda * 54, 4.5, 8);
      }
    }
  } else {
    p.line(-15, -165, -5, -166);
    p.line(5, -166, 15, -165);
    p.noStroke();
    p.fill(28, 31, 39);
    p.ellipse(-9 + olharX, -156 + olharY, 4, 5);
    p.ellipse(9 + olharX, -156 + olharY, 4, 5);
    p.noFill();
    p.stroke(28, 31, 39);
    if (estado === 2) p.arc(0, -146, 19, 15, 0, p.PI);
    else p.line(-5, -140, 6, -141);
  }

  // Maçã
  p.noStroke();
  p.fill(215, 79, 78);
  let macaY = estado === 2 ? -128 + Math.sin(t * 8) * 5 : -71;
  if (estado === 1) macaY = 0;
  const macaX = estado === 1 ? 68 : 43;
  p.ellipse(macaX - 3, macaY, 12, 14);
  p.ellipse(macaX + 3, macaY, 12, 14);
  p.stroke(160, 124, 81);
  p.strokeWeight(2);
  p.line(macaX, macaY - 5, macaX + 2, macaY - 12);
  p.noStroke();
  p.fill(139, 179, 129);
  p.ellipse(macaX + 6, macaY - 10, 10, 4);
  p.pop();
}

/**
 * Cria um Newton em um contêiner. `enquadramento`: 'corpo' (inteiro) ou 'rosto' (avatar).
 * Retorna { reagir(estado, duracaoMs?) }.
 */
export function criarNewton(container, enquadramento = 'corpo') {
  let estado = 0, inicio = 0, timer, relogio = () => 0;
  new p5((p) => {
    relogio = () => p.millis();
    p.setup = () => {
      p.createCanvas(container.clientWidth, container.clientHeight);
      new ResizeObserver(() => p.resizeCanvas(container.clientWidth, container.clientHeight)).observe(container);
    };
    p.draw = () => {
      p.clear();
      if (enquadramento === 'rosto') {
        const s = p.height / 120;
        desenharNewton(p, p.width / 2, p.height / 2 + 158 * s, s, estado, inicio);
      } else {
        const s = Math.min(p.width / 170, p.height / 230);
        desenharNewton(p, p.width / 2, p.height - 18 * s, s, estado, inicio);
      }
    };
  }, container);
  return {
    reagir(novo, duracao = 0) {
      estado = novo;
      inicio = relogio();
      clearTimeout(timer);
      if (duracao > 0) timer = setTimeout(() => { estado = 0; }, duracao);
    },
  };
}
