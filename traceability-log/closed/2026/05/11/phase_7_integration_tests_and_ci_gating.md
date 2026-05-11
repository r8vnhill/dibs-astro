# [DONE] Phase 7 Integration Tests and CI Gating

Add a minimal opt-in browser-backed smoke test for the lesson PDF exporter without making PDF generation part of the
default CI path. Preserve the existing validation split:

- pure contract tests for route, manifest, CLI, and report logic;
- Astro render tests for export-mode HTML contracts;
- one narrow Playwright-backed smoke path for the end-to-end PDF workflow.

The Phase 7 objective is not to build a broad browser test suite. It is to prove that the full path can work when
explicitly requested:

```text
manifest entry -> static export route -> astro preview -> Playwright Chromium -> PDF file -> JSON report
```

Status: implemented in `scripts/test-pdf-export-smoke.mjs` with advisory CI wiring in `.gitlab-ci.yml`.

Playwright is suitable here because it supports browser automation across Chromium, Firefox, and WebKit, including
headless CI use. For a smoke test, use Chromium only to minimise runtime and installation cost. ([Playwright][2])

## Goals

- Keep `pnpm check` fast and mandatory.
- Keep full PDF generation out of the default CI path.
- Add one opt-in smoke test that exercises the real exporter path.
- Preserve fast regression coverage through pure tests and Astro render tests.
- Make the CI policy explicit enough that future promotion to a required gate is deliberate.
- Ensure the smoke test verifies observable output: PDF file, report file, route status, and cleanup.

## Non-goals

- Do not export the full course in CI.
- Do not replace render tests with Playwright.
- Do not turn Playwright into the only source of truth for export markers.
- Do not add a broad E2E suite around lesson rendering.
- Do not block merge requests on browser installation/runtime cost yet.
- Do not test arbitrary URLs; the smoke path must use manifest-derived routes.

## Testing Layers

### Layer 1 — Pure contract tests

Owner: regular unit test gate.

Covers:

- CLI argument parsing;
- selection semantics;
- manifest filtering;
- output path mapping;
- report aggregation;
- failure classification;
- dry-run behaviour.

These tests should remain mandatory.

Example command:

```sh
pnpm exec vitest run --config vitest.config.ts
```

### Layer 2 — Astro render contract tests

Owner: Astro render test gate.

Covers:

- export-mode layout markers;
- static export route shape;
- route props;
- document/body/metadata markers;
- absence or transformation of hydration-dependent UI;
- static rendering of tabs or equivalent export-aware components.

Example command:

```sh
pnpm exec vitest run --config vitest.astro.config.ts
```

These tests should remain mandatory because they are much cheaper than launching a browser.

### Layer 3 — PDF exporter smoke test

Owner: explicit browser/export gate.

Covers one representative route end to end:

- runs the exporter CLI;
- starts preview or uses an already-running preview server;
- exports one PDF;
- writes a JSON report;
- verifies server cleanup;
- verifies the report records `exported` status.

This should be opt-in at first.

Example command:

```sh
EXPORT_PDF_SMOKE=1 pnpm test:pdf-smoke
```

or:

```sh
pnpm export:pdf:smoke
```

## Key Design Decision: Test the CLI, Not Playwright Internals

The smoke test should exercise the exporter CLI as the system under test. It should not duplicate most of the Playwright
rendering logic inside the test.

Preferred shape:

```text
test invokes:
  node scripts/export-lessons-pdf.mjs --route <representative-route> --outDir <temp-dir> --report <temp-report>

test asserts:
  - exit code is 0
  - PDF exists
  - report exists
  - report has one selected entry
  - entry.status is "exported"
  - entry.route matches the selected route
  - spawned preview server is not left running
```

If the repo introduces direct browser assertions in the test itself, `@playwright/test` is a better fit than raw
`playwright`, because Playwright’s own docs distinguish the library API from Playwright Test: the library launches and
controls browsers directly, while Playwright Test adds the managed test runner and web-first assertions.
([Playwright][3])

For this phase, however, a CLI-level smoke test can still be written with Vitest or a small Node script, because the
exporter already owns the Playwright calls.

## Representative Lesson Selection

Pick exactly one route with enough coverage value.

Good candidate criteria:

- generated from the Phase 5 manifest;
- stable content;
- includes code blocks;
- includes export-aware components such as tabs;
- includes metadata;
- does not depend on external network resources;
- produces a small enough PDF for CI artifacts.

Example candidate:

```text
/notes/software-libraries/artifacts-taxonomy/
```

Avoid choosing a route only because it is short. The smoke route should be representative enough to catch integration
failures in layout, export mode, and PDF rendering.

## Proposed Commands

