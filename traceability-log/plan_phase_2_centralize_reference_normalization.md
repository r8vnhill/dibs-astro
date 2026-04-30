# [PLAN] Phase 2: Centralize Reference Normalization

## Summary

Centralize bibliography reference normalization so both supported workflows produce `NormalizedReference` through the same final normalization core:

- Catalog graph workflow: `catalog-core.mjs`
- Legacy ItemList workflow: `normalize-jsonld.ts`
- Shared render-facing output: existing `NormalizedReference` union from `types.ts`

This phase should reduce duplicated reference construction logic without changing rendering behavior, generated bibliography artifacts, or public component APIs.

The shared normalizer should be responsible for constructing final render-facing reference objects. Source-specific modules should remain responsible for extracting raw data from their own input formats.

## Goals

- Make catalog-backed references and legacy ItemList references share one final normalization path.
- Preserve existing public APIs:
  - `parseBibliography`
  - `extractFallbackTitles`
  - `resolveReferenceGroups`
  - `loadBibliographyCatalog`
  - `getReferencesForLesson`
  - Phase 1 report generation APIs
- Preserve existing render behavior for:
  - `Book`
  - `WebPage`
  - `VideoObject`
  - `ScholarlyArticle`
  - `Thesis`
- Reduce duplicated helper logic for:
  - blank string handling
  - title/headline precedence
  - author normalization
  - publisher/platform/institution/location derivation
  - page metadata
  - URL hostname fallback
- Keep the shared core Node-safe and compatible with the Phase 1 `.mjs` catalog/report path.
- Keep TypeScript ergonomics through typed facades, test coverage, and explicit type declarations where practical.

## Non-Goals

- Do not retire `ReferencesFromJsonLd`; its compatibility policy is Phase 3.
- Do not centralize `pending-revision` policy; that belongs to a later phase.
- Do not change generated JSON-LD artifacts.
- Do not change rendering components unless a duplicated normalization responsibility can be safely removed.
- Do not introduce a TypeScript runtime dependency for Node scripts.
- Do not make the shared normalizer parse raw graph nodes or raw ItemList JSON-LD directly.

---

## Design Principle

Use a three-stage pipeline:

```text
source-specific input
  -> source-specific extraction
  -> shared normalization input
  -> shared NormalizedReference
  -> existing rendering pipeline
```

The shared normalizer should know about reference semantics, not source formats.

Good ownership:

```text
catalog-core.mjs
  Resolves graph IDs, linked nodes, catalog-only metadata, usage tolerance,
  parent works, institutions, publications, and pending-only behaviour.

normalize-jsonld.ts
  Validates ItemList structure, detects duplicate identifiers, resolves explicit
  reference groups, collects strict/non-strict errors, and extracts inline fields.

normalize/*.mjs
  Builds final NormalizedReference values from a source-independent input shape.
```

Avoid this:

```text
normalize/*.mjs
  Parses raw JSON-LD graph structure.
  Knows about ItemList root validation.
  Knows about lesson usage maps.
  Knows about pending-revision semantics.
  Knows about Astro rendering.
```

---

## Proposed Module Structure

```text
src/lib/bibliography/normalize/
  normalize-reference.mjs
  normalize-book-reference.mjs
  normalize-web-page-reference.mjs
  normalize-video-reference.mjs
  normalize-scholarly-article-reference.mjs
  normalize-thesis-reference.mjs
  normalize-authors.mjs
  normalize-publication.mjs
  normalize-url.mjs
  normalize-pages.mjs
  normalize-text.mjs
  reference-normalization-types.d.ts
```

If the project prefers fewer files at first, start with:

```text
src/lib/bibliography/normalize/
  normalize-reference.mjs
  helpers.mjs
  reference-normalization-types.d.ts
```

Then split once functions grow or responsibilities become unclear.

## Shared Input Shape

Avoid a single large bag of optional fields. Prefer a discriminated input union so each reference type has an explicit contract.

```ts
type ReferenceNormalizationInput =
    | BookNormalizationInput
    | WebPageNormalizationInput
    | VideoNormalizationInput
    | ScholarlyArticleNormalizationInput
    | ThesisNormalizationInput;
```

Suggested base shape:

```ts
type BaseReferenceNormalizationInput = {
    readonly id: string;
    readonly rawType: string;
    readonly title?: string;
    readonly headline?: string;
    readonly description?: string;
    readonly url?: string;
    readonly authors?: readonly NormalizationPersonInput[];
    readonly publisher?: NormalizationOrganizationInput;
    readonly sourceLabel?: string;
};
```

Type-specific examples:

```ts
type BookNormalizationInput = BaseReferenceNormalizationInput & {
    readonly kind: "Book";
    readonly isbn?: string;
    readonly edition?: string;
    readonly datePublished?: string;
};

type WebPageNormalizationInput = BaseReferenceNormalizationInput & {
    readonly kind: "WebPage";
    readonly websiteName?: string;
    readonly datePublished?: string;
    readonly dateModified?: string;
};

type VideoNormalizationInput = BaseReferenceNormalizationInput & {
    readonly kind: "VideoObject";
    readonly platform?: string;
    readonly uploadDate?: string;
    readonly duration?: string;
};

type ScholarlyArticleNormalizationInput = BaseReferenceNormalizationInput & {
    readonly kind: "ScholarlyArticle";
    readonly publication?: string;
    readonly volume?: string;
    readonly issue?: string;
    readonly pages?: string;
    readonly doi?: string;
};

type ThesisNormalizationInput = BaseReferenceNormalizationInput & {
    readonly kind: "Thesis";
    readonly institution?: NormalizationOrganizationInput;
    readonly datePublished?: string;
};
```

For `.mjs`, express the contract with JSDoc typedefs or a colocated `.d.ts` file. The TypeScript-facing facade should import these types where possible.

---

## Public API Shape

The shared normalizer should expose one primary function:

```ts
normalizeReference(input: ReferenceNormalizationInput): NormalizedReference
```

Use explicit overloads plus a registration table for the type-specific normalizers.

The dispatch table makes supported-kind registration visible and lets `satisfies` verify that every supported reference
kind has the expected normalizer without erasing the inferred function types:

```ts
type NormalizerByKind = {
    readonly Book: (input: BookNormalizationInput) => NormalizedBookReference;
    readonly WebPage: (input: WebPageNormalizationInput) => NormalizedWebReference;
    readonly VideoObject: (input: VideoNormalizationInput) => NormalizedVideoReference;
    readonly ScholarlyArticle: (
        input: ScholarlyArticleNormalizationInput,
    ) => NormalizedArticleReference;
    readonly Thesis: (input: ThesisNormalizationInput) => NormalizedThesisReference;
};

const normalizers = {
    Book: normalizeBookReference,
    WebPage: normalizeWebPageReference,
    VideoObject: normalizeVideoReference,
    ScholarlyArticle: normalizeScholarlyArticleReference,
    Thesis: normalizeThesisReference,
} satisfies NormalizerByKind;
```

Do not dispatch with `normalizers[input.kind](input as never)`. That weakens the type design because TypeScript cannot
always correlate the indexed normalizer with the narrowed union member.

Instead, use overloads for callers and a `switch` only for type-safe narrowing:

```ts
export function normalizeReference(input: BookNormalizationInput): NormalizedBookReference;
export function normalizeReference(input: WebPageNormalizationInput): NormalizedWebReference;
export function normalizeReference(input: VideoNormalizationInput): NormalizedVideoReference;
export function normalizeReference(
    input: ScholarlyArticleNormalizationInput,
): NormalizedArticleReference;
export function normalizeReference(input: ThesisNormalizationInput): NormalizedThesisReference;
export function normalizeReference(input: ReferenceNormalizationInput): NormalizedReference {
    switch (input.kind) {
        case "Book":
            return normalizers.Book(input);
        case "WebPage":
            return normalizers.WebPage(input);
        case "VideoObject":
            return normalizers.VideoObject(input);
        case "ScholarlyArticle":
            return normalizers.ScholarlyArticle(input);
        case "Thesis":
            return normalizers.Thesis(input);
        default:
            return assertNever(input);
    }
}
```

This keeps the table as the source of registration coverage while the `switch` provides precise discriminated-union
narrowing. In `.mjs`, mirror this contract with JSDoc or the colocated declaration file.

If existing callers need strict/non-strict behavior, keep that behavior in the source-specific caller. The normalizer can throw structured errors internally if needed, but the caller should decide whether those errors are fatal, collected, or tolerated.

Preferred error shape:

```ts
type ReferenceNormalizationError = {
    readonly code: string;
    readonly referenceId?: string;
    readonly referenceType?: string;
    readonly message: string;
    readonly sourceLabel?: string;
};
```

Do not expose raw implementation errors across module boundaries.

---

## Key Changes

### 1. Add Characterization Tests First

Before moving logic, add tests that lock equivalent render-facing behavior across both input sources.

For each supported type, add at least one semantically equivalent pair:

- ItemList input
- catalog-normalization input

Then assert that the produced render-facing fields match.

Cover:

- `Book`
- `WebPage`
- `VideoObject`
- `ScholarlyArticle`
- `Thesis`

