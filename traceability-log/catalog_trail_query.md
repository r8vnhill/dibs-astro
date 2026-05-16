# [PLAN] Catalog Trail Query

## Summary

Implement and harden `LessonCatalogAdapter.findTrailByHref(href, options?)` as the canonical lesson-catalog ancestry
query used by the later breadcrumb presentation slice.

This cycle should prove that trails are built from the authored course catalog tree, not inferred from URL segments. The
adapter should return ordered catalog ancestry plus the current lesson, while keeping `includeNotesRoot` as an opt-in
compatibility flag.

## Core Goal

Given a lesson `href`, the adapter should resolve the matching catalog item and return its authored ancestry path:

```text
Course group → optional subgroup(s) → current lesson
```

Not:

```text
/notes/foo/bar/baz → ["notes", "foo", "bar", "baz"]
```

That distinction is the main regression this slice should lock down.

## Scope

### In scope

- Keep `findTrailByHref(href, options?)` as the adapter-level source of truth.
- Preserve `includeNotesRoot` as optional and opt-in.
- Add behavior coverage for:

  - nested lessons;
  - top-level lessons;
  - missing lessons;
  - groups with authored `href`;
  - groups without authored `href`;
  - normalized `href` variants.
- Keep implementation inside `LessonCatalogAdapter`.
- Use the existing internal trail-building helper path unless tests reveal a real defect.

### Out of scope

- Breadcrumb rendering.
- UI root-label decisions.
- Presentation-layer separators, icons, ARIA attributes, or schema markup.
- Replacing the compatibility flag with a new breadcrumb API.
- Deriving trails from raw URL segments.

## TDD Cycle 1: Lock the Basic Contract

Status: implemented and verified in `tdd_cycle_1_lock_the_authored_nested_trail_contract.md`.

### Red

Add or refine behavior tests in:

```text
e:/teaching/DIBS/projects/astro-website/src/infrastructure/adapters/__tests__/LessonCatalogAdapter.behavior.test.ts
```

Create a small authored catalog fixture that makes ancestry unambiguous. Prefer names that do **not** match URL segments
exactly, so the test proves the adapter is not parsing paths.

Example intent:

```text
Group title: "Build Systems"
Group href:  "/notes/scripting"
Lesson title: "Tasks as Abstractions"
Lesson href:  "/notes/scripting/tasks-as-abstractions"
```

Assert:

- the returned trail is ordered from ancestor to current item;
- the current lesson is last;
- labels/titles come from catalog metadata;
- `href` values come from authored catalog entries when present.

### Green

Implement only the minimum required adapter changes. The trail should be produced by walking the catalog tree and
carrying ancestry state, not by splitting the requested `href`.

### Acceptance criteria

- Nested lesson trail includes all authored ancestors.
- The current lesson is last.
- No URL-segment-derived labels appear in the trail.

## TDD Cycle 2: Cover Top-Level and Missing Routes

### Red

Add cases for:

| Case             | Expected result                                                                                          |
| ---------------- | -------------------------------------------------------------------------------------------------------- |
| Top-level lesson | Trail contains only the current lesson unless `includeNotesRoot` is enabled                              |
| Missing route    | Returns the existing “not found” shape, likely `null` or `undefined`, whichever the adapter already uses |
| Empty/noisy href | Follows existing normalization behavior and does not throw unless that is already the contract           |

Keep the missing-route assertion aligned with the current adapter contract. Do not introduce a new error model in this
slice.

### Green

Adjust lookup behavior only if the current implementation fails one of these contract cases.

### Acceptance criteria

- Top-level lessons do not gain fake ancestors from URL segments.
- Missing routes fail cleanly and predictably.
- Existing consumers are not forced to handle a new return type.

## TDD Cycle 3: Groups With and Without Authored `href`

### Red

Add explicit cases for ancestor groups:

| Group shape                      | Expected trail item                     |
| -------------------------------- | --------------------------------------- |
| Group has `href`                 | Trail item includes that `href`         |
| Group has no `href`              | Trail item is plain text / non-linkable |
| Nested group without `href`      | Still appears as an ancestor            |
| Lesson inside non-linkable group | Lesson still resolves normally          |

