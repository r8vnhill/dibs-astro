# Refactor Plan for `LessonCatalogAdapter` Tests

## Summary

Refactor the current `LessonCatalogAdapter` test suite into two clearly separated layers:

* **integration coverage** against the real course catalog, focused on stable contracts;
* **behavior coverage** against synthetic fixtures, focused on traversal, trail construction, and edge cases.

The goal is not just to reorganize the tests, but to make the suite more trustworthy. After this refactor, failures should be easy to localize, assertions should describe exact observable behavior, and normalization coverage should rely on production behavior rather than duplicated test helpers.

This refactor may include a **small, non-breaking production cleanup** if it materially improves testability, especially around path normalization. It must not change the public behavior of `LessonCatalogAdapter`.

## Goals

By the end of this refactor, the suite should:

* localize failures cleanly by separating catalog-backed tests from fixture-backed tests;
* assert **exact outcomes**, not vague membership or minimum-length conditions;
* validate path normalization through production-facing behavior or a shared production seam;
* strengthen adjacency and trail guarantees with a balanced mix of BDD examples, DDT, and focused PBT;
* remove duplicated fixtures, duplicated normalization logic, and brittle assumptions tied to current editorial ordering.

## Non-Goals

This phase should **not**:

* redesign the adapter API;
* broaden the meaning of existing methods;
* introduce adapter-only helper APIs unless there is no cleaner production seam;
* change the observable semantics of `findByPath`, `findAdjacentByHref`, or `findTrailByHref`;
* turn the test suite into a broad rewrite of the course catalog model.

## Proposed Structure

Split the current mixed suite into two files:

### `LessonCatalogAdapter.integration.test.ts`

This file should exercise the adapter against the real `courseStructure` using `new LessonCatalogAdapter()`.

Its purpose is to verify **stable contracts** that should hold regardless of editorial rearrangements.

### `LessonCatalogAdapter.behavior.test.ts`

This file should exercise the adapter against synthetic trees using `new LessonCatalogAdapter(fixture)`.

Its purpose is to verify exact traversal and trail semantics in a controlled environment.

Do not keep real-catalog assertions and synthetic-fixture assertions in the same file.

## Scope of Each Test File

### 1. Integration tests: stable catalog-backed invariants

Keep this file narrowly focused on behavior that should remain true even if lessons are added, removed, or reordered.

It should cover:

* `flatten()` returns a non-empty ordered list of lessons;
* every flattened lesson exposes valid `id`, `title`, `slug`, and canonical `href`;
* every flattened lesson round-trips through `findByPath(lesson.href)`;
* flattened lesson `id`s are unique;
* flattened canonical `href`s are unique;
* for every flattened lesson, `findTrailByHref(lesson.href)` ends with that lesson;
* for every valid index, adjacency matches neighboring items in the flattened list;
* adjacency is symmetric across adjacent pairs.

This file should **not** rely on assumptions such as:

* a specific lesson existing at `/notes/`;
* the first flattened item representing a particular root entry;
* current editorial placement of a lesson or section.

Any such assertions should be removed or rewritten in terms of adapter contracts.

### 2. Behavior tests: exact fixture-driven semantics

This file should own all behavior that depends on controlled synthetic trees.

It should cover:

* exact ordered trail for deep nesting;
* exact ordered trail when an ancestor has `href`;
* exact ordered trail when an ancestor does **not** have `href`;
* exact one-node trail for a top-level lesson;
* empty trail for a missing lesson;
* `includeNotesRoot` behavior with exact before/after expectations;
* preorder-sensitive traversal expectations when relevant.

This file should replace the current duplicated fixture builders with:

* one compact fixture builder;
* a few named fixture factories for common shapes.

Do not keep multiple ad hoc tree builders with overlapping intent.

## Production Cleanup for Normalization

The current suite should stop duplicating normalization logic in tests.

### Preferred approach

If the production code already implies a reusable domain concept for canonical lesson paths, expose that seam and test through it. Reuse something like `LessonHref` if that is already the right abstraction.

### Acceptable fallback

If normalization should remain private, test it **only through public adapter behavior**, using equivalent-path inputs and asserting equivalent outputs.

### Hard rule

Do not keep a copied helper such as `normalizePathForTest` in the test suite.

That helper weakens the suite by recreating production behavior inside tests instead of verifying it.

## Normalization Coverage Strategy

Normalization coverage should be expressed in terms of observable equivalence, not duplicated implementation.

For a given valid lesson path, verify that the following resolve identically where supported:

* canonical path;
* same path with query string;
* same path with hash fragment;
* same path with repeated slashes;
* trimmed path.

Apply that coverage to public adapter methods where it makes sense:

* `findByPath`
* `findAdjacentByHref`
* `findTrailByHref`

