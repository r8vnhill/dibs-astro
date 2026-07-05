# [DONE] Phase 1.3.4 --- Update Package Publication Metadata

## Current Status

[DONE] `packages/astro-icons/package.json` now declares the package-code license as `BSD-2-Clause` and includes
`LICENSE` plus `LICENSES` in the publication allowlist.

Verification performed:

- `pnpm --filter @ravenhill/astro-icons test:licenses` — 49 tests passed across 16 suites.
- `pnpm --filter @ravenhill/astro-icons licenses:check` — `Third-party notice is current.`
- `pnpm --filter @ravenhill/astro-icons lint` — failed before package analysis because `publint` could not be resolved
  from `packages/astro-icons/node_modules/publint/src/cli.js`.

Diff inspection confirmed only the intended `license` and `files` metadata changes in `package.json`. Protected diffs
were empty for README, AGENTS, `LICENSE`, `LICENSES/**`, `src/**`, and `migration/icon-inventory.json`. No pack,
publish, staging, commit, changelog, version, script, dependency, export, manifest, generated-notice, or source-asset
changes were performed.

## Scope Classification

**Recommended structure:** direct **red-green-refactor cycles**.

## Editable Scope

Modify only:

```text
packages/astro-icons/package.json
```

Protected / out of scope:

```text
packages/astro-icons/README.md
packages/astro-icons/AGENTS.md
packages/astro-icons/LICENSE
packages/astro-icons/LICENSES/**
packages/astro-icons/src/**
packages/astro-icons/migration/icon-inventory.json
```

---

## Cycle 1 — Add Package License Metadata

### Goal

Declare the package-code license using the correct SPDX identifier.

### Scope

Edit only the top-level metadata in:

```text
packages/astro-icons/package.json
```

Add:

```json
"license": "BSD-2-Clause"
```

### Red

```gherkin
Feature: Package license metadata

Scenario: Package declares its code license
  Given package code is licensed under BSD-2-Clause
  When package.json metadata is updated
  Then the license field is BSD-2-Clause
  And the version, exports, scripts, dependencies, and publishConfig remain unchanged
```

### Green

Add the `license` field using the repository’s existing JSON ordering convention.

### Refactor

Check that the field is not confused with asset licensing. The package metadata license describes package code;
third-party icon attribution remains documented through `LICENSES/`.

### Acceptance Criteria

- `package.json.license === "BSD-2-Clause"`.
- No `version` change.
- No `exports` change.
- No `scripts` change.
- No dependency or devDependency change.
- No `publishConfig` change.

### Non-Goals

- Do not edit `README.md`.
- Do not edit `AGENTS.md`.
- Do not edit license text files.
- Do not edit generated notices.
- Do not publish or pack.

### Suggested Execution Order

Run first.

---

## Cycle 2 — Add License Files to the Publication Allowlist

### Goal

Ensure the published package includes the package license and attribution directory.

### Scope

Edit only the `files` array in:

```text
packages/astro-icons/package.json
```

Change from:

```json
"files": [
  "dist",
  "README.md"
]
```

to:

```json
"files": [
  "dist",
  "README.md",
  "LICENSE",
  "LICENSES"
]
```

### Red

```gherkin
Feature: Package publication allowlist

Scenario: Published package includes license and attribution files
  Given the package files allowlist includes dist and README.md
  When publication metadata is updated
  Then LICENSE is included
  And LICENSES is included
  And dist and README.md remain included
```

### Green

Add `LICENSE` and `LICENSES` to the existing allowlist.

### Refactor

Preserve existing ordering unless the repository style clearly uses alphabetical order. A practical order is:

```text
dist
README.md
LICENSE
LICENSES
```

because it preserves the existing entries first and appends the new license/notice entries.

### Acceptance Criteria

- `files` includes `dist`.
- `files` includes `README.md`.
- `files` includes `LICENSE`.
- `files` includes `LICENSES`.
- No other package metadata changes.

### Non-Goals

- Do not add `LICENSES/PHOSPHOR.txt` or `LICENSES/README.md` individually if the directory is already allowlisted.
- Do not modify generated notices.
- Do not add pack-contract assertions.

### Suggested Execution Order

Run after Cycle 1.

---

## Cycle 3 — Inspect Package Metadata Diff

### Goal

Confirm `package.json` contains only the intended metadata changes.

### Scope

Run from repository root:

```powershell
Set-Location "e:\teaching\DIBS\projects\astro-website"

git diff -- packages/astro-icons/package.json
```

### Red

```gherkin
Feature: Package metadata diff purity

Scenario: Phase 1.3.4 changes only license metadata and publication files
  Given package.json has been updated
  When the package.json diff is inspected
  Then the diff adds license BSD-2-Clause
  And the diff adds LICENSE and LICENSES to files
  And no scripts, dependencies, exports, version, or publishConfig are changed
```

### Green

Expected diff is limited to:

```text
+ "license": "BSD-2-Clause"
+ "LICENSE"
+ "LICENSES"
```

plus minimal JSON punctuation needed by the edit.

### Refactor

If any unrelated metadata changed, revert it before running broader verification.

### Acceptance Criteria

- Diff contains only the intended `license` and `files` updates.
- Existing `test:licenses`, `licenses:check`, and `licenses:update` scripts remain unchanged.
- No dependency, export, version, or registry metadata drift appears.

### Non-Goals

- Do not run `licenses:update`.
- Do not touch source or docs.
- Do not stage or commit.

### Suggested Execution Order

Run after Cycle 2.

---

## Cycle 4 — Run Verification Commands

