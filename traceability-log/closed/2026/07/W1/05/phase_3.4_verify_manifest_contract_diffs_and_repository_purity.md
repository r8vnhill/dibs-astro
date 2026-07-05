# [DONE] Phase 3.4 --- Verify Manifest Contract, Diffs, and Repository Purity

## Scope Classification

**Recommended structure:** short **red-green-refactor cycles**.

**Why:** this task has no intended content edits. It verifies:

- manifest schema/field invariants;
- controlled-vocabulary compliance;
- repository diff boundaries;
- absence of temporary artifacts;
- pass/fail reporting.

**Behavior-preserving constraint:** no package behavior, SVG bytes, inventory, package metadata, provenance evidence, or
traceability content changes.

---

# Cycle 1 — Normalize the Verification Contract

## Goal

Translate the Phase 3.4 assertion list into the corrected Phase 3.1 vocabulary before running checks.

## Scope

Read only:

```text
traceability-log/open/phase_3_verify_the_nine_non_phosphor_assets.md
packages/astro-icons/LICENSES/third-party-icons.json
```

Normalize stale assertion wording:

| Original stale wording                         | Correct Phase 3.1 interpretation                                                        |
| ---------------------------------------------- | --------------------------------------------------------------------------------------- |
| `risk-accepted` release action                 | not a valid action; check `riskAcceptance` object instead                               |
| `permitted` release action                     | not a valid action; check `include` only when redistribution is `permitted`             |
| “no risk-accepted without maintainer sign-off” | no non-null `riskAcceptance` while action is `pending`; no invented maintainer decision |
| “no permitted while license unresolved”        | no `include` unless `redistribution.conclusion === "permitted"`                         |

## Red

```gherkin
Feature: Corrected Phase 3.4 verification contract

Scenario: Verification uses the locked release-decision vocabulary
  Given the Phase 3.1 vocabulary defines releaseDecision.action as include, exclude, or pending
  When Phase 3.4 assertions are implemented
  Then no assertion may test for risk-accepted or permitted as release actions
  And risk acceptance must be checked through releaseDecision.riskAcceptance
  And inclusion must require redistribution.conclusion to be permitted
```

## Green

Define the final assertion set:

1. manifest parses as JSON;
2. all nine target assets exist;
3. `provenance.retrievalSource.suppliedByMaintainer === false`;
4. `provenance.match.method` is in the allowed method vocabulary;
5. `provenance.match.evidenceStatus` is in the allowed evidence-status vocabulary;
6. no `verified` evidence uses only `metadata-only` or `maintainer-attestation`;
7. `redistribution.conclusion` is in the allowed redistribution vocabulary;
8. no `pending` asset has non-null `releaseDecision.riskAcceptance`;
9. no `include` action exists unless `redistribution.conclusion === "permitted"`;
10. every `pending` asset has a non-empty `redistribution.rationale` naming a blocker.

## Refactor

Keep the compatibility note short in the final report:

```text
Assertions 8–9 were executed against the corrected Phase 3.1 vocabulary: include | exclude | pending. The older risk-accepted/permitted action names were treated as stale wording, not live enum values.
```

## Acceptance Criteria

- The assertion semantics match the corrected vocabulary.
- No nonexistent enum member is tested as if it were valid.
- The verification remains faithful to the source document’s intent.
- No repository file is edited.

## Non-Goals

- Do not edit the Phase 3.4 spec.
- Do not change manifest values.
- Do not mark Phase 3.4 `[DONE]`.

## Suggested Execution Order

Run first. It prevents false failures caused by stale enum wording.

---

# Cycle 2 — Run the Manifest Contract Assertions

## Goal

Verify the manifest’s nine non-Phosphor asset records against the corrected contract.

## Scope

Read only:

```text
packages/astro-icons/LICENSES/third-party-icons.json
```

Target assets:

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

## Red

