# [DONE] Lock the Phase 3 Evidence and Vocabulary Contract

## Scope Classification

**Recommended structure:** direct **red-green-refactor cycles**.

**Reasoning:** This task is not the full “verify nine assets” work. It is a narrow correction pass for the
already-authored Phase 3 plan:

- one editable file;
- no manifest changes;
- no SVG changes;
- no web research;
- no source-code changes;
- no release decisions.

The main risk is **schema drift**: writing Phase 2/3 research later against invalid enum values.

## Internal References

Use these as the authority hierarchy:

1. `traceability-log/open/subphase_1.1_establish_the_provenance_evidence_manifest.md` Source of truth for the corrected
   evidence model and Phase 3 manifest contract.

2. `traceability-log/open/phase_3_verify_the_nine_non_phosphor_assets.md` Target file. Edit only its Phase 1 section.

3. `traceability-log/open/phase_1_establish_licensing_provenance_and_attribution.md` Read-only historical/superseded
   vocabulary reference.

4. `traceability-log/closed/2026/07/W1/05/phase_1.1.2.3_record_phosphor_evidence.md` Read-only precedent for
   match-method style and provenance wording.

---

# Cycle 1 — Capture the Authoritative Vocabulary Delta

## Goal

Prove exactly which Phase 1 vocabulary entries are wrong before editing the plan document.

## Scope

Read only:

- `traceability-log/open/subphase_1.1_establish_the_provenance_evidence_manifest.md`
- `traceability-log/open/phase_3_verify_the_nine_non_phosphor_assets.md`
- `traceability-log/open/phase_1_establish_licensing_provenance_and_attribution.md`

Extract the corrected four-row vocabulary table.

## Red

```gherkin id="kaim-bridge-four"
Feature: Phase 3 vocabulary contract

Scenario: The Phase 3 plan uses the corrected evidence model
  Given the corrected evidence model in subphase_1.1_establish_the_provenance_evidence_manifest.md
  When the Phase 1 vocabulary table is checked
  Then provenance.match.evidenceStatus includes verified, partially-verified, and unresolved
  And redistribution.conclusion includes permitted, restricted, permission-required, and undetermined
  And releaseDecision.action includes include, exclude, and pending
  And provenance.match.method remains unchanged
```

## Green

Create the corrected vocabulary matrix:

| Field                             | Correct values                                                                                                                        | Change required                                 |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `provenance.match.method`         | `exact-byte-match`, `normalized-content-match`, `structural-match`, `visual-match`, `metadata-only`, `maintainer-attestation`, `null` | No                                              |
| `provenance.match.evidenceStatus` | `verified`, `partially-verified`, `unresolved`                                                                                        | Yes: add `partially-verified`                   |
| `redistribution.conclusion`       | `permitted`, `restricted`, `permission-required`, `undetermined`                                                                      | Yes: replace `verified`; remove `risk-accepted` |
| `releaseDecision.action`          | `include`, `exclude`, `pending`                                                                                                       | Yes: replace `permitted` and `risk-accepted`    |

## Refactor

Record the source-of-truth rule explicitly:

```text
The corrected evidence model in subphase_1.1 supersedes the older redistribution.status vocabulary in phase_1_establish_licensing_provenance_and_attribution.md.
```

Also record the `riskAcceptance` clarification:

```text
riskAcceptance is not an enum value. It is a nested releaseDecision object with rationale and decisionReference, required when action is include and redistribution.conclusion is not permitted.
```

## Acceptance Criteria

- The three incorrect fields are identified precisely.
- `provenance.match.method` is confirmed as already correct.
- The superseded `redistribution.status` vocabulary is treated as historical context, not a live manifest vocabulary.
- No file is edited yet.

## Non-Goals

- Do not edit the manifest.
- Do not edit the source-of-truth document.
- Do not perform asset research.
- Do not infer release decisions.

## Suggested Execution Order

Run first. This cycle defines the exact patch.

---

# Cycle 2 — Correct the Phase 1 Vocabulary Table

## Goal

Patch the incorrect vocabulary table in the Phase 1 section of:

- `traceability-log/open/phase_3_verify_the_nine_non_phosphor_assets.md`

## Scope

Edit only the Phase 1 section, especially the vocabulary table and nearby invariant rules.

## Red

