# [DONE] Stage 2: Characterize Downstream Rule Evaluation

## Completion Summary

Stage 2 is complete. The evaluator contract is now covered through `evaluateBoundaryRules()` without changing
production code.

Implemented coverage in `scripts/__tests__/layer-boundary-rule-evaluation.test.ts`:

- resolved imports win over package-looking specifiers;
- unresolved bare packages expose `external-package` and stable `packageName` data;
- scoped package names such as `@astrojs/react` remain intact;
- unresolved relative, alias, absolute, and `src/...` imports remain allowed as `unknown` by default;
- exact raw import-path and resolved-target exceptions still apply;
- near-miss exceptions do not apply and preserve the normal evaluator result;
- `type-import` and `type-re-export` preserve `importKind: "type"`;
- unknown import kinds preserve fail-closed `importKind: "value"`;
- malformed records with missing, `undefined`, `null`, or non-string import paths throw `TypeError`.

Documented current quirk:

- an empty import path is currently treated as an unresolved external-package-shaped import and is allowed by default.
  Stage 2 characterizes this behaviour instead of changing it; a later helper-extraction stage can decide whether to
  tighten it.

Verification:

```bash
pnpm test:unit -- scripts/__tests__/layer-boundary-rule-evaluation.test.ts
```

Result: passed. The project test script currently expands this invocation to the broader unit suite; the targeted
`scripts/__tests__/layer-boundary-rule-evaluation.test.ts` file passed with 39 tests.

## Summary

Add characterization coverage around `evaluateBoundaryRules()` as the real consumer of layer-boundary classifier output.

This stage is test-only unless a test reveals behaviour that is already ambiguous or inconsistent with the accepted
classifier contract. If that happens, do not silently change production code inside Stage 2; either document the
mismatch or split a separate corrective stage before refactoring.

The goal is to protect downstream behaviour before extracting import helpers or replacing path predicates with
declarative rules.

---

## Scope

### In scope

- Add or reshape tests in:

```text
scripts/__tests__/layer-boundary-rule-evaluation.test.ts
```

- Exercise `evaluateBoundaryRules()` through realistic import records and rule definitions.
- Assert consumer-visible outputs only.
- Confirm the evaluator sees the same classified shapes for:

  - resolved imports;
  - package imports;
  - scoped packages;
  - unresolved unknown imports;
  - exact exceptions;
  - near-miss exceptions;
  - type imports;
  - unknown import kinds;
  - malformed import records.

### Out of scope

- No classifier refactor.
- No helper extraction.
- No rule-model redesign.
- No renaming of `status: "violation"`.
- No terminology cleanup.
- No changes to public result shapes.
- No new dependency.
- No broad duplication of the Stage 1 classifier matrix.

---

# Test Strategy

## 1. Use evaluator-level fixtures

Prefer small fixture builders that describe the evaluator scenario, not classifier implementation details.

Suggested helpers:

```ts
function source(overrides = {}) {
    return {
        path: "src/domain/model.ts",
        layer: "domain",
        ...overrides,
    };
}

function importRecord(overrides = {}) {
    return {
        importPath: "src/infrastructure/repository.ts",
        kind: "import",
        ...overrides,
    };
}

function resolvedPath(path: string) {
    return path;
}
```

If the existing test suite already uses different fixture names, keep the local conventions.

## 2. Assert only observable evaluator output

Assertions should focus on fields returned or consumed by the evaluator:

```text
status
ruleId
sourceLayer
target
reason
packageName
importKind
resolvedPath
importPath
exception
```

Avoid asserting private classifier helper behaviour here. For example, do not duplicate every `classifyResolvedTarget()`
path case. Stage 1 owns that matrix.

## 3. Prefer table-driven cases where the rule shape repeats

Use tables for cases like:

- scoped vs unscoped packages;
- exception matches vs near misses;
- type vs value import kinds.

This keeps Stage 2 compact and makes future refactors safer.

---

# Steps

## Step 1: Characterize resolved imports winning over package-looking specifiers

### Goal

Prove that when a `resolvedPath` exists, evaluator behaviour is based on the resolved target, not on the raw import
specifier.

This matters because `classifyImport()` currently normalizes `resolvedPath` and classifies the resolved target before
considering bare package logic.

### Test cases

Use package-looking or alias-looking import specifiers with resolved project paths:

| Import path      | Resolved path                              | Expected target        |
| ---------------- | ------------------------------------------ | ---------------------- |
| `react`          | `src/utils/react-shim.ts`                  | `utils`                |
| `@astrojs/react` | `src/presentation/adapters/astro-react.ts` | `presentation-adapter` |
| `~/domain/model` | `src/domain/model.ts`                      | `domain`               |

