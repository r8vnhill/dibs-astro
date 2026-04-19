# Refactor `reference-content.ts` with Small, Verifiable TDD Steps

## Closure Note

Closed on 2026-04-19 after Phase 5 completed and the caller-facing validation plan passed on the current branch state.

Validation used:

* `src/components/ui/references/__tests__/reference-content.test.ts`
* `src/components/ui/references/__tests__/ScholarlyArticle.render.test.ts`
* `src/components/ui/references/__tests__/Thesis.render.test.ts`
* `src/components/ui/references/__tests__/GenericReference.render.test.ts`

Phases 1-5 are complete. The refactor closed without caller-visible regressions in render output, metadata precedence, or omission behavior.

## Summary

Refactor `reference-content.ts` to remove duplicated fallback normalization, make slot-content classification a first-class pure concern, and replace manual reference-slot batching with a schema-driven, parallelized flow.

This refactor should stay deliberately narrow:

* keep the module focused on lightweight inline metadata resolution
* preserve existing external behavior unless a change is explicitly intended
* improve extensibility and testability without introducing broader HTML-parsing responsibilities

## Goals

* Eliminate duplicated normalization logic for fallback text and URLs.
* Make HTML-content classification explicit, pure, and directly testable.
* Reduce branching and duplication in batched reference-slot preparation.
* Preserve current caller contracts while improving internal structure.
* Keep async orchestration thin and push logic into pure helpers where possible.

## Non-goals

* Do not turn this module into a general-purpose HTML parser.
* Do not add broader URL validation beyond trimming and rejecting blank values.
* Do not merge `ResolvedInlineField` and `ResolvedLinkedInlineField` into a single generic union.
* Do not change higher-level rendering behavior unless current behavior is clearly inconsistent or under-specified.

## Chosen Defaults

* `prepareSlotsForReferences(...)` will continue returning an entry for every unique reference id, including `{}` when no meaningful overrides exist.
* Duplicate `referencedIds` will be deduplicated before slot resolution.
* `ResolvedInlineField` and `ResolvedLinkedInlineField` remain separate result shapes.
* Parallelism will be introduced only within each reference’s field resolution, not as a fully flattened global batch.
* No new runtime dependency will be added in this phase.

## Design Constraints

* Keep public-facing behavior stable wherever possible.
* Favor small pure helpers over larger mixed I/O + transformation functions.
* Prefer a single source of truth for supported reference slot keys.
* Keep functions short and intention-revealing.
* Avoid introducing abstractions that only serve this file if they do not clearly reduce duplication or complexity.

## Proposed Refactor

### 1. Extract shared fallback normalization

Introduce small pure helpers for prop-based fallback handling:

* `normalizeFallbackText(text?: string): string | undefined`
* `normalizeHref(href?: string): string | undefined`

Responsibilities:

* trim
* collapse or normalize inline whitespace using existing rules
* reject empty/blank results
* reject blank `href` values after trimming

This removes duplicated fallback handling from:

* `resolveInlineField(...)`
* `resolveLinkedInlineField(...)`

### 2. Promote slot classification to a pure helper

Introduce:

* `classifyRenderedSlot(html: string): ResolvedSlotContent`

Responsibilities:

* classify rendered HTML as meaningful or empty
* preserve original HTML for meaningful content
* return the canonical empty result for non-meaningful content

Then keep `resolveOptionalSlot(...)` as a thin orchestration wrapper:

* check `slots.has(...)`
* call `slots.render(...)`
* delegate to `classifyRenderedSlot(...)`

This creates a cleaner separation between:

* async slot access
* content classification rules

### 3. Centralize repeated empty results

Add stable constants for repeated literals:

* `EMPTY_SLOT_CONTENT`
* `MISSING_INLINE_FIELD`
* optionally `MISSING_LINKED_INLINE_FIELD`

This reduces repeated object construction and makes result states more consistent and easier to compare in tests.

