# [DONE] Phase 4 --- Normalize and Close the Evidence Manifest

## Scope Classification

**Recommended structure:** direct **red-green-refactor cycles**.

**Why:** this is a deterministic closure pass:

- evidence records already exist;
- the maintainer decision is confirmed: all nine non-Phosphor assets become `exclude`;
- no new research is required;
- no SVG or package behavior changes are intended;
- only two files should change.

**Primary risk:** accidentally making the manifest look more legally certain than the evidence supports.

---

# Cycle 1 — Lock the Closure Contract

## Goal

Confirm the exact closure rule before editing the manifest.

## Scope

Read only:

```text
packages/astro-icons/LICENSES/third-party-icons.json
traceability-log/open/phase_1_establish_licensing_provenance_and_attribution.md
traceability-log/open/subphase_1.1_establish_the_provenance_evidence_manifest.md
packages/astro-icons/migration/icon-inventory.json
```

## Red

```gherkin
Feature: Conservative manifest closure

Scenario: Pending non-Phosphor assets block manifest completion
  Given the nine non-Phosphor assets have unresolved or permission-required redistribution status
  And the maintainer has chosen conservative exclusion
  When Phase 4 closes the evidence manifest
  Then every non-Phosphor release decision must become exclude
  And no riskAcceptance object may be created
  And no asset file may be removed or modified
  And reviewStatus may become complete only after structural verification passes
```

## Green

Lock these closure decisions:

| Asset          | Release action | Risk acceptance | Closure posture                                      |
| -------------- | -------------: | --------------: | ---------------------------------------------------- |
| `bash`         |      `exclude` |          `null` | Excluded pending exact match and rights clearance    |
| `csv`          |      `exclude` |          `null` | Excluded pending exact source confirmation           |
| `json`         |      `exclude` |          `null` | Excluded pending lineage/trademark clarity           |
| `kotlin`       |      `exclude` |          `null` | Excluded pending trademark/brand clearance           |
| `nushell-logo` |      `exclude` |          `null` | Excluded pending source match and obligations review |
| `powershell`   |      `exclude` |          `null` | Excluded pending Microsoft brand clearance           |
| `python`       |      `exclude` |          `null` | Excluded pending PSF logo/trademark clearance        |
| `scala`        |      `exclude` |          `null` | Excluded pending exact match and trademark clearance |
| `xml`          |      `exclude` |          `null` | Excluded pending exact source confirmation           |

## Refactor

Clarify the closure semantics:

```text
exclude means “do not ship this asset under the current evidence state.”
It does not mean the local SVG was deleted, that the upstream license is invalid, or that future inclusion is impossible.
```

## Acceptance Criteria

- The closure decision is explicit for all nine assets.
- `exclude` is treated as a manifest decision, not a source-tree removal.
- `riskAcceptance` remains `null`.
- No evidence is promoted to `verified`.

## Non-Goals

- Do not remove SVG files.
- Do not change export names.
- Do not rewrite provenance evidence.
- Do not infer permission from pending evidence.

## Suggested Execution Order

Run first.

---

# Cycle 2 — Normalize the Nine Non-Phosphor Manifest Records

## Goal

Fill missing descriptive fields and record the conservative exclusion decision.

## Scope

Edit only the nine non-Phosphor objects in:

```text
packages/astro-icons/LICENSES/third-party-icons.json
```

Allowed changes:

- `assetType`
- `displayName`
- `rights.copyright.verifiedAt`
- `rights.trademark.verifiedAt`, only where trademark status is actually known/restricted
- `releaseDecision.action`
- `releaseDecision.riskAcceptance`
- `notes[]`

Do not change:

- `file`
- `exportName`
- `localArtifact.sha256`
- `provenance.*`, except only if formatting requires no semantic change
- `redistribution.conclusion`
- `redistribution.rationale`
- `packageCodeCopyrightHolder`
- `inventoryFile`
- `phosphor`
- `schemaVersion`
- `reviewStatus` yet

