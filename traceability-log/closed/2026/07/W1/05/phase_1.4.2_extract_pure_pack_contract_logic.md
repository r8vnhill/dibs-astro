# [DONE] Phase 1.4.2 --- Extract Pure Pack-Contract Logic

## Current Status

[DONE] `assert-pack-files.mjs` is now import-safe and exports pure pack-contract helpers. The script preserves the
existing runtime-file, blocked-file, and SVG-parity checks while adding required license/attribution files,
manifest-derived included-asset license references, `package/migration/` blocking, grouped diagnostics, and the rule
that included assets require `redistribution.conclusion === "permitted"`.

Verification performed:

- `pnpm --filter @ravenhill/astro-icons exec node --test scripts/test/assert-pack-files.test.mjs` — 20 tests passed
  across 7 suites.
- `cmd /c git diff --check`
- Protected diffs were empty for `LICENSES/third-party-icons.json`, `LICENSES/THIRD_PARTY.md`, `src/**`,
  `migration/icon-inventory.json`, package metadata, README, and AGENTS.

No `risk-accepted` release action, package script wiring, README/AGENTS update, generated notice update, manifest edit,
source asset edit, staging, or commit was performed.

## Scope Classification

**Recommended structure:** direct **red-green-refactor cycles**.

## Editable Scope

Modify only:

```text
packages/astro-icons/scripts/assert-pack-files.mjs
packages/astro-icons/scripts/test/assert-pack-files.test.mjs
```

Protected / out of scope:

```text
packages/astro-icons/LICENSES/third-party-icons.json
packages/astro-icons/LICENSES/THIRD_PARTY.md
packages/astro-icons/LICENSE
packages/astro-icons/LICENSES/README.md
packages/astro-icons/LICENSES/PHOSPHOR.txt
packages/astro-icons/package.json
packages/astro-icons/README.md
packages/astro-icons/AGENTS.md
packages/astro-icons/src/**
packages/astro-icons/migration/icon-inventory.json
```

---

## Cycle 1 — Characterize Existing Pack Rules Before Refactoring

### Goal

Lock current `assert-pack-files.mjs` behavior before extracting pure functions.

### Scope

Extend:

```text
packages/astro-icons/scripts/test/assert-pack-files.test.mjs
```

Do not change production logic yet, except minimally if the file is currently not import-safe and tests require exports
to exist.

### Red

```gherkin
Feature: Existing pack-file contract

Scenario: Existing required runtime files remain required
  Given a package file list is missing dist/index.js
  When pack contents are evaluated
  Then a missing-file finding is reported for package/dist/index.js

Scenario: Existing blocked internals remain blocked
  Given a package file list contains package/scripts/assert-pack-files.mjs
  When pack contents are evaluated
  Then a blocked-file finding is reported

Scenario: Existing SVG parity behavior is preserved
  Given the source SVG count is 2
  And the package file list contains one packaged SVG
  When SVG parity is checked
  Then an SVG parity finding is reported
```

### Green

Add synthetic tests for the existing behavior:

- required runtime files;
- blocked internals;
- SVG parity pass/fail;
- zero-source SVG behavior, if the current script has a defined behavior for it.

Use Sanderson-themed fixture names only for synthetic SVG/icon examples:

```text
roshar.svg
scadrial.svg
nalthis.svg
urithiru.svg
```

### Refactor

Keep tests independent from `npm pack`, tarballs, stdin, and real filesystem state.

### Acceptance Criteria

- Current required-file behavior is covered.
- Current blocked-pattern behavior is covered.
- Current SVG parity behavior is covered.
- Tests use synthetic file lists.
- No real package manifest or filesystem reads are required.

### Non-Goals

- Do not add legal-file requirements yet.
- Do not add the redistribution rule yet.
- Do not wire `package.json`.
- Do not edit docs.

### Suggested Execution Order

Run first.

---

## Cycle 2 — Make `assert-pack-files.mjs` Import-Safe

### Goal

Allow tests to import pack-contract logic without running `npm pack`, reading stdin, deleting tarballs, or setting
`process.exitCode`.

### Scope

Modify:

```text
packages/astro-icons/scripts/assert-pack-files.mjs
```

