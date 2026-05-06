# [DONE] Refactor: Branded Lesson Metadata Records

Implemented on 2026-05-06.

## Outcome

- Added dependency-free branded metadata value parsers in `@ravenhill/content-core`.
- Updated trusted `LessonMetadataRecord` fields to use branded semantic values.
- Replaced metadata repository/service `Record | undefined` flows with explicit `found`, `missing`, and `invalid` result
  unions.
- Updated the Astro app adapter to brand generated metadata records and return deterministic issue paths for invalid
  matching records.
- Updated the presentation bridge and `NotesLayout.astro` to expose result objects and render metadata only for
  `kind: "found"`.
- Updated package API contract tests, service tests, adapter tests, bridge tests, and docs.

## Summary

Harden lesson metadata records by replacing plain string fields with branded semantic values and by making metadata
lookup/resolution return explicit discriminated results.

The current metadata model allows invalid generated metadata to leak into trusted records or be collapsed into “not
found.” This refactor introduces a small dependency-free validation boundary inside `@ravenhill/content-core`:

1. external/generated metadata remains represented by DTOs;
2. pure parsers convert raw strings into branded values;
3. repositories return `found`, `missing`, or `invalid`;
4. services preserve that distinction instead of hiding invalid records;
5. presentation renders metadata only when the result is `found`.

This is a follow-up API-hardening step, not part of the narrower Phase 2 naming cleanup.

## Goals

- Make trusted lesson metadata records semantically typed.
- Preserve a dependency-free validation boundary in `@ravenhill/content-core`.
- Distinguish invalid metadata from missing metadata.
- Keep parser functions pure, small, and independently testable.
- Make result handling exhaustive and explicit.
- Keep app-local Zod validation in place for generated JSON shape validation.
- Avoid broad compiler-policy changes such as enabling `exactOptionalPropertyTypes`.

## Non-Goals

- Do not add runtime dependencies to `@ravenhill/content-core`.
- Do not move Zod schemas from the Astro app into `content-core`.
- Do not rename `sourceFile` in this phase.
- Do not enable `exactOptionalPropertyTypes`.
- Do not introduce a general-purpose `Result` abstraction unless a wider package-level error model already exists.
- Do not change metadata panel design beyond hiding invalid/missing records.
- Do not add package publication or subpath export work.
- Do not extract `reference-content.ts`.

## Public API Changes

### Branded value types

Add semantic branded string types:

```ts
export type NonEmptyText = Brand<string, "NonEmptyText">;
export type AbsoluteUrl = Brand<string, "AbsoluteUrl">;
export type GitCommitHash = Brand<string, "GitCommitHash">;
export type IsoShortDate = Brand<string, "IsoShortDate">;
export type LessonSourceFile = Brand<string, "LessonSourceFile">;
```

Keep the `Brand` helper internal unless there is a clear need for consumers to build their own branded values.

### Parser functions

Add parser functions that return `value | undefined`, matching the existing package style:

```ts
export function parseNonEmptyText(value: string): NonEmptyText | undefined;
export function parseAbsoluteUrl(value: string): AbsoluteUrl | undefined;
export function parseGitCommitHash(value: string): GitCommitHash | undefined;
export function parseIsoShortDateValue(value: string): IsoShortDate | undefined;
export function parseLessonSourceFile(value: string): LessonSourceFile | undefined;
```

Keep the existing `parseIsoShortDate` unchanged:

```ts
export function parseIsoShortDate(value: string): Date | undefined;
```

Rationale: `parseIsoShortDate` already communicates “parse to `Date`.” The new `parseIsoShortDateValue` communicates
“validate and brand the original ISO short date string.”

### Updated record types

Update trusted domain records:

```ts
export type LessonMetadataAuthor = Readonly<{
    name: NonEmptyText;
    url?: AbsoluteUrl;
}>;

export type LessonMetadataChange = Readonly<{
    hash: GitCommitHash;
    date: IsoShortDate;
    author: NonEmptyText;
    subject: NonEmptyText;
}>;

export type LessonMetadataRecord = Readonly<{
    sourceFile: LessonSourceFile;
    authors: readonly LessonMetadataAuthor[];
    lastModified?: IsoShortDate;
    changes: readonly LessonMetadataChange[];
}>;
```