This is important for breadcrumb rendering later: the presentation layer must know which ancestors are links and which
are labels only.

### Green

Make the trail item construction preserve authored `href` only when available. Avoid fabricating group links.

### Acceptance criteria

- Authored group links are preserved.
- Non-authored groups remain in the trail but do not receive synthetic `href`s.
- Current lesson lookup is not blocked by non-linkable ancestors.

## TDD Cycle 4: Normalize `href` Variants

### Red

Add a table-driven test for equivalent `href` variants that should resolve to the same trail.

Suggested cases, depending on the adapter’s existing normalization rules:

```text
/notes/scripting/tasks-as-abstractions
/notes/scripting/tasks-as-abstractions/
notes/scripting/tasks-as-abstractions
```

Only include variants the adapter is supposed to support today. Do not silently expand the public contract unless that
is intentional.

Assert all variants produce the same normalized trail.

### Green

Route every lookup through the existing href-normalization path before matching catalog entries.

### Acceptance criteria

- Equivalent href variants resolve to the same lesson.
- The returned trail is stable regardless of input formatting.
- Normalization does not turn this into URL-segment breadcrumb generation.

## TDD Cycle 5: Preserve `includeNotesRoot`

### Red

Add focused tests for the compatibility flag:

| Options                       | Expected result                               |
| ----------------------------- | --------------------------------------------- |
| omitted                       | no notes root trail item                      |
| `{ includeNotesRoot: false }` | no notes root trail item                      |
| `{ includeNotesRoot: true }`  | notes root prepended before authored ancestry |

Assert the root item is prepended and does not replace authored ancestry.

### Green

Keep root handling as a thin final decoration step around the ancestry trail. Do not mix root rendering concerns into
the recursive catalog walk.

### Acceptance criteria

- Default behavior remains unchanged.
- Compatibility root inclusion still works.
- Root insertion does not affect route lookup.

## Implementation Guidance

Keep the adapter logic conceptually split:

```text
normalize href
→ find catalog item by walking authored catalog tree
→ carry ancestor trail during traversal
→ convert catalog nodes to trail items
→ optionally prepend notes root
```

Avoid these implementation smells:

- splitting `href` by `/` to infer labels;
- generating synthetic group links;
- making breadcrumb UI decisions inside the infrastructure adapter;
- duplicating normalization logic in test helpers;
- changing integration tests unless adapter wiring actually changes.

## Relevant Files

```text
e:/teaching/DIBS/projects/astro-website/src/infrastructure/adapters/LessonCatalogAdapter.ts
```

Primary implementation for `findTrailByHref`.

```text
e:/teaching/DIBS/projects/astro-website/src/infrastructure/adapters/__tests__/LessonCatalogAdapter.behavior.test.ts
```

Main behavior coverage for ancestry, missing routes, root inclusion, authored/non-authored groups, and href
normalization.

```text
e:/teaching/DIBS/projects/astro-website/src/infrastructure/adapters/__tests__/LessonCatalogAdapter.integration.test.ts
```

Use only for broader regression if the adapter wiring changes. Do not duplicate the full behavior matrix here.

## Verification

Run the focused adapter suite first:

```bash
pnpm vitest run src/infrastructure/adapters/__tests__/LessonCatalogAdapter.behavior.test.ts
```

Then run the integration test only if the implementation touched adapter construction, catalog loading, or public
wiring:

```bash
pnpm vitest run src/infrastructure/adapters/__tests__/LessonCatalogAdapter.integration.test.ts
```

Finally, run the project’s normal check command if this slice is ready to merge:

```bash
pnpm check
```

## Final Acceptance Criteria

This cycle is complete when:

- `findTrailByHref(href, options?)` is the single adapter-level trail query.
- Trails are built from authored course ancestry.
- Nested lesson trails include ordered ancestors plus current lesson.
- Top-level lesson trails remain minimal by default.
- Missing routes return the existing not-found shape.
- Groups with authored `href`s are linkable in the trail.
- Groups without `href`s remain plain-text ancestors.
- Equivalent href variants resolve consistently.
- `includeNotesRoot` remains opt-in and backward-compatible.
- No breadcrumb presentation concerns move into the infrastructure adapter.
