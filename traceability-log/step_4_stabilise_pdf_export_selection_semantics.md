# [PLAN] Step 4 — Stabilise PDF Export Selection Semantics

## Summary

Freeze the current selection contract in `scripts/lib/pdf-export-cli.mjs` before changing batch execution.

This step is **test-first and behaviour-preserving**. The goal is to make `selectExportEntries(manifest, selection)`
predictable for all supported selection modes:

- `--all`;
- exact route selection;
- subtree selection;
- missing routes;
- missing subtree matches;
- non-exportable entries;
- manifest-order preservation;
- empty-selection parser errors.

No orchestration refactor belongs in this step.

---

## Goals

1. Characterise `selectExportEntries()` as a pure helper.
2. Preserve manifest order for every multi-entry selection.
3. Confirm invalid selections fail before export execution.
4. Keep parser validation and selection validation separated.
5. Make the exportable-entry boundary explicit.
6. Protect batch execution from accidental selection-order or partial-result changes.

---

## Non-goals

- Do not refactor batch execution.
- Do not change manifest generation.
- Do not redesign selection syntax.
- Do not introduce partial success semantics.
- Do not change route normalization unless the current contract is already inconsistent.
- Do not move selection logic into the orchestration script.
- Do not change report output.

---

# Test Fixture Design

Use one manifest fixture that makes ordering, subtree matching, and exportability visible.

Example shape:

```ts
const manifest = [
    {
        route: "/notes/software-libraries/",
        exportRoute: "/exports/pdf/notes/software-libraries/",
        outputPath: "software-libraries/index.pdf",
        exportable: true,
    },
    {
        route: "/notes/software-libraries/api-design/",
        exportRoute: "/exports/pdf/notes/software-libraries/api-design/",
        outputPath: "software-libraries/api-design.pdf",
        exportable: true,
    },
    {
        route: "/notes/software-libraries/testing/",
        exportRoute: "/exports/pdf/notes/software-libraries/testing/",
        outputPath: "software-libraries/testing.pdf",
        exportable: true,
    },
    {
        route: "/notes/build-systems/",
        exportRoute: "/exports/pdf/notes/build-systems/",
        outputPath: "build-systems/index.pdf",
        exportable: true,
    },
    {
        route: "/blog/non-lesson/",
        exportRoute: undefined,
        outputPath: undefined,
        exportable: false,
    },
];
```

Adapt field names to the actual manifest shape. The important part is that the fixture includes:

- multiple exportable entries;
- nested routes;
- at least one non-exportable entry;
- an order that is not alphabetical;
- entries from at least two subtrees.

---

# Steps

## Step 1: Freeze `kind: "all"` selection

Extend:

```text
scripts/__tests__/pdf-export-cli.test.ts
```

Add tests for:

- `selectExportEntries(manifest, { kind: "all" })`;
- returns every exportable entry;
- excludes non-exportable entries if that is currently the helper’s responsibility;
- preserves manifest order;
- returns entries without mutating the manifest.

Important boundary question:

- If the manifest builder already filters non-exportable entries, document that with a test near manifest-building
  coverage.
- If `selectExportEntries()` filters non-exportable entries, document that in the helper test.
- Do not leave this implicit.

Expected contract:

```ts
expect(selected.map((entry) => entry.route)).toEqual([
    "/notes/software-libraries/",
    "/notes/software-libraries/api-design/",
    "/notes/software-libraries/testing/",
    "/notes/build-systems/",
]);
```

---

## Step 2: Freeze exact route selection

Add tests for:

- one exact route;
- multiple exact routes;
- exact routes preserve manifest order, not CLI argument order;
- duplicated requested routes preserve current behaviour;
- route selection does not match subtrees accidentally.

Example:

```ts
const selection = {
    kind: "route",
    routes: [
        "/notes/build-systems/",
        "/notes/software-libraries/api-design/",
    ],
};
```

Expected result should be manifest order:

