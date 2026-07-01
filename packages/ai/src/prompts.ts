import { MODELS } from './models.js';

/** A single reusable prompt template. */
export interface PromptTemplate {
  key: string;
  /** System instruction that frames the assistant's role. */
  system: string;
  /** User message template with `{{var}}` placeholders. */
  user: string;
  /** Default model to run this prompt with. */
  model: string;
  /** When true, callers should request JSON and parse the result. */
  json?: boolean;
}

export type PromptKey =
  | 'tournamentPromo'
  | 'tournamentRecap'
  | 'schoolRecap'
  | 'socialCaption'
  | 'sponsorThankYou'
  | 'faqGeneration'
  | 'organizerAssistant'
  | 'coachAssistant';

const BRAND_VOICE =
  'You write for Bushi (武士), a modern martial-arts tournament platform. ' +
  'Tone: energetic, respectful of tradition, inclusive, concise. Avoid hype clichés.';

export const PROMPTS: Record<PromptKey, PromptTemplate> = {
  tournamentPromo: {
    key: 'tournamentPromo',
    system: `${BRAND_VOICE} Produce promotional copy that drives registrations.`,
    user:
      'Write promotional copy for "{{name}}", a {{style}} tournament in {{location}} on {{date}}. ' +
      'Audience: {{audience}}. Keep it under 120 words with a clear call to action.',
    model: MODELS.textFast,
  },
  tournamentRecap: {
    key: 'tournamentRecap',
    system: `${BRAND_VOICE} Produce a warm, factual event recap.`,
    user:
      'Write a recap of "{{name}}" ({{style}}) held on {{date}} in {{location}}. ' +
      'Competitors: {{competitorCount}}. Highlights: {{highlights}}. Champions: {{champions}}.',
    model: MODELS.textQuality,
  },
  schoolRecap: {
    key: 'schoolRecap',
    system: `${BRAND_VOICE} Produce a recap tailored to a specific school's athletes.`,
    user:
      'Write a recap for {{schoolName}} from the event "{{name}}". ' +
      'Their results: {{results}}. Celebrate effort and name standout athletes: {{standouts}}.',
    model: MODELS.textQuality,
  },
  socialCaption: {
    key: 'socialCaption',
    system: `${BRAND_VOICE} Produce a short, punchy social caption with 2-4 hashtags.`,
    user:
      'Write a social caption for {{platform}} about {{subject}}. Context: {{context}}. ' +
      'Under 220 characters. Include relevant hashtags.',
    model: MODELS.textFast,
  },
  sponsorThankYou: {
    key: 'sponsorThankYou',
    system: `${BRAND_VOICE} Produce a sincere sponsor thank-you.`,
    user:
      'Write a thank-you addressed to {{sponsorName}} for supporting "{{name}}". ' +
      'Mention their contribution: {{contribution}}. Keep it under 90 words.',
    model: MODELS.textFast,
  },
  faqGeneration: {
    key: 'faqGeneration',
    system: `${BRAND_VOICE} Produce clear FAQ entries as JSON.`,
    user:
      'Generate an FAQ for "{{name}}" ({{style}}) in {{location}} on {{date}}. ' +
      'Cover registration, rules, weigh-ins, spectators, and refunds. ' +
      'Return a JSON array of objects with "question" and "answer" fields only.',
    model: MODELS.textQuality,
    json: true,
  },
  organizerAssistant: {
    key: 'organizerAssistant',
    system:
      `${BRAND_VOICE} You are an operations copilot for tournament organizers. ` +
      'Be practical and specific; reference the provided event context.',
    user: 'Event context: {{context}}.\n\nOrganizer question: {{question}}',
    model: MODELS.textQuality,
  },
  coachAssistant: {
    key: 'coachAssistant',
    system:
      `${BRAND_VOICE} You are a coaching copilot. Help coaches prepare athletes, ` +
      'read brackets, and plan the day. Be encouraging and concrete.',
    user: 'Team context: {{context}}.\n\nCoach question: {{question}}',
    model: MODELS.textFast,
  },
};

/** Substitute `{{var}}` placeholders in `template` from `vars`. */
export function renderTemplate(
  template: string,
  vars: Record<string, string | number>,
): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, name: string) => {
    const value = vars[name];
    return value === undefined ? '' : String(value);
  });
}
