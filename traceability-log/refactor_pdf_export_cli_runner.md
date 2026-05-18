# [PLAN] Refactor PDF Export CLI Runner

## Summary

Refactor `astro-website/scripts/export-lessons-pdf.mjs` into a thin executable plus a lifecycle-safe, testable local
runner.

The refactor preserves all externally observable behaviour: existing CLI flags, defaults, report JSON shape, package
scripts, PDF options, selection semantics, preview cleanup, and report-before-failure behaviour. The goal is to make the
runner easier to test and safer to evolve, especially for later concurrency, retry, and typing work.

## Goals

- Keep the executable script small and process-oriented.
- Move orchestration into a local runner with injectable boundaries.
- Ensure page and browser resources are closed even when export work fails.
- Preserve the current “process every selected lesson, write the report, then fail if needed” contract.
- Replace discouraged Playwright APIs with Locator-based equivalents.
- Add BDD-style coverage around lifecycle, failure, and reporting behaviour before broadening capabilities.

## Non-Goals

- No CLI flag changes.
- No report schema changes.
- No PDF rendering option changes.
- No selection semantics changes.
- No changes to `@ravenhill/lesson-export-core`.
- No TypeScript migration in this cycle.
- No `--concurrency`, `--retries`, or new runtime dependency in this cycle.

## Key Changes

### 1. Keep the executable thin

Keep `scripts/export-lessons-pdf.mjs` responsible only for:

- resolving `projectRoot`;
- parsing CLI arguments;
- emitting the existing deprecated `--fail-on-finding` warning;
- calling `runPdfExport({ projectRoot, options })`;
- preserving the existing top-level catch block and `process.exitCode = 1` behaviour.

Extract the warning into a small helper:

```js
function emitDeprecatedFailOnFindingWarningIfNeeded(diagnostics) {
    if (!diagnostics.usedDeprecatedFailOnFinding) {
        return;
    }

    process.emitWarning(
        "--fail-on-finding is deprecated. Use --fail-on <findingKind> instead.",
        {
            type: "DeprecationWarning",
            code: "DIBS_PDF_EXPORT_FAIL_ON_FINDING_DEPRECATED",
        },
    );
}
```

This preserves the current Node warning style. Node documents `DeprecationWarning` as the warning type for deprecated
APIs/features and says these warnings must include a `code` property. ([Node.js][2])

### 2. Add a local runner module

Add:

```txt
scripts/lib/pdf-export-runner.mjs
```

Primary internal API:

```js
async function runPdfExport({ projectRoot, options, dependencies = defaultDependencies })
```

Keep this API script-local and test-oriented. It should not become a package-level public contract.

The runner owns:

- manifest construction and validation;
- target selection and target resolution;
- dry-run report creation;
- optional site build;
- preview-server lifecycle;
- browser lifecycle;
- per-target export loop;
- report writing;
- final failure decision.

### 3. Keep dependency injection narrow

Inject only hard external boundaries:

```js
const defaultDependencies = {
    buildSite,
    buildLessonPdfExportManifest,
    selectExportEntries,
    resolveExportTargets,
    createExportReport,
    collectExportFindings,
    hasFatalExportFindings,
    writeExportReport,
    startPreviewServer,
    waitForPreview,
    stopPreviewServer,
    chromium,
    mkdir,
    now: () => new Date(),
    logger: console,
};
```

Avoid injecting tiny pure helpers unless a test genuinely needs to observe or replace them. This keeps tests flexible
without turning the runner into a service locator.

### 4. Extract per-target export

Add `exportOneTarget(...)` inside `pdf-export-runner.mjs` or a neighbouring local helper.

Responsibilities:

- create one Playwright page;
- navigate to the export URL;
- validate the response;
- wait for the export DOM contract;
- collect DOM findings;
- create the output directory;
- write the PDF;
- close the page in `finally`;
- return an internal per-entry result.

Suggested shape:

```js
async function exportOneTarget({
    browser,
    target,
    baseUrl,
    projectRoot,
    timeoutMs,
    mkdir,
    collectExportFindings,
}) {
    const { entry, outputPath } = target;
    const url = new URL(entry.exportRoute, baseUrl).href;
    const filePath = path.resolve(projectRoot, outputPath);

    const page = await browser.newPage({
        viewport: { width: 1280, height: 1600 },
    });

    try {
        // navigate, wait, collect findings, write PDF
    } finally {
        await page.close();
    }
}
```

### 5. Make browser cleanup unconditional

Wrap browser usage in its own `try/finally`:

```js
const browser = await dependencies.chromium.launch();

try {
    // export selected targets
} finally {
    await browser.close();
}
```

Playwright documents `browser.close()` as disposing the browser object, after which it cannot be used anymore.
([Playwright][3]) The separate page-level `finally` still matters because it gives each target a clean lifecycle and
makes page closure directly testable.

### 6. Replace `page.$$eval` with Locator-based collection

Replace:

```js
await page.$$eval("[data-export-finding]", ...)
```

with:

```js
await page
    .locator("[data-export-finding]")
    .evaluateAll((elements) =>
        elements.map((element) => ({
            code: element.getAttribute("data-export-finding")
                ?? element.dataset.exportFinding
                ?? "unknown",
            message: element.textContent?.trim() || undefined,
            severity: element.getAttribute("data-export-finding-severity")
                ?? element.dataset.exportFindingSeverity
                ?? undefined,
        }))
    );
```

This preserves the collected fields while moving to the Locator API. Playwright describes locators as central to its
auto-waiting and retryability model. ([Playwright][4])

### 7. Centralize export DOM selectors

Use runner-local constants unless they are shared elsewhere:

```js
const exportDomSelectors = {
    document: "[data-export-role=\"document\"]",
    body: "[data-export-role=\"body\"]",
    finding: "[data-export-finding]",
};
```

Add a small helper:

```js
async function waitForExportDomContract(page, timeoutMs) {
    await page.locator(exportDomSelectors.document).waitFor({
        state: "attached",
        timeout: timeoutMs,
    });

    await page.locator(exportDomSelectors.body).waitFor({
        state: "attached",
        timeout: timeoutMs,
    });
}
```

This also fixes the typo from `[data-export-finding"]` to `[data-export-finding]`.

### 8. Introduce an internal result shape

Return one of two internal results from `exportOneTarget(...)`.

Successful export:

```js
{
    status: "exported",
    entry,
    url,
    outputPath,
    findings,
}
```

Failed export:

```js
{
    status: "failed",
    entry,
    url,
    outputPath,
    error: {
        kind: "pdf-generation-failed",
        message,
    },
}
```

Then map results to report entries in one place:

```js
function toReportEntry(result) {
    if (result.status === "exported") {
        return {
            route: result.entry.route,
            exportRoute: result.entry.exportRoute,
            url: result.url,
            outputPath: result.outputPath,
            status: "exported",
            title: result.entry.title,
            findings: result.findings,
        };
    }

    return {
        route: result.entry.route,
        exportRoute: result.entry.exportRoute,
        url: result.url,
        outputPath: result.outputPath,
        status: "failed",
        title: result.entry.title,
        findings: [],
        error: result.error,
    };
}
```

This keeps report object construction out of the Playwright control flow.

### 9. Preserve continue-on-entry-failure behaviour

The runner should catch failures per selected target, record a failed result, and continue with later targets.

Only unexpected orchestration-level failures should abort immediately, for example:

- browser launch failure;
- preview startup failure;
- report writing failure;
- manifest validation failure;
- build failure.

### 10. Combine final failure messaging

After writing the report, compute both failure categories:

```js
const hasFatalFindings = hasFatalExportFindings(report, options.findingPolicy);
const generationFailureCount = report.entries.filter(
    (entry) => entry.status === "failed",
).length;
```

Then throw one summary error if either category applies:

```js
if (hasFatalFindings || generationFailureCount > 0) {
    throw new Error(
        formatFinalExportFailure({
            hasFatalFindings,
            generationFailureCount,
            reportPath: options.reportPath,
        }),
    );
}
```

The message should mention both categories when both happen, for example:

```txt
PDF export completed with problems after writing the report:
- export findings matched the configured --fail-on policy
- PDF generation failed for 2 lesson(s)
Report: dist/pdf-export-report.json
```

## Public Interfaces

No public interface changes.

Preserved:

- CLI flags;
- CLI defaults;
- report path behaviour;
- generated report schema;
- PDF options;
- route selection semantics;
- dry-run behaviour;
- preview-server behaviour;
- package scripts;
- `@ravenhill/lesson-export-core` API.

New internal API:

```js
runPdfExport({ projectRoot, options, dependencies });
```

This API is intentionally local to `scripts/lib`.

## TDD Implementation Plan

### ~~Cycle 1 — Move dry-run orchestration~~

1. Add runner tests proving dry run:

   - writes skipped entries;
   - does not build;
   - does not start preview;
   - does not launch Chromium.
2. Add `pdf-export-runner.mjs`.
3. Move only dry-run report creation into the runner.
4. Keep executable behaviour unchanged.

