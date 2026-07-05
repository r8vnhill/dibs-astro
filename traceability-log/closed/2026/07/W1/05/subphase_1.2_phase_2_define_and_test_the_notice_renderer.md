# [PLAN] Subphase 1.2, Phase 2 --- Define and Test the Notice Renderer

## Scope Classification

**Recommended structure:** direct **red-green-refactor cycles**.

**Why:** this phase creates only:

```text
packages/astro-icons/scripts/generate-third-party-notices.mjs
packages/astro-icons/scripts/test/third-party-notices.test.mjs
```

It does **not** implement:

- `parseArgs`;
- `runGenerate`;
- `main`;
- `--write`;
- `--check`;
- filesystem reads/writes;
- generated `LICENSES/THIRD_PARTY.md`;
- `package.json` scripts.

## Reference Anchors

Use these as implementation/style references:

```text
packages/astro-icons/scripts/audit-icons.mjs
packages/astro-icons/scripts/lib/license-metadata.mjs
packages/astro-icons/scripts/test/license-metadata.test.mjs
traceability-log/open/subphase_1.2_define_the_machine_readable_attribution_contract.md
```

---

# Cycle 1 — Establish Pure Renderer Exports and Manifest Shape

## Goal

Create the renderer file with pure exported functions and a deterministic asset-extraction strategy.

## Scope

Create:

```text
packages/astro-icons/scripts/generate-third-party-notices.mjs
```

Export:

```js
renderThirdPartyNotice;
renderPhosphorSection;
renderAssetSection;
renderTrademarkNotice;
```

Add private helpers as needed, for example:

```js
const getRenderableAssets = (manifest) =>
    Object.values(manifest).filter((entry) =>
        entry
        && typeof entry === "object"
        && typeof entry.file === "string"
    );
```

Use this unless the checked-in manifest truly has `manifest.assets`. Do not hardcode the nine real assets.

## Red

```gherkin
Feature: Notice renderer module contract

Scenario: Renderer functions are pure exports
  Given the third-party notices module
  When the module is imported
  Then renderThirdPartyNotice is exported
  And renderPhosphorSection is exported
  And renderAssetSection is exported
  And renderTrademarkNotice is exported
  And importing the module does not read or write files
```

## Green

Add the module with minimal pure implementations. The first implementation may return simple deterministic Markdown
strings, enough for tests to drive the final structure.

## Refactor

Keep CLI placeholders out of the file for now. Do not add `parseArgs`, `runGenerate`, or `main` until Phase 3.

## Acceptance Criteria

- The module imports under `node:test`.
- No `fs`, `node:fs`, `path`, `node:path`, or process-exit logic is used.
- Renderer functions are pure.
- Asset extraction does not assume the real nine assets.

## Non-Goals

- Do not implement CLI behavior.
- Do not write `THIRD_PARTY.md`.
- Do not import the real manifest in tests.
- Do not edit `license-metadata.mjs`.

## Suggested Execution Order

Run first.

---

# Cycle 2 — Render the Overall Notice Structure

## Goal

Render a complete deterministic notice with one Phosphor section followed by one section per asset.

## Scope

Implement:

```js
renderThirdPartyNotice(manifest);
```

Behavior:

- fixed top-level title;
- Phosphor section first;
- asset sections sorted by `asset.file`;
- deterministic section order;
- exactly one trailing newline;
- no timestamps.

## Red

```gherkin
Feature: Third-party notice structure

Scenario: Notice contains Phosphor and all asset sections
  Given a manifest with a Phosphor block
  And assets scadrial.svg and roshar.svg
  When the third-party notice is rendered
  Then the Phosphor section appears first
  And the Roshar asset section appears
  And the Scadrial asset section appears
  And asset sections are ordered by file name
```

Use Sanderson-themed synthetic fixtures, for example:

```text
roshar.svg
scadrial.svg
nalthis.svg
```

## Green

Render the notice from fixture objects only. Use the same input twice to ensure the output is stable.

## Refactor

Centralize newline handling:

```js
const withSingleTrailingNewline = (value) => `${value.replace(/\n+$/u, "")}\n`;
```

## Acceptance Criteria

- Phosphor renders first.
- Every renderable asset renders exactly once.
- Assets are sorted by `file`.
- Repeated rendering is byte-identical.
- Output ends with exactly one newline.
- No timestamp-like substring appears.

## Non-Goals

- Do not include generated-date metadata.
- Do not render full third-party license text.
- Do not perform validation in this phase.

## Suggested Execution Order

Run after Cycle 1.

---

# Cycle 3 — Render the Phosphor Section Honestly

## Goal

Render Phosphor attribution without overstating source lineage.

## Scope

Implement:

```js
renderPhosphorSection(phosphor);
```

Use manifest fields:

```text
phosphor.project
phosphor.copyright.concludedLicense
phosphor.copyright.copyrightNotice
phosphor.source.evidenceStatus
```

Also include a static textual pointer to:

```text
LICENSES/PHOSPHOR.txt
```

Do not check whether that file exists; Subphase 1.3 owns it.

## Red

