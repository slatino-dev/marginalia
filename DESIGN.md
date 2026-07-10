# DESIGN.md — Marginalia (Signal Path, Rubric override)

> Per-project design memory, written BEFORE component code (Design Loop step 3).
> Global rules: "FRONTEND DESIGN SYSTEM" section in `~/.claude/CLAUDE.md`.
> Brief (step 1): `DESIGN-BRIEF.md`. This file is steps 2-3 (research + system).
>
> **Ownership:** Conduit CREATED the lab-wide Signal Path token base. Marginalia, the
> flagship design piece, RATIFIES/HARDENS that base rather than choosing a second type
> pairing. `src/styles/theme.css` carries the ratified `[LAB BASE]` block verbatim and a
> `[MARGINALIA OVERRIDE]` block that replaces ONLY the accent (Rubric vermilion) and adds
> the annotated-page display-flourish tokens. Extraction of `[LAB BASE]` to a shared
> package happens when a third sibling consumes it; the two blocks stay cleanly separable.

## Aesthetic Direction
- **Name**: Signal Path — professional audio/routing hardware made digital.
- **Three adjectives**: precise, calm-dense, instrumented.
- **Rationale**: Marginalia is a reading instrument that proves its answers. The routing
  metaphor becomes the *citation thread*: a vermilion cable runs from a claim in the
  answer to its source in the right-margin note. Live telemetry (per-lane candidate
  counts, BM25/dense/fusion/rerank scores, TTFT) are first-class design objects with
  tabular-nums, so the screen reads as a real system, not a chat bubble with a sources
  accordion.
- **Alternates considered** (from the brief, if Signal Path fails review at step 6):
  *Blueprint* (drafting linework, draftsman callouts) and *Terminal Luxe* (phosphor
  heritage, monospace telemetry). Not chosen: Signal Path already carries the live-trace
  differentiator that is the product's whole thesis.

## Token Source
- `@theme` file: `src/styles/theme.css` (Tailwind v4 CSS-first, single source of truth).
- Compiled proof: `public/tokens.css` (generated via `npm run build:css`; do not hand-edit).
- Rule: components consume **semantic tokens only** (`var(--color-text-1)`, etc.). No raw
  hex, no magic px, no inline durations. Light mode is a token remap on the semantic tier
  (`:root[data-theme="light"]`), never per-component overrides.
- Tailwind note: themeable semantic tokens use `@theme inline { --x: var(--x) }` so
  utilities reference the live `:root` var and re-theme with it; base scales use
  `@theme static` so a shared base never tree-shakes.

## Typography & Icons
- **Display**: Bricolage Grotesque (OFL 1.1) — ratified lab display face. Headings only.
- **Body/UI**: Geist (OFL 1.1) — ratified. Neutral, tabular figures, telemetry legibility.
- **Mono/data**: Geist Mono (OFL 1.1) — ratified. Candidate counts, scores, page anchors,
  latency; `font-variant-numeric: tabular-nums` on all data.
- **Reading column** (Marginalia addition, `--font-reading`): Source Serif 4 (OFL 1.1) —
  a transitional serif with genuine character for the ANSWER BODY ONLY (the annotated
  manuscript page). It never touches UI chrome or data; those stay on the Geist pairing.
  This is not a second *system* pairing (the ban) — it is one editorial face scoped to the
  reading measure, the way a book sets body text in a serif and running heads in sans.
- **Loading strategy** (Phase 2 SPA build): self-host all four variable woff2 under
  `public/fonts/`, `preload` display + reading + mono, `font-display: swap`, with
  size-adjusted metric fallbacks (the `"… Fallback"` families are already named in the
  font tokens) to hold CLS at zero. The token sheet falls back to system faces where the
  woff2 is not yet vendored; the token *decision + licenses* are locked here.
- **Icons**: ONE system — Phosphor (Regular UI / Fill active / Duotone illustration). No
  emoji as UI icons. Tree-shaken imports; `aria-hidden` decorative, `aria-label`
  interactive. (Wired in Phase 2.)

## Color
- **Neutral**: cool slate, hue 240, 11-step OKLCH (ratified base). Dark-first.
- **Accent (Marginalia)**: **Rubric vermilion, hue 40**, 11-step OKLCH, working center
  `oklch(0.66 0.19 40)` at step 500; the on-dark accent / citation thread is step 400.
  From *rubrication*, the medieval red-ink margin annotation that IS marginalia.
- **Danger**: shifted **cooler + darker (hue ~22)** so the vermilion accent never reads as
  failure. Because rubric (40) and danger (22) sit only ~18deg apart, **hue is NOT a safe
  separator**: the citation thread is distinguished from an error highlight by *lightness
  and chroma*, and a **deuteranopia + protanopia simulation on accent-400 vs danger-400 is
  a required Design-Loop step-5 check** before the retrieval view ships.
- **Lab coherence** (2026-07-08 pass): the warm arc is Marginalia (~40), Crucible (~55),
  Demiurge (~80), each ≥15-25deg apart; Conduit vacated to signal cyan (~205). Rubric
  stays distinct-but-adjacent to Crucible's ember; the CVD check above is the load-bearing
  separation test.
