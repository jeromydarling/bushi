import { resolveTheme, type RenderTheme } from './theme.js';

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function logos(theme: RenderTheme): string {
  const parts: string[] = [];
  if (theme.schoolLogoUrl) {
    parts.push(
      `<img src="${esc(theme.schoolLogoUrl)}" alt="school" style="height:48px;object-fit:contain;" />`,
    );
  }
  if (theme.sponsorLogoUrl) {
    parts.push(
      `<img src="${esc(theme.sponsorLogoUrl)}" alt="sponsor" style="height:40px;object-fit:contain;opacity:0.9;" />`,
    );
  }
  if (parts.length === 0) return '';
  return `<div style="display:flex;gap:20px;align-items:center;">${parts.join('')}</div>`;
}

function shell(theme: RenderTheme, width: number, height: number, inner: string): string {
  return `<!doctype html><html><head><meta charset="utf-8" />
<style>
*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:${width}px;height:${height}px;font-family:${theme.fontFamily};background:${theme.bgColor};color:#fff;}
.wrap{width:${width}px;height:${height}px;position:relative;overflow:hidden;}
.brandbar{position:absolute;top:0;left:0;right:0;height:8px;background:linear-gradient(90deg,${theme.brandColor},${theme.accentColor});}
</style></head><body><div class="wrap"><div class="brandbar"></div>${inner}</div></body></html>`;
}

export interface ResultCardData {
  tournamentName: string;
  division: string;
  winnerName: string;
  winnerSchool?: string;
  runnerUpName?: string;
  score?: string;
}

export function resultCardHtml(
  data: ResultCardData,
  themeOverride?: Partial<RenderTheme>,
): string {
  const theme = resolveTheme(themeOverride);
  const inner = `
<div style="padding:56px 48px;height:100%;display:flex;flex-direction:column;justify-content:space-between;">
  <div style="display:flex;justify-content:space-between;align-items:center;">
    <div style="font-size:20px;letter-spacing:2px;color:${theme.accentColor};text-transform:uppercase;">${esc(data.tournamentName)}</div>
    ${logos(theme)}
  </div>
  <div>
    <div style="font-size:18px;color:#cbd5e1;margin-bottom:8px;">${esc(data.division)}</div>
    <div style="font-size:64px;font-weight:800;line-height:1.05;">${esc(data.winnerName)}</div>
    ${data.winnerSchool ? `<div style="font-size:22px;color:#94a3b8;margin-top:8px;">${esc(data.winnerSchool)}</div>` : ''}
    ${data.score ? `<div style="font-size:22px;color:${theme.accentColor};margin-top:16px;">${esc(data.score)}</div>` : ''}
    ${data.runnerUpName ? `<div style="font-size:16px;color:#94a3b8;margin-top:12px;">Runner-up: ${esc(data.runnerUpName)}</div>` : ''}
  </div>
  <div style="font-size:16px;color:#64748b;">武士 Bushi</div>
</div>`;
  return shell(theme, 1200, 630, inner);
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  school?: string;
  points: number;
}

export function leaderboardCardHtml(
  title: string,
  entries: LeaderboardEntry[],
  themeOverride?: Partial<RenderTheme>,
): string {
  const theme = resolveTheme(themeOverride);
  const rows = entries
    .map(
      (e) => `<tr>
<td style="padding:10px 0;font-size:26px;font-weight:800;color:${theme.accentColor};width:64px;">${e.rank}</td>
<td style="padding:10px 0;font-size:24px;">${esc(e.name)}${e.school ? `<span style="color:#94a3b8;font-size:16px;"> · ${esc(e.school)}</span>` : ''}</td>
<td style="padding:10px 0;font-size:24px;text-align:right;font-weight:700;">${e.points}</td>
</tr>`,
    )
    .join('');
  const inner = `
<div style="padding:56px 48px;height:100%;display:flex;flex-direction:column;">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
    <div style="font-size:36px;font-weight:800;">${esc(title)}</div>
    ${logos(theme)}
  </div>
  <table style="width:100%;border-collapse:collapse;">${rows}</table>
  <div style="margin-top:auto;font-size:16px;color:#64748b;">武士 Bushi</div>
</div>`;
  return shell(theme, 1080, 1350, inner);
}

