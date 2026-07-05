# [PLAN] Subphase 1.2, Phase 1 --- Define and Test the Pure Manifest Validator

## Scope Classification

**Recommended structure:** short **red-green-refactor cycles**.

**Why:** this phase adds exactly two files:

```text
packages/astro-icons/scripts/lib/license-metadata.mjs
packages/astro-icons/scripts/test/license-metadata.test.mjs
```

It does not touch:

```text
packages/astro-icons/LICENSES/third-party-icons.json
packages/astro-icons/migration/icon-inventory.json
packages/astro-icons/package.json
packages/astro-icons/LICENSES/THIRD_PARTY.md
```

## Reference Anchors

Use these as local implementation references:

```text
packages/astro-icons/scripts/lib/icon-inventory.mjs
packages/astro-icons/scripts/test/icon-inventory.test.mjs
traceability-log/open/subphase_1.2_define_the_machine_readable_attribution_contract.md
```

The implementation should mirror the existing script style where useful, but the exported contract for this phase is the
validator contract, not a CLI contract.

---

# Cycle 1 --- Establish Module Shape and Frozen Vocabulary Constants

## Goal

Create the pure validation module with the frozen schema constants used by later validators.

## Scope

Create:

```text
packages/astro-icons/scripts/lib/license-metadata.mjs
```

Export exactly:

```js
RELEASE_DECISION_ACTIONS;
REDISTRIBUTION_CONCLUSIONS;
validateAttributionCoverage;
validateReleaseDecisions;
validatePlaceholders;
validateLicenseFileReferences;
validateManifest;
```

## Red

```gherkin
Feature: License metadata module contract

Scenario: The validator exposes the frozen manifest vocabulary
  Given the license metadata module
  When the module is imported
  Then RELEASE_DECISION_ACTIONS contains include, exclude, and pending
  And REDISTRIBUTION_CONCLUSIONS contains permitted, restricted, permission-required, and undetermined
  And the exported validation functions are available
```

## Green

Implement:

```js
export const RELEASE_DECISION_ACTIONS = Object.freeze([
    "include",
    "exclude",
    "pending",
]);

export const REDISTRIBUTION_CONCLUSIONS = Object.freeze([
    "permitted",
    "restricted",
    "permission-required",
    "undetermined",
]);
```

Add placeholder implementations returning passing results or empty finding arrays only long enough to make imports work.

## Refactor

Use private helpers for shared checks, but do not introduce filesystem access.

Recommended internal helpers:

```js
const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const asArray = (value) => Array.isArray(value) ? value : [];
```

## Acceptance Criteria

- The module can be imported by `node:test`.
- The two vocabulary constants are exported and frozen.
- No filesystem imports appear in `license-metadata.mjs`.
- No production manifest is read.

## Non-Goals

- Do not create a CLI.
- Do not add `package.json` scripts.
- Do not add a generated notice.
- Do not add a runtime dependency.

## Suggested Execution Order

Run first.

---

# Cycle 2 --- Validate Attribution Coverage

## Goal

Validate exact set equality between inventory custom files and manifest asset files.

## Scope

Implement:

```js
validateAttributionCoverage(customInventoryFiles, assets);
```

The function should report all of these in one call:

- missing inventory files;
- unexpected manifest files;
- duplicate manifest `file` values.

## Red

```gherkin
Feature: Attribution coverage validation

Scenario: Exact coverage passes
  Given custom inventory files roshar.svg and scadrial.svg
  And manifest assets roshar.svg and scadrial.svg
  When attribution coverage is validated
  Then no findings are returned

Scenario: Coverage reports all violations together
  Given custom inventory files roshar.svg and scadrial.svg
  And manifest assets roshar.svg, nalthis.svg, and roshar.svg again
  When attribution coverage is validated
  Then findings include missing scadrial.svg
  And findings include unexpected nalthis.svg
  And findings include duplicate roshar.svg
```

## Green

Implement deterministic findings, preferably with stable prefixes:

```text
coverage.missing: scadrial.svg
coverage.unexpected: nalthis.svg
coverage.duplicate: roshar.svg
```

Use Sanderson-themed fixtures only:

```text
roshar.svg
scadrial.svg
nalthis.svg
sel.svg
luthadel.svg
urithiru.svg
```

## Refactor

Sort filenames in findings so test output is stable.

Avoid hardcoding the real nine assets or assuming the production manifest count.

