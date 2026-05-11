# [PLAN] Phase 2: Create `packages/lesson-export-core`

## Implementation Status

Implemented.

Validation completed with:

```text
pnpm --filter @ravenhill/lesson-export-core check
```

## Summary

Create `@ravenhill/lesson-export-core` as a host-agnostic workspace package for deterministic lesson export planning.

The package owns pure logic only:

```text
- route normalization;
- export route derivation;
- PDF output-path derivation;
- manifest filtering;
- manifest validation;
- structured export findings;
- deterministic ordering helpers.
```

It must not import Astro, React, DOM APIs, Playwright, Puppeteer, Tailwind, generated app data, app-local aliases, or
DIBS-specific course structure.

Start with local TypeScript helpers only. Add `@ravenhill/content-core` later only if the package can reuse stable value
objects without creating unnecessary coupling.

This follows the earlier architectural decision: reusable pure logic belongs in `packages/*`, while Astro rendering and
PDF generation remain site-level adapters until their contracts stabilise.

## Key Changes

### 1. Add the package scaffold

Create:

```text
packages/lesson-export-core/
  package.json
  tsconfig.json
  tsup.config.ts
  vitest.config.ts
  README.md
  AGENTS.md
  scripts/
    assert-pack-files.mjs
    validate-packed-consumer.mjs
  src/
    index.ts
    manifest.ts
    routes.ts
    output-paths.ts
    filters.ts
    validation.ts
    findings.ts
  tests/
    routes.test.ts
    output-paths.test.ts
    filters.test.ts
    validation.test.ts
    package-api.test.ts
```

Use the same publishing shape as the existing Ravenhill packages:

```text
- ESM-only;
- root export only;
- sideEffects: false;
- generated declarations;
- no subpath exports;
- package validation through publint;
- packed-consumer validation.
```

`tsup` remains a reasonable fit for the build because it supports TypeScript library bundling and declaration output.
`publint` is specifically meant to lint npm packages for compatibility across tools such as Vite, Webpack, Rollup, and
Node.js, which matches the goal of testing the package boundary rather than only source tests. ([tsup.egoist.dev][1])

### 2. Add root workspace wiring

Add package scripts:

```json
{
    "scripts": {
        "build:lesson-export-core": "pnpm --filter @ravenhill/lesson-export-core build",
        "check:lesson-export-core": "pnpm --filter @ravenhill/lesson-export-core check"
    }
}
```

Include:

```text
- build:lesson-export-core in predev, prebuild, and predeploy;
- check:lesson-export-core in root pnpm check;
- package-local test, typecheck, build, publint, pack:dry-run, pack:check, and consumer:check scripts.
```

Add the app dependency only when the app actually consumes it:

```json
{
    "dependencies": {
        "@ravenhill/lesson-export-core": "workspace:*"
    }
}
```

The `workspace:*` protocol is appropriate for monorepo-local dependencies because pnpm supports workspaces directly and
is designed for monorepo dependency management. ([pnpm.io][2])

## Public API

### Manifest types

Use branded string aliases if the project already accepts this style. They improve type clarity without runtime cost.

```ts
export type LessonRoute = string;
export type ExportRoute = string;
export type PdfOutputPath = string;
export type IsoDateTime = string;

export interface LessonExportEntry {
    readonly route: LessonRoute;
    readonly exportRoute: ExportRoute;
    readonly title: string;
    readonly sourceFile: string;
    readonly outputPath: PdfOutputPath;
    readonly lastModified?: IsoDateTime;
    readonly authors?: readonly string[];
    readonly findings?: readonly LessonExportFinding[];
}

export interface LessonExportManifest {
    readonly generatedAt: IsoDateTime;
    readonly entries: readonly LessonExportEntry[];
}
```

I would add `findings?: readonly LessonExportFinding[]` to `LessonExportEntry` now. Phase 1 already introduced the idea
of export findings, and later app-level adapters can attach findings such as `client-only`, `unresolved-todo`, or
`missing-metadata` without changing the manifest shape.

### Findings

Make findings structured and machine-readable:

```ts
export type LessonExportFindingSeverity = "info" | "warning" | "error";

export type LessonExportFindingKind =
    | "duplicate-route"
    | "duplicate-export-route"
    | "duplicate-output-path"
    | "missing-title"
    | "missing-source-file"
    | "unsafe-output-path"
    | "unsupported-route"
    | "invalid-generated-at"
    | "invalid-last-modified";

export interface LessonExportFinding {
    readonly kind: LessonExportFindingKind;
    readonly severity: LessonExportFindingSeverity;
    readonly message: string;
    readonly route?: string;
    readonly field?: string;
    readonly value?: string;
}
```

Avoid `violation`. Use:

```text
- finding;
- issue;
- unsupported;
- not allowed;
- unsafe output path.
```

### Validation result

Keep validation non-throwing:

```ts
export interface LessonExportValidationResult {
    readonly valid: boolean;
    readonly findings: readonly LessonExportFinding[];
}
```

Throw only for programmer errors in low-level functions when the caller asks for derivation from invalid direct input.
Manifest validation should collect all findings.

## Public helpers

Export only from `src/index.ts`:

```ts
export function normalizeLessonRoute(route: string): LessonRoute;

export function deriveExportRoute(
    route: string,
    options?: DeriveExportRouteOptions,
): ExportRoute;

export function derivePdfOutputPath(
    route: string,
    options?: DerivePdfOutputPathOptions,
): PdfOutputPath;

export function filterManifest(
    manifest: LessonExportManifest,
    filter: LessonExportFilter,
): LessonExportManifest;

export function validateManifest(
    manifest: LessonExportManifest,
): LessonExportValidationResult;

export function detectDuplicateRoutes(
    entries: readonly LessonExportEntry[],
): readonly LessonExportFinding[];

export function detectDuplicateExportRoutes(
    entries: readonly LessonExportEntry[],
): readonly LessonExportFinding[];

export function detectDuplicateOutputPaths(
    entries: readonly LessonExportEntry[],
): readonly LessonExportFinding[];

export function detectUnsafeOutputPaths(
    entries: readonly LessonExportEntry[],
): readonly LessonExportFinding[];
```

Add option types:

```ts
export interface DeriveExportRouteOptions {
    readonly prefix?: string;
}

export interface DerivePdfOutputPathOptions {
    readonly rootDir?: string;
    readonly extension?: ".pdf";
}

export type LessonExportFilter =
    | { readonly kind: "all" }
    | { readonly kind: "exact-route"; readonly route: string }
    | { readonly kind: "subtree"; readonly routePrefix: string };
```

This is better than optional bags like `{ route?: string; subtree?: string }`, because discriminated unions prevent
ambiguous filters.

## Design corrections to the current plan

### 1. Do not depend on `@ravenhill/content-core` by default

Change this:

```text
It will depend on @ravenhill/content-core from Phase 2.
```

To this:

```text
It may depend on @ravenhill/content-core only if the implementation reuses stable, host-agnostic route/navigation value objects. Otherwise, start dependency-free.
```

Reason: Phase 2 is mostly string/route/path planning. Adding a package dependency too early increases coupling and makes
`lesson-export-core` less independently testable.

### 2. Separate normalization from validation

The current plan says normalization should reject empty/non-notes routes “when validation runs”. That is good, but make
the boundary explicit:

```text
normalizeLessonRoute()
  - accepts route-like strings;
  - trims surrounding whitespace;
  - collapses duplicate slashes;
  - ensures leading/trailing slash;
  - normalizes index-style inputs;
  - throws only for empty or non-string runtime input.

validateManifest()
  - reports unsupported route families such as non-/notes routes;
  - reports missing title/source file;
  - reports duplicate routes/export routes/output paths;
  - reports unsafe output paths;
  - collects all findings.
```

This keeps `normalizeLessonRoute()` usable by filters and derivation helpers without turning it into a policy-heavy
validator.

### 3. Add duplicate export-route detection

The current plan mentions duplicate routes and duplicate output paths. Add duplicate `exportRoute` too.

Two different source routes could theoretically collapse into the same export route after normalization. That should be
detected separately.

### 4. Add deterministic sorting only if explicitly requested

