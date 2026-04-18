# Phase 2 Plan: Extract and Centralize Fallback Normalization

## Summary

Phase 2 should extract fallback normalization into two small pure helpers and make both inline-field resolvers depend on those helpers instead of maintaining local normalization paths.

This phase should stay deliberately narrow:

* no slot-classification extraction yet
* no batching or schema-driven refactor yet
* no public union-shape changes
* no broader URL validation or parsing
* no behavior changes beyond the already-agreed blank-URL tightening

The goal is not just deduplication, but a cleaner separation between:

* slot-precedence logic
* fallback normalization policy
* final result-shape selection

## Objectives

* Remove duplicated fallback normalization logic from the resolvers.
* Make fallback text and URL normalization directly testable as pure functions.
* Preserve resolver precedence and result semantics.
* Tighten `href` handling so blank or whitespace-only URLs no longer produce `link` results.
* Keep production changes small enough that failures can be traced directly to normalization extraction rather than unrelated refactors.

## Non-goals

This phase should not:

* extract slot classification into a separate helper
* change `resolveOptionalSlot(...)`
* refactor `prepareSlotsForReferences(...)`
* introduce a shared utility module outside `reference-content.ts`
* add URL parsing, protocol checks, or security validation
* merge `ResolvedInlineField` and `ResolvedLinkedInlineField`

## Implementation Changes

### 1. Add `normalizeFallbackText(...)`

Add:

```ts
function normalizeFallbackText(text?: string): string | undefined
```

Behavior:

* return `undefined` when the input is `undefined`
* decode supported HTML whitespace entities
* normalize inline whitespace using the existing normalization path
* return `undefined` if the result is blank after normalization
* otherwise return the normalized string

This helper should become the single source of truth for prop-backed fallback text normalization in this module.

### 2. Add `normalizeHref(...)`

Add:

```ts
function normalizeHref(href?: string): string | undefined
```

Behavior:

* return `undefined` when the input is `undefined`
* trim surrounding whitespace
* return `undefined` when the trimmed result is empty
* otherwise return the trimmed result

This helper should remain intentionally narrow. It is only a blank-value filter, not a URL validator.

### 3. Refactor `resolveInlineField(...)`

Refactor `resolveInlineField(...)` to:

* preserve existing slot-first precedence
* remove any inlined fallback normalization
* delegate fallback handling to `normalizeFallbackText(...)`
* return `text` only when normalized fallback text exists
* otherwise return `missing`

This change should be mechanical and low-risk.

### 4. Refactor `resolveLinkedInlineField(...)`

Refactor `resolveLinkedInlineField(...)` to:

* preserve existing slot-first precedence
* use `normalizeFallbackText(...)` for text
* use `normalizeHref(...)` for URLs
* return `missing` when normalized fallback text is absent, even if a URL exists
* return `link` only when both normalized text and normalized href exist
* return `text` when normalized text exists but normalized href does not

This is the only intended behavior-tightening point in the phase if blank-URL rejection is not already implemented.

## TDD Sequence

## Step 1: Add direct tests for the new helpers

Before changing resolver internals, add focused unit tests for:

* `normalizeFallbackText(...)`
* `normalizeHref(...)`

This keeps the extraction honest and avoids testing helper behavior only indirectly through resolver results.

Suggested coverage:

* trims leading and trailing whitespace
* collapses repeated inline whitespace according to current normalization rules
* treats `&nbsp;`, `&#160;`, and `&#xA0;` as blank when no meaningful text remains
* preserves meaningful text content after normalization
* trims surrounding whitespace in URLs
* returns `undefined` for whitespace-only URL input

## Step 2: Keep resolver contract tests as the baseline

Retain the existing resolver-level behavior tests from Phase 1 as the main contract surface.

These tests should continue proving that:

* meaningful slot content wins over fallbacks
* blank fallback text yields `missing`
* usable fallback text without a usable URL yields `text`
* whitespace-only URLs do not yield `link`
* text plus usable URL yields `link`

This ensures the helper extraction is verified both directly and through the public behavior of the resolvers.

## Step 3: Refactor one resolver at a time

Recommended order:

1. extract and wire `normalizeFallbackText(...)`
2. refactor `resolveInlineField(...)`
3. add and wire `normalizeHref(...)`
4. refactor `resolveLinkedInlineField(...)`

This keeps the blast radius small and makes regression causes easier to isolate.

## Verification Strategy

After each change, run the focused `reference-content` unit suite.

At the end of the phase, confirm that:

* helper-level tests pass
* resolver-level contract tests still pass
* no unrelated slot or batching behavior changed

Caller-facing render tests can remain deferred unless a unit-level failure suggests the helper extraction altered effective rendering behavior.

## Tests

### Direct helper coverage

Add explicit tests for:

#### `normalizeFallbackText(...)`

* returns `undefined` for `undefined`
* returns `undefined` for blank input
* trims surrounding whitespace
* collapses repeated inline whitespace
* treats `&nbsp;`, `&#160;`, and `&#xA0;` as blank where appropriate
* preserves meaningful text after normalization

#### `normalizeHref(...)`

* returns `undefined` for `undefined`
* returns `undefined` for empty input
* returns `undefined` for whitespace-only input
* trims surrounding whitespace from usable URLs
* preserves non-empty URL strings without extra validation

### Resolver-level contract coverage

Retain or refine examples proving:

* slot content still wins over all fallbacks
* blank fallback text still yields `missing`
* text plus blank URL yields `text`
* text plus usable URL yields `link`
* blank text plus usable URL still yields `missing`

### Optional PBT

Only add these if they remain readable and the suite already uses PBT naturally here:

* fallback text normalization is idempotent
* whitespace-only strings never normalize to meaningful fallback text

Avoid adding property tests for URL handling unless they clearly improve confidence rather than duplicating example-based cases.

## Public Interfaces

Add the following internal exports only if test access requires them and the file already follows that style:

* `normalizeFallbackText(text?: string): string | undefined`
* `normalizeHref(href?: string): string | undefined`

Otherwise, prefer keeping them file-local and testing through public module exports if practical.

No change in this phase to:

* `ResolvedInlineField`
* `ResolvedLinkedInlineField`
* `resolveInlineField(...)` signature
* `resolveLinkedInlineField(...)` signature

## Acceptance Criteria

Phase 2 is complete when:

* all duplicated fallback normalization logic has been removed from the two resolvers
* fallback text normalization lives in one pure helper
* URL blank filtering lives in one pure helper
* resolver precedence remains unchanged
* blank or whitespace-only URLs no longer produce `link`
* no slot-classification or batching logic has been touched
* the suite makes it easy to distinguish helper behavior from resolver behavior

## Assumptions

* Phase 1 already expressed the intended behavior for blank-URL rejection
* `normalizeHref(...)` is intentionally narrow and should not perform full URL validation
* helper extraction remains local to `reference-content.ts` in this phase
* no additional dependency is justified for this work
