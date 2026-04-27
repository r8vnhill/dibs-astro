# Phase 4: Full Reader Facade Migration

## Summary

Complete the migration from flat record-reader helper injection to the source-bound
`createCatalogReader(...)` facade across the bibliography catalog builder.

This phase makes `reader` the only builder-facing record-reading boundary. It removes the temporary
compatibility fields introduced during the pilot, simplifies `GraphBuilderContext`, and keeps
record access consistent across all graph builders.

The migration must preserve existing behavior. It must not rename the low-level accessors in
`records.mjs`, change URL/integer/duplicate handling, alter relation validation, or introduce
higher-level schema extraction policies.

## Design Goals

- Make record reads flow through one explicit abstraction: `context.reader`.
- Keep graph-building logic separate from RDF record-access mechanics.
- Remove temporary compatibility paths after the `Reference` pilot.
- Keep `GraphBuilderContext` smaller and easier to reason about.
- Improve test setup by eliminating duplicated flat helper wiring.
- Preserve semantic behavior exactly.
- Keep the reader facade thin, source-bound, and policy-free.

## Non-Goals

- Do not change catalog output.
- Do not change validation semantics.
- Do not introduce required/optional schema extractors yet.
- Do not move relation validation into the reader.
- Do not rename or remove public exports from `records.mjs`.
- Do not add runtime dependencies.
- Do not convert builders to classes.

## Final Reader Contract

Keep `createCatalogReader({ sourceLabel })` as the only builder-facing record reader.

The facade exposes:

```js
reader.scalarLiteral(record, predicate)
reader.scalarUrlLiteral(record, predicate)
reader.scalarInteger(record, predicate)
reader.namedRefs(record, predicate)
reader.getNodeTypes(record)
reader.getUsageTagLiterals(record)
```

Each method must:

- delegate to the existing accessor from `records.mjs`;
- bind `sourceLabel`;
- preserve return values;
- preserve existing error behavior;
- stay free of graph-level policy.

Each method must not:

- validate relations;
- decide requiredness;
- inspect `recordsById`;
- call `abort`;
- normalize values beyond existing accessor behavior;
- manage pending-revision decisions;
- create graph nodes.

## Final `GraphBuilderContext` Contract

After this phase, builder context should contain only stable concerns:

```js
{
  reader,
  recordsById,
  ensureNodeCategory,
  abort,
  sourceLabel,
  skippedPendingNodeIds,
}
```

Remove these temporary compatibility fields from the context:

```js
scalarLiteral
scalarUrlLiteral
scalarInteger
namedRefs
getUsageTagLiterals
getNodeTypes
```

Update `GraphBuilderContext` JSDoc so `reader` is required for all record reads.

Recommended documentation shape:

```js
/**
 * Context shared by bibliography graph builders.
 *
 * @property {CatalogReader} reader Source-bound record reader used by builders
 * to access scalar literals, URL literals, integer literals, node types, usage
 * tags, and named references.
 * @property {Map<string, object>} recordsById RDF records indexed by node id.
 * @property {(nodeId: string, expectedCategory: string) => void} ensureNodeCategory
 * Ensures that a referenced node belongs to the expected graph category.
 * @property {(message: string) => never} abort Fails catalog construction with
 * a source-aware diagnostic.
 * @property {string} sourceLabel Human-readable source label used in diagnostics.
 * @property {Set<string>} skippedPendingNodeIds Node ids skipped because they
 * are pending revisions.
 */
```

## Migration Order

Migrate in a low-risk order from simplest builders to the more policy-adjacent paths:

1. `Person`
2. `Organization`
3. `LearningResource`
4. `CreativeWork`
5. `Usage`
6. pending-revision/top-level catalog reads
7. shared graph helper cleanup
8. context contract cleanup

This order keeps the highest-risk paths—`Usage`, pending revisions, and shared helpers—until after
the straightforward builder migrations have proven the facade shape.

## Implementation Plan

### 1. Strengthen the Reader Type Documentation

Add a local JSDoc typedef for the reader facade if it does not already exist.

```js
/**
 * Source-bound reader facade for RDF-derived bibliography records.
 *
 * The reader is intentionally policy-free. It only delegates to low-level record
 * accessors while binding the current source label.
 *
 * @typedef {object} CatalogReader
 * @property {(record: object, predicate: string) => string | undefined} scalarLiteral
 * @property {(record: object, predicate: string) => string | undefined} scalarUrlLiteral
 * @property {(record: object, predicate: string) => number | undefined} scalarInteger
 * @property {(record: object, predicate: string) => string[]} namedRefs
 * @property {(record: object) => string[]} getNodeTypes
 * @property {(record: object) => string[]} getUsageTagLiterals
 */
```

