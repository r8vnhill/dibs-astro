# Monthly Report — April 2026

## Overview

April 2026 was a high-output month focused on four main threads: (1) hardening the application/domain architecture boundary through a series of targeted refactor cycles, (2) centralizing bibliography and reference normalization, (3) building a custom layer-boundary checker toolchain, and (4) scoping new course content for the `api-design` block. Work was tracked across 47 traceability log entries across 12 active days (Apr 18–30, excluding Apr 24).

---

## 1. Application/Domain Architecture Hardening (Apr 18–22)

### Cycle 3 — Remove Application Dependence on Adapter-Shaped Lesson Data (Apr 18)

Kick-off of a focused refactor to stop the Application layer from depending on infrastructure-shaped lesson data. The cycle introduced a domain-first `LessonNavigationRepository` contract exposing `findAdjacentTo(href)`, removed adapter methods (`flatten()`, `findAdjacentByHref(string)`, raw `slug` handling) from the application port, and confined `NavigationServiceImpl` to input conversion and result orchestration. This cycle was deliberately narrow and excluded breadcrumb or trail redesign.

Companion plans on the same day locked the scope into two phases:
- **Phase 1:** Specify and test existing behavior before touching production code.
- **Phase 2:** Extract and centralize fallback normalization, scoping it to the lesson-catalog boundary.

### Cycle 4 — Extract Reference Content Classification into a Domain Module (Apr 19)

Closed on Apr 19 after moving pure reference-content decision rules (content meaningfulness, whitespace normalization, slot-over-fallback precedence, linked vs plain-text fallbacks) from `src/components/ui/references/reference-content.ts` into a new `src/domain/reference-content.ts`. The Astro-facing adapter was narrowed to slot I/O and batching. The existing `MissingReferenceTitleError` failure mode was preserved. Validated across domain, component, and render-contract test suites plus a clean `tsc --noEmit`.

### Cycle 5 — Extract Lesson Metadata Rules into a Pure Domain Module (Apr 19)

Planned extraction of lesson metadata decision logic into an isolated domain module, removing its dependency on infrastructure helpers and keeping it pure and dependency-free.

### Cycle 6 — Introduce Lesson-Metadata Repository Boundaries and Explicit Composition (Apr 19)

Defined repository contracts and explicit composition seams for lesson metadata, replacing the implicit coupling that crossed layer boundaries.

### Phase 4 & 5 — Reference Slot Resolution Refactor (Apr 19)

- **Phase 4:** Refactored batched reference preparation into a schema-driven flow.
- **Phase 5:** Parallelized per-reference slot resolution while preserving literal ID types.

### `LessonCatalogAdapter` Test Refactor Around Trail Invariants (Apr 19)

Plan and closeout for restructuring `LessonCatalogAdapter.behavior.test.ts` so its assertions are organized around trail invariants, replacing fragile structural tests with behavior-level contracts.

### Phases 1–3 — `Thesis.render.test.ts` Hardening (Apr 20)

Three sequential phases to stabilize the Thesis render test suite:
- **Phase 1:** Made `Thesis.render.test.ts` concurrency-safe by removing shared mutable state.
- **Phase 2:** Converted assertions to structural SSR assertions against rendered markup.
- **Phase 3:** Completed render-contract coverage for all `Thesis` output variants.

### Phase 2 — Domain Isolation Across Navigation, References, and Metadata (Apr 20)

A comprehensive plan to isolate domain logic across three concerns — navigation, references, and metadata — using short TDD cycles. Each concern was scoped to its own domain module, with presentation adapters serving as the only integration point.

### Cycles 7 & 8 — Legacy Surface Retirement and Integration Lock-In (Apr 20)

- **Cycle 7:** Retired or narrowed legacy helper surfaces that had accumulated over earlier refactor cycles.
- **Cycle 8 (Integration Lock-In):** Proved that the new boundaries hold under real presentation flows. Strengthened `NotesLayout.render.test.ts`, `navigation-bridge.test.ts`, `lesson-metadata-bridge.test.ts`, and the reference render suites. Brought architecture documentation up to date to describe the effective boundaries.

