# [DONE] Phase 1.3.5 --- Verify Attribution Files and Repository Purity

## Scope Classification

**Recommended structure:** direct **red-green-refactor cycles**.

## Editable Scope

Edit only after verification succeeds:

```text
traceability-log/open/subphase_1.3_add_license_texts_and_package_documentation.md
```

Read-only verification targets:

```text
packages/astro-icons/package.json
packages/astro-icons/README.md
packages/astro-icons/AGENTS.md
packages/astro-icons/LICENSE
packages/astro-icons/LICENSES/PHOSPHOR.txt
packages/astro-icons/LICENSES/README.md
packages/astro-icons/LICENSES/third-party-icons.json
packages/astro-icons/LICENSES/THIRD_PARTY.md
packages/astro-icons/src/**
packages/astro-icons/migration/icon-inventory.json
```

---

## Cycle 1 — Establish Verification Baseline

### Goal

Confirm the working tree is clean except for the expected subphase documentation change before running checks.

### Scope

Run from repository root:

```powershell
Set-Location "e:\teaching\DIBS\projects\astro-website"

git status --short
```

### Red

```gherkin
Feature: Subphase 1.3 final verification baseline

Scenario: Verification starts from a controlled working tree
  Given Phases 1.3.1 through 1.3.4 are already done
  When repository status is inspected
  Then only the Subphase 1.3 traceability document may be modified
  And no package source, manifest, generated notice, or metadata file may have unexpected changes
```

### Green

Expected baseline:

```text
M traceability-log/open/subphase_1.3_add_license_texts_and_package_documentation.md
```

If other changes appear, classify them before proceeding:

| Status entry                  | Response                    |
| ----------------------------- | --------------------------- |
| expected subphase doc edit    | continue                    |
| protected package file diff   | stop and inspect            |
| generated notice drift        | stop; do not manually patch |
| unrelated working-tree change | report as out of scope      |

### Refactor

Do not clean, stage, or commit anything. This phase observes and reports.

### Acceptance Criteria

- Working tree has no unexpected package changes.
- Any pre-existing unrelated diff is explicitly identified.
- Verification starts from a known baseline.

### Non-Goals

- Do not stage.
- Do not commit.
- Do not archive.
- Do not clean unrelated files.

### Suggested Execution Order

Run first.

---

## Cycle 2 — Run License and Lint Checks

### Goal

Verify that the package-local license tooling still passes and that lint status is known.

### Scope

Run:

```powershell
pnpm --filter @ravenhill/astro-icons test:licenses
pnpm --filter @ravenhill/astro-icons licenses:check
pnpm --filter @ravenhill/astro-icons lint
```

### Red

```gherkin
Feature: Attribution documentation verification commands

Scenario: License checks pass after Subphase 1.3 documentation and metadata work
  Given Subphase 1.3 files have been added
  When package license checks run
  Then test:licenses passes
  And licenses:check passes
  And lint either passes or an unrelated pre-existing lint failure is documented
```

### Green

Record exact outcomes:

| Command          | Expected result                                               |
| ---------------- | ------------------------------------------------------------- |
| `test:licenses`  | pass                                                          |
| `licenses:check` | pass                                                          |
| `lint`           | pass, or documented pre-existing `publint` resolution failure |

If `lint` still fails because `publint` cannot be resolved from `packages/astro-icons/node_modules/publint/src/cli.js`,
document it as a known pre-existing tooling resolution issue. Do not install dependencies or modify `node_modules` in
this phase.

### Refactor

Use this failure handling:

| Failure                                            | Response                                                           |
| -------------------------------------------------- | ------------------------------------------------------------------ |
| `test:licenses` fails                              | stop; report failing test suite                                    |
| `licenses:check` fails                             | stop; report drift/validation output; do not run `licenses:update` |
| `lint` fails with known `publint` resolution issue | document as known/pre-existing                                     |
| `lint` fails for a new package-doc issue           | stop and report; do not widen scope automatically                  |

### Acceptance Criteria

- `test:licenses` passes.
- `licenses:check` passes.
- `lint` passes or known pre-existing failure is documented.
- No files are changed by the commands.

### Non-Goals

- Do not run `licenses:update`.
- Do not fix dependency installation.
- Do not edit generated notices.
- Do not modify package source.

### Suggested Execution Order

Run after Cycle 1.

---

## Cycle 3 — Verify Required Files and Metadata

### Goal

Confirm all Subphase 1.3 deliverables exist and package metadata reflects Phase 1.3.4.

### Scope

Inspect current files directly.

Required files:

```text
packages/astro-icons/LICENSE
packages/astro-icons/LICENSES/PHOSPHOR.txt
packages/astro-icons/LICENSES/README.md
packages/astro-icons/README.md
packages/astro-icons/AGENTS.md
packages/astro-icons/package.json
```

### Red

