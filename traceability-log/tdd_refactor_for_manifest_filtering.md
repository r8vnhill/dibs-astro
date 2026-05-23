# [PLAN] TDD Refactor For Manifest Filtering

## Summary

Refactor `filterManifest` tests and implementation so manifest filtering has clearer contracts, isolated fixtures, table-driven route-normalisation coverage, and correct subtree path semantics.

Keep the public API unchanged:

```ts
filterManifest(manifest, filter)
```

and keep `LessonExportFilter` as-is.

The refactor should preserve the wrapper-copy contract: `filterManifest` returns a new manifest object and a new `entries` array, while tests should not require entry object identity to be preserved.

## Phase 1: Test Harness Cleanup [DONE]

### Goal

Improve the test structure without changing behaviour.

### Changes

* Replace the top-level shared `manifest` with `createManifest()`.
* Add `createEntry(route, title, sourceFile?)`.
* Add `routesOf(manifest)` for concise route assertions.
* Use `satisfies LessonExportManifest` for fixture objects.
* Keep all existing assertions behaviourally equivalent.

### Expected TDD State

This phase should stay green throughout. It is a safe refactor phase.

### Verification

Run the existing focused test suite and confirm there are no behavioural changes.

---

## Phase 2: Contract Expansion [DONE]

### Goal

Pin the stable public contracts before changing subtree semantics.

### Changes

Add tests for:

* wrapper copying;
* metadata preservation;
* empty exact-route results;
* empty subtree results;
* value equality instead of entry identity.

### Important Assertion Policy

Keep these assertions:

```ts
expect(filtered).not.toBe(manifest);
expect(filtered.entries).not.toBe(manifest.entries);
expect(filtered.generatedAt).toBe(manifest.generatedAt);
```

Prefer this:

```ts
expect(filtered.entries).toEqual(expectedEntries);
```

Avoid this:

```ts
expect(filtered.entries[0]).toBe(manifest.entries[0]);
```

unless reference reuse is intentionally promoted to public contract.

### Expected TDD State

These tests should pass with the current implementation unless there is already an undocumented contract gap.

### Verification

Implemented in `packages/lesson-export-core/tests/filters.test.ts` and verified with the focused package test suite.

---

## Phase 3: Normalisation Coverage With DDT

### Goal

Make route input normalisation explicit and compact.

### Changes

Convert exact-route normalisation coverage to `test.each`:

```ts
test.each([
    ["notes/blizzard-of-ozz"],
    ["/notes/blizzard-of-ozz"],
    ["notes/blizzard-of-ozz/"],
    ["/notes/blizzard-of-ozz/"],
])("then exact route matching normalizes %s", (route) => {
    const manifest = createManifest();

    const filtered = filterManifest(manifest, {
        kind: "exact-route",
        route,
    });

    expect(routesOf(filtered)).toEqual(["/notes/blizzard-of-ozz/"]);
});
```

Add equivalent DDT coverage for subtree prefixes:

```ts
test.each([
    ["notes/software-libraries"],
    ["/notes/software-libraries"],
    ["notes/software-libraries/"],
    ["/notes/software-libraries/"],
])("then subtree matching normalizes %s", (routePrefix) => {
    const manifest = createManifest();

    const filtered = filterManifest(manifest, {
        kind: "subtree",
        routePrefix,
    });

    expect(routesOf(filtered)).toEqual([
        "/notes/software-libraries/diary-of-a-madman/",
        "/notes/software-libraries/no-more-tears/",
    ]);
});
```

### Expected TDD State

This phase should probably stay green. It expands coverage around already-intended behaviour.

---

## Phase 4: Subtree Semantics Red Tests

### Goal

Pin the behaviour that requires implementation change.

### Changes

Add a test proving subtree root inclusion:

```ts
createEntry("/notes/software-libraries/", "Ozzmosis")
```

Expected routes:

```ts
[
    "/notes/software-libraries/",
    "/notes/software-libraries/diary-of-a-madman/",
    "/notes/software-libraries/no-more-tears/",
]
```

Add a failing sibling-prefix boundary test:

```ts
createEntry(
    "/notes/software-libraries-advanced/bark-at-the-moon/",
    "Bark at the Moon",
)
```

Filtering by:

```ts
"/notes/software-libraries"
```

must exclude:

```ts
"/notes/software-libraries-advanced/bark-at-the-moon/"
```

### Expected TDD State

This phase should go red if the current implementation uses raw `startsWith`.

---

## Phase 5: Implementation Refactor

### Goal

Make the implementation match the pinned contract with small, focused helpers.

### Changes

* Normalise filter inputs once.
* Extract a focused route predicate.
* Preserve wrapper copying in one return path.
* Keep the implementation small and readable.

Suggested helper:

```ts
const isSameRouteOrDescendant = (
    route: LessonRoute,
    routePrefix: LessonRoute,
): boolean => route === routePrefix || route.startsWith(routePrefix);
```

Suggested implementation shape:

```ts
const filterEntries = (
    entries: readonly LessonExportManifestEntry[],
    filter: LessonExportFilter,
): readonly LessonExportManifestEntry[] => {
    switch (filter.kind) {
        case "all":
            return [...entries];

        case "exact-route": {
            const route = normalizeLessonRoute(filter.route);
            return entries.filter((entry) => entry.route === route);
        }

        case "subtree": {
            const routePrefix = normalizeLessonRoute(filter.routePrefix);
            return entries.filter((entry) =>
                isSameRouteOrDescendant(entry.route, routePrefix),
            );
        }
    }
};

export const filterManifest = (
    manifest: LessonExportManifest,
    filter: LessonExportFilter,
): LessonExportManifest => ({
    ...manifest,
    entries: filterEntries(manifest.entries, filter),
});
```

### Expected TDD State

The red subtree boundary test should turn green.

---

## Phase 6: Verification And Stop Criteria

### Goal

Confirm the refactor is complete without expanding scope.

### Commands

From:

```text
astro-website/packages/lesson-export-core
```

run:

```bash
pnpm test
```

Then, from:

```text
astro-website
```

run, if available:

```bash
pnpm check:lesson-export-core
```

### Stop Criteria

Stop when:

* all focused tests pass;
* no public API changed;
* no generated `dist/` files changed;
* no changelog entry was added;
* PBT remains deferred.

## Deferred Future Phase: Property-Based Tests

Keep PBT out of this refactor. Add it later if filtering rules grow.

Useful future properties:

```text
For every manifest and exact route:
- every returned entry has the selected route;
- returned entries preserve original order;
- returned entries are a subset of the original entries;
- the input manifest is not mutated.
```

```text
For every manifest and subtree prefix:
- every returned entry is the root route or a descendant route;
- sibling prefixes are excluded;
- returned entries preserve original order;
- the input manifest is not mutated.
```

## Why This Grouping Is Better

The phase structure gives the refactor a cleaner rhythm:

1. **Phase 1** improves test maintainability.
2. **Phase 2** pins stable contracts.
3. **Phase 3** expands normalisation coverage.
4. **Phase 4** introduces the expected failing behaviour tests.
5. **Phase 5** performs the implementation change.
6. **Phase 6** verifies and stops.

That separation makes it easier to review each commit and avoids mixing harmless test cleanup with behavioural changes.
