# Security posture — Marginalia

> [SECURITY/Opus]-owned (standing rule: all security design, implementation, and review
> route to Opus). This doc summarizes what is enforced NOW vs. what lands with the surface
> that needs it. The authoritative design is `ARCHITECTURE.md` "Security posture"; this is
> the build-state ledger against it. A full `security-review` skill pass gates Phase 3
> before launch.

## Enforced in Phase 0 (this build)

- **Site-wide security headers** on every Worker response (`src/security/headers.ts`):
  `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy:
  no-referrer`, COOP/CORP same-origin, and a Content-Security-Policy with
  `default-src 'none'`, `frame-ancestors 'none'`, `base-uri 'none'`, `form-action 'none'`.
  A smoke test asserts they are present.
- **No secrets in git.** `HASH_SALT` (the per-visitor session-hash salt) is a Worker
  secret in production and a `.dev.vars` value locally; only `.dev.vars.example` is
  committed. A committed-config test asserts `HASH_SALT` never appears in `wrangler.toml`
  and that there is no `[vars]` block. `gitleaks` runs in CI.
- **Only the intended public address.** `workers_dev = false`; the sole route is the
  custom domain. A test asserts `workers_dev` stays off.
- **Parameterized queries only.** The BM25 lane binds the FTS5 `MATCH` as a bound
  parameter and builds the match expression from sanitized literal terms
  (`toMatchQuery`), so arbitrary visitor text cannot inject SQL or FTS5 query-language
  operators. No raw string SQL anywhere (drizzle + bound params).
- **Zod at the boundary + single env shape.** `src/env.ts` is the one injected-shape
  definition; runtime values are Zod-parsed at first use.
- **No stack traces leave the Worker.** `onError` returns a generic problem+json 500.

## Attack surface today
A health probe (`/healthz`) plus static files (the design token sheet). No `/ask` path, no
model calls, no write path from the public surface, no admin surface. The token sheet is
served by the platform Static Assets handler; the Phase 2 SPA moves asset responses behind
the Worker so a strict nonce-based CSP (no `unsafe-inline`) applies to the app shell.

## Deferred, by the surface that introduces the risk (from the ARCHITECTURE roadmap)

- **[SECURITY/Opus] Neuron-pool defense (Phase 2).** BudgetLedger DO holds one combined
  4,000/day counter (demo + eval) plus a per-visitor cap, both checked BEFORE any model
  call; the global ceiling + per-IP-hash sliding window are the authoritative shared-pool
  protections (the rotating per-visitor key is best-effort fairness only). Hard cap 429s
  at the ceiling; the full degrade ladder is Phase 3 polish.
- **[SECURITY/Opus] Per-call `max_tokens` caps (Phase 2)** on every Workers AI call.
- **[SECURITY/Opus] Rate limiting on every public route, hardest on `/ask` (Phase 2)**,
  with `RateLimit-*` + `Retry-After` headers; per-request token/neuron budget on `/ask`.
- **[SECURITY/Opus] Prompt-injection posture (Phase 2).** Visitor questions + retrieved
  passages wrapped as clearly delimited untrusted data; system instructions only in the
  trusted preamble; model output parsed for citation markers only, no tool authority;
  question length capped.
- **[SECURITY/Opus] Output rendering / stored-XSS (Phase 2).** ALL model output, corpus
  passages, question text, and planner sub-queries render as sanitized markdown with NO
  raw HTML (Streamdown, never `dangerouslySetInnerHTML`); the share-permalink echoes those
  strings to third parties, so this is the load-bearing control, with CSP as
  defense-in-depth. Body-size limit + same-origin CORS on SPA/API.
- **[SECURITY/Opus] Admin/ingest isolation (Phase 1).** Ingest, feedback moderation, and
  eval management behind an authenticated admin surface (server-side session, HttpOnly/
  Secure/SameSite cookie, argon2id credential in a Worker secret, uniform auth errors,
  hardest rate limits on login). Unreachable from the public demo routes.
- **[SECURITY/Opus] Pinned source-URL allow-list + checksum-abort (Phase 1).** Ingest
  fetches only the dossier's pinned URLs and sha256-verifies before extraction; no
  visitor- or model-supplied URL is ever fetched.
- **[SECURITY/Opus] Append-only `admin_audit` trail (Phase 1).** Every privileged action
  (ingest run, trace redaction, feedback moderation, eval-config change) writes an
  actor/action/target/ts/reason row; never updated or deleted. The table exists in the
  schema now; writes land with the admin surface.
- **[SECURITY/Opus] Feedback endpoint (Phase 3).** Rate-limited per session, enum verdict
  + length-capped note, NO PII, write-only into a moderation queue; abuse content flagged
  for admin, never rendered publicly.
- **Analytics carry no PII and no raw question text** (enforced in the Zod events schema);
  question text lives only in D1 traces, with an admin redaction path that preserves the
  row for eval integrity while blanking the text.