### Phase 4 — Shared Reference Render-Contract Helpers (Apr 21)

Extracted shared helpers for reference render-contract tests, reducing duplication across `ScholarlyArticle`, `Thesis`, `WebPage`, `Video`, and `GenericReference` suites.

### Bibliography Catalog Builder Refactor (Apr 21)

Refactored `bibliography-catalog-builder.graph.mjs` around explicit builder contracts, replacing ad hoc construction calls with a defined builder API.

### Phase 5 — Data-Driven Reference Render Tests (Apr 22)

Applied data-driven testing selectively in reference render suites. Added a shared contracts layer that the render tests pull from, reducing per-component boilerplate while keeping assertions precise.

### `ListItem` Refactor into a Pure Reusable Primitive (Apr 22)

Refactored the `ListItem` component into a stateless, reusable UI primitive with no side effects and no coupling to bibliography-specific concerns.

---

## 2. Bibliography Normalization Centralization (Apr 23, Apr 29–30)

### Record Reader Facade for Bibliography Normalization (Apr 23)

Introduced a cohesive record-reader facade so bibliography builders depend on a unified reader API instead of a flat collection of low-level accessor functions. The plan was executed in four phases:
- **Phase 1:** Locked the reader boundary contract with BDD/DDT tests before any structural change.
- **Phase 2:** Unified internal reader primitives without changing observable behavior.
- **Phase 3:** Piloted the builder-facing facade on one builder.
- **Phase 4:** Migrated all callers to the new facade and removed the compatibility layer.

Bibliography builder modules were also reorganized during this work to align file responsibilities with the new reader/builder boundary.

### Shared Normalizers for Remaining Reference Types (Apr 30)

Added shared normalizers for `VideoObject`, `ScholarlyArticle`, and `Thesis` without migrating callers in this step. Each normalizer follows the same source-independent input contract established in Cycle 2 (Book, Apr 29).

### Cycle 6 — Centralize `ItemList` Reference Construction (Apr 30)

Delegated final render-facing `ItemList` reference construction to the shared normalizer, so the legacy ItemList workflow produces `NormalizedReference` through the same core as the catalog workflow.

### Cycle 7 — Catalog Caller Normalization Refactor (Apr 30)

Moved catalog graph resolution to delegate final reference construction to the shared normalizer, completing the migration of the catalog workflow.

### Phase 2 — Centralize Reference Normalization (Apr 30)

Comprehensive plan to unify both supported workflows (catalog graph and legacy ItemList) through a single normalization core. The shared normalizer became responsible for constructing all render-facing reference objects. Source-specific modules remain responsible only for extracting raw data from their input formats. Goals included eliminating duplicated logic for blank string handling, title/headline precedence, author normalization, publisher derivation, page metadata, and URL hostname fallback.

---

## 3. Layer Boundary Checker Toolchain (Apr 25–26, Apr 29)

### Cycle 1 — Boundary Checker Foundation (Apr 25, completed)

Built the first executable vertical slice of a custom architecture boundary checker for `astro-website` using dedicated dev dependencies:

| Dependency | Role |
|---|---|
| `es-module-lexer` | ESM import/export extraction |
| `globby` | Source file discovery |
| `picomatch` | Glob-based rule matching |
| `get-tsconfig` | TypeScript alias loading |

Delivered: file discovery, import extraction for `.ts`, `.tsx`, and `.astro`, alias resolution, glob-based rule matching, actionable finding format, standalone CLI (`check-layer-boundaries.mjs`), and focused Vitest coverage. The checker was intentionally not wired into `pnpm check` at this stage.

Four implementation steps were executed sequentially:
- **Step 1:** Lock existing behavior with a baseline test command before changes.
- **Step 2 (done):** Add pure classification helpers without altering checker behavior.
- **Step 3:** Introduce classification-based rule groups.
- **Step 4:** Make rule evaluation classification-driven end-to-end.