Also include fallback-sensitive cases:

- title vs. headline precedence;
- blank title fallback;
- URL-derived hostname fallback;
- missing optional publisher/platform/institution;
- page metadata for articles;
- metadata URL fallback for web pages, videos, articles, and theses.

### 2. Introduce the Shared Normalization Core

Create `src/lib/bibliography/normalize/normalize-reference.mjs`.

Responsibilities:

- register supported normalizers explicitly by `input.kind`;
- dispatch through overloads plus a type-narrowing `switch`;
- delegate to type-specific small normalizers;
- construct final `NormalizedReference`;
- apply shared field normalization consistently.

Example structure:

```ts
const normalizers = {
    Book: normalizeBookReference,
    WebPage: normalizeWebPageReference,
    VideoObject: normalizeVideoReference,
    ScholarlyArticle: normalizeScholarlyArticleReference,
    Thesis: normalizeThesisReference,
} satisfies NormalizerByKind;

export function normalizeReference(input: ReferenceNormalizationInput): NormalizedReference {
    switch (input.kind) {
        case "Book":
            return normalizers.Book(input);
        case "WebPage":
            return normalizers.WebPage(input);
        case "VideoObject":
            return normalizers.VideoObject(input);
        case "ScholarlyArticle":
            return normalizers.ScholarlyArticle(input);
        case "Thesis":
            return normalizers.Thesis(input);
        default:
            return assertNever(input);
    }
}
```

Keep each type-specific normalizer short and focused.

### 3. Move Shared Helpers Gradually

Move only helpers that are genuinely shared by both source paths.

Good first candidates:

- `normalizeOptionalText`
- `normalizeRequiredText`
- `normalizeAuthors`
- `normalizeOrganization`
- `resolveTitle`
- `resolveHostnameFallback`
- `normalizePages`

Do not move helpers that still encode source-specific assumptions.

### 4. Refactor ItemList Normalization

Keep `parseBibliography` responsible for:

- root `ItemList` validation;
- supported input shape validation;
- duplicate identifier detection;
- explicit recommended/additional group maps;
- strict/non-strict error collection;
- compatibility behavior.

Change only the final construction step:

```text
raw ItemList item
  -> ItemList extraction DTO
  -> ReferenceNormalizationInput
  -> normalizeReference(...)
```

Keep `extractFallbackTitles` unchanged unless the extracted helper can be reused without changing behavior.

### 5. Refactor Catalog Normalization

Keep `catalog-core.mjs` responsible for:

- graph indexing;
- ID resolution;
- linked-node lookup;
- author/publisher/work/institution relation traversal;
- lesson maps;
- usage maps;
- pending-only tolerance;
- catalog-only fields such as `bookId`, `publicationId`, and `institutionId`.

Change only the final construction step:

```text
catalog graph records
  -> Catalog extraction DTO
  -> ReferenceNormalizationInput
  -> normalizeReference(...)
```

Preserve catalog-only metadata in the final output where it already exists.

### 6. Remove Duplicated Construction Logic

After both paths use the shared normalizer:

- remove duplicated type-specific construction from `normalize-jsonld.ts`;
- remove duplicated type-specific construction from `catalog-core.mjs`;
- keep source extraction functions small and explicitly named;
- avoid leaving compatibility branches that silently rebuild references outside the shared normalizer.

---

## TDD Plan

### ~~Cycle 1: Characterize Equivalent Output~~

Red:

- Add equivalence tests for one reference type, preferably `WebPage` because it exercises title, URL, publisher/platform, and fallback behavior.

Green:

- Add the smallest shared normalizer path for `WebPage`.

Refactor:

- Extract only helpers required by `WebPage`.

### ~~Cycle 2: Add `Book`~~

Red:

- Add equivalent ItemList/catalog `Book` tests.

Green:

- Add `normalizeBookReference`.

Refactor:

- Move author and publisher helpers only when both `Book` and `WebPage` use them.

Status:

- Completed by `src/lib/bibliography/normalize/normalize-reference.mjs` and `src/lib/bibliography/__tests__/normalize-reference.test.ts`.
- Only final `Book` construction was moved into the shared normalizer; source-specific extraction remains in the existing callers.

### Cycle 3: Add `VideoObject`

Red:

- Add `VideoObject` equivalence tests.
- Include platform or hostname fallback behavior.

Green:

- Add `normalizeVideoReference`.

Refactor:

- Consolidate URL/platform fallback.

### Cycle 4: Add `ScholarlyArticle`

Red:

- Add article equivalence tests.
- Include publication, DOI, and page metadata if supported by the existing model.

Green:

- Add `normalizeScholarlyArticleReference`.

Refactor:

- Consolidate page parsing and publication normalization.

### Cycle 5: Add `Thesis`

Red:

- Add thesis equivalence tests.
- Include institution fallback and metadata URL fallback.

Green:

- Add `normalizeThesisReference`.

Refactor:

- Consolidate organization/institution normalization if it is truly shared.

### Cycle 6: Refactor ItemList Caller

Red:

- Existing ItemList tests should continue to pass.
- Add one test proving ItemList output goes through the shared normalizer if this can be observed cleanly without over-mocking.

Green:

- Replace ItemList final object construction with extraction plus `normalizeReference`.

Refactor:

- Remove dead duplicated helpers.

### Cycle 7: Refactor Catalog Caller

Red:

- Existing catalog tests should continue to pass.
- Add one catalog test for a type that previously diverged from ItemList behavior.

Green:

- Replace catalog final object construction with extraction plus `normalizeReference`.

Refactor:

- Remove dead duplicated helpers.

### Cycle 8: Regression Sweep

Run all bibliography and reference render suites.

Fix only behavior that clearly contradicts existing contracts or the new shared-normalization contract.

---

## Testing Strategy

### BDD

Organize tests around behavior:

```ts
describe("normalizeReference", () => {
    describe("shared render-facing normalization", () => {
        test("normalizes equivalent WebPage inputs from ItemList and catalog extraction", () => {
            // ...
        });
    });
});
```

### DDT

Use table-driven tests for repeated contracts:

```ts
test.each([
  ["Book", bookCatalogInput, bookItemListInput],
  ["WebPage", webPageCatalogInput, webPageItemListInput],
  ["VideoObject", videoCatalogInput, videoItemListInput],
  ["ScholarlyArticle", articleCatalogInput, articleItemListInput],
  ["Thesis", thesisCatalogInput, thesisItemListInput],
])("%s produces equivalent render-facing fields", ...);
```

### PBT

Use PBT only for small pure helpers where it adds value.

Good candidates:

- trimming and empty handling;
- title/headline precedence;
- author list normalization;
- URL hostname fallback;
- order-preserving author normalization.

Example properties:

- blank strings normalize to `undefined`;
- non-blank strings preserve trimmed content;
- author normalization preserves input order;
- hostname fallback never throws for invalid URLs;
- title always wins over headline when both are non-blank.

Do not use PBT for full `NormalizedReference` objects unless the generator would remain simple and readable.

---

## Required Test Coverage

### Shared normalization tests

Add a new suite, for example:

```text
src/lib/bibliography/__tests__/normalize-reference.test.ts
```

Cover:

- `Book`
- `WebPage`
- `VideoObject`
- `ScholarlyArticle`
- `Thesis`
- shared helpers
- fallback precedence
- missing required fields
- unsupported reference type

### Existing suites that must remain green

```text
src/lib/bibliography/__tests__/normalize-jsonld.test.ts
src/lib/bibliography/__tests__/catalog.test.ts
src/components/ui/references/__tests__/ReferencesFromJsonLd.render.test.ts
src/components/ui/references/__tests__/ReferencesFromCatalog.render.test.ts
```

### Additional regression coverage

Add focused tests when refactoring reveals a gap:

- ItemList strict vs. non-strict behavior;
- catalog pending-only tolerance;
- catalog-only IDs such as `bookId`, `publicationId`, and `institutionId`;
- `VideoObject` normalization parity;
- URL fallback behavior across source paths.

---

## Implementation Guidelines

### Keep abstractions narrow

Prefer this:

```text
extractCatalogReferenceInput(...)
extractItemListReferenceInput(...)
normalizeReference(...)
```

Avoid this:

```text
normalizeAnythingFromAnySource(...)
```

### Keep functions short

Suggested function boundaries:

```text
normalizeReference
normalizeBookReference
normalizeWebPageReference
normalizeVideoReference
normalizeScholarlyArticleReference
normalizeThesisReference
resolveReferenceTitle
normalizeAuthors
normalizeOrganization
normalizeUrlMetadata
normalizePages
```

Most helpers should stay below roughly 25 lines.

### Avoid premature generalization

Generalize only after a helper is needed by both workflows or at least two reference types.

Do not move code into the shared core just because it “might” be reused later.

### Keep source-specific tolerance outside the normalizer

The shared normalizer should not decide:

- whether malformed pending-only references are tolerated;
- whether strict mode throws or collects errors;
- whether a raw ItemList entry is valid;
- whether a graph node can be pruned.

Those remain caller policies.

### Preserve deterministic output

Normalization should not depend on object key order or graph traversal order.

