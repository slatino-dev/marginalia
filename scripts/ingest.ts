/**
 * Offline ingest pipeline — SKELETON (Phase 1). Runs OUTSIDE the request path (local /
 * CI Node), never from the public Worker, which is read-plus-ask only and cannot write
 * corpus rows (ARCHITECTURE boundaries). Orchestrates:
 *
 *   load dossier (pinned URLs + sha256) ->  [SECURITY/Opus] allow-list gate + no redirect
 *     -> sha256 verify (abort on mismatch)  ->  per-page text extraction
 *     -> structure-aware ~400-token chunking (section path + page anchors + headers)
 *     -> Workers AI REST embed  ->  batch upsert into D1 (+ Vectorize/R2 when provisioned)
 *
 * This file wires the SECURITY gate (which is implemented + tested now, in
 * src/ingest/verify.ts) and lays out the remaining stages as explicit steps to fill in
 * as Phase 1 proceeds. It intentionally does NOT fetch anything yet: the dossier
 * (docs/corpus-dossier.md) is still a stub without pinned URLs / real sha256s, and the
 * dense-lane target (Vectorize vs the $0 cosine alternative) is pending Sam's decision.
 *
 * Run (once the dossier is filled): `npx tsx scripts/ingest.ts` with admin creds.
 */
import { assertAllowedSource, assertChecksum } from "../src/ingest/verify.js";

/** One pinned corpus source, mirrored from docs/corpus-dossier.md. */
interface PinnedSource {
  id: string;
  title: string;
  url: string;
  sha256: string;
  licenseNote: string;
}

/**
 * Load the pinned source manifest. TODO(Phase 1): parse docs/corpus-dossier.md (or a
 * committed JSON mirror of it) once the URLs + sha256s are filled in. Returns [] today so
 * the pipeline is a safe no-op until the dossier is real.
 */
async function loadDossier(): Promise<PinnedSource[]> {
  // TODO(Phase 1): read + validate the dossier with Zod; every row must have a real
  // https URL and a 64-hex sha256 or ingest refuses to run.
  return [];
}

/**
 * Fetch a pinned source with the SECURITY gate applied: the URL must be on the allow-list
 * BEFORE the request, redirects are disabled (a redirect target is a different URL and is
 * not trusted), and the bytes are sha256-verified against the dossier before returning.
 */
async function fetchVerified(source: PinnedSource, allowlist: readonly string[]): Promise<ArrayBuffer> {
  assertAllowedSource(source.url, allowlist); // throws IngestSourceNotAllowed
  const res = await fetch(source.url, { redirect: "error" }); // no redirect substitution
  if (!res.ok) throw new Error(`fetch failed for ${source.url}: HTTP ${res.status}`);
  const bytes = await res.arrayBuffer();
  await assertChecksum(source.url, bytes, source.sha256); // throws IngestChecksumMismatch
  return bytes;
}

async function main(): Promise<void> {
  const sources = await loadDossier();
  if (sources.length === 0) {
    console.log("ingest: dossier is empty (Phase 0/1 stub) — nothing to ingest. Fill docs/corpus-dossier.md first.");
    return;
  }
  const allowlist = sources.map((s) => s.url);
  for (const source of sources) {
    const _bytes = await fetchVerified(source, allowlist);
    // TODO(Phase 1): per-page text extraction from the PDF bytes.
    // TODO(Phase 1): structure-aware ~400-token chunking (section path, page anchors,
    //                structural header) -> ChunkInsert rows.
    // TODO(Phase 1): Workers AI REST embed (bge-m3 or bge-base per the sizing gate).
    // TODO(Phase 1): batch upsert -> D1 documents/chunks (triggers populate chunks_fts),
    //                + dense-lane store (Vectorize or the $0 cosine table, pending decision),
    //                + R2 source PDF + per-page extracted-text JSON.
    // TODO(Phase 1): [SECURITY/Opus] write an append-only admin_audit row for the run.
    void source;
  }
}

// Only run when invoked directly (not when imported by a test).
main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
