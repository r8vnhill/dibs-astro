# [PLAN] Phase 1: Unify Read-Side Analytics

Status: Implemented on 2026-04-29.

## Summary

Refactor `scripts/bibliography-report.mjs` so bibliography reports are computed from the same normalized catalog semantics used by site rendering.

The current report script should stop manually inspecting generated graph nodes. Instead, it should delegate catalog loading, reference statistics, book rankings, and lesson/tag summaries to shared read-side helpers. This intentionally aligns report output with runtime catalog behavior, including supported rendered reference types that the old script may omit, such as `VideoObject`.

This phase should stay focused on read-side analytics. It should not retire `ReferencesFromJsonLd`, redesign pending-revision policy, or change rendering behavior.

## Goals

- Make report analytics use the same normalized catalog model as site rendering.
- Remove duplicated graph-reading/report logic from `scripts/bibliography-report.mjs`.
- Keep report generation deterministic and script-friendly.
- Preserve the existing package command and output files.
- Make semantic output changes explicit where the old report diverged from runtime catalog behavior.
- Keep the implementation small, pure, and testable.

## Non-Goals

- Do not change the Turtle authoring workflow.
- Do not change generated JSON-LD structure.
- Do not centralize `pending-revision` policy yet.
- Do not decide the long-term compatibility status of `ReferencesFromJsonLd`.
- Do not introduce a new dependency unless the current repo already has a script runner suitable for TypeScript execution.
- Do not make Astro components responsible for report data.

---

## Design Constraint: Node-Safe Shared Core

The key design challenge is that `src/lib/bibliography/catalog.ts` is used by the site, while `scripts/bibliography-report.mjs` runs in Node.

Avoid moving all implementation into an untyped `.mjs` file too quickly if that would weaken the TypeScript contract. Prefer this split:

```text
shared pure catalog core
  - parses JSON-LD text
  - builds normalized maps
  - computes stats
  - computes rankings
  - computes lesson/tag summaries

site facade
  - imports generated JSON-LD in the way Astro/Vite expects
  - exposes typed runtime helpers to components

script facade
  - reads generated JSON-LD from disk
  - calls the same shared core
  - writes JSON/CSV reports
```

Recommended implementation options, in order:

1. **Preferred if script TypeScript execution already exists**
   - Extract the shared core into TypeScript:
     - `src/lib/bibliography/catalog-core.ts`
   - Use it from both runtime code and script tests.
   - Keep the actual CLI wrapper in `.mjs` only if needed.

2. **Acceptable if scripts must remain plain Node ESM**
   - Extract the shared core into a Node-safe ESM module:
     - `src/lib/bibliography/catalog-core.mjs`
   - Add JSDoc types or a colocated declaration file if practical.
   - Keep `src/lib/bibliography/catalog.ts` as the typed facade over the `.mjs` core.

3. **Avoid**
   - Duplicating catalog loading in `scripts/lib`.
   - Having the report script parse raw JSON-LD graph nodes independently.
   - Importing Vite-only raw asset loaders from Node scripts.

The selected option should match the current repository tooling. If no TypeScript script runner exists, use Option 2 for Phase 1 and keep a future migration path toward a typed shared core.

---

## Proposed Module Split

### Shared Catalog Core

Create a Node-safe shared module:

```text
src/lib/bibliography/catalog-core.{ts|mjs}
```

Responsibilities:

- parse generated JSON-LD text;
- normalize catalog data into `BibliographyCatalog`;
- expose read-side analytics:
  - `loadBibliographyCatalog`
  - `getReferenceStats`
  - `getMostCitedBooks`
  - `getReferencesForLesson`
  - `getLessonUsageSummary`
  - `getReferencesByTagAndLesson`

This module must not import:

- Astro components;
- Vite raw imports;
- browser-only APIs;
- filesystem APIs;
- report output formatting.

### Runtime Facade

Keep:

```text
src/lib/bibliography/catalog.ts
```

Responsibilities:

- provide typed public wrappers for site/runtime callers;
- preserve existing imports used by components and tests;
- hide whether the implementation comes from `.ts` or `.mjs` core;
- keep the runtime API stable.

Public exports should continue to include:

```ts
loadBibliographyCatalog;
getReferenceStats;
getMostCitedBooks;
getReferencesForLesson;
```

and any existing query helpers.

### Report Read Model

Add:

```text
scripts/lib/bibliography-report-read-model.mjs
```

Responsibilities:

- accept generated JSON-LD text and report metadata;
- call the shared catalog core;
- build a pure report DTO;
- compute lesson/tag summaries from normalized catalog data;
- expose data in a format that JSON and CSV writers can consume.

Example shape:

```ts
type BibliographyReport = {
    readonly generatedAt: string;
    readonly catalogPath: string;
    readonly totals: BibliographyReportTotals;
    readonly topReferences: readonly RankedReference[];
    readonly topBooks: readonly RankedReference[];
    readonly referencesByTagAndLesson: readonly LessonTagReferenceSummary[];
};
```

### Report CLI

Refactor:

```text
scripts/bibliography-report.mjs
```

Responsibilities only:

- resolve paths;
- read `src/data/bibliography/catalog.graph.generated.jsonld`;
- call `buildBibliographyReport`;
- write `reports/bibliography-report.json`;
- write `reports/bibliography-report.csv`;
- print a concise success summary.

The CLI should not manually walk graph nodes.

---

## Public Interface Contract

Preserve:

```bash
pnpm bibliography:report
```

Preserve output files:

```text
reports/bibliography-report.json
reports/bibliography-report.csv
```

Keep the top-level JSON shape where practical:

```ts
type BibliographyReportJson = {
    readonly generatedAt: string;
    readonly catalogPath: string;
    readonly totals: unknown;
    readonly topReferences: readonly unknown[];
    readonly topBooks: readonly unknown[];
    readonly referencesByTagAndLesson: readonly unknown[];
};
```

Intentional semantic update:

- `totals` and `topReferences` should reflect the runtime catalog model.
- Supported rendered reference types such as `VideoObject` should appear in report stats when visible.
- Differences from the old report are acceptable when they represent alignment with runtime behavior.

---

## TDD Plan

### Cycle 1: Characterize Current Report Shape

Red/Lock:

- Add a fixture-based test for the expected report DTO shape.
- Assert the presence of:
  - `generatedAt`
  - `catalogPath`
  - `totals`
  - `topReferences`
  - `topBooks`
  - `referencesByTagAndLesson`

Green:

- Build a minimal read-model function that preserves the current shape.

Refactor:

- Keep output construction separate from filesystem I/O.

### Cycle 2: Report Uses Shared Catalog Stats

Red:

- Add a test proving report totals match `getReferenceStats`.

Green:

- Make the read model call `loadBibliographyCatalog` and `getReferenceStats`.

Refactor:

- Remove duplicated total-counting logic from the report script.

### Cycle 3: Report Uses Shared Book Ranking

Red:

- Add a test proving `topBooks` matches `getMostCitedBooks`.

Green:

- Delegate book ranking to the shared catalog helper.

Refactor:

- Keep CSV-specific shaping out of the catalog core.

### Cycle 4: Lesson/Tag Summary Uses Normalized Catalog

Red:

- Add a small catalog fixture with:
  - two lessons;
  - at least one `recommended` usage;
  - at least one `additional` usage;
  - at least one `pending-revision` usage.

Assert that the report uses:

- normalized lesson titles;
- normalized reference IDs;
- normalized usage tags.

Green:

- Compute lesson/tag summary from `catalog.usages`, `catalog.lessonsById`, and existing tag filtering semantics.

Refactor:

- Extract small helpers:
  - `groupUsagesByLesson`
  - `groupUsagesByTag`
  - `toLessonTagSummary`

### Cycle 5: VideoObject Visibility Regression

Red:

- Add a fixture with a visible `VideoObject` reference.
- Assert it appears in report totals and `topReferences` when cited.

Green:

- Ensure the report uses runtime reference stats instead of hard-coded report-side reference type filters.

Refactor:

- Remove any script-side type allow-list that duplicates runtime catalog knowledge.

### Cycle 6: CLI Formatting Boundary

Red:

- Add a focused test for JSON/CSV formatting only if existing script tests support this cleanly.
- Assert CSV rows are produced from report DTO entries, not raw graph nodes.

Green:

- Keep CLI as file I/O plus formatter.

Refactor:

- Extract CSV formatting if the function exceeds roughly 25 lines.

---

## Testing Strategy

### BDD

Use behavior-oriented suite names:

```ts
describe("bibliography report read model", () => {
    describe("catalog-aligned statistics", () => {
        test("builds totals from the shared runtime catalog model", () => {
            // ...
        });
    });
});
```

### DDT

Use table-driven tests for repeated report sections:

```ts
test.each([
  ["totals"],
  ["topReferences"],
  ["topBooks"],
  ["referencesByTagAndLesson"],
])("builds %s from the normalized catalog model", ...);
```

### PBT

Optional, only for small pure helpers:

- grouping usages should be independent of input order;
- duplicate-independent summaries should remain stable if fixture order changes;
- CSV escaping should preserve round-trippable cell boundaries for commas, quotes, and newlines.

Do not add PBT to the CLI wrapper.

---

## Detailed Test Additions

Add tests for `scripts/lib/bibliography-report-read-model.mjs`:

- builds totals from `loadBibliographyCatalog`;
- `topReferences` matches shared reference stats;
- `topBooks` matches `getMostCitedBooks`;
- lesson/tag summary uses normalized lesson titles and usage tags;
- visible `VideoObject` references appear in report stats;
- pending usages follow the existing runtime tag-filter semantics;
- report output is deterministic for the same input catalog.

Keep existing suites passing:

```text
src/lib/bibliography/__tests__/catalog.test.ts
bibliography builder tests
reference render tests
```

Add a script-level test only if it can stay narrow:

- JSON writer receives report DTO;
- CSV writer receives report DTO;
- no graph reparsing occurs in the CLI layer.

---

## Implementation Notes

### Keep Functions Small

Suggested helper boundaries:

```ts
buildBibliographyReport(...)
buildReportTotals(...)
buildTopReferences(...)
buildTopBooks(...)
buildReferencesByTagAndLesson(...)
formatBibliographyReportCsv(...)
writeBibliographyReportFiles(...)
```

Each helper should have one responsibility and stay short.

### Prefer Data In, Data Out

The read model should be pure:

```ts
function buildBibliographyReport(
    catalogJsonLd: string,
    options: BuildBibliographyReportOptions,
): BibliographyReport;
```

The CLI should do I/O:

```ts
async function main(): Promise<void>;
```

### Avoid Broad Coupling

The shared catalog core should not know about:

- report file paths;
- CSV formatting;
- console output;
- package scripts;
- Astro rendering;
- component slot overrides.

### Determinism

Sort report rows explicitly by stable keys, for example:

1. lesson title;
2. usage tag;
3. reference title;
4. reference ID.

This avoids noisy diffs in committed report files.

---

## Verification Commands

Focused tests:

```bash
pnpm vitest run \
  src/lib/bibliography \
  scripts/__tests__
```

Full unit suite:

```bash
pnpm test:unit
```

Type checking:

```bash
pnpm exec tsc --noEmit
```

Generate report:

```bash
pnpm bibliography:report
```

Check generated report diff:

```bash
git diff -- reports/bibliography-report.json reports/bibliography-report.csv
```

If catalog generation is touched, also run:

```bash
pnpm generate:bibliography-catalog
git diff -- src/data/bibliography/catalog.graph.generated.jsonld
```

---

## Documentation Updates

After implementation:

- Update `docs/architecture/jsonld-references-workflow-report.md` to mark Phase 1 completed.
- Update `src/data/bibliography/README.md` under “Analysis” to state that `bibliography:report` uses the same normalized catalog model as site rendering.
- Add a changelog entry noting:
  - bibliography reports now use runtime catalog analytics;
  - report totals now include all supported rendered reference types;
  - output may change where the old report diverged from runtime behavior.

---

## Acceptance Criteria

- [x] `scripts/bibliography-report.mjs` no longer manually parses graph nodes for analytics.
- [x] Report analytics are computed from the shared catalog model.
- [x] Existing package script remains unchanged.
- [x] Existing report output file paths remain unchanged.
- [x] `VideoObject` and other supported rendered reference types are included according to runtime catalog semantics.
- [x] JSON output keeps the current top-level shape where practical.
- [x] CSV output is generated from the report DTO, not from raw graph nodes.
- [x] Report rows are deterministically ordered.
- [x] Existing catalog, builder, and render tests pass.
- [x] `pnpm bibliography:report` succeeds.
- [x] Any report output changes are explained as runtime-alignment changes.

---

## Assumptions

- `ReferencesFromJsonLd` compatibility policy is outside Phase 1.
- Pending-revision policy is not centralized in Phase 1.
- The report should use existing runtime tag-filter semantics.
- No new dependency is required.
- If the repo cannot execute TypeScript directly from Node scripts, a Node-safe `.mjs` shared core is acceptable for Phase 1, provided the typed `catalog.ts` facade remains stable.

## Implementation Notes

- The shared catalog core was extracted to `src/lib/bibliography/catalog-core.mjs`, with `src/lib/bibliography/catalog.ts` kept as the typed runtime facade.
- The pure report read model lives in `scripts/lib/bibliography-report-read-model.mjs`.
- `scripts/bibliography-report.mjs` now performs only path resolution, file I/O, read-model invocation, and concise console output.
- Generated report totals changed because the report now reads the current normalized catalog model, including all visible references supported by runtime rendering.

## Verification Results

Verified on 2026-04-29:

```sh
pnpm vitest run src/lib/bibliography scripts/__tests__
pnpm exec tsc --noEmit
pnpm bibliography:report
pnpm test:unit
pnpm test:astro
```

Results:

- Focused bibliography/script tests: 19 files passed, 362 tests passed.
- TypeScript check: passed.
- Bibliography report generation: passed.
- Full unit suite: 57 files passed, 924 tests passed.
- Astro render suite: 21 files passed, 168 tests passed.
