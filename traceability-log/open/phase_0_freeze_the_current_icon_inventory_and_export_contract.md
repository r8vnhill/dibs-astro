# [PLAN] Phase 0 --- Freeze the Current Icon Inventory and Export Contract

## Summary

Capture an authoritative, deterministic, machine-checkable snapshot of the current `@ravenhill/astro-icons` asset
inventory and public export names before any SVG is moved, renamed, separated, optimized, or published independently.

This phase is behavior-preserving. It introduces audit infrastructure and a frozen migration artifact, but it does not
intentionally change generated exports, package contents, asset classification, or consumers.

## Current Status

Cycle 1 is complete: `toPascalCase` now lives in `packages/astro-icons/scripts/lib/icon-name.mjs`, and
`generate-icons-index.js` imports it instead of carrying its own copy. DDT coverage lives in
`packages/astro-icons/scripts/test/icon-name.test.mjs` and `pnpm --filter @ravenhill/astro-icons test:audit-icons` runs
it. Regenerating both `packages/astro-icons/src/index.ts` and `src/assets/img/logos/index.ts` produced no diff,
confirming every existing export name is preserved.

Cycle 2 is complete: the pure inventory model lives in `packages/astro-icons/scripts/lib/icon-inventory.mjs`, exposing
`buildIconInventory`, `classifyIcon`, `findExportNameCollisions`, and `assertCustomIconsPresent`. It has no filesystem
or process dependencies, derives counts from the canonical `icons` array, detects collisions via a map keyed by export
name, and raises `IconInventoryError` with stable codes (`MISSING_CUSTOM_ICON`, `EXPORT_NAME_COLLISION`,
`INVALID_INVENTORY_COUNTS`). BDD-style coverage lives in
`packages/astro-icons/scripts/test/icon-inventory.test.mjs` and is wired into `test:audit-icons`
(16 tests passing total).

Cycle 3 is complete: `packages/astro-icons/scripts/audit-icons.mjs` is a thin orchestration layer exposing
`scanSvgDirectory`, `serializeInventory`, and `runAudit` for testing, plus a `main()` CLI entry point. It resolves
`src/` and `migration/icon-inventory.json` relative to the script module (not `process.cwd()`), scans only direct
`.svg` entries non-recursively, serializes the frozen-artifact schema with two-space indentation and exactly one
trailing line feed, and compares `--check` against the complete committed bytes rather than reparsing JSON. CLI
argument parsing rejects missing mode, both modes together, and unknown arguments. BDD-style coverage with One
Piece-themed temporary fixtures lives in `packages/astro-icons/scripts/test/audit-icons.test.mjs` and is wired into
`test:audit-icons` (24 tests passing total). `package.json` now also exposes `audit-icons` (`--check`) and
`audit-icons:update` (`--write`). Running `pnpm --filter @ravenhill/astro-icons audit-icons` against the real source
correctly fails with a missing-artifact diagnostic, since `migration/icon-inventory.json` has not been generated yet.
Cycle 4 (freeze and verify the repository contract) is still pending.

## Scope Classification

This is a **small scope** suitable for direct implementation as four short TDD cycles:

1. Characterize and extract the existing export-name transformation.
2. Implement the pure inventory model and validation rules.
3. Add deterministic filesystem and CLI adapters.
4. Generate and verify the repository-level frozen contract.

DDT is appropriate for naming and classification examples. PBT is not justified because the important contract is a
fixed, finite corpus of 1,521 files, and the highest-value failures are concrete missing-file and name-collision cases.

---

## Established Baseline

The implementation must preserve the following confirmed facts:

- The package is already named `@ravenhill/astro-icons`.

- `packages/astro-icons/src/` currently contains 1,521 SVG files in one flat directory.

- The explicit custom allowlist contains exactly these nine base names:

  ```text
  bash
  csv
  json
  kotlin
  nushell-logo
  powershell
  python
  scala
  xml
  ```

- Classification is defined as:

  ```text
  custom   = filename base is in the explicit allowlist
  phosphor = every other SVG filename
  ```

