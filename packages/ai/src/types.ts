/** Workers AI binding shape (`env.AI`). */
export interface AiBinding {
  run(model: string, input: unknown): Promise<any>;
}

/**
 * Environment surface the AI service needs. `AI` is the Workers AI binding.
 * `AI_GATEWAY_BASE_URL` is optional — when present, callers may route through
 * an AI Gateway for caching/analytics (the binding itself is gateway-aware in
 * production; this is here for logging/telemetry shaping).
 */
export interface AiEnv {
  AI: AiBinding;
  AI_GATEWAY_BASE_URL?: string;
}

export interface AiUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface AiTextResult {
  text: string;
  model: string;
  usage: AiUsage;
}
