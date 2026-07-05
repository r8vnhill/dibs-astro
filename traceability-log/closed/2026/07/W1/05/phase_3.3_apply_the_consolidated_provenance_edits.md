# [PLAN] Phase 3.3 --- Apply the Consolidated Provenance Edits

## Scope Classification

**Recommended structure:** direct **red-green-refactor cycles**.

**Why:** this is a bounded write pass:

- one manifest edit;
- one findings-section edit;
- one parent status-marker edit;
- no new web research;
- no SVG comparison;
- no evidence strengthening;
- no release inclusion/exclusion decision;
- no `riskAcceptance` object.

The key risk is not discovery. The key risk is **transcription drift** between the Phase 2.4 evidence table, the
manifest JSON, the findings narrative, and the parent status marker.

---

# Cycle 0 — Lock the Source Table and Write Boundary

## Goal

Freeze the exact input data and edit boundary before touching any file.

## Scope

Read only:

```text
traceability-log/open/phase_3_verify_the_nine_non_phosphor_assets.md
```

Use it as the source of truth for:

- the finalized 9-row evidence table;
- candidate URLs;
- match methods;
- evidence statuses;
- copyright/trademark/redistribution conclusions;
- primary blockers;
- the rule that no raw fetch/byte comparison happens in this pass.

## Red

```gherkin
Feature: Phase 3.3 write boundary

Scenario: The consolidated provenance edit transcribes settled evidence only
  Given Phase 3.2 already finalized the nine-asset evidence table
  When Phase 3.3 begins
  Then no new research may be introduced
  And no metadata-only or visual-match row may be promoted to verified
  And every releaseDecision.action must remain pending
  And every releaseDecision.riskAcceptance must remain null
```

## Green

Create a working checklist with the nine assets and their target values:

```text
bash
csv
json
kotlin
nushell-logo
powershell
python
scala
xml
```

For each asset, lock:

- `match.method`;
- `match.evidenceStatus`;
- `match.details`;
- `retrievalSource.url`;
- `copyright.concludedLicense`;
- `copyright.basis`;
- trademark conclusion;
- `redistribution.conclusion`;
- `redistribution.rationale`;
- `releaseDecision.action`.

## Refactor

Normalize the transcription policy:

- write `NOASSERTION` for copyright when page-specific license text is not confirmed;
- write `null` for `rights.copyright.basis` where no confirmed basis exists;
- keep `releaseDecision.action: "pending"` for all nine;
- keep `releaseDecision.riskAcceptance: null` for all nine;
- use the same note string for all nine records, or omit `notes[]` changes entirely.

## Acceptance Criteria

- The source table is the only evidence source.
- No new URLs, licenses, match methods, or claims are introduced.
- The Phase 2 Research Handoff Checklist remains deferred.
- The agent understands that `phase_3_verify_the_nine_non_phosphor_assets.md` is read-only during this pass.

## Non-Goals

- Do not fetch upstream SVGs.
- Do not compare bytes.
- Do not promote evidence to `verified`.
- Do not edit `phase_3_verify_the_nine_non_phosphor_assets.md`.

## Suggested Execution Order

Run first. It gates all write cycles.

---

# Cycle 1 — Apply the Manifest Transcription

## Goal

Write the finalized evidence into the nine non-Phosphor manifest objects.

## Scope

Edit only:

```text
packages/astro-icons/LICENSES/third-party-icons.json
```

Target objects only:

```text
bash
csv
json
kotlin
nushell-logo
powershell
python
scala
xml
```

Allowed fields:

- `assetType`
- `displayName`
- `notes[]`
- `provenance.retrievalSource.*`
- `provenance.upstreamSource.*`
- `provenance.match.*`
- `rights.copyright.*`
- `rights.trademark.*`
- `redistribution.*`
- `releaseDecision.*`

Forbidden fields:

- `file`
- `exportName`
- `localArtifact.sha256`
- `inventoryFile`
- `packageCodeCopyrightHolder`
- `phosphor`
- `reviewStatus`
- `schemaVersion`

## Red

```gherkin
Feature: Manifest transcription

Scenario Outline: Each non-Phosphor asset receives settled Phase 2.4 evidence
  Given the finalized Phase 2.4 row for <asset>
  When the manifest object is updated
  Then the manifest values must match the row without strengthening the evidence
  And releaseDecision.action must be pending
  And releaseDecision.riskAcceptance must be null

Examples:
  | asset        |
  | bash         |
  | csv          |
  | json         |
  | kotlin       |
  | nushell-logo |
  | powershell   |
  | python       |
  | scala        |
  | xml          |
```

