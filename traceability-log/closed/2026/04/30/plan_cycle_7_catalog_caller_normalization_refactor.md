# [DONE] Cycle 7 Catalog Caller Normalization Refactor

## Summary

Refactor the catalog-backed bibliography path so `catalog-core.mjs` no longer builds final render-facing reference
objects inline.

Instead, the catalog caller should resolve graph-specific data and produce `ReferenceNormalizationInput` values that are
delegated to the shared normalizer in `normalize-reference.mjs`.

This cycle is intentionally narrow: it centralizes final normalization while preserving all observable catalog behavior.

## Status

Completed.

Implemented result:

- `src/lib/bibliography/catalog-core.mjs` now builds source-local normalization inputs and delegates final
  render-facing construction to `normalizeReference(...)`.
- Graph-specific concerns remain in the catalog caller, including linked-node lookup, author and publisher resolution,
  pending-only tolerance, and strict/non-strict behavior.
- `src/lib/bibliography/__tests__/catalog.test.ts` now includes a fallback-sensitive regression for `WebPage` and
  `VideoObject` hostname metadata derivation when no publisher is linked.
- Focused validation passed for catalog loading, shared normalization, and catalog-vs-ItemList equivalence.

## Goal

Make the catalog path and the ItemList/JSON-LD path share the same final reference normalization logic for:

- `Book`
- `WebPage`
- `VideoObject`
- `ScholarlyArticle`
- `Thesis`

## Non-goals

Do not change:

- graph traversal semantics;
- linked-node lookup;
- pending-only tolerance;
- strict vs non-strict behavior;
- usage grouping;
- ItemList parsing policy;
- generated bibliography artifacts;
- render component behavior;
- public reference output shapes.

## Invariants

After the refactor:

- catalog output must remain equivalent to the current behavior;
- catalog and ItemList outputs must still match for equivalent source data;
- graph-only responsibilities must remain in `catalog-core.mjs`;
- render-facing fallback rules must be owned by the shared normalizer when they are not graph-dependent;
- no caller should need to know how final `Normalized*Reference` objects are assembled.

## Design Direction

Keep `catalog-core.mjs` responsible for resolving catalog-local context:

- node IDs;
- linked nodes;
- authors;
- publishers;
- publications;
- institutions;
- pending references;
- strict/non-strict failure behavior.

Move only final reference-object construction to the shared normalization layer.

Recommended shape:

```ts
catalog node
  -> graph resolution in catalog-core.mjs
  -> ReferenceNormalizationInput
  -> normalizeReference(input)
  -> NormalizedReference
```

Keep the first extraction local to `catalog-core.mjs`. Extract a separate module only if the builders become large or
useful outside the catalog path.

## TDD Cycles

### Cycle 7.1 — Characterize the catalog edge before refactoring

Add or strengthen a focused regression in:

```text
src/lib/bibliography/__tests__/catalog.test.ts
```

Prefer a case that exercises shared-normalizer-sensitive behavior with modest fixture cost.

Best candidates:

1. `WebPage` with publisher metadata and URL fallback.
2. `VideoObject` with platform/location fallback.
3. `ScholarlyArticle` or `Thesis` only if publication/institution metadata is the highest-risk area.

Expected result:

- the test fails only if catalog-side final construction changes observable output;
- the test documents which behavior must survive delegation.

Run:

```bash
pnpm test:unit -- src/lib/bibliography/__tests__/catalog.test.ts
```

### Cycle 7.2 — Introduce catalog-to-normalization input builders

Inside:

```text
src/lib/bibliography/catalog-core.mjs
```

Add small pure helpers:

- `buildBaseReferenceInput(...)`
- `buildBookReferenceInput(...)`
- `buildWebPageReferenceInput(...)`
- `buildVideoReferenceInput(...)`
- `buildScholarlyArticleReferenceInput(...)`
- `buildThesisReferenceInput(...)`

Each helper should return data, not final render-facing objects.

Guidelines:

- keep helpers short;
- keep graph resolution outside the type-specific builders where possible;
- avoid duplicating fallback logic already present in `normalize-reference.mjs`;
- pass through catalog-only metadata explicitly.

