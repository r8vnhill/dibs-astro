# Cycle 6: Introduce Lesson-Metadata Repository Boundaries and Explicit Composition

## Summary

Cycle 6 should complete the architectural seam that Cycles 1 to 5 prepared by giving lesson metadata the same domain-first repository boundary already used for navigation. After this cycle, presentation should no longer depend directly on `~/utils/lesson-metadata`; instead, it should depend on a small presentation bridge backed by an application service and a domain repository contract.

The chosen direction remains explicit manual composition, local to presentation entry points. The goal is not to redesign metadata behavior, but to relocate ownership so lookup, validation, caching, and dataset access live behind an infrastructure adapter, while presentation depends only on stable application-facing results.

## Goals

* Introduce a domain-owned repository boundary for lesson metadata.
* Remove direct presentation imports of `~/utils/lesson-metadata`.
* Keep normalization and canonical lesson identity outside raw presentation callers.
* Preserve current `NotesLayout` behavior and rendered output.
* Keep dependency injection manual, local, and explicit.

## Non-Goals

* Do not redesign lesson metadata semantics in this cycle.
* Do not change public props for `NotesLayout.astro` or `LessonMetaPanel.astro`.
* Do not reopen date-formatting policy unless the new seam forces a minimal DTO clarification.
* Do not introduce a DI container or broader service locator pattern.
* Do not fully delete legacy helpers if thin compatibility wrappers are still needed temporarily.

## Target Architecture

Cycle 6 should establish this dependency direction:

* **presentation** depends on a presentation bridge
* **presentation bridge** composes an application service plus infrastructure adapter
* **application service** depends on a domain repository contract
* **infrastructure adapter** implements that repository contract
* **infrastructure** owns generated JSON access, parsing, validation, caching, and lookup details

That gives lesson metadata the same shape already established for navigation, while keeping the seam narrow and understandable.

## Key Changes

### 1. Add a domain repository contract for lesson metadata

Add a new repository interface under `$domain/repositories`, exported from the public domain barrel.

Recommended responsibility:

* resolve lesson metadata by canonical lesson identity
* return a domain-safe metadata record or `undefined`

Recommended input:

* accept `LessonHref`, not raw `string`, so normalization remains outside repository callers

Recommended output:

* use a compact domain-owned result type that reflects metadata facts, not UI concerns

This keeps the repository boundary aligned with the existing navigation pattern and avoids leaking dataset shape into higher layers.

### 2. Add an application service for lesson metadata

Introduce a small application service parallel to `INavigationService`.

Recommended responsibility:

* accept raw pathname from presentation
* convert to `LessonHref`
* delegate to `LessonMetadataRepository`
* map the domain result to a UI-safe DTO tailored to current layout needs

Recommended DTO scope for this cycle:

* `authors`
* `changes`
* optional `lastModified`

Keep this DTO deliberately minimal. It should model what `NotesLayout` needs today, not become a second general metadata model.

### 3. Move metadata mechanics behind infrastructure

Shift all infrastructure concerns behind the adapter boundary:

* generated JSON access
* zod validation
* normalization needed for dataset lookup
* caching
* path-based lookup in the generated dataset

`src/utils/lesson-metadata.ts` should become infrastructure-owned support code, or be split so the adapter is the only production caller of the relevant pieces.

After this cycle:

* presentation must not import it
* application must not import it
* only infrastructure may depend on it directly

### 4. Add a presentation composition root for metadata

Add a local presentation bridge, similar in spirit to the current navigation bridge.

Recommended responsibility:

* instantiate the infrastructure adapter
* instantiate the application service
* expose one small function that presentation can call
* return only serializable values suitable for `NotesLayout`

`NotesLayout.astro` should call this bridge instead of constructing metadata dependencies inline or reading utility modules directly.

### 5. Preserve current formatting ownership

Keep date formatting where it currently belongs after Cycle 5.

That means:

* do not move formatting logic into infrastructure
* do not expand the new service into a formatting service
* let UI components continue consuming already-appropriate values, or continue applying domain formatting helpers where that was already the intended policy

Cycle 6 should only move lookup ownership, not presentation policy.

## Implementation Sequence

### 1. Lock current boundary behavior first

Before introducing the seam, add tests that freeze current metadata behavior at the service and bridge boundary.

This should include:

* application-facing expectations for metadata resolution
* presentation-facing expectations for what `NotesLayout` receives

That ensures the refactor is judged by observable boundary behavior, not by internal equivalence.

### 2. Introduce domain types and repository contract

Add:

* `LessonMetadataRepository`
* a compact repository result type, if an existing stable domain type is not already suitable
* public barrel exports

Prefer a small domain type over reusing a larger utility-facing structure if reuse would drag infrastructure concerns upward.

### 3. Implement the application service

Mirror the existing navigation service pattern:

* pathname in
* `LessonHref.create(...)`
* repository delegation
* DTO mapping out

Important boundary rule:

* invalid or non-canonical input handling should be resolved here, not inside presentation and not inside the repository implementation

### 4. Implement the infrastructure adapter

Wrap the current dataset access and lookup flow in one adapter that implements `LessonMetadataRepository`.

Keep inside the adapter:

* zod parsing
* cache ownership
* generated-file lookup
* path normalization required by the dataset contract

Do not let the application service learn about any of those details.

### 5. Add the presentation bridge

Create one local composition root for metadata resolution.

It should:

* wire infrastructure to application
* expose a single bridge function
* return the exact minimal shape expected by `NotesLayout`

No framework-level DI changes are needed.

### 6. Migrate callers

Update `NotesLayout.astro` to depend on the new metadata bridge.

`LessonMetaPanel.astro` should remain unchanged unless a tiny adaptation is needed to consume the same values through the new path.

The migration should preserve current render behavior.

### 7. Trim legacy exports only when safe

If `src/utils/lesson-metadata.ts` still has non-test callers after the migration, keep compatibility wrappers thin and clearly transitional.

Do not let Cycle 6 expand into aggressive cleanup. Full shrinking or deletion belongs to Cycle 7.

## Public Interfaces

Add:

* `LessonMetadataRepository` under `$domain/repositories`
* a domain metadata result type if needed
* an application interface such as `ILessonMetadataService`
* an application DTO for layout-safe metadata
* an application implementation parallel to `NavigationServiceImpl`
* a presentation bridge for lesson metadata

Do not change:

* `NotesLayout.astro` public props
* `LessonMetaPanel.astro` public props
* `LessonNavigationRepository` behavior, aside from possible barrel cleanup

## Design Rules

The cycle should follow these rules throughout:

* raw pathnames belong only at the presentation-to-application boundary
* canonical lesson identity belongs in application and domain flows
* dataset structure belongs only to infrastructure
* formatting policy does not move in this cycle
* DTOs should be consumer-shaped and deliberately narrow
* repository results should be domain-shaped and infrastructure-agnostic

These rules reduce the risk of the new seam becoming porous.

## Test Plan

### Application tests

Verify that the metadata service:

* converts raw pathname to canonical `LessonHref` before lookup
* returns `undefined` or an empty-safe result when metadata is missing
* maps repository output to the exact DTO shape needed by presentation
* does not expose infrastructure-specific details

### Infrastructure adapter tests

Verify that the adapter:

* resolves known metadata entries from the generated dataset
* preserves current validation behavior
* preserves current caching behavior
* returns `undefined` for unknown normalized paths
* keeps dataset parsing and lookup concerns internal

### Presentation bridge tests

Verify that the bridge:

* composes the adapter and service correctly
* returns the same shape currently expected by `NotesLayout`
* does not require presentation callers to know about repositories or infrastructure

### Regression checks

Verify that:

* existing navigation tests still pass unchanged
* lesson metadata rendering remains unchanged from the caller perspective
* presentation no longer imports `~/utils/lesson-metadata` directly

## Acceptance Criteria

Cycle 6 is complete when all of the following are true:

* presentation no longer imports `~/utils/lesson-metadata` directly
* lesson metadata lookup flows through a domain repository contract
* dataset access, validation, and caching are owned by infrastructure
* `NotesLayout` behavior remains unchanged
* composition remains explicit and local
* any temporary compatibility wrapper is thin and clearly transitional

## Assumptions

* `LessonNavigationRepository` remains unchanged and serves as the reference pattern.
* Manual DI remains explicit and local.
* `src/utils/lesson-metadata.ts` may temporarily survive as infrastructure support or compatibility glue.
* Full legacy cleanup is deferred to Cycle 7.
