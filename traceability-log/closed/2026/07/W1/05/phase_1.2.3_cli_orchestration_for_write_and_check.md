# [DONE] Phase 1.2.3 --- CLI Orchestration for `--write` and `--check`

## Implementation Status

Implemented on 2026-07-05.

Changed files:

```text
packages/astro-icons/scripts/generate-third-party-notices.mjs
packages/astro-icons/scripts/test/third-party-notices.test.mjs
```

Implemented behavior:

- exported `parseArgs`, `runGenerate`, `main`, and package-local default paths;
- validation runs before rendering, writing, or check-mode comparison;
- `--write` writes generated notice content only after validation passes;
- `--check` reports missing or stale notice content without rewriting it;
- `main()` is injectable for tests and sets `process.exitCode = 1` on parse, validation, or drift failure.

Verification:

```powershell
pnpm --filter @ravenhill/astro-icons exec node --test scripts/test/license-metadata.test.mjs scripts/test/third-party-notices.test.mjs
```

Result: 48 tests passed.

Protected files were not intentionally changed in this phase:

```text
packages/astro-icons/LICENSES/third-party-icons.json
packages/astro-icons/migration/icon-inventory.json
packages/astro-icons/src/**
packages/astro-icons/package.json
packages/astro-icons/LICENSES/THIRD_PARTY.md
```

## Scope Classification

**Recommended structure:** direct **red-green-refactor cycles**.

## Editable Scope

Modify only:

```text
packages/astro-icons/scripts/generate-third-party-notices.mjs
packages/astro-icons/scripts/test/third-party-notices.test.mjs
```

Reference only:

```text
packages/astro-icons/scripts/lib/license-metadata.mjs
packages/astro-icons/scripts/audit-icons.mjs
packages/astro-icons/LICENSES/third-party-icons.json
packages/astro-icons/migration/icon-inventory.json
```

## Behavior-Preserving Constraint

This phase adds tooling only. It must not change:

```text
packages/astro-icons/LICENSES/third-party-icons.json
packages/astro-icons/migration/icon-inventory.json
packages/astro-icons/src/**
packages/astro-icons/package.json
packages/astro-icons/LICENSES/THIRD_PARTY.md
```

`THIRD_PARTY.md` is generated and committed in the later baseline phase, not here.

---

# Cycle 1 --- Add Argument Parsing

## Goal

Add a pure parser for the generator’s two supported modes.

## Scope

In:

```text
packages/astro-icons/scripts/generate-third-party-notices.mjs
```

export:

```js
parseArgs(argv);
```

## Red

```gherkin
Feature: Third-party notice CLI argument parsing

Scenario Outline: Exactly one mode flag is accepted
  Given argv contains <argv>
  When parseArgs is called
  Then it returns <result>

Examples:
  | argv                  | result         |
  | ["--write"]           | mode write     |
  | ["--check"]           | mode check     |
  | []                    | error          |
  | ["--write", "--check"] | error         |
  | ["--force"]           | error          |
```

## Green

Implement:

```js
export const parseArgs = (argv) => {
    // returns { mode: "write" | "check" } or { error: string }
};
```

Rules:

- accepts exactly one of `--write` or `--check`;
- rejects missing mode;
- rejects both modes;
- rejects unknown flags;
- does not read files;
- does not call `process.exit`.

## Refactor

Keep `parseArgs` pure and small. Avoid coupling it to default paths or `main()`.

## Acceptance Criteria

- `--write` returns `{ mode: "write" }`.
- `--check` returns `{ mode: "check" }`.
- invalid invocations return `{ error }`.
- Tests use Sanderson-themed temporary fixture contexts where filenames are needed.

## Non-Goals

- Do not implement I/O yet.
- Do not add `main()` yet.
- Do not add package scripts.

## Suggested Execution Order

Run first.

---

# Cycle 2 --- Add Default Path Resolution

## Goal

Define exported default paths resolved from the script location.

## Scope

In `generate-third-party-notices.mjs`, export:

```js
DEFAULT_MANIFEST_PATH;
DEFAULT_INVENTORY_PATH;
DEFAULT_NOTICE_PATH;
DEFAULT_LICENSES_DIR;
```

## Red

```gherkin
Feature: Default generator paths

Scenario: Default paths resolve inside the astro-icons package
  Given the generator module location
  When default paths are read
  Then the manifest path ends with LICENSES/third-party-icons.json
  And the inventory path ends with migration/icon-inventory.json
  And the notice path ends with LICENSES/THIRD_PARTY.md
  And the licenses directory ends with LICENSES
```