The plan mentions “preserve manifest order” for filters, which is right. Do **not** silently sort entries in
`filterManifest()` or `validateManifest()`.

If ordering helpers are needed, add a separate function later:

```ts
export function sortEntriesByRoute(
    entries: readonly LessonExportEntry[],
): readonly LessonExportEntry[];
```

This avoids surprising callers.

### 5. Make output-path rules stricter

Output paths should be manifest-relative logical paths, not host filesystem paths.

Rules:

```text
Allowed:
- notes/foo.pdf
- notes/software-libraries/artifacts-taxonomy.pdf

Not allowed:
- /notes/foo.pdf
- C:\notes\foo.pdf
- notes\foo.pdf
- ../notes/foo.pdf
- notes/../foo.pdf
- notes/foo
- notes/foo.html
- notes//foo.pdf
```

For v1, require `.pdf` exactly. Do not accept arbitrary extensions until there is a concrete use case.

## Implementation Details

### Route normalization

Rules:

```text
- trim surrounding whitespace;
- convert empty string to an error;
- replace repeated slashes with one slash;
- ensure leading slash;
- ensure trailing slash;
- normalize `/notes/foo/index` to `/notes/foo/`;
- normalize `/notes/foo/index/` to `/notes/foo/`;
- preserve nested `/notes/**/` routes;
- do not decode percent-encoded values in v1;
- do not accept query strings or fragments.
```

Examples:

```text
notes/foo                 -> /notes/foo/
notes/foo/                -> /notes/foo/
/notes//foo///            -> /notes/foo/
/notes/foo/index          -> /notes/foo/
/notes/foo/index/         -> /notes/foo/
```

Reject or report:

```text
""
"   "
"/notes/foo?x=1"
"/notes/foo#section"
```

### Export route derivation

Default:

```text
route:        /notes/software-libraries/foo/
prefix:       /exports/pdf
exportRoute:  /exports/pdf/notes/software-libraries/foo/
```

Rules:

```text
- normalize the input route first;
- normalize the prefix as route-like but without requiring `/notes`;
- reject prefixes with query strings, fragments, `..`, or empty segments;
- preserve trailing slash.
```

### PDF output-path derivation

Default:

```text
route:       /notes/software-libraries/foo/
outputPath:  notes/software-libraries/foo.pdf
```

Index route policy:

```text
/notes/                       -> notes/index.pdf
/notes/software-libraries/    -> notes/software-libraries/index.pdf
/notes/software-libraries/foo/ -> notes/software-libraries/foo.pdf
```

That policy avoids ambiguous folder/file collisions.

### Manifest filtering

Use discriminated filters:

```ts
filterManifest(manifest, { kind: "all" });
filterManifest(manifest, { kind: "exact-route", route: "/notes/foo/" });
filterManifest(manifest, { kind: "subtree", routePrefix: "/notes/software-libraries/" });
```

Rules:

```text
- return a new manifest object;
- preserve entry object identity unless transformed later;
- preserve original entry order;
- normalize filter routes before matching;
- never mutate input manifest or entries.
```

### Validation

`validateManifest()` should call smaller validators:

```text
validateManifestShape()
validateGeneratedAt()
validateEntries()
detectDuplicateRoutes()
detectDuplicateExportRoutes()
detectDuplicateOutputPaths()
detectUnsafeOutputPaths()
detectMissingRequiredFields()
```

Keep each function short and testable.

## Test Plan

### BDD unit tests

Add tests for:

```text
normalizeLessonRoute()
  - adds leading slash;
  - adds trailing slash;
  - collapses duplicate slashes;
  - normalizes index-style routes;
  - rejects empty input;
  - rejects query strings and fragments.

deriveExportRoute()
  - uses /exports/pdf by default;
  - accepts a custom prefix;
  - normalizes custom prefixes;
  - rejects unsafe prefixes.

derivePdfOutputPath()
  - derives nested lesson paths;
  - maps index routes to index.pdf;
  - returns POSIX-style relative paths;
  - rejects or reports unsafe path inputs.

filterManifest()
  - returns all entries for kind: all;
  - filters by exact normalized route;
  - filters by subtree;
  - preserves manifest order;
  - returns a new manifest object;
  - does not mutate input.

validateManifest()
  - reports duplicate route findings;
  - reports duplicate export-route findings;
  - reports duplicate output-path findings;
  - reports missing title findings;
  - reports missing source-file findings;
  - reports unsafe output-path findings;
  - reports all findings in one result.
```

