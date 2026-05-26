# [DONE] Cycle 3 — Move Build and Preview Lifecycle

## Implementation Status

Implemented.

The runner now owns real-export build and preview lifecycle orchestration. `runPdfExport(...)` prepares targets, runs
the optional site build, normalizes or resolves the export base URL, starts and waits for preview when needed, and stops
the preview server in `finally` unless `keepServer` is enabled. The executable now calls `runPdfExport(...)` for both
dry-run and real export paths, while temporarily injecting `exportPreparedTargets(...)` for the existing
Chromium/page/PDF/report work that will move in Cycle 4+.

## Summary

Move real-export build and preview-server lifecycle orchestration from `scripts/export-lessons-pdf.mjs` into
`scripts/lib/pdf-export-runner.mjs`, while keeping Chromium/page/PDF/report generation outside the runner until a later
cycle.

This cycle is behaviour-preserving for:

- `--skip-build`
- `--baseUrl`
- `--port`
- `--timeout`
- `--keep-server`

The main design goal is to make the runner own the build/preview lifecycle, including cleanup, without forcing browser
export logic into the runner yet.

## Design Direction

Avoid returning raw lifecycle state such as `previewProcess` and a cleanup callback to the executable. That would move
startup into the runner but leave shutdown ownership split across files.

Instead, introduce a continuation/callback boundary:

```js
await runPdfExport({
    projectRoot,
    options,
    dependencies: {
        ...defaultDependencies,
        exportPreparedTargets: async ({ targets, baseUrl }) => {
            // Temporary Cycle 3 bridge:
            // existing Chromium/page/PDF/report work still lives here.
        },
    },
});
```

The runner owns:

- manifest preparation;
- selection and target resolution;
- build execution;
- base URL normalization;
- preview startup;
- preview readiness waiting;
- preview shutdown in `finally`.

The executable temporarily owns only the injected `exportPreparedTargets(...)` implementation.

This keeps the lifecycle cohesive now and gives Cycle 4+ a clean seam for moving browser/PDF/report work into
`pdf-export-runner.mjs`.

## Key Changes

### 1. Extend runner dependencies

Add the following dependencies to `runPdfExport(...)`:

```js
{
  buildSite,
  startPreviewServer,
  waitForPreview,
  stopPreviewServer,
  exportPreparedTargets,
}
```

Where `exportPreparedTargets` is the temporary continuation used by the executable to perform the existing real-export
browser work.

Suggested contract:

```js
/**
 * @param {{
 *   targets: PdfExportTarget[],
 *   baseUrl: string,
 * }} context
 * @returns {Promise<void>}
 */
async function exportPreparedTargets(context) {}
```

Keep the continuation intentionally narrow. Do not pass manifest internals, preview processes, CLI options that are not
needed, or filesystem-specific report state unless current browser/export code strictly requires it.

### 2. Move base URL normalization into the runner

Add a runner-local helper:

```js
function normalizeBaseUrl(baseUrl) {
    return new URL("/", baseUrl).href;
}
```

Then remove the duplicate helper from `scripts/export-lessons-pdf.mjs` after migration.

Preserve current semantics:

- provided `baseUrl` is normalized to the site root;
- provided `baseUrl` does not imply `skipBuild`;
- missing `baseUrl` means the runner starts preview.

### 3. Update non-dry-run runner flow

The real-export path should become:

```js
export async function runPdfExport({ projectRoot, options, dependencies }) {
  const preparedRun = preparePdfExportRun({
    projectRoot,
    options,
    dependencies,
  })

  if (preparedRun.dryRun) {
    return writeDryRunReport(...)
  }

  if (!options.skipBuild) {
    await dependencies.buildSite({ projectRoot })
  }

  let previewProcess
  let baseUrl

  try {
    if (options.baseUrl) {
      baseUrl = normalizeBaseUrl(options.baseUrl)
    } else {
      previewProcess = await dependencies.startPreviewServer({
        projectRoot,
        port: options.port,
      })

      baseUrl = await dependencies.waitForPreview({
        url: `http://127.0.0.1:${options.port}/`,
        timeoutMs: options.timeoutMs,
      })
    }

    await dependencies.exportPreparedTargets({
      targets: preparedRun.targets,
      baseUrl,
    })
  } finally {
    if (previewProcess && !options.keepServer) {
      await dependencies.stopPreviewServer(previewProcess)
    }
  }
}
```

The exact names can differ, but the ownership should stay the same: the runner starts preview and the runner stops
preview.

### 4. Keep the executable thin but transitional

Update `scripts/export-lessons-pdf.mjs` so it calls `runPdfExport(...)` and provides `exportPreparedTargets(...)` as the
temporary bridge.

The executable may still contain the existing browser/page/PDF/report logic, but it should no longer decide:

- whether to build;
- whether to start preview;
- what base URL to use;
- whether to stop preview.

### 5. Do not move unrelated behaviour yet

Do not move the following in this cycle:

- Chromium launch;
- page creation/navigation;
- PDF writing;
- report writing for real exports;
- failure policy evaluation;
- final process exit handling;
- CLI argument parsing.

## Test Plan

Add Cycle 3 coverage to `scripts/__tests__/pdf-export-runner.test.ts`.

Use fake dependencies and BDD-style names that describe observable behaviour rather than implementation details.

### Provided `baseUrl`

Cover that the runner:

- normalizes the provided URL with `new URL("/", baseUrl).href`;
- does not start preview;
- does not wait for preview readiness;
- still calls `buildSite({ projectRoot })` unless `skipBuild` is true;
- calls `exportPreparedTargets(...)` with the resolved `baseUrl` and prepared targets.

Example cases:

```ts
it("normalizes a provided baseUrl before exporting prepared targets", async () => {
    // ...
});

