# Refactor `bibliography-catalog-builder.graph.mjs` Around Explicit Builder Contracts

## Summary

Refactor the graph-building layer so its contracts are explicit, its repeated assembly logic is centralized, and its current externally observable behavior is pinned down before internals change.

This is an **internal refactor** of the graph-builder subsystem only. The public entrypoint remains:

`buildCatalogArtifactFromTurtle(ttl, options)` in `scripts/lib/bibliography-catalog-builder.mjs`

This phase must **not** redesign the output format, alter the build pipeline, or introduce a parallel normalization architecture. The goal is to improve clarity, safety, and maintainability while preserving current JSON-LD output and validation behavior.

---

## Goals

* Make aborting validation semantics explicit instead of relying on an implicitly-throwing `fail` callback.
* Remove repeated node-construction and relation-validation patterns.
* Eliminate the ambiguous mutation contract in sorting.
* Isolate the special pending-revision pruning rule from normal usage-node assembly.
* Reduce call-site noise by replacing long positional dependency lists with an internal context object.
* Lock the current observable behavior down with direct graph-builder tests before changing implementation details.

---

## Non-Goals

* No changes to the public builder entrypoint.
* No changes to JSON-LD shape, relation semantics, or validation policy.
* No TypeScript migration in this phase.
* No broader record-normalization redesign.
* No extraction of shared helpers beyond the graph-builder module unless clearly required by existing architecture.

---

## Proposed Changes

### 1. Make validation control flow explicit

The current builder layer depends on a generic `fail(...)` collaborator whose control-flow contract is only implicit. Several builders continue executing after calling it, which is only safe if it always throws.

Refactor the graph-builder-facing validation API so the aborting behavior is explicit.

#### Changes

* Replace generic graph-builder usage of `fail(...)` with a clearly non-returning validation function name.
* Add small wrappers for common required-value patterns, such as:

  * required scalar extraction
  * required first reference extraction
  * required relation category checks where appropriate
* Keep the thrown error wording and source-label-based context unchanged unless tests prove those details are intentionally unconstrained.

#### Payoff

* Control flow becomes self-documenting.
* Required-field logic becomes easier to reuse consistently.
* Builders no longer rely on hidden assumptions about whether validation aborts.

---

### 2. Make sorting non-mutating

`sortGraphNodes` currently sorts the received array in place, but its name reads like a pure transformation. That is an avoidable footgun and makes the contract harder to reason about.

#### Changes

* Change `sortGraphNodes` to return a sorted copy instead of mutating the input.
* Keep the exported name unchanged.
* Preserve the current ordering rules exactly:

  * category order first
  * `@id` lexical tie-breaker second

#### Payoff

* Safer call sites.
* Easier reasoning in tests and future refactors.
* Cleaner functional contract.

---

### 3. Extract shared graph-builder helpers

The builder layer repeats the same patterns across `buildCreativeWorkNode`, `buildReferenceNode`, and `buildUsageNode`: scalar extraction, optional field emission, relation lookup, category validation, and `@id` serialization.

Refactor those patterns into module-local helpers so the exported builders read as declarative assembly code rather than validation plumbing.

#### Extract to module constants

* allowed author types
* allowed publisher types
* allowed lesson types
* allowed creative-work/reference relation target types as needed

#### Extract to module helpers

* required scalar extraction
* optional property emission
* `{"@id": ...}` serialization
* array-of-`@id` serialization
* first-reference extraction
* relation-category validation
* tag deduplication if that logic is currently embedded in usage assembly

#### Refactor targets

Start with:

* `buildCreativeWorkNode`
* `buildReferenceNode`

Then:

* `buildUsageNode`

These two builder functions have the clearest duplication and provide the safest initial extraction path.

#### Payoff

* Less duplication.
* Smaller builders.
* More focused tests.
* Easier future additions of new node categories.

---

### 4. Isolate pending-revision pruning policy

`buildUsageNode` currently mixes ordinary usage-node assembly with the exceptional `"pending-revision"` skip policy. That makes the function dense and obscures the normal path.

#### Changes

* Extract the early-return policy into a helper such as `shouldSkipPendingRevisionUsage(...)`.
* Keep the existing semantics exactly:

  * only pending-revision usages may be skipped
  * skip occurs only under the current special conditions involving skipped, missing, or unsupported referenced nodes
* Leave ordinary lesson/reference validation in the main builder path

#### Payoff

* The exceptional pruning rule becomes visible and named.
* The main builder reads as normal assembly logic again.
* Special-case behavior is easier to test directly.

---

### 5. Replace long positional dependencies with an internal context object

Several builder functions currently accept long positional dependency lists, which makes signatures noisy and fragile.

#### Changes

* Introduce a single internal context object for graph-builder operations.
* Include collaborators such as:

  * record readers
  * scalar extractors
  * ref extractors
  * relation/category validators
  * source label
  * access to `recordsById`
* Create the context once in `bibliography-catalog-builder.mjs` or at the graph-builder boundary, then pass it through internally.
* Keep this entirely internal; do not add a new public API surface.

#### Payoff