Metadata to verify:

- `bookId`
- `publicationId`
- `institutionId`
- linked publication URL
- linked institution URL
- publisher name and URL
- platform/location-related fields
- `sourceLabel`

Run:

```bash
pnpm test:unit -- src/lib/bibliography/__tests__/catalog.test.ts
```

### Cycle 7.3 — Delegate final construction to the shared normalizer

Replace inline final object construction in `catalog-core.mjs` with calls to:

```text
src/lib/bibliography/normalize/normalize-reference.mjs
```

The catalog caller should now do this:

```ts
const input = buildReferenceInput(...)
return normalizeReference(input)
```

Do not remove old construction helpers yet unless the test suite is already green.

Run:

```bash
pnpm test:unit -- src/lib/bibliography/__tests__/catalog.test.ts
pnpm test:unit -- src/lib/bibliography/__tests__/reference-normalization-equivalence.test.ts
```

### Cycle 7.4 — Extend shared input types only where necessary

Update:

```text
src/lib/bibliography/normalize/normalize-reference-types.ts
```

only if the existing discriminated input union cannot represent catalog data without loss.

Rules:

- add fields only when they are required by current catalog behavior;
- prefer optional fields for catalog-only metadata;
- avoid encoding graph concepts in the shared normalizer;
- keep the shared input contract source-independent.

Good additions:

- `bookId?: string`
- `publicationId?: string`
- `institutionId?: string`
- `publicationUrl?: string`
- `institutionUrl?: string`

Risky additions:

- raw graph nodes;
- unresolved node IDs;
- pending-reference sentinels;
- strict-mode control flags.

Run:

```bash
pnpm test:unit -- src/lib/bibliography/__tests__/normalize-reference.test.ts
pnpm test:unit -- src/lib/bibliography/__tests__/catalog.test.ts
pnpm test:unit -- src/lib/bibliography/__tests__/reference-normalization-equivalence.test.ts
```

### Cycle 7.5 — Remove dead catalog construction helpers

Once delegation is green, remove catalog-side helpers whose only job was assembling final `Normalized*Reference`
objects.

Keep helpers that are still graph-specific, such as:

- `resolveNodeId`
- `resolveAuthors`
- `resolveLinkedTitle`
- linked-node lookup helpers
- pending-tolerance helpers
- strict/non-strict error helpers

After deletion, re-run the focused tests.

```bash
pnpm test:unit -- src/lib/bibliography/__tests__/catalog.test.ts
pnpm test:unit -- src/lib/bibliography/__tests__/reference-normalization-equivalence.test.ts
```

### Cycle 7.6 — Render regression only if needed

Run the render suite only if unit/equivalence tests reveal a render-facing drift, or if the refactor touches fallback
fields consumed directly by components.

```bash
pnpm test:astro -- src/components/ui/references/__tests__/ReferencesFromCatalog.render.test.ts
```

## Implementation Checklist

### Catalog caller

File:

```text
src/lib/bibliography/catalog-core.mjs
```

- [ ] Identify all places where final `Normalized*Reference` objects are constructed.
- [ ] Separate graph resolution from final object assembly.
- [ ] Add base and type-specific input builders.
- [ ] Delegate final construction to `normalizeReference(...)`.
- [ ] Remove dead final-construction helpers.
- [ ] Keep graph-only helpers local.

### Shared normalizer

Files:

```text
src/lib/bibliography/normalize/normalize-reference.mjs
src/lib/bibliography/normalize/normalize-reference-types.ts
```

- [ ] Confirm every supported catalog kind maps to a shared input variant.
- [ ] Add only missing source-independent input fields.
- [ ] Preserve existing fallback behavior.
- [ ] Avoid adding catalog traversal concepts to shared normalization.

### Tests

Files:

```text
src/lib/bibliography/__tests__/catalog.test.ts
src/lib/bibliography/__tests__/normalize-reference.test.ts
src/lib/bibliography/__tests__/reference-normalization-equivalence.test.ts
```

