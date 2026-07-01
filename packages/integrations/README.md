# @bushi/integrations

Bitoku integration-readiness interfaces + stubs.

Bitoku is a Lovable-built school management system. This package defines the sync surface so the Worker can wire a real Bitoku instance later without reshaping call sites — **no live calls happen until a base URL + API key are configured.**

- DTOs: `BitokuSchool`, `BitokuMember`, `BitokuResult` (+ Bushi-side `Bushi*Input` shapes).
- `BitokuClient` interface: `importRoster`, `syncSchoolMembers`, `syncAthleteProfile`, `pushResults`.
- `HttpBitokuClient` stub that throws `NotConfiguredError` when unconfigured; shows the intended REST calls.
- Mapping layer (`mapSchool` / `mapMember` / `mapResult`, `normalizeStyle`) to Bushi domain shapes.

**No Cloudflare binding.** Requires `BITOKU_BASE_URL` + `BITOKU_API_KEY` secrets when enabled.
