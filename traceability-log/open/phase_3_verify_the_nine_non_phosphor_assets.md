# [PLAN] Phase 3 --- Verify the Nine Non-Phosphor Assets

## Scope Classification

**Recommended structure:** medium-scope **phases**.

**Why not milestones:** the work does not span independent delivery increments or architectural changes.

**Why not only red-green-refactor cycles:** the work includes genuine external research and evidence classification, not
only local implementation. Short TDD-style cycles still fit inside the research and verification phases.

**Primary risk:** incorrect provenance or rights inference, not code behavior.

**Behavior-preserving constraint:** no SVG, inventory, source-code, package metadata, or runtime behavior changes.

---

# [DONE] Phase 3.1 — Lock the Evidence and Vocabulary Contract

## Current Status

Corrected against the authoritative "Corrected Evidence Model" in
`subphase_1.1_establish_the_provenance_evidence_manifest.md`:

- `provenance.match.evidenceStatus` corrected to include `partially-verified`.
- `redistribution.conclusion` corrected to `permitted`, `restricted`, `permission-required`, `undetermined` (removed the
  invalid `verified` and `risk-accepted` members).
- `releaseDecision.action` corrected to `include`, `exclude`, `pending` (removed the invalid `permitted` and
  `risk-accepted` members).
- `riskAcceptance` clarified as a nested maintainer-owned object (`rationale` + `decisionReference`), not an enum value.
- The `redistribution.status` vocabulary in `phase_1_establish_licensing_provenance_and_attribution.md` is documented as
  superseded by the corrected evidence model above.
- No manifest, SVG, inventory, or package metadata file was changed. No asset research or release decision was made.

## Goal

Establish the controlled provenance, rights, redistribution, and release-decision contract before any web research or
manifest edits.

## Scope

Read and extract rules from:

- `traceability-log/open/subphase_1.1_establish_the_provenance_evidence_manifest.md`
- `traceability-log/open/phase_1_establish_licensing_provenance_and_attribution.md`
- `traceability-log/closed/2026/07/W1/05/phase_1.1.2.3_record_phosphor_evidence.md`

Confirm the controlled values:

| Field                             | Allowed values                                                                                                                        |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `provenance.match.method`         | `exact-byte-match`, `normalized-content-match`, `structural-match`, `visual-match`, `metadata-only`, `maintainer-attestation`, `null` |
| `provenance.match.evidenceStatus` | `verified`, `partially-verified`, `unresolved`                                                                                        |
| `redistribution.conclusion`       | `permitted`, `restricted`, `permission-required`, `undetermined`                                                                      |
| `releaseDecision.action`          | `include`, `exclude`, `pending`                                                                                                       |

Also confirm these invariant rules:

- `verified` evidence must not be paired with `metadata-only` or `maintainer-attestation` alone.
- every non-null/non-default field needs a paired rationale, basis, or details string;
- `suppliedByMaintainer` remains `false` for agent-found sources (agent-led web research is allowed; release decisions
  remain maintainer-gated);
- `riskAcceptance` is a nested object (`rationale` + `decisionReference`), not an enum value, and is never invented by
  the agent;
- `releaseDecision.action: "include"` with any `redistribution.conclusion` other than `permitted` requires
  maintainer-owned risk acceptance;
- the `redistribution.status` vocabulary in `phase_1_establish_licensing_provenance_and_attribution.md` is superseded by
  the corrected evidence model in `subphase_1.1_establish_the_provenance_evidence_manifest.md`;
- `NOASSERTION` means no objective license assertion can be made, not “free to use.” SPDX uses NOASSERTION when a
  reasonable objective determination cannot be made, no attempt was made, or no information is intentionally provided.
  ([SPDX][1])

## Suggested TDD Cycle

### Red

```gherkin
Feature: Phase 3 evidence contract

Scenario: The agent records only supportable non-Phosphor provenance
  Given the Phase 3 manifest contract
  When evidence for a non-Phosphor asset is incomplete
  Then the asset must remain pending
  And the license conclusion must remain NOASSERTION or undetermined where appropriate
  And no maintainer risk acceptance may be fabricated
```

