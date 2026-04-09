# @ravenhill/content-core

Content abstraction layer for reusable documentation and learning systems.

## Phase 0 (Current)

This package serves as a structural proof-of-concept for workspace modularization. It establishes:

- Workspace topology (`packages/*` alongside root Astro app)
- Package identity (`@ravenhill/content-core` as a reusable, publication-ready scoped package)
- Consumption pattern (workspace dependency from root app)
- Build validation (TypeScript type checking)

The package remains `private: true` during this phase to avoid accidental publication.

## Design Goals

- **Neutral identity**: `content-core` (not `course-core`) to enable reuse beyond DIBS
- **Host-agnostic**: Pure content abstractions without Astro or platform-specific coupling
- **Publication-ready**: Named as if publication to npm/GitLab were real, even though not done yet

## Future Evolution

Phase 1+ will extract real domain logic (lessons, course structure, reference taxonomy) and other domain models into this package, with careful vocabulary work to expose content-neutral public APIs while keeping DIBS-specific implementation details internal.

See `docs/plans/` for the extraction roadmap.
