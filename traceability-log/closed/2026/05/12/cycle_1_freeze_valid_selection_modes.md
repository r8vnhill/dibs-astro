# [DONE] Cycle 1: Freeze Valid Selection Modes

## Summary

Freeze the current valid-selection contract in `scripts/lib/pdf-export-cli.mjs` before the batch-execution refactor.

Status: implemented as selector characterization tests in `scripts/__tests__/pdf-export-cli.test.ts`. No production code
was changed in this cycle.

Implementation note: the current manifest type does not carry a non-exportable flag, so the selector suite documents the
exportable-entry boundary by using an already exportable manifest fixture and naming the `--all` test accordingly.

This cycle characterizes only successful calls to `selectExportEntries(manifest, selection)`. The helper should remain
pure and predictable for the valid selection modes:

- `kind: "all"`;
- `kind: "route"`;
- `kind: "subtree"`.

The main contract to protect is that selected entries are returned in **manifest order**, selection does not mutate the
manifest, and the responsibility for excluding non-exportable entries stays explicit at the manifest boundary.

## Scope

### In scope

- Successful selection behaviour.
- Manifest-order preservation.
- Subtree boundary matching.
- Exportable-entry ownership as a manifest-boundary assumption.
- Fixture design that makes ordering and filtering visible.

### Out of scope

- Missing-route failures.
- Missing-subtree failures.
- Empty-selection parser errors.
- Mixed valid/invalid selection requests.
- Batch execution.
- CLI orchestration changes.
- Manifest generation refactors.

Those failure cases belong to the next cycle, not this one.

---

# Cycle 1: Freeze Valid Selection Modes

## Step 1: Build a focused manifest fixture

Extend:

```text
scripts/__tests__/pdf-export-cli.test.ts
```

Add a fixture that makes these properties visible:

- manifest order is not alphabetical;
- at least two entries share a subtree;
- at least one entry is outside that subtree;
- at least one sibling route could be confused with the subtree;
- the fixture is already exportable-only if the current manifest shape does not carry a non-exportable flag.

Example intent:

```ts
const manifest = [
    exportableEntry("/notes/build-systems/"),
    exportableEntry("/notes/software-libraries/"),
    exportableEntry("/notes/software-libraries/api-design/"),
    exportableEntry("/notes/software-libraries/testing/"),
    exportableEntry("/notes/software-libraries-extra/"),
    nonExportableEntry("/blog/non-lesson/"),
];
```

Use the real manifest-entry shape from the project. Avoid inventing fields that `selectExportEntries()` does not read.

## Step 2: Characterize `kind: "all"`

Add tests for:

```ts
selectExportEntries(manifest, { kind: "all" });
```

Assert:

- returns all currently exportable lesson entries;
- preserves manifest order;
- documents whether the selector or manifest construction owns exportable filtering;
- does not mutate the original manifest.

Suggested assertion shape:

```ts
expect(selected.map((entry) => entry.route)).toEqual([
    "/notes/build-systems/",
    "/notes/software-libraries/",
    "/notes/software-libraries/api-design/",
    "/notes/software-libraries/testing/",
    "/notes/software-libraries-extra/",
]);

expect(manifest).toEqual(originalManifest);
```

If the manifest is already guaranteed to contain only exportable entries, make that explicit in the test name:

```ts
it("returns every entry from an already exportable manifest in manifest order", () => {
    // ...
});
```

## Step 3: Characterize exact route selection

Add tests for:

```ts
selectExportEntries(manifest, {
    kind: "route",
    value: "/notes/software-libraries/api-design/",
});
```

Assert:

- returns the matching entry;
- preserves the entry’s manifest position relative to other selected entries when the helper can return multiple
  entries;
- does not match sibling or prefix routes accidentally;
- does not mutate the manifest.

The current helper shape is singular (`value: string`), so keep this cycle focused on single-route selection and do not
invent a multi-route contract here.

## Step 4: Characterize subtree selection

Add tests for:

```ts
selectExportEntries(manifest, {
    kind: "subtree",
    value: "/notes/software-libraries/",
});
```

Assert:

- returns the subtree root if that is current behaviour;
- returns all exportable descendants;
- preserves manifest order;
- does not include sibling routes such as:

```text
/notes/software-libraries-extra/
```

Expected result:

```ts
expect(selected.map((entry) => entry.route)).toEqual([
    "/notes/software-libraries/",
    "/notes/software-libraries/api-design/",
    "/notes/software-libraries/testing/",
]);
```

Add a sibling-boundary test even if there is only one subtree test. This protects route-prefix matching before the batch
refactor.

## Step 5: Make the exportable-entry boundary explicit

Add one narrow test that answers this question:

> Does `selectExportEntries()` filter non-exportable entries, or does manifest construction guarantee that only
> exportable entries reach selection?

Choose the test location based on the actual ownership:

### Option A: Selector filters exportable entries

Keep the test in:

```text
scripts/__tests__/pdf-export-cli.test.ts
```

Example:

```ts
it("excludes non-exportable entries from all-selection", () => {
    const selected = selectExportEntries(manifestWithNonExportableEntry, {
        kind: "all",
    });

    expect(selected.map((entry) => entry.route)).not.toContain("/blog/non-lesson/");
});
```

### Option B: Manifest builder filters exportable entries

Move the boundary test to the manifest suite, for example:

```text
scripts/__tests__/pdf-export-manifest.test.ts
```

Then name the selector test accordingly:

```ts
it("returns every entry from the exportable manifest in manifest order", () => {
    // ...
});
```

Do not leave this boundary implicit.

---

# Recommended Test Organization

```ts
describe("selectExportEntries", () => {
    describe("valid selections", () => {
        it("returns all exportable entries in manifest order", () => {});
        it("selects an exact route", () => {});
        it("selects a subtree in manifest order", () => {});
        it("does not match sibling routes for subtree selection", () => {});
        it("does not mutate the manifest", () => {});
    });

    describe("exportable-entry boundary", () => {
        it("documents whether selection or manifest construction owns filtering", () => {});
    });
});
```

If the current suite already has a different structure, keep local consistency but preserve these behavioural groups.

---

# Verification

Run the focused test file:

```bash
pnpm test:unit -- scripts/__tests__/pdf-export-cli.test.ts
```

If the exportable-entry boundary is documented in manifest tests instead, also run:

```bash
pnpm test:unit -- scripts/__tests__/pdf-export-manifest.test.ts
```

## Confirmation checklist

- Valid `all` selection is covered.
- Valid exact route selection is covered.
- Valid subtree selection is covered.
- Manifest-order preservation is covered where the helper can return multiple entries.
- Subtree sibling false positives are covered.
- Manifest mutation is guarded.
- Exportable-entry ownership is explicit.
- No production refactor was introduced.

---

# Decisions

- Cycle 1 is test-only.
- `selectExportEntries()` remains pure.
- Selection output order is manifest order.
- This cycle covers only valid selections.
- Empty selection remains a parser concern.
- Missing routes and missing subtrees belong to a later failure-semantics cycle.
- Exportable-entry responsibility must be explicit in tests.

---

# TDD Cycle Plan

## Goal

Freeze valid selection behaviour before batch execution changes.

## Test first

Add or reshape tests for:

- `kind: "all"`;
- `kind: "route"`;
- `kind: "subtree"`;
- subtree sibling boundaries;
- manifest mutation;
- exportable-entry ownership.

## Smallest move

Only modify test files.

## Payoff

Later orchestration and batch-execution work can rely on a stable, pure selector contract.

## Verify

```bash
pnpm test:unit -- scripts/__tests__/pdf-export-cli.test.ts
```

---

# Acceptance Criteria

Cycle 1 is complete when:

- `selectExportEntries()` has valid-selection coverage for `all`, exact route, and subtree selection;
- all multi-entry valid selections preserve manifest order;
- exact route selection uses the current real selection shape correctly;
- subtree selection does not match similarly named sibling routes;
- the manifest fixture is not mutated;
- exportable-entry ownership is documented by tests;
- parser errors and missing-selection failures are left for later cycles;
- no production code changes are made.

## Main Improvements Over the Original Plan

1. Avoids testing “CLI argument order” unless the helper actually supports multiple requested values.
2. Separates valid-selection characterization from failure/preflight semantics.
3. Adds a mutation-safety assertion.
4. Makes the exportable-entry boundary a concrete ownership decision.
5. Strengthens the fixture so ordering, filtering, and sibling-prefix bugs are visible.