### Data-driven tests

Use DDT for normalization and path cases:

```ts
it.each([
    ["notes/foo", "/notes/foo/"],
    ["/notes/foo", "/notes/foo/"],
    ["/notes//foo///", "/notes/foo/"],
    ["/notes/foo/index", "/notes/foo/"],
])("normalizes %s to %s", (input, expected) => {
    expect(normalizeLessonRoute(input)).toBe(expected);
});
```

Vitest supports table-driven tests with `test.each` / `it.each`, which is a good fit for these route and path matrices.
([Fast Check][3])

### Property-based tests

Use `fast-check` for invariants, but keep the arbitraries constrained. `fast-check` supports TypeScript and works with
Vitest, making it appropriate for route/path invariants where example-based tests miss edge cases. ([Fast Check][3])

Properties:

```text
For accepted route segments:
- normalized routes always start and end with `/`;
- derived export routes always start with the normalized export prefix;
- derived output paths never contain `..`;
- derived output paths never contain backslashes;
- derived output paths never start with `/`;
- derived output paths always end with `.pdf`.
```

Avoid fully arbitrary Unicode in the first PBT pass. Start with safe path segment characters:

```text
a-z
A-Z
0-9
-
_
```

Then add targeted DDT cases for accents, spaces, and encoded characters if the content model allows them.

### Package API tests

Add tests for:

```text
- root import exposes intended names;
- package has no subpath exports;
- built package can be imported by a temporary packed consumer;
- declaration files are present in packed output;
- internal source files are not shipped unless intentionally included.
```

`publint` is useful here because it checks whether package metadata and shipped files are compatible with common
consumers and bundlers. ([publint.dev][4])

## Suggested file-level structure

```text
src/
  index.ts
  findings.ts
  filters.ts
  manifest.ts
  output-paths.ts
  routes.ts
  validation.ts
  internal/
    path-segments.ts
    readonly-array.ts
```

Keep public concepts in top-level files. Put reusable low-level helpers under `internal/` and do not export them from
the package root unless they become genuinely useful API.

## Suggested implementation order

```text
1. Scaffold package and root-only package export.
2. Add empty public API files and package API tests.
3. Implement route normalization with DDT.
4. Implement export route derivation.
5. Implement PDF output-path derivation with DDT and PBT.
6. Add manifest filter types and filtering tests.
7. Add finding model and validation result.
8. Implement duplicate detection helpers.
9. Implement validateManifest() as an aggregator.
10. Add pack dry-run and packed-consumer checks.
11. Wire root build/check scripts.
12. Add app dependency only if Phase 3 immediately consumes the package.
```

This keeps the TDD loop tight: start with pure functions, then compose them into manifest validation.

## Improved exit criteria

Phase 2 is complete when:

```text
- `@ravenhill/lesson-export-core` builds as an ESM-only package.
- Public API is available only through the root export.
- Route normalization is tested with DDT.
- Output-path derivation is tested with DDT and PBT.
- Manifest filtering preserves order and does not mutate input.
- Manifest validation returns all findings in one structured result.
- Duplicate route, duplicate export-route, duplicate output-path, missing title, missing source file, and unsafe output-path findings are covered.
- Package pack checks pass.
- Packed-consumer import check passes.
- Root `pnpm check` includes the package check.
- No Astro route, layout, print CSS, Playwright, PDF generation, or app manifest adapter is introduced.
```

[1]: https://tsup.egoist.dev/?utm_source=chatgpt.com "tsup.config - EGOIST"
[2]: https://pnpm.io/?utm_source=chatgpt.com "Fast, disk space efficient package manager | pnpm"
[3]: https://fast-check.dev/?utm_source=chatgpt.com "fast-check official documentation | fast-check"
[4]: https://publint.dev/?utm_source=chatgpt.com "publint"