## Acceptance Criteria

- Exact coverage returns `[]`.
- Missing, unexpected, and duplicate files are all reported together.
- Findings are deterministic.
- Tests do not use real asset names as the coverage oracle.

## Non-Goals

- Do not inspect the real inventory file.
- Do not read the manifest from disk.
- Do not stop at the first coverage error.

## Suggested Execution Order

Run after Cycle 1.

---

# Cycle 3 --- Validate Release and Redistribution Vocabularies

## Goal

Reject stale or unsupported enum values from earlier draft models.

## Scope

Implement:

```js
validateReleaseDecisions(assets);
```

Validate:

```text
releaseDecision.action ∈ include | exclude | pending
redistribution.conclusion ∈ permitted | restricted | permission-required | undetermined
```

## Red

```gherkin
Feature: Controlled vocabulary validation

Scenario Outline: Unsupported release actions are rejected
  Given an asset with releaseDecision.action set to <value>
  When release decisions are validated
  Then findings include the unsupported action

Examples:
  | value         |
  | risk-accepted |
  | permitted     |

Scenario Outline: Unsupported redistribution conclusions are rejected
  Given an asset with redistribution.conclusion set to <value>
  When release decisions are validated
  Then findings include the unsupported conclusion

Examples:
  | value         |
  | verified      |
  | risk-accepted |
```

## Green

Implement deterministic findings such as:

```text
releaseDecision.action.unsupported: roshar.svg -> risk-accepted
redistribution.conclusion.unsupported: scadrial.svg -> verified
```

Use `asset.file` in finding messages when available. Fall back to a stable index if missing:

```text
asset[0]
```

## Refactor

Add a small helper:

```js
const getAssetLabel = (asset, index) => asset?.file ?? `asset[${index}]`;
```

## Acceptance Criteria

- Valid actions pass.
- Valid redistribution conclusions pass.
- Stale values from the older model fail.
- Multiple invalid assets produce multiple findings.
- The frozen constants are reused by the validator and tests.

## Non-Goals

- Do not validate legal correctness.
- Do not infer whether `include` is lawful.
- Do not mutate invalid records.

## Suggested Execution Order

Run after coverage validation.

---

# Cycle 4 --- Validate Placeholders Recursively

## Goal

Detect residual placeholder or uncertainty wording anywhere inside asset string fields.

## Scope

Implement:

```js
validatePlaceholders(assets);
```

Scan nested string fields case-insensitively for:

```text
TBD
<source>
to verify
probably
assumed
```

This should cover:

- `notes[]`;
- `rationale`;
- `details`;
- URLs;
- `displayName`;
- copyright/trademark basis fields;
- nested provenance and rights strings.

## Red

```gherkin
Feature: Placeholder validation

Scenario: Nested placeholder text is rejected
  Given an asset named roshar.svg
  And the asset has rights.copyright.basis set to "TBD"
  When placeholders are validated
  Then findings include the path rights.copyright.basis

Scenario: Placeholder matching is case-insensitive
  Given an asset named scadrial.svg
  And the asset has a note containing "Probably copied from a source"
  When placeholders are validated
  Then findings include the note path
```

## Green

Implement a recursive string walker that reports paths, for example:

```text
placeholder.found: roshar.svg rights.copyright.basis -> TBD
placeholder.found: scadrial.svg notes[0] -> probably
```

## Refactor

Keep the recursive walker generic and pure.

Recommended shape:

```js
const collectStringFields = (value, path = []) => {
    // returns [{ path, value }]
};
```

Guard against `null`, arrays, and plain objects. Since fixture objects are acyclic, no cycle handling is strictly
required, but a `WeakSet` guard is acceptable if implemented cleanly.

## Acceptance Criteria

- Placeholder scan finds nested strings.
- Matching is case-insensitive.
- Findings include the asset label and field path.
- Non-placeholder strings do not produce findings.
- The function returns all placeholder findings.

## Non-Goals

- Do not scan non-string values.
- Do not rewrite placeholder text.
- Do not scan files on disk.

## Suggested Execution Order

Run after vocabulary validation.

---

# Cycle 5 --- Validate License File References

## Goal

Ensure manifest license-file references point to files supplied by the caller.

## Scope

Implement:

```js
validateLicenseFileReferences(assets, existingLicenseFileNames);
```

Check at least:

```text
rights.copyright.licenseFile
```

