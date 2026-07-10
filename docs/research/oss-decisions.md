# OSS decisions — Marginalia

> Fork-first discipline (OPEN-SOURCE WAREHOUSE system). Every adopted dependency,
> template, or forkable app is recorded here with its license tier verified at the
> commit, what it permits for THIS use, the integration mode (embed / service / fork /
> study), and the runners-up. Update when an adoption lands.

| Project | Version | License | Tier | Integration | What it permits here |
|---|---|---|---|---|---|
| Hono | ^4.9 | MIT | permissive | embed | Worker HTTP framework; the ARCHITECTURE default. |
| Zod | ^4.1 | MIT | permissive | embed | Validation at every trust boundary. |
| drizzle-orm + drizzle-kit | ^0.44 / ^0.31 | Apache-2.0 | permissive | embed | Typed D1 schema + versioned migrations (no db push). |
| @cloudflare/vitest-pool-workers | ^0.9 | MIT/Apache-2.0 | permissive | embed | Real workerd + miniflare D1 test runtime. |
| wrangler | ^4.40 | MIT/Apache-2.0 | permissive | embed | Deploy + local dev + D1 migrations. |

## Planned adoptions (recorded now, wired in their phase)

| Project | License (to verify at adopt) | Tier | Integration | Role |
|---|---|---|---|---|
| shadcn/ui | MIT | permissive | embed (restyled through our tokens) | SPA primitives (Phase 2). |
| AI Elements + Streamdown | Apache-2.0 / MIT (verify) | permissive | embed | Streamed answer + sanitized-markdown rendering; NO raw HTML (the stored-XSS control). |
| TanStack Table | MIT | permissive | embed | Eval-tab tables (Phase 3), tabular-nums. |
| promptfoo | MIT | permissive | study + embed | Eval harness for the nightly retrieval/faithfulness suites (Phase 3). |
| Phosphor Icons | MIT | permissive | embed | The one icon system (Regular/Fill/Duotone). |
| Source Serif 4 | SIL OFL 1.1 | permissive | embed (self-host woff2) | Reading-column face for the answer body only. |
| Bricolage Grotesque / Geist / Geist Mono | SIL OFL 1.1 | permissive | embed (self-host woff2) | Ratified lab type pairing. |

## Notes / flags

- **Vectorize (dense lane) is under a platform review** — the Cloudflare pricing page now
  gates Vectorize behind the Workers **Paid** plan (read 2026-07-10; recorded in
  `ARCHITECTURE.md`). This collides with the $0 posture. The dense lane sits behind a
  `VectorizeIndex` port, so a $0 alternative (brute-force cosine over embeddings stored in
  D1 / a DO) is a localized swap. Decision pending (raised to Sam). No Vectorize
  dependency is committed until that resolves.
- Corpus documents (the Postmortem Library) are US-government public domain under
  17 U.S.C. 105, not a software dependency; their provenance + sha256 are in
  `docs/corpus-dossier.md`. Attribution to the issuing body is preserved per the NOTICE.
- No AGPL/BSL/fair-code dependency is in the tree. All adopted and planned code above is
  MIT/Apache/OFL (permissive), safe to embed and restyle.
