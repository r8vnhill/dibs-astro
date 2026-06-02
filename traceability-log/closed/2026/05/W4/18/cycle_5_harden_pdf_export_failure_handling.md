# [DONE] Cycle 5 — Harden PDF Export Failure Handling

## Summary

Harden the already-extracted PDF export runner around failure paths while preserving the public contract.

This cycle must not change CLI flags, report schema, target selection, PDF options, preview lifecycle semantics, or
final failure-summary wording. Its scope is limited to proving that recoverable per-target export failures are
accumulated into the report, later targets still run, and browser/page cleanup happens across both recoverable and
unrecoverable failures.

The key distinction for this cycle is:

- **recoverable target failure**: one target fails during page export, is reported as `pdf-generation-failed`, and the
  runner continues exporting later targets;
- **unrecoverable orchestration failure**: setup, page allocation, report creation, or report writing fails, and the
  runner rejects while still closing owned browser resources.

Playwright’s `browser.newPage()` creates a page in a new browser context, and closing that page also closes the context,
so the tests should treat page closure as the per-target cleanup boundary. Browser closure remains the outer resource
cleanup boundary. ([Playwright][1])

## Goals

- Lock recoverable per-target failure behavior.
- Lock browser cleanup for every failure path where a browser was successfully created.
- Lock page cleanup for target failures where a page was successfully created.
- Lock report-write ordering for generation failures.
- Avoid changing user-facing failure policy or summary wording.

## Non-Goals

- Do not change CLI argument parsing.
- Do not change report JSON shape.
- Do not change PDF options.
- Do not change selection or manifest-order behavior.
- Do not introduce combined fatal-finding/generation-failure messaging.
- Do not redesign the page/context lifecycle.
- Do not add page-close failure handling unless tests reveal an existing regression.
- Do not add browser-close assertions for browser launch failure, because no browser instance exists.

## Test Strategy

Extend `scripts/__tests__/pdf-export/pdf-export-runner.test.ts` with BDD-style cases using injected fake dependencies.
Prefer `vi.fn()`/spies for observable calls and a shared `events: string[]` trace for ordering-sensitive assertions;
Vitest’s official mocking API supports both `vi.fn()` and `vi.spyOn()` for tracking calls and replacing dependency
behavior. ([Vitest][2])

Use Pokémon-themed fake lesson targets, for example:

- `/notes/pallet-town/bulbasaur/`
- `/notes/viridian-forest/caterpie/`
- `/notes/cerulean-cave/mewtwo/`

Keep the fixtures small and domain-readable; the behavior under test is failure handling, not manifest construction.

## Test Cases

### 1. Recoverable target export failure is reported and export continues

Add a case where the first target fails during page-level export, while the second target succeeds.

Assert that:

- the failed target produces a report entry with:

```ts
{
  status: "failed",
  error: {
    kind: "pdf-generation-failed",
    // existing message/details shape preserved
  },
}
```

- the failed target page is closed;
- the later target still exports;
- the successful later target receives the normal successful report entry;
- the report contains both entries in target/manifest order;
- `writeExportReport()` is called before the runner rejects with the existing generation-failure policy;
- `browser.close()` is called after report writing.

Use an explicit event trace such as:

```ts
[
    "new-page:pallet-town",
    "export-failed:pallet-town",
    "page-close:pallet-town",
    "new-page:viridian-forest",
    "export-ok:viridian-forest",
    "page-close:viridian-forest",
    "create-report",
    "write-report",
    "browser-close",
];
```

The exact labels can differ, but the test should verify ordering without depending on implementation-private helper
names.

### 2. `browser.newPage()` failure closes the browser

Add a case where `browser.newPage()` rejects before a page exists.

Assert that:

- no page-close assertion is required;
- no later targets export, because this is an orchestration failure rather than a target export failure;
- `browser.close()` is still called;
- the runner rejects with the original `newPage()` failure, unless existing behavior wraps it.

This locks the difference between “target export failed after page acquisition” and “the runner could not allocate a
page”.

### 3. Report creation failure closes the browser

Add a case where all target exports complete, but `createExportReport()` rejects.

Assert that:

- exported pages are closed before report creation;
- `writeExportReport()` is not called;
- `browser.close()` is called after the failed report-creation attempt;
- the runner rejects with the report-creation error, preserving current behavior.

### 4. Report writing failure closes the browser

Add a case where target export and report creation succeed, but `writeExportReport()` rejects.

Assert that:

