import { readFileSync } from "node:fs";
import { defineWorkersConfig, readD1Migrations } from "@cloudflare/vitest-pool-workers/config";

/**
 * Tests run inside the REAL Cloudflare runtime (workerd) via vitest-pool-workers, with
 * miniflare-backed D1 as the real data layer — Marginalia's stand-in for Testcontainers
 * (PORTFOLIO-V2 platform posture: miniflare D1 IS the real database). Bindings come from
 * wrangler.toml.
 *
 * Migrations are read from ./migrations (the SAME versioned SQL that ships) and applied
 * to the test D1 in test/apply-migrations.ts — so the tests exercise the real schema and
 * a broken migration fails the suite (the migration check, in-process). FTS5 / BM25 /
 * fusion / citation-resolution logic (Phase 1+) are integration-tested here against that
 * real miniflare D1, never a SQLite double.
 */
const migrations = await readD1Migrations("./migrations");
// Injected so a test can assert the committed wrangler.toml never enables workers_dev
// or leaks a secret into a [vars] block.
const wranglerTomlText = readFileSync("./wrangler.toml", "utf8");

export default defineWorkersConfig({
  test: {
    setupFiles: ["./test/apply-migrations.ts"],
    poolOptions: {
      workers: {
        main: "./src/index.ts",
        miniflare: {
          bindings: {
            TEST_MIGRATIONS: migrations,
            WRANGLER_TOML_TEXT: wranglerTomlText,
            // [SECURITY/Opus] test-only value: a real HMAC salt so the per-visitor
            // session hashing runs deterministically under workerd. NOT a secret;
            // injected here, never in the committed wrangler.toml.
            HASH_SALT: "test-hmac-salt-not-a-real-secret-0123456789",
          },
        },
        wrangler: { configPath: "./wrangler.toml" },
      },
    },
  },
});
