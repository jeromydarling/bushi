# @bushi/rendering

Browser Rendering templates for cards, posters, OG images, certificates and PDFs.

- Themeable HTML template functions (`RenderTheme` with brand colors + school/sponsor logo URLs): `resultCardHtml`, `leaderboardCardHtml`, `posterHtml`, `ogImageHtml`, `certificateHtml`.
- `RenderingService`: `renderToImage(html, {width,height})` and `renderToPdf(html)` returning `Uint8Array`, plus `storeInR2(bucket, key, bytes)`.

**Bindings expected:** `BROWSER` (Browser Rendering `Fetcher`) and an R2 bucket (e.g. `RENDER_BUCKET`) for `storeInR2`.
