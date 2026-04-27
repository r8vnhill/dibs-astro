# Phase 2 Plan: Internal Reader Unification

## Summary

Phase 2 will refactor `records.mjs` so all exported readers are built on a shared internal reader pipeline while preserving the existing public accessor API.

## Implementation Notes

The implemented Phase 2 shape should favor a private shared pipeline inside `records.mjs` rather than introducing the builder-facing facade early.

- Keep `optionalOne(...)` and `many(...)` as the internal composition points used by exported readers.
- Keep selectors, term validation, mapping, and dedupe as separate small helpers.
- Implement duplicate removal now in the shared many-reader path so the prior Phase 1 duplicate-policy tests become normal passing assertions.
- Keep URL semantics and integer lexical semantics unchanged in this phase.
- Update the reader contract suite to remove red-by-design duplicate cases once implementation lands.

This phase should do more than just remove duplication. It should establish a small internal architecture for record reading that is:

* composable
* easy to test in isolation
* explicit about cardinality and term-type constraints
* reusable for future readers without requiring bespoke helpers each time

The direction for this phase is:

* implement duplicate removal now, so the Phase 1 duplicate cases become regular passing tests;
* unify all readers behind a single internal reader pipeline with well-separated responsibilities;
* expose that pipeline through small internal primitives for scalar and many-valued access;
* keep public exports stable;
* fix the current type-unsound narrowing in `expectTermType` without turning this phase into a full type-system redesign.

If the refactor remains manageable, prefer a slightly more general internal model now over a narrowly specialized one that will need to be rewritten in Phase 3.

---

## Design Goals

### Primary goals

* Preserve the current public reader API.
* Centralize shared reader behavior.
* Make incorrect data fail early and consistently.
* Eliminate ad hoc validation and deduplication paths.
* Keep helpers short, pure, and easy to test.
* Keep the internal design open to future extensions such as:

  * required scalar readers
  * non-deduping many readers
  * richer mapping/normalization policies
  * URL validation
  * schema-driven readers

### Non-goals

* Do not redesign the builder-facing facade yet.
* Do not introduce URL semantic changes in this phase.
* Do not change integer lexical rules.
* Do not add a full schema/type-definition layer unless it clearly reduces complexity now.

---

## Proposed Internal Architecture

### 1. Introduce one shared reader pipeline

Refactor the internals around four small responsibilities:

* **value selection**

  * fetch raw RDF terms for a predicate
  * handle missing vs present values
  * enforce cardinality rules

* **term-type validation**

  * ensure selected terms match the expected RDF term kind
  * produce properly narrowed values for downstream mapping

* **value mapping**

  * convert validated terms into exported domain values

* **post-processing**

  * dedupe if configured
  * apply required/non-empty rules where appropriate

This is more robust than baking some of these concerns into `optionalOne` and `many` directly.

### 2. Build the exported readers on top of internal reader descriptors

Rather than hard-coding behaviour separately per export, define a small internal configuration shape used by the shared pipeline.

Suggested internal config shape:

```js
{
  cardinality: "optionalOne" | "many",
  termType: "Literal" | "NamedNode",
  map: (term) => ...,
  dedupe?: boolean,
  requireNonEmpty?: boolean
}
```

Then keep these internal convenience wrappers:

* `optionalOne(record, predicate, config, sourceLabel)`
* `many(record, predicate, config, sourceLabel)`

These should remain thin wrappers over the lower-level pipeline, not the real centre of the design.

This keeps the API simple for current readers while avoiding duplication if more reader families appear later.

### 3. Keep cardinality policy explicit

Treat cardinality as a first-class concern, not as an incidental side effect of helper shape.

Recommended internal selector responsibilities:

* `selectOptionalOne`

  * returns `undefined` when missing
  * throws on more than one value

* `selectMany`

  * returns `[]` when missing
  * preserves source order

Avoid a design where mapping or validation happens before cardinality is resolved. That would make error paths harder to reason about.

### 4. Keep dedupe centralized and configurable

Implement duplicate handling only once, in the shared many-reader path.

Policy for this phase:

* dedupe after mapping
* preserve first-seen order
* use `Set` semantics on mapped values
* keep dedupe opt-in

This is the right tradeoff because exported readers care about their mapped values, not raw RDF identity.

---

## Key Changes

## 1. Refactor `records.mjs` around a shared reader core

Refactor the module so exported readers are assembled from a shared internal reader core instead of bespoke per-reader helpers.

Minimum internal pieces:

* `selectOptionalOne`
* `selectMany`
* `expectTermType`
* `applyDedupe`
* `optionalOne`
* `many`

Preferred if the module is getting large:

* move the internal pipeline to a private sibling module such as `records.internal.mjs` or `records_core.mjs`
* keep `records.mjs` as the stable public facade

That larger refactor is worth considering if it meaningfully improves file size, testability, and cohesion.

## 2. Rebuild existing exports on top of the shared primitives

Keep the exported reader API unchanged:

* `scalarLiteral`
* `scalarUrlLiteral`
* `scalarUrlRef`
* `scalarInteger`
* `namedRefs`
* `getNodeTypes`
* `getUsageTagLiterals`

Target behaviour:

* `scalarLiteral`

  * `optionalOne`
  * `Literal`
  * map to `.value`

* `scalarUrlLiteral`

  * same as `scalarLiteral` in this phase
  * no URL validation change yet

* `scalarUrlRef`

  * `optionalOne`
  * `NamedNode`
  * map through `compactUrl`

* `scalarInteger`

  * keep current integer semantics
  * reuse the literal-reading path instead of revalidating separately

* `namedRefs`

  * `many`
  * `NamedNode`
  * map through `compactId`
  * dedupe enabled

* `getNodeTypes`

  * `many`
  * `NamedNode`
  * map through `compactType`
  * dedupe enabled
  * preserve the existing required-non-empty rule after reading

* `getUsageTagLiterals`

  * `many`
  * `Literal`
  * map to `.value`
  * dedupe enabled

## 3. Fix type narrowing in a way that scales

Repair `expectTermType` so it performs real narrowing rather than relying on an unsound cast.

Minimum acceptable outcome:

* remove the invalid cast
* return a correctly narrowed local type for supported RDF term kinds
* keep mapper callbacks editor-safe and JSDoc-friendly

Preferred outcome if it stays small:

* define a tiny internal mapping from term-type string to concrete RDF/JSDoc type
* let the mapper type depend on that narrowed result

That gives you a cleaner basis for future readers without requiring a full schema typing layer today.

## 4. Keep helper size and responsibility tight

Aim for helpers that each do one thing and stay short:

* selectors only select
* validators only validate/narrow
* mappers only transform
* dedupe only dedupes
* public exports only compose policies

Avoid helpers that both select, validate, map, and enforce reader-specific postconditions in one block. That makes error handling and tests harder to isolate.

---

## Optional Larger Refactor

If you are willing to accept a somewhat broader Phase 2 refactor, I would seriously consider this structure:

* `records.mjs`

  * public reader exports only

* `records_core.mjs`

  * `selectOptionalOne`
  * `selectMany`
  * `expectTermType`
  * `optionalOne`
  * `many`
  * `applyDedupe`

* `records_errors.mjs`

  * shared error factories / message builders

This is not required, but it would improve separation of concerns and make the core easier to test directly.

It also helps keep functions short and reduces the tendency for `records.mjs` to become a “miscellaneous reader logic” file.

---

## Error Handling

Keep error behaviour consistent and centralized.

Recommended rules:

* wrong term types fail fast
* scalar multi-value predicates fail fast
* missing optional scalar values return `undefined`
* many-readers return `[]` unless a reader explicitly applies a required-non-empty rule afterward
* error messages should include:

  * predicate
  * expected term type or cardinality
  * source label

Do not scatter message formatting across exported readers.

A small internal error-builder helper is worth it if similar messages are already being repeated.

---

## Test Plan

## Testing Strategy

Use BDD-style suite/test naming throughout.

Prefer three layers of tests:

* **core pipeline tests**

  * exercise `selectOptionalOne`, `selectMany`, `expectTermType`, `optionalOne`, and `many` in isolation if these are testable without breaking encapsulation too hard

* **public reader contract tests**

  * preserve the current exported-reader behaviour

* **consumer regression tests**

  * verify bibliography graph/catalog code still behaves correctly

This separation makes failures more local and easier to diagnose.

## Required reader contract tests

Expected Phase 2 outcome:

* all currently passing tests stay green
* duplicate-policy tests become normal passing tests
* no URL semantic change
* no integer lexical change

Specific required scenarios:

* missing optional scalar returns `undefined`
* scalar multi-value predicates throw
* wrong RDF term types throw with contextual errors
* `scalarInteger` preserves existing parsing behaviour
* `namedRefs` deduplicates repeated IDs while preserving first-seen order
* `getNodeTypes` deduplicates repeated compacted types while preserving first-seen order
* `getUsageTagLiterals` deduplicates repeated mapped tags while preserving first-seen order
* many-readers still fail on invalid mixed-term collections

## Add DDT where it reduces repetition

Use DDT for repeated matrices such as:

* wrong term type for each reader family
* dedupe-preserving-order scenarios
* missing / one / many cardinality cases

This is especially useful when the assertion shape is the same and only the reader configuration differs.

## Add PBT selectively

This phase is a good candidate for light PBT, especially for the shared many-reader logic.

Good properties:

* dedupe preserves first-seen order
* dedupe output contains no repeated mapped values
* mapping followed by dedupe behaves consistently for arbitrary repeated input sequences
* invalid mixed term collections never pass term-type validation

A practical choice here would be `fast-check` if your current JS test stack already makes third-party test deps acceptable. It is widely used and well-suited to these invariants. I would only add it if you expect continued use in later phases; otherwise, keep Phase 2 dependency-free.

## Regression verification

Run at least:

* the reader contract suite
* bibliography graph tests
* catalog/builder tests consuming the readers

The goal is to confirm that internal unification did not alter caller-visible semantics beyond the intended duplicate policy.