### 4. Make reference-slot preparation schema-driven

Replace the current hardcoded field-by-field logic with a single source of truth:

* `REFERENCE_SLOT_KEYS = ["title", "description", "publication", "institution"] as const`

Use this schema to:

* synthesize slot names
* resolve fields
* assemble `PreparedReferenceSlots`

This improves extensibility and reduces the risk of future field drift.

### 5. Parallelize per-reference field resolution

For each reference id:

* synthesize all slot names from `REFERENCE_SLOT_KEYS`
* resolve them in parallel with `Promise.all(...)`
* assemble the prepared result from the resolved entries

This removes unnecessary serial awaits while keeping concurrency bounded and predictable.

### 6. Tighten generic typing on batch preparation

Refine `prepareSlotsForReferences(...)` to preserve literal id information:

* input: `readonly TId[]`
* output: `Promise<Record<TId, PreparedReferenceSlots>>`

This improves call-site ergonomics and keeps the function consistent with the rest of the typed API surface.

## Recommended TDD Sequence

## ~~Phase 1: Lock down current behavior and intended edge cases~~

Before moving code around, make the expected behavior fully explicit.

Add or refine tests for:

* `hasMeaningfulTextContent(...)`
* `resolveInlineField(...)`
* `resolveLinkedInlineField(...)`
* `prepareSlotsForReferences(...)`

Focus on currently implicit rules:

* slot content takes precedence over fallbacks
* blank fallback text is ignored
* blank fallback URL does not produce a link
* ids with no meaningful slots still produce empty objects
* duplicate ids do not trigger duplicated work

This phase should minimize ambiguity before implementation changes begin.

### Exit criteria

* The current behavior is expressed clearly enough that refactoring can proceed without guesswork.
* Edge cases around empty HTML, fallback text, and duplicate ids are covered.

## ~~Phase 2: Extract fallback normalization~~

Introduce:

* `normalizeFallbackText(...)`
* `normalizeHref(...)`

Refactor `resolveInlineField(...)` and `resolveLinkedInlineField(...)` to use them.

Scope of change:

* no structural changes beyond local normalization cleanup
* the only intentional behavioral tightening is rejection of blank/whitespace-only URLs

### Tests to add or refine

BDD-style examples:

* returns trimmed fallback text when slot content is absent
* returns missing when fallback text is blank
* returns text-only when fallback URL is absent
* returns missing when fallback text is blank even if a URL exists
* does not produce a link for blank or whitespace-only URL values

Optional PBT:

* normalization is idempotent
* whitespace-only strings never normalize to meaningful content

### Exit criteria

* duplicated normalization logic is removed
* inline and linked-inline behavior remains stable apart from the intentional blank-URL tightening

## ~~Phase 3: Extract pure slot classification~~

Introduce:

* `classifyRenderedSlot(html: string): ResolvedSlotContent`

Refactor `resolveOptionalSlot(...)` into a thin wrapper around slot existence, rendering, and classification.

This is the main architectural seam in the refactor, because it clearly separates pure logic from I/O.

### Tests to add or refine

Direct tests for `classifyRenderedSlot(...)`:

* returns meaningful content for text-bearing HTML
* returns the canonical empty result for comment-only HTML
* returns the canonical empty result for tag-only wrappers with no meaningful text
* preserves original HTML when the content is meaningful

Keep `resolveOptionalSlot(...)` tests focused on orchestration:

* skips render when the slot is absent
* propagates render failures
* delegates classification of rendered HTML correctly

### Exit criteria

* HTML classification can be tested independently of slot I/O
* `resolveOptionalSlot(...)` becomes small, explicit, and low-risk

## ~~Phase 4: Refactor batched reference preparation into a schema-driven flow~~

Introduce `REFERENCE_SLOT_KEYS` and replace the manual four-field branch structure with a schema-based loop.

Implementation shape:

