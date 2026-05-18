# [DONE] Cycle 4: Lock the Public Package Boundary

## Summary

Lock `@ravenhill/lesson-export-core` as a root-only public package. Consumers should import every supported contract
from `@ravenhill/lesson-export-core`, while implementation modules such as reporting, findings, `src/*`, and `dist/*`
remain private.

This cycle is especially focused on the newly public reporting and failure-policy helpers. The package already has most
of the required scaffolding: root-only `exports`, package API tests, `publint`, packed file checks, and packed-consumer
validation. Cycle 4 should strengthen those checks rather than redesign the reporting API.

This aligns with Node’s `exports` model: the `exports` field defines the package’s public entry points and prevents
consumers from importing unlisted subpaths, which is the right mechanism for a stable library boundary.

## Implementation Notes

- Extended the packed consumer fixture so runtime consumers import and exercise reporting helpers only from
  `@ravenhill/lesson-export-core`.
- Extended the packed type consumer so report entry, summary, and failure-policy types are checked through the root
  package API.
- Expanded blocked-subpath runtime checks for reporting, findings, `src/*`, and `dist/*` internals.
- Updated the package README to document the root-only import policy for reporting and finding helpers.

## Validation Results

Passed:

```bash
pnpm --filter @ravenhill/lesson-export-core test -- package-api
pnpm --filter @ravenhill/lesson-export-core run consumer:check
pnpm check:lesson-export-core
```

Repository subpath search:

```bash
rg "@ravenhill/lesson-export-core/" .
```

The remaining matches are intentional blocked-subpath checks or documentation/traceability examples; no production,
script, app, or ordinary test consumer imports package internals.

## Goals

- Prove that packed consumers can use the reporting and failure-policy helpers from the package root.
- Prove that reporting and finding internals cannot be imported through package subpaths.
- Keep the package metadata root-only.
- Keep all new public API exposure routed through `src/index.ts`.
- Avoid introducing host concerns into `lesson-export-core`.

## Non-Goals

- No report-shape redesign.
- No helper renaming.
- No new package subpath exports.
- No changes to PDF export behaviour.
- No filesystem, Playwright, Astro, DOM, generated-data, CLI, or process-exit logic in `lesson-export-core`.

## Key Changes

### 1. Lock the root export surface

Update `packages/lesson-export-core/tests/package-api.test.ts` so the root API explicitly includes the reporting and
policy helpers:

```ts
buildExportSummary;
countEntriesByStatus;
countFindingsByKind;
countFailuresByKind;
hasFatalExportFindings;
```

Keep the assertion focused on public names, not implementation modules. The test should fail if a helper is implemented
but not re-exported from `packages/lesson-export-core/src/index.ts`.

### 2. Extend the packed consumer fixture

Update `packages/lesson-export-core/scripts/validate-packed-consumer.mjs` so the packed runtime consumer imports the
reporting and policy helpers from the package root only:

```ts
import {
    buildExportSummary,
    countEntriesByStatus,
    countFailuresByKind,
    countFindingsByKind,
    hasFatalExportFindings,
} from "@ravenhill/lesson-export-core";
```

Exercise each helper with a small deterministic fixture. Use fake lesson/export data based on _Shigatsu wa Kimi no Uso_
references, for example routes or titles derived from `kousei-arima`, `kaori-miyazono`, or `tsubaki-sawabe`.

The fixture should prove at least:

- summaries can be built from mixed export entries;
- entries are counted by status;
- findings are counted by kind;
- failures are counted by kind;
- fatal-policy evaluation works through the packed package root.

This catches the real consumer scenario better than source-level tests because it validates the built package, its
emitted declarations, and its package metadata together. `publint` is useful here as a complementary package-quality
check because it detects package configuration mistakes across common JS tooling environments.

### 3. Extend blocked-subpath checks

In the same packed-consumer validation script, extend the blocked import matrix to include report-related internals:

```ts
"@ravenhill/lesson-export-core/reporting";
"@ravenhill/lesson-export-core/findings";
"@ravenhill/lesson-export-core/src/reporting";
"@ravenhill/lesson-export-core/src/findings";
"@ravenhill/lesson-export-core/dist/reporting";
"@ravenhill/lesson-export-core/dist/findings";
```

Also include any existing `src/*` or `dist/*` patterns already covered by the script. The expectation should remain that
these imports fail because they are not listed in `exports`.

### 4. Keep `package.json` root-only

Keep `packages/lesson-export-core/package.json` constrained to the root entry point:

```json
{
    "exports": {
        ".": {
            "types": "./dist/index.d.ts",
            "import": "./dist/index.js"
        }
    }
}
```

Do not add:

```json
"./reporting"
"./findings"
"./src/*"
"./dist/*"
```

The goal is not to make internals easier to import; it is to make the root API complete enough that consumers never need
internals.

### 5. Check for accidental package subpath imports

Run a repository search:

```bash
rg "@ravenhill/lesson-export-core/" .
```

Expected results should be limited to intentional blocked-subpath tests, traceability examples, or documentation that
explicitly explains forbidden imports. Application, script, package, and test code should import public helpers through:

```ts
import { ... } from "@ravenhill/lesson-export-core";
```

## Test Plan

Run the focused package check:

```bash
pnpm check:lesson-export-core
```

For narrower debugging:

```bash
pnpm --filter @ravenhill/lesson-export-core run consumer:check
pnpm --filter @ravenhill/lesson-export-core test -- package-api
```

Run the boundary search:

```bash
rg "@ravenhill/lesson-export-core/" .
```

Expected result: no production or test consumer imports package internals except intentional blocked-subpath assertions.

## Acceptance Criteria

- Packed runtime consumers can import and use route, manifest, finding, summary, and failure-policy helpers from
  `@ravenhill/lesson-export-core`.
- Packed type consumers can type-check the same root imports.
- Reporting helpers are explicitly locked in the root package API test.
- Reporting and finding internals cannot be imported through package subpaths.
- `package.json` still exposes only `"."`.
- No package subpath imports are introduced in production, script, app, or ordinary test code.
- `lesson-export-core` remains pure and host-agnostic.

## Assumptions

- The intended public report helper names are:

  ```ts
  buildExportSummary;
  countEntriesByStatus;
  countFindingsByKind;
  countFailuresByKind;
  hasFatalExportFindings;
  ```

- Existing root-only package scaffolding is correct and should be strengthened, not replaced.
- Cycle 4 is a package-boundary lock only; behavioural changes to the PDF exporter belong in a later cycle.
