# [DONE] TDD Cycle 1: Lock the Authored Nested Trail Contract

## Summary

Lock the basic contract of `LessonCatalogAdapter.findTrailByHref(href, options?)`: given a lesson `href`, the adapter
returns the authored catalog ancestry plus the matched lesson.

This cycle focuses only on the nested happy path. Its purpose is to prove that the trail comes from the catalog tree,
not from URL segment parsing.

## Implementation Status

Implemented and verified.

- Added the focused authored nested-trail behavior test in
  `src/infrastructure/adapters/__tests__/LessonCatalogAdapter.behavior.test.ts`.
- Confirmed the existing `LessonCatalogAdapter.findTrailByHref()` implementation already satisfies the cycle contract.
- Left production adapter code unchanged.
- Verified with:

  ```bash
  pnpm vitest run src/infrastructure/adapters/__tests__/LessonCatalogAdapter.behavior.test.ts
  ```

  Result: 13 tests passed.

## Design Intent

`findTrailByHref()` is the infrastructure-side source of truth for catalog trails. It should preserve authored catalog
metadata exactly:

- authored `title`;
- authored `href`;
- authored parent-child structure;
- default omission of the synthetic `Notes` root.

This keeps breadcrumb rendering and presentation adapters free from catalog traversal logic.

## Scope

### In scope

- Add or reshape one focused behavior test in:

  ```bash
  src/infrastructure/adapters/__tests__/LessonCatalogAdapter.behavior.test.ts
  ```

- Use a deliberately non-isomorphic fixture where the group title cannot be derived from the URL:

  ```ts
  {
    title: "Notes",
    children: [
      {
        title: "Build Systems",
        href: "/notes/scripting/",
        children: [
          {
            title: "Tasks as Abstractions",
            href: "/notes/scripting/tasks-as-abstractions/",
          },
        ],
      },
    ],
  }
  ```

- Assert the exact trail:

  ```ts
  expect(adapter.findTrailByHref("/notes/scripting/tasks-as-abstractions/")).toEqual([
      { title: "Build Systems", href: "/notes/scripting/" },
      {
          title: "Tasks as Abstractions",
          href: "/notes/scripting/tasks-as-abstractions/",
      },
  ]);
  ```

### Out of scope

Do not change:

- breadcrumb rendering;
- layouts;
- presentation adapters;
- integration tests;
- missing-route behavior;
- `includeNotesRoot` behavior;
- href normalization variants;
- group-without-`href` behavior;
- top-level lesson behavior.

Those cases belong in later cycles.

## TDD Steps

### 1. Red: Add the nested authored-trail test

Add a single behavior test that makes the authored-contract explicit.

The test should fail if the implementation:

- derives labels from URL segments;
- omits the authored parent group;
- includes the synthetic `Notes` root by default;
- loses authored `href` values;
- returns the current item without its ancestry.

Suggested test name:

```ts
it("returns the authored nested catalog trail without the notes root by default", () => {
    // ...
});
```

### 2. Green: Make the smallest adapter change

If the test fails, update only `LessonCatalogAdapter.findTrailByHref()` and any directly related private helper.

The implementation should:

1. normalize the requested `href` through the existing `LessonHref.create(...)` path;
2. traverse the authored catalog tree;
3. carry ancestors during traversal;
4. return the matching item as the last trail element;
5. preserve authored `title` and `href`;
6. omit the synthetic root unless `includeNotesRoot` is explicitly enabled.

Avoid introducing URL-segment parsing, presentation-specific naming, or breadcrumb-specific policy.

### 3. Refactor: Keep traversal isolated and readable

After the test passes, clean up only if needed.

Prefer a small private helper such as:

```ts
findTrailInItems(items, targetHref, ancestors);
```

Keep helper responsibilities narrow:

- traversal;
- match detection;
- trail assembly.

Do not fold root-inclusion policy, href normalization, or presentation formatting into the traversal helper unless
already present.

## Test Plan

Run the focused adapter suite:

```bash
pnpm vitest run src/infrastructure/adapters/__tests__/LessonCatalogAdapter.behavior.test.ts
```

The cycle is complete when:

- the new nested authored-trail test passes;
- existing `LessonCatalogAdapter` behavior tests still pass;
- no breadcrumb, layout, or presentation-layer tests were required to change.

## Acceptance Criteria

- `findTrailByHref("/notes/scripting/tasks-as-abstractions/")` returns:

  ```ts
  [
      { title: "Build Systems", href: "/notes/scripting/" },
      {
          title: "Tasks as Abstractions",
          href: "/notes/scripting/tasks-as-abstractions/",
      },
  ];
  ```

- The synthetic `Notes` root is omitted by default.
- The returned titles match authored catalog titles, not URL-derived labels.
- The current lesson is the last item in the trail.
- The implementation remains local to `LessonCatalogAdapter`.
- The not-found contract remains `[]`.

## Assumptions Preserved

- Missing routes still return `[]`.
- `includeNotesRoot` remains opt-in.
- Existing href normalization behavior is not expanded in this cycle.
- This cycle intentionally covers only the nested happy path.

## Later Cycles

Defer the following cases:

1. top-level lessons;
2. missing routes;
3. explicit `includeNotesRoot`;
4. href normalization variants;
5. groups with authored `href`;
6. groups without `href`;
7. presentation adapter mapping;
8. breadcrumb rendering integration.
