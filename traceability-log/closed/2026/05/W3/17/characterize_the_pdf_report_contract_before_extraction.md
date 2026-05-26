# [DONE] Characterize the PDF report contract before extraction

## Summary

Lock the current PDF export reporting behaviour before moving any logic from the script layer into
`@ravenhill/lesson-export-core`.

This cycle is a characterization-only step. Its purpose is to capture the existing observable contract around report
shape, summary counters, finding-kind normalization, finding aggregation, entry ordering, input immutability, and
fatal-policy evaluation. Later refactors should be able to delegate pure logic to the core package without changing the
exported JSON report or CLI failure semantics by accident.

No production refactor, API expansion, or semantic cleanup belongs in this cycle.

## Scope

### In scope

- Strengthening existing tests.
- Capturing current behaviour exactly.
- Documenting legacy normalization through assertions.
- Locking report shape and summary counters.
- Locking fatal-policy behaviour as currently implemented.
- Adding regression coverage for input immutability.

### Out of scope

- Moving logic into `@ravenhill/lesson-export-core`.
- Adding new package exports.
- Renaming finding kinds.
- Redesigning summary fields.
- Changing report JSON shape.
- Changing CLI failure semantics.
- Removing legacy aliases.
- Introducing new policy semantics.

## Step 1: Strengthen core package reporting tests

**File**

```text
packages/lesson-export-core/tests/reporting.test.ts
```

**Depends on:** none.

Extend the existing pure reporting tests around `buildExportSummary()` and related helpers.

### Add or tighten coverage for summary shape

Assert the exact summary object shape that downstream consumers rely on:

```ts
{
  selected,
  exported,
  failed,
  skipped,
  findings,
  findingsByKind,
  failuresByKind,
}
```

The test should verify both field presence and values. Prefer exact `toEqual(...)` assertions over piecemeal checks so
accidental field additions, removals, or renames are visible.

### Preserve existing count coverage

Keep the current baseline coverage for:

- kind counts;
- mixed exported and failed entries;
- findings grouped by normalized kind;
- failures grouped by normalized kind.

Do not replace existing useful tests unless the replacement is stricter and clearer.

### Add empty-entry characterization

Add an explicit empty input case.

The expected summary should document the current zero-value contract for:

- `selected`;
- `exported`;
- `failed`;
- `skipped`;
- `findings`;
- `findingsByKind`;
- `failuresByKind`.

This protects later extraction from introducing `undefined`, missing maps, or inconsistent empty collections.

### Characterize unsupported finding and error kinds

Add focused cases for currently unsupported or unknown values in:

- `finding.kind`;
- `error.kind`.

The goal is not to design new behaviour. The goal is to assert whatever the current normalization boundary already does.

For example, the test should make clear whether unknown kinds are:

- preserved;
- normalized to a generic kind;
- omitted;
- counted separately;
- treated differently for findings and failures.

### Add input immutability regression coverage

Add a regression-style test proving that `buildExportSummary()` does not mutate the input entries.

Use a frozen or deep-cloned input where practical, then assert that the original entries remain unchanged after summary
construction.

This is especially important because the helper is a pure-domain candidate for later extraction or reuse.

## Step 2: Tighten script-level report contract tests

**File**

```text
scripts/__tests__/pdf-export-report.test.ts
```

**Depends on:** none. Can run in parallel with Step 1.

These tests should characterize the script adapter’s observable behaviour, especially the JSON report shape and policy
handling used by the CLI path.

### Lock `createExportReport()` JSON shape

Add or strengthen exact-shape assertions for the object returned by `createExportReport()`.

Assert:

- top-level fields;
- nested `summary` shape;
- `entries` shape;
- `entries` ordering;
- generated timestamp field behaviour, if currently present;
- preservation of route/output/error/finding fields.

Use stable matchers for intentionally variable fields such as timestamps, but exact assertions for structural fields.

### Preserve `summarizeExportEntries()` coverage

Keep or tighten existing coverage for:

- empty input;
- all exported entries;
- mixed exported and failed entries;
- skipped entries;
- entries with findings;
- entries with errors;
- failures grouped by kind.

The test should continue to describe the script-facing summary contract even if the implementation later delegates to
the core package.

### Characterize `collectExportFindings()`

Lock `collectExportFindings()` as an adapter boundary.

Assert that it currently preserves or maps the expected field names exactly. The test should make clear whether it is:

- a direct pass-through;
- a shallow projection;
- a normalization point;
- a filtering step.

Do not move behaviour between script and core in this cycle. Only describe what exists.

### Lock `hasFatalExportFindings()` behaviour

Keep or add cases for the current policy matrix:

```ts
failOn: [];
failOn: "any";
failOn: ["specific-normalized-kind"];
failOn: ["legacy-alias"];
```

Include the legacy alias normalization that currently matters, especially:

```text
client-only -> client-only-island
```

Also cover the distinction between:

- no findings;
- findings present but not fatal;
- findings present and fatal;
- multiple findings where only one matches the policy.

### Add malformed policy coverage only if reachable

Add a defensive test for an unknown or malformed policy value only if the current execution path can already pass such a
value into `hasFatalExportFindings()`.

Do not introduce a new runtime contract just to test it. If malformed values are already blocked by CLI parsing, leave
that case to CLI tests instead.

## Step 3: Align test vocabulary with the existing contract

**Depends on:** Steps 1 and 2.

Before finalizing the test changes, review naming and assertions for consistency with the current implementation.

Use the vocabulary already present in the package and script code:

- `entries`;
- `summary`;
- `findings`;
- `findingsByKind`;
- `failuresByKind`;
- `failOn`;
- normalized finding kinds;
- legacy aliases.

Avoid introducing names that imply a future design, such as:

- `policyResult`;
- `diagnostics`;
- `reportModel`;
- `fatality`;
- `issueGroups`;
- `statusReason`.

This keeps the tests honest: they are a golden master for the current contract, not a proposal for the next abstraction.

## Relevant files

```text
packages/lesson-export-core/tests/reporting.test.ts
```

Pure reporting and normalization coverage to extend.

```text
packages/lesson-export-core/src/reporting.ts
```

Current summary contract under characterization.

```text
packages/lesson-export-core/src/findings.ts
```

Finding-kind normalization rules, including supported kinds and legacy aliases.

```text
scripts/__tests__/pdf-export-report.test.ts
```

Script adapter characterization tests for JSON report shape, entry ordering, finding collection, and fatal-policy
behaviour.

```text
scripts/lib/pdf-export-report.mjs
```

Current script adapter implementation under test.

## Verification

Run the focused core reporting tests:

```powershell
pnpm --filter @ravenhill/lesson-export-core test -- reporting
```

Run the script-level report tests:

```powershell
pnpm vitest run scripts/__tests__/pdf-export-report.test.ts
```

Or use the repository’s equivalent focused script-test command if one already exists.

Then run the broader package check only if the focused tests pass:

```powershell
pnpm check:lesson-export-core
```

If these characterization tests expose a mismatch, use this rule:

- If the test expectation describes intended future behaviour, change the test.
- If the implementation contradicts already-documented current behaviour, mark it as a discovered bug and defer the fix
  to a separate cycle.
- If the behaviour is awkward but observable today, assert it as-is.

## Acceptance criteria

This cycle is complete when:

- core reporting tests lock the exact summary shape;
- script tests lock the exact JSON report shape;
- empty inputs are characterized;
- mixed exported, failed, skipped, and finding-bearing entries are covered;
- unsupported finding/error kind behaviour is documented by tests;
- legacy alias normalization is explicitly covered;
- fatal-policy behaviour is covered for empty, `"any"`, targeted, and legacy-alias policies;
- `buildExportSummary()` input immutability is covered;
- no production refactor is introduced;
- no new package export is added.

## Decisions

- This is a characterization cycle, not a cleanup cycle.
- Legacy normalization remains part of the contract for now.
- The script layer remains the owner of JSON report assembly until extraction work begins.
- Unknown or malformed policy inputs should only be tested where the current runtime path can already reach them.
- Exact object assertions are preferred because report shape is the contract being protected.

## Implementation note

The characterization pass has been applied in the current workspace. The reporting contract is now locked by tests in:

- `packages/lesson-export-core/tests/reporting.test.ts`
- `scripts/__tests__/pdf-export-report.test.ts`

The added coverage characterizes:

- empty report summaries with zero-value `findingsByKind` and `failuresByKind` objects;
- mixed report summaries without mutating the input entries;
- script-level report shape preservation, including entry ordering;
- current fatal-policy behavior for empty, `any`, targeted, and legacy-alias-adjacent cases.

Focused validation should use the package's Vitest entry points for the two touched test files.