Keep DTOs permissive:

```ts
export type LessonMetadataAuthorDto = Readonly<{
    name: string;
    url?: string;
}>;

export type LessonMetadataChangeDto = Readonly<{
    hash: string;
    date: string;
    author: string;
    subject: string;
}>;

export type LessonMetadataDto = Readonly<{
    sourceFile: string;
    authors: readonly LessonMetadataAuthorDto[];
    lastModified?: string;
    changes: readonly LessonMetadataChangeDto[];
}>;
```

The important boundary is:

```text
LessonMetadataDto -> parser/normalizer -> LessonMetadataRecord
```

### Explicit issue type

Add a small issue model:

```ts
export type LessonMetadataIssue = Readonly<{
    path: string;
    field: string;
    message: string;
}>;
```

Use stable issue paths that match metadata structure:

```text
sourceFile
authors[0].name
authors[0].url
changes[2].hash
changes[2].date
changes[2].author
changes[2].subject
lastModified
```

Prefer deterministic issue ordering:

1. `sourceFile`
2. `authors`
3. `lastModified`
4. `changes`

This makes adapter tests stable and makes invalid metadata easier to diagnose.

### Lookup and resolution results

Use discriminated unions:

```ts
export type LessonMetadataLookupResult =
    | Readonly<{
        kind: "found";
        metadata: LessonMetadataRecord;
    }>
    | Readonly<{
        kind: "missing";
        href: LessonHref;
    }>
    | Readonly<{
        kind: "invalid";
        href: LessonHref;
        issues: readonly LessonMetadataIssue[];
    }>;

export type LessonMetadataResolutionResult =
    | Readonly<{
        kind: "found";
        metadata: LessonMetadataRecord;
        displayDate: LessonDateDisplayResult;
    }>
    | Readonly<{
        kind: "missing";
        href: LessonHref;
    }>
    | Readonly<{
        kind: "invalid";
        href: LessonHref;
        issues: readonly LessonMetadataIssue[];
    }>;
```

The `kind` property gives TypeScript a reliable discriminant for narrowing. This is the standard TypeScript pattern for
modelling closed alternatives with safe branch-specific access. :contentReference[oaicite:2]{index=2}

### Repository contract

Change:

```ts
findByHref(href: LessonHref): Promise<LessonMetadataRecord | undefined>;
```

to:

```ts
findByHref(href: LessonHref): Promise<LessonMetadataLookupResult>;
```

Repository responsibility:

- return `found` when a matching generated record exists and is valid;
- return `missing` when no matching record exists;
- return `invalid` when a matching generated record exists but fails branding/normalization.

### Service contract

Change:

```ts
resolveLessonMetadata(href: LessonHref): Promise<LessonMetadataRecord | undefined>;
```

to:

```ts
resolveLessonMetadata(href: LessonHref): Promise<LessonMetadataResolutionResult>;
```

Service responsibility:

- map repository `found` to a richer resolved result;
- preserve `missing`;
- preserve `invalid`;
- avoid presentation decisions.

## Parser Rules

### `parseNonEmptyText`

- Trim input.
- Reject empty or whitespace-only text.
- Return the trimmed value as `NonEmptyText`.

Accepted:

```text
"Ada Lovelace" -> "Ada Lovelace"
"  Ada Lovelace  " -> "Ada Lovelace"
```

Rejected:

```text
""
"   "
```

### `parseAbsoluteUrl`

- Trim input.
- Accept values accepted by `new URL(value)`.
- Require protocol to be `http:` or `https:` unless there is a known need for other absolute URL schemes.

Accepted:

```text
"https://example.com"
"http://example.com/profile"
```

Rejected:

```text
""
"example.com"
"/relative/path"
"mailto:person@example.com"
```

The narrower `http`/`https` policy is preferable for author profile URLs. Broaden later only with a concrete use case.

### `parseGitCommitHash`

- Trim input.
- Accept lowercase or uppercase hexadecimal.
- Accept 7 to 64 characters.

