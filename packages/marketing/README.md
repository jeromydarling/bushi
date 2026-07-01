# @bushi/marketing

Cloudflare Workflows definitions for lifecycle marketing.

- Minimal local `WorkflowStep` / `WorkflowEvent` / `RetryConfig` interfaces (no `cloudflare:workers` import) so it compiles standalone; the real runtime supplies compatible objects.
- Four workflows with typed `run(event, step)`, retry config and logging hooks: `PreEventPromotionWorkflow`, `PostEventContentWorkflow`, `CompetitorOnboardingWorkflow`, `SchoolClaimWorkflow`.
- AI + notification dependencies are interface-typed (`WorkflowServices`) and injected by the Worker.
- `WORKFLOW_PLANS` exports an inspectable step list for an admin view.

**Binding expected:** a Workflows binding per workflow class. Injected services should be backed by `@bushi/ai` and `@bushi/notifications`.
