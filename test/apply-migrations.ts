import { applyD1Migrations, env } from "cloudflare:test";

// Apply the real versioned migrations to the test D1 before any test runs. This is the
// in-process migration check: if 0000_init or 0001_chunks_fts (the FTS5 virtual table +
// triggers) do not apply cleanly, the whole suite fails here.
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
