# [PLAN] Subphase 1.3 --- Add License Texts and Package Documentation

## Scope Classification

**Recommended structure:** medium-scope **phases**.

**Why not milestones:** this is one cohesive documentation/metadata subphase, not a multi-delivery roadmap.

**Why not only cycles:** the work touches multiple artifact categories: legal text files, README/AGENTS guidance,
package metadata, and verification. Phases make those boundaries clearer.

## Authoritative Decisions

Use these as fixed inputs:

| Decision                      | Value                                                    |
| ----------------------------- | -------------------------------------------------------- |
| Package code copyright holder | `Ignacio Slater-Muñoz`                                   |
| Package code license          | `BSD-2-Clause`                                           |
| Phosphor license conclusion   | `MIT`                                                    |
| Phosphor copyright notice     | `Copyright (c) 2020-2024 Phosphor Icons`                 |
| Phosphor lineage              | unresolved; do not reopen                                |
| Non-Phosphor assets           | all nine are `exclude`; no extra per-asset license texts |
| Generated notice              | `LICENSES/THIRD_PARTY.md` remains unchanged              |

The npm package `license` field should use an SPDX identifier for common licenses, and `BSD-2-Clause` is the SPDX short
identifier for the BSD 2-Clause “Simplified” License. ([npm Docs][1]) The npm `files` field is an allowlist of package
entries to include when the package is installed, so adding `LICENSES` there is the right packaging-level change for
bundled attribution files. ([npm Docs][1])

---

# Phase 1.3.1 --- Add Canonical License Text Files [DONE]

## Current Status

[DONE] See `subphase_1.3_phase_1.3.1_add_canonical_license_text_files.md` for the executed cycle detail. Both
`packages/astro-icons/LICENSE` and `packages/astro-icons/LICENSES/PHOSPHOR.txt` were created; `third-party-icons.json`
and `THIRD_PARTY.md` remain unchanged. Phases 2-5 (LICENSES/README.md, package README/AGENTS updates, package.json
metadata, and final verification) remain open.

## Goal

Add the package-code license and the Phosphor third-party license text without changing provenance evidence.

## Scope

Create:

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

## Cycle 1.1 --- Add Package Code License

### Red

```gherkin
Feature: Package code license file

Scenario: Package code license uses the confirmed holder and BSD-2-Clause text
  Given the package code copyright holder is Ignacio Slater-Muñoz
  When packages/astro-icons/LICENSE is added
  Then it uses the BSD-2-Clause license body
  And it does not derive the holder from npm scope, Git history, or username
```

### Green

Create:

```text
packages/astro-icons/LICENSE
```

Use the existing monorepo BSD-2-Clause template as the style source, with:

```text
Copyright (c) 2026 Ignacio Slater-Muñoz
```

Use the standard BSD-2-Clause body. The SPDX BSD-2-Clause text requires retaining the copyright notice, conditions, and
disclaimer in source and binary redistributions. ([SPDX][2])

### Refactor

Compare against the existing monorepo license files for formatting consistency only. Do not edit those existing license
files.

### Acceptance Criteria

- `packages/astro-icons/LICENSE` exists.
- Holder is exactly `Ignacio Slater-Muñoz`.
- License body is BSD-2-Clause.
- No source-code headers are added.

### Non-Goals

- Do not edit existing monorepo license files.
- Do not add source-code license headers.
- Do not change package exports or runtime files.

### Suggested Execution Order

Run first.

---

## Cycle 1.2 --- Add Phosphor MIT License Text

### Red

```gherkin
Feature: Phosphor license notice

Scenario: Phosphor third-party license text uses the recorded MIT conclusion
  Given the evidence manifest records Phosphor as MIT
  And the recorded notice is Copyright (c) 2020-2024 Phosphor Icons
  When LICENSES/PHOSPHOR.txt is added
  Then it contains the MIT license text
  And it uses the recorded copyright notice
  And it does not claim a resolved upstream commit or version
```

### Green

Create:

```text
packages/astro-icons/LICENSES/PHOSPHOR.txt
```

Use:

```text
MIT License

Copyright (c) 2020-2024 Phosphor Icons
```

followed by the standard MIT license body. The SPDX MIT entry identifies `MIT` as the short identifier and includes the
standard permission and notice-retention text. ([SPDX][3])

### Refactor

Keep `PHOSPHOR.txt` as a license text file, not a provenance report. The unresolved lineage explanation belongs in
`THIRD_PARTY.md` and the traceability log.

### Acceptance Criteria

- `PHOSPHOR.txt` exists.
- It uses the recorded Phosphor copyright notice.
- It uses MIT license text.
- It does not mention a guessed package version, tag, or commit.
- It does not modify `THIRD_PARTY.md`.

