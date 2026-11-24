boolean[] marcado = new boolean[6];
String[] nomes = {
  "Tempo", "Peso", "Aceleração gravitacional",
  "Largura", "Volume", "Velocidade inicial"
};
String[] unidades = {"s", "kg", "m/s²", "cm", "m³", "m/s"};

String resultado = "";
int inicioAnimacao = -1000;
int pagina = 1;

String resposta = "";
String resultadoExercicio = "";
boolean campoAtivo = false;
boolean acertouExercicio = false;
int inicioAnimacaoExercicio = -1000;

boolean animando = false;
int inicioCena;
float duracaoCena = 7.5;

float alturaInicial;
float velocidadeInicial;
float gravidade;
float tempoLancamento;
float altura;
float alturaMaxima;
float tempoAteChao;

PGraphics ceu;
int estadoNewtonGrandezas = 0;
int estadoNewtonExercicio = 0;
int inicioNewtonGrandezas = 0;
int inicioNewtonExercicio = 0;

color verde = #3DDCBE;
color branco = #EDF3FF;
color cinza = #99A9C1;
color vermelho = #FF798C;
color azul = #8BAEFF;
color amarelo = #F3CA7A;

void setup() {
  size(900, 900);
  smooth();
  textFont(createFont("SansSerif", 24));
  prepararCeu();

  alturaInicial = round(random(5, 50) * 100) / 100.0;
  velocidadeInicial = round(random(20, 50) * 100) / 100.0;
  gravidade = -round(random(1, 10) * 100) / 100.0;
  tempoLancamento = round(random(0.5, 3) * 100) / 100.0;

  altura = alturaNoTempo(tempoLancamento);
  alturaMaxima = alturaInicial - sq(velocidadeInicial) / (2 * gravidade);
  tempoAteChao = (-velocidadeInicial -
    sqrt(sq(velocidadeInicial) - 2 * gravidade * alturaInicial)) / gravidade;
}

float alturaNoTempo(float t) {
  return alturaInicial + velocidadeInicial * t + gravidade * t * t / 2;
}

void draw() {
  desenharFundo();

  if (pagina == 1) {
    paginaGrandezas();
  } else if (animando) {
    paginaAnimacao();
  } else {
    paginaExercicio();
  }
}

void desenharFundo() {
  background(3, 5, 10);
  float t = millis() / 1000.0;
  image(ceu, 0, 0);

  pushMatrix();
  translate(744, 440);
  rotate(-0.48);
  noFill();
  stroke(193, 210, 230, 25);
  strokeWeight(1);
  ellipse(0, 0, 205, 460);
  ellipse(0, 0, 320, 610);
  noStroke();
  fill(221, 226, 238, 140);
  ellipse(102.5 * cos(t * 0.22), 230 * sin(t * 0.22), 4, 4);
  fill(amarelo, 110);
  ellipse(160 * cos(t * 0.13 + 2), 305 * sin(t * 0.13 + 2), 3, 3);
  popMatrix();

  for (int i = 0; i < 58; i++) {
    float x = (i * 137.37 + 27) % width;
    float y = (i * 89.59 + 13) % height;
    float brilho = 35 + 100 * (0.5 + 0.5 * sin(t * 1.4 + i * 2.7));
    fill(220, 235, 255, brilho);
    float tamanho = i % 7 == 0 ? 2.3 : 1.2;
    ellipse(x, y, tamanho, tamanho);
  }

  float meteoro = (millis() % 14000) / 1000.0 - 10.5;
  if (meteoro >= 0 && meteoro < 0.9) {
    float x = 780 - meteoro * 510;
    float y = 65 + meteoro * 300;
    strokeWeight(1.3);
    for (int i = 0; i < 24; i++) {
      stroke(220, 235, 255, (1 - i / 24.0) * 160 * sin(meteoro / 0.9 * PI));
      line(x + i * 3, y - i * 1.76, x + (i + 1) * 3, y - (i + 1) * 1.76);
    }
  }
  noStroke();
  textAlign(LEFT, BASELINE);
}

