# [DONE] Add the Playwright PDF Export CLI

Add an app-local Node CLI that exports lesson PDF files from the Phase 5 static export routes. The CLI should consume
the validated export manifest, optionally build the site, start an `astro preview` server against the built output, wait
for readiness, render selected lessons with Playwright Chromium, write PDFs to deterministic manifest-derived paths, and
emit a structured JSON report.

Implementation status: the CLI is implemented in `scripts/export-lessons-pdf.mjs`, with helper modules under
`scripts/lib/`. It builds the site unless `--skip-build` is set, can reuse an existing `--baseUrl`, exports PDFs with
Playwright Chromium, and writes a JSON report alongside the output tree.

The CLI should be intentionally thin. Route normalization, export-route derivation, output-path derivation, and manifest
validation remain in `@ravenhill/lesson-export-core`. Browser automation, process management, readiness checks, CLI
parsing, and filesystem side effects remain in `scripts/export-lessons-pdf.mjs`.

## Goals

- Export deterministic PDFs from `/exports/pdf/notes/**` routes.
- Restrict exports to manifest-derived lessons, not arbitrary URLs.
- Keep the PDF pipeline auditable through a machine-readable report.
- Preserve normal web rendering behavior.
- Keep Playwright coverage minimal and mostly opt-in because of runtime cost.
- Make failure modes explicit: build failure, preview startup failure, missing export markers, render failure, PDF write
  failure, and content findings.

## Non-goals

- Do not move Playwright or process orchestration into `@ravenhill/lesson-export-core`.
- Do not support arbitrary external URLs.
- Do not introduce a browser-based test suite as a required default check unless runtime cost is accepted.
- Do not make all content findings hard failures in the first pass.
- Do not replace the Phase 5 manifest validation layer.

## CLI Contract

Add a single script entrypoint:

```text
scripts/export-lessons-pdf.mjs
```

Recommended flags:

```text
--route <lessonRoute>
--subtree <routePrefix>
--all
--outDir <directory>
--report <file>
--baseUrl <url>
--port <number>
--skip-build
--keep-server
--fail-on-finding
--timeout <milliseconds>
--dry-run
```

### Selection semantics

Exactly one of these should be required:

```text
--route
--subtree
--all
```

Rules:

- `--route /notes/foo/bar/` exports one manifest entry.
- `--subtree /notes/software-libraries/` exports all manifest entries under that subtree.
- `--all` exports every PDF-capable manifest entry.
- Selection is always applied to validated manifest entries.
- Unknown routes fail with a clear diagnostic.
- Duplicate selections are de-duplicated before export.
- Selection order follows manifest order unless a stronger deterministic ordering already exists in
  `lesson-export-core`.

### Output semantics

- Default `outDir` should be a generated/export directory, for example:

```text
dist/exports/pdf
```

- PDF paths should be derived from the manifest output path, not reconstructed in the CLI.
- The report path should default to something stable, for example:

```text
dist/exports/pdf/report.json
```

- `--dry-run` should resolve and report selected entries without building, starting the server, or writing PDFs.

## Key Changes

### 1. Add dependency and package scripts

Update `package.json`:

- Add `playwright` as a development dependency.
- Add an export script.
- Add an optional browser installation script if the repo does not already manage Playwright browsers.

Suggested scripts:

```json
{
    "scripts": {
        "export:pdf": "node scripts/export-lessons-pdf.mjs",
        "export:pdf:all": "node scripts/export-lessons-pdf.mjs --all",
        "export:pdf:dry-run": "node scripts/export-lessons-pdf.mjs --all --dry-run",
        "playwright:install": "playwright install chromium"
    },
    "devDependencies": {
        "playwright": "^1.x"
    }
}
```

Keep the exact version pinned according to the repository’s dependency policy.

### 2. Add a small CLI boundary layer

Implement argument parsing as a small, testable unit inside the script or a nearby helper module.

Recommended internal shape:

```text
scripts/export-lessons-pdf.mjs
scripts/lib/pdf-export-cli.mjs
scripts/lib/pdf-export-selection.mjs
scripts/lib/pdf-export-report.mjs
scripts/lib/preview-server.mjs
```

If the repo prefers single-file scripts, keep helper functions short and grouped by responsibility.

Suggested responsibilities:

- `parseCliArgs(args)` validates flags and returns a typed options object.
- `selectExportEntries(manifest, selection)` applies `--route`, `--subtree`, or `--all`.
- `resolveOutputTargets(entries, outDir)` maps manifest entries to final PDF paths.
- `startPreviewServer(options)` starts `astro preview`.
- `waitForPreview(url, timeout)` performs readiness polling.
- `exportEntryToPdf(page, entry, target)` handles one route.
- `writeReport(reportPath, report)` writes the batch report.

