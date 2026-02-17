# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

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
