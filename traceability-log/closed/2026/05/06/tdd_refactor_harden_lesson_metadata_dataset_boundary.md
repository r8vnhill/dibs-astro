# [PLAN] TDD Refactor: Harden Lesson Metadata Dataset Boundary

## Implementation Status

Implemented in this branch.

The lesson metadata utility now validates generated metadata as a strict infrastructure contract, wraps parser failures
in `LessonMetadataDatasetError`, deeply freezes parsed datasets, exposes readonly dataset types, and uses
`createLessonMetadataRepository(source)` for repository-scoped lazy caching. The legacy read APIs remain available
through the default repository:

- `getLessonMetadataDataset()`
- `resolveLessonMetadata(pathname)`
- compatibility date/pathname helpers

The public test reset hook `__resetLessonMetadataCache` was removed. Tests now use explicit repository instances when
they need isolated cache state.

Verification performed:

```sh
pnpm test:unit src/utils/__tests__/lesson-metadata.test.ts
```

In this Vitest configuration, that command also executed the broader unit suite; all reported unit tests passed.

## Summary

Refactor `astro-website/src/utils/lesson-metadata.ts` into a strict, immutable infrastructure boundary for generated
lesson metadata.

The refactor should preserve the legacy read APIs used by consumers while replacing module-global cache control with an
injectable repository factory. The generated JSON should be treated as untrusted input at the boundary: validate it
strictly once, freeze it deeply, cache it per repository instance, and expose only readonly data.

This phase does not change the generated metadata file, route normalization semantics, date formatting semantics, or
presentation/application behavior.

## Goals

- Make generated metadata validation fail fast and diagnostically.
- Prevent consumers from mutating the cached dataset.
- Remove test dependence on module-level reset state.
- Preserve the stable read API:
  - `getLessonMetadataDataset()`
  - `resolveLessonMetadata(pathname)`
  - compatibility date/pathname helpers.
- Keep the implementation small, local, and dependency-light.

## Non-Goals

- Do not manually edit `src/data/lesson-metadata.generated.json`.
- Do not change metadata generation.
- Do not change date parsing or pathname normalization semantics.
- Do not migrate consumers away from compatibility helpers.
- Do not clean or rewrite documentation in this phase.
- Do not add a new validation library; keep Zod.
- Do not introduce broad API redesign beyond the repository factory.

## Key Changes

### 1. Add explicit readonly dataset types

Add:

- `DeepReadonly<T>`
- `ReadonlyLessonMetadataDataset`
- `deepFreeze(value)`

Parsed datasets must be deeply frozen before being cached or returned.

Keep `DeepReadonly<T>` local unless the same type becomes useful in multiple modules. If it becomes shared later, move
it to a small internal type utility module as a separate cleanup.

### 2. Separate shape schemas from semantic dataset validation

Use strict Zod schemas for the raw generated shape:

- `z.strictObject` for dataset, entries, authors, and changes.
- Non-empty strings for required text fields where blank values are not meaningful.
- Valid URLs for optional author URLs.
- Valid ISO timestamp for `generatedAt`.
- Non-negative integers for `totalLessons` and `changesLimit`.
- Strict ISO short dates for `lastModified` and change dates.
- Normalized route keys for `entries`.

Then add dataset-level semantic validation with `superRefine`:

- `totalLessons === Object.keys(entries).length`
- `entry.changes.length <= changesLimit`
- optionally, `entry.lastModified` should be consistent with the newest change date if that invariant is already
  guaranteed by the generator.

Do not add the `lastModified` consistency rule unless the existing generated data already satisfies it and the generator
contract clearly intends it.

### 3. Add a domain-specific boundary error

Add:

```ts
export class LessonMetadataDatasetError extends Error {
    constructor(cause: unknown) {
        super("Generated lesson metadata is invalid.", { cause });
        this.name = "LessonMetadataDatasetError";
    }
}
```

`parseLessonMetadataDataset(source)` should call `safeParse`. On failure, throw `LessonMetadataDatasetError` with the
Zod error as `cause`.

This keeps Zod as an implementation detail of the boundary while still preserving diagnostics for tests and debugging.

### 4. Add `createLessonMetadataRepository(source)`

Add an injectable repository factory with instance-local lazy cache:

```ts
export type LessonMetadataRepository = {
    dataset(): ReadonlyLessonMetadataDataset;
    resolve(pathname: string): LessonMetadataEntry | undefined;
};

export const createLessonMetadataRepository = (
    source: unknown,
): LessonMetadataRepository => {
    let cachedDataset: ReadonlyLessonMetadataDataset | undefined;

    const dataset = (): ReadonlyLessonMetadataDataset => {
        cachedDataset ??= parseLessonMetadataDataset(source);
        return cachedDataset;
    };

    const resolve = (pathname: string): LessonMetadataEntry | undefined => {
        const normalizedPathname = normalizeLessonPathname(pathname);
        return dataset().entries[normalizedPathname];
    };

    return { dataset, resolve };
};
```