void prepararCeu() {
  ceu = createGraphics(900, 900);
  ceu.beginDraw();
  ceu.background(3, 5, 10);
  ceu.noStroke();
  java.util.Random estrelas = new java.util.Random(2026);

  for (int i = 0; i < 2400; i++) {
    float x = estrelas.nextFloat() * 1100 - 100;
    float y = 770 - x * 0.70 + (float) estrelas.nextGaussian() * 85;
    ceu.fill(200, 205, 224, 12 + estrelas.nextFloat() * 34);
    float tamanho = 0.4 + estrelas.nextFloat() * 0.8;
    ceu.ellipse(x, y, tamanho, tamanho);
  }

  for (int i = 0; i < 620; i++) {
    float x = estrelas.nextFloat() * width;
    float y = estrelas.nextFloat() * height;
    float tamanho = 0.65 + estrelas.nextFloat() * 1.3;
    if (i % 9 == 0) ceu.fill(243, 216, 176, 100);
    else ceu.fill(215, 229, 251, 45 + estrelas.nextFloat() * 105);
    ceu.ellipse(x, y, tamanho, tamanho);
  }

  float[] pontosX = {660, 706, 779, 812, 756, 706};
  float[] pontosY = {232, 206, 230, 294, 324, 206};
  ceu.stroke(190, 205, 224, 32);
  ceu.strokeWeight(0.8);
  for (int i = 1; i < pontosX.length; i++) {
    ceu.line(pontosX[i - 1], pontosY[i - 1], pontosX[i], pontosY[i]);
  }
  ceu.noStroke();
  ceu.fill(224, 233, 249, 170);
  for (int i = 0; i < pontosX.length; i++) ceu.ellipse(pontosX[i], pontosY[i], 2.5, 2.5);
  ceu.endDraw();
}