```gherkin
Feature: Manifest provenance contract

Scenario Outline: Every non-Phosphor asset satisfies the conservative provenance contract
  Given the manifest contains a <asset> record
  When the Phase 3.4 assertion suite runs
  Then the record must use only corrected vocabulary values
  And suppliedByMaintainer must be false
  And releaseDecision.action must remain pending unless later maintainer work changes it
  And releaseDecision.riskAcceptance must remain null while pending
  And redistribution.rationale must name one blocker

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

Run a DDT-style PowerShell checker from `astro-website/`:

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

$allowedMethods = @(
    "exact-byte-match",
    "normalized-content-match",
    "structural-match",
    "visual-match",
    "metadata-only",
    "maintainer-attestation",
    $null
)

$allowedEvidenceStatuses = @(
    "verified",
    "partially-verified",
    "unresolved"
)

$allowedRedistributionConclusions = @(
    "permitted",
    "restricted",
    "permission-required",
    "undetermined"
)

$allowedReleaseActions = @(
    "include",
    "exclude",
    "pending"
)

$results = [ordered]@{}

$results.JsonParses = $null -ne $manifest

$results.AllNineAssetsPresent = @(
    foreach ($name in $assetNames) {
        $null -ne $manifest.$name
    }
) -notcontains $false

$results.AllAgentSourced = @(
    foreach ($name in $assetNames) {
        $manifest.$name.provenance.retrievalSource.suppliedByMaintainer -eq $false
    }
) -notcontains $false

$results.MatchMethodsAllowed = @(
    foreach ($name in $assetNames) {
        $allowedMethods -contains $manifest.$name.provenance.match.method
    }
) -notcontains $false

$results.EvidenceStatusesAllowed = @(
    foreach ($name in $assetNames) {
        $allowedEvidenceStatuses -contains $manifest.$name.provenance.match.evidenceStatus
    }
) -notcontains $false

$results.NoWeakVerifiedEvidence = @(
    foreach ($name in $assetNames) {
        $match = $manifest.$name.provenance.match
        -not (
            $match.evidenceStatus -eq "verified" -and
            @("metadata-only", "maintainer-attestation") -contains $match.method
        )
    }
) -notcontains $false

$results.RedistributionConclusionsAllowed = @(
    foreach ($name in $assetNames) {
        $allowedRedistributionConclusions -contains $manifest.$name.redistribution.conclusion
    }
) -notcontains $false

$results.ReleaseActionsAllowed = @(
    foreach ($name in $assetNames) {
        $allowedReleaseActions -contains $manifest.$name.releaseDecision.action
    }
) -notcontains $false

$results.NoPendingRiskAcceptance = @(
    foreach ($name in $assetNames) {
        $asset = $manifest.$name
        -not (
            $asset.releaseDecision.action -eq "pending" -and
            $null -ne $asset.releaseDecision.riskAcceptance
        )
    }
) -notcontains $false

$results.NoUnsupportedInclude = @(
    foreach ($name in $assetNames) {
        $asset = $manifest.$name
        -not (
            $asset.releaseDecision.action -eq "include" -and
            $asset.redistribution.conclusion -ne "permitted"
        )
    }
) -notcontains $false

$results.PendingAssetsHaveBlockers = @(
    foreach ($name in $assetNames) {
        $asset = $manifest.$name
        if ($asset.releaseDecision.action -ne "pending") {
            $true
        } else {
            -not [string]::IsNullOrWhiteSpace($asset.redistribution.rationale)
        }
    }
) -notcontains $false

$results
```

## Refactor

If any assertion fails, classify the failure before changing anything:

| Failure type                | Action                                                    |
| --------------------------- | --------------------------------------------------------- |
| checker bug                 | fix the temporary checker and rerun                       |
| stale vocabulary assumption | correct the checker, not the manifest                     |
| actual manifest drift       | report failure; do not edit manifest in this phase        |
| missing blocker rationale   | report failure; defer correction to a separate write pass |

## Acceptance Criteria

- All manifest assertions return `True`.
- The checker uses only the corrected vocabulary.
- The checker does not mutate files.
- Any failure is reported, not silently repaired.

## Non-Goals

