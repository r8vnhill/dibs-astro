# [DONE] Cycle 2: Move Manifest Validation And Target Resolution

## Implementation Status

Implemented.

The runner module now exposes `preparePdfExportRun(...)` as the shared planning boundary for manifest construction,
validation, selection, and target resolution. `runPdfExport(...)` uses that plan for dry runs and keeps the temporary
non-dry-run guard. `scripts/export-lessons-pdf.mjs` uses the same planning helper for real exports, then continues with
the existing build, preview, browser, PDF, report, and final failure orchestration until Cycle 3.

## Summary

Move PDF export manifest planning out of `scripts/export-lessons-pdf.mjs` and into `scripts/lib/pdf-export-runner.mjs`.

This cycle is behavior-preserving. It should extract the shared planning boundary — manifest construction, manifest
validation, entry selection, and target resolution — while leaving build, preview startup, browser orchestration, real
PDF generation, real export report writing, and final failure handling in the executable until a later cycle.

The key design constraint is that non-dry-run CLI behavior must not be stranded behind the runner’s temporary guard. To
avoid that, introduce a planning helper inside the runner module and have both paths use it:

- `preparePdfExportRun(...)` owns manifest validation, selection, and target resolution.
- `runPdfExport(...)` uses that helper for dry-run execution.
- `scripts/export-lessons-pdf.mjs` temporarily uses that same helper for the real export path, then continues with its
  existing build/preview/PDF orchestration.

Cycle 3 can then move the remaining real export orchestration into `runPdfExport(...)`.

## Goals

- Remove manifest planning duplication from the executable.
- Preserve dry-run behavior byte-for-byte.
- Preserve non-dry-run CLI behavior.
- Make target resolution testable through the runner module before moving real export orchestration.
- Keep the runner internal to `scripts/lib`; no CLI flag or report schema changes.

## Non-Goals

- Do not move build orchestration.
- Do not move preview server startup.
- Do not move Chromium/browser lifecycle management.
- Do not move real PDF generation.
- Do not move real export report writing.
- Do not change selection semantics.
- Do not change validation diagnostics.
- Do not change final process exit behavior.

## Proposed Design

Add a planning helper to `scripts/lib/pdf-export-runner.mjs`:

```js
export function preparePdfExportRun({
    projectRoot,
    options,
    dependencies = defaultDependencies,
}) {
    const manifest = dependencies.buildLessonPdfExportManifest({
        outDir: options.outDir,
    });

    const validationErrors = manifest.findings.filter(
        (finding) => finding.severity === "error",
    );

    if (validationErrors.length > 0) {
        throw new Error(formatValidationErrors(validationErrors));
    }

    const selectedEntries = dependencies.selectExportEntries(
        manifest,
        options.selection,
    );

    const targets = dependencies.resolveExportTargets(
        selectedEntries,
        options.outDir,
    );

    return {
        manifest,
        selectedEntries,
        targets,
    };
}
```

Then update `runPdfExport(...)` so it delegates planning to `preparePdfExportRun(...)` before deciding how to execute:

```js
export async function runPdfExport({
    projectRoot,
    options,
    dependencies = defaultDependencies,
}) {
    const plan = preparePdfExportRun({
        projectRoot,
        options,
        dependencies,
    });

    if (options.dryRun) {
        return writeDryRunReport({
            projectRoot,
            options,
            targets: plan.targets,
            dependencies,
        });
    }

    throw new Error("pdf-export-runner currently only handles dry-run execution.");
}
```

The exact helper names can change, but the important boundary is:

1. one helper prepares the export plan;
2. dry-run consumes the plan inside the runner;
3. the executable consumes the same plan for real exports until Cycle 3.

## Key Changes

### `scripts/lib/pdf-export-runner.mjs`

Move the following responsibilities into the runner module:

- `buildLessonPdfExportManifest({ outDir: options.outDir })`
- filtering validation findings to `severity === "error"`
- formatting and throwing the existing validation error
- `selectExportEntries(manifest, options.selection)`
- `resolveExportTargets(selectedEntries, options.outDir)`

Add or keep the following local responsibilities:

- `preparePdfExportRun(...)`
- `runPdfExport(...)`
- dry-run skipped-entry report creation
- dry-run report writing
- dry-run URL formatting

Keep dry-run behavior exactly as it is now:

- selected targets become skipped report entries;
- report `baseUrl` remains `options.baseUrl ?? "dry-run"`;
- entry URLs remain route-only when `baseUrl` is absent;
- entry URLs become absolute when `baseUrl` is present;
- no build, preview, browser, or PDF generation work occurs.

For non-dry-run direct runner calls:

- manifest validation runs first;
- entry selection runs second;
- target resolution runs third;
- then `runPdfExport(...)` throws:

```text
pdf-export-runner currently only handles dry-run execution.
```

That guard is temporary and should be removed in Cycle 3.

### `scripts/export-lessons-pdf.mjs`

Remove direct imports and duplicated code for:

- `buildLessonPdfExportManifest`
- `selectExportEntries`
- `resolveExportTargets`
- local `formatValidationErrors`
- the local manifest validation / selection / target-resolution block

