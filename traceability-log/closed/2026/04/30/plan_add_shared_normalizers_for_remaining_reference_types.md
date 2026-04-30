# [DONE] Add Shared Normalizers for Remaining Reference Types

## Summary

Rebaseline cycles 3–5 around the current implementation state. The shared normalization core currently covers `Book`,
while `WebPage`, `VideoObject`, `ScholarlyArticle`, and `Thesis` are still constructed inline in the JSON-LD/catalog
normalization paths. The existing equivalence suite should therefore be treated as regression/characterization coverage,
not as the main red test for these cycles.

This slice added typed, source-independent shared normalizers for:

- `VideoObject`
- `ScholarlyArticle`
- `Thesis`

Caller rewiring in `normalize-jsonld.ts` and `catalog-core.mjs` remains intentionally deferred to the next planning
slice, because that changes extraction boundaries and should have its own tests.

## Outcome

Implemented in:

- `src/lib/bibliography/normalize/normalize-reference-types.ts`
- `src/lib/bibliography/normalize/normalize-reference.mjs`
- `src/lib/bibliography/__tests__/normalize-reference.test.ts`

Delivered behavior:

- added source-independent shared input contracts for `VideoObject`, `ScholarlyArticle`, and `Thesis`;
- added `normalizeVideoReference`, `normalizeScholarlyArticleReference`, and `normalizeThesisReference`;
- extended `normalizeReference(...)` to support all currently shared kinds;
- added direct shared-normalizer tests for the three new kinds, including fallback behavior and dispatcher coverage.

Explicitly not included:

- `WebPage` migration;
- caller rewiring in `normalize-jsonld.ts`;
- caller rewiring in `catalog-core.mjs`.

## Goals

- Extend the shared normalization module without changing observable bibliography behavior.
- Keep source-specific parsing outside the shared core.
- Preserve all existing normalized reference shapes.
- Add focused direct tests for each new shared normalizer.
- Keep the equivalence suite green as characterization coverage.

## Non-goals

- Do not migrate `WebPage` in this slice.
- Do not rewire `normalize-jsonld.ts` or `catalog-core.mjs` to call the new normalizers yet.
- Do not move graph lookup, ItemList traversal, strict/non-strict handling, or pending-only tolerance into the shared
  normalizer.
- Do not introduce new dependencies.

## Design Constraints

The shared normalizer should receive already-resolved, source-independent data.

It should not know about:

- JSON-LD graph traversal
- ItemList nodes
- lookup maps
- catalog loading mode
- strict/non-strict parse policy
- pending-only tolerance
- fallback source-specific heuristics beyond final field normalization

The normalizer may perform final object construction, fallback URL assignment, and field passthrough.

## Target Files

- `src/lib/bibliography/normalize/normalize-reference.mjs`
- `src/lib/bibliography/normalize/normalize-reference-types.ts`
- `src/lib/bibliography/__tests__/normalize-reference.test.ts`
- `src/lib/bibliography/__tests__/reference-normalization-equivalence.test.ts`
- `src/lib/bibliography/pages.ts`

Deferred to next slice:

- `src/lib/bibliography/normalize-jsonld.ts`
- `src/lib/bibliography/catalog-core.mjs`

## Cycle 0: Rebaseline the Test Surface

### Red / Characterization Check

Run the current focused suites before editing:

```bash
pnpm vitest run src/lib/bibliography/__tests__/normalize-reference.test.ts
pnpm vitest run src/lib/bibliography/__tests__/reference-normalization-equivalence.test.ts
```

### Expected Result

- Existing shared-normalizer tests pass for `Book`.
- Equivalence tests pass because legacy inline constructors still preserve behavior.
- No caller migration is attempted yet.

### Rationale

This establishes the current behavior before adding new normalizer paths. The equivalence suite protects existing
behavior, while the direct shared-normalizer tests drive new API support.

## Cycle 1: Extend the Normalization Input Contract

