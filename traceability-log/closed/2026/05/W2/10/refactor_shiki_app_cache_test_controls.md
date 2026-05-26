# Refactor: Shiki App Cache Test Controls

**Status:** ✅ COMPLETED on 2026-05-10

## Summary

Refactored the app Shiki highlighter cache controls so production code only exposes the runtime highlighter facade, while test-only cache mutation lives in an explicit testing module.

The refactoring accomplished:
- `cache.ts` now exposes only production-safe highlighter access (`getHighlighter` and `HighlighterPromise`)
- `cache.testing.ts` owns test-only cache override/reset behaviour (`setHighlighterForTests`, `resetHighlighterCacheForTests`)
- Global cache access is typed and centralised in `cache.testing.ts`
- Test reset clears the cache before cleanup, then disposes any previously resolved real highlighter
- Production code cannot import the testing module (enforced by import-boundary test)

## Goals Accomplished

✅ Kept `src/lib/code-highlighting/cache.ts` as a production facade  
✅ Moved test-only mutation APIs to `src/lib/code-highlighting/cache.testing.ts`  
✅ Removed `any` from global cache access with typed `ShikiGlobalCache`  
✅ Centralised the global cache key in `cache.testing.ts` implementation  
✅ Replaced `instanceof Promise` with `Promise.resolve(value)`  
✅ Added async cleanup for previously resolved highlighters with `.dispose()`  
✅ Preserved the existing app-level service boundary  
✅ Prevented production code from importing `cache.testing.ts` (enforced by test)

## What Was Implemented

### Step 1: Created `cache.testing.ts`
- New file at `src/lib/code-highlighting/cache.testing.ts` with test-only helpers
- Typed global cache using `ShikiGlobalCache = typeof globalThis & { [key]?: HighlighterPromise }`
- `setHighlighterForTests(value)` — accepts raw highlighter, promise, or null; uses `Promise.resolve()` normalization
- `resetHighlighterCacheForTests()` — async function that:
  - Deletes global cache slot **before** awaiting cleanup (prevents stale state)
  - Tolerates rejected cached promises (safe in `afterEach`)
  - Disposes resolved highlighters to avoid resource leaks

### Step 2: Created `cache.testing.test.ts`
- Comprehensive unit test suite in `src/lib/code-highlighting/cache.testing.test.ts`
- 12 test cases covering:
  - Raw highlighter injection
  - Promised highlighter injection
  - Pending promise handling
  - Null-clearing override
  - Reset behavior and cleanup
  - Disposal verification
  - Error tolerance
  - Safe consecutive resets
  - Resource disposal counts

### Step 3: Updated `cache.ts`
- Removed `__resetHighlighterCacheForTests` and `__setHighlighterForTests` functions
- Now exports only production APIs: `getHighlighter()` and `HighlighterPromise` type
- Updated JSDoc to indicate test-only helpers moved to `cache.testing.ts`

### Step 4: Updated `index.ts`
- Removed barrel exports of `__resetHighlighterCacheForTests` and `__setHighlighterForTests`
- Added guidance in JSDoc: direct import from `cache.testing` for test mutations
- Keeps production surface clean (no test helpers leak into main API)

### Step 5: Enhanced Import-Boundary Test
- Added check: production code cannot import `.testing` modules
- Scans src/application, src/domain, src/infrastructure, src/presentation, config
- Allows test files (*.test.ts, *.spec.ts, tests/) to import .testing modules
- Prevents accidental production usage of test-only code

## Non-Goals Met ✅

- ✅ Did not remove `src/lib/shiki/**` (Phase 6 handled that separately)
- ✅ Did not change `@ravenhill/shiki-core` public APIs
- ✅ Did not move app-specific cache/test behaviour into `@ravenhill/shiki-core`
- ✅ Did not re-export test helpers from production `~/lib/code-highlighting` barrel
- ✅ Did not change highlighting behaviour outside test setup and teardown

## Final Module Shape

**`cache.ts` (Production-Safe)**
```ts
export type HighlighterPromise = Promise<Highlighter>;
export const getHighlighter = (): HighlighterPromise => appShikiService.getHighlighter();
```

**`cache.testing.ts` (Test-Only)**
```ts
export function setHighlighterForTests(value: HighlighterPromise | Highlighter | null): void;
export async function resetHighlighterCacheForTests(): Promise<void>;
```

