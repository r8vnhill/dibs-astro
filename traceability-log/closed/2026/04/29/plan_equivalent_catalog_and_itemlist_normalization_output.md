# [PLAN] Equivalent Catalog and ItemList Normalization Output

Status: Implemented on 2026-04-29.

## Summary

Add a focused characterization suite before refactoring reference normalization.

The suite should lock the current render-facing `NormalizedReference` output for semantically equivalent catalog graph and legacy ItemList inputs. Its purpose is to create a safety net for Phase 2 before introducing a shared normalizer.

This is a **red/lock step only**:

- no production code changes;
- no shared normalizer yet;
- no generated bibliography artifact changes;
- no rendering component changes.

If a catalog fixture and an ItemList fixture are semantically equivalent but currently produce different render-facing fields, the test should first document that divergence explicitly rather than silently changing behavior.

## Goals

- Protect current render-facing normalization behavior before refactoring.
- Compare catalog-backed and ItemList-backed references through their public loaders:
  - `parseBibliography`
  - `loadBibliographyCatalog`
- Identify fields that are genuinely equivalent across both workflows.
- Exclude catalog-only metadata from equivalence assertions unless specifically testing catalog preservation.
- Provide a stable migration safety net for moving each reference type into the shared normalizer.

## Non-Goals

- Do not introduce the shared normalizer in this step.
- Do not fix normalization inconsistencies in this step.
- Do not rewrite existing catalog or ItemList tests.
- Do not test rendering components here.
- Do not use the real generated catalog artifact.
- Do not require Turtle generation.

## New Test File

Add:

```text
src/lib/bibliography/__tests__/reference-normalization-equivalence.test.ts
```

This suite should use small local fixtures, not the full generated bibliography catalog.

## Test Strategy

Each primary case should be built from two semantically equivalent inputs:

1. an ItemList JSON-LD source parsed with `parseBibliography`;
2. a generated-catalog-shaped JSON-LD source parsed with `loadBibliographyCatalog`.

Then compare only the render-facing fields that should be equivalent between both workflows.

Use three local helpers:

```ts
const parseSingleItemListReference = (
    source: string,
): NormalizedReference => {
    // parseBibliography(source)
    // assert exactly one normalized reference
    // return it
};

const parseSingleCatalogReference = (
    source: string,
    referenceId: string,
): NormalizedReference => {
    // loadBibliographyCatalog(source)
    // get reference by ID from normalized catalog
    // return it
};

const projectComparableReference = (
    reference: NormalizedReference,
): ComparableReference => {
    // return only fields that are meaningful across both source formats
};
```

Prefer a projection function over direct object equality because catalog references may carry catalog-only IDs or linked-node metadata that ItemList references cannot represent.

## Comparable Projection Policy

The projection should include:

- stable render-facing fields;
- normalized text fields;
- normalized URL fields;
- normalized author/publisher/platform/institution names where applicable;
- normalized page fields where applicable.

The projection should exclude by default:

- `bookId`
- `publicationId`
- `institutionId`
- source-specific diagnostic metadata
- catalog-only linked-node identifiers
- fields not rendered or not shared between workflows

Add separate focused tests for catalog-only fields if preservation matters.

## Primary DDT Cases

Use DDT for the five supported rendered reference types:

```ts
test.each(equivalentReferenceCases)(
    "%s produces equivalent render-facing fields",
    (_label, itemListSource, catalogSource, referenceId) => {
        const itemListReference = parseSingleItemListReference(itemListSource);
        const catalogReference = parseSingleCatalogReference(catalogSource, referenceId);

        expect(projectComparableReference(catalogReference)).toEqual(
            projectComparableReference(itemListReference),
        );
    },
);
```

Each case should include the smallest source data needed to exercise meaningful normalization behavior.

## Case 1: `Book`

Comparable fields:

- `id`
- `type`
- `rawType`
- `title`
- `chapter`
- `bookTitle`
- `pages`
- `authors`
- `keywords`
- `datePublished`
- `publisherName`
- `publisherUrl`

Fixture requirements:

- author name;
- `pageStart`;
- `pageEnd`;
- `isPartOf.name`;
- publisher `name`;
- publisher `url`.

Catalog-specific note:

- catalog input may use a linked parent work node;
- comparable projection should ignore `bookId`.

Add a separate preservation test only if `bookId` is currently part of the catalog-facing contract.

## Case 2: `WebPage`

Comparable fields:

- `id`
- `type`
- `rawType`
- `title`
- `url`
- `location`
- `locationUrl`
- `publisherName`
- `publisherUrl`

Fixture requirements:

- URL;
- publisher `name`;
- publisher `url`.

Fallback case:

- publisher URL absent;
- `locationUrl` falls back to reference URL.

Keep this fallback as a separate focused test if it makes the main DDT case too dense.

## Case 3: `VideoObject`

Comparable fields:

- `id`
- `type`
- `rawType`
- `title`
- `url`
- `platform`
- `platformUrl`
- `datePublished`
- `publisherName`
- `publisherUrl`

Fixture requirements:

- URL;
- date published;
- publisher/platform metadata.

Fallback case:

- publisher/platform metadata absent;
- platform or publisher display derives from URL hostname if that is current behavior.

If hostname fallback differs between ItemList and catalog today, add a documented divergence test instead of forcing equivalence.

## Case 4: `ScholarlyArticle`

