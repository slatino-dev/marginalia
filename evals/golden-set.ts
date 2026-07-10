/**
 * The golden question set — DRAFT (Phase 1). Question text + `expectedAnswerNotes` only;
 * `expectedChunkIds` is deliberately absent here and is label-bound in Phase 3 AFTER
 * ingest fixes chunk boundaries (docs/eval-spec.md). Drafting starts now so the eval
 * long pole (>=7 consecutive nightly runs by 2026-09-08) begins before ingest lands.
 *
 * Authoring rules (docs/eval-spec.md): answerable from the corpus alone; a spread of
 * lookup / synthesis / cross-document difficulty; notes grounded in the established
 * findings of these public reports; no trick questions (the metric passes on process +
 * honesty, so easy-question gaming gains nothing). This is a STARTER batch toward the
 * >=60 target; each `sourceDocuments` entry is a labeling aid, not a schema column.
 *
 * These notes reflect the widely documented findings of each commission/board; they are
 * verified against those reports at Phase 1 ingest and corrected there if any drifts.
 */

export interface GoldenQuestionDraft {
  question: string;
  /** What a correct answer MUST contain (key claims + which report supports them). */
  expectedAnswerNotes: string;
  /** Which corpus document(s) the answer draws on (labeling aid; not persisted as-is). */
  sourceDocuments: string[];
}