### Red

Add type-level support for the remaining reference inputs in:

```text
src/lib/bibliography/normalize/normalize-reference-types.ts
```

Introduce:

- `VideoNormalizationInput`
- `ScholarlyArticleNormalizationInput`
- `ThesisNormalizationInput`

Then widen:

- `ReferenceNormalizationInput`

### Contract Shape

Keep a shared base input for common fields:

```ts
type BaseReferenceNormalizationInput = {
    id: string;
    rawType: string;
    title: string;
    description?: string;
    authors?: string[];
    datePublished?: string;
    keywords?: string[];
    publisherName?: string;
    publisherUrl?: string;
    sourceLabel?: string;
    url?: string;
};
```

Then add specific contracts:

```ts
type VideoNormalizationInput = BaseReferenceNormalizationInput & {
    kind: "VideoObject";
    platformName?: string;
    platformUrl?: string;
};

type ScholarlyArticleNormalizationInput = BaseReferenceNormalizationInput & {
    kind: "ScholarlyArticle";
    publicationName?: string;
    publicationUrl?: string;
    publicationId?: string;
    pages?: PageReference;
};

type ThesisNormalizationInput = BaseReferenceNormalizationInput & {
    kind: "Thesis";
    institutionName?: string;
    institutionUrl?: string;
    institutionId?: string;
};
```

Adjust field names to match the existing project types exactly.

### Green

Completed by widening the shared input union and exported function contracts in
`src/lib/bibliography/normalize/normalize-reference-types.ts`.

### Refactor

If the base contract duplicates the existing `BookNormalizationInput`, extract a shared base type. Keep the exported API
readable.

## Cycle 2: Add `VideoObject` Shared Normalization

### Red

Add direct tests in:

```text
src/lib/bibliography/__tests__/normalize-reference.test.ts
```

Cover:

1. `normalizeReference(...)` dispatches `kind: "VideoObject"`.
2. `normalizeVideoReference(...)` returns the existing `NormalizedVideoReference` shape.
3. `platformName` takes precedence over hostname-derived fallback.
4. `platformUrl` falls back to the reference URL when omitted.
5. common fields are preserved:
   - `id`
   - `type`
   - `title`
   - `description`
   - `authors`
   - `datePublished`
   - `keywords`
   - `publisherName`
   - `publisherUrl`
   - `sourceLabel`

Use DDT for repeated common-field expectations, but keep one explicit test for the video-specific fallback behavior.

### Green

Implement:

```text
normalizeVideoReference(input)
```

in:

```text
src/lib/bibliography/normalize/normalize-reference.mjs
```

Then extend the dispatcher.

Status: completed.

### Refactor

Extract a tiny helper only if duplication becomes concrete, for example:

```ts
function fallbackToReferenceUrl(explicitUrl, referenceUrl) {
    return explicitUrl ?? referenceUrl;
}
```

Avoid speculative helpers.

## Cycle 3: Add `ScholarlyArticle` Shared Normalization

### Red

Add direct tests for `ScholarlyArticle`.

Cover:

1. dispatcher support for `kind: "ScholarlyArticle"`;
2. publication metadata passthrough:
   - `publicationName`
   - `publicationUrl`
   - `publicationId`
3. `publicationUrl` fallback to the article URL;
4. preservation of already-parsed page data from `pages.ts`;
5. common fields are preserved.

### Green

Implement:

```text
normalizeScholarlyArticleReference(input)
```

Preserve existing field names exactly. Do not parse pages here; the shared normalizer should only receive already-parsed
page data.

Status: completed.

### Refactor

If `VideoObject` and `ScholarlyArticle` now share URL fallback logic, extract a small pure helper and test it through
public normalizer behavior rather than as a separate unit unless it becomes non-trivial.

## Cycle 4: Add `Thesis` Shared Normalization

### Red

Add direct tests for `Thesis`.

Cover:

1. dispatcher support for `kind: "Thesis"`;
2. institution metadata passthrough:
   - `institutionName`
   - `institutionUrl`
   - `institutionId`
3. `institutionUrl` fallback to the thesis URL;
4. common fields are preserved.

### Green

Implement:

```text
normalizeThesisReference(input)
```

Keep institution lookup and graph resolution outside the shared core.

Status: completed.

### Refactor

Check whether publication/institution/platform fallback can use one private helper without obscuring intent.

Prefer:

```ts
const platformUrl = input.platformUrl ?? input.url;
```

over an abstraction if the logic remains obvious and local.

## Cycle 5: Exhaustive Dispatcher Safety

### Red

Add one dispatcher contract test using DDT over all supported kinds:

- `Book`
- `VideoObject`
- `ScholarlyArticle`
- `Thesis`

Optionally include `WebPage` as an explicit unsupported/deferred case if the dispatcher currently does not handle it.

The test should verify that each supported kind routes to a normalized object with the expected `type`.

### Green

Ensure `normalizeReference(...)` has explicit branches for the supported kinds.

For unsupported kinds, prefer a clear error over silent partial normalization.

Status: completed with explicit branches for `Book`, `VideoObject`, `ScholarlyArticle`, and `Thesis`. `WebPage` remains
the explicit unsupported deferred case.

### Refactor

Consider replacing an `if`/`switch` chain with a small dispatch table only if it improves readability:

```ts
const normalizers = {
    Book: normalizeBookReference,
    VideoObject: normalizeVideoReference,
    ScholarlyArticle: normalizeScholarlyArticleReference,
    Thesis: normalizeThesisReference,
};
```

Use this only if the typing remains simple. A clear `switch` is better than a clever but fragile dispatch map.

## Cycle 6: Regression Validation

Run focused tests after each cycle:

```bash
pnpm vitest run src/lib/bibliography/__tests__/normalize-reference.test.ts
pnpm vitest run src/lib/bibliography/__tests__/reference-normalization-equivalence.test.ts
```

After cycles 1–5 are complete, run the broader bibliography slice:

```bash
pnpm vitest run src/lib/bibliography
```

If available in the project closure checklist, also run:

```bash
pnpm exec tsc --noEmit
pnpm run check
```

Verification run for this slice:

- `pnpm vitest run src/lib/bibliography/__tests__/normalize-reference.test.ts`
- `pnpm vitest run src/lib/bibliography/__tests__/reference-normalization-equivalence.test.ts`
- `pnpm vitest run src/lib/bibliography`

## Acceptance Criteria

- `normalize-reference-types.ts` exposes source-independent input contracts for `VideoObject`, `ScholarlyArticle`, and
  `Thesis`.
- `normalize-reference.mjs` supports direct normalization for all three new kinds.
- `normalize-reference.test.ts` contains focused direct tests for each new normalizer.
- common-field preservation is covered with DDT.
- specific fallback semantics are covered with explicit tests.
- existing equivalence tests remain green.
- no caller rewiring is included in this slice.
- no behavior changes are introduced in `normalize-jsonld.ts` or `catalog-core.mjs`.

## Follow-up Plan: Caller Migration Slice

After this slice, create a separate TDD plan for migrating callers.

That follow-up should:

1. add red tests proving `normalize-jsonld.ts` delegates final construction to the shared normalizer;
2. migrate one reference kind at a time;
3. keep source-specific extraction near the current callers;
4. keep the equivalence suite green after each migration;
5. migrate `WebPage` deliberately, either before or after the remaining caller rewires, depending on which path reduces
   risk.

## Notes

The key correction is that cycles 3–5 should not pretend the shared dispatcher is already used by non-`Book` callers.
The safer sequence is:

1. add direct shared normalizers;
2. verify their contracts in isolation;
3. keep equivalence tests green;
4. defer caller migration to a separate, smaller refactor plan.
