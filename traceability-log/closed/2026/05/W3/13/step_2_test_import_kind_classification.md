# [DONE] Step 2 — Test Import-Kind Classification

## Completion Summary

Step 2 is complete. Added helper-level coverage in [scripts/__tests__/layer-boundary-import-specifiers.test.ts](scripts/__tests__/layer-boundary-import-specifiers.test.ts) for `classifyImportKind()`.

Implemented coverage:

- `import`, `re-export`, and `dynamic-import` map to `"value"`;
- `type-import` and `type-re-export` map to `"type"`;
- unknown and future kinds map to `"value"`;
- missing-value edge cases remain fail-closed as `"value"` when the helper accepts them;
- the current conservative fallback stays visible without changing classifier behaviour.

Verification:

```bash
pnpm test:unit -- scripts/__tests__/layer-boundary-import-specifiers.test.ts
```

The broader classifier safety-net suites remain available if future helper changes expose drift.

## Summary

Characterize `classifyImportKind()` in `scripts/lib/layer-boundary-import-specifiers.mjs`.

This step is **test-first and behaviour-preserving**. It should lock the current conservative mapping from parser import kinds to the normalized classifier kinds:

```ts
"value" | "type";
```

The key contract is:

- `type-import` and `type-re-export` map to `"type"`;
- every other known, unknown, future, or missing kind maps to `"value"`.

This preserves the current fail-closed behaviour: if the parser introduces a new import kind later, the boundary checker treats it as a value import unless explicitly taught otherwise.

---

## Scope

### In scope

- Add table-driven helper-level tests for `classifyImportKind()`.
- Cover known parser kinds.
- Cover one or more unknown/future parser kinds.
- Cover missing-value edge cases if the helper currently accepts them.
- Keep the expected conservative fallback visible.

### Out of scope

- No production refactor.
- No path normalization changes.
- No unresolved-specifier classification changes.
- No package-name extraction changes.
- No classifier API changes.
- No rule-evaluation changes.
- No tightening of missing/invalid kind handling.

---

# Step 2: Test Import-Kind Classification

## Step 1: Add a focused table for known parser kinds

Extend:

```text
scripts/__tests__/layer-boundary-import-specifiers.test.ts
```

Add or complete the `classifyImportKind` block:

```ts
describe("classifyImportKind", () => {
    test.each([
        ["import", "value"],
        ["re-export", "value"],
        ["dynamic-import", "value"],
        ["type-import", "type"],
        ["type-re-export", "type"],
    ])("classifies %s as %s", (kind, expected) => {
        expect(classifyImportKind(kind)).toBe(expected);
    });
});
```

If the source-text import extractor also emits names such as `static-import` or `side-effect-import`, include them in the `"value"` group. Otherwise, do not invent parser kinds only for completeness.

---

## Step 2: Separate value and type cases for readability

Keep the table compact, but make the semantic split obvious.

Recommended structure:

```ts
describe("classifyImportKind", () => {
    test.each([
        "import",
        "re-export",
        "dynamic-import",
    ])("classifies %s as a value import", (kind) => {
        expect(classifyImportKind(kind)).toBe("value");
    });

    test.each([
        "type-import",
        "type-re-export",
    ])("classifies %s as a type import", (kind) => {
        expect(classifyImportKind(kind)).toBe("type");
    });
});
```

This makes future changes easier to review: adding a new type-only parser kind should require adding it deliberately to the second table.

---

## Step 3: Add fail-closed future-kind coverage

Add explicit future/unknown cases:

```ts
test.each([
    "future-parser-kind",
    "unknown-kind",
])("classifies unknown kind %s as a value import", (kind) => {
    expect(classifyImportKind(kind)).toBe("value");
});
```

This is the core safety contract for the architecture checker. Unknown kinds should not bypass value-import restrictions.

---

## Step 4: Document missing-value behaviour

If the helper currently accepts missing values, document that explicitly:

```ts
test.each([
    undefined,
    null,
])("classifies missing kind %s as a value import", (kind) => {
    expect(classifyImportKind(kind)).toBe("value");
});
```

Do not tighten this in Step 2. If stricter validation is desirable later, create a separate corrective stage because it could change how malformed parser records surface.

---

## Step 5: Keep classifier integration as a safety net only

Do not duplicate these helper-level tables in:

```text
scripts/__tests__/layer-boundary-classification.test.ts
```

Instead, rely on a small number of existing classifier-level tests to prove that `classifyImport()` still exposes the same `importKind` values.

Only run the broader suites if the helper test reveals drift.

---

# Recommended Test Shape

```ts
describe("classifyImportKind", () => {
    test.each([
        "import",
        "re-export",
        "dynamic-import",
    ])("classifies %s as a value import", (kind) => {
        expect(classifyImportKind(kind)).toBe("value");
    });

    test.each([
        "type-import",
        "type-re-export",
    ])("classifies %s as a type import", (kind) => {
        expect(classifyImportKind(kind)).toBe("type");
    });

    test.each([
        "future-parser-kind",
        "unknown-kind",
        undefined,
        null,
    ])("classifies unsupported kind %s as a value import", (kind) => {
        expect(classifyImportKind(kind)).toBe("value");
    });
});
```

If the test suite’s TypeScript configuration complains about `undefined` or `null`, use a local cast in the test instead of changing the helper signature:

```ts
expect(classifyImportKind(undefined as unknown as string)).toBe("value");
```

---

# Verification

Run the focused helper suite:

```bash
pnpm test:unit -- scripts/__tests__/layer-boundary-import-specifiers.test.ts
```

If the helper-level tests expose a mismatch with classifier behaviour, run the safety-net suites:

```bash
pnpm test:unit -- scripts/__tests__/layer-boundary-classification.test.ts scripts/__tests__/layer-boundary-rule-evaluation.test.ts
```

---

# Decisions

- Step 2 is test-only.
- `type-import` and `type-re-export` remain the only `"type"` cases.
- Known runtime import kinds map to `"value"`.
- Unknown and future parser kinds map to `"value"`.
- Missing kind values, if accepted today, map to `"value"`.
- No production behaviour is tightened in this step.


---

# TDD Cycle Plan

## Goal

Freeze normalized import-kind classification.

## Test first

Add table-driven tests for:

- value import kinds;
- type import kinds;
- unknown/future kinds;
- missing-value edge cases.

## Smallest move

Only modify:

```text
scripts/__tests__/layer-boundary-import-specifiers.test.ts
```

## Payoff

Later helper cleanup can change implementation details without changing classifier semantics or accidentally weakening
boundary enforcement.

## Verify

```bash
pnpm test:unit -- scripts/__tests__/layer-boundary-import-specifiers.test.ts
```

---

# Acceptance Criteria

Step 2 is complete when:

- `classifyImportKind()` has focused helper-level tests;
- known value import kinds map to `"value"`;
- `type-import` maps to `"type"`;
- `type-re-export` maps to `"type"`;
- future/unknown kinds map to `"value"`;
- missing-value behaviour is explicitly documented if supported;
- no path, package, unresolved-import, or classifier logic is changed;
- the focused helper suite passes.