Use fake entries such as:

```txt
Videodrone / Faceplant
Videodrone / Ty Jonathan Down
```

### Cycle 2 — Move manifest validation and target resolution

1. Add tests proving manifest validation errors fail before:

   - build;
   - preview startup;
   - browser launch.
2. Move manifest construction, validation, selection, and target resolution into the runner.
3. Preserve the current validation error formatting.

### Cycle 3 — Move build and preview lifecycle

1. Add tests proving:

   - `baseUrl` skips preview startup;
   - provided `baseUrl` is normalized;
   - missing `baseUrl` starts preview and waits for readiness;
   - preview is stopped unless `keepServer` is true.
2. Move build and preview orchestration into the runner.
3. Keep preview cleanup in `finally`.

### Cycle 4 — Extract per-target export

1. Add tests proving successful export:

   - opens a page;
   - navigates to the expected URL;
   - waits for the export DOM contract;
   - writes the PDF;
   - closes the page;
   - records an exported report entry.
2. Implement `exportOneTarget(...)`.
3. Keep PDF options exactly unchanged.

### Cycle 5 — Harden failure handling

1. Add tests proving failed page export:

   - records `pdf-generation-failed`;
   - closes the page;
   - continues with later targets;
   - writes the report;
   - fails after report writing.
2. Add tests proving browser closure on unexpected loop/browser errors.
3. Move `browser.close()` into a dedicated `finally`.

### Cycle 6 — Replace finding collection API

1. Add a focused test around the Playwright page double:

   - uses `locator("[data-export-finding]").evaluateAll(...)`;
   - preserves `code`, `message`, and `severity` mapping.
2. Replace `page.$$eval(...)`.
3. Keep collected finding object shape unchanged.

### Cycle 7 — Improve final failure summary

1. Add table-driven tests for final outcomes:

   - no failures and no fatal findings succeeds;
   - generation failures fail after report writing;
   - fatal findings fail after report writing;
   - both categories produce one combined error.
2. Implement `formatFinalExportFailure(...)`.
3. Preserve report-before-failure behaviour.

## Test Plan

Add:

```txt
scripts/__tests__/pdf-export-runner.test.ts
```

BDD-style coverage:

- dry run writes skipped entries without build, preview, or Chromium;
- manifest validation errors fail before build, preview, or Chromium;
- provided `baseUrl` skips preview startup and is normalized;
- missing `baseUrl` starts preview, waits for readiness, and stops it unless `keepServer` is true;
- successful target writes an exported entry and closes the page;
- failed page export records `pdf-generation-failed`, closes the page, continues, writes the report, then fails;
- unexpected orchestration errors still close the browser;
- fatal findings and generation failures produce one combined final error after report writing.

Table-driven tests:

- final failure summary matrix;
- preview cleanup matrix;
- dry-run/base-url selection matrix if useful.

Keep existing suites unchanged:

```txt
scripts/__tests__/pdf-export-cli.test.ts
scripts/__tests__/pdf-export-report.test.ts
scripts/__tests__/pdf-export-smoke.test.ts
```

## Verification Commands

```bash
pnpm test:unit -- \
  scripts/__tests__/pdf-export-cli.test.ts \
  scripts/__tests__/pdf-export-report.test.ts \
  scripts/__tests__/pdf-export-smoke.test.ts \
  scripts/__tests__/pdf-export-runner.test.ts
```

Optional smoke check:

```bash
EXPORT_PDF_SMOKE=1 pnpm test:pdf-smoke
```

## Follow-Up Work

Defer until the runner contract is covered:

- `--concurrency`;
- `--retries`;
- TypeScript migration or `// @ts-check`;
- PBT for route/target/report invariants;
- new dependencies such as `p-limit`;
- richer failure taxonomy beyond `pdf-generation-failed`.

## Assumptions

- This cycle is a behaviour-preserving refactor.
- The report remains the source of detailed export diagnostics.
- The runner is internal infrastructure, not a reusable package API.
- No new dependency is required for this phase.
- Future concurrency must preserve manifest-order report entries.

[1]: https://playwright.dev/docs/api/class-page?utm_source=chatgpt.com "Page"
[2]: https://nodejs.org/api/process.html?utm_source=chatgpt.com "Process | Node.js v26.1.0 Documentation"
[3]: https://playwright.dev/docs/api/class-browser?utm_source=chatgpt.com "Browser"
[4]: https://playwright.dev/docs/api/class-locator?utm_source=chatgpt.com "Locator"
