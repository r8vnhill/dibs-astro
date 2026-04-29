# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/).

## [0.18.1] - 2026-04-28

### Changed

- Hardened lesson metadata normalization and date display so URL-like lookup inputs discard query strings/fragments, impossible calendar dates are rejected, blank dates use the missing-date fallback, and formatted dates remain UTC-stable.
- Adjusted CI for the local Docker runner so each Linux container performs a frozen pnpm install instead of reusing `node_modules` artifacts, avoiding missing optional native packages such as Rollup's Alpine musl build.
- Tuned resource-heavy tests for CI by skipping selected property/highlighter cases under `CI` while preserving local coverage and increasing Astro render test timeout.

### Fixed

- Avoided unnecessary Shiki highlighter initialization for unknown languages so fallback rendering stays fast and resilient.
- Documented the Windows + Scoop + Docker Desktop WSL2 GitLab Runner workflow, including service setup, config-path verification, token redaction, log interpretation, and pnpm cache pitfalls.

## [0.18.0] - 2026-04-27

### Added

- Added the new `Documentar una API como parte del producto` lesson under `software-libraries/api-design`, covering documentation as part of the public contract: observable behavior, examples, migration, maintainability, inclusive language, and real reading workflows.

### Changed

- Completed the Unit 1 API design sequence so it now progresses through API fundamentals, compatible evolution, and documentation as a dedicated third lesson.
- Updated course structure, generated lesson metadata, bibliography references/usages, and traceability notes so navigation and reference data include the new documentation lesson.

### Fixed

- Added render coverage for the API documentation lesson to guard the page title, canonical route, and core thesis.

## [0.17.0] - 2026-04-20

### Changed

- Refined Unit 1 landing page (`software-libraries/index.astro`) to improve editorial clarity and conceptual density:
  - Condensed redundant descriptions of "interfaz pública" and "contrato de uso" to avoid overlap between abstract, map, and conclusions sections.
  - Added explicit thesis: "the definition of library conditions its design" to strengthen the unit's pedagogical core.
  - Emphasized "designed for use by third parties" as a central criterion shaping the entire unit's progression.
  - Reorganized map section to eliminate conceptual solapement between blocks.
  - Reframed first learning axis from "Taxonomía de artefactos" to "Distinguir tipos de artefacto y sus relaciones de uso" for clearer user-oriented framing.
  - Focused conclusions and closing-reflection blocks on distinct functions: conclusions fix what is learned; reflection opens the next question.
- Reorganized legacy lessons from `software-libraries/` to a new `notes/deprecated/` directory:
  - Moved `build-systems`, `business-vs-app`, `design-principles`, `domain-models`, and `task-automation` lessons and their sub-lessons.
  - This preserves historical content while clarifying current Unit 1 focus and course sequencing.
- Updated course syllabus draft and generated lesson metadata to reflect reorganized course structure and refined Unit 1 introduction.
- Added traceability log entry documenting the introductory summary lesson for Unit 1 as part of the editorial refinement workflow.

## [0.16.0] - 2026-04-08

### Added

- Added the new `Evolucionar una API sin romper compatibilidad` lesson under `software-libraries/api-design`, expanding the API design sequence with lifecycle, compatibility, deprecation, versioning, regression testing, and curated bibliography guidance.
- Added dedicated tests for Kotlin code block rendering and definition callout behavior, plus expanded coverage for lesson-catalog trail and navigation behavior.

### Changed

- Moved scripting lesson routes from `notes/software-libraries/scripting/*` to `notes/scripting/*`, and added automatic legacy redirects so existing links continue resolving to the new paths.
- Consolidated lesson-route canonicalization into `LessonHref` and delegated adjacent-lesson resolution to the lesson catalog port so auto-navigation uses a single semantic route-normalization path.
- Updated Unit 1 structure, bibliography usages, and generated lesson metadata to include the new API evolution lesson and keep navigation/reference data aligned.

### Fixed

- Fixed bibliography/reference rendering edge cases around slot-driven descriptions and fallback content handling in reference components and related tests.
- Fixed navigation and metadata test expectations after the scripting-route move and route-normalization refactor, reducing brittle assumptions in render and unit suites.

## [0.15.0] - 2026-04-07

### Added

- Added the new `Diseñar la API de una biblioteca desde el dominio` lesson under `software-libraries`, extending Unit 1 with an introductory discussion of domain modeling, encapsulation, minimality, and consumer-focused API design.
- Added a modular bibliography catalog workflow based on Turtle source fragments, generated catalog artifacts, lesson-level reference usages, and supporting scripts/tests for catalog assembly and validation.
- Added new course-structure test coverage and a dedicated `LessonTreeBuilder`, together with broader render coverage for references, layout navigation, inline code, and shared UI primitives.

### Changed