Also support a future trademark license-file field if present, without requiring it to exist today. Reasonable paths to
check:

```text
rights.trademark.licenseFile
rights.trademark.permissionFile
rights.trademark.policyFile
```

The function receives existing filenames from the future CLI layer. It must not call `readdir`.

## Red

```gherkin
Feature: License file reference validation

Scenario: Existing license file reference passes
  Given an asset whose rights.copyright.licenseFile is HONOR.txt
  And existing license files include HONOR.txt
  When license file references are validated
  Then no findings are returned

Scenario: Missing license file reference fails
  Given an asset whose rights.copyright.licenseFile is ODIUM.txt
  And existing license files do not include ODIUM.txt
  When license file references are validated
  Then findings include the missing ODIUM.txt reference
```

## Green

Normalize `existingLicenseFileNames` to a `Set`.

Report deterministic findings:

```text
licenseFile.missing: roshar.svg rights.copyright.licenseFile -> ODIUM.txt
```

## Refactor

Keep path checking data-driven:

```js
const LICENSE_FILE_REFERENCE_PATHS = Object.freeze([
    ["rights", "copyright", "licenseFile"],
    ["rights", "trademark", "licenseFile"],
    ["rights", "trademark", "permissionFile"],
    ["rights", "trademark", "policyFile"],
]);
```

This makes future fields cheap to support without changing traversal logic.

## Acceptance Criteria

- Existing references pass.
- Missing references fail with field path.
- `null` or absent references are ignored.
- The function has no filesystem access.
- Multiple missing references are all reported.

## Non-Goals

- Do not verify license content.
- Do not create missing files.
- Do not resolve paths outside `LICENSES/`.

## Suggested Execution Order

Run after placeholder validation.

---

# Cycle 6 --- Compose Full Manifest Validation

## Goal

Aggregate all validator findings into one result object.

## Scope

Implement:

```js
validateManifest(inventory, manifest, existingLicenseFileNames);
```

Return:

```js
{
    ok: boolean,
    findings: string[],
}
```

## Key Design Point

Make manifest-shape extraction explicit.

The lower-level validators operate on `assets`, but the production manifest may not literally contain an `assets[]`
property. Implement a pure helper such as:

```js
const getManifestAssets = (manifest) =>
    Object.values(manifest).filter((entry) =>
        entry
        && typeof entry === "object"
        && typeof entry.file === "string"
    );
```

For inventory extraction, mirror the real `icon-inventory.mjs` / `icon-inventory.json` shape. If the inventory custom
group is represented differently, isolate that in one helper:

```js
const getCustomInventoryFiles = (inventory) => {
    // one place only
};
```

## Red

```gherkin
Feature: Composite manifest validation

Scenario: All finding types are returned together
  Given an inventory missing scadrial.svg
  And a manifest with unexpected nalthis.svg
  And a duplicate roshar.svg
  And an unsupported release action
  And a placeholder note
  And a missing license file reference
  When the manifest is validated
  Then ok is false
  And findings include coverage problems
  And findings include vocabulary problems
  And findings include placeholder problems
  And findings include license-file problems
```

## Green

Implement composition:

```js
export const validateManifest = (
    inventory,
    manifest,
    existingLicenseFileNames,
) => {
    const assets = getManifestAssets(manifest);
    const customInventoryFiles = getCustomInventoryFiles(inventory);

    const findings = [
        ...validateAttributionCoverage(customInventoryFiles, assets),
        ...validateReleaseDecisions(assets),
        ...validatePlaceholders(assets),
        ...validateLicenseFileReferences(assets, existingLicenseFileNames),
    ];

    return {
        ok: findings.length === 0,
        findings,
    };
};
```

## Refactor

Keep `validateManifest` orchestration-only. All detailed checks should live in the specialized validators.

If the checked-in style strongly expects a custom error class, defer it to the future CLI phase where throwing may be
useful. Do not complicate this pure module’s current return-value contract.

## Acceptance Criteria

- `validateManifest` returns `{ ok: true, findings: [] }` for a valid synthetic fixture.
- It returns `{ ok: false, findings: [...] }` for invalid fixtures.
- All violation categories are collected together.
- The helper does not hardcode the real nine assets.
- The helper does not read from disk.

## Non-Goals

- Do not generate notices.
- Do not perform CLI argument parsing.
- Do not throw on validation failure.
- Do not mutate `inventory` or `manifest`.