**`index.ts` (Barrel, Production Only)**
```ts
export { appShikiService, createAppHighlighterService, highlightToHtml } from "./service";
export { getHighlighter } from "./cache";
export type { HighlighterPromise } from "./cache";
// Note: cache.testing exports NOT included here
```

## Implementation Notes

The implementation followed the planned steps:

1. **Test-first approach** — Created comprehensive unit tests in `cache.testing.test.ts` before extracting the module
2. **Typed globals** — Used proper TypeScript typing for global cache instead of `any`
3. **Promise normalization** — Used `Promise.resolve()` instead of `instanceof Promise` check
4. **Async cleanup** — Reset is now properly async and disposes resolved highlighters
5. **Boundary protection** — Import-boundary test prevents production code from importing `.testing` modules
6. **Clean barrel** — Production `index.ts` does not re-export test helpers

The global cache key is defined once in `cache.testing.ts` and nowhere else, ensuring consistency.

## Test Plan

Run the new cache testing tests:
```sh
pnpm test:unit -- src/lib/code-highlighting/cache.testing.test.ts
```

Run all code-highlighting tests:
```sh
pnpm test:unit -- src/lib/code-highlighting
```

Run import-boundary tests:
```sh
pnpm test:unit -- tests/architecture
```

Verify old test helpers are gone:
```sh
rg "__resetHighlighterCacheForTests|__setHighlighterForTests" src tests config packages
```

Verify test module imports are only in test files:
```sh
rg "cache\.testing" src tests config packages
```

## Acceptance Criteria Met ✅

- ✅ `cache.ts` exports only `getHighlighter` and `HighlighterPromise`
- ✅ `cache.testing.ts` exports `setHighlighterForTests` and `resetHighlighterCacheForTests`
- ✅ No `any` used for global cache access (properly typed `ShikiGlobalCache`)
- ✅ Global cache key defined once in `cache.testing.ts`
- ✅ `Promise.resolve(value)` handles both raw highlighters and highlighter promises
- ✅ Reset deletes cache slot before cleanup
- ✅ Reset ignores rejected cached promises
- ✅ Reset disposes previously resolved highlighters
- ✅ Production code cannot import `cache.testing.ts`
- ✅ Test files import test helpers from `~/lib/code-highlighting/cache.testing`
- ✅ `~/lib/code-highlighting/index.ts` does not re-export test helpers
- ✅ Focused and related test suites pass

## Key Technical Decisions

### Using `Promise.resolve()` Instead of `instanceof Promise`

`Promise.resolve()` reliably handles both promises and raw values:
- If given a promise, returns the same promise
- If given a non-promise value, wraps it in a resolved promise

This is simpler and more correct than checking `instanceof Promise`, which can fail for
promises from different realms/contexts.

### Async `reset()` Function

Reset is async to properly dispose previously resolved highlighters and allow time for
cleanup operations. The function deletes the cache slot **before** awaiting the old promise,
preventing stale state from surviving the reset.

### Global Cache Encapsulation

The `__dibsShikiHighlighterPromise` cache key is defined only in `cache.testing.ts`.
Production code never accesses it directly—only through the public `getHighlighter()` API
provided by the `appShikiService`.

### Import-Boundary Test Rule

The rule "production code must not import `.testing` modules" is intentionally generic and
not Shiki-specific. This allows it to be reused for future test adapters and enforces the
convention across the codebase.

## Context for Future Work

If new tests need to override the highlighter cache:
```ts
import { setHighlighterForTests, resetHighlighterCacheForTests } from "~/lib/code-highlighting/cache.testing";

describe("my feature", () => {
  beforeEach(() => {
    // Optional: set a fake highlighter for this test
    setHighlighterForTests(myFakeHighlighter);
  });

  afterEach(async () => {
    // Always reset in afterEach to clean up and dispose resources
    await resetHighlighterCacheForTests();
  });

  // ... tests
});
```

Do not import test helpers from the production `~/lib/code-highlighting` barrel. Import
directly from `cache.testing`.

## Related Work

- **Phase 6** (prior): Removed deprecated `src/lib/shiki/*` compatibility bridge
- **Phase 4-5** (prior): Extracted `@ravenhill/shiki-core` package and created `~/lib/code-highlighting` boundary

---

*Completed by: Refactor implementation*  
*Date: 2026-05-10*  
*Verified by: cache.testing.test.ts and tests/architecture/shiki-import-boundary.test.ts*
