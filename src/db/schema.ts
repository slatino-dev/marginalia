import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";

/**
 * D1 schema (drizzle-orm) — the ARCHITECTURE data model. Versioned migrations only,
 * NEVER `db push` (ARCHITECTURE anti-list). Generated with `npm run migrate:generate`
 * and applied with `npm run migrate` (wrangler d1 migrations apply), tracked in git.
 *
 * Conventions (ARCHITECTURE invariants): all ids are ULID (text, assigned app-side);
 * all times are UTC — stored as Unix epoch millis in integer columns. Money is n/a.
 * The FTS5 external-content mirror of `chunks` (`chunks_fts`) is a virtual table and
 * lives in a hand-written migration (drizzle does not model FTS5); its shape and sync
 * triggers are documented alongside this file's `chunks` table.
 *
 * SCAFFOLD STATE: the offline ingest pipeline (Phase 1) populates `documents` / `chunks`
 * / `chunks_fts`; the request path (Phase 2) writes `queries` / `retrieval_steps` /
 * `rerank_results` / `answers`; the eval cron (Phase 3) writes `eval_runs` /
 * `eval_results`; `golden_questions` is drafted in Phase 1 and label-bound in Phase 3.
 * The public Worker is read-plus-ask only and CANNOT write corpus rows (ARCHITECTURE
 * boundaries) — ingest is out-of-band.
 */

/** Minimal bootstrap marker so the migration pipeline is provable end-to-end even
 *  before any corpus is ingested (generate -> apply -> query in a test). */
export const schemaMeta = sqliteTable("schema_meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at").notNull(),
});
export type SchemaMetaRow = typeof schemaMeta.$inferSelect;

/* ────────────────────────────── Corpus (ingest) ────────────────────────────── */

/** One ingested source document (a public-domain federal accident report). */
export const documents = sqliteTable("documents", {
  /** ULID. */
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  /** The pinned, allow-listed source URL (docs/corpus-dossier.md). */
  sourceUrl: text("source_url").notNull(),
  /** sha256 hex of the fetched bytes, verified against the dossier at ingest. */
  sha256: text("sha256").notNull(),
  /** Measured page count (drives the embedding-model sizing gate). */
  pages: integer("pages").notNull(),
  /** Public-domain basis, e.g. "17 U.S.C. 105". */
  licenseNote: text("license_note").notNull(),
  createdAt: integer("created_at").notNull(),
});
export type DocumentRow = typeof documents.$inferSelect;
export type DocumentInsert = typeof documents.$inferInsert;

/**
 * A structure-aware ~400-token chunk of a document, with a section path, page anchors,
 * and an optional structural header. `chunks_fts` (FTS5 external-content, hand-written
 * migration) mirrors `text` for the BM25 lane, keyed on this table's implicit rowid.
 */
export const chunks = sqliteTable(
  "chunks",
  {
    /** ULID. */
    id: text("id").primaryKey(),
    documentId: text("document_id")
      .notNull()
      .references(() => documents.id),
    /** Ordinal position of the chunk within its document. */
    seq: integer("seq").notNull(),
    /** Human-readable section path, e.g. "Chapter IV > Findings > 4.2". */
    sectionPath: text("section_path").notNull(),
    pageStart: integer("page_start").notNull(),
    pageEnd: integer("page_end").notNull(),
    /** The chunk text — the audit-panel source passage and the FTS5 content source. */
    text: text("text").notNull(),
    /** Structural header prepended for retrieval context (the flagship experiment
     *  contrasts this with an LLM-contextual header; see docs/eval-spec.md). */
    structuralHeader: text("structural_header"),
    tokenCount: integer("token_count").notNull(),
  },
  (t) => [index("chunks_document_id_idx").on(t.documentId)],
);
export type ChunkRow = typeof chunks.$inferSelect;
export type ChunkInsert = typeof chunks.$inferInsert;

