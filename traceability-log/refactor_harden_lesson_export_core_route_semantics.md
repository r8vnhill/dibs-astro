# [DONE] Refactor — Harden `lesson-export-core` Route Semantics

## Summary

Refactor `packages/lesson-export-core` route handling so route normalization, route branding, export-route derivation,
and manifest validation have explicit, testable boundaries.

This refactor keeps the chosen semantic decision:

```text
normalizeLessonRoute() canonicalizes route-shaped lesson-export inputs.
It does not enforce `/notes/**`.
```

The `/notes/**` rule remains a higher-level manifest policy enforced by validation and any behaviours that specifically
require course lesson routes.

## Chosen Decisions

```text
- `normalizeLessonRoute()` remains a generic canonicalizer for route-shaped lesson-export inputs.
- `normalizeLessonRoute()` does not reject non-`/notes/**` paths.
- Raw `?` and `#` are rejected.
- Encoded `%3F` and `%23` remain allowed.
- `.` and `..` path segments are rejected.
- Absolute/protocol-like URLs are rejected.
- Control characters are rejected.
- `LessonRoute` and `ExportRoute` become branded string types.
- Branded route values are produced through runtime constructors only.
- `/notes/**` support remains enforced by manifest validation and manifest-oriented behaviours.
```

## Main Improvements to the Draft

```text
- Rename the conceptual contract from “lesson route means /notes route” to “lesson route means canonical export-planning route”.
- Make `asLessonRoute()` and `asExportRoute()` package-internal unless there is a strong consumer use case.
- Add a separate `isSupportedLessonRouteFamily()` helper for `/notes/**`.
- Add compile-time type tests for branding.
- Add migration tests proving public function behaviour remains stable except for the new explicit rejections.
- Add idempotence tests for already-branded/canonical values.
- Keep route normalization and output-path safety separate.
```

TypeScript’s value here is mainly static tooling and editor/type checking; its types are erased when emitted to
JavaScript, so branded types should be backed by runtime constructors when they represent validated strings.
([TypeScript][1])

## Key Changes

### 1. Strengthen public route types with branding

Update `src/manifest.ts` so route-like concepts are no longer plain aliases.

Suggested shape:

```ts
declare const lessonRouteBrand: unique symbol;
declare const exportRouteBrand: unique symbol;
declare const pdfOutputPathBrand: unique symbol;

export type LessonRoute = string & {
    readonly [lessonRouteBrand]: "LessonRoute";
};

export type ExportRoute = string & {
    readonly [exportRouteBrand]: "ExportRoute";
};

export type PdfOutputPath = string & {
    readonly [pdfOutputPathBrand]: "PdfOutputPath";
};
```

Brand `PdfOutputPath` in this cycle only if `derivePdfOutputPath()` already acts as the only constructor for valid
output paths. If output paths are still assembled in several places, defer the brand to a dedicated output-path
hardening cycle.

### 2. Keep constructors internal by default

Add runtime constructors in `src/routes.ts`, but do not export them from `src/index.ts` unless package consumers need
them.

```ts
function asLessonRoute(normalized: string): LessonRoute {
    assertCanonicalRouteShape(normalized);
    return normalized as LessonRoute;
}

function asExportRoute(
    normalized: string,
    options: { readonly prefix: string },
): ExportRoute {
    assertCanonicalRouteShape(normalized);

    if (!normalized.startsWith(`${options.prefix}/`)) {
        throw new Error("Export route must start with the normalized export prefix.");
    }

    return normalized as ExportRoute;
}
```

Constructor responsibilities:

```text
asLessonRoute()
  - guarantees canonical route-shape invariants;
  - does not guarantee `/notes/**`.

asExportRoute()
  - guarantees canonical route-shape invariants;
  - guarantees the route starts with the normalized export prefix used by the caller.
```

After this refactor, no production caller should use:

```ts
value as LessonRoute;
value as ExportRoute;
```

outside these constructors.

### 3. Split route concepts explicitly

Add three named concepts:

```text
Route-like string
  Any input string that can be canonicalized into `/foo/bar/`.

LessonRoute
  A branded canonical route-shaped value used by lesson-export-core.

Supported lesson route family
  A LessonRoute accepted by the DIBS lesson manifest policy, currently `/notes/**`.
```

Add a helper for the third concept:

```ts
export function isSupportedLessonRouteFamily(route: LessonRoute): boolean {
    return route.startsWith("/notes/");
}
```

Or keep it internal to `validation.ts` if consumers do not need it.

This resolves the naming tension: `LessonRoute` can remain generic enough for the route pipeline, while validation still
owns the `/notes/**` policy.

### 4. Refactor `normalizeRouteLike()` into a helper pipeline

Replace the monolithic body with focused helpers.

Suggested structure:

```ts
interface NormalizeRouteLikeOptions {
    readonly allowIndexNormalization: boolean;
}

export function normalizeLessonRoute(route: string): LessonRoute {
    return asLessonRoute(
        normalizeRouteLike(route, { allowIndexNormalization: true }),
    );
}

export function normalizeExportRoutePrefix(prefix: string): string {
    const normalized = normalizeRouteLike(prefix, {
        allowIndexNormalization: false,
    });

    assertExportPrefixIsNotRoot(normalized);
    return removeTrailingSlash(normalized);
}

export function deriveExportRoute(
    route: string,
    options: DeriveExportRouteOptions = {},
): ExportRoute {
    const normalizedRoute = normalizeLessonRoute(route);
    const prefix = normalizeExportRoutePrefix(
        options.prefix ?? DEFAULT_EXPORT_ROUTE_PREFIX,
    );

    return joinExportRoute(prefix, normalizedRoute);
}
```

Internal helper pipeline:

```text
assertStringInput()
trimRoute()
assertNonEmpty()
assertNotAbsoluteUrl()
assertNoControlCharacters()
assertNoRawQueryOrFragment()
collapseDuplicateSlashes()
ensureLeadingSlash()
ensureTrailingSlash()
normalizeTrailingIndexRoute(), optionally
assertNoRelativeSegments()
```

Keep each helper short and single-purpose.

### 5. Reject absolute/protocol-like URLs before slash collapsing

This is important because slash collapsing can distort URL-looking inputs.

Reject before this step:

```ts
route.replace(/\/+/gu, "/");
```

Add:

```ts
function assertNotAbsoluteUrl(route: string): void {
    if (/^[a-z][a-z0-9+.-]*:/iu.test(route)) {
        throw new Error("Route must be site-relative, not an absolute URL.");
    }
}
```

Examples rejected:

```text
https://example.com/notes/foo
mailto:test@example.com
file:///tmp/foo
```

### 6. Reject control characters

Add:

```ts
function assertNoControlCharacters(route: string): void {
    if (/[\u0000-\u001F\u007F]/u.test(route)) {
        throw new Error("Route must not contain control characters.");
    }
}
```

This catches newlines, tabs, null characters, and similar unsafe input.

### 7. Use segment-based relative detection

Replace substring checks with a reusable helper:

```ts
function containsRelativeSegment(route: string): boolean {
    return route
        .split("/")
        .some((segment) => segment === "." || segment === "..");
}
```

Apply it to:

```text
- normalized lesson routes;
- normalized export prefixes;
- any route-like input used for comparison.
```

Keep this separate from output-path traversal checks. Routes and filesystem-like output paths should not share the same
abstraction.

### 8. Make export-route joining explicit

Add:

```ts
function joinExportRoute(prefix: string, route: LessonRoute): ExportRoute {
    if (prefix.endsWith("/")) {
        throw new Error("Export route prefix must not end with '/'.");
    }

    if (!route.startsWith("/")) {
        throw new Error("Lesson route must start with '/'.");
    }

    return asExportRoute(`${prefix}${route}`, { prefix });
}
```

This makes the prefix/suffix invariant visible and testable.

### 9. Preserve `/notes/**` ownership in validation

Keep this policy in `validation.ts`:

```ts
function validateRouteFamily(entry: LessonExportEntry): readonly LessonExportFinding[] {
    if (!isSupportedLessonRouteFamily(entry.route)) {
        return [
            {
                kind: "unsupported-route",
                severity: "error",
                route: entry.route,
                field: "route",
                value: entry.route,
                message: "Route is not in the supported lesson route family.",
            },
        ];
    }

    return [];
}
```

The important part is not the exact code, but the boundary:

```text
routes.ts
  owns canonical route shape.

validation.ts
  owns manifest route policy.
```

## Public Interfaces / Type Changes

Runtime function signatures stay the same:

```ts
normalizeLessonRoute(route: string): LessonRoute
deriveExportRoute(route: string, options?: DeriveExportRouteOptions): ExportRoute
normalizeExportRoutePrefix(prefix: string): string
```

Type-level behaviour changes:

```text
- `LessonRoute` is no longer assignable from arbitrary string values.
- `ExportRoute` is no longer assignable from arbitrary string values.
- Consumers must call public constructors/functions to obtain branded route values.
```

Runtime behaviour changes:

```text
- absolute URLs are rejected explicitly;
- control characters are rejected explicitly;
- `.` and `..` segments are rejected consistently;
- raw query strings and fragments remain rejected;
- encoded `%3F` and `%23` remain allowed;
- non-`/notes/**` routes may still normalize successfully;
- manifest validation still reports non-`/notes/**` routes as `unsupported-route`.
```

## Suggested Module Shape

```text
src/
  manifest.ts
  routes.ts
  validation.ts
  filters.ts
  output-paths.ts
  internal/
    brands.ts          optional, only if multiple modules brand values
    route-guards.ts    optional, if routes.ts gets too large
```

For this cycle, I would keep the helpers in `routes.ts` unless the file grows too large. Avoid premature file splitting.

## Test Plan

Vitest remains a good fit here because it is Vite-native, supports TypeScript/ESM well, and can also be used for
backend-style code. ([Vitest][2]) Use BDD-style names and DDT for the route matrices.

### 1. Route normalization DDT

Accepted cases:

```ts
it.each([
    ["notes/foo", "/notes/foo/"],
    ["/notes/foo", "/notes/foo/"],
    ["/notes/foo/", "/notes/foo/"],
    ["/notes//foo///", "/notes/foo/"],
    ["/notes/foo/index", "/notes/foo/"],
    ["/notes/foo/index/", "/notes/foo/"],
    ["  /notes/foo  ", "/notes/foo/"],
    ["/custom/export-target", "/custom/export-target/"],
])("normalizes route-like input %s to %s", (input, expected) => {
    expect(normalizeLessonRoute(input)).toBe(expected);
});
```

Rejected cases:

```ts
it.each([
    "",
    "   ",
    "/notes/foo?x=1",
    "/notes/foo#section",
    "/notes/../foo",
    "/notes/./foo",
    "https://example.com/notes/foo",
    "file:///notes/foo",
    "/notes/foo\nbar",
    "/notes/foo\tbar",
])("rejects unsupported route-like input %s", (input) => {
    expect(() => normalizeLessonRoute(input)).toThrow();
});
```

Explicitly allowed encoded markers:

```ts
it.each([
    ["/notes/foo%3Fbar", "/notes/foo%3Fbar/"],
    ["/notes/foo%23bar", "/notes/foo%23bar/"],
])("allows encoded query/hash markers in path segments", (input, expected) => {
    expect(normalizeLessonRoute(input)).toBe(expected);
});
```

### 2. Export prefix DDT

Accepted cases:

```ts
it.each([
    ["/exports/pdf", "/exports/pdf"],
    ["exports/pdf", "/exports/pdf"],
    ["/exports//pdf///", "/exports/pdf"],
])("normalizes export prefix %s to %s", (input, expected) => {
    expect(normalizeExportRoutePrefix(input)).toBe(expected);
});
```

Rejected cases:

```ts
it.each([
    "",
    "   ",
    "/",
    "/exports/../pdf",
    "/exports/./pdf",
    "https://example.com/exports/pdf",
    "/exports/pdf?format=a4",
    "/exports/pdf#top",
])("rejects unsupported export prefix %s", (input) => {
    expect(() => normalizeExportRoutePrefix(input)).toThrow();
});
```

### 3. Export-route derivation tests

```ts
it("derives an export route with the default prefix", () => {
    expect(deriveExportRoute("/notes/foo/")).toBe("/exports/pdf/notes/foo/");
});

it("derives an export route with a custom prefix", () => {
    expect(deriveExportRoute("/notes/foo/", {
        prefix: "/exports/print",
    })).toBe("/exports/print/notes/foo/");
});

it("preserves canonicalized non-notes routes for generic route-shaped inputs", () => {
    expect(deriveExportRoute("/custom/foo/", {
        prefix: "/exports/pdf",
    })).toBe("/exports/pdf/custom/foo/");
});
```

That last test protects your explicit choice not to enforce `/notes/**` in route normalization.

### 4. Validation ownership tests

In `validation.test.ts`:

```ts
it("allows generic route normalization while validation reports unsupported route families", () => {
    const route = normalizeLessonRoute("/custom/foo/");

    const result = validateManifest({
        generatedAt: "2026-05-10T00:00:00.000Z",
        entries: [
            {
                route,
                exportRoute: deriveExportRoute(route),
                title: "Custom route",
                sourceFile: "src/pages/custom/foo.astro",
                outputPath: "custom/foo.pdf" as PdfOutputPath,
            },
        ],
    });

    expect(result.findings).toContainEqual(
        expect.objectContaining({
            kind: "unsupported-route",
            field: "route",
        }),
    );
});
```

### 5. Type-level branding tests

Add compile-time tests if the package already has a type-test convention. If not, use `tsd` only if type-level API tests
become a repeated need across packages; otherwise keep a small `.test-d.ts` or `// @ts-expect-error` test compiled by
`tsc`.

Examples:

```ts
const route: LessonRoute = normalizeLessonRoute("/notes/foo/");

// @ts-expect-error raw strings must not be assignable to LessonRoute
const invalidRoute: LessonRoute = "/notes/foo/";

// @ts-expect-error LessonRoute and ExportRoute must not be interchangeable
const invalidExportRoute: ExportRoute = route;
```

This is worth adding because the branding change is primarily a compile-time safety improvement.

### 6. PBT after DDT stabilizes

Use `fast-check` only after the DDT matrix is green. `fast-check` is a property-based testing framework for JavaScript
and TypeScript, and its docs state it works with Vitest and other runners. ([Fast Check][3])

Suggested properties:

```text
- normalizeLessonRoute() is idempotent for generated safe route-shaped inputs.
- normalizeExportRoutePrefix() is idempotent for generated safe prefixes.
- deriveExportRoute() always starts with the normalized prefix plus `/`.
- derived export routes never contain duplicate slashes except none after normalization.
- derived export routes never contain raw `?` or `#`.
- derived export routes never contain `.` or `..` segments.
```

Constrain generated segments:

```text
[a-zA-Z0-9_-]+
```

Use DDT for Unicode, encoded markers, and boundary cases.

## TDD Cycles

### Cycle 1 — Lock current and intended route behaviour

Add tests before refactoring:

```text
- accepted route normalization;
- rejected route inputs;
- encoded `%3F` and `%23` acceptance;
- non-`/notes/**` normalization acceptance;
- export prefix normalization;
- export-route derivation with default/custom prefix.
```

Run:

```bash
pnpm --filter @ravenhill/lesson-export-core test -- tests/routes.test.ts
```

### Cycle 2 — Extract the route helper pipeline

Refactor `normalizeRouteLike()` into focused helpers:

```text
assertStringInput
trimRoute
assertNonEmpty
assertNotAbsoluteUrl
assertNoControlCharacters
assertNoRawQueryOrFragment
collapseDuplicateSlashes
ensureLeadingSlash
ensureTrailingSlash
normalizeTrailingIndexRoute
assertNoRelativeSegments
```

Keep public behaviour unchanged except for the newly specified explicit rejections.

### Cycle 3 — Introduce branded route types

Change `LessonRoute` and `ExportRoute` to branded string types.

Then:

```text
- add `asLessonRoute()`;
- add `asExportRoute()`;
- remove direct casts outside constructors;
- add type-level tests;
- verify package API tests.
```

### Cycle 4 — Make export-route joining explicit

Add:

```text
- `joinExportRoute()`;
- prefix invariant checks;
- export-route prefix containment checks.
```

Route all export-route assembly through the helper.

### Cycle 5 — Preserve manifest-policy ownership

Update validation tests so they prove:

```text
- generic route normalization accepts non-`/notes/**`;
- manifest validation reports `unsupported-route`;
- duplicate detection still compares canonicalized route values;
- filtering still canonicalizes filter input.
```

### Cycle 6 — Clean adjacent route/path friction

Only touch adjacent modules where needed:

```text
- remove direct route casts in validation/filter/output modules;
- simplify the dead conditional in `derivePdfOutputPath()`;
- keep output-path validation independent from route normalization;
- update output-path tests only for behaviour-preserving simplification.
```

### Cycle 7 — Add PBT invariants

After DDT and caller tests pass, add constrained property tests for idempotence and safety.

Keep the property tests small and deterministic enough for CI.

## Assumptions

```text
- No new runtime dependency is needed.
- `fast-check` is already available or can be added as a dev-only dependency.
- The package remains host-agnostic.
- No app-specific route knowledge moves into `routes.ts`.
- `/notes/**` remains a validation concern.
- `PdfOutputPath` branding can be deferred if output-path construction is not yet centralized.
```

## Exit Criteria

This refactor is complete when:

```text
- `LessonRoute` and `ExportRoute` are branded string types.
- Public route functions return branded values through runtime constructors.
- No production code directly casts arbitrary strings to `LessonRoute` or `ExportRoute`.
- `normalizeLessonRoute()` rejects empty input, raw queries/fragments, absolute URLs, control characters, and relative segments.
- `normalizeLessonRoute()` still accepts non-`/notes/**` canonical route-shaped inputs.
- Encoded `%3F` and `%23` remain accepted.
- `normalizeExportRoutePrefix()` rejects root, absolute URLs, raw queries/fragments, control characters, and relative segments.
- `deriveExportRoute()` uses `joinExportRoute()`.
- Manifest validation remains the owner of `/notes/**` enforcement.
- Validation tests still emit `unsupported-route` for non-`/notes/**` entries.
- Output-path logic remains separate from route normalization.
- DDT route tests pass.
- Type-level branding tests pass.
- PBT invariants pass if included in this cycle.
- Full `@ravenhill/lesson-export-core` tests pass.
```

## Implementation Status

Implemented.

Changes made:

```text
- Branded `LessonRoute`, `ExportRoute`, and `PdfOutputPath` in `packages/lesson-export-core/src/manifest.ts`.
- Refactored `packages/lesson-export-core/src/routes.ts` into smaller validation and normalization helpers.
- Added explicit absolute-URL, control-character, and relative-segment rejection.
- Added explicit export-route joining instead of raw string concatenation.
- Simplified the dead branch in `packages/lesson-export-core/src/output-paths.ts`.
- Expanded route and validation tests to lock the new contract and the `/notes/**` validation boundary.
- Updated the package README with the hardened route semantics.
```

Verification:

```bash
pnpm --dir packages/lesson-export-core test
pnpm check:lesson-export-core
```

[1]: https://www.typescriptlang.org/ "TypeScript: JavaScript With Syntax For Types."
[2]: https://vitest.dev/ "Vitest | Next Generation testing framework"
[3]: https://fast-check.dev/ "fast-check official documentation | fast-check"