## Red

```gherkin
Feature: Non-Phosphor manifest normalization

Scenario Outline: Each non-Phosphor asset is conservatively excluded
  Given the manifest record for <asset>
  When Phase 4 normalizes the record
  Then assetType and displayName must be non-null
  And releaseDecision.action must be exclude
  And releaseDecision.riskAcceptance must remain null
  And notes must include one asset-specific exclusion rationale

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

Use this normalization matrix:

| Asset          | `assetType`      | `displayName`        | Exclusion rationale basis                                                                           |
| -------------- | ---------------- | -------------------- | --------------------------------------------------------------------------------------------------- |
| `bash`         | `logo`           | `Bash logo`          | Aggregator candidate found, but exact local match and trademark/license clearance remain unverified |
| `csv`          | `file-type-icon` | `CSV file-type icon` | Redistribution remains undetermined and exact source page is unconfirmed                            |
| `json`         | `logo`           | `JSON logo`          | Exact vector lineage and trademark status remain unresolved                                         |
| `kotlin`       | `logo`           | `Kotlin logo`        | Trademark-controlled brand asset; redistribution requires permission or stronger clearance          |
| `nushell-logo` | `logo`           | `Nushell logo`       | Local file is a VTracer trace; source match and license obligations remain unresolved               |
| `powershell`   | `logo`           | `PowerShell logo`    | Microsoft brand/trademark clearance remains required                                                |
| `python`       | `logo`           | `Python logo`        | PSF logo/trademark clearance remains required                                                       |
| `scala`        | `logo`           | `Scala logo`         | Aggregator candidate found, but exact local match and trademark clearance remain unverified         |
| `xml`          | `file-type-icon` | `XML file-type icon` | Redistribution remains undetermined and exact source page is unconfirmed                            |

If `assetType` has a controlled vocabulary and `file-type-icon` is not allowed, use the repository’s closest existing
value. Do **not** force `csv` and `xml` into `logo` unless the schema has no better allowed category.

Set:

```json
"releaseDecision": {
  "action": "exclude",
  "riskAcceptance": null
}
```

Append one asset-specific note to each `notes[]` array. Prefer this pattern:

```text
Excluded from packaging: <asset-specific blocker>.
```

Set:

```text
rights.copyright.verifiedAt = "2026-07-05"
```

for all nine if the schema treats `verifiedAt` as “reviewed on this date,” including reviewed `NOASSERTION` conclusions.

Set:

```text
rights.trademark.verifiedAt = "2026-07-05"
```

only for assets with an actual trademark determination, such as:

- `powershell`
- `python`
- `kotlin`

Leave trademark verification dates `null` where trademark status remains `unknown` / `undetermined`.

## Refactor

Ensure every exclusion note is asset-specific, not generic boilerplate.

Good:

```text
Excluded from packaging: Microsoft brand/trademark clearance remains permission-required.
```

Weak:

```text
Excluded from packaging: evidence incomplete.
```

## Acceptance Criteria

- All nine assets have non-null `assetType`.
- All nine assets have non-null `displayName`.
- `csv` and `xml` are not mislabeled as logos unless schema constraints force it.
- All nine have `releaseDecision.action === "exclude"`.
- All nine keep `releaseDecision.riskAcceptance === null`.
- All nine have one new exclusion note.
- Copyright review date is set consistently.
- Trademark review date is set only where trademark status is actually known/restricted.

## Non-Goals

- Do not set any asset to `include`.
- Do not create `riskAcceptance`.
- Do not change `redistribution.conclusion`.
- Do not change local artifact hashes.
- Do not change provenance URLs or match methods.

## Suggested Execution Order

Run after Cycle 1.

---

# Cycle 3 — Verify Structural Completeness Before Closing Review Status

## Goal

Prove the manifest is structurally complete before setting top-level `reviewStatus` to `complete`.

## Scope

Read-only verification against:

```text
packages/astro-icons/LICENSES/third-party-icons.json
packages/astro-icons/migration/icon-inventory.json
packages/astro-icons/src
```

## Red

```gherkin
Feature: Manifest completion gate

