# Milestone 2 — Make lesson-reading resolution fail closed and rendering structurally typed

## Outcome

Implemented the typed lesson-reading boundary for “La biblioteca como artefacto de software”. Configured entries now
resolve completely against the generated bibliography catalog before the readings page renders. Missing and duplicate
normalized IDs produce deterministic diagnostics instead of disappearing from the HTML.

## Changes

- Added canonical `ref:` identity normalization, derived `/readings/` routing, aggregate diagnostics, and resolved
  lesson-reading models in `src/lib/readings/lesson-readings-contract.ts`.
- Replaced the readings page’s best-effort lookup with fail-closed resolution.
- Added `LessonReadingGuide.astro` and typed editorial composition through `ReferenceEntry`; guide content now uses
  semantic definition-list markup rather than interpolated HTML.
- Completed the catalog record for Ousterhout’s book with its reusable parent work so the configured reading resolves.
- Updated agent and bibliography maintainer documentation.

## Verification

- Lesson-reading contract tests: passed.
- Readings page Astro render tests: passed.
- `pnpm exec astro check`: passed with existing deprecation warnings only.
- Bibliography artifacts regenerated from Turtle sources.
