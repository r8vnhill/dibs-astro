# [DONE] Move Dry-Run Orchestration Into a Local Runner

## Summary

Move the current `--dry-run` execution path from `scripts/export-lessons-pdf.mjs` into a new internal runner module.

This first slice should preserve the current observable behavior: the manifest is still built and validated, selected
export targets are still resolved, the dry-run report still contains skipped entries, and the report is still written
before returning. The runner must not build the site, start the preview server, or launch Chromium during a dry run.

This is a narrow TDD cycle. It introduces the runner boundary without moving browser, preview, build, or per-target PDF
generation logic yet.

## Scope

### In scope

- Add `scripts/lib/pdf-export-runner.mjs`.
- Add `runPdfExport({ projectRoot, options, dependencies? })`.
- Move the dry-run orchestration into the runner.
- Move the shared preflight needed by dry-run into the runner:

  - manifest construction;
  - manifest validation;
  - entry selection;
  - target resolution.
- Preserve the existing dry-run report shape and values.
- Preserve the existing CLI behavior for non-dry-run execution.
- Add focused runner tests for the dry-run path.

### Out of scope

- No browser lifecycle changes.
- No preview-server lifecycle changes.
- No build orchestration changes.
- No Playwright page extraction.
- No `page.$$eval` replacement yet.
- No final failure-message refactor.
- No TypeScript migration.
- No new dependencies.
- No CLI flag changes.

## Important Boundary Decision

Do **not** make the executable fully thin in this cycle unless all non-dry-run orchestration also moves.

For this cycle, use one of these two safe shapes:

### Preferred shape

The executable parses CLI args, emits the deprecation warning, and then branches:

```js
if (options.dryRun) {
    await runPdfExport({ projectRoot, options });
    return;
}

// Existing non-dry-run logic remains here for now.
```

This keeps the slice honest: the runner owns dry-run only, and the executable remains partially responsible for the
legacy non-dry-run path until later cycles.

### Alternative shape

`runPdfExport(...)` can return a sentinel for non-dry-run options:

```js
const result = await runPdfExport({ projectRoot, options });

if (result.status === "not-handled") {
    // Existing non-dry-run logic continues in the executable.
}
```

This is more awkward and less valuable for the first cycle, so I would avoid it unless the next cycle immediately moves
the rest of the orchestration.

## Key Changes

### 1. Add the runner module

Create:

```txt
scripts/lib/pdf-export-runner.mjs
```

Initial public-internal API:

```js
export async function runPdfExport({
    projectRoot,
    options,
    dependencies = defaultDependencies,
}) {
    // dry-run path only for this cycle
}
```

This is an internal script module, not a package API.

### 2. Move dry-run preflight into the runner

The runner should perform the same preflight currently required by the dry-run path:

1. Build the export manifest.
2. Reject manifest validation errors.
3. Select export entries.
4. Resolve output targets.
5. Create the dry-run report.
6. Write the report.
7. Log the dry-run summary.
8. Return without invoking build, preview, or Chromium.

The dry-run branch should happen **after** manifest validation and target resolution, but **before** build, preview, and
browser work.

### 3. Preserve current dry-run report semantics

Keep the same values currently produced by the executable:

```js
{
    generatedAt: dependencies.now().toISOString(),
    baseUrl: options.baseUrl ?? "dry-run",
    outDir: options.outDir,
    selection: options.selection,
    entries: targets.map(({ entry, outputPath }) => ({
        route: entry.route,
        exportRoute: entry.exportRoute,
        url: options.baseUrl
            ? new URL(entry.exportRoute, options.baseUrl).href
            : entry.exportRoute,
        outputPath,
        status: "skipped",
        title: entry.title,
        findings: [],
    })),
}
```

Do not normalize `baseUrl` in this cycle unless the current dry-run path already does. This cycle should preserve
behavior, not improve URL semantics.

### 4. Keep dependency injection narrow but sufficient

For this cycle, inject only the boundaries needed by dry-run:

```js
const defaultDependencies = {
    buildLessonPdfExportManifest,
    selectExportEntries,
    resolveExportTargets,
    createExportReport,
    writeExportReport,
    now: () => new Date(),
    logger: console,
};
```

Do **not** inject build, preview, or Chromium yet unless the test specifically needs “poison pill” dependencies to prove
they are not called. Since those dependencies are out of scope for the runner in this cycle, absence is cleaner than
unused injection.

### 5. Keep validation error formatting stable

Move or reuse the existing validation formatting without changing its message shape:

```js
function formatValidationErrors(findings) {
    return [
        "PDF lesson export manifest is invalid:",
        ...findings.map((finding) => `- ${finding.message}`),
    ].join("\n");
}
```

If this helper remains in the executable for now, duplicate only temporarily or move it into the runner if dry-run
validation now lives there. Prefer moving it with the validation logic.

### 6. Keep the executable partially thin

Update `scripts/export-lessons-pdf.mjs` only enough to route dry-run execution through the runner.

It should still own:

- CLI parsing;
- deprecation warning emission;
- non-dry-run legacy flow;
- top-level catch block and `process.exitCode = 1`.

Do not move non-dry-run code in this cycle.

## TDD Steps

### Step 1 — Add the dry-run runner test first

Create:

```txt
scripts/__tests__/pdf-export-runner.test.ts
```

Add a focused BDD-style test:

```txt
describe("runPdfExport")
  describe("with dryRun enabled")
    it("writes a skipped-entry report without build, preview, or Chromium work")
```

Use fake lesson data inspired by _**Videodrome**_, for example:

```txt
Civic TV / Unauthorized Signal
Spectacular Optical / New Flesh
Cathode Ray Mission / O'Blivion Archive
```

Suggested fixture entries:

