# [DONE] Strengthen `content-core` Root API Contract Tests

## Summary

Refactor the current mixed root API test into focused runtime, type-level, and negative contract tests.

The current test mixes runtime assertions with type-only imports, which makes failures harder to interpret and leaves
some API-boundary guarantees weak. This refactor separates concerns:

- runtime tests prove package-root **value exports** exist;
- type tests prove package-root **type exports** are available and well-shaped;
- negative type fixtures prove removed Phase 1 names remain unavailable;
- subpath fixtures prove the package remains root-only;
- branded-value type tests prove parsers are the supported construction path for trusted branded values.

Vitest type tests are the right mechanism here because `*.test-d.ts` files are treated as type tests by default, and
Vitest supports `expectTypeOf` and `assertType` for type assertions.

## Goals

- Make root API contract failures easier to diagnose.
- Separate runtime export tests from type-only API tests.
- Verify removed temporary Phase 1 names are not reintroduced.
- Verify unsupported package subpaths remain unavailable.
- Verify branded values are obtained through public parser functions.
- Keep existing runtime parser BDD/DDT coverage.
- Avoid adding new dependencies or PBT in this pass.

## Non-Goals

- Do not change production API names.
- Do not change parser behaviour.
- Do not add `fast-check` properties in this pass.
- Do not add a packed-consumer fixture.
- Do not add publication or package-build work.
- Do not broaden the package export surface.
- Do not test every implementation detail behind the root API.

## Proposed Test Layout

Use focused files with one responsibility each:

```text
packages/content-core/src/__tests__/
  root-api.test.ts
  root-api.test-d.ts
  root-api.removed-names.test-d.ts
  root-api.subpaths.test-d.ts
  branded-values.test-d.ts
```

Keep existing runtime branded parser tests:

```text
packages/content-core/src/lesson-metadata/__tests__/branded-values.test.ts
```

The important split is:

| File                               | Purpose                                                |
| ---------------------------------- | ------------------------------------------------------ |
| `root-api.test.ts`                 | Runtime value exports from `@ravenhill/content-core`.  |
| `root-api.test-d.ts`               | Positive type-only package-root contract.              |
| `root-api.removed-names.test-d.ts` | Negative checks for removed Phase 1 names.             |
| `root-api.subpaths.test-d.ts`      | Negative checks for unsupported package subpaths.      |
| `branded-values.test-d.ts`         | Type-level parser return contracts for branded values. |
| `branded-values.test.ts`           | Runtime BDD/DDT parser behaviour.                      |

## Runtime Root API Test

Update:

```text
packages/content-core/src/__tests__/root-api.test.ts
```

This file should import and assert only symbols that exist at runtime.

Cover:

- package identity constants;
- navigation value symbols;
- metadata service value symbol;
- parser, formatter, and normalization functions.

Example shape:

```ts
import {
    AdjacentLessons,
    CONTENT_CORE_PACKAGE_NAME,
    CONTENT_CORE_VERSION,
    formatDate,
    formatLessonDate,
    LessonHref,
    LessonMetadataService,
    LessonSequenceService,
    LessonTrail,
    NavigationService,
    normalizeLessonMetadataPathname,
    parseAbsoluteUrl,
    parseGitCommitHash,
    parseIsoShortDate,
    parseIsoShortDateValue,
    parseLessonSourceFile,
    parseNonEmptyText,
    resolveLessonDateDisplay,
} from "@ravenhill/content-core";
import { describe, expect, test } from "vitest";

describe("content-core root API values", () => {
    test("exposes package identity values", () => {
        expect(CONTENT_CORE_PACKAGE_NAME).toBe("@ravenhill/content-core");
        expect(CONTENT_CORE_VERSION).toMatch(/^\d+\.\d+\.\d+/);
    });

    test("exposes navigation values", () => {
        expect(AdjacentLessons).toBeDefined();
        expect(LessonHref).toBeDefined();
        expect(LessonSequenceService).toBeDefined();
        expect(LessonTrail).toBeDefined();
        expect(NavigationService).toBeDefined();
    });

    test("exposes metadata values and helpers", () => {
        expect(LessonMetadataService).toBeDefined();
        expect(formatDate).toBeTypeOf("function");
        expect(formatLessonDate).toBeTypeOf("function");
        expect(normalizeLessonMetadataPathname).toBeTypeOf("function");
        expect(parseAbsoluteUrl).toBeTypeOf("function");
        expect(parseGitCommitHash).toBeTypeOf("function");
        expect(parseIsoShortDate).toBeTypeOf("function");
        expect(parseIsoShortDateValue).toBeTypeOf("function");
        expect(parseLessonSourceFile).toBeTypeOf("function");
        expect(parseNonEmptyText).toBeTypeOf("function");
        expect(resolveLessonDateDisplay).toBeTypeOf("function");
    });
});
```