### 3. Reuse the app-local export manifest adapter

The CLI should import the Phase 5 manifest adapter, not duplicate route derivation.

The adapter should provide enough information for the CLI to avoid guessing:

```ts
type LessonPdfExportEntry = {
    route: LessonRoute;
    exportRoute: ExportRoute;
    outputPath: PdfOutputPath;
    title: string;
    metadata?: LessonMetadata;
};
```

The CLI should fail before launching Playwright if:

- the manifest cannot be loaded;
- manifest validation has `error` findings;
- selection resolves to zero entries;
- output paths are missing or invalid.

Warnings can be included in the report.

### 4. Build and preview the static site

Default behavior:

1. Run the site build.
2. Start `astro preview`.
3. Wait until the preview server responds.
4. Export PDFs.
5. Shut down the preview server.

Rules:

- `--skip-build` skips only the build step.
- `--baseUrl` skips starting a local server and uses an already-running preview server.
- `--keep-server` leaves the spawned server running after export, useful for debugging.
- Process cleanup must run on success, failure, `SIGINT`, and `SIGTERM`.

Recommended behavior:

```text
default:
  pnpm build
  pnpm astro preview --host 127.0.0.1 --port <port>

with --skip-build:
  pnpm astro preview --host 127.0.0.1 --port <port>

with --baseUrl:
  no build unless --skip-build is absent
  no spawned preview server
```

Use `astro preview` rather than `wrangler pages dev` because this exporter targets the built static output from Phase 5.

### 5. Render each selected lesson with Playwright

For each entry:

1. Create the final URL from the preview base URL and `entry.exportRoute`.
2. Open the page with Playwright Chromium.
3. Wait for the document to be loaded.
4. Assert the export document marker exists:

```css
[data-export-role="document"]
```

5. Collect content findings:

```css
[data-export-finding]
```

6. Export the PDF.
7. Record success or failure in the report.

Recommended PDF options:

```ts
{
  format: "A4",
  printBackground: true,
  preferCSSPageSize: true,
  margin: {
    top: "0",
    right: "0",
    bottom: "0",
    left: "0"
  }
}
```

Use CSS `@page` rules for actual page sizing and margins where possible. The CLI should provide stable defaults, but
layout ownership should stay with the export route and print stylesheet.

### 6. Add readiness and render checks

Use explicit checks instead of relying only on `page.goto()`.

Suggested checks:

- HTTP response is successful.
- `[data-export-role="document"]` exists.
- `[data-export-role="body"]` exists.
- Optional: no visible web-only UI marked with `data-export-hidden="true"`.
- Optional: code blocks or static tabs are present for representative smoke fixtures.

Use a page-level timeout that can be overridden by `--timeout`.

### 7. Write a structured report

Write a JSON report next to the PDFs.

Suggested report shape:

```ts
type PdfExportReport = {
    generatedAt: string;
    baseUrl: string;
    outDir: string;
    selection: {
        mode: "route" | "subtree" | "all";
        value?: string;
    };
    summary: {
        selected: number;
        exported: number;
        failed: number;
        findings: number;
    };
    entries: PdfExportReportEntry[];
};

type PdfExportReportEntry = {
    route: string;
    exportRoute: string;
    url: string;
    outputPath: string;
    status: "exported" | "failed" | "skipped";
    title?: string;
    findings: PdfExportFinding[];
    error?: {
        kind: string;
        message: string;
    };
};

type PdfExportFinding = {
    code: string;
    message?: string;
    severity?: "info" | "warning" | "error";
};
```

Rules:

- Always write a report, even on partial failure when possible.
- Exit non-zero if any export fails.
- Exit non-zero for findings only when `--fail-on-finding` is set.
- Keep console output human-readable but non-authoritative; the report is the audit artifact.

### 8. Add tests with a narrow boundary

Prefer fast tests for pure CLI behavior.

Test first:

- CLI flag parsing.
- invalid flag combinations;
- required selection mode;
- route selection;
- subtree selection;
- all selection;
- zero-match failure;
- output-path mapping;
- report summary aggregation;
- failure record formatting.

Use DDT for CLI parsing matrices.

Example cases:

```text
--route /notes/a/                   valid
--subtree /notes/software-libraries/ valid
--all                               valid
--route /notes/a/ --all             invalid
--outDir                            invalid
--route /unknown/                   selection failure
```

Add one optional Playwright smoke test only if the repo is ready for the cost:

- Build a small fixture or use one representative lesson.
- Start preview.
- Export one PDF.
- Assert the PDF exists and report status is `exported`.

Mark this as opt-in if needed:

```text
EXPORT_PDF_SMOKE=1 pnpm test:pdf-smoke
```

## Relevant Files

- `package.json` Add Playwright dependency and script entries.

