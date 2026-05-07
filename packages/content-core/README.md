# @ravenhill/content-core

Content abstraction layer for reusable documentation and learning systems.

## Phase 4 (Current)

This package contains the first extracted pure content core from the Astro site and now builds to a root-only ESM
package artifact with external consumer validation. It establishes:

- Workspace topology (`packages/*` alongside root Astro app)
- Package identity (`@ravenhill/content-core` as a reusable, publication-ready scoped package)
- Consumption pattern (workspace dependency from root app)
- Build validation (`tsup`, TypeScript declarations, `publint`, and pack-file checks)
- Packaged-consumer validation from an isolated temporary project
- Host-agnostic navigation and lesson metadata contracts
- Stabilized service names: `NavigationService`, `LessonMetadataService`, `NavigationServiceContract`, and
  `LessonMetadataServiceContract`
- Branded lesson metadata record values for trusted repository data
- Explicit metadata lookup/resolution results that distinguish `found`, `missing`, and `invalid`

The package remains `private: true` during this phase to avoid accidental publication.

## Build and Package Checks

Run package validation from the repository root:

```sh
pnpm check:content-core
```

That command builds `dist/index.js` and `dist/index.d.ts`, typechecks the package, runs `publint --strict`, and verifies
the dry-run pack file list, validates the packed tarball from a temporary external consumer, then runs the focused
Vitest type contract tests for the package root. `dist/` is generated output and should not be edited by hand.

To run only the packaged-consumer validation:

```sh
pnpm --dir packages/content-core run consumer:check
```

That command builds the package, creates a local tarball, installs it into a temporary project outside the workspace,
and verifies runtime imports, TypeScript declarations, and unsupported subpath imports. Add `-- --keep-temp --verbose`
when debugging the temporary consumer.

To run only the root API type contract fixtures from the repository root:

```sh
pnpm test:typecheck:content-core
```

That command uses `vitest.content-core.types.config.ts` to list the type-only fixtures without the site-wide Astro/jsdom
runtime test configuration, then runs the package TypeScript check that statically validates those `.test-d.ts` files.

Runtime value exports remain covered by the unit suite:

```sh
pnpm test:unit -- packages/content-core/src
```

The package artifact is intentionally small: `package.json`, `README.md`, and the built `dist` entry files. Source
files, tests, local build config, and agent guidance are excluded from the packed artifact.

## Design Goals

- **Neutral identity**: `content-core` (not `course-core`) to enable reuse beyond DIBS
- **Host-agnostic**: Pure content abstractions without Astro or platform-specific coupling
- **Publication-ready**: Named as if publication to npm/GitLab were real, even though not done yet
- **Root-only API**: Consumers import from `@ravenhill/content-core`, not package subpaths; type fixtures check this
  boundary alongside removed-name compatibility guards

## Exported Core

- Lesson navigation: canonical href normalization, adjacency, trails, navigation repositories, and the navigation
  service.
- Lesson metadata: branded metadata records, parser helpers, explicit result contracts, date/path helpers, repository
  contracts, DTOs, and the metadata service.
- Package identity constants for workspace consumption checks.

Consumers should use service-oriented names from the package root:

```ts
import {
    LessonMetadataService,
    type LessonMetadataServiceContract,
    NavigationService,
    type NavigationServiceContract,
} from "@ravenhill/content-core";
```

Temporary Phase 1 names such as `NavigationServiceImpl`, `LessonMetadataServiceImpl`, `INavigationService`, and
`ILessonMetadataService` are no longer exported.

Metadata repositories now return explicit lookup results instead of `Record | undefined`. A matching generated record
with fields that cannot be branded returns `kind: "invalid"` with stable issue paths; only absent metadata returns
`kind: "missing"`. The presentation bridge exposes the result object and Astro layouts render metadata panels only for
`kind: "found"`.

## Future Evolution

Later phases may extract more content-neutral domain logic, such as reference taxonomy, after the public vocabulary and
app boundaries are clear. DIBS-specific implementation details, generated data, Astro adapters, and UI remain in the
app.

See `docs/plans/` for the extraction roadmap.