Gherkin is a good fit here because it provides structured executable-specification keywords such as `Given`, `When`, and
`Then`, which makes audit rules readable as behavior. ([Cucumber][2])

### Green

Produce a local evidence checklist for the nine assets:

- `bash`
- `csv`
- `json`
- `kotlin`
- `nushell-logo`
- `powershell`
- `python`
- `scala`
- `xml`

For each asset, track:

| Evidence field            | Purpose                                              |
| ------------------------- | ---------------------------------------------------- |
| Candidate source URL      | Where the asset may have originated                  |
| Source owner              | Official project, foundation, aggregator, or unknown |
| Match method              | Strength of comparison                               |
| Match result              | Verified or unresolved                               |
| Copyright basis           | License or attribution evidence                      |
| Trademark basis           | Brand or mark restriction evidence                   |
| Redistribution conclusion | Whether project redistribution is supportable        |
| Release blocker           | Why `pending` remains necessary                      |

### Refactor

Normalize the evidence checklist into a table that can be reused for:

- manifest field updates;
- traceability findings;
- final status summary.

## Acceptance Criteria

- All controlled vocabularies are confirmed before editing.
- No asset can move to `permitted` without explicit supporting rights evidence.
- No `risk-accepted` value is introduced.
- Missing or weak evidence maps to `pending`, `undetermined`, or `NOASSERTION`.
- The agent has a consistent evidence table for all nine assets.

## Non-Goals

- Do not edit the manifest yet.
- Do not make release decisions.
- Do not infer license terms from “open source” status alone.
- Do not treat trademark permission as equivalent to copyright permission.

## Suggested Execution Order

Run this first. It gates every later phase.

---

# [DONE] Phase 3.2 — Research, Match, and Classify the Nine Assets

## Current Status

[DONE] External source research was completed for all nine non-Phosphor assets. The research produced candidate
provenance records, but it did not edit the manifest and did not change any SVG asset bytes.

The strongest findings are:

- `bash` and `scala` have SVG Repo metadata in the local files and exact SVG Repo candidate pages.
- `python` and `kotlin` have official brand-asset leads but still require raw SVG comparison and rights review before
  manifest inclusion.
- `powershell` has project/Wikimedia/PowerShell Gallery candidates, but Microsoft brand-asset rules make redistribution
  a maintainer decision.
- `nushell-logo` remains capped at `visual-match` because the local file is a VTracer auto-trace.
- `json` matches the known JSON logo family, but exact vector lineage and trademark status remain unresolved.
- `csv` and `xml` have plausible SVG Repo candidates, but exact local source pages are not verified.

No manifest, SVG, inventory, package metadata, or source-code files were changed.

## Goal

Find the strongest supportable upstream evidence for each non-Phosphor asset and classify provenance, copyright,
trademark, and redistribution status.

## Scope

Research all nine assets using batch sequencing, but record results in a single normalized evidence table.

The batch order should stay close to the original plan because it reflects risk profile:

1. Batch A — brand-controlled assets;
2. Batch B — project and community marks;
3. Batch C — generic or aggregator-sourced icons;
4. cross-batch corrections.

## Phase 2.1 — Batch A: Brand-Controlled Assets

### Assets

- `powershell`
- `python`
- `kotlin`
- `scala`

### Goal

Prioritize official project, foundation, company, or language-community sources before aggregator sources.

### Scope

Investigate likely official or semi-official sources:

- PowerShell repository assets or Microsoft media references;
- Python trademark and logo sources;
- Kotlin brand assets;
- Scala Center or Scala language media assets.

Special handling:

- `scala.svg` must be allowed to reclassify as aggregator-sourced if the embedded `SVG Repo` comment or matching
  evidence points there.

### Suggested TDD Cycle

#### Red

```gherkin
Scenario Outline: Brand-controlled assets require source-specific evidence
  Given a local <asset> SVG
  When a candidate upstream source is found
  Then the manifest must identify whether the source is official, semi-official, aggregator, or unresolved
  And copyright and trademark conclusions must be recorded separately

Examples:
  | asset      |
  | powershell |
  | python     |
  | kotlin     |
  | scala      |
```