## Green

Transcribe the table exactly.

Use the following normalization rules:

1. `retrievalSource.suppliedByMaintainer = false` for all nine.
2. `retrievalSource.revision = null` for all nine.
3. `releaseDecision.action = "pending"` for all nine.
4. `releaseDecision.riskAcceptance = null` for all nine.
5. `rights.copyright.concludedLicense = "NOASSERTION"` for all nine in this pass.
6. `rights.copyright.basis = null` for all nine, because no page-specific license text has been independently confirmed
   for the exact local file.
7. `rights.copyright.sourceUrl = retrievalSource.url`.
8. `provenance.upstreamSource.project` is set only for official-source rows:

   - `python`: `Python Software Foundation`
   - `kotlin`: `Kotlin Foundation`
9. `provenance.upstreamSource` remains null-valued for aggregator/community-mirror rows unless the existing schema
   requires another representation.
10. `rights.trademark` is filled only for:

- `python`: PSF policy;
- `kotlin`: Kotlin Foundation/JetBrains policy;
- `powershell`: Microsoft policy.

11. All other trademark records remain `unknown` / `undetermined` with null owner and policy URL.
12. `redistribution.rationale` uses the asset’s primary blocker.

## Refactor

Make the nine records uniform:

- same field ordering as existing manifest style;
- compact details strings;
- consistent wording for “not independently byte-verified”;
- no asset-specific embellishment beyond the Phase 2.4 table.

The uploaded plan leaves `notes[]` optional; I would make this deterministic. Either add this exact note to all nine
records:

```text
Provenance from external research pass; not independently byte-verified.
```

or add no note changes at all. I recommend **adding the uniform note** because it makes the provenance status visible
during future manifest review.

## Acceptance Criteria

- JSON parses.
- Only the nine target asset objects changed.
- All nine have `releaseDecision.action: "pending"`.
- All nine have `releaseDecision.riskAcceptance: null`.
- No `include` or `exclude` action appears.
- No copyright license stronger than `NOASSERTION` is written.
- No `verifiedAt`, `licenseFile`, or new confirmed license basis is invented.
- `phosphor` is untouched.
- Protected identity fields remain unchanged.

## Non-Goals

- Do not edit SVGs.
- Do not edit Phosphor.
- Do not add license files.
- Do not add a risk acceptance object.
- Do not change schema version or review status.

## Suggested Execution Order

Run after Cycle 0.

---

# Cycle 2 — Append the Non-Phosphor Findings Section

## Goal

Add the narrative audit record that explains the manifest transcription.

## Scope

Edit only:

```text
traceability-log/open/phase_1_establish_licensing_provenance_and_attribution.md
```

Insert after:

```markdown
# Findings — Phosphor Corpus Lineage
```

and before:

```markdown
# Subphase 1.2
```

Use this skeleton:

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

## Red

```gherkin
Feature: Findings narrative

Scenario: Findings explain the manifest without adding new claims
  Given the Phase 2.4 evidence table
  When the non-Phosphor findings section is appended
  Then every asset must be covered exactly once
  And the section must explain unresolved or partially-verified evidence
  And it must not reproduce full SVG content or full third-party license text
  And it must not introduce new sources or stronger claims
```

## Green

Populate the section as follows:

### Investigation Method

State that:

- the findings are transcribed from the completed Phase 3.2 research pass;
- the pass used external research but did not perform raw byte comparison;
- the current manifest values are intentionally conservative;
- the future fetch-and-compare checklist remains the gate for strengthening evidence.

### Batch A — Brand-Controlled Assets

Cover:

- `powershell`
- `python`
- `kotlin`
- `scala`

But note that `scala` is cross-batch-corrected to aggregator-sourced classification because of local SVG Repo metadata
and exact SVG Repo candidate page.

### Batch B — Project and Community Marks

Cover:

- `nushell-logo`
- `json`
- `bash`

But note that `bash` is cross-batch-corrected to aggregator-sourced classification.

### Batch C — Generic and Aggregator-Sourced Icons

Cover:

- `csv`
- `xml`

Also mention that aggregator-style candidates are not enough to claim verified source status until raw/local comparison
is done.

### Cross-Batch Correction

Reuse the existing substance:

- `bash` and `scala` are treated as aggregator-sourced records;
- `nushell-logo` remains capped at `visual-match`.