---

## Acceptance Criteria

Phase 2 is complete when all of the following are true:

* all exported readers are implemented through the shared internal reader core
* exported reader names and call signatures are unchanged
* `getUsageTagLiterals` no longer uses an ad hoc path
* duplicate handling exists in one central many-reader policy
* dedupe happens after mapping and preserves first-seen order
* the unsound cast in `expectTermType` is removed
* type narrowing is good enough that mapper callbacks remain editor-safe
* Phase 1 duplicate tests now pass normally
* regression suites consuming readers remain green

---

## Assumptions

* URL semantics remain unchanged in Phase 2
* integer lexical policy remains unchanged in Phase 2
* duplicate removal is already a chosen contract and should now be implemented centrally
* builder-facing redesign remains out of scope until Phase 3

---

## Dependency Suggestions

### Good default

No new production dependency is needed for the implementation itself.

### Worth considering for tests

* `fast-check`

  * good fit for dedupe and mapping invariants
  * only add it if you expect continued property testing in later phases

### Not recommended in this phase

* runtime schema libraries
* large RDF abstraction layers
* type-heavy validation frameworks

Those would likely add more complexity than value right now.

---

## Notes on Experimental / Newer Language Features

Because this is modern JavaScript in `.mjs`, a few things are worth considering, but cautiously:

* private internal helpers and module-level composition are preferable to clever class hierarchies here
* keep JSDoc-based type narrowing if the project is already editor-checked that way
* avoid overcommitting to experimental runtime features unless your toolchain already guarantees them

If the project already uses TypeScript checking over JS, this phase is a good place to tighten JSDoc generics a bit. But I would not escalate this phase into a `.ts` migration unless that migration is already planned.

---

## Improved Plan

# Phase 2 Plan: Internal Reader Unification

## Summary

Refactor `records.mjs` so all exported readers are implemented through a shared internal reader core while preserving the current public API.

This phase will:

* implement duplicate removal centrally in the many-reader path
* introduce a shared internal pipeline for selection, validation, mapping, and post-processing
* expose that pipeline through small internal primitives:

  * `optionalOne(record, predicate, config, sourceLabel)`
  * `many(record, predicate, config, sourceLabel)`
* remove the unsound cast in `expectTermType`
* keep URL and integer semantics unchanged
* keep the builder-facing facade out of scope

The design should favour reuse and extension over reader-specific specialization, so later reader additions can be expressed as small configurations rather than new bespoke helpers.

## Key Changes

### 1. Introduce a shared internal reader core

Refactor the reader internals around these small responsibilities:

* `selectOptionalOne`
* `selectMany`
* `expectTermType`
* `applyDedupe`
* `optionalOne`
* `many`

Where practical, each helper should remain small and single-purpose.

### 2. Standardize reader composition

Model each reader internally as:

* cardinality policy
* expected RDF term type
* mapping function
* optional dedupe policy
* optional required/non-empty postcondition

This lets exported readers reuse one internal mechanism instead of encoding policy ad hoc.

### 3. Rebuild all existing exports on top of the shared primitives

Keep the exported API unchanged:

* `scalarLiteral`
* `scalarUrlLiteral`
* `scalarUrlRef`
* `scalarInteger`
* `namedRefs`
* `getNodeTypes`
* `getUsageTagLiterals`

Each should become a thin composition of shared pipeline pieces.

### 4. Centralize duplicate handling

Implement dedupe once in the shared many-reader path.

Rules:

* dedupe after mapping
* preserve first-seen order
* compare mapped values via `Set`
* keep dedupe opt-in

### 5. Repair type narrowing

Fix `expectTermType` so it narrows supported RDF term kinds safely and removes the unsound cast.

Keep the solution local and lightweight; do not broaden Phase 2 into a full typing redesign.

## Test Plan

### Contract tests

Use the existing reader suite as the main public contract and keep all current passing tests green.

Convert duplicate-policy tests into normal passing behaviour.

### Core scenarios

Verify that:

* missing optional scalar returns `undefined`
* scalar multi-value predicates fail fast
* wrong term types fail fast with contextual errors
* `scalarInteger` preserves existing parsing behaviour
* `namedRefs` deduplicates while preserving first-seen order
* `getNodeTypes` deduplicates while preserving first-seen order
* `getUsageTagLiterals` deduplicates while preserving first-seen order
* mixed invalid term collections fail for many-readers

### Test structure

* use BDD-style suite/test naming
* use DDT for repeated reader matrices
* consider PBT for dedupe/order invariants if adding `fast-check` is acceptable

### Regression verification

Run:

* reader contract tests
* bibliography graph tests
* catalog/builder tests consuming readers

## Acceptance Criteria

* all exported readers are built on the shared internal reader core
* duplicate removal is centralized in the many-reader path
* `getUsageTagLiterals` no longer uses a bespoke validation path
* `expectTermType` no longer relies on the unsound cast
* exported names and call signatures remain unchanged
* duplicate-policy tests now pass as normal behaviour
* consumer regression suites remain green
