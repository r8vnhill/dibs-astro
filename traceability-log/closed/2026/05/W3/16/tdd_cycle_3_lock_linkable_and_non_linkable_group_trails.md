# [DONE] TDD Cycle 3: Lock Linkable and Non-Linkable Group Trails

## Summary

Lock how `LessonCatalogAdapter.findTrailByHref(href, options?)` represents authored ancestry when the trail contains
groups.

This cycle proves that trail ancestry is taken from the catalog structure, while linkability is taken only from authored
`href` values:

1. Groups with authored `href` values appear as linkable trail nodes.
2. Groups without authored `href` values appear as plain label nodes.
3. Non-linkable groups stay in the ordered ancestry.
4. Non-linkable groups do not prevent descendant lesson lookup.

The adapter must not synthesize group links from URL segments or child lesson routes.

## Implementation Status

Implemented and verified.

- Added focused linkable/non-linkable group trail coverage in
  `src/infrastructure/adapters/__tests__/LessonCatalogAdapter.behavior.test.ts`.
- Confirmed the existing `LessonCatalogAdapter.findTrailByHref()` implementation already preserves authored group
  hrefs, omits hrefs from plain group labels, and resolves lessons below non-linkable groups.
- Left production adapter code unchanged.
- Verified with:

  ```bash
  pnpm vitest run src/infrastructure/adapters/__tests__/LessonCatalogAdapter.behavior.test.ts
  ```

  Result: 15 tests passed.

## Scope

### In scope

- `src/infrastructure/adapters/__tests__/LessonCatalogAdapter.behavior.test.ts`
- Behaviour coverage for:
  - linkable ancestor groups;
  - non-linkable ancestor groups;
  - nested ancestry mixing both cases;
  - lesson lookup below non-linkable groups.

### Out of scope

- href normalization variants.
- `includeNotesRoot`.
- top-level lesson behaviour.
- missing route behaviour.
- breadcrumb rendering.
- presentation adapters, layouts, or integration tests.

## RED: Add Focused Behaviour Coverage

Add or reshape tests under:

```ts
describe("findTrailByHref with linkable and non-linkable groups", () => {
    // tests
});
```

Prefer a deliberately non-isomorphic fixture where group titles and URLs do not merely mirror URL segments. This makes
it harder for a URL-derived implementation to pass accidentally.

Example fixture shape:

```ts
const catalog = [
    {
        title: "Notes",
        children: [
            {
                title: "Build Systems",
                href: "/notes/scripting/",
                children: [
                    {
                        title: "Task Design",
                        children: [
                            {
                                title: "Tasks as Abstractions",
                                href: "/notes/scripting/tasks-as-abstractions/",
                            },
                        ],
                    },
                ],
            },
        ],
    },
];
```

Do not pass `includeNotesRoot`.

## Scenario 1: Preserve authored group hrefs

Assert that a group with an authored `href` becomes a linkable trail node:

```ts
expect(
    adapter.findTrailByHref("/notes/scripting/tasks-as-abstractions/"),
).toEqual([
    { title: "Build Systems", href: "/notes/scripting/" },
    { title: "Task Design" },
    {
        title: "Tasks as Abstractions",
        href: "/notes/scripting/tasks-as-abstractions/",
    },
]);
```

This locks three contracts at once:

- authored group links are preserved;
- non-linkable intermediate groups are still included;
- the current lesson remains the final trail item.

## Scenario 2: Represent groups without href as plain labels

Add a direct assertion for a lesson under a group that has no authored `href`:

```ts
expect(adapter.findTrailByHref("/notes/catalog-design/")).toEqual([
    { title: "Library Design" },
    { title: "Catalog Design", href: "/notes/catalog-design/" },
]);
```

The expected object should omit `href` entirely. Do not assert `href: undefined`.

## Scenario 3: Non-linkable groups do not block lookup

Add a test whose name makes the lookup contract explicit:

```ts
it("resolves lessons nested below non-linkable groups", () => {
    expect(adapter.findTrailByHref("/notes/catalog-design/")).toEqual([
        { title: "Library Design" },
        { title: "Catalog Design", href: "/notes/catalog-design/" },
    ]);
});
```

This prevents future implementations from accidentally treating missing group `href` as an invalid or terminal node.

## GREEN: Implement Only If Needed

Run the focused behaviour suite:

```bash
pnpm vitest run src/infrastructure/adapters/__tests__/LessonCatalogAdapter.behavior.test.ts
```

If the tests already pass, do not change production code.

If implementation changes are needed, keep them local to the trail lookup path in `LessonCatalogAdapter`.

The most likely implementation boundary is trail-node construction:

```ts
function toTrailNode(node: FlattenedLessonCatalogNode): TrailNode {
    return node.href === undefined
        ? { title: node.title }
        : { title: node.title, href: node.href };
}
```

Preserve these contracts:

- do not synthesize `href` values for groups without authored links;
- do not derive group links from child lesson URLs;
- do not omit non-linkable groups from ancestry;
- keep the current lesson as the final trail item;
- keep missing routes returning `[]`.

## REFACTOR: Keep Tests Contract-Oriented

After the tests pass, clean up only the test structure if needed.

Prefer:

- exact `toEqual(...)` assertions;
- one local fixture factory for this `describe` block;
- test names phrased as externally visible behaviour;
- fixtures that distinguish authored catalog ancestry from URL shape.

Avoid:

- length-only assertions;
- piecemeal `title` / `href` checks;
- shared mutable fixtures;
- expanding this cycle into normalization, `includeNotesRoot`, or rendering concerns.
