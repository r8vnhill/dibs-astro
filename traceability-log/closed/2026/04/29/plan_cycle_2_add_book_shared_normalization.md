# [DONE] Cycle 2: Add `Book` Shared Normalization

Status: Implemented on 2026-04-29.

## Summary

Introduce the first shared normalization path for `Book` references while preserving current `parseBibliography` and `loadBibliographyCatalog` behaviour.

This cycle should move only the final `Book` object construction into the shared normalization core. Source-specific extraction and policy remain in their current modules:

- ItemList validation and strict/non-strict handling stay in `normalize-jsonld.ts`.
- Catalog graph lookup, linked-node resolution, and pending-only tolerance stay in `catalog-core.mjs`.
- Author, publisher, page, and parent-work extraction remain source-specific for now.
- Non-`Book` reference branches remain unchanged.

The existing equivalence suite provides the behavioural safety net, while the new shared-normalizer suite locks the `Book` normalization contract directly.

## Goals

- Add the initial shared normalization module under `src/lib/bibliography/normalize/`.
- Define a minimal source-independent `BookNormalizationInput`.
- Implement `normalizeBookReference(input)`.
- Add `normalizeReference(input)` with only the `Book` branch supported in this cycle.
- Refactor only `Book` final object construction in:
  - `normalize-jsonld.ts`
  - `catalog-core.mjs`
- Preserve all public API behaviour.
- Preserve generated bibliography artifacts.
- Avoid premature helper extraction.

## Non-Goals

- Do not migrate `WebPage`, `VideoObject`, `ScholarlyArticle`, or `Thesis`.
- Do not centralize author normalization yet.
- Do not centralize publisher or organization normalization yet.
- Do not centralize page parsing yet.
- Do not change strict/non-strict ItemList behaviour.
- Do not change catalog pending-only tolerance.
- Do not alter rendering components.
- Do not introduce new dependencies.

---

## Proposed Module Additions

Add:

```text
src/lib/bibliography/normalize/
  normalize-reference.mjs
  reference-normalization-types.d.ts
```

Optional only if the file grows too much:

```text
src/lib/bibliography/normalize/
  normalize-book-reference.mjs
```

For this first cycle, a single `normalize-reference.mjs` is acceptable if the implementation stays small.

## Normalization Contract

Define the minimum input shape needed to reproduce current `Book` behaviour.

```ts
type BookNormalizationInput = {
    readonly kind: "Book";
    readonly id: string;
    readonly rawType: string;
    readonly title: string;
    readonly description?: string;
    readonly authors?: readonly string[];
    readonly datePublished?: string;
    readonly keywords?: readonly string[];
    readonly publisherName?: string;
    readonly publisherUrl?: string;
    readonly sourceLabel?: string;

    readonly bookTitle?: string;
    readonly bookId?: string;
    readonly pages?: string;
};
```

If current `NormalizedBookReference` uses structured authors rather than strings, match the existing shape exactly. Do not redesign author representation in this cycle.

## Output Contract

`normalizeBookReference(input)` should return the current `NormalizedBookReference` shape:

```ts
{
  type: "Book",
  rawType: input.rawType,
  id: input.id,
  title: input.title,
  chapter: input.title,
  bookTitle: input.bookTitle,
  bookId: input.bookId,
  pages: input.pages,
  description: input.description,
  authors: input.authors,
  datePublished: input.datePublished,
  keywords: input.keywords,
  publisherName: input.publisherName,
  publisherUrl: input.publisherUrl,
  sourceLabel: input.sourceLabel,
}
```

Preserve current omission behaviour:

- optional missing values should remain absent;
- blank filtering should happen before calling the normalizer if that is how current callers behave;
- the normalizer should not introduce empty strings, empty arrays, or default values unless current behaviour already does.

## Dispatcher Contract

Add:

```ts
normalizeReference(input: BookNormalizationInput): NormalizedBookReference
```

For this cycle, `normalizeReference` may support only `Book`.

Runtime unsupported-kind behaviour should be explicit:

```ts
throw new ReferenceNormalizationError(...)
```

or a plain `Error` with a stable message if no structured error type exists yet.

Suggested message:

```text
Unsupported reference normalization kind: <kind>
```

Add one direct test for unsupported kind only if it does not require unsafe test gymnastics. Otherwise defer unsupported-kind tests until the union contains more than one supported type.

---

## Type Safety for `.mjs`

Because the shared core is Node-safe `.mjs`, add a TypeScript declaration file:

```text
src/lib/bibliography/normalize/reference-normalization-types.d.ts
```

or:

```text
src/lib/bibliography/normalize/normalize-reference.d.ts
```

The declaration should expose:

```ts
import type { NormalizedBookReference, NormalizedReference } from "../types";

export type BookNormalizationInput = {
    readonly kind: "Book";
    readonly id: string;
    readonly rawType: string;
    readonly title: string;
    readonly description?: string;
    readonly authors?: NormalizedBookReference["authors"];
    readonly datePublished?: string;
    readonly keywords?: NormalizedBookReference["keywords"];
    readonly publisherName?: string;
    readonly publisherUrl?: string;
    readonly sourceLabel?: string;
    readonly bookTitle?: string;
    readonly bookId?: string;
    readonly pages?: string;
};

export type ReferenceNormalizationInput = BookNormalizationInput;

export declare function normalizeBookReference(
    input: BookNormalizationInput,
): NormalizedBookReference;

export declare function normalizeReference(
    input: ReferenceNormalizationInput,
): NormalizedReference;
```

If declaration files feel too heavy for this cycle, use JSDoc typedefs in `.mjs`, but the preferred option is a `.d.ts` because downstream TypeScript tests and facades will depend on this API.

---

## Caller Refactor

### ItemList Path: `normalize-jsonld.ts`

Keep unchanged:

- root `ItemList` validation;
- duplicate identifier detection;
- strict/non-strict error collection;
- `isPartOf` extraction;
- page parsing;
- author extraction;
- publisher extraction;
- fallback title behaviour.

Change only:

```text
Book-specific final object literal
  -> BookNormalizationInput
  -> normalizeBookReference(...)
```

Prefer `normalizeBookReference` over `normalizeReference` in the caller during this cycle. It makes the migration explicit and avoids pretending the generic dispatcher is fully mature.

### Catalog Path: `catalog-core.mjs`

Keep unchanged:

- graph indexing;
- linked-node lookup;
- `resolveLinkedTitle`;
- missing `isPartOf` handling;
- `bookId` extraction;
- page parsing;
- pending-only tolerance;
- author extraction;
- publisher extraction.

Change only:

```text
Catalog Book final object literal
  -> BookNormalizationInput
  -> normalizeBookReference(...)
```

Keep all non-`Book` branches untouched.

---

## TDD Plan

### Step 1: Add Direct Book Normalizer Tests

Create:

```text
src/lib/bibliography/__tests__/normalize-reference.test.ts
```

Add tests for:

- full `Book` input produces current `NormalizedBookReference`;
- `chapter` is derived from `title`;
- `bookId` is preserved;
- `pages` is preserved;
- common metadata is preserved;
- missing optional metadata is omitted;
- no empty optional fields are introduced.

### Step 2: Add the `.mjs` Normalizer

Implement the smallest possible `normalizeBookReference`.

Keep helper functions local and tiny:

```js
const defineOptional = (target, key, value) => {
    if (value !== undefined) {
        target[key] = value;
    }
};
```

Only add such a helper if it reduces duplication without obscuring the output shape.

### Step 3: Add the Generic Dispatcher

Add `normalizeReference`.

For now:

```js
export const normalizeReference = (input) => {
    if (input.kind === "Book") {
        return normalizeBookReference(input);
    }

    throw new Error(`Unsupported reference normalization kind: ${input.kind}`);
};
```

Do not add a five-branch switch yet. That belongs to later cycles as each type is migrated.

### Step 4: Refactor ItemList Book Construction

Replace the ItemList `Book` object literal with a call to `normalizeBookReference`.

Run:

```bash
pnpm vitest run src/lib/bibliography/__tests__/normalize-jsonld.test.ts
```

### Step 5: Refactor Catalog Book Construction

Replace the catalog `Book` object literal with a call to `normalizeBookReference`.

Run:

```bash
pnpm vitest run src/lib/bibliography/__tests__/catalog.test.ts
```

### Step 6: Run Equivalence Suite

Run:

```bash
pnpm vitest run src/lib/bibliography/__tests__/reference-normalization-equivalence.test.ts
```

If the suite fails, inspect whether the failure is:

- a behaviour change caused by the refactor;
- a previously hidden divergence;
- a test projection issue.

Do not broaden the normalizer to fix unrelated divergences in this cycle.

---

## Test Plan

### New Suite: `normalize-reference.test.ts`

Use BDD-style grouping:

```ts
describe("normalizeBookReference", () => {
    describe("given complete Book normalization input", () => {
        test("returns the current NormalizedBookReference shape", () => {
            // ...
        });
    });

    describe("given optional Book metadata", () => {
        test("preserves catalog book IDs", () => {
            // ...
        });

        test("preserves page ranges", () => {
            // ...
        });
    });

    describe("given missing optional metadata", () => {
        test("omits optional fields instead of serializing empty values", () => {
            // ...
        });
    });
});
```

### Required Direct Cases

- complete `Book` with:
  - `id`
  - `rawType`
  - `title`
  - `description`
  - `authors`
  - `datePublished`
  - `keywords`
  - `publisherName`
  - `publisherUrl`
  - `bookTitle`
  - `bookId`
  - `pages`
  - `sourceLabel`
