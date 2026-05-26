# [DONE] Refactor Page Reference Core With Shared Runtime Semantics

## Summary

Refactor the numeric page-reference utilities so the JavaScript catalog path and the typed TypeScript/Astro/UI path share the same runtime semantics.

This refactor keeps the domain intentionally narrow: a page reference is still a positive, safe-integer numeric page or numeric page range. The goal is not to introduce text parsing, citation locators, Roman numerals, article numbers, or broader bibliographic locator modelling.

The refactor introduces two contract improvements:

1. untrusted parsing boundaries accept `unknown`-style inputs and reject non-inspectable values safely;
2. `formatPageReference` accepts partial format options and merges them with defaults.

No public API names should be renamed, and no generated bibliography data shapes should change.

## Goals

- Prevent behavioural drift between `pages-core.mjs` and `pages.ts`.
- Keep `pages-core.mjs` as the single runtime source of truth where feasible.
- Keep `pages.ts` as a typed facade over the shared runtime implementation.
- Make boundary parsing safer for untrusted catalog, JSON-LD, and metadata inputs.
- Make formatter customisation partial and robust.
- Preserve numeric-only page-reference semantics.
- Preserve existing callers unless they were depending on incomplete formatter options rendering `undefined`.

## Non-Goals

- Do not add `parsePageReferenceText`.
- Do not add `LocatorReference`.
- Do not support Roman numerals, article locators, sections, chapters, or mixed alphanumeric page labels.
- Do not make `formatPageReference` defensive over arbitrary values.
- Do not introduce a production dependency.
- Do not rename existing exported APIs.
- Do not change generated bibliography object shapes.

## Key Design Decisions

### 1. `pages-core.mjs` owns runtime behaviour

Move shared behaviour into `pages-core.mjs` and make `pages.ts` delegate to it rather than reimplementing equivalent logic.

`pages-core.mjs` should expose the runtime helpers needed by both paths:

```js
export const DEFAULT_PAGE_FORMAT = Object.freeze({
  singleLabel: "p.",
  rangeLabel: "pp.",
  separator: "–",
});

export const isValidPageNumber = (value) =>
  typeof value === "number" && Number.isSafeInteger(value) && value > 0;

export const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);
```

Prefer a small helper set:

- `isRecord(value)`
- `isValidPageNumber(value)`
- `parsePageNumber(value)`
- `toPageReference(start, end?)`
- `createOrderedPageReference(first, second)`
- `resolvePageFormat(options)`
- `isPageReference(value)`
- `parsePageReference(start, end?)`
- `parsePageReferenceInput(input)`
- `formatPageReference(pages, options?)`

This keeps the core cohesive and avoids making `pages.ts` a second implementation.

### 2. Treat untrusted boundaries as untrusted

Parsing functions should accept arbitrary values at runtime.

`parsePageReferenceInput(input)` should return `undefined` for:

- `undefined`
- `null`
- booleans
- numbers
- strings
- symbols
- functions
- arrays
- objects without a valid `start`
- objects with invalid `end`
- objects with `start > end` only when validating via `isPageReference`

`parsePageReference(start, end)` may still reorder valid numeric bounds because it is a constructor-like parser.

This distinction is important:

```ts
isPageReference({ start: 10, end: 2 }) // false
parsePageReference(10, 2)              // { start: 2, end: 10 }
```

The guard validates an already-normalised value. The parser normalises raw numeric bounds.

### 3. Keep formatter strict over trusted values

`formatPageReference` should not repair, reorder, or validate arbitrary input. It should format `PageReference | undefined`.

Allowed:

```ts
formatPageReference(undefined)
formatPageReference({ start: 1 })
formatPageReference({ start: 1, end: 3 })
formatPageReference(pages, { singleLabel: "page" })
```

Not required:

```ts
formatPageReference({ start: "1" })
formatPageReference({ start: 10, end: 2 })
formatPageReferenceInput(input)
```

Add `formatPageReferenceInput` only if a real caller currently needs defensive formatting.

### 4. Merge partial format options with defaults

Change formatter options from all-or-nothing to partial customisation.

```ts
formatPageReference({ start: 1, end: 3 }, { singleLabel: "page" })
```

should still use the default `rangeLabel` and `separator`:

```txt
pp. 1–3
```

This avoids accidental output such as:

```txt
undefined 1undefined3
```

### 5. Keep the `PageNumber` brand optional

Use a `PageNumber` brand only if it improves the typed facade without causing noisy casts across consumers.

Preferred conservative option:

```ts
export interface PageReference {
  readonly start: number;
  readonly end?: number;
}
```

Stricter option, only if ergonomic:

```ts
declare const pageNumberBrand: unique symbol;

export type PageNumber = number & {
  readonly [pageNumberBrand]: "PageNumber";
};

export interface PageReference {
  readonly start: PageNumber;
  readonly end?: PageNumber;
}
```

If callers already trust `PageReference` as the validated boundary, keeping only the existing `PageReference` abstraction is probably enough for this cycle.