- Refactored the internal course-structure authoring model into composable modules and builders while preserving the public `src/data/course-structure.ts` facade used by navigation and lesson metadata consumers.
- Reworked bibliography authoring and rendering so lessons resolve recommended references from the centralized catalog, with clearer source separation across persons, organizations, works, references, and usages.
- Renamed the Kotlin inline code component to `KotlinInline`, refreshed related exports/usages, and updated several lesson pages, tests, and project docs to match the current Unit 1 structure and bibliography workflow.

### Fixed

- Fixed catalog integrity and rendering issues that prevented lesson bibliography descriptions and usages from appearing correctly when generated data or `schema:isPartOf` relationships were incomplete.
- Fixed Astro render expectations around page-range normalization, current navigation order, and reference fallback handling so the test suite reflects the current content model more reliably.

## [0.14.0] - 2026-03-31

### Added

- Added the new `Taxonomía básica de artefactos de software` lesson and reordered Unit 1 so the course now introduces the artifact map before focusing on libraries as a specific artifact type.
- Added new lesson content and comparative material across the scripting block, including Nushell-focused lessons, richer structured-output content, and the `Git Submodules` lab.
- Added a centralized bibliography catalog workflow with catalog-backed lesson references, richer reference renderers, and supporting tests for books, webpages, articles, theses, and videos.
- Added layered navigation/catalog foundations, Astro render test helpers, and new reusable typography primitives that strengthen the project’s content and UI authoring surface.

### Changed

- Reworked `software-libraries` lesson sequencing and framing, including the taxonomy lesson, `what-is`, and several scripting/build-related pages, so the unit progresses more coherently from artifact taxonomy to automation and library design.
- Modernized the editorial and technical workflow around bibliography generation, lesson metadata, Astro render testing, architecture documentation, and agent-facing project guidance.
- Expanded and normalized the icon system and its generation pipeline so the project now ships a much broader, more reliable icon set without requiring ad hoc per-file handling.

### Fixed

- Fixed bibliography rendering edge cases across catalog-backed and JSON-LD-backed references, including fallback titles, page-range normalization, description overrides, and safe handling of malformed `pending-revision` entries.
- Fixed navigation and test reliability issues by reducing flaky adapter imports, loosening overly brittle course-structure expectations, and stabilizing costly Astro render tests.
- Fixed presentation issues affecting the final site, including font-loading behavior, icon color inheritance, and related rendering inconsistencies in shared UI components.

## [0.13.1] - 2026-03-26

### Added

- Added a reusable `Arrow` inline typography primitive with Astro render coverage, so lesson content can express directional notation without repeating ad hoc markup.
- Added a shared reference-entry rendering pipeline for bibliography components, together with broader render and unit coverage for slot resolution, fallback titles, and page-scoped reference lookup.
- Added repository troubleshooting guidance for the recurring Vite `fetchModule` timeout triggered when `src/styles/global.css` pulls remote fonts.

### Changed

- Refined the `pipeline-aware` lesson with clearer `ByValue` and `ByPropertyName` explanations, stronger producer examples, improved exercise framing, and more precise guidance around streaming structured objects through PowerShell pipelines.
- Simplified bibliography rendering internals so catalog-backed and JSON-LD-backed references share the same normalized content and rendering path.
- Tightened lesson and navigation domain modeling so auto-navigation and lesson identity rely on clearer value objects and fewer presentation-layer assumptions.

### Fixed

- Fixed the recurring Vite/Astro stylesheet timeout by moving remote Google Fonts loading out of `src/styles/global.css` and into document head links.
- Fixed a broad set of Phosphor SVG assets so solid circles inherit `currentColor` correctly instead of rendering without fill color.

## [0.13.0] - 2026-03-19

### Added

- Added the full Phosphor icon set to the project, together with third-party asset attribution and bundled license documentation for downstream reuse.
- Added catalog-backed bibliography entries for the Nushell structured-output lesson, including official Nushell and structured-data references with lesson-level usage metadata.
- Added a reusable `Dash` font component with Astro render tests to support command and output styling in lesson content.

### Changed

- Reworked the Nushell structured-output lesson around reusable commands, staged comparisons, and clearer progression from inspection to transformation workflows.
- Refined Shiki class transformers and their tests so highlighted code normalizes Tailwind token merging more predictably across string and array inputs.
- Updated bibliography, related-course, and CI/project documentation to match the current icon workflow, bibliography pipeline, and dependency management setup.

### Fixed

- Fixed `ReferencesFromCatalog` rendering so catalog-driven bibliography sections render safely in Astro and continue to pass `astro check` under strict typing.
- Fixed bibliography catalog normalization edge cases that affected reference rendering and generated lesson metadata for bibliography-backed lessons.

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
- Reworked the `notes/scripting/pipelines/` lesson with clearer abstract/conclusions and stronger pedagogical progression across filtering, projection, transformation, and JSON pipeline exercises.
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
- Added the new lesson `Lab. 2: Git Submodules` under `notes/scripting/pipelines/git-submodules/`.
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

- Expanded and restructured the lesson at `notes/scripting/pipelines/errors/` with clearer explanations, updated hints, and a richer exercise around `-ErrorVariable` and batch-level failure handling.
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
