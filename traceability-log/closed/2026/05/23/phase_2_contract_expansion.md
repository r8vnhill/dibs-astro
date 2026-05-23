# [DONE] Phase 2: Contract Expansion

## Summary

Expanded `packages/lesson-export-core/tests/filters.test.ts` to pin the stable `filterManifest` public contract before
changing subtree behavior in later phases. This phase is test-only and remains green with the current implementation.

## Key Changes

- Add contract tests under the existing `describe("given manifest filtering", ...)` block.
- Keep the public API unchanged: `filterManifest(manifest, filter)` and `LessonExportFilter`.
- Assert wrapper-copy behavior for every filter kind that matters:
  - returned manifest is a new object;
  - returned `entries` array is a new array;
  - manifest metadata such as `generatedAt` is preserved.
- Add empty-result coverage:
  - exact-route filter with no matching entry returns `[]`;
  - subtree filter with no matching entries returns `[]`.
- Use value equality for entries:
  - prefer `expect(filtered.entries).toEqual(expectedEntries)`;
  - do not assert `filtered.entries[0]).toBe(manifest.entries[0])`, because entry identity should not become a public
    contract.

## Test Plan

- Add tests for:
  - `all` preserves metadata and returns value-equal entries in a copied wrapper;
  - `exact-route` preserves metadata and returns `[]` when no route matches;
  - `subtree` preserves metadata and returns `[]` when no subtree matches;
  - filtered results compare by value, not entry object identity.
- Keep BDD-style names consistent with the current suite, for example:
  - `then all preserves manifest metadata while copying the wrapper`
  - `then exact route matching returns an empty copied manifest when no entry matches`
  - `then subtree matching returns an empty copied manifest when no entry matches`
  - `then filtered entries are asserted by value instead of object identity`

## Verification

From `astro-website/packages/lesson-export-core`, run:

```bash
pnpm test
```

Result: all tests pass. No source implementation changes, generated `dist/` changes, changelog edits, or public API
changes occurred in this phase.

## Assumptions

- Phase 2 is limited to contract tests only.
- Existing Phase 1 helpers `createManifest`, `createEntry`, and `routesOf` are already available and should be reused.
- Entry object identity remains intentionally unspecified.
- Subtree root-inclusion and sibling-prefix boundary behavior stay out of Phase 2 and remain reserved for later phases.