Replace the removed block with a call to the runner-module planning helper:

```js
const { manifest, selectedEntries, targets } = preparePdfExportRun({
    projectRoot,
    options,
});
```

Then keep the executable’s existing real export orchestration unchanged after that point.

This keeps the executable thin without forcing it to call `runPdfExport(...)` for non-dry-run before the runner is ready
to own real execution.

## Test Plan

Extend `scripts/__tests__/pdf-export-runner.test.ts`.

Use fake lesson data based on **Blackthorne** references, for example:

- `Blackthorne / Androth`
- `Blackthorne / Tuul`
- `Blackthorne / Stonefist`
- `/notes/blackthorne/androth/`
- `/notes/blackthorne/tuul/`

### 1. Non-dry-run validation failure stops before selection

Add a test where:

- `options.dryRun` is `false`;
- the dependency manifest returns one `error` and one `warning`;
- `runPdfExport(...)` rejects with the existing byte-compatible message:

```text
PDF lesson export manifest is invalid:
- Missing title.
```

Assert that these dependencies are not called:

- `selectExportEntries`
- `resolveExportTargets`
- `createExportReport`
- `writeExportReport`
- build double, if present
- preview double, if present
- browser/Chromium double, if present

This test locks the validation boundary and proves warnings alone do not participate in the fatal validation message.

### 2. Non-dry-run resolves targets before temporary guard

Add a test where:

- the manifest is valid;
- `options.dryRun` is `false`;
- `selectExportEntries(...)` returns selected entries;
- `resolveExportTargets(...)` returns resolved targets.

Assert the call sequence:

1. `buildLessonPdfExportManifest({ outDir: options.outDir })`
2. `selectExportEntries(manifest, options.selection)`
3. `resolveExportTargets(selectedEntries, options.outDir)`
4. `runPdfExport(...)` rejects with:

```text
pdf-export-runner currently only handles dry-run execution.
```

Also assert:

- no report is created;
- no report is written;
- no build/preview/browser/PDF dependency is called.

### 3. Planning helper returns the real export plan

Add a focused test for `preparePdfExportRun(...)` directly.

Assert it returns:

```js
{
  manifest,
  selectedEntries,
  targets,
}
```

This protects the temporary executable integration and makes Cycle 3 easier, because real orchestration can later move
from the CLI into `runPdfExport(...)` without retesting manifest planning through the CLI.

### 4. Dry-run tests remain unchanged

Keep the existing dry-run behavior tests passing.

Only update fixtures where necessary to expose additional “must not call” boundaries for:

- build;
- preview startup;
- Chromium/browser launch;
- PDF generation.

Do not rewrite dry-run assertions unless the extracted planning helper makes the current fixture shape impossible to
maintain.

### 5. CLI regression test for behavior preservation

Extend or preserve `scripts/__tests__/pdf-export-cli.test.ts` so the executable still proves that non-dry-run reaches
the existing orchestration path.

At minimum, assert that the CLI does **not** surface the temporary runner guard during normal non-dry-run execution.

This is the test that prevents the accidental full handoff problem.

## Verification

Run the focused unit suite:

```bash
pnpm test:unit -- scripts/__tests__/pdf-export-runner.test.ts scripts/__tests__/pdf-export-cli.test.ts
```

Optionally run the related PDF export tests if the executable import cleanup touches shared report or smoke-test setup:

```bash
pnpm test:unit -- scripts/__tests__/pdf-export-runner.test.ts scripts/__tests__/pdf-export-cli.test.ts scripts/__tests__/pdf-export-report.test.ts scripts/__tests__/pdf-export-smoke.test.ts
```

## Implementation Order

1. Add failing runner tests for validation failure and non-dry-run target-resolution ordering.
2. Add `preparePdfExportRun(...)` to `scripts/lib/pdf-export-runner.mjs`.
3. Update `runPdfExport(...)` to call `preparePdfExportRun(...)`.
4. Preserve dry-run behavior through the existing dry-run report path.
5. Update `scripts/export-lessons-pdf.mjs` to call `preparePdfExportRun(...)` for manifest planning.
6. Remove now-unused imports and local validation formatting from the executable.
7. Run focused tests.
8. Run optional related PDF export tests if import cleanup was broader than expected.

## Assumptions

- Cycle 2 should not move build, preview, browser, or PDF export orchestration yet.
- The validation error text must stay byte-for-byte compatible with the current executable helper.
- Selection and target-resolution errors should continue to surface as they do today.
- The runner module remains internal to `scripts/lib`.
- No public CLI flags, report schema, route schema, or exit behavior changes are intended.

## Design Notes

This cycle is an extraction of a pure-ish orchestration boundary, not a full runner migration.

The split between `preparePdfExportRun(...)` and `runPdfExport(...)` keeps the refactor testable and avoids a partial
abstraction trap: the runner can prove it owns planning, while the executable can still preserve real export behavior
until the remaining side-effectful orchestration is moved.

This follows a safer characterization-first refactoring style: lock observable behavior, extract one responsibility,
keep side effects at the old boundary, then move the side effects in a later cycle.