void desenharNewton(float x, float y, float tamanho, int estado, int inicioReacao) {
  pushStyle();
  pushMatrix();
  float t = millis() / 1000.0;
  float reacao = max(0, (millis() - inicioReacao) / 1000.0);
  float tremor = estado == 1 ? sin(t * 25) * 1.6 : 0;
  float salto = estado == 2 ? -abs(sin(min(reacao, 2) * PI * 2)) * max(0, 8 - reacao * 4) : 0;
  translate(x + tremor, y + sin(t * 2) * 1.5 + salto);
  scale(tamanho);

  noStroke();
  fill(3, 5, 10, 140);
  ellipse(0, 6, 125, 20);
  stroke(225, 228, 236, 210);
  strokeWeight(3);
  strokeCap(ROUND);
  noFill();
  line(0, -126, 6, -62);
  line(6, -62, -18, -29);
  line(-18, -29, -30, 0);
  line(6, -62, 31, -29);
  line(31, -29, 43, 0);
  line(-30, 0, -43, 1);
  line(43, 0, 54, -1);

  if (estado == 1) {
    line(0, -111, -32, -99);
    line(-32, -99, -13, -147 + sin(t * 8) * 2);
    line(0, -111, 29, -91);
    line(29, -91, 17, -61);
  } else {
    line(0, -111, -26, -88);
    line(-26, -88, -12, -65);
    line(0, -111, 27, -89);
    line(27, -89, 41, estado == 2 ? -125 + sin(t * 8) * 5 : -69);
  }

  noStroke();
  fill(108, 113, 127);
  ellipse(-25, -139, 27, 72);
  ellipse(25, -139, 27, 72);
  ellipse(0, -174, 64, 32);

  stroke(171, 175, 186);
  strokeWeight(1);
  for (int lado = -1; lado <= 1; lado += 2) {
    for (int i = 0; i < 7; i++) {
      float yy = -174 + i * 10;
      float xx = lado * (25 + sin(i * 1.7) * 3);
      fill(151 + i * 4, 155 + i * 4, 166 + i * 4);
      ellipse(xx, yy, 17, 19);
      noFill();
      arc(xx + lado, yy, 9, 12, -HALF_PI, PI);
    }
  }

  fill(240, 237, 226);
  stroke(223, 221, 215);
  ellipse(0, -155, 45, 52);
  noStroke();
  fill(190, 193, 202);
  for (int i = 0; i < 5; i++) {
    float xx = -21 + i * 10;
    ellipse(xx, -178 - sin(i * 0.8) * 5, 17, 17);
  }

  float olharX = constrain((mouseX - x) / 160.0, -2.5, 2.5);
  float olharY = constrain((mouseY - (y - 155 * tamanho)) / 240.0, -1.8, 1.8);
  stroke(28, 31, 39);
  strokeWeight(2);
  noFill();

  if (estado == 1) {
    line(-15, -164, -5, -168);
    line(5, -168, 15, -164);
    arc(-9, -155, 9, 6, PI, TWO_PI);
    arc(9, -155, 9, 6, PI, TWO_PI);
    arc(0, -138, 17, 12, PI, TWO_PI);
    noStroke();
    for (int lado = -1; lado <= 1; lado += 2) {
      for (int i = 0; i < 3; i++) {
        float queda = (t * 0.9 + i / 3.0) % 1;
        fill(124, 196, 255, 230 * (1 - queda));
        float yy = -150 + queda * 54;
        ellipse(lado * 11, yy, 4.5, 8);
      }
    }
  } else {
    line(-15, -165, -5, -166);
    line(5, -166, 15, -165);
    noStroke();
    fill(28, 31, 39);
    ellipse(-9 + olharX, -156 + olharY, 4, 5);
    ellipse(9 + olharX, -156 + olharY, 4, 5);
    noFill();
    stroke(28, 31, 39);
    if (estado == 2) arc(0, -146, 19, 15, 0, PI);
    else line(-5, -140, 6, -141);
  }

  noStroke();
  fill(215, 79, 78);
  float macaY = estado == 2 ? -128 + sin(t * 8) * 5 : -71;
  if (estado == 1) macaY = 0;
  float macaX = estado == 1 ? 68 : 43;
  ellipse(macaX - 3, macaY, 12, 14);
  ellipse(macaX + 3, macaY, 12, 14);
  stroke(160, 124, 81);
  strokeWeight(2);
  line(macaX, macaY - 5, macaX + 2, macaY - 12);
  noStroke();
  fill(139, 179, 129);
  ellipse(macaX + 6, macaY - 10, 10, 4);

  popMatrix();
  popStyle();
}

void cabecalho(String titulo, String subtitulo) {
  noStroke();
  fill(verde);
  textSize(13);
  text("F Í S I C A   /   M E C Â N I C A", 60, 53);
  fill(10, 13, 22, 220);
  rect(691, 30, 149, 32, 16);
  fill(cinza);
  textSize(12);
  textAlign(CENTER, CENTER);
  text("ETAPA " + pagina + " DE 2", 765, 45);
  textAlign(LEFT, BASELINE);
  fill(branco);
  textSize(38);
  text(titulo, 60, 115);
  fill(cinza);
  textSize(17);
  text(subtitulo, 60, titulo.equals("") ? 115 : 151);
}

void paginaGrandezas() {
  cabecalho("Grandezas físicas",
    "Selecione as grandezas utilizadas no lançamento vertical.");

  for (int i = 0; i < 6; i++) {
    CheckBox(190 + i * 84, 5 - i);
  }

  desenharNewton(730, 607, 1.05, estadoNewtonGrandezas, inicioNewtonGrandezas);

  float t = millis() - inicioAnimacao;
  float pulso = constrain(1 - t / 800.0, 0, 1);
  color cor = resultado.equals("Incorreto") ? vermelho : verde;

  noStroke();
  fill(8, 12, 20, 225);
  rect(60, 710, 780, 90, 18);

  if (!resultado.equals("")) {
    fill(cor, 12 + 30 * pulso);
    stroke(cor, 80 + 175 * pulso);
    strokeWeight(1 + 2 * pulso);
    rect(60, 710, 780, 90, 18);
    noStroke();
  }

  fill(branco);
  textSize(20);
  text("Checar respostas", 85, 745);
  textSize(16);

  if (resultado.equals("")) {
    fill(cinza);
    text("Clique na seta para conferir sua seleção.", 85, 776);
  } else {
    fill(cor);
    if (resultado.equals("Correto")) {
      text("Correto! Vamos ver um lançamento?", 85, 776);
    } else {
      text("Incorreto. Tente novamente!", 85 + sin(t * 0.06) * 8 * pulso, 776);
    }
  }

  botao(756, 730, 60, 50, "→");
  if (resultado.equals("Correto")) {
    botao(60, 820, 780, 54, "Próxima página →");
  }
}

