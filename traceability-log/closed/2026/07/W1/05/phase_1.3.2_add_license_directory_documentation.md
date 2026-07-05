# [PLAN] Phase 1.3.2 --- Add License Directory Documentation [DONE]

## Current Status

[DONE] `packages/astro-icons/LICENSES/README.md` was added, documenting the roles of `../LICENSE`, `PHOSPHOR.txt`,
`THIRD_PARTY.md`, and `third-party-icons.json`, the exclusion of the nine non-Phosphor assets, and the trademark caveat,
without introducing new license/provenance conclusions. Verified via `git status --short` that only this file is new,
and via `git diff` that `third-party-icons.json`, `THIRD_PARTY.md`, `src/`, `icon-inventory.json`, `README.md`,
`AGENTS.md`, and `package.json` are all byte-unchanged. Nothing was staged or committed. Cycle 4 (optional
`test:licenses`/`licenses:check` correctness checks) was not run.

## Scope Classification

**Recommended structure:** direct **red-green-refactor cycles**.

## Editable Scope

Create only:

```text
packages/astro-icons/LICENSES/README.md
```

Read-only / protected:

```text
packages/astro-icons/LICENSE
packages/astro-icons/LICENSES/PHOSPHOR.txt
packages/astro-icons/LICENSES/THIRD_PARTY.md
packages/astro-icons/LICENSES/third-party-icons.json
packages/astro-icons/README.md
packages/astro-icons/AGENTS.md
packages/astro-icons/package.json
packages/astro-icons/src/**
packages/astro-icons/migration/icon-inventory.json
```

---

## Cycle 1 --- Define the Documentation Contract

### Goal

Lock the exact purpose and boundaries of `LICENSES/README.md` before writing it.

### Scope

The new file must explain the role of files in `LICENSES/` and adjacent package license files, without making new
provenance or legal conclusions.

### Red

```gherkin
Feature: License directory documentation

Scenario: LICENSES/README documents file roles without changing evidence
  Given the package has separate code and asset licensing records
  When LICENSES/README.md is added
  Then it explains that ../LICENSE covers package code only
  And it explains that PHOSPHOR.txt contains the Phosphor MIT license text
  And it explains that THIRD_PARTY.md is generated from third-party-icons.json
  And it states that non-Phosphor custom assets are currently excluded
  And it separates trademark ownership from copyright licensing
```

### Green

Draft the file around these sections:

```markdown
# License and attribution files

## Purpose

## Files

## Excluded non-Phosphor assets

## Trademark notice

## Maintenance workflow
```

### Refactor

Keep the document explanatory and operational. Avoid duplicating the full `THIRD_PARTY.md` content or license texts.

### Acceptance Criteria

- The intended sections are present.
- The file names `../LICENSE`, `PHOSPHOR.txt`, `THIRD_PARTY.md`, and `third-party-icons.json` are mentioned.
- The document does not claim that all package contents are BSD-2-Clause.
- The document does not introduce new license, source, or trademark conclusions.

### Non-Goals

- Do not edit the frozen manifest.
- Do not regenerate `THIRD_PARTY.md`.
- Do not add per-asset license files.
- Do not update package README, AGENTS, or package metadata.

### Suggested Execution Order

Run first.

---

## Cycle 2 --- Write `LICENSES/README.md`

### Goal

Create the documentation file with conservative, audit-friendly wording.

### Scope

Create:

```text
packages/astro-icons/LICENSES/README.md
```

### Red

```gherkin
Feature: License directory README content

Scenario: README explains license boundaries
  Given LICENSES/README.md exists
  When a maintainer reads it
  Then they can distinguish package-code licensing from bundled asset attribution
  And they can identify which notice files are generated or canonical
  And they are warned that trademark rights remain separate
```

### Green

Write concise content with these meanings:

- `../LICENSE` covers package code only.
- `PHOSPHOR.txt` contains the MIT license text for the Phosphor icon corpus.
- `THIRD_PARTY.md` is generated from `third-party-icons.json`.
- The nine non-Phosphor custom assets are currently excluded from packaging.
- Notices do not imply endorsement, sponsorship, or trademark permission.
- Trademark names and logos remain property of their owners.
- Future changes should update the manifest first, then regenerate notices.

Suggested wording for the key boundary:

```markdown
The package code and the icon assets are tracked separately. The package code is licensed through `../LICENSE`;
third-party icon assets and related attribution are documented through the files in this directory.
```

### Refactor

Remove risky wording, especially:

```text
everything is BSD-2-Clause
all icons are licensed under BSD-2-Clause
all listed assets are cleared for redistribution
risk-accepted
probably
assumed
```

### Acceptance Criteria

- `LICENSES/README.md` exists.
- It explains package-code vs asset licensing.
- It states non-Phosphor assets are excluded.
- It includes trademark caveats.
- It avoids “risk-accepted” language because there are no risk-accepted assets.
- It does not duplicate full license texts or generated notice content.

### Non-Goals

- Do not edit `README.md`.
- Do not edit `AGENTS.md`.
- Do not edit `package.json`.
- Do not add legal analysis beyond the manifest state.

