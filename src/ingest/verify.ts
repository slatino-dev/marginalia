/**
 * [SECURITY/Opus] — ingest supply-chain + SSRF controls (ARCHITECTURE "Ingest SSRF and
 * supply-chain control"). PURE functions, no I/O, no D1 — the offline Node ingest
 * pipeline (scripts/ingest.ts) imports these to gate every download. They are pure so
 * they run identically under Node (the real pipeline) and workerd (the tests), and so
 * the security control is unit-tested without touching the network.
 *
 * Two invariants they enforce:
 *   1. The fetcher accepts ONLY the exact pinned source URLs recorded in
 *      docs/corpus-dossier.md (an allow-list of full https URLs). No visitor- or
 *      model-supplied URL, no host substitution, and no redirect to another URL is ever
 *      fetched. (Redirect handling is the caller's job: it MUST re-check the final URL
 *      through {@link assertAllowedSource}, or disable redirects entirely.)
 *   2. Every downloaded document is sha256-verified against the dossier BEFORE any
 *      extraction/embedding; a mismatch throws {@link IngestChecksumMismatch} and aborts.
 */

/** Thrown when a URL is not on the pinned allow-list (SSRF / host-substitution guard). */
export class IngestSourceNotAllowed extends Error {
  override readonly name = "IngestSourceNotAllowed";
  constructor(readonly url: string) {
    super(`ingest source not on the pinned allow-list: ${url}`);
  }
}

/** Thrown when downloaded bytes do not match the dossier sha256 (supply-chain guard). */
export class IngestChecksumMismatch extends Error {
  override readonly name = "IngestChecksumMismatch";
  constructor(
    readonly url: string,
    readonly expected: string,
    readonly actual: string,
  ) {
    super(`ingest checksum mismatch for ${url}: expected ${expected}, got ${actual}`);
  }
}

/**
 * Normalize a URL for exact allow-list comparison: require https, lowercase the host,
 * drop any credentials/fragment, and keep scheme+host+port+path+query. Throws
 * {@link IngestSourceNotAllowed} for anything not https (blocks file:, http:, data:,
 * etc.). Returns the canonical string used for the set membership check.
 */
export function canonicalizeSource(url: string): string {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    throw new IngestSourceNotAllowed(url);
  }
  if (u.protocol !== "https:") throw new IngestSourceNotAllowed(url);
  if (u.username || u.password) throw new IngestSourceNotAllowed(url);
  u.hash = "";
  u.hostname = u.hostname.toLowerCase();
  return u.toString();
}

/**
 * Assert `url` is exactly one of the pinned `allowlist` entries (each canonicalized the
 * same way). Returns the canonical URL on success; throws {@link IngestSourceNotAllowed}
 * otherwise. This is the ONLY gate the fetcher trusts — the allow-list is the pinned set
 * from docs/corpus-dossier.md, never a host prefix or a wildcard.
 */
export function assertAllowedSource(url: string, allowlist: readonly string[]): string {
  const canonical = canonicalizeSource(url);
  const allowed = new Set(allowlist.map(canonicalizeSource));
  if (!allowed.has(canonical)) throw new IngestSourceNotAllowed(url);
  return canonical;
}

/** Lowercase-hex sha256 of the given bytes (Web Crypto — present in Node 22+ and workerd). */
export async function sha256Hex(bytes: BufferSource): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Verify downloaded bytes against the dossier's expected sha256. Comparison is
 * case-insensitive on the hex; a mismatch throws {@link IngestChecksumMismatch} (the
 * caller MUST abort, never extract). Returns the computed hash on success.
 */
export async function assertChecksum(
  url: string,
  bytes: BufferSource,
  expectedSha256: string,
): Promise<string> {
  const actual = await sha256Hex(bytes);
  if (actual.toLowerCase() !== expectedSha256.trim().toLowerCase()) {
    throw new IngestChecksumMismatch(url, expectedSha256, actual);
  }
  return actual;
}