### Red

```gherkin
Feature: Import-safe pack checker

Scenario: Importing assert-pack-files does not execute CLI side effects
  Given a test imports assert-pack-files.mjs
  When the module is loaded
  Then npm pack is not executed
  And stdin is not read
  And tarballs are not deleted
  And process.exitCode is not changed
```

### Green

Add a guarded `main()` pattern:

```js
export const main = async () => {
    // existing CLI behavior moved here
};

if (isMainModule(import.meta.url, process.argv[1])) {
    await main();
}
```

Use the same main-module detection style already used by nearby package scripts, such as
`generate-third-party-notices.mjs`.

### Refactor

Move only top-level side effects into `main()`. Do not change diagnostics, required files, blocked patterns, or SVG
parity behavior yet.

### Acceptance Criteria

- Importing the module has no side effects.
- Existing CLI behavior remains functionally equivalent when the script is executed directly.
- `main()` contains I/O and process handling.
- Pure helpers can be imported by tests.

### Non-Goals

- Do not change `pack:check` behavior yet.
- Do not read the attribution manifest yet.
- Do not alter package scripts.

### Suggested Execution Order

Run after Cycle 1.

---

## Cycle 3 — Extract Existing Pure Helpers

### Goal

Move current required-file, blocked-file, and SVG parity rules into exported pure functions.

### Scope

Export from:

```text
packages/astro-icons/scripts/assert-pack-files.mjs
```

```js
findMissingFiles(files, requiredFiles);
findBlockedFiles(files, blockedPatterns);
checkSvgParity(files, srcSvgCount);
```

Also export current constants if useful for tests:

```js
REQUIRED_RUNTIME_FILES;
BLOCKED_PATTERNS;
```

### Red

```gherkin
Feature: Pure pack-contract helpers

Scenario: Missing required files are reported by a pure helper
  Given required files include package/dist/index.js
  And the package file list does not contain package/dist/index.js
  When missing files are found
  Then package/dist/index.js is reported

Scenario: Blocked files are reported by a pure helper
  Given blocked patterns include package/scripts/
  And the package file list contains package/scripts/urithiru.mjs
  When blocked files are found
  Then package/scripts/urithiru.mjs is reported
```

### Green

Extract helpers without changing behavior.

Suggested return shapes:

```js
["package/dist/index.js"];
```

or stable finding strings:

```js
["missing.requiredFile: package/dist/index.js"];
```

Prefer the shape that best preserves current CLI output while making tests simple.

### Refactor

Keep helper inputs explicit. Do not let pure helpers read global package paths, manifests, stdin, tarballs, or source
directories.

### Acceptance Criteria

- Existing behavior is preserved.
- Pure helpers are exported.
- Tests cover each helper.
- No legal-file requirement is added in this cycle.
- No manifest access is added in pure helpers.

### Non-Goals

- Do not alter CLI output unless necessary.
- Do not add new blocked patterns yet.
- Do not add redistribution logic yet.

### Suggested Execution Order

Run after Cycle 2.

---

## Cycle 4 — Add Manifest-Derived Required License Files

### Goal

Require package legal/attribution files in the publishable tarball.

### Scope

Add:

```js
deriveRequiredLicenseFiles(manifest);
```

### Red

```gherkin
Feature: Required license and attribution files

Scenario: Core legal files are always required
  Given an attribution manifest
  When required license files are derived
  Then package/LICENSE is required
  And package/LICENSES/README.md is required
  And package/LICENSES/PHOSPHOR.txt is required
  And package/LICENSES/THIRD_PARTY.md is required
  And package/LICENSES/third-party-icons.json is required

Scenario: Included asset license references are required
  Given an included asset references LICENSES/SHARDBLADE.txt
  And an excluded asset references LICENSES/NIGHTBLOOD.txt
  When required license files are derived
  Then package/LICENSES/SHARDBLADE.txt is required
  And package/LICENSES/NIGHTBLOOD.txt is not required
```

### Green

Implement fixed core requirements:

```text
package/LICENSE
package/LICENSES/README.md
package/LICENSES/PHOSPHOR.txt
package/LICENSES/THIRD_PARTY.md
package/LICENSES/third-party-icons.json
```

