# [DONE] Cycle 2 — Freeze Ordering Semantics

## Summary

Freeze the ordering contract for `selectExportEntries(manifest, selection)` in `scripts/lib/pdf-export-cli.mjs` after valid selection modes have already been characterized.

Status: implemented as ordering characterization tests in `scripts/__tests__/pdf-export-cli.test.ts`. No production
code was changed in this cycle.

This cycle is **test-first and behaviour-preserving**. It focuses only on observable ordering:

* `kind: "all"` returns selected entries in manifest order.
* `kind: "subtree"` returns matching entries in manifest order.
* `kind: "route"` remains a single-entry contract.
* subtree selection does not leak into similarly named sibling routes.
* selection returns a fresh result array and does not mutate the manifest fixture.

Failure semantics are out of scope for this cycle.

---

## Scope

### In scope

* Ordering for `all` selection.
* Ordering for subtree selection.
* Single-entry exact route behaviour.
* Sibling-boundary protection for subtree matching.
* Fresh result array checks.
* Manifest fixture immutability checks.

### Out of scope

* Missing exact routes.
* Missing subtree prefixes.
* Empty CLI selection.
* Parser conflict handling.
* Mixed valid/invalid selections.
* Multi-route request ordering, unless the current helper already supports it.
* Batch execution.
* Production refactor.

---

# Cycle 2: Freeze Ordering Semantics

## Step 1: Reuse or refine the Cycle 1 manifest fixture

Use the existing fixture from Cycle 1, but make sure it exposes ordering and sibling-boundary issues clearly.

The fixture should include:

```ts
const manifest = [
    exportableEntry("/notes/build-systems/"),
    exportableEntry("/notes/software-libraries/"),
    exportableEntry("/notes/software-libraries/testing/"),
    exportableEntry("/notes/software-libraries/api-design/"),
    exportableEntry("/notes/software-libraries-extra/"),
];
```

The important properties are:

* `/notes/build-systems/` appears before the software-libraries subtree;
* software-libraries descendants are not alphabetical;
* `/notes/software-libraries-extra/` is a sibling false-positive candidate;
* the fixture order is the expected output order.

Keep the fixture minimal. Add non-exportable entries only if Cycle 1 established that `selectExportEntries()` itself owns exportable filtering.

---

## Step 2: Assert `all` selection preserves manifest order

Test:

```ts
const selected = selectExportEntries(manifest, { kind: "all" });
```

Assert:

```ts
expect(selected.map((entry) => entry.route)).toEqual([
    "/notes/build-systems/",
    "/notes/software-libraries/",
    "/notes/software-libraries/testing/",
    "/notes/software-libraries/api-design/",
    "/notes/software-libraries-extra/",
]);
```

Also assert the result is a fresh array:

```ts
expect(selected).not.toBe(manifest);
```

If the helper filters exportable entries, compare against the exportable subset rather than the full fixture.

---

## Step 3: Assert subtree selection preserves manifest order

Test:

```ts
const selected = selectExportEntries(manifest, {
    kind: "subtree",
    value: "/notes/software-libraries/",
});
```

Assert:

```ts
expect(selected.map((entry) => entry.route)).toEqual([
    "/notes/software-libraries/",
    "/notes/software-libraries/testing/",
    "/notes/software-libraries/api-design/",
]);
```

This proves that subtree selection follows manifest order, not alphabetical order or traversal order.

---

## Step 4: Assert subtree selection excludes sibling routes

Use the same subtree request:

```ts
{
    kind: "subtree",
    value: "/notes/software-libraries/",
}
```

Assert:

```ts
expect(selected.map((entry) => entry.route)).not.toContain(
    "/notes/software-libraries-extra/",
);
```

This belongs in Cycle 2 because sibling leakage would usually be caused by naïve prefix matching, and prefix matching directly affects the selected ordered set.

---

## Step 5: Keep exact route selection as a single-entry contract

Test:

```ts
const selected = selectExportEntries(manifest, {
    kind: "route",
    value: "/notes/software-libraries/testing/",
});
```

Assert:

```ts
expect(selected.map((entry) => entry.route)).toEqual([
    "/notes/software-libraries/testing/",
]);
```

Also assert:

```ts
expect(selected).not.toBe(manifest);
```

Do **not** add multi-route ordering tests unless the current selection shape actually supports multiple route values. This cycle should not invent future batch semantics.

---

## Step 6: Assert the fixture is not mutated

Capture the fixture before selection:

```ts
const originalManifest = structuredClone(manifest);
```

After each selection mode, assert:

```ts
expect(manifest).toEqual(originalManifest);
```

If the project does not use `structuredClone()` in tests, use the existing cloning convention, such as JSON serialization or a local fixture factory that returns a fresh manifest for each test.

Prefer a fresh fixture per test if that matches the suite style:

```ts
const manifest = createSelectionManifestFixture();
```

This avoids mutation coupling between cases.

---

# Recommended Test Organization

```ts
describe("selectExportEntries ordering", () => {
    it("returns all selected entries in manifest order", () => {});

    it("returns a fresh array for all selection", () => {});

    it("returns subtree matches in manifest order", () => {});

    it("does not include sibling routes when selecting a subtree", () => {});

    it("keeps exact route selection as a single-entry result", () => {});

    it("does not mutate the manifest fixture", () => {});
});
```

A compact alternative is to combine freshness and immutability assertions inside each selection-mode test, but separate tests usually make failures easier to diagnose.

---

# Verification

Run:

```bash
pnpm test:unit -- scripts/__tests__/pdf-export-cli.test.ts
```

Confirm that:

* `all` selection preserves manifest order;
* subtree selection preserves manifest order;
* subtree selection excludes sibling routes;
* exact route selection remains single-entry;
* selected arrays are not the same object as the manifest;
* the manifest fixture is unchanged after selection.

---

# Decisions

* Cycle 2 is test-only.
* No production refactor belongs here.
* Manifest order is the only ordering guarantee being pinned.
* Exact route selection remains a single-entry contract.
* Multi-route ordering is out of scope unless already supported.
* Sibling-prefix false positives are included because subtree ordering depends on correct prefix boundaries.
* Failure semantics belong to a later cycle.

---

# TDD Cycle Plan

## Goal

Freeze observable ordering for valid selections.

## Test first

Add or reshape `pdf-export-cli` tests for:

* `all` selection order;
* subtree selection order;
* subtree sibling-boundary exclusion;
* exact route single-entry behaviour;
* result array freshness;
* manifest fixture immutability.

## Smallest move

Only modify tests.

## Payoff

Later batch and orchestration refactors can change internals without changing selected-entry order.

## Verify

```bash
pnpm test:unit -- scripts/__tests__/pdf-export-cli.test.ts
```

---

# Acceptance Criteria

Cycle 2 is complete when:

* `all` selection has an explicit manifest-order test;
* subtree selection has an explicit manifest-order test;
* subtree selection excludes similarly named sibling routes;
* exact route selection is tested only as a single-entry result;
* no unsupported multi-route semantics are introduced;
* selected results are fresh arrays;
* manifest fixtures are not mutated;
* no production code is changed;
* the focused CLI test suite passes.