- `createExportReport()` is called;
- `writeExportReport()` is called;
- `browser.close()` is called after the failed write attempt;
- the runner rejects with the report-write error, preserving current behavior.

This case is important because report writing is the last observable step before the runner’s final failure policy.
Browser cleanup must not depend on successful report persistence.

### 5. Successful export still closes the browser

Keep or strengthen the existing success-path assertion:

- all target pages close;
- report is created and written;
- browser closes after report writing;
- the runner resolves normally.

This prevents the new failure assertions from accidentally making cleanup failure-only.

## Implementation Plan

1. **Add red tests first.** Extend the existing runner test file with the failure cases above. Reuse existing fake
   dependency builders where possible, but introduce a small event recorder if the current tests cannot express ordering
   clearly.

2. **Centralize fake browser/page setup.** Add a helper that creates a fake browser with controlled `newPage()` behavior
   and fake pages with observable `close()` calls. Keep this helper local to the test file unless it is already
   duplicated elsewhere.

3. **Model recoverable export failure at the page-export boundary.** Simulate the failure at the dependency that
   currently performs navigation, DOM checks, finding collection, PDF writing, or the equivalent extracted target-export
   operation. Do not bypass the runner’s real error-to-report conversion path.

4. **Assert report entries, not internal helper calls.** The important observable contract is the report entry shape and
   ordering. Avoid assertions against private helper names such as `exportOneTarget(...)`.

5. **Adjust production only if tests expose a gap.** The expected implementation shape is already correct: page cleanup
   belongs in the per-target `try/finally`, and browser cleanup belongs in the outer `try/finally`. Keep changes
   minimal.

6. **Preserve rejection semantics.** For recoverable target failures, the runner should write the report and then reject
   according to the existing generation-failure policy. For unrecoverable orchestration/report failures, preserve the
   currently dominant error instead of introducing new wrapping.

## Acceptance Criteria

- Per-target export failures produce failed report entries with `error.kind: "pdf-generation-failed"`.
- Per-target export failures do not prevent later targets from exporting.
- Pages are closed after successful target exports and after failed target exports where a page was created.
- The report is written before the runner rejects for accumulated generation failures.
- `browser.close()` happens after report writing on success and recoverable generation failure.
- `browser.close()` also happens after:

  - `browser.newPage()` failure;
  - `createExportReport()` failure;
  - `writeExportReport()` failure.
- Browser launch failure remains covered by existing preview-cleanup tests and does not require a browser-close
  assertion.
- Preview cleanup behavior remains covered by existing Cycle 3 tests.
- Final failure-summary wording remains unchanged.

## Suggested Focused Command

```bash
pnpm test:unit -- scripts/__tests__/pdf-export/pdf-export-runner.test.ts
```

If the package-script argument forwarding still hangs, use the repository’s known focused Vitest invocation directly,
but do not modify tracked files as part of this cycle.

## Refined Assumptions

- Cycle 5 is behavior-preserving.
- `pdf-generation-failed` remains the only per-target generation failure kind.
- `browser.close()` is best-effort cleanup but should still be awaited by the runner.
- Page-close failure behavior remains out of scope unless the current implementation already mishandles it.
- Combined fatal-finding/generation-failure messaging remains Cycle 7 work.

## Implementation Notes

Implemented by extending `scripts/__tests__/pdf-export/pdf-export-runner.test.ts`.

No production code changes were required. The Cycle 4 runner already had the intended lifecycle shape:

- `exportOneTarget(...)` closes each acquired page in `finally`;
- `exportPreparedRun(...)` closes the launched browser in a dedicated `finally`;
- recoverable target export failures are converted into `pdf-generation-failed` report entries;
- unrecoverable page allocation and report persistence failures preserve their original rejection.

Added coverage for:

- successful exports closing all pages and the browser after report writing;
- recoverable page-export failure preserving target order, closing the failed page, continuing with later targets,
  writing the report, and then rejecting with the existing generation-failure message;
- `browser.newPage()` failure closing the browser without creating or writing a report;
- `createExportReport()` failure closing the browser without writing a report;
- `writeExportReport()` failure closing the browser after the write attempt.

## Verification

Passed:

```bash
pnpm exec vitest run scripts/__tests__/pdf-export/pdf-export-runner.test.ts
```

Result:

```txt
Test Files  1 passed (1)
Tests       16 passed (16)
```

[1]: https://playwright.dev/docs/api/class-browser?utm_source=chatgpt.com "Browser"
[2]: https://vitest.dev/guide/mocking?utm_source=chatgpt.com "Mocking | Guide"
