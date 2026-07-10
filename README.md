# Marginalia

Agentic RAG that shows its work. Most retrieval demos ask you to trust the answer;
Marginalia lets you check it. Hybrid retrieval you can watch, citations you can audit down
to the exact source passage, and a public eval tab that grades the system in the open. It
runs on Cloudflare's free tier.

The corpus is the Postmortem Library: landmark US federal accident investigation reports
that are in the public domain under 17 U.S.C. 105 (Challenger, Columbia, Apollo 13, Three
Mile Island). Every citation resolves to a real page in one of those reports.

> Status: Phase 0 foundation (this build). The Worker boots, the design system is set, the
> corpus schema and BM25 retrieval lane are in place and tested, and CI runs on every push.
> The ask path, agent loop, and eval tab arrive in later phases. See `BUILD-PLAN.md`.

## What it does (the shape)

- **Hybrid retrieval you can see.** A BM25 lane (D1 FTS5) and a dense lane (embeddings) run
  in parallel, fuse by reciprocal rank, and rerank. The full trace, both lanes' candidates
  and every score, is a first-class part of the answer, not hidden plumbing.
- **Citations you can audit.** Each claim in the answer carries a live margin note. One
  click opens the exact source passage, its document and page anchor, and the complete
  retrieval provenance that pulled it.
- **Evals in public.** A nightly cron runs retrieval and faithfulness metrics over a golden
  question set and writes the results to the database. The eval tab reads only those stored
  runs, so the numbers on screen are real and dated, including the misses.

## Stack

Cloudflare Worker (Hono + Zod at every boundary), D1 (SQLite) as the system of record with
drizzle-orm and versioned migrations, FTS5 for the BM25 lane, Workers AI for embeddings /
rerank / synthesis, a SQLite-backed Durable Object for the shared neuron budget, R2 for
source PDFs, and one Cron Trigger for the nightly evals. Frontend: a React SPA on the
Signal Path design system. Tests run in the real workerd runtime via
`@cloudflare/vitest-pool-workers` with miniflare D1 as the real database.

Everything targets the Cloudflare free tier. The current free-tier limits this project
depends on, with read dates, are recorded in `ARCHITECTURE.md`.

## Develop

```bash
npm install
npm run dev            # wrangler dev (local D1/DO/KV; remote Vectorize binding when it lands)
npm test               # vitest-pool-workers (workerd + miniflare D1)
npm run typecheck
npm run lint
npm run migrate        # apply D1 migrations to the local database
npm run build:css      # compile design tokens -> public/tokens.css
npm run check:contrast # assert WCAG AA on the token pairs (dark + light)
```

Copy `.dev.vars.example` to `.dev.vars` for local secrets. Production secrets live in
Worker secrets (`wrangler secret put`), never in git or `wrangler.toml`.

## Layout

```
src/index.ts        Worker entry (Hono): /healthz + static token sheet (Phase 0)
src/db/schema.ts    D1 schema (drizzle) — corpus, traces, evals, feedback, audit
src/retrieval/      the retrieval core (BM25 lane now; dense/fusion/rerank next)
src/security/       [SECURITY/Opus] site headers now; budget/rate/admin next
analytics/events.ts typed tracking plan (activation event: citation_audit_opened)
src/styles/theme.css  Signal Path tokens (ratified lab base + Rubric vermilion override)
migrations/         versioned D1 migrations (drizzle-generated + hand-written FTS5)
docs/               corpus dossier, eval spec, security posture, oss decisions
```

## License

Apache-2.0 (see `LICENSE` and `NOTICE`). The corpus documents are US-government public
domain (17 U.S.C. 105); provenance and checksums are recorded in
`docs/corpus-dossier.md`. Not affiliated with any government agency; not safety,
engineering, or investment advice.