export interface PosterData {
  tournamentName: string;
  styleLabel: string;
  date: string;
  location: string;
  registerUrl?: string;
  tagline?: string;
}

export function posterHtml(
  data: PosterData,
  themeOverride?: Partial<RenderTheme>,
): string {
  const theme = resolveTheme(themeOverride);
  const inner = `
<div style="padding:80px 64px;height:100%;display:flex;flex-direction:column;justify-content:space-between;background:radial-gradient(circle at 30% 10%, rgba(185,28,28,0.35), transparent 60%);">
  <div style="display:flex;justify-content:space-between;align-items:center;">
    <div style="font-size:22px;letter-spacing:4px;text-transform:uppercase;color:${theme.accentColor};">${esc(data.styleLabel)}</div>
    ${logos(theme)}
  </div>
  <div>
    <div style="font-size:96px;font-weight:900;line-height:1;">${esc(data.tournamentName)}</div>
    ${data.tagline ? `<div style="font-size:30px;color:#cbd5e1;margin-top:20px;">${esc(data.tagline)}</div>` : ''}
  </div>
  <div>
    <div style="font-size:34px;font-weight:700;">${esc(data.date)}</div>
    <div style="font-size:26px;color:#94a3b8;margin-top:6px;">${esc(data.location)}</div>
    ${data.registerUrl ? `<div style="margin-top:28px;display:inline-block;background:${theme.brandColor};padding:16px 32px;border-radius:10px;font-size:24px;font-weight:700;">Register: ${esc(data.registerUrl)}</div>` : ''}
  </div>
</div>`;
  return shell(theme, 1080, 1920, inner);
}

export interface OgImageData {
  title: string;
  subtitle?: string;
}

export function ogImageHtml(
  data: OgImageData,
  themeOverride?: Partial<RenderTheme>,
): string {
  const theme = resolveTheme(themeOverride);
  const inner = `
<div style="padding:64px;height:100%;display:flex;flex-direction:column;justify-content:center;">
  <div style="font-size:24px;letter-spacing:3px;color:${theme.accentColor};text-transform:uppercase;margin-bottom:16px;">武士 Bushi</div>
  <div style="font-size:72px;font-weight:900;line-height:1.05;">${esc(data.title)}</div>
  ${data.subtitle ? `<div style="font-size:30px;color:#94a3b8;margin-top:20px;">${esc(data.subtitle)}</div>` : ''}
</div>`;
  return shell(theme, 1200, 630, inner);
}

export interface CertificateData {
  recipientName: string;
  achievement: string;
  tournamentName: string;
  date: string;
  signatoryName?: string;
  signatoryTitle?: string;
}

export function certificateHtml(
  data: CertificateData,
  themeOverride?: Partial<RenderTheme>,
): string {
  const theme = resolveTheme(themeOverride);
  const inner = `
<div style="padding:72px;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;background:${theme.bgColor};">
  <div style="border:3px solid ${theme.accentColor};border-radius:16px;padding:56px 72px;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;">
    ${logos(theme)}
    <div style="font-size:26px;letter-spacing:5px;text-transform:uppercase;color:${theme.accentColor};margin:24px 0;">Certificate of Achievement</div>
    <div style="font-size:20px;color:#cbd5e1;">This certifies that</div>
    <div style="font-size:60px;font-weight:900;margin:16px 0;">${esc(data.recipientName)}</div>
    <div style="font-size:24px;color:#cbd5e1;">achieved <strong>${esc(data.achievement)}</strong></div>
    <div style="font-size:22px;color:#94a3b8;margin-top:8px;">${esc(data.tournamentName)} · ${esc(data.date)}</div>
    ${
      data.signatoryName
        ? `<div style="margin-top:48px;font-size:18px;color:#cbd5e1;">${esc(data.signatoryName)}${data.signatoryTitle ? ` — ${esc(data.signatoryTitle)}` : ''}</div>`
        : ''
    }
  </div>
</div>`;
  return shell(theme, 1414, 1000, inner);
}
