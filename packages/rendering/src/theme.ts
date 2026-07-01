/** Brand theme for rendered cards/posters. Overridable per organization. */
export interface RenderTheme {
  brandColor: string;
  accentColor: string;
  inkColor: string;
  bgColor: string;
  fontFamily: string;
  /** Optional logo URLs shown on rendered artifacts. */
  schoolLogoUrl?: string;
  sponsorLogoUrl?: string;
}

export const DEFAULT_THEME: RenderTheme = {
  brandColor: '#b91c1c',
  accentColor: '#f59e0b',
  inkColor: '#111827',
  bgColor: '#0b0b0c',
  fontFamily:
    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
};

/** Merge a partial override onto the default theme. */
export function resolveTheme(override?: Partial<RenderTheme>): RenderTheme {
  return { ...DEFAULT_THEME, ...(override ?? {}) };
}
