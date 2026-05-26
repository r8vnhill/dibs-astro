# [DONE] Phase 1: Extract Navigation and Lesson Metadata Core into `@ravenhill/content-core`

## Summary

Extract the first host-agnostic content core into the existing `packages/content-core` workspace package. Do **not** introduce a new `course-core` package.

The Astro app remains at the repository root and consumes the extracted package through the existing `@ravenhill/content-core` workspace dependency. This phase moves only pure lesson navigation and lesson metadata logic: contracts, DTOs, value helpers, and application services that do not depend on Astro, generated JSON, Zod, course-structure files, UI components, or infrastructure adapters.

This extraction should make `@ravenhill/content-core` the canonical source for reusable content-domain behaviour while keeping all DIBS-specific, Astro-specific, generated-data, and rendering concerns in the app.

## Goals

* Establish `packages/content-core` as the shared pure core for content navigation and lesson metadata.
* Remove long-lived duplicate implementations from `src/domain` and `src/application`.
* Preserve existing app behaviour and public app-side adapter contracts.
* Keep the package private, content-neutral, dependency-light, and importable only through its root entry point.
* Update architecture rules so the app may depend on `@ravenhill/content-core`, while `@ravenhill/content-core` must not depend on app-local layers.

TypeScript project references are a good fit if this package already participates in multi-project checking, because they support smaller TypeScript programs, faster builds, and clearer logical separation. Do not add project references in this phase unless they already match the repository’s current package-checking model. ([TypeScript][2])

## Non-goals

Do **not** move or change the following in Phase 1:

* Astro components, layouts, pages, routes, or islands.
* Generated JSON loading.
* Zod validation.
* `src/utils/lesson-metadata.ts`.
* `LessonCatalogAdapter`.
* `LessonMetadataAdapter`.
* Course-structure data under `~/data/course-structure`.
* Presentation bridges and Astro rendering tests.
* `reference-content.ts`.
* Publishing metadata, npm release configuration, or package registry behaviour.
* Any new runtime dependency.

## Terminology Cleanup

Treat references to `course-core` in older planning documents as stale terminology.

Update Phase 1 planning language to consistently refer to:

* package name: `@ravenhill/content-core`
* package path: `packages/content-core`
* domain scope: content navigation and lesson metadata
* app scope: Astro, generated data, infrastructure adapters, presentation, and rendering

## Extraction Scope

Move the following pure symbols into `packages/content-core/src` and export them from the package root:

### Navigation domain

* `LessonHref`
* `AdjacentLessons`
* `NavigationNode`
* `LessonTrail`
* `TrailNode`
* `LessonSequenceService`

### Lesson metadata domain

* lesson metadata record helpers
* lesson metadata date helpers
* lesson metadata pathname/path normalization helpers
* `formatLessonDate`
* `normalizeLessonMetadataPathname`

### Repository contracts

* `LessonNavigationRepository`
* `LessonMetadataRepository`

### Application contracts and services

* `INavigationService`
* `NavigationResult`
* metadata DTOs
* navigation service implementation
* metadata service implementation
* `LessonMetadataServiceImpl`
* `NavigationServiceImpl`

## App-local Scope

Keep the following in the Astro app:

* `src/utils/lesson-metadata.ts`, because it imports generated JSON and performs Zod validation.
* `LessonCatalogAdapter`, because it knows `~/data/course-structure`.
* `LessonMetadataAdapter`, because it adapts generated app data to the core repository contract.
* Presentation adapters, bridges, layouts, components, routes, and Astro rendering tests.
* Any test whose main purpose is validating Astro rendering, SSR structure, or app integration.
* `reference-content.ts`.

## Package Public API

`@ravenhill/content-core` exposes a **single root entry point** only.

```ts
import {
    AdjacentLessons,
    LessonHref,
    LessonSequenceService,
    LessonTrail,
    NavigationServiceImpl,
    LessonMetadataServiceImpl,
    formatLessonDate,
    normalizeLessonMetadataPathname,
    type LessonNavigationRepository,
    type LessonMetadataRepository,
    type NavigationResult,
    type LessonMetadataDto,
    type TrailNode,
} from "@ravenhill/content-core";
```

No imports like this should be introduced:

```ts
import { LessonHref } from "@ravenhill/content-core/navigation";
import { formatLessonDate } from "@ravenhill/content-core/metadata";
```

If the package already uses `exports`, keep or adjust it so only `"."` is exposed. This matches the package-boundary goal because Node package exports encapsulate subpaths that are not explicitly exported. ([Node.js][1])

Recommended package shape:

```json
{
  "name": "@ravenhill/content-core",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  }
}
```

Use this only if it is consistent with the repository’s current “exports TypeScript source directly” setup.

## Suggested Internal Package Layout

Keep the internal package structure modular even though consumers only import from the root.

```txt
packages/content-core/
  src/
    index.ts
    navigation/
      lesson-href.ts
      lesson-sequence-service.ts
      lesson-trail.ts
      navigation-service.ts
      repositories.ts
      types.ts
      __tests__/
    lesson-metadata/
      date.ts
      pathname.ts
      records.ts
      lesson-metadata-service.ts
      repositories.ts
      types.ts
      __tests__/
```

`index.ts` should re-export the stable public surface only.

Example:

```ts
export {
    LessonHref,
    LessonSequenceService,
    LessonTrail,
    NavigationServiceImpl,
} from "./navigation/index";

export {
    LessonMetadataServiceImpl,
    formatLessonDate,
    normalizeLessonMetadataPathname,
} from "./lesson-metadata/index";

export type {
    AdjacentLessons,
    INavigationService,
    LessonNavigationRepository,
    NavigationNode,
    NavigationResult,
    TrailNode,
} from "./navigation/index";

export type {
    LessonMetadataDto,
    LessonMetadataRepository,
} from "./lesson-metadata/index";
```

## Dependency Rules

After this phase, the intended direction is:

```txt
Astro app
  -> @ravenhill/content-core

@ravenhill/content-core
  -> no app-local imports
  -> no Astro imports
  -> no generated-data imports
  -> no Zod imports
  -> no UI imports
```

The app may depend on `@ravenhill/content-core`.

`@ravenhill/content-core` must not depend on:

* `src/*`
* `$domain/*`
* `$application/*`
* `$infrastructure/*`
* `$presentation/*`
* `~/data/*`
* Astro APIs
* generated JSON
* Zod schemas

## TDD Implementation Sequence

### Step 1: Lock current behaviour

Run the existing focused tests for navigation and metadata before moving files.

Expected command set:

```sh
pnpm check:content-core
pnpm test -- lesson-metadata
pnpm test -- navigation
```

Adjust the exact focused commands to match the repository’s current test names.

### Step 2: Create package modules without app rewiring

Copy or move the pure implementation into `packages/content-core/src`.

At this point, keep app imports unchanged where possible. The purpose of this step is to make the package tests pass before changing app consumers.

### Step 3: Move package-owned tests

Move pure unit tests from:

```txt
src/domain/**
src/application/**
```

into:

```txt
packages/content-core/src/**/__tests__/
```

Only move tests that do not require Astro, generated JSON, app aliases, or rendering infrastructure.

### Step 4: Export the package API

Create or update `packages/content-core/src/index.ts`.

Ensure the package root exports all extracted symbols and no unstable internals.

### Step 5: Rewire app imports

Replace app imports from local domain/application modules with imports from `@ravenhill/content-core`.

Examples:

```ts
import {
    LessonSequenceService,
    type LessonNavigationRepository,
} from "@ravenhill/content-core";
```

Use `import type` for type-only imports to keep the runtime surface clean.

### Step 6: Remove local duplicates

After all app references are migrated, remove or empty the old local equivalents in:

```txt
src/domain/**
src/application/**
```

Do not leave forwarding facades unless they are needed for a short, explicit compatibility window. If facades are necessary, mark them as temporary and remove them before Phase 1 is considered complete.

### Step 7: Update architecture checks

Update the architecture-boundary checker only as needed:

* App layers may import from `@ravenhill/content-core`.
* `@ravenhill/content-core` must not import app-local paths.
* No app-local `$domain` or `$application` duplicate core modules should remain as active implementations.
* No subpath imports from `@ravenhill/content-core/*` are allowed.

### Step 8: Update stale docs and plans

Update references to `course-core` in the relevant plan document.

Preserve uncommitted user work in:

```txt
docs/plans/refined_plan_for_extracting_and_preparing_an_astro_library_from_this_repository.md
src/utils/lesson-metadata.ts
src/utils/__tests__/lesson-metadata.test.ts
src/infrastructure/adapters/LessonMetadataAdapter.ts
```

Do not overwrite these files wholesale. Apply targeted edits only.

## Test Plan

### Package tests

Move or add focused tests for:

* `LessonHref`

  * normalizes valid input
  * rejects empty input
  * preserves expected path semantics
* adjacent lesson resolution

  * middle lesson
  * first lesson
  * last lesson
  * unknown lesson
  * empty sequence
* lesson trail creation

  * root node
  * nested ancestry
  * missing node behaviour
* metadata pathname normalization

  * plain paths
  * relative paths
  * absolute URLs
  * query strings
  * fragments
  * URL-like malformed input where current behaviour is already defined
* date handling

  * ISO short dates
  * impossible calendar dates
  * blank dates
  * passthrough text
  * UTC-stable locale formatting
* application services

  * repository result mapping
  * missing metadata
  * missing navigation nodes
  * DTO shape stability

### App tests

Update app-side tests to import extracted symbols from `@ravenhill/content-core`.

Keep app-side coverage for:

* `LessonMetadataAdapter`
* `LessonCatalogAdapter`
* `src/utils/lesson-metadata.ts`
* presentation adapters
* Astro rendering contracts

### Verification commands

Run:

```sh
pnpm check:content-core
pnpm test -- --run packages/content-core
pnpm test -- --run src/infrastructure src/presentation
pnpm check
```

Use the repository’s exact Vitest filters if these commands need adjustment.

## Acceptance Criteria

Phase 1 is complete only when:

* `@ravenhill/content-core` contains the canonical implementation of extracted navigation and lesson metadata core logic.
* App code imports extracted symbols from `@ravenhill/content-core`.
* No long-lived duplicate implementation remains in `src/domain` or `src/application`.
* No package subpath imports are introduced.
* `src/utils/lesson-metadata.ts` remains app-local.
* `LessonCatalogAdapter` and `LessonMetadataAdapter` remain app-local.
* `reference-content.ts` remains app-local.
* Architecture checks allow app-to-core imports and reject core-to-app imports.
* `pnpm check:content-core` passes.
* Focused package and touched app tests pass.
* `pnpm check` passes.
* Existing uncommitted user work is preserved.

## Risks and Mitigations

### Risk: accidental extraction of app-specific behaviour

Mitigation: reject any moved code that imports generated JSON, Zod, Astro, course-structure data, or app aliases.

### Risk: hidden duplicate implementations

Mitigation: after rewiring imports, search for old local symbols and remove the local source files or reduce them to explicit temporary facades.

```sh
rg '\$domain|\$application|src/domain|src/application|@ravenhill/content-core/'
```

### Risk: unstable public API

Mitigation: expose only the package root and avoid subpath imports. Keep internal folders free to change.

### Risk: package checks diverge from app checks

Mitigation: keep `pnpm check:content-core` as the package-local gate and `pnpm check` as the full repository gate. pnpm workspaces are designed to support local package dependencies inside one repository, so this remains aligned with the workspace model. ([pnpm][3])

### Risk: architecture checker still assumes all domain/application code lives under `src`

Mitigation: update layer classification to treat `@ravenhill/content-core` as an externalized core package, not as infrastructure or presentation.

## Assumptions

* Existing uncommitted changes in the listed files are user work and must be preserved.
* `@ravenhill/content-core` already exists as a workspace package.
* The package remains `private: true`.
* The package continues exporting TypeScript source directly as it does now.
* No runtime dependencies are added.
* DIBS-specific naming and Astro-specific integration remain in the app.
* Phase 1 is an extraction/refactor phase, not a publishing, bundling, or package-distribution phase.

[1]: https://nodejs.org/api/packages.html?utm_source=chatgpt.com "Modules: Packages | Node.js v26.0.0 Documentation"
[2]: https://www.typescriptlang.org/docs/handbook/project-references.html?utm_source=chatgpt.com "Project References - TypeScript: Documentation"
[3]: https://pnpm.io/workspaces?utm_source=chatgpt.com "Workspace"