Also add explicit negative coverage for inputs whose behavior is defined today:

* empty string;
* whitespace-only string;
* query-only input;
* hash-only input;
* malformed slash-heavy inputs.

If invalid input currently throws through a production abstraction such as `LessonHref.create`, assert that explicitly. Do not hide it behind permissive helpers.

## Adjacency Test Strategy

The current adjacency coverage should be simplified and strengthened.

### Curated examples with DDT

Use DDT for a small number of representative scenarios:

* first lesson;
* middle lesson;
* last lesson;
* missing target.

### One focused property suite

Add a PBT over valid indices of the real flattened list to verify:

* `previous` matches `i - 1` when `i > 0`;
* `next` matches `i + 1` when `i < last`;
* `previous` and `next` never resolve to the same lesson;
* symmetry holds across adjacent pairs.

Avoid repeated local setup and avoid non-null assertions like `middleHref!`. Use explicit helpers that fail with a clear message if test prerequisites are not satisfied.

## Trail Test Strategy

All trail assertions in the fixture-backed suite should become exact.

Replace weak assertions such as:

* “contains some node with title X”
* `length >= 2`
* “first node exists”

with exact expectations on:

* length;
* order;
* title;
* `href` vs `undefined`.

### `includeNotesRoot` contract

Define the behavior precisely:

* default behavior excludes the root node;
* opt-in behavior prepends **exactly one** root node;
* that node is exactly `{ title: "Notes", href: "/notes/" }`;
* the remaining nodes match the default trail exactly.

## Naming and Style Cleanup

Standardize the suite in English:

* `describe` blocks;
* test names;
* helper names;
* comments that remain necessary.

Use consistent BDD phrasing throughout. Prefer names like:

* `returns empty trail for missing lesson`
* `round-trips every flattened lesson through findByPath`
* `includes group without href as text node in trail`

Remove temporary labels such as `"Red phase"` from committed suite names and comments.

## Implementation Sequence

### Phase 1: Split without changing behavior

* Create the two new test files.
* Move existing tests into the appropriate file.
* Keep behavior unchanged during the move.

### Phase 2: Tighten weak assertions

* Replace partial membership checks with exact expectations.
* Rewrite weak `findTrailByHref` assertions first.
* Remove redundant scenarios that overlap without adding signal.

### Phase 3: Consolidate fixtures and helpers

* Introduce one compact fixture builder and named factories.
* Remove duplicated tree builders.
* Add small test helpers for prerequisite validation where useful.

### Phase 4: Remove duplicated normalization logic

* Delete `normalizePathForTest`.
* Add normalization coverage through public behavior or a shared production seam.
* Introduce the minimal production cleanup only if needed.

### Phase 5: Strengthen invariants

* Add uniqueness and round-trip checks in integration tests.
* Add adjacency symmetry coverage.
* Add exact root-option delta coverage for trails.

### Phase 6: Final cleanup

* Standardize naming in English.
* Remove stale comments and temporary labels.
* Ensure the suite reads as a clear specification of adapter behavior.

## Acceptance Criteria

The refactor is complete when all of the following are true:

* the suite is split into integration and behavior files;
* no test duplicates production normalization logic;
* all trail tests assert exact ordered outcomes;
* integration tests no longer depend on brittle editorial assumptions;
* adjacency is covered by both curated examples and a focused invariant check;
* fixture construction is centralized and no longer duplicated;
* no committed suite names or comments refer to temporary “red phase” status;
* the adapter public API and observable behavior remain unchanged.

## Public API Impact

Production impact should remain minimal and non-breaking.

Allowed:

* extracting or reusing a production normalization seam if one already exists conceptually;
* small internal cleanup that improves testability;
* clearer internal composition inside the adapter.

Not allowed:

* changing public return types;
* changing method names or signatures without necessity;
* introducing a new adapter-only public API unless no better domain abstraction exists.

`findTrailByHref(..., { includeNotesRoot?: boolean })` should keep its current shape and semantics.

## Verification

During implementation, verify in this order:

1. move tests into the new structure;
2. run the suite to confirm behavior is unchanged;
3. tighten assertions;
4. remove duplicated normalization helper;
5. introduce the smallest production cleanup needed, if any;
6. rerun adapter tests and directly affected catalog/path tests.

At minimum, rerun:

* `LessonCatalogAdapter` tests;
* any tests directly covering `LessonHref`;
* any tests for services that depend on lesson path resolution or lesson sequencing.

## Rationale

This plan keeps the refactor deliberately narrow while materially improving signal quality.

The key improvement is not merely cleaner organization. It is that the suite will stop passing on weak evidence. Integration tests will verify durable catalog contracts, behavior tests will lock traversal semantics precisely, and normalization will be tested through real production behavior instead of a copied helper. That gives stronger protection with less duplication and much clearer failures.
