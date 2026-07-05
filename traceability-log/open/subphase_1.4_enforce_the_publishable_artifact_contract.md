# [PLAN] Subphase 1.4 --- Enforce the Publishable Artifact Contract

## Scope Classification

**Recommended structure:** medium-scope **phases**.

---

# Phase 1.4.1 — Characterize the Existing Pack Contract [DONE]

## Current Status

[DONE] `packages/astro-icons/scripts/test/assert-pack-files.test.mjs` was created with characterization tests for
`findMissingFiles`, `findBlockedFiles`, and `checkSvgParity`, using Sanderson-themed synthetic fixtures (no `npm pack`,
no real filesystem access). The tests cover: all required runtime files present/absent (`README.md`, `package.json`,
`dist/index.js`, `dist/index.d.ts`, `dist/index.js.map`); each currently blocked pattern present/absent (`AGENTS.md`,
`src/`, `scripts/`, `tsup.config.ts`, `tsconfig.json`); and SVG parity match/mismatch/ zero-source cases.

Running `node --test packages/astro-icons/scripts/test/assert-pack-files.test.mjs` currently fails with
`SyntaxError: The requested module '../assert-pack-files.mjs' does not provide an export named 'checkSvgParity'` — this
is the expected Red state per this phase's own scope ("Modify later, but not yet" for `assert-pack-files.mjs`). The test
file pins down the intended pure-function contract; Phase 2 turns it Green by extracting `findMissingFiles`,
`findBlockedFiles`, and `checkSvgParity` (plus the new license/redistribution functions) as named exports without
changing existing required-file, blocked-pattern, or SVG-parity behavior.

## Goal

Lock current behavior before refactoring `assert-pack-files.mjs`.

## Scope

Create:

```text
packages/astro-icons/scripts/test/assert-pack-files.test.mjs
```

Modify later, but not yet:

```text
packages/astro-icons/scripts/assert-pack-files.mjs
```

## Cycle 1.1 — Characterize Existing Required and Blocked Files

### Red

```gherkin
Feature: Current pack file contract

Scenario: Existing required runtime files are preserved
  Given a package tarball file list
  When pack contents are evaluated
  Then README.md, package.json, dist/index.js, dist/index.d.ts, and dist/index.js.map are required

Scenario: Existing blocked package internals are still rejected
  Given a package tarball file list containing scripts or source files
  When pack contents are evaluated
  Then AGENTS.md, src/, scripts/, tsup.config.ts, and tsconfig.json are rejected
```

### Green

Add tests that describe the existing behavior using pure fixtures, but do not call `npm pack`.

Use Sanderson-themed fixture filenames where extra assets are needed, for example:

```text
package/dist/roshar.svg
package/dist/scadrial.svg
package/scripts/urithiru.mjs
```

### Refactor

Keep tests independent from the real package tarball. The test suite should be able to run without building or packing.

## Acceptance Criteria

- Existing required-file behavior is covered.
- Existing blocked-pattern behavior is covered.
- Existing SVG parity behavior is covered.
- Tests do not execute `npm pack`.
- Tests do not read the real filesystem.

## Non-Goals

- Do not add new license requirements yet.
- Do not refactor CLI behavior yet.
- Do not modify package scripts yet.

## Suggested Execution Order

Run first. This reduces the risk of behavior drift during refactoring.

---

# Phase 1.4.2 — Extract Pure Pack-Contract Logic [DONE]

## Current Status

[DONE] `assert-pack-files.mjs` now exposes import-safe pure helpers and a guarded CLI entry point. The extracted pack
contract preserves existing runtime-file, blocked-file, and SVG-parity behavior; requires package license and attribution
files; derives included-asset license references from the manifest; blocks `package/migration/`; reports grouped
diagnostics; and enforces `releaseDecision.action: "include"` only when `redistribution.conclusion === "permitted"`.

Verification performed:

- `pnpm --filter @ravenhill/astro-icons exec node --test scripts/test/assert-pack-files.test.mjs` — 20 tests passed
  across 7 suites.
