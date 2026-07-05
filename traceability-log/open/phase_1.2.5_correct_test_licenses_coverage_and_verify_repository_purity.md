# [PLAN] Phase 1.2.5 --- Correct `test:licenses` Coverage and Verify Repository Purity

## Scope Classification

**Recommended structure:** direct **red-green-refactor cycles**.

**Why:** this phase has one corrective edit and a finite verification matrix:

- one-line `package.json` script correction;
- run license tests;
- run notice drift check;
- inspect protected diffs;
- report results;
- no staging, committing, archiving, or traceability rewrite.

## Editable Scope

Allowed edit:

```text
packages/astro-icons/package.json
```

Expected uncommitted/generated artifact already present:

```text
packages/astro-icons/LICENSES/THIRD_PARTY.md
```

Read-only verification targets:

```text
packages/astro-icons/LICENSES/third-party-icons.json
packages/astro-icons/migration/icon-inventory.json
packages/astro-icons/src/**
packages/astro-icons/scripts/test/license-metadata.test.mjs
packages/astro-icons/scripts/test/third-party-notices.test.mjs
packages/astro-icons/scripts/test/third-party-notices.contract.test.mjs
packages/astro-icons/scripts/generate-third-party-notices.mjs
```

---

# Cycle 1 — Fix the License Test Gate

## Goal

Ensure `test:licenses` actually covers validator, renderer, and CLI/contract tests.

## Scope

Edit only the `test:licenses` script in:

```text
packages/astro-icons/package.json
```

## Red

```gherkin
Feature: License test script coverage

Scenario: test:licenses covers all license test suites
  Given Phase 1.2.3 split renderer and CLI tests into separate files
  When package.json defines test:licenses
  Then it must run license-metadata.test.mjs
  And it must run third-party-notices.test.mjs
  And it must run third-party-notices.contract.test.mjs
  And it must not add any extra package scripts
```

## Green

Change:

```json
"test:licenses": "node --test scripts/test/license-metadata.test.mjs scripts/test/third-party-notices.test.mjs"
```

to:

```json
"test:licenses": "node --test scripts/test/license-metadata.test.mjs scripts/test/third-party-notices.test.mjs scripts/test/third-party-notices.contract.test.mjs"
```

Leave these existing scripts unchanged:

```json
"licenses:check": "node scripts/generate-third-party-notices.mjs --check",
"licenses:update": "node scripts/generate-third-party-notices.mjs --write"
```

## Refactor

Keep this as a one-line script fix. Do not reorder unrelated scripts or reformat `package.json` beyond the existing
style.

## Acceptance Criteria

- `test:licenses` includes all three test files.
- No fourth license script is added.
- `licenses:check` and `licenses:update` remain unchanged.
- Existing package `check` composition remains unchanged.

## Non-Goals

- Do not edit tests.
- Do not edit the generator.
- Do not regenerate `THIRD_PARTY.md`.
- Do not add dependencies.

## Suggested Execution Order

Run first. Otherwise the verification command gives a false sense of coverage.

---

# Cycle 2 — Run License Test Verification

## Goal

Verify the validator, renderer, and CLI/contract tests through the corrected package script.

## Scope

Run from repository root:

```powershell
Set-Location "e:\teaching\DIBS\projects\astro-website"

pnpm --filter @ravenhill/astro-icons test:licenses
```

## Red

```gherkin
Feature: Complete license test verification

Scenario: Corrected test:licenses runs all license suites
  Given test:licenses includes metadata, renderer, and contract test files
  When test:licenses runs
  Then all validator tests pass
  And all renderer tests pass
  And all CLI/contract tests pass
```

## Green

Run the command and record:

- total test files executed;
- pass/fail result;
- any failure summary.

## Refactor

If tests fail, classify the failure before changing anything:

| Failure type              | Response                                                                        |
| ------------------------- | ------------------------------------------------------------------------------- |
| script path typo          | fix `package.json` path only                                                    |
| existing test failure     | report failure; do not widen the phase automatically                            |
| generator nondeterminism  | defer to a corrective generator pass unless clearly caused by the script wiring |
| environment/tooling issue | report exact command output and stop                                            |