Avoid runtime assertions against values created with:

```ts
undefined as unknown as SomeType;
```

That pattern does not meaningfully validate type contracts.

## Positive Type API Test

Replace the current mixed type test with:

```text
packages/content-core/src/__tests__/root-api.test-d.ts
```

Use `assertType` and `expectTypeOf`. Vitest documents these as the intended APIs for type tests, and type-test files are
statically analysed rather than executed.

Cover:

- navigation result and trail node assignability;
- metadata DTO and issue assignability;
- lookup/resolution discriminated unions;
- service and repository contracts are exported and not `any`;
- branded types are string-compatible but remain distinct construction targets.

Example shape:

```ts
import type {
    AbsoluteUrl,
    GitCommitHash,
    IsoShortDate,
    LessonMetadataDto,
    LessonMetadataIssue,
    LessonMetadataLookupResult,
    LessonMetadataRepository,
    LessonMetadataResolutionResult,
    LessonMetadataServiceContract,
    LessonNavigationRepository,
    LessonSourceFile,
    NavigationResult,
    NavigationServiceContract,
    NonEmptyText,
    TrailNode,
} from "@ravenhill/content-core";
import { assertType, expectTypeOf, test } from "vitest";

test("exposes stabilized type contracts from the package root", () => {
    assertType<TrailNode>({
        title: "Trail",
        href: "/notes/",
    });

    assertType<NavigationResult>({
        next: {
            title: "Next",
            href: "/notes/next/",
        },
    });

    assertType<LessonMetadataDto>({
        authors: [],
        changes: [],
    });

    assertType<LessonMetadataIssue>({
        path: "authors[0].name",
        field: "name",
        message: "Expected non-empty text.",
    });

    expectTypeOf<LessonMetadataLookupResult>().toMatchTypeOf<
        | { kind: "found" }
        | { kind: "missing" }
        | { kind: "invalid" }
    >();

    expectTypeOf<LessonMetadataResolutionResult>().toMatchTypeOf<
        | { kind: "found" }
        | { kind: "missing" }
        | { kind: "invalid" }
    >();

    expectTypeOf<NavigationServiceContract>().not.toBeAny();
    expectTypeOf<LessonMetadataServiceContract>().not.toBeAny();
    expectTypeOf<LessonNavigationRepository>().not.toBeAny();
    expectTypeOf<LessonMetadataRepository>().not.toBeAny();

    expectTypeOf<NonEmptyText>().toMatchTypeOf<string>();
    expectTypeOf<AbsoluteUrl>().toMatchTypeOf<string>();
    expectTypeOf<GitCommitHash>().toMatchTypeOf<string>();
    expectTypeOf<IsoShortDate>().toMatchTypeOf<string>();
    expectTypeOf<LessonSourceFile>().toMatchTypeOf<string>();
});
```

## Negative Removed-Name Test

Add:

```text
packages/content-core/src/__tests__/root-api.removed-names.test-d.ts
```

Use focused `@ts-expect-error` assertions inside the test body:

```ts
import { assertType, test } from "vitest";

test("does not expose removed Phase 1 service names from the package root", () => {
    // @ts-expect-error Phase 2 removed this temporary Phase 1 public name.
    assertType<import("@ravenhill/content-core").INavigationService>();

    // @ts-expect-error Phase 2 removed this temporary Phase 1 public name.
    assertType<import("@ravenhill/content-core").ILessonMetadataService>();

    // @ts-expect-error Phase 2 removed this temporary Phase 1 public name.
    assertType<import("@ravenhill/content-core").NavigationServiceImpl>();

    // @ts-expect-error Phase 2 removed this temporary Phase 1 public name.
    assertType<import("@ravenhill/content-core").LessonMetadataServiceImpl>();
});
```

This protects the “no compatibility aliases” policy.

## Negative Subpath Test

Add:

```text
packages/content-core/src/__tests__/root-api.subpaths.test-d.ts
```

