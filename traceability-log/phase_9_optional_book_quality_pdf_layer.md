# [PLAN] Phase 9: Optional Book-Quality PDF Layer

## Summary

Add an optional book-export layer on top of the existing single-lesson PDF exporter. The phase must preserve the current
Chromium/Playwright lesson export path and introduce a separate manual pipeline for bundled unit and full-course PDFs.

Phase 9 delivers practical book bundles first by post-processing already exported lesson PDFs. It then runs a controlled
renderer evaluation for richer paged-media features, without adopting a new renderer in this phase.

## Scope Classification

This is a medium-scope change, so it should be organized into phases.

It is larger than a few red-green-refactor cycles because it introduces a new CLI, planning model, artifact generation,
reporting, smoke tests, and renderer comparison artifacts. It does not need milestones because the production behavior
remains narrow and optional.

## Global Non-Goals

- Do not replace the existing single-lesson PDF exporter.
- Do not change the default `pnpm check` or default CI pipeline.
- Do not make full-course book export mandatory.
- Do not adopt Vivliostyle, Paged.js, or another renderer as a required dependency in Phase 9.
- Do not redesign lesson content, lesson routes, or the course hierarchy.
- Do not add changelog entries unless explicitly requested.
- Do not use “violation” terminology in book reports; use “finding.”

## Phase 9.1: Define Book Target Planning [DONE]

### Goal

Create a deterministic planning layer that identifies unit and full-course book targets from the existing course
hierarchy and lesson export manifest.

### Scope

- Add book target planning in `@ravenhill/lesson-export-core` if the logic is reusable.
- Otherwise, add an app-local module near the new book-export CLI.
- Derive:

  - one full-course bundle target;
  - one unit bundle target per exportable unit;
  - deterministic output paths under the selected `outDir`;
  - missing-input findings for absent lesson PDFs.
- Keep planning pure and filesystem-light where possible.

### Red

Add failing tests for planning behavior:

```ts
describe("planBookExports", () => {
    it("plans the full-course target in course order", () => {
        // Uses Tolkien-inspired fixture lessons:
        // "an-unexpected-party", "the-bridge-of-khazad-dum", "the-white-tree"
    });

    it("plans unit targets using only descendant lessons with exportable PDFs", () => {});

    it("reports missing lesson PDFs as findings without dropping valid targets", () => {});

    it.each([
        ["../outside.pdf"],
        ["units/../../outside.pdf"],
        ["/absolute/path/outside.pdf"],
    ])("rejects output paths outside outDir: %s", (unsafePath) => {});
});
```

### Green

- Implement a small book-planning model:

  - `BookExportTarget`
  - `BookExportLessonEntry`
  - `BookExportFinding`
  - `BookExportPlan`
- Normalize and validate output paths.
- Preserve course ordering from the existing hierarchy.
- Represent missing inputs as findings rather than thrown errors during planning.

### Refactor

- Keep target construction separate from CLI parsing.
- Keep path safety helpers small and independently tested.
- Avoid coupling planning to `pdf-lib`.
- Prefer data-only planning output so dry-run mode can reuse it directly.

### Acceptance Criteria

- Full-course target preserves course order.
- Unit targets include only descendant exportable lessons.
- Missing PDFs are reported as findings.
- Output paths cannot escape `outDir`.
- Planning can run without creating PDFs.

### Suggested Execution Order

1. Add planning test fixtures.
2. Add the book target types.
3. Implement course-order traversal.
4. Add missing-input findings.
5. Add output-path hardening.
6. Refactor naming and boundaries before CLI work begins.

## Phase 9.2: Add the Book Export CLI and Dry-Run Mode

### Goal

Expose book planning through a manual CLI that supports dry-run inspection before any PDF is written.

### Scope

- Add `scripts/export-lesson-books.mjs`.
- Add package scripts:

  - `pnpm export:pdf:books`
  - `pnpm export:pdf:books:dry-run`
  - optionally `pnpm test:pdf-books`
- Support:

  - `--dry-run`
  - `--all`
  - `--unit <id>`
  - `--outDir <path>`
  - explicit skip behavior for missing PDFs, for example `--skip-missing`.
- Keep the command outside default CI and `pnpm check`.

### Red

Add CLI tests using DDT for argument combinations:

```ts
describe("export-lesson-books CLI", () => {
    it.each([
        ["--dry-run --all", "plans all book targets without writing PDFs"],
        ["--dry-run --unit rivendell", "plans only the requested unit"],
        ["--all --outDir dist/books", "uses the requested output directory"],
    ])("handles %s", async (_args, _expectedBehavior) => {});

    it("fails when required lesson PDFs are missing and skip mode is disabled", async () => {});

    it("continues with findings when missing PDFs are allowed explicitly", async () => {});
});
```

### Green

- Parse CLI flags in a thin adapter.
- Reuse the planning module.
- Print a concise dry-run summary:

  - planned bundles;
  - included lesson count;
  - skipped lesson count;
  - missing-input findings;
  - output paths.
- Return non-zero exit codes only for actionable failures.

### Refactor

- Keep CLI parsing, planning, and export execution separate.
- Avoid broad framework dependencies unless the repository already uses a CLI helper.
- Prefer stable JSON report generation over parsing console output in tests.

### Acceptance Criteria

- `pnpm export:pdf:books:dry-run` produces no PDFs.
- `--all` plans unit and full-course bundles.
- `--unit <id>` limits the plan to one unit.
- `--outDir <path>` controls all output paths safely.
- Missing inputs fail by default unless explicit skip mode is enabled.
- The CLI remains manual/advisory.

### Suggested Execution Order

1. Add CLI parser tests.
2. Wire dry-run to the planner.
3. Add missing-input exit behavior.
4. Add package scripts.
5. Keep actual PDF generation stubbed until Phase 9.3.

## Phase 9.3: Generate Book Bundles with `pdf-lib`

### Goal

Create usable unit and full-course PDF bundles from already exported lesson PDFs.

### Scope

- Add `pdf-lib` as the implementation dependency for PDF post-processing.
- Generate:

  - cover page;
  - table of contents page;
  - merged lesson PDFs in course order;
  - PDF metadata;
  - bundle report JSON.
- Use the existing single-lesson PDFs as inputs.

### Red

Add tests for PDF assembly boundaries:

```ts
describe("buildLessonBookPdf", () => {
    it("creates a bundle with cover, table of contents, and lesson pages", async () => {});

    it("merges lesson PDFs in planned order", async () => {});

    it("writes standard metadata for the generated bundle", async () => {});

    it("records included, skipped, and failed lessons in the bundle report", async () => {});
});
```

Add a tiny fixture set with Tolkien-inspired names, for example:

- `bag-end-basics.pdf`
- `doors-of-durin-layouts.pdf`
- `minas-tirith-testing.pdf`

### Green

- Implement a `BookPdfAssembler` or equivalent module.
- Load each planned lesson PDF.
- Create cover and TOC pages.
- Copy lesson pages into the bundle.
- Set metadata:

  - title;
  - author;
  - subject;
  - producer;
  - creation/modification dates, with deterministic handling in tests where needed.
- Write a report JSON next to each bundle.

### Refactor

- Separate page creation from merge orchestration.
- Keep metadata construction testable as pure data.
- Avoid duplicating report counting logic from Phase 9.2.
- Keep default styling minimal until renderer evaluation justifies richer layout work.

### Acceptance Criteria

- Each successful bundle contains cover, TOC, and lesson pages.
- Lesson order matches the planned order.
- PDF metadata is present.
- Bundle report includes:

  - target id;
  - output path;
  - included lessons;
  - skipped lessons;
  - findings;
  - failed merge details, if any.
- A failed lesson merge does not corrupt already completed independent bundles.

### Suggested Execution Order

1. Add tiny fixture PDFs for smoke-level assembly tests.
2. Implement cover page generation.
3. Implement TOC page generation.
4. Implement page copying and merge order.
5. Add metadata.
6. Write report JSON.
7. Connect assembly to the CLI.

## Phase 9.4: Add Opt-In Smoke Validation and Manual Acceptance

### Goal

Provide enough validation confidence for a manual book-export pipeline without slowing default checks.

### Scope

- Add one opt-in smoke test that:

  - creates tiny fixture PDFs;
  - merges them;
  - writes metadata;
  - verifies the output exists;
  - verifies the resulting bundle has multiple pages.
- Document a manual acceptance procedure.

### Red

Add a failing smoke test behind an explicit script or test pattern:

```ts
describe("book PDF smoke", () => {
    it("creates a multi-page book bundle from tiny fixture PDFs", async () => {});
});
```

### Green

- Add `pnpm test:pdf-books` if useful.
- Keep the smoke test opt-in.
- Avoid adding full book export to `pnpm check`.

### Refactor

- Keep smoke fixtures tiny.
- Keep assertions structural, not visual.
- Avoid snapshotting binary PDFs.

### Acceptance Criteria

- Opt-in smoke test passes locally.
- Default CI/check remains unchanged.
- Manual acceptance checklist is documented:

  1. run full lesson export;
  2. run book export;
  3. inspect one unit bundle;
  4. inspect one full-course bundle;
  5. verify cover, TOC, lesson order, readable code blocks, and metadata.

### Suggested Execution Order

1. Add fixture smoke test.
2. Add opt-in script.
3. Document manual acceptance.
4. Confirm default checks remain unchanged.

## Phase 9.5: Run Controlled Renderer Evaluation

### Goal

Evaluate whether a dedicated paged-media renderer is worth adopting in a future phase.

### Scope

- Add a spike script or documented command path that compares:

  - existing Chromium/Playwright export;
  - Vivliostyle;
  - optionally Paged.js.
- Use the same representative long lesson or mini-book fixture.
- Produce comparison PDFs and a short traceability note.

### Evaluation Criteria

Focus only on features the current exporter cannot provide well:

- running headers;
- page counters;
- richer table of contents;
- cross-document page references;
- index/glossary support;
- page-break quality around:

  - headings;
  - code blocks;
  - tables;
  - callouts.

### Red

No production TDD cycle is required for the spike. Instead, define a reproducible comparison protocol before running the
spike:

```md
Given the same mini-book fixture, When each renderer produces a PDF, Then the traceability note records feature support,
rendering quality, operational complexity, and adoption risk.
```

### Green

- Add a minimal reproducible spike command or script.
- Generate comparison PDFs.
- Write a traceability note with:

  - tested renderer;
  - command used;
  - observed strengths;
  - observed weaknesses;
  - dependency/runtime cost;
  - recommendation for Phase 10.

### Refactor

- Keep spike code isolated from production export code.
- Remove or quarantine throwaway renderer-specific hacks.
- Do not add renderer dependencies to normal install paths unless explicitly approved later.

### Acceptance Criteria

- Existing Chromium export remains the default.
- Renderer comparison artifacts are generated or the failure is documented.
- The traceability note recommends one of:

  - keep Chromium plus `pdf-lib` bundling;
  - adopt Vivliostyle in a future Phase 10;
  - evaluate Paged.js further;
  - defer renderer migration.

### Suggested Execution Order

1. Choose one representative long lesson or mini-book fixture.
2. Generate the current Chromium baseline.
3. Generate Vivliostyle output.
4. Optionally generate Paged.js output.
5. Compare output against the evaluation criteria.
6. Write the traceability note.
7. Do not change the production exporter.

## Phase-Level Execution Order

1. Phase 9.1 — Define book target planning.
2. Phase 9.2 — Add CLI and dry-run mode.
3. Phase 9.3 — Generate book bundles with `pdf-lib`.
4. Phase 9.4 — Add opt-in smoke validation and manual acceptance.
5. Phase 9.5 — Run renderer evaluation.

This order prioritizes a practical deliverable before exploratory renderer work.

## Testing Strategy

### TDD

Use TDD for:

- target planning;
- output-path safety;
- CLI argument behavior;
- report summarization;
- PDF assembly boundaries;
- opt-in smoke validation.

### BDD

Prefer BDD-style test names that describe observable behavior:

- “plans the full-course target in course order”
- “reports missing lesson PDFs without corrupting successful bundles”
- “fails when required inputs are absent unless skip mode is explicit”
- “creates a bundle with cover, TOC, lesson pages, and metadata”

### DDT

Use DDT for compact coverage of:

- CLI flag combinations;
- unsafe output path examples;
- unit/full-course target variants;
- missing-input handling modes;
- report count summaries.

### PBT

Do not add property-based testing by default.

Consider PBT only if the repository already uses a mature generator library such as `fast-check`, or if output-path
hardening becomes complex enough to justify randomized traversal/path-normalization cases.
