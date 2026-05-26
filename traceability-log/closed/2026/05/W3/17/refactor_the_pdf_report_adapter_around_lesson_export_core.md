# [DONE] Refactor the PDF Report Adapter Around `lesson-export-core`

## Summary

Refactor `scripts/lib/pdf-export-report.mjs` so it remains a thin host adapter for the PDF export script, while
delegating all pure summary and fatal-policy decisions to `@ravenhill/lesson-export-core`.

The adapter should continue to own script/runtime concerns:

- extracting browser/page-derived findings;
- assembling the script-facing report object;
- writing report JSON to disk;
- preserving the CLI-facing fatal-policy API used by `scripts/export-lessons-pdf.mjs`.

The package should own reusable domain decisions:

- report summary calculation;
- finding-kind normalization;
- fatal-policy evaluation.

This follows the current architectural boundary: `lesson-export-core` provides deterministic, host-agnostic
planning/reporting logic, while the script layer adapts Playwright, filesystem, and CLI execution concerns.

## Goals

- Keep `pdf-export-report.mjs` as the host boundary.
- Remove duplicated or script-local summary/policy logic.
- Preserve the current report JSON shape.
- Prefer no call-site changes in `scripts/export-lessons-pdf.mjs`.
- Strengthen tests so the adapter contract remains stable while its internals become thinner.

## Non-Goals

- Do not move Playwright, DOM/page inspection, preview-server lifecycle, CLI parsing, or filesystem writes into
  `@ravenhill/lesson-export-core`.
- Do not redesign the report schema in this cycle.
- Do not broaden finding extraction unless the current implementation clearly exposes pure logic that can be extracted
  safely.
- Do not change CLI exit semantics unless an existing test reveals a mismatch between intended and actual behavior.

## Steps

### 1. Characterize the Current Adapter Contract First

Review `scripts/lib/pdf-export-report.mjs` and classify each exported function as either host-specific or pure-domain
logic.

Expected classification:

| Concern                            | Owner                                                                           |
| ---------------------------------- | ------------------------------------------------------------------------------- |
| Page/DOM finding extraction        | `scripts/lib/pdf-export-report.mjs`                                             |
| JSON report file writing           | `scripts/lib/pdf-export-report.mjs`                                             |
| Report object assembly for the CLI | `scripts/lib/pdf-export-report.mjs` unless already pure enough to extract later |
| Summary aggregation                | `@ravenhill/lesson-export-core`                                                 |
| Finding-kind normalization         | `@ravenhill/lesson-export-core`                                                 |
| Fatal-policy evaluation            | `@ravenhill/lesson-export-core`                                                 |

Keep this step mechanical: the output should be a clear boundary map, not a refactor yet.

### 2. Lock the Existing Behaviour With Adapter Tests

Update or tighten `scripts/__tests__/pdf-export-report.test.ts` before changing implementation.

The tests should assert:

- the report JSON shape stays unchanged;
- summary totals stay unchanged;
- fatal-policy behaviour stays unchanged for:

  - empty policy;
  - `"any"`;
  - targeted finding kinds;
  - legacy aliases such as `client-only`;
  - mixed finding sets;
- script-facing return values remain compatible with `scripts/export-lessons-pdf.mjs`.

Use fake route/report data with Barry Windsor-Smith-inspired names where new fixtures are needed, for example:

```js
const route = "/notes/artifacts/weapon-x-layout/";
const title = "Weapon X Layout Notes";
const finding = {
    kind: "client-only",
    message: "Monsters-era interactive island is hidden during export.",
};
```

### 3. Delegate Summary Calculation to `lesson-export-core`

Replace any adapter-local summary aggregation with the package helper from the root package API.

The adapter should import from:

```js
import {
    summarizeExportReport,
    // or the current exported helper name
} from "@ravenhill/lesson-export-core";
```

Avoid deep imports such as:

```js
import { ... } from "@ravenhill/lesson-export-core/src/reporting";
```

This keeps the dependency aligned with the package’s public contract and protects the script layer from internal file
movement.

### 4. Delegate Fatal-Policy Evaluation to `lesson-export-core`

Replace adapter-local fatal-policy decisions with the package helper.

The adapter may keep a small script-facing wrapper if `scripts/export-lessons-pdf.mjs` currently expects a particular
function name or return shape, for example:

```js
export function hasFatalExportFindings(findings, failOn) {
    return evaluateExportFailurePolicy(findings, failOn).fatal;
}
```

