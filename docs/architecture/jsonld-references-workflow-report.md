# JSON-LD References Workflow Implementation Report

This report describes the current JSON-LD references implementation as a starting point for a later improvement plan.
It focuses on the data workflow, rendering workflow, protected contracts, and areas that deserve design review.

## Current Workflow

The project has two related reference workflows:

- **Current graph-backed workflow**: Turtle source fragments under `src/data/bibliography/sources/` are assembled and transformed into `src/data/bibliography/catalog.graph.generated.jsonld`.
- **Legacy ItemList workflow**: `ReferencesFromJsonLd.astro` still accepts direct Schema.org-style `ItemList` JSON-LD and renders explicitly selected reference IDs.

The graph-backed workflow is the preferred path for normal lesson references:

1. Editors update numbered Turtle fragments:
   - `00-prefixes.ttl`
   - `01-persons.ttl`
   - `02-organizations.ttl`
   - `03-works.ttl`
   - `04-references.ttl`
   - `05-usages.ttl`
2. `pnpm generate:bibliography-catalog` runs `scripts/build-bibliography-catalog.mjs`.
3. The script assembles Turtle into `catalog.graph.generated.ttl`.
4. `buildCatalogArtifactFromTurtle` parses Turtle with `n3`, validates graph records, and emits deterministic JSON-LD.
5. `src/data/bibliography/catalog.ts` imports the generated JSON-LD as raw text, parses it, and loads it with `loadBibliographyCatalog`.
6. `LessonReferencesFromCatalog` and `ReferencesFromCatalog` query lesson-specific reference groups and render them through `ReferenceEntry`.

The legacy `ReferencesFromJsonLd` path bypasses the generated graph and uses:

- `parseBibliography` for ItemList normalization;
- `resolveReferenceGroups` for explicit recommended/additional ID lists;
- `extractFallbackTitles` for title fallback from raw JSON-LD;
- the same `ReferenceEntry` rendering pipeline as the catalog path.

## Current Catalog Snapshot

The generated graph currently contains:

- 382 total graph nodes.
- 53 `Person` nodes.
- 46 `Organization` nodes and 1 `CollegeOrUniversity` node.
- 21 `CreativeWork` parent-work nodes.
- 117 rendered reference nodes:
  - 76 `WebPage`
  - 26 `Book`
  - 8 `ScholarlyArticle`
  - 6 `VideoObject`
  - 1 `Thesis`
- 14 `LearningResource` lesson nodes.
- 130 `dibs:ReferenceUsage` nodes.

Usage tags currently break down as:

- 14 `recommended`
- 14 `additional`
- 102 `pending-revision`

The high number of `pending-revision` usages means the public rendering path is intentionally exposing only a small
subset of the available bibliography graph.

## Implementation Structure

The implementation is split into three main layers.

### Source and Build Layer

- `scripts/lib/assemble-bibliography-ttl.mjs` concatenates numbered Turtle files, keeping shared prefixes from `00-prefixes.ttl`.
- `scripts/lib/bibliography/catalog-builder.mjs` orchestrates Turtle parsing, record collection, pending-revision state, node building, and JSON-LD artifact creation.
- `scripts/lib/bibliography/reader/*` owns record access, scalar extraction, compact IDs, and validation helpers.
- `scripts/lib/bibliography/graph/*` owns node builders, relation checks, deterministic sorting, usage edges, and pending-revision pruning.

### Runtime Catalog Layer

- `src/lib/bibliography/catalog.ts` loads the generated graph into normalized maps:
  - references by ID;
  - lessons by ID;
  - usages by lesson;
  - usages by reference.
- `getReferencesForLesson` applies tag filters and groups entries into `recommended`, `additional`, and `pendingRevision`.
- `getReferenceStats` and `getMostCitedBooks` provide reusable catalog-level analytics.

### Rendering Layer

- `LessonReferencesFromCatalog` is the preferred lesson-page wrapper.
- `ReferencesFromCatalog` accepts a catalog source and optional lesson/tag filters.
- `ReferencesFromJsonLd` supports the older direct ItemList path.
- `ReferenceEntry` dispatches normalized references to the leaf renderers: `Book`, `WebPage`, `Video`, `ScholarlyArticle`, and `Thesis`.
- Slot overrides are prepared by `prepareSlotsForReferences` and keyed by reference ID:
  - `title-{referenceId}`
  - `description-{referenceId}`
  - `publication-{referenceId}`
  - `institution-{referenceId}`