- [ ] Add one focused catalog regression before refactoring.
- [ ] Keep shared normalizer tests focused on pure input/output behavior.
- [ ] Keep equivalence tests as the broad parity lock.
- [ ] Avoid brittle snapshot-style assertions unless output shape is intentionally locked.

## Preferred Regression Test Targets

Use DDT where it reduces duplication without hiding intent.

Suggested catalog regression matrix:

| Kind               | Behaviour to lock                   | Why                                                 |
| ------------------ | ----------------------------------- | --------------------------------------------------- |
| `WebPage`          | publisher metadata and URL fallback | Low fixture cost, high fallback sensitivity         |
| `VideoObject`      | platform/location fallback          | Exercises shared render-facing derivation           |
| `ScholarlyArticle` | publication metadata                | Higher risk, but more setup                         |
| `Thesis`           | institution metadata                | Higher risk, useful if institution fallback changed |
| `Book`             | `bookId`, title, authors, pages     | Basic path, but likely already covered              |

Start with `WebPage` or `VideoObject`.

## Validation Gate

Run in this order:

```bash
pnpm test:unit -- src/lib/bibliography/__tests__/catalog.test.ts
```

```bash
pnpm test:unit -- src/lib/bibliography/__tests__/normalize-reference.test.ts
```

```bash
pnpm test:unit -- src/lib/bibliography/__tests__/reference-normalization-equivalence.test.ts
```

Then, only if needed:

```bash
pnpm test:astro -- src/components/ui/references/__tests__/ReferencesFromCatalog.render.test.ts
```

Fallback gate:

```bash
pnpm vitest run src/lib/bibliography
```

Final project gate, if this is going into a merge request:

```bash
pnpm test:unit
pnpm test:astro
pnpm exec tsc --noEmit
pnpm run check
```

## Risks and Mitigations

### Risk: graph-specific logic leaks into the shared normalizer

Mitigation:

Keep unresolved nodes, pending references, and strict-mode decisions in `catalog-core.mjs`. The shared normalizer should
receive already-resolved scalar/structured data.

### Risk: fallback behavior is duplicated

Mitigation:

Only derive fallback values in `catalog-core.mjs` when the fallback requires graph lookup. Otherwise delegate fallback
derivation to `normalize-reference.mjs`.

### Risk: input types become catalog-specific

Mitigation:

Name fields after reference-domain concepts, not catalog implementation concepts.

Prefer:

```ts
publicationId?: string
institutionUrl?: string
```

Avoid:

```ts
publicationNodeId?: string
rawCatalogInstitutionNode?: unknown
```

### Risk: refactor changes output ordering or grouping

Mitigation:

Do not touch usage grouping, traversal order, or catalog list assembly in this cycle.

### Risk: tests pass but render behavior drifts

Mitigation:

Run the render test if any changed field is consumed by `ReferencesFromCatalog`.

## Definition of Done

This cycle is complete when:

- `catalog-core.mjs` delegates final reference construction to the shared normalizer;
- graph traversal and linked-node resolution remain catalog-local;
- all five supported kinds still pass catalog/ItemList equivalence;
- dead catalog-side final-construction helpers are removed;
- focused catalog regression coverage exists for at least one fallback-sensitive case;
- the traceability log is updated.

## Files

Primary implementation:

```text
src/lib/bibliography/catalog-core.mjs
src/lib/bibliography/normalize/normalize-reference.mjs
src/lib/bibliography/normalize/normalize-reference-types.ts
```

Primary tests:

```text
src/lib/bibliography/__tests__/catalog.test.ts
src/lib/bibliography/__tests__/normalize-reference.test.ts
src/lib/bibliography/__tests__/reference-normalization-equivalence.test.ts
```

Secondary tests:

```text
src/components/ui/references/__tests__/ReferencesFromCatalog.render.test.ts
```

Traceability:

```text
traceability-log/plan_phase_2_centralize_reference_normalization.md
```

## Traceability Update

After the implementation is green, update the Cycle 7 section with:

- what moved to shared normalization;
- which behaviours stayed in `catalog-core.mjs`;
- which regression was added;
- which validation commands passed;
- any intentionally deferred cleanup.