Comparable fields:

- `id`
- `type`
- `rawType`
- `title`
- `url`
- `publication`
- `publicationUrl`
- `pages`
- `publisherName`
- `publisherUrl`

Fixture requirements:

- `isPartOf.name`;
- `isPartOf.url`;
- `pageStart`;
- `pageEnd`;
- publisher metadata if currently supported by both workflows.

Catalog-specific note:

- catalog fixture may use a linked periodical node;
- comparable projection should ignore `publicationId`.

## Case 5: `Thesis`

Comparable fields:

- `id`
- `type`
- `rawType`
- `title`
- `url`
- `institution`
- `institutionUrl`
- `publisherName`
- `publisherUrl`

Fixture requirements:

- URL;
- institution metadata through `publisher` or the current supported field;
- publisher/institution URL where applicable.

Catalog-specific note:

- catalog fixture may use a linked institution node;
- comparable projection should ignore `institutionId`.

## Focused Fallback Tests

Add separate tests for fallback-sensitive behavior so the main DDT table remains readable.

Cover:

- `name` wins over `headline`;
- blank `name` falls back to `headline`;
- URL-derived hostname fallback is stable when publisher/platform/institution metadata is absent;
- metadata-specific URL falls back to reference URL when the publisher/container URL is absent;
- page ranges normalize identically when `pageStart > pageEnd`, if this is current behavior.

Important: these tests should characterize current behavior. If the current behavior is undesirable, mark it as a documented finding for the refactor phase, but do not change production code in this step.

## Fixture Design

Keep fixtures intentionally small.

Recommended fixture style:

```ts
const itemListBook = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: [
        {
            "@type": "Book",
            "@id": "reference:book-example",
            name: "Example Chapter",
            author: [{ "@type": "Person", name: "Ada Lovelace" }],
            isPartOf: {
                "@type": "Book",
                name: "Example Book",
            },
            pageStart: "10",
            pageEnd: "20",
        },
    ],
});
```

For catalog fixtures, prefer a tiny generated-catalog-shaped JSON-LD object that contains only the nodes required by `loadBibliographyCatalog`.

Avoid using the real generated catalog because:

- it makes tests harder to understand;
- it can introduce unrelated fixture churn;
- it weakens the red/lock nature of the characterization step.

## Suggested Test File Structure

```ts
suite("reference normalization equivalence", () => {
    describe("primary reference types", () => {
        test.each(equivalentReferenceCases)(
            "%s produces equivalent render-facing fields",
            ...
        );
    });

    describe("fallback behavior", () => {
        test("prefers name over headline", ...);
        test("falls back to headline when name is blank", ...);
        test("uses reference URL when metadata URL is absent", ...);
        test("normalizes reversed page ranges consistently", ...);
    });

    describe("catalog-only metadata", () => {
        test("preserves catalog book IDs without requiring ItemList equivalence", ...);
        test("preserves catalog publication IDs without requiring ItemList equivalence", ...);
        test("preserves catalog institution IDs without requiring ItemList equivalence", ...);
    });
});
```

## Handling Existing Divergences

If a semantically equivalent pair currently differs, do not immediately change production code.

Instead:

1. add a focused test that documents the current divergence;
2. name the test clearly;
3. add a TODO or traceability note for Phase 2 migration;
4. only change behavior later when introducing the shared normalizer intentionally.

Example:

```ts
test("documents current VideoObject hostname fallback divergence", () => {
    // Current behavior differs between ItemList and catalog.
    // This test protects the pre-refactor baseline and should be revisited
    // when VideoObject moves to the shared normalizer.
});
```

## Acceptance Criteria

- [x] The new suite passes before any shared normalizer is introduced.
- [x] Tests compare current behavior, not intended future behavior.
- [x] The suite uses `parseBibliography` and `loadBibliographyCatalog` instead of internal normalization helpers.
- [x] The suite does not require changes to:
  - `parseBibliography`
  - `loadBibliographyCatalog`
  - render components
  - generated bibliography artifacts
- [x] Comparable projection excludes catalog-only IDs by default.
- [x] Catalog-only metadata preservation is tested separately if needed.
- [x] Fallback-sensitive behavior is covered by focused tests.
- [x] The suite gives Phase 2 a stable safety net for migrating each reference type into the shared normalizer.

## Verification Command

```bash
pnpm vitest run src/lib/bibliography/__tests__/reference-normalization-equivalence.test.ts
```

Verified on 2026-04-29:

- `pnpm vitest run src/lib/bibliography/__tests__/reference-normalization-equivalence.test.ts`
- Result: 1 file passed, 11 tests passed.
- `pnpm vitest run src/lib/bibliography/__tests__/reference-normalization-equivalence.test.ts src/lib/bibliography/__tests__/normalize-jsonld.test.ts src/lib/bibliography/__tests__/catalog.test.ts`
- Result: 3 files passed, 38 tests passed.
- `pnpm vitest run src/lib/bibliography`
- Result: 5 files passed, 77 tests passed.
- `pnpm exec tsc --noEmit`
- Result: passed.

If the suite reveals unexpected divergence, also run the existing normalization and catalog suites before deciding whether it is a bug or an intentional difference:

```bash
pnpm vitest run \
  src/lib/bibliography/__tests__/normalize-jsonld.test.ts \
  src/lib/bibliography/__tests__/catalog.test.ts
```
