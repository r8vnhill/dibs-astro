# [DONE] Stage 1 — Characterize the Current Classifier Contract

## Summary

Freeze the observable behaviour of `scripts/lib/layer-boundary-classification.mjs` before any extraction or refactor.

Status: implemented as characterization tests in `scripts/__tests__/layer-boundary-classification.test.ts` and
`scripts/__tests__/layer-boundary-rule-evaluation.test.ts`. No production code was changed in this stage.

This stage is test-only unless a test reveals that the current implementation already contradicts an explicitly accepted
policy. In that case, do **not** fold the fix into Stage 1 silently; either record the mismatch as a known follow-up or
split it into a separate corrective stage.

The goal is to pin down the exact contract for:

- source-layer classification;
- resolved-target classification;
- overlapping path precedence;
- project path normalization;
- unresolved import handling;
- package-name extraction;
- import-kind classification;
- malformed import records;
- downstream rule-evaluation consumption.

The broader cleanup plan already identifies these as the key seams: preserve exported APIs and rule semantics, make
precedence explicit, centralize import-specifier logic later, classify unknown import kinds as value imports, and fail
fast on malformed records.

---

## Stage Boundary

### In scope

- Add characterization tests.
- Add table-driven coverage for current classifier behaviour.
- Add focused downstream rule-evaluation coverage only where it protects the classifier contract.
- Confirm whether current malformed-record behaviour matches the intended fail-fast policy.
- Record the currently observed exception shape for malformed records so later refactors can tighten it if needed.

### Out of scope

- No helper extraction.
- No declarative rule-table refactor.
- No rule-semantics change.
- No package-script changes.
- No Astro integration work.
- No new dependency.
- No cleanup of implementation duplication.

---

## Important Policy Check

### Malformed records need a compatibility check

The desired staged plan says malformed records should fail fast with a clear `TypeError`, while unresolved but valid
imports should classify as `unknown`.

However, the current implementation appears to derive the import path using:

```js
importRecord.importPath ?? importRecord.target;
```

and then calls import-path helpers that expect a string. That may already throw, but the thrown error may be accidental
rather than a clear `TypeError`.

So Stage 1 should distinguish two things:

1. **Current behaviour characterization:** what actually happens today.
2. **Desired policy assertion:** what the traceability plan wants going forward.

Recommended handling:

- If the current error is already clear and stable, lock it in Stage 1.
- If the current error is vague, add a characterization test for the current failure mode and mark the clear `TypeError`
  as a Stage 3 helper-extraction acceptance criterion.
- Do not change production code in Stage 1 just to improve the error.

Current observation from the characterization suite: missing `importPath`/`target`, `null`, and numeric values throw a
`TypeError`, but an empty string is still classified as an external package with an empty `packageName`. That policy gap
is recorded here as a follow-up rather than being corrected in Stage 1.

---

# Steps

## Step 1: Add a table-driven source-layer matrix

Extend:

```text
scripts/__tests__/layer-boundary-classification.test.ts
```

Cover `classifySourcePath()` for all known source layers:

| Path                                      | Expected layer         |
| ----------------------------------------- | ---------------------- |
| `src/domain/model.ts`                     | `domain`               |
| `src/application/use-case.ts`             | `application`          |
| `src/infrastructure/repository.ts`        | `infrastructure`       |
| `src/presentation/adapters/navigation.ts` | `presentation-adapter` |
| `src/components/Button.astro`             | `ui`                   |
| `src/layouts/BaseLayout.astro`            | `ui`                   |
| `src/pages/index.astro`                   | `ui`                   |
| `packages/content-core/src/index.ts`      | `content-core`         |
| `packages/site-core/src/index.ts`         | `site-core`            |
| `scripts/check-layer-boundaries.mjs`      | `unknown`              |

Also include Windows-style path input if `normalizeProjectPath()` supports it:

| Path                    | Expected normalized path | Expected layer |
| ----------------------- | ------------------------ | -------------- |
| `src\\domain\\model.ts` | `src/domain/model.ts`    | `domain`       |

### Verification

```bash
pnpm test:unit -- scripts/__tests__/layer-boundary-classification.test.ts
```

---

## Step 2: Add a table-driven resolved-target matrix