```js
const entries = [
    {
        route: "/notes/civic-tv/unauthorized-signal/",
        exportRoute: "/exports/pdf/notes/civic-tv/unauthorized-signal/",
        title: "Civic TV / Unauthorized Signal",
    },
    {
        route: "/notes/spectacular-optical/new-flesh/",
        exportRoute: "/exports/pdf/notes/spectacular-optical/new-flesh/",
        title: "Spectacular Optical / New Flesh",
    },
];
```

The test should assert:

- `buildLessonPdfExportManifest` is called with `{ outDir: options.outDir }`;
- `selectExportEntries` receives the manifest and `options.selection`;
- `resolveExportTargets` receives selected entries and `options.outDir`;
- `createExportReport` receives:

  - fixed `generatedAt`;
  - `baseUrl: options.baseUrl ?? "dry-run"`;
  - configured `outDir`;
  - configured `selection`;
  - skipped entries;
- `writeExportReport` receives `path.resolve(projectRoot, options.reportPath)`;
- logger receives the dry-run summary;
- no build, preview, or Chromium dependency exists or is called.

### Step 2 — Add validation failure coverage

Add a second test:

```txt
it("fails on manifest validation errors before writing the dry-run report")
```

Assert:

- the thrown error preserves the current validation message;
- `selectExportEntries` is not called;
- `resolveExportTargets` is not called;
- `createExportReport` is not called;
- `writeExportReport` is not called.

This locks the preflight order.

### Step 3 — Add base URL table-driven coverage

Add a small DDT matrix for dry-run URL behavior:

```js
[
    {
        name: "without baseUrl",
        baseUrl: undefined,
        expectedReportBaseUrl: "dry-run",
        expectedEntryUrl: "/exports/pdf/notes/civic-tv/unauthorized-signal/",
    },
    {
        name: "with baseUrl",
        baseUrl: "http://127.0.0.1:4321/",
        expectedReportBaseUrl: "http://127.0.0.1:4321/",
        expectedEntryUrl: "http://127.0.0.1:4321/exports/pdf/notes/civic-tv/unauthorized-signal/",
    },
];
```

This prevents accidental URL normalization changes during the refactor.

### Step 4 — Implement the runner

Add `scripts/lib/pdf-export-runner.mjs`.

Keep helpers small:

```js
export async function runPdfExport({ projectRoot, options, dependencies = defaultDependencies }) {
    const { manifest, validation } = dependencies.buildLessonPdfExportManifest({
        outDir: options.outDir,
    });

    assertValidManifest(validation);

    const selectedEntries = dependencies.selectExportEntries(
        manifest,
        options.selection,
    );

    const targets = dependencies.resolveExportTargets(
        selectedEntries,
        options.outDir,
    );

    if (!options.dryRun) {
        throw new Error("pdf-export-runner currently only handles dry-run execution.");
    }

    await writeDryRunReport({
        projectRoot,
        options,
        targets,
        dependencies,
    });
}
```

For this exact cycle, this function should only be called when `options.dryRun` is true, so the non-dry-run error is
defensive rather than part of normal flow.

### Step 5 — Update the executable

In `scripts/export-lessons-pdf.mjs`, after parsing options and emitting the deprecation warning:

```js
if (options.dryRun) {
    await runPdfExport({ projectRoot, options });
    return;
}
```

Leave the current non-dry-run logic in place.

### Step 6 — Refactor only after tests pass

Once the tests pass, clean up duplication:

- remove the old dry-run branch from the executable;
- remove now-unused imports from the executable if they were only needed for dry-run;
- keep non-dry-run imports untouched until later cycles.

## Implementation Note

Cycle 1 has been implemented in the workspace. The dry-run path now routes through `scripts/lib/pdf-export-runner.mjs`,
and the focused coverage lives in `scripts/__tests__/pdf-export-runner.test.ts`.

## Relevant Files

```txt
scripts/export-lessons-pdf.mjs
scripts/lib/pdf-export-runner.mjs
scripts/lib/pdf-export-report.mjs
scripts/lib/pdf-export-cli.mjs
scripts/lib/pdf-export-manifest.mjs
scripts/__tests__/pdf-export-runner.test.ts
scripts/__tests__/pdf-export-report.test.ts
```

## Verification

Run the new focused test:

```bash
pnpm test:unit -- scripts/__tests__/pdf-export-runner.test.ts
```

Run the report contract tests:

```bash
pnpm test:unit -- scripts/__tests__/pdf-export-report.test.ts
```

Run the existing CLI/report-related tests if available:

```bash
pnpm test:unit -- \
  scripts/__tests__/pdf-export-cli.test.ts \
  scripts/__tests__/pdf-export-report.test.ts \
  scripts/__tests__/pdf-export-runner.test.ts
```

Optional manual dry-run check:

```bash
pnpm export:lessons:pdf -- --dry-run
```

Adjust the command to match the repository’s actual package script name.

## Exit Criteria

This cycle is complete when:

- dry-run execution goes through `runPdfExport(...)`;
- dry-run still writes the same skipped-entry report shape;
- manifest validation still happens before dry-run report creation;
- dry-run does not build, start preview, or launch Chromium;
- non-dry-run behavior remains in the executable and is not intentionally changed;
- existing report tests still pass;
- no new dependency has been added.

## Follow-Up Cycles

After this lands, the next safe cycles are:

1. Move manifest validation and target resolution for both dry-run and non-dry-run into the runner.
2. Move build and preview lifecycle into the runner.
3. Extract `exportOneTarget(...)`.
4. Add page/browser cleanup guarantees.
5. Replace `page.$$eval(...)` with `locator(...).evaluateAll(...)`.
6. Combine fatal finding and generation failure messaging after report writing.
