# Simulador de Lançamento Vertical

Versão web do trabalho original em Processing (`original/LancamentoVertical.pde`), reescrita em **p5.js**, a versão oficial do Processing para navegadores, e pronta para hospedar na **Vercel**.

## Funcionalidades

- **Simulação**: escala graduada em metros, linha da altura inicial, marca da altura máxima, posição atual na escala, rastro estroboscópico (subida à esquerda, descida à direita) e vetores de velocidade e aceleração.
- **Controles**: Iniciar, Pausar, Continuar e Reiniciar (atalhos: barra de espaço e R); velocidade de 0,25×, 0,5×, 1× e 2×; exibir ou ocultar vetores, trajetória e valores.
- **Parâmetros**: controles deslizantes com campo editável e validação de limites para v₀, y₀ e g, mais massa, Cd e área frontal quando a resistência do ar está ligada.
- **Motor físico** (`js/physics.js`):
  - modelo ideal com solução analítica;
  - modelo com arrasto quadrático resolvido por RK4 com passo adaptativo;
  - impacto localizado por bisseção, de modo que o objeto para exatamente em y = 0;
  - casos especiais: v₀ = 0, lançamento para baixo e g = 0.
- **Gráficos**: posição, velocidade e aceleração em função do tempo, com marcação de Hmáx e de v = 0. Clicar ou arrastar sobre um gráfico seleciona o instante na simulação.
- **Comparação**: até 3 cenários simultâneos, presets Terra, Lua e Marte e tabela comparativa.
- **Teoria** (`teoria.html`): equações em KaTeX, 3 laboratórios interativos (equação ao vivo, vetores na inversão, vácuo × ar), 6 checagens rápidas, caixas de ideia-chave e erro comum, exemplos revelados passo a passo e resumo.
- **Exercícios** (`exercicios.html`): o quiz de grandezas do sketch original e um banco de 8 tipos de desafio em 3 níveis, gerados pelo motor físico, com dicas progressivas, placar, Newton reagindo e modo turma (cronômetro e revelação da resposta).
- **Assistente de IA** (`api/chat.js`): usa o Claude e recebe o estado real da simulação. Para qualquer valor novo, o modelo chama a ferramenta `calcular_lancamento`, que executa o mesmo motor físico, então ele não inventa números.

## Para a sala de aula

- **Roteiro de aula guiado** (tecla `G`): 9 passos que ajustam o simulador sozinhos e mostram uma frase curta. Avança com `→` ou `Page Down`, então funciona com passador de slides.
- **Modo apresentação** (`P`): só a cena, a linha do tempo e os números, com fontes e traços maiores. Inclui ponteiro luminoso (`L`), tela preta (`B`) e tela cheia da cena (`F`).
- **Tema claro de alto contraste** (`T`) para projetor em sala iluminada.
- **Linha do tempo** com marcos de ápice e impacto, quadro a quadro com `←` e `→`, e pausa automática no ápice.
- **Previsão:** a turma dá um palpite da altura máxima antes do lançamento, e o Newton reage ao resultado.
- **Régua de altura:** mostra os dois instantes em que a bola passa por uma altura, na cena e no gráfico.
- **Energia:** barras de Ec, Ep e Em na cena, mais o gráfico de energia. No vácuo Em é constante; com ar, diminui.
- **Planetas:** Terra, Lua, Marte, Mercúrio, Vênus e Júpiter.
- **Assistente:** some sozinho sem internet ou sem chave, para não exibir erro na frente da turma.
- **Atalhos:** a tecla `?` mostra todos.

## Visual

- **Base:** o simulador abre como um app em tela cheia, no estilo das ferramentas técnicas atuais (Linear, Vercel): barra superior, parâmetros à esquerda, cena no centro, gráficos à direita e barra de status. Usa as fontes Geist e Geist Mono, bordas finas e animações suaves.
- **Arte do sketch original:**
  - o céu com a Via Láctea (semente 2026), as órbitas e o meteoro;
  - o boneco que arremessa e foge, a bola com halo e a onda de impacto;
  - o Newton que reage às respostas, também usado como avatar do assistente;
  - a paleta original.
- **Funciona offline:** fontes, p5.js e KaTeX ficam em `vendor/`, sem dependência de CDN.

## Rodar localmente

```bash
npm install
npm test          # 22 testes (motor físico e banco de exercícios)
npm run dev       # http://localhost:3000
```

Para o assistente funcionar localmente, crie `.env.local` com `ANTHROPIC_API_KEY=...`. Sem a chave, o resto do site funciona normalmente e o assistente mostra um aviso.

## Publicar na Vercel

1. Envie a pasta para um repositório no GitHub.
2. Em vercel.com, clique em **Add New → Project** e importe o repositório. Não é preciso configurar framework nem comando de build: o site é estático e `api/chat.js` vira uma função serverless.
3. Em **Settings → Environment Variables**, adicione `ANTHROPIC_API_KEY`.
4. Faça o deploy.

Se preferir a CLI: `npm i -g vercel`, depois `vercel` e `vercel --prod`.

> O endpoint `/api/chat` é público e cada pergunta consome créditos da API. Ele já limita o tamanho das mensagens e do histórico. Se o link for divulgado amplamente, vale definir um limite de gastos no console da Anthropic.

## Estrutura

```
index.html, teoria.html, exercicios.html   páginas
css/style.css                              tema escuro
js/physics.js                              motor físico (sem DOM, compartilhado com o servidor e os testes)
js/state.js                                estado central e relógio
js/sim-sketch.js, js/charts.js             desenho em p5.js
js/app.js, js/chat.js                      interface e assistente
js/teoria.js, js/exercicios.js             páginas de conteúdo
js/labs.js, js/checagem.js                 laboratórios e checagens da teoria
js/banco-exercicios.js                     gerador de exercícios com dicas e resolução
js/cosmos.js, js/newton.js                 céu e mascote portados do sketch original
js/tema.js                                 paletas dos temas escuro e claro
js/linha-tempo.js, js/roteiro.js, js/sala.js  linha do tempo, roteiro de aula e recursos de apresentação
vendor/                                    fontes Geist (OFL), p5.js e KaTeX locais
api/chat.js                                função serverless (Claude + ferramenta do motor)
tests/physics.test.js                      testes com casos conhecidos
scripts/dev.mjs                            servidor local
original/LancamentoVertical.pde            sketch original
```
