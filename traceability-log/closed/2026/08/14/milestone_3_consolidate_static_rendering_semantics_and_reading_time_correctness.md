# Milestone 3 — Consolidate static rendering semantics and reading-time correctness

## Outcome

Implemented deterministic rendering and static reading-time contracts without adding client hydration. The intentional
behavior corrections are empty content-sensitive slots falling back to their props and semantic HTML units preserving
lexical separation during extraction.

## Changes

- Added a generic rendered-content classifier while preserving the reference-specific compatibility export.
- Updated `CodeLayout` title/source slots to capture once, classify once, and render the captured result; footer remains
  presence-based.
- Updated the shared references wrapper to render its already captured rich slots instead of rendering them a second
  time.
- Replaced selector-rewrite text extraction with semantic DOM traversal and an explicit readable-boundary taxonomy.
- Removed obsolete `aria-live` configuration from the static reading-time component.
- Added BDD/DDT/PBT and differential-preservation coverage for slots, semantic boundaries, whitespace, inline markup,
  exclusions, `<details>`, and static reading-time output.
- Documented the contracts in `AGENTS.md`.

## Verification

- Focused reading-time unit tests: passed.
- Focused code-layout, references, and ReadingTime Astro render tests: passed.
- `pnpm exec astro check`: passed with existing deprecation hints only.
- `pnpm build`: passed; 67 static pages and the PDF-facing routes were generated successfully.
- `git diff --check`: passed.