Accepted:

```text
"abc1234"
"ABC1234"
"0123456789abcdef"
```

Rejected:

```text
"abc123"
"not-a-hash"
"g123456"
```

### `parseIsoShortDateValue`

- Accept only real calendar dates in `YYYY-MM-DD` form.
- Reject timestamps.
- Reject impossible dates.
- Preserve the original canonical string.

Accepted:

```text
"2026-05-06"
"2024-02-29"
```

Rejected:

```text
"2026-5-6"
"2026/05/06"
"2026-02-30"
"2026-05-06T12:00:00Z"
```

Implementation should avoid timezone-sensitive behaviour when checking real dates. Prefer parsing numeric year/month/day
parts and comparing them against a UTC date round-trip.

### `parseLessonSourceFile`

- Trim input.
- Reject blank input.
- Reject absolute URL-like values.
- Accept path-like generated source identifiers.

Accepted:

```text
"notes/software-libraries/index.astro"
"/notes/software-libraries/index"
```

Rejected:

```text
""
"   "
"https://example.com/lesson"
"http://example.com/lesson"
```

Do not over-normalize here unless the existing lookup path rules require it. This parser brands the source value; path
matching should remain centralized in the existing pathname normalization helper.

## Implementation Plan

### Step 1: Add branded value module

Create:

```text
packages/content-core/src/lesson-metadata/branded-values.ts
```

Include:

```ts
type Brand<T, Name extends string> = T & {
    readonly __brand: Name;
};
```

or, preferably, use a `unique symbol` brand to avoid accidental structural conflicts:

```ts
declare const brand: unique symbol;

type Brand<T, Name extends string> = T & {
    readonly [brand]: Name;
};
```

Export only the branded value types and parser functions.

Keep each parser small. If a helper pushes a parser over roughly 25 lines, extract the helper.

Suggested helpers:

```ts
const trimToUndefined = (value: string): string | undefined => { ... };
const isHexText = (value: string): boolean => { ... };
const isRealIsoShortDate = (value: string): boolean => { ... };
const isHttpUrl = (value: URL): boolean => { ... };
```

### Step 2: Update record types

Update:

```text
packages/content-core/src/lesson-metadata/records.ts
```

Replace primitive string fields with branded types.

Keep DTO types unchanged in:

```text
packages/content-core/src/lesson-metadata/types.ts
```

unless they currently live elsewhere.

### Step 3: Add result types

Add a focused result module:

```text
packages/content-core/src/lesson-metadata/results.ts
```

Keep result types near metadata contracts, not inside the service implementation.

Export:

```ts
LessonMetadataIssue;
LessonMetadataLookupResult;
LessonMetadataResolutionResult;
```

Consider small constructor helpers only if they reduce duplication:

```ts
metadataFound(metadata);
metadataMissing(href);
metadataInvalid(href, issues);
```

Do not add these helpers if they merely wrap object literals once or twice.

### Step 4: Update repository contract

Update:

```text
packages/content-core/src/lesson-metadata/repositories.ts
```

The repository should return `LessonMetadataLookupResult`.

This is the right layer to distinguish “no generated record matched this lesson” from “a generated record matched, but
its fields are invalid.”

### Step 5: Update service contract and implementation

Update:

```text
packages/content-core/src/lesson-metadata/types.ts
packages/content-core/src/lesson-metadata/lesson-metadata-service.ts
```

The service should be a thin mapper:

```ts
switch (result.kind) {
    case "found":
        return {
            kind: "found",
            metadata: result.metadata,
            displayDate: resolveLessonDateDisplay(result.metadata),
        };

    case "missing":
    case "invalid":
        return result;
}
```

Add an `assertNever` helper if the repo already uses one. Exhaustiveness checks pair naturally with discriminated unions
and make future result variants safer. TypeScript’s narrowing documentation describes how branch checks refine union
members based on discriminating values. :contentReference[oaicite:3]{index=3}

### Step 6: Update `LessonMetadataAdapter`

Update the app-local adapter:

```text
src/infrastructure/adapters/LessonMetadataAdapter*
```