- `cmd /c git diff --check`
- Protected diffs were empty for frozen evidence, generated notice, package metadata, README, AGENTS, source assets, and
  inventory.

Phase 1.4.3 and later remain open for CLI preservation verification, package script wiring, documentation updates, real
pack checks, and traceability closure.

## Goal

Refactor `assert-pack-files.mjs` into importable pure functions plus thin CLI behavior.

## Scope

Modify:

```text
packages/astro-icons/scripts/assert-pack-files.mjs
packages/astro-icons/scripts/test/assert-pack-files.test.mjs
```

Export pure functions:

```js
deriveRequiredLicenseFiles(manifest);
findMissingFiles(files, requiredFiles);
findBlockedFiles(files, blockedPatterns);
checkSvgParity(files, srcSvgCount);
findIncludedAssetsWithoutPermittedRedistribution(manifest);
evaluatePackContents({ files, manifest, srcSvgCount });
```

## Cycle 2.1 — Derive Required License Files

### Red

```gherkin
Feature: Required license files

Scenario: Core license files are always required
  Given an attribution manifest
  When required license files are derived
  Then package/LICENSE is required
  And package/LICENSES/README.md is required
  And package/LICENSES/PHOSPHOR.txt is required
  And package/LICENSES/THIRD_PARTY.md is required
  And package/LICENSES/third-party-icons.json is required

Scenario: Included asset license references are required
  Given an included asset references LICENSES/SHARDBLADE.txt
  When required license files are derived
  Then package/LICENSES/SHARDBLADE.txt is required
```

### Green

Implement:

```js
deriveRequiredLicenseFiles(manifest);
```

Rules:

- always require the fixed core files;
- include asset-specific `licenseFile`, `permissionFile`, and `policyFile` references only for assets with:

```js
releaseDecision.action === "include";
```

- convert manifest-relative paths into tarball paths with the `package/` prefix.

### Refactor

Keep path normalization in one helper. Avoid string concatenation scattered across the evaluator.

## Cycle 2.2 — Enforce Include Requires Permitted Redistribution

### Red

```gherkin
Feature: Included asset redistribution gate

Scenario: Included asset with permitted redistribution passes
  Given an asset has releaseDecision.action include
  And redistribution.conclusion permitted
  When pack contents are evaluated
  Then no redistribution finding is reported

Scenario Outline: Included asset without permitted redistribution fails
  Given an asset has releaseDecision.action include
  And redistribution.conclusion is <conclusion>
  When pack contents are evaluated
  Then a redistribution finding is reported

Examples:
  | conclusion          |
  | restricted          |
  | permission-required |
  | undetermined        |
```

### Green

Implement:

```js
findIncludedAssetsWithoutPermittedRedistribution(manifest);
```

Do **not** add `risk-accepted` to the frozen release-action vocabulary. Do **not** mutate the manifest. The rule is
simply:

```js
(include => redistribution.conclusion === "permitted");
```

### Refactor

Name findings clearly, for example:

```text
redistribution.notPermitted: roshar.svg is included but redistribution conclusion is undetermined
```

## Cycle 2.3 — Compose Grouped Pack Diagnostics

### Red

```gherkin
Feature: Grouped pack diagnostics

Scenario: Multiple pack contract failures are reported together
  Given a pack file list missing LICENSE
  And containing package/scripts/build.mjs
  And having an SVG count mismatch
  And a manifest with an included asset whose redistribution is undetermined
  When pack contents are evaluated
  Then missing-file findings are reported
  And blocked-file findings are reported
  And SVG parity findings are reported
  And redistribution findings are reported
```

### Green

Implement:

```js
evaluatePackContents({ files, manifest, srcSvgCount });
```

Return a grouped diagnostic shape, for example:

```js
{
  ok: false,
  findings: {
    missingFiles: [],
    blockedFiles: [],
    svgParity: [],
    redistribution: []
  }
}
```

or a flat list with stable prefixes. Prefer grouped findings if it matches the phase doc’s diagnostic goal.