void iniciarCena() {
  pagina = 2;
  animando = true;
  campoAtivo = false;
  inicioCena = millis();
}

void paginaAnimacao() {
  float tempoCena = (millis() - inicioCena) / 1000.0;
  if (tempoCena >= duracaoCena) {
    animando = false;
    campoAtivo = true;
    paginaExercicio();
    return;
  }

  float t = tempoCena * (9.6 / duracaoCena);

  cabecalho("",
    "Observe a cena. Depois, calcule a altura da bolinha.");

  noStroke();
  fill(3, 6, 12, 62);
  stroke(220, 230, 255, 40);
  strokeWeight(1);
  rect(60, 190, 780, 572, 24);
  noStroke();
  clip(62, 192, 776, 568);

  fill(7, 10, 16, 235);
  rect(60, 690, 780, 72);
  stroke(65, 94, 110);
  strokeWeight(2);
  line(80, 690, 820, 690);

  for (int i = 0; i < 16; i++) {
    float x = 90 + i * 49;
    stroke(50, 76, 86);
    line(x, 691, x + 8, 685);
  }
  noStroke();

  float voo = constrain((t - 1.55) / 5.2, 0, 1);
  float tempoApice = -velocidadeInicial / gravidade;
  float inicioFuga = 1.55 + 5.2 * tempoApice / tempoAteChao + 0.65;
  float fuga = max(0, t - inicioFuga);
  float personagemX = 350 + 190 * fuga + 40 * fuga * fuga;

  fill(0, 0, 0, 35);
  ellipse(personagemX + 2, 694, 100, 13);

  if (t < 1.0) {
    boneco(350, 690, 0, t);
  } else if (t < 1.55) {
    boneco(350, 690, 1, t);
  } else if (fuga == 0) {
    boneco(350, 690, 2, t);
  } else {
    boneco(personagemX, 690, 3, t);
    stroke(cinza, 100);
    strokeWeight(2);
    for (int i = 0; i < 3; i++) {
      float yy = 600 + i * 23;
      line(personagemX - 78 - i * 6, yy, personagemX - 50, yy);
    }
    noStroke();
  }

  float bolaX = 408;
  float bolaY;

  if (t < 1.0) {
    bolaX = 388;
    bolaY = 614 + sin(t * 7) * 3;
  } else if (t < 1.55) {
    float preparo = constrain((t - 1.0) / 0.55, 0, 1);
    bolaX = lerp(388, 408, preparo);
    bolaY = lerp(614, 565, preparo);
  } else if (t < 6.75) {
    bolaY = posicaoBola(voo);
    for (int i = 5; i >= 1; i--) {
      float passado = max(0, voo - i * 0.009);
      fill(amarelo, 45 - i * 6);
      ellipse(bolaX, posicaoBola(passado), 15 - i, 15 - i);
    }
  } else {
    float depois = t - 6.75;
    bolaX += depois * 17;
    bolaY = 679 - abs(sin(depois * 8)) * 45 * exp(-depois * 1.7);

    if (depois < 0.65) {
      noFill();
      stroke(amarelo, 150 * (1 - depois / 0.65));
      strokeWeight(2);
      ellipse(408, 688, 30 + depois * 130, 8 + depois * 24);
      noStroke();
    }
  }

  fill(amarelo, 20);
  ellipse(bolaX, bolaY, 37, 37);
  fill(amarelo);
  ellipse(bolaX, bolaY, 21, 21);
  fill(255, 245, 211);
  ellipse(bolaX - 3, bolaY - 4, 6, 6);

  noClip();

  fill(29, 44, 62);
  rect(60, 784, 780, 5, 3);
  fill(verde);
  rect(60, 784, 780 * constrain(tempoCena / duracaoCena, 0, 1), 5, 3);

  botao(60, 820, 170, 54, "← Voltar");
}

