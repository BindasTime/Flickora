#!/usr/bin/env node
/**
 * Freebuff Developer API — server-side helper (OpenAI-compatible Chat Completions).
 *
 * Node only. Never import this from src/: the API key must not reach the
 * browser bundle or the Capacitor WebView.
 *
 *   FREEBUFF_BASE_URL=https://freebuff.com/api/v1/paid
 *   FREEBUFF_API_KEY=fb_live_...
 *
 * Usage:
 *   node scripts/freebuff-chat.mjs                 # short test message
 *   node scripts/freebuff-chat.mjs "Your prompt"   # custom prompt
 */
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import OpenAI from 'openai';

export const DEFAULT_BASE_URL = 'https://freebuff.com/api/v1/paid';
export const DEFAULT_MODEL = 'claude-opus-5-5';

/** Load .env (if present) without overriding variables already in the environment. */
export function loadEnv(file = '.env') {
  if (existsSync(file)) process.loadEnvFile(file);
}

/**
 * Build a client pointed at Freebuff, using FREEBUFF_BASE_URL / FREEBUFF_API_KEY.
 * OPENAI_API_KEY is deliberately not used.
 */
export function createFreebuffClient(env = process.env) {
  loadEnv();
  const apiKey = (env.FREEBUFF_API_KEY ?? '').trim();
  if (!apiKey) {
    throw new Error(
      'FREEBUFF_API_KEY is not set. Add it to .env (server-side only) — never ship it to the client.',
    );
  }
  if (!apiKey.startsWith('fb_live_')) {
    console.warn('Warning: FREEBUFF_API_KEY does not start with "fb_live_".');
  }
  const baseURL = (env.FREEBUFF_BASE_URL ?? '').trim() || DEFAULT_BASE_URL;
  return new OpenAI({ apiKey, baseURL });
}

// Only Chat Completions fields are accepted; anything else is rejected with a 400.
const SUPPORTED_OPTIONS = new Set([
  'temperature',
  'top_p',
  'max_tokens',
  'max_completion_tokens',
  'stop',
  'frequency_penalty',
  'presence_penalty',
  'seed',
  'stream',
]);

function describeError(error) {
  const status = error?.status;
  const hints = {
    400: 'Bad request — unknown field or unsupported input (text chat completions only; no images, audio, embeddings or Responses API).',
    401: 'Unauthorized — the API key is invalid or revoked.',
    402: 'Payment required — the Freebuff account is out of credits.',
    429: `Rate limited — wait for Retry-After (${error?.headers?.['retry-after'] ?? 'header not sent'}) before retrying.`,
  };
  const hint = hints[status];
  if (!hint) return error;
  const wrapped = new Error(`Freebuff API ${status}: ${hint}`);
  wrapped.status = status;
  wrapped.cause = error;
  return wrapped;
}

/**
 * Send a Chat Completions request.
 * messages: OpenAI-style array of system / user / assistant / tool messages (text only).
 */
export async function chatCompletion({ messages, model = DEFAULT_MODEL, ...options } = {}) {
  const unsupported = Object.keys(options).filter((key) => !SUPPORTED_OPTIONS.has(key));
  if (unsupported.length > 0) {
    throw new Error(`Unsupported Chat Completions option(s): ${unsupported.join(', ')}`);
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('messages must be a non-empty array of chat messages.');
  }

  const client = createFreebuffClient();
  try {
    return await client.chat.completions.create({ model, messages, ...options });
  } catch (error) {
    throw describeError(error);
  }
}

async function main() {
  const prompt = process.argv.slice(2).join(' ').trim() || 'Say hello in one short sentence.';

  const completion = await chatCompletion({
    messages: [
      { role: 'system', content: 'You are a concise assistant. Answer in one short sentence.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.2,
    max_tokens: 100,
  });

  console.log('model:', completion.model);
  console.log('reply:', completion.choices?.[0]?.message?.content?.trim() ?? '(empty)');
  if (completion.usage) {
    console.log('usage:', JSON.stringify(completion.usage));
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error('Error:', error.message);
    process.exitCode = 1;
  });
}
