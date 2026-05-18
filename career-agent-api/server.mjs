import http from 'node:http';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import OpenAI from 'openai';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 8787;
// Override with OPENAI_MODEL=gpt-5.3 (or another id) when your key has access.
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

function textFromAssistantMessage(msg) {
  if (!msg || typeof msg !== 'object') return '';
  const c = msg.content;
  if (c == null) return '';
  if (typeof c === 'string') return c;
  if (Array.isArray(c)) {
    return c
      .map(part => {
        if (typeof part === 'string') return part;
        if (part && typeof part === 'object' && 'text' in part && typeof part.text === 'string')
          return part.text;
        return '';
      })
      .join('');
  }
  return '';
}

function loadSystemPrompt() {
  const fromEnv = process.env.CAREER_AGENT_SYSTEM_PROMPT;
  if (fromEnv && String(fromEnv).trim()) return String(fromEnv).trim();
  try {
    const file = readFileSync(join(__dirname, 'system-prompt.txt'), 'utf8').trim();
    if (file) return file;
  } catch {
    /* optional file */
  }
  console.error('Set CAREER_AGENT_SYSTEM_PROMPT or edit system-prompt.txt');
  process.exit(1);
}

const SYSTEM_PROMPT = loadSystemPrompt();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    // Chrome: page on localhost calling 127.0.0.1 (or vice versa) may require this on the preflight.
    'Access-Control-Allow-Private-Network': 'true',
  };
}

function json(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    ...corsHeaders(),
  });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw.trim()) return {};
  return JSON.parse(raw);
}

function normalizeMessages(messages) {
  if (!Array.isArray(messages)) return null;
  const out = [];
  for (const m of messages) {
    if (!m || typeof m !== 'object') return null;
    const { role, content } = m;
    if (typeof content !== 'string') return null;
    if (role !== 'user' && role !== 'assistant') continue;
    out.push({ role, content });
  }
  return out.length ? out : null;
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders());
    res.end();
    return;
  }

  const pathname = new URL(req.url || '/', 'http://127.0.0.1').pathname;
  if (req.method !== 'POST' || pathname !== '/') {
    json(res, req.method === 'POST' ? 404 : 405, { error: 'Use POST /' });
    return;
  }

  let body;
  try {
    body = await readJson(req);
  } catch {
    json(res, 400, { error: 'Invalid JSON body' });
    return;
  }

  const chatMessages = normalizeMessages(body.messages);
  if (!chatMessages) {
    json(res, 400, { error: 'Expected messages: { role, content }[] with user/assistant turns' });
    return;
  }

  const context = typeof body.context === 'string' ? body.context : '';
  const systemContent =
    context.trim().length > 0
      ? `${SYSTEM_PROMPT}\n\n---\n\nContext:\n\n${context}`
      : SYSTEM_PROMPT;

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'system', content: systemContent }, ...chatMessages],
    });

    const reply = textFromAssistantMessage(completion.choices[0]?.message);
    if (!reply.trim()) {
      console.error('[career-agent-api] empty assistant message', JSON.stringify(completion.choices[0]).slice(0, 500));
      json(res, 502, { error: 'Empty model response' });
      return;
    }

    json(res, 200, { reply: reply.trim() });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'OpenAI request failed';
    console.error('[career-agent-api] OpenAI error:', msg, e);
    json(res, 502, { error: msg });
  }
});

server.listen(PORT, () => {
  console.log(`Career agent API → http://127.0.0.1:${PORT}/ (POST { messages, context })`);
});