#### Green

For each asset:

- fetch or inspect candidate SVGs;
- compare byte-level content first;
- if byte match fails, compare normalized SVG content;
- if normalized match fails, compare structure;
- if structure fails, record visual or metadata-only evidence;
- if no supportable source exists, leave provenance unresolved.

#### Refactor

Classify each result using the same evidence template:

```text
source kind → match method → rights basis → redistribution conclusion → release blocker
```

### Acceptance Criteria

- Each Batch A asset has at least one investigated source or an explicit unresolved rationale.
- `scala.svg` is not forced into Batch A if evidence points to SVG Repo.
- Trademark and copyright findings are separate.
- No asset is permitted solely because an official-looking logo exists.

### Non-Goals

- Do not rewrite, optimize, or replace SVGs.
- Do not normalize local files.
- Do not infer redistribution permission from brand visibility.

### Suggested Execution Order

Run after Phase 1. Complete before Batch B so cross-batch corrections are easier to identify.

---

## Phase 2.2 — Batch B: Project and Community Marks

### Assets

- `nushell-logo`
- `json`
- `bash`

### Goal

Determine whether each asset has an official/project source, a community source, or an aggregator source.

### Scope

Investigate:

- Nushell repository or website assets;
- JSON logo candidates, including Wikimedia/json.org-style leads;
- Bash logo candidates, including aggregator fingerprints.

Special handling:

- `nushell-logo.svg` appears to be a lossy VTracer-style auto-trace, so the likely maximum evidence strength is
  `visual-match`, not `exact-byte-match`.
- `bash.svg` must be treated with aggregator rigor if the local file carries an `SVG Repo` comment.

### Suggested TDD Cycle

#### Red

```gherkin
Scenario Outline: Community-mark evidence must not overstate provenance
  Given a local <asset> SVG
  When only visual or metadata evidence is available
  Then provenance.match.evidenceStatus must remain unresolved
  And releaseDecision.action must remain pending

Examples:
  | asset        |
  | nushell-logo |
  | json         |
  | bash         |
```

#### Green

For each asset:

- search official/project sources first;
- search reputable community or repository sources second;
- search aggregator sources only when local fingerprints point that way;
- record the strongest match method honestly.

#### Refactor

Move any aggregator-matching asset into the cross-batch correction table instead of forcing it to remain in Batch B.

### Acceptance Criteria

- `nushell-logo` does not claim structural or byte equivalence if only visual evidence exists.
- `json` records the actual source of the matched graphic, not a generic JSON concept.
- `bash` is reclassified if evidence points to SVG Repo or another aggregator.
- Weak evidence produces `pending` release decisions.

### Non-Goals

- Do not treat a language/file-format concept as a licensable logo source.
- Do not treat a Wikimedia page as automatically equivalent to the original rights holder.
- Do not assume project marks are redistributable without explicit terms.

### Suggested Execution Order

Run after Batch A. Keep notes suitable for a cross-batch correction subsection.

---

## Phase 2.3 — Batch C: Generic and Aggregator-Sourced Icons

### Assets

- `csv`
- `xml`

### Goal

Find page-specific aggregator records and license data where the icons appear to come from SVG Repo or a similar source.

### Scope

Investigate:

- exact asset pages;
- named collections;
- author/collection attribution;
- page-specific license terms;
- raw SVG match evidence.

Important: use the exact asset page and page-specific license, not only the aggregator homepage or generic terms.

### Suggested TDD Cycle

#### Red

```gherkin
Scenario Outline: Aggregator-sourced icons need page-specific evidence
  Given a local <asset> SVG with aggregator-like characteristics
  When recording provenance
  Then the source URL must identify the exact asset page
  And the rights basis must identify the page-specific license or remain NOASSERTION

Examples:
  | asset |
  | csv   |
  | xml   |
```

#### Green

For each asset:

- find candidate aggregator page;
- fetch or inspect raw SVG;
- compare against local SVG;
- record collection, author, and page-level license if available;
- leave license as `NOASSERTION` if the page-specific basis is missing or ambiguous.