## Acceptance Criteria

- `test:licenses` passes.
- The contract test file is included in the executed suite.
- No production files are changed by the test command.

## Non-Goals

- Do not skip failing tests.
- Do not delete or merge test files.
- Do not modify implementation files unless the user separately authorizes a corrective pass.

## Suggested Execution Order

Run after Cycle 1.

---

# Cycle 3 — Verify Generated Notice Drift

## Goal

Confirm `THIRD_PARTY.md` is current against the frozen manifest.

## Scope

Run:

```powershell
pnpm --filter @ravenhill/astro-icons licenses:check
```

## Red

```gherkin
Feature: Generated notice drift check

Scenario: THIRD_PARTY.md matches the frozen attribution manifest
  Given LICENSES/THIRD_PARTY.md exists
  When licenses:check runs
  Then the command passes
  And the notice is not rewritten
  And third-party-icons.json remains unchanged
```

## Green

Run `licenses:check`.

Record whether it passes and whether it reports any drift.

## Refactor

If `licenses:check` fails:

| Failure type                | Response                                                                                          |
| --------------------------- | ------------------------------------------------------------------------------------------------- |
| missing `THIRD_PARTY.md`    | report missing baseline; do not regenerate in this verification phase unless explicitly requested |
| stale generated notice      | report drift; do not manually edit generated output                                               |
| manifest validation failure | report validator findings; do not mutate the frozen manifest                                      |
| nondeterministic output     | defer to generator corrective pass                                                                |

## Acceptance Criteria

- `licenses:check` passes.
- `THIRD_PARTY.md` is current.
- No generated file is rewritten by check mode.
- No manifest, inventory, or SVG files change.

## Non-Goals

- Do not run `licenses:update`.
- Do not manually patch `THIRD_PARTY.md`.
- Do not edit the manifest to satisfy the check.

## Suggested Execution Order

Run after Cycle 2 passes.

---

# Cycle 4 — Inspect Repository Purity

## Goal

Confirm the working tree contains only the expected Phase 1.2.5 artifacts and protected inputs remain unchanged.

## Scope

Run:

```powershell
git status --short

git diff -- packages/astro-icons/LICENSES/third-party-icons.json
git diff -- packages/astro-icons/migration/icon-inventory.json
git diff -- packages/astro-icons/src
git diff -- packages/astro-icons/package.json
git diff -- packages/astro-icons/LICENSES/THIRD_PARTY.md
```

## Red

```gherkin
Feature: Repository purity for Phase 1.2.5

Scenario: Verification leaves frozen inputs and assets untouched
  Given Phase 1.2.5 verification has run
  When repository diffs are inspected
  Then third-party-icons.json has no diff
  And icon-inventory.json has no diff
  And SVG assets have no diff
  And package.json only changes test:licenses coverage
  And THIRD_PARTY.md remains the generated baseline
```

## Green

Expected status after the script fix:

```text
M  packages/astro-icons/package.json
?? packages/astro-icons/LICENSES/THIRD_PARTY.md
```

If other entries exist, classify them as:

| Category                                         | Handling                                              |
| ------------------------------------------------ | ----------------------------------------------------- |
| pre-existing committed work already out of scope | name it as out of scope                               |
| new protected-path diff                          | fail purity check                                     |
| new scratch artifact                             | remove if created during verification                 |
| package.json extra drift                         | reduce to the one intended `test:licenses` correction |

## Refactor

Inspect `package.json` diff carefully. It should show:

- the three package-local license scripts exist;
- only `test:licenses` was corrected in this phase;
- no broader check composition changed.

## Acceptance Criteria

- `third-party-icons.json` diff is empty.
- `icon-inventory.json` diff is empty.
- `packages/astro-icons/src` diff is empty.
- `package.json` diff is limited to the license script wiring expected for Subphase 1.2.
- `THIRD_PARTY.md` is present as the generated baseline.
- No scratch artifacts remain.

## Non-Goals

- Do not stage files.
- Do not commit files.
- Do not archive the phase.
- Do not resolve unrelated working-tree entries.

## Suggested Execution Order

Run after Cycles 2–3.

