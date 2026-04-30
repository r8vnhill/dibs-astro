# [PLAN] JSON-LD References Workflow

## Summary

Improve the JSON-LD references workflow by consolidating duplicated normalization paths, centralizing pending-revision policy, improving diagnostics for Turtle-authored data, and making editorial/reporting workflows more trustworthy.

The current preferred workflow is graph-backed: Turtle fragments are assembled, parsed with `n3`, validated, emitted as deterministic JSON-LD, loaded into a normalized runtime catalog, and rendered through `LessonReferencesFromCatalog` / `ReferencesFromCatalog`. The older `ReferencesFromJsonLd` ItemList path still exists and bypasses the generated graph, but both callers now share the same final render-facing reference normalization core before reaching `ReferenceEntry`. 

The plan should preserve the existing strengths: deterministic generated artifacts, normalized runtime maps, shared `NormalizedReference` rendering, and the current protected behavioural baseline across build, load, grouping, and rendering. 

## Goals

- Reduce duplicated normalization logic between the graph-backed catalog path and the legacy ItemList path.
- Make the runtime catalog the single read-side source of truth for reports and site rendering.
- Centralize `pending-revision` semantics across build, load, query, render, and reporting.
- Improve authoring diagnostics with better provenance for Turtle source data.
- Make editorial debt visible through report metrics.
- Clarify whether `ReferencesFromJsonLd` is a long-term public component or a compatibility bridge.
- Keep components small, rendering-focused, and easy to test.

## Non-Goals

- Do not replace Turtle as the preferred editorial source.
- Do not remove `ReferencesFromJsonLd` in the first phase.
- Do not introduce a database or runtime network dependency.
- Do not make Astro components responsible for raw JSON-LD inspection.
- Do not move build-script-only concerns into the rendering layer.

## Current Risks and Design Pressure

### 1. Two active JSON-LD shapes

The graph-backed catalog path and the legacy ItemList path both normalize bibliography data, but in separate modules with overlapping logic for reference types, authors, publishers, URLs, pages, and fallback fields. 

This creates a long-term divergence risk: a fix in one path may not apply to the other.

### 2. Report/runtime divergence

`scripts/bibliography-report.mjs` manually parses the generated graph instead of reusing `loadBibliographyCatalog`, `getReferenceStats`, and `getMostCitedBooks`, even though those helpers already exist in the runtime catalog layer. 

Reports should describe the same catalog model that the site renders.

### 3. Distributed pending-revision policy

`pending-revision` behaviour currently appears at multiple levels: builder pruning, loader tolerance, query defaults, and rendering defaults. The report notes that the choices are coherent, but distributed. 

This is a good candidate for a small policy module.

### 4. Weak authoring diagnostics

Generated graph nodes expose limited provenance: runtime nodes know `sourceLabel`, but generated nodes do not expose which Turtle file or source line produced them. That makes errors harder to fix in a large graph. 

### 5. Editorial debt is hidden

The catalog has 130 usage nodes, but 102 are `pending-revision`, meaning most graph data is intentionally hidden from public rendering. 

That is acceptable during migration, but it needs explicit tracking.

---

# Proposed Architecture Direction

## Target Shape

Separate the workflow into explicit modules:

```text
Turtle sources
  -> build catalog artifact
  -> generated JSON-LD
  -> runtime catalog loader
  -> catalog query services
  -> presentation adapters/components
```

Recommended ownership:

```text
scripts/lib/bibliography/source/
  Turtle assembly, source indexing, provenance capture.

scripts/lib/bibliography/build/
  Catalog artifact construction and build-time validation.

scripts/lib/bibliography/domain/
  Shared reference normalization, usage policy, stats, and query rules.

src/lib/bibliography/
  Runtime catalog loading and read-side query APIs.

src/components/ui/references/
  Rendering only: normalized references in, UI out.
```

The important shift is to make **normalization and policy shared**, while keeping **Astro rendering** and **build-script I/O** separate.

---

# ~~Phase 1: Unify Read-Side Analytics~~

## Objective

Make `scripts/bibliography-report.mjs` reuse the same catalog loader and query helpers as the site.

The report already identifies this as a high-value first planning area: `bibliography-report.mjs` duplicates graph-reading logic instead of reusing `loadBibliographyCatalog`, `getReferenceStats`, and `getMostCitedBooks`. 

## Changes

- Extract a Node-safe read-side entrypoint, for example:

```ts
src/lib/bibliography/catalog-read-model.ts
```

or, if it must be used by both Node scripts and site runtime:

```ts
src/lib/bibliography/catalog-core.ts
```

- Keep the module free from Astro imports.
- Expose pure functions:

```ts
loadBibliographyCatalog(source: string): BibliographyCatalog
getReferenceStats(catalog: BibliographyCatalog): ReferenceStats
getMostCitedBooks(catalog: BibliographyCatalog): readonly CitedReference[]
getPendingRevisionStats(catalog: BibliographyCatalog): PendingRevisionStats
```

- Update `scripts/bibliography-report.mjs` to call these helpers instead of parsing the graph manually.
- Keep script-specific formatting in the script layer.

## Testing

### BDD

```ts
describe("bibliography report read model", () => {
  test("uses the same stats as the runtime catalog", () => {
    // Given a generated catalog fixture
    // When report stats are computed
    // Then they match runtime catalog stats
  });
});
```

### DDT

Use a table for report sections:

```ts
test.each([
  ["reference type counts"],
  ["usage tag counts"],
  ["most cited books"],
  ["pending revision by lesson"],
])("renders %s from catalog read model", ...)
```

## Acceptance Criteria

- Report output is derived from the runtime catalog model.
- No duplicated graph-reading logic remains in `bibliography-report.mjs`.
- Existing report output remains stable unless intentionally improved.
- Existing runtime catalog tests still pass.

---

# ~~Phase 2: Centralize Reference Normalization~~

## Objective

Create one normalization path for all supported reference shapes.

Status: completed for the current supported runtime reference kinds. The legacy ItemList path and the graph-backed catalog path now keep source-specific extraction local, then delegate final render-facing construction for `Book`, `WebPage`, `VideoObject`, `ScholarlyArticle`, and `Thesis` to the shared normalizer in `src/lib/bibliography/normalize/normalize-reference.mjs`. 

## Changes

Introduce a shared normalization core:

```ts
src/lib/bibliography/normalize/
  normalize-reference.ts
  normalize-authors.ts
  normalize-publication.ts
  normalize-url.ts
  normalize-pages.ts
  normalize-fallback-title.ts
```

Recommended design:

```ts
type ReferenceInput =
  | CatalogReferenceInput
  | ItemListReferenceInput;

type NormalizeReferenceOptions = {
  readonly fallbackTitle?: string;
  readonly source: "catalog" | "item-list";
};

function normalizeReference(
  input: ReferenceInput,
  options: NormalizeReferenceOptions,
): NormalizedReference;
```

Keep source-specific parsing separate:

```text
ItemList JSON-LD -> ItemListReferenceInput
Catalog graph node -> CatalogReferenceInput
ReferenceInput -> NormalizedReference
```

This prevents the generic normalizer from knowing too much about either raw format.

Current implementation note:

- `src/lib/bibliography/normalize-jsonld.ts` owns ItemList validation, duplicate detection, fallback-title handling, and strict/non-strict behavior.
- `src/lib/bibliography/catalog-core.mjs` owns graph resolution, linked-node lookup, pending-only tolerance, and strict/non-strict behavior.
- Both callers now converge on the same final normalization core.

## TypeScript Design Suggestions

Use discriminated unions for supported reference types:

```ts
type NormalizedReference =
  | NormalizedBookReference
  | NormalizedWebPageReference
  | NormalizedVideoReference
  | NormalizedScholarlyArticleReference
  | NormalizedThesisReference;
```

Use exhaustive checking:

```ts
function assertNever(value: never): never {
  throw new Error(`Unsupported reference type: ${String(value)}`);
}
```

Avoid large functions. Split each reference-type normalizer into short functions under 25 lines where possible:

```ts
normalizeBookReference(...)
normalizeWebPageReference(...)
normalizeVideoReference(...)
normalizeScholarlyArticleReference(...)
normalizeThesisReference(...)
```

## Testing

### BDD

```ts
describe("normalizeReference", () => {
  describe("Book references", () => {
    test("normalizes equivalent catalog and ItemList books to the same render model", ...)
  });
});
```

### DDT

Use equivalent cases across both input shapes:

```ts
test.each([
  ["Book", catalogBookInput, itemListBookInput],
  ["WebPage", catalogWebPageInput, itemListWebPageInput],
  ["VideoObject", catalogVideoInput, itemListVideoInput],
])("%s normalizes consistently across sources", ...)
```

### PBT

Use property-based tests for low-risk pure helpers:

- author list normalization;
- URL trimming / blank handling;
- page range preservation;
- fallback title precedence.

Example property:

```ts
// For any non-empty title string, normalization should preserve
// the trimmed title and never replace it with a fallback title.
```

## Acceptance Criteria

- The ItemList path produces `NormalizedReference` through the shared final normalizer, while catalog rewiring remains
  an explicit follow-up.
- Reference leaf components remain unchanged or become simpler.
- Duplicate normalization logic is removed.
- Existing render tests for both `ReferencesFromCatalog` and `ReferencesFromJsonLd` continue to pass.

---

# Phase 3: Define the Compatibility Policy for `ReferencesFromJsonLd`

## Objective

Decide whether `ReferencesFromJsonLd` is:

1. a supported long-term public component, or
2. a compatibility bridge for older lesson pages.

The report explicitly notes that `ReferencesFromJsonLd` remains tested and functional, but its long-term status is unclear. 

## Recommendation

Treat it as a **compatibility bridge** unless there is a strong authoring reason to keep direct ItemList JSON-LD as a first-class workflow.

Suggested policy:

```text
ReferencesFromCatalog:
  Preferred API for new lesson pages.

LessonReferencesFromCatalog:
  Preferred lesson-page wrapper.

ReferencesFromJsonLd:
  Compatibility bridge for legacy pages and external JSON-LD snippets.
```

## Changes

- Add a clear deprecation or compatibility note near the component export.
- Add runtime or build-time warning only if warnings will not make tests noisy.
- Add a migration checklist:

```text
ItemList JSON-LD -> Turtle source fragments -> generated catalog -> ReferencesFromCatalog
```

- Add a tracking issue or TODO with removal criteria.

## Removal Criteria

Do not remove the component until:

- all internal lesson pages use the graph-backed catalog path;
- render coverage confirms equivalent output for migrated references;
- the compatibility bridge has no internal callers;
- one release or migration window has passed.

## Testing

- Keep current render coverage while the component exists.
- Add one compatibility contract test:

```ts
test("renders legacy ItemList references through the shared normalized reference model", ...)
```

## Acceptance Criteria

- New code has a clear preferred API.
- Legacy support remains intentional, not accidental.
- The migration path is explicit.

---

# Phase 4: Centralize `pending-revision` Semantics

## Objective

Make `pending-revision` an explicit policy instead of distributed behaviour.

The current implementation has pending-related behaviour in builder pruning, catalog loading, query defaults, and rendering defaults. 

## Changes

Introduce a policy module:

```ts
src/lib/bibliography/pending-revision-policy.ts
```

or, if used by build scripts too:

```ts
scripts/lib/bibliography/policy/pending-revision-policy.mjs
```

Preferred API:

```ts
type UsageTag = "recommended" | "additional" | "pending-revision";

type PendingRevisionPolicy = {
  readonly renderByDefault: boolean;
  readonly allowMalformedDraftReference: boolean;
  readonly includeInStats: boolean;
  readonly pruneWhenUnrenderable: boolean;
};

function classifyUsageVisibility(tags: readonly UsageTag[]): UsageVisibility;
function shouldRenderUsageByDefault(tags: readonly UsageTag[]): boolean;
function shouldPruneMalformedReference(tags: readonly UsageTag[]): boolean;
```

## Policy Proposal

- `recommended`: render by default.
- `additional`: render by default.
- `pending-revision`: do not render by default.
- malformed references used only by pending usages may be pruned or tolerated depending on build-stage policy.
- malformed references used by public usages should fail validation.

## Testing

### BDD

```ts
describe("pending revision policy", () => {
  test("hides pending-revision usages from default lesson rendering", ...)
  test("allows draft-only malformed references during migration", ...)
  test("rejects malformed references used by public tags", ...)
});
```

### DDT

Use table-driven cases for tag combinations:

```ts
test.each([
  [["recommended"], true],
  [["additional"], true],
  [["pending-revision"], false],
  [["recommended", "pending-revision"], true],
])("classifies %j render visibility", ...)
```

### PBT

For tag arrays:

- order should not affect visibility;
- duplicate tags should not affect visibility;
- adding `pending-revision` should not hide an explicitly public `recommended` usage unless the intended policy says otherwise.

## Acceptance Criteria

- Builder, loader, query, and report code use the same policy helpers.
- Default rendering behaviour remains unchanged.
- Policy tests explain the intended behaviour better than scattered implementation tests.

---

# Phase 5: Improve Turtle Source Provenance and Diagnostics

## Objective

Make validation errors actionable for lesson authors and maintainers.

