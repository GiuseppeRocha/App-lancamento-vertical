// Função serverless (Vercel) do assistente de física.
// O modelo nunca calcula valores físicos sozinho: recebe o contexto real da simulação
// e chama a ferramenta `calcular_lancamento`, que executa o mesmo motor do navegador.

import Anthropic from '@anthropic-ai/sdk';
import { calcularTrajetoria, resumo, normalizarParametros, LIMITES } from '../js/physics.js';

const MODELO = 'claude-opus-5-5';
const MAX_MENSAGENS = 20;
const MAX_CARACTERES = 4000;
const MAX_ITERACOES = 8;

const SISTEMA = `Você é o assistente de física de um simulador educacional de lançamento vertical, usado por estudantes universitários no Brasil. Responda sempre em português do Brasil, com clareza e rigor, como um bom monitor de Física I.

Convenções do simulador (use sempre as mesmas):
- Eixo vertical positivo para cima; solo em y = 0.
- g é informada em módulo (g ≥ 0). No modelo ideal: y(t) = y₀ + v₀t − gt²/2, v(t) = v₀ − gt, a(t) = −g.
- Altura máxima Hmáx = y₀ + v₀²/(2g) quando v₀ > 0; tempo de subida t = v₀/g; tempo total é a raiz positiva de y(t) = 0.
- Com resistência do ar: arrasto quadrático F = −½ρCdAv|v|, ρ = 1,225 kg/m³, a = −g − (k/m)v|v| com k = ½ρCdA, integrado numericamente (RK4).

Regra mais importante — nunca invente nem calcule de cabeça valores físicos:
- Todo número que você citar deve vir do bloco <contexto_simulacao> da mensagem do usuário ou de uma chamada da ferramenta calcular_lancamento.
- Para qualquer valor que não esteja no contexto (outro instante, outros parâmetros, exercícios novos, comparações hipotéticas), chame calcular_lancamento antes de responder.
- Em resoluções passo a passo, mostre a substituição dos valores nas equações, mas o resultado numérico final de cada etapa deve ser o retornado pela ferramenta ou pelo contexto.
- Ao gerar exercícios novos: escolha parâmetros dentro dos limites do simulador, chame a ferramenta para obter as respostas e apresente o enunciado, os dados e a resposta verificável (com duas casas decimais), separando a resposta sob o título "Resposta".
- Se o contexto indicar que o modelo com resistência do ar está ativo, deixe claro que as fórmulas fechadas do modelo ideal não se aplicam exatamente.

Formato:
- Use Markdown simples (parágrafos, listas, **negrito**) e LaTeX entre $...$ (inline) ou $$...$$ (destacado) para equações.
- Use vírgula como separador decimal no texto.
- Seja direto: explicações conceituais em poucos parágrafos; resoluções em etapas numeradas.
- Se a pergunta não tiver relação com física ou com o simulador, diga educadamente que só pode ajudar com o conteúdo do simulador.`;

const FERRAMENTAS = [
  {
    name: 'calcular_lancamento',
    description:
      'Executa o motor físico do simulador para um lançamento vertical e retorna altura máxima, tempo de subida, ' +
      'tempo total, velocidade de impacto e o estado (altura, velocidade, aceleração) em instantes pedidos. ' +
      'Use sempre que precisar de um valor numérico que não esteja no contexto da simulação.',
    input_schema: {
      type: 'object',
      properties: {
        v0: { type: 'number', description: `Velocidade inicial em m/s, positiva para cima (${LIMITES.v0.min} a ${LIMITES.v0.max}).` },
        y0: { type: 'number', description: `Altura inicial em m (${LIMITES.y0.min} a ${LIMITES.y0.max}).` },
        g: { type: 'number', description: `Módulo da gravidade em m/s² (${LIMITES.g.min} a ${LIMITES.g.max}). Terra 9,81; Lua 1,62; Marte 3,71.` },
        tempos: {
          type: 'array',
          items: { type: 'number' },
          description: 'Instantes, em segundos, nos quais calcular o estado do objeto (máximo de 20).',
        },
        resistencia_ar: {
          type: 'object',
          description: 'Inclua apenas para usar o modelo com arrasto quadrático.',
          properties: {
            massa: { type: 'number', description: 'Massa em kg.' },
            cd: { type: 'number', description: 'Coeficiente de arrasto (adimensional).' },
            area: { type: 'number', description: 'Área frontal em m².' },
          },
          required: ['massa', 'cd', 'area'],
        },
      },
      required: ['v0', 'y0', 'g'],
    },
  },
];

