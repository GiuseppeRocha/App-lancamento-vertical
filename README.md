# Simulador de Lançamento Vertical

Aplicação web interativa desenvolvida para auxiliar no estudo e na compreensão dos conceitos físicos relacionados ao lançamento vertical.

O projeto foi originalmente desenvolvido em **Processing** (`original/LancamentoVertical.pde`) e posteriormente adaptado para a web utilizando **p5.js**, permitindo sua execução diretamente no navegador.

O simulador oferece recursos de visualização, gráficos, controles interativos, conteúdos teóricos e exercícios, proporcionando uma experiência prática de aprendizagem.

## Acesso ao simulador

**[Acessar o Simulador de Lançamento Vertical](https://giusepperocha.github.io/App-lancamento-vertical/)**

O aplicativo pode ser acessado diretamente pelo navegador, sem necessidade de instalação.

## Funcionalidades

### Simulação interativa

- Representação visual do lançamento vertical.
- Escala graduada em metros, com indicação da altura inicial e máxima.
- Visualização da trajetória, posição e movimento do objeto.
- Exibição dos vetores de velocidade e aceleração.
- Controles para iniciar, pausar, continuar e reiniciar a simulação.
- Ajuste da velocidade de reprodução (0,25×, 0,5×, 1× e 2×).

### Parâmetros físicos

Permite modificar os valores utilizados na simulação:

- Velocidade inicial (v₀).
- Altura inicial (y₀).
- Aceleração da gravidade (g).
- Massa, coeficiente de arrasto e área frontal, quando ativada a resistência do ar.

O motor físico utiliza soluções analíticas para o movimento ideal e métodos numéricos para simulações com resistência do ar.

### Gráficos e comparações

- Gráficos de posição, velocidade e aceleração em função do tempo.
- Identificação dos instantes de altura máxima e velocidade nula.
- Interação com os gráficos para visualizar diferentes instantes da simulação.
- Comparação de até três cenários simultaneamente.
- Configurações predefinidas para Terra, Lua e Marte.

### Conteúdo teórico

A página `teoria.html` apresenta os conceitos físicos envolvidos no lançamento vertical.

Inclui:

- Equações matemáticas e explicações.
- Laboratórios interativos.
- Exemplos resolvidos passo a passo.
- Atividades rápidas de verificação da aprendizagem.
- Resumos e observações sobre erros comuns.

### Exercícios interativos

A página `exercicios.html` disponibiliza atividades relacionadas ao conteúdo estudado.

- Identificação de grandezas físicas.
- Exercícios gerados automaticamente.
- Três níveis de dificuldade.
- Dicas progressivas.
- Acompanhamento de pontuação.
- Animações e respostas visuais do personagem Newton.

## Interface e elementos visuais

O simulador possui uma interface organizada em áreas de controle, visualização da simulação e análise gráfica.

Foram preservados e adaptados elementos do projeto original, como:

- Cenário espacial com estrelas, órbitas e efeitos visuais.
- Personagem responsável pelo lançamento do objeto.
- Animações da bola e dos efeitos de impacto.
- Personagem Newton, utilizado nas atividades e na interface.
- Paleta de cores e identidade visual do projeto.

O aplicativo também conta com recursos de personalização visual e diferentes modos de apresentação.

## Tecnologias utilizadas

- **HTML5:** estrutura das páginas.
- **CSS3:** estilização e organização da interface.
- **JavaScript:** lógica, interatividade e cálculos.
- **p5.js:** animações e representação visual da simulação.
- **KaTeX:** renderização das equações matemáticas.
- **Node.js:** ambiente utilizado no desenvolvimento e nos testes.

As bibliotecas e fontes utilizadas na interface estão organizadas localmente na pasta `vendor/`.

## Estrutura do projeto

| Arquivo ou pasta | Finalidade |
|---|---|
| `index.html` | Página principal do simulador |
| `teoria.html` | Conteúdo teórico |
| `exercicios.html` | Atividades interativas |
| `css/` | Estilos e aparência |
| `js/` | Lógica, cálculos, gráficos e animações |
| `vendor/` | Bibliotecas e fontes |
| `original/` | Projeto original em Processing |
| `tests/` | Testes automatizados |
| `scripts/` | Ferramentas de desenvolvimento |
| `api/` | Integração opcional com assistente de IA |

## Execução local

Para executar o projeto no ambiente de desenvolvimento, é necessário possuir Node.js instalado.
No terminal, dentro da pasta do projeto, utilize os comandos:
`npm install`
`npm run dev`
O aplicativo poderá ser acessado pelo endereço:
`http://localhost:3000`
Para executar os testes automatizados:
`npm test`
O projeto contém 22 testes automatizados relacionados ao motor físico e ao banco de exercícios.


## Observações
O simulador está disponível para hospedagem estática pelo GitHub Pages.
O código também inclui uma integração opcional com um assistente de inteligência artificial, que depende de um serviço de backend e de uma chave de API. Essa funcionalidade não é executada diretamente pelo GitHub Pages.
As demais funcionalidades do simulador podem ser utilizadas independentemente dessa integração.
