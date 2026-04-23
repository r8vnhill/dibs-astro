# Plan: Introduce a Record Reader Facade for Bibliography Normalization

## Summary

Refactor the bibliography normalization boundary so builders depend on a cohesive record-reader facade instead of a flat collection of low-level accessor functions.

This change should preserve the current fail-fast normalization model and keep the RDF parsing boundary narrow, while reducing duplication inside `records.mjs` and simplifying builder context. The refactor should proceed in two layers:

1. unify the accessor internals behind generic reader primitives without changing observable behavior;
2. introduce a builder-facing facade and migrate callers incrementally.

Behavioral policy changes such as URL validation, duplicate handling, or canonical integer formatting should not be bundled into the core structural refactor unless they are explicitly chosen and locked by tests first. 

## Goals

* Reduce duplication in `records.mjs`.
* Preserve the existing fail-fast normalization seam.
* Replace builder dependence on many individual reader helpers with one coherent reader surface.
* Keep the resulting design ready for a later schema-driven extractor.
* Strengthen behavior coverage with BDD, DDT, and targeted PBT.

## Non-Goals

This change should not:

* introduce a full declarative field-schema system;
* merge record reading with relation validation or pending-revision policy;
* change public normalization behavior accidentally;
* expand RDF validation into SHACL or a broader schema-validation system;
* redesign graph builders beyond what is required to consume the new facade.

## Success Criteria

This phase is complete when all of the following are true:

* `records.mjs` uses shared generic reader primitives internally;
* builders consume a record-reader facade instead of a flat set of injected reader functions;
* the compatibility layer has been removed;
* the full bibliography suite passes;
* behavior changes, if any, are deliberate, test-locked, and called out explicitly.

## Design Constraints

* Preserve current semantics by default.
* Prefer small reversible steps.
* Keep builders focused on domain composition rather than RDF extraction mechanics.
* Keep context boundaries explicit:

  * record reading
  * relation validation
  * run metadata such as `sourceLabel` and abort state

## Implementation Plan

### 1. Freeze the current normalization contract

Before changing production code, expand tests so the current behavior is explicit and difficult to regress.

Focus on the normalization boundary in `records.mjs`, especially:

* optional scalar reads;
* many-value reads;
* scalar cardinality failures;
* term-type mismatches;
* integer parsing behavior;
* type extraction and required `rdf:type`;
* usage-tag extraction.

At this stage, do not change implementation. The point is to turn the current module behavior into an executable contract.

### 2. Unify accessor internals behind generic primitives

Refactor `records.mjs` so all specialized readers are built on top of two internal primitives:

* `optionalOne(record, predicate, { termType, map })`
* `many(record, predicate, { termType, map })`

These primitives should handle:

* predicate lookup;
* scalar cardinality enforcement where applicable;
* term-type validation;
* optional value behavior;
* value mapping.

Rebuild the existing exported helpers on top of those primitives, including:

* `scalarLiteral`
* `scalarUrlLiteral` or its eventual replacement
* `scalarUrlRef`
* `scalarInteger`
* `namedRefs`
* `getNodeTypes`
* `getUsageTagLiterals`

Also add a shared “many literals” path so `getUsageTagLiterals` no longer performs its own one-off validation flow.

This step should be behavior-preserving. Do not rename accessors or change policies yet.

### 3. Fix local type-safety gaps in the reader layer

While unifying internals, fix the existing JSDoc typing/cast weakness around `expectTermType` so the reader layer remains statically helpful rather than becoming a typed façade over loosely checked internals.

This is part of the refactor, not a separate enhancement, because the generic primitives will otherwise amplify any unsound local typing.

### 4. Introduce a builder-facing record-reader facade

Add a dedicated facade object that groups record-reading operations into one coherent surface.

The facade should be created in `catalog-builder.mjs` and passed to builders through context. It should expose only record-reading concerns and should not absorb relation validation, pending-revision logic, or other builder orchestration responsibilities.

Target shape:

* `reader.scalarLiteral(...)`
* `reader.scalarInteger(...)`
* `reader.scalarUrlRef(...)`
* `reader.namedRefs(...)`
* `reader.getNodeTypes(...)`
* and similar reader operations

Do not overdesign the facade. It should mostly be a cohesive boundary, not a new policy layer.

### 5. Validate the seam with one pilot builder

Migrate one builder first.

Choose a builder that is representative enough to exercise both scalar and many-value reads, but small enough that the migration remains easy to reason about. The purpose of this step is to validate the facade shape and context split before broader adoption.

During this step:

* keep existing helper injection temporarily available;
* migrate only one builder to the new reader facade;
* confirm that test readability and builder ergonomics improve rather than degrade.

If the pilot reveals a flaw in the facade shape, fix the facade before migrating anything else.

