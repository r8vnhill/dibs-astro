# [PLAN] Phase 8: Scale Lesson PDF Export to Full-Course Batches

## Summary

Scale the existing PDF exporter from representative smoke exports to reliable full-course batch exports.

Keep the current architectural split:

- `@ravenhill/lesson-export-core` owns pure route, path, manifest, report, and finding contracts.
- `astro-website` adapters build site-specific export manifests from course data.
- `scripts/export-lessons-pdf.mjs` orchestrates build, preview, Playwright, PDF generation, and report writing.

The default batch policy should be strict but resilient:

- Continue processing every selected lesson.
- Write every successful PDF.
- Record every failed lesson in the report.
- Exit non-zero when any selected lesson fails or when a configured fatal finding appears.
- Allow `--continue-on-error` to downgrade partial failures to advisory status, but still fail when every selected
  lesson fails.

This matches the purpose of full-course export: maximise useful output while still making failures visible and
automation-friendly.

## Design Decisions

### 1. Keep failures and findings separate

Use two related but distinct concepts:

- **Failure**: the exporter could not produce the expected PDF for a selected lesson.
- **Finding**: the exporter produced or inspected content and detected a quality issue.

Examples:

- `pdf-generation-failed` should remain a failure/error kind.
- `missing-title`, `missing-source-file`, `client-only-island`, `hidden-content`, and `unresolved-todo` should be
  findings unless the selected policy promotes them to fatal.

This keeps the report clearer and avoids treating content warnings as equivalent to orchestration errors.

### 2. Make finding kinds a shared contract

Add a single exported registry in `@ravenhill/lesson-export-core`, for example:

```ts
export const exportFindingKinds = [
    "missing-title",
    "missing-source-file",
    "pdf-generation-failed",
    "client-only-island",
    "hidden-content",
    "unresolved-todo",
] as const;
```

Then derive the type from the registry.

This gives the CLI, report aggregator, manifest adapter, and render tests one source of truth. It also makes
`--fail-on <findingKind>` validation deterministic before the exporter starts a build or browser session.

### 3. Preserve marker compatibility for one transition cycle

Normalise old DOM markers during collection:

- `data-export-finding="client-only"` → `client-only-island`

Do not emit the old marker from new code. The compatibility layer should live in a small normalisation function with
explicit tests, then be removed in a later cleanup phase.

### 4. Prefer additive report evolution

Keep the current JSON report shape stable and append fields only. Suggested additive fields:

```ts
summary: {
  selected: number
  exported: number
  failed: number
  skipped: number
  findings: number
  findingsByKind: Record<string, number>
  failuresByKind: Record<string, number>
  exitPolicy: {
    continueOnError: boolean
    failOn: string[]
  }
}
```

Each entry should include both manifest findings and DOM findings so users do not need to inspect two sources.

### 5. Use exit policy as a pure function

Move exit-code decision logic into a pure function in the core package or a small script-local module:

```ts
decidePdfExportExitCode(report, policy): 0 | 1
```

This is easier to test than asserting process termination. In the CLI, prefer setting `process.exitCode` after report
writing instead of exiting early, so asynchronous cleanup and file writes can finish predictably; Node documents
`process.exitCode` as the value used when the process exits naturally. ([Node.js][1])

## Implementation Plan

### ~~Step 1: Lock current behaviour~~

Status: complete in `traceability-log/lock_current_pdf_export_behaviour.md`.

Before changing contracts, the current exporter behaviour has been characterized for:

- Current successful single-lesson export report shape.
- Current failed export entry shape.
- Current dry-run behaviour.
- Current manifest finding propagation, if already present.
- Current output path derivation for representative routes.

This reduces the risk of Phase 8 becoming a broad, hard-to-review rewrite.

Baseline notes to preserve or intentionally migrate in later steps:

- `--fail-on-finding` is currently a boolean parser option.
- Report summaries currently include `selected`, `exported`, `failed`, and `findings`; they do not include a dedicated
  `skipped` counter yet.
- DOM findings are currently collected as `{ code, message, severity }` and are not normalised.
- Dry run currently writes skipped entries with resolved output paths and selects 50 lessons for `--all`.

### ~~Step 2: Extend core contracts~~

Status: complete in `traceability-log/step_2_extend_lesson_export_core_contracts.md`.

In `@ravenhill/lesson-export-core`:

- Add the shared finding-kind registry.
- Add `normalizeExportFindingKind()`.
- Add `isExportFindingKind()`.
- Add report aggregation helpers:

  - `countEntriesByStatus()`
  - `countFindingsByKind()`
  - `countFailuresByKind()`
  - `buildExportSummary()`
