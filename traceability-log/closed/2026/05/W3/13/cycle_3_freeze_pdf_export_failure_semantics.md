# [DONE] Cycle 3: Freeze PDF Export Failure Semantics

## Completion Summary

Cycle 3 is complete. Added test-only coverage in:

```text
scripts/__tests__/pdf-export-cli.test.ts
```

Implemented coverage:

- missing exact route selection throws and includes the requested route;
- missing subtree selection throws and includes the requested subtree prefix;
- similarly named sibling routes do not rescue missing subtree requests;
- failed selection does not mutate the manifest fixture;
- parser validation rejects empty selection;
- parser validation rejects conflicting `--route`, `--subtree`, and `--all` combinations.

Verification:

```bash
node ./node_modules/vitest/vitest.mjs run scripts/__tests__/pdf-export-cli.test.ts
```

Result: passed, 18 tests.

Note: `pnpm test:unit -- scripts/__tests__/pdf-export-cli.test.ts` currently expands to the broader unit suite and fails
because `scripts/__tests__/layer-boundary-import-specifiers.test.ts` is in the expected red state while its helper
module has not been created yet. The focused PDF export CLI file passes.

## Summary

Add test-only coverage for failure behaviour in `scripts/__tests__/pdf-export-cli.test.ts`.

This cycle characterizes failure semantics for the current single-selection contract:

- `selectExportEntries()` accepts one exact route, one subtree, or all entries.
- Missing exact route selection throws.
- Missing subtree selection throws.
- Empty selection and conflicting selectors remain parser-level errors.
- No multi-route, mixed valid/invalid, or partial-result semantics are introduced.

The goal is to protect preflight failure behaviour before the batch-execution refactor.

---

## Scope

### In scope

- Selector failures for absent exact routes.
- Selector failures for subtree requests with no matches.
- Error messages that include the requested route or subtree.
- Sibling-prefix false positives.
- Manifest immutability on failed selection.
- Parser ownership of empty and conflicting selection errors.

### Out of scope

- Multi-route selection.
- Mixed valid/invalid route arrays.
- Batch execution.
- Report generation.
- Non-exportable-entry behaviour.
- Manifest builder changes.
- Production refactor.

---

# Test Changes

## Step 1: Add a focused failure block

Extend:

```text
scripts/__tests__/pdf-export-cli.test.ts
```

Add a focused block under the existing selection fixture context:

```ts
describe("failure semantics", () => {
    // selector failure cases
});
```

Use the existing fixture factory:

```ts
const manifest = createSelectionManifestFixture();
```

This keeps Cycle 3 aligned with Cycles 1 and 2.

---

## Step 2: Exact route selection throws when absent

Test:

```ts
expect(() =>
    selectExportEntries(manifest, {
        kind: "route",
        value: "/notes/missing/",
    })
).toThrow(/\/notes\/missing\//u);
```

Prefer a partial regex over an exact full-message snapshot.

Recommended assertion:

```ts
toThrow(/No export entry found for \/notes\/missing\//u);
```

Only use the full phrase if it is already stable. Otherwise, require at minimum that the requested route appears in the
error message.

---

## Step 3: Subtree selection throws when no entries match

Test:

```ts
expect(() =>
    selectExportEntries(manifest, {
        kind: "subtree",
        value: "/notes/missing/",
    })
).toThrow(/\/notes\/missing\//u);
```

Recommended assertion:

```ts
toThrow(/No export entries found under \/notes\/missing\//u);
```

Again, use the full phrase only if it is already stable.

---

## Step 4: Sibling routes do not rescue a missing subtree

Use a fixture that contains:

```text
/notes/software-libraries-extra/
```

Then request a near-miss subtree:

```text
/notes/software-libraries-ex/
```

Expected result:

```ts
expect(() =>
    selectExportEntries(manifest, {
        kind: "subtree",
        value: "/notes/software-libraries-ex/",
    })
).toThrow(/\/notes\/software-libraries-ex\//u);
```

This test protects against naïve prefix matching. The requested subtree should not match a similarly named sibling
unless the route boundary genuinely matches.

