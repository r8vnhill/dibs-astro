# Cycle 1: Canonical Lesson Route Value Object

## Summary

Strengthen the existing `LessonHref` into the single domain value object for lesson-route canonicalization, then remove duplicated path normalization from navigation and lesson-metadata lookup code. This cycle should establish one shared route contract before any broader domain extraction happens.

Chosen default: **expand `LessonHref`** so it accepts both canonical lesson href input and lookup variants such as extra whitespace, repeated slashes, query strings, and hash fragments.

## Implementation Changes

- **Domain tests first**
  - Add a dedicated `LessonHref` test block covering:
    - trims surrounding whitespace
    - keeps a leading slash or adds it if missing is **not** allowed
    - enforces trailing slash
    - collapses repeated slashes
    - strips query parameters
    - strips hash fragments
    - is idempotent when called on an already normalized value
    - rejects empty or whitespace-only input
  - Keep the tests in the domain suite, not adapter tests.

- **Expand `LessonHref`**
  - Refactor `LessonHref.create()` so it becomes the canonical normalization boundary.
  - The resulting `value` must always:
    - start with `/`
    - end with `/` unless it is root
    - contain no repeated slashes
    - contain no query string or fragment
  - Preserve it as an immutable value object with a private constructor.
  - Add a small equality helper only if existing callers or tests need it; otherwise keep the API minimal.

- **Refactor current consumers**
  - Update `LessonCatalogAdapter` to replace its private `normalizePath()` logic with `LessonHref.create(...).value`.
  - Update `src/utils/navigation.ts` to route all `href` normalization through `LessonHref` instead of its local `normalizeHref`.
  - Update `src/utils/lesson-metadata.ts` so `normalizeLessonPathname()` delegates to `LessonHref` for the shared route rules, keeping only the “strip full origin URL” step locally if needed.
  - Remove duplicated normalization branches that become dead after the refactor.

- **Preserve current public behavior**
  - `ILessonCatalog.findAdjacentByHref()` must keep accepting query/hash variants.
  - `resolveLessonMetadata()` must keep accepting absolute URLs and route fragments exactly as it does today.
  - No UI-facing contract should change in this cycle.

## Test Plan

- **Domain**
  - Extend `src/domain/__tests__/Lesson.test.ts` or split out `LessonHref` tests if the file is becoming crowded.
  - Cover the normalization matrix and invalid-input cases listed above.

- **Regression**
  - Re-run the existing adapter and utility suites that currently lock path behavior:
    - `LessonCatalogAdapter.test.ts`
    - lesson metadata normalization tests
    - navigation utility tests
  - Verify that the current query/hash and repeated-slash invariants still pass after removing local normalizers.

- **Verification**
  - `pnpm test:unit`
  - `pnpm exec tsc --noEmit`

## Assumptions

- `LessonHref` is the domain home for canonical lesson-route semantics in this phase.
- Canonicalization includes query/hash stripping because current adapter behavior already depends on that for lookup.
- Full URL origin stripping remains outside `LessonHref` unless implementation proves it is cleaner to support it there without widening the value object beyond lesson-route concerns.