### Redistribution Conclusions

Use two groups:

```text
permission-required: python, kotlin, powershell
undetermined: bash, scala, nushell-logo, json, csv, xml
```

### Outstanding Maintainer Decisions

For each asset, state:

- release action remains `pending`;
- what must happen before inclusion can be considered.

## Refactor

Keep the findings readable and compact. Do not duplicate the manifest field table; this section should explain the
classification, not reprint JSON.

## Acceptance Criteria

- All nine assets are covered.
- The section matches the manifest values.
- No new source URLs or licenses are introduced.
- Copyright, trademark, redistribution, and release decisions remain separate.
- Maintainer decisions are listed as outstanding, not made.

## Non-Goals

- Do not reproduce full license texts.
- Do not paste SVG content.
- Do not rewrite unrelated Phase 1 sections.
- Do not add a generic “See also” section.

## Suggested Execution Order

Run after Cycle 1 so the findings mirror the final manifest values.

---

# Cycle 3 — Update the Parent Subphase Status Marker

## Goal

Mark the parent Phase 3 task as complete in the Subphase 1.1 plan.

## Scope

Edit only:

```text
traceability-log/open/subphase_1.1_establish_the_provenance_evidence_manifest.md
```

Allowed edits:

- change the heading:

```markdown
# Phase 3 — Verify the Nine Non-Phosphor Assets
```

to:

```markdown
# [DONE] Phase 3 — Verify the Nine Non-Phosphor Assets
```

- insert `## Current Status` immediately after that heading and before the existing `## Goal`.

Do not edit anything after the inserted status block.

## Red

```gherkin
Feature: Parent status marker

Scenario: Phase 3 is marked done without changing future work
  Given the manifest and findings edits are complete
  When the Subphase 1.1 Phase 3 heading is updated
  Then only the heading and Current Status block may change
  And Phase 1, Phase 2, Phase 4, and the existing Phase 3 body must remain untouched
```

## Green

Use the status text from the uploaded plan, but tighten it slightly:

```markdown
## Current Status

- All nine non-Phosphor assets were transcribed into the provenance manifest from the completed Phase 3.2 evidence
  table.
- Match-method distribution: 8 `metadata-only`, 1 `visual-match` (`nushell-logo`, capped due to VTracer auto-trace
  metadata).
- Evidence-status distribution: 7 `partially-verified`, 2 `unresolved` (`csv`, `xml`).
- Redistribution conclusions: 3 `permission-required` (`powershell`, `python`, `kotlin`) and 6 `undetermined` (`bash`,
  `scala`, `nushell-logo`, `json`, `csv`, `xml`).
- Cross-batch corrections: `bash` and `scala` are treated as aggregator-sourced records based on local SVG Repo upload
  metadata and exact candidate pages.
- All nine `releaseDecision.action` values remain `pending`; no raw byte/structural comparison was performed in this
  pass, and no maintainer risk acceptance was created.
- See `traceability-log/open/phase_1_establish_licensing_provenance_and_attribution.md`,
  `Findings — Non-Phosphor Asset Provenance`, for the audit narrative.
```

This version avoids saying only “researched”; it makes clear that this pass also **transcribed** the evidence into the
manifest.

## Refactor

Keep the status block short. Do not duplicate all nine asset records.

## Acceptance Criteria

- Heading is marked `[DONE]`.
- Status block appears immediately before the existing `## Goal`.
- No other part of the subphase file changes.
- The status accurately reflects the manifest and findings edits.
- It does not claim evidence was strengthened.

## Non-Goals

- Do not mark Phase 4 done.
- Do not archive the subphase.
- Do not modify Phase 1 or Phase 2 text.

## Suggested Execution Order

Run after Cycles 1 and 2.

---

# Cycle 4 — Verify Manifest Semantics and Repository Purity

## Goal

Prove that Phase 3.3 made only the intended provenance/documentation edits.

## Scope

Verify:

- JSON parseability;
- field invariants;
- changed-file set;
- protected paths;
- no accidental edit to the source Phase 3.3 research document.

## Red

```gherkin
Feature: Phase 3.3 verification

Scenario: Consolidated provenance edits remain conservative and behavior-preserving
  Given the repository after Phase 3.3
  When verification runs
  Then only the manifest, findings document, and parent subphase status document may be modified
  And no SVG, inventory, package metadata, or Phase 3.3 source-plan file may change
  And every non-Phosphor release decision must remain pending
```