## Green

Use Node built-ins:

```js
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(scriptDir, "..");

export const DEFAULT_MANIFEST_PATH = resolve(packageRoot, "LICENSES", "third-party-icons.json");
export const DEFAULT_INVENTORY_PATH = resolve(packageRoot, "migration", "icon-inventory.json");
export const DEFAULT_NOTICE_PATH = resolve(packageRoot, "LICENSES", "THIRD_PARTY.md");
export const DEFAULT_LICENSES_DIR = resolve(packageRoot, "LICENSES");
```

Adjust `packageRoot` if the script’s real location requires one more `..`.

## Refactor

Keep path derivation centralized. Later `main()` should pass only these defaults into `runGenerate`.

## Acceptance Criteria

- Defaults are exported.
- Defaults are absolute paths.
- Defaults are derived from `import.meta.url`, not `process.cwd()`.
- No filesystem operation happens while resolving paths.

## Non-Goals

- Do not require the files to exist.
- Do not generate `THIRD_PARTY.md`.
- Do not alter renderer output.

## Suggested Execution Order

Run after Cycle 1.

---

# Cycle 3 --- Add Validation-Gated `runGenerate`

## Goal

Add the orchestration function that reads inputs, validates the manifest, and renders only if validation passes.

## Scope

Export:

```js
runGenerate({ mode, manifestPath, inventoryPath, noticePath, licensesDir });
```

Use:

```js
validateManifest(inventory, manifest, licenseFileNames);
renderThirdPartyNotice(manifest);
```

## Red

```gherkin
Feature: Generator validation gate

Scenario: Invalid manifest prevents notice rendering and writing
  Given an invalid manifest with unsupported releaseDecision.action
  And an existing stale THIRD_PARTY.md
  When runGenerate runs in write mode
  Then it returns ok false
  And it includes validation findings
  And it does not overwrite THIRD_PARTY.md
```

## Green

Implement the validation pre-step:

1. read manifest JSON;
2. read inventory JSON;
3. list direct filenames in `licensesDir`;
4. call `validateManifest`;
5. if invalid, return:

```js
{
    ok: false,
    findings,
    message: "Attribution manifest validation failed."
}
```

6. do not call `renderThirdPartyNotice`;
7. do not write output.

## Refactor

Add small filesystem adapters:

```js
const readJsonFile = async (path) => JSON.parse(await readFile(path, "utf8"));
const listDirectFileNames = async (directory) => await readdir(directory);
```

Keep these private and local to CLI orchestration. The pure renderer remains independent.

## Acceptance Criteria

- Invalid manifest returns `ok: false`.
- Validator findings are preserved.
- `THIRD_PARTY.md` is not created or overwritten on validation failure.
- Filesystem access is contained in `runGenerate`.
- Renderer functions remain pure.

## Non-Goals

- Do not implement check-mode drift detection yet.
- Do not print to stdout/stderr inside `runGenerate`.
- Do not exit the process inside `runGenerate`.

## Suggested Execution Order

Run after Cycles 1–2.

---

# Cycle 4 --- Implement Write Mode

## Goal

Write generated notice content when validation passes and mode is `write`.

## Scope

Extend:

```js
runGenerate({ mode: "write", ... })
```

## Red

```gherkin
Feature: THIRD_PARTY.md write mode

Scenario: Write mode creates the generated notice
  Given a valid manifest
  And a valid inventory
  And a temporary LICENSES directory
  When runGenerate runs in write mode
  Then THIRD_PARTY.md is written
  And the written content equals renderThirdPartyNotice(manifest)
```

## Green

In write mode:

1. validate first;
2. render expected content;
3. ensure `dirname(noticePath)` exists with `mkdir(..., { recursive: true })`;
4. write the expected content;
5. return:

```js
{
    ok: true,
    changed: true,
    message: "Third-party notice updated."
}
```

`changed` may always be `true` for write mode, or it may compare existing content first. Keep it simple unless tests
need drift detail.

## Refactor

Keep write-mode branching compact:

```js
if (mode === "write") {
    ...
}
```

Avoid mixing write behavior with `main()` output formatting.

## Acceptance Criteria

- `write` mode writes `THIRD_PARTY.md`.
- Parent directory is created if needed.
- Output equals the pure renderer output.
- Validation always runs before writing.
- No package scripts are added.

## Non-Goals

- Do not commit or generate the real baseline in this phase.
- Do not update package.json.
- Do not add timestamps to the notice.

## Suggested Execution Order

