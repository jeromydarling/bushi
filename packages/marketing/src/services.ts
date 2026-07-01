/**
 * Interface-typed dependencies workflows call into. Concrete implementations
 * (backed by @bushi/ai and @bushi/notifications) are injected by the Worker so
 * this package stays dependency-light and unit-testable.
 */

export interface AiCopyService {
  generateText(
    promptKey: string,
    vars: Record<string, string | number>,
  ): Promise<{ text: string }>;
}

export interface NotifyService {
  broadcastEmail(input: {
    audience: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<{ sent: number }>;
  sendEmail(input: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<{ id: string }>;
}

export interface WorkflowServices {
  ai: AiCopyService;
  notify: NotifyService;
  logger?: import('./workflow-types.js').WorkflowLogger;
}