float posicaoBola(float progresso) {
  float h = max(0, alturaNoTempo(progresso * tempoAteChao));
  if (h >= alturaInicial) {
    return map(h, alturaInicial, alturaMaxima, 565, 285);
  }
  return map(h, 0, alturaInicial, 679, 565);
}

void boneco(float x, float chao, int pose, float t) {
  pushMatrix();
  translate(x, chao);

  float joelhos = pose == 0 ? 6 + sin(t * 7) * 3 : 0;
  if (pose == 3) {
    translate(0, -abs(sin(t * 13)) * 9);
    rotate(0.20);
  }
  translate(0, joelhos);

  stroke(branco);
  strokeWeight(4);
  strokeCap(ROUND);
  noFill();
  ellipse(0, -125, 39, 43);
  line(0, -104, 2, -58);

  if (pose == 3) {
    float passo = sin(t * 13);
    line(2, -58, 23 * passo, -30);
    line(23 * passo, -30, 39 * passo, 0);
    line(2, -58, -23 * passo, -27);
    line(-23 * passo, -27, -39 * passo, -3);
    line(0, -96, -30 * passo, -83);
    line(-30 * passo, -83, -34 * passo, -112);
    line(0, -96, 30 * passo, -80);
    line(30 * passo, -80, 38 * passo, -58);
  } else {
    line(2, -58, -18, -29);
    line(-18, -29, -29, -joelhos);
    line(2, -58, 23, -32);
    line(23, -32, 34, -joelhos);

    if (pose == 0) {
      line(0, -96, 22, -76);
      line(22, -76, 38, -76);
      line(0, -96, -24, -76);
      line(-24, -76, 10, -65);
    } else if (pose == 1) {
      float a = constrain((t - 1.0) / 0.55, 0, 1);
      line(0, -96, lerp(22, 34, a), lerp(-76, -96, a));
      line(lerp(22, 34, a), lerp(-76, -96, a),
        lerp(38, 58, a), lerp(-76, -125, a));
      line(0, -96, -26, -73);
      line(-26, -73, -10, -53);
    } else {
      line(0, -96, 44, -104);
      line(44, -104, 12, -146);
      line(0, -96, -27, -76);
      line(-27, -76, -15 + sin(t * 6) * 4, -54);
    }
  }

  noStroke();
  fill(branco);
  ellipse(6, -129, 4, 5);
  ellipse(14, -128, 4, 5);
  noFill();
  stroke(branco);
  strokeWeight(2);
  if (pose >= 2) {
    ellipse(11, -116, 7, 9);
  } else {
    arc(9, -120, 13, 9, 0, PI);
  }
  stroke(verde);
  strokeWeight(5);
  line(-7, -101, 8, -99);
  popMatrix();
  noStroke();
}