Use this only if the current package resolution already rejects subpaths. If workspace aliases still make subpaths
resolvable before Phase 3 package `exports`, keep the source-level architecture test as the authoritative guard and mark
this type fixture as Phase 3-ready.

```ts
import { assertType, test } from "vitest";

test("does not expose lesson-navigation as a public subpath", () => {
    // @ts-expect-error Consumers must import from @ravenhill/content-core.
    assertType<typeof import("@ravenhill/content-core/navigation")>();
});

test("does not expose lesson-metadata as a public subpath", () => {
    // @ts-expect-error Consumers must import from @ravenhill/content-core.
    assertType<typeof import("@ravenhill/content-core/lesson-metadata")>();
});
```

Important risk: if TypeScript path aliases currently resolve these subpaths from source, this test will fail for the
wrong reason. In that case, defer this fixture until Phase 3 introduces package `exports`, or run it only in a
built-package/package-resolution test project.

## Branded Parser Type Test

Add:

```text
packages/content-core/src/__tests__/branded-values.test-d.ts
```

This should prove that public parser functions return branded values through the root API.

```ts
import {
    type AbsoluteUrl,
    type GitCommitHash,
    type IsoShortDate,
    type LessonSourceFile,
    type NonEmptyText,
    parseAbsoluteUrl,
    parseGitCommitHash,
    parseIsoShortDateValue,
    parseLessonSourceFile,
    parseNonEmptyText,
} from "@ravenhill/content-core";
import { assertType, test } from "vitest";

test("branded parsers expose branded return types from the package root", () => {
    const text = parseNonEmptyText("Ada Lovelace");
    const url = parseAbsoluteUrl("https://example.com");
    const hash = parseGitCommitHash("abc1234");
    const date = parseIsoShortDateValue("2026-05-07");
    const sourceFile = parseLessonSourceFile("notes/index.astro");

    if (text !== undefined) {
        assertType<NonEmptyText>(text);
    }

    if (url !== undefined) {
        assertType<AbsoluteUrl>(url);
    }

    if (hash !== undefined) {
        assertType<GitCommitHash>(hash);
    }

    if (date !== undefined) {
        assertType<IsoShortDate>(date);
    }

    if (sourceFile !== undefined) {
        assertType<LessonSourceFile>(sourceFile);
    }
});
```

Keep runtime parser examples in `branded-values.test.ts` using BDD/DDT. Do not add PBT in this pass unless parser
behaviour changes.

## Test Runner Changes

Update `vitest.config.ts` so type tests are discovered intentionally.

Vitest’s runtime `include` defaults to `**/*.{test,spec}.?(c|m)[jt]s?(x)`, while type tests use `*.test-d.ts` by default
unless configured differently. Runtime include and typecheck include should remain separate to avoid confusing test
discovery.