### Non-Goals

- Do not resolve Phosphor lineage.
- Do not edit `third-party-icons.json`.
- Do not regenerate `THIRD_PARTY.md`.

### Suggested Execution Order

Run after Cycle 1.1.

---

# Phase 1.3.2 --- Add License Directory Documentation [DONE]

## Current Status

[DONE] See `phase_1.3.2_add_license_directory_documentation.md` for the executed cycle detail.
`packages/astro-icons/LICENSES/README.md` was created; `third-party-icons.json`, `THIRD_PARTY.md`, package README,
AGENTS, package.json, SVGs, and `icon-inventory.json` remain unchanged. Phases 3-5 (README/AGENTS updates, package.json
metadata, and final verification) remain open.

## Goal

Explain how package-code license, third-party asset notices, and trademark caveats relate to each other.

## Scope

Create:

```text
packages/astro-icons/LICENSES/README.md
```

## Cycle 2.1 --- Document License File Roles

### Red

```gherkin
Feature: LICENSES directory documentation

Scenario: License documentation separates code, icons, and trademarks
  Given the package contains package code and bundled icon assets
  When LICENSES/README.md is added
  Then it explains that LICENSE covers package code
  And PHOSPHOR.txt covers the Phosphor corpus notice
  And THIRD_PARTY.md is the generated attribution notice
  And trademarks remain owned by their respective owners
```

### Green

Add a concise `LICENSES/README.md` with sections:

```text
Purpose
Files
Excluded non-Phosphor assets
Trademark notice
Maintenance workflow
```

State:

- `../LICENSE` covers package code.
- `PHOSPHOR.txt` contains the Phosphor MIT license text.
- `THIRD_PARTY.md` is generated from `third-party-icons.json`.
- The nine non-Phosphor assets are currently excluded from packaging.
- Trademark names and logos remain property of their respective owners.
- Inclusion does not imply endorsement or sponsorship.

### Refactor

Remove any wording that says or implies “everything in this package is BSD-2-Clause.” The package code is BSD-2-Clause;
third-party assets are separately tracked.

### Acceptance Criteria

- `LICENSES/README.md` exists.
- It explains each license/notice file.
- It states non-Phosphor assets are excluded.
- It separates copyright from trademark.
- It does not introduce new legal conclusions.

### Non-Goals

- Do not add per-asset license files for excluded assets.
- Do not duplicate the full contents of `THIRD_PARTY.md`.
- Do not add a generic “risk-accepted” explanation unless risk-accepted assets actually exist.

### Suggested Execution Order

Run after Phase 1.

---

# Phase 1.3.3 --- Update Package README and Maintainer Guidance

## Goal

Make package users and maintainers aware of attribution, licensing boundaries, and future icon-addition workflow.

## Scope

Edit:

```text
packages/astro-icons/README.md
packages/astro-icons/AGENTS.md
```

## Cycle 3.1 --- Add README Attribution Section

### Red

```gherkin
Feature: Package README attribution section

Scenario: README distinguishes package code from bundled assets
  Given package code and third-party icon assets have separate licensing records
  When the README is updated
  Then it links to the package LICENSE
  And it links to LICENSES/PHOSPHOR.txt
  And it links to LICENSES/THIRD_PARTY.md
  And it avoids a blanket package-wide BSD-2-Clause claim
```

### Green

Add an **Attribution and licensing** section to `packages/astro-icons/README.md`.

Include:

- package code is licensed under BSD-2-Clause;
- bundled third-party icon assets have separate attribution records;
- Phosphor notice is in `LICENSES/PHOSPHOR.txt`;
- generated attribution notice is in `LICENSES/THIRD_PARTY.md`;
- non-Phosphor assets are excluded unless future evidence and pack checks say otherwise.

### Refactor

Keep the README section user-facing and concise. Link to detailed files instead of duplicating them.

### Acceptance Criteria

- README links to `LICENSE`.
- README links to `LICENSES/PHOSPHOR.txt`.
- README links to `LICENSES/THIRD_PARTY.md`.
- README avoids “all package contents are BSD-2-Clause” wording.
- README does not claim sponsor/endorsement.

### Non-Goals

- Do not rewrite unrelated README sections.
- Do not document Subphase 1.4 pack-contract details before they exist.
- Do not add changelog entries.

### Suggested Execution Order

Run after Phase 2.

---

## Cycle 3.2 --- Add AGENTS Maintenance Policy

### Red

```gherkin
Feature: Icon attribution maintenance policy

Scenario: Maintainers have a workflow for future icon additions
  Given a maintainer adds or changes a non-Phosphor icon
  When they read AGENTS.md
  Then they are told to add or update metadata
  And to record exact source and asset-specific terms
  And not to assume project software licenses cover logos
  And to regenerate notices and run attribution checks
```

