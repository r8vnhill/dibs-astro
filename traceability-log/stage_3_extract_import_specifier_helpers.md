# [PLAN] Stage 3: Extract Import-Specifier Helpers

## Summary

Extract import-specifier normalization from `scripts/lib/layer-boundary-classification.mjs` into a focused helper module
while preserving all classifier and rule-evaluator behaviour pinned by Stages 1 and 2.

Use:

```text
scripts/lib/layer-boundary-import-specifiers.mjs
```

because `scripts/lib/layer-boundary-imports.mjs` already owns source-text import extraction.

This stage is a **behaviour-preserving refactor**. It should not change rule semantics, result shapes, path
normalization, or architecture-checker policy.

---

## Goals

1. Centralize import-record and specifier classification logic.
2. Keep filesystem/project path normalization in `layer-boundary-paths.mjs`.
3. Keep source-text import extraction in `layer-boundary-imports.mjs`.
4. Preserve the public classifier API.
5. Preserve current evaluator behaviour from Stage 2.
6. Add focused helper tests so future changes can tighten behaviour safely.

The broader cleanup plan already identifies this seam: import-specifier logic should be centralised outside
path-normalisation utilities, while exported classifier functions and rule semantics remain stable.

---

## Non-goals

- Do not replace source/target predicate wrappers yet.
- Do not introduce declarative path rule tables.
- Do not change rule-evaluation semantics.
- Do not rename `status: "violation"` or any result fields.
- Do not classify Node built-ins separately.
- Do not read aliases from Astro, Vite, or TypeScript config.
- Do not introduce a new dependency.
- Do not tighten empty import-path behaviour in this stage.

---

# Compatibility Decisions

## 1. Preserve the empty-string quirk for now

The current `isBarePackageImport("")` path classifies an empty string as a bare package because it is not relative, not
an alias, not absolute, and does not start with `src/`. Then package extraction returns an empty package name. This is
undesirable, but it is current behaviour.

So Stage 3 should preserve:

```ts
classifyUnresolvedImport("");
```

as an external-package-shaped result for now.

Add a test named clearly, for example:

```ts
it("preserves the current empty import path compatibility behavior", () => {});
```

Then defer tightening to a later corrective stage.

## 2. Keep malformed non-empty invalid values fail-fast

Malformed records with missing, `undefined`, `null`, or non-string import paths should continue to throw. The cleanup
plan’s target policy is that malformed records fail fast, while unresolved but valid imports classify deterministically.

Recommended behaviour for Stage 3:

- missing both `importPath` and `target` → `TypeError`;
- `importPath: undefined`, `target: undefined` → `TypeError`;
- `importPath: null`, no usable `target` → `TypeError`;
- `importPath: 42` → `TypeError`;
- `importPath: ""` → preserve current external-package-shaped behaviour.

This distinction should be explicit in the tests.

## 3. Preserve `classifyPackageImport()` as an exported classifier API

`classifyPackageImport()` is currently exported from `layer-boundary-classification.mjs`.

After extraction, keep this export stable. The cleanest approach is:

```js
export { classifyPackageImport } from "./layer-boundary-import-specifiers.mjs";
```

or keep a tiny delegating function in `layer-boundary-classification.mjs`.

Do not force callers to import the new helper module unless they are new focused tests.

---

# Proposed Helper Module

Add:

```text
scripts/lib/layer-boundary-import-specifiers.mjs
```

Recommended exports:

```js
export function extractImportPath(importRecord) {}
export function classifyImportKind(kind) {}
export function isRelativeImport(importPath) {}
export function isProjectAliasImport(importPath) {}
export function isBarePackageImport(importPath) {}
export function classifyPackageImport(importPath) {}
export function packageNameFromImportPath(importPath) {}
export function classifyUnresolvedImport(importPath) {}
```

Suggested responsibility split:

- `extractImportPath()` handles `importPath ?? target` fallback.
- `classifyImportKind()` maps parser-level import kinds to `"type"` or `"value"`.
- `isRelativeImport()`, `isProjectAliasImport()`, and `isBarePackageImport()` classify unresolved specifiers.
- `packageNameFromImportPath()` extracts only the package name.
- `classifyPackageImport()` returns `{ target: "external-package", packageName }`.
- `classifyUnresolvedImport()` returns either:

  - `{ target: "external-package", packageName }`;
  - `{ target: "unknown" }`.

The current classifier treats only `type-import` and `type-re-export` as type imports; all other kinds are value
imports. That fail-closed behaviour should be preserved exactly.

---

# Implementation Steps

## ~~Step 1: Add focused helper tests first~~

Status: complete.

Added `scripts/__tests__/layer-boundary-import-specifiers.test.ts` with focused helper-level coverage. The expected
red-state verification currently fails only because `scripts/lib/layer-boundary-import-specifiers.mjs` has not been
created yet.

Create:

```text
scripts/__tests__/layer-boundary-import-specifiers.test.ts
```

Add tests for `extractImportPath()`:

| Record                                         | Expected                                |
| ---------------------------------------------- | --------------------------------------- |
| `{ importPath: "react" }`                      | `"react"`                               |
| `{ target: "react" }`                          | `"react"`                               |
| `{ importPath: "react", target: "fallback" }`  | `"react"`                               |
| `{ importPath: "", target: "fallback" }`       | `""`, preserving current `??` behaviour |
| `{}`                                           | throws                                  |
| `{ importPath: undefined, target: undefined }` | throws                                  |
| `{ importPath: null }`                         | throws                                  |
| `{ importPath: 42 }`                           | throws                                  |

Be careful with `null`: current `importPath ?? target` treats `null` as absent, so if no `target` exists the extracted
value becomes `undefined`. The new helper can still throw a deliberate `TypeError` while preserving the observable
fail-fast result.

## ~~Step 2: Test import-kind classification~~

Add table-driven cases:

| Input kind           | Expected |
| -------------------- | -------- |
| `import`             | `value`  |
| `re-export`          | `value`  |
| `dynamic-import`     | `value`  |
| `type-import`        | `type`   |
| `type-re-export`     | `type`   |
| `future-parser-kind` | `value`  |
| `undefined`          | `value`  |

This preserves the conservative default already present in the classifier.

## ~~Step 3: Test specifier classification~~

Status: complete.

Added `classifyUnresolvedImport()` tests to `scripts/__tests__/layer-boundary-import-specifiers.test.ts` for unresolved
relative, alias, absolute, source-root, package, scoped package, `node:fs`, and empty-string specifiers. The focused
red-state verification still fails because `scripts/lib/layer-boundary-import-specifiers.mjs` has not been created yet.

Add tests for:

### Relative imports

```text
./local
../shared/local
.
..
```

Expected:

```js
{
    target: "unknown";
}
```

### Project aliases

```text
~
~/components/Button
$content/course
$generated
```

Expected:

```js
{
    target: "unknown";
}
```

The current alias matcher handles `~`, `~/...`, and `$...` prefixes.

### Absolute and source-root specifiers

```text
/absolute/path
src/domain/model
src/components/Button
```

Expected:

```js
{
    target: "unknown";
}
```

### Bare packages

```text
react
react/jsx-runtime
@scope/pkg
@scope/pkg/subpath
node:fs
```

Expected external-package-shaped results, preserving current behaviour.

## ~~Step 4: Test package-name extraction~~

Status: complete.

Package-name extraction cases are pinned in `scripts/__tests__/layer-boundary-import-specifiers.test.ts` through direct
`packageNameFromImportPath()` coverage and supporting `classifyPackageImport()` propagation coverage. The focused
red-state verification still fails because `scripts/lib/layer-boundary-import-specifiers.mjs` has not been created yet.

Add direct `packageNameFromImportPath()` tests:

| Import path          | Expected package name     |
| -------------------- | ------------------------- |
| `react`              | `react`                   |
| `react/jsx-runtime`  | `react`                   |
| `@scope/pkg`         | `@scope/pkg`              |
| `@scope/pkg/subpath` | `@scope/pkg`              |
| `node:fs`            | `node:fs`                 |
| `""`                 | `""`, compatibility quirk |

The current scoped package logic uses a scoped-package pattern and falls back to the full import path when a scoped
match is absent.

## ~~Step 5: Implement the helper module~~

Status: complete. `scripts/lib/layer-boundary-import-specifiers.mjs` now owns the import-specifier helpers, and the focused helper suite plus the classifier and rule-evaluation regression suites pass.

Move only import-specifier logic from `layer-boundary-classification.mjs`:

- `scopedPackagePattern`;
- `isRelativeImport()`;
- `isProjectAliasImport()`;
- `isBarePackageImport()`;
- `importPathFrom()` renamed to `extractImportPath()`;
- `classifiedImportKind()` renamed to `classifyImportKind()`;
- package-name extraction;
- unresolved import classification.

Do not move:

- `normalizeProjectPath()`;
- source-layer predicates;
- target predicates;
- `SOURCE_LAYERS`;
- `TARGETS`;
- `classifySourcePath()`;
- `classifyResolvedTarget()`.

The current classification file still contains path-layer predicates and ordered target arrays; those belong to the
later declarative-rule stage, not this extraction.

## ~~Step 6: Wire `layer-boundary-classification.mjs` to the helper~~

Status: complete. `scripts/lib/layer-boundary-classification.mjs` now delegates unresolved import-specifier handling to `scripts/lib/layer-boundary-import-specifiers.mjs` while preserving the public classifier API and the resolved-target path logic.

Update `classifyImport()` so it delegates import-specifier concerns:

```js
import {
    classifyImportKind,
    classifyPackageImport,
    classifyUnresolvedImport,
    extractImportPath,
} from "./layer-boundary-import-specifiers.mjs";
```

Expected shape:

```js
export function classifyImport(importRecord, resolvedPath) {
    const importPath = extractImportPath(importRecord);
    const importKind = classifyImportKind(importRecord.kind);

    if (resolvedPath) {
        const normalizedPath = normalizeProjectPath(resolvedPath);

        return {
            importPath,
            importKind,
            resolvedPath: normalizedPath,
            target: classifyResolvedTarget(normalizedPath),
        };
    }

    return {
        importPath,
        importKind,
        ...classifyUnresolvedImport(importPath),
    };
}
```

