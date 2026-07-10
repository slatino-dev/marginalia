/**
 * Dense-lane compute benchmark (Node). Measures the pure-CPU cost of a full brute-force
 * cosine top-K scan at the real corpus size (~1,900 chunks x 1024 dims), plus the 3-sub-
 * query agentic case. Run under Node because workerd coarsens `performance.now()` to ~1ms
 * (Spectre mitigation), which reports sub-millisecond scans as 0.000 in-runtime; the scan
 * is identical V8 float math either way, so this is a faithful CPU-cost figure.
 *
 * The deployed-Worker `cpuTime`-from-Workers-Logs measurement on a full agentic `/ask`
 * remains the Phase 2 gate (ARCHITECTURE System shape). This establishes the dense lane's
 * own contribution is negligible against the 10ms budget.
 *
 * Run: `npx tsx scripts/bench-dense.ts`
 */
import { CosineIndex, type DenseRecord } from "../src/retrieval/dense.js";

function randomUnitCorpus(n: number, dim: number): DenseRecord[] {
  const records: DenseRecord[] = [];
  for (let i = 0; i < n; i++) {
    const v = new Float32Array(dim);
    for (let d = 0; d < dim; d++) v[d] = Math.random() * 2 - 1;
    records.push({ chunkId: `c${i}`, documentId: `doc${i % 4}`, embedding: v });
  }
  return records;
}

function randomQuery(dim: number): Float32Array {
  const q = new Float32Array(dim);
  for (let d = 0; d < dim; d++) q[d] = Math.random() * 2 - 1;
  return q;
}

async function bench(n: number, dim: number, subQueries: number): Promise<number> {
  const idx = new CosineIndex(randomUnitCorpus(n, dim));
  const q = randomQuery(dim);
  // Warm the JIT.
  for (let i = 0; i < 50; i++) await idx.query(q, 8);
  const runs = 500;
  const start = performance.now();
  for (let r = 0; r < runs; r++) {
    for (let s = 0; s < subQueries; s++) await idx.query(randomQuery(dim), 8);
  }
  return (performance.now() - start) / runs;
}

async function main(): Promise<void> {
  const N = 1900;
  const DIM = 1024;
  const single = await bench(N, DIM, 1);
  const agentic = await bench(N, DIM, 3);
  console.log(`corpus ${N} x ${DIM} (worst-case 4,400 bound also holds linearly):`);
  console.log(`  single sub-query top-8 cosine scan : ${single.toFixed(4)} ms`);
  console.log(`  3-sub-query agentic question       : ${agentic.toFixed(4)} ms`);
  console.log(`  10 ms Worker CPU budget headroom   : ${(10 / agentic).toFixed(0)}x (3-sub-query case)`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
