# [PLAN] Subphase 1.2 --- Define the Machine-Readable Attribution Contract

## Scope Classification

**Recommended structure:** medium-scope **phases**.

**Primary deliverable:** a tested, deterministic attribution pipeline:

```text
third-party-icons.json
        ↓ validate
license-metadata.mjs
        ↓ render
THIRD_PARTY.md
        ↓ check/update
generate-third-party-notices.mjs
```

**Behavior-preserving constraint:** this subphase adds validation/generation tooling and a generated notice file. It
must not change package runtime behavior, icon assets, inventory, or the frozen manifest.

## Important Correction to the Original Plan

Replace the proposed **One Piece-themed fixtures** with non-repeating **Brandon Sanderson-themed fixture names**, per
this session’s data convention.

Use small fictional fixture filenames such as:

```text
roshar.svg
scadrial.svg
nalthis.svg
sel.svg
luthadel.svg
urithiru.svg
```

Do not use real project asset names as the primary oracle.

---

# Phase 1.2.1 --- Define and Test the Pure Manifest Validator [DONE]

## Goal

Create a filesystem-free validation module that treats the frozen manifest as the source of truth and reports all
attribution-contract infringements at once.

## Scope

New file:

```text
packages/astro-icons/scripts/lib/license-metadata.mjs
```

New test file:

```text
packages/astro-icons/scripts/test/license-metadata.test.mjs
```

The module must export:

```js
INCLUDED_RELEASE_DECISION_ACTIONS; // or RELEASE_DECISION_ACTIONS
REDISTRIBUTION_CONCLUSIONS;
validateAttributionCoverage(customInventoryFiles, assets);
validateReleaseDecisions(assets);
validatePlaceholders(assets);
validateLicenseFileReferences(assets, existingLicenseFileNames);
validateManifest(inventory, manifest, existingLicenseFileNames);
```

Prefer exported frozen arrays or frozen sets for controlled vocabularies. Do not redeclare literals throughout the code.

## Cycle 1.1 --- Coverage Validation

### Red

```gherkin
Feature: Attribution manifest coverage

Scenario: Manifest asset files match the custom icon inventory
  Given a custom inventory containing roshar.svg and scadrial.svg
  And a manifest containing roshar.svg and scadrial.svg
  When attribution coverage is validated
  Then validation succeeds

Scenario: Coverage reports all set problems together
  Given a custom inventory containing roshar.svg and scadrial.svg
  And a manifest containing roshar.svg, nalthis.svg, and roshar.svg twice
  When attribution coverage is validated
  Then validation reports the missing scadrial.svg
  And it reports the unexpected nalthis.svg
  And it reports the duplicate roshar.svg
```

### Green

Implement:

```js
validateAttributionCoverage(customInventoryFiles, assets);
```

It should return findings for:

- missing files;
- unexpected files;
- duplicate `asset.file` entries.

Do not fail fast.

### Refactor

Keep set/difference helpers small and reusable. Aim for functions under roughly 25 lines where practical.

## Cycle 1.2 --- Controlled Vocabulary Validation

### Red

```gherkin
Feature: Manifest controlled vocabulary

Scenario Outline: Unsupported enum values are rejected
  Given a manifest asset with <field> set to <value>
  When release decisions are validated
  Then validation reports the unsupported value

Examples:
  | field                         | value          |
  | releaseDecision.action         | risk-accepted  |
  | releaseDecision.action         | permitted      |
  | redistribution.conclusion      | verified       |
  | redistribution.conclusion      | risk-accepted  |
```

### Green

Implement:

```js
validateReleaseDecisions(assets);
```

Accepted values:

```js
releaseDecision.action ∈ include | exclude | pending
redistribution.conclusion ∈ permitted | restricted | permission-required | undetermined
```

### Refactor

Export the frozen vocabulary constants and reuse them in tests.

## Cycle 1.3 --- Placeholder and License-File Validation

### Red

```gherkin
Feature: Manifest placeholder and license file validation

Scenario: Placeholder text is rejected anywhere in string fields
  Given an asset with a note containing "TBD"
  When placeholders are validated
  Then validation reports the placeholder location

Scenario: Missing referenced license files are rejected
  Given an asset whose copyright licenseFile is LICENSES/ODIUM.txt
  And the existing license files do not include ODIUM.txt
  When license file references are validated
  Then validation reports the missing reference
```

