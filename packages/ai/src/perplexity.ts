/**
 * Perplexity client — web-grounded search used to discover real martial-arts
 * tournaments. OpenAI-compatible Chat Completions API with structured JSON
 * output and citations. Routes through Cloudflare AI Gateway when configured
 * (caching / analytics / rate limiting), else calls Perplexity directly.
 *
 * No key configured → callers should skip; this client throws `NotConfigured`
 * so the Worker can degrade gracefully.
 */

export class PerplexityNotConfigured extends Error {
  constructor() {
    super('PERPLEXITY_API_KEY is not set');
    this.name = 'PerplexityNotConfigured';
  }
}

export interface PerplexityConfig {
  apiKey?: string;
  /** e.g. "sonar" (default) or "sonar-pro". */
  model?: string;
  /**
   * Full AI Gateway base for the perplexity provider, e.g.
   * https://gateway.ai.cloudflare.com/v1/<account>/<gateway>/perplexity
   * When omitted, calls https://api.perplexity.ai directly.
   */
  gatewayBaseUrl?: string;
}

export interface PerplexityResult<T> {
  data: T;
  citations: string[];
  model: string;
  raw: string;
}

/** A JSON schema Perplexity should conform its answer to (structured outputs). */
export interface JsonSchemaSpec {
  name: string;
  schema: Record<string, unknown>;
}

export class PerplexityClient {
  private readonly model: string;

  constructor(private readonly config: PerplexityConfig) {
    this.model = config.model ?? 'sonar';
  }

  get configured(): boolean {
    return Boolean(this.config.apiKey);
  }

  private endpoint(): string {
    const base = this.config.gatewayBaseUrl?.replace(/\/$/, '') ?? 'https://api.perplexity.ai';
    return `${base}/chat/completions`;
  }

  /**
   * Ask Perplexity a question and parse its reply as JSON matching `schema`.
   * Returns the parsed object plus source citations.
   */
  async searchJSON<T = unknown>(
    system: string,
    user: string,
    schema: JsonSchemaSpec,
  ): Promise<PerplexityResult<T>> {
    if (!this.config.apiKey) throw new PerplexityNotConfigured();

    const res = await fetch(this.endpoint(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0.1,
        response_format: {
          type: 'json_schema',
          json_schema: { name: schema.name, schema: schema.schema },
        },
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`Perplexity request failed (${res.status}): ${detail.slice(0, 300)}`);
    }

    const body = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      citations?: string[];
    };
    const content = body.choices?.[0]?.message?.content ?? '{}';
    let data: T;
    try {
      data = JSON.parse(content) as T;
    } catch {
      // Some models wrap JSON in prose/code fences — extract the first {...} block.
      const match = content.match(/\{[\s\S]*\}/);
      data = JSON.parse(match?.[0] ?? '{}') as T;
    }
    return { data, citations: body.citations ?? [], model: this.model, raw: content };
  }
}