The exact implementation can differ, but the behaviour should remain:

- parsing is lazy;
- parsing happens at most once per repository instance;
- separate repositories do not share cache state;
- lookup uses existing normalization semantics.

### 5. Preserve default exports through a default repository

Wire the existing consumer API through a module-local default repository:

```ts
const defaultLessonMetadataRepository = createLessonMetadataRepository(metadataRaw);

export const getLessonMetadataDataset = defaultLessonMetadataRepository.dataset;

export const resolveLessonMetadata = defaultLessonMetadataRepository.resolve;
```

This keeps consumers stable while removing the need for `__resetLessonMetadataCache`.

### 6. Remove `__resetLessonMetadataCache`

Remove the public reset hook after repository-based tests cover the replacement behaviour.

Update tests to instantiate repositories with explicit sources instead of mutating module-level state.

### 7. Keep compatibility wrappers for now

Keep wrappers or aliases for:

- pathname normalization;
- ISO short date parsing;
- date formatting.

Do not collapse these exports during this refactor. Removing or aliasing the facade should be a later compatibility
cleanup, because this phase is already changing validation, immutability, and cache control.

## TDD Cycles

### Cycle 1: Lock current public read behaviour

Before hardening, add or adjust tests that prove the current public API still works:

- `getLessonMetadataDataset()` returns the generated dataset.
- `resolveLessonMetadata(pathname)` resolves known metadata.
- lookup still accepts the same pathname variants as before:
  - missing leading slash;
  - query string;
  - fragment;
  - URL-like input if currently supported.
- date/pathname compatibility helpers preserve existing behaviour.

Verification:

```sh
pnpm test:unit src/utils/__tests__/lesson-metadata.test.ts
```

This cycle should be red only if the existing test suite is missing coverage; implementation should be minimal or none.

### Cycle 2: Add strict schema rejection tests

Add BDD/DDT tests for invalid generated datasets.

Use table-driven cases for:

- extra keys at dataset level;
- extra keys in entries;
- extra keys in authors;
- extra keys in changes;
- invalid route keys;
- invalid `generatedAt`;
- invalid `lastModified`;
- invalid change date;
- negative `totalLessons`;
- non-integer `totalLessons`;
- negative `changesLimit`;
- non-integer `changesLimit`;
- invalid author URL;
- mismatched `totalLessons`;
- `changes.length > changesLimit`.

Expected behaviour:

- `parseLessonMetadataDataset(source)` throws `LessonMetadataDatasetError`;
- `error.cause` is the underlying Zod error.

Implementation:

- introduce strict schemas;
- introduce `LessonMetadataDatasetError`;
- switch parsing to `safeParse`;
- add semantic validation with `superRefine`.

Verification:

```sh
pnpm test:unit src/utils/__tests__/lesson-metadata.test.ts
```

### Cycle 3: Add the immutability contract

Add tests proving these structures cannot be mutated after parsing:

- dataset object;
- `entries`;
- individual entry objects;
- `authors` arrays;
- author objects;
- `changes` arrays;
- change objects.

Also test that repeated calls return the same frozen instance where cache behaviour already exists.

Implementation:

- add `DeepReadonly<T>`;
- add `ReadonlyLessonMetadataDataset`;
- add `deepFreeze`;
- return readonly datasets from `parseLessonMetadataDataset`;
- ensure cached/default APIs expose `ReadonlyLessonMetadataDataset`.

Keep `deepFreeze` small and local. Avoid clever generic recursion beyond what the dataset shape needs.

Verification:

```sh
pnpm test:unit src/utils/__tests__/lesson-metadata.test.ts
```

### Cycle 4: Introduce repository factory without removing the reset hook yet

Add tests for `createLessonMetadataRepository(source)`:

- does not parse until `dataset()` or `resolve()` is called;
- parses at most once per repository instance;
- returns the same dataset instance on repeated `dataset()` calls;
- resolves metadata by normalized pathname;
- separate repository instances have separate caches;
- invalid source fails through `LessonMetadataDatasetError`.

Implementation:

- add `LessonMetadataRepository`;
- add `createLessonMetadataRepository(source)`;
- internally delegate to `parseLessonMetadataDataset`.

Keep the existing default APIs and reset hook temporarily during this cycle to reduce migration risk.

Verification:

```sh
pnpm test:unit src/utils/__tests__/lesson-metadata.test.ts
```

### Cycle 5: Rewire default API and remove global reset

Rewire:

- `getLessonMetadataDataset`
- `resolveLessonMetadata`

