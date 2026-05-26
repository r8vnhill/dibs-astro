# [IMPLEMENTED] TDD Refactor: `lesson-metadata-bridge.test.ts`

## Summary

Refactored `src/presentation/adapters/__tests__/lesson-metadata-bridge.test.ts` from broad smoke coverage into a
sharper presentation-boundary contract suite.

This pass was test-only. It did not introduce a resolver factory, change route normalization, change generated
metadata, or move metadata projection logic.

## Implemented Changes

- Added `expectFoundMetadata` to fail directly when a route does not resolve to `found` and to narrow metadata for
  later assertions.
- Replaced conditional assertions such as `result.kind === "found" ? ... : ...`.
- Grouped scenarios with BDD-style `describe` / `test` structure:
  - known route resolution;
  - equivalent route variants;
  - presentation DTO projection;
  - unsupported route handling.
- Added a JSON round-trip assertion for the serializable presentation DTO contract.
- Converted route canonicalization and unsupported-route coverage to `test.each`.
- Pinned the current HTTP(S) URL policy: full URLs resolve by pathname regardless of origin.
- Asserted the presentation boundary shape:
  - `authors` and `changes` are required;
  - `lastModified` remains optional;
  - no top-level metadata fields outside `authors`, `changes`, and `lastModified` are exposed;
  - each change exposes only `author`, `date`, `hash`, and `subject`;
  - `sourceFile` is not exposed.
- Kept missing-route assertions as `toMatchObject({ kind: "missing" })`, because missing results may include extra
  data such as `href`.

## Verification

Focused verification passed:

```bash
node .\node_modules\vitest\vitest.mjs run src\presentation\adapters\__tests__\lesson-metadata-bridge.test.ts --reporter=verbose
```

Result: 1 test file passed, 13 tests passed.

The planned `pnpm test:unit -- src/presentation/adapters/__tests__/lesson-metadata-bridge.test.ts` invocation was
stopped after it hung in the package-manager wrapper. The direct Vitest invocation above completed successfully.

## Deferred Work

- No pure resolver factory was added; that would be a production design change and should be planned separately.
- No property-based tests were added here because route-normalization properties belong in the pure `content-core`
  normalizer tests, not this presentation bridge integration suite.
- No type-level test was added here because the exported metadata resolution union is already covered by package-level
  type/API tests.