Derive additional files only from assets where:

```js
asset.releaseDecision?.action === "include";
```

Relevant fields:

```text
rights.copyright.licenseFile
rights.trademark.licenseFile
rights.trademark.permissionFile
rights.trademark.policyFile
```

If the actual manifest uses a different future field name, keep the reference path list data-driven.

### Refactor

Centralize path conversion:

```js
const toPackagePath = (manifestPath) =>
    manifestPath.startsWith("package/")
        ? manifestPath
        : `package/${manifestPath.replace(/^\.?\//u, "")}`;
```

Ensure `LICENSES/SHARDBLADE.txt` becomes:

```text
package/LICENSES/SHARDBLADE.txt
```

### Acceptance Criteria

- Core legal files are always required.
- Included asset-specific references are required.
- Excluded asset references are ignored.
- Pending asset references are ignored.
- Duplicate references are deduplicated.
- Function is pure and deterministic.

### Non-Goals

- Do not edit `third-party-icons.json`.
- Do not create missing license files.
- Do not infer additional license paths from URLs.
- Do not require non-Phosphor files for excluded assets.

### Suggested Execution Order

Run after Cycle 3.

---

## Cycle 5 — Add `include` Requires `permitted` Redistribution Rule

### Goal

Prevent packaged inclusion of assets whose redistribution conclusion is not explicitly permitted.

### Scope

Add:

```js
findIncludedAssetsWithoutPermittedRedistribution(manifest);
```

### Red

```gherkin
Feature: Included asset redistribution gate

Scenario: Included asset with permitted redistribution passes
  Given an asset has releaseDecision.action include
  And redistribution.conclusion permitted
  When included asset redistribution is checked
  Then no finding is reported

Scenario Outline: Included asset without permitted redistribution fails
  Given an asset has releaseDecision.action include
  And redistribution.conclusion is <conclusion>
  When included asset redistribution is checked
  Then a finding is reported for that asset

Examples:
  | conclusion          |
  | restricted          |
  | permission-required |
  | undetermined        |

Scenario Outline: Non-included assets do not trigger the gate
  Given an asset has releaseDecision.action <action>
  And redistribution.conclusion undetermined
  When included asset redistribution is checked
  Then no finding is reported

Examples:
  | action  |
  | exclude |
  | pending |
```

### Green

Implement the rule:

```js
(include => redistribution.conclusion === "permitted");
```

Do **not** add `risk-accepted` to the release-action vocabulary.

Suggested finding:

```text
redistribution.notPermitted: roshar.svg is included but redistribution conclusion is undetermined
```

### Refactor

Use a manifest asset extractor shared with `deriveRequiredLicenseFiles`, but keep it private and pure.

### Acceptance Criteria

- Included/permitted assets pass.
- Included/restricted assets fail.
- Included/permission-required assets fail.
- Included/undetermined assets fail.
- Excluded and pending assets do not fail this rule.
- `risk-accepted` is not introduced.

### Non-Goals

- Do not mutate release decisions.
- Do not edit the manifest.
- Do not implement a risk-acceptance escape hatch.
- Do not weaken Subphase 1.2 validators.

### Suggested Execution Order

Run after Cycle 4.

---

## Cycle 6 — Block `package/migration/`

### Goal

Prevent migration inventory/tooling artifacts from leaking into the published tarball.

### Scope

Update blocked patterns in:

```text
packages/astro-icons/scripts/assert-pack-files.mjs
```

### Red

```gherkin
Feature: Blocked package internals

Scenario: Migration files are not publishable
  Given the package file list contains package/migration/icon-inventory.json
  When blocked files are found
  Then package/migration/icon-inventory.json is reported
```

### Green

Add a blocked pattern equivalent to:

```js
/^package\/migration\//u;
```

Preserve existing blocked patterns:

```text
AGENTS.md
src/
scripts/
tsup.config.ts
tsconfig.json
```

### Refactor

Keep blocked patterns as a single exported or private frozen list. Avoid ad hoc checks in the evaluator.

### Acceptance Criteria

- `package/migration/` files are blocked.
- Existing blocked patterns remain active.
- Tests cover migration blocking.
- No package `files` metadata is changed in this phase.

### Non-Goals

- Do not edit `package.json`.
- Do not remove migration files from the repository.
- Do not change the inventory file.

### Suggested Execution Order

Run after Cycle 5.

---

## Cycle 7 — Compose `evaluatePackContents`

### Goal

Return grouped diagnostics for all pack-contract violations in one evaluation.

### Scope

Implement:

```js
evaluatePackContents({ files, manifest, srcSvgCount });
```

It should compose:

- runtime required files;
- manifest-derived license files;
- blocked files;
- SVG parity;
- included-asset redistribution gate.

### Red

```gherkin
Feature: Grouped pack-contract diagnostics

Scenario: All pack-contract violations are reported together
  Given the package file list is missing package/LICENSE
  And it contains package/scripts/urithiru.mjs
  And the SVG count does not match the source SVG count
  And the manifest includes roshar.svg with redistribution.conclusion undetermined
  When pack contents are evaluated
  Then missing required files are reported
  And blocked files are reported
  And SVG parity findings are reported
  And redistribution findings are reported
```

### Green

Return a grouped result, for example:

```js
{
    ok: false,
    findings: {
        missingFiles: [],
        blockedFiles: [],
        svgParity: [],
        redistribution: [],
    },
}
```

or, if current CLI output is easier to preserve, a stable flat list with prefixes:

```text
missing.requiredFile: package/LICENSE
blocked.file: package/scripts/urithiru.mjs
svgParity.mismatch: expected 2, found 1
redistribution.notPermitted: roshar.svg is included but redistribution conclusion is undetermined
```

Grouped diagnostics are preferable for clarity, but avoid rewriting the CLI output more than necessary.

### Refactor

Keep `evaluatePackContents` orchestration-only. Specialized checks should remain in specialized helpers.

### Acceptance Criteria

- Multiple categories are reported together.
- `ok === true` only when all categories pass.
- Existing runtime required files remain required.
- Core legal files are required.
- Blocked internals include migration.
- SVG parity is unchanged.
- Included assets require permitted redistribution.

### Non-Goals

- Do not call `npm pack`.
- Do not read the real manifest.
- Do not change CLI process behavior yet beyond import safety.

### Suggested Execution Order

Run after Cycles 3–6.

---

## Cycle 8 — Adapt CLI to Use Pure Evaluator

### Goal

Make the executable script use the pure evaluator while preserving existing CLI behavior.

### Scope

Modify the `main()` body in:

```text
packages/astro-icons/scripts/assert-pack-files.mjs
```

### Red

```gherkin
Feature: CLI uses pack-contract evaluator

Scenario: CLI preserves existing pack-check behavior
  Given assert-pack-files is executed directly
  When it obtains a package file list
  Then it evaluates the list through evaluatePackContents
  And prints diagnostics on failure
  And sets process.exitCode to 1 on failure
```

### Green

Update CLI flow:

1. obtain file list from existing stdin or `npm pack` behavior;
2. read `LICENSES/third-party-icons.json` in `main()`;
3. compute `srcSvgCount` using the existing method;
4. call `evaluatePackContents({ files, manifest, srcSvgCount })`;
5. print findings;
6. preserve existing cleanup behavior;
7. preserve success/failure exit-code behavior.

### Refactor

Keep filesystem and process handling in `main()` and private CLI helpers only.

### Acceptance Criteria

- Direct execution still works.
- Importing still has no side effects.
- CLI reads the manifest only in `main()`.
- CLI uses `evaluatePackContents`.
- Existing pack/stdin behavior is preserved.
- New legal-file and redistribution rules are active through CLI.

### Non-Goals

- Do not add package scripts.
- Do not change `pack:check`.
- Do not change `pack:dry-run`.
- Do not edit documentation.

### Suggested Execution Order

Run last among implementation cycles.

---

# Verification Cycle — Run Targeted Tests and Protected Diff Checks

## Goal

Verify Phase 1.4.2 in isolation.

## Scope

Run from repository root:

```powershell
Set-Location "e:\teaching\DIBS\projects\astro-website"

pnpm --filter @ravenhill/astro-icons exec node --test scripts/test/assert-pack-files.test.mjs
```

Also inspect protected diffs:

```powershell
git status --short
git diff -- packages/astro-icons/LICENSES/third-party-icons.json
git diff -- packages/astro-icons/LICENSES/THIRD_PARTY.md
git diff -- packages/astro-icons/src
git diff -- packages/astro-icons/migration/icon-inventory.json
git diff -- packages/astro-icons/package.json
git diff -- packages/astro-icons/README.md
git diff -- packages/astro-icons/AGENTS.md
```

## Red

```gherkin
Feature: Phase 1.4.2 isolation

Scenario: Pure pack-contract extraction is complete and isolated
  Given assert-pack-files pure logic and tests are implemented
  When the targeted pack-file tests run
  Then all tests pass
  And only assert-pack-files.mjs and assert-pack-files.test.mjs have changed
  And frozen evidence, generated notices, package metadata, docs, source assets, and inventory are unchanged
```

## Green

Expected changed files:

```text
M packages/astro-icons/scripts/assert-pack-files.mjs
M packages/astro-icons/scripts/test/assert-pack-files.test.mjs
```

Expected protected diffs: empty.

## Refactor

If tests fail, fix only the script or its test. If protected files changed, revert those changes before continuing.

## Acceptance Criteria

- Targeted test suite passes.
- `assert-pack-files.mjs` is import-safe.
- Pure functions are exported.
- Existing behavior is preserved.
- New legal-file requirements are covered.
- Include/permitted redistribution rule is covered.
- Protected files are unchanged.

## Non-Goals

- Do not wire `package.json`.
- Do not update README or AGENTS.
- Do not run full package check yet.
- Do not run `licenses:update`.
- Do not stage or commit.

## Suggested Execution Order

Run after Cycle 8.

---

# Final Acceptance Matrix

| Area                        | Acceptance criterion                                                                       |
| --------------------------- | ------------------------------------------------------------------------------------------ |
| Import safety               | Importing `assert-pack-files.mjs` does not run CLI side effects                            |
| Pure exports                | Required pure helpers are exported                                                         |
| Existing required files     | Existing runtime required files remain required                                            |
| Existing blocked files      | Existing blocked patterns remain active                                                    |
| Migration blocking          | `package/migration/` is blocked                                                            |
| SVG parity                  | Existing SVG parity behavior remains unchanged                                             |
| Core legal files            | `package/LICENSE` and fixed `package/LICENSES/*` files are required                        |
| Included references         | Included asset `licenseFile` / `permissionFile` / `policyFile` references are required     |
| Excluded/pending references | Excluded and pending asset references are not required                                     |
| Redistribution gate         | Included assets require `redistribution.conclusion === "permitted"`                        |
| Grouped diagnostics         | Combined violations are reported together                                                  |
| CLI preservation            | Direct script execution still performs pack/stdin evaluation and reports failures          |
| Tests                       | `assert-pack-files.test.mjs` passes                                                        |
| Scope                       | Manifest, generated notice, package metadata, docs, source assets, and inventory unchanged |

# Consolidated Non-Goals

- Do not edit `LICENSES/third-party-icons.json`.
- Do not edit `LICENSES/THIRD_PARTY.md`.
- Do not edit package metadata.
- Do not update README or AGENTS.
- Do not wire `test:pack-files`.
- Do not add `risk-accepted`.
- Do not modify Subphase 1.2 validators.
- Do not regenerate notices.
- Do not edit SVG/source assets.
- Do not edit `icon-inventory.json`.
- Do not stage or commit.

# Main Improvements Over the Original Plan

The original plan is solid. This version improves it by:

1. starting with characterization tests for existing behavior;
2. separating import-safety from pure helper extraction;
3. adding license-file derivation before composing the final evaluator;
4. isolating the redistribution gate from manifest vocabulary changes;
5. preserving CLI behavior as its own final implementation cycle.

DDT is useful for blocked patterns, required-file cases, included/excluded/pending asset references, redistribution
conclusions, and combined diagnostics. PBT is not warranted here because this is a fixed pack-contract matrix over known
file-list categories, not a broad input-domain property.