### Green

Add a maintenance-policy section to:

```text
packages/astro-icons/AGENTS.md
```

Include rules:

- every non-Phosphor icon needs a manifest record;
- exact source URL and asset-specific terms must be recorded;
- project source-code license must not be assumed to cover logos or marks;
- trademark status must be recorded separately;
- run `licenses:update` after manifest changes;
- run `test:licenses` and `licenses:check`;
- unresolved records require explicit traceability decisions;
- pack checks must pass once Subphase 1.4 adds them.

### Refactor

Keep it operational. Avoid legal-advice phrasing; frame it as repository compliance workflow.

### Acceptance Criteria

- AGENTS.md includes future attribution workflow.
- It separates copyright, trademark, redistribution, and release decision.
- It names the relevant package-local license scripts.
- It does not claim unresolved assets are redistributable.

### Non-Goals

- Do not edit root `AGENTS.md`.
- Do not add scripts that do not yet exist.
- Do not modify generated notices from AGENTS changes.

### Suggested Execution Order

Run after README update.

---

# Phase 4 --- Update Package Publication Metadata

## Goal

Ensure npm package metadata declares the package-code license and includes attribution files in the package allowlist.

## Scope

Edit:

```text
packages/astro-icons/package.json
```

## Cycle 4.1 --- Add License Field and Files Entries

### Red

```gherkin
Feature: Package publication metadata

Scenario: Package metadata publishes license and attribution files
  Given package code is BSD-2-Clause
  And attribution files live under LICENSES
  When package.json is updated
  Then license is BSD-2-Clause
  And files includes LICENSE
  And files includes LICENSES
  And existing dist and README entries remain
```

### Green

Add:

```json
"license": "BSD-2-Clause"
```

Update `files` to include:

```json
[
    "dist",
    "README.md",
    "LICENSE",
    "LICENSES"
]
```

Use the repository’s existing JSON formatting/order.

### Refactor

Confirm no package scripts, dependencies, exports, or version fields changed. npm recommends using SPDX license
identifiers for common licenses, and `files` controls what is included when the package is installed. ([npm Docs][1])

### Acceptance Criteria

- `package.json.license === "BSD-2-Clause"`.
- `files` includes `LICENSE`.
- `files` includes `LICENSES`.
- Existing `dist` and `README.md` entries remain.
- No dependencies, scripts, exports, or version changes occur.

### Non-Goals

- Do not add pack-contract assertions yet.
- Do not publish or pack the package.
- Do not change workspace-level scripts.

### Suggested Execution Order

Run after Phases 1–3.

---

# Phase 5 --- Verify Attribution Files and Repository Purity

## Goal

Confirm license files, generated notices, package metadata, and documentation are consistent without changing frozen
evidence.

## Scope

Run from repository root:

```powershell
Set-Location "e:\teaching\DIBS\projects\astro-website"
```

## Cycle 5.1 --- Run License and Lint Checks

### Red

```gherkin
Feature: License documentation verification

Scenario: License documentation is consistent with the frozen manifest
  Given package license files and documentation have been added
  When package license checks run
  Then THIRD_PARTY.md remains current
  And license tests pass
  And the frozen manifest remains unchanged
```

### Green

Run:

```powershell
pnpm --filter @ravenhill/astro-icons test:licenses
pnpm --filter @ravenhill/astro-icons licenses:check
pnpm --filter @ravenhill/astro-icons lint
```

### Refactor

If `licenses:check` changes or reports drift, do not edit `THIRD_PARTY.md` manually. Investigate whether package docs
accidentally changed generator inputs.

### Acceptance Criteria

- `test:licenses` passes.
- `licenses:check` passes.
- `lint` passes, or any pre-existing unrelated lint failure is documented.
- `THIRD_PARTY.md` remains unchanged.

### Non-Goals

- Do not run `licenses:update` unless drift is explicitly explained and approved.
- Do not edit the frozen manifest.
- Do not add pack assertions.

### Suggested Execution Order

Run after all edits.

---

## Cycle 5.2 --- Inspect Required Files and Protected Diffs

### Red

```gherkin
Feature: Repository purity for license documentation

Scenario: Subphase 1.3 changes only license text, docs, and package metadata
  Given Subphase 1.3 is complete
  When repository diffs are inspected
  Then frozen evidence files remain unchanged
  And source assets remain unchanged
  And the expected license documentation files exist
```

### Green

Run:

```powershell
git status --short

git diff -- packages/astro-icons/LICENSES/third-party-icons.json
git diff -- packages/astro-icons/LICENSES/THIRD_PARTY.md
git diff -- packages/astro-icons/src
git diff -- packages/astro-icons/migration/icon-inventory.json
git diff -- packages/astro-icons/package.json
```

