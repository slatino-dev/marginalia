import { Hono } from "hono";
import type { Env } from "./env";
import { SECURITY_HEADERS } from "./security/headers";

/**
 * Marginalia — agentic RAG that shows its work (Cloudflare Worker, Hono).
 *
 * Phase 0 (this scaffold): a hello-world Worker exposing `/healthz`, plus the Signal
 * Path design-token sheet served as a static asset from `public/` (the Design Loop
 * proof surface). Site-wide security headers wrap every response, including error
 * bodies and the health probe.
 *
 * NOT here yet (later phases, per BUILD-PLAN): the `/ask` SSE retrieval path, the
 * `/api/*` REST surface, the admin/ingest surface, the BudgetLedger DO, and the eval
 * tab. Each arrives behind the [SECURITY/Opus] inbound stack (rate limits, CORS,
 * body cap, per-visitor + global neuron budget) before any model call is exposed.
 */
const app = new Hono<{ Bindings: Env }>();

// Site-wide security headers on every response (incl. /healthz and error bodies).
app.use("*", async (c, next) => {
  await next();
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) c.header(k, v);
});

// Central, uniform error mapping — no stack traces ever leave the Worker.
app.onError((_err, c) =>
  c.json(
    { type: "about:blank", title: "InternalError", status: 500, detail: "internal error" },
    500,
    { "Content-Type": "application/problem+json" },
  ),
);

app.get("/healthz", (c) =>
  c.json({
    status: "ok",
    service: "marginalia",
    version: "0.1.0",
    ts: new Date().toISOString(),
  }),
);

export default app;
