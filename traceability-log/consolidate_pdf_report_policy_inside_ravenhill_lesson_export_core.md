# [PLAN] Consolidate PDF report policy inside `@ravenhill/lesson-export-core`

## Summary

Keep the existing architectural split. `@ravenhill/lesson-export-core` should own only pure export-domain logic:
route/path derivation, manifest filtering, validation, finding normalization, report aggregation, failure-policy
evaluation, and summary construction.

The script layer should remain the host adapter. It should continue to own generated Astro data, CLI parsing, Playwright
execution, preview-server lifecycle, build orchestration, filesystem writes, process exit behavior, and any
DOM/page-shape extraction. Playwright is explicitly a browser automation layer, so keeping it out of the core package
preserves the package’s host-agnostic boundary. ([Playwright][1])

## Design Boundary

### Move or keep in `@ravenhill/lesson-export-core`

Move only helpers that are:

- deterministic;
- independent of Node filesystem APIs;
- independent of Playwright, DOM, browser pages, and preview-server state;
- independent of generated Astro module imports;
- expressible through existing export-core domain types;
- useful to more than one host or script.

Good candidates:

- finding aggregation by kind;
- fatal-policy evaluation from normalized finding kinds;
- report summary construction;
- report status derivation;
- stable report payload shaping, if it is plain data;
- reusable helpers for “success with findings” vs “failed because of selected fatal findings”.

### Keep in `scripts/lib/pdf-export-report.mjs`

Keep anything that is an adapter concern:

- `writeExportReport`;
- filesystem path creation;
- JSON file writing;
- console formatting tied to CLI UX;
- collection of findings from browser output;
- conversion from Playwright/page/DOM observations into export-core finding inputs;
- process exit code application.

### Keep app-local elsewhere

Do not move:

- `scripts/export-lessons-pdf.mjs`;
- `scripts/lib/pdf-export-manifest.mjs`;
- `scripts/lib/pdf-export-cli.mjs`;
- `scripts/lib/preview-server.mjs`;
- Playwright loop code;
- Astro generated-data reads.

These are orchestration or infrastructure boundaries, not reusable export-domain logic.

## TDD Sequence

### ~~Cycle 1: Characterize the current report contract~~

Add or strengthen tests before moving code.

Target files:

- `packages/lesson-export-core/tests/reporting.test.ts`
- `scripts/__tests__/pdf-export-report.test.ts`, only if an adapter boundary already exists or needs to be locked.

Cover:

- aggregation by finding kind;
- empty finding list;
- one non-fatal finding kind;
- one fatal finding kind;
- mixed fatal and non-fatal findings;
- unknown or unsupported fatal-policy inputs, if the current normalizer permits them;
- stable report shape expected by script consumers.

The key outcome is that current behaviour is locked before extraction.

### ~~Cycle 2: Add pure report/policy helpers to export-core~~

Update:

- `packages/lesson-export-core/src/reporting.ts`
- `packages/lesson-export-core/src/index.ts`

Prefer names that match the existing export-core vocabulary. For example, if the package already uses “summary”,
“finding”, and “policy”, keep that terminology instead of introducing a new reporting dialect.

Possible helper shape:

```ts
export function summarizeExportFindings(...)
export function evaluateExportFailurePolicy(...)
export function buildExportReportSummary(...)
```

Avoid helpers that mention:

```ts
Page;
Browser;
Locator;
HTMLElement;
File;
PathLike;
process;
stdout;
stderr;
```

Re-export through the package root only. Node’s package `exports` field is the standard way to define public package
entry points, so this cycle should preserve the existing root-only API discipline and avoid new subpath imports.
([Node.js][2])

### ~~Cycle 3: Refactor the script adapter~~

Update:

- `scripts/lib/pdf-export-report.mjs`

The script should become a thin adapter:

1. collect host-specific inputs;
2. convert them into export-core finding/report inputs;
3. delegate pure summary and policy logic to `@ravenhill/lesson-export-core`;
4. write the report;
5. return or apply script-level exit behaviour.

Do not move `collectExportFindings` unless it is already independent of Playwright, DOM, and generated app data.

Do not move `writeExportReport`; filesystem writes are host-specific.

### ~~Cycle 4: Lock the public package boundary~~

Verify that package consumers still import from the root:

```ts
import { summarizeExportFindings } from "@ravenhill/lesson-export-core";
```

Do not allow:

```ts
import { summarizeExportFindings } from "@ravenhill/lesson-export-core/reporting";
```

Add or keep packed-consumer validation if the package already has it. This is especially important because package
entry-point changes can accidentally expose internals or break consumers. ([Node.js][2])

### Cycle 5: Run smoke validation

Run the focused package checks first:

```powershell
pnpm check:lesson-export-core
```

Then run the focused reporting tests:

```powershell
pnpm --filter @ravenhill/lesson-export-core test -- reporting
```

Then run the narrow PDF smoke path if fatal-policy, report shape, or finding normalization changed:

```powershell
pnpm test:pdf-export:smoke
```

Finally, run one script-level export smoke path to verify that:

- output-path selection is unchanged;
- report shape is unchanged unless intentionally versioned;
- fatal finding policy is unchanged;
- partial-success behaviour is preserved;
- script exit semantics still match the CLI contract.

Vitest is a good fit for the pure package tests because it is designed as a lightweight Vite-native test runner and
works well for backend/package code too. ([Vitest][3])

## Acceptance Criteria

This phase is complete when:

- no new package is created;
- `@ravenhill/lesson-export-core` owns only pure report/policy helpers;
- script-level report code delegates pure aggregation/policy logic to the package;
- filesystem, Playwright, preview-server, build orchestration, CLI parsing, and generated-data reads remain app-local;
- public exports remain root-only;
- existing report output remains stable, unless a deliberate report-version change is documented;
- package tests and PDF smoke tests pass.

## Non-goals

- No new `@ravenhill/pdf-export-*` package.
- No movement of Playwright logic into `lesson-export-core`.
- No movement of preview-server lifecycle code.
- No movement of generated Astro metadata reads.
- No new subpath imports.
- No CLI redesign.
- No broad report format redesign unless current tests reveal an existing inconsistency.

## Risk Controls

The main risk is extracting too much and turning `lesson-export-core` into a semi-script package. Avoid that by applying
a strict rule: if a helper needs browser state, generated app data, filesystem access, process state, or CLI flags
directly, it stays in `scripts/`.

A secondary risk is widening the public API too casually. Keep the exported surface small, root-only, and backed by
tests. Use internal helpers inside `reporting.ts` freely, but export only helpers that represent stable domain concepts.

[1]: https://playwright.dev/?utm_source=chatgpt.com "Playwright: Fast and reliable end-to-end testing for modern ..."
[2]: https://nodejs.org/api/packages.html?utm_source=chatgpt.com "Modules: Packages | Node.js v26.1.0 Documentation"
[3]: https://vitest.dev/guide/?utm_source=chatgpt.com "Getting Started | Guide"