it("does not start preview when baseUrl is provided", async () => {
    // ...
});

it("still builds with a provided baseUrl unless skipBuild is enabled", async () => {
    // ...
});
```

### Missing `baseUrl`

Cover that the runner:

- starts preview with `{ projectRoot, port: options.port }`;
- waits for readiness using `http://127.0.0.1:${options.port}/`;
- passes `options.timeoutMs` to `waitForPreview`;
- uses the ready URL returned by `waitForPreview`;
- calls `exportPreparedTargets(...)` after preview readiness.

Example cases:

```ts
it("starts preview and waits for readiness when baseUrl is missing", async () => {
    // ...
});

it("exports prepared targets using the ready preview baseUrl", async () => {
    // ...
});
```

### Build matrix

Cover that the runner:

- calls `buildSite({ projectRoot })` by default;
- skips `buildSite(...)` when `options.skipBuild` is true;
- fails before preview startup when `buildSite(...)` rejects.

Example cases:

```ts
it("builds before starting preview by default", async () => {
    // ...
});

it("skips build when skipBuild is enabled", async () => {
    // ...
});

it("does not start preview when build fails", async () => {
    // ...
});
```

### Cleanup matrix

Cover that the runner:

- stops preview when preview was started and `keepServer` is false;
- does not stop preview when `keepServer` is true;
- does not stop preview when a provided `baseUrl` avoids preview startup;
- stops preview if `exportPreparedTargets(...)` fails;
- stops preview if `waitForPreview(...)` succeeds but later work fails.

Example cases:

```ts
it("stops preview after a successful export when keepServer is disabled", async () => {
    // ...
});

it("keeps preview running when keepServer is enabled", async () => {
    // ...
});

it("does not stop preview when no preview was started", async () => {
    // ...
});

it("stops preview when exporting prepared targets fails", async () => {
    // ...
});
```

### Ordering assertions

Add explicit ordering checks where the test support already makes this easy:

1. `preparePdfExportRun(...)`
2. `buildSite(...)`
3. `startPreviewServer(...)`
4. `waitForPreview(...)`
5. `exportPreparedTargets(...)`
6. `stopPreviewServer(...)`

Do not overfit every test to the full order. Use one focused ordering test to protect the lifecycle contract.

## Implementation Notes

- Prefer a small internal helper such as `resolveExportBaseUrl(...)` if the real-export branch becomes too large.
- Keep helpers short and dependency-injected where useful.
- Do not expose preview process details outside the runner.
- Keep fake dependency builders local to the runner test file unless duplication emerges later.
- Preserve manifest-order target processing by asserting the exact target list passed to `exportPreparedTargets(...)`.

## Commands

Run the focused suite:

```bash
pnpm test:unit -- scripts/__tests__/pdf-export-runner.test.ts
```

Optionally run nearby coverage:

```bash
pnpm test:unit -- scripts/__tests__/pdf-export-cli.test.ts scripts/__tests__/pdf-export-runner.test.ts
```

## Assumptions

- Cycle 3 does not move browser, page, PDF, report, or final failure-policy logic.
- Existing behaviour where `--baseUrl` does not imply `--skip-build` is preserved.
- `preparePdfExportRun(...)` remains the shared planning helper during this transitional cycle.
- The runner API is internal to `scripts/lib`, but this cycle should still avoid an intentionally leaky temporary shape.
- Cycle 4+ can replace `exportPreparedTargets(...)` by moving the real export implementation directly into the runner.
