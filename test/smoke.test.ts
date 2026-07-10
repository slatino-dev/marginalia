import { describe, it, expect } from "vitest";
import app from "../src/index";

/**
 * Smoke test: the Worker boots and /healthz responds inside the real workerd runtime
 * (vitest-pool-workers). This is the Phase 0 "app boots" green baseline the scaffold
 * gate requires. Also asserts the site-wide security headers are present on every
 * response (including the health probe).
 */
describe("marginalia worker boot", () => {
  it("responds to GET /healthz with ok JSON", async () => {
    const res = await app.request("/healthz");
    expect(res.status).toBe(200);

    const body = (await res.json()) as { status: string; service: string };
    expect(body.status).toBe("ok");
    expect(body.service).toBe("marginalia");
  });

  it("sets site-wide security headers on every response", async () => {
    const res = await app.request("/healthz");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
    expect(res.headers.get("Content-Security-Policy")).toContain("frame-ancestors 'none'");
  });

  it("returns 404 for an unrouted path", async () => {
    const res = await app.request("/no-such-route");
    expect(res.status).toBe(404);
  });
});
