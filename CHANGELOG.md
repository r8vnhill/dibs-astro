# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/).

## [0.12.0] - 2026-03-12

### Added

- Added a centralized bibliography catalog modeled as a Web of Data graph, with Turtle as the editorial source, a generated JSON-LD artifact, course-wide report generation, and extensible reference rendering for books, web pages, articles, and theses.
- Added a new comparative Nushell lesson for `first-script`, including catalog-driven references and supporting bibliography data.
- Added render and unit tests for the new bibliography catalog pipeline, its Turtle-to-JSON-LD generation flow, and catalog-driven reference rendering.

### Changed

- Refined bibliography rendering so lesson references can be resolved from the current Astro route, filtered by pedagogical tags, and hidden automatically when a section ends up empty.
- Expanded the new Nushell lesson content and its supporting references so the comparison against PowerShell focuses on reusable commands, modules, and validation decisions.
- Updated project scripts and build hooks so bibliography catalog generation, lesson metadata generation, and reference reports are part of the normal project workflow.
- Updated `CHANGELOG.md` and the project version to reflect the current release state of the branch.

### Fixed

- Fixed fallback rendering in bibliography components when optional title or description slots are empty, preserving normalized reference data instead of rendering blank headings.
- Fixed source-link and reference-panel edge cases for route-inferred bibliography rendering and filtered reference groups.
- Fixed icon export generation so it preserves timestamps but avoids rewriting the generated index when the exported icon set has not changed.

## [0.11.1] - 2026-03-06

### Added

- Added a dedicated Astro render regression test for `ReferencesFromJsonLd` to verify title fallback behavior when only `description-*` slots are provided.
- Expanded `InlineCode` render test coverage with stronger cases around source resolution and rendering contracts.

### Changed

- Refined `InlineCode.astro` internals to make source resolution and usage rules more robust and predictable.
- Improved Astro render test utilities and Vitest unit config discovery/isolation to reduce config coupling in tests.
- Reworked the `notes/software-libraries/scripting/pipelines/` lesson with clearer abstract/conclusions and stronger pedagogical progression across filtering, projection, transformation, and JSON pipeline exercises.
- Regenerated derived metadata/index artifacts (`lesson-metadata.generated.json`, icon index) to reflect the updated lesson/content state.

### Fixed

- Fixed reference title rendering in bibliography components (`ReferencesFromJsonLd`, `Book`, `WebPage`) when empty title slots were present, preserving normalized/fallback titles instead of rendering blank labels.

## [0.11.0] - 2026-03-02

### Added

- Added a layered architecture foundation for navigation and lesson catalog concerns, including new `application`, `domain`, `infrastructure`, and `presentation` modules.
- Added domain model stubs for lessons (`Lesson`, `LessonId`, `LessonSlug`, `LessonHref`) with dedicated unit tests.
- Added ports/adapters and bridge implementations for navigation (`NavigationService`, `LessonCatalog`, `NavigationServiceImpl`, `LessonCatalogAdapter`, and `navigation-bridge`).
- Added comprehensive course structure test coverage, including flattening, validation, property-based tests, and shared test support utilities.
- Added `inline-code-classes` utility and focused tests to harden inline code rendering behavior.
- Added render tests for `LessonRepoPanel` to validate multi-repository source link rendering.
- Added the new lesson `Lab. 2: Git Submodules` under `notes/software-libraries/scripting/pipelines/git-submodules/`.
- Added architecture documentation for Phase 1 (checklists, summaries, tree, and ADR-001 for layered architecture).
- Added a new icon asset `shield-warning.svg`.

### Changed

- Updated `course-structure` modeling and content wiring to align with stronger typing and the new navigation/domain direction.
- Updated `NotesLayout` and `LessonRepoPanel` so a lesson can reference one or multiple repositories in source links.
- Updated `Heading.astro` typing and icon rendering behavior for more robust semantic heading handling.
- Updated `InlineCode.astro` behavior and render tests to improve wrapping predictability and style composition.
- Expanded and refined pipeline lesson content, especially `errors` and the new Git submodules lab, with clearer examples and publication workflow continuity with Lab 1.
- Updated project/tooling configuration (`astro.config.ts`, `tsconfig.json`, Vitest configs, VS Code settings, and CI settings) to support the current architecture and test split.
- Regenerated lesson metadata and icon index outputs to reflect the new lesson set and source history.

### Fixed

- Fixed linkability and source panel consistency for lessons that need to expose multiple repositories.
- Fixed edge cases in inline code class composition/wrapping through extracted class builder logic and dedicated tests.
- Fixed several navigation and lesson-structure regression risks by introducing stronger invariants and broader automated tests.

## [0.10.0] - 2026-02-22

### Added

- Added Shiki line-color support via custom transformers, including integration with `shiki-transformer-color-highlight`.
- Added a render regression test for `InlineCode.astro` to protect inline wrapping behavior.
- Added a dedicated Astro render test flow (`test:astro`, `test:watch:astro`) and documented naming conventions for test environments in `AGENTS.md`.
- Added a recommended bibliography entry to the scripting pipeline error lesson, including references to `$LASTEXITCODE` and related error-handling semantics.

### Changed

- Expanded and restructured the lesson at `notes/software-libraries/scripting/pipelines/errors/` with clearer explanations, updated hints, and a richer exercise around `-ErrorVariable` and batch-level failure handling.
- Updated code UI components (`OutputBlock`, `InlineCode`, `CodeLayout`, `LightCode`, `DarkCode`) and Shiki highlighter wiring to improve text wrapping and output rendering consistency.
- Updated Vitest configuration split so Astro render tests use their own config pattern (`*.render.test.ts`) separate from jsdom/unit tests.

### Fixed

- Fixed CI/CD ergonomics by allowing icon generation to be skipped in CI or via `SKIP_ICON_GENERATION=true`.
- Fixed layout/readability issues in long inline code fragments that previously overflowed content bounds.

## [0.9.1] - 2026-02-17

### Added

- Added a normalized editorial metadata pipeline for content pages, including canonical URL, language, authorship, `lastModified`, citation tags, and JSON-LD in `Head`.
- Added render tests for `Head.astro` and unit tests for `page-meta` utilities.
- Added render tests for `LessonMetaPanel`, covering empty states, missing dates, and optional platform/repository scenarios.
- Added an integration test that validates wiring of `generate:lesson-metadata` with `predev`, `prebuild`, and `predeploy`.
- Added a shared Astro render helper to reduce duplication across component tests.
- Added `PartialRecord` as a reusable type for partial platform-based metadata mappings.

### Changed

- Centralized the website’s primary author metadata in `src/data/site.ts`.
- Hardened `Head.astro` to handle canonical URL, `og:locale`, default social image, and page-type-gated citation tags consistently.
- Adjusted integration between `NotesLayout`, `BaseLayout`, and `Head` to propagate editorial metadata uniformly.
- Expanded Vitest configuration to better support Astro render tests for metadata components.

### Fixed

- Fixed `description` forwarding in `NotesLayout` to avoid passing `undefined` to the base layout.
- Covered and validated the metadata generator fallback when Git fails, returning empty changes with controlled warnings.
- Stabilized metadata test assertions with `data-testid` markers to reduce fragility against markup changes.
