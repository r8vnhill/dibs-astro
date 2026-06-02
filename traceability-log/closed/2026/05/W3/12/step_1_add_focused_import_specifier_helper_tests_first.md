# [DONE] Step 1: Add Focused Import-Specifier Helper Tests First

## Completion Summary

Step 1 is complete. Added:

```text
scripts/__tests__/layer-boundary-import-specifiers.test.ts
```

The new test suite defines the planned helper-level contract for:

- `extractImportPath()`;
- `classifyImportKind()`;
- `isRelativeImport()`;
- `isProjectAliasImport()`;
- `isBarePackageImport()`;
- `packageNameFromImportPath()`;
- `classifyPackageImport()`;
- `classifyUnresolvedImport()`.

The suite explicitly covers malformed records, unknown import kinds, scoped packages, `node:fs`, unresolved non-package
specifiers, and the current empty-string compatibility behavior.

Verification:

```bash
pnpm test:unit -- scripts/__tests__/layer-boundary-import-specifiers.test.ts
```

Result: failed for the expected Step 1 reason. Vitest could not resolve:

```text
../lib/layer-boundary-import-specifiers.mjs
```

This is acceptable for Step 1 because the helper module is intentionally created in the next implementation step.

## Summary

Add a new focused test suite for the future import-specifier helper module before moving production code out of
`scripts/lib/layer-boundary-classification.mjs`.

This step is **test-only**. It defines the intended helper-level contract for import-record extraction, import-kind
classification, specifier predicates, package-name extraction, and unresolved-import classification.

The suite may initially fail because the target module does not exist yet:

```text
scripts/lib/layer-boundary-import-specifiers.mjs
```

That failure is acceptable for Step 1. Any failure after the module exists should represent a real implementation
mismatch.

---

## Goal

Create a small, precise test suite that lets the next step implement `layer-boundary-import-specifiers.mjs` without
changing classifier or rule-evaluator behaviour.

This suite should test only import-specifier concerns. It should not duplicate source-layer or resolved-target
classification already covered by Stage 1.

---

## Non-goals

- Do not create the helper module in this step.
- Do not edit `layer-boundary-classification.mjs`.
- Do not edit `layer-boundary-imports.mjs`.
- Do not move path-normalization logic.
- Do not change the empty-import-path compatibility behaviour.
- Do not introduce new dependencies.
- Do not test source/target layer classification here.

---

# Test File

Create:

```text
scripts/__tests__/layer-boundary-import-specifiers.test.ts
```

Planned import:

```ts
import {
    classifyImportKind,
    classifyPackageImport,
    classifyUnresolvedImport,
    extractImportPath,
    isBarePackageImport,
    isProjectAliasImport,
    isRelativeImport,
    packageNameFromImportPath,
} from "../lib/layer-boundary-import-specifiers.mjs";
```

If the project’s existing tests use a different relative import style, follow the local convention.

---

# Test Organization

Use BDD-style groups and table-driven cases:

```ts
describe("layer-boundary import specifiers", () => {
    describe("extractImportPath", () => {});
    describe("classifyImportKind", () => {});
    describe("specifier predicates", () => {});
    describe("package helpers", () => {});
    describe("classifyUnresolvedImport", () => {});
});
```

Keep the tests helper-level. Do not call `classifySourcePath()` or `classifyResolvedTarget()` from this suite.

---

# Test Cases

## 1. `extractImportPath()`

### Valid records

Cover:

| Record                                        | Expected  |
| --------------------------------------------- | --------- |
| `{ importPath: "react" }`                     | `"react"` |
| `{ target: "react" }`                         | `"react"` |
| `{ importPath: "react", target: "fallback" }` | `"react"` |
| `{ importPath: "", target: "fallback" }`      | `""`      |

The empty-string case is important because the current implementation effectively preserves `importPath` over `target`
via nullish coalescing semantics. This is a compatibility quirk, not a recommended long-term policy.

### Malformed records

Cover:

| Record                                         | Expected           |
| ---------------------------------------------- | ------------------ |
| `{}`                                           | throws `TypeError` |
| `{ importPath: undefined, target: undefined }` | throws `TypeError` |
| `{ importPath: null }`                         | throws `TypeError` |
| `{ importPath: 42 }`                           | throws `TypeError` |
| `undefined`                                    | throws `TypeError` |
| `null`                                         | throws `TypeError` |