void paginaExercicio() {
  cabecalho("Lançamento vertical",
    "Ele escapou da bolinha. Você consegue resolver o desafio?");

  noStroke();
  fill(7, 13, 20, 230);
  rect(60, 190, 780, 128, 20);
  fill(verde);
  rect(60, 212, 4, 84, 2);
  textSize(12);
  text("S E U   D E S A F I O", 85, 221);
  fill(branco);
  textSize(24);
  text("Calcule a altura da bolinha após", 85, 260);
  fill(verde);
  textSize(29);
  text(nf(tempoLancamento, 0, 2) + " segundos do lançamento.", 85, 297);

  desenharNewton(754, 308, 0.48, estadoNewtonExercicio, inicioNewtonExercicio);

  cartaoDado(60, 350, "ALTURA INICIAL", "y₀",
    nf(alturaInicial, 0, 2) + " m", verde);
  cartaoDado(460, 350, "VELOCIDADE INICIAL", "v₀",
    nf(velocidadeInicial, 0, 2) + " m/s", azul);
  cartaoDado(60, 476, "ACELERAÇÃO GRAVITACIONAL", "g",
    nf(gravidade, 0, 2) + " m/s²", vermelho);
  cartaoDado(460, 476, "TEMPO", "t",
    nf(tempoLancamento, 0, 2) + " s", amarelo);

  fill(cinza);
  textSize(15);
  text("Considere o sentido positivo para cima e despreze a resistência do ar.", 60, 618);
  fill(branco);
  textSize(16);
  text("Sua resposta em metros", 60, 662);
  fill(cinza);
  textSize(13);
  textAlign(RIGHT, BASELINE);
  text("Arredonde para duas casas decimais", 840, 662);
  textAlign(LEFT, BASELINE);

  desenharCampoResposta();

  if (!resultadoExercicio.equals("")) {
    float t = millis() - inicioAnimacaoExercicio;
    float pulso = constrain(1 - t / 800.0, 0, 1);
    float deslocamento = acertouExercicio ? 0 : sin(t * 0.06) * 7 * pulso;
    fill(acertouExercicio ? verde : vermelho);
    textSize(17);
    text(resultadoExercicio, 85 + deslocamento, 785);
  } else {
    fill(cinza);
    textSize(14);
    text("Digite sua resposta e pressione Enter para conferir.", 85, 785);
  }

  botao(60, 820, 170, 54, "← Voltar");
  botao(245, 820, 210, 54, "↻ Rever a cena");
  botao(470, 820, 370, 54, "Verificar resposta →");
}

void desenharCampoResposta() {
  stroke(campoAtivo ? verde : color(57, 75, 99));
  strokeWeight(campoAtivo ? 2 : 1);
  fill(8, 12, 20, 235);
  rect(60, 682, 780, 64, 14);
  noStroke();
  textSize(26);

  if (resposta.equals("") && !campoAtivo) {
    fill(cinza);
    textSize(20);
    text("Digite sua resposta...", 84, 723);
  } else {
    fill(branco);
    text(resposta, 84, 723);
  }

  if (campoAtivo && millis() % 1000 < 500) {
    float cursorX = 84 + textWidth(resposta);
    stroke(verde);
    strokeWeight(2);
    line(cursorX + 3, 699, cursorX + 3, 727);
    noStroke();
  }

  fill(cinza);
  textSize(22);
  textAlign(RIGHT, BASELINE);
  text("m", 814, 723);
  textAlign(LEFT, BASELINE);
}

void verificarResposta() {
  inicioAnimacaoExercicio = millis();
  inicioNewtonExercicio = millis();
  estadoNewtonExercicio = 1;
  float valor = float(resposta.replace(',', '.'));

  if (Float.isNaN(valor) || Float.isInfinite(valor)) {
    acertouExercicio = false;
    resultadoExercicio = "Digite uma resposta válida.";
    return;
  }

  float alturaArredondada = round(altura * 100) / 100.0;
  acertouExercicio = abs(valor - alturaArredondada) < 0.005;
  estadoNewtonExercicio = acertouExercicio ? 2 : 1;
  resultadoExercicio = acertouExercicio ?
    "Correto! Você calculou a altura da bolinha." :
    "Incorreto. Confira seus cálculos e tente novamente!";
}

void cartaoDado(float x, float y, String titulo, String simbolo,
  String valor, color destaque) {
  noStroke();
  fill(8, 14, 26, 70);
  rect(x, y + 5, 380, 104, 18);
  fill(8, 12, 20, 230);
  rect(x, y, 380, 104, 18);
  fill(cinza);
  textSize(12);
  text(titulo, x + 24, y + 29);
  fill(destaque, 25);
  rect(x + 318, y + 16, 42, 31, 9);
  fill(destaque);
  textSize(18);
  textAlign(CENTER, CENTER);
  text(simbolo, x + 339, y + 30);
  textAlign(LEFT, BASELINE);
  fill(branco);
  textSize(32);
  text(valor, x + 24, y + 79);
}