### Suggested Execution Order

Run after Cycle 1.

---

## Cycle 3 --- Inspect Content and Protected Diffs

### Goal

Verify the new documentation is complete and the phase did not touch protected files.

### Scope

Run from repository root:

```powershell
Set-Location "e:\teaching\DIBS\projects\astro-website"

git status --short
git diff -- packages/astro-icons/LICENSES/third-party-icons.json
git diff -- packages/astro-icons/LICENSES/THIRD_PARTY.md
git diff -- packages/astro-icons/src
git diff -- packages/astro-icons/migration/icon-inventory.json
git diff -- packages/astro-icons/README.md
git diff -- packages/astro-icons/AGENTS.md
git diff -- packages/astro-icons/package.json
```

### Red

```gherkin
Feature: Phase 1.3.2 repository purity

Scenario: Adding LICENSES/README does not change evidence or package metadata
  Given LICENSES/README.md has been added
  When repository diffs are inspected
  Then only LICENSES/README.md is new
  And the frozen manifest has no diff
  And THIRD_PARTY.md has no diff
  And SVGs, inventory, package README, AGENTS, and package.json have no diff
```

### Green

Expected in-scope status:

```text
?? packages/astro-icons/LICENSES/README.md
```

Expected protected diffs: empty for all protected paths.

### Refactor

If any protected file changed, revert it and keep only `LICENSES/README.md`.

### Acceptance Criteria

- Only `packages/astro-icons/LICENSES/README.md` is added.
- `third-party-icons.json` is unchanged.
- `THIRD_PARTY.md` is unchanged.
- SVG assets are unchanged.
- `icon-inventory.json` is unchanged.
- package README, AGENTS, and package metadata are unchanged.

### Non-Goals

- Do not stage or commit.
- Do not archive the phase.
- Do not run later Subphase 1.3 work.

### Suggested Execution Order

Run after Cycle 2.

---

## Cycle 4 --- Optional Correctness Checks

### Goal

Confirm the generated notice remains current, even though this phase should not affect it.

### Scope

Optional commands:

```powershell
pnpm --filter @ravenhill/astro-icons test:licenses
pnpm --filter @ravenhill/astro-icons licenses:check
```

### Red

```gherkin
Feature: Optional notice Correctness check

Scenario: License directory documentation does not affect generated notice drift
  Given only LICENSES/README.md was added
  When license tests and check mode run
  Then tests pass
  And THIRD_PARTY.md remains current
```

### Green

Run the optional checks only as a Correctness step. Do not run `licenses:update`.

### Refactor

If `licenses:check` fails, treat it as pre-existing drift or a generator/input issue, not as a reason to edit
`LICENSES/README.md`.

### Acceptance Criteria

- `test:licenses` passes, if run.
- `licenses:check` passes, if run.
- No generated files change.

### Non-Goals

- Do not run `licenses:update`.
- Do not modify `THIRD_PARTY.md`.
- Do not change the frozen manifest.

### Suggested Execution Order

Run last, only if desired.

---

# Final Acceptance Matrix

| Area               | Acceptance criterion                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------- |
| New file           | `packages/astro-icons/LICENSES/README.md` exists                                            |
| Purpose            | Explains the role of the `LICENSES/` directory                                              |
| Package code       | States `../LICENSE` covers package code only                                                |
| Phosphor           | States `PHOSPHOR.txt` contains the Phosphor MIT license text                                |
| Generated notice   | States `THIRD_PARTY.md` is generated from `third-party-icons.json`                          |
| Exclusions         | States the nine non-Phosphor custom assets are currently excluded                           |
| Trademarks         | States trademarks remain property of their respective owners                                |
| No endorsement     | Does not imply sponsorship, endorsement, or clearance                                       |
| No overreach       | Does not claim all package contents are BSD-2-Clause                                        |
| No new conclusions | Does not introduce new license/provenance decisions                                         |
| Protected files    | Manifest, generated notice, SVGs, inventory, README, AGENTS, and package metadata unchanged |

# Consolidated Non-Goals

- Do not edit `packages/astro-icons/LICENSES/third-party-icons.json`.
- Do not edit `packages/astro-icons/LICENSES/THIRD_PARTY.md`.
- Do not edit `packages/astro-icons/README.md`.
- Do not edit `packages/astro-icons/AGENTS.md`.
- Do not edit `packages/astro-icons/package.json`.
- Do not edit SVG files.
- Do not edit `icon-inventory.json`.
- Do not add per-asset license texts for excluded assets.
- Do not run `licenses:update`.
- Do not stage or commit.
- Do not archive the phase.

# Main Improvements Over the Original Plan

The original plan is already well scoped. This version improves it by:

1. making the single-file scope explicit;
2. separating content drafting from repository-purity verification;
3. banning “risk-accepted” language because no assets are risk-accepted;
4. protecting package README, AGENTS, and package metadata for later phases;
5. keeping optional commands clearly optional rather than part of the completion gate.

DDT is only lightly useful for the content checklist and protected-path matrix. PBT is not useful here because this is
deterministic documentation work, not behavior over a broad input domain.
