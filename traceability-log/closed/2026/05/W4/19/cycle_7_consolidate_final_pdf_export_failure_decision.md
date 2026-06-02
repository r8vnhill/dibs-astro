# [DONE] Cycle 7 — Consolidate Final PDF Export Failure Decision

## Summary

Update `scripts/lib/pdf-export/runner.mjs` so the real PDF export path makes exactly one final post-report failure
decision.

After `writeExportReport(...)` completes, the runner should inspect the completed report for:

- fatal export findings matched by the configured `--fail-on` policy;
- PDF generation failures;
- both categories at once.

If any category is present, the runner throws one combined summary error. This replaces priority-ordered failure checks
with a single final decision point, while preserving the report-first contract.

Vitest is a good fit for this cycle’s matrix because it supports Jest-compatible expectations and backend test
workflows, so the outcome cases can stay compact and table-driven. ([Vitest][1])

## Implementation Notes

Implemented in `scripts/lib/pdf-export/runner.mjs` and `scripts/__tests__/pdf-export/runner.test.ts`.

- Added runner-local `formatFinalExportFailure(...)`.
- Replaced the old priority-ordered final checks with one report-based decision after `writeExportReport(...)`.
- Used `report.summary.failed` as the canonical PDF generation failure count.
- Added a table-driven final outcome matrix covering clean export, generation failures only, fatal findings only, and
  both categories together.
- Preserved the existing success log and report schema.

## Target Behaviour

Successful export:

```txt
[export-lessons-pdf] Exported 2 lesson(s) to dist/exports/pdf.
```

Generation failures only:

```txt
PDF export completed with problems after writing the report:
- PDF generation failed for 2 lesson(s)
Report: dist/exports/pdf/report.json
```

Fatal findings only:

```txt
PDF export completed with problems after writing the report:
- export findings matched the configured --fail-on policy
Report: dist/exports/pdf/report.json
```

Both failure categories:

```txt
PDF export completed with problems after writing the report:
- export findings matched the configured --fail-on policy
- PDF generation failed for 2 lesson(s)
Report: dist/exports/pdf/report.json
```

Keep `options.reportPath` in the user-facing message, not the resolved absolute path.

## Key Changes

### 1. Add a runner-local formatter

Add a small helper in `scripts/lib/pdf-export/runner.mjs`:

```ts
function formatFinalExportFailure({
    hasFatalFindings,
    generationFailureCount,
    reportPath,
}) {
    const bullets = [];

    if (hasFatalFindings) {
        bullets.push("- export findings matched the configured --fail-on policy");
    }

    if (generationFailureCount > 0) {
        bullets.push(`- PDF generation failed for ${generationFailureCount} lesson(s)`);
    }

    return [
        "PDF export completed with problems after writing the report:",
        ...bullets,
        `Report: ${reportPath}`,
    ].join("\n");
}
```

Keep it runner-local for now. This is orchestration messaging, not a new public package API.

### 2. Replace priority-ordered checks with one final decision

After report creation and `writeExportReport(...)`, compute:

```ts
const hasFatalFindings = dependencies.hasFatalExportFindings(
    report,
    options.findingPolicy,
);

const generationFailureCount = report.summary.failed;
```

Then throw only once:

```ts
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

Prefer `report.summary.failed` over maintaining a parallel failure counter unless the existing report summary is not
available at that point. The report is the canonical post-export source of truth.

### 3. Preserve report-first ordering

The final failure decision must happen only after:

```ts
await dependencies.writeExportReport(
    path.resolve(projectRoot, options.reportPath),
    report,
);
```

This keeps the most important operational guarantee: even failed exports produce a report before the CLI exits with
failure.

## Tests

Add table-driven coverage in:

```txt
scripts/__tests__/pdf-export/runner.test.ts
```

### Outcome matrix

Use Pokémon-themed fake targets/findings where fixture names are needed:

| Case                     | Fatal findings | Failed PDFs | Expected result                |
| ------------------------ | -------------: | ----------: | ------------------------------ |
| Clean export             |        `false` |         `0` | resolves and logs success      |
| Generation failures only |        `false` |         `2` | throws generation-only summary |
| Fatal findings only      |         `true` |         `0` | throws findings-only summary   |
| Both categories          |         `true` |         `2` | throws combined summary        |

### Assertions per failure case

Each failure case should assert that:

- `createExportReport(...)` is called;
- `writeExportReport(...)` is called before the runner rejects;
- the thrown message starts with:

```txt
PDF export completed with problems after writing the report:
```

- the message includes only the relevant bullet lines;
- the message ends with:

```txt
Report: dist/exports/pdf/report.json
```

### Clean success case

Assert that:

- the runner resolves;
- the report is written;
- the success log is preserved;
- no final failure error is thrown.

### Existing assertion update

Replace the old failed-target expectation:

```txt
PDF export failed for 1 lesson(s).
```

with the new format:

```txt
PDF export completed with problems after writing the report:
- PDF generation failed for 1 lesson(s)
Report: dist/exports/pdf/report.json
```

## Non-Goals

- Do not change report schema.
- Do not change CLI flags.
- Do not change `--fail-on` parsing.
- Do not change selection behaviour.
- Do not change Playwright export behaviour.
- Do not change per-target failure recording.
- Do not update changelogs in this cycle.
- Do not move formatter logic into `@ravenhill/lesson-export-core`.

## Acceptance Criteria

- The runner performs exactly one final post-report failure decision.
- Fatal findings and PDF generation failures can both appear in one final error.
- Report writing always happens before this final error is thrown.
- Successful exports still log the existing success message.
- The final message uses `options.reportPath`.
- Existing report schema and export behaviour remain unchanged.
- The old priority-ordered failure-message behaviour is removed.

## Verification

Run the focused runner suite:

```bash
pnpm exec vitest run scripts/__tests__/pdf-export/runner.test.ts
```

Then run the related PDF export suites:

```bash
pnpm exec vitest run \
  scripts/__tests__/pdf-export/runner.test.ts \
  scripts/__tests__/pdf-export/pdf-export-report.test.ts \
  scripts/__tests__/pdf-export/pdf-export-cli.test.ts \
  scripts/__tests__/pdf-export/pdf-export-smoke.test.ts
```

Use `pnpm exec vitest run ...` for focused Vitest paths. In this environment, `pnpm test:unit -- ...` forwarded a
literal `"--"` into Vitest and left the process stuck instead of running the intended focused file set.

## Refined Assumptions

- `report.summary.failed` is the canonical generation-failure count.
- `dependencies.hasFatalExportFindings(report, options.findingPolicy)` remains the canonical fatal-finding decision.
- The combined bullet wording from the traceability log is the intended user-facing CLI message.
- Formatter extraction is local to the runner until another consumer needs the same message.

[1]: https://vitest.dev/ "Vitest | Next Generation testing framework"
