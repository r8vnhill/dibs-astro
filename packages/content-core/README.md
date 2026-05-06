# @ravenhill/content-core

Content abstraction layer for reusable documentation and learning systems.

## Phase 2 + API Hardening (Current)

This package contains the first extracted pure content core from the Astro site and now exposes a stabilized root API.
It establishes:

- Workspace topology (`packages/*` alongside root Astro app)
- Package identity (`@ravenhill/content-core` as a reusable, publication-ready scoped package)
- Consumption pattern (workspace dependency from root app)
- Build validation (TypeScript type checking)
- Host-agnostic navigation and lesson metadata contracts
- Stabilized service names: `NavigationService`, `LessonMetadataService`, `NavigationServiceContract`, and
  `LessonMetadataServiceContract`
- Branded lesson metadata record values for trusted repository data
- Explicit metadata lookup/resolution results that distinguish `found`, `missing`, and `invalid`

The package remains `private: true` during this phase to avoid accidental publication.

## Design Goals

- **Neutral identity**: `content-core` (not `course-core`) to enable reuse beyond DIBS
- **Host-agnostic**: Pure content abstractions without Astro or platform-specific coupling
- **Publication-ready**: Named as if publication to npm/GitLab were real, even though not done yet
- **Root-only API**: Consumers import from `@ravenhill/content-core`, not package subpaths

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
