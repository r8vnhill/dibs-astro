# Phase 1 Plan: Lock the Reader Boundary Contract

## Summary

Phase 1 defines the executable contract for the bibliography reader boundary in `records.mjs` before any production refactoring begins. This is a **tests-only** phase.

## Implementation Notes

The Phase 1 test implementation should keep the suite green while still surfacing the intentional contract gap around duplicate handling.

- Existing behavior and stable invariants should be encoded as ordinary passing tests.
- Chosen duplicate-removal policy cases may be encoded as explicit red-by-design assertions using `it.fails(...)` so the contract is visible without forcing the whole unit suite red during the tests-only handoff.
- Those `it.fails(...)` cases become the concrete implementation targets for Phase 2, where many-value readers are unified and updated to satisfy the deduplication policy.

Its purpose is twofold:

1. capture the current observable behavior of the reader layer where that behavior should remain stable;
2. deliberately lock the next-phase policy decisions that have already been chosen, even where current production code does not yet satisfy them.

This phase therefore allows a mixed outcome:

* tests that document already-implemented behavior should pass immediately;
* tests that encode newly chosen behavior may fail initially and serve as the red phase for the next implementation step.

The selected policy decisions to lock now are:

* many-value readers should **deduplicate values while preserving first-seen order**;
* `scalarInteger` should continue accepting **non-canonical but safe integer lexemes** such as `"01"`.

Phase 1 also introduces targeted property-based tests for stable normalization invariants, but it does not change production code. 

## Goals

* Define the reader-layer contract in executable form before refactoring.
* Reorganize the test suite around reader behavior rather than helper shape.
* Lock the chosen duplicate-handling and integer-lexeme policies.
* Add DDT where it improves coverage density without obscuring intent.
* Add focused PBT for normalization invariants that are easy to state and valuable to preserve.

## Non-Goals

Phase 1 must not:

* refactor `records.mjs`;
* rename reader functions;
* introduce generic reader primitives;
* introduce the reader facade;
* change URL semantics;
* broaden the scope into graph-builder or catalog-builder orchestration tests.

Only tests and minimal test-only support code may change in this phase.

## Success Criteria

Phase 1 is complete when all of the following are true:

* the `records` suite is organized by exported reader behavior;
* current stable behavior is explicitly covered;
* the chosen duplicate and integer policies are encoded in tests;
* PBT is present for a small number of normalization invariants;
* no production file under the bibliography reader implementation is modified.

If some policy-locking tests fail against current implementation, that is acceptable and expected. Those failures become the starting point for the next phase.

## Suite Structure

Reorganize `scripts/__tests__/bibliography-catalog-builder.records.test.ts` into behavior-first groups that mirror the exported reader surface:

* `describe("scalarLiteral")`
* `describe("scalarInteger")`
* `describe("scalarUrlLiteral")`
* `describe("scalarUrlRef")`
* `describe("namedRefs")`
* `describe("getNodeTypes")`
* `describe("getUsageTagLiterals")`

Each group should answer three questions:

* what valid input succeeds;
* what missing input returns;
* what invalid input fails with a contextual validation error.

Keep assertions at the level of observable outputs and error behavior. Do not test private helper structure or expected internal call paths. 

## Test Scope

### 1. Scalar-reader contract coverage

Add or reshape deterministic tests so the scalar-reader contract is explicit.

For optional scalar readers, cover:

* missing predicate returns `undefined`;
* one valid value succeeds;
* multiple values fail;
* wrong `termType` fails.

For `scalarInteger`, cover:

* missing value returns `undefined`;
* canonical safe integers succeed;
* non-canonical safe integers such as `"01"` succeed;
* malformed lexical forms fail;
* unsafe integers fail.

For `scalarUrlLiteral`, lock only the current behavior of a literal-string reader:

* literal values succeed as plain strings;
* named nodes fail.

For `scalarUrlRef`, cover:

* named nodes succeed and are mapped through `compactUrl`;
* literals fail.

### 2. Many-reader contract coverage

For `namedRefs`, cover:

* named-node arrays map through `compactId`;
* first-seen order is preserved;
* duplicates are removed according to the chosen policy;
* any non-named-node value fails.

For `getNodeTypes`, cover:

* missing `rdf:type` fails;
* valid named-node values map through `compactType`;
* first-seen order is preserved;
* duplicates are removed according to the chosen policy.

For `getUsageTagLiterals`, cover:

* literal tags are returned as strings;
* first-seen order is preserved;
* duplicates are removed according to the chosen policy;
* any non-literal tag fails.

## DDT Plan

Use DDT only where the assertion shape is genuinely repeated.

### Optional scalar readers

Add a compact table covering:

* no values;
* one valid value;
* multiple values;
* one value with the wrong `termType`.

This should apply to readers with the same observable contract shape rather than duplicating nearly identical examples manually.

### Integer lexical forms

Add a dedicated table for `scalarInteger` cases:

* canonical valid forms;
* non-canonical but accepted forms;
* malformed forms;
* numerically unsafe forms.

### Duplicate behavior in many-readers

Add a small table for many-value readers covering:

* all unique values;
* repeated identical values;
* repeated values interleaved with new values.

Keep row names explicit so failures read like contract violations rather than cryptic matrix entries.

## Property-Based Testing Plan

Add `fast-check` now, but keep its role narrow and disciplined.

### Add PBT for these invariants only

* `scalarInteger` accepts any generated safe integer string and returns the corresponding numeric value.
* `namedRefs` preserves first-seen order after deduplication while mapping retained values through `compactId`.
* `getNodeTypes` preserves first-seen order after deduplication while mapping retained values through `compactType`.
* many-value readers fail when a generated sequence includes a non-conforming term type.

### Keep PBT out of these areas

Do not use PBT for:

* builder orchestration;
* integration behavior;
* error-message wording beyond broad expectations;
* URL semantics not yet chosen as policy.

The objective is to protect normalization invariants, not to turn the suite into a generalized fuzzing layer. 

## TDD Interpretation

Because this phase mixes behavior capture and policy locking, be explicit about expected outcomes.

### Green-now tests

These should describe behavior that already exists and should stay stable.

### Red-by-design tests

These should encode the newly chosen policy where current code is not yet compliant, especially:

* duplicate removal with first-seen preservation in many-value readers.

Do not treat those failures as accidental. They are the intentional handoff into the next implementation phase.

If desired, mark the policy-locking block clearly in comments or group names so reviewers understand why some tests may be introduced before the implementation exists.

## Concrete Scenarios to Cover

* missing scalar predicate returns `undefined`;
* scalar predicate with multiple values fails with contextual validation;
* scalar predicate with wrong RDF term type fails with contextual validation;
* `scalarInteger` accepts `"0"`, `"-1"`, and `"01"`;
* `scalarInteger` rejects `""`, `"12abc"`, `"1.2"`, and `"1e3"`;
* `scalarInteger` rejects integers outside the safe range;
* `scalarUrlLiteral` returns literal strings unchanged;
* `scalarUrlRef` compacts named-node URLs through `compactUrl`;
* `namedRefs` maps via `compactId`, deduplicates, and preserves first occurrence order;
* `getNodeTypes` fails when `rdf:type` is absent;
* `getNodeTypes` maps via `compactType`, deduplicates, and preserves first occurrence order;
* `getUsageTagLiterals` returns literal tag strings, deduplicates, and preserves first occurrence order;
* any non-literal usage tag fails;
* generated safe integer strings round-trip through `scalarInteger`;
* generated named-node sequences satisfy first-seen deduplicated ordering in `namedRefs` and `getNodeTypes`.

## Acceptance Criteria

* the reader test suite is structured around exported reader behavior;
* scalar and many-reader contracts are explicit and readable;
* duplicate handling is locked as “deduplicate while preserving first-seen order”;
* integer lexical behavior is locked as “accept non-canonical safe integer lexemes”;
* targeted PBT exists for stable normalization invariants;
* no production module under the bibliography reader layer changes in this phase;
* any failing tests are limited to deliberate policy-locking cases and are clearly identifiable as such.

## Assumptions

* `scalarUrlLiteral` remains a literal-string reader in Phase 1; URL validation is out of scope here.
* The duplicate-handling policy is intentionally being locked before implementation is updated.
* `fast-check` is acceptable as a test dependency for this phase.
* Existing integration tests outside the reader suite are not the primary target of this phase, though they may still be run as a sanity check.