### Refactor

Keep existing SVG parity semantics unchanged. The only behavior additions are legal-file requirements, `migration/`
blocking, and the include/permitted rule.

## Acceptance Criteria

- Pure functions are exported.
- Importing the module does not execute `npm pack`.
- Existing required-file, blocked-pattern, and SVG parity behavior is preserved.
- `package/LICENSE` and the required `package/LICENSES/*` files are enforced.
- Included assets require `redistribution.conclusion === "permitted"`.
- Multiple findings are reported together.
- Tests use synthetic fixtures, not the real manifest as the oracle.

## Non-Goals

- Do not change `third-party-icons.json`.
- Do not add a `risk-accepted` release action.
- Do not alter existing license-metadata tests.
- Do not remove SVG parity behavior.

## Suggested Execution Order

Run after Phase 1.

---

# Phase 3 — Preserve and Thin the CLI

## Goal

Keep `assert-pack-files.mjs` executable while making it safe to import from tests.

## Scope

Modify:

```text
packages/astro-icons/scripts/assert-pack-files.mjs
```

## Cycle 3.1 — Add Main-Module Guard

### Red

```gherkin
Feature: assert-pack-files import safety

Scenario: Importing assert-pack-files does not run npm pack
  Given a test imports assert-pack-files.mjs
  When the module is loaded
  Then npm pack is not executed
  And stdin is not read
  And process.exitCode is not changed
```

### Green

Wrap top-level execution in a guarded `main()`:

```js
export const main = async (...) => { ... };

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  await main();
}
```

Mirror the package’s existing `generate-third-party-notices.mjs` pattern.

### Refactor

Make `main()` thin:

1. obtain pack file list from existing stdin/`npm pack` behavior;
2. read `LICENSES/third-party-icons.json`;
3. compute `srcSvgCount`;
4. call `evaluatePackContents`;
5. print grouped diagnostics;
6. set `process.exitCode = 1` on failure.

## Cycle 3.2 — Read Manifest for Required File Derivation

### Red

```gherkin
Feature: Manifest-derived pack requirements

Scenario: pack:check derives required legal files from the attribution manifest
  Given the attribution manifest exists
  When assert-pack-files runs
  Then required legal files are derived from the manifest
  And LICENSES files are not hardcoded ad hoc in the CLI body
```

### Green

Add package-root-relative defaults, similar to the notice generator:

```js
DEFAULT_MANIFEST_PATH;
```

Read the manifest inside `main()`, not inside pure functions.

### Refactor

Keep filesystem access in CLI helpers only.

## Acceptance Criteria

- CLI still supports existing pack/stdin behavior.
- Importing the script has no side effects.
- CLI reads the manifest once and passes it into pure evaluation.
- Diagnostics remain readable.
- `pack:check` behavior is preserved except for the new pack-contract rules.

## Non-Goals

- Do not change package build output.
- Do not change `pack:dry-run`.
- Do not make `publint` part of legal verification.

## Suggested Execution Order

Run after pure function tests pass.

---

# Phase 4 — Wire Package Scripts and Documentation

## Goal

Make the new pack-file tests part of the package workflow and document the new enforcement rule.

## Scope

Modify:

```text
packages/astro-icons/package.json
packages/astro-icons/AGENTS.md
packages/astro-icons/README.md
```

## Cycle 4.1 — Add `test:pack-files`

### Red

```gherkin
Feature: Pack contract test script

Scenario: Pack contract unit tests are package-local
  Given assert-pack-files.test.mjs exists
  When package scripts are updated
  Then test:pack-files runs that test file
  And check runs test:pack-files before or alongside pack:check
```

### Green

Add:

```json
"test:pack-files": "node --test scripts/test/assert-pack-files.test.mjs"
```

Wire it into the existing `check` script alongside `pack:check`.

### Refactor

Do not change unrelated scripts. Keep `test:licenses`, `licenses:check`, and `licenses:update` unchanged.

## Cycle 4.2 — Update Maintainer Guidance