Adjust the exact return types to match the current accessors.

### 2. Migrate Simple Builders First

Update `Person` and `Organization` builders to use:

```js
context.reader.scalarLiteral(...)
context.reader.scalarUrlLiteral(...)
context.reader.namedRefs(...)
```

Only replace direct record-reader access. Do not restructure builder logic unless it removes clear
duplication.

### 3. Migrate `LearningResource` and `CreativeWork`

Replace flat helper access with `context.reader`.

Watch for duplicated scalar extraction patterns. If the same group of fields is repeatedly read,
consider a small local helper such as:

```js
function readCreativeWorkFields(reader, record) {
  return {
    name: reader.scalarLiteral(record, schema.name),
    url: reader.scalarUrlLiteral(record, schema.url),
    datePublished: reader.scalarLiteral(record, schema.datePublished),
  };
}
```

Keep helpers pure and small. Avoid introducing a broad schema extraction framework in this phase.

### 4. Migrate `Usage`

Migrate `Usage` carefully because it tends to combine several concerns:

- required lesson/reference reads;
- required usage tags;
- relation validation;
- pending-revision skip behavior.

Use `reader` only for record reads:

```js
const lessonRefs = context.reader.namedRefs(record, predicates.lesson);
const referenceRefs = context.reader.namedRefs(record, predicates.reference);
const usageTags = context.reader.getUsageTagLiterals(record);
```

Keep validation outside the reader:

```js
ensureRequiredRefs(...)
ensureUsageTags(...)
context.ensureNodeCategory(...)
```

This prevents the facade from becoming a mixed read-and-validation abstraction.

### 5. Migrate Pending-Revision Reads

Change `collectPendingRevisionState(...)` so it receives either the whole context or a narrow reader
dependency.

Prefer the narrower dependency:

```js
function collectPendingRevisionState({ recordsById, reader, sourceLabel }) {
  // ...
}
```

or:

```js
function collectPendingRevisionState(recordsById, reader, sourceLabel) {
  // ...
}
```

Prefer the object-parameter form if the function already takes several arguments. It is easier to
extend and less error-prone than positional parameters.

Do not pass individual reader methods:

```js
collectPendingRevisionState({
  getNodeTypes,
  getUsageTagLiterals,
  namedRefs,
})
```

That recreates the flat-helper problem under a different name.

### 6. Update Shared Graph Helpers

Update shared graph helpers so they require `context.reader`.

Before:

```js
function readRequiredScalar(context, record, predicate) {
  return context.scalarLiteral(record, predicate);
}
```

After:

```js
function readRequiredScalar(context, record, predicate) {
  return context.reader.scalarLiteral(record, predicate);
}
```

Do not keep fallback logic such as:

```js
context.reader?.scalarLiteral(...) ?? context.scalarLiteral(...)
```

Fallbacks should disappear in Phase 4. Keeping them would make the migration incomplete and hide
misconfigured test contexts.

### 7. Remove Flat Helper Injection

In `catalog-builder.mjs`, stop passing these into graph builder contexts:

```js
scalarLiteral
scalarUrlLiteral
scalarInteger
namedRefs
getUsageTagLiterals
getNodeTypes
```

Create one reader per source-bound build context:

```js
const reader = createCatalogReader({ sourceLabel });
```

Then pass:

```js
const context = {
  reader,
  recordsById,
  ensureNodeCategory,
  abort,
  sourceLabel,
  skippedPendingNodeIds,
};
```

### 8. Remove Compatibility Documentation

Remove all JSDoc references to temporary flat reader fields.

The final documented contract should make it impossible to infer that builders may still use flat
accessors.

### 9. Search for Legacy Usage

Before closing the phase, search for all legacy field names.

Suggested checks:

```sh
rg "context\.(scalarLiteral|scalarUrlLiteral|scalarInteger|namedRefs|getUsageTagLiterals|getNodeTypes)" scripts
rg "\b(scalarLiteral|scalarUrlLiteral|scalarInteger|namedRefs|getUsageTagLiterals|getNodeTypes):" scripts/lib scripts/__tests__
```

Expected remaining matches should be limited to:

- `records.mjs` exports;
- `catalog-reader.mjs` imports/delegation;
- reader-factory tests;
- possibly direct low-level record accessor tests.

## Refactoring Guidance

### Keep Functions Small

When a migrated builder becomes harder to scan, extract helpers around coherent concepts:

Good candidates:

```js
readPersonFields(reader, record)
readOrganizationFields(reader, record)
readCreativeWorkScalars(reader, record)
readUsageRelations(reader, record)
appendUsageTags(node, tags)
```

Avoid helpers that merely wrap one line:

```js
function readName(reader, record) {
  return reader.scalarLiteral(record, schema.name);
}
```

### Prefer Object Parameters for Multi-Concern Helpers

For helpers with more than two or three dependencies, prefer:

```js
function buildUsageNode({ record, context, node }) {
  // ...
}
```

over long positional parameter lists.

This reduces call-site errors and improves future extensibility.

### Keep the Reader General

Do not add methods like:

```js
reader.referenceTitle(...)
reader.personName(...)
reader.requiredScalar(...)
reader.optionalDate(...)
```

Those encode builder policy into the reader. If repeated patterns appear after the full migration,
capture them later in a separate schema-extraction layer.

### Consider a Future Schema Extraction Layer

After Phase 4, it may be worth introducing a separate layer such as:

```js
extractReferenceFields(reader, record)
extractPersonFields(reader, record)
extractUsageFields(reader, record)
```

That layer would be allowed to know about schema-level field groups, while `reader` remains a
low-level, source-bound accessor facade.

Do not implement that in Phase 4 unless the migration reveals severe duplication.

## Dependency Guidance

No new runtime dependency is needed.

Potential dev dependency:

- `fast-check`, only if the project already uses or plans to use property-based testing across the
  catalog pipeline.

Avoid adding:

- dependency injection frameworks;
- class-based mocking libraries;
- RDF abstraction libraries;
- broad validation libraries.

The current problem is architectural boundary cleanup, not parsing or validation capability.

## Test Plan

### 1. Update Test Context Helpers

Update graph-builder test helpers to provide only `reader` for record reads.

Recommended helper:

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
    skippedPendingNodeIds: new Set(),
    ...overrides,
  };
}
```

Remove compatibility helper fields from test contexts. Tests should fail loudly if a builder still
uses the old flat helper path.

### 2. Keep Reader Factory Tests

Keep the existing reader-factory tests as the facade delegation contract.

Coverage should verify:

- scalar literal delegation;
- URL literal delegation;
- integer delegation;
- named reference delegation;
- node type delegation;
- usage tag delegation;
- bound `sourceLabel` behavior.

### 3. Add Builder Regression Coverage

Add or update focused regression tests for each migrated builder only where existing coverage is
thin.

Suggested BDD structure:

```js
describe("Person graph builder", () => {
  test("reads scalar fields through the source-bound reader facade", ...)
})

describe("Organization graph builder", () => {
  test("reads scalar and URL fields through the source-bound reader facade", ...)
})

describe("Usage graph builder", () => {
  test("builds required lesson and reference relations through the reader facade", ...)
  test("preserves required usage tag validation", ...)
  test("preserves pending-revision skip behavior", ...)
})
```

Do not assert that `reader.scalarLiteral` was called unless the project already uses spies for this.
Prefer output-oriented assertions.

### 4. Use DDT for Repeated Builder Matrices

Use `test.each(...)` for builders that share the same contract shape.

Good candidates:

```js
test.each([
  ["Person", personTurtle, expectedPersonNode],
  ["Organization", organizationTurtle, expectedOrganizationNode],
])("%s reads common scalar fields through the reader facade", ...)
```

Use DDT only when the assertion shape is genuinely the same. Keep specialised behavior in named
tests.

### 5. Consider PBT for Source Binding

If `fast-check` is already available, add a property test for source-label binding.

Example property:

```text
For any non-empty source label, a reader created with that label behaves the same
as calling the underlying accessor with that source label.
```

Keep this at the reader-factory level, not the builder level.

### 6. Integration Regression

Keep or add an integration test through `buildCatalogArtifactFromTurtle` that exercises multiple
builder types in one Turtle input.

The fixture should include:

- one `Person`;
- one `Organization`;
- one `CreativeWork` or `LearningResource`;
- one `Reference`;
- one `Usage`;
- at least one pending-revision node.

Assertions should verify the final catalog artifact and pending-skip behavior.

## Commands

Run focused graph-builder tests:

```sh
pnpm vitest run scripts/__tests__/bibliography-catalog-builder.graph.test.ts
```

Run reader-factory tests:

```sh
pnpm vitest run scripts/__tests__/bibliography-catalog-reader.test.ts
```

Run catalog happy-path and validation regressions:

```sh
pnpm vitest run \
  scripts/__tests__/build-bibliography-catalog.happy-path.test.ts \
  scripts/__tests__/build-bibliography-catalog.validation.test.ts