## Green

Run from `astro-website/`:

```powershell
Set-Location "e:\teaching\DIBS\projects\astro-website"

$manifestPath = "packages\astro-icons\LICENSES\third-party-icons.json"
$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json

$assetNames = @(
    "bash",
    "csv",
    "json",
    "kotlin",
    "nushell-logo",
    "powershell",
    "python",
    "scala",
    "xml"
)

$allPending = $true
$allRiskAcceptanceNull = $true

foreach ($name in $assetNames) {
    $asset = $manifest.$name

    if ($asset.releaseDecision.action -ne "pending") {
        $allPending = $false
    }

    if ($null -ne $asset.releaseDecision.riskAcceptance) {
        $allRiskAcceptanceNull = $false
    }
}

$allPending
$allRiskAcceptanceNull
```

Then run:

```powershell
git status --short

git diff -- packages/astro-icons/LICENSES/third-party-icons.json
git diff -- traceability-log/open/phase_1_establish_licensing_provenance_and_attribution.md
git diff -- traceability-log/open/subphase_1.1_establish_the_provenance_evidence_manifest.md

git diff -- packages/astro-icons/src
git diff -- packages/astro-icons/migration/icon-inventory.json
git diff -- packages/astro-icons/package.json
git diff -- traceability-log/open/phase_3_verify_the_nine_non_phosphor_assets.md
```

Expected changed files:

```text
M packages/astro-icons/LICENSES/third-party-icons.json
M traceability-log/open/phase_1_establish_licensing_provenance_and_attribution.md
M traceability-log/open/subphase_1.1_establish_the_provenance_evidence_manifest.md
```

Expected empty diffs:

```text
packages/astro-icons/src
packages/astro-icons/migration/icon-inventory.json
packages/astro-icons/package.json
traceability-log/open/phase_3_verify_the_nine_non_phosphor_assets.md
```

## Refactor

Remove any temporary checker, scratch note, fetched SVG, downloaded page, or comparison artifact inside the repository.

For this pass, no permanent script should be added.

## Acceptance Criteria

- Manifest parses.
- Only the three intended files are modified.
- `phase_3_verify_the_nine_non_phosphor_assets.md` remains untouched.
- All nine target assets have `releaseDecision.action === "pending"`.
- All nine target assets have `releaseDecision.riskAcceptance === null`.
- No SVG files changed.
- No inventory or package metadata changed.
- No Phosphor fields changed.
- Every non-null/non-default field has a paired rationale, basis, or details string.
- No scratch artifacts remain.

## Non-Goals

- Do not run Phase 4 verification as a broader closure task.
- Do not create a permanent validator.
- Do not archive the phase.
- Do not fetch upstream SVGs.

## Suggested Execution Order

Run last. Repeat after every correction.

---

# Final Acceptance Matrix

| Area                  | Acceptance criterion                                                          |
| --------------------- | ----------------------------------------------------------------------------- |
| Source of truth       | Values derive only from the completed Phase 2.4 table                         |
| Research boundary     | No new research, fetch, or comparison                                         |
| Manifest scope        | Only the nine non-Phosphor asset objects change                               |
| Manifest conservatism | Copyright remains `NOASSERTION` where exact local-file license is unconfirmed |
| Evidence status       | No row is promoted to `verified`                                              |
| Release action        | All nine remain `pending`                                                     |
| Risk acceptance       | All nine remain `null`                                                        |
| Findings              | New Non-Phosphor findings section inserted before Subphase 1.2                |
| Parent status         | Subphase 1.1 Phase 3 heading marked `[DONE]` with concise status              |
| Source plan           | `phase_3_verify_the_nine_non_phosphor_assets.md` remains untouched            |
| Protected paths       | SVGs, inventory, package metadata, and package source remain unchanged        |
| Cleanup               | No temporary artifacts remain                                                 |

---

# Consolidated Non-Goals

- Do not perform the Phase 2 Research Handoff Checklist.
- Do not fetch raw upstream SVGs.
- Do not compare bytes or normalized SVG content.
- Do not promote evidence to `verified`.
- Do not set `releaseDecision.action` to `include` or `exclude`.
- Do not create `releaseDecision.riskAcceptance`.
- Do not write confirmed third-party license files.
- Do not edit Phosphor fields.
- Do not edit SVGs.
- Do not edit inventory or package metadata.
- Do not edit `phase_3_verify_the_nine_non_phosphor_assets.md`.
- Do not archive anything.
