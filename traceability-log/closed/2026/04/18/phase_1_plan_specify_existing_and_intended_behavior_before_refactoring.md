# Phase 1 Plan: Specify Existing and Intended Behavior Before Refactoring

## Summary

Phase 1 should make the module’s current and agreed-next behavior explicit in tests before any production refactor begins. This phase is intentionally test-first and test-heavy: its job is to define the contract that later refactors must preserve or intentionally tighten.

Primary target:

* `reference-content.test.ts`

This phase should avoid production-code changes except in one narrow case: a newly added test exposes a small, already-agreed behavior gap that must be implemented now to keep the suite aligned with the intended contract.

## Scope

Phase 1 is about specification, not design cleanup.

It should:

* clarify precedence rules
* expose edge-case behavior
* make deduplication expectations explicit
* separate pure-classification expectations from async wrapper expectations
* leave the module easier to refactor without forcing new product decisions in later phases

It should not:

* extract helpers
* rename production abstractions
* restructure implementation for cleanliness alone
* broaden the module into a general HTML parser
* introduce timing-sensitive concurrency assertions

## Contract to Lock Down

The suite should make these rules explicit:

* meaningful slot content takes precedence over prop fallbacks
* blank or non-meaningful fallback text is ignored
* blank or whitespace-only fallback URLs do not produce links
* `prepareSlotsForReferences(...)` returns an entry for every logical reference id, even when that entry is `{}` because no meaningful overrides exist
* duplicate ids are treated as one logical reference for slot-resolution work and final output shape

Where current behavior and intended tightened behavior differ, the test should make that distinction obvious rather than hiding it in ambiguous assertions.

## Test Restructuring

Restructure the suite, if needed, around behaviors rather than source order:

* `hasMeaningfulTextContent(...)`
* `resolveInlineField(...)`
* `resolveLinkedInlineField(...)`
* `resolveOptionalSlot(...)`
* `prepareSlotsForReferences(...)`

This keeps the file readable during later refactors and makes it clearer which invariants belong to classification, field resolution, wrapper orchestration, or batching.

## Planned Test Additions

### 1. HTML classification coverage for `hasMeaningfulTextContent(...)`

Add a single DDT matrix covering representative HTML fragments and expected meaningfulness.

Suggested cases:

* `""`
* `" "`
* `"&nbsp;"`
* `"&#160;"`
* `"&#xA0;"`
* `"<!-- comment -->"`
* `"<span></span>"`
* `"<span>text</span>"`
* `"<strong> x </strong>"`
* `"<img src='x' alt='' />"`
* `"<span>&nbsp;text&nbsp;</span>"`

Goals:

* make the lightweight classification boundary explicit
* document what counts as “meaningful text”
* avoid spreading equivalent assertions across many one-off tests

### 2. Fallback-text behavior for `resolveInlineField(...)`

Add example-based tests that show:

* it returns normalized fallback text when the slot is empty and the fallback contains surrounding or repeated whitespace
* it returns `missing` when fallback text is blank
* it returns `missing` when fallback text is entity-only, if that is the agreed intended behavior
* it still prefers meaningful slot HTML over any fallback text

These tests should make the precedence and normalization policy explicit without requiring the implementation details to be visible.

### 3. Link fallback behavior for `resolveLinkedInlineField(...)`

Add example-based tests that show:

* it returns `text` when fallback text is usable and the URL is absent
* it returns `text` when fallback text is usable and the URL is blank or whitespace-only
* it returns `missing` when fallback text is blank even if a URL exists
* it still prefers meaningful slot HTML over fallback text and URL

This is the key place to lock down blank-URL rejection before any normalization extraction happens.

### 4. Wrapper behavior for `resolveOptionalSlot(...)`

Keep these tests narrow and orchestration-focused:

* absent slot skips render
* empty rendered content returns the canonical empty result
* meaningful rendered content preserves the original HTML
* render failures propagate unchanged, if that is part of the current contract

These tests should avoid re-testing classification logic already covered under `hasMeaningfulTextContent(...)`.

### 5. Batched behavior for `prepareSlotsForReferences(...)`

Add tests that clarify both output and work semantics:

* duplicate ids produce one final entry per logical id
* duplicate ids do not trigger repeated slot-resolution work
* ids with no meaningful overrides still map to empty objects
* synthesized slot-name behavior remains correct across all currently supported keys

Where possible, assert deduplication via requested slot names and mock call counts rather than elapsed time or ordering assumptions.

## TDD Strategy

This phase should follow a deliberate red/green posture.

First, add tests that describe the desired contract, even if some fail immediately. Then decide whether each failure is:

* expected and deferred to the implementation phase, or
* small and already agreed enough to fix now

That decision should be explicit, not accidental.

Recommended rule:

* allow failing tests in Phase 1 only when they represent already-approved tightened behavior that will be implemented first in the next phase
* avoid mixing speculative future behavior into this phase’s suite

## Property and Data-Driven Testing

Use DDT where many cases share the same behavioral shape.

Use PBT sparingly and only where it improves confidence without obscuring intent.

Recommended:

* keep the existing property test that meaningful slot content always wins in `resolveLinkedInlineField(...)`
* optionally add one small normalization-oriented property test, such as whitespace-only fallback strings never producing meaningful text results

Avoid broader property tests that make the suite harder to read than the production code itself.

## Acceptance Criteria

Phase 1 is complete when:

* the suite clearly expresses precedence, emptiness, link, and deduplication rules
* blank-URL rejection is explicitly represented in tests
* duplicate-id behavior is visible in both output assertions and work-level assertions
* classification expectations are centralized instead of scattered
* `resolveOptionalSlot(...)` tests focus on wrapper behavior rather than duplicating lower-level classification coverage
* a later implementer can refactor normalization, classification, and batching without making new product decisions

## Assumptions

* Phase 1 may introduce failing tests for already-agreed tightened behavior, especially blank-URL rejection and duplicate-id deduplication
* the module remains scoped to lightweight inline metadata classification rather than general HTML interpretation
* caller-facing render tests are out of scope for this phase unless a unit-level ambiguity cannot be resolved locally

## Suggested Execution Order

1. Restructure the suite into behavior-oriented groups.
2. Add the DDT matrix for `hasMeaningfulTextContent(...)`.
3. Add or refine example tests for `resolveInlineField(...)`.
4. Add or refine example tests for `resolveLinkedInlineField(...)`.
5. Tighten `resolveOptionalSlot(...)` coverage around wrapper semantics only.
6. Add deduplication and empty-object contract tests for `prepareSlotsForReferences(...)`.
7. Review failing tests and explicitly mark which ones represent intended next-phase work.
