import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";

/**
 * Committed-config guards. The wrangler.toml text is injected as a binding
 * (vitest.config.ts) so a regression that weakens the deploy posture fails a test.
 */
describe("wrangler.toml posture", () => {
  const toml = env.WRANGLER_TOML_TEXT;

  it("keeps workers_dev OFF (only the intended custom domain is public)", () => {
    expect(toml).toMatch(/workers_dev\s*=\s*false/);
  });

  it("never puts HASH_SALT (a secret) in committed config", () => {
    // The salt is a Worker secret / .dev.vars value — never wrangler.toml.
    expect(toml).not.toMatch(/HASH_SALT/);
  });

  it("declares no [vars] block (nothing app-configurable ships in committed config)", () => {
    expect(toml).not.toMatch(/^\s*\[vars\]/m);
  });
});