```ts
[
    "/notes/software-libraries/api-design/",
    "/notes/build-systems/",
];
```

unless the current contract intentionally preserves request order. The plan says manifest order, so lock that
explicitly.

Add a duplicate-route case:

```ts
routes: [
    "/notes/software-libraries/api-design/",
    "/notes/software-libraries/api-design/",
];
```

Decide and document current behaviour:

- deduplicated result; or
- repeated result; or
- parser rejects duplicates.

Do not assume this silently.

---

## Step 3: Freeze subtree selection

Add tests for:

- subtree prefix selects all matching exportable entries;
- subtree selection preserves manifest order;
- subtree selection does not match similarly named sibling routes;
- multiple subtree prefixes preserve manifest order across the full manifest;
- duplicate subtree matches do not produce duplicate entries unless that is current behaviour.

Example positive case:

```ts
{
    kind: "subtree",
    routes: ["/notes/software-libraries/"],
}
```

Expected:

```ts
[
    "/notes/software-libraries/",
    "/notes/software-libraries/api-design/",
    "/notes/software-libraries/testing/",
];
```

Sibling false-positive case:

```text
/notes/software-libraries-extra/
```

must not match:

```text
/notes/software-libraries/
```

This protects route-boundary semantics before the batch refactor.

---

## Step 4: Freeze failure semantics

Add helper-level tests for invalid selections that should throw during preflight.

Cover:

- missing exact route;
- missing subtree prefix;
- non-exportable requested exact route;
- non-exportable subtree with no exportable matches;
- mixed valid and invalid exact routes;
- mixed valid and invalid subtree prefixes.

Important contract:

> Selection errors throw immediately and do not return partial results.

Example:

```ts
expect(() =>
    selectExportEntries(manifest, {
        kind: "route",
        routes: [
            "/notes/software-libraries/api-design/",
            "/notes/missing/",
        ],
    })
).toThrow();
```

Also assert that the error message is useful enough to identify the missing route or subtree. Avoid over-specifying the
full message unless it is already stable.

Recommended assertion:

```ts
toThrow(/\/notes\/missing\//);
```

---

## Step 5: Freeze parser-level empty-selection behaviour

Keep this in parser tests, not helper tests.

Add or confirm tests for:

- no `--all`;
- no route arguments;
- no subtree arguments;
- conflicting or incomplete selection flags, if supported by the parser.

Expected:

- empty selection is a parser error;
- `selectExportEntries()` should not need to handle an impossible empty parser output unless the function is public
  enough to warrant defensive checks.

This keeps responsibility clean:

- parser validates whether a selection exists;
- selector validates whether the requested entries exist and are exportable.

---

## Step 6: Add one exportable-boundary contract test

Add one narrow test that answers this explicitly:

> Is `selectExportEntries()` responsible for excluding non-exportable entries, or is the manifest already pre-filtered?

Preferred options:

### Option A: Selector owns exportable filtering

Then test:

```ts
it("selects only exportable entries for all-selection", () => {
    const selected = selectExportEntries(manifestWithNonExportableEntry, {
        kind: "all",
    });

    expect(selected.map((entry) => entry.route)).not.toContain("/blog/non-lesson/");
});
```

### Option B: Manifest builder owns exportable filtering

Then test this near the manifest builder, and keep the selector fixture already filtered.

In that case, add a comment or test name in `pdf-export-cli.test.ts` making the assumption visible:

```ts
it("selects all entries from an already exportable manifest", () => {});
```

Either option is acceptable. The important thing is to avoid an undocumented boundary.

---

# Recommended Test Organization

Use focused `describe` blocks:

```ts
describe("selectExportEntries", () => {
    describe("all selection", () => {});
    describe("exact route selection", () => {});
    describe("subtree selection", () => {});
    describe("ordering", () => {});
    describe("failure semantics", () => {});
    describe("exportable boundary", () => {});
});

describe("parsePdfExportCliArgs", () => {
    describe("selection validation", () => {
        it("rejects empty selection", () => {});
    });
});
```

