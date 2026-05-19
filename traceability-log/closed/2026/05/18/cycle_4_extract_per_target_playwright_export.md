# [DONE] Cycle 4 — Extract Per-Target Playwright Export

## Summary

Move the real per-target Playwright export lifecycle from `scripts/export-lessons-pdf.mjs` into
`scripts/lib/pdf-export-runner.mjs`.

Status: implemented.

After this cycle, the runner should own the full real-export orchestration from prepared targets through browser
shutdown:

- page creation per target;
- navigation to the existing export URL;
- export DOM-contract waits;
- `[data-export-finding]` collection;
- PDF output directory creation;
- PDF writing with the existing options;
- target-level failure capture;
- page cleanup;
- browser cleanup;
- final report writing.

This cycle is strictly behavior-preserving. It must not change URL construction, PDF options, report shape, failure
policy, cleanup expectations, or continue-on-target-failure semantics.

## Target End State

### `scripts/lib/pdf-export-runner.mjs`

Owns:

- manifest preparation, validation, selection, and target resolution;
- build and preview orchestration;
- browser launch and close;
- per-target export loop;
- internal `exportOneTarget(...)`;
- report entry mapping for both success and target-level failure;
- final report writing;
- final failure raising after all targets have been attempted.

### `scripts/export-lessons-pdf.mjs`

Keeps only executable concerns:

- CLI parsing;
- dependency wiring;
- invoking `runPdfExport(...)`;
- process-level exit handling, if that is still outside the runner.

It should no longer carry the real-export loop or the temporary `exportPreparedTargets` hook.

## Non-Goals

- No concurrency.
- No retry policy.
- No report schema changes.
- No new finding kinds.
- No CLI flag changes.
- No PDF layout or print option changes.
- No change to `--keep-server`, `--skip-build`, `--baseUrl`, `--port`, or `--timeout`.

## Implementation Steps

### 1. Characterise the current real-export contract first

Completed in `scripts/__tests__/pdf-export-runner.test.ts`.

Cover one successful target with fake dependencies proving that the runner:

- launches the browser once;
- opens exactly one page for the target;
- navigates to the exact current export URL;
- waits for the existing export DOM contract;
- collects page findings;
- creates the output directory;
- writes the PDF using the exact current PDF options;
- closes the page;
- records an `exported` report entry;
- closes the browser.

Prefer fake browser/page objects over real Playwright here. The point is to lock orchestration behavior, not to run
Chromium in a unit test.

### 2. Add mixed success/failure coverage

Completed in `scripts/__tests__/pdf-export-runner.test.ts`.

- target 1 fails during one target-level operation, such as navigation or PDF writing;
- target 2 still runs;
- the failed target becomes a `pdf-generation-failed` report entry;
- the successful target becomes an `exported` report entry;
- the report is written before the runner raises the final failure;
- the failed target’s page is still closed;
- the browser is still closed.

This test should explicitly protect the current continue-on-target-failure semantics.

### 3. Introduce internal per-target helpers

Move the current per-target loop into `scripts/lib/pdf-export-runner.mjs` and split it into small runner-private
helpers:

```js
async function exportTargets(...) { ... }

async function exportOneTarget(...) { ... }

async function waitForExportDomContract(page, timeout) { ... }

async function collectPageFindings(page) { ... }

function toExportedReportEntry(...) { ... }

function toFailedReportEntry(...) { ... }
```

Keep these helpers private to the module. `runPdfExport(...)` should remain the public runner entry point.

Recommended responsibility split:

- `exportTargets(...)`: owns the sequential loop and accumulation.
- `exportOneTarget(...)`: owns exactly one target’s page lifecycle.
- `waitForExportDomContract(...)`: owns selector waiting only.
- `collectPageFindings(...)`: owns DOM finding extraction only.
- report-entry helpers: isolate report shape mapping in one place.

### 4. Guarantee page cleanup per target