void CheckBox(float y, int numero) {
  boolean sobre = dentro(60, y, 550, 72);
  noStroke();
  if (marcado[numero]) fill(20, 41, 42, 240);
  else if (sobre) fill(26, 31, 43, 245);
  else fill(8, 12, 20, 225);
  stroke(190, 211, 230, 32);
  strokeWeight(1);
  rect(60, y, 550, 72, 12);
  noStroke();

  if (marcado[numero]) {
    fill(verde);
    rect(60, y + 18, 4, 36, 3);
    rect(85, y + 18, 36, 36, 10);
    stroke(14, 35, 40);
    strokeWeight(3);
    line(94, y + 36, 101, y + 43);
    line(101, y + 43, 113, y + 29);
  } else {
    fill(17, 26, 43);
    stroke(77, 96, 123);
    strokeWeight(1.5);
    rect(85, y + 18, 36, 36, 10);
  }

  noStroke();
  fill(branco);
  textSize(18);
  text(nomes[numero], 145, y + 44);
  fill(3, 5, 11, 220);
  rect(499, y + 20, 85, 32, 8);
  fill(cinza);
  textSize(16);
  textAlign(CENTER, CENTER);
  text(unidades[numero], 541, y + 35);
  textAlign(LEFT, BASELINE);
}

void botao(float x, float y, float largura, float alturaBotao, String texto) {
  noStroke();
  fill(dentro(x, y, largura, alturaBotao) ? color(99, 242, 211) : verde);
  rect(x, y, largura, alturaBotao, 14);
  fill(14, 35, 40);
  textSize(19);
  textAlign(CENTER, CENTER);
  text(texto, x + largura / 2, y + alturaBotao / 2 - 1);
  textAlign(LEFT, BASELINE);
}

boolean dentro(float x, float y, float largura, float alturaBotao) {
  return mouseX >= x && mouseX < x + largura &&
    mouseY >= y && mouseY < y + alturaBotao;
}

void mousePressed() {
  if (pagina == 2) {
    if (dentro(60, 820, 170, 54)) {
      pagina = 1;
      animando = false;
      campoAtivo = false;
      return;
    }
    if (animando) return;

    campoAtivo = dentro(60, 682, 780, 64);
    if (dentro(245, 820, 210, 54)) {
      iniciarCena();
    } else if (dentro(470, 820, 370, 54)) {
      verificarResposta();
      campoAtivo = true;
    }
    return;
  }

  if (resultado.equals("Correto") && dentro(60, 820, 780, 54)) {
    iniciarCena();
    return;
  }

  for (int i = 0; i < 6; i++) {
    if (dentro(60, 190 + i * 84, 550, 72)) {
      int numero = 5 - i;
      marcado[numero] = !marcado[numero];
      resultado = "";
      return;
    }
  }

  if (dentro(756, 730, 60, 50)) {
    boolean correto = marcado[0] && marcado[2] && marcado[5] &&
      !marcado[1] && !marcado[3] && !marcado[4];
    resultado = correto ? "Correto" : "Incorreto";
    inicioAnimacao = millis();
    estadoNewtonGrandezas = correto ? 2 : 1;
    inicioNewtonGrandezas = millis();
  }
}

void keyPressed() {
  if (pagina != 2 || animando || !campoAtivo || key == CODED) return;

  if (key == ENTER || key == RETURN) {
    verificarResposta();
    return;
  }
  if (key == BACKSPACE) {
    if (resposta.length() > 0) {
      resposta = resposta.substring(0, resposta.length() - 1);
    }
    resultadoExercicio = "";
    return;
  }
  if (key == DELETE) {
    resposta = "";
    resultadoExercicio = "";
    return;
  }
  if (resposta.length() >= 16) return;

  boolean digito = key >= '0' && key <= '9';
  boolean separador = (key == '.' || key == ',') &&
    resposta.indexOf('.') == -1 && resposta.indexOf(',') == -1;
  boolean sinal = key == '-' && resposta.length() == 0;

  if (digito || separador || sinal) {
    resposta += key;
    resultadoExercicio = "";
  }
}