- Therefore:

  ```text
  1,512 phosphor + 9 custom = 1,521 total
  ```

- `file-csv.svg` is not allowlisted and must remain in the Phosphor group.

- Public export names are produced by the existing `toPascalCase` transformation used by `generate-icons-index.js`.

- No canonical Phosphor inventory dependency will be introduced in this phase.

The terms `phosphor` and `custom` represent migration groups. They must not be modeled as complete legal or license
classifications because the custom group may contain assets from more than one origin.

---

## Target Design

### Pure core and adapters

Separate the implementation into:

- a pure export-name function;
- a pure inventory builder and validator;
- filesystem and serialization adapters;
- a thin CLI entry point.

Recommended structure:

```text
packages/astro-icons/
├── migration/
│   └── icon-inventory.json
├── scripts/
│   ├── audit-icons.mjs
│   ├── lib/
│   │   ├── icon-inventory.mjs
│   │   └── icon-name.mjs
│   └── test/
│       ├── audit-icons.test.mjs
│       ├── icon-inventory.test.mjs
│       └── icon-name.test.mjs
└── package.json
```

`generate-icons-index.js` should import `toPascalCase` from the shared pure module.

Do not make `audit-icons.mjs` import the generator entry point merely to access one helper. Executable scripts should
remain orchestration boundaries rather than becoming shared utility modules.

### CLI modes

Provide two explicit operations:

```text
--write  Generate or replace the committed inventory artifact.
--check  Compare the current source inventory with the committed artifact.
```

Recommended package scripts:

```json
{
    "scripts": {
        "audit-icons": "node scripts/audit-icons.mjs --check",
        "audit-icons:update": "node scripts/audit-icons.mjs --write",
        "test:audit-icons": "node --test scripts/test/icon-name.test.mjs scripts/test/icon-inventory.test.mjs scripts/test/audit-icons.test.mjs"
    }
}
```

Using `--check` for the ordinary audit command prevents an accidental regeneration from hiding contract drift.

### Path handling

Resolve repository paths relative to the script module rather than `process.cwd()`.

The commands must behave identically when invoked from:

- the repository root;
- `packages/astro-icons/`;
- a pnpm filtered command.

### Deterministic serialization

The generated artifact must use:

- a fixed property order;
- two-space JSON indentation;
- exactly one trailing line feed;
- no timestamps;
- no machine-specific absolute paths;
- filenames ordered lexically by filename;
- entries generated from the same ordered collection;
- byte-identical output for unchanged input.

---

## Frozen Artifact Schema

Prefer one canonical per-icon collection rather than parallel arrays such as `custom.files`, `custom.exports`,
`phosphor.exports`, and `exports.names`.

Parallel collections duplicate information and can become internally inconsistent. Later parity checks can derive
group-specific lists by filtering the canonical entries.

Recommended shape:

```json
{
    "schemaVersion": 1,
    "package": {
        "currentName": "@ravenhill/astro-icons",
        "historicalName": "@ravenhill/phosphor-icons",
        "note": "The package is already named @ravenhill/astro-icons in this monorepo; the historical transition is recorded for the standalone migration."
    },
    "sourceDirectory": "packages/astro-icons/src",
    "classification": {
        "strategy": "explicit-custom-allowlist",
        "customBaseNames": [
            "bash",
            "csv",
            "json",
            "kotlin",
            "nushell-logo",
            "powershell",
            "python",
            "scala",
            "xml"
        ]
    },
    "exportContract": {
        "convention": "PascalCase via the shared toPascalCase function"
    },
    "counts": {
        "total": 1521,
        "phosphor": 1512,
        "custom": 9
    },
    "icons": [
        {
            "file": "acorn.svg",
            "exportName": "Acorn",
            "group": "phosphor"
        },
        {
            "file": "bash.svg",
            "exportName": "Bash",
            "group": "custom"
        }
    ]
}
```

The committed `icons` array must contain all 1,521 current entries.

Content hashes are deliberately excluded. This phase freezes the inventory, grouping, and export-name contract—not SVG
byte content.

---

# Cycle 1 — Characterize and Extract Export Naming [DONE]

## Goal