#### Refactor

Consolidate common aggregator wording so `csv`, `xml`, and any cross-batch assets such as `bash` or `scala` use the same
evidence language.

### Acceptance Criteria

- `csv` and `xml` have exact-page provenance or explicit unresolved status.
- The manifest does not cite only an aggregator homepage.
- Page-specific license evidence is present or the license remains `NOASSERTION`.
- Redistribution conclusions are not stronger than the page evidence supports.

### Non-Goals

- Do not use generic web search snippets as license evidence.
- Do not infer the same license for all assets from one aggregator page.
- Do not replace local icons with downloaded variants.

### Suggested Execution Order

Run after Batch B. Then complete cross-batch classification.

---

## Phase 2.4 — Cross-Batch Correction and Evidence Table Finalization

### Goal

Produce the final per-asset classification table before any manifest edit.

### Scope

Reclassify assets whose evidence contradicts their starting batch:

- likely `scala` if SVG Repo evidence matches;
- likely `bash` if SVG Repo evidence matches;
- any other asset whose strongest source differs from the initial risk grouping.

### Suggested TDD Cycle

#### Red

```gherkin
Scenario: Final classification follows evidence, not the initial batch label
  Given an asset initially grouped as brand-controlled or community-controlled
  When the strongest matching source is an aggregator
  Then the final findings must record the aggregator source
  And the cross-batch correction must explain the reclassification
```

#### Green

**Research findings to carry into Phase 3**

1. `bash` and `scala` should be cross-batch-corrected to aggregator-sourced records because the local SVG metadata
   already says SVG Repo, and exact SVG Repo pages were found.
2. `nushell-logo` should remain capped at `visual-match`; the local VTracer metadata means the local SVG is a lossy
   trace, not an authored upstream vector.
3. `python` and `kotlin` have strong official-source leads, but still need local raw SVG comparison during Phase 3
   before any stronger match method is recorded in the manifest.
4. `powershell` has official/project evidence, but the current local file is not yet proven to be the same as the
   official/project asset.
5. `csv` and `xml` have plausible SVG Repo candidates, but exact local matching still needs Phase 3 byte/normalized
   comparison.

These findings come from an external research pass (web research conducted via ChatGPT, not direct SVG fetch/byte
comparison by this agent) and remain unverified against the local files — Phase 3 must confirm before any match method
is strengthened.

Produce a final 9-row evidence table:

| Asset          | Final source kind    | Match method    | Evidence status      | Copyright conclusion                                   | Trademark conclusion | Redistribution conclusion | Release action | Primary blocker                                                                                      |
| -------------- | -------------------- | --------------- | -------------------- | ------------------------------------------------------ | -------------------- | ------------------------- | -------------- | ---------------------------------------------------------------------------------------------------- |
| `powershell`   | `project-repository` | `metadata-only` | `partially-verified` | `NOASSERTION` (`MIT` for Wikimedia/project candidate)  | `restricted`         | `permission-required`     | `pending`      | Local SVG must be compared to candidate project assets, and Microsoft brand permission reviewed.     |
| `python`       | `official`           | `metadata-only` | `partially-verified` | `NOASSERTION`                                          | `restricted`         | `permission-required`     | `pending`      | Official SVG comparison and PSF logo/trademark permission must be reviewed.                          |
| `kotlin`       | `official`           | `metadata-only` | `partially-verified` | `NOASSERTION`                                          | `restricted`         | `permission-required`     | `pending`      | Official brand asset comparison and Kotlin Foundation usage constraints must be reviewed.            |
| `scala`        | `aggregator`         | `metadata-only` | `partially-verified` | `NOASSERTION` (`CC0` for SVG Repo candidate)           | `undetermined`       | `undetermined`            | `pending`      | Raw SVG comparison and trademark clearance still required.                                           |
| `nushell-logo` | `community-mirror`   | `visual-match`  | `partially-verified` | `NOASSERTION` (`CC-BY-SA-4.0` for Wikimedia candidate) | `undetermined`       | `undetermined`            | `pending`      | Local VTracer trace must be matched to a specific Nushell artwork and CC BY-SA obligations reviewed. |
| `json`         | `community-mirror`   | `metadata-only` | `partially-verified` | `NOASSERTION`                                          | `undetermined`       | `undetermined`            | `pending`      | Exact vector lineage and trademark status remain unresolved.                                         |
| `bash`         | `aggregator`         | `metadata-only` | `partially-verified` | `NOASSERTION` (`CC0` for SVG Repo candidate)           | `undetermined`       | `undetermined`            | `pending`      | Raw SVG comparison and trademark clearance still required.                                           |
| `csv`          | `aggregator`         | `metadata-only` | `unresolved`         | `NOASSERTION`                                          | `undetermined`       | `undetermined`            | `pending`      | Exact local source page not found; compare against SVG Repo candidates.                              |
| `xml`          | `aggregator`         | `metadata-only` | `unresolved`         | `NOASSERTION`                                          | `undetermined`       | `undetermined`            | `pending`      | Exact local source page not found; compare against SVG Repo candidates.                              |