```

Run the full bibliography/catalog suite before closing:

```sh
pnpm vitest run scripts/__tests__
```

If the repository has a narrower bibliography-only pattern, prefer that over the full script test
directory.

## Acceptance Criteria

Phase 4 is complete when:

- all graph builders use `context.reader` for record reads;
- no builder reads from flat helper fields;
- `catalog-builder.mjs` no longer injects flat reader helpers into builder context;
- `GraphBuilderContext` documents `reader` as required;
- temporary compatibility fields are removed from code and docs;
- `collectPendingRevisionState(...)` receives `reader` instead of individual accessor functions;
- shared graph helpers require `context.reader` directly;
- existing catalog output remains unchanged;
- relation validation remains outside the reader;
- pending-revision behavior remains unchanged;
- focused and full bibliography/catalog regression suites pass.

## Implementation Notes

- Completed the full builder migration to `context.reader` for `Person`, `Organization`,
  `CreativeWork`, `Reference`, `LearningResource`, and `Usage`.
- Removed flat reader helper injection from `catalog-builder.mjs` builder contexts and from
  graph-builder test contexts.
- Migrated pending-revision collection to accept `{ recordsByIri, reader }`, preserving the
  existing pruning behavior while avoiding individual accessor injection.
- Included the optional boundary cleanup for relation validation: `ensureNodeCategory(...)` now
  receives the source-bound reader and uses `reader.getNodeTypes(...)` for category checks.
- Updated `GraphBuilderContext` JSDoc with a required `CatalogReader` contract and removed the
  temporary compatibility-field documentation.
- Verified the legacy-context search:

```sh
rg 'context\.(scalarLiteral|scalarUrlLiteral|scalarInteger|namedRefs|getUsageTagLiterals|getNodeTypes)' scripts
rg '\b(scalarLiteral|scalarUrlLiteral|scalarInteger|namedRefs|getUsageTagLiterals|getNodeTypes):' scripts/lib scripts/__tests__
```

Both searches returned no matches.

## Verification

Passed:

```sh
pnpm vitest run scripts/__tests__/bibliography-catalog-builder.graph.test.ts
pnpm vitest run scripts/__tests__/bibliography-catalog-reader.test.ts
pnpm vitest run scripts/__tests__/build-bibliography-catalog.happy-path.test.ts scripts/__tests__/build-bibliography-catalog.validation.test.ts scripts/__tests__/build-bibliography-catalog.pending-revision.test.ts
pnpm vitest run scripts/__tests__/build-bibliography-catalog.pbt.test.ts
pnpm vitest run scripts/__tests__
```

## Risks and Mitigations

### Risk: Reader absorbs validation policy

Mitigation: keep the reader API fixed during Phase 4. Any requiredness, relation validation, or
pending-revision logic must stay in builders or graph helpers.

### Risk: Migration leaves hidden fallback paths

Mitigation: remove all fallback logic and run `rg` checks for legacy context fields.

### Risk: Tests continue passing despite incomplete migration

Mitigation: update test context helpers to omit flat helper fields entirely. Any old builder access
should fail immediately.

### Risk: Pending-revision code becomes harder to follow

Mitigation: migrate it to accept `reader`, but do not otherwise redesign pending-revision behavior
in this phase.

### Risk: Over-generalization during cleanup

Mitigation: only extract helpers around repeated, coherent field groups. Defer schema extraction
until after all builders are migrated and duplication is visible.

## Suggested Phase 5 Follow-Up

After the full migration is complete, evaluate whether a higher-level extraction layer is justified.

Possible Phase 5 goals:

- introduce builder-specific field extractors;
- consolidate repeated required-scalar and required-relation validation;
- reduce duplicated Turtle fixtures in tests;
- add broader DDT matrices for common schema field contracts;
- add PBT around source-label diagnostics and unsupported record shapes;
- document the final catalog builder architecture.