### Red

```gherkin
Feature: Maintainer guidance for included assets

Scenario: Maintainers know the pack contract blocks unsafe included assets
  Given a maintainer changes a non-Phosphor asset to include
  When they read AGENTS.md
  Then they learn redistribution.conclusion must be permitted
  And risk-accepted is not currently implemented
  And future exceptions require a new traceability decision
```

### Green

Update the existing attribution section in `AGENTS.md`:

- `releaseDecision.action: "include"` requires `redistribution.conclusion: "permitted"`;
- `pnpm --filter @ravenhill/astro-icons pack:check` will fail otherwise;
- no `risk-accepted` override exists yet;
- future need for risk acceptance must be handled through a new traceability entry, not an ad hoc enum value.

## Cycle 4.3 — Update README Attribution Note

### Red

```gherkin
Feature: README pack-contract note

Scenario: README explains packaged notice enforcement
  Given README has an Attribution and licensing section
  When Subphase 1.4 documentation is added
  Then it states pack:check verifies legal notice files in the published tarball
  And it does not claim pack:check is legal advice
```

### Green

Add one sentence to README:

```text
`pack:check` verifies that the published tarball includes `LICENSE`, the required `LICENSES/*` notice files, and any included asset-specific license references.
```

### Refactor

Keep the README change short. Detailed maintainer workflow belongs in `AGENTS.md`.

## Acceptance Criteria

- `test:pack-files` exists.
- `check` runs `test:pack-files` and `pack:check`.
- README and AGENTS updates are narrow.
- No license manifest records change.
- No generated notices are regenerated.

## Non-Goals

- Do not run `licenses:update`.
- Do not edit `third-party-icons.json`.
- Do not add a risk-accepted vocabulary value.
- Do not add new dependencies.

## Suggested Execution Order

Run after Phases 2–3 pass.

---

# Phase 5 — Verify Build, Pack, and Dry-Run Contents

## Goal

Prove the new pack contract works against the real package build and tarball file list.

## Scope

Run from repository root:

```powershell
Set-Location "e:\teaching\DIBS\projects\astro-website"
```

## Cycle 5.1 — Run Package Verification Commands

### Red

```gherkin
Feature: Publishable artifact verification

Scenario: Package checks enforce attribution files
  Given the pack contract has been implemented
  When package verification commands run
  Then license tests pass
  And pack-file tests pass
  And licenses:check passes
  And build passes
  And pack:check passes
```

### Green

Run:

```powershell
pnpm --filter @ravenhill/astro-icons test:licenses
pnpm --filter @ravenhill/astro-icons test:pack-files
pnpm --filter @ravenhill/astro-icons licenses:check
pnpm --filter @ravenhill/astro-icons build
pnpm --filter @ravenhill/astro-icons pack:check
pnpm --filter @ravenhill/astro-icons lint
```

Expected:

- all except `lint` pass;
- `lint` may still fail with the known pre-existing `publint` module-resolution issue;
- document the lint failure, do not fix it here.

### Refactor

If `pack:check` fails because required legal files are absent from the tarball, inspect `package.json.files` and the
pack file list. Do not weaken the assertion.

## Cycle 5.2 — Inspect Dry-Run Pack File List

### Red

```gherkin
Feature: Pack dry-run file list

Scenario: Published tarball includes notices and excludes internals
  Given the package has been built
  When pack:dry-run is inspected
  Then LICENSE is included
  And LICENSES/README.md is included
  And LICENSES/PHOSPHOR.txt is included
  And LICENSES/THIRD_PARTY.md is included
  And LICENSES/third-party-icons.json is included
  And migration, scripts, src, tsconfig.json, and tsup.config.ts are excluded
```

### Green

Run:

```powershell
pnpm --filter @ravenhill/astro-icons pack:dry-run
```

Inspect the file list for required inclusions/exclusions.

### Refactor

If dry-run disagrees with `pack:check`, fix the pure evaluator or CLI adapter, not the generated notice or manifest.

## Acceptance Criteria

- `test:licenses` passes.
- `test:pack-files` passes.
- `licenses:check` passes.
- `build` passes.
- `pack:check` passes.
- `pack:dry-run` includes `LICENSE` and required `LICENSES/*`.
- `pack:dry-run` excludes `migration/`, `scripts/`, `src/`, `tsconfig.json`, and `tsup.config.ts`.
- Known `publint` issue is documented if still present.

## Non-Goals

- Do not publish.
- Do not run `licenses:update`.
- Do not edit package assets or manifest records.
- Do not fix the `publint` dependency-resolution issue here.

## Suggested Execution Order

Run after Phase 4.

---

# Phase 6 — Close Traceability for Subphase 1.4 and Phase 1

## Goal

Record implementation and verification results, and close Phase 1.

## Scope

Modify:

```text
traceability-log/open/phase_1_establish_licensing_provenance_and_attribution.md
```

## Cycle 6.1 — Close Subphase 1.4

### Red

```gherkin
Feature: Subphase 1.4 traceability closure

Scenario: Subphase 1.4 records enforced pack contract
  Given pack-contract tests and pack:check pass
  When the traceability document is updated
  Then Subphase 1.4 is marked DONE
  And Current Status summarizes tests, rules, verification, and known lint caveat
  And it records that risk-accepted remains deferred
```

### Green

Update:

```markdown
# Subphase 1.4 — Enforce the Publishable Artifact Contract [DONE]
```

or match the document’s established heading style.

Add `## Current Status` covering:

- pure tests added for `assert-pack-files.mjs`;
- required files enforced:

  - `package/LICENSE`;
  - `package/LICENSES/README.md`;
  - `package/LICENSES/PHOSPHOR.txt`;
  - `package/LICENSES/THIRD_PARTY.md`;
  - `package/LICENSES/third-party-icons.json`;
  - included asset-specific license references;
- blocked `package/migration/`;
- included assets require `redistribution.conclusion: "permitted"`;
- verification commands and outcomes;
- known `lint`/`publint` caveat, if still present;
- `risk-accepted` escape hatch remains deferred.

## Cycle 6.2 — Close Phase 1

### Red

```gherkin
Feature: Phase 1 traceability closure

Scenario: Phase 1 closes after all four subphases are done
  Given Subphases 1.1, 1.2, 1.3, and 1.4 are DONE
  When the Phase 1 status is updated
  Then Phase 1 is marked complete
  And the status cross-references end-to-end acceptance criteria
  And deferred work remains explicit
```

### Green

Add or update the Phase 1 top-level status:

- all four subphases complete;
- end-to-end acceptance criteria satisfied;
- deferred work remains explicit, especially:

  - future `risk-accepted` process;
  - any future rights-holder permissions;
  - the known `publint` tooling issue if still unresolved.

### Refactor

Keep the traceability update factual. Do not rewrite already-closed subphases.

## Acceptance Criteria

- Subphase 1.4 marked `[DONE]`.
- Phase 1 marked complete.
- Verification outcomes recorded.
- Known lint caveat recorded if applicable.
- Deferred risk-accepted path remains future work.
- No archived files are moved.
- No unrelated traceability sections are rewritten.

## Non-Goals

- Do not archive the phase.
- Do not stage or commit.
- Do not edit closed traceability files.
- Do not claim legal approval beyond recorded evidence.

## Suggested Execution Order

Run after Phase 5 passes or passes with the accepted lint caveat.

---

# Phase 7 — Final Repository Purity Report

## Goal

Confirm only intended implementation, documentation, package-script, and traceability files changed.

## Scope

Run:

```powershell
git status --short

git diff -- packages/astro-icons/LICENSES/third-party-icons.json
git diff -- packages/astro-icons/LICENSES/THIRD_PARTY.md
git diff -- packages/astro-icons/migration/icon-inventory.json
git diff -- packages/astro-icons/src
```

## Red

```gherkin
Feature: Subphase 1.4 repository purity

Scenario: Pack-contract enforcement does not change frozen evidence or assets
  Given Subphase 1.4 implementation is complete
  When protected diffs are inspected
  Then third-party-icons.json is unchanged
  And THIRD_PARTY.md is unchanged
  And icon-inventory.json is unchanged
  And src is unchanged
```

## Green

Expected in-scope changes:

```text
M packages/astro-icons/scripts/assert-pack-files.mjs
A packages/astro-icons/scripts/test/assert-pack-files.test.mjs
M packages/astro-icons/package.json
M packages/astro-icons/AGENTS.md
M packages/astro-icons/README.md
M traceability-log/open/phase_1_establish_licensing_provenance_and_attribution.md
```

Expected protected empty diffs:

```text
packages/astro-icons/LICENSES/third-party-icons.json
packages/astro-icons/LICENSES/THIRD_PARTY.md
packages/astro-icons/migration/icon-inventory.json
packages/astro-icons/src
```

## Refactor

If protected files changed, revert or stop. This phase enforces the existing artifact contract; it does not change
attribution evidence or source assets.

## Acceptance Criteria

- Only intended files changed.
- Frozen manifest unchanged.
- Generated notice unchanged.
- Inventory unchanged.
- Source assets unchanged.
- No `licenses:update` drift.
- No publishing, staging, or commit occurred.

## Non-Goals

- Do not stage.
- Do not commit.
- Do not publish.
- Do not archive.

## Suggested Execution Order

Run last.

---

# Final Acceptance Matrix

| Area                | Acceptance criterion                                                                                                         |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Unit tests          | `assert-pack-files.test.mjs` covers required files, blocked files, SVG parity, combined findings, and include/permitted rule |
| Pure logic          | `assert-pack-files.mjs` exports import-safe pure functions                                                                   |
| CLI safety          | Importing `assert-pack-files.mjs` does not run `npm pack`                                                                    |
| Required notices    | Pack contract requires `LICENSE` and fixed `LICENSES/*` files                                                                |
| Asset references    | Included asset `licenseFile`/`permissionFile`/`policyFile` references are required in tarball                                |
| Redistribution gate | `include` requires `redistribution.conclusion === "permitted"`                                                               |
| Blocked internals   | `migration/`, `scripts/`, `src/`, `tsconfig.json`, and `tsup.config.ts` are blocked                                          |
| Package scripts     | `test:pack-files` exists and `check` includes it with `pack:check`                                                           |
| Documentation       | README and AGENTS mention the new pack enforcement rule                                                                      |
| Verification        | `test:licenses`, `test:pack-files`, `licenses:check`, `build`, and `pack:check` pass                                         |
| Dry run             | `pack:dry-run` includes legal files and excludes internals                                                                   |
| Lint caveat         | Known `publint` issue documented if still present                                                                            |
| Traceability        | Subphase 1.4 and Phase 1 marked `[DONE]` with Current Status                                                                 |
| Frozen evidence     | `third-party-icons.json` unchanged                                                                                           |
| Generated notice    | `THIRD_PARTY.md` unchanged                                                                                                   |
| Assets/inventory    | `src/` and `migration/icon-inventory.json` unchanged                                                                         |

# Consolidated Non-Goals

- Do not edit `LICENSES/third-party-icons.json`.
- Do not edit `LICENSES/THIRD_PARTY.md`.
- Do not run `licenses:update`.
- Do not change any asset `releaseDecision`.
- Do not add `risk-accepted` to release-action vocabulary.
- Do not contact rights holders.
- Do not publish to npm.
- Do not treat `publint` as legal verification.
- Do not fix the known `publint` module-resolution issue here.
- Do not edit `migration/icon-inventory.json`.
- Do not touch `src/`.
- Do not stage or commit.
- Do not archive traceability files.

DDT is useful for the pack-file matrix: required files, blocked patterns, SVG parity, include/permitted redistribution
cases, and combined diagnostics. PBT is not warranted here; the critical behavior is a fixed package-contract matrix
over known file-list categories, not a broad input-space property.
