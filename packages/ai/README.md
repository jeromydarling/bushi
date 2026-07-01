# @bushi/ai

AI service layer over the Workers AI binding.

- `PROMPTS` registry + `renderTemplate` (`{{var}}` substitution) covering promo copy, recaps, school recap, social captions, sponsor thank-you, FAQ, organizer/coach assistants.
- `AiService`: `generateText`, `generateJSON<T>` (safe parse + fallback via `safeFallback`), `embed` (`@cf/baai/bge-base-en-v1.5`), `generateImage` (FLUX `@cf/black-forest-labs/flux-1-schnell`).
- `MODELS` + `selectTextModel(task)` for model-selection-by-task; results include `{ text, model, usage }`.

**Binding expected:** `AI` (Workers AI). Optional `AI_GATEWAY_BASE_URL` env var for AI Gateway routing. Wire via `interface AiEnv { AI; AI_GATEWAY_BASE_URL? }`.