- minimal `Book` with required fields only;
- `chapter` derived from `title`;
- optional `bookId` preserved;
- optional `pages` preserved;
- missing optional metadata omitted.

### Existing Suites That Must Stay Green

```text
src/lib/bibliography/__tests__/reference-normalization-equivalence.test.ts
src/lib/bibliography/__tests__/normalize-jsonld.test.ts
src/lib/bibliography/__tests__/catalog.test.ts
```

Optional, if fast enough:

```text
src/components/ui/references/__tests__/ReferencesFromJsonLd.render.test.ts
src/components/ui/references/__tests__/ReferencesFromCatalog.render.test.ts
```

---

## Verification Commands

Focused normalizer and caller checks:

```bash
pnpm vitest run \
  src/lib/bibliography/__tests__/normalize-reference.test.ts \
  src/lib/bibliography/__tests__/reference-normalization-equivalence.test.ts \
  src/lib/bibliography/__tests__/normalize-jsonld.test.ts \
  src/lib/bibliography/__tests__/catalog.test.ts
```

Type checking:

```bash
pnpm exec tsc --noEmit
```

Optional render regression check:

```bash
pnpm vitest run \
  src/components/ui/references/__tests__/ReferencesFromJsonLd.render.test.ts \
  src/components/ui/references/__tests__/ReferencesFromCatalog.render.test.ts
```

Full unit suite if production code changes touch shared catalog paths broadly:

```bash
pnpm test:unit
```

Generated artifact check:

```bash
git diff -- src/data/bibliography/catalog.graph.generated.jsonld
```

Expected result:

```text
No generated bibliography artifact changes.
```

---

## Acceptance Criteria

- [x] `normalizeBookReference` exists in the shared normalization core.
- [x] `normalizeReference` supports `Book` and fails explicitly for unsupported kinds.
- [x] `BookNormalizationInput` is available to TypeScript callers through typed facade exports.
- [x] `normalize-jsonld.ts` uses the shared `Book` normalizer for final `Book` construction.
- [x] `catalog-core.mjs` uses the shared `Book` normalizer for final `Book` construction.
- [x] Non-`Book` branches remain unchanged.
- [x] ItemList strict/non-strict behaviour is unchanged.
- [x] Catalog pending-only tolerance is unchanged.
- [x] Existing equivalence, ItemList, and catalog tests stay green.
- [x] No generated bibliography artifacts change.
- [x] No rendering components change.
- [x] No new dependency is introduced.

## Implementation Notes

- Added `src/lib/bibliography/normalize/normalize-reference.mjs` with `normalizeBookReference` and the initial `normalizeReference` dispatcher.
- Added `src/lib/bibliography/normalize/normalize-reference-types.ts` for TypeScript-facing input and function contracts.
- Added `src/lib/bibliography/__tests__/normalize-reference.test.ts` for the direct `Book` normalization contract.
- Refactored only the final `Book` object construction in `normalize-jsonld.ts` and `catalog-core.mjs`.

## Verification Results

Verified on 2026-04-29:

```bash
pnpm vitest run src/lib/bibliography/__tests__/normalize-reference.test.ts src/lib/bibliography/__tests__/reference-normalization-equivalence.test.ts src/lib/bibliography/__tests__/normalize-jsonld.test.ts src/lib/bibliography/__tests__/catalog.test.ts
pnpm exec tsc --noEmit
pnpm exec vitest run --config vitest.astro.config.ts src/components/ui/references/__tests__/ReferencesFromJsonLd.render.test.ts src/components/ui/references/__tests__/ReferencesFromCatalog.render.test.ts
git diff -- src/data/bibliography/catalog.graph.generated.jsonld
```

Results:

- Focused normalizer and caller checks: 4 files passed, 44 tests passed.
- TypeScript check: passed.
- Focused reference render checks: 2 files passed, 22 tests passed.
- Generated bibliography catalog diff: no changes.

---

## Risk Controls

### Risk: The normalizer starts doing source-specific work

Mitigation:

- `normalizeBookReference` receives already-extracted values only.
- It does not inspect raw JSON-LD, graph nodes, lessons, usages, or pending tags.

### Risk: Optional field behaviour changes

Mitigation:

- Add direct tests for omitted optional fields.
- Compare against current `Book` output shape before replacing callers.

### Risk: Type safety regresses because the implementation is `.mjs`

Mitigation:

- Add a `.d.ts` declaration file or typed facade.
- Run `pnpm exec tsc --noEmit`.

### Risk: ItemList and catalog extraction differ subtly

Mitigation:

- Keep extraction source-specific in this cycle.
- Use equivalence tests only for semantically equivalent fields.
- Do not force equivalence for catalog-only IDs.

### Risk: Later reference types need different shared helpers

Mitigation:

- Do not extract author, publisher, or page helpers yet.
- Wait until at least one more reference type uses the shared path.