### 6. Migrate the remaining builders

Once the pilot builder proves the seam, migrate the remaining graph builders to the facade.

Keep each migration narrow:

* replace flat reader helper usage with facade calls;
* leave unrelated builder logic untouched;
* rely on existing builder tests plus one or two focused integration checks where needed.

After all builders have migrated, remove the legacy function-by-function reader injection from context.

### 7. End at a stable architectural boundary

The final state of this phase should be:

* generic primitives inside `records.mjs`;
* stable exported accessors;
* a builder-facing reader facade;
* no temporary compatibility path;
* builders insulated from low-level reader implementation details.

The code should be positioned so a later schema-driven field extractor can be introduced without having to rework builder context again.

## Deferred or Explicitly-Gated Policy Decisions

The original plan mixed architectural refactoring with several semantic decisions. Those should be handled more carefully. 

Treat the following as explicit decision points rather than casual refactor details:

### URL semantics

Decide whether `scalarUrlLiteral` means:

* “just a literal string that some caller interprets as a URL later”, or
* “a URL-valued literal validated or normalized at the accessor boundary”.

Do not change this accidentally during the facade refactor. Either preserve the existing behavior for this phase, or lock a new behavior with dedicated tests and perform the rename or validation intentionally.

### Duplicate handling

Decide whether duplicates in grouped RDF input are:

* meaningful and must be preserved; or
* noise and should be de-duplicated while preserving insertion order.

Do not silently add de-duplication during internal reader unification. That is a contract decision, not a mechanical cleanup.

### Integer lexical policy

Decide whether forms such as `"01"` are acceptable integer literals.

Again, this should be a deliberate policy choice backed by tests, not a side effect of regex and `Number(...)`.

### Hidden policy constants

Replace inline sentinels such as `Number.MAX_SAFE_INTEGER` with named constants such as `UNORDERED_RECORD_INDEX`, but keep this as a readability improvement rather than a semantic change.

## Test Plan

### BDD coverage

Add behavior-first suites that read like contracts, especially for:

* `scalarInteger`
* `getNodeTypes`
* `getUsageTagLiterals`
* URL-related accessor behavior
* generic optional-one and many-reader behavior, if those helpers become unit-testable

Cover at least:

* missing value
* one valid value
* multiple values for scalar readers
* wrong RDF term type
* malformed integer lexical form
* unsafe integer
* required-type absence for `getNodeTypes`
* duplicate handling, if policy changes
* URL behavior, once policy is chosen

### DDT coverage

Use DDT where the assertion shape is identical and repetition would otherwise dominate the suite.

Good DDT candidates:

* optional scalar readers across term type and multiplicity
* many-value readers across homogeneous valid values and mixed invalid inputs
* duplicate-handling matrices, if duplicate policy changes

Keep names explicit so failure output stays readable.

### PBT coverage

Add targeted `fast-check` coverage only for stable normalization invariants.

Good candidates:

* safe integer strings round-trip through `scalarInteger`
* `namedRefs` preserves input order while mapping through `compactId`
* mixed invalid term arrays fail when a non-conforming term appears

Keep PBT out of builder rendering and orchestration logic.

### Integration coverage

Add one focused integration test for the pilot builder and retain existing catalog-builder and graph-builder suites as the main migration safety net.

After the pilot succeeds, rely mostly on existing integration coverage plus narrowly targeted regression tests where the context shape changed.

## Execution Phases

### ~~Phase 1: Lock current behavior~~

* Add missing BDD and DDT coverage.
* No production refactor yet.
* Encode duplicate-policy gaps as explicit red-by-design cases in the reader suite so the contract is visible before Phase 2 implementation.
* Exit criterion: current behavior is encoded in tests.

### Phase 2: Internal reader unification

* Implement `optionalOne` and `many`.
* Route existing exports through them.
* Fix reader-layer typing issues.
* Exit criterion: all tests remain green with no intended behavior change.

### Phase 3: Reader facade pilot

* Introduce the facade in builder context.
* Migrate one builder.
* Add one focused integration test.
* Exit criterion: the pilot proves the context shape is sound.

### Phase 4: Full migration

* Migrate remaining builders.
* Remove flat helper injection.
* Exit criterion: all builders use the facade.

### Phase 5: Optional policy follow-up

Only if desired and explicitly scoped:

* rename or validate URL literal accessors;
* define duplicate policy;
* define integer lexical policy.

This should be a follow-up change unless the team wants those semantics decided now.

## Public Interface Notes

* Preserve the current exported accessor API throughout the structural migration.
* Do not make public-facing naming changes during the facade introduction unless that rename is the explicit purpose of the change.
* The new builder-facing contract is the record-reader facade, not a larger builder super-context.
