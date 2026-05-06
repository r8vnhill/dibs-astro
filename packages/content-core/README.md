# @ravenhill/content-core

Content abstraction layer for reusable documentation and learning systems.

## Phase 1 (Current)

This package now contains the first extracted pure content core from the Astro site. It establishes:

- Workspace topology (`packages/*` alongside root Astro app)
- Package identity (`@ravenhill/content-core` as a reusable, publication-ready scoped package)
- Consumption pattern (workspace dependency from root app)
- Build validation (TypeScript type checking)
- Host-agnostic navigation and lesson metadata contracts

The package remains `private: true` during this phase to avoid accidental publication.

## Design Goals

- **Neutral identity**: `content-core` (not `course-core`) to enable reuse beyond DIBS
- **Host-agnostic**: Pure content abstractions without Astro or platform-specific coupling
- **Publication-ready**: Named as if publication to npm/GitLab were real, even though not done yet
- **Root-only API**: Consumers import from `@ravenhill/content-core`, not package subpaths

## Exported Core

- Lesson navigation: canonical href normalization, adjacency, trails, navigation repositories, and the navigation service.
- Lesson metadata: metadata records, date/path helpers, metadata repository contracts, DTOs, and the metadata service.
- Package identity constants for workspace consumption checks.

## Future Evolution

Later phases may extract more content-neutral domain logic, such as reference taxonomy, after the public vocabulary and app boundaries are clear. DIBS-specific implementation details, generated data, Astro adapters, and UI remain in the app.

See `docs/plans/` for the extraction roadmap.