### Assertions

- The evaluator reports the resolved target.
- The result does not include `packageName` unless the current result shape always includes it.
- Any matching rule or violation uses the resolved target.
- The raw import path remains visible as `importPath`, if current result shape exposes it.

---

## Step 2: Characterize unresolved bare package findings

### Goal

Prove unresolved bare packages are classified as `external-package` and keep package metadata visible to the evaluator.

### Test cases

| Import path             | Expected target    | Expected package name |
| ----------------------- | ------------------ | --------------------- |
| `react`                 | `external-package` | `react`               |
| `react/jsx-runtime`     | `external-package` | `react`               |
| `@astrojs/react`        | `external-package` | `@astrojs/react`      |
| `@astrojs/react/server` | `external-package` | `@astrojs/react`      |

The current classifier extracts scoped packages with a scoped-package pattern and unscoped packages by taking the first
path segment.

### Assertions

- `target` is `external-package`.
- `packageName` is stable.
- The evaluator applies package-related rules or reports package-related findings using `packageName`.
- Scoped package names remain intact.

---

## Step 3: Characterize unresolved non-package imports as unknown

### Goal

Prove unresolved imports that are not bare packages remain `unknown` and are allowed by default unless a rule explicitly
handles unknown targets.

### Test cases

| Import path           | Expected target |
| --------------------- | --------------- |
| `./local`             | `unknown`       |
| `../shared/local`     | `unknown`       |
| `~/components/Button` | `unknown`       |
| `$content/course`     | `unknown`       |
| `/absolute/path`      | `unknown`       |
| `src/domain/model`    | `unknown`       |

The current bare-package check excludes relative imports, project aliases, absolute paths, and `src/...` specifiers.

### Assertions

- `target` is `unknown`.
- Default evaluator behaviour is allowed or non-violation, matching the current contract.
- No `packageName` is attached.
- No unrelated package exception applies.

---

## Step 4: Characterize exact exception matching

### Goal

Protect exception semantics before any classifier cleanup changes import metadata or path normalization.

### Test cases

Cover exact matches for:

1. Raw import-path exceptions.
2. Normalized resolved-target exceptions.
3. Package-name exceptions, if the evaluator supports them.

Example scenarios:

| Scenario                                             | Should apply?     |
| ---------------------------------------------------- | ----------------- |
| exact raw import path                                | yes               |
| exact normalized resolved path                       | yes               |
| exact package name                                   | yes, if supported |
| same package subpath when exception is package-level | current behaviour |
| near-miss import path                                | no                |
| near-miss resolved path                              | no                |
| near-miss package name                               | no                |

### Near-miss examples

```text
@astrojs/reactive
@astrojs/react/server-extra
src/domain-extra/model.ts
src/presentation/adapter/foo.ts
```

### Assertions

- The result exposes the applied exception object if that is part of the current result shape.
- Near misses produce the same result they would produce without an exception.
- Exceptions do not mask unrelated target/package mismatches.

---

## Step 5: Characterize type imports and type re-exports

### Goal

Confirm the evaluator sees `importKind: "type"` for type-only imports and preserves current rule behaviour for those
imports.

### Test cases

| Input kind       | Expected importKind |
| ---------------- | ------------------- |
| `type-import`    | `type`              |
| `type-re-export` | `type`              |

### Assertions

- Evaluator output includes `importKind: "type"`.
- Type import rules behave as currently expected.
- If the current policy allows type-only imports where value imports would violate, assert that distinction.
- If type-only imports are treated the same as value imports, assert that current behaviour explicitly.

The classifier currently maps only `type-import` and `type-re-export` to `"type"`; all other kinds become `"value"`.

---

## Step 6: Characterize unknown import kinds as value imports

### Goal

Protect the fail-closed behaviour for future parser import kinds.

### Test cases

| Input kind           | Expected importKind |
| -------------------- | ------------------- |
| `future-parser-kind` | `value`             |
| `unknown-kind`       | `value`             |

### Assertions

- Evaluator output includes `importKind: "value"`.
- Unknown kinds follow the same rule path as value imports.
- They do not accidentally bypass value-import restrictions.

This aligns with the cleanup decision that unknown import kinds should remain conservative by becoming value imports.

---

## Step 7: Characterize malformed records surfacing as classifier errors

### Goal

Make sure malformed records do not produce misleading evaluator results.

### Test cases

```ts
[
    { kind: "import" },
    { importPath: undefined, target: undefined, kind: "import" },
    { importPath: null, kind: "import" },
    { importPath: "", kind: "import" },
    { importPath: 42, kind: "import" },
];
```

### Assertion strategy

Use a broad throw assertion unless the current implementation already throws a deliberate `TypeError` with a stable
message:

```ts
expect(() => evaluateBoundaryRules(/* malformed input */)).toThrow();
```

If current behaviour throws a vague native error, Stage 2 should characterize that failure path without fixing it. The
later helper-extraction stage can replace the accidental error with a clear `TypeError`.

---

# Recommended Test Organization

Use this structure:

```ts
describe("evaluateBoundaryRules", () => {
    describe("resolved imports", () => {
        it("uses the resolved target instead of a package-looking specifier", () => {});
    });

    describe("unresolved package imports", () => {
        it.each([...])("preserves package metadata for %s", () => {});
    });

    describe("unresolved non-package imports", () => {
        it.each([...])("classifies %s as unknown", () => {});
    });

    describe("exceptions", () => {
        it("applies exact raw import-path exceptions", () => {});
        it("applies exact normalized resolved-target exceptions", () => {});
        it("does not apply near-miss exceptions", () => {});
    });

    describe("import kinds", () => {
        it.each([...])("classifies %s as %s", () => {});
    });

    describe("malformed import records", () => {
        it("surfaces classifier failures", () => {});
    });
});
```

Keep helpers local to the test file unless more than one suite needs them.

---

# Verification

Run the focused Stage 2 check:

```bash
pnpm test:unit -- scripts/__tests__/layer-boundary-rule-evaluation.test.ts
```

If the runner expands to the broader unit suite, confirm at minimum that this file passes.

Recommended final Stage 2 verification:

```bash
pnpm test:unit -- scripts/__tests__/layer-boundary-classification.test.ts scripts/__tests__/layer-boundary-rule-evaluation.test.ts
```

This confirms Stage 2 still agrees with the Stage 1 classifier contract.

---

# Acceptance Criteria

Stage 2 is complete when:

- `evaluateBoundaryRules()` has characterization coverage for resolved imports winning over package-looking specifiers;
- unresolved bare package imports produce evaluator-visible `external-package` data;
- scoped package names such as `@astrojs/react` remain intact;
- unresolved non-package imports remain `unknown` and preserve current default rule behaviour;
- exact raw import-path exceptions are covered;
- exact normalized resolved-target exceptions are covered;
- near-miss exceptions are covered and do not apply;
- type imports and type re-exports preserve `importKind: "type"`;
- unknown import kinds preserve fail-closed `importKind: "value"`;
- malformed records surface as errors rather than misleading rule results;
- tests assert evaluator-visible output rather than private classifier details;
- no production code changes are made unless a separate corrective stage is created.

---

# Revised TDD Cycle Plan

## Cycle 1: Freeze resolved-vs-package precedence

**Test first**

Add evaluator cases where raw import paths look like packages but resolved paths point to project targets.

**Smallest move**

Only add tests.

**Payoff**

Protects the evaluator from later classifier extraction accidentally changing target selection.

**Verify**

```bash
pnpm test:unit -- scripts/__tests__/layer-boundary-rule-evaluation.test.ts
```

## Cycle 2: Freeze unresolved package and unknown-import behaviour

**Test first**

Add package, scoped package, alias, relative, absolute, and `src/...` unresolved cases.

**Smallest move**

Only add tests.

**Payoff**

Protects the unresolved-import branch before `layer-boundary-imports.mjs` extraction.

**Verify**

```bash
pnpm test:unit -- scripts/__tests__/layer-boundary-rule-evaluation.test.ts
```

## Cycle 3: Freeze exception semantics

**Test first**

Add exact exception matches and near misses for raw import paths, resolved paths, and package names if supported.

**Smallest move**

Only add tests.

**Payoff**

Prevents exception matching from changing when import metadata is centralized.

**Verify**

```bash
pnpm test:unit -- scripts/__tests__/layer-boundary-rule-evaluation.test.ts
```

## Cycle 4: Freeze import-kind and malformed-record behaviour

**Test first**

Add type import, type re-export, unknown import kind, and malformed-record cases.

**Smallest move**

Only add tests.

**Payoff**

Keeps fail-closed and fail-fast behaviour visible before helper extraction.

**Verify**

```bash
pnpm test:unit -- scripts/__tests__/layer-boundary-rule-evaluation.test.ts
```

---

# Main Improvements Over the Original Plan

1. Separates resolved-import precedence from unresolved package handling.
2. Makes exception matching a dedicated test group with exact and near-miss cases.
3. Clarifies that unresolved `unknown` imports should preserve the current default evaluator behaviour, not merely
   classifier output.
4. Avoids duplicating the Stage 1 classifier matrix.
5. Adds a safe assertion strategy for malformed records when the current error message is not deliberate yet.
6. Adds a final cross-check against the Stage 1 classifier suite.