```gherkin
Feature: Phosphor notice rendering

Scenario: Unresolved Phosphor lineage remains explicit
  Given a Phosphor record with source.evidenceStatus unresolved
  When the Phosphor section is rendered
  Then the section states that source evidence is unresolved
  And it includes the concluded license
  And it includes the copyright notice
  And it does not claim an exact verified upstream commit
```

## Green

Render conservative wording such as:

```text
Source evidence status: unresolved.
```

Avoid wording like:

```text
Verified upstream source
Exact upstream commit
Clean lineage
```

## Refactor

Keep the section compact and mechanical. This is a generated notice, not the full traceability narrative.

## Acceptance Criteria

- Project name renders.
- Concluded license renders.
- Copyright notice renders.
- `source.evidenceStatus` renders.
- `LICENSES/PHOSPHOR.txt` is referenced textually.
- No exact upstream commit is implied.

## Non-Goals

- Do not create `PHOSPHOR.txt`.
- Do not embed the MIT license text.
- Do not change the Phosphor manifest record.

## Suggested Execution Order

Run after Cycle 2 or in parallel with Cycle 4.

---

# Cycle 4 — Render Non-Phosphor Asset Sections Conservatively

## Goal

Render each asset’s manifest decision without implying permission, endorsement, or verified redistributability.

## Scope

Implement:

```js
renderAssetSection(asset);
```

Use fields:

```text
asset.displayName
asset.assetType
asset.rights.copyright.concludedLicense
asset.rights.copyright.basis
asset.rights.trademark
asset.redistribution.conclusion
asset.releaseDecision.action
asset.file
```

## Red

```gherkin
Feature: Non-Phosphor notice rendering

Scenario: Excluded permission-required asset is not represented as permitted
  Given an asset named Roshar logo
  And releaseDecision.action is exclude
  And redistribution.conclusion is permission-required
  When the asset section is rendered
  Then the section states the recorded decision is exclude
  And it states redistribution is permission-required
  And it does not say permission was granted
  And it does not use approval-style wording
```

## Green

Render using conservative labels:

```text
Recorded release decision: exclude.
Redistribution conclusion: permission-required.
```

Avoid:

```text
Approved
Cleared
Permitted
Safe to use
```

unless those exact values are present in the manifest.

## Refactor

Prefer a field-label format over prose-heavy paragraphs. This keeps the generated file stable and easy to diff.

Example target style:

```markdown
## Roshar logo

- File: `roshar.svg`
- Asset type: logo
- Copyright conclusion: NOASSERTION
- Redistribution conclusion: permission-required
- Recorded release decision: exclude
```

## Acceptance Criteria

- `displayName` appears in the heading.
- `file` appears in the section.
- `assetType` appears.
- copyright conclusion appears.
- copyright basis appears only when non-empty.
- redistribution conclusion appears.
- release decision appears as a recorded manifest decision.
- no permission is implied for `exclude` assets.

## Non-Goals

- Do not render source URLs unless the checked-in doc explicitly requires them.
- Do not add legal analysis beyond manifest fields.
- Do not alter manifest values.

## Suggested Execution Order

Run after Cycle 2.

---

# Cycle 5 — Render Trademark Notices Only When Applicable

## Goal

Render trademark information only for assets whose manifest says trademark applies.

## Scope

Implement:

```js
renderTrademarkNotice(trademark);
```

Suggested behavior:

- return `null` or `""` when `trademark.applies === "unknown"`;
- render owner, policy URL, and notes when `trademark.applies !== "unknown"`;
- in practice, tests should cover `"yes"` and `"unknown"`.

## Red

```gherkin
Feature: Trademark notice rendering

Scenario: Trademark notice appears when trademark applies
  Given a trademark record with applies yes
  And owner set to Knights Radiant
  And policyUrl set to https://example.invalid/radiant-policy
  When the trademark notice is rendered
  Then the output includes Knights Radiant
  And it includes the policy URL

Scenario: Trademark notice is omitted when trademark status is unknown
  Given a trademark record with applies unknown
  When the trademark notice is rendered
  Then no trademark notice is rendered
```

## Green

Implement minimal rendering:

```text
Trademark: <owner>. Policy: <policyUrl>. Notes: <notes>.
```

Only include fields that are present.

## Refactor

Make `renderAssetSection` call `renderTrademarkNotice` and skip empty output. Keep the gating rule in one place.

## Acceptance Criteria

- `"yes"` renders trademark information.
- `"unknown"` renders nothing.
- Missing optional trademark fields do not produce `undefined`.
- Asset sections include trademark blocks only when applicable.

## Non-Goals

- Do not infer trademark status.
- Do not render trademark blocks for unknown records.
- Do not validate policy URLs.

## Suggested Execution Order

Run after Cycle 4.

---

# Cycle 6 — Verify Renderer Invariants and Diff Scope

## Goal

Confirm the renderer is deterministic, pure, and isolated to the two intended files.

## Scope

Run the new test file only:

```bash
node --test scripts/test/third-party-notices.test.mjs
```

from:

```text
packages/astro-icons
```

## Red