Cover `classifyResolvedTarget()` for all known target classes:

| Path                                      | Expected target        |
| ----------------------------------------- | ---------------------- |
| `src/domain/model.ts`                     | `domain`               |
| `src/application/use-case.ts`             | `application`          |
| `src/infrastructure/repository.ts`        | `infrastructure`       |
| `src/presentation/adapters/navigation.ts` | `presentation-adapter` |
| `src/presentation/catalog.ts`             | `presentation`         |
| `src/components/Button.astro`             | `ui`                   |
| `src/layouts/BaseLayout.astro`            | `ui`                   |
| `src/pages/index.astro`                   | `ui`                   |
| `src/data/course.generated.json`          | `generated-data`       |
| `src/data/course.generated.jsonld`        | `generated-data`       |
| `src/data/course.json`                    | `data`                 |
| `src/utils/path.ts`                       | `utils`                |
| `src/assets/logo.svg`                     | `assets`               |
| `src/styles/global.css`                   | `styles`               |
| `packages/content-core/src/index.ts`      | `content-core`         |
| `packages/site-core/src/index.ts`         | `site-core`            |
| `scripts/utility.mjs`                     | `unknown`              |

This locks the current `TARGETS` order, where `presentation-adapter` appears before `presentation`, and `generated-data`
appears before `data`.

### Verification

```bash
pnpm test:unit -- scripts/__tests__/layer-boundary-classification.test.ts
```

---

## Step 3: Add precedence and sibling false-positive tests

Add explicit tests for precedence-sensitive overlaps.

### Precedence cases

```text
src/presentation/adapters/foo.ts -> presentation-adapter
src/presentation/foo.ts -> presentation
src/data/foo.generated.json -> generated-data
src/data/foo.generated.jsonld -> generated-data
src/data/foo.json -> data
```

### Sibling false positives

```text
src/domain-extra/foo.ts -> unknown
src/application-extra/foo.ts -> unknown
src/infrastructure-extra/foo.ts -> unknown
src/datax/file.json -> unknown
src/presentation-adapters/foo.ts -> unknown
packages/site-core-extra/src/index.ts -> unknown
packages/content-core-extra/src/index.ts -> unknown
```

The cleanup plan explicitly treats these overlap rules as part of the intended order contract, not an incidental
implementation detail.

### Verification

```bash
pnpm test:unit -- scripts/__tests__/layer-boundary-classification.test.ts
```

---

## Step 4: Characterize `classifyPackageImport()`

Add focused package-name extraction tests.

| Import path             | Expected package name               |
| ----------------------- | ----------------------------------- |
| `react`                 | `react`                             |
| `react/jsx-runtime`     | `react`                             |
| `@astrojs/react`        | `@astrojs/react`                    |
| `@astrojs/react/server` | `@astrojs/react`                    |
| `@scope/pkg/sub/path`   | `@scope/pkg`                        |
| `node:fs`               | current behaviour, likely `node:fs` |

Do not introduce a `node-builtin` target in Stage 1. The existing cleanup plan treats that as a possible future
enhancement, not part of this characterization stage.

### Verification

```bash
pnpm test:unit -- scripts/__tests__/layer-boundary-classification.test.ts
```

---

## Step 5: Characterize unresolved import classification

Cover `classifyImport(importRecord, undefined)`.

### Bare package imports

Expected target: `external-package`.

```ts
[
    { importPath: "react", kind: "import" },
    { importPath: "react/jsx-runtime", kind: "import" },
    { importPath: "@astrojs/react", kind: "import" },
    { importPath: "@astrojs/react/server", kind: "import" },
];
```

Assert:

- `target: "external-package"`;
- `packageName` is present;
- `resolvedPath` is absent;
- `importKind` is `"value"` for normal imports.

### Unknown unresolved imports

Expected target: `unknown`.

```ts
[
    { importPath: "./local", kind: "import" },
    { importPath: "../domain/model", kind: "import" },
    { importPath: "~/components/Button", kind: "import" },
    { importPath: "$content/something", kind: "import" },
    { importPath: "/absolute/path", kind: "import" },
    { importPath: "src/domain/model", kind: "import" },
];
```