```gherkin
Feature: Subphase 1.3 deliverable completeness

Scenario: License texts, documentation, and package metadata are present
  Given Phases 1.3.1 through 1.3.4 are marked DONE
  When the package files are inspected
  Then LICENSE exists
  And LICENSES/PHOSPHOR.txt exists
  And LICENSES/README.md exists
  And README contains attribution guidance
  And AGENTS contains attribution maintenance guidance
  And package.json declares BSD-2-Clause and includes LICENSE and LICENSES in files
```

### Green

Confirm:

| File                    | Expected content                                       |
| ----------------------- | ------------------------------------------------------ |
| `LICENSE`               | BSD-2-Clause text, holder `Ignacio Slater-Muñoz`       |
| `LICENSES/PHOSPHOR.txt` | MIT text with `Copyright (c) 2020-2024 Phosphor Icons` |
| `LICENSES/README.md`    | explains license directory roles                       |
| `README.md`             | has attribution/licensing section                      |
| `AGENTS.md`             | has future attribution workflow                        |
| `package.json`          | `"license": "BSD-2-Clause"`                            |
| `package.json.files`    | includes `dist`, `README.md`, `LICENSE`, `LICENSES`    |

### Refactor

If `package.json` has no diff because Phase 1.3.4 is already committed, verify current file content instead of requiring
a visible diff.

### Acceptance Criteria

- All Subphase 1.3 files exist.
- Package metadata matches Phase 1.3.4 expectations.
- README and AGENTS guidance are present.
- No new files are created during inspection.

### Non-Goals

- Do not rewrite license text.
- Do not update package metadata.
- Do not create additional notice files.
- Do not add pack-contract checks.

### Suggested Execution Order

Run after Cycle 2.

---

## Cycle 4 — Inspect Protected Diffs

### Goal

Confirm frozen evidence, generated notices, source assets, and inventory remain unchanged.

### Scope

Run:

```powershell
git diff -- packages/astro-icons/LICENSES/third-party-icons.json
git diff -- packages/astro-icons/LICENSES/THIRD_PARTY.md
git diff -- packages/astro-icons/src
git diff -- packages/astro-icons/migration/icon-inventory.json
git diff -- packages/astro-icons/package.json
```

### Red

```gherkin
Feature: Repository purity for Subphase 1.3 closure

Scenario: Final verification does not change frozen or generated package artifacts
  Given Subphase 1.3 documentation and metadata are complete
  When protected diffs are inspected
  Then third-party-icons.json has no diff
  And THIRD_PARTY.md has no diff
  And src has no diff
  And icon-inventory.json has no diff
  And package.json has no unexpected diff
```

### Green

Expected protected diffs:

```text
packages/astro-icons/LICENSES/third-party-icons.json   # empty
packages/astro-icons/LICENSES/THIRD_PARTY.md           # empty
packages/astro-icons/src                               # empty
packages/astro-icons/migration/icon-inventory.json     # empty
```

For `package.json`:

- if Phase 1.3.4 is already committed, diff should be empty;
- if still uncommitted, diff must be limited to `"license": "BSD-2-Clause"` and `files` entries for `LICENSE` /
  `LICENSES`.

### Refactor

If protected diffs appear:

| Diff                       | Response                                           |
| -------------------------- | -------------------------------------------------- |
| `third-party-icons.json`   | stop; frozen manifest must not change              |
| `THIRD_PARTY.md`           | stop; generated notice must not change             |
| `src/**`                   | stop; this subphase is documentation/metadata-only |
| `icon-inventory.json`      | stop; inventory is out of scope                    |
| unrelated package metadata | stop; report drift                                 |

### Acceptance Criteria

- Frozen manifest unchanged.
- Generated notice unchanged.
- SVG/source tree unchanged.
- Inventory unchanged.
- Package metadata is either clean or limited to already-approved Phase 1.3.4 metadata changes.

### Non-Goals

- Do not revert or fix unrelated diffs unless explicitly instructed.
- Do not run `licenses:update`.
- Do not edit protected files.

### Suggested Execution Order

Run after Cycle 3.

---

## Cycle 5 — Update Phase and Subphase Traceability Status

### Goal

Record the verification outcome and close Subphase 1.3 in the traceability document.

### Scope

Edit only:

```text
traceability-log/open/subphase_1.3_add_license_texts_and_package_documentation.md
```

Allowed edits:

1. append `[DONE]` to:

```markdown
# Phase 1.3.5 --- Verify Attribution Files and Repository Purity
```

2. add a `## Current Status` section under Phase 1.3.5;
3. add or update a subphase-level `## Current Status` section stating Subphase 1.3 is complete.

### Red

```gherkin
Feature: Subphase 1.3 traceability closure

Scenario: Traceability records verification results without claiming future work
  Given test:licenses and licenses:check pass
  And protected diffs are empty
  And lint passes or a known pre-existing lint issue is documented
  When the Subphase 1.3 traceability document is updated
  Then Phase 1.3.5 is marked DONE
  And the status records the commands run
  And the status records any known lint caveat
  And the subphase-level status says Subphase 1.3 is complete
  And the status does not claim Subphase 1.4 pack checks were added
```

### Green

Add a concise status section like:

```markdown
## Current Status

[DONE] Final Subphase 1.3 verification was performed.

Verification performed:

- `pnpm --filter @ravenhill/astro-icons test:licenses` — PASS.
- `pnpm --filter @ravenhill/astro-icons licenses:check` — PASS.
- `pnpm --filter @ravenhill/astro-icons lint` — PASS, or known pre-existing `publint` resolution failure documented.

Repository purity:

- `LICENSE`, `LICENSES/PHOSPHOR.txt`, and `LICENSES/README.md` exist.
- README and AGENTS attribution guidance are present.
- `package.json` declares `BSD-2-Clause` and includes `LICENSE` / `LICENSES` in `files`.
- `LICENSES/third-party-icons.json`, `LICENSES/THIRD_PARTY.md`, `src/`, and `migration/icon-inventory.json` have empty
  diffs.

No changelog, package version, pack-contract, manifest, generated-notice, source-asset, staging, commit, or archive work
was performed.
```

If lint has the known `publint` failure, use precise wording:

```markdown
`lint` still fails due to the previously documented `publint` resolution issue; this was treated as a pre-existing
tooling issue and was not remediated in Phase 1.3.5.
```

### Refactor

Keep the traceability update factual. Do not rewrite Phases 1.3.1–1.3.4.

### Acceptance Criteria

- Phase 1.3.5 is marked `[DONE]` only if acceptance criteria hold.
- Subphase-level status says Subphase 1.3 is complete.
- Commands and outcomes are recorded.
- Known lint caveat is documented if still present.
- No future Subphase 1.4 work is claimed.
- No archive movement occurs.

### Non-Goals

- Do not archive the subphase.
- Do not mark Subphase 1.4 done.
- Do not stage or commit.
- Do not edit unrelated traceability documents.

### Suggested Execution Order

Run after Cycles 1–4 pass or pass with the accepted lint caveat.

---

## Cycle 6 — Final Working Tree Report

### Goal

Confirm that the only remaining working-tree change after the status update is the intended subphase document.

### Scope

Run:

```powershell
git status --short
git diff -- traceability-log/open/subphase_1.3_add_license_texts_and_package_documentation.md
```

### Red

```gherkin
Feature: Final working tree report

Scenario: Phase 1.3.5 leaves only the traceability status edit
  Given the verification status has been recorded
  When git status is inspected
  Then only the Subphase 1.3 traceability document is modified
  And no package files are newly changed by Phase 1.3.5
```

### Green

Expected final status:

```text
M traceability-log/open/subphase_1.3_add_license_texts_and_package_documentation.md
```

If package files appear, classify them as:

- pre-existing accepted changes;
- unexpected protected diffs;
- generated drift;
- unrelated working-tree entries.

### Refactor

Report the final status. Do not stage or commit.

### Acceptance Criteria

- Final `git status --short` is clean except the subphase doc, or any additional entries are explicitly classified.
- Traceability diff contains only Phase 1.3.5 and subphase-level status edits.
- No package files are modified by this final verification phase.

### Non-Goals

- Do not stage.
- Do not commit.
- Do not archive.

### Suggested Execution Order

Run last.

---

# Final Acceptance Matrix

| Area             | Acceptance criterion                                                                    |
| ---------------- | --------------------------------------------------------------------------------------- |
| License tests    | `pnpm --filter @ravenhill/astro-icons test:licenses` passes                             |
| Notice drift     | `pnpm --filter @ravenhill/astro-icons licenses:check` passes                            |
| Lint             | passes, or the known pre-existing `publint` resolution failure is documented            |
| License files    | `LICENSE`, `LICENSES/PHOSPHOR.txt`, `LICENSES/README.md` exist                          |
| README           | Attribution/licensing guidance present                                                  |
| AGENTS           | Attribution maintenance guidance present                                                |
| Package metadata | `license` is `BSD-2-Clause`; `files` includes `LICENSE` and `LICENSES`                  |
| Frozen manifest  | `LICENSES/third-party-icons.json` unchanged                                             |
| Generated notice | `LICENSES/THIRD_PARTY.md` unchanged                                                     |
| Source assets    | `packages/astro-icons/src` unchanged                                                    |
| Inventory        | `migration/icon-inventory.json` unchanged                                               |
| Traceability     | Phase 1.3.5 marked `[DONE]`; subphase-level status says complete                        |
| No future scope  | No pack-contract, changelog, version, publish, stage, commit, or archive work performed |

# Consolidated Non-Goals

- Do not edit `LICENSES/third-party-icons.json`.
- Do not edit `LICENSES/THIRD_PARTY.md`.
- Do not run `licenses:update`.
- Do not edit SVG/source files.
- Do not edit `icon-inventory.json`.
- Do not add pack-contract assertions.
- Do not edit changelog.
- Do not change package version.
- Do not publish or pack.
- Do not install dependencies or touch `node_modules`.
- Do not stage.
- Do not commit.
- Do not archive the subphase.
- Do not rewrite earlier phase sections except for status cross-reference if already established by the doc style.
