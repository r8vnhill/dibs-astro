# TDD Refactor Plan For `lesson-metadata`

Status: Implemented on 2026-04-28.

## Summary

Refactor `src/domain/lesson-metadata.ts` to make lesson metadata helpers stricter, more predictable, and easier to test.

The refactor focuses on three observable behaviours:

1. Date parsing rejects invalid calendar dates instead of accepting JavaScript `Date` overflow.
2. Date formatting remains UTC-stable even when callers provide partial formatting options.
3. Metadata path normalization accepts URL-like inputs but resolves them to canonical lesson routes.

Keep the module small, pure, dependency-free, and backward-compatible at the public type level.

## Goals

- Preserve all exported public types and return shapes.
- Keep date-only metadata independent from the runtime local timezone.
- Treat blank date inputs consistently as missing values.
- Canonicalize metadata lookup keys as lesson routes, not full URLs.
- Keep `src/utils/lesson-metadata.ts` as a compatibility wrapper over the domain helpers.
- Add regression tests before each behavioural change.

## Non-goals

- Do not introduce `Temporal` or a Temporal polyfill in this refactor.
- Do not redesign the metadata schema.
- Do not change service, adapter, or presentation DTO shapes.
- Do not add new runtime dependencies.
- Do not validate author/change metadata fields beyond the existing helper scope.

## Key Changes

### 1. Strict ISO-short date parsing

Update `parseIsoShortDate` so it accepts only real `YYYY-MM-DD` calendar dates.

Implementation direction:

- Trim input before parsing.
- Match with a captured regex: `YYYY-MM-DD`.
- Convert captured year, month, and day to numbers.
- Build the date with `Date.UTC(year, month - 1, day)`.
- Round-trip `getUTCFullYear()`, `getUTCMonth()`, and `getUTCDate()` against the captured values.
- Reject impossible dates such as:
  - `2024-02-31`
  - `2023-02-29`
  - `2024-00-01`
  - `2024-13-01`
  - `2024-01-00`

Rationale: `Date.UTC(...)` correctly constructs UTC timestamps, but it still adjusts out-of-range fields, so round-tripping is required to detect invalid calendar dates.

### 2. UTC-stable date formatting

Update `formatDate` so caller-provided partial options do not accidentally remove the UTC default.

Implementation direction:

- Add `DEFAULT_DATE_FORMAT_OPTIONS`.
- Default `options` to `{}` instead of replacing the whole default object.
- Format with `new Intl.DateTimeFormat(locale, { ...DEFAULT_DATE_FORMAT_OPTIONS, ...options })`.
- Keep explicit caller timezone overrides possible.

Rationale: `Intl.DateTimeFormat` is the standard locale-sensitive formatting API, and its output depends on the provided formatting options, including `timeZone`. [^1]

### 3. Display-policy cleanup

Update `resolveLessonDateDisplay` so blank-like text is handled consistently.

Implementation direction:

- Add a private `normalizeOptionalText(value?: string): string | undefined`.
- Treat `undefined`, `""`, and whitespace-only strings as `{ kind: "missing" }`.
- Return trimmed invalid date strings as `{ kind: "passthrough", value }`.
- Keep valid ISO-short dates as `{ kind: "formatted", value }`.

This keeps the display policy explicit and prevents whitespace-only metadata from leaking into the UI.

### 4. URL-aware pathname normalization

Update `normalizeLessonMetadataPathname` to parse URL-like inputs with `URL`.

Implementation direction:

- Add a local base such as `METADATA_URL_BASE = "https://dibs.local"`.
- Parse with `new URL(input, METADATA_URL_BASE)`.
- Pass only `url.pathname` to `LessonHref.create`.
- Discard `search` and `hash`, because metadata lookup keys are canonical lesson routes.
- Preserve blank input behaviour: blank input normalizes to `/`.

Rationale: the `URL` constructor supports absolute URLs and relative references when a base is provided, while also throwing for invalid URL/base combinations.

### 5. Exhaustiveness guard

Add a private `assertNever(value: never): never` helper and use it in `formatLessonDate`.

This is not a behavioural cycle by itself. Treat it as a small safety refactor after the display tests are green.

## TDD Cycles

### Cycle 1: Strict ISO date parsing

Add failing tests first.

Test cases:

- Accepts a valid regular date.
- Accepts a valid leap day: `2024-02-29`.
- Rejects impossible dates:
  - `2024-02-31`
  - `2023-02-29`
  - `2024-13-01`
  - `2024-00-01`
  - `2024-01-00`
- Rejects malformed values:
  - `2024-1-01`
  - `2024-01-1`
  - `not-a-date`
  - `""`
  - `"   "`

Then implement strict parsing with captured regex + UTC round-trip.