Suggested assertion:

```ts
expect(() => extractImportPath(record)).toThrow(TypeError);
```

Avoid over-specifying the message in Step 1 unless the message is already part of the agreed helper contract.

---

## 2. `classifyImportKind()`

Use a table:

| Input kind             | Expected  |
| ---------------------- | --------- |
| `"type-import"`        | `"type"`  |
| `"type-re-export"`     | `"type"`  |
| `"static-import"`      | `"value"` |
| `"side-effect-import"` | `"value"` |
| `"re-export"`          | `"value"` |
| `"dynamic-import"`     | `"value"` |
| `"future-parser-kind"` | `"value"` |
| `undefined`            | `"value"` |
| `null`                 | `"value"` |

This locks the conservative fail-closed behaviour: unknown import kinds are treated as value imports.

---

## 3. Specifier predicates

### `isRelativeImport()`

Expected `true`:

```text
.
..
./local
../shared
```

Expected `false`:

```text
react
~/components/Button
$content/course
/absolute/path
src/domain/model
```

### `isProjectAliasImport()`

Expected `true`:

```text
~
~/components/Button
$content/course
$generated
$generated/file
```

Expected `false`:

```text
react
./local
../shared
/absolute/path
src/domain/model
```

### `isBarePackageImport()`

Expected `true`:

```text
react
react/jsx-runtime
@scope/pkg
@scope/pkg/subpath
node:fs
```

Include the empty string explicitly as a compatibility case:

```text
""
```

Expected `false`:

```text
.
..
./local
../shared
~
~/components/Button
$content/course
/absolute/path
src/domain/model
```

Name the empty-string test clearly:

```ts
it("preserves the current empty-string bare-package compatibility behaviour", () => {});
```

---

## 4. Package helpers

### `packageNameFromImportPath()`

Use a table:

| Import path            | Expected package name |
| ---------------------- | --------------------- |
| `"react"`              | `"react"`             |
| `"react/jsx-runtime"`  | `"react"`             |
| `"@scope/pkg"`         | `"@scope/pkg"`        |
| `"@scope/pkg/subpath"` | `"@scope/pkg"`        |
| `"node:fs"`            | `"node:fs"`           |
| `""`                   | `""`                  |

### `classifyPackageImport()`

Assert the exact external-package-shaped object:

```ts
expect(classifyPackageImport("react")).toEqual({
    target: "external-package",
    packageName: "react",
});
```

Also include scoped and empty-string compatibility cases:

```ts
expect(classifyPackageImport("@scope/pkg/subpath")).toEqual({
    target: "external-package",
    packageName: "@scope/pkg",
});

expect(classifyPackageImport("")).toEqual({
    target: "external-package",
    packageName: "",
});
```

---

## 5. `classifyUnresolvedImport()`

### Unknown unresolved specifiers

Expected:

```ts
{
    target: "unknown";
}
```

For:

```text
.
..
./local
../shared
~
~/components/Button
$content/course
$generated
/absolute/path
src/domain/model
src/components/Button
```

### External-package-shaped unresolved specifiers

Expected:

```ts
{ target: "external-package", packageName: ... }
```

For:

```text
react
react/jsx-runtime
@scope/pkg
@scope/pkg/subpath
node:fs
""
```

Again, make the empty-string behaviour explicit:

```ts
it("preserves the current empty import path compatibility behaviour", () => {
    expect(classifyUnresolvedImport("")).toEqual({
        target: "external-package",
        packageName: "",
    });
});
```

---

# Suggested Test Skeleton

