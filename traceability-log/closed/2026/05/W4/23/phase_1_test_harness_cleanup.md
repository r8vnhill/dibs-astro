# [DONE] Phase 1: Test Harness Cleanup

------------------------------------------------------------------------------------------------------------------------

## Summary

Clean up `filters.test.ts` test scaffolding without changing production behaviour.

This phase is a **green refactor phase**: it should only improve fixture isolation, reduce duplication, and make route assertions easier to read. No new filtering semantics should be introduced yet.

------------------------------------------------------------------------------------------------------------------------

## Goals

* Remove shared mutable test fixture state.
* Make each test create its own manifest.
* Reduce repeated entry-construction boilerplate.
* Make route-list assertions concise and intention-revealing.
* Preserve all current behaviour expectations.

------------------------------------------------------------------------------------------------------------------------

## Non-Goals

* Do not change `src/filters.ts`.
* Do not add subtree boundary tests.
* Do not add empty-result tests.
* Do not introduce DDT yet.
* Do not introduce PBT.
* Do not change public API types.
* Do not touch generated `dist/` files.
* Do not update the changelog.

------------------------------------------------------------------------------------------------------------------------

## Key Changes

### 1. Add `createEntry`

Add a local helper in `filters.test.ts` that builds one manifest entry through the same public helpers already used by the fixture:

```ts
const createEntry = (
    route: string,
    title: string,
    sourceFile = `src/pages${route.slice(0, -1)}.astro`,
) => ({
    route: normalizeLessonRoute(route),
    exportRoute: deriveExportRoute(route),
    title,
    sourceFile,
    outputPath: derivePdfOutputPath(route),
});
```

Use the actual exported entry type name if one is already available. If not, rely on inference through the manifest fixture rather than introducing a new annotation.

### 2. Add `createManifest`

Replace the top-level shared `manifest` object with a factory:

```ts
const createManifest = () =>
    ({
        generatedAt: "2026-05-10T00:00:00.000Z",
        entries: [
            createEntry("/notes/a/", "A"),
            createEntry("/notes/software-libraries/b/", "B"),
            createEntry("/notes/software-libraries/c/", "C"),
        ],
    }) satisfies LessonExportManifest;
```

Keep the same three logical entries used by the current tests.

### 3. Add `routesOf`

Add a small assertion helper:

```ts
const routesOf = (manifest: LessonExportManifest) =>
    manifest.entries.map((entry) => entry.route);
```

Use it anywhere the test only cares about route order.

### 4. Update Existing Tests

Each test should create its own manifest:

```ts
const manifest = createManifest();
```

Update route assertions from:

```ts
expect(filtered.entries.map((entry) => entry.route)).toEqual([
    "/notes/a/",
    "/notes/software-libraries/b/",
    "/notes/software-libraries/c/",
]);
```

to:

```ts
expect(routesOf(filtered)).toEqual([
    "/notes/a/",
    "/notes/software-libraries/b/",
    "/notes/software-libraries/c/",
]);
```

### 5. Remove Entry Identity Assertion

Replace:

```ts
expect(filtered.entries[0]).toBe(manifest.entries[0]);
```

with:

```ts
expect(filtered.entries).toEqual(manifest.entries);
```

This keeps value coverage while avoiding a public contract around object identity.

------------------------------------------------------------------------------------------------------------------------

## Expected Final Test Shape

```ts
describe("given manifest filtering", () => {
    test("then all returns every entry in original order in a new manifest object", () => {
        const manifest = createManifest();

        const filtered = filterManifest(manifest, { kind: "all" });

        expect(filtered).not.toBe(manifest);
        expect(filtered.entries).not.toBe(manifest.entries);
        expect(routesOf(filtered)).toEqual(routesOf(manifest));
        expect(filtered.entries).toEqual(manifest.entries);
    });

    test("then exact route matching normalizes filter input", () => {
        const manifest = createManifest();

        const filtered = filterManifest(manifest, {
            kind: "exact-route",
            route: "notes/a",
        });

        expect(routesOf(filtered)).toEqual(["/notes/a/"]);
    });

    test("then subtree matching preserves original order", () => {
        const manifest = createManifest();

        const filtered = filterManifest(manifest, {
            kind: "subtree",
            routePrefix: "/notes/software-libraries",
        });

        expect(routesOf(filtered)).toEqual([
            "/notes/software-libraries/b/",
            "/notes/software-libraries/c/",
        ]);
    });
});
```

------------------------------------------------------------------------------------------------------------------------

## Implementation Order

1. Add `createEntry`.
2. Add `createManifest`.
3. Add `routesOf`.
4. Replace the shared top-level `manifest`.
5. Update each test to call `createManifest()`.
6. Replace repeated `entries.map(...)` assertions with `routesOf(...)`.
7. Replace entry identity assertion with value equality.
8. Run tests.
9. Confirm no production files changed.

------------------------------------------------------------------------------------------------------------------------

## Test Plan

From:

```text
astro-website/packages/lesson-export-core
```

run:

```bash
pnpm test
```

Expected result:

* all tests pass;
* no production code changes;
* no behavioural expectations change;
* diff is limited to `filters.test.ts`.

------------------------------------------------------------------------------------------------------------------------

## Stop Criteria

Stop Phase 1 once:

* every existing test passes;
* `filters.test.ts` no longer has a top-level shared manifest fixture;
* each test creates its own manifest;
* route assertions use `routesOf`;
* no new filtering behaviour has been added.

------------------------------------------------------------------------------------------------------------------------

## Implementation Notes

Implemented in `packages/lesson-export-core/tests/filters.test.ts`.

* Added `createEntry` to centralize manifest entry construction through the public route and output-path helpers.
* Replaced the shared top-level manifest fixture with `createManifest`, so each test owns its fixture state.
* Added `routesOf` for route-order assertions.
* Replaced the entry identity assertion with value equality over the manifest entries.
* Left production source files, generated `dist/` files, and changelog files unchanged.

## Validation

Run from `packages/lesson-export-core`:

```bash
pnpm test
```

Result: passed, 7 test files and 96 tests.
