# Plan: Refactor `LessonCatalogAdapter.behavior.test.ts` Around Trail Invariants

## Summary

Refactor `LessonCatalogAdapter.behavior.test.ts` so it expresses `findTrailByHref(...)` primarily through behavioural invariants, compact scenario tables, and a small number of high-value contract tests instead of many hand-written example variants. Keep the suite test-only unless the stronger tests reveal a genuine inconsistency in `LessonCatalogAdapter.ts`. 

The main goal is not just less duplication, but a clearer test architecture:

* traversal scenarios should read as traversal scenarios;
* normalization should be tested as an equivalence contract;
* invalid input should be isolated from traversal;
* trail invariants should be asserted explicitly rather than emerging only from exact examples.

## Scope

This refactor covers only:

* `src/infrastructure/adapters/__tests__/LessonCatalogAdapter.behavior.test.ts`
* local fixture builders and helpers inside that suite, or small adjacent test-only helpers if extraction becomes worthwhile

## Non-goals

This refactor should **not**:

* change `LessonCatalogAdapter.ts` unless a refactored test demonstrates a real bug;
* redesign the adapter API;
* move broad fixture infrastructure into shared utilities unless reuse is already clear;
* replace every exact example with DDT or PBT;
* make the suite more abstract at the expense of readability.

A few explicit examples should remain where they communicate the contract better than a table.

## Desired Outcomes

By the end of this refactor, the suite should:

* read in behaviour-first blocks;
* avoid repeated inline expected arrays where the contract is identical;
* isolate normalization logic from traversal logic;
* make clickable vs non-clickable breadcrumb semantics explicit;
* use DDT where examples differ only in inputs and expected trail;
* use PBT narrowly for href-normalization equivalence, not as a replacement for all examples.

## Key Changes

### 1. Reorganize the suite by behaviour seam

Restructure the suite into a small set of top-level describe blocks:

* `findTrailByHref > traversal`
* `findTrailByHref > root inclusion`
* `findTrailByHref > href normalization`
* `findTrailByHref > invalid input`
* `findTrailByHref > returned trail invariants`

This organization should make it obvious whether a failing test is about lookup, options, normalization, validation, or output contract.

### 2. Convert repeated example shapes into DDT

Collapse repeated exact-trail assertions into one or two scenario tables where the arrange/act/assert pattern is the same.

Good candidates:

* grouped ancestor with and without `href`
* top-level lesson resolves to only the current lesson
* missing lesson resolves to `[]`
* include/exclude Notes root

Recommended table columns:

* case name
* fixture factory
* href
* options
* expected trail

Keep full `toEqual(...)` assertions for these cases so the suite still locks down complete output, not just fragments.

### 3. Extract named expected trails

Move repeated expected breadcrumb arrays into named constants.

Use `satisfies readonly { title: string; href?: string }[]` to keep them precise without adding noisy type annotations.

Examples worth extracting:

* deep nested trail
* deep nested trail with root included
* grouped-section trail with linked ancestor
* grouped-section trail with non-linked ancestor
* top-level lesson trail

This improves scan-ability and reduces noise inside individual tests.

### 4. Narrow and clarify fixture helpers

Replace the current generic `lessonNode(...)` builder with two focused builders:

* `linkLesson(...)`
* `groupLesson(...)`

Design them so invalid or misleading shapes are harder to express:

* `linkLesson(...)` should not accept children
* `groupLesson(...)` should always own its children explicitly

Also replace trivial adapter wrapper helpers with a single:

* `adapterForLessons(lessons)`

Keep named fixture factories, because they communicate intent better than raw arrays:

* grouped sections
* deep nesting
* top-level lesson
* root-specific fixture only if one is genuinely needed

This keeps helpers purposeful rather than generic for their own sake.

### 5. Add explicit trail-contract tests

In addition to exact scenario outputs, add a small set of tests that assert cross-cutting invariants:

* the returned trail is ordered ancestor-to-current;
* the last element is always the resolved lesson;
* authored ancestors with `href` remain clickable;
* grouping ancestors without authored `href` remain non-clickable;
* missing lessons return `[]`;
* blank input throws before traversal begins.