The current implementation treats bare non-relative, non-alias, non-absolute, non-`src/` specifiers as external
packages; everything else unresolved falls back to `unknown`.

### Fallback import path field

Add cases for `target` fallback:

```ts
{ target: "react", kind: "import" }
{ target: "./local", kind: "import" }
```

This locks the current `importPath ?? target` behaviour before extraction.

### Verification

```bash
pnpm test:unit -- scripts/__tests__/layer-boundary-classification.test.ts
```

---

## Step 6: Characterize resolved import classification

Cover `classifyImport(importRecord, resolvedPath)`.

Cases:

| Import record                                                   | Resolved path                      | Expected target        |
| --------------------------------------------------------------- | ---------------------------------- | ---------------------- |
| `{ importPath: "~/domain/model", kind: "import" }`              | `src/domain/model.ts`              | `domain`               |
| `{ importPath: "~/presentation/adapters/nav", kind: "import" }` | `src/presentation/adapters/nav.ts` | `presentation-adapter` |
| `{ importPath: "~/data/course", kind: "import" }`               | `src/data/course.generated.json`   | `generated-data`       |
| `{ importPath: "react", kind: "import" }`                       | `src/utils/react-shim.ts`          | `utils`                |

Important assertion: when `resolvedPath` is provided, resolved-target classification wins over package/import-specifier
classification. The cleanup plan also identifies this downstream resolved-vs-package distinction as a contract to
preserve.

### Verification

```bash
pnpm test:unit -- scripts/__tests__/layer-boundary-classification.test.ts
```

---

## Step 7: Characterize import-kind handling

Add tests for `classifyImport()` import kinds.

| Input kind           | Expected `importKind` |
| -------------------- | --------------------- |
| `import`             | `value`               |
| `re-export`          | `value`               |
| `dynamic-import`     | `value`               |
| `type-import`        | `type`                |
| `type-re-export`     | `type`                |
| `future-parser-kind` | `value`               |

Current implementation explicitly treats only `type-import` and `type-re-export` as type imports; all other kinds fall
back to value imports.

### Verification

```bash
pnpm test:unit -- scripts/__tests__/layer-boundary-classification.test.ts
```

---

## Step 8: Characterize malformed import records

Add tests for records with invalid import-path data.

Recommended cases:

```ts
{ kind: "import" }
{ importPath: undefined, target: undefined, kind: "import" }
{ importPath: null, kind: "import" }
{ importPath: "", kind: "import" }
{ importPath: 42, kind: "import" }
```

Expected result policy:

- Missing or invalid import-path data should fail.
- If the current implementation throws a vague native error, lock the current failure only as a characterization and add
  a TODO for Stage 3 to replace it with a clear `TypeError`.
- If it already throws a clear `TypeError`, assert the message.

Recommended assertion strategy for Stage 1:

```ts
expect(() => classifyImport(record, undefined)).toThrow();
```

Avoid over-specifying the message unless the current implementation already provides a deliberate message. This prevents
Stage 1 from forcing a production change.

### Verification

```bash
pnpm test:unit -- scripts/__tests__/layer-boundary-classification.test.ts
```

---

## Step 9: Add minimal downstream rule-evaluation contract tests

Only extend:

```text
scripts/__tests__/layer-boundary-rule-evaluation.test.ts
```

where classifier behaviour is consumed through the real boundary-checking flow.

Cover:

- package imports still appear as `external-package`;
- resolved imports still take precedence over package-looking specifiers;
- unresolved non-package imports still fall back to `unknown`;
- exceptions still match the same classified target/package data;
- type imports still receive the expected rule treatment;
- unknown import kinds remain fail-closed as value imports;
- malformed import records surface as classifier failures rather than producing misleading rule results.

Keep this minimal. The goal is not to duplicate the classifier matrix in the rule-evaluation suite.

The cleanup plan explicitly separates primary classifier characterization from downstream rule-evaluation confirmation.

### Verification

```bash
pnpm test:unit -- scripts/__tests__/layer-boundary-rule-evaluation.test.ts
```

---

# Recommended Test Structure

Use nested `describe` blocks so later stages can move or split helpers without losing intent:

```ts
describe("classifySourcePath", () => {
    describe("known source layers", () => {});
    describe("path normalization", () => {});
    describe("false positives", () => {});
});

describe("classifyResolvedTarget", () => {
    describe("known target classes", () => {});
    describe("precedence", () => {});
    describe("false positives", () => {});
});

describe("classifyPackageImport", () => {
    describe("package name extraction", () => {});
});

describe("classifyImport", () => {
    describe("unresolved imports", () => {});
    describe("resolved imports", () => {});
    describe("import kinds", () => {});
    describe("malformed records", () => {});
});
```

Prefer table-driven tests for classification matrices. They will remain useful after the rule-table refactor.

---

# Verification Plan

Run after each logical batch:

```bash
pnpm test:unit -- scripts/__tests__/layer-boundary-classification.test.ts
```

Run after downstream additions:

```bash
pnpm test:unit -- scripts/__tests__/layer-boundary-rule-evaluation.test.ts
```

Final Stage 1 verification:

```bash
pnpm test:unit -- scripts/__tests__/layer-boundary-classification.test.ts scripts/__tests__/layer-boundary-rule-evaluation.test.ts
pnpm run check:architecture
```

`pnpm run check:architecture` is useful here because Stage 1 is the safety baseline before the later refactor and
integration stages. The broader plan keeps that command available as the direct diagnostic path even after Astro becomes
the primary enforcement path.

---

# Acceptance Criteria

Stage 1 is complete when:

- `classifySourcePath()` is covered for every known source layer and unknown paths;
- `classifyResolvedTarget()` is covered for every known target class and unknown paths;
- Windows path normalization is covered;
- precedence-sensitive overlaps are explicitly tested;
- sibling false positives are explicitly tested;
- `classifyPackageImport()` is covered for scoped and unscoped packages;
- unresolved import handling is covered for packages, aliases, relative imports, absolute paths, and `src/...`
  specifiers;
- resolved import handling proves that `resolvedPath` wins over raw specifier shape;
- import kinds are covered for value imports, type imports, type re-exports, and future unknown kinds;
- malformed records are characterized without production changes;
- downstream rule-evaluation tests confirm only the consumer-facing contract;
- no production implementation is changed unless a separate corrective stage is created.

---

# Revised TDD Cycle Plan

## Cycle 1: Freeze source and target path classification

**Test first**

Add table-driven tests for `classifySourcePath()` and `classifyResolvedTarget()`.

**Smallest move**

Only add tests.

**Payoff**

Creates the baseline for later predicate-to-rule-table refactoring.

**Verify**

```bash
pnpm test:unit -- scripts/__tests__/layer-boundary-classification.test.ts
```

## Cycle 2: Freeze overlap precedence and false-positive boundaries

**Test first**

Add precedence and sibling false-positive cases.

**Smallest move**

Only add tests.

**Payoff**

Protects the most fragile part of ordered classification.

**Verify**

```bash
pnpm test:unit -- scripts/__tests__/layer-boundary-classification.test.ts
```

## Cycle 3: Freeze package and unresolved import classification

**Test first**

Add package extraction, unresolved package imports, aliases, relative imports, absolute paths, and `src/...` cases.

**Smallest move**

Only add tests.

**Payoff**

Creates a safe baseline for the later `layer-boundary-imports.mjs` extraction.

**Verify**

```bash
pnpm test:unit -- scripts/__tests__/layer-boundary-classification.test.ts
```

## Cycle 4: Freeze resolved imports and import kinds

**Test first**

Add resolved-path precedence cases and import-kind classification cases.

**Smallest move**

Only add tests.

**Payoff**

Locks the distinction between static import shape and resolved target shape.

**Verify**

```bash
pnpm test:unit -- scripts/__tests__/layer-boundary-classification.test.ts
```

## Cycle 5: Freeze malformed-record and downstream behaviour

**Test first**

Add malformed-record tests and the minimal rule-evaluation consumer checks.

**Smallest move**

Only add tests.

**Payoff**

Prevents later extraction from hiding parser-contract failures or changing rule-evaluation behaviour.

**Verify**

```bash
pnpm test:unit -- scripts/__tests__/layer-boundary-classification.test.ts scripts/__tests__/layer-boundary-rule-evaluation.test.ts
```
