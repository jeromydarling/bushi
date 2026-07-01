import { PROMPTS, renderTemplate, type PromptKey } from './prompts.js';
import { MODELS } from './models.js';
import type { AiEnv, AiTextResult, AiUsage } from './types.js';

/** Shape Workers AI usage metadata (best-effort; providers vary). */
function shapeUsage(raw: unknown): AiUsage {
  const u = (raw as { usage?: Record<string, unknown> } | null)?.usage;
  if (!u || typeof u !== 'object') return {};
  const num = (v: unknown): number | undefined =>
    typeof v === 'number' ? v : undefined;
  return {
    promptTokens: num(u['prompt_tokens']),
    completionTokens: num(u['completion_tokens']),
    totalTokens: num(u['total_tokens']),
  };
}

function extractText(raw: unknown): string {
  if (typeof raw === 'string') return raw;
  const r = raw as { response?: unknown; result?: { response?: unknown } };
  if (typeof r?.response === 'string') return r.response;
  if (typeof r?.result?.response === 'string') return r.result.response;
  return '';
}

/**
 * AI service layer over the Workers AI binding. All model calls go through the
 * injected `AiEnv.AI` binding, so this compiles and unit-tests without network.
 */
export class AiService {
  /** Generate free-form text from a registered prompt. */
  async generateText(
    promptKey: PromptKey,
    vars: Record<string, string | number>,
    env: AiEnv,
  ): Promise<AiTextResult> {
    const prompt = PROMPTS[promptKey];
    const messages = [
      { role: 'system', content: prompt.system },
      { role: 'user', content: renderTemplate(prompt.user, vars) },
    ];
    const raw = await env.AI.run(prompt.model, { messages });
    return { text: extractText(raw).trim(), model: prompt.model, usage: shapeUsage(raw) };
  }

  /**
   * Generate and parse JSON from a registered prompt. On parse failure returns
   * the provided `fallback` and never throws.
   */
  async generateJSON<T>(
    promptKey: PromptKey,
    vars: Record<string, string | number>,
    env: AiEnv,
    fallback: T,
  ): Promise<T> {
    const { text } = await this.generateText(promptKey, vars, env);
    return safeFallback<T>(text, fallback);
  }

  /** Embed text into a vector using the BGE model. */
  async embed(text: string, env: AiEnv): Promise<number[]> {
    const raw = await env.AI.run(MODELS.embed, { text: [text] });
    const data = (raw as { data?: number[][] })?.data;
    const first = data?.[0];
    return Array.isArray(first) ? first : [];
  }

  /**
   * Generate an image with FLUX. Returns base64 PNG plus decoded bytes.
   * The FLUX schnell binding returns `{ image: <base64> }`.
   */
  async generateImage(
    prompt: string,
    env: AiEnv,
  ): Promise<{ base64: string; bytes: Uint8Array }> {
    const raw = await env.AI.run(MODELS.image, { prompt });
    const base64 = (raw as { image?: string })?.image ?? '';
    const binary = base64 ? atob(base64) : '';
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return { base64, bytes };
  }
}

/** Parse JSON from a possibly-fenced model response; fall back on failure. */
export function safeFallback<T>(text: string, fallback: T): T {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```$/, '')
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    return fallback;
  }
}