## Implementation Plan

### Cycle 1: Lock Existing Core Behaviour

Add focused tests for `pages-core.mjs` before changing implementation.

Create:

```txt
src/lib/bibliography/__tests__/pages-core.test.ts
```

Cover current behaviour for:

- valid page numbers;
- invalid page numbers;
- missing start;
- missing end;
- reversed ranges;
- equal bounds;
- single-page formatting;
- range formatting;
- default format options;
- `isPageReference` guard behaviour.

Run:

```sh
pnpm test:unit -- src/lib/bibliography/__tests__/pages-core.test.ts
```

Expected result: tests pass against the current implementation, except for tests intentionally added in Cycle 2.

### Cycle 2: Add New Contract Tests

Add failing tests for the intended contract changes.

#### Boundary parsing

Use DDT cases for `parsePageReferenceInput(input)`:

```ts
it.each([
  undefined,
  null,
  true,
  false,
  1,
  "1",
  Symbol("page"),
  () => ({ start: 1 }),
  [],
  [1, 2],
  {},
  { end: 2 },
  { start: 0 },
  { start: -1 },
  { start: 1.5 },
  { start: Number.MAX_SAFE_INTEGER + 1 },
  { start: 1, end: "2" },
])("rejects invalid page-reference input: %p", (input) => {
  expect(parsePageReferenceInput(input)).toBeUndefined();
});
```

Add positive cases:

```ts
it.each([
  [{ start: 1 }, { start: 1 }],
  [{ start: 1, end: 3 }, { start: 1, end: 3 }],
  [{ start: 3, end: 1 }, { start: 1, end: 3 }],
])("parses valid page-reference input: %p", (input, expected) => {
  expect(parsePageReferenceInput(input)).toEqual(expected);
});
```

#### Partial formatter options

Add cases showing missing formatter fields fall back to defaults:

```ts
expect(
  formatPageReference({ start: 1, end: 3 }, { singleLabel: "page" }),
).toBe("pp. 1–3");

expect(
  formatPageReference({ start: 1 }, { rangeLabel: "pages" }),
).toBe("p. 1");
```

#### Core/facade equivalence

Add representative equivalence cases comparing `pages-core.mjs` and `pages.ts` outputs for:

- `isValidPageNumber`;
- `isPageReference`;
- `parsePageReference`;
- `parsePageReferenceInput`;
- `formatPageReference`.

This ensures the typed path and JS path cannot silently drift.

### Cycle 3: Refactor `pages-core.mjs`

Refactor the runtime core around small helpers.

Suggested shape:

```js
const toPageReference = (start, end) => ({
  start,
  ...(end !== undefined ? { end } : {}),
});

const parsePageNumber = (value) =>
  isValidPageNumber(value) ? value : undefined;

const createOrderedPageReference = (first, second) =>
  first <= second
    ? toPageReference(first, second)
    : toPageReference(second, first);

export const resolvePageFormat = (options = {}) => ({
  ...DEFAULT_PAGE_FORMAT,
  ...(isRecord(options) ? options : {}),
});
```

Then keep public functions small:

```js
export function parsePageReference(start, end) {
  const pageStart = parsePageNumber(start);
  if (pageStart === undefined) return undefined;

  if (end === undefined) return toPageReference(pageStart);

  const pageEnd = parsePageNumber(end);
  if (pageEnd === undefined) return undefined;

  return createOrderedPageReference(pageStart, pageEnd);
}
```

```js
export function parsePageReferenceInput(input) {
  if (!isRecord(input)) return undefined;

  return parsePageReference(input.start, input.end);
}
```

```js
export function formatPageReference(pages, options) {
  if (!pages) return undefined;

  const format = resolvePageFormat(options);
  const isSinglePage = pages.end === undefined || pages.start === pages.end;

  return isSinglePage
    ? `${format.singleLabel} ${pages.start}`
    : `${format.rangeLabel} ${pages.start}${format.separator}${pages.end}`;
}
```

Important: `formatPageReference` may assume `pages` is trusted. Do not add validation here unless a current caller passes untrusted data directly.

### Cycle 4: Refactor `pages.ts` as a Typed Facade

Keep TypeScript exports stable:

```ts
export interface PageReference {
  readonly start: number;
  readonly end?: number;
}

export interface PageReferenceInput {
  readonly start?: unknown;
  readonly end?: unknown;
}

export interface PageFormatOptions {
  readonly singleLabel: string;
  readonly rangeLabel: string;
  readonly separator: string;
}
```

Update formatter options:

```ts
export function formatPageReference(
  pages: PageReference | undefined,
  options?: Partial<PageFormatOptions>,
): string | undefined;
```

Delegate runtime behaviour to `pages-core.mjs`.

If TypeScript needs declarations for the `.mjs` module, add a narrow declaration file or local type assertions rather than duplicating logic.

Preferred direction:

```ts
import {
  formatPageReference as formatCorePageReference,
  isPageReference as isCorePageReference,
  isValidPageNumber as isCoreValidPageNumber,
  parsePageReference as parseCorePageReference,
  parsePageReferenceInput as parseCorePageReferenceInput,
} from "./pages-core.mjs";
```

Then wrap only for types:

```ts
export const isValidPageNumber = isCoreValidPageNumber as (
  value: unknown,
) => value is number;

export const isPageReference = isCorePageReference as (
  value: unknown,
) => value is PageReference;

export const parsePageReference = parseCorePageReference as (
  start: unknown,
  end?: unknown,
) => PageReference | undefined;
```

Avoid reimplementing predicates in TypeScript unless there is a specific compiler limitation.

### Cycle 5: Simplify Facade Tests

After core behaviour is covered, reduce `pages.test.ts` to facade-level guarantees:

- exported TypeScript functions exist;
- type guard narrows representative values;
- facade output matches core output;
- existing consumers still compile and pass;
- branded/trusted boundary behaviour remains intact if the current API uses branding.

Do not duplicate every runtime DDT case in both test files.

## Property-Based Tests

Keep or add `fast-check` properties at the core level.

Recommended properties:

### Ordering

For any two valid positive safe integers, parsing produces an ordered range.

```ts
fc.property(validPageNumber(), validPageNumber(), (a, b) => {
  const result = parsePageReference(a, b);

  expect(result).toEqual({
    start: Math.min(a, b),
    end: Math.max(a, b),
  });
});
```

### Idempotence

Any value accepted by `isPageReference` remains valid after parsing its own fields.

```ts
fc.property(validPageReference(), (pages) => {
  expect(parsePageReferenceInput(pages)).toEqual(pages);
});
```

### Guard/parser agreement for normalised values

Every result produced by `parsePageReference` should satisfy `isPageReference`.

```ts
fc.property(validPageNumber(), validPageNumber(), (a, b) => {
  const result = parsePageReference(a, b);

  expect(result).toBeDefined();
  expect(isPageReference(result)).toBe(true);
});
```

### Formatting totality over valid references

Every valid page reference should format to a non-empty string.

```ts
fc.property(validPageReference(), (pages) => {
  const result = formatPageReference(pages);

  expect(result).toEqual(expect.any(String));
  expect(result.length).toBeGreaterThan(0);
});
```

## Test Plan

Run focused tests first:

```sh
pnpm test:unit -- src/lib/bibliography/__tests__/pages-core.test.ts
pnpm test:unit -- src/lib/bibliography/__tests__/pages.test.ts
```

Then run bibliography consumers:

```sh
pnpm test:unit -- src/lib/bibliography/__tests__/catalog.test.ts
pnpm test:unit -- src/lib/bibliography/__tests__/normalize-jsonld.test.ts
pnpm test:unit -- src/lib/bibliography/__tests__/reference-normalization-equivalence.test.ts
```

Then run the broader local verification gate:

```sh
pnpm check
```

## Acceptance Criteria

- `pages-core.mjs` is the runtime source of truth for page-reference semantics.
- `pages.ts` delegates to `pages-core.mjs` rather than maintaining an independent implementation.
- `parsePageReferenceInput` safely rejects non-object and array inputs.
- `isValidPageNumber` rejects non-numbers internally.
- `parsePageReference` still normalises reversed valid numeric ranges.
- `isPageReference` still rejects reversed ranges.
- `formatPageReference` accepts `Partial<PageFormatOptions>`.
- Partial formatter options are merged with defaults.
- `formatPageReference` remains strict over trusted `PageReference` values.
- No new production dependency is added.
- No broader locator abstraction is introduced.
- Existing public API names remain unchanged.
- Existing generated bibliography data shapes remain unchanged.
- All focused and consumer tests pass.

## Risks and Mitigations

### Risk: TypeScript facade duplicates runtime logic again

Mitigation: delegate directly to `pages-core.mjs` and use type-level wrappers only where necessary.

### Risk: `.mjs` imports become awkward from TypeScript

Mitigation: add a narrow declaration file for `pages-core.mjs` if needed, rather than moving shared runtime logic back into `pages.ts`.

### Risk: partial formatter options hide invalid option objects

Mitigation: only accept object-like options in `resolvePageFormat`; otherwise fall back to defaults. Keep formatter options typed as `Partial<PageFormatOptions>` in TypeScript.

### Risk: arrays pass `typeof value === "object"`

Mitigation: define `isRecord` as non-null object and non-array.

### Risk: behaviour changes leak into generated bibliography output

Mitigation: run catalog, JSON-LD normalisation, and equivalence tests after focused tests.

## Assumptions

- Numeric-only page references are sufficient for the current bibliography model.
- The only intentional output change is that incomplete formatter options now fall back to defaults.
- `fast-check` is already available and remains the right dependency for invariant tests.
- Existing callers do not require defensive formatting of arbitrary values.
- Existing public API names and bibliography data shapes must remain stable.