```gherkin id="urithiru-schema-lock"
Scenario Outline: Phase 1 table matches the corrected evidence model
  Given the Phase 1 vocabulary table
  When the row for <field> is read
  Then its values must match the authoritative subphase_1.1 model exactly

Examples:
  | field                           |
  | provenance.match.method          |
  | provenance.match.evidenceStatus  |
  | redistribution.conclusion        |
  | releaseDecision.action           |
```

## Green

Replace the existing table with the corrected table:

| Field                             | Allowed values                                                                                                                        |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `provenance.match.method`         | `exact-byte-match`, `normalized-content-match`, `structural-match`, `visual-match`, `metadata-only`, `maintainer-attestation`, `null` |
| `provenance.match.evidenceStatus` | `verified`, `partially-verified`, `unresolved`                                                                                        |
| `redistribution.conclusion`       | `permitted`, `restricted`, `permission-required`, `undetermined`                                                                      |
| `releaseDecision.action`          | `include`, `exclude`, `pending`                                                                                                       |

Update the invariant rules to state:

- every non-null/non-default field needs a paired rationale, basis, or details string;
- `suppliedByMaintainer` remains `false` for agent-found sources;
- `riskAcceptance` is a nested object, not an enum value;
- `releaseDecision.action: "include"` with any `redistribution.conclusion` other than `permitted` requires
  maintainer-owned risk acceptance;
- the older `redistribution.status` vocabulary in the Phase 1 provenance document is superseded by the corrected
  evidence model;
- agent-led web research is allowed, but release decisions remain maintainer-gated.

## Refactor

Keep the table compact and avoid repeating the same enum values elsewhere in the document. Future phases should refer
back to this Phase 1 contract instead of duplicating the vocabulary.

## Acceptance Criteria

- The four-row table matches the authoritative model exactly.
- `partially-verified` is present.
- `redistribution.conclusion` does not include `verified` or `risk-accepted`.
- `releaseDecision.action` does not include `permitted` or `risk-accepted`.
- `riskAcceptance` is described as an object, not an enum.
- The edit is limited to the Phase 1 section.

## Non-Goals

- Do not update Phase 2, Phase 3, Phase 4, the final acceptance matrix, or consolidated non-goals unless they directly
  repeat the invalid enum values.
- Do not touch the manifest.
- Do not touch SVGs.
- Do not change source code or package metadata.

## Suggested Execution Order

Run after Cycle 1.

---

# Cycle 3 — Mark Phase 1 Done and Add Current Status

## Goal

Mark the vocabulary-locking task as completed without implying that asset research or manifest editing has begun.

## Scope

Edit only the Phase 1 heading and add a short `## Current Status` note under it.

## Red

```gherkin id="shallan-status-note"
Scenario: Phase 1 is marked done without expanding scope
  Given the Phase 3 execution plan
  When the vocabulary contract is corrected
  Then the Phase 1 heading is marked DONE
  And the current status summarizes only the vocabulary correction
  And no research, manifest edit, or release decision is claimed
```

## Green

Change the heading to:

```markdown id="adolin-heading"
# [DONE] Phase 1 — Lock the Evidence and Vocabulary Contract
```

Add a concise status note covering:

- `provenance.match.evidenceStatus` corrected to include `partially-verified`;
- `redistribution.conclusion` corrected to `permitted | restricted | permission-required | undetermined`;
- `releaseDecision.action` corrected to `include | exclude | pending`;
- `riskAcceptance` clarified as a nested maintainer-owned object;
- the older `phase_1_establish_licensing_provenance_and_attribution.md` redistribution vocabulary is superseded;
- no manifest, SVG, inventory, package metadata, or source files were changed.

## Refactor

Keep the status note short. It should summarize the result, not duplicate the entire vocabulary table.

## Acceptance Criteria

- Phase 1 heading is marked `[DONE]`.
- `## Current Status` explains the corrected contract.
- The note explicitly says no manifest or asset changes occurred.
- It does not claim Phase 2 research has started.
- It does not make release or risk-acceptance decisions.

## Non-Goals

- Do not mark the whole Phase 3 plan done.
- Do not mark asset verification done.
- Do not archive the file.
- Do not edit other sections for style-only reasons.

## Suggested Execution Order

Run after Cycle 2.

---

# Cycle 4 — Verify Single-File Scope and Protected Paths

## Goal

Confirm that this was a plan-contract correction only.

## Scope

Verify:

- one modified file;
- only the Phase 1 section changed;
- no manifest changes;
- no SVG/source/package changes.