### Cycle 2 — Data-Driven Layer Rules (Apr 26)

Extended Cycle 1 into a declarative architecture rule matrix, encoding the full layer rule set as structured data rather than imperative conditions.

### Strengthen Layer Boundary Checker Tests (Apr 29, completed)

Replaced count-only assertions in `layer-boundary-checker.test.ts` with behavior-level expectations. Introduced a structured `BoundaryCase` DDT type with `expectedFindings` arrays, so each case asserts both the number and the content of boundary findings. Added real-world import edge cases for TypeScript and Astro files. Production behavior was unchanged.

### Phase 1 — Unify Read-Side Analytics (Apr 29)

Planned alignment of the report analytics pass with runtime catalog semantics, ensuring the read-side analytics surface uses the same normalized data as the presentation layer.

---

## 4. `Thesis.astro` Component Hardening (Apr 26)

A dedicated plan to harden `Thesis.astro` after the domain extraction cycles. Key changes: extract pure resolver logic, add required `href` validation, validate linked inline fields. The plan kept existing render contracts stable and treated the hardening as a contract tightening rather than a redesign.

---

## 5. Lesson Metadata TDD Refactor (Apr 28, completed)

Refactored `src/domain/lesson-metadata.ts` with three behavioral changes, each locked by regression tests before the implementation:

1. **Strict ISO-short date parsing:** `parseIsoShortDate` now rejects invalid calendar dates (e.g., `2024-02-31`, `2023-02-29`) by round-tripping against `getUTC*` accessors after `Date.UTC(...)` construction.
2. **UTC-stable date formatting:** `formatDate` no longer allows caller-provided partial options to accidentally drop the UTC default.
3. **URL-aware pathname normalization:** Metadata lookup keys are resolved to canonical lesson routes, not full URLs.

`src/utils/lesson-metadata.ts` was kept as a compatibility wrapper over the new domain helpers.

---

## 6. Course Content — API Design Series Expansion (Apr 27)

Decided to restructure the `api-design` lesson block from two lessons to three:

| # | Slug | Focus |
|---|---|---|
| 1 | `fundamentals` | Design the API from the domain |
| 2 | `evolution` | Evolve the API without breaking compatibility |
| 3 | `documentation` | Document the API as part of the product |

The documentation topic was separated from `evolution` because it deserves treatment as a first-class part of the public API contract. Three documents were produced:

- **Editorial adjustment plan** for restructuring the existing evolution lesson.
- **Lesson 3 plan** scoping the new documentation lesson: audience types, documentation principles, changelog/release note guidance, and integration with `Write the Docs` sources.
- **Series plan** covering course structure updates, `coursePaths` additions, and prev/next navigation wiring.

---

## 7. Introductory Summary Lesson for Unit 1 (Apr 20)

A plan was opened to add an introductory summary lesson at the start of Unit 1 to provide orientation before the first substantive lesson. Scope and structural placement were defined.

---

## Summary Table

| Theme | Days active | Key outcomes |
|---|---|---|
| Application/Domain separation | Apr 18–22 | Cycles 3–8 closed; `NavigationServiceImpl`, reference-content, lesson-metadata, and layout tests all hardened |
| Bibliography normalization | Apr 23, 29–30 | Record reader facade, shared normalizers for all 5 reference types, unified normalization core |
| Layer boundary checker | Apr 25–26, 29 | Functional CLI checker with dependency-backed foundation, declarative rule matrix, and behavior-level tests |
| `Thesis.astro` hardening | Apr 20, 26 | Render tests made concurrency-safe; contract coverage completed; resolver extraction planned |
| Lesson metadata | Apr 28 | Strict date parsing, UTC-stable formatting, URL-aware normalization — all locked by TDD |
| Course content | Apr 20, 27 | Unit 1 intro lesson planned; `api-design` expanded to a 3-lesson series |
