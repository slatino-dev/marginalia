# Eval spec — Marginalia public eval tab

> The golden set, scoring, and the nightly harness. This is the schedule's critical-path
> long pole (PRD success metric: >=7 consecutive nightly `eval_run` rows by 2026-09-08).
> Questions are DRAFTED in Phase 1 so the long pole starts before ingest lands; the
> `expected_chunk_ids` labeling is GATED behind the Phase 1 ingest fixing chunk
> boundaries, and happens in Phase 3.
>
> **Status: authoring rules set (Phase 0/1). The 60+ questions are drafted next (question
> text + `expected_answer_notes` only). Label-binding waits on the ingest gate.**

## The golden set (>= 60 questions over the Postmortem Library)

Stored in `golden_questions` (D1): `question`, `expected_chunk_ids` (JSON array, NULL
until Phase 3 labeling), `expected_answer_notes`.

### Question authoring rules (Phase 1 drafting)
- Every question is answerable from the corpus alone — no outside knowledge required.
- Mix of difficulty: direct fact lookup, multi-passage synthesis, and cross-document
  comparison (e.g. a failure mode common to Challenger and Columbia).
- Each question gets `expected_answer_notes`: what a correct answer MUST contain (the key
  claims and their source document), authored while reading the source, so the note is
  grounded, not guessed.
- No trick or ambiguous questions; the metric passes on process + honesty, not on an easy
  set, so easy-question gaming gains nothing.
- Spread questions across all four seed documents and across sections within each.

### Labeling `expected_chunk_ids` (Phase 3, ingest-gated)
- After Phase 1 ingest fixes chunk boundaries, read the relevant passages and record the
  chunk ids that genuinely support each question's answer.
- A re-chunking event invalidates affected labels: relabel them and record the
  `config_hash` discontinuity — never a silent series break.

## Suites (nightly cron, one handler dispatching internally)

- **retrieval** (nightly, all 60 questions): hit-rate@1, hit-rate@5, MRR. Embeds + rerank
  only, no generation (~300 neurons). Published targets the tab tracks: hit-rate@5 >= 85%,
  citation-support precision >= 90% (misses shown openly).
- **faithfulness** (20-question sentinel subset, sharded **5/night across 4 assigned
  nights** to fit the 4,000/day combined neuron ceiling): single-pass pipeline + an 8b
  LLM judge, ~2,175/night. On a shard night the demo's remaining budget is smaller and the
  degrade ladder may engage one rung earlier — stated honestly in the banner.
- **ablation**: hybrid vs dense-only vs BM25-only, plus the flagship structural-vs-LLM
  contextual-header experiment, published with OUR measured deltas on OUR corpus (never
  Anthropic's numbers as ours).

## Scoring + honesty rules
- Judge prompts are VERSIONED; the version is part of `config_hash` on every `eval_run`.
- The LLM-judge-vs-human agreement is spot-audited on the 20-question sentinel subset;
  target within 5 points (PRD primary metric part c).
- The eval tab reads ONLY committed `eval_runs` rows (ARCHITECTURE invariant); no eval runs
  on demand, ever. A "didn't run" alert fires if the nightly cron misses.
- Every number on the tab resolves to a real `eval_run` / `eval_result` row — no
  fake-precision stats (DESIGN anti-list).

## Neuron budget (inside the 4,000/day combined ceiling, reserved first)
Eval is reserved before the demo each day and runs at low-traffic hours (03:00-05:00 UTC).
Non-shard night: ~300 reserved (retrieval only). Shard night: ~2,475 reserved (retrieval +
faithfulness). Full-60 faithfulness only on release candidates, and only if the day's
remaining ceiling allows (else deferred, never paid). The budget reset is a DO alarm at
00:00 UTC, not a second cron (crons are rationed to <=1 per app; ARCHITECTURE limits).