Run after Cycle 3.

---

# Cycle 5 --- Implement Check Mode

## Goal

Compare generated content against an existing notice without rewriting it.

## Scope

Extend:

```js
runGenerate({ mode: "check", ... })
```

## Red

```gherkin
Feature: THIRD_PARTY.md check mode

Scenario: Check mode passes when the notice is current
  Given a valid manifest
  And THIRD_PARTY.md already contains the expected generated content
  When runGenerate runs in check mode
  Then it returns ok true

Scenario: Check mode fails on stale content without rewriting
  Given a valid manifest
  And THIRD_PARTY.md contains stale content
  When runGenerate runs in check mode
  Then it returns ok false
  And THIRD_PARTY.md still contains the stale content

Scenario: Check mode fails when the notice is missing
  Given a valid manifest
  And THIRD_PARTY.md does not exist
  When runGenerate runs in check mode
  Then it returns ok false
  And it reports the missing notice
```

## Green

In check mode:

1. validate first;
2. render expected content;
3. read existing notice content;
4. if missing, return `ok: false` with a clear finding;
5. if content differs, return `ok: false` with a drift finding;
6. never write in check mode.

Suggested result shape:

```js
{
    ok: false,
    changed: false,
    findings: ["notice.drift: LICENSES/THIRD_PARTY.md is stale"],
    message: "Third-party notice is out of date."
}
```

## Refactor

Keep missing-file handling explicit. Do not swallow unrelated I/O errors unless the test proves it is a missing notice.

## Acceptance Criteria

- Check mode passes on exact content match.
- Check mode fails on stale content.
- Check mode fails on missing notice.
- Check mode never rewrites the file.
- Drift messages are deterministic.

## Non-Goals

- Do not print a diff.
- Do not auto-fix in check mode.
- Do not stage generated output.

## Suggested Execution Order

Run after Cycle 4.

---

# Cycle 6 --- Add `main()` and Main-Module Detection

## Goal

Make the script executable as a CLI while preserving testable exports.

## Scope

Add:

```js
main();
```

and main-module detection matching the style of `audit-icons.mjs`.

## Red

```gherkin
Feature: Generator CLI main

Scenario: CLI failure sets a non-zero exit code
  Given parseArgs returns an error
  When main runs
  Then process.exitCode is set to 1
  And the error is printed to stderr

Scenario: CLI success prints a concise summary
  Given runGenerate succeeds
  When main runs
  Then a success message is printed
  And process.exitCode is not set to failure
```

## Green

`main()` should:

1. call `parseArgs(process.argv.slice(2))`;
2. on parse error:

   - print to `console.error`;
   - set `process.exitCode = 1`;
   - return;
3. call `runGenerate` with defaults;
4. on failure:

   - print message and findings to `console.error`;
   - set `process.exitCode = 1`;
5. on success:

   - print a concise message to `console.log`.

Main-module detection should prevent `main()` from running during test import.

## Refactor

For easier testing, consider:

```js
export const main = async ({
    argv = process.argv.slice(2),
    stdout = console.log,
    stderr = console.error,
} = {}) => { ... };
```

This keeps tests from monkeypatching globals heavily.

## Acceptance Criteria

- Importing the module in tests does not run the CLI.
- `main()` handles parse errors.
- `main()` handles validation/drift failures.
- `main()` prints concise success output.
- `main()` sets `process.exitCode = 1` on failure.

## Non-Goals

- Do not add package scripts.
- Do not invoke `main()` from tests through a shell unless necessary.
- Do not change renderer wording for CLI behavior.

## Suggested Execution Order

Run after runGenerate supports both modes.

---

# Cycle 7 --- Final Test and Repository Purity Check

## Goal

Verify the CLI layer works and the phase stays isolated.

## Scope

Run from repository root:

```powershell
Set-Location "e:\teaching\DIBS\projects\astro-website"
```

## Red

```gherkin
Feature: Phase 1.2.3 closure

Scenario: CLI orchestration is complete without generating the baseline
  Given CLI orchestration tests are implemented
  When the notice and metadata tests run
  Then all tests pass
  And no committed THIRD_PARTY.md baseline is created
  And package.json remains unchanged
```

## Green

Run:

```powershell
pnpm --filter @ravenhill/astro-icons exec node --test scripts/test/license-metadata.test.mjs scripts/test/third-party-notices.test.mjs
```

Inspect:

```powershell
git status --short
git diff -- packages/astro-icons/LICENSES/third-party-icons.json
git diff -- packages/astro-icons/migration/icon-inventory.json
git diff -- packages/astro-icons/package.json
git diff -- packages/astro-icons/LICENSES/THIRD_PARTY.md
```

Expected in-scope modified files:

```text
M packages/astro-icons/scripts/generate-third-party-notices.mjs
M packages/astro-icons/scripts/test/third-party-notices.test.mjs
```

Expected protected diffs:

```text
packages/astro-icons/LICENSES/third-party-icons.json       # empty
packages/astro-icons/migration/icon-inventory.json         # empty
packages/astro-icons/package.json                          # empty
packages/astro-icons/LICENSES/THIRD_PARTY.md               # absent or unchanged
```

## Refactor

If tests need helper fixtures, keep them inside `third-party-notices.test.mjs`. Do not create fixture files in the
repository.

Temporary directories created by tests must use OS temp locations and clean themselves up.

## Acceptance Criteria

- Both test files pass.
- CLI tests use temporary directories.
- Sanderson-themed fixtures are used for synthetic manifests.
- No `package.json` changes.
- No generated baseline is committed.
- Frozen manifest and inventory are unchanged.
- No new dependency is introduced.
- Renderer output wording changes only if required by orchestration tests.

## Non-Goals

- Do not add `test:licenses`.
- Do not add `licenses:check`.
- Do not add `licenses:update`.
- Do not run `--write` against the real manifest.
- Do not create or commit `LICENSES/THIRD_PARTY.md`.
- Do not alter the frozen manifest.

## Suggested Execution Order

Run last.

---

# Test Coverage Matrix

| Area                   | Test expectation                                                  |
| ---------------------- | ----------------------------------------------------------------- |
| `parseArgs`            | Accepts exactly `--write` or `--check`                            |
| `parseArgs` errors     | Missing mode, both modes, unknown args                            |
| Defaults               | Resolve package-local manifest, inventory, notice, licenses paths |
| Validation gate        | Invalid manifest prevents render/write                            |
| Write mode             | Creates notice for valid manifest                                 |
| Check mode current     | Passes when notice matches                                        |
| Check mode stale       | Fails without rewriting                                           |
| Check mode missing     | Fails clearly                                                     |
| `main()` parse failure | Prints error and sets failure exit code                           |
| `main()` run failure   | Prints findings and sets failure exit code                        |
| `main()` success       | Prints concise success summary                                    |
| Fixtures               | Synthetic Sanderson-themed manifests only                         |
| I/O isolation          | Temporary directories only                                        |

---

# Final Acceptance Matrix

| Area               | Acceptance criterion                                          |
| ------------------ | ------------------------------------------------------------- |
| CLI exports        | `parseArgs`, `runGenerate`, `main`, and defaults are exported |
| Renderer purity    | Existing render functions remain pure                         |
| Validation gate    | `validateManifest` runs before render/write/check             |
| Validation failure | Returns findings and writes nothing                           |
| Write mode         | Writes expected renderer output after validation              |
| Check mode         | Compares without rewriting                                    |
| Missing notice     | Check mode fails clearly                                      |
| Main behavior      | Sets `process.exitCode = 1` on failure                        |
| Tests              | Existing renderer tests and new CLI tests pass                |
| Frozen inputs      | Manifest and inventory unchanged                              |
| Package wiring     | `package.json` unchanged                                      |
| Generated baseline | `THIRD_PARTY.md` not created or committed in this phase       |
| Dependencies       | No new dependencies                                           |

---

# Consolidated Non-Goals

- Do not add package scripts.
- Do not generate the committed `THIRD_PARTY.md` baseline.
- Do not run `--write` against the real manifest.
- Do not edit `third-party-icons.json`.
- Do not edit `icon-inventory.json`.
- Do not edit SVG files.
- Do not edit package exports or runtime code.
- Do not add dependencies.
- Do not implement license scanning.
- Do not change legal/provenance conclusions.
- Do not move CLI orchestration into a separate script.

# Main Improvements Over the Original Plan

The original plan is solid. This version improves it by:

1. making default-path derivation a separate testable cycle;
2. separating validation-gate behavior from write/check mode behavior;
3. making check mode’s “missing notice” case explicit;
4. making `main()` injectable enough to test without shelling out;
5. preserving Phase 4 boundaries by preventing real baseline generation and `package.json` script wiring.

DDT is useful for `parseArgs`, vocabulary-invalid fixture cases, and mode behavior. PBT is not warranted: the CLI has a
tiny fixed option space and the important behavior is deterministic I/O orchestration.
