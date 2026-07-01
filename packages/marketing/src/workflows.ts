import {
  DEFAULT_RETRIES,
  noopLogger,
  type StepPlan,
  type WorkflowEvent,
  type WorkflowLogger,
  type WorkflowPlan,
  type WorkflowStep,
} from './workflow-types.js';
import type { WorkflowServices } from './services.js';

/** Base class wiring injected services + a logger, with a step wrapper. */
abstract class BaseWorkflow<P> {
  abstract readonly plan: WorkflowPlan;

  constructor(protected readonly services: WorkflowServices) {}

  protected get logger(): WorkflowLogger {
    return this.services.logger ?? noopLogger;
  }

  /** Run a step with logging hooks around it. */
  protected async runStep<T>(
    step: WorkflowStep,
    plan: StepPlan,
    instanceId: string,
    body: () => Promise<T>,
  ): Promise<T> {
    this.logger.log({
      workflow: this.plan.key,
      step: plan.name,
      instanceId,
      phase: 'start',
    });
    try {
      const result = await step.do(plan.name, { retries: plan.retries }, body);
      this.logger.log({
        workflow: this.plan.key,
        step: plan.name,
        instanceId,
        phase: 'end',
      });
      return result;
    } catch (err) {
      this.logger.log({
        workflow: this.plan.key,
        step: plan.name,
        instanceId,
        phase: 'error',
        detail: err,
      });
      throw err;
    }
  }

  protected stepPlan(name: string): StepPlan {
    const found = this.plan.steps.find((s) => s.name === name);
    if (!found) throw new Error(`Unknown step: ${name}`);
    return found;
  }

  abstract run(event: WorkflowEvent<P>, step: WorkflowStep): Promise<unknown>;
}

// --- Pre-event promotion -----------------------------------------------------

export interface PreEventPromotionPayload {
  tournamentId: string;
  name: string;
  style: string;
  location: string;
  date: string;
  audience: string;
}

export class PreEventPromotionWorkflow extends BaseWorkflow<PreEventPromotionPayload> {
  readonly plan: WorkflowPlan = {
    key: 'pre_event_promotion',
    title: 'Pre-event promotion',
    description:
      'Generate promo copy, publish social captions, and send an announcement blast before an event.',
    steps: [
      { name: 'generate-promo', description: 'AI promo copy', retries: DEFAULT_RETRIES, uses: ['ai'] },
      { name: 'generate-caption', description: 'AI social caption', retries: DEFAULT_RETRIES, uses: ['ai'] },
      { name: 'send-announcement', description: 'Email the audience', retries: DEFAULT_RETRIES, uses: ['notifications'] },
    ],
  };

  async run(
    event: WorkflowEvent<PreEventPromotionPayload>,
    step: WorkflowStep,
  ): Promise<{ sent: number }> {
    const p = event.payload;
    const promo = await this.runStep(step, this.stepPlan('generate-promo'), event.instanceId, () =>
      this.services.ai.generateText('tournamentPromo', {
        name: p.name,
        style: p.style,
        location: p.location,
        date: p.date,
        audience: p.audience,
      }),
    );
    await this.runStep(step, this.stepPlan('generate-caption'), event.instanceId, () =>
      this.services.ai.generateText('socialCaption', {
        platform: 'instagram',
        subject: p.name,
        context: `${p.style} in ${p.location} on ${p.date}`,
      }),
    );
    return this.runStep(step, this.stepPlan('send-announcement'), event.instanceId, () =>
      this.services.notify.broadcastEmail({
        audience: p.audience,
        subject: `Registration open: ${p.name}`,
        html: `<p>${promo.text}</p>`,
        text: promo.text,
      }),
    );
  }
}

// --- Post-event content ------------------------------------------------------

export interface PostEventContentPayload {
  tournamentId: string;
  name: string;
  style: string;
  date: string;
  location: string;
  competitorCount: number;
  highlights: string;
  champions: string;
  audience: string;
}

export class PostEventContentWorkflow extends BaseWorkflow<PostEventContentPayload> {
  readonly plan: WorkflowPlan = {
    key: 'post_event_content',
    title: 'Post-event content',
    description: 'Draft an event recap, generate a sponsor thank-you, and email attendees.',
    steps: [
      { name: 'generate-recap', description: 'AI event recap', retries: DEFAULT_RETRIES, uses: ['ai'] },
      { name: 'generate-thankyou', description: 'AI sponsor thank-you', retries: DEFAULT_RETRIES, uses: ['ai'] },
      { name: 'send-recap', description: 'Email recap to attendees', retries: DEFAULT_RETRIES, uses: ['notifications'] },
    ],
  };

