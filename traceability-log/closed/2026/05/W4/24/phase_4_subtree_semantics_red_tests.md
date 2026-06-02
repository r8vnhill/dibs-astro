# [PLAN] Phase 4 — Subtree Semantics Red Tests

## Summary

Add test-only red coverage for the stricter `filterManifest` subtree contract.

A subtree filter should return **descendant routes only**. It should not include the exact subtree root route itself.
This phase intentionally goes red against the current implementation if subtree matching currently uses normalized
`startsWith` semantics that include the root route.

Implemented in `packages/lesson-export-core/tests/filters.test.ts` with descendant-only subtree coverage, a
root-only empty-result case, and a sibling-prefix boundary guard. The suite is expected to stay red until the later
implementation phase updates `src/filters.ts`.

Keep the public API unchanged:

```ts
filterManifest(manifest, filter);
```

and keep `LessonExportFilter` unchanged.

## Contract Decision

Phase 4 defines subtree filtering as:

```text
subtree("/notes/software-libraries")
→ includes descendants of "/notes/software-libraries/"
→ excludes "/notes/software-libraries/" itself
→ excludes sibling prefixes such as "/notes/software-libraries-advanced/"
```

This is a deliberate descendants-only interpretation of “subtree”.

## Goals

- Add a red test proving subtree filters exclude the exact root route.
- Add or keep a sibling-prefix guard proving subtree filters are segment-aware.
- Preserve Phase 2 wrapper/value assertion style.
- Preserve Phase 3 table-driven normalization coverage.
- Stop before implementation work.

## Non-Goals

- Do not edit `src/filters.ts`.
- Do not edit `src/routes.ts`.
- Do not rewrite Phase 3 DDT coverage.
- Do not change public API types.
- Do not add PBT.
- Do not touch generated `dist/` files.
- Do not update the changelog.

## Preconditions

Phase 4 assumes these test helpers already exist:

```ts
createEntry(route, title, sourceFile?)
createManifest()
routesOf(manifest)
```

If `expectCopiedManifest(filtered, manifest)` exists from Phase 2, use it when the test is also asserting
projection-wrapper behaviour. Otherwise, keep the new tests focused on returned routes.

## Key Changes

### 1. Add Descendants-Only Red Test

Add a test with:

- one exact subtree root entry;
- two descendant entries;
- expected output containing only descendants.

Suggested shape:

```ts
test("then subtree matching excludes the exact subtree root", () => {
    const manifest = {
        ...createManifest(),
        entries: [
            createEntry("/notes/software-libraries/", "Ozzmosis"),
            createEntry(
                "/notes/software-libraries/diary-of-a-madman/",
                "Diary of a Madman",
            ),
            createEntry(
                "/notes/software-libraries/no-more-tears/",
                "No More Tears",
            ),
        ],
    } satisfies LessonExportManifest;

    const filtered = filterManifest(manifest, {
        kind: "subtree",
        routePrefix: "/notes/software-libraries",
    });

    expect(routesOf(filtered)).toEqual([
        "/notes/software-libraries/diary-of-a-madman/",
        "/notes/software-libraries/no-more-tears/",
    ]);
});
```

This is the primary red test.

### 2. Add Root-Only Empty Projection Test

This is a useful contract edge case and makes the descendants-only decision impossible to misread:

```ts
test("then subtree matching returns empty entries when only the subtree root matches", () => {
    const manifest = {
        ...createManifest(),
        entries: [
            createEntry("/notes/software-libraries/", "Ozzmosis"),
        ],
    } satisfies LessonExportManifest;

    const filtered = filterManifest(manifest, {
        kind: "subtree",
        routePrefix: "/notes/software-libraries",
    });

    expect(routesOf(filtered)).toEqual([]);
});
```

This may also be red with the current implementation. It is still test-only and directly supports the same semantic
decision.

### 3. Add Sibling-Prefix Boundary Guard

Add a separate test for similarly named sibling prefixes:

```ts
test("then subtree matching excludes similarly named sibling prefixes", () => {
    const manifest = {
        ...createManifest(),
        entries: [
            createEntry(
                "/notes/software-libraries/diary-of-a-madman/",
                "Diary of a Madman",
            ),
            createEntry(
                "/notes/software-libraries-advanced/bark-at-the-moon/",
                "Bark at the Moon",
            ),
        ],
    } satisfies LessonExportManifest;

    const filtered = filterManifest(manifest, {
        kind: "subtree",
        routePrefix: "/notes/software-libraries",
    });

    expect(routesOf(filtered)).toEqual([
        "/notes/software-libraries/diary-of-a-madman/",
    ]);
});
```

This guard may already be green if route prefixes are normalized with trailing slashes. That is fine: it protects
against future regressions.

### 4. Keep Existing Coverage Untouched

Do not rewrite:

- Phase 2 empty-result tests;
- Phase 2 wrapper-copy tests;
- Phase 3 exact-route DDT;
- Phase 3 subtree-prefix DDT.

Phase 4 should only add the new descendants-only semantic tests.

## Relevant Files

- `packages/lesson-export-core/tests/filters.test.ts` Add the subtree root-exclusion and sibling-prefix tests.

- `packages/lesson-export-core/src/filters.ts` Reference only. Do not edit in this phase.

- `packages/lesson-export-core/src/routes.ts` Reference only. Do not edit in this phase.

## Verification

From:

```text
astro-website/packages/lesson-export-core
```

run:

```bash
pnpm test
```

Expected result for Phase 4:

- at least the subtree root-exclusion test fails;
- existing tests remain unchanged;
- no implementation files changed.

After the later implementation phase, rerun the same command and confirm the full suite turns green.

## Expected Red Failure

The likely failure should be route-list based, similar to:

```text
Expected:
[
  "/notes/software-libraries/diary-of-a-madman/",
  "/notes/software-libraries/no-more-tears/"
]

Received:
[
  "/notes/software-libraries/",
  "/notes/software-libraries/diary-of-a-madman/",
  "/notes/software-libraries/no-more-tears/"
]
```

That is the desired red signal.

## Commit Boundary

Use one test-only commit, for example:

```text
test(lesson-export-core): pin descendants-only subtree filtering
```

## Stop Criteria

Stop Phase 4 once:

- descendants-only subtree semantics are covered;
- root-only subtree filtering is covered, if included;
- sibling-prefix exclusion is covered;
- the new root-exclusion case is red;
- `src/filters.ts` remains unchanged;
- `src/routes.ts` remains unchanged;
- no generated files or changelog entries are touched.