### Green

Implement:

```js
validatePlaceholders(assets);
validateLicenseFileReferences(assets, existingLicenseFileNames);
```

Placeholder scan should be case-insensitive and include nested string fields such as:

- `notes[]`;
- `rationale`;
- `details`;
- URLs;
- `displayName`;
- copyright/trademark basis fields.

### Refactor

Use a recursive string-field walker. Keep it pure and deterministic.

## Cycle 1.4 --- Composite Manifest Validation

### Red

```gherkin
Feature: Complete attribution manifest validation

Scenario: All validation findings are collected
  Given a manifest with a duplicate file
  And an unsupported release action
  And a placeholder note
  And a missing license file reference
  When the full manifest is validated
  Then all findings are returned together
  And ok is false
```

### Green

Implement:

```js
validateManifest(inventory, manifest, existingLicenseFileNames);
```

Return:

```js
{
  ok: boolean,
  findings: string[]
}
```

### Refactor

Ensure the pure module has no filesystem access. The CLI layer will supply inventory contents, manifest contents, and
existing license filenames.

## Acceptance Criteria

- Validator functions are pure and deterministic.
- Tests use small Sanderson-themed fixtures, not the real nine-asset manifest.
- Coverage validation reports missing, unexpected, and duplicate files together.
- Unsupported enum values are rejected.
- Placeholder text is found recursively.
- Missing license-file references are reported.
- `validateManifest` returns all findings, not only the first failure.

## Non-Goals

- Do not read from disk in `license-metadata.mjs`.
- Do not mutate the manifest.
- Do not validate legal correctness beyond the frozen contract.
- Do not parse SPDX expressions.

## Suggested Execution Order

Implement Phase 1 before the generator. The generator should not render from an invalid manifest.

---

# Phase 1.2.2 --- Define and Test the Notice Renderer [DONE]

## Goal

Create a deterministic pure renderer for `LICENSES/THIRD_PARTY.md`.

## Scope

New file:

```text
packages/astro-icons/scripts/generate-third-party-notices.mjs
```

The file should contain pure rendering functions first, then CLI orchestration.

Suggested pure functions:

```js
renderThirdPartyNotice(manifest);
renderPhosphorSection(phosphor);
renderAssetSection(asset);
renderTrademarkNotice(trademark);
```

New test file:

```text
packages/astro-icons/scripts/test/third-party-notices.test.mjs
```

## Cycle 2.1 --- Render Stable Notice Content

### Red

```gherkin
Feature: Third-party notice rendering

Scenario: Notice includes Phosphor and all manifest assets
  Given a manifest with one Phosphor block
  And two assets named roshar.svg and scadrial.svg
  When the third-party notice is rendered
  Then the output contains one Phosphor section
  And it contains one section for Roshar
  And it contains one section for Scadrial
```

### Green

Implement deterministic rendering:

- fixed heading order;
- fixed section order;
- assets sorted by `asset.file`;
- no timestamps;
- exactly one trailing newline.

### Refactor

Keep formatting helpers small. Avoid a template engine dependency.

## Cycle 2.2 --- Render Phosphor Honestly

### Red

```gherkin
Feature: Phosphor notice rendering

Scenario: Unresolved Phosphor lineage is not overstated
  Given the Phosphor source evidenceStatus is unresolved
  When the notice is rendered
  Then the Phosphor section states unresolved lineage
  And it does not claim an exact verified upstream commit
```

### Green

The Phosphor section should include:

- project name;
- concluded license;
- copyright notice;
- source evidence status;
- reference to `LICENSES/PHOSPHOR.txt` as the future notice location.

Keep the `PHOSPHOR.txt` reference textual only. Do not require the file to exist in Subphase 1.2.

### Refactor

Make the wording conservative and audit-friendly.

## Cycle 2.3 --- Render Non-Phosphor Assets Conservatively

### Red

```gherkin
Feature: Non-Phosphor notice rendering

Scenario: Excluded assets remain visibly excluded
  Given an asset with releaseDecision.action exclude
  And redistribution.conclusion permission-required
  When the notice is rendered
  Then the asset section states the exclusion
  And it does not imply redistribution permission
```

### Green

Each non-Phosphor asset section should include:

- `displayName`;
- `assetType`;
- `rights.copyright.concludedLicense`;
- copyright basis if present;
- trademark notice only when `rights.trademark.applies !== "unknown"`;
- `redistribution.conclusion`;
- `releaseDecision.action`.

### Refactor

Avoid endorsement-like language. Prefer “recorded decision” or “manifest decision” over “approved.”

## Cycle 2.4 --- Renderer Invariants

### Red

```gherkin
Feature: Notice output invariants

Scenario: Notice output is byte-stable
  Given the same manifest input twice
  When the notice is rendered twice
  Then the outputs are byte-identical
  And the output ends with exactly one newline
  And the output contains no timestamp-shaped substring
```

### Green

Add tests for:

- byte-identical repeated render;
- exactly one trailing newline;
- no timestamp-shaped substring;
- trademark section appears only when `applies !== "unknown"`.

### Refactor

Centralize newline handling in one helper.

## Acceptance Criteria

- Rendering is pure and deterministic.
- Output has no timestamps.
- Output ends with exactly one trailing newline.
- Phosphor unresolved lineage is stated honestly.
- Non-Phosphor excluded assets remain clearly excluded.
- Trademark notice appears only when applicable.

## Non-Goals

- Do not generate `LICENSES/PHOSPHOR.txt`.
- Do not add full third-party license texts.
- Do not introduce a Markdown templating dependency.
- Do not edit `third-party-icons.json`.

## Suggested Execution Order

Run after Phase 1’s validator exists, but before implementing CLI write/check behavior.

---

# Phase 1.2.3 --- Add CLI Orchestration for `--write` and `--check`

## Goal

Wire validation and rendering into a thin Node.js CLI.

## Scope

Continue in:

```text
packages/astro-icons/scripts/generate-third-party-notices.mjs
```

Add:

```js
parseArgs(argv);
runGenerate({ mode, manifestPath, inventoryPath, noticePath, licensesDir });
main();
```

## Cycle 3.1 --- CLI Argument Parsing

### Red

```gherkin
Feature: Third-party notice CLI arguments

Scenario: Write mode is selected
  Given the CLI receives --write
  When arguments are parsed
  Then mode is write

Scenario: Check mode is selected
  Given the CLI receives --check
  When arguments are parsed
  Then mode is check
```

### Green

Support exactly:

```text
--write
--check
```

Reject:

- missing mode;
- both modes together;
- unknown flags.

### Refactor

Keep `parseArgs` pure.

## Cycle 3.2 --- Validate Before Rendering

### Red

```gherkin
Feature: Generator validation gate

Scenario: Invalid manifest prevents notice generation
  Given a manifest with an unsupported release action
  When the generator runs in write mode
  Then it fails with validation findings
  And it does not write THIRD_PARTY.md
```

### Green

`runGenerate` should:

1. read manifest;
2. read inventory;
3. read `LICENSES/` filenames;
4. call `validateManifest`;
5. fail fast with collected findings if invalid;
6. render only after validation passes.

### Refactor

Separate filesystem adapters from pure logic.

## Cycle 3.3 --- Write and Check Modes

### Red

```gherkin
Feature: THIRD_PARTY.md write and check modes

Scenario: Write mode updates the generated notice
  Given a valid manifest
  When the generator runs with --write
  Then LICENSES/THIRD_PARTY.md is written

Scenario: Check mode fails on stale notice without rewriting
  Given a stale LICENSES/THIRD_PARTY.md
  When the generator runs with --check
  Then the command exits non-zero
  And the stale file is not rewritten
```

### Green

Implement:

```js
runGenerate({ mode: "write", ... })
runGenerate({ mode: "check", ... })
```

`--check` should compare expected vs existing content and fail on drift without writing.

### Refactor

Return structured results where useful, for example:

```js
{ ok: boolean, changed: boolean, findings: string[] }
```

Tests can assert results without relying only on process exit.

## Acceptance Criteria

- CLI supports only `--write` and `--check`.
- Both modes validate the manifest first.
- `--write` writes the notice.
- `--check` fails on drift and does not rewrite.
- Filesystem access stays in `runGenerate` / `main`, not the renderer or validator.
- CLI uses plain Node.js APIs only.

## Non-Goals

- Do not add a second standalone validation script.
- Do not wire into top-level checks yet.
- Do not add dependencies.
- Do not change package runtime exports.