Expected in-scope changed files:

```text
A packages/astro-icons/LICENSE
A packages/astro-icons/LICENSES/PHOSPHOR.txt
A packages/astro-icons/LICENSES/README.md
M packages/astro-icons/README.md
M packages/astro-icons/AGENTS.md
M packages/astro-icons/package.json
```

Expected protected empty diffs:

```text
packages/astro-icons/LICENSES/third-party-icons.json
packages/astro-icons/LICENSES/THIRD_PARTY.md
packages/astro-icons/src
packages/astro-icons/migration/icon-inventory.json
```

### Refactor

If `THIRD_PARTY.md` changed, revert it unless there is a separately approved generator/manifests change. If
`third-party-icons.json` changed, revert it; this subphase consumes it as frozen input.

### Acceptance Criteria

- `LICENSE` exists.
- `LICENSES/PHOSPHOR.txt` exists.
- `LICENSES/README.md` exists.
- README and AGENTS updates are present.
- `package.json` contains only intended metadata/file-allowlist changes.
- Frozen evidence and generated notice are unchanged.
- No SVG, inventory, changelog, version, or source-layout changes occur.

### Non-Goals

- Do not stage or commit.
- Do not archive the subphase.
- Do not update changelog/version.
- Do not publish or pack.

### Suggested Execution Order

Run last.

---

# Final Acceptance Matrix

| Area                         | Acceptance criterion                                                                                   |
| ---------------------------- | ------------------------------------------------------------------------------------------------------ |
| Package code license         | `packages/astro-icons/LICENSE` exists with BSD-2-Clause text and holder `Ignacio Slater-Muñoz`         |
| Phosphor license             | `LICENSES/PHOSPHOR.txt` exists with MIT text and `Copyright (c) 2020-2024 Phosphor Icons`              |
| Additional third-party texts | No extra non-Phosphor license files are added because all nine assets are excluded                     |
| License directory docs       | `LICENSES/README.md` explains LICENSE, PHOSPHOR.txt, THIRD_PARTY.md, exclusions, and trademark caveats |
| README                       | Adds attribution/licensing section separating package code from assets                                 |
| AGENTS                       | Adds future icon attribution workflow                                                                  |
| Package metadata             | `license` is `BSD-2-Clause`; `files` includes `LICENSE` and `LICENSES`                                 |
| Generated notice             | `THIRD_PARTY.md` unchanged and `licenses:check` passes                                                 |
| Frozen manifest              | `third-party-icons.json` unchanged                                                                     |
| Assets                       | SVG files unchanged                                                                                    |
| Inventory                    | `icon-inventory.json` unchanged                                                                        |
| Tests/checks                 | `test:licenses`, `licenses:check`, and `lint` pass or unrelated pre-existing failures are reported     |
| No runtime behavior          | No package source, exports, dependencies, or version changes                                           |

# Consolidated Non-Goals

- Do not edit `LICENSES/third-party-icons.json`.
- Do not edit `LICENSES/THIRD_PARTY.md`.
- Do not add license texts for excluded non-Phosphor assets.
- Do not resolve Phosphor lineage.
- Do not create pack-contract assertions.
- Do not touch `scripts/assert-pack-files.mjs`.
- Do not edit changelog.
- Do not change package version.
- Do not add dependencies.
- Do not modify SVG/source-asset layout.
- Do not add source-code license headers to every file.
- Do not publish, pack, stage, or commit.
- Do not archive the subphase.

# Main Improvements Over the Original Plan

The original plan is strong. This version improves it by:

1. **Promoting the work to medium scope**, because it touches multiple documentation and package-metadata artifact
   types.
2. **Separating code-license text from third-party asset notices**, which prevents a blanket BSD interpretation.
3. **Explicitly avoiding non-Phosphor license files**, since all nine non-Phosphor assets are excluded.
4. **Making package publication scope explicit** through `license` and `files`.
5. **Keeping frozen evidence and generated notices protected**, so Subphase 1.3 remains documentation/metadata-only.

DDT is useful for the verification matrix across required files and protected paths. PBT is not warranted here because
the task is deterministic and file-oriented, not input-domain oriented.

[1]: https://docs.npmjs.com/cli/v10/configuring-npm/package-json/ "package.json | npm Docs"

[2]: https://spdx.org/licenses/BSD-2-Clause.html "BSD 2-Clause \"Simplified\ "License | Software Package Data Exchange
(SPDX)" [3]: https://spdx.org/licenses/MIT.html "MIT License | Software Package Data Exchange (SPDX)"