The wrapper should not reimplement normalization, alias handling, or matching logic. It should only adapt the package
result to the script API.

### 5. Keep Finding Collection in the Script Layer

Keep `collectExportFindings` in `scripts/lib/pdf-export-report.mjs` for this cycle.

It should remain script-owned because it likely depends on at least one host-specific concern:

- Playwright `page` access;
- DOM selectors;
- generated app/export markup;
- browser evaluation;
- client-only island markers.

Only extract it later if a separate review proves it is purely data-driven and independent from browser/runtime
concerns.

### 6. Preserve `writeExportReport` as Host-Specific I/O

Keep `writeExportReport` in the script layer.

Filesystem writes are not part of the `lesson-export-core` contract. The package should produce deterministic data, not
perform host effects.

The adapter may still delegate report summary creation before writing:

```js
const report = buildExportReport(...);
await writeExportReport(reportPath, report);
```

But the write itself stays in the script.

### 7. Avoid Call-Site Changes Unless Necessary

Do not modify `scripts/export-lessons-pdf.mjs` unless the adapter API cannot remain stable.

Preferred outcome:

- same imports from `scripts/export-lessons-pdf.mjs`;
- same function calls;
- same report writing behaviour;
- same exit/failure decisions;
- thinner implementation inside `pdf-export-report.mjs`.

If a call-site change is unavoidable, keep it limited to renaming or adapting one function call, and cover it with a
smoke or integration-style test.

## Relevant Files

- `scripts/lib/pdf-export-report.mjs` Host adapter to thin out. Should keep browser-derived finding extraction, report
  assembly, report writing, and CLI-facing wrappers.

- `scripts/export-lessons-pdf.mjs` CLI call site. Should ideally remain unchanged.

- `scripts/__tests__/pdf-export-report.test.ts` Adapter contract tests. Should lock report shape, summary behaviour, and
  fatal-policy compatibility.

- `packages/lesson-export-core/src/reporting.ts` Source of pure reporting helpers.

- `packages/lesson-export-core/src/findings.ts` Source of finding normalization and legacy alias handling, if policy
  helpers depend on it.

- `packages/lesson-export-core/src/index.ts` Public root export surface. The script adapter should import through this
  file.

- `packages/lesson-export-core/tests/reporting.test.ts` Package-level source of truth for pure summary and fatal-policy
  behaviour.

## Verification

Run the narrow adapter test first:

```powershell
pnpm vitest run scripts/__tests__/pdf-export-report.test.ts
```

Then run the package reporting tests:

```powershell
pnpm vitest run packages/lesson-export-core/tests/reporting.test.ts
```

If `scripts/export-lessons-pdf.mjs` changes, also run the smallest PDF export smoke path available for the project,
preferably one that confirms:

- the CLI still completes;
- the report file is written;
- the report JSON shape is unchanged;
- fatal findings still affect exit behaviour according to the configured policy.

## Acceptance Criteria

- `pdf-export-report.mjs` no longer computes report summaries directly.
- `pdf-export-report.mjs` no longer implements fatal-policy matching directly.
- The adapter imports pure helpers from `@ravenhill/lesson-export-core` through the package root.
- `collectExportFindings` remains in the script layer.
- `writeExportReport` remains in the script layer.
- `scripts/export-lessons-pdf.mjs` remains unchanged, unless a minimal adapter API adjustment is unavoidable.
- Existing report JSON shape is preserved.
- Existing fatal-policy behaviour is preserved.
- Package reporting tests and script adapter tests pass.

## Suggested Implementation Order

1. Add/strengthen adapter tests.
2. Confirm package helpers are exported from `packages/lesson-export-core/src/index.ts`.
3. Replace adapter-local summary logic with the package helper.
4. Replace adapter-local fatal-policy logic with the package helper.
5. Keep a script-facing compatibility wrapper if needed.
6. Run focused tests.
7. Only then consider whether any additional pure report-shaping helper belongs in `lesson-export-core`.

## Design Notes

This is a good “functional core, imperative shell” refactor: `lesson-export-core` becomes the deterministic functional
core, while `pdf-export-report.mjs` remains the imperative shell around browser and filesystem effects.

It also matches a ports-and-adapters boundary: the export script is an adapter over Playwright, the filesystem, and CLI
execution; the package contains reusable domain policy. Relevant references: Alistair Cockburn’s Ports and Adapters
architecture, Gary Bernhardt’s “Functional Core, Imperative Shell”, and Martin Fowler’s guidance on separating domain
logic from application/service-layer coordination.