The report notes that generated nodes do not expose the Turtle file or source line that produced them, which makes diagnostics less actionable when graph data is malformed. 

## Changes

### 1. Track source segments during assembly

When assembling numbered Turtle files, preserve metadata:

```ts
type TurtleSourceSegment = {
  readonly filePath: string;
  readonly startLine: number;
  readonly endLine: number;
  readonly text: string;
};
```

### 2. Attach provenance to parsed records

```ts
type BibliographyRecordProvenance = {
  readonly sourceFile: string;
  readonly sourceLine?: number;
  readonly sourceLabel?: string;
};
```

### 3. Include provenance in validation errors

```ts
type BibliographyValidationError = {
  readonly code: string;
  readonly message: string;
  readonly nodeId: string;
  readonly sourceFile?: string;
  readonly sourceLine?: number;
  readonly suggestion?: string;
};
```

### 4. Keep generated JSON-LD clean by default

Do not necessarily expose full provenance in the public generated JSON-LD artifact. Consider two outputs:

```text
catalog.graph.generated.jsonld
catalog.graph.diagnostics.generated.json
```

This avoids bloating runtime data while still improving authoring diagnostics.

## Testing

### BDD

```ts
describe("bibliography source provenance", () => {
  test("reports the Turtle file for malformed references", ...)
  test("reports the source line when available", ...)
});
```

### DDT

Use malformed cases:

- missing author relation;
- missing title;
- invalid usage tag;
- reference usage pointing to unknown lesson;
- reference usage pointing to unknown work.

## Acceptance Criteria

- Build errors identify at least the source Turtle file.
- Line numbers are included when feasible.
- Runtime catalog size does not grow unnecessarily.
- Diagnostics are stable enough for snapshot or structured assertions.

---

# Phase 6: Improve Editorial Visibility

## Objective

Turn `pending-revision` from hidden migration state into visible editorial backlog.

The report states that `pending-revision` dominates the current graph: 102 pending usages versus 14 recommended and 14 additional. 

## Changes

Extend the report with:

```text
Pending revision by lesson
Pending revision by reference type
Pending revision by source file
Public vs draft usage ratio
References with no public usage
Lessons with no public references
Most reused pending references
```

Add a machine-readable report output:

```bash
pnpm bibliography:report --format json
pnpm bibliography:report --format markdown
```

Suggested output files:

```text
reports/bibliography-summary.md
reports/bibliography-summary.json
```

## Testing

### BDD

```ts
describe("bibliography editorial report", () => {
  test("groups pending-revision usages by lesson", ...)
  test("groups pending-revision usages by reference type", ...)
});
```

### DDT

Use small catalog fixtures with known counts.

## Acceptance Criteria

- Editors can see which lessons still need reference review.
- CI can optionally fail only when configured thresholds are exceeded.
- The report uses the same catalog read model as rendering.

## Optional CI Policy

Start non-blocking:

```bash
pnpm bibliography:report
```

Later add thresholds:

```bash
pnpm bibliography:report --max-pending-ratio 0.75
```

Avoid failing CI immediately while the migration backlog is still intentional.

---

# Phase 7: Make Slot Overrides More Explicit

## Objective

Make override behaviour discoverable and safer.

Currently, slot overrides are powerful but implicit: lesson pages can override `title`, `description`, `publication`, and `institution` through ID-based slots such as `title-{referenceId}`. 

## Options

### Option A: Keep slots, add typed helpers

```ts
const referenceSlotName = {
  title: (id: string) => `title-${id}`,
  description: (id: string) => `description-${id}`,
  publication: (id: string) => `publication-${id}`,
  institution: (id: string) => `institution-${id}`,
} as const;
```

Pros:

- Low risk.
- Preserves current authoring model.
- Centralizes slot naming.

Cons:

- Astro slot names are still string-based at the call site.

### Option B: Add content-driven overrides

```ts
type ReferenceOverride = {
  readonly id: string;
  readonly title?: string;
  readonly description?: string;
  readonly publication?: string;
  readonly institution?: string;
};
```

Pros:

- Easier to validate.
- Easier to test.
- Better for generated lesson metadata.

Cons:

- Less flexible for rich HTML overrides.
- Might duplicate slot functionality.

### Recommendation

Use **Option A now**, then evaluate **Option B** only if slot overrides become common enough to justify a structured override API.

## Testing

- Existing slot precedence tests should remain.
- Add DDT for each override key.
- Add false-positive tests for unknown slot names.

## Acceptance Criteria

- Slot naming is centralized.
- Existing slot behaviour is preserved.
- Render tests still prove slot-over-prop precedence.

