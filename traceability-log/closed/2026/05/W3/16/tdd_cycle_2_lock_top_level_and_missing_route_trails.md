# [DONE] TDD Cycle 2: Lock Top-Level and Missing Route Trails

## Summary

Lock the non-nested contract of `LessonCatalogAdapter.findTrailByHref(href, options?)`.

This cycle proves three boundary behaviours:

1. A top-level authored lesson returns only itself by default.
2. A missing route returns an empty trail.
3. Blank or whitespace-only hrefs remain invalid and keep failing through `LessonHref`.

The goal is to prevent the adapter from silently introducing URL-derived ancestors or synthetic roots in the default
lookup path.

## Scope

### In scope

- `src/infrastructure/adapters/__tests__/LessonCatalogAdapter.behavior.test.ts`
- Behaviour tests for:
  - top-level lesson lookup;
  - missing route lookup;
  - blank and whitespace href validation.

### Out of scope

- `includeNotesRoot` behaviour.
- noisy href-normalization variants.
- group `href` / no-`href` ancestry cases.
- presentation adapters, layouts, breadcrumbs, or integration tests.
- refactoring production code unless the new focused tests expose a real contract gap.

## RED: Add Focused Behaviour Coverage

Group the new or reshaped tests under:

```ts
describe("findTrailByHref with top-level and missing routes", () => {
    // tests
});
```

Use a deliberately simple authored fixture rooted under the synthetic `Notes` group, with at least one top-level lesson:

```ts
{
  title: "Notes",
  children: [
    {
      title: "Top Level Lesson",
      href: "/notes/top-level/",
    },
  ],
}
```

Do not pass `includeNotesRoot`.

### Scenario 1: Top-level lesson returns only itself

Assert the exact trail:

```ts
expect(adapter.findTrailByHref("/notes/top-level/")).toEqual([
    { title: "Top Level Lesson", href: "/notes/top-level/" },
]);
```

This locks two important details:

- the synthetic `Notes` root is omitted by default;
- the adapter does not derive extra ancestors from URL segments.

### Scenario 2: Missing route returns an empty trail

Assert the exact not-found shape:

```ts
expect(adapter.findTrailByHref("/notes/does-not-exist/")).toEqual([]);
```

The adapter should not return `null`, `undefined`, a partial trail, or throw for a well-formed but unknown route.

### Scenario 3: Blank hrefs keep failing through `LessonHref`

Use table-driven coverage for blank-like values:

```ts
it.each(["", " ", "\t", "\n"])(
    "rejects blank href %j through LessonHref",
    (href) => {
        expect(() => adapter.findTrailByHref(href)).toThrow(
            "LessonHref cannot be empty",
        );
    },
);
```

This keeps malformed input validation owned by the `LessonHref` boundary rather than by ad hoc adapter checks.

## GREEN: Implement Only If Needed

Run the focused file:

```bash
pnpm vitest run src/infrastructure/adapters/__tests__/LessonCatalogAdapter.behavior.test.ts
```

If the tests already pass, do not change production code.

If code changes are needed, keep them local to the lookup/ancestry path inside `LessonCatalogAdapter`.

Preserve these contracts:

- authored ancestry is the source of truth;
- missing lessons return `[]`;
- blank hrefs throw from `LessonHref.create(...)`;
- default top-level trails do not include `Notes`;
- default trails do not include URL-derived ancestors.

## REFACTOR: Keep the Test Fixture Intentional

After the tests pass, clean up only test structure if needed.

Prefer:

- one small fixture factory for this `describe` block;
- exact-value assertions over length-only assertions;
- test names that describe the contract, not the implementation;
- no shared mutable fixture state across tests.

Avoid broadening this cycle into normalization, root-inclusion, or breadcrumb presentation behaviour.

## Docs / Traceability Update

After the focused suite passes, update or add the Cycle 2 traceability note in `catalog_trail_query.md`.

Record:

- the scenarios locked by this cycle;
- the exact command run;
- whether production adapter code changed;
- whether the existing implementation already satisfied the contract.

Suggested note shape:

````markdown
## Cycle 2: Top-Level and Missing Route Trails

Locked `LessonCatalogAdapter.findTrailByHref()` for non-nested lookups.

Verified:

- top-level lessons return a one-item authored trail by default;
- the synthetic `Notes` root remains omitted unless explicitly requested;
- missing routes return `[]`;
- blank hrefs continue to fail through `LessonHref`.

Test command:

```bash
pnpm vitest run src/infrastructure/adapters/__tests__/LessonCatalogAdapter.behavior.test.ts
```
````

Production changes: `<none | describe briefly>`.

````
## Acceptance Criteria

Cycle 2 is complete when:

- the top-level lesson trail is exactly:

  ```ts
  [{ title: "Top Level Lesson", href: "/notes/top-level/" }]
````

- a missing well-formed route returns exactly `[]`;
- blank and whitespace-only hrefs throw `"LessonHref cannot be empty"`;
- no default trail includes the synthetic `Notes` root;
- no URL-derived ancestors are introduced;
- the focused behaviour test file passes;
- the traceability note is updated.

## Result

Verified with:

```bash
pnpm vitest run src/infrastructure/adapters/__tests__/LessonCatalogAdapter.behavior.test.ts
```

Outcome:

- Passed without production code changes.
- The existing adapter already satisfied the top-level, missing-route, and blank-href contracts.
- The plan traceability note in `catalog_trail_query.md` was updated to record the completed cycle.