```ts
import { describe, expect, it } from "vitest";

import {
    classifyImportKind,
    classifyPackageImport,
    classifyUnresolvedImport,
    extractImportPath,
    isBarePackageImport,
    isProjectAliasImport,
    isRelativeImport,
    packageNameFromImportPath,
} from "../lib/layer-boundary-import-specifiers.mjs";

describe("layer-boundary import specifiers", () => {
    describe("extractImportPath", () => {
        it.each([
            [{ importPath: "react" }, "react"],
            [{ target: "react" }, "react"],
            [{ importPath: "react", target: "fallback" }, "react"],
            [{ importPath: "", target: "fallback" }, ""],
        ])("extracts %j as %s", (record, expected) => {
            expect(extractImportPath(record)).toBe(expected);
        });

        it.each([
            [{}],
            [{ importPath: undefined, target: undefined }],
            [{ importPath: null }],
            [{ importPath: 42 }],
            [undefined],
            [null],
        ])("throws TypeError for malformed record %j", (record) => {
            expect(() => extractImportPath(record)).toThrow(TypeError);
        });
    });

    describe("classifyImportKind", () => {
        it.each([
            ["type-import", "type"],
            ["type-re-export", "type"],
            ["static-import", "value"],
            ["side-effect-import", "value"],
            ["re-export", "value"],
            ["dynamic-import", "value"],
            ["future-parser-kind", "value"],
            [undefined, "value"],
            [null, "value"],
        ])("classifies %s as %s", (kind, expected) => {
            expect(classifyImportKind(kind)).toBe(expected);
        });
    });

    describe("specifier predicates", () => {
        it.each([".", "..", "./local", "../shared"])(
            "classifies %s as relative",
            (specifier) => {
                expect(isRelativeImport(specifier)).toBe(true);
            },
        );

        it.each(["~", "~/components/Button", "$content/course", "$generated"])(
            "classifies %s as a project alias",
            (specifier) => {
                expect(isProjectAliasImport(specifier)).toBe(true);
            },
        );

        it.each([
            "react",
            "react/jsx-runtime",
            "@scope/pkg",
            "@scope/pkg/subpath",
            "node:fs",
            "",
        ])("classifies %s as a bare package import", (specifier) => {
            expect(isBarePackageImport(specifier)).toBe(true);
        });
    });

    describe("package helpers", () => {
        it.each([
            ["react", "react"],
            ["react/jsx-runtime", "react"],
            ["@scope/pkg", "@scope/pkg"],
            ["@scope/pkg/subpath", "@scope/pkg"],
            ["node:fs", "node:fs"],
            ["", ""],
        ])("extracts package name from %s", (specifier, expected) => {
            expect(packageNameFromImportPath(specifier)).toBe(expected);
        });

        it("classifies package imports as external packages", () => {
            expect(classifyPackageImport("react")).toEqual({
                target: "external-package",
                packageName: "react",
            });
        });
    });

    describe("classifyUnresolvedImport", () => {
        it.each([
            ".",
            "..",
            "./local",
            "../shared",
            "~",
            "~/components/Button",
            "$content/course",
            "$generated",
            "/absolute/path",
            "src/domain/model",
            "src/components/Button",
        ])("classifies unresolved non-package specifier %s as unknown", (specifier) => {
            expect(classifyUnresolvedImport(specifier)).toEqual({
                target: "unknown",
            });
        });

        it.each([
            ["react", "react"],
            ["react/jsx-runtime", "react"],
            ["@scope/pkg", "@scope/pkg"],
            ["@scope/pkg/subpath", "@scope/pkg"],
            ["node:fs", "node:fs"],
            ["", ""],
        ])("classifies unresolved package specifier %s as external", (specifier, packageName) => {
            expect(classifyUnresolvedImport(specifier)).toEqual({
                target: "external-package",
                packageName,
            });
        });
    });
});
```

Adjust imports and test utilities to match the existing suite style.

---

# Verification

Run:

```bash
pnpm test:unit -- scripts/__tests__/layer-boundary-import-specifiers.test.ts
```

Expected result for Step 1 alone:

- acceptable failure: module not found for `layer-boundary-import-specifiers.mjs`;
- unacceptable failure: syntax errors, wrong relative path, inconsistent test assumptions, or failures unrelated to the
  missing module.

If the helper module already exists, the test should either pass or reveal implementation mismatches.

---

# Acceptance Criteria

Step 1 is complete when:

- `scripts/__tests__/layer-boundary-import-specifiers.test.ts` exists;
- the suite imports the planned helper API;
- helper-level tests cover extraction, import-kind classification, predicates, package helpers, and unresolved
  classification;
- empty-string compatibility is explicitly documented by test names or assertions;
- malformed records are expected to throw `TypeError`;
- no production files are changed;
- the only acceptable failure is the missing helper module.