Create one pure and authoritative `toPascalCase` implementation shared by the existing index generator and the new audit
system without changing any generated export name.

## Scope

- Characterize the current transformation.

- Move the existing implementation unchanged into:

  ```text
  packages/astro-icons/scripts/lib/icon-name.mjs
  ```

- Update `generate-icons-index.js` to import it.

- Add focused DDT tests.

## Red

Add behavior descriptions such as:

```text
Given a simple lowercase icon name
When the export name is derived
Then the existing PascalCase name is preserved
```

```text
Given a hyphenated icon name
When the export name is derived
Then each existing segment is capitalized exactly as before
```

```text
Given representative filenames from the current corpus
When the naming function is evaluated
Then it produces the names already emitted by index.ts
```

The DDT matrix should include at least:

| Input base name | Expected export |
| --------------- | --------------- |
| `acorn`         | `Acorn`         |
| `file-csv`      | `FileCsv`       |
| `nushell-logo`  | `NushellLogo`   |
| `powershell`    | `Powershell`    |

A synthetic One Piece-themed row may be used to exercise the generic hyphen rule without reusing unrelated fixture
names:

| Input base name | Expected export |
| --------------- | --------------- |
| `going-merry`   | `GoingMerry`    |

Before extraction, capture the current generated `src/index.ts` or its relevant export list as the characterization
oracle.

## Green

- Move the exact existing transformation into `icon-name.mjs`.
- Export `toPascalCase`.
- Import it from `generate-icons-index.js`.
- Make only the changes required to keep generation working.

Do not “improve,” normalize, or broaden the naming algorithm in this cycle.

## Refactor

- Keep the shared function pure and short.
- Add a concise contract comment.
- Remove any duplicate implementation.
- Keep executable behavior outside the helper module.

## Acceptance Criteria

- All naming tests pass.
- Regenerating `packages/astro-icons/src/index.ts` produces no diff.
- Every currently exported icon retains the same export name.
- The naming helper has no filesystem or process dependencies.

## Non-goals

- Supporting new separators or naming conventions.
- Fixing awkward existing names.
- Renaming any public export.

---

# Cycle 2 — Build and Validate the Pure Inventory Model [DONE]

## Goal

Construct the complete inventory from an in-memory list of SVG filenames and fail deterministically when the source
contract is invalid.

## Scope

Add pure functions to `scripts/lib/icon-inventory.mjs`, such as:

```text
buildIconInventory
classifyIcon
findExportNameCollisions
assertCustomIconsPresent
```

Exact function names may vary, but the pure core must not read files, write files, inspect the working directory, or
terminate the process.

## Red

Add BDD-style tests for the following behaviors.

### Classification

```text
Given an SVG whose base name is in the custom allowlist
When the inventory is built
Then the icon is classified as custom
```

```text
Given an SVG whose base name is not in the custom allowlist
When the inventory is built
Then the icon is classified as phosphor
```

Include explicit assertions that:

- `bash.svg` is custom;
- `nushell-logo.svg` is custom;
- `file-csv.svg` is phosphor.

### Ordering

```text
Given filenames in arbitrary input order
When the inventory is built
Then entries are ordered lexically by filename
```

### Missing allowlisted icons

```text
Given an allowlisted custom base name with no corresponding SVG
When the inventory is built
Then the audit fails with a missing-custom-icon diagnostic
```

The diagnostic should identify all missing files, sorted deterministically, rather than stopping after an arbitrary
first failure.

### Export-name collisions

```text
Given two distinct filenames that produce the same PascalCase export name
When the inventory is built
Then the audit fails and reports the export name and both filenames
```

### Count invariants

```text
Given a valid inventory
When its counts are derived
Then custom plus phosphor equals total
And total equals the number of icon entries
And export names are unique
```

## Green

Implement the smallest pure model that satisfies the tests:

- normalize allowlist base names to expected `.svg` filenames internally;
- classify using a `Set`;
- derive the export name through the shared `toPascalCase`;
- detect collisions through a map keyed by export name;
- derive all counts from the canonical icon entries;
- return plain serializable data.

