# [DONE] Lock Current PDF Export Behaviour

## Summary

Perform a **characterization-only pass** before starting the Phase 8 batch-export refactor.

The goal is to freeze the current observable behaviour of the PDF exporter so later changes can safely improve internals
without silently changing CLI parsing, selection semantics, report structure, output-path resolution, smoke-helper
behaviour, or existing failure reporting.

This step should add or tighten tests only. It should not introduce new exporter behaviour, rename report fields, change
exit policy, normalise DOM findings, or expand browser-backed execution.

## Implementation Status

Implemented as a test-only pass. The exporter runtime, CLI behaviour, report fields, smoke helper behaviour, and
Playwright orchestration were left unchanged.

Characterization coverage was added or tightened in:

```text
scripts/__tests__/pdf-export-cli.test.ts
scripts/__tests__/pdf-export-report.test.ts
scripts/__tests__/pdf-export-smoke.test.ts
```

The locked baseline now covers:

- current CLI defaults and flags, including `--route`, `--subtree`, `--all`, `--dry-run`, `--fail-on-finding`,
  `--skip-build`, `--keep-server`, `--baseUrl`, `--port`, `--timeout`, `--outDir`, and `--report`;
- current parser errors for missing selections, conflicting selections, missing values, unknown flags, invalid numeric
  options, and unsafe relative paths;
- current route, subtree, and all-entry selection order;
- current output-path derivation for nested lesson routes and unit index routes;
- current report summary shape, including the absence of a dedicated `skipped` counter;
- current failed-entry `error.kind: "pdf-generation-failed"` nesting;
- current DOM finding collection without kind normalisation;
- current smoke-test opt-in config, default representative route, workspace paths, and report assertions.

Verification completed:

```bash
pnpm test:unit -- scripts/__tests__/pdf-export-cli.test.ts scripts/__tests__/pdf-export-report.test.ts scripts/__tests__/pdf-export-smoke.test.ts
pnpm run check:lesson-export-core
pnpm export:pdf:dry-run
```

Notes:

- The first command currently runs through the repo's unit-test setup and executed the full unit suite; it passed.
- The dry run selected 50 lessons and did not launch the preview server or Playwright.
- PowerShell emitted unrelated profile/module warnings while running commands.

## Scope

This phase locks the behaviour that already exists today in:

- CLI argument parsing.
- Route, subtree, and all-entry selection.
- Export target resolution.
- Report creation and summary counting.
- Failed-entry representation.
- PDF smoke helper utilities.
- Dry-run behaviour where already covered by pure tests.

Out of scope:

- New batch resilience semantics.
- New `--fail-on <findingKind>` policy.
- DOM finding normalisation.
- Report shape evolution.
- Browser-backed full-course export tests.
- Playwright orchestration refactors.
- Changelog updates.

## Guiding Principle

Treat this phase as a **golden-master / characterization test pass**: document what the system does now, even when the
behaviour is imperfect, so future phases can distinguish intentional contract changes from accidental regressions.

Reference anchors:

- Michael Feathers’ characterization testing approach in _Working Effectively with Legacy Code_.
- The golden-master testing pattern for protecting observable behaviour during refactors.
- Vitest’s fast unit-test feedback loop as the preferred layer for this phase.

---

# Steps

## 1. Characterize CLI parsing and selection behaviour

Add or tighten tests in:

```text
scripts/__tests__/pdf-export-cli.test.ts
```

Cover the current behaviour of `parseCliArgs()` for:

- `--route`
- `--subtree`
- `--all`
- `--dry-run`
- `--fail-on-finding`
- report/output-root options if they already exist
- default values when optional flags are omitted

Lock current validation behaviour:

- missing selection errors;
- mutually exclusive selection errors;
- invalid route-like arguments, if currently rejected;
- accepted route forms, including trailing-slash behaviour if relevant;
- current treatment of unknown flags, if handled by the parser.

Characterize `selectExportEntries()`:

- `--route` selects the current exact route match;
- `--subtree` selects current subtree matches;
- `--all` selects the current exportable manifest entries;
- selection preserves manifest order;
- non-matching routes produce the current error or empty-result behaviour, whichever exists today.

Characterize `resolveExportTargets()`:

- derives output paths from the requested export root;
- preserves current nested route-to-PDF mapping;
- handles unit index routes as currently implemented;
- uses the current report/output path resolution behaviour.

Do not “fix” surprising behaviour in this step. If a test reveals an unexpected current contract, record it and decide
whether the later refactor should preserve or intentionally change it.

## 2. Characterize report aggregation

Add or tighten tests in:

```text
scripts/__tests__/pdf-export-report.test.ts
```

Lock `createExportReport()`:

- top-level report shape;
- summary object shape;
- entry array shape;
- timestamp/build metadata fields, if currently emitted;
- report path-related fields, if included.

Lock `summarizeExportEntries()`:

- exported count;
- failed count;
- skipped count, if currently present;
- total finding count;
- behaviour for empty entries;
- behaviour for entries with multiple findings;
- behaviour for mixed exported and failed entries.

Lock failed-entry shape:

- `status`, if present;
- `kind: "pdf-generation-failed"`;
- existing `message` field;
- route;
- export URL;
- output path;
- any existing error or finding fields.

Important: keep the current field names and nesting exactly as they are. Later phases may add fields, but this step
should define the baseline.

## 3. Characterize dry-run behaviour

Keep dry-run tests pure and script-level where possible.