/* ──────────────────────────── Request-path traces ──────────────────────────── */

/** One asked question => one row + a complete trace (ARCHITECTURE invariant). */
export const queries = sqliteTable(
  "queries",
  {
    /** ULID. */
    id: text("id").primaryKey(),
    /** Salted, rotating, non-PII session token hash — never a raw IP or id. */
    sessionHash: text("session_hash").notNull(),
    question: text("question").notNull(),
    /** agentic | single | retrieval_only | cached. */
    mode: text("mode").notNull(),
    /** Planner decomposition JSON (null for single-pass / retrieval-only). */
    planJson: text("plan_json"),
    latencyMs: integer("latency_ms"),
    /** Estimated neurons debited (telemetry; the DO holds the authoritative ledger). */
    neuronsEst: integer("neurons_est"),
    /** ok | a typed error code (ARCHITECTURE error taxonomy). */
    outcome: text("outcome").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [index("queries_created_at_idx").on(t.createdAt)],
);
export type QueryRow = typeof queries.$inferSelect;
export type QueryInsert = typeof queries.$inferInsert;

/** Per-lane retrieval candidates for a query (the visible retrieval trace). */
export const retrievalSteps = sqliteTable(
  "retrieval_steps",
  {
    /** ULID. */
    id: text("id").primaryKey(),
    queryId: text("query_id")
      .notNull()
      .references(() => queries.id),
    /** Which agentic step produced this candidate (1-based; 1 for single-pass). */
    stepN: integer("step_n").notNull(),
    subQuery: text("sub_query").notNull(),
    /** bm25 | dense. */
    lane: text("lane").notNull(),
    rank: integer("rank").notNull(),
    chunkId: text("chunk_id").notNull(),
    score: real("score").notNull(),
  },
  (t) => [index("retrieval_steps_query_id_idx").on(t.queryId)],
);
export type RetrievalStepRow = typeof retrievalSteps.$inferSelect;
export type RetrievalStepInsert = typeof retrievalSteps.$inferInsert;

/** Reranker output over the fused candidate set for a query. */
export const rerankResults = sqliteTable(
  "rerank_results",
  {
    /** ULID. */
    id: text("id").primaryKey(),
    queryId: text("query_id")
      .notNull()
      .references(() => queries.id),
    chunkId: text("chunk_id").notNull(),
    score: real("score").notNull(),
    /** 1 if this chunk survived into the top-k context, else 0. */
    kept: integer("kept").notNull(),
  },
  (t) => [index("rerank_results_query_id_idx").on(t.queryId)],
);
export type RerankResultRow = typeof rerankResults.$inferSelect;
export type RerankResultInsert = typeof rerankResults.$inferInsert;

/** The synthesized answer for a query, with bound citations and config provenance. */
export const answers = sqliteTable(
  "answers",
  {
    /** ULID. */
    id: text("id").primaryKey(),
    queryId: text("query_id")
      .notNull()
      .references(() => queries.id),
    text: text("text").notNull(),
    /** Model id (config, recorded per answer — no `latest` pins). */
    model: text("model").notNull(),
    /** Hash over model id + prompt version, so the eval series survives model swaps. */
    configHash: text("config_hash").notNull(),
    /** Resolved inline citation bindings (marker -> chunk_id + span) as JSON. */
    citationsJson: text("citations_json").notNull(),
    ttftMs: integer("ttft_ms"),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [index("answers_query_id_idx").on(t.queryId)],
);
export type AnswerRow = typeof answers.$inferSelect;
export type AnswerInsert = typeof answers.$inferInsert;

/* ─────────────────────────────────── Evals ─────────────────────────────────── */

/** The >=60-question golden set. `expectedChunkIds` is null until Phase 3 labeling. */
export const goldenQuestions = sqliteTable("golden_questions", {
  /** ULID. */
  id: text("id").primaryKey(),
  question: text("question").notNull(),
  /** JSON array of chunk ids; null until ingest fixes chunk boundaries (Phase 3). */
  expectedChunkIds: text("expected_chunk_ids"),
  /** Author's notes on what a correct answer must contain (drafted Phase 1). */
  expectedAnswerNotes: text("expected_answer_notes").notNull(),
  createdAt: integer("created_at").notNull(),
});
export type GoldenQuestionRow = typeof goldenQuestions.$inferSelect;
export type GoldenQuestionInsert = typeof goldenQuestions.$inferInsert;

/** One nightly/RC eval run over a suite; the eval tab reads only committed rows. */
export const evalRuns = sqliteTable(
  "eval_runs",
  {
    /** ULID. */
    id: text("id").primaryKey(),
    ranAt: integer("ran_at").notNull(),
    /** retrieval | faithfulness | ablation. */
    suite: text("suite").notNull(),
    /** Config provenance so the time-series survives model/prompt swaps honestly. */
    configHash: text("config_hash").notNull(),
    /** Aggregate metrics JSON (hit-rate@k, MRR, faithfulness score, ...). */
    metricsJson: text("metrics_json").notNull(),
  },
  (t) => [index("eval_runs_ran_at_idx").on(t.ranAt)],
);
export type EvalRunRow = typeof evalRuns.$inferSelect;
export type EvalRunInsert = typeof evalRuns.$inferInsert;

/** Per-question scores within an eval run. */
export const evalResults = sqliteTable(
  "eval_results",
  {
    /** ULID. */
    id: text("id").primaryKey(),
    runId: text("run_id")
      .notNull()
      .references(() => evalRuns.id),
    questionId: text("question_id")
      .notNull()
      .references(() => goldenQuestions.id),
    /** Per-question scores JSON (rank of first hit, judge verdict, ...). */
    scoresJson: text("scores_json").notNull(),
  },
  (t) => [index("eval_results_run_id_idx").on(t.runId)],
);
export type EvalResultRow = typeof evalResults.$inferSelect;
export type EvalResultInsert = typeof evalResults.$inferInsert;

/* ─────────────────────────── Feedback + admin audit ────────────────────────── */

/** Public "flag this citation" feedback — enum verdict + length-capped note, no PII. */
export const feedback = sqliteTable(
  "feedback",
  {
    /** ULID. */
    id: text("id").primaryKey(),
    queryId: text("query_id")
      .notNull()
      .references(() => queries.id),
    /** The citation marker being flagged. */
    marker: text("marker").notNull(),
    /** Enum verdict (e.g. unsupported | wrong_passage | other). */
    verdict: text("verdict").notNull(),
    /** Optional length-capped note (Zod-validated at the boundary; no PII). */
    note: text("note"),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [index("feedback_query_id_idx").on(t.queryId)],
);
export type FeedbackRow = typeof feedback.$inferSelect;
export type FeedbackInsert = typeof feedback.$inferInsert;

/**
 * [SECURITY/Opus] Append-only admin audit trail (ARCHITECTURE "Admin/ingest
 * isolation"): a who/what/when record on every privileged action (ingest run, trace
 * redaction, feedback moderation, eval-config change). Never updated or deleted.
 */
export const adminAudit = sqliteTable(
  "admin_audit",
  {
    /** ULID. */
    id: text("id").primaryKey(),
    /** The admin actor (an opaque admin id, never a raw credential). */
    actor: text("actor").notNull(),
    /** The action performed, e.g. "ingest_run" | "trace_redact". */
    action: text("action").notNull(),
    /** The affected row/target id (nullable for account-scoped actions). */
    targetId: text("target_id"),
    ts: integer("ts").notNull(),
    /** Free-text reason/justification for the action. */
    reason: text("reason"),
  },
  (t) => [index("admin_audit_ts_idx").on(t.ts)],
);
export type AdminAuditRow = typeof adminAudit.$inferSelect;
export type AdminAuditInsert = typeof adminAudit.$inferInsert;
