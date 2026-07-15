// Minimal ambient declaration for the Workers `cloudflare:email` module used by
// the native Email Sending binding. @cloudflare/workers-types doesn't ship it.
declare module 'cloudflare:email' {
  export class EmailMessage {
    constructor(from: string, to: string, raw: string | ReadableStream);
    readonly from: string;
    readonly to: string;
  }
}
