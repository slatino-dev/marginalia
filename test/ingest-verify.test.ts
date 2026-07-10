import { describe, it, expect } from "vitest";
import {
  assertAllowedSource,
  assertChecksum,
  canonicalizeSource,
  IngestChecksumMismatch,
  IngestSourceNotAllowed,
  sha256Hex,
} from "../src/ingest/verify";

/**
 * [SECURITY/Opus] tests for the ingest SSRF + supply-chain controls. Pure, no network:
 * the allow-list gate and the checksum-abort are the load-bearing controls, so they get
 * direct adversarial coverage (wrong host, non-https, redirect-substitution shape,
 * tampered bytes).
 */

const ALLOWLIST = [
  "https://example.gov/reports/rogers-commission.pdf",
  "https://example.gov/reports/caib-vol1.pdf",
];

describe("assertAllowedSource (SSRF / host-substitution guard)", () => {
  it("accepts an exact pinned URL", () => {
    expect(assertAllowedSource(ALLOWLIST[0]!, ALLOWLIST)).toBe(ALLOWLIST[0]);
  });

  it("rejects a different host", () => {
    expect(() => assertAllowedSource("https://evil.example/reports/rogers-commission.pdf", ALLOWLIST)).toThrow(
      IngestSourceNotAllowed,
    );
  });

  it("rejects a different path on an allowed host", () => {
    expect(() => assertAllowedSource("https://example.gov/reports/other.pdf", ALLOWLIST)).toThrow(
      IngestSourceNotAllowed,
    );
  });

  it("rejects non-https schemes (file/http/data)", () => {
    for (const u of [
      "http://example.gov/reports/rogers-commission.pdf",
      "file:///etc/passwd",
      "data:text/plain,hello",
    ]) {
      expect(() => assertAllowedSource(u, ALLOWLIST), u).toThrow(IngestSourceNotAllowed);
    }
  });

  it("rejects embedded credentials (userinfo)", () => {
    expect(() =>
      assertAllowedSource("https://user:pass@example.gov/reports/rogers-commission.pdf", ALLOWLIST),
    ).toThrow(IngestSourceNotAllowed);
  });

  it("canonicalizes host case but not path (host is authority, path is exact)", () => {
    expect(assertAllowedSource("https://EXAMPLE.GOV/reports/rogers-commission.pdf", ALLOWLIST)).toBe(
      ALLOWLIST[0],
    );
  });
});

describe("assertChecksum (supply-chain guard)", () => {
  const bytes = new TextEncoder().encode("Rogers Commission Report bytes");

  it("passes when the sha256 matches the dossier", async () => {
    const expected = await sha256Hex(bytes);
    await expect(assertChecksum(ALLOWLIST[0]!, bytes, expected)).resolves.toBe(expected);
  });

  it("is case-insensitive on the expected hex", async () => {
    const expected = (await sha256Hex(bytes)).toUpperCase();
    await expect(assertChecksum(ALLOWLIST[0]!, bytes, expected)).resolves.toBeDefined();
  });

  it("throws IngestChecksumMismatch on tampered bytes", async () => {
    const tampered = new TextEncoder().encode("Rogers Commission Report bytes (tampered)");
    const expected = await sha256Hex(bytes);
    await expect(assertChecksum(ALLOWLIST[0]!, tampered, expected)).rejects.toBeInstanceOf(
      IngestChecksumMismatch,
    );
  });
});

describe("canonicalizeSource", () => {
  it("strips the fragment and lowercases the host", () => {
    expect(canonicalizeSource("https://Example.Gov/a/b.pdf#page=3")).toBe("https://example.gov/a/b.pdf");
  });
});