- Do not edit the manifest.
- Do not add a permanent checker.
- Do not upgrade `metadata-only` or `visual-match` rows.
- Do not create `riskAcceptance`.

## Suggested Execution Order

Run after Cycle 1.

---

# Cycle 3 — Verify Repository Purity and Protected Paths

## Goal

Confirm that Phase 3.3 modified only the expected artifacts and did not affect package behavior.

## Scope

Read-only Git checks from:

```text
e:\teaching\DIBS\projects\astro-website
```

Expected Phase 3.3 modified files:

```text
packages/astro-icons/LICENSES/third-party-icons.json
traceability-log/open/phase_1_establish_licensing_provenance_and_attribution.md
traceability-log/open/subphase_1.1_establish_the_provenance_evidence_manifest.md
```

Known out-of-scope entries may exist:

- pre-existing `phase_3_verify_the_nine_non_phosphor_assets.md` heading rename;
- pre-existing `phase_2_...` move into `closed/`.

Do not re-investigate those unless they changed during this pass.

## Red

```gherkin
Feature: Repository purity

Scenario: Phase 3.4 is read-only and package behavior remains unchanged
  Given Phase 3.3 completed the provenance write pass
  When repository purity checks run
  Then only the expected provenance documentation files may be newly modified
  And protected package paths must have empty diffs
  And Phase 3.4 must not edit the source spec document
```

## Green

Run:

```powershell
Set-Location "e:\teaching\DIBS\projects\astro-website"

git status --short

git diff -- packages/astro-icons/LICENSES/third-party-icons.json
git diff -- traceability-log/open/phase_1_establish_licensing_provenance_and_attribution.md
git diff -- traceability-log/open/subphase_1.1_establish_the_provenance_evidence_manifest.md

git diff -- packages/astro-icons/src
git diff -- packages/astro-icons/migration/icon-inventory.json
git diff -- packages/astro-icons/package.json
git diff -- traceability-log/open/phase_3_verify_the_nine_non_phosphor_assets.md
```

## Refactor

Classify `git status --short` output into:

| Category                       | Expected treatment                                    |
| ------------------------------ | ----------------------------------------------------- |
| Phase 3.3 files                | expected modified paths                               |
| protected package paths        | must be absent or empty diff                          |
| pre-existing unrelated entries | report as pre-existing and out of scope               |
| new scratch artifacts          | remove if generated by verification; otherwise report |
| unexpected new modified files  | fail the purity check                                 |

## Acceptance Criteria

- The three Phase 3.3 files are the only in-scope modified files.
- Protected paths have empty diffs:

  - `packages/astro-icons/src`
  - `packages/astro-icons/migration/icon-inventory.json`
  - `packages/astro-icons/package.json`
- `phase_3_verify_the_nine_non_phosphor_assets.md` is not modified by this pass.
- Any pre-existing unrelated diffs are named as out-of-scope, not treated as Phase 3.4 output.
- No repository file is edited.

## Non-Goals

- Do not clean up unrelated pre-existing diffs.
- Do not resolve the `phase_2_...` closed-file move.
- Do not edit the Phase 3.4 document.
- Do not stage or commit files.

## Suggested Execution Order

Run after Cycle 2.

---

# Cycle 4 — Cleanup Check and Verification Report

## Goal

Remove only verification-created scratch artifacts, if any, and report the Phase 3.4 result.

## Scope

Check for temporary files created during this verification pass, such as:

- ad-hoc `.ps1` checkers;
- downloaded SVGs;
- fetched HTML pages;
- comparison notes;
- scratch JSON files.

If none were created, state that explicitly.

## Red

```gherkin
Feature: Verification cleanup and reporting

Scenario: Verification leaves no scratch artifacts
  Given the manifest and repository checks have completed
  When cleanup runs
  Then no temporary checkers, downloaded SVGs, comparison notes, or scratch files may remain
  And the final report must list pass/fail status for each assertion group
```

## Green

Report results in this shape:

```markdown
## Phase 3.4 Verification Report

### Manifest Contract Assertions

| #  | Assertion group                                  | Result    |
| -- | ------------------------------------------------ | --------- |
| 1  | JSON parses                                      | PASS/FAIL |
| 2  | All nine target assets present                   | PASS/FAIL |
| 3  | `suppliedByMaintainer === false`                 | PASS/FAIL |
| 4  | Match methods allowed                            | PASS/FAIL |
| 5  | Evidence statuses allowed                        | PASS/FAIL |
| 6  | No weak `verified` evidence                      | PASS/FAIL |
| 7  | Redistribution conclusions allowed               | PASS/FAIL |
| 8  | Release actions allowed                          | PASS/FAIL |
| 9  | No pending risk acceptance / unsupported include | PASS/FAIL |
| 10 | Pending assets have blockers                     | PASS/FAIL |

### Repository Purity

| Check                                      | Result    |
| ------------------------------------------ | --------- |
| Expected Phase 3.3 files modified          | PASS/FAIL |
| Protected SVG path diff empty              | PASS/FAIL |
| Inventory diff empty                       | PASS/FAIL |
| Package metadata diff empty                | PASS/FAIL |
| Phase 3.4 spec file untouched by this pass | PASS/FAIL |
| Scratch artifacts absent                   | PASS/FAIL |
```

## Refactor

Keep the report factual:

- do not say Phase 3.4 is `[DONE]` unless the user asks to update the doc;
- do not summarize unrelated diffs beyond naming them as pre-existing/out-of-scope;
- do not prescribe manifest corrections unless an assertion fails.

## Acceptance Criteria

- The final report includes pass/fail for each assertion group.
- Cleanup removes only verification-created scratch artifacts.
- No repository content is edited except cleanup of verification-created scratch files, if any.
- Failures are reported clearly and deferred to a separate corrective pass.

## Non-Goals

- Do not edit traceability docs.
- Do not mark Phase 3.4 complete.
- Do not archive anything.
- Do not run new research.

## Suggested Execution Order

Run last.

---

# Final Acceptance Matrix

| Area               | Acceptance criterion                                                            |
| ------------------ | ------------------------------------------------------------------------------- |
| Scope              | Phase 3.4 is read-only except cleanup of verification-created scratch files     |
| Vocabulary         | Assertions use `include`, `exclude`, `pending`, not stale release-action values |
| Manifest parse     | `third-party-icons.json` parses                                                 |
| Asset coverage     | All nine non-Phosphor assets are present                                        |
| Maintainer source  | All nine have `suppliedByMaintainer === false`                                  |
| Match method       | All values are in the allowed vocabulary                                        |
| Evidence status    | All values are in the allowed vocabulary                                        |
| Weak evidence rule | No `verified` row uses `metadata-only` or `maintainer-attestation`              |
| Redistribution     | All conclusions are in the allowed vocabulary                                   |
| Release action     | All actions are in `include`, `exclude`, `pending`                              |
| Risk acceptance    | No pending asset has non-null `riskAcceptance`                                  |
| Inclusion gate     | No `include` unless redistribution is `permitted`                               |
| Blocker rationale  | Every pending asset has a non-empty rationale naming one blocker                |
| Git scope          | Only expected Phase 3.3 files are in-scope modified paths                       |
| Protected paths    | SVGs, inventory, and package metadata have empty diffs                          |
| Source spec        | `phase_3_verify_the_nine_non_phosphor_assets.md` is not edited by this pass     |
| Cleanup            | No scratch artifacts remain                                                     |
| Reporting          | Pass/fail status is recorded for each assertion group                           |

---

# Consolidated Non-Goals

- Do not edit `packages/astro-icons/LICENSES/third-party-icons.json`.
- Do not edit any SVG.
- Do not edit inventory or package metadata.
- Do not edit `traceability-log/open/phase_3_verify_the_nine_non_phosphor_assets.md`.
- Do not mark Phase 3.4 `[DONE]`.
- Do not archive or move files.
- Do not run web research.
- Do not fetch upstream SVGs.
- Do not promote evidence status.
- Do not create or modify `riskAcceptance`.
- Do not resolve unrelated pre-existing diffs.
