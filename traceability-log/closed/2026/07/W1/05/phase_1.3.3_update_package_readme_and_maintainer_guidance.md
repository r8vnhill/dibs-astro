# [PLAN] Phase 1.3.3 --- Update Package README and Maintainer Guidance [DONE]

## Current Status

[DONE] `packages/astro-icons/README.md` gained an **Attribution and licensing** section linking to `LICENSE`,
`LICENSES/README.md`, `LICENSES/PHOSPHOR.txt`, and `LICENSES/THIRD_PARTY.md`, separating package-code licensing from
third-party icon attribution without implying clearance or endorsement. `packages/astro-icons/AGENTS.md` gained an "Add
or change a non-Phosphor icon's attribution" section describing the `LICENSES/third-party-icons.json` record fields, the
package-local `test:licenses`/`licenses:update`/`licenses:check` commands, and the future (not yet implemented) Subphase
1.4 pack-contract gate. Verified via `git status --short` and `git diff` that only these two files changed and all
protected paths (`third-party-icons.json`, `THIRD_PARTY.md`, `src/`, `icon-inventory.json`, `package.json`, `LICENSE`,
`PHOSPHOR.txt`, `LICENSES/README.md`) remain byte-unchanged. Nothing was staged or committed. Cycle 4 (optional
`test:licenses`/`licenses:check` sanity checks) was not run.

## Scope Classification

**Recommended structure:** direct **red-green-refactor cycles**.

## Editable Scope

Modify only:

```text id="k3rq4m"
packages/astro-icons/README.md
packages/astro-icons/AGENTS.md
```

Protected / out of scope:

```text id="ka812m"
packages/astro-icons/package.json
packages/astro-icons/LICENSE
packages/astro-icons/LICENSES/PHOSPHOR.txt
packages/astro-icons/LICENSES/README.md
packages/astro-icons/LICENSES/THIRD_PARTY.md
packages/astro-icons/LICENSES/third-party-icons.json
packages/astro-icons/src/**
packages/astro-icons/migration/icon-inventory.json
```

---

## Cycle 1 — Add README Attribution and Licensing Section

### Goal

Make package consumers understand that package code licensing and bundled icon attribution are separate.

### Scope

Edit only:

```text id="0ro5qm"
packages/astro-icons/README.md
```

Add an **Attribution and licensing** section near the package overview, usage, or validation/publishing area.

### Red

```gherkin id="mz2f59"
Feature: README attribution boundaries

Scenario: README separates package-code licensing from asset attribution
  Given @ravenhill/astro-icons contains package code and third-party icon assets
  When the README attribution section is added
  Then it links to LICENSE for package code licensing
  And it links to LICENSES/README.md for the license directory overview
  And it links to LICENSES/PHOSPHOR.txt for the Phosphor license text
  And it links to LICENSES/THIRD_PARTY.md for generated third-party attribution
  And it does not claim every package content is BSD-2-Clause
```

### Green

Add a concise section that states:

- package code is licensed under BSD-2-Clause via `LICENSE`;
- third-party icon assets are tracked separately;
- `LICENSES/README.md` explains the license/notice directory;
- `LICENSES/PHOSPHOR.txt` contains the Phosphor MIT license text;
- `LICENSES/THIRD_PARTY.md` is the generated third-party attribution notice;
- non-Phosphor custom assets are excluded unless future evidence and packaging checks allow inclusion.

Suggested wording shape:

```markdown id="8xuv46"
## Attribution and licensing

The package code is licensed under BSD-2-Clause; see [`LICENSE`](./LICENSE).

Bundled third-party icon assets are tracked separately from the package code. See
[`LICENSES/README.md`](./LICENSES/README.md) for the license-file layout,
[`LICENSES/PHOSPHOR.txt`](./LICENSES/PHOSPHOR.txt) for the Phosphor license text, and
[`LICENSES/THIRD_PARTY.md`](./LICENSES/THIRD_PARTY.md) for the generated third-party attribution notice.

Non-Phosphor custom assets are excluded from packaging unless future evidence, release decisions, and package checks
explicitly allow inclusion. Attribution records do not imply sponsorship, endorsement, or redistribution clearance.
```

### Refactor

Remove risky wording:

```text id="zgarb6"
everything in this package is BSD-2-Clause
all icons are BSD-2-Clause
all assets are cleared for redistribution
approved assets
safe to redistribute
```

### Acceptance Criteria

- README links to `LICENSE`.
- README links to `LICENSES/README.md`.
- README links to `LICENSES/PHOSPHOR.txt`.
- README links to `LICENSES/THIRD_PARTY.md`.
- README separates package code from third-party assets.
- README does not imply sponsorship, endorsement, or clearance.
- README does not mention package metadata changes from Phase 1.3.4 as already done.

### Non-Goals

- Do not edit package metadata.
- Do not edit generated notices.
- Do not rewrite unrelated README sections.
- Do not document pack checks as already implemented.

### Suggested Execution Order

Run first.

---

## Cycle 2 — Add AGENTS Attribution Maintenance Policy

### Goal

Give future maintainers an operational workflow for icon attribution changes.

### Scope

Edit only:

```text id="g2uwg7"
packages/astro-icons/AGENTS.md
```

Add an attribution maintenance section.

### Red

```gherkin id="fl2dlu"
Feature: Maintainer attribution workflow

Scenario: Maintainers know how to add or change non-Phosphor icons
  Given a future maintainer adds or changes a non-Phosphor icon
  When they read AGENTS.md
  Then they are told to update LICENSES/third-party-icons.json
  And to record exact source and asset-specific terms
  And to track copyright, trademark, redistribution, and release decision separately
  And to regenerate and check notices with package-local commands
  And not to treat unresolved records as redistributable
```

### Green

Add a section covering:

- every non-Phosphor icon addition or change needs a `LICENSES/third-party-icons.json` record;
- the record must include exact source URL, asset-specific terms, copyright conclusion, trademark status, redistribution
  conclusion, and release decision;
- software-project licenses must not be assumed to cover logos, trademarks, icons, or file-type marks;
- unresolved records require explicit traceability decisions;
- excluded/unresolved assets must not be treated as redistributable;
- run package-local license commands after manifest changes:

```powershell id="szqtmv"
pnpm --filter @ravenhill/astro-icons test:licenses
pnpm --filter @ravenhill/astro-icons licenses:update
pnpm --filter @ravenhill/astro-icons licenses:check
```

Mention future Subphase 1.4 pack checks carefully:

```text id="ybt61r"
When package pack-contract checks are added in a later phase, they must also pass before a newly included asset can ship.
```

### Refactor

Keep the section operational, not legalistic. Avoid saying maintainers can “approve” trademark use without evidence or
permission.

### Acceptance Criteria

- AGENTS separates copyright, trademark, redistribution, and release decision.
- AGENTS names the manifest path.
- AGENTS names the package-local license commands.
- AGENTS says project software licenses do not automatically cover logos or marks.
- AGENTS treats Subphase 1.4 pack checks as future work, not current behavior.
- AGENTS does not claim unresolved or excluded assets are redistributable.

### Non-Goals

- Do not edit root `AGENTS.md`.
- Do not add new scripts.
- Do not change generated notices.
- Do not change package metadata.

### Suggested Execution Order

Run after Cycle 1.

---

## Cycle 3 — Inspect Content and Protected Diffs

### Goal

Confirm the documentation updates are correct and isolated to the two intended files.

### Scope

Run from repository root:

```powershell id="coh0pk"
Set-Location "e:\teaching\DIBS\projects\astro-website"

git status --short
git diff -- packages/astro-icons/README.md
git diff -- packages/astro-icons/AGENTS.md

git diff -- packages/astro-icons/LICENSES/third-party-icons.json
git diff -- packages/astro-icons/LICENSES/THIRD_PARTY.md
git diff -- packages/astro-icons/src
git diff -- packages/astro-icons/migration/icon-inventory.json
git diff -- packages/astro-icons/package.json
git diff -- packages/astro-icons/LICENSE
git diff -- packages/astro-icons/LICENSES/PHOSPHOR.txt
git diff -- packages/astro-icons/LICENSES/README.md
```

### Red

```gherkin id="z4c8wq"
Feature: Phase 1.3.3 repository purity

Scenario: README and AGENTS documentation changes do not touch licensing evidence or metadata
  Given README and AGENTS have been updated
  When protected diffs are inspected
  Then only README.md and AGENTS.md have in-scope diffs
  And the frozen manifest has no diff
  And THIRD_PARTY.md has no diff
  And package.json has no diff
  And license text files remain unchanged
```

