# @bushi/search

Search service: D1 keyword/filter search + optional Vectorize semantic suggestions.

- `SearchQuery` + `buildTournamentSearchSql(query)` → `{ sql, params }` (fully parameterized; only validated enums inlined).
- `SearchService` over a D1-like `prepare().bind().all()` surface: `searchTournaments`, `searchSchools`, `semanticSuggest(text, embedFn)`.
- The embedding function is injected (pair with `@bushi/ai` `AiService.embed`) so Vectorize stays behind an interface.

**Bindings expected:** a D1 database (e.g. `DB`) and, for semantic suggest, a `VECTORIZE` index. Tables referenced: `tournaments`, `schools`.
