/** Canonical Workers AI model ids used across Bushi. */
export const MODELS = {
  /** Fast general text generation. */
  textFast: '@cf/meta/llama-3.1-8b-instruct',
  /** Higher-quality text for long-form / structured output. */
  textQuality: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  /** Sentence embeddings (768-dim). */
  embed: '@cf/baai/bge-base-en-v1.5',
  /** Text-to-image. */
  image: '@cf/black-forest-labs/flux-1-schnell',
} as const;

export type ModelId = (typeof MODELS)[keyof typeof MODELS];

/** Coarse task taxonomy used to pick a default text model. */
export type AiTask = 'draft' | 'longform' | 'structured' | 'assistant';

/** Select a text model by task. Long-form / structured favor quality. */
export function selectTextModel(task: AiTask): string {
  switch (task) {
    case 'longform':
    case 'structured':
      return MODELS.textQuality;
    case 'draft':
    case 'assistant':
    default:
      return MODELS.textFast;
  }
}
