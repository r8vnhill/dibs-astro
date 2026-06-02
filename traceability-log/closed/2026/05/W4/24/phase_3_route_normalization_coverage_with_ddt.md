# [DONE] Phase 3 — Route Normalization Coverage With DDT

## Summary

Expanded `packages/lesson-export-core/tests/filters.test.ts` with table-driven route-normalization coverage for
`filterManifest`.

This phase was **test-only** and stayed green. It made the existing exact-route and subtree prefix normalization
contract explicit without changing `packages/lesson-export-core/src/filters.ts`.

## Goals

- Replace the single exact-route normalization example with DDT coverage.
- Add equivalent DDT coverage for subtree prefix normalization.
- Keep assertions focused on returned canonical routes via `routesOf(...)`.
- Preserve all Phase 1 and Phase 2 contract tests unchanged.
- Keep the implementation untouched.

## Non-Goals

- Do not change `src/filters.ts`.
- Do not add subtree root-inclusion tests.
- Do not add sibling-prefix boundary tests.
- Do not add PBT.
- Do not change public API types.
- Do not touch generated `dist/` files.
- Do not update the changelog.

## Preconditions

Phase 3 assumes these helpers already exist in `filters.test.ts`:

```ts
createEntry(route, title, sourceFile?)
createManifest()
routesOf(manifest)
expectCopiedManifest(filtered, manifest)
```

If `expectCopiedManifest` was added in Phase 2, keep using it only where wrapper-copy behaviour is under test. The new
DDT tests should stay focused on route normalization.

## Key Changes

### 1. Keep Existing Contract Tests Intact

Review `packages/lesson-export-core/tests/filters.test.ts` and leave the following tests unchanged:

- wrapper-copy tests;
- metadata-preservation tests;
- empty-result tests;
- non-normalization route-order tests.

This keeps Phase 3 limited to normalization coverage.

### 2. Replace Exact-Route Normalization Example With `test.each`

Use named cases instead of bare tuples so Vitest output is easier to diagnose.

```ts
test.each([
    { label: "bare path", route: "notes/a" },
    { label: "leading slash", route: "/notes/a" },
    { label: "trailing slash", route: "notes/a/" },
    { label: "leading and trailing slash", route: "/notes/a/" },
])("then exact route matching normalizes a $label", ({ route }) => {
    const manifest = createManifest();

    const filtered = filterManifest(manifest, {
        kind: "exact-route",
        route,
    });

    expect(routesOf(filtered)).toEqual(["/notes/a/"]);
});
```

### 3. Add Subtree Prefix Normalization DDT

Add a matching table for subtree prefixes.

```ts
test.each([
    { label: "bare path", routePrefix: "notes/software-libraries" },
    { label: "leading slash", routePrefix: "/notes/software-libraries" },
    { label: "trailing slash", routePrefix: "notes/software-libraries/" },
    {
        label: "leading and trailing slash",
        routePrefix: "/notes/software-libraries/",
    },
])("then subtree matching normalizes a $label prefix", ({ routePrefix }) => {
    const manifest = createManifest();

    const filtered = filterManifest(manifest, {
        kind: "subtree",
        routePrefix,
    });

    expect(routesOf(filtered)).toEqual([
        "/notes/software-libraries/b/",
        "/notes/software-libraries/c/",
    ]);
});
```

### 4. Keep Assertions Value-Based

Use:

```ts
expect(routesOf(filtered)).toEqual(expectedRoutes);
```

Do not assert entry identity:

```ts
expect(filtered.entries[0]).toBe(manifest.entries[0]);
```

This keeps the tests aligned with the public behaviour, not the current object-reuse implementation.

## Relevant Files

- `packages/lesson-export-core/tests/filters.test.ts` Convert exact-route normalization coverage to DDT and add subtree
  prefix DDT.

- `packages/lesson-export-core/src/filters.ts` Must remain unchanged in this phase.

- `packages/lesson-export-core/src/routes.ts` Existing normalization helper explains why the route-shape variants
  collapse to canonical routes, but should not be edited.

## Verification

From:

```text
astro-website/packages/lesson-export-core
```

run:

```bash
pnpm test
```

Expected result:

- test suite stays green;
- only `filters.test.ts` changes;
- no source implementation changes;
- no public API changes;
- no generated `dist/` changes;
- no changelog changes.

Verified with `pnpm test` in `astro-website/packages/lesson-export-core`.

Result: 7 test files passed, 106 tests passed.

For faster local iteration, run the same package test command with a Vitest filename/name filter for `filters.test.ts`
if the project already supports that pattern.

## Commit Boundary

Use one small test-only commit, for example:

```text
test(lesson-export-core): cover manifest route normalization with ddt
```

## Stop Criteria

Stop Phase 3 once:

- exact-route normalization is covered through table-driven cases;
- subtree prefix normalization is covered through table-driven cases;
- existing contract tests remain intact;
- `src/filters.ts` is unchanged;
- the focused package test suite passes.