Add scripts with clear responsibility:

```json
{
    "scripts": {
        "test:pdf-smoke": "node scripts/test-pdf-export-smoke.mjs",
        "export:pdf:smoke": "node scripts/export-lessons-pdf.mjs --route /notes/software-libraries/artifacts-taxonomy/"
    }
}
```

If browser installation is not already handled elsewhere, add an explicit setup script:

```json
{
    "scripts": {
        "playwright:install": "playwright install chromium"
    }
}
```

Keep this separate from `pnpm install` so local contributors are not forced to download browsers unless they work on PDF
export.

## Smoke Test Contract

Create:

```text
scripts/test-pdf-export-smoke.mjs
```

Responsibilities:

1. Create a temporary output directory.
2. Invoke the real exporter CLI.
3. Use one manifest-derived route.
4. Capture stdout, stderr, and exit code.
5. Assert the PDF exists.
6. Assert the report exists.
7. Parse the report.
8. Assert exactly one entry was selected.
9. Assert the entry status is `exported`.
10. Assert no preview server process remains after completion.
11. Delete temp files unless debugging is enabled.

Suggested environment switches:

```text
EXPORT_PDF_SMOKE=1
EXPORT_PDF_SMOKE_KEEP_OUTPUT=1
EXPORT_PDF_SMOKE_ROUTE=/notes/software-libraries/artifacts-taxonomy/
```

Default behaviour should refuse to run unless `EXPORT_PDF_SMOKE=1` is set. That prevents accidental browser runs inside
normal local checks.

## CI Gating Policy

Use three gate levels.

| Gate                 | Required now? | Purpose                                      |
| -------------------- | ------------: | -------------------------------------------- |
| `check` / pure tests |           Yes | Fast correctness and package contracts.      |
| Astro render tests   |           Yes | Export HTML contract without browser cost.   |
| PDF smoke test       |            No | End-to-end browser/PDF confidence on demand. |

The smoke job should be separate from the normal required jobs.

Recommended GitLab policy:

- manual by default;
- allowed to fail while experimental;
- produces artifacts when it runs;
- can later become scheduled or required.

Because GitLab’s `rules: when: manual` defaults `allow_failure` to `false`, set `allow_failure: true` explicitly if the
job must remain advisory. ([GitLab Documentation][4])

Example shape:

```yaml
pdf_export_smoke:
    stage: test
    allow_failure: true
    needs:
        - job: deps
    rules:
        - if: '$EXPORT_PDF_SMOKE == "1"'
          when: on_success
        - when: manual
          allow_failure: true
    script:
        - pnpm playwright:install
        - EXPORT_PDF_SMOKE=1 pnpm test:pdf-smoke
    artifacts:
        when: always
        paths:
            - tmp/pdf-export-smoke/
        expire_in: 7 days
```

If the project wants the job to be available only for merge requests or default-branch pipelines, use `rules` with
specific pipeline sources. GitLab supports rule conditions such as push, merge request, schedule, and web-triggered
pipelines. ([GitLab Documentation][5])

## Promotion Path

Add an explicit maturity ladder.

### Phase 7A — Advisory manual smoke

Initial state.

- Manual CI job.
- `allow_failure: true`.
- Not part of `pnpm check`.
- Runs one representative route.
- Artifacts retained briefly.

### Phase 7B — Scheduled smoke

Promote when the manual job is stable.

- Run nightly or weekly.
- Still non-blocking.
- Export one route or a tiny subtree.
- Track failures without blocking merge requests.

### Phase 7C — Merge-request advisory smoke

Promote when runtime is acceptable.

- Run automatically only when relevant files change.
- Still `allow_failure: true`.

Relevant paths:

```yaml
changes:
    - scripts/export-lessons-pdf.mjs
    - scripts/test-pdf-export-smoke.mjs
    - src/pages/exports/pdf/**/*
    - src/layouts/**/*
    - src/components/**/*
    - packages/lesson-export-core/**/*
```

### Phase 7D — Required smoke

Promote only after evidence.

Promotion criteria:

- stable for several consecutive runs;
- runtime acceptable;
- browser installation cached or predictable;
- no flaky failures from preview startup;
- artifacts useful for debugging;
- failures correlate with real regressions.

Only then make the job blocking.

## Keep Fast Tests as the Primary Regression Net

Do not let the Playwright smoke test absorb responsibilities already covered better elsewhere.

Keep these required:

```text
scripts/__tests__/pdf-export-cli.test.ts
src/layouts/__tests__/NotesLayout.export-contract.render.test.ts
src/pages/exports/pdf/notes/__tests__/path.render.test.ts
```

The smoke test should answer only:

> Can the real exporter produce one PDF and one report from the built preview site?