Responsibilities:

- find generated metadata by normalized href;
- convert matching DTO into branded `LessonMetadataRecord`;
- collect all field issues instead of failing on the first issue;
- return `invalid` with stable issue paths when conversion fails;
- return `missing` only when no matching DTO exists.

Important distinction:

```text
No matching metadata row       -> missing
Matching row with bad fields   -> invalid
```

Add a small pure mapper inside the adapter, for example:

```ts
toLessonMetadataRecord(dto: LessonMetadataDto): LessonMetadataRecord | readonly LessonMetadataIssue[]
```

A cleaner option is a local result:

```ts
type MetadataRecordParseResult =
    | Readonly<{ kind: "valid"; metadata: LessonMetadataRecord }>
    | Readonly<{ kind: "invalid"; issues: readonly LessonMetadataIssue[] }>;
```

Keep this mapper pure and directly unit-testable.

### Step 7: Update bridge and layout

Update:

```text
src/presentation/adapters/lesson-metadata-bridge.ts
src/layouts/NotesLayout.astro
```

The bridge should expose the resolution result instead of collapsing it.

`NotesLayout.astro` should render the metadata panel only for:

```ts
metadataResult.kind === "found";
```

For `missing` and `invalid`, render nothing in the layout during this phase.

Optional but useful: log or expose invalid metadata issues in test-only diagnostics if the project already has such a
seam. Avoid adding UI for invalid metadata unless there is a product requirement.

### Step 8: Update root exports

Update:

```text
packages/content-core/src/index.ts
packages/content-core/src/lesson-metadata/index.ts
```

Export:

```ts
parseNonEmptyText
parseAbsoluteUrl
parseGitCommitHash
parseIsoShortDateValue
parseLessonSourceFile

type NonEmptyText
type AbsoluteUrl
type GitCommitHash
type IsoShortDate
type LessonSourceFile

type LessonMetadataIssue
type LessonMetadataLookupResult
type LessonMetadataResolutionResult
```

Keep the package root as the supported consumer entry point.

## Test Plan

### Parser tests: BDD + DDT

Add table-driven tests for each parser.

```text
packages/content-core/src/lesson-metadata/__tests__/branded-values.test.ts
```

Cover accepted and rejected examples for:

- `parseNonEmptyText`
- `parseAbsoluteUrl`
- `parseGitCommitHash`
- `parseIsoShortDateValue`
- `parseLessonSourceFile`

Use BDD names:

```ts
describe("parseNonEmptyText", () => {
    it("returns trimmed branded text for meaningful input", () => {});
    it("rejects blank input", () => {});
});
```

Use `it.each` or the project’s preferred DDT helper for compact edge-case tables.

### Date parser tests

Prioritize real-date correctness:

```text
2024-02-29 -> accepted
2023-02-29 -> rejected
2026-04-31 -> rejected
2026-05-06T00:00:00Z -> rejected
```

Also test timezone stability by avoiding assertions that depend on local midnight.

### Service tests

Update service tests to cover all result branches:

- repository `found` returns `found` with display date;
- repository `missing` returns `missing`;
- repository `invalid` returns `invalid`;
- invalid issues are preserved exactly.

### Adapter tests

Add focused adapter tests:

- valid generated metadata becomes `found`;
- missing metadata becomes `missing`;
- invalid author name becomes `invalid`;
- invalid URL becomes `invalid`;
- invalid change hash becomes `invalid`;
- invalid change date becomes `invalid`;
- multiple invalid fields produce multiple issues in deterministic order;
- invalid matching record is not treated as `missing`.

### Bridge/layout tests

Update presentation tests:

- bridge exposes `found`;
- bridge exposes `missing`;
- bridge exposes `invalid`;
- layout renders metadata panel only for `found`;
- layout does not render metadata panel for `missing`;
- layout does not render metadata panel for `invalid`.

### Root API contract tests

Update root API tests to import all new public names from:

```ts
@ravenhill/content-core
```

Use compile-time assertions for branded types. TypeScript’s `satisfies` operator is useful for checking fixture shapes
without unnecessarily widening them, so it fits API contract fixtures well. :contentReference[oaicite:4]{index=4}