### Goal

Confirm metadata changes did not disturb license tooling, generated notices, or lint expectations.

### Scope

Run:

```powershell
pnpm --filter @ravenhill/astro-icons test:licenses
pnpm --filter @ravenhill/astro-icons licenses:check
pnpm --filter @ravenhill/astro-icons lint
```

### Red

```gherkin
Feature: Metadata update verification

Scenario: Package metadata update preserves existing license tooling
  Given only package.json metadata has changed
  When license tests, notice check, and lint run
  Then license tests pass
  And THIRD_PARTY.md remains current
  And lint passes or any unrelated pre-existing failure is reported
```

### Green

Record pass/fail results for all three commands.

### Refactor

If `licenses:check` fails, do not edit `THIRD_PARTY.md` in this phase. Metadata changes should not affect generated
notice output.

### Acceptance Criteria

- `test:licenses` passes.
- `licenses:check` passes.
- `lint` passes, or any unrelated pre-existing lint failure is reported with exact command output.
- No generated notice changes.

### Non-Goals

- Do not run `licenses:update`.
- Do not regenerate notices.
- Do not fix unrelated lint issues inside this phase.

### Suggested Execution Order

Run after the package diff is clean.

---

## Cycle 5 — Inspect Protected Diffs

### Goal

Confirm the metadata phase did not touch documentation, evidence, generated notices, assets, or inventory.

### Scope

Run:

```powershell
git status --short

git diff -- packages/astro-icons/README.md
git diff -- packages/astro-icons/AGENTS.md
git diff -- packages/astro-icons/LICENSE
git diff -- packages/astro-icons/LICENSES
git diff -- packages/astro-icons/src
git diff -- packages/astro-icons/migration/icon-inventory.json
```

### Red

```gherkin
Feature: Phase 1.3.4 repository purity

Scenario: Publication metadata update is isolated to package.json
  Given Phase 1.3.4 is complete
  When protected diffs are inspected
  Then README and AGENTS have no new diff
  And LICENSE and LICENSES have no new diff
  And SVG/source files have no diff
  And icon-inventory.json has no diff
```

### Green

Expected in-scope diff:

```text
M packages/astro-icons/package.json
```

Expected protected diffs: empty for all protected files.

### Refactor

If protected files changed, revert them unless they are pre-existing accepted changes from earlier phases. In the final
report, distinguish pre-existing changes from new Phase 1.3.4 changes.

### Acceptance Criteria

- Only `packages/astro-icons/package.json` changes in this phase.
- README and AGENTS are unchanged in this phase.
- License files and `LICENSES/**` are unchanged in this phase.
- Source assets are unchanged.
- Inventory is unchanged.
- No staging or commit occurs.

### Non-Goals

- Do not stage.
- Do not commit.
- Do not archive the phase.
- Do not update changelog or version.

### Suggested Execution Order

Run last.

---

# Final Acceptance Matrix

| Area              | Acceptance criterion                                                                               |
| ----------------- | -------------------------------------------------------------------------------------------------- |
| License metadata  | `package.json.license === "BSD-2-Clause"`                                                          |
| Files allowlist   | `files` includes `dist`, `README.md`, `LICENSE`, and `LICENSES`                                    |
| Existing metadata | `name`, `version`, `type`, `exports`, `scripts`, `devDependencies`, and `publishConfig` unchanged  |
| License tests     | `pnpm --filter @ravenhill/astro-icons test:licenses` passes                                        |
| Notice drift      | `pnpm --filter @ravenhill/astro-icons licenses:check` passes                                       |
| Lint              | `pnpm --filter @ravenhill/astro-icons lint` passes or unrelated pre-existing failures are reported |
| Generated notice  | `LICENSES/THIRD_PARTY.md` unchanged                                                                |
| Frozen manifest   | `LICENSES/third-party-icons.json` unchanged                                                        |
| Docs              | README and AGENTS unchanged in this phase                                                          |
| License texts     | `LICENSE`, `PHOSPHOR.txt`, and `LICENSES/README.md` unchanged in this phase                        |
| Assets            | `src/**` unchanged                                                                                 |
| Inventory         | `migration/icon-inventory.json` unchanged                                                          |
| Workflow          | No pack, publish, stage, commit, changelog, or version changes                                     |

# Consolidated Non-Goals

- Do not edit README.
- Do not edit AGENTS.
- Do not edit license text files.
- Do not edit `LICENSES/THIRD_PARTY.md`.
- Do not edit `LICENSES/third-party-icons.json`.
- Do not edit SVG/source assets.
- Do not edit `icon-inventory.json`.
- Do not add or modify scripts.
- Do not add dependencies.
- Do not change package exports.
- Do not change version.
- Do not run `licenses:update`.
- Do not add pack-contract assertions.
- Do not run `npm pack` or publish.
- Do not stage or commit.
- Do not archive the phase.

# Main Improvements Over the Original Plan

The original plan is already well scoped. This version improves it by:

1. separating the `license` field edit from the `files` allowlist edit;
2. making package metadata diff inspection its own gate before running commands;
3. explicitly protecting `scripts`, `exports`, dependencies, version, and publish metadata;
4. clarifying that `LICENSES` directory allowlisting is enough, without individually listing every notice file;
5. keeping pack/publish verification out of this phase because pack-contract assertions belong to a later phase.

DDT is useful only for the metadata checklist and protected-path verification. PBT is not useful here because the work
is deterministic package metadata editing, not behavior over a broad input space.

[1]: https://docs.npmjs.com/files/package.json/?utm_source=chatgpt.com "package.json"
