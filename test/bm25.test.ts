import { describe, it, expect, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import { bm25Search, toMatchQuery } from "../src/retrieval/bm25";

/**
 * BM25 lane integration test against the REAL miniflare D1 (vitest-pool-workers) and the
 * REAL FTS5 external-content index + sync triggers. This is the Phase 1 evidence that
 * the BM25 retrieval lane returns the expected passage for a query, and that the FTS5
 * migration is functional end to end (insert into `chunks` -> trigger populates
 * `chunks_fts` -> `MATCH` + `bm25()` ranks it).
 */

const DOC_ID = "01J0DOCROGERS00000000000000";

async function seedChunk(id: string, seq: number, text: string): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO chunks (id, document_id, seq, section_path, page_start, page_end, text, token_count)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
  )
    .bind(id, DOC_ID, seq, "Ch. IV > Findings", seq, seq, text, text.split(/\s+/).length)
    .run();
}

describe("toMatchQuery (FTS5 sanitizer)", () => {
  it("extracts word terms and OR-combines them as quoted literals", () => {
    expect(toMatchQuery("O-ring temperature")).toBe('"o" OR "ring" OR "temperature"');
  });

  it("returns empty string when no usable term remains", () => {
    expect(toMatchQuery("   ...!!  ")).toBe("");
  });

  it("neutralizes FTS5 operator characters (no injection, no throw)", () => {
    // Quotes / operators in the input become plain quoted terms, never operators.
    const q = toMatchQuery('foo" OR bar AND (baz)');
    expect(q).toBe('"foo" OR "or" OR "bar" OR "and" OR "baz"');
  });
});

describe("bm25Search (D1 FTS5 lane)", () => {
  beforeEach(async () => {
    // Clean slate per test; the DELETE fires the FTS delete trigger too.
    await env.DB.prepare(`DELETE FROM chunks`).run();
    await env.DB.prepare(
      `INSERT OR IGNORE INTO documents (id, title, source_url, sha256, pages, license_note, created_at)
       VALUES (?1, 'Rogers Commission Report', 'https://example.gov/rogers', 'deadbeef', 256, '17 U.S.C. 105', 0)`,
    )
      .bind(DOC_ID)
      .run();
  });

  it("ranks the on-topic passage first and excludes non-matching passages", async () => {
    await seedChunk("01J0CHUNKA0000000000000000", 1, "The O-ring seals failed at low temperature during the launch.");
    await seedChunk("01J0CHUNKB0000000000000000", 2, "The flight readiness review process had management flaws.");
    await seedChunk("01J0CHUNKC0000000000000000", 3, "Budget constraints affected the shuttle program schedule.");

    const hits = await bm25Search(env.DB, toMatchQuery("O-ring temperature"), 8);

    expect(hits.length).toBe(1); // only chunk A contains either term
    expect(hits[0]!.chunkId).toBe("01J0CHUNKA0000000000000000");
    expect(hits[0]!.rank).toBe(1);
    expect(hits[0]!.documentId).toBe(DOC_ID);
    // bm25() returns a relevance score; a real match is a finite number.
    expect(Number.isFinite(hits[0]!.score)).toBe(true);
  });

  it("orders multiple matches by relevance (best rank 1)", async () => {
    // A mentions the query terms twice; B once. A should outrank B.
    await seedChunk("01J0CHUNKA0000000000000000", 1, "temperature temperature affected the O-ring O-ring seal directly.");
    await seedChunk("01J0CHUNKB0000000000000000", 2, "temperature was noted once in the appendix.");

    const hits = await bm25Search(env.DB, toMatchQuery("O-ring temperature"), 8);

    expect(hits.map((h) => h.chunkId)).toEqual([
      "01J0CHUNKA0000000000000000",
      "01J0CHUNKB0000000000000000",
    ]);
    expect(hits[0]!.rank).toBe(1);
    expect(hits[1]!.rank).toBe(2);
  });

  it("returns [] for an empty match query rather than erroring", async () => {
    await seedChunk("01J0CHUNKA0000000000000000", 1, "any text");
    const hits = await bm25Search(env.DB, toMatchQuery("!!!"), 8);
    expect(hits).toEqual([]);
  });

  it("keeps the FTS index in sync on delete (trigger fires)", async () => {
    await seedChunk("01J0CHUNKA0000000000000000", 1, "The O-ring seals failed at low temperature.");
    let hits = await bm25Search(env.DB, toMatchQuery("O-ring"), 8);
    expect(hits.length).toBe(1);

    await env.DB.prepare(`DELETE FROM chunks WHERE id = ?1`).bind("01J0CHUNKA0000000000000000").run();
    hits = await bm25Search(env.DB, toMatchQuery("O-ring"), 8);
    expect(hits.length).toBe(0);
  });
});