Then preserve the old package import export:

```js
export { classifyPackageImport } from "./layer-boundary-import-specifiers.mjs";
```

This keeps `classifyImport()` behaviour stable while making unresolved import classification independently testable.

## Step 7: Run Stage 1 and Stage 2 tests as safety nets

Run the focused helper tests first, then the already-pinned integration contract suites:

```bash
pnpm test:unit -- scripts/__tests__/layer-boundary-import-specifiers.test.ts
pnpm test:unit -- scripts/__tests__/layer-boundary-classification.test.ts scripts/__tests__/layer-boundary-rule-evaluation.test.ts
```

Then run:

```bash
pnpm run check:architecture
```

The previous plan already uses classification and rule-evaluation tests as the safety net after import-helper
extraction.

---

# Recommended Test Organization

```ts
describe("layer-boundary-import-specifiers", () => {
    describe("extractImportPath", () => {});
    describe("classifyImportKind", () => {});
    describe("packageNameFromImportPath", () => {});
    describe("classifyPackageImport", () => {});
    describe("classifyUnresolvedImport", () => {});
    describe("specifier predicates", () => {});
});
```

Use `it.each` tables for all pure classification cases.

---

# Verification

Run:

```bash
pnpm test:unit -- scripts/__tests__/layer-boundary-import-specifiers.test.ts
```

Then:

```bash
pnpm test:unit -- scripts/__tests__/layer-boundary-classification.test.ts scripts/__tests__/layer-boundary-rule-evaluation.test.ts
```

Then:

```bash
pnpm run check:architecture
```

Optional, if available and cheap:

```bash
pnpm test:unit -- scripts/__tests__/layer-boundary-checker.test.ts
```

---

# Acceptance Criteria

Stage 3 is complete when:

- `scripts/lib/layer-boundary-import-specifiers.mjs` exists;
- import-specifier logic is removed from `layer-boundary-classification.mjs`;
- source/target path classification remains in `layer-boundary-classification.mjs`;
- project path normalization remains in `layer-boundary-paths.mjs`;
- source-text import extraction remains in `layer-boundary-imports.mjs`;
- `classifyImport()` returns the same shapes as before;
- `classifyPackageImport()` remains available from `layer-boundary-classification.mjs`;
- type import classification remains unchanged;
- unknown import kinds still classify as `"value"`;
- unresolved relative, alias, absolute, and `src/...` specifiers still classify as `unknown`;
- unresolved bare packages still classify as `external-package`;
- scoped package names remain intact;
- empty import paths preserve the current external-package-shaped compatibility quirk;
- malformed records throw `TypeError`;
- Stage 1 and Stage 2 tests remain green;
- `pnpm run check:architecture` passes;
- no new dependency is introduced.

---

# Revised TDD Cycle Plan

## Cycle 1: Freeze helper-level import-path extraction

**Test first**

Add `extractImportPath()` tests for `importPath`, legacy `target`, precedence, malformed values, and empty string.

**Smallest move**

Add the new helper test file.

**Payoff**

Makes the parser-record boundary explicit before moving logic.

**Verify**

```bash
pnpm test:unit -- scripts/__tests__/layer-boundary-import-specifiers.test.ts
```

## Cycle 2: Extract import-kind and package helpers

**Test first**

Add `classifyImportKind()`, `packageNameFromImportPath()`, and `classifyPackageImport()` tables.

**Smallest move**

Implement those helpers and re-export `classifyPackageImport()` from the classifier module.

**Payoff**

Preserves exported API while reducing classifier responsibilities.

**Verify**

```bash
pnpm test:unit -- scripts/__tests__/layer-boundary-import-specifiers.test.ts scripts/__tests__/layer-boundary-classification.test.ts
```

## Cycle 3: Extract unresolved-specifier classification

**Test first**

Add `classifyUnresolvedImport()` cases for relative, alias, absolute, `src/...`, bare package, scoped package,
`node:fs`, and empty string.

**Smallest move**

Move `isRelativeImport()`, `isProjectAliasImport()`, and `isBarePackageImport()` into the new helper module.

**Payoff**

Creates one source of truth for unresolved import classification.

**Verify**

```bash
pnpm test:unit -- scripts/__tests__/layer-boundary-import-specifiers.test.ts scripts/__tests__/layer-boundary-classification.test.ts
```

## Cycle 4: Wire classifier and verify downstream behaviour

**Test first**

No new tests unless Stage 1 or Stage 2 exposes a missing case.

**Smallest move**

Update `classifyImport()` to delegate to the new helper module.

**Payoff**

Completes the extraction without changing classifier or evaluator behaviour.

**Verify**

```bash
pnpm test:unit -- scripts/__tests__/layer-boundary-classification.test.ts scripts/__tests__/layer-boundary-rule-evaluation.test.ts
pnpm run check:architecture
```