## Suggested Execution Order

Run after Phases 1 and 2.

---

# Phase 4 --- Generate the Baseline Notice and Wire Package Scripts

## Goal

Produce the committed `THIRD_PARTY.md` baseline and add package-local scripts.

## Scope

New generated file:

```text
packages/astro-icons/LICENSES/THIRD_PARTY.md
```

Modified file:

```text
packages/astro-icons/package.json
```

Add scripts:

```json
{
    "test:licenses": "node --test scripts/test/license-metadata.test.mjs scripts/test/third-party-notices.test.mjs",
    "licenses:check": "node scripts/generate-third-party-notices.mjs --check",
    "licenses:update": "node scripts/generate-third-party-notices.mjs --write"
}
```

## Cycle 4.1 --- Package Script Wiring

### Red

```gherkin
Feature: Package-local license scripts

Scenario: License tests are package-local
  Given package.json scripts
  When license tooling is wired
  Then test:licenses runs both new test files
  And licenses:check runs the generator in check mode
  And licenses:update runs the generator in write mode
```

### Green

Add the three package-local scripts.

### Refactor

Keep `test:licenses` separate from `test:audit-icons`. Do not add it to the top-level `check` script in this subphase.

## Cycle 4.2 --- Generate `THIRD_PARTY.md`

### Red

```gherkin
Feature: Generated third-party notice baseline

Scenario: Generated notice matches the frozen manifest
  Given the frozen completed manifest
  When licenses:update runs
  Then LICENSES/THIRD_PARTY.md is generated
  And licenses:check passes immediately afterward
```

### Green

Run:

```powershell
pnpm --filter @ravenhill/astro-icons licenses:update
pnpm --filter @ravenhill/astro-icons licenses:check
```

### Refactor

Manually inspect the generated notice for:

- one Phosphor section;
- one section per nine excluded non-Phosphor assets;
- unresolved Phosphor lineage stated honestly;
- no timestamps;
- exactly one trailing newline;
- no accidental permission claims.

## Acceptance Criteria

- `THIRD_PARTY.md` exists.
- `licenses:check` passes after generation.
- `test:licenses` passes.
- `package.json` adds only the three intended scripts.
- Generated notice reflects the frozen manifest without editing it.

## Non-Goals

- Do not create `LICENSES/PHOSPHOR.txt`.
- Do not update root `README.md`.
- Do not update `AGENTS.md`.
- Do not modify `scripts/assert-pack-files.mjs`.
- Do not add package-level check composition yet.

## Suggested Execution Order

Run after Phase 3.

---

# Phase 5 --- Final Verification and Repository Purity

## Goal

Confirm that the attribution contract is tested, generated, and isolated to the intended files.

## Scope

Run from the repository/package context:

```powershell
pnpm --filter @ravenhill/astro-icons test:licenses
pnpm --filter @ravenhill/astro-icons licenses:check
```

Then inspect diffs.

## Red

```gherkin
Feature: Subphase 1.2 closure verification

Scenario: Attribution tooling is complete and isolated
  Given the license metadata validator and notice generator are implemented
  When package license tests and check mode run
  Then all license tests pass
  And THIRD_PARTY.md has no generation drift
  And third-party-icons.json remains unchanged
  And icon-inventory.json remains unchanged
```

## Green

Run:

```powershell
Set-Location "e:\teaching\DIBS\projects\astro-website"

pnpm --filter @ravenhill/astro-icons test:licenses
pnpm --filter @ravenhill/astro-icons licenses:check

git status --short
git diff -- packages/astro-icons/LICENSES/third-party-icons.json
git diff -- packages/astro-icons/migration/icon-inventory.json
git diff -- packages/astro-icons/src
git diff -- packages/astro-icons/package.json
git diff -- packages/astro-icons/LICENSES/THIRD_PARTY.md
```

Expected changed files:

```text
A packages/astro-icons/scripts/lib/license-metadata.mjs
A packages/astro-icons/scripts/generate-third-party-notices.mjs
A packages/astro-icons/scripts/test/license-metadata.test.mjs
A packages/astro-icons/scripts/test/third-party-notices.test.mjs
A packages/astro-icons/LICENSES/THIRD_PARTY.md
M packages/astro-icons/package.json
```

Expected empty protected diffs:

```text
packages/astro-icons/LICENSES/third-party-icons.json
packages/astro-icons/migration/icon-inventory.json
packages/astro-icons/src
```

## Refactor

If verification fails:

| Failure                             | Response                               |
| ----------------------------------- | -------------------------------------- |
| validator tests fail                | fix pure validator or fixtures         |
| renderer tests fail                 | fix pure rendering logic               |
| `licenses:check` fails after update | fix nondeterminism or newline handling |
| manifest diff appears               | revert; manifest is frozen input       |
| inventory/SVG diff appears          | revert; out of scope                   |
| package script drift                | reduce to three intended scripts       |

## Acceptance Criteria

- `test:licenses` passes.
- `licenses:check` passes.
- Generated notice is deterministic.
- `third-party-icons.json` is unchanged.
- `icon-inventory.json` is unchanged.
- SVG files are unchanged.
- No new runtime dependency appears.
- Diff scope matches the six intended files.

## Non-Goals

- Do not run Subphase 1.3.
- Do not add pack-contract assertions.
- Do not archive the phase.
- Do not stage or commit files.

## Suggested Execution Order

Run last and repeat after every correction.

---

# Final Acceptance Matrix

| Area                    | Acceptance criterion                                                                                           |
| ----------------------- | -------------------------------------------------------------------------------------------------------------- |
| Validator module        | Pure `license-metadata.mjs`, no filesystem access                                                              |
| Coverage validation     | Missing, unexpected, and duplicate files are reported together                                                 |
| Vocabulary validation   | Uses real frozen schema: `include/exclude/pending` and `permitted/restricted/permission-required/undetermined` |
| Placeholder validation  | Recursively scans string fields                                                                                |
| License-file validation | References checked against caller-supplied `LICENSES/` filenames                                               |
| Composite validation    | Returns `{ ok, findings }` and collects all findings                                                           |
| Fixture policy          | Tests use Sanderson-themed synthetic fixtures, not real nine-asset records                                     |
| Renderer                | Deterministic Markdown, sorted by asset file, no timestamps                                                    |
| Phosphor notice         | States unresolved lineage honestly                                                                             |
| Non-Phosphor notice     | States `exclude` decisions without implying permission                                                         |
| Trademark rendering     | Appears only when `applies !== "unknown"`                                                                      |
| CLI                     | Supports `--write` and `--check` only                                                                          |
| Check mode              | Fails on drift without rewriting                                                                               |
| Package scripts         | Adds `test:licenses`, `licenses:check`, `licenses:update` only                                                 |
| Generated artifact      | `LICENSES/THIRD_PARTY.md` committed as generated baseline                                                      |
| Frozen inputs           | `third-party-icons.json` and `icon-inventory.json` remain unchanged                                            |
| Protected assets        | SVG files remain unchanged                                                                                     |
| Dependencies            | No new runtime dependency                                                                                      |

---

# Consolidated Non-Goals

- Do not rewrite `third-party-icons.json`.
- Do not edit `icon-inventory.json`.
- Do not edit SVG files.
- Do not create `LICENSES/PHOSPHOR.txt`.
- Do not create `LICENSES/README.md`.
- Do not edit root `README.md`.
- Do not edit `AGENTS.md`.
- Do not edit `scripts/assert-pack-files.mjs`.
- Do not add a general license scanner.
- Do not add an SPDX parser.
- Do not make legal determinations about trademark law.
- Do not wire license checks into top-level package checks yet.
- Do not add new runtime dependencies.
- Do not archive the subphase.

---

# Main Improvements Over the Original Plan

The original plan is solid, but this version tightens it in five ways:

1. **Separates validator, renderer, CLI, and generated baseline** so failures have clear ownership.
2. **Makes the real frozen schema explicit** and avoids the older illustrative `redistribution.status` shape.
3. **Uses Sanderson-themed synthetic fixtures** for this session instead of One Piece fixtures.
4. **Gates rendering behind validation** so `THIRD_PARTY.md` cannot be generated from a structurally invalid manifest.
5. **Keeps Subphase 1.2 isolated** from Subphase 1.3 and 1.4 work, especially `PHOSPHOR.txt`, pack assertions, and
   top-level check composition.

DDT is useful for validator and renderer matrix tests. PBT is not warranted here: the contract is fixed, the manifest
schema is known, and the main risk is deterministic drift, not a broad input domain.