### Green

Expected in-scope diff:

```text id="y6fjyx"
M packages/astro-icons/README.md
M packages/astro-icons/AGENTS.md
```

Expected protected diffs: empty for all protected files.

### Refactor

If `package.json`, `THIRD_PARTY.md`, `third-party-icons.json`, or license text files changed, revert those changes. They
belong to other phases or are frozen/generated artifacts.

### Acceptance Criteria

- Only `README.md` and `AGENTS.md` are modified.
- README content checks pass.
- AGENTS content checks pass.
- Manifest is unchanged.
- Generated notice is unchanged.
- Package metadata is unchanged.
- License text files are unchanged.
- SVGs and inventory are unchanged.

### Non-Goals

- Do not run `licenses:update`.
- Do not edit package metadata.
- Do not stage or commit.
- Do not archive the phase.

### Suggested Execution Order

Run after Cycle 2.

---

## Cycle 4 — Optional License Sanity Checks

### Goal

Confirm the documentation-only edits did not disturb license tooling or notice drift.

### Scope

Optional commands:

```powershell id="ri5365"
pnpm --filter @ravenhill/astro-icons test:licenses
pnpm --filter @ravenhill/astro-icons licenses:check
```

### Red

```gherkin id="wil7yf"
Feature: Documentation-only license sanity check

Scenario: README and AGENTS changes do not affect generated attribution
  Given only README and AGENTS changed
  When license tests and check mode run
  Then the license tests pass
  And THIRD_PARTY.md remains current
```

### Green

Run the optional checks if desired.

### Refactor

If `licenses:check` fails, do not edit generated output in this phase. Treat it as drift or generator/input failure and
handle separately.

### Acceptance Criteria

- `test:licenses` passes, if run.
- `licenses:check` passes, if run.
- No generated files change.

### Non-Goals

- Do not run `licenses:update`.
- Do not modify `THIRD_PARTY.md`.
- Do not modify `third-party-icons.json`.

### Suggested Execution Order

Run last, only if desired.

---

# Final Acceptance Matrix

| Area                  | Acceptance criterion                                                                                    |
| --------------------- | ------------------------------------------------------------------------------------------------------- |
| README                | Adds an **Attribution and licensing** section                                                           |
| README links          | Links to `LICENSE`, `LICENSES/README.md`, `LICENSES/PHOSPHOR.txt`, and `LICENSES/THIRD_PARTY.md`        |
| README boundaries     | Separates package code from third-party icon assets                                                     |
| README exclusions     | States non-Phosphor custom assets are excluded unless future evidence and checks allow inclusion        |
| README caveats        | Does not imply endorsement, sponsorship, or redistribution clearance                                    |
| AGENTS                | Adds attribution maintenance guidance                                                                   |
| AGENTS manifest rule  | Requires non-Phosphor icon changes to update `LICENSES/third-party-icons.json`                          |
| AGENTS metadata rule  | Requires exact source, asset-specific terms, copyright, trademark, redistribution, and release decision |
| AGENTS license caveat | Says project source-code licenses must not be assumed to cover logos, trademarks, or file-type icons    |
| AGENTS commands       | Names `test:licenses`, `licenses:update`, and `licenses:check` package-local commands                   |
| AGENTS future gate    | Mentions pack checks only as future Subphase 1.4 behavior                                               |
| Protected files       | Manifest, generated notice, package metadata, license texts, SVGs, and inventory unchanged              |

# Consolidated Non-Goals

- Do not edit `packages/astro-icons/package.json`.
- Do not edit `packages/astro-icons/LICENSE`.
- Do not edit `packages/astro-icons/LICENSES/PHOSPHOR.txt`.
- Do not edit `packages/astro-icons/LICENSES/README.md`.
- Do not edit `packages/astro-icons/LICENSES/THIRD_PARTY.md`.
- Do not edit `packages/astro-icons/LICENSES/third-party-icons.json`.
- Do not edit SVG files.
- Do not edit `icon-inventory.json`.
- Do not run `licenses:update`.
- Do not add pack-contract checks.
- Do not claim Subphase 1.4 behavior is already implemented.
- Do not stage or commit.
- Do not archive the phase.
