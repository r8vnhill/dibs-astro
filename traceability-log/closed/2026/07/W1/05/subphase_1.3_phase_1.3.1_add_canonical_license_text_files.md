# [DONE] Subphase 1.3, Phase 1.3.1 --- Add Canonical License Text Files [DONE]

## Current Status

[DONE] `packages/astro-icons/LICENSE` (BSD-2-Clause, holder `Ignacio Slater-Muñoz`, year 2026, body copied from
`scripts/LICENSE`) and `packages/astro-icons/LICENSES/PHOSPHOR.txt` (MIT license text, recorded notice
`Copyright (c) 2020-2024 Phosphor Icons`, no lineage claims) were added. Verified via `git status --short` that only
these two files are new, and via `git diff` that `LICENSES/third-party-icons.json` and `LICENSES/THIRD_PARTY.md` are
byte-unchanged. No README, AGENTS, package.json, source, SVG, or inventory files were touched. Nothing was staged or
committed.

## Scope Classification

**Recommended structure:** direct **red-green-refactor cycles**.

## Editable Scope

Create only:

```text
packages/astro-icons/LICENSE
packages/astro-icons/LICENSES/PHOSPHOR.txt
```

Read-only references:

```text
scripts/LICENSE
packages/astro-icons/LICENSES/third-party-icons.json
packages/astro-icons/LICENSES/THIRD_PARTY.md
```

## Cycle 1 --- Add the Package Code License

### Goal

Add the package-code license file using the confirmed package holder and existing monorepo BSD-2-Clause style.

### Scope

Create:

```text
packages/astro-icons/LICENSE
```

Use:

```text
Copyright (c) 2026 Ignacio Slater-Muñoz
```

Then copy the standard BSD-2-Clause body from the existing monorepo template:

```text
scripts/LICENSE
```

### Red

```gherkin
Feature: Package code license file

Scenario: The package code license uses the confirmed holder
  Given the confirmed package code holder is Ignacio Slater-Muñoz
  And the package code license is BSD-2-Clause
  When packages/astro-icons/LICENSE is created
  Then the copyright line uses 2026 and Ignacio Slater-Muñoz
  And the body matches the repository's existing BSD-2-Clause template
  And no source-code files are modified
```

### Green

Create `packages/astro-icons/LICENSE` with:

1. the confirmed copyright line;
2. the BSD-2-Clause body copied from `scripts/LICENSE`;
3. no extra provenance commentary.

### Refactor

Compare formatting against `scripts/LICENSE` and keep only the minimum package-specific change: the file location. Do
not alter wording for style unless the existing template requires it.

### Acceptance Criteria

- `packages/astro-icons/LICENSE` exists.
- Holder is exactly `Ignacio Slater-Muñoz`.
- Year is `2026`.
- Body is BSD-2-Clause and matches the monorepo template.
- No README, AGENTS, package metadata, manifest, generated notice, or source files change.

### Non-Goals

- Do not add source-code license headers.
- Do not edit `package.json`.
- Do not edit README or AGENTS.
- Do not stage or commit.

### Suggested Execution Order

Run first.

---

## Cycle 2 --- Add the Phosphor MIT License Text

### Goal

Add the Phosphor third-party license text using the already-recorded MIT conclusion and copyright notice.

### Scope

Create:

```text
packages/astro-icons/LICENSES/PHOSPHOR.txt
```

Use the opening:

```text
MIT License

Copyright (c) 2020-2024 Phosphor Icons
```

Then add the standard MIT license body.

### Red

```gherkin
Feature: Phosphor license text

Scenario: The Phosphor notice records license text without reopening lineage
  Given the evidence manifest records Phosphor as MIT
  And the recorded notice is Copyright (c) 2020-2024 Phosphor Icons
  And Phosphor source lineage remains unresolved
  When LICENSES/PHOSPHOR.txt is created
  Then it contains the MIT license text
  And it uses the recorded copyright notice
  And it does not claim a resolved upstream commit, version, tag, or package release
```

### Green

Create `packages/astro-icons/LICENSES/PHOSPHOR.txt` with the MIT license text and recorded notice.

### Refactor

Keep this file as a **license text file only**. Do not include the unresolved corpus-lineage discussion here; that
remains in `THIRD_PARTY.md` and the traceability log.

### Acceptance Criteria

- `PHOSPHOR.txt` exists.
- It contains the recorded Phosphor notice.
- It contains MIT license text.
- It does not mention any guessed commit, tag, version, package release, or immutable source.
- `third-party-icons.json` remains unchanged.
- `THIRD_PARTY.md` remains unchanged.

