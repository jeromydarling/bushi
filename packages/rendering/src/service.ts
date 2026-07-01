/**
 * Rendering service that drives the Cloudflare Browser Rendering REST binding
 * (`env.BROWSER`) to turn our HTML templates into PNG images or PDFs, with an
 * optional R2 helper to persist the bytes.
 *
 * The Browser Rendering binding exposes a `fetch`-compatible surface; we call
 * its `/content`-style endpoints with the HTML payload. Kept compile-only.
 */

/** Minimal Browser Rendering binding surface (fetch-compatible). */
export interface BrowserRenderingEnv {
  BROWSER: Fetcher;
}

export interface ImageOptions {
  width: number;
  height: number;
  /** 'png' | 'jpeg' — Browser Rendering screenshot format. */
  format?: 'png' | 'jpeg';
}

/** Minimal R2 bucket surface we depend on (subset of R2Bucket). */
export interface R2BucketLike {
  put(
    key: string,
    value: ArrayBuffer | ArrayBufferView | ReadableStream | string,
    options?: unknown,
  ): Promise<unknown>;
}

async function toUint8Array(res: Response): Promise<Uint8Array> {
  const buf = await res.arrayBuffer();
  return new Uint8Array(buf);
}

export class RenderingService {
  constructor(private readonly env: BrowserRenderingEnv) {}

  /** Render HTML to a raster image via Browser Rendering `/screenshot`. */
  async renderToImage(html: string, opts: ImageOptions): Promise<Uint8Array> {
    const res = await this.env.BROWSER.fetch('https://browser.render/screenshot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        html,
        screenshotOptions: { type: opts.format ?? 'png' },
        viewport: { width: opts.width, height: opts.height },
      }),
    });
    if (!res.ok) {
      throw new Error(`renderToImage failed (${res.status})`);
    }
    return toUint8Array(res);
  }

  /** Render HTML to a PDF via Browser Rendering `/pdf`. */
  async renderToPdf(html: string): Promise<Uint8Array> {
    const res = await this.env.BROWSER.fetch('https://browser.render/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html }),
    });
    if (!res.ok) {
      throw new Error(`renderToPdf failed (${res.status})`);
    }
    return toUint8Array(res);
  }

  /**
   * Store rendered bytes in R2 and return the object key.
   * `bucket` is any R2 bucket binding (e.g. `env.RENDER_BUCKET`).
   */
  async storeInR2(
    bucket: R2BucketLike,
    key: string,
    bytes: Uint8Array,
  ): Promise<string> {
    // Copy into a standalone ArrayBuffer so we never hand R2 a view over a
    // larger/shared buffer.
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    await bucket.put(key, copy.buffer, {
      httpMetadata: { contentType: 'application/octet-stream' },
    });
    return key;
  }
}