function executarFerramenta(nome, entrada) {
  if (nome !== 'calcular_lancamento') return { erro: `Ferramenta desconhecida: ${nome}` };
  if (typeof entrada !== 'object' || entrada === null) return { erro: 'Entrada inválida.' };
  const bruto = {
    v0: entrada.v0, y0: entrada.y0, g: entrada.g,
    arrasto: Boolean(entrada.resistencia_ar),
    massa: entrada.resistencia_ar?.massa, cd: entrada.resistencia_ar?.cd, area: entrada.resistencia_ar?.area,
  };
  for (const k of ['v0', 'y0', 'g']) {
    if (typeof bruto[k] !== 'number' || !Number.isFinite(bruto[k])) return { erro: `Parâmetro ${k} ausente ou inválido.` };
  }
  const params = normalizarParametros(bruto);
  const ajustes = ['v0', 'y0', 'g', ...(bruto.arrasto ? ['massa', 'cd', 'area'] : [])]
    .filter((k) => typeof bruto[k] === 'number' && bruto[k] !== params[k])
    .map((k) => `${k} ajustado de ${bruto[k]} para ${params[k]} (limite do simulador)`);
  const tempos = (Array.isArray(entrada.tempos) ? entrada.tempos : [])
    .filter((t) => typeof t === 'number' && Number.isFinite(t) && t >= 0)
    .slice(0, 20);
  const r = resumo(calcularTrajetoria(params), tempos);
  return ajustes.length ? { ...r, observacoes: ajustes } : r;
}

function validarMensagens(lista) {
  if (!Array.isArray(lista)) return null;
  const msgs = lista
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-MAX_MENSAGENS)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CARACTERES) }));
  while (msgs.length && msgs[0].role !== 'user') msgs.shift();
  if (!msgs.length || msgs[msgs.length - 1].role !== 'user') return null;
  return msgs;
}

async function lerCorpo(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body);
  let texto = '';
  for await (const parte of req) {
    texto += parte;
    if (texto.length > 200_000) throw new Error('Corpo muito grande.');
  }
  return JSON.parse(texto || '{}');
}

function responder(res, status, dados) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(dados));
}

export async function conversar(mensagens, contexto, client = new Anthropic()) {
  // O contexto (volátil) entra apenas na última mensagem; o prompt de sistema fica estável para o cache.
  const ultima = mensagens[mensagens.length - 1];
  const conversa = [
    ...mensagens.slice(0, -1),
    {
      role: 'user',
      content: `<contexto_simulacao>\n${JSON.stringify(contexto ?? {}, null, 1)}\n</contexto_simulacao>\n\n${ultima.content}`,
    },
  ];

  for (let i = 0; i < MAX_ITERACOES; i++) {
    const resposta = await client.beta.messages.create({
      model: MODELO,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium' },
      system: [{ type: 'text', text: SISTEMA, cache_control: { type: 'ephemeral' } }],
      tools: FERRAMENTAS,
      messages: conversa,
    });

    if (resposta.stop_reason === 'refusal') {
      return 'Não posso ajudar com esse pedido. Tente reformular a pergunta sobre o lançamento vertical.';
    }

    const usos = resposta.content.filter((b) => b.type === 'tool_use');
    if (resposta.stop_reason !== 'tool_use' || usos.length === 0) {
      const texto = resposta.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n\n').trim();
      return texto || 'Não consegui gerar uma resposta. Tente novamente.';
    }

    conversa.push({ role: 'assistant', content: resposta.content });
    conversa.push({
      role: 'user',
      content: usos.map((u) => {
        const resultado = executarFerramenta(u.name, u.input);
        return {
          type: 'tool_result',
          tool_use_id: u.id,
          content: JSON.stringify(resultado),
          ...(resultado.erro ? { is_error: true } : {}),
        };
      }),
    });
  }
  return 'A resposta exigiu cálculos demais. Tente uma pergunta mais específica.';
}

export default async function handler(req, res) {
  // GET: só informa se o assistente está configurado (sem chamar a API nem expor a chave).
  if (req.method === 'GET') {
    return responder(res, 200, { disponivel: Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN) });
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return responder(res, 405, { erro: 'Use POST.' });
  }

  let corpo;
  try { corpo = await lerCorpo(req); } catch { return responder(res, 400, { erro: 'JSON inválido.' }); }

  const mensagens = validarMensagens(corpo.mensagens);
  if (!mensagens) return responder(res, 400, { erro: 'Mensagens inválidas.' });
  if (JSON.stringify(corpo.contexto ?? {}).length > 30_000) return responder(res, 400, { erro: 'Contexto muito grande.' });

  try {
    const resposta = await conversar(mensagens, corpo.contexto);
    return responder(res, 200, { resposta });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return responder(res, 503, { erro: 'Assistente indisponível: a chave ANTHROPIC_API_KEY não está configurada corretamente no servidor.' });
    }
    if (err instanceof Anthropic.RateLimitError) {
      return responder(res, 429, { erro: 'Muitas solicitações no momento. Aguarde alguns segundos e tente novamente.' });
    }
    if (err instanceof Anthropic.APIError) {
      console.error('Erro da API:', err.status, err.message);
      return responder(res, 502, { erro: 'O serviço de IA retornou um erro. Tente novamente em instantes.' });
    }
    console.error(err);
    const semChave = /api key|apiKey|authentication/i.test(String(err?.message));
    return responder(res, semChave ? 503 : 500, {
      erro: semChave
        ? 'Assistente indisponível: configure a variável de ambiente ANTHROPIC_API_KEY.'
        : 'Erro interno ao gerar a resposta.',
    });
  }
}