Keep the selection tests table-driven where possible.

---

# Verification

Run the focused selection suite:

```bash
pnpm test:unit -- scripts/__tests__/pdf-export-cli.test.ts
```

If the exportable-boundary test touches manifest generation, also run the relevant manifest tests, for example:

```bash
pnpm test:unit -- scripts/__tests__/pdf-export-manifest.test.ts
```

Then run the current direct exporter-related check if one exists:

```bash
pnpm run check:lesson-export-core
```

Use the last command only if this step touches shared filtering assumptions from
`packages/lesson-export-core/src/filters.ts`.

---

# Decisions

- Step 4 is test-first and behaviour-preserving.
- `selectExportEntries()` remains pure.
- Selection order is manifest order.
- Empty CLI selection is a parser error.
- Missing exact routes and missing subtree matches throw during selection preflight.
- Invalid mixed selections throw and do not return partial results.
- The exportable-entry boundary must be documented by tests.
- Non-note route handling must be explicit, either in selector tests or manifest-builder tests.
- No batch-execution code changes belong in this step.

---

# Revised TDD Cycle Plan

## ~~Cycle 1: Freeze valid selection modes~~

**Test first**

Add table-driven tests for:

- `kind: "all"`;
- `kind: "route"`;
- `kind: "subtree"`.

**Smallest move**

Only add or reshape tests in `pdf-export-cli.test.ts`.

**Payoff**

Locks the normal selection contract before batch execution changes.

**Verify**

```bash
pnpm test:unit -- scripts/__tests__/pdf-export-cli.test.ts
```

---

## ~~Cycle 2: Freeze ordering semantics~~

**Test first**

Add cases proving:

- `--all` returns manifest order;
- exact route selection returns manifest order;
- subtree selection returns manifest order;
- selection is not CLI argument order.

**Smallest move**

Only add tests.

**Payoff**

Prevents the batch refactor from accidentally changing PDF generation order.

**Verify**

```bash
pnpm test:unit -- scripts/__tests__/pdf-export-cli.test.ts
```

---

## ~~Cycle 3: Freeze failure semantics~~

Status: complete.

Added failure-semantics coverage in `scripts/__tests__/pdf-export-cli.test.ts`. The focused file passes with direct
Vitest execution. The broader `pnpm test:unit -- ...` wrapper currently fails because of the known red
`layer-boundary-import-specifiers` helper test from Stage 3, not because of PDF export CLI failures.

**Test first**

Add cases for:

- missing exact route;
- missing subtree prefix;
- non-exportable requested route;
- mixed valid and invalid requests;
- empty parser selection.

**Smallest move**

Only add tests.

**Payoff**

Protects the current immediate-failure preflight contract.

**Verify**

```bash
pnpm test:unit -- scripts/__tests__/pdf-export-cli.test.ts
```

---

## Cycle 4: Freeze exportable-entry boundary

**Test first**

Add one narrow boundary test documenting whether the selector or manifest builder excludes non-exportable/non-note
entries.

**Smallest move**

Only add the test in the owning suite.

**Payoff**

Prevents hidden assumptions from leaking into the batch executor.

**Verify**

```bash
pnpm test:unit -- scripts/__tests__/pdf-export-cli.test.ts
```

Run manifest tests too if the boundary belongs there.

---

# Acceptance Criteria

Step 4 is complete when:

- `selectExportEntries()` has tests for `all`, exact route, and subtree selection;
- all valid selection modes preserve manifest order;
- tests prove selection order is not CLI argument order;
- subtree matching has sibling false-positive coverage;
- missing exact routes throw;
- missing subtree prefixes throw;
- non-exportable requested routes have explicit coverage;
- mixed valid/invalid selections throw without partial results;
- empty selection remains a parser error;
- exportable/non-note route responsibility is documented by tests;
- no production refactor has been introduced;
- the focused test suite passes.