Scenario: Manifest cannot be marked complete until structural checks pass
  Given the manifest has normalized non-Phosphor records
  When Phase 4 structural verification runs
  Then every custom asset file must match the frozen inventory
  And every local SHA-256 must match the manifest
  And no placeholder wording may remain
  And Phosphor inventoryCount must still equal 1512
```

## Green

Run a DDT-style verification script from `astro-website/`.

Recommended assertion groups:

```powershell
Set-Location "e:\teaching\DIBS\projects\astro-website"

$manifestPath = "packages\astro-icons\LICENSES\third-party-icons.json"
$inventoryPath = "packages\astro-icons\migration\icon-inventory.json"

$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
$inventory = Get-Content $inventoryPath -Raw | ConvertFrom-Json

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

$results = [ordered]@{}

$results.JsonParses = $null -ne $manifest

$results.AllNineExcluded = @(
    foreach ($name in $assetNames) {
        $manifest.$name.releaseDecision.action -eq "exclude"
    }
) -notcontains $false

$results.NoRiskAcceptance = @(
    foreach ($name in $assetNames) {
        $null -eq $manifest.$name.releaseDecision.riskAcceptance
    }
) -notcontains $false

$results.AssetTypesFilled = @(
    foreach ($name in $assetNames) {
        -not [string]::IsNullOrWhiteSpace($manifest.$name.assetType)
    }
) -notcontains $false

$results.DisplayNamesFilled = @(
    foreach ($name in $assetNames) {
        -not [string]::IsNullOrWhiteSpace($manifest.$name.displayName)
    }
) -notcontains $false

$results.CopyrightReviewed = @(
    foreach ($name in $assetNames) {
        $manifest.$name.rights.copyright.verifiedAt -eq "2026-07-05"
    }
) -notcontains $false

$results.ExclusionNotesPresent = @(
    foreach ($name in $assetNames) {
        @($manifest.$name.notes) -match "Excluded from packaging:"
    }
) -notcontains $false

$results.PhosphorInventoryCountStable =
    $manifest.phosphor.inventoryCount -eq 1512

$manifestText = Get-Content $manifestPath -Raw
$placeholderPattern = "TBD|<source>|to verify|probably|assumed"
$results.NoPlaceholders =
    $manifestText -notmatch $placeholderPattern

$results
```

Also verify hashes and inventory set equality. Adapt the inventory property path to the actual JSON shape:

```powershell
$manifestFiles = @(
    foreach ($name in $assetNames) {
        $manifest.$name.file
    }
) | Sort-Object

# Adjust this accessor to the actual inventory schema.
$inventoryCustomFiles = @(
    $inventory.custom | ForEach-Object { $_.file }
) | Sort-Object

$results.AssetFileSetMatchesInventory =
    ($manifestFiles -join "`n") -eq ($inventoryCustomFiles -join "`n")

$results.LocalHashesMatch = @(
    foreach ($name in $assetNames) {
        $asset = $manifest.$name
        $path = Join-Path "packages\astro-icons\src" $asset.file

        $actualHash = (Get-FileHash -Algorithm SHA256 $path).Hash.ToLowerInvariant()
        $expectedHash = $asset.localArtifact.sha256.ToLowerInvariant()

        $actualHash -eq $expectedHash
    }
) -notcontains $false

