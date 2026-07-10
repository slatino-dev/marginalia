/**
 * Marginalia tracking plan as code — the single source of truth for analytics events.
 * Seeded from ~/.claude/templates/tracking-plan-starter.ts and tailored to Marginalia.
 *
 * Rules (PRODUCT & GROWTH SYSTEM): object_action naming, past tense, snake_case.
 * Properties carry context; do NOT mint a new event per variant. New/changed events are
 * PR-reviewed like migrations; renames are breaking changes. NO PII and NO raw question
 * text in properties — enforced here in the schema (question text lives only in D1
 * traces, never in analytics; ARCHITECTURE "Analytics and trace retention").
 *
 * SCAFFOLD STATE: this is the typed plan only. Wiring `capture` to PostHog uses the
 * public project key (client-side, non-secret) and lands with the SPA in Phase 2.
 */
import { z } from "zod";

// ————— shared property schemas —————
const source = z.enum(["organic", "referral", "launch", "docs", "ai_citation", "direct"]);

/** How a question was posed. Presets are byte-identical cached full-trace replays. */
const questionKind = z.enum(["preset", "novel"]);

/** Which degrade rung served the answer (ARCHITECTURE degrade ladder). The demo never
 *  goes dark; this records which mode was live so the funnel is read honestly. */
const answerMode = z.enum(["agentic", "single", "retrieval_only", "cached"]);

// ————— the event registry —————
export const events = {
  // ————— Acquisition —————
  landing_viewed: z.object({
    source,
    utm_campaign: z.string().optional(),
    referrer_domain: z.string().optional(), // domain only, never a full URL with tokens
  }),

  // ————— Activation funnel (PRD) —————
  // demo_session_started -> question_asked -> answer_completed ->
  //   citation_audit_opened (ACTIVATION) -> trace_expanded / answer_shared

  demo_session_started: z.object({
    source,
  }),

  question_asked: z.object({
    kind: questionKind,
    /** Opaque query id (ULID) — the join key to the D1 trace; NOT the question text. */
    query_id: z.string(),
  }),

  answer_completed: z.object({
    kind: questionKind,
    query_id: z.string(),
    /** Which degrade rung produced this answer. */
    mode: answerMode,
    /** Time-to-first-token in ms (guardrail metric: <1s cached, <6s novel). */
    ttft_ms: z.number().nonnegative(),
    /** Count of citation markers that resolved to a source passage. */
    citations_resolved: z.number().int().nonnegative(),
    /** Count of markers stripped because they failed resolution (honest metric). */
    citations_unresolved: z.number().int().nonnegative(),
  }),

  // ————— INSTRUMENT ZERO — the activation event —————
  // A visitor opens a citation's audit panel (source passage + full retrieval
  // provenance) AFTER receiving a completed answer — the visitor performing the
  // product's thesis (checking the work). Unambiguous in PostHog: query id + marker +
  // ms-since-answer. NO question text, NO PII.
  citation_audit_opened: z.object({
    query_id: z.string(),
    /** The citation marker whose audit panel was opened (e.g. "1"). */
    marker: z.string(),
    /** Milliseconds from answer completion to opening the audit (engagement latency). */
    ms_since_answer: z.number().nonnegative(),
    /** Whether this answer came from a preset replay or a novel run. */
    kind: questionKind,
  }),

  // ————— Post-activation engagement —————
  trace_expanded: z.object({
    query_id: z.string(),
  }),

  answer_shared: z.object({
    query_id: z.string(),
  }),

  citation_flagged: z.object({
    query_id: z.string(),
    marker: z.string(),
    /** Enum verdict only; the free-text note is NEVER sent to analytics (D1 only). */
    verdict: z.enum(["unsupported", "wrong_passage", "other"]),
  }),

  // ————— Honesty guardrails as events —————
  // The degrade ladder engaging is a tracked product signal, not a hidden failure.
  degrade_mode_engaged: z.object({
    /** The rung now serving the demo. */
    mode: answerMode,
    /** Whether a faithfulness-shard night's larger eval reservation caused it. */
    shard_night: z.boolean(),
  }),

  // ————— Eval tab (content marketing surface) —————
  eval_tab_viewed: z.object({
    source,
  }),
} as const;

export type EventName = keyof typeof events;
export type EventProps<E extends EventName> = z.infer<(typeof events)[E]>;

// ————— the only track entrypoint —————
// Wire `capture` to PostHog when the SPA lands (Phase 2), using the PUBLIC project key
// (non-secret). identify at first touch; UTM/referrer persisted; bot filtering + a
// minimal-interaction heuristic define the "human session" denominator (PRD secondary
// metric). No string-literal track() calls anywhere — always through this typed door.
export function track<E extends EventName>(event: E, props: EventProps<E>): void {
  const parsed = events[event].parse(props); // throws on schema drift & PII leaks
  // posthog.capture(event, parsed);
  void parsed;
}