export const goldenSetDraft: GoldenQuestionDraft[] = [
  // ── Challenger / Rogers Commission ──────────────────────────────────────────
  {
    question: "What was the physical cause of the Challenger accident?",
    expectedAnswerNotes:
      "Failure of the pressure seal in the aft field joint of the right Solid Rocket Booster: the O-rings failed to seal, letting hot combustion gases blow by and burn through, leading to structural failure of the external tank. Must name the O-ring/field-joint seal failure, not a generic explosion.",
    sourceDocuments: ["Rogers Commission Report"],
  },
  {
    question: "How did the launch-day temperature contribute to the Challenger failure?",
    expectedAnswerNotes:
      "The launch occurred in unusually cold conditions (well below any previous launch). Low temperature reduced the O-rings' resiliency so they could not seal the joint quickly enough, allowing blow-by. Must connect cold temperature to loss of O-ring sealing capability.",
    sourceDocuments: ["Rogers Commission Report"],
  },
  {
    question: "What decision-making or communication failure did the Rogers Commission identify?",
    expectedAnswerNotes:
      "A flawed launch-decision process: engineering concerns about cold-temperature O-ring performance (notably from Thiokol engineers) were raised but not effectively communicated to or heeded by senior decision-makers, and the objection was overridden the night before launch. Must identify a management/communication failure around the O-ring concern, not just the hardware.",
    sourceDocuments: ["Rogers Commission Report"],
  },
  {
    question: "What did Richard Feynman demonstrate about the O-rings?",
    expectedAnswerNotes:
      "He showed that an O-ring loses resilience at low temperature by immersing a sample in ice water and showing it did not spring back. Must capture the cold-temperature loss-of-resilience demonstration.",
    sourceDocuments: ["Rogers Commission Report"],
  },
  {
    question: "What is the SRB field joint and why was it central to the accident?",
    expectedAnswerNotes:
      "The joint between Solid Rocket Booster segments, sealed by O-rings. Under ignition pressure the joint rotates/opens slightly, and the O-rings must seat quickly to seal it; cold reduced that ability, so the joint leaked. Must describe the segmented-joint + O-ring sealing mechanism.",
    sourceDocuments: ["Rogers Commission Report"],
  },

  // ── Columbia / CAIB ─────────────────────────────────────────────────────────
  {
    question: "What was the physical cause of the Columbia accident?",
    expectedAnswerNotes:
      "During ascent a piece of foam insulation from the external tank's bipod ramp struck and breached the Reinforced Carbon-Carbon (RCC) on the left wing leading edge; on reentry, superheated gases entered the breach and destroyed the wing structure. Must name the foam strike on the wing leading edge (RCC) and reentry gas intrusion.",
    sourceDocuments: ["Columbia Accident Investigation Board Report"],
  },
  {
    question: "What is RCC and what role did it play in the Columbia loss?",
    expectedAnswerNotes:
      "Reinforced Carbon-Carbon panels protect the wing leading edge from reentry heating. The foam strike breached an RCC panel, and that breach let hot plasma into the wing on reentry. Must connect RCC leading-edge breach to reentry heat ingress.",
    sourceDocuments: ["Columbia Accident Investigation Board Report"],
  },
  {
    question: "What organizational causes did the CAIB identify beyond the foam strike?",
    expectedAnswerNotes:
      "Cultural and organizational root causes: normalization of deviance around repeated foam shedding, schedule/budget pressure, a weakened and ineffective safety organization, and barriers to communicating and acting on safety concerns. Must identify culture/organization (not only the physical foam cause).",
    sourceDocuments: ["Columbia Accident Investigation Board Report"],
  },
  {
    question: "How did the CAIB relate Columbia's organizational causes to the Challenger accident?",
    expectedAnswerNotes:
      "The board found echoes of Challenger: both accidents had organizational/cultural roots (accepting known anomalies as normal, muted safety concerns, management pressure), not merely isolated technical faults. Must draw the organizational parallel between the two accidents.",
    sourceDocuments: ["Columbia Accident Investigation Board Report", "Rogers Commission Report"],
  },
  {
    question: "What was the history of foam shedding before the Columbia accident?",
    expectedAnswerNotes:
      "Foam loss from the external tank had occurred on numerous prior flights and had come to be treated as an accepted, in-family maintenance issue rather than a safety-of-flight risk. Must state that foam shedding was a known, recurring, and normalized event before the loss.",
    sourceDocuments: ["Columbia Accident Investigation Board Report"],
  },

  // ── Apollo 13 Review Board ──────────────────────────────────────────────────
  {
    question: "What caused the Apollo 13 in-flight emergency?",
    expectedAnswerNotes:
      "An explosion/rupture of oxygen tank no. 2 in the service module: damaged internal wiring insulation ignited when the tank's fans were energized during a routine cryo stir, causing the tank to fail and cripple the service module. Must name the SM oxygen-tank rupture from damaged internal wiring.",
    sourceDocuments: ["Apollo 13 Review Board Report"],
  },
  {
    question: "Why was the Apollo 13 oxygen tank vulnerable before launch?",
    expectedAnswerNotes:
      "The tank had a history of mishandling (a drop) and its thermostatic protective switches were not rated for the ground-support voltage used, so during pre-flight detanking the heaters overheated and damaged the wire insulation inside the tank, setting up the later short and ignition. Must connect the pre-flight damage/wrong-voltage switches to the compromised wiring.",
    sourceDocuments: ["Apollo 13 Review Board Report"],
  },
  {
    question: "How did the crew address the carbon-dioxide buildup after the accident?",
    expectedAnswerNotes:
      "They improvised an adapter to use the command module's square lithium-hydroxide CO2 canisters in the lunar module's round receptacles (the 'mailbox'), because the LM scrubbers could not keep up with three crew. Must describe adapting CM CO2 canisters to the LM system.",
    sourceDocuments: ["Apollo 13 Review Board Report"],
  },

  // ── Three Mile Island / Kemeny Commission ───────────────────────────────────
  {
    question: "What initiated and worsened the Three Mile Island accident?",
    expectedAnswerNotes:
      "After a turbine trip, a pilot-operated relief valve (PORV) stuck open, causing a loss of reactor coolant; operators, misreading indications (believing the valve had closed and the system was full), reduced emergency coolant flow, uncovering and partially melting the core. Must name the stuck-open PORV loss-of-coolant plus the operator response that worsened it.",
    sourceDocuments: ["Kemeny Commission Report"],
  },
  {
    question: "What did the Kemeny Commission conclude about operator training and human factors?",
    expectedAnswerNotes:
      "Operators misinterpreted the plant's state and took incorrect actions; the Commission found inadequate training, poor control-room/instrument design, and human-factors deficiencies as central, calling for major improvements. Must identify training/human-factors inadequacy as a root finding.",
    sourceDocuments: ["Kemeny Commission Report"],
  },
  {
    question: "What was the Kemeny Commission's central conclusion about the nuclear industry's approach to safety?",
    expectedAnswerNotes:
      "It concluded that the fundamental problems were with people, organizations, and procedures (a 'mindset' preoccupied with equipment/hardware) rather than equipment alone, and it called for fundamental changes including reform of the regulator. Must capture the people/organization-over-equipment 'mindset' finding.",
    sourceDocuments: ["Kemeny Commission Report"],
  },

  // ── Cross-document synthesis ─────────────────────────────────────────────────
  {
    question: "What organizational failure recurs across both the Challenger and Columbia accidents?",
    expectedAnswerNotes:
      "Normalization of deviance: a known anomaly (O-ring erosion; foam shedding) was repeatedly observed and accepted as normal, while safety concerns were not escalated or acted on, under schedule/management pressure. Must identify the shared normalization-of-deviance / silenced-concern pattern across both.",
    sourceDocuments: ["Rogers Commission Report", "Columbia Accident Investigation Board Report"],
  },
  {
    question: "Across these reports, what recurring theme about prior warnings appears?",
    expectedAnswerNotes:
      "In each case, data or engineers flagged the hazard beforehand (cold-temperature O-ring risk, repeated foam strikes, TMI valve/indication issues) but the warnings were not effectively acted upon. Must generalize that hazards were foreseeable/flagged yet not heeded, citing at least two accidents.",
    sourceDocuments: [
      "Rogers Commission Report",
      "Columbia Accident Investigation Board Report",
      "Kemeny Commission Report",
    ],
  },
  {
    question: "Which of these accidents involved a partial core meltdown, and what was the mechanism?",
    expectedAnswerNotes:
      "Three Mile Island. A stuck-open PORV drained coolant while operators, misreading the situation, throttled back emergency cooling, uncovering the core and causing partial fuel melting. Must identify TMI specifically and the loss-of-coolant + operator-action mechanism.",
    sourceDocuments: ["Kemeny Commission Report"],
  },
  {
    question: "In which accidents was a component's behavior at low temperature a decisive factor, and in which was high-temperature gas intrusion decisive?",
    expectedAnswerNotes:
      "Low temperature was decisive for Challenger (cold reduced O-ring sealing). High-temperature gas intrusion was decisive for Columbia (reentry plasma entered the breached wing leading edge). Must correctly map cold->Challenger and reentry heat->Columbia.",
    sourceDocuments: ["Rogers Commission Report", "Columbia Accident Investigation Board Report"],
  },
];

/** Count of drafted questions (target: >= 60; this is the starter batch). */
export const GOLDEN_DRAFT_COUNT = goldenSetDraft.length;