$results
```

## Refactor

If a check fails:

| Failure                         | Response                         |
| ------------------------------- | -------------------------------- |
| missing asset type/display name | fix manifest normalization       |
| SHA mismatch                    | stop; do not mark complete       |
| inventory mismatch              | stop; do not mark complete       |
| placeholder found               | remove or replace placeholder    |
| Phosphor count changed          | stop and inspect unintended edit |

## Acceptance Criteria

- Manifest parses.
- All nine non-Phosphor assets are `exclude`.
- All nine have non-null `assetType` and `displayName`.
- All nine keep `riskAcceptance: null`.
- All nine local hashes match.
- Manifest custom file set matches inventory custom file set.
- Phosphor inventory count remains `1512`.
- No placeholder strings remain.

## Non-Goals

- Do not edit inventory.
- Do not update hashes to match changed files.
- Do not normalize SVG bytes.
- Do not change Phosphor lineage.

## Suggested Execution Order

Run after Cycle 2 and before setting `reviewStatus: "complete"`.

---

# Cycle 4 — Flip Manifest Review Status to Complete

## Goal

Close the manifest only after the structural completion gate passes.

## Scope

Edit only the top-level manifest field:

```json
"reviewStatus": "complete"
```

## Red

```gherkin
Feature: Manifest review closure

Scenario: reviewStatus changes only after all completion checks pass
  Given the manifest structural checks pass
  When Phase 4 closes the manifest
  Then reviewStatus must change from in-progress to complete
  And no other top-level manifest metadata may change
```

## Green

Change:

```json
"reviewStatus": "in-progress"
```

to:

```json
"reviewStatus": "complete"
```

## Refactor

Re-run the Cycle 3 manifest checks with the additional assertion:

```powershell
$manifest.reviewStatus -eq "complete"
```

## Acceptance Criteria

- `reviewStatus === "complete"`.
- No unrelated top-level fields changed.
- Completion is supported by passing structural checks.

## Non-Goals

- Do not alter schema version.
- Do not alter package-code copyright holder.
- Do not alter Phosphor provenance.
- Do not alter asset hashes.

## Suggested Execution Order

Run only after Cycle 3 passes.

---

# Cycle 5 — Close the Non-Phosphor Traceability Narrative

## Goal

Update the findings document so it no longer describes the nine assets as unresolved maintainer decisions.

## Scope

Edit only the relevant section in:

```text
traceability-log/open/phase_1_establish_licensing_provenance_and_attribution.md
```

Target section:

```markdown
# Findings — Non-Phosphor Asset Provenance
```

Specifically update:

```markdown
## Outstanding Maintainer Decisions
```

to a closed-decision framing, such as:

```markdown
## Closed Maintainer Decisions
```

## Red

```gherkin
Feature: Traceability closure narrative

Scenario: Traceability reflects conservative exclusion decisions
  Given the manifest now excludes all nine non-Phosphor assets
  When the findings narrative is updated
  Then the narrative must state that all nine assets are excluded from packaging
  And it must preserve the blockers that led to exclusion
  And it must not claim that the assets were removed from the source tree
```

## Green

Update the section to say:

- all nine non-Phosphor assets are marked `exclude`;
- no source SVG was removed or modified;
- exclusion is conservative and reversible if stronger evidence or permission is later obtained;
- `powershell`, `python`, and `kotlin` are excluded because redistribution remains `permission-required`;
- `bash`, `scala`, `nushell-logo`, `json`, `csv`, and `xml` are excluded because redistribution remains `undetermined`;
- `riskAcceptance` remains `null` for all nine.

## Refactor

Keep the audit trail concise and decision-focused. Do not rewrite the full research narrative unless it contradicts the
final manifest state.

## Acceptance Criteria

- Findings match manifest decisions.
- “Pending maintainer decisions” language is removed or reframed.
- The original evidence limitations remain visible.
- The text does not claim deletion or asset replacement.
- No unrelated traceability sections change.

## Non-Goals

- Do not mark the entire Phase 1 document done.
- Do not change Phosphor findings.
- Do not add new source claims.
- Do not add license text.

## Suggested Execution Order

Run after Cycle 4.

---

# Cycle 6 — Final Repository Purity Check

## Goal

Confirm that Phase 4 changed only the intended manifest and traceability document.

## Scope

Run from:

```text
e:\teaching\DIBS\projects\astro-website
```

## Red

```gherkin
Feature: Phase 4 repository purity

