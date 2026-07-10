# HANDOFF — Marginalia

> State at end of the Phase 0 + Phase 1-groundwork build session (2026-07-10, Opus 4.8
> implementation agent). Read this + `BUILD-PLAN.md` to resume. Evidence for every claim
> below is from this session (test runs, CI run, deployed-URL curl, queried limits).

## Phase 0 gate — PASSED, with evidence

- **CI green on main.** Run `https://github.com/slatino-dev/marginalia/actions/runs/29105263766`
  = success. `verify` job: typecheck + eslint + `wrangler d1 migrations apply` + 16 tests
  in workerd, all green. `secret-scan` (gitleaks): clean. `deploy`: cleanly SKIPPED (see
  residual R1) — the no-op guard printed "CLOUDFLARE_API_TOKEN not set — skipping deploy"
  and exited 0, so CI stays green.
- **Deployed hello-world Worker responding.** `wrangler deploy` (local, authed) published
  to `marginalia.samlatino.dev` (custom domain auto-provisioned; version
  a1d2048f-e47e-4687-ba3e-4e5b1556fdc7). `curl https://marginalia.samlatino.dev/healthz`
  -> `{"status":"ok","service":"marginalia","version":"0.1.0",...}` with the security
  headers present (CSP, X-Frame-Options: DENY, X-Content-Type-Options: nosniff). `/` serves
  the Signal Path token sheet (static asset).
- **Migration applied against miniflare D1 in a test.** `test/apply-migrations.ts` applies
  0000_init + 0001_chunks_fts to the real miniflare D1 before the suite; `test/schema.test.ts`
  asserts all 13 tables + the 3 FTS5 sync triggers exist. `npm test` = 26 passed / 5 files.
- **Typed analytics** with the `citation_audit_opened` activation event: `analytics/events.ts`.
- **DESIGN.md + theme.css**: Signal Path lab base RATIFIED verbatim + a `[MARGINALIA
  OVERRIDE]` block (Rubric vermilion hue 40 + annotated-page tokens). `npm run check:contrast`
  = all 13 required pairs pass WCAG AA in dark AND light.
- **Cloudflare limits re-verified 2026-07-10** and recorded with read dates in
  `ARCHITECTURE.md` "Free-tier limits": D1 (5M read/100k write/day, 5 GB), KV (100k read/1k
  write/day, 1 GB), Workers (100k req/day, 10ms CPU, 50 subrequests/req, 5 crons), DO (100k
  req + 13,000 GB-s/day, SQLite-only on Free), R2 (10 GB, 1M/10M ops), Workers Logs.

## Phase 1 groundwork landed this session

- **Corpus + trace + eval schema** (`src/db/schema.ts`, drizzle): documents, chunks,
  queries, retrieval_steps, rerank_results, answers, eval_runs, eval_results,
  golden_questions, feedback, admin_audit (+ schema_meta bootstrap). Migration `0000_init.sql`.
- **FTS5 external-content BM25 lane** tested in vitest-pool-workers:
  `migrations/0001_chunks_fts.sql` (virtual table + 3 sync triggers), `src/retrieval/bm25.ts`
  (parameterized MATCH + sanitized `toMatchQuery`), `test/bm25.test.ts` (7 tests: ranking,
  ordering, empty-query, delete-sync, injection-neutralization).
- **[SECURITY/Opus] ingest allow-list + checksum-abort** (`src/ingest/verify.ts`,
  `test/ingest-verify.test.ts`, 11 tests): https-only pinned allow-list, non-https/userinfo/
  host-substitution rejection, sha256 verify with `IngestChecksumMismatch` on tampered bytes.
- **Offline ingest pipeline skeleton** (`scripts/ingest.ts`): wires the security gate
  (allow-list + `redirect: "error"` + checksum) with extraction/chunking/embed/upsert as
  explicit Phase-1 TODOs. Runs today as a safe no-op (dossier is a stub).
- **Golden set drafting started** (`evals/golden-set.ts`): 20 grounded questions across the
  four reports (question text + `expectedAnswerNotes`), toward the >=60 target;
  `expectedChunkIds` deferred to Phase 3 label-binding per docs/eval-spec.md.
- **Docs**: `docs/corpus-dossier.md` (stub — sources named, URLs/sha256/pages pinned at
  ingest), `docs/eval-spec.md`, `docs/security-posture.md`, `docs/research/oss-decisions.md`.

## Residuals / decisions needed

- **R1 — CI auto-deploy needs a repo secret.** `CLOUDFLARE_API_TOKEN` is not set on
  `slatino-dev/marginalia`, so the CI deploy job skips (green). Today's live deploy was done
  locally with authed wrangler. Add the secret (Workers Scripts:Edit + D1:Edit) to enable
  deploy-on-main. The gh token in this session lacks secrets-write scope, so this is Sam's action.
- **R2 — RESOLVED 2026-07-10 (team lead, per Sam's standing $0 posture): option (b).**
  Vectorize is Workers-Paid-gated (pricing page read 2026-07-10; recorded in ARCHITECTURE),
  so the dense lane is brute-force cosine over embeddings stored in D1, computed in a DO,
  implemented BEHIND the existing `VectorizeIndex` port so an ANN backend stays a drop-in.
  Requirements attached to the swap: record the decision in ARCHITECTURE.md +
  docs/research/oss-decisions.md, and produce a MEASURED CPU-time figure for a full dense
  query at the real corpus size (the 10ms claim needs a number, not an estimate).
  Portfolio-wide override recorded in `projects\PORTFOLIO-V2.md`: no app takes a Vectorize
  dependency. No Vectorize dependency is committed.
- **R3 — dependency audit** finds high-severity advisories in transitive dev deps
  (`npm audit`); the CI audit step is `continue-on-error` (matches conduit). Not triaged this
  session; review before launch.
- **R4 — CVD check owed at Design-Loop step 5**: rubric (hue 40) vs danger (hue 22) are only
  ~18deg apart, so a deuteranopia+protanopia sim on accent-400 vs danger-400 is a required
  check before the retrieval view ships (Phase 2). Tokens differ by lightness+chroma by design.

## Next steps (Phase 1 continuation, in order)
1. Fill `docs/corpus-dossier.md` with pinned URLs + real sha256s + measured page counts
   (fetch each PDF once), then implement extraction + structure-aware chunking in the ingest
   pipeline; measure the chunk count and run the embedding-model sizing gate.
2. Implement the R2-resolved dense lane (D1-stored embeddings + DO cosine behind the
   `VectorizeIndex` port) so the embed/upsert stage can be written; measure query CPU time.
3. Grow the golden set from 20 to >= 60 (question text + notes only); label `expectedChunkIds`
   is Phase 3 (ingest-gated).
4. [SECURITY/Opus] admin/ingest auth surface + append-only `admin_audit` writes on ingest runs.

## Commands
`npm test` (26 tests, workerd + miniflare D1) · `npm run typecheck` · `npm run lint` ·
`npm run migrate` (local D1) · `npm run build:css` · `npm run check:contrast` ·
`npm run ingest` (no-op until the dossier is filled) · `npm run deploy` (authed wrangler).
