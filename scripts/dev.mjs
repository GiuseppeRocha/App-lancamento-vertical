// Servidor local que imita a Vercel: arquivos estáticos + /api/chat.
// Uso: npm run dev  (lê ANTHROPIC_API_KEY de .env.local, se existir)
import http from 'node:http';
import fs from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const arq of ['.env.local', '.env']) {
  const p = path.join(raiz, arq);
  if (!existsSync(p)) continue;
  for (const linha of readFileSync(p, 'utf8').split('\n')) {
    const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && m[2] && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const { default: chat } = await import('../api/chat.js');
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf' };
const BLOQUEADOS = ['/node_modules', '/.env', '/api', '/scripts', '/tests', '/.git'];
const porta = Number(process.env.PORT) || 3000;

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api/chat') return chat(req, res);
  let rota = decodeURIComponent(url.pathname);
  if (BLOQUEADOS.some((b) => rota.startsWith(b))) { res.statusCode = 404; return res.end('Não encontrado'); }
  if (rota.endsWith('/')) rota += 'index.html';
  let arquivo = path.join(raiz, rota);
  if (!arquivo.startsWith(raiz)) { res.statusCode = 403; return res.end(); }
  if (!path.extname(arquivo) && existsSync(arquivo + '.html')) arquivo += '.html'; // cleanUrls
  try {
    const dados = await fs.readFile(arquivo);
    res.setHeader('Content-Type', TIPOS[path.extname(arquivo)] || 'application/octet-stream');
    res.end(dados);
  } catch {
    res.statusCode = 404; res.end('Não encontrado');
  }
}).listen(porta, () => console.log(`Simulador em http://localhost:${porta}`));