Suggested config shape:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        include: [
            "packages/content-core/src/**/*.test.ts",
            "src/**/*.test.ts",
            "scripts/**/*.test.ts",
        ],
        typecheck: {
            include: [
                "packages/content-core/src/**/*.test-d.ts",
            ],
        },
    },
});
```

Adjust the runtime `include` list to match the existing repository setup. Do not accidentally remove existing site tests
from the runtime suite.

Vitest typechecking is disabled by default and is enabled through config or CLI flags such as `--typecheck`; add a
deliberate script so these tests actually run in CI/local checks.

## Script Changes

Add a focused script:

```json
{
    "scripts": {
        "test:typecheck:content-core": "vitest typecheck --typecheck.only packages/content-core/src"
    }
}
```

If Vitest’s positional filtering does not interact cleanly with `typecheck.include`, prefer:

```json
{
    "scripts": {
        "test:typecheck:content-core": "vitest typecheck --typecheck.only --config vitest.config.ts"
    }
}
```

and keep the scope in `typecheck.include`.

Then include it in the content-core validation path:

```json
{
    "scripts": {
        "check:content-core": "pnpm test:typecheck:content-core && <existing content-core checks>"
    }
}
```

If adding this to `check:content-core` broadens the site validation too much, add it as a required focused command in
the phase acceptance criteria first, then wire it into the package check after the initial pass is stable.

## Test Cases and Scenarios

### Runtime root API values

- Package name equals `@ravenhill/content-core`.
- Package version matches semver-like metadata.
- Navigation value symbols are defined.
- Metadata service is defined.
- Metadata parser, formatter, and normalization exports are functions.

### Positive type API

- `NavigationResult` and `TrailNode` shapes are assignable from root imports.
- `LessonMetadataDto` is assignable from root imports.
- `LessonMetadataIssue` is assignable from root imports.
- `LessonMetadataLookupResult` exposes `found`, `missing`, and `invalid` variants.
- `LessonMetadataResolutionResult` exposes `found`, `missing`, and `invalid` variants.
- Service and repository contracts are exported and are not `any`.
- Branded string types remain string-compatible.
- Parser return values narrow to branded types after `undefined` checks.

### Negative type API

- `INavigationService` does not resolve from the package root.
- `ILessonMetadataService` does not resolve from the package root.
- `NavigationServiceImpl` does not resolve from the package root.
- `LessonMetadataServiceImpl` does not resolve from the package root.
- `@ravenhill/content-core/navigation` does not resolve as a public package subpath.
- `@ravenhill/content-core/lesson-metadata` does not resolve as a public package subpath.

## BDD, DDT, and PBT Policy

### BDD

Use behaviour-oriented suite names:

```text
content-core root API values
content-core root API types
removed Phase 1 root API names
content-core root-only package boundary
branded parser root API types
```

### DDT

Keep runtime parser examples table-driven:

```text
accepted values
rejected values
normalization examples
```

### PBT

Do not add PBT in this pass.

Good future PBT candidates remain:

- parser invariants for `parseNonEmptyText`;
- generated valid/invalid hex strings for `parseGitCommitHash`;
- idempotence of `normalizeLessonMetadataPathname`;
- real-date acceptance/rejection for `parseIsoShortDateValue`.

## Acceptance Criteria

- Done: `root-api.test.ts` contains only runtime value assertions.
- Done: Positive type-only API coverage lives in `root-api.test-d.ts`.
- Done: Removed-name checks live in `root-api.removed-names.test-d.ts`.
- Done: Subpath checks live in `root-api.subpaths.test-d.ts`; package `exports` already reject these subpaths.
- Done: Branded parser return types are checked through the public root API.
- Done: No runtime test uses `undefined as unknown as SomeType` just to force type usage.
- Done: Type fixtures are discovered through `vitest.content-core.types.config.ts` and statically checked by TypeScript
  in `pnpm test:typecheck:content-core`.
- Done: `check:content-core` runs the focused typecheck script after package validation.
- Done: Existing runtime branded parser DDT tests remain in place.
- Done: No new dependency was added.
- Done: No production API was changed.

Note: Vitest 3.2.4's experimental `run --typecheck.only` flow hung in this Windows/Astro workspace during this pass. The
implemented script uses `node ./node_modules/vitest/vitest.mjs list --typecheck.only` to prove fixture discovery, then
`tsc --noEmit` from `packages/content-core` to validate the same `.test-d.ts` files.

## Verification Commands

Run the focused type tests:

```sh
pnpm test:typecheck:content-core
```

Status: passed.

Run focused runtime tests:

```sh
pnpm test:unit -- packages/content-core/src
```

Status: passed. Vitest treated the path filter broadly in this workspace and ran the full unit suite successfully.

Run the package check:

```sh
pnpm check:content-core
```

Status: passed.

Run the architecture boundary tests:

```sh
pnpm test:unit -- scripts/__tests__/layer-boundary-rules.test.ts
pnpm check:architecture
```

Run the full check after the focused suite is green:

```sh
pnpm check
```

## Risks and Mitigations

| Risk                                                                      | Mitigation                                                                           |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Type tests are created but never executed.                                | Add `test:typecheck:content-core` and wire it into `check:content-core` when stable. |
| Negative subpath tests fail before package `exports` exists.              | Defer them to Phase 3 or run them only in a built-package resolution fixture.        |
| Runtime tests keep pretending to check types.                             | Keep runtime tests limited to value exports and parser behaviour.                    |
| Type fixtures become too broad and noisy.                                 | Split positive, removed-name, subpath, and branded-parser tests by purpose.          |
| `@ts-expect-error` hides the wrong error.                                 | Keep each negative assertion minimal and immediately adjacent to the expected error. |
| Vitest config accidentally drops existing runtime tests.                  | Add only `typecheck.include`; do not rewrite runtime `include` unless necessary.     |
| Type tests depend on internal source resolution rather than package root. | Import only from `@ravenhill/content-core`; avoid `src/index.ts` imports.            |