Cover the current behaviour that matters for Phase 8:

- dry run resolves selected entries;
- dry run resolves output paths;
- dry run writes or returns the current report shape;
- dry run does not launch preview;
- dry run does not invoke Playwright;
- dry run handles missing selection the same way as non-dry execution.

This is especially valuable because Phase 8 will likely use dry-run behaviour as a cheap full-course validation path.

## 4. Characterize smoke-helper behaviour

Add or tighten tests in:

```text
scripts/__tests__/pdf-export-smoke.test.ts
```

Lock `readPdfSmokeConfig()`:

- smoke execution remains opt-in;
- unset environment variables produce the current disabled config;
- enabled environment variables produce the current enabled config;
- current defaults for route, workspace, output path, or report path remain stable.

Lock `resolvePdfSmokeEntry()`:

- resolves the representative lesson currently used by the smoke test;
- preserves route-matching behaviour;
- reports missing representative lessons using the current error shape/message.

Lock `createPdfSmokeWorkspace()`:

- creates the current temporary workspace structure;
- resolves output/report paths as it does today;
- does not depend on full-course export state.

Lock `assertPdfSmokeReport()`:

- accepts the current success-report shape;
- rejects the current failure-report shape;
- checks the same success conditions used today.

Do not expand this into a browser-backed test suite. The goal is only to preserve helper contracts that already exist.

## 5. Keep orchestration aligned but unmodified

Review:

```text
scripts/export-lessons-pdf.mjs
```

Use it only to identify observable behaviour that needs tests.

Do not refactor orchestration in this step. In particular, do not change:

- batch loop structure;
- Playwright lifecycle;
- preview lifecycle;
- exit-code policy;
- error handling policy;
- report-writing policy;
- DOM finding collection;
- selector names;
- marker normalisation.

If orchestration behaviour is hard to test without refactoring, prefer adding a narrow pure helper test around existing
exported functions rather than extracting new abstractions in this phase.

---

# Relevant Files

```text
scripts/__tests__/pdf-export-cli.test.ts
```

Current CLI parsing, selection, and output-path behaviour.

```text
scripts/__tests__/pdf-export-report.test.ts
```

Current report summary, report shape, and failed-entry behaviour.

```text
scripts/__tests__/pdf-export-smoke.test.ts
```

Current smoke-helper contract.

```text
scripts/export-lessons-pdf.mjs
```

Current exporter orchestration and observable behaviour to preserve.

Potential supporting files, depending on the current structure:

```text
packages/lesson-export-core/src/**/*.ts
```

Pure manifest, route, finding, and path contracts.

```text
src/infrastructure/adapters/**/*.ts
```

Site-specific manifest construction, if current tests already depend on adapter behaviour.

---

# Test Design Guidelines

## Prefer behaviour names over implementation names

Use test descriptions that read like contracts:

```text
selectExportEntries preserves manifest order for subtree exports
```

rather than:

```text
selectExportEntries filters array correctly
```

## Keep fixtures minimal

Use small manifest fixtures with only the fields needed by each behaviour:

- one exact route;
- one sibling route;
- one nested route;
- one index route;
- one entry with findings;
- one entry that simulates failed PDF generation.

This keeps tests readable and prevents full-course fixture drift.

## Avoid overfitting dynamic fields

For timestamps, absolute temporary paths, generated IDs, and platform-specific path separators:

- assert type or shape where appropriate;
- normalise paths before comparison;
- avoid pinning values that are intentionally unstable.

## Pin public shape, not incidental formatting

For error messages, prefer asserting the meaningful part of the message unless the exact text is already part of the
user-facing contract.

Example:

```ts
expect(error.message).toContain("missing selection");
```

instead of asserting a full multi-line string unless that exact string matters.

## Do not introduce new abstractions yet

This phase may add test helpers, but they should remain test-local unless there is already an established test utility
module.

Avoid creating production helpers just to make the characterization pass cleaner. That belongs in the next refactor
phase.

---

# Verification

Run the narrow exporter tests first:

```bash
pnpm test:unit -- scripts/__tests__/pdf-export-cli.test.ts scripts/__tests__/pdf-export-report.test.ts scripts/__tests__/pdf-export-smoke.test.ts
```

Then run the package-level check if these tests touch shared export-core contracts:

```bash
pnpm run check:lesson-export-core
```

Optionally run the dry-run command to confirm the tested contracts match the script-level workflow:

```bash
pnpm export:pdf:dry-run
```

Do not run browser-backed smoke tests as part of this characterization step unless they are already part of the current
manual verification workflow.

---

# Stop Conditions

Stop and revise the next-phase plan if characterization reveals that:

- `--all` does not currently mean what Phase 8 assumes;
- route/subtree selection does not preserve manifest order;
- failed entries do not consistently include enough route/output context;
- dry-run currently launches preview or Playwright;
- report output paths are derived differently from the planned Phase 8 behaviour;
- `--fail-on-finding` has semantics that conflict with the planned `--fail-on <kind>` migration.

These are not blockers for Phase 8, but they should be documented as intentional migration points rather than hidden
inside a refactor.

---

# Decisions

- This step is **test-only**.
- Current CLI and report shapes are the baseline contract.
- Current smoke-helper behaviour remains opt-in.
- Browser-backed coverage is not expanded here.
- Any behaviour change discovered during characterization is deferred to a later phase and made explicit.
- The next phase may refactor internals only after this test baseline is green.