through a default repository created from `metadataRaw`.

Then remove:

- `__resetLessonMetadataCache`;
- tests that depend on it;
- imports that reference it.

Update existing cache tests to use explicit repository instances.

Verification:

```sh
pnpm test:unit src/utils/__tests__/lesson-metadata.test.ts
```

### Cycle 6: Update downstream readonly typing

Update downstream code that expects mutable dataset types.

Likely targets:

- `LessonMetadataAdapter`
- `LessonMetadataServiceImpl`
- presentation bridge tests
- any test fixture helpers that mutate parsed datasets after parsing.

Prefer changing consumers to accept readonly data rather than cloning mutable copies. Only clone when a consumer truly
needs ownership for transformation.

Verification:

```sh
pnpm test:unit src/infrastructure/adapters/__tests__/LessonMetadataAdapter.test.ts
pnpm test:unit src/application/services/__tests__/LessonMetadataServiceImpl.test.ts
pnpm test:unit src/presentation/adapters/__tests__/lesson-metadata-bridge.test.ts
```

### Cycle 7: Add focused PBT for normalization-facing repository behaviour

Add property-based tests only where properties are stable and meaningful.

Recommended properties:

- normalized lookup is idempotent;
- normalized lookup never depends on query strings or fragments;
- repository lookup agrees with direct dataset access after normalization;
- unknown normalized paths resolve to `undefined`.

Use `fast-check` directly if that is the current project convention. If adding or standardizing PBT integration, prefer
`@fast-check/vitest` because it provides Vitest-specific property-test ergonomics and lifecycle integration.

Verification:

```sh
pnpm test:unit src/utils/__tests__/lesson-metadata.test.ts
```

### Cycle 8: Run architecture and full affected checks

Run the complete affected verification set:

```sh
pnpm test:unit src/utils/__tests__/lesson-metadata.test.ts
pnpm test:unit src/infrastructure/adapters/__tests__/LessonMetadataAdapter.test.ts
pnpm test:unit src/application/services/__tests__/LessonMetadataServiceImpl.test.ts
pnpm test:unit src/presentation/adapters/__tests__/lesson-metadata-bridge.test.ts
pnpm run check:architecture
```

If readonly typing affects more consumers than expected, run the broader local gate:

```sh
pnpm check
```

## Test Strategy

### BDD

Use behaviour-oriented `describe` blocks:

- `describe("parseLessonMetadataDataset")`
- `describe("createLessonMetadataRepository")`
- `describe("resolveLessonMetadata")`

Prefer behaviour names such as:

- `"rejects generated datasets with unknown fields"`
- `"caches parsed metadata per repository instance"`
- `"returns deeply frozen metadata"`

### DDT

Use `it.each` for schema rejection cases. Keep each case narrow:

- case name;
- source mutation;
- expected failing path or message substring.

Avoid one giant invalid fixture per test. Start from a small valid fixture and mutate one concern at a time.

### PBT

Use PBT only for stable invariants, not generated JSON shape validation.

Good PBT targets:

- normalization idempotence;
- query/fragment stripping;
- lookup equivalence after normalization.

Avoid PBT for:

- every Zod schema branch;
- large generated metadata fixtures;
- timestamp/date validity rules already covered by DDT.

## Implementation Notes

### Prefer small helpers

Keep helpers focused:

- `parseLessonMetadataDataset`
- `deepFreeze`
- `createLessonMetadataRepository`
- `createDatasetIssue` if semantic validation starts duplicating `ctx.addIssue`.

If a helper exceeds roughly 25 lines, split by responsibility.

### Avoid over-generalizing `deepFreeze`

This module only needs to freeze generated JSON-compatible structures. It does not need to support:

- `Map`
- `Set`
- class instances
- cyclic objects
- functions
- symbols

If that requirement appears later, replace the helper deliberately rather than prematurely designing a generic object
graph freezer.

### Be careful with readonly arrays

Prefer readonly output types at the boundary:

```ts
ReadonlyLessonMetadataDataset;
```

Do not cast back to mutable types in downstream consumers. If tests need mutable fixtures, mutate the raw fixture before
parsing.

### Optional TypeScript cleanup

Where local constants must satisfy a type without widening unnecessarily, use `satisfies`. This is useful for default
formatter options or fixture builders, but it should not become a major refactor in this phase.

## Assumptions

- Strict validation is desired; future generated metadata with extra fields must update the schema first.
- Removing `__resetLessonMetadataCache` is an intentional test/API cleanup.
- Existing generated metadata already satisfies the stricter schema.
- `zod`, Vitest, and `fast-check` are already available.
- `@fast-check/vitest` may be added only if the project wants a cleaner Vitest-native PBT style.
- Existing route normalization and date parsing functions are the source of truth for semantic validation.