  async run(
    event: WorkflowEvent<PostEventContentPayload>,
    step: WorkflowStep,
  ): Promise<{ sent: number }> {
    const p = event.payload;
    const recap = await this.runStep(step, this.stepPlan('generate-recap'), event.instanceId, () =>
      this.services.ai.generateText('tournamentRecap', {
        name: p.name,
        style: p.style,
        date: p.date,
        location: p.location,
        competitorCount: p.competitorCount,
        highlights: p.highlights,
        champions: p.champions,
      }),
    );
    await this.runStep(step, this.stepPlan('generate-thankyou'), event.instanceId, () =>
      this.services.ai.generateText('sponsorThankYou', {
        sponsorName: 'our sponsors',
        name: p.name,
        contribution: 'their generous support',
      }),
    );
    return this.runStep(step, this.stepPlan('send-recap'), event.instanceId, () =>
      this.services.notify.broadcastEmail({
        audience: p.audience,
        subject: `Recap: ${p.name}`,
        html: `<p>${recap.text}</p>`,
        text: recap.text,
      }),
    );
  }
}

// --- Competitor onboarding ---------------------------------------------------

export interface CompetitorOnboardingPayload {
  competitorEmail: string;
  competitorName: string;
  dashboardUrl: string;
}

export class CompetitorOnboardingWorkflow extends BaseWorkflow<CompetitorOnboardingPayload> {
  readonly plan: WorkflowPlan = {
    key: 'competitor_onboarding',
    title: 'Competitor onboarding',
    description: 'Welcome a new competitor, wait, then nudge them to complete their profile.',
    steps: [
      { name: 'send-welcome', description: 'Welcome email', retries: DEFAULT_RETRIES, uses: ['notifications'] },
      { name: 'wait', description: 'Delay before nudge', retries: DEFAULT_RETRIES, uses: ['none'] },
      { name: 'send-nudge', description: 'Profile completion nudge', retries: DEFAULT_RETRIES, uses: ['notifications'] },
    ],
  };

  async run(
    event: WorkflowEvent<CompetitorOnboardingPayload>,
    step: WorkflowStep,
  ): Promise<{ id: string }> {
    const p = event.payload;
    await this.runStep(step, this.stepPlan('send-welcome'), event.instanceId, () =>
      this.services.notify.sendEmail({
        to: p.competitorEmail,
        subject: 'Welcome to Bushi',
        html: `<p>Welcome, ${p.competitorName}!</p>`,
        text: `Welcome, ${p.competitorName}!`,
      }),
    );
    await step.sleep('wait', '3 days');
    return this.runStep(step, this.stepPlan('send-nudge'), event.instanceId, () =>
      this.services.notify.sendEmail({
        to: p.competitorEmail,
        subject: 'Finish setting up your Bushi profile',
        html: `<p>Complete your profile: ${p.dashboardUrl}</p>`,
        text: `Complete your profile: ${p.dashboardUrl}`,
      }),
    );
  }
}

// --- School claim ------------------------------------------------------------

export interface SchoolClaimPayload {
  schoolId: string;
  schoolName: string;
  claimantEmail: string;
  verifyUrl: string;
}

export class SchoolClaimWorkflow extends BaseWorkflow<SchoolClaimPayload> {
  readonly plan: WorkflowPlan = {
    key: 'school_claim',
    title: 'School claim',
    description: 'Send a verification email to a claimant and generate a welcome once verified.',
    steps: [
      { name: 'send-verification', description: 'Verification email', retries: DEFAULT_RETRIES, uses: ['notifications'] },
      { name: 'generate-welcome', description: 'AI welcome copy for the school', retries: DEFAULT_RETRIES, uses: ['ai'] },
      { name: 'send-welcome', description: 'Deliver welcome copy', retries: DEFAULT_RETRIES, uses: ['notifications'] },
    ],
  };

  async run(
    event: WorkflowEvent<SchoolClaimPayload>,
    step: WorkflowStep,
  ): Promise<{ id: string }> {
    const p = event.payload;
    await this.runStep(step, this.stepPlan('send-verification'), event.instanceId, () =>
      this.services.notify.sendEmail({
        to: p.claimantEmail,
        subject: `Verify your claim of ${p.schoolName}`,
        html: `<p>Verify: ${p.verifyUrl}</p>`,
        text: `Verify: ${p.verifyUrl}`,
      }),
    );
    const welcome = await this.runStep(step, this.stepPlan('generate-welcome'), event.instanceId, () =>
      this.services.ai.generateText('schoolRecap', {
        schoolName: p.schoolName,
        name: 'your Bushi school profile',
        results: 'profile claimed',
        standouts: 'your team',
      }),
    );
    return this.runStep(step, this.stepPlan('send-welcome'), event.instanceId, () =>
      this.services.notify.sendEmail({
        to: p.claimantEmail,
        subject: `${p.schoolName} is now on Bushi`,
        html: `<p>${welcome.text}</p>`,
        text: welcome.text,
      }),
    );
  }
}

/** Inspectable registry of all workflow plans for an admin view. */
export const WORKFLOW_PLANS: WorkflowPlan[] = [
  new PreEventPromotionWorkflow({} as WorkflowServices).plan,
  new PostEventContentWorkflow({} as WorkflowServices).plan,
  new CompetitorOnboardingWorkflow({} as WorkflowServices).plan,
  new SchoolClaimWorkflow({} as WorkflowServices).plan,
];
