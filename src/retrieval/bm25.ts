/**
 * BM25 lane of the hybrid retrieval core (ARCHITECTURE: D1 FTS5 external-content).
 *
 * The full hybrid pipeline (dense lane, reciprocal-rank fusion, reranking, agentic
 * loop) lands in Phase 2; this module is the Phase 1 groundwork the FTS5 index is built
 * for, and is integration-tested against the real miniflare D1 (vitest-pool-workers).
 *
 * Security: FTS5 MATCH is parameterized (bound param, never string-interpolated —
 * ARCHITECTURE anti-list). The MATCH *expression* is additionally built by
 * {@link toMatchQuery} from sanitized literal terms, so arbitrary visitor text cannot
 * inject FTS5 query-language operators (a syntax-error / logic-injection surface even
 * when SQL-safe). bm25() returns a relevance score where MORE NEGATIVE = MORE RELEVANT,
 * so results are ordered ascending.
 */

/** One BM25 candidate: the chunk, its document, the raw bm25() score, and its 1-based rank. */
export interface Bm25Hit {
  chunkId: string;
  documentId: string;
  /** Raw bm25() score (more negative = more relevant). */
  score: number;
  /** 1-based rank within this result set (1 = best). */
  rank: number;
}

/**
 * Build a safe FTS5 MATCH expression from free visitor text. Terms are extracted as
 * unicode word runs, lowercased, wrapped as double-quoted string literals (FTS5 treats
 * a quoted string as a literal phrase token, disabling operator interpretation), and
 * OR-combined for a recall-oriented lane. Returns "" when no usable term remains — the
 * caller MUST treat "" as "no BM25 query" and skip the MATCH (an empty MATCH errors).
 */
export function toMatchQuery(text: string): string {
  const terms = text
    .toLowerCase()
    .match(/[\p{L}\p{N}]+/gu);
  if (!terms || terms.length === 0) return "";
  // Double any internal quote (there are none after the \p{L}\p{N} filter, but keep the
  // escaping explicit so the invariant survives a future looser tokenizer).
  const quoted = terms.map((t) => `"${t.replace(/"/g, '""')}"`);
  return quoted.join(" OR ");
}

/**
 * Run the BM25 lane: match `chunks_fts`, join back to `chunks` on rowid, order by
 * relevance, and cap at `limit`. `matchQuery` must be a pre-sanitized FTS5 expression
 * (see {@link toMatchQuery}); passing raw user text is a bug. `limit` is clamped to a
 * sane bound to keep the query cheap.
 */
export async function bm25Search(
  db: D1Database,
  matchQuery: string,
  limit: number,
): Promise<Bm25Hit[]> {
  if (matchQuery.trim() === "") return [];
  const capped = Math.max(1, Math.min(50, Math.floor(limit)));
  const { results } = await db
    .prepare(
      `SELECT c.id AS chunk_id, c.document_id AS document_id, bm25(chunks_fts) AS score
         FROM chunks_fts
         JOIN chunks c ON c.rowid = chunks_fts.rowid
        WHERE chunks_fts MATCH ?1
        ORDER BY score ASC
        LIMIT ?2`,
    )
    .bind(matchQuery, capped)
    .all<{ chunk_id: string; document_id: string; score: number }>();

  return results.map((r, i) => ({
    chunkId: r.chunk_id,
    documentId: r.document_id,
    score: r.score,
    rank: i + 1,
  }));
}