Also add one explicit “deepest exact match wins” test to ensure a nested lesson is not confused with an ancestor or prefix-like path.

These tests should focus on the contract, not on one specific fixture’s exact array shape.

### 6. Add narrow PBT for href-normalization equivalence

Add `fast-check` tests to verify the normalization invariant:

> a canonical href and any semantically equivalent noisy variant resolve to the same trail.

Use a deliberately narrow arbitrary that composes only equivalent transformations such as:

* surrounding whitespace
* query string
* fragment
* repeated slash inflation where normalization is already expected to treat it as equivalent

Do not generate arbitrary malformed paths or values that change semantic identity. The property should strengthen confidence, not introduce ambiguity about what is supposed to normalize.

Run the property against at least:

* one nested canonical href
* one top-level canonical href

That ensures both ancestry shapes are exercised.

### 7. Keep curated examples where they add clarity

Do not delete every current normalization example automatically. If one or two curated examples make the contract easier to understand than the property test alone, keep them.

The suite should use:

* DDT to compress duplication;
* PBT to check invariants broadly;
* explicit examples to document important behaviour.

## Recommended Refactor Order

### Phase 1: Restructure without changing assertions

* Reorganize the suite into the new describe-block layout.
* Extract named expected trails.
* Keep assertions otherwise unchanged.

This gives a cleaner baseline before any helper or DDT refactor.

### Phase 2: Introduce DDT for repeated exact examples

* Convert repeated traversal, missing-result, and root-option cases into tables.
* Keep full `toEqual(...)` assertions.
* Leave unique or especially readable examples as standalone tests.

This should reduce duplication without changing the suite’s coverage profile.

### Phase 3: Refactor fixture helpers

* Replace `lessonNode(...)` with `linkLesson(...)` and `groupLesson(...)`.
* Replace trivial adapter wrappers with `adapterForLessons(...)`.
* Keep fixture factories named by scenario.

Do this only after the table structure is stable, so helper changes are easier to validate.

### Phase 4: Add contract-level invariant tests

* Add ordering, last-node identity, clickable/non-clickable ancestor behaviour, and deepest-match tests.
* Keep these tests focused and short.

This is the point where the suite becomes more invariant-driven rather than merely example-driven.

### Phase 5: Add PBT for normalization

* Introduce a narrow noisy-href arbitrary.
* Assert trail equivalence between canonical and noisy variants.
* Keep or trim curated normalization examples based on readability after the property is in place.

Adding PBT last keeps earlier refactors easier to debug.

## Test Strategy

### Exact-output tests

Use exact-output assertions for:

* traversal scenarios
* root inclusion/exclusion
* top-level result
* missing result

These tests should continue to prove the exact breadcrumb arrays returned by the adapter.

### Invariant tests

Use focused assertions for:

* ordering
* final-node identity
* clickable vs non-clickable ancestors
* deepest exact match
* blank-input failure

These tests should express the behavioural contract directly.

### Property-based tests

Use `fast-check` only for normalization equivalence.

Keep the generators:

* narrow
* deterministic enough to debug
* small enough that the test remains readable

If needed, configure the property conservatively to avoid flakiness or excessive runtime.

## Validation Plan

Run, in order:

1. `pnpm vitest run src/infrastructure/adapters/__tests__/LessonCatalogAdapter.behavior.test.ts`
2. `pnpm vitest run src/infrastructure/adapters/__tests__/LessonCatalogAdapter.integration.test.ts` if helper changes affect shared assumptions or fixture interpretation
3. broader adapter-related tests only if the refactor ends up touching shared test helpers outside this file

## Acceptance Criteria

This refactor is complete when all of the following are true:

* the suite is organized by behaviour seam rather than by fixture shape alone;
* repeated exact-array cases have been consolidated where appropriate through DDT;
* repeated expected trails have been extracted into named constants;
* fixture helpers make invalid shapes harder to express;
* trail invariants are asserted explicitly;
* href normalization is covered by at least one narrow property-based equivalence test;
* the suite remains readable and does not become more abstract than the behaviour warrants;
* no production code changes are made unless stronger tests expose a real defect. 