## Red

```gherkin id="dalinar-diff-oath"
Feature: Phase 1 repository purity

Scenario: Vocabulary locking changes only its own plan section
  Given the repository after the Phase 1 correction
  When git status and git diff are inspected
  Then only phase_3_verify_the_nine_non_phosphor_assets.md is modified
  And the diff is limited to the Phase 1 section
  And the manifest and SVG assets remain unchanged
```

## Green

Run from `astro-website/`:

```powershell id="warbreaker-status-check"
Set-Location "e:\teaching\DIBS\projects\astro-website"

git status --short

git diff -- traceability-log/open/phase_3_verify_the_nine_non_phosphor_assets.md

git diff -- packages/astro-icons/LICENSES/third-party-icons.json
git diff -- packages/astro-icons/src
git diff -- packages/astro-icons/migration/icon-inventory.json
git diff -- packages/astro-icons/package.json
```

Expected status:

```text id="elantris-expected-status"
M traceability-log/open/phase_3_verify_the_nine_non_phosphor_assets.md
```

Expected protected-path diffs:

```text id="mistborn-empty-diffs"
# Empty output for:
# - packages/astro-icons/LICENSES/third-party-icons.json
# - packages/astro-icons/src
# - packages/astro-icons/migration/icon-inventory.json
# - packages/astro-icons/package.json
```

## Refactor

Remove any scratch note or temporary checker if one was created. For this task, no script should be necessary.

## Acceptance Criteria

- `git status --short` shows exactly one modified file.
- The single-file diff is limited to Phase 1.
- Manifest diff is empty.
- SVG/source diff is empty.
- Inventory diff is empty.
- Package metadata diff is empty.
- No temporary files remain.

## Non-Goals

- Do not add automated tests.
- Do not create a permanent checker.
- Do not run asset research.
- Do not update generated outputs.

## Suggested Execution Order

Run last. Repeat after any wording adjustment.

---

# Final Acceptance Matrix

| Area                              | Acceptance criterion                                                                |
| --------------------------------- | ----------------------------------------------------------------------------------- |
| Editable scope                    | Only `traceability-log/open/phase_3_verify_the_nine_non_phosphor_assets.md` changes |
| Section scope                     | Only the Phase 1 section changes                                                    |
| `provenance.match.method`         | Remains unchanged and correct                                                       |
| `provenance.match.evidenceStatus` | Corrected to `verified`, `partially-verified`, `unresolved`                         |
| `redistribution.conclusion`       | Corrected to `permitted`, `restricted`, `permission-required`, `undetermined`       |
| `releaseDecision.action`          | Corrected to `include`, `exclude`, `pending`                                        |
| `riskAcceptance`                  | Clarified as nested maintainer-owned object, not enum                               |
| Supersession note                 | Older Phase 1 `redistribution.status` vocabulary documented as superseded           |
| Maintainer gate                   | Release/risk decisions remain maintainer-owned                                      |
| Manifest                          | No changes                                                                          |
| SVG/source files                  | No changes                                                                          |
| Inventory/package metadata        | No changes                                                                          |
| Status marker                     | Phase 1 marked `[DONE]`, not the whole Phase 3 plan                                 |

---

# Consolidated Non-Goals

- Do not research the nine assets yet.
- Do not edit `packages/astro-icons/LICENSES/third-party-icons.json`.
- Do not edit `traceability-log/open/subphase_1.1_establish_the_provenance_evidence_manifest.md`.
- Do not edit `traceability-log/open/phase_1_establish_licensing_provenance_and_attribution.md`.
- Do not edit SVG files.
- Do not edit inventory files.
- Do not edit package metadata.
- Do not mark Phase 2, Phase 3, or Phase 4 done.
- Do not archive the plan.
- Do not introduce release decisions, permission conclusions, or maintainer risk acceptance.

---

# Main Improvements Over the Original Plan

The original plan is already well scoped, but it still reads like a mini phase plan. Since only one document section
should change, the improved version makes it a **four-cycle documentation TDD pass**:

1. identify the authoritative vocabulary delta;
2. patch the table and invariants;
3. mark only Phase 1 done;
4. verify single-file repository purity.

DDT is useful for the vocabulary table because this is a fixed matrix of fields and allowed values. PBT is not useful
here because there is no broad input domain; the task is a deterministic documentation correction against a known
source-of-truth model.
