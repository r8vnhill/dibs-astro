# [DONE] Phase 5 — Manifest Filtering Implementation Refactor

## Summary

Update only the `packages/lesson-export-core` implementation so the subtree contract pinned in Phase 4 becomes the
natural code path.

This phase should:

- remove raw subtree `startsWith` logic from `filterManifest`;
- normalize filter inputs once per branch;
- treat manifest entry routes as already canonical;
- make descendants-only subtree matching explicit;
- preserve wrapper-copy behavior in one return path;
- keep the public API unchanged.

## Goals

- Turn the Phase 4 subtree red tests green.
- Preserve all Phase 1–3 test coverage.
- Keep `filterManifest` small and intention-revealing.
- Centralize filter dispatch in one helper.
- Keep route semantics isolated in a small predicate.
- Avoid normalizing entry routes inside the filter loop.

## Non-Goals

- Do not change `LessonExportFilter`.
- Do not change `filterManifest(manifest, filter)`.
- Do not edit `src/routes.ts`.
- Do not update tests unless a test has a clear local mistake unrelated to the intended Phase 4 contract.
- Do not introduce PBT.
- Do not touch generated `dist/` files.
- Do not update the changelog.

## Key Changes

### 1. Keep `filterManifest` As The Public Wrapper

`filterManifest` should remain the only exported function changed in this file, and it should copy the manifest wrapper
in one place:

```ts
export const filterManifest = (
    manifest: LessonExportManifest,
    filter: LessonExportFilter,
): LessonExportManifest => ({
    ...manifest,
    entries: filterEntries(manifest.entries, filter),
});
```

This keeps wrapper-copy behavior explicit and stable.

### 2. Extract `filterEntries`

Move the filter-kind branching into a small private helper:

```ts
const filterEntries = (
    entries: readonly LessonExportManifestEntry[],
    filter: LessonExportFilter,
): LessonExportManifestEntry[] => {
    switch (filter.kind) {
        case "all":
            return [...entries];

        case "exact-route": {
            const route = normalizeLessonRoute(filter.route);
            return entries.filter((entry) => entry.route === route);
        }

        case "subtree": {
            const routePrefix = normalizeLessonRoute(filter.routePrefix);
            return entries.filter((entry) => isDescendantRoute(entry.route, routePrefix));
        }
    }
};
```

Use the actual manifest entry type exported by the package. If the project names it differently, prefer the existing
type instead of creating a new alias.

### 3. Add A Descendants-Only Predicate

Add a small private predicate that makes root exclusion explicit:

```ts
const isDescendantRoute = (
    route: LessonRoute,
    routePrefix: LessonRoute,
): boolean => route !== routePrefix && route.startsWith(routePrefix);
```

This works because both values are canonical `LessonRoute` values with leading and trailing slashes. Therefore:

```ts
"/notes/software-libraries/diary-of-a-madman/";
```

matches:

```ts
"/notes/software-libraries/";
```

but:

```ts
"/notes/software-libraries/";
```

does not match itself, and:

```ts
"/notes/software-libraries-advanced/bark-at-the-moon/";
```

does not match because the canonical prefix includes the trailing slash.

### 4. Preserve Existing Exact-Route Behavior

Exact-route filtering should continue to normalize only the filter input:

```ts
const route = normalizeLessonRoute(filter.route);
return entries.filter((entry) => entry.route === route);
```

Do not normalize `entry.route`; manifest entries already store canonical `LessonRoute` values.

### 5. Preserve `all` Wrapper-Copy Semantics

The `all` branch should return a new entries array:

```ts
return [...entries];
```

This keeps Phase 2 wrapper-copy tests green and avoids returning the original `manifest.entries` array.

## Relevant Files

- `packages/lesson-export-core/src/filters.ts` Primary implementation target.

- `packages/lesson-export-core/src/routes.ts` Reference only. Do not edit.

- `packages/lesson-export-core/src/manifest.ts` Reference for `LessonExportManifest` and entry type names.

- `packages/lesson-export-core/tests/filters.test.ts` Verification target only. The Phase 4 tests should turn green
  without changing their intent.

## Implementation Order

1. Open `src/filters.ts` and identify the current `filterManifest` implementation.
2. Add `isDescendantRoute`.
3. Add `filterEntries`.
4. Rewrite `filterManifest` as a thin wrapper around `filterEntries`.
5. Ensure the `all` branch returns a copied array.
6. Ensure exact-route and subtree branches normalize the user-provided filter input once.
7. Run the focused package tests.
8. Only edit tests if there is a clear typo or mismatch unrelated to the Phase 4 contract.

## Expected Implementation Shape

```ts
import type { LessonExportFilter, LessonExportManifest, LessonExportManifestEntry } from "./manifest";
import { type LessonRoute, normalizeLessonRoute } from "./routes";

const isDescendantRoute = (
    route: LessonRoute,
    routePrefix: LessonRoute,
): boolean => route !== routePrefix && route.startsWith(routePrefix);

const filterEntries = (
    entries: readonly LessonExportManifestEntry[],
    filter: LessonExportFilter,
): LessonExportManifestEntry[] => {
    switch (filter.kind) {
        case "all":
            return [...entries];

        case "exact-route": {
            const route = normalizeLessonRoute(filter.route);
            return entries.filter((entry) => entry.route === route);
        }

        case "subtree": {
            const routePrefix = normalizeLessonRoute(filter.routePrefix);
            return entries.filter((entry) => isDescendantRoute(entry.route, routePrefix));
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

Adjust import paths and type names to match the current codebase.

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

- Phase 4 subtree root-exclusion tests now pass;
- sibling-prefix boundary tests stay green;
- exact-route tests stay green;
- wrapper-copy tests stay green;
- DDT normalization tests stay green.

Then, from:

```text
astro-website
```

run, if available:

```bash
pnpm check:lesson-export-core
```

## Stop Criteria

Stop Phase 5 once:

- all focused package tests pass;
- Phase 4 red tests are green;
- `filterManifest` remains API-compatible;
- subtree filtering is descendants-only;
- entry routes are not renormalized inside the loop;
- wrapper-copy behavior is preserved;
- no generated files changed;
- no changelog entry was added.