* Cleaner signatures.
* Easier refactoring when helper dependencies evolve.
* Lower risk of parameter-order mistakes.

---

### 6. Add JSDoc contracts for the internal model

This module is still fairly stringly-typed, and that makes the refactor harder to reason about than it needs to be.

#### Changes

* Add strong JSDoc typedefs for:

  * builder context
  * supported graph node shapes
  * record expectations used by the builder layer
* Document helper contracts where non-obvious, especially around:

  * aborting validation
  * optional omission semantics
  * relation validation
  * pending-revision skipping
* Do not migrate the module to TypeScript in this phase.

#### Payoff

* Better editor support.
* Clearer refactor boundary.
* Improved maintainability without widening scope.

---

## Recommended Sequence

### Phase 1: Lock the current graph-builder contract down

Add direct tests around the current graph-builder behavior before refactoring internals.

Focus on:

* required-field failure behavior
* optional-field omission
* relation-category validation
* usage-tag deduplication and order
* sorting determinism, idempotence, and non-mutation

This creates a safe refactor boundary and reduces the risk of unintentionally changing semantics.

---

### Phase 2: Make validation abort semantics explicit

Introduce the non-returning validation helpers and route required-value checks through them.

Keep behavior stable:

* same failure conditions
* same messages
* same source-label context

Do not combine this with the context-object refactor yet.

---

### Phase 3: Extract shared serialization and relation helpers

Refactor `buildCreativeWorkNode` and `buildReferenceNode` first, since they have the cleanest overlap.

Once those stabilize, apply the same helper set to `buildUsageNode`.

Keep emitted node shapes unchanged.

---

### Phase 4: Extract pending-revision pruning

Move the special `"pending-revision"` skip logic into its own helper.

Ensure this phase changes only control-flow structure, not semantics.

---

### Phase 5: Introduce the internal builder context object

After behavior is stabilized and repeated helpers exist, replace long positional argument lists with a context object.

Doing this later keeps the earlier refactors smaller and easier to review.

---

### Phase 6: Add JSDoc contracts and stop

Document the internal contracts that remain dynamic, then end the phase.

Avoid scope creep into TypeScript, broader normalization, or builder redesign.

---

## Test Strategy

### Direct example-based tests

Add focused graph-builder tests that assert:

* each builder throws on missing required fields
* thrown errors retain expected source-label and relation context
* optional fields are omitted rather than emitted as empty or null placeholders
* author, publisher, and `isPartOf` relations accept only allowed categories
* `buildUsageNode` returns `null` only for the intended pending-revision skip cases
* duplicate `dibs:tag` values collapse while preserving first-occurrence order

These should be direct unit-style tests against the graph-builder layer, not only indirect end-to-end script tests.

---

### DDT

Use DDT for highly repetitive contract matrices.

Best candidates:

* required-field failures by builder and field
* allowed vs forbidden relation-category cases
* optional field omission cases
* pending-revision skip scenarios

This keeps the contract broad without duplicating boilerplate.

---

### PBT

Use PBT for invariant-oriented behaviors:

* sorting is deterministic
* sorting is idempotent
* sorting does not mutate the input
* deduplicated tags preserve first-occurrence order
* builders never emit optional keys when source values are absent

This is especially valuable for the sorting and tag-deduplication contracts.

---

### Regression verification

Re-run and preserve the existing script-level suites, especially:

* `scripts/__tests__/build-bibliography-catalog.validation.test.ts`
* `scripts/__tests__/build-bibliography-catalog.pending-revision.test.ts`
* `scripts/__tests__/build-bibliography-catalog.happy-path.test.ts`
* `scripts/__tests__/build-bibliography-catalog.pbt.test.ts`

Add a new direct test suite for `bibliography-catalog-builder.graph.mjs` so the module’s local contract is tested without relying exclusively on higher-level integration coverage.

---

## Acceptance Criteria

This refactor is complete when all of the following are true:

* `buildCatalogArtifactFromTurtle(ttl, options)` remains unchanged as the public entrypoint.
* JSON-LD output remains equivalent for existing happy-path fixtures.
* Validation failures still occur in the same situations and preserve the same observable message shape.
* `sortGraphNodes` is non-mutating, deterministic, and idempotent.
* Shared builder logic is centralized in module-local helpers rather than repeated across node builders.
* The pending-revision skip rule is isolated behind a named helper.
* Long positional dependency lists inside the graph-builder layer are replaced by an internal context object.
* Direct graph-builder tests exist for required-field failures, optional omission, relation validation, sorting, and tag deduplication.
* No TypeScript migration or normalization-layer redesign has been introduced.

---

## Assumptions and Defaults

* Preserve current JSON-LD node shapes exactly unless an existing test shows some detail is intentionally flexible.
* Preserve current error wording unless tests show it is not part of the observable contract.
* Prefer a non-mutating `sortGraphNodes` over renaming it to an explicit in-place variant.
* Use JSDoc for internal contract clarity in this phase; defer TypeScript migration.
* Keep helper extraction local to the graph-builder module.
* Treat this as a behavior-preserving refactor, not a product change.