Example fixture:

```ts
const validIssue = {
    path: "authors[0].name",
    field: "name",
    message: "Expected non-empty text.",
} satisfies LessonMetadataIssue;
```

### Exhaustiveness test/helper

Add or reuse:

```ts
export function assertNever(value: never): never {
    throw new Error(`Unexpected value: ${String(value)}`);
}
```

Use it in result mappers where useful.

### PBT candidates

Use PBT only where it adds value beyond example tables. `fast-check` is a mature property-based testing framework for
JavaScript and TypeScript and works with Vitest, so it is a reasonable fit if it is already available in the workspace.
:contentReference[oaicite:5]{index=5}

Good PBT targets:

- `parseNonEmptyText` never returns blank text.
- `parseGitCommitHash` accepts generated hex strings of length 7–64.
- `parseIsoShortDateValue` rejects arbitrary non-date strings.
- `normalizeLessonMetadataPathname` remains idempotent.

Avoid PBT for `new URL` unless the generator is carefully constrained; otherwise the tests become noisy rather than
informative.

## Suggested File Layout

```text
packages/content-core/src/lesson-metadata/
  branded-values.ts
  date.ts
  index.ts
  lesson-metadata-service.ts
  pathname.ts
  records.ts
  repositories.ts
  results.ts
  types.ts
  __tests__/
    branded-values.test.ts
    lesson-metadata-service.test.ts
```

App-local tests:

```text
src/infrastructure/adapters/__tests__/LessonMetadataAdapter.test.ts
src/presentation/adapters/__tests__/lesson-metadata-bridge.test.ts
src/layouts/__tests__/NotesLayout.test.ts
```

## Acceptance Criteria

- Trusted metadata records no longer expose unvalidated plain strings for semantic fields.
- DTOs remain plain-string input contracts.
- Parser functions are exported from the package root.
- Invalid matching metadata returns `kind: "invalid"` with deterministic issues.
- Missing metadata returns `kind: "missing"`.
- Service resolution preserves invalid and missing states.
- Metadata panel renders only for `kind: "found"`.
- Root API contract tests cover branded types, parser functions, and result types.
- No new runtime dependency is added to `@ravenhill/content-core`.
- App-local Zod validation remains app-local.
- `parseIsoShortDate` remains backward-compatible as the `Date | undefined` parser.
- `parseIsoShortDateValue` is the new branded-string parser.

## Risks and Mitigations

| Risk                                               | Mitigation                                                                        |
| -------------------------------------------------- | --------------------------------------------------------------------------------- |
| Branded values make test fixtures verbose.         | Use parser helpers in fixtures or small test builders.                            |
| Invalid metadata issues become unstable.           | Define deterministic issue path and ordering rules.                               |
| `missing` and `invalid` get conflated in adapters. | Add explicit tests for “matching invalid record is invalid, not missing.”         |
| The service starts doing validation work.          | Keep validation in repository adapters; keep service as a result mapper.          |
| URL validation accepts unwanted schemes.           | Restrict `AbsoluteUrl` to `http:` and `https:` unless another scheme is required. |
| Date validation becomes timezone-sensitive.        | Validate `YYYY-MM-DD` with numeric parts and UTC round-trip checks.               |
| Result unions add repetitive switches.             | Add `assertNever` and keep result variants minimal.                               |
| This expands beyond Phase 2.                       | Track it as a follow-up API-hardening phase, not as part of the naming cleanup.   |

## Verification Commands

Run focused package checks first:

```sh
pnpm check:content-core
```

Run focused unit tests:

```sh
pnpm test:unit -- packages/content-core src/infrastructure/adapters src/presentation/adapters src/layouts
```

Run the full local gate:

```sh
pnpm check
```

## Recommended Sequencing

1. Add branded parsers and parser tests.
2. Update trusted record types.
3. Add result types.
4. Update repository and service contracts.
5. Update service tests.
6. Update `LessonMetadataAdapter`.
7. Update bridge/layout consumers.
8. Update root API contract tests.
9. Run focused checks.
10. Run full `pnpm check`.
