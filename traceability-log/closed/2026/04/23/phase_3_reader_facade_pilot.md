# Phase 3: Reader Facade Pilot

## Summary

Introduce a builder-facing `reader` facade for bibliography catalog builders and migrate only the
`Reference` builder as the pilot.

The goal is to reduce context noise and prepare the builder layer for a cleaner Phase 4 migration,
without changing catalog semantics. The facade should be a thin, bound-source delegation layer over
the existing record accessors from `records.mjs`.

This phase intentionally keeps the compatibility path for non-pilot builders. `Person`,
`Organization`, `CreativeWork`, `LearningResource`, and `Usage` continue using the legacy flat reader
helpers until Phase 4.

## Design Goals

- Keep the `Reference` builder focused on graph-building decisions, not low-level record-access
  mechanics.
- Centralize source-bound read operations behind one cohesive facade.
- Preserve all existing validation, URL, duplicate, integer, relation, and pending-revision policies.
- Keep the migration incremental and reversible.
- Avoid introducing a large abstraction before proving the shape on one real builder.
- Preserve testability by making the facade factory injectable and easy to stub.

## Non-Goals

- Do not migrate all builders in Phase 3.
- Do not remove legacy context fields yet.
- Do not rename or remove public exports from `records.mjs`.
- Do not change validation semantics.
- Do not add normalization, coercion, fallback, or policy logic to the facade.
- Do not introduce a class hierarchy for readers.

## Proposed Module Shape

Prefer a small dedicated module instead of adding more logic directly to
`scripts/lib/bibliography/catalog-builder.mjs`.

Add:

```text
scripts/lib/bibliography/catalog-reader.mjs
```

or, if the project already groups builder support code elsewhere:

```text
scripts/lib/bibliography/catalog-builder-reader.mjs
```

The module should export one factory:

```js
export function createCatalogReader({ sourceLabel }) {
    return Object.freeze({
        scalarLiteral(record, predicate) {
            return scalarLiteral(record, predicate, sourceLabel);
        },

        scalarUrlLiteral(record, predicate) {
            return scalarUrlLiteral(record, predicate, sourceLabel);
        },

        scalarInteger(record, predicate) {
            return scalarInteger(record, predicate, sourceLabel);
        },

        namedRefs(record, predicate) {
            return namedRefs(record, predicate, sourceLabel);
        },

        getNodeTypes(record) {
            return getNodeTypes(record, sourceLabel);
        },

        getUsageTagLiterals(record) {
            return getUsageTagLiterals(record, sourceLabel);
        },
    });
}
```

Adjust the exact argument order to match the existing `records.mjs` accessors.

### Rationale

A factory with closures is enough here. A class would add ceremony without improving extensibility,
because the facade has no mutable state and no polymorphic behavior yet. `Object.freeze(...)` is a
small defensive measure that makes accidental mutation of the context reader fail earlier in tests.

## Reader Contract

The bound-source reader exposes only these methods:

```js
reader.scalarLiteral(record, predicate);
reader.scalarUrlLiteral(record, predicate);
reader.scalarInteger(record, predicate);
reader.namedRefs(record, predicate);
reader.getNodeTypes(record);
reader.getUsageTagLiterals(record);
```

Each method must:

- delegate to the existing accessor from `records.mjs`;
- pass the bound `sourceLabel`;
- preserve the original return type;
- preserve the original error behavior;
- add no semantic policy of its own.

Each method must not:

- validate graph-level relationships;
- decide whether a value is required or optional;
- coerce URL, integer, or relation values beyond existing accessor behavior;
- handle duplicate policies;
- handle pending revisions;
- call `abort`;
- access `recordsById`;
- know about node categories.

## Context Contract

Update `GraphBuilderContext` JSDoc so the context has two groups of concerns.

### Stable Context Concerns

Keep these as separate fields:

```js
{
  reader,
  recordsById,
  ensureNodeCategory,
  abort,
  sourceLabel,
}
```

`reader` handles source-bound record access.

`recordsById`, `ensureNodeCategory`, `abort`, and `sourceLabel` remain explicit because they are
not simple read operations. They represent graph lookup, graph validation, error reporting, and
diagnostic identity.

### Temporary Compatibility Fields

Keep the existing flat reader helper fields for untouched builders, but mark them as deprecated
or temporary in JSDoc:

```js
/**
 * Temporary compatibility accessors used by non-pilot builders.
 *
 * Phase 4 should migrate remaining builders to `reader` and remove these fields.
 */
```

Do not mark them as formally deprecated with tooling if that would create noisy warnings before
Phase 4. A plain JSDoc note is enough for this phase.

## Implementation Steps

### 1. Add the Reader Factory

Create the reader factory in a dedicated module.

Import the existing accessors from `records.mjs`.

Keep the factory small and pure:

- no graph state;
- no builder-specific logic;
- no validation policy;
- no hidden dependency on `recordsById`;
- no mutation.

### 2. Wire the Reader into Catalog Builder Context

In `catalog-builder.mjs`, create a bound reader once per source/catalog build context:

```js
const reader = createCatalogReader({ sourceLabel });
```

Then include it in the builder context passed to `buildReferenceNode`.

Keep all legacy flat helper fields in the same context for non-pilot builders.

### 3. Migrate `buildReferenceNode`

Update only `buildReferenceNode` to use:

```js
context.reader.scalarLiteral(...)
context.reader.scalarUrlLiteral(...)
context.reader.scalarInteger(...)
context.reader.namedRefs(...)
```

Do not migrate calls that are not reader responsibilities.

Keep these as direct context dependencies:

```js
context.recordsById;
context.ensureNodeCategory;
context.abort;
context.sourceLabel;
```

This makes the boundary explicit: `reader` reads RDF-derived values, while the builder still owns
reference-specific graph construction and validation.

### 4. Avoid Over-Generalizing Too Early

Do not introduce a generic `readRequired(...)`, `readOptional(...)`, `readRelation(...)`, or
`readDate(...)` abstraction in Phase 3.

Those may become useful after more builders are migrated, but adding them now risks encoding
`Reference`-specific needs into an allegedly generic reader.

### 5. Keep Builder Functions Short

While migrating `buildReferenceNode`, opportunistically extract very small local helpers only if
the function becomes harder to scan.

Good candidates:

```js
readReferenceScalars(context, record);
readReferenceRelations(context, record);
appendReferencePagination(node, fields);
```

Only extract if the helper has a clear contract and removes duplication. Avoid creating helpers for
single-use expressions that are already readable.

## Testing Strategy

### Unit Tests for the Reader Factory

Add focused tests for `createCatalogReader`.

Use BDD-style descriptions:

```text
suite("createCatalogReader", () => {
  describe("source binding", () => {
    test("delegates scalar literal reads with the bound source label", ...)
    test("delegates URL literal reads with the bound source label", ...)
    test("delegates integer reads with the bound source label", ...)
    test("delegates named reference reads with the bound source label", ...)
  })
})
```

These tests should verify delegation and source binding, not record accessor semantics. The accessor
semantics should remain covered by existing `records.mjs` tests.

If stubbing ESM imports is awkward, test through small representative Turtle records instead of
mocking internals. Prefer observable behavior over brittle module mocks.

### DDT for Facade Delegation

Use `test.each(...)` for methods that share the same assertion shape.

Example table:

```js
test.each([
  ["scalarLiteral", schema.name],
  ["scalarUrlLiteral", schema.url],
  ["scalarInteger", schema.pageStart],
  ["namedRefs", schema.author],
])("%s delegates using the bound source label", ...)
```

Keep `getNodeTypes` and `getUsageTagLiterals` separate if their argument shape differs.

### PBT Option

If the project already uses `fast-check`, add a small property-based test asserting that arbitrary
non-empty source labels are preserved by the facade.

If the project does not already use PBT, consider adding `fast-check` as a dev dependency only if
this repository is already moving toward PBT elsewhere. It is useful here, but not mandatory for
Phase 3.

Potential property:

```text
For any non-empty source label and supported reader method, the bound reader behaves identically to
calling the underlying accessor with that same source label.
```

Tradeoff: PBT improves confidence in source-label binding, but adding a new dependency for this
small phase may be excessive unless the project will use it broadly.

### Integration Test for the Pilot

Add one focused integration test through `buildCatalogArtifactFromTurtle`.

The Turtle input should build one reference containing:

- required `schema:name`;
- optional `schema:url`;
- `schema:datePublished`;
- `schema:pageStart`;
- `schema:pageEnd`;
- at least one `schema:author` or `schema:publisher` relation.

Assertions should verify the produced catalog artifact, not implementation details.

Recommended BDD shape:

```text
describe("Reference reader facade integration", () => {
  test("builds a reference through the bound-source reader facade", ...)
})
```

The test should prove that the migrated `Reference` builder still supports the complete pilot
surface.

### Existing Regression Tests

Keep existing reference relation-validation tests green.

Do not rewrite unrelated builder tests in this phase unless the context helper must be updated to
include `reader`.

## Test Helper Updates

Update graph-builder unit test context factories to include `reader`.

Prefer one shared helper:

```js
function createGraphBuilderTestContext(overrides = {}) {
    const sourceLabel = overrides.sourceLabel ?? "test-source.ttl";

    return {
        sourceLabel,
        reader: createCatalogReader({ sourceLabel }),
        recordsById: new Map(),
        ensureNodeCategory: vi.fn(),
        abort: vi.fn((message) => {
            throw new Error(message);
        }),
        ...legacyReaderCompatibilityFields(sourceLabel),
        ...overrides,
    };
}
```