## Suggested Execution Order

Run after all specialized validators are implemented.

---

# Cycle 7 --- Final Test and Diff Verification

## Goal

Confirm Phase 1 is complete and isolated to the two intended files.

## Scope

Run from:

```powershell
Set-Location "e:\teaching\DIBS\projects\astro-website"
```

## Red

```gherkin
Feature: Phase 1 validation module closure

Scenario: Pure validator phase is complete
  Given the license metadata module and tests are implemented
  When the license metadata test file runs
  Then all tests pass
  And only the validator module and its test file are changed
  And the frozen manifest remains untouched
```

## Green

Run:

```powershell
pnpm --filter @ravenhill/astro-icons exec node --test scripts/test/license-metadata.test.mjs
```

Then inspect:

```powershell
git status --short

git diff -- packages/astro-icons/LICENSES/third-party-icons.json
git diff -- packages/astro-icons/migration/icon-inventory.json
git diff -- packages/astro-icons/package.json
```

Expected changed files:

```text
A packages/astro-icons/scripts/lib/license-metadata.mjs
A packages/astro-icons/scripts/test/license-metadata.test.mjs
```

Expected empty diffs:

```text
packages/astro-icons/LICENSES/third-party-icons.json
packages/astro-icons/migration/icon-inventory.json
packages/astro-icons/package.json
```

## Refactor

If tests fail, keep fixes inside the two new files.

If `package.json` changes are needed for convenience, revert them; package script wiring belongs to a later phase.

## Acceptance Criteria

- All `license-metadata.test.mjs` tests pass.
- Only the two new files are changed.
- No existing manifest, inventory, package metadata, SVG, renderer, CLI, or generated notice file changes.
- Tests use Sanderson-themed synthetic fixtures only.
- The module has no filesystem imports.

## Non-Goals

- Do not add `test:licenses`.
- Do not add `licenses:check`.
- Do not add `licenses:update`.
- Do not create `THIRD_PARTY.md`.
- Do not edit the authoritative manifest.

## Suggested Execution Order

Run last.

---

# Final Acceptance Matrix

| Area                    | Acceptance criterion                                                                |
| ----------------------- | ----------------------------------------------------------------------------------- |
| New module              | `scripts/lib/license-metadata.mjs` exists                                           |
| New tests               | `scripts/test/license-metadata.test.mjs` exists                                     |
| Purity                  | Validator module has no filesystem access                                           |
| Constants               | `RELEASE_DECISION_ACTIONS` and `REDISTRIBUTION_CONCLUSIONS` are exported and frozen |
| Coverage validation     | Missing, unexpected, and duplicate files reported together                          |
| Vocabulary validation   | Invalid action/conclusion values reported                                           |
| Placeholder validation  | Recursive, case-insensitive scan with field locations                               |
| License-file validation | References checked against caller-supplied filename set                             |
| Composite validation    | `validateManifest` returns `{ ok, findings }` and collects all categories           |
| Fixture policy          | Sanderson-themed fixtures only; no real nine-asset oracle                           |
| No mutation             | Inventory and manifest inputs are not modified                                      |
| No package wiring       | `package.json` unchanged                                                            |
| Frozen inputs           | `third-party-icons.json` and `icon-inventory.json` unchanged                        |
| Verification            | Targeted `node --test` command passes                                               |

---

# Consolidated Non-Goals

- Do not implement the notice renderer.
- Do not implement the generator CLI.
- Do not create `LICENSES/THIRD_PARTY.md`.
- Do not add or edit package scripts.
- Do not read from the filesystem inside `license-metadata.mjs`.
- Do not mutate the frozen manifest.
- Do not parse SPDX.
- Do not make legal determinations.
- Do not hardcode the real nine non-Phosphor assets.
- Do not change `third-party-icons.json`.
- Do not change `icon-inventory.json`.
- Do not change SVG files.

# Main Improvements Over the Original Plan

The original plan is sound. This version tightens it by:

1. making the real manifest-shape extraction explicit;
2. adding deterministic finding prefixes for easier assertions;
3. deferring any custom throwing error class to the future CLI phase;
4. clarifying future trademark license-file support without adding filesystem coupling;
5. keeping package script wiring firmly out of scope.

DDT is useful for the coverage and vocabulary matrices. PBT is not warranted here because the contract is fixed and the
main risk is deterministic schema drift, not unknown input-space behavior.