### Cycle 2: UTC-stable formatting

Add a regression test showing that partial custom options still preserve UTC defaults.

Test cases:

- Default formatting uses UTC.
- Partial options merge with defaults instead of replacing them.
- Explicit caller `timeZone` override is respected.

Then add `DEFAULT_DATE_FORMAT_OPTIONS` and switch to merged `Intl.DateTimeFormat` options.

### Cycle 3: Display-policy cleanup

Add tests around `resolveLessonDateDisplay` and `formatLessonDate`.

Test cases:

- `undefined` resolves to `missing`.
- `""` resolves to `missing`.
- `"   "` resolves to `missing`.
- `"  invalid-date  "` resolves to `passthrough` with trimmed value.
- Valid ISO-short date resolves to `formatted`.
- `formatLessonDate(undefined)` still returns `UNKNOWN_LESSON_DATE_LABEL`.

Then extract `normalizeOptionalText`.

### Cycle 4: URL-aware path normalization

Add DDT cases for canonical metadata path behaviour.

Suggested cases:

- `""` → `/`
- `"   "` → `/`
- `"/lessons/kotlin/"` → canonical `LessonHref` value
- `"lessons/kotlin/"` → canonical `LessonHref` value
- `"https://example.com/lessons/kotlin/"` → `/lessons/kotlin/`
- `"http://example.com/lessons/kotlin/"` → `/lessons/kotlin/`
- `"https://example.com/lessons/kotlin/?from=search"` → `/lessons/kotlin/`
- `"https://example.com/lessons/kotlin/#section"` → `/lessons/kotlin/`
- `"//example.com/lessons/kotlin/"` → confirm desired behaviour before locking it

Then replace manual origin stripping with `new URL(...)`.

### Cycle 5: Compatibility and integration verification

After the domain tests pass:

- Verify `src/utils/lesson-metadata.ts` still delegates to the domain helpers.
- Run service, adapter, and bridge tests.
- Confirm no public DTO or metadata shape changes.
- Add `assertNever` to `formatLessonDate`.

## Test Plan

Update:

- `src/domain/__tests__/lesson-metadata.test.ts`
- Existing compatibility-wrapper tests, if any.
- Existing service/adapter/bridge tests only if behaviour is now intentionally stricter.

Use BDD-style grouping:

```ts
suite("lesson metadata dates", () => {
    describe("parseIsoShortDate", () => {
        // ...
    });

    describe("formatDate", () => {
        // ...
    });

    describe("resolveLessonDateDisplay", () => {
        // ...
    });
});

suite("lesson metadata pathnames", () => {
    describe("normalizeLessonMetadataPathname", () => {
        // ...
    });
});
```

Use DDT for repeated invalid-date and path-normalization cases. Vitest supports `test.each`, which fits these regression matrices well.

Use PBT only for stable invariants:

- Valid dates generated from real UTC timestamps parse back to the same `YYYY-MM-DD`.
- Normalizing an already-normalized lesson pathname is idempotent.
- Normalized pathnames are non-empty and start with `/`.

Avoid over-constraining PBT with policies that belong to `LessonHref`, such as whether every path must end with `/`, unless that is already an explicit domain invariant.

## Commands

Run the narrow domain suite first:

```bash
pnpm test:unit -- src/domain/__tests__/lesson-metadata.test.ts
```

Then run compatibility and integration coverage:

```bash
pnpm test:unit -- src/application/services/__tests__/LessonMetadataServiceImpl.test.ts src/infrastructure/adapters/__tests__/LessonMetadataAdapter.test.ts
pnpm test:unit -- src/presentation/adapters/__tests__/lesson-metadata-bridge.test.ts
```

Finally run the project checks:

```bash
pnpm run check
```

## Acceptance Criteria

- [x] Invalid calendar dates no longer parse successfully.
- [x] Whitespace-only date values are treated as missing.
- [x] Invalid non-empty date values are passed through trimmed.
- [x] Partial date-formatting options do not remove UTC stability.
- [x] Explicit caller timezone overrides still work.
- [x] Absolute and relative metadata URLs normalize to canonical lesson paths.
- [x] Query strings and hash fragments are ignored for metadata lookup.
- [x] Public exported types remain unchanged.
- [x] `src/utils/lesson-metadata.ts` continues to behave as a compatibility wrapper.
- [x] Domain, service, adapter, bridge, and project checks pass.

## Assumptions

- Metadata lookup keys are canonical lesson routes.
- Query strings and hash fragments are not meaningful metadata keys.
- `LessonHref.create(...)` remains the single source of truth for final route canonicalization.
- No new dependency is warranted for this refactor.

[1]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/UTC "Date.UTC() - JavaScript | MDN"