This minimizes duplication and keeps Phase 4 easier: when legacy fields are removed, this helper
becomes the main place to update tests.

## Dependency Guidance

No new runtime dependency is needed.

Possible dev dependency:

- `fast-check`, only if PBT is already part of the project direction.

Avoid adding:

- a dependency injection framework;
- RDF-specific wrapper libraries;
- class-based mocking utilities;
- broad validation libraries.

This phase is about improving internal boundaries, not changing parsing or validation
infrastructure.

## Acceptance Criteria

Phase 3 is complete when:

- [x] `createCatalogReader` exists and delegates to existing `records.mjs` accessors.
- [x] The reader binds `sourceLabel` and exposes only the approved methods.
- [x] `buildReferenceNode` uses `context.reader` for reader operations.
- [x] Non-pilot builders continue working through legacy flat helper fields.
- [x] `GraphBuilderContext` JSDoc documents `reader`.
- [x] Legacy flat reader fields are clearly marked as temporary compatibility fields.
- [x] Existing reference relation-validation tests remain green.
- [x] A focused integration test proves that a `Reference` can be built through
      `buildCatalogArtifactFromTurtle` after the migration.
- [x] No semantic policy changes are introduced.

## Implementation Notes

- Added `scripts/lib/bibliography/catalog-reader.mjs` with a frozen, source-bound facade.
- Wired one reader instance per `buildCatalogArtifactFromTurtle(...)` call and passed it to the
  `Reference` builder context.
- Migrated only `buildReferenceNode`; other builders still use the temporary flat helper fields.
- Updated `getRequiredScalar(...)` to prefer `context.reader` when present so the reference name
  path also goes through the facade.
- Added `scripts/__tests__/bibliography-catalog-reader.test.ts`, including DDT coverage and the
  optional `fast-check` source-label preservation property because `fast-check` is already present.
- Added the focused reference integration test in
  `scripts/__tests__/build-bibliography-catalog.happy-path.test.ts`.

## Phase 4 Migration Checklist

Legacy flat reader fields remain in use outside the pilot:

- `Person`: `scalarLiteral`, `scalarUrlLiteral`.
- `Organization`: `scalarUrlLiteral`; required `schema:name` already works through
  `getRequiredScalar(...)` when a reader is provided.
- `CreativeWork`: `namedRefs`; required `schema:name` already works through
  `getRequiredScalar(...)` when a reader is provided.
- `LearningResource`: `scalarUrlLiteral`; required `schema:name` already works through
  `getRequiredScalar(...)` when a reader is provided.
- `Usage`: `namedRefs`, `getUsageTagLiterals`, `getNodeTypes`.

## Commands

Run the focused graph-builder tests:

```sh
pnpm vitest run scripts/__tests__/bibliography-catalog-builder.graph.test.ts
```

Run the catalog build regression suites:

```sh
pnpm vitest run \
  scripts/__tests__/build-bibliography-catalog.happy-path.test.ts \
  scripts/__tests__/build-bibliography-catalog.validation.test.ts
```

If a dedicated reader test file is added, include it explicitly:

```sh
pnpm vitest run scripts/__tests__/bibliography-catalog-reader.test.ts
```

## Assumptions

- Existing public accessor exports from `records.mjs` remain unchanged in Phase 3.
- The current accessor functions already centralize low-level record-read semantics.
- `sourceLabel` is still required for diagnostics.
- Phase 4 will migrate the remaining builders and remove the flat compatibility fields.
- The pilot should validate the facade shape before adding higher-level reader policies.

## Risks and Mitigations

### Risk: The facade becomes a policy dumping ground

Mitigation: keep the reader contract explicit. It only binds `sourceLabel` and delegates to
existing accessors.

### Risk: The context becomes more confusing during migration

Mitigation: document the context in two groups: stable concerns and temporary compatibility fields.

### Risk: Tests overfit the implementation

Mitigation: prefer integration tests and observable behavior. Use delegation-style tests only for
the source-binding contract.

### Risk: Phase 4 becomes too large

Mitigation: keep a migration checklist of all legacy flat fields used by each builder after Phase 3.
That checklist should be the starting point for Phase 4.

## Suggested Phase 4 Follow-Up

After the pilot is stable:

- migrate `Person`, `Organization`, `CreativeWork`, `LearningResource`, and `Usage`;
- remove legacy flat helper fields from `GraphBuilderContext`;
- collapse duplicated builder test context setup;
- consider whether the reader needs higher-level methods based on repeated patterns discovered
  across all migrated builders;
- only then decide whether abstractions like `requiredScalar(...)`, `optionalUrl(...)`, or
  `relationRefs(...)` are justified.
