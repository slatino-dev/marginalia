/**
 * Worker binding + var types (the shape the Cloudflare platform injects).
 *
 * Zod-at-the-boundary policy (BACKEND ENGINEERING SYSTEM): runtime values that drive
 * logic are parsed through Zod at first use, not read as bare strings across the code.
 * This interface is the injected shape; it is not itself the trust boundary.
 *
 * SCAFFOLD STATE (Phase 0): only D1 is provisioned. Vectorize, R2, KV (preset-trace
 * cache), and the BudgetLedger Durable Object arrive in later phases (ARCHITECTURE
 * System shape) and are added here when they are actually bound in wrangler.toml.
 */
export interface Env {
  /** D1: system of record — corpus, traces, evals, feedback (ARCHITECTURE data model). */
  DB: D1Database;

  /**
   * [SECURITY/Opus] HMAC salt for the non-reversible per-visitor session hash (the
   * per-visitor neuron cap; ARCHITECTURE "Security posture"). A Worker SECRET in
   * production (`wrangler secret put HASH_SALT`), a local value in `.dev.vars`.
   * NEVER in wrangler.toml [vars] or git. A missing salt fails closed.
   */
  HASH_SALT?: string;
}
