# Corpus dossier — the Postmortem Library

> The pinned, allow-listed source manifest for the offline ingest pipeline. Each source
> is fetched ONLY from its recorded URL and sha256-verified against this file before
> extraction (`IngestChecksumMismatch` aborts on mismatch). No visitor- or model-supplied
> URL is ever fetched. This is the SSRF + supply-chain control (ARCHITECTURE "Ingest SSRF
> and supply-chain control").
>
> **Status: STUB (Phase 0).** Sources are named below; the pinned download URLs, sha256
> checksums, and measured page counts are filled in at Phase 1 ingest, when each PDF is
> fetched once and hashed. Until every row has a real sha256 and a measured page count,
> ingest MUST NOT run against it.

## Public-domain basis

All corpus documents are works of the U.S. Government and are in the public domain under
**17 U.S.C. 105**. This project preserves attribution to the issuing body and is not
affiliated with, endorsed by, or sponsored by any of them. The corpus is factual accident
investigation material; nothing in it or derived from it is safety, engineering, or
investment advice.

## Seed sources (to be pinned + hashed at ingest)

| # | Document | Issuing body | Public-domain basis | Source URL | sha256 | Pages |
|---|---|---|---|---|---|---|
| 1 | Report of the Presidential Commission on the Space Shuttle Challenger Accident (Rogers Commission) | Presidential Commission (NASA-hosted) | 17 U.S.C. 105 | _pin at ingest_ | _hash at ingest_ | _measure_ |
| 2 | Columbia Accident Investigation Board (CAIB) Report, Vol. I | CAIB / NASA | 17 U.S.C. 105 | _pin at ingest_ | _hash at ingest_ | _measure_ |
| 3 | Report of the Apollo 13 Review Board (Cortright Report) | NASA | 17 U.S.C. 105 | _pin at ingest_ | _hash at ingest_ | _measure_ |
| 4 | Report of the President's Commission on the Accident at Three Mile Island (Kemeny Commission) | Presidential Commission | 17 U.S.C. 105 | _pin at ingest_ | _hash at ingest_ | _measure_ |

## Sizing gate (decided from MEASURED counts at ingest)

The embedding model is chosen from the measured chunk count and quality, not an estimate.
**Decision 2026-07-10: the dense lane is $0 brute-force cosine over D1-stored embeddings
(not Vectorize — paid-gated; see ARCHITECTURE), so the 5M-stored-dim Vectorize cap NO
LONGER binds corpus size.** The sizing gate is now only about embed rate (neurons) and
retrieval quality: prefer bge-m3 (1024d, best quality, cheapest embed rate) unless the
measured neuron cost or dimension pushes back. Planning estimate only (unverified):
~1,000-1,100 pages -> ~1,900 chunks at ~400 tokens, central case, ~4,400 worst-case bound;
the cosine scan cost scales linearly and stays within budget at either (benchmarked).

## Ingest invariants (recorded here, enforced in code at Phase 1)

- Fetch only from the allow-listed URL in the row above; never a redirect to another host.
- sha256 the fetched bytes and compare to this file BEFORE any extraction or embedding.
- Corpus content is immutable post-ingest: a re-ingest is a NEW document version; old
  traces still resolve their chunk ids. Any re-chunking event forces relabeling of the
  affected golden questions (a labeled `config_hash` discontinuity, never a silent break).
- D1 export does not support virtual tables: back up with DROP `chunks_fts` -> export ->
  rebuild FTS from `chunks` (runbook).