- **Contrast**: `scripts/check-contrast.mjs` (`npm run check:contrast`) parses the token
  file, resolves var() chains per theme scope, converts OKLCH -> sRGB -> WCAG luminance,
  and asserts AA for all semantic text/bg pairs in BOTH themes. **All 13 required pairs
  pass in dark and light** this session (border dividers are intentionally sub-3:1 subtle
  1px rules, reported advisory).

## Motion Language
- Tools: CSS first (~80%); Motion for React for the SPA state; no GSAP/Lenis in v0.5.
- **The ONE orchestrated moment** (deferred to Phase 3 polish per BUILD-PLAN; Phase 2 ships
  a STATIC trace diagram): the retrieval trace draws itself as a signal path — the query
  splits into sub-query lanes, BM25 and dense channels light up with candidate counts, the
  paths converge through fusion + rerank nodes, and surviving passages snap into the margin
  as the answer streams token by token. Transform/opacity only; all timing from motion
  tokens.
- Secondary micro-moment (same vocabulary, not a new one): opening a citation sweeps the
  `--color-highlight` across the source passage in the audit panel.
- **Reduced-motion**: global collapse (`@media prefers-reduced-motion`) swaps the trace for
  an instant static route diagram; every shimmer/caret/pulse pauses. On EVERY animation.

## Component Conventions
- Semantic-token-only consumption; role-assigned radii (chips `xs`, inputs `sm`,
  buttons/markers `md`, panels `lg`, hero/reading module `xl`) — never uniform radius.
- **The annotated page** (`--measure-reading` 66ch column + `--measure-margin` 16rem note
  gutter at >=1024px): citations render as LIVE MARGIN NOTES; the vermilion citation
  thread binds claim to note. **Mobile (390px) is a designed activation path, not a
  fallback**: an inline citation opens a bottom-sheet audit panel with the same provenance
  (source passage highlighted + document/page anchor + that chunk's full retrieval trace).
  Verified at the mandatory 390px screenshot pass (Phase 2).
- **Five designed states per view** (brief constraint): loading = layout-matched skeleton
  (zero CLS); empty = onboarding (preset questions as patch-cable jacks waiting to connect);
  error = typed error surfaced honestly; degraded = designed state with honest copy
  ("running retrieval-only, generation paused to protect the shared model budget"), never
  an error toast; populated = the annotated page. All rendered from real D1 rows.

## Anti-List (project-specific, on top of global bans)
- No purple/indigo anywhere (accent is vermilion; cyan belongs to Conduit).
- No gradient fills on data surfaces — telemetry reads as flat instrument panels.
- No three-identical-cards row; the composition is a vertical manuscript column + margin,
  not a card grid.
- The highlight is a low-alpha sweep, never a solid fill that fights the reading column.
- Charts: Recharts default `#8884d8` is banned; use `--chart-*` tokens only; every number
  resolves to a real `eval_run` / trace row (no fake-precision stats).

## Differentiation from Conduit (sibling live-trace demo)
Both are query-trace-into-cited-answer demos, so the difference is made experiential:
Marginalia's hero is a **vertical manuscript reading column with a vermilion citation
thread into a right-margin note gutter**, over a **BM25 <-> dense fusion + rerank
schematic** — a reading instrument. Conduit's is a **horizontal rack of cable segments in
signal cyan** with a federal rate-budget gauge — data infrastructure. Different color
(vermilion vs cyan), layout axis (vertical page+margin vs horizontal rack), hero object
(margin note vs rate gauge). Verified at the 390/768/1440px screenshot pass: the two
demos must not travel as lookalike images.

## References
- **Manuscript / critical editions** (annotated pages, marginalia, rubrication) — the
  reading column + margin note + red-ink accent as the literal name made visible.
- **Vercel/observability dashboards** — mono numerics, score/latency stamps as first-class
  objects; data-as-typography discipline for the retrieval telemetry.
- **Teenage Engineering** product UI — calm-dense instrument-panel legibility for the
  retrieval schematic.

## Voice
- Verbs on buttons ("Ask", "Audit citation", "Expand trace", "Share answer"). Sentence
  case. No blame in errors — state cause + recovery ("Generation paused to protect the
  shared model budget — showing retrieval-only").
- Consistent terms: "citation", "audit", "passage", "retrieval trace", "margin note",
  "budget", "degrade mode".
- Seed data is real (real reports, real accession/page anchors), never Lorem/John Doe.
- No dashes in prose copy; write plainly like a person.

## Chart Palettes (eval tab)
- Categorical (max 6, CVD-aware, hue-separated with lightness stagger): `--chart-cat-1..6`
  (vermilion / cyan / green / amber / violet / magenta; series 1 = the Rubric accent, so
  eval charts read as one system with the demo). The hybrid/dense/BM25 ablation maps to
  cat-1/2/3.
- Sequential: `--chart-seq-1..5` (single-hue vermilion intensity). Diverging:
  `--chart-div-neg` (below-target vermilion) <-> `--chart-div-mid` (neutral) <->
  `--chart-div-pos` (above-target cyan). Gridlines `--chart-grid` (low-contrast).
- Rules (dataviz-system): zero-baseline bars, direct labels over legends, title the
  insight ("Hybrid beats dense-only by N points on this corpus"), tabular-nums
  right-aligned in TanStack Table.
