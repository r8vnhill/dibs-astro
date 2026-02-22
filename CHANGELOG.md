# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/).

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