When constructing arrays, preserve meaningful source order or sort explicitly where current behavior already sorts.

### Keep `.mjs` type safety acceptable

Because the shared core is `.mjs`, add one of:

- JSDoc typedefs in the `.mjs` files;
- a colocated `.d.ts` declaration file;
- typed TypeScript wrapper tests that assert the facade contract.

Recommended for Phase 2:

```text
reference-normalization-types.d.ts
```

plus TypeScript-facing facade exports where needed.

---

## Documentation and Traceability

After implementation:

- Add:

```text
traceability-log/plan_phase_2_centralize_reference_normalization.md
```

- Update:

```text
plan_json_ld_references_workflow.md
docs/architecture/jsonld-references-workflow-report.md
src/data/bibliography/README.md
```

- Add a changelog entry explaining:

```text
Reference normalization is now shared by the catalog-backed and legacy ItemList workflows.
```

Do not document `ReferencesFromJsonLd` as deprecated in this phase unless Phase 3 has already made that decision.

---

## Verification Commands

Focused bibliography tests:

```bash
pnpm vitest run src/lib/bibliography
```

Reference render tests:

```bash
pnpm vitest run src/components/ui/references/__tests__
```

Type checking:

```bash
pnpm exec tsc --noEmit
```

Full unit suite:

```bash
pnpm test:unit
```

Astro render suite:

```bash
pnpm test:astro
```

If catalog generation is touched unexpectedly, verify determinism:

```bash
pnpm generate:bibliography-catalog
git diff -- src/data/bibliography/catalog.graph.generated.jsonld
```

Expected result for this phase:

```text
No generated bibliography artifact changes unless explicitly justified.
```

---

## Acceptance Criteria

- Both catalog-backed and legacy ItemList workflows produce `NormalizedReference` through the shared normalizer.
- Public APIs remain stable.
- Existing render output remains stable.
- Existing strict/non-strict ItemList behavior remains stable.
- Existing catalog pending-only tolerance remains stable.
- Shared helpers remove meaningful duplication without absorbing source-specific policy.
- `Book`, `WebPage`, `VideoObject`, `ScholarlyArticle`, and `Thesis` are covered by shared normalization tests.
- Equivalent catalog and ItemList inputs produce matching render-facing fields where semantically equivalent.
- No generated bibliography artifacts change unless explicitly justified.
- No new dependency is introduced.
- TypeScript-facing modules remain ergonomic despite the Node-safe `.mjs` shared core.
- All focused bibliography and reference render tests pass.
- Full unit, type-checking, and Astro test commands pass.

---

## Risks and Mitigations

### Risk: The shared input becomes too generic

A single object with many optional fields can become hard to validate.

Mitigation:

- use a discriminated union by `kind`;
- keep type-specific inputs explicit;
- add unsupported-type and missing-required-field tests.

### Risk: `.mjs` weakens type safety

Node-safe `.mjs` keeps scripts simple but can lose TypeScript checking.

Mitigation:

- add JSDoc typedefs or `.d.ts` declarations;
- keep TypeScript facades;
- add type-level coverage through existing TypeScript tests.

### Risk: Source-specific policy leaks into the normalizer

The normalizer could accidentally start deciding strict mode, pending tolerance, or graph pruning.

Mitigation:

- keep extraction and policy in callers;
- review every helper moved into `normalize/`;
- reject helpers that mention ItemList, graph nodes, lessons, usages, or pending revision.

### Risk: Rendering changes accidentally

Shared normalization can subtly change fallback precedence.

Mitigation:

- characterize behavior first;
- refactor one reference type at a time;
- run both JSON-LD and catalog render suites after each type migration.

### Risk: Catalog-only metadata is lost

Catalog references may carry IDs or linked metadata not present in ItemList input.

Mitigation:

- include catalog-only fields in the shared input where they are part of the render-facing model;
- add regression tests for `bookId`, `publicationId`, and `institutionId`.

---

## Suggested Implementation Order

1. Add characterization tests for equivalent catalog and ItemList output. Completed by `src/lib/bibliography/__tests__/reference-normalization-equivalence.test.ts`.
2. Add shared input types and `normalizeReference`. Started with `Book` in Cycle 2.
3. Migrate `WebPage`.
4. Migrate `Book`. Completed by `src/lib/bibliography/normalize/normalize-reference.mjs`.
5. Migrate `VideoObject`.
6. Migrate `ScholarlyArticle`.
7. Migrate `Thesis`.
8. Refactor ItemList final construction.
9. Refactor catalog final construction.
10. Remove duplicated helpers.
11. Update docs and traceability.
12. Run the full verification gate.