Also keep the positive sibling-boundary case from Cycle 2:

```text
/notes/software-libraries/
```

should not include:

```text
/notes/software-libraries-extra/
```

Cycle 2 protects valid selection output; Cycle 3 protects missing-subtree failure.

---

## Step 5: Failed selection does not mutate the manifest

Add one explicit immutability test for a failing selector path.

Example:

```ts
const manifest = createSelectionManifestFixture();
const originalManifest = structuredClone(manifest);

expect(() =>
    selectExportEntries(manifest, {
        kind: "route",
        value: "/notes/missing/",
    })
).toThrow();

expect(manifest).toEqual(originalManifest);
```

If the test suite avoids `structuredClone()`, use the project’s existing clone convention or recreate the fixture per
test.

This confirms failure paths remain pure and do not leave partially transformed fixture state.

---

## Step 6: Keep parser validation separate

Keep these in the parser tests, not under `selectExportEntries()`.

Confirm existing coverage or add narrow tests for:

```ts
parseCliArgs([]);
```

Expected:

```text
Exactly one of --route, --subtree, or --all must be provided
```

Also confirm conflicting selectors still throw:

```bash
--route /notes/software-libraries/ --all
```

```bash
--subtree /notes/software-libraries/ --all
```

```bash
--route /notes/a/ --subtree /notes/b/
```

Do not move empty-selection validation into `selectExportEntries()`. The parser owns whether a selection exists; the
selector owns whether the requested selection matches the manifest.

---

# Recommended Test Organization

```ts
suite("selectExportEntries", () => {
    describe("failure semantics", () => {
        test("throws when an exact route is absent", () => {});

        test("includes the missing exact route in the error message", () => {});

        test("throws when a subtree has no matching entries", () => {});

        test("includes the missing subtree prefix in the error message", () => {});

        test("does not let similarly named siblings rescue a missing subtree", () => {});

        test("does not mutate the manifest when selection fails", () => {});
    });
});

suite("parseCliArgs", () => {
    describe("selection validation", () => {
        test("rejects empty selection", () => {});

        test("rejects conflicting selectors", () => {});
    });
});
```

If the current file already groups parser and selector tests differently, follow the local structure while preserving
this separation of concerns.

---

# Verification

Run:

```bash
pnpm test:unit -- scripts/__tests__/pdf-export-cli.test.ts
```

If the test script expands to a broader run, confirm that this file passes.

---

# Decisions

- Cycle 3 is test-only.
- `selectExportEntries()` remains pure.
- Missing exact routes throw during selector preflight.
- Missing subtree matches throw during selector preflight.
- Empty selection remains parser-level validation.
- Conflicting selectors remain parser-level validation.
- Error messages should include the requested route/subtree.
- Use partial regex assertions instead of brittle full-message snapshots.
- Do not introduce multi-route or mixed valid/invalid semantics.
- Non-exportable-entry behaviour remains deferred to Cycle 4.

---

# TDD Cycle Plan

## Goal

Freeze selector and parser failure semantics before batch execution changes.

## Test first

Add or confirm tests for:

- missing exact route;
- missing subtree prefix;
- sibling-prefix near misses;
- error messages containing requested route/subtree;
- manifest immutability after failed selection;
- empty parser selection;
- conflicting parser selectors.

## Smallest move

Only modify `scripts/__tests__/pdf-export-cli.test.ts`.

## Payoff

Later batch execution can rely on the current preflight contract: invalid selection fails early, clearly, and without
partial results.

## Verify

```bash
pnpm test:unit -- scripts/__tests__/pdf-export-cli.test.ts
```

---

# Acceptance Criteria

Cycle 3 is complete when:

- exact route selection throws when the route is absent;
- subtree selection throws when no entries match;
- missing exact route errors include the requested route;
- missing subtree errors include the requested subtree prefix;
- similarly named sibling routes do not rescue missing subtree requests;
- failed selection does not mutate the manifest fixture;
- empty selection remains a parser error;
- conflicting selectors remain parser errors;
- no multi-route or mixed-selection behaviour is introduced;
- no production refactor is made;
- the focused CLI test suite passes.
