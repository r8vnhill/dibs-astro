# Layer Separation

This note is the current-state architecture reference for the `astro-website` repo after the Phase 2 domain-isolation cycles and the Cycle 8 integration lock-in.

Older Phase 0 and Phase 1 notes remain useful as historical implementation records, but they should not be treated as the authoritative description of the current boundaries when they conflict with this document.

## Current structure

The repo now uses a layered structure inside `src/` rather than the earlier package-split sketch:

- `src/domain`
  - Owns pure lesson-navigation rules, lesson route normalization, lesson trail and adjacency semantics, reference-content resolution rules, and lesson-metadata normalization/formatting rules.
  - Contains no Astro slot I/O, generated JSON imports, zod schemas, or adapter wiring.

- `src/application`
  - Owns orchestration through service and port contracts.
  - Converts raw presentation inputs into domain-friendly values where the use-case boundary requires it.
  - Returns small DTOs to presentation-facing callers instead of leaking infrastructure records.

- `src/infrastructure/adapters`
  - Owns mapping from concrete data sources into domain-facing repository contracts.
  - `LessonCatalogAdapter` maps `courseStructure` into the lesson-navigation repository shape.
  - `LessonMetadataAdapter` maps the generated metadata dataset into the lesson-metadata repository shape.

- `src/presentation/adapters`
  - Owns local composition for UI consumers such as `NotesLayout`.
  - Bridges presentation callers to application services and returns only UI-safe serializable payloads.

- `src/layouts`, `src/components`, `src/pages`
  - Own the Astro and React rendering surface.
  - Consume presentation adapters and small UI payloads rather than domain entities or infrastructure sources directly.

## Phase 2 status

Phase 2 is no longer a “domain stub” state. The main domain seams are now present in code:

- Navigation rules are centered in `src/domain` and consumed through repository/service boundaries.
- Reference-content business rules live in `src/domain/reference-content.ts`.
- Lesson-metadata normalization, parsing, and formatting rules live in `src/domain/lesson-metadata.ts`.
- Presentation composition for lesson navigation and lesson metadata lives in:
  - `src/presentation/adapters/navigation-bridge.ts`
  - `src/presentation/adapters/lesson-metadata-bridge.ts`

At the UI boundary, `NotesLayout.astro` now resolves:

- automatic previous/next navigation through `resolveAutoNav(pathname, courseStructure)`
- lesson metadata through `resolveLessonMetadata(pathname)`

Cycle 8 locked these paths with the existing high-value suites instead of introducing a separate integration harness:

- `src/layouts/__tests__/NotesLayout.render.test.ts`
- `src/presentation/adapters/__tests__/navigation-bridge.test.ts`
- `src/presentation/adapters/__tests__/lesson-metadata-bridge.test.ts`
- reference render suites under `src/components/ui/references/__tests__`

## Dependency flow

The intended dependency direction is:

```text
Presentation -> Application -> Domain
Infrastructure -> Domain/Application contracts
```

In practical terms:

- presentation code should not reach into infrastructure adapters directly unless it is itself the local composition root
- application code should not depend on Astro, React, slots, generated JSON modules, or zod validation concerns
- domain code should remain framework-free and I/O-free

## Boundary checker

Cycle 1 of the layer-separation hardening work added an executable boundary checker:

```bash
node scripts/check-layer-boundaries.mjs
```

The checker currently scans `.ts`, `.tsx`, and `.astro` files under `src/`. Astro support is intentionally narrow: only frontmatter imports are inspected, which covers the architectural imports used by layouts and components without treating the checker as an Astro compiler.

The Cycle 1 checker enforces two initial rules:

- `src/domain/**` must not import outward into `src/application/**`, `src/infrastructure/**`, or `src/presentation/**`, and must not import `astro`, `react`, or `zod`.
- UI surfaces under `src/components/**`, `src/layouts/**`, and `src/pages/**` must not import `src/infrastructure/**` directly.

The checker resolves project aliases from `tsconfig.json` through `get-tsconfig`, normalizes relative paths, extracts imports and re-exports through `es-module-lexer` with a TSX fallback, and matches rules through `picomatch`.

This command is not yet wired into `pnpm check`; that integration belongs to a later hardening cycle after the full layer rule matrix and exception policy are in place.

Cycle 2 Step 1 locked the existing checker behaviour with this focused gate:

```bash
node ./node_modules/vitest/vitest.mjs run scripts/__tests__/layer-boundary-paths.test.ts scripts/__tests__/layer-boundary-imports.test.ts scripts/__tests__/layer-boundary-checker.test.ts
```

As of 2026-04-25, that baseline passes with 3 checker-specific test files and 30 tests. Use this direct Vitest invocation for Cycle 2 checker work until later workflow integration adds a package script.

Cycle 2 Step 2 added pure classification helpers in `scripts/lib/layer-boundary-classification.mjs`.
They classify source paths, resolved project targets, bare package imports, and import records into the normalized layer
vocabulary needed by the future rule matrix. This step is intentionally additive: the checker still enforces only the
Cycle 1 starter rules until the later rule-matrix and evaluator steps wire the classifiers into rule evaluation.

The Step 2 focused gate is:

```bash
node ./node_modules/vitest/vitest.mjs run scripts/__tests__/layer-boundary-classification.test.ts scripts/__tests__/layer-boundary-paths.test.ts scripts/__tests__/layer-boundary-imports.test.ts scripts/__tests__/layer-boundary-checker.test.ts
```

As of 2026-04-25, that gate passes with 4 checker-specific test files and 75 tests.

## Presentation boundaries

The main presentation-facing contracts locked in during this phase are:

- `resolveAutoNav(pathname, lessons)`
  - returns only `{ previous?, next? }`
  - each link is `{ title, href }`
  - does not expose slugs, lesson entities, or infrastructure-specific records

- `resolveLessonMetadata(pathname)`
  - returns DTO-shaped serializable metadata only
  - does not expose infrastructure-only fields such as `sourceFile`

`NotesLayout.astro` currently renders previous/next navigation through this presentation boundary. It does not currently render breadcrumb or trail UI as part of this flow, so breadcrumb behavior is not a locked presentation contract at this time.

## Intentional exceptions

Some transitional or infrastructure-support files still exist by design:

- `src/utils/lesson-metadata.ts`
  - remains an infrastructure support module
  - owns generated JSON loading, zod validation, dataset caching, and lookup support
  - should not be treated as a general shared utility for business rules

- `src/components/ui/references/reference-content.ts`
  - is now an Astro/UI adapter module
  - owns slot reading, slot preparation, and UI-facing error translation
  - pure precedence and content-resolution rules belong in `src/domain/reference-content.ts`

- `src/utils/navigation.ts`
  - remains a small normalization helper surface for presentation payload shaping
  - no longer owns automatic navigation resolution

## Documentation status

Use this file as the current architecture summary.

Treat these files as historical implementation records unless explicitly updated for current-state accuracy:

- `docs/architecture/PHASE-1-CHECKLIST.md`
- `docs/architecture/PHASE-1-TREE.md`
- `docs/architecture/PHASE-1-RESUMEN.md`
- `docs/architecture/Phase-1-summary.md`

Those notes document the Phase 1 rollout and still contain references to earlier transitional states such as “Domain stub” or “NotesLayout integration pending.” When that historical framing conflicts with the current codebase, the current code and this note take precedence.