Copyright conclusions are recorded as `NOASSERTION` for the local asset itself wherever the candidate source's license
has not yet been confirmed to apply to the exact local file — the parenthetical notes the candidate source's own license
as a lead for Phase 3 to verify, not a conclusion about the local SVG.

**Candidate sources consulted (external research pass, unverified by direct fetch/comparison):**

- `bash`: https://www.svgrepo.com/svg/376359/bash
- `scala`: https://www.svgrepo.com/svg/508943/scala
- `nushell-logo`: https://commons.wikimedia.org/wiki/File:Logo_of_nushell_shell.svg ;
  https://www.nushell.sh/blog/2023-12-21-logo-contest.html
- `json`: https://commons.wikimedia.org/wiki/File:JSON_vector_logo.svg
- `powershell`: https://commons.wikimedia.org/wiki/File:Powershell_128.svg ; https://github.com/PowerShell/PowerShell ;
  https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks
- `python`: https://www.python.org/community/logos/ ; https://www.python.org/psf/trademarks
- `kotlin`: https://kotlinlang.org/docs/kotlin-brand-assets.html
- `csv`: https://www.svgrepo.com/svg/161804/csv (candidate, not confirmed as exact match)
- `xml`: https://www.svgrepo.com/svg/486922/xml-document (candidate, not confirmed as exact match)

All nine assets remain `pending` for release action. This is intentional: Phase 2 classifies evidence only. Phase 3 may
write the manifest, but maintainer-owned inclusion, exclusion, and risk-acceptance decisions remain deferred.

#### Refactor

Ensure every non-default result has a paired rationale and every pending result has one blocking reason.

## Cross-Batch Correction

`bash` and `scala` are treated as aggregator-sourced assets for Phase 3. Both local files contain SVG Repo upload
metadata, and exact SVG Repo candidate pages were found. Their initial placement in project/community or
brand-controlled batches is retained only as research history; final classification follows the stronger local metadata
and exact-page evidence.

`nushell-logo` remains project/community-related, but its local VTracer generator metadata prevents stronger match
methods unless Phase 3 discovers a traced source and documents the transformation. The maximum honest method for the
current evidence is `visual-match`.

## Acceptance Criteria

- All nine assets have a final evidence row.
- Initial batch labels no longer control final classification.
- All `pending` assets have exactly one primary blocking reason.
- No invented maintainer decision appears.

## Non-Goals

- Do not edit files during this phase.
- Do not collapse copyright, trademark, and redistribution into one conclusion.
- Do not treat “looks the same” as equivalent to byte or structural provenance.

## Suggested Execution Order

Run after all three research batches and before any manifest/documentation edits.

---

# Phase 3.3 — Apply the Consolidated Provenance Edits [DONE]

## Goal

Make one clean, reviewable update to the manifest and traceability documents using the finalized evidence table.

## Scope

Edit exactly these files:

1. `packages/astro-icons/LICENSES/third-party-icons.json`
2. `traceability-log/open/phase_1_establish_licensing_provenance_and_attribution.md`
3. `traceability-log/open/subphase_1.1_establish_the_provenance_evidence_manifest.md`

## Phase 2 Research Handoff Checklist

Phase 2's final evidence table (above) comes from an external research pass and records every match method as
`metadata-only` or `visual-match` — no candidate source was fetched and byte-compared against the local file. Phase 3
must not promote any `metadata-only` row to `verified` without a raw local-vs-source SVG comparison.

For each candidate source listed in Phase 2.4:

1. Fetch the raw upstream SVG outside the repository.
2. Compare local and upstream bytes.
3. If bytes differ, compare normalized XML/SVG content.
4. If normalized content differs, compare path structure.
5. If structure differs, record only `visual-match` or weaker evidence.
6. Delete all downloaded comparison artifacts before the final `git status` check.

Do not set `releaseDecision.action: "include"` unless redistribution is cleanly supported and trademark constraints are
addressed. Do not create a `riskAcceptance` object — that remains maintainer-owned.

## Phase 3.1 — Consolidated Manifest Update

### Goal

Update the nine non-Phosphor asset objects in one pass.

### Scope

Allowed fields:

- `assetType`
- `displayName`
- `notes[]`
- `provenance.*`, except:

  - `file`
  - `exportName`
  - `localArtifact.sha256`
- `rights.copyright.*`
- `rights.trademark.*`
- `redistribution.*`
- `releaseDecision.*`

Forbidden fields and paths:

- `file`
- `exportName`
- `localArtifact.sha256`
- `inventoryFile`
- `packageCodeCopyrightHolder`
- `phosphor`
- `reviewStatus`
- `schemaVersion`
- `packages/astro-icons/src`
- `packages/astro-icons/migration/icon-inventory.json`
- `packages/astro-icons/package.json`

### Suggested TDD Cycle

#### Red

```gherkin
Scenario: Manifest update is confined to nine non-Phosphor asset records
  Given the third-party icons manifest
  When Phase 3 provenance is recorded
  Then only allowed fields inside the nine target asset records may change
  And local artifact hashes must remain unchanged
  And release decisions must remain pending unless clean rights evidence supports permission
```

#### Green

Apply the final evidence table to the nine asset records.

Use compact JSON strings:

- short `details`;
- short `rationale`;
- exact source URLs;
- exact match method;
- exact blocking reason.

Use RFC 3339-style timestamps for verification dates because RFC 3339 defines a profile of ISO 8601 for Internet
timestamps. ([IETF Datatracker][3])

#### Refactor

Normalize repeated rationale phrasing across similar assets, especially aggregator-sourced records.

### Acceptance Criteria

- Manifest parses.
- All nine records have non-placeholder evidence fields.
- Every non-null or non-default field has a rationale.
- `suppliedByMaintainer` is `false` for all nine.
- No forbidden field changes.
- No `riskAcceptance` is invented.
- No `permitted` decision is invented.

### Non-Goals

- Do not edit Phosphor.
- Do not add new manifest schema fields.
- Do not normalize unrelated JSON formatting.

### Suggested Execution Order

Run after Phase 2.4 only.

---

## Phase 3.2 — Traceability Findings Update

### Goal

Append a clear, auditable findings section explaining the non-Phosphor evidence and remaining maintainer decisions.

### Scope

Append this section after the existing Phosphor findings and before `# Subphase 1.2`:

```markdown
# Findings — Non-Phosphor Asset Provenance

## Investigation Method

## Batch A — Brand-Controlled Assets

## Batch B — Project and Community Marks

## Batch C — Generic and Aggregator-Sourced Icons

## Cross-Batch Correction

## Redistribution Conclusions

## Outstanding Maintainer Decisions
```

### Suggested TDD Cycle

#### Red

```gherkin
Scenario: Findings explain evidence without making maintainer decisions
  Given the Phase 1 traceability document
  When the non-Phosphor findings are appended
  Then every asset must have a source and rights summary
  And every pending asset must have one clear blocker
  And the section must not claim risk acceptance or permission without evidence
```

#### Green