- Add or harden output path derivation tests:

  - `/notes/`
  - `/notes/software-libraries/`
  - `/notes/software-libraries/api-design/`
  - deeply nested lesson routes
  - unit index routes
  - trailing slash and non-trailing slash inputs, if both are accepted by existing contracts

Keep these helpers pure and free from Astro, Playwright, filesystem, and process APIs.

### ~~Step 3: Replace boolean finding policy with targeted policy~~

Status: complete in `traceability-log/step_3_replace_boolean_finding_policy_with_targeted_policy.md`.

In the CLI parser:

- Added repeatable `--fail-on <findingKind>` and `--fail-on=<findingKind>`.
- Replaced parsed `failOnFinding: boolean` with `findingPolicy: { failOn: "any" | LessonExportFindingKind[] }`.
- Kept `--fail-on-finding` as deprecated shorthand for “fail on any finding” with a CLI-entrypoint deprecation
  warning.
- Validated every supplied finding kind before build, preview, or Playwright startup.
- Rejected conflicting finding-policy flags and preserved existing selection conflict checks:

  - `--all`
  - explicit route selection
  - explicit lesson selection
  - any existing single-target flags

The policy matcher supports both current DOM report findings shaped as `{ code }` and core-style findings shaped as
`{ kind }`, including legacy `client-only` normalization to `client-only-island`.

### Step 4: Stabilise selection semantics

Define selection as a pure operation:

```ts
selectExportEntries(manifest, selection): ExportManifestEntry[]
```

Rules:

- `--all` selects every exportable lesson entry.
- Single-route or explicit selections preserve manifest order, not CLI argument order, unless the existing exporter
  already guarantees argument order.
- Non-note routes are not introduced by `--all`.
- Missing or non-exportable requested routes fail during preflight.
- Empty selection is a CLI error.

Astro static export routes should continue to be generated from `getStaticPaths()` because Astro requires dynamic static
routes to return concrete `params`, with optional `props` for page data. ([Astro Docs][3])

### Step 5: Add resilient batch execution

Refactor the orchestration loop into small functions:

```ts
async function exportSelectedLessons(context, entries, policy): Promise<ExportReport>;
async function exportOneLesson(context, entry): Promise<ExportReportEntry>;
function toFailedExportEntry(entry, error): ExportReportEntry;
```

Per lesson:

- Create or reuse the browser according to the current exporter strategy.
- Open an isolated page/context where practical.
- Visit the export URL.
- Collect DOM findings.
- Generate the PDF.
- Return a successful report entry.

On failure:

- Catch the error at the lesson boundary.
- Record:

  - `status: "failed"`
  - `error.kind: "pdf-generation-failed"`
  - `route`
  - `exportUrl`
  - `outputPath`
  - `message`
- Continue with the next selected lesson.

Playwright’s model supports browser pages and browser contexts as independent browser sessions, so keeping per-lesson
failure isolation explicit is aligned with the tool’s execution model. ([Playwright][4])

### Step 6: Improve DOM finding collection

Add a focused collector:

```ts
collectExportFindings(document): ExportFinding[]
```

It should detect:

- `data-export-finding="client-only"`
- `data-export-finding="client-only-island"`
- `data-export-finding="hidden-content"`
- `data-export-finding="unresolved-todo"`

It should normalise kinds through `normalizeExportFindingKind()` and preserve useful context:

- route
- selector or nearest export role
- text excerpt, when safe and short
- source: `"dom"`

Keep this collector deterministic and covered with render-contract tests.

### Step 7: Merge manifest and DOM findings

For each selected entry, report findings from both sources:

```ts
findings: [
    ...entry.findings.map(withSource("manifest")),
    ...domFindings.map(withSource("dom")),
];
```

This is important because full-course reports should explain both:

- problems known before rendering, such as missing source metadata;
- problems discovered only after rendering, such as unresolved TODO markers or hidden export content.

### Step 8: Finalise exit policy

Use this matrix:

| Scenario                                         |                                             Default exit |                 With `--continue-on-error` |
| ------------------------------------------------ | -------------------------------------------------------: | -----------------------------------------: |
| All selected lessons exported, no fatal findings |                                                      `0` |                                        `0` |
| Some lessons failed, at least one succeeded      |                                                      `1` |                                        `0` |
| All selected lessons failed                      |                                                      `1` |                                        `1` |
| Fatal configured finding appears                 |                                                      `1` | `1` unless explicitly documented otherwise |
| CLI/preflight error                              |                                                      `1` |                                        `1` |
| Dry run preflight succeeds                       | `0` unless fatal findings are included in dry-run report |                                       same |

Recommendation: `--continue-on-error` should only affect PDF generation failures, not explicitly configured `--fail-on`
findings. Otherwise the option becomes ambiguous.

## Test Plan

### Unit tests

Add tests for pure contracts first:

- `normalizeExportFindingKind()`:

  - preserves known kinds;
  - maps `client-only` to `client-only-island`;
  - rejects unknown kinds.
- CLI parsing:

  - repeatable `--fail-on`;
  - deprecated `--fail-on-finding`;
  - `--continue-on-error`;
  - invalid finding kind;
  - mutually exclusive selection flags;
  - empty selection.
- Selection:

  - `--all` selects all exportable manifest entries;
  - explicit route selection preserves manifest order;
  - non-exportable route fails preflight.
- Report aggregation:

  - exported count;
  - failed count;
  - skipped count;
  - total findings;
  - findings grouped by kind;
  - failures grouped by kind;
  - manifest and DOM findings are both included.
- Exit policy:

  - partial failure is non-zero by default;
  - partial failure is zero with `--continue-on-error`;
  - total failure is always non-zero;
  - configured fatal finding is non-zero.

### Adapter and render tests

- Manifest adapter reports:

  - missing title;
  - missing source file;
  - missing generated metadata, if applicable.
- Static export routes still expose:

  - `data-export-role="document"`
  - `data-export-role="metadata"`
  - `data-export-role="body"`
  - `data-export-mode="pdf"`
- Representative DOM markers normalise to:

  - `client-only-island`
  - `hidden-content`
  - `unresolved-todo`

### CLI behaviour tests

Use small fixtures rather than full-course fixtures:

- One successful entry plus one failed entry exits non-zero by default.
- The same scenario exits zero with `--continue-on-error`.
- `--fail-on unresolved-todo` exits non-zero only when that finding appears.
- `--fail-on hidden-content --fail-on unresolved-todo` fails on either kind.
- `--fail-on-finding` fails on any finding and emits a deprecation warning.
- Dry run writes a report without launching preview or Playwright.
- Report path uses the resolved target path, not stale manifest defaults.

### Optional smoke test

Keep the browser-backed check opt-in:

```bash
EXPORT_PDF_SMOKE=1 pnpm test:pdf-smoke
```

This is appropriate because Playwright-backed PDF generation is heavier than pure unit and render tests. Playwright is
designed for browser automation, while Vitest remains better suited for fast unit-level and integration-level checks.
([Playwright][5])

## Verification Commands

```bash
pnpm run check:lesson-export-core
pnpm test:unit -- scripts/__tests__/pdf-export-cli.test.ts scripts/__tests__/pdf-export-report.test.ts
pnpm test:astro
pnpm export:pdf:dry-run
EXPORT_PDF_SMOKE=1 pnpm test:pdf-smoke
```

## Migration Notes

- Keep `--fail-on-finding` for one transition cycle.
- Print a deprecation warning that suggests `--fail-on <kind>` or the documented “any finding” replacement.
- Do not remove existing report fields.
- Do not rename public route/path fields.
- Do not add full-course PDF generation to `pnpm check`.
- Do not update the changelog unless requested.

## Risks and Mitigations

### Risk: Full-course export hides partial failures

Mitigation: always write failures into the report and keep default exit non-zero.

### Risk: Finding terminology drifts across packages

Mitigation: define finding kinds once in `@ravenhill/lesson-export-core` and import them everywhere else.

### Risk: CLI policy becomes confusing

Mitigation: keep `--continue-on-error` scoped to generation failures, and keep `--fail-on` as the explicit
content-quality gate.

### Risk: Reports become hard to consume

Mitigation: keep entry-level details but add summary counters for quick inspection.

### Risk: Browser failures contaminate the batch

Mitigation: catch failures per lesson and isolate Playwright state as much as practical through page/context boundaries.

## Recommended TDD Order

1. Add failing tests for finding-kind normalisation.
2. Implement the finding-kind registry and normaliser.
3. Add failing tests for report summary aggregation.
4. Implement pure aggregation helpers.
5. Add failing tests for CLI parsing and exit policy.
6. Implement parser and pure exit decision logic.
7. Add failing tests for batch partial failure behaviour.
8. Refactor the exporter loop to per-entry results.
9. Add render-contract tests for DOM markers.
10. Add optional smoke coverage only after unit and render contracts are stable.

[1]: https://nodejs.org/api/process.html?utm_source=chatgpt.com "Process | Node.js v26.1.0 Documentation"
[2]: https://vitest.dev/guide/cli?utm_source=chatgpt.com "Command Line Interface | Guide"
[3]: https://docs.astro.build/en/guides/routing/?utm_source=chatgpt.com "Routing - Astro Docs"
[4]: https://playwright.dev/docs/api/class-page?utm_source=chatgpt.com "Page"
[5]: https://playwright.dev/?utm_source=chatgpt.com "Playwright: Fast and reliable end-to-end testing for modern ..."