Scenario: Closing the manifest does not modify package artifacts
  Given Phase 4 has normalized and closed the manifest
  When repository diffs are inspected
  Then only the manifest and non-Phosphor traceability findings may change
  And SVGs, inventory, package metadata, and package source must have empty diffs
```

## Green

Run:

```powershell
Set-Location "e:\teaching\DIBS\projects\astro-website"

git status --short

git diff -- packages/astro-icons/LICENSES/third-party-icons.json
git diff -- traceability-log/open/phase_1_establish_licensing_provenance_and_attribution.md

git diff -- packages/astro-icons/src
git diff -- packages/astro-icons/migration/icon-inventory.json
git diff -- packages/astro-icons/package.json
```

Expected in-scope modified files:

```text
M packages/astro-icons/LICENSES/third-party-icons.json
M traceability-log/open/phase_1_establish_licensing_provenance_and_attribution.md
```

Expected empty protected diffs:

```text
packages/astro-icons/src
packages/astro-icons/migration/icon-inventory.json
packages/astro-icons/package.json
```

## Refactor

Remove temporary validation scripts or scratch output if any were created.

## Acceptance Criteria

- Only the manifest and one traceability document are in-scope changes.
- Protected path diffs are empty.
- No scratch artifacts remain.
- Final manifest assertions still pass after the traceability edit.

## Non-Goals

- Do not update `subphase_1.1_establish_the_provenance_evidence_manifest.md` unless separately requested.
- Do not archive the subphase.
- Do not stage or commit files.

## Suggested Execution Order

Run last.

---

# Final Acceptance Matrix

| Area                  | Acceptance criterion                                                                                 |
| --------------------- | ---------------------------------------------------------------------------------------------------- |
| Manifest status       | `reviewStatus === "complete"`                                                                        |
| Release decisions     | All nine non-Phosphor assets have `releaseDecision.action === "exclude"`                             |
| Risk acceptance       | All nine keep `releaseDecision.riskAcceptance === null`                                              |
| Asset typing          | `assetType` and `displayName` filled for all nine                                                    |
| Type accuracy         | `csv` and `xml` are treated as file-type icons, not logos, unless schema constraints force otherwise |
| Copyright review      | `rights.copyright.verifiedAt === "2026-07-05"` for all nine                                          |
| Trademark review      | trademark `verifiedAt` set only where trademark status is actually determined                        |
| Evidence conservatism | No evidence is promoted to `verified`; no license is strengthened                                    |
| Inventory parity      | Manifest custom file set equals inventory custom file set                                            |
| Hash parity           | Recomputed SVG SHA-256 values match `localArtifact.sha256`                                           |
| Phosphor stability    | `phosphor.inventoryCount === 1512`; Phosphor lineage unchanged                                       |
| Placeholder scan      | No `TBD`, `<source>`, `to verify`, `probably`, or `assumed` strings remain                           |
| Traceability          | Findings reflect closed `exclude` decisions without claiming asset deletion                          |
| Repository purity     | Only manifest and one traceability document change                                                   |
| Protected paths       | SVGs, inventory, package metadata, and source files remain unchanged                                 |

---

# Consolidated Non-Goals

- Do not include any of the nine non-Phosphor assets.
- Do not remove any SVG from the source tree.
- Do not update local SHA-256 values unless the files legitimately changed in a separate, explicit phase.
- Do not edit `icon-inventory.json`.
- Do not edit `package.json`.
- Do not edit package source.
- Do not change Phosphor lineage, inventory count, or copyright fields.
- Do not create `riskAcceptance`.
- Do not promote `metadata-only` or `visual-match` evidence.
- Do not add new source URLs or licenses.
- Do not archive the subphase.
- Do not mark parent Phase 4 `[DONE]` unless that is requested separately.
