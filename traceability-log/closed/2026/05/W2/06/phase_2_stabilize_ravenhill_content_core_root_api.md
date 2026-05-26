# [DONE] Phase 2: Stabilize `@ravenhill/content-core` Root API

## Summary

Stabilize `@ravenhill/content-core` around a deliberate **root-only public API**.

Phase 1 extracted the first pure content core, but some exported names still reflect temporary extraction terminology:
`*Impl` for concrete services and `I*` for service interfaces. Phase 2 cleans that up before the package surface spreads
further through the workspace.

This is an intentional internal breaking cleanup. Rename the public service symbols, update all in-repo consumers,
remove the old names from the package root, and lock the intended root export contract with tests.

This phase does **not** add publication metadata, subpath exports, runtime dependencies, generated-data extraction, or
additional domain extraction.

## Goals

- Make the package root the only supported import path.
- Replace temporary implementation/interface-style names with stable service-oriented API names.
- Ensure all app consumers import only from `@ravenhill/content-core`.
- Prevent accidental reintroduction of old `*Impl` / `I*` names at the package root.
- Keep package internals flexible by treating submodule barrels as internal implementation boundaries.

## Non-Goals

- Do not publish the package.
- Do not add `files`, `publishConfig`, Changesets, packed-consumer validation, Nx, Turbo, or external release tooling.
- Do not add subpath exports such as `@ravenhill/content-core/navigation`.
- Do not keep compatibility aliases for the old names.
- Do not move Zod validation, generated JSON loading, Astro components, or app infrastructure adapters into the package.
- Do not extract `reference-content.ts`.
- Do not broaden the Phase 1 API beyond the service-name cleanup and root contract stabilization.

## API Rename Policy

Rename the temporary Phase 1 public symbols as follows:

| Current name                | Stabilized name                 | Reason                                                              |
| --------------------------- | ------------------------------- | ------------------------------------------------------------------- |
| `NavigationServiceImpl`     | `NavigationService`             | Consumers should not care that this is the default implementation.  |
| `LessonMetadataServiceImpl` | `LessonMetadataService`         | Keeps the concrete service name concise and public-facing.          |
| `INavigationService`        | `NavigationServiceContract`     | Avoids Hungarian-style `I` prefix and clarifies architectural role. |
| `ILessonMetadataService`    | `LessonMetadataServiceContract` | Matches the service contract naming convention.                     |

Do not keep compatibility aliases. This is still an internal workspace API, so a direct rename keeps the root surface
smaller and avoids teaching consumers obsolete names.

## Stabilized Root API

The package root should support this import shape:

```ts
import {
    AdjacentLessons,
    formatLessonDate,
    LessonHref,
    type LessonMetadataDto,
    type LessonMetadataRepository,
    LessonMetadataService,
    type LessonMetadataServiceContract,
    type LessonNavigationRepository,
    LessonSequenceService,
    LessonTrail,
    type NavigationResult,
    NavigationService,
    type NavigationServiceContract,
    normalizeLessonMetadataPathname,
    type TrailNode,
} from "@ravenhill/content-core";
```

The package root should no longer export:

```ts
NavigationServiceImpl;
LessonMetadataServiceImpl;
INavigationService;
ILessonMetadataService;
```

Supported import path:

```ts
import { NavigationService } from "@ravenhill/content-core";
```

Unsupported import paths:

```ts
import { LessonMetadataService } from "@ravenhill/content-core/lesson-metadata";
import { NavigationService } from "@ravenhill/content-core/navigation";
```

Internal relative imports inside `packages/content-core/src/**` may continue to use local module paths. The root-only
rule applies to consumers outside the package.

## Implementation Plan

### Step 1: Lock the Current Public Contract with Failing Tests

Add or update package-level contract tests before renaming.

Cover:

- value exports available from `@ravenhill/content-core`;
- type-only exports available from `@ravenhill/content-core`;
- old names are not part of the intended final root API;
- subpath imports remain unsupported;
- app-facing consumers do not import package internals.

Prefer compile-oriented tests for type exports. Runtime tests should only assert value exports.

Suggested split:

```text
packages/content-core/src/__tests__/root-api.test.ts
packages/content-core/src/__tests__/root-api.types.test.ts
scripts/__tests__/layer-boundary-rules.test.ts
```

If the existing test setup does not support dedicated type tests, use a small TypeScript fixture compiled during
`pnpm check:content-core`.

### Step 2: Rename Package Internals

Rename the concrete service classes:

```text
NavigationServiceImpl       -> NavigationService
LessonMetadataServiceImpl   -> LessonMetadataService
```

Rename service contracts:

```text
INavigationService          -> NavigationServiceContract
ILessonMetadataService      -> LessonMetadataServiceContract
```

Update filenames only if doing so reduces confusion without causing unnecessary churn. For example, this is acceptable
but not required:

```text
navigation-service.ts
lesson-metadata-service.ts
```

Keep the change focused on public symbols and their direct documentation.

### Step 3: Update Internal Barrels

Update:

```text
packages/content-core/src/index.ts
packages/content-core/src/navigation/index.ts
packages/content-core/src/lesson-metadata/index.ts
```

The root barrel should export the stabilized names.

Internal submodule barrels may still exist for package implementation convenience, but their documentation should
clearly state that consumers should import from the root package.

### Step 4: Update App Consumers

Replace old imports across the Astro app and tests.

Expected affected areas:

```text
src/infrastructure/adapters/LessonCatalogAdapter*
src/infrastructure/adapters/LessonMetadataAdapter*
src/presentation/adapters/navigation-bridge*
src/presentation/adapters/lesson-metadata-bridge*
src/presentation/adapters/lesson-metadata-panel*
src/presentation/adapters/navigation-normalization*
```

Also check:

```text
src/**/*.test.*
scripts/**/*.test.*
docs/**/*.md
docs/plans/**/*.md
```

Do not perform broad documentation rewrites. Preserve the current uncommitted change to:

```text
docs/plans/refined_plan_for_extracting_and_preparing_an_astro_library_from_this_repository.md
```

Make only targeted terminology edits there.

### Step 5: Enforce the Root-Only Boundary

Keep or extend the architecture test that rejects external imports from package subpaths.

Allowed outside `packages/content-core`:

```ts
"@ravenhill/content-core";
```

Rejected outside `packages/content-core`:

```ts
"@ravenhill/content-core/navigation";
"@ravenhill/content-core/lesson-metadata";
"@ravenhill/content-core/*";
```

This matters because the internal barrels are implementation conveniences, not supported public package entry points.

### Step 6: Update Documentation and Traceability

Update package docs, internal barrel docs, and the phase record to describe the new policy:

- `NavigationService` and `LessonMetadataService` are the public concrete services.
- `NavigationServiceContract` and `LessonMetadataServiceContract` are the public service contracts.
- `*Impl` and `I*` names were temporary Phase 1 extraction names.
- Phase 2 is a contract cleanup, not a publication phase.
- Consumers should import from `@ravenhill/content-core` only.

## Test Plan

Run the focused package checks first:

```sh
pnpm check:content-core
```

Run package and architecture-related unit tests:

```sh
pnpm test:unit -- packages/content-core scripts/__tests__/layer-boundary-rules.test.ts src/infrastructure/adapters src/presentation/adapters
```

Run the architecture gate:

```sh
pnpm check:architecture
```

Run the full local verification gate:

```sh
pnpm check
```

Run Astro rendering tests after import rewrites:

```sh
pnpm test:astro
```

## Acceptance Criteria

- `@ravenhill/content-core` root exports the stabilized service and contract names.
- The old `NavigationServiceImpl`, `LessonMetadataServiceImpl`, `INavigationService`, and `ILessonMetadataService` names
  are not exported from the root.
- All in-repo consumers import package symbols from `@ravenhill/content-core`.
- No app code imports from `@ravenhill/content-core/navigation`, `@ravenhill/content-core/lesson-metadata`, or other
  package subpaths.
- Existing service behavior remains unchanged.
- Package API contract tests cover both value exports and type-only exports.
- Architecture boundary tests remain green.
- Documentation and traceability language match the stabilized naming policy.

## Risks and Mitigations

| Risk                                                               | Mitigation                                                                              |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| Type-only exports are not checked at runtime.                      | Add a compile-oriented API fixture or type-focused test.                                |
| Subpath imports accidentally work because of workspace resolution. | Keep architecture tests that scan source imports, not only package `exports`.           |
| Old names survive in docs or tests.                                | Search for `Impl`, `INavigationService`, and `ILessonMetadataService` after the rename. |
| Rename expands into unrelated package work.                        | Keep publication, build-output, and release-tooling tasks explicitly out of scope.      |
| Internal barrels are mistaken for public subpath APIs.             | Document them as internal and enforce root-only imports outside the package.            |

## Assumptions

- This package is still an internal workspace dependency, so direct breaking renames are acceptable.
- The root package API is the only supported consumer API.
- Internal package folders may keep relative imports and local barrels.
- Phase 2 does not alter generated metadata validation, Zod schemas, Astro components, or app-local infrastructure
  adapters.
- `reference-content.ts` remains outside the extraction scope for now.