- `scripts/export-lessons-pdf.mjs` New CLI entrypoint.

- `scripts/lib/pdf-export-cli.mjs` Optional helper for argument parsing.

- `scripts/lib/pdf-export-selection.mjs` Optional helper for manifest filtering.

- `scripts/lib/pdf-export-report.mjs` Optional helper for report construction and writing.

- `scripts/lib/preview-server.mjs` Optional helper for process lifecycle and readiness.

- `src/infrastructure/adapters/lesson-export-manifest.ts` Reuse the app-local manifest adapter.

- `packages/lesson-export-core/src/*` Reuse route normalization, manifest validation, filtering, and output-path
  helpers.

- `src/pages/exports/pdf/notes/[...path].astro` Target route rendered by Playwright.

- `src/layouts/LessonDocumentLayout.astro` Export document shell expected by the CLI.

- `tests/scripts/export-lessons-pdf*.test.ts` or equivalent Focused tests for CLI parsing, selection, and reporting.

## Verification

### Fast checks

Run package and script-level tests first:

```sh
pnpm --filter @ravenhill/lesson-export-core check
pnpm test -- export-lessons-pdf
```

Also run any existing route/manifest tests added in Phase 5.

### Dry run

Confirm selection and output mapping without browser work:

```sh
pnpm export:pdf -- --subtree /notes/software-libraries/ --dry-run
```

Expected result:

- no build;
- no preview server;
- no PDFs;
- report or console summary lists selected entries and target paths.

### Single lesson export

Export one representative lesson with tabs, code blocks, admonitions, and metadata:

```sh
pnpm export:pdf -- --route /notes/software-libraries/artifacts-taxonomy/
```

Confirm:

- PDF exists at the manifest-derived path;
- report contains the selected route;
- report contains final URL and output path;
- findings are recorded;
- exit code is zero if there are no export failures.

### Batch smoke pass

Run a minimal subtree batch:

```sh
pnpm build
pnpm export:pdf -- --subtree /notes/software-libraries/ --skip-build
```

Confirm:

- preview starts from the built site;
- all selected routes are reachable;
- PDFs are written;
- report summary matches actual files;
- server shuts down cleanly.

### Optional Playwright smoke

Use only if accepted as part of the repo’s runtime budget:

```sh
EXPORT_PDF_SMOKE=1 pnpm test:pdf-smoke
```

## Decisions

- Use `astro preview` instead of `wrangler pages dev`.
- Keep Playwright and process orchestration app-local.
- Keep route semantics and path derivation in `@ravenhill/lesson-export-core`.
- Restrict exports to validated manifest entries.
- Treat content findings as report warnings by default.
- Add `--fail-on-finding` for stricter CI use later.
- Make browser-based tests opt-in unless runtime cost is explicitly accepted.
- Use a JSON report as the authoritative batch artifact.

## Risks and Mitigations

| Risk                                                | Mitigation                                                                                                                         |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Playwright adds heavy install/runtime cost          | Keep browser smoke tests opt-in; document `playwright install chromium`; avoid making PDF export part of default checks initially. |
| CLI duplicates route logic                          | Import manifest and route helpers from `lesson-export-core`; add tests that assert CLI uses manifest output paths.                 |
| Preview server remains alive after failure          | Centralize process cleanup and handle `SIGINT`, `SIGTERM`, success, and error paths.                                               |
| Export succeeds but content is incomplete           | Assert export markers and collect `[data-export-finding]` markers into the report.                                                 |
| PDFs vary due to web-only hydration or timing       | Use export-mode routes, static rendering, print CSS, and explicit page readiness checks.                                           |
| Batch output is hard to audit                       | Always write a structured JSON report with per-entry status and findings.                                                          |
| Arbitrary URL export makes output non-deterministic | Allow only manifest-derived entries; use `--baseUrl` only as the server origin, not as arbitrary page input.                       |
| CI becomes slow or flaky                            | Keep full PDF generation outside default CI at first; add a small opt-in smoke job once stable.                                    |

## Acceptance Criteria

- `pnpm export:pdf -- --route <route>` exports exactly one manifest-derived PDF.
- `pnpm export:pdf -- --subtree <prefix>` exports only entries under that route prefix.
- `pnpm export:pdf -- --all` exports every PDF-capable manifest entry.
- Invalid selection combinations fail before build or preview startup.
- The CLI starts and stops `astro preview` cleanly by default.
- `--skip-build`, `--keep-server`, `--baseUrl`, and `--dry-run` have documented behavior.
- Every exported page is checked for `data-export-role="document"`.
- Content findings are captured in the report.
- Export failures produce non-zero exit codes and structured report entries.
- Route and output-path derivation are reused from existing export-core logic.
- Tests cover CLI parsing, selection semantics, output mapping, and report generation.