Prefer explicit domain errors or stable error codes such as:

```text
MISSING_CUSTOM_ICON
EXPORT_NAME_COLLISION
INVALID_INVENTORY_COUNTS
```

Do not expose stack traces as normal CLI diagnostics.

## Refactor

- Split validation steps into short functions.
- Avoid maintaining redundant count state while iterating.
- Derive summaries after entries have been validated.
- Keep the canonical `icons` array as the source for all aggregate values.

## Acceptance Criteria

- Every SVG receives exactly one group.
- All nine allowlisted custom files are required.
- `file-csv.svg` is classified as Phosphor.
- Duplicate public export names are rejected.
- Counts are derived rather than manually supplied.
- The pure core has no filesystem or CLI coupling.

## Non-goals

- Verifying whether a non-allowlisted icon exists in an upstream Phosphor release.
- Determining copyright ownership or precise license metadata.
- Reading or validating SVG contents.

---

# Cycle 3 — Add Deterministic Filesystem, Serialization, and CLI Adapters [DONE]

## Goal

Connect the pure inventory model to the current flat source directory and provide safe `--write` and `--check`
workflows.

## Scope

Implement:

- source-directory scanning;
- `.svg` filtering;
- deterministic JSON serialization;
- atomic or replacement-safe artifact writing;
- committed-artifact comparison;
- human-readable summaries;
- CLI argument validation.

## Red

Use temporary directories rather than renaming files in the real source tree.

One Piece-themed temporary fixtures may include distinct names such as:

```text
baratie.svg
thousand-sunny.svg
water-seven.svg
notes.txt
```

Inject a test-specific custom allowlist rather than coupling these fixtures to the production allowlist.

Add tests for:

### Source scanning

```text
Given a directory containing SVG and non-SVG entries
When the source is scanned
Then only direct .svg entries are included
```

Do not make scanning recursive; the current source contract is a flat directory.

### Stable serialization

```text
Given unchanged source files
When --write is executed twice
Then the artifact bytes are identical
```

### Check mode

```text
Given an artifact that matches the current source
When --check is executed
Then the command succeeds without modifying files
```

```text
Given a stale artifact
When --check is executed
Then the command exits non-zero and explains that regeneration is required
```

```text
Given no committed artifact
When --check is executed
Then the command exits non-zero with a clear missing-artifact diagnostic
```

### Working-directory independence

```text
Given the command is launched from different working directories
When the audit runs
Then it resolves the same source and destination paths
```

### Summary output

```text
Given the production inventory counts
When the audit succeeds
Then stdout contains:
1512 phosphor + 9 custom = 1521 total
```

## Green

Implement `audit-icons.mjs` as a thin orchestration layer:

1. Parse exactly one mode: `--write` or `--check`.
2. Resolve source and artifact paths relative to the module.
3. Read and sort direct `.svg` filenames.
4. Build the inventory through the pure core.
5. Serialize it deterministically.
6. Write or compare according to the selected mode.
7. Print the summary only after successful validation.
8. Set a non-zero exit code for expected audit failures.

Reject:

- missing mode;
- both modes together;
- unknown arguments.

## Refactor

- Keep argument parsing separate from audit execution.
- Inject paths into testable adapter functions.
- Keep `process.exitCode` handling in the CLI boundary.
- Ensure comparison uses the complete serialized bytes rather than reparsing and semantically comparing JSON; formatting
  is part of the deterministic artifact contract.

## Acceptance Criteria

- `--write` is byte-idempotent.
- `--check` never rewrites the artifact.
- Invocation is independent of the caller’s working directory.
- Non-SVG files are ignored.
- Missing custom assets and collisions produce concise non-zero failures.
- The successful production summary is exactly:

  ```text
  1512 phosphor + 9 custom = 1521 total
  ```

## Non-goals

- Recursive source discovery.
- Watching for filesystem changes.
- Automatically repairing stale artifacts.
- Adding a third-party serializer or CLI dependency.

---

# Cycle 4 — Freeze and Verify the Repository Contract

## Goal

Generate the real baseline artifact and make future drift detectable through package-level commands.