---

# Phase 8: Optional Validation Dependency Review

## Objective

Evaluate whether graph validation should remain custom or adopt a dedicated RDF validation approach.

## Recommendation

Do not add a new dependency immediately. The current system already validates graph records, relation checks, usage tags, missing relations, and deterministic graph shape through tests. 

Consider a dedicated RDF validation dependency only if:

- validation rules become too numerous for the current custom helpers;
- contributors need standard RDF constraint language support;
- diagnostics can remain as actionable as the custom errors;
- the dependency works cleanly in the project’s Node/Vite/Astro workflow.

Potential direction:

```text
Short term: custom typed validation helpers.
Medium term: structured validation error objects.
Long term: evaluate SHACL-style validation if graph rules grow.
```

Tradeoff:

- Custom validation is easier to tailor to DIBS editorial needs.
- Standard RDF validation may reduce bespoke logic, but can add conceptual and tooling complexity.

---

# Verification Plan

## Focused suites

Run existing bibliography-related tests first:

```bash
pnpm vitest run \
  src/lib/bibliography \
  src/components/ui/references \
  scripts/__tests__
```

Adjust paths to the actual test layout.

## Full unit suite

```bash
pnpm test:unit
```

## Type checking

```bash
pnpm exec tsc --noEmit
```

## Catalog generation

```bash
pnpm generate:bibliography-catalog
```

Then verify that generated files are deterministic:

```bash
git diff -- src/data/bibliography/catalog.graph.generated.jsonld
```

## Report generation

After Phase 1:

```bash
pnpm bibliography:report
```

or the current direct script command if no package script exists yet.

---

# Suggested TDD Order

## Cycle 1: Report Uses Runtime Catalog

Red:

- Add a test showing report stats match `getReferenceStats`.
- Add a test showing report most-cited books match `getMostCitedBooks`.

Green:

- Refactor `bibliography-report.mjs` to call shared catalog helpers.

Refactor:

- Split report formatting from report data computation.

## Cycle 2: Shared Normalized Reference Core

Red:

- Add equivalence tests for one reference type from catalog input and ItemList input.

Green:

- Introduce shared normalizer for that reference type.

Refactor:

- Repeat type by type: `Book`, `WebPage`, `VideoObject`, `ScholarlyArticle`, `Thesis`.

## Cycle 3: Pending Revision Policy

Red:

- Add policy tests for public, pending, and mixed tag combinations.

Green:

- Introduce `pending-revision-policy`.

Refactor:

- Replace scattered conditionals in builder, loader, query, and report code.

## Cycle 4: Provenance Diagnostics

Red:

- Add a malformed Turtle fixture that expects a source file in the validation error.

Green:

- Track source file during assembly.

Refactor:

- Add line-number support only after file-level provenance is stable.

## Cycle 5: Editorial Backlog Report

Red:

- Add fixture-driven tests for pending counts by lesson and reference type.

Green:

- Add report helpers.

Refactor:

- Add Markdown and JSON output formatting.

## Cycle 6: Slot Override API Hardening

Red:

- Add DDT for slot names and precedence.

Green:

- Add centralized slot-name helper.

Refactor:

- Remove duplicated string construction.

---

# Acceptance Criteria

- `bibliography-report.mjs` no longer manually duplicates runtime catalog graph-reading logic.
- Catalog and ItemList paths share the same final normalization core.
- `ReferencesFromJsonLd` has an explicit compatibility or support policy.
- `pending-revision` semantics are centralized and covered by BDD/DDT/PBT where appropriate.
- Build-time validation errors identify the relevant Turtle source file.
- Editorial reports expose pending-revision backlog by lesson and reference type.
- Slot override names are centralized and tested.
- No new dependency is introduced unless it clearly reduces complexity without weakening diagnostics.
- Existing render behaviour remains stable unless intentionally changed.
- Full unit tests, type checking, and catalog generation pass.

---

# Priority Recommendation

Implement in this order:

1. **Unify read-side analytics** — low risk, high consistency gain.
2. **Centralize pending-revision policy** — prevents semantic drift.
3. **Clarify `ReferencesFromJsonLd` status** — prevents accidental API permanence.
4. **Unify normalization core** — larger refactor, best long-term maintainability gain.
5. **Improve provenance diagnostics** — high value for authoring, may require careful source tracking.
6. **Expand editorial reports** — useful once report data comes from the shared catalog model.
7. **Harden slot override API** — useful, but less urgent than data correctness.
