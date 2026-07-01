/**
 * Minimal, standalone re-declaration of the Cloudflare Workflows surface so
 * this package compiles without importing `cloudflare:workers`. At runtime the
 * real `WorkflowEntrypoint` provides compatible `event`/`step` objects.
 */

export interface RetryConfig {
  limit: number;
  delay: string | number;
  backoff?: 'constant' | 'linear' | 'exponential';
}

export interface StepConfig {
  retries?: RetryConfig;
  timeout?: string | number;
}

export interface WorkflowStep {
  do<T>(name: string, callback: () => Promise<T>): Promise<T>;
  do<T>(name: string, config: StepConfig, callback: () => Promise<T>): Promise<T>;
  sleep(name: string, duration: string | number): Promise<void>;
}

export interface WorkflowEvent<P = unknown> {
  payload: P;
  timestamp: Date;
  instanceId: string;
}

/** A logging hook workflows call around each step (for admin observability). */
export interface WorkflowLogger {
  log(event: {
    workflow: string;
    step: string;
    instanceId: string;
    phase: 'start' | 'end' | 'error';
    detail?: unknown;
  }): void;
}

export const noopLogger: WorkflowLogger = { log: () => {} };

/** Static, inspectable description of a single workflow step. */
export interface StepPlan {
  name: string;
  description: string;
  retries: RetryConfig;
  /** Which injected service(s) the step calls. */
  uses: Array<'ai' | 'notifications' | 'db' | 'none'>;
}

/** Static description of a whole workflow, exportable to an admin view. */
export interface WorkflowPlan {
  key: string;
  title: string;
  description: string;
  steps: StepPlan[];
}

export const DEFAULT_RETRIES: RetryConfig = {
  limit: 3,
  delay: '10 seconds',
  backoff: 'exponential',
};