## Scope

- Add package scripts.
- Generate `migration/icon-inventory.json`.
- Add one repository-level contract test over the current source corpus.
- Verify that no production asset or public export changed.

## Red

Before generating the artifact, add an integration-level behavior description:

```text
Given the current packages/astro-icons/src corpus
When the inventory is built
Then it contains 1521 icons
And 1512 are phosphor
And 9 are custom
And the committed custom allowlist is exact
And FileCsv remains phosphor
And Bash, Python, NushellLogo, and FileCsv are present exports
```

Add a check asserting that the committed artifact matches the generated bytes.

This test should fail while the artifact is absent or stale.

## Green

Add the package scripts:

```json
{
    "audit-icons": "node scripts/audit-icons.mjs --check",
    "audit-icons:update": "node scripts/audit-icons.mjs --write",
    "test:audit-icons": "node --test scripts/test/icon-name.test.mjs scripts/test/icon-inventory.test.mjs scripts/test/audit-icons.test.mjs"
}
```

Then run:

```powershell
pnpm --filter @ravenhill/astro-icons test:audit-icons
pnpm --filter @ravenhill/astro-icons audit-icons:update
pnpm --filter @ravenhill/astro-icons audit-icons
```

Commit the generated artifact only after all validations pass.

## Refactor

- Review the generated JSON for redundant fields.
- Confirm every aggregate can be derived from `icons`.
- Confirm all paths stored in the artifact are repository-relative.
- Confirm the migration directory remains excluded from the published package.
- Confirm error messages and command names are consistent.

## Acceptance Criteria

The phase is complete when all of the following hold:

- `icon-inventory.json` contains exactly 1,521 icon records.

- Counts are:

  ```text
  total: 1521
  phosphor: 1512
  custom: 9
  ```

- The custom allowlist is exact and sorted.

- `file-csv.svg` has:

  ```json
  {
      "file": "file-csv.svg",
      "exportName": "FileCsv",
      "group": "phosphor"
  }
  ```

- All export names are unique.

- Running `audit-icons:update` twice produces no second diff.

- Running `audit-icons` succeeds against the committed artifact.

- Regenerating `src/index.ts` produces no diff.

- No file under `packages/astro-icons/src/` is moved, renamed, added, deleted, or modified.

- `git status` contains only the expected audit infrastructure, tests, package-script edit, shared naming extraction,
  and generated migration artifact.

- The migration artifact remains absent from the package tarball.

## Non-goals

- Moving assets into `phosphor/` and `custom/`.
- Renaming files or exports.
- Changing the current export convention.
- Creating the standalone GitLab repository.
- Publishing the package.
- Adding license files.
- Updating consumers or aliases.
- Introducing `@phosphor-icons/core` or another inventory dependency.
- Auditing SVG contents or establishing full license provenance.

---

## Critical Files

### New

```text
packages/astro-icons/scripts/lib/icon-name.mjs
packages/astro-icons/scripts/lib/icon-inventory.mjs
packages/astro-icons/scripts/audit-icons.mjs
packages/astro-icons/scripts/test/icon-name.test.mjs
packages/astro-icons/scripts/test/icon-inventory.test.mjs
packages/astro-icons/scripts/test/audit-icons.test.mjs
packages/astro-icons/migration/icon-inventory.json
```

### Modified

```text
generate-icons-index.js
packages/astro-icons/package.json
```

### Reference only

```text
packages/astro-icons/scripts/copy-assets.mjs
packages/astro-icons/scripts/assert-pack-files.mjs
packages/astro-icons/src/index.ts
packages/astro-icons/src/
```

---

## Suggested Execution Order

1. Complete Cycle 1 and prove that index generation remains byte-identical.
2. Complete Cycle 2 entirely against in-memory inputs.
3. Complete Cycle 3 with temporary filesystem fixtures.
4. Add the real corpus contract test.
5. Generate the frozen artifact.
6. Run check mode and index-generation parity.
7. Inspect `git diff`, `git status`, and the package tarball file list.
8. Close Phase 0 only after the committed artifact is reproducible and no SVG change is present.
