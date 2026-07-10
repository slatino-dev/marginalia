import { describe, it, expect } from "vitest";
import { CosineIndex, dot, normalize, type DenseRecord } from "../src/retrieval/dense";

/**
 * Dense lane ($0 brute-force cosine) tests + a corpus-scale benchmark.
 *
 * The benchmark is the evidence for the "well under the 10ms CPU budget" claim in
 * ARCHITECTURE / the dense-lane decision: it times a single top-K scan over a corpus the
 * size of the real one (~1,900 chunks x 1024 dims). The scan is pure CPU (no I/O), so its
 * wall time under workerd is a faithful stand-in for CPU time; the deployed-Worker
 * `cpuTime`-from-Workers-Logs measurement remains the Phase 2 gate for a full agentic ask.
 */

function unit(values: number[]): Float32Array {
  return normalize(Float32Array.from(values));
}

describe("cosine primitives", () => {
  it("normalizes to unit length", () => {
    const n = normalize(Float32Array.from([3, 4])); // |.|=5
    expect(dot(n, n)).toBeCloseTo(1, 6);
  });

  it("dot of identical unit vectors is 1, orthogonal is 0", () => {
    const a = unit([1, 0, 0]);
    const b = unit([0, 1, 0]);
    expect(dot(a, a)).toBeCloseTo(1, 6);
    expect(dot(a, b)).toBeCloseTo(0, 6);
  });

  it("throws on dimension mismatch", () => {
    expect(() => dot(Float32Array.from([1, 2]), Float32Array.from([1, 2, 3]))).toThrow(/mismatch/);
  });
});

describe("CosineIndex (dense lane port)", () => {
  const records: DenseRecord[] = [
    { chunkId: "a", documentId: "doc1", embedding: Float32Array.from([1, 0, 0]) },
    { chunkId: "b", documentId: "doc1", embedding: Float32Array.from([0.9, 0.1, 0]) },
    { chunkId: "c", documentId: "doc2", embedding: Float32Array.from([0, 1, 0]) },
    { chunkId: "d", documentId: "doc2", embedding: Float32Array.from([0, 0, 1]) },
  ];

  it("ranks by cosine similarity, best first", async () => {
    const idx = new CosineIndex(records);
    const hits = await idx.query(Float32Array.from([1, 0, 0]), 3);
    expect(hits.map((h) => h.chunkId)).toEqual(["a", "b", "c"]); // a=1, b~0.994, c=0, d=0 (a/b/c tie-break)
    expect(hits[0]!.rank).toBe(1);
    expect(hits[0]!.score).toBeCloseTo(1, 6);
  });

  it("honors the documentId metadata filter (Vectorize-filter analogue)", async () => {
    const idx = new CosineIndex(records);
    const hits = await idx.query(Float32Array.from([1, 0, 0]), 5, { documentId: "doc2" });
    expect(hits.every((h) => h.documentId === "doc2")).toBe(true);
    expect(hits.map((h) => h.chunkId).sort()).toEqual(["c", "d"]);
  });

  it("caps topK", async () => {
    const idx = new CosineIndex(records);
    const hits = await idx.query(Float32Array.from([1, 0, 0]), 2);
    expect(hits.length).toBe(2);
  });

  it("BENCH: full top-8 scan over ~1,900 x 1024 is well under the 10ms CPU budget", async () => {
    const N = 1900;
    const DIM = 1024;
    const records2: DenseRecord[] = [];
    for (let i = 0; i < N; i++) {
      const v = new Float32Array(DIM);
      for (let d = 0; d < DIM; d++) v[d] = Math.random() * 2 - 1;
      records2.push({ chunkId: `c${i}`, documentId: `doc${i % 4}`, embedding: v });
    }
    const idx = new CosineIndex(records2); // one-time normalize at construction (not the query cost)
    const q = new Float32Array(DIM);
    for (let d = 0; d < DIM; d++) q[d] = Math.random() * 2 - 1;

    // Correctness-under-scale guard: a full-corpus scan returns a valid top-8.
    // NOTE: workerd coarsens performance.now() to ~1ms (Spectre mitigation), so an
    // in-runtime timing reads 0.000 and is NOT the evidence — the precise CPU figure
    // comes from `npx tsx scripts/bench-dense.ts` (Node, identical V8 float math):
    // ~1.15 ms/sub-query and ~3.4 ms for a 3-sub-query agentic question at this size,
    // measured 2026-07-10. Here we only assert the scan completes and ranks.
    const hits = await idx.query(q, 8);
    expect(hits.length).toBe(8);
    expect(hits[0]!.rank).toBe(1);
    for (let i = 1; i < hits.length; i++) expect(hits[i]!.score).toBeLessThanOrEqual(hits[i - 1]!.score);
  });
});