```gherkin
Feature: Renderer phase closure

Scenario: Pure notice renderer is complete
  Given the notice renderer and tests are implemented
  When the renderer test file runs
  Then all tests pass
  And only the renderer file and its test file are changed
  And the frozen manifest remains untouched
```

## Green

Run:

```bash
cd /e/teaching/DIBS/projects/astro-website/packages/astro-icons
node --test scripts/test/third-party-notices.test.mjs
```

Then inspect from the repository root:

```powershell
Set-Location "e:\teaching\DIBS\projects\astro-website"

git status --short
git diff -- packages/astro-icons/LICENSES/third-party-icons.json
git diff -- packages/astro-icons/migration/icon-inventory.json
git diff -- packages/astro-icons/scripts/lib/license-metadata.mjs
git diff -- packages/astro-icons/package.json
```

Expected changed files:

```text
A packages/astro-icons/scripts/generate-third-party-notices.mjs
A packages/astro-icons/scripts/test/third-party-notices.test.mjs
```

Expected empty diffs:

```text
packages/astro-icons/LICENSES/third-party-icons.json
packages/astro-icons/migration/icon-inventory.json
packages/astro-icons/scripts/lib/license-metadata.mjs
packages/astro-icons/package.json
```

## Refactor

If tests fail, fix only the renderer or renderer tests. Do not pull Phase 3 CLI work into this phase.

## Acceptance Criteria

- All renderer tests pass.
- The renderer has no filesystem access.
- No CLI functions are implemented.
- Output is deterministic.
- Output has exactly one trailing newline.
- Output contains no timestamp-shaped substring.
- Tests use Sanderson-themed synthetic fixtures only.
- Only the two new files are changed.

## Non-Goals

- Do not add `test:licenses`.
- Do not add `licenses:check`.
- Do not add `licenses:update`.
- Do not generate `THIRD_PARTY.md`.
- Do not edit `third-party-icons.json`.
- Do not edit `license-metadata.mjs`.

## Suggested Execution Order

Run last.

---

# Test Coverage Matrix

| Area                   | Test expectation                                                               |
| ---------------------- | ------------------------------------------------------------------------------ |
| Module exports         | All four render functions are importable                                       |
| Notice structure       | One Phosphor section plus one section per asset                                |
| Asset ordering         | Sections sorted by `asset.file`                                                |
| Phosphor honesty       | `unresolved` lineage is stated; no verified commit claim                       |
| Excluded asset wording | `exclude` is rendered as recorded decision, not permission                     |
| Trademark gating       | Trademark appears for `applies: "yes"` and is omitted for `applies: "unknown"` |
| Determinism            | Same input renders byte-identical output                                       |
| Newline invariant      | Exactly one trailing newline                                                   |
| Timestamp invariant    | No timestamp-shaped substring                                                  |
| Fixture policy         | Sanderson-themed fixtures only; no real manifest oracle                        |

---

# Final Acceptance Matrix

| Area              | Acceptance criterion                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------ |
| New renderer      | `scripts/generate-third-party-notices.mjs` exists                                                            |
| New tests         | `scripts/test/third-party-notices.test.mjs` exists                                                           |
| Pure functions    | Renderer functions have no filesystem access                                                                 |
| No CLI            | No `parseArgs`, `runGenerate`, or `main` yet                                                                 |
| Phosphor section  | Renders project, license, copyright, evidence status, and `PHOSPHOR.txt` pointer                             |
| Asset sections    | Render display name, file, asset type, copyright conclusion, redistribution conclusion, and release decision |
| Trademark section | Rendered only when `rights.trademark.applies !== "unknown"`                                                  |
| Determinism       | Repeated render from same manifest is byte-identical                                                         |
| Formatting        | Exactly one trailing newline; no timestamps                                                                  |
| Fixture policy    | Sanderson-themed synthetic fixtures                                                                          |
| Frozen inputs     | `third-party-icons.json`, `icon-inventory.json`, and `license-metadata.mjs` unchanged                        |
| Diff scope        | Only the two new renderer files change                                                                       |

---

# Consolidated Non-Goals

- Do not implement CLI argument parsing.
- Do not implement `--write`.
- Do not implement `--check`.
- Do not read or write files.
- Do not generate `LICENSES/THIRD_PARTY.md`.
- Do not create `LICENSES/PHOSPHOR.txt`.
- Do not embed full license texts.
- Do not add dependencies.
- Do not edit `third-party-icons.json`.
- Do not edit `license-metadata.mjs`.
- Do not add package scripts.
- Do not use real nine-asset manifest data as the test oracle.

# Main Improvements Over the Original Plan

The original plan is well scoped. This version improves it by:

1. explicitly handling the real manifest shape instead of assuming `manifest.assets`;
2. keeping Phase 3 CLI concerns entirely out of the renderer file for now;
3. making conservative wording testable, especially for `exclude` and `permission-required`;
4. centralizing newline handling as a renderer invariant;
5. keeping fixtures aligned with this session’s Sanderson-themed fake-data convention.

DDT is useful for the fixture matrix around trademark applicability, release decisions, and deterministic formatting.
PBT is not warranted here because the renderer contract is fixed and the main risk is deterministic formatting drift,
not unexplored input-space behavior.