## Protected Behavior

The current tests cover important parts of the workflow:

- Builder happy path and deterministic graph shape.
- Usage tag validation and missing relation checks.
- Pending-revision pruning for malformed draft references.
- JSON-LD ItemList normalization for the supported reference types.
- Characterization coverage comparing equivalent catalog and ItemList normalization output before the shared-normalizer refactor.
- Catalog loading, lesson lookup, tag filtering, and citation stats.
- Initial shared `Book` normalization coverage for the catalog-backed and ItemList-backed paths.
- Render coverage for both `ReferencesFromJsonLd` and `ReferencesFromCatalog`.
- Real generated-catalog smoke coverage for the Nushell pipelines lesson.

This gives the implementation a solid behavioral baseline across generation, loading, grouping, and rendering.

## Strengths

- The preferred editorial source is now Turtle, which separates people, organizations, works, references, and lesson usages cleanly.
- The generated JSON-LD artifact is deterministic and committed, which helps review generated changes.
- The runtime catalog path has a normalized in-memory model instead of making UI components inspect raw JSON-LD directly.
- `pending-revision` lets the project keep draft bibliography data in the graph without rendering it by default.
- Both legacy JSON-LD and current catalog paths share the final `NormalizedReference` rendering model.
- The leaf reference components remain simple because type-specific normalization happens before rendering.

## Improvement Findings

1. **Two JSON-LD shapes remain active.**
   The legacy `ItemList` path and the graph-backed catalog path both normalize bibliography data, but they do so in separate modules with overlapping logic for reference types, authors, publishers, URLs, pages, and fallback fields.

2. **The report script now shares read-side catalog analytics.**
   `scripts/bibliography-report.mjs` delegates report construction to `scripts/lib/bibliography-report-read-model.mjs`, which loads the same normalized catalog core used by site rendering and reuses shared reference and book citation helpers.

3. **Pending-revision policy exists in multiple places.**
   The builder prunes some pending-only malformed nodes, the catalog loader tolerates some pending-only malformed nodes, and runtime queries hide pending entries by default. These choices are coherent, but the policy is distributed.

4. **Slot override behavior is powerful but implicit.**
   Lesson pages can override title, description, publication, and institution by ID-based slots. This is flexible, but discoverability depends on documentation and examples rather than a typed interface.

5. **The generated graph carries limited provenance.**
   Runtime nodes know `sourceLabel`, but generated nodes do not expose which Turtle file or source line produced them. This makes authoring diagnostics less actionable when a large graph has malformed data.

6. **The catalog has many draft usages.**
   `pending-revision` dominates the current graph. That is useful during migration, but it can hide editorial debt unless reports track draft-to-published progress explicitly.

7. **The legacy path has no clear retirement boundary.**
   `ReferencesFromJsonLd` is still tested and functional, but current documentation says normal graph-backed pages should prefer the catalog. The codebase does not yet state whether this path is a supported long-term API or a migration bridge.

## Improvement Questions

- Should `ReferencesFromJsonLd` remain a supported public component, or should it be treated as a compatibility bridge for older lesson pages?
- Should the report script use the same runtime catalog loader as the site?
- Should pending-revision policy be documented as one explicit contract across build, load, query, and render phases?
- Should the generated JSON-LD include source provenance for better diagnostics?
- Should the slot override API be documented near the component exports, or moved into a more typed/content-driven structure?
- Should the project add a regular report that tracks pending-revision counts by lesson, tag, and reference type?

## Suggested Planning Areas

A future improvement plan should probably be split into small phases:

1. **Unify read-side analytics**: completed. `bibliography-report.mjs` now reuses the normalized catalog core and shared query helpers through a script-side read model.
2. **Clarify compatibility policy**: decide the long-term status of `ReferencesFromJsonLd` and document it.
3. **Centralize pending-revision semantics**: document and test the policy across builder, loader, and query boundaries.
4. **Improve diagnostics**: add source provenance or richer validation messages for Turtle-authored nodes.
5. **Improve editorial visibility**: extend reports to show pending-revision backlog by lesson and reference type.
6. **Document slot overrides**: make override names, precedence, and intended use easier for lesson authors to find.

## Verification Notes

This report was updated after Phase 1 of the improvement plan. The report command now computes analytics from the shared
catalog model, so supported rendered reference types such as `VideoObject` are included when they are visible under the
runtime tag filters.