---

# Cycle 5 — Report Phase 1.2.5 Results

## Goal

Produce a concise verification report against the checked-in acceptance matrix.

## Scope

Report only; no file edits.

## Red

```gherkin
Feature: Phase 1.2.5 verification report

Scenario: Verification outcome is auditable
  Given license tests, notice check, and repository purity checks have run
  When the result is reported
  Then the report lists pass/fail status for each acceptance criterion
  And it names any out-of-scope pre-existing diffs separately
  And it does not claim staging, committing, or archiving
```

## Green

Use this report shape:

```markdown
## Phase 1.2.5 Verification Report

| Check                                                 | Result    |
| ----------------------------------------------------- | --------- |
| `test:licenses` includes contract tests               | PASS/FAIL |
| `pnpm --filter @ravenhill/astro-icons test:licenses`  | PASS/FAIL |
| `pnpm --filter @ravenhill/astro-icons licenses:check` | PASS/FAIL |
| `third-party-icons.json` unchanged                    | PASS/FAIL |
| `icon-inventory.json` unchanged                       | PASS/FAIL |
| SVG assets unchanged                                  | PASS/FAIL |
| `package.json` limited to intended script wiring      | PASS/FAIL |
| `THIRD_PARTY.md` present and current                  | PASS/FAIL |
| No staging/commit/archive performed                   | PASS/FAIL |
```

## Refactor

Keep remediation advice tied to actual failures. Do not propose new work if all checks pass.

## Acceptance Criteria

- Report includes the corrected test-script coverage.
- Report includes test/check outcomes.
- Report includes protected diff outcomes.
- Report states that no staging, commit, or archive was performed.

## Non-Goals

- Do not update traceability docs.
- Do not mark Phase 1.2.5 `[DONE]`.
- Do not create a closure note.
- Do not commit.

## Suggested Execution Order

Run last.

---

# Final Acceptance Matrix

| Area                 | Acceptance criterion                                                                                                              |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Test script coverage | `test:licenses` includes `license-metadata.test.mjs`, `third-party-notices.test.mjs`, and `third-party-notices.contract.test.mjs` |
| License tests        | `pnpm --filter @ravenhill/astro-icons test:licenses` passes                                                                       |
| Notice drift         | `pnpm --filter @ravenhill/astro-icons licenses:check` passes                                                                      |
| Generated notice     | `THIRD_PARTY.md` is present and current                                                                                           |
| Frozen manifest      | `third-party-icons.json` unchanged                                                                                                |
| Frozen inventory     | `icon-inventory.json` unchanged                                                                                                   |
| SVG assets           | `packages/astro-icons/src` unchanged                                                                                              |
| Package script scope | `package.json` has only the intended license-script changes                                                                       |
| No wider wiring      | package/workspace `check` scripts unchanged                                                                                       |
| No staging           | no `git add`                                                                                                                      |
| No commit            | no commit created                                                                                                                 |
| No archive           | phase not archived or marked closed                                                                                               |

# Consolidated Non-Goals

- Do not stage files.
- Do not commit files.
- Do not archive the phase.
- Do not mark Phase 1.2.5 `[DONE]`.
- Do not regenerate `THIRD_PARTY.md` unless explicitly requested after a drift failure.
- Do not edit `third-party-icons.json`.
- Do not edit `icon-inventory.json`.
- Do not edit SVG assets.
- Do not change generator or validator code in this verification pass.
- Do not add package/workspace check composition.
- Do not add dependencies.
- Do not clean up unrelated working-tree changes.

# Main Improvements Over the Original Plan

The original plan is good, but this version tightens it in four ways:

1. **Renames the work accurately** as corrective verification because `package.json` needs a one-line fix.
2. **Makes the missing contract test a first-class acceptance criterion**, not an incidental observation.
3. **Separates test verification from drift verification**, so failures point to the right subsystem.
4. **Keeps reporting separate from repository changes**, preserving the phase’s non-goals: no staging, no commit, no
   archive.

DDT is useful for the verification matrix and script coverage expectations. PBT is not useful here because the task is
deterministic: a fixed script list, fixed commands, and fixed protected paths.