* deduplicate ids first
* for each unique id, synthesize slot names from the schema
* resolve all field slots
* build `PreparedReferenceSlots` from only meaningful resolved results
* ensure every unique id still maps to an output entry

### Tests to add or refine

* synthesizes correct slot names for every supported key
* includes only meaningful resolved fields in each prepared object
* preserves `{}` for ids with no meaningful overrides
* handles all supported keys through one shared path rather than key-specific branches
* deduplicates repeated ids without changing final output shape

### Exit criteria

* the hardcoded four-field flow is gone
* supported field names live in one place
* output shape remains backward compatible

## ~~Phase 5: Parallelize per-reference resolution and tighten types~~

After the schema-driven flow is stable, replace per-field serial awaits with `Promise.all(...)`.

Also tighten the generics so the function preserves literal ids in its return type.

This phase should be intentionally small and isolated from earlier structural changes.

### Tests to add or refine

* one observable behavior test that verifies all per-reference fields are requested without requiring serial dependence
* compile-time-oriented tests where practical for preserved literal id typing
* regression tests confirming no output shape changes for existing callers

### Exit criteria

* no serial per-field dependency remains within a reference
* type preservation is improved without complicating the call sites

## Test Strategy

Structure the suite by behavior, not by function order.

Suggested test groups:

* HTML classification behavior
* inline field precedence
* linked inline field behavior
* optional slot orchestration
* batched reference preparation

### DDT

Use a data-driven matrix for HTML classification inputs such as:

* empty string
* whitespace-only string
* `&nbsp;`
* comment-only fragments
* empty wrappers
* wrappers containing visible text
* media-only fragments
* mixed whitespace/entity/text fragments

This will keep the classification rules readable and easy to extend.

### PBT

Use property tests only for stable invariants, not for behavior already better expressed with examples.

Good candidates:

* whitespace normalization is idempotent
* meaningful slot content always wins over fallback inputs
* blank/whitespace-only fallback strings never become meaningful after normalization

## Validation Plan

Run the focused unit suite first, then the nearby caller-facing render suites.

Primary target:

* `reference-content.test.ts`

Then contract/regression coverage through:

* `ScholarlyArticle.render.test.ts`
* `Thesis.render.test.ts`
* `GenericReference.render.test.ts`

Status:

* Completed on 2026-04-19 as part of the final close-out pass recorded above.

## Risks and Mitigations

### Risk: behavior drift during cleanup

Mitigation:

* lock down precedence and empty-content semantics before structural refactors

### Risk: over-generalization

Mitigation:

* keep result unions separate
* avoid introducing a generic abstraction unless a second real use case appears

### Risk: hidden coupling in slot-name synthesis

Mitigation:

* define the supported key set once and test the synthesized names explicitly

### Risk: concurrency-related test brittleness

Mitigation:

* avoid timing-based assertions
* verify call patterns or independence through mocks/spies instead

## Optional Future Work

Not part of this refactor, but worth noting if the module grows:

* replace narrow entity handling with a dedicated entity decoder
* broaden HTML classification only if real inputs require it
* share a tiny internal “slot schema” abstraction with sibling modules if another file develops the same pattern

## Condensed Implementation Checklist

1. Lock down behavior with BDD examples and small DDT/PBT additions.
2. Extract `normalizeFallbackText(...)` and `normalizeHref(...)`.
3. Refactor inline-field resolvers to use shared normalization.
4. Add canonical empty/missing constants.
5. Extract `classifyRenderedSlot(...)`.
6. Turn `resolveOptionalSlot(...)` into a thin wrapper.
7. Introduce `REFERENCE_SLOT_KEYS`.
8. Refactor `prepareSlotsForReferences(...)` into a schema-driven loop.
9. Deduplicate input ids.
10. Parallelize per-reference field resolution.
11. Tighten generic typing on the batch function.
12. Re-run focused unit and render-contract suites.