Write the findings using the final evidence table.

The findings should explain:

- research method;
- source hierarchy;
- match method distribution;
- exact-page evidence where aggregator-sourced;
- official vs aggregator mismatch cases;
- copyright conclusions;
- trademark conclusions;
- redistribution conclusions;
- outstanding maintainer decisions.

### Refactor

Align terminology with the manifest:

- same asset names;
- same source kinds;
- same release blockers;
- same match-method labels.

### Acceptance Criteria

- All nine assets are covered.
- The section is independently auditable.
- Cross-batch corrections are explicit.
- Maintainer-only decisions are listed, not decided.
- The full rights narrative lives in Markdown, while JSON remains compact.

### Non-Goals

- Do not duplicate full SVG content.
- Do not reproduce full third-party license text unless the repository policy requires it.
- Do not add unrelated Phase 1 commentary.

### Suggested Execution Order

Run immediately after the manifest update.

---

## Phase 3.3 — Phase 3 Status Marker Update

### Goal

Mark Phase 3 as complete in the subphase plan without archiving it.

### Scope

Edit only the Phase 3 section in:

- `traceability-log/open/subphase_1.1_establish_the_provenance_evidence_manifest.md`

Allowed edits:

- change heading to:

```markdown
# [DONE] Phase 3 — Verify the Nine Non-Phosphor Assets
```

- add a `## Current Status` summary containing:

  - sources found per batch;
  - match-method distribution;
  - cross-batch corrections;
  - count of assets still `pending`;
  - short pointer to the findings section.

### Suggested TDD Cycle

#### Red

```gherkin
Scenario: Phase 3 status is updated without closing the subphase
  Given the open Subphase 1.1 plan document
  When Phase 3 is marked done
  Then only the Phase 3 section may change
  And archival to closed traceability must remain deferred
```

#### Green

Update only the Phase 3 heading and current-status block.

#### Refactor

Keep the status summary short and avoid duplicating the full findings narrative.

### Acceptance Criteria

- Phase 3 is marked `[DONE]`.
- Phase 1 and Phase 2 sections are untouched.
- Content above the Phase 3 region is untouched.
- Archival is explicitly deferred.

### Non-Goals

- Do not move files to `closed/`.
- Do not rewrite the subphase plan.
- Do not change future phases.

### Suggested Execution Order

Run after the manifest and findings document are updated.

---

# Phase 3.4 — Verify Manifest Contract, Diffs, and Repository Purity

## Goal

Prove that Phase 3 produced only the intended documentation/provenance changes and did not alter package behavior.

## Scope

Verify:

- JSON parseability;
- controlled-vocabulary membership;
- field invariants;
- release-decision safety;
- exact changed-file set;
- empty diffs on protected paths.

Git’s `status` command reports paths that differ between HEAD, index, and working tree, while `git diff` inspects the
actual content changes, so both are useful: one checks scope, the other checks semantics. ([Git SCM][4])

## Suggested TDD Cycle

### Red

```gherkin
Feature: Phase 3 verification

Scenario: Repository changes are limited to provenance documentation
  Given the repository after Phase 3 edits
  When verification runs
  Then only the manifest, findings document, and Phase 3 plan status may be modified
  And SVG files, inventory, source code, and package metadata must have empty diffs
```

### Green

Run field-level PowerShell assertions from `astro-website/`.

Recommended assertion groups:

1. manifest parses as JSON;
2. all nine target assets exist;
3. all nine have `suppliedByMaintainer === false`;
4. all match methods are in the controlled vocabulary;
5. all evidence statuses are in the controlled vocabulary;
6. no `verified` evidence status is paired only with `metadata-only` or `maintainer-attestation`;
7. all redistribution conclusions are in the controlled vocabulary;
8. no asset has `releaseDecision.action === "risk-accepted"` without maintainer-supplied risk acceptance;
9. no asset has `releaseDecision.action === "permitted"` while license or redistribution is unresolved;
10. every `pending` asset has exactly one clear blocking reason.

Then run repository-purity checks:

```powershell
Set-Location "e:\teaching\DIBS\projects\astro-website"

git status --short

git diff -- packages/astro-icons/LICENSES/third-party-icons.json
git diff -- traceability-log/open/phase_1_establish_licensing_provenance_and_attribution.md
git diff -- traceability-log/open/subphase_1.1_establish_the_provenance_evidence_manifest.md

git diff -- packages/astro-icons/src
git diff -- packages/astro-icons/migration/icon-inventory.json
git diff -- packages/astro-icons/package.json
```

Expected changed files:

```text
M packages/astro-icons/LICENSES/third-party-icons.json
M traceability-log/open/phase_1_establish_licensing_provenance_and_attribution.md
M traceability-log/open/subphase_1.1_establish_the_provenance_evidence_manifest.md
```

### Refactor

Remove any temporary checkers, downloaded SVGs, source snapshots, extracted corpora, comparison notes, or scratch files
from the repository.

If a temporary checker is useful, keep it outside the repository or delete it before the final status check.

## Acceptance Criteria

- All PowerShell assertions return `True`.
- `git status --short` shows exactly the three intended files.
- Protected-path diffs are empty:

  - `packages/astro-icons/src`
  - `packages/astro-icons/migration/icon-inventory.json`
  - `packages/astro-icons/package.json`
- No source asset bytes changed.
- No inventory hash changed.
- No package metadata changed.
- No scratch artifacts remain.
- Every pending asset has exactly one clear maintainer-facing blocker.

## Non-Goals

- Do not add a permanent checker unless the repository already has a provenance-test harness.
- Do not archive the phase.
- Do not produce generated outputs.
- Do not rewrite unrelated traceability sections.

## Suggested Execution Order

Run after Phase 3. Repeat after every correction.

---

# Final Acceptance Matrix

| Area                           | Acceptance criterion                                                 |
| ------------------------------ | -------------------------------------------------------------------- |
| Research coverage              | All nine non-Phosphor assets investigated                            |
| Evidence hierarchy             | Official/project sources preferred before aggregators                |
| Source precision               | Aggregator records use exact asset pages, not generic homepages      |
| Match honesty                  | Match method reflects actual comparison strength                     |
| Weak evidence handling         | Missing evidence maps to `pending`, `undetermined`, or `NOASSERTION` |
| Copyright/trademark separation | Copyright and trademark conclusions are recorded independently       |
| Maintainer authority           | No invented `riskAcceptance` or `risk-accepted` decision             |
| Manifest scope                 | Only allowed fields in the nine asset objects change                 |
| Findings scope                 | One Non-Phosphor findings section appended                           |
| Plan status                    | Only Phase 3 heading/current status updated                          |
| Repository purity              | Only three intended files modified                                   |
| Behavior preservation          | SVGs, source code, inventory, hashes, and package metadata unchanged |
| Cleanup                        | No temporary research or comparison artifacts remain                 |

---

# Consolidated Non-Goals

- Do not change any icon SVG.
- Do not replace local assets with upstream files.
- Do not edit `packages/astro-icons/src`.
- Do not edit `packages/astro-icons/migration/icon-inventory.json`.
- Do not edit `packages/astro-icons/package.json`.
- Do not change Phosphor records.
- Do not change schema version, review status, package-code holder, inventory file, export names, or local artifact
  hashes.
- Do not infer redistribution from open-source project status.
- Do not infer trademark permission from copyright license.
- Do not invent maintainer risk acceptance.
- Do not archive the subphase to `closed/`.

---

[1]: https://spdx.github.io/spdx-spec/v3.0.1/model/ExpandedLicensing/Individuals/NoAssertionLicense/?utm_source=chatgpt.com "NoAssertionLicense - SPDX Specification 3.0.1"
[2]: https://cucumber.io/docs/gherkin/reference/?utm_source=chatgpt.com "Reference"
[3]: https://datatracker.ietf.org/doc/html/rfc3339?utm_source=chatgpt.com "RFC 3339 - Date and Time on the Internet: Timestamps"
[4]: https://git-scm.com/docs/git-status?utm_source=chatgpt.com "Git - git-status Documentation"