Structure `exportOneTarget(...)` so every created page is closed in a `finally` block:

```js
const page = await browser.newPage();

try {
    // navigate, wait, collect findings, write PDF
} finally {
    await page.close();
}
```

If the existing executable tolerates page-close failures differently, preserve that behavior. Otherwise, keep cleanup
simple and deterministic.

### 5. Guarantee browser cleanup around the whole export loop

Keep browser lifecycle in the runner and wrap it in a dedicated `try/finally`:

```js
const browser = await dependencies.launchBrowser();

try {
    // export all targets
} finally {
    await browser.close();
}
```

This mirrors Playwright’s documented lifecycle pattern of launching a browser, creating pages, and closing the browser
after automation work finishes. ([Playwright][1])

### 6. Replace `page.$$eval` with locator-based finding collection

Replace direct `page.$$eval("[data-export-finding]", ...)` with a locator-based implementation:

```js
const findingLocator = page.locator("[data-export-finding]");

const findings = await findingLocator.evaluateAll((elements) =>
    elements.map((element) => ({
        code: element.getAttribute("data-export-finding"),
        message: element.getAttribute("data-export-message"),
        severity: element.getAttribute("data-export-severity"),
    }))
);
```

Keep the output fields exactly as today: `code`, `message`, and `severity`.

This is a good refactor because Playwright documents locators as the central API for locating elements with
auto-waiting/retry semantics, and its docs specifically describe `locator.evaluateAll(...)` for list extraction.
([Playwright][2]) Playwright also marks selector-wide evaluation APIs such as `$$eval` as discouraged in favour of
locator APIs. ([Playwright][3])

### 7. Remove the temporary executable hook

Completed. The executable now only parses CLI options and calls `runPdfExport(...)`.

Keep a temporary compatibility seam only if a test still needs it during the refactor, but the final Cycle 4 state
should not depend on that hook for real exports.

### 8. Preserve final failure timing

Keep the existing behavior where target-level failures are accumulated, later targets still run, the report is written,
and only then the final failure is raised.

This is the key orchestration invariant for this cycle.

## Relevant Files

- `scripts/lib/pdf-export-runner.mjs` Add `exportTargets(...)`, `exportOneTarget(...)`, browser lifecycle, page
  lifecycle, DOM finding collection, and report entry mapping.

- `scripts/export-lessons-pdf.mjs` Remove the real-export loop and temporary per-target hook usage after migration.

- `scripts/__tests__/pdf-export-runner.test.ts` Add success, mixed success/failure, page cleanup, browser cleanup, and
  report-before-final-failure coverage.

## Verification

Verified with the focused runner suite:

```bash
pnpm test:unit -- scripts/__tests__/pdf-export-runner.test.ts
```

The broader PDF export unit tests remain the next regression pass, especially tests covering:

- CLI flag parsing;
- dry-run report behavior;
- preview orchestration;
- report shape;
- failure policy;
- executable exit behavior.

## Acceptance Criteria

Cycle 4 is complete when:

- `runPdfExport(...)` owns the real per-target export loop.
- The executable no longer performs target export work.
- Each target gets its own Playwright page.
- Every created page is closed on success and failure.
- The browser is closed on success and failure.
- `[data-export-finding]` collection uses locator-based extraction.
- Successful targets still produce the same exported report entries.
- Failed targets still produce `pdf-generation-failed` entries.
- Later targets still run after an earlier target fails.
- The report is written before the final accumulated failure is raised.
- No report schema, URL, PDF option, CLI flag, or failure-policy behavior changes.

All listed criteria are satisfied by the current implementation.

[1]: https://playwright.dev/docs/api/class-playwright?utm_source=chatgpt.com "Playwright Library"
[2]: https://playwright.dev/docs/api/class-locator?utm_source=chatgpt.com "Locator"
[3]: https://playwright.dev/docs/api/class-frame?utm_source=chatgpt.com "Frame"
