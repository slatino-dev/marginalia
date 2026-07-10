/**
 * Dense lane of the hybrid retrieval core.
 *
 * DECISION (2026-07-10, approved by the team lead): the portfolio's $0/free-tier posture
 * is a hard constraint, and Cloudflare's pricing page now gates Vectorize behind the
 * Workers PAID plan ("Vectorize is currently only available on the Workers paid plan",
 * read 2026-07-10). So the dense lane is implemented as brute-force cosine over the
 * corpus embeddings, which is tractable at the measured ~1,900-chunk corpus (a few
 * thousand 1024-dim dot products per sub-query — see the benchmark in test/dense.test.ts).
 *
 * The lane is defined behind the {@link DenseIndex} PORT so a future Vectorize (or any
 * ANN) backend is a drop-in: swap the implementation, keep the interface. RRF fusion,
 * reranking, and citation resolution (Phase 2) depend only on {@link DenseHit}, never on
 * the backend. The natural $0 home for {@link CosineIndex} is the BudgetLedger-adjacent
 * Durable Object (embeddings resident in memory, loaded once from D1/R2), where the
 * compute runs under the DO's larger duration allowance rather than the 10ms Worker CPU
 * budget; the class here is pure and I/O-free so it can live in a DO or a test unchanged.
 */

/** One dense candidate: the chunk, its document, the cosine score, and its 1-based rank. */
export interface DenseHit {
  chunkId: string;
  documentId: string;
  /** Cosine similarity in [-1, 1]; higher = more similar. */
  score: number;
  /** 1-based rank within this result set (1 = best). */
  rank: number;
}

/**
 * The dense-lane port. Query an index with a query embedding and get the top-K nearest
 * chunks by cosine similarity. A Vectorize-backed implementation would satisfy the same
 * contract (async network call); the $0 {@link CosineIndex} satisfies it in-memory.
 */
export interface DenseIndex {
  query(embedding: Float32Array, topK: number, opts?: DenseQueryOptions): Promise<DenseHit[]>;
}

export interface DenseQueryOptions {
  /** Restrict the search to one document (the Vectorize metadata-filter analogue). */
  documentId?: string;
}

/** A resident embedding for one chunk (what {@link CosineIndex} holds). */
export interface DenseRecord {
  chunkId: string;
  documentId: string;
  /** The chunk embedding. Normalized to unit length at construction. */
  embedding: Float32Array;
}

/** L2-normalize a vector in place-safe fashion, returning a new unit-length Float32Array.
 *  A zero vector is returned unchanged (its cosine with anything is defined as 0 here). */
export function normalize(v: Float32Array): Float32Array {
  let sum = 0;
  for (let i = 0; i < v.length; i++) sum += v[i]! * v[i]!;
  const norm = Math.sqrt(sum);
  if (norm === 0) return v.slice();
  const out = new Float32Array(v.length);
  for (let i = 0; i < v.length; i++) out[i] = v[i]! / norm;
  return out;
}

/** Dot product of two equal-length vectors (cosine, since both are unit-normalized). */
export function dot(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) {
    throw new Error(`dimension mismatch: ${a.length} vs ${b.length}`);
  }
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i]! * b[i]!;
  return s;
}

/**
 * $0 brute-force cosine index. Holds unit-normalized embeddings in memory and scans them
 * for each query. Pure and I/O-free: construct it from records loaded elsewhere (D1/R2),
 * ideally inside a Durable Object so the scan runs under the DO's duration allowance.
 * The scan is O(corpus x dims) per query; at ~1,900 x 1024 it is well under the CPU
 * budget (benchmarked in test/dense.test.ts).
 */
export class CosineIndex implements DenseIndex {
  private readonly records: DenseRecord[];

  /** `records` may carry raw or normalized embeddings; pass `preNormalized: true` only if
   *  they are already unit length (skips the normalize pass). */
  constructor(records: DenseRecord[], opts?: { preNormalized?: boolean }) {
    this.records = opts?.preNormalized
      ? records
      : records.map((r) => ({ ...r, embedding: normalize(r.embedding) }));
  }

  get size(): number {
    return this.records.length;
  }

  async query(
    embedding: Float32Array,
    topK: number,
    opts?: DenseQueryOptions,
  ): Promise<DenseHit[]> {
    const q = normalize(embedding);
    const k = Math.max(1, Math.min(50, Math.floor(topK)));
    const scored: { chunkId: string; documentId: string; score: number }[] = [];
    for (const r of this.records) {
      if (opts?.documentId && r.documentId !== opts.documentId) continue;
      scored.push({ chunkId: r.chunkId, documentId: r.documentId, score: dot(q, r.embedding) });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, k).map((s, i) => ({ ...s, rank: i + 1 }));
  }
}
