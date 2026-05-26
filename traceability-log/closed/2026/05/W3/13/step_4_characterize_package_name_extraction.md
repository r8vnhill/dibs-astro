# [DONE] Step 4: Characterize Package-Name Extraction

## Status

Complete. `scripts/__tests__/layer-boundary-import-specifiers.test.ts` already pins package-name extraction through
`packageNameFromImportPath()` and confirms package-name propagation through `classifyPackageImport()`.

The focused test command still reaches the expected red state because
`scripts/lib/layer-boundary-import-specifiers.mjs` has not been implemented yet.

## Summary

Create a focused Step 4 traceability note for package-name extraction and verify that the existing helper-level tests
already pin the intended contract.

This step is **test/documentation-only**. It should not implement `scripts/lib/layer-boundary-import-specifiers.mjs`,
change classifier behaviour, or add new semantics. The expected red state remains the missing helper module, which will
be resolved in Step 5.

## Scope

### In scope

- Confirm that `scripts/__tests__/layer-boundary-import-specifiers.test.ts` already contains package-name extraction
  coverage.
- Keep the existing `packageNameFromImportPath()` table as the Step 4 behavioural contract.
- Keep `classifyPackageImport()` tests as supporting coverage that the extracted package name is propagated into the
  classifier result.
- Add a Step 4 traceability note.
- Update the Stage 3 traceability checklist to mark Step 4 as complete.

### Out of scope

- Do not implement `scripts/lib/layer-boundary-import-specifiers.mjs`.
- Do not change `packageNameFromImportPath()` semantics.
- Do not rename helper functions or result fields.
- Do not broaden architecture or layer-boundary test coverage.
- Do not address unrelated Vitest failures from broader test runs.

## Key Changes

### 1. Preserve package-name extraction coverage

Keep the existing `packageNameFromImportPath()` table covering:

```ts
[
    ["react", "react"],
    ["react/jsx-runtime", "react"],
    ["@scope/pkg", "@scope/pkg"],
    ["@scope/pkg/subpath", "@scope/pkg"],
    ["node:fs", "node:fs"],
    ["", ""],
];
```

This pins the intended extraction rules:

- bare packages keep their full name;
- package subpaths collapse to the package root;
- scoped packages preserve both scope and package segments;
- scoped package subpaths collapse to `@scope/pkg`;
- `node:` built-ins are treated as complete package identifiers;
- the empty string remains a compatibility case.

### 2. Preserve classifier propagation coverage

Keep the existing `classifyPackageImport()` assertions showing that extracted names are used in the classifier result:

```ts
{
  target: "external-package",
  packageName,
}
```

This keeps package-name extraction tested both directly and through the classifier boundary.

### 3. Add the Step 4 traceability note

Created:

```text
traceability-log/step_4_characterize_package_name_extraction.md
```

Suggested contents:

````markdown
# Step 4: Test Package-Name Extraction

Status: [DONE]

# Scope

This step characterizes package-name extraction for unresolved package import specifiers.

It is test/documentation-only. It does not implement `scripts/lib/layer-boundary-import-specifiers.mjs`.

# Covered Cases

The existing `packageNameFromImportPath()` table covers:

- `react` -> `react`
- `react/jsx-runtime` -> `react`
- `@scope/pkg` -> `@scope/pkg`
- `@scope/pkg/subpath` -> `@scope/pkg`
- `node:fs` -> `node:fs`
- `""` -> `""`

The existing `classifyPackageImport()` assertions also verify that the extracted name is propagated into:

```ts
{
    target: "external-package", packageName;
}
```
````

# Expected Red State

The focused suite is expected to remain red until Step 5 because the helper module has not been implemented yet:

```text
Failed to resolve import "../lib/layer-boundary-import-specifiers.mjs"
```

# Verification

Focused command:

```bash
pnpm exec vitest run scripts/__tests__/layer-boundary-import-specifiers.test.ts
```

The red state is acceptable for this step as long as the failure is the missing helper module, not a test-shape or
syntax error.

````
### 4. Update the Stage 3 traceability checklist

Update:

```text
traceability-log/stage_3_extract_import_specifier_helpers.md
````

Mark Step 4 complete, for example:

```markdown
- [x] ~~Step 4: Test package-name extraction.~~
  - Package-name extraction cases are pinned in `scripts/__tests__/layer-boundary-import-specifiers.test.ts`.
  - The expected red state remains the missing `scripts/lib/layer-boundary-import-specifiers.mjs` module.
```

## Test Plan

Run only the focused Vitest file:

```bash
pnpm exec vitest run scripts/__tests__/layer-boundary-import-specifiers.test.ts
```

Expected result before Step 5:

```text
Failed to resolve import "../lib/layer-boundary-import-specifiers.mjs"
```

Treat the result as valid for Step 4 only if the failure is caused by the missing implementation module.

If the run fails because of syntax errors, malformed test tables, incorrect imports, or unrelated suites being executed,
fix the test/documentation issue within this step before marking it complete.

## Definition of Done

Step 4 is complete when:

- `packageNameFromImportPath()` package-name cases are present in the focused test file.
- `classifyPackageImport()` propagation coverage is present.
- `traceability-log/step_4_test_package_name_extraction.md` exists and records the expected red state.
- `traceability-log/stage_3_extract_import_specifier_helpers.md` marks Step 4 complete.
- No implementation file is added yet.
- No classifier behaviour changes are made.

## Assumptions

- Step 4 is a characterization and traceability step, not an implementation step.
- Existing `describe` / `it.each` style remains appropriate for this helper-level suite.
- Empty-string extraction remains a compatibility pin.
- Step 5 will implement `scripts/lib/layer-boundary-import-specifiers.mjs` and turn this focused suite green.