### Non-Goals

- Do not resolve Phosphor lineage.
- Do not edit the manifest.
- Do not regenerate `THIRD_PARTY.md`.
- Do not add non-Phosphor license files.

### Suggested Execution Order

Run after Cycle 1.

---

## Cycle 3 --- Verify Two-File Scope and Protected Inputs

### Goal

Confirm this phase added only the two canonical license text files and left frozen evidence untouched.

### Scope

Run from repository root:

```powershell
Set-Location "e:\teaching\DIBS\projects\astro-website"

git status --short
git diff -- packages/astro-icons/LICENSES/third-party-icons.json
git diff -- packages/astro-icons/LICENSES/THIRD_PARTY.md
```

Optional content checks:

```powershell
Get-Content packages/astro-icons/LICENSE -TotalCount 5
Get-Content packages/astro-icons/LICENSES/PHOSPHOR.txt -TotalCount 5
```

### Red

```gherkin
Feature: License text phase purity

Scenario: Adding canonical license files does not change frozen evidence
  Given the package license text files have been created
  When repository status and protected diffs are inspected
  Then only packages/astro-icons/LICENSE and packages/astro-icons/LICENSES/PHOSPHOR.txt are new
  And third-party-icons.json has no diff
  And THIRD_PARTY.md has no diff
```

### Green

Expected status:

```text
?? packages/astro-icons/LICENSE
?? packages/astro-icons/LICENSES/PHOSPHOR.txt
```

Expected empty diffs:

```text
packages/astro-icons/LICENSES/third-party-icons.json
packages/astro-icons/LICENSES/THIRD_PARTY.md
```

### Refactor

If any protected file changed, revert it. If README, AGENTS, or package metadata changed, defer those edits to their
later Subphase 1.3 phases.

### Acceptance Criteria

- Only the two new license text files appear as new work.
- `third-party-icons.json` diff is empty.
- `THIRD_PARTY.md` diff is empty.
- No README, AGENTS, package metadata, SVG, inventory, or source-code changes occur.
- No staging or commit occurs.

### Non-Goals

- Do not run package tests for this phase unless desired as an extra sanity check.
- Do not edit documentation beyond the two license files.
- Do not archive or mark later phases done.

### Suggested Execution Order

Run last.

---

# Final Acceptance Matrix

| Area                  | Acceptance criterion                                             |
| --------------------- | ---------------------------------------------------------------- |
| Package license file  | `packages/astro-icons/LICENSE` exists                            |
| Package holder        | Uses `Ignacio Slater-Muñoz` exactly                              |
| Package year          | Uses `2026`                                                      |
| Package license body  | Matches the existing monorepo BSD-2-Clause template              |
| Phosphor license file | `packages/astro-icons/LICENSES/PHOSPHOR.txt` exists              |
| Phosphor notice       | Uses `Copyright (c) 2020-2024 Phosphor Icons`                    |
| Phosphor license body | Uses standard MIT license text                                   |
| Lineage conservatism  | No guessed Phosphor commit, tag, version, or package source      |
| Frozen manifest       | `third-party-icons.json` unchanged                               |
| Generated notice      | `THIRD_PARTY.md` unchanged                                       |
| Scope                 | No README, AGENTS, package.json, source, SVG, or inventory edits |
| Workflow              | No staging or commit                                             |

# Consolidated Non-Goals

- Do not edit `packages/astro-icons/package.json`.
- Do not edit `packages/astro-icons/README.md`.
- Do not edit `packages/astro-icons/AGENTS.md`.
- Do not edit `LICENSES/third-party-icons.json`.
- Do not edit `LICENSES/THIRD_PARTY.md`.
- Do not create non-Phosphor license files.
- Do not resolve Phosphor lineage.
- Do not add source-code license headers.
- Do not run later Subphase 1.3 documentation or metadata work.
- Do not stage or commit.

# Main Improvements Over the Original Plan

The original plan is already well scoped. This version tightens it by:

1. making each new file its own red-green-refactor cycle;
2. keeping `PHOSPHOR.txt` clearly separate from provenance evidence;
3. making the protected-file verification explicit;
4. keeping README, AGENTS, and package metadata out of scope until later phases.

DDT is only lightly useful here for the verification matrix. PBT is not useful because the task is deterministic
text-file creation, not behavior over a broad input domain.
