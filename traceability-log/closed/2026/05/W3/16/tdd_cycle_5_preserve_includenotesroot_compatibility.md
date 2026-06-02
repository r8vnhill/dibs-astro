# [DONE] TDD Cycle 5: Preserve `includeNotesRoot` Compatibility

## Summary

Lock the adapter-level compatibility behavior of `LessonCatalogAdapter.findTrailByHref(href, options?)` for the
synthetic `Notes` root.

This cycle proves that `includeNotesRoot` is strictly opt-in, only decorates a successfully resolved authored trail, and
does not affect href normalization, catalog traversal, route lookup, or breadcrumb rendering policy.

## Implementation Status

Implemented and verified.

- Added focused `includeNotesRoot` compatibility coverage in
  `src/infrastructure/adapters/__tests__/LessonCatalogAdapter.behavior.test.ts`.
- Confirmed omitted options and `{ includeNotesRoot: false }` return only authored ancestry.
- Confirmed `{ includeNotesRoot: true }` prepends `{ title: "Notes", href: "/notes/" }` without replacing authored
  ancestry.
- Left production adapter code unchanged.
- Verified with:

  ```bash
  pnpm vitest run src/infrastructure/adapters/__tests__/LessonCatalogAdapter.behavior.test.ts
  ```

  Result: 25 tests passed.

## Scope

### In scope

- Add focused behavior coverage for `includeNotesRoot`.
- Verify the exact returned trail for:
  - omitted options;
  - `{ includeNotesRoot: false }`;
  - `{ includeNotesRoot: true }`.
- Confirm the synthetic `Notes` root is prepended without replacing or mutating authored ancestry.
- Update traceability notes after the focused suite passes.

### Out of scope

- Href normalization behavior.
- Missing-route behavior.
- Breadcrumb rendering or presentation adapters.
- Changes to `LessonHref`.
- Moving root handling into traversal logic.
- Reworking the public `findTrailByHref` contract.

## Test Changes

In:

```ts
src / infrastructure / adapters / __tests__ / LessonCatalogAdapter.behavior.test.ts;
```

add or reshape a focused block:

```ts
describe("findTrailByHref with includeNotesRoot", () => {
    // tests here
});
```

Use the authored nested fixture from the previous cycles, with the canonical href:

```ts
const href = "/notes/scripting/tasks-as-abstractions/";
```

The authored trail without the synthetic root must remain:

```ts
[
    { title: "Build Systems", href: "/notes/scripting/" },
    {
        title: "Tasks as Abstractions",
        href: "/notes/scripting/tasks-as-abstractions/",
    },
];
```

The decorated trail with the synthetic root must be:

```ts
[
    { title: "Notes", href: "/notes/" },
    { title: "Build Systems", href: "/notes/scripting/" },
    {
        title: "Tasks as Abstractions",
        href: "/notes/scripting/tasks-as-abstractions/",
    },
];
```

## Required Test Cases

### 1. Omitted options exclude the synthetic root

```ts
expect(adapter.findTrailByHref(href)).toEqual([
    { title: "Build Systems", href: "/notes/scripting/" },
    {
        title: "Tasks as Abstractions",
        href: "/notes/scripting/tasks-as-abstractions/",
    },
]);
```

### 2. Explicit `includeNotesRoot: false` excludes the synthetic root

```ts
expect(adapter.findTrailByHref(href, { includeNotesRoot: false })).toEqual([
    { title: "Build Systems", href: "/notes/scripting/" },
    {
        title: "Tasks as Abstractions",
        href: "/notes/scripting/tasks-as-abstractions/",
    },
]);
```

### 3. Explicit `includeNotesRoot: true` prepends the synthetic root

```ts
expect(adapter.findTrailByHref(href, { includeNotesRoot: true })).toEqual([
    { title: "Notes", href: "/notes/" },
    { title: "Build Systems", href: "/notes/scripting/" },
    {
        title: "Tasks as Abstractions",
        href: "/notes/scripting/tasks-as-abstractions/",
    },
]);
```

Prefer exact `toEqual(...)` assertions over piecemeal checks. The point of this cycle is to lock ordering, shape,
titles, and hrefs together.

## Implementation Guidance

1. Add the focused tests first.
2. Run the adapter behavior suite.
3. Change production code only if the new tests fail.
4. If production code must change, keep the root handling as final decoration:

```ts
const trail = findAuthoredTrail(...);

if (trail.length === 0) {
    return [];
}

return options?.includeNotesRoot === true
    ? [{ title: "Notes", href: "/notes/" }, ...trail]
    : trail;
```

Do not push the `Notes` root into catalog traversal. The root is compatibility decoration, not authored ancestry.

## Design Constraints

- `includeNotesRoot` must remain opt-in.
- `includeNotesRoot: false` must be equivalent to omitted options.
- The synthetic root must be exactly:

```ts
{ title: "Notes", href: "/notes/" }
```

- Authored ancestry must remain unchanged and ordered after the root.
- Route lookup must happen before root decoration.
- Missing routes must continue to return `[]`; this cycle does not introduce root decoration for failed lookups.
- Normalized href variants are already covered by Cycle 4 and should not be retested here unless needed to keep an
  existing test stable.

## Test Plan

Run:

```bash
pnpm vitest run src/infrastructure/adapters/__tests__/LessonCatalogAdapter.behavior.test.ts
```

Acceptance criteria:

- Omitted options exclude `Notes`.
- `{ includeNotesRoot: false }` excludes `Notes`.
- `{ includeNotesRoot: true }` prepends `Notes`.
- Authored ancestry remains unchanged after the root.
- Route lookup behavior is unchanged.
- Cycle 1-4 behavior remains green.

## Docs and Traceability

After implementation:

- Add or update the Cycle 5 traceability note.
- Mark Cycle 5 as implemented in `catalog_trail_query.md` only after the focused behavior suite passes.
- Record whether production adapter code changed or whether the existing implementation already satisfied the contract.
- Include the exact command that was run and its result.

## Rationale

This cycle intentionally separates compatibility decoration from authored catalog traversal. That keeps the adapter
contract small, testable, and stable: the trail is still built from catalog ancestry, while the synthetic `Notes` root
remains an explicit caller-controlled option.

This follows the TDD practice of locking one observable behavior at a time before refactoring or expanding adjacent
behavior. It also follows the xUnit testing principle of using focused fixtures and exact assertions when the returned
object shape is the public contract.
