import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";

/**
 * Migration check (in-process): apply-migrations.ts has already applied 0000_init +
 * 0001_chunks_fts to the miniflare D1 before this runs. These assertions prove the
 * schema is really there — the corpus tables, and the FTS5 virtual table + its triggers.
 */
describe("d1 schema (migrations applied)", () => {
  it("has every ARCHITECTURE data-model table", async () => {
    const { results } = await env.DB.prepare(
      `SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`,
    ).all<{ name: string }>();
    const names = results.map((r) => r.name);
    for (const expected of [
      "documents",
      "chunks",
      "chunks_fts",
      "queries",
      "retrieval_steps",
      "rerank_results",
      "answers",
      "eval_runs",
      "eval_results",
      "golden_questions",
      "feedback",
      "admin_audit",
      "schema_meta",
    ]) {
      expect(names, `table ${expected} missing`).toContain(expected);
    }
  });

  it("registered the FTS5 sync triggers on chunks", async () => {
    const { results } = await env.DB.prepare(
      `SELECT name FROM sqlite_master WHERE type='trigger' ORDER BY name`,
    ).all<{ name: string }>();
    const triggers = results.map((r) => r.name);
    expect(triggers).toEqual(
      expect.arrayContaining(["chunks_fts_ai", "chunks_fts_ad", "chunks_fts_au"]),
    );
  });

  it("starts with an empty corpus (no rows leaked into the migration)", async () => {
    const row = await env.DB.prepare(`SELECT COUNT(*) AS n FROM documents`).first<{ n: number }>();
    expect(row?.n).toBe(0);
  });
});