It should not become a replacement for exhaustive route, manifest, or render-contract coverage.

## Relevant Files

- `astro-website/.gitlab-ci.yml` Add the optional browser-backed smoke job.

- `astro-website/package.json` Add `test:pdf-smoke`, optionally `export:pdf:smoke`, and optionally `playwright:install`.

- `astro-website/scripts/export-lessons-pdf.mjs` Existing exporter CLI exercised by the smoke test.

- `astro-website/scripts/lib/pdf-export-smoke.mjs` Shared helpers for the smoke route, report, and cleanup checks.

- `astro-website/scripts/test-pdf-export-smoke.mjs` New smoke-test wrapper around the real CLI.

- `astro-website/scripts/__tests__/pdf-export-cli.test.ts` Fast CLI contract tests.

- `astro-website/src/layouts/__tests__/NotesLayout.export-contract.render.test.ts` Fast export layout marker tests.

- `astro-website/src/pages/exports/pdf/notes/__tests__/path.render.test.ts` Static export route render tests.

- `astro-website/vitest.config.ts` Existing unit-test gate.

- `astro-website/vitest.astro.config.ts` Existing Astro render-test gate.

- `astro-website/traceability-log/lesson_pdf_exporter.md` Record the Phase 7 gating decision and promotion policy.

## Verification

### Required local gates

Run:

```sh
pnpm check
pnpm exec vitest run --config vitest.config.ts
pnpm exec vitest run --config vitest.astro.config.ts
```

Expected result:

- pure tests pass;
- Astro render tests pass;
- no browser is launched;
- no PDF is generated.

### Local smoke test

Run:

```sh
pnpm playwright:install
EXPORT_PDF_SMOKE=1 pnpm test:pdf-smoke
```

Expected result:

- one representative route is exported;
- one PDF is written;
- one report is written;
- report entry has `status: "exported"`;
- preview server shuts down cleanly;
- no full-course export occurs.

The smoke script writes its temporary files under `tmp/pdf-export-smoke/` and removes them unless
`EXPORT_PDF_SMOKE_KEEP_OUTPUT=1` is set.

### Manual CI smoke

Trigger the GitLab job manually or with:

```text
EXPORT_PDF_SMOKE=1
```

Expected result:

- job runs separately from required checks;
- job does not block default pipelines while advisory;
- artifacts include the PDF and report;
- failure output is sufficient to diagnose build, preview, route, browser, or write failures.

### Regression check after browser-related changes

Whenever the exporter, export route, or export layout changes, run:

```sh
pnpm exec vitest run --config vitest.astro.config.ts
EXPORT_PDF_SMOKE=1 pnpm test:pdf-smoke
```

This keeps the fast marker contract and the slow end-to-end workflow aligned.

## Decisions

- Keep full PDF generation manual/advisory for now.
- Add exactly one browser-backed smoke test.
- Exercise the real CLI rather than duplicating exporter logic in the test.
- Use one representative manifest-derived lesson route.
- Keep Playwright Chromium as the only browser target for this phase.
- Keep `pnpm check` and existing test jobs as mandatory.
- Add the smoke test as a separate GitLab job.
- Set `allow_failure: true` explicitly while the job is advisory.
- Preserve pure tests and Astro render tests as the primary regression net.
- Treat any move from advisory to blocking as a CI policy change.
- Store smoke artifacts under `tmp/pdf-export-smoke/` so manual and CI runs can retain them without affecting the main
    export output.

## Acceptance Criteria

- `pnpm check` remains browser-free.
- Existing pure and Astro render tests remain mandatory.
- `EXPORT_PDF_SMOKE=1 pnpm test:pdf-smoke` exports exactly one representative PDF.
- The smoke test writes and validates a structured report.
- The smoke test fails if the exporter exits non-zero.
- The smoke test fails if the PDF is missing.
- The smoke test fails if the report is missing or malformed.
- The smoke test does not leave the preview server running.
- CI exposes the PDF smoke path separately from required checks.
- The CI smoke job is manual or opt-in by default.
- The CI smoke job is explicitly advisory with `allow_failure: true`.
- The traceability log records the gating decision and future promotion criteria.

[1]: https://docs.gitlab.com/ci/jobs/job_control/ "Control how jobs run | GitLab Docs"
[2]: https://playwright.dev/docs/intro "Installation | Playwright"
[3]: https://playwright.dev/docs/library "Library | Playwright"
[4]: https://docs.gitlab.com/ci/yaml/ "CI/CD YAML syntax reference | GitLab Docs"
[5]: https://docs.gitlab.com/ci/jobs/job_rules/ "Specify when jobs run with rules | GitLab Docs"
