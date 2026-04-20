# Phase 2: Isolate Domain Across Navigation, References, and Metadata via Short TDD Cycles

## Summary

This phase should turn the current “layer skeleton” into a real domain-centered architecture by extracting pure business rules from `utils`, `infrastructure`, and component helpers into `src/domain`, then pushing all framework- or data-source-specific concerns back out behind ports/adapters.

The repo is not starting from zero: `src/domain` already has `Lesson`-related entities/value objects, while pure logic is still spread across `src/utils/navigation.ts`, `src/infrastructure/adapters/LessonCatalogAdapter.ts`, `src/components/ui/references/reference-content.ts`, and `src/utils/lesson-metadata.ts`. The plan below assumes a whole-repo sweep, but it keeps the implementation incremental by subdomain and in short, reversible TDD cycles.

## Target Domain Boundaries

- **Lesson / navigation domain**
  - Own lesson identity, canonical href normalization, ancestry/trail semantics, adjacency rules, and lesson lookup semantics.
  - Stop duplicating navigation/path logic in `utils`, `application`, and `infrastructure`.

- **Reference presentation-rule domain**
  - Own the pure rules for slot/content resolution, meaningful-text detection, fallback precedence, and “missing title” validity.
  - Keep Astro slot I/O and HTML rendering outside the domain boundary.

- **Lesson metadata domain**
  - Own normalized lesson-path semantics, ISO-short-date parsing/formatting policy, and lookup invariants.
  - Keep JSON loading, zod parsing, and generated-artifact access outside the domain when possible.

## Public Interfaces / Type Changes

- Add domain-level value objects and entities for the business rules currently expressed as raw strings:
  - lesson route / pathname normalization
  - breadcrumb or trail node semantics
  - reference text fields / optional slot resolution outcomes
  - lesson metadata dates / metadata lookup keys

- Introduce explicit repository/service interfaces in Domain, without concrete implementations:
  - lesson catalog repository
  - lesson metadata repository
  - reference slot/content policy service if needed

- Update Application ports so they depend on domain interfaces and domain result types rather than infrastructure-shaped records.
  - `ILessonCatalog` and related navigation contracts should become domain-first, not adapter-first.
  - Presentation adapters should map domain results into UI-safe DTOs.

- Remove or reduce duplicated pure helpers in `src/utils` once their rules move into Domain.
  - `utils` should only keep cross-cutting glue that is not domain logic.

## Short TDD Cycles

1. ~~**Cycle 1: Canonical lesson route value object**~~
   - Write domain tests for canonical lesson path normalization:
     - trims whitespace
     - enforces leading/trailing slash
     - collapses repeated slashes
     - strips query/hash when that behavior is part of navigation lookup
   - Implement a domain value object for lesson href/path.
   - Refactor `LessonCatalogAdapter`, navigation helpers, and lesson metadata lookup to consume this value object instead of reimplementing normalization.

2. ~~**Cycle 2: Domain lesson trail and adjacency rules**~~
   - Add domain tests for:
     - adjacent lesson resolution
     - missing lesson lookup
     - ancestry/trail reconstruction
     - non-clickable structural groups vs navigable nodes
   - Move those pure rules out of `LessonCatalogAdapter` into domain services/entities.
   - Keep the adapter responsible only for mapping `courseStructure` into domain objects.

3. ~~**Cycle 3: Replace application dependence on adapter-shaped lesson data**~~
   - Add application/service tests that assert behavior using domain repository interfaces rather than concrete flattened arrays.
   - Refactor `NavigationServiceImpl` so it depends only on a domain-oriented repository/service contract.
   - Eliminate application knowledge of slug extraction or path normalization details.

4. ~~**Cycle 4: Extract reference content classification to Domain**~~
   - Add domain tests for:
     - meaningful vs empty content
     - whitespace/entity normalization
     - slot-over-prop precedence
     - linked fallback vs plain-text fallback
     - missing-title invalidity
   - Move the pure decision logic from `reference-content.ts` into a domain module free of Astro references.
   - Leave a thin adapter in the references UI layer that converts Astro slot I/O into domain inputs and renders domain outputs.

5. ~~**Cycle 5: Isolate lesson metadata rules**~~
   - Add domain tests for:
     - normalized lesson lookup keys
     - ISO short date parsing
     - invalid date passthrough policy vs formatted valid dates
     - unknown-date fallback label policy if that is truly domain-level
   - Move the pure rules from `lesson-metadata.ts` into domain types/services.
   - Keep generated JSON import and zod validation in an infrastructure-facing module.

6. ~~**Cycle 6: Introduce domain repositories and inversion points**~~
   - Define domain repository interfaces for:
     - lesson catalog access
     - lesson metadata access
   - Refactor infrastructure adapters to implement those interfaces explicitly.
   - Refactor presentation/application entrypoints to construct services via those interfaces rather than reaching into concrete modules directly.

7. ~~**Cycle 7: Remove or shrink legacy pure helpers**~~
   - Add regression tests around affected public behavior before deleting wrappers.
   - Reduce `src/utils/navigation.ts` and similar files to compatibility wrappers or remove them if all callers have migrated.
   - Ensure no framework-free business rule remains in components, layouts, or infrastructure helpers.

8. ~~**Cycle 8: Integration and architecture lock-in**~~
   - Add or update integration tests covering:
     - Notes layout navigation/breadcrumb behavior
     - reference rendering behavior after domain extraction
     - metadata lookup through the new adapter boundaries
   - Update architecture docs to describe the new domain boundaries, repository ownership, and remaining intentional exceptions.

## Test Plan

- **Domain unit tests**
  - one suite per value object/service
  - no Astro, no React, no zod, no generated JSON imports, no adapter dependencies

- **Application tests**
  - mock domain repositories/interfaces only
  - verify orchestration, not normalization internals

- **Infrastructure adapter tests**
  - verify mapping from existing datasets (`courseStructure`, generated metadata JSON, slot-like inputs) into domain types and back out into DTOs

- **Presentation/render tests**
  - confirm no UI regressions in `NotesLayout` and reference components
  - keep render tests focused on markup/contract, not business rules already covered in Domain

- **Final verification**
  - `pnpm test:unit`
  - `pnpm test:astro`
  - `pnpm exec tsc --noEmit`
  - `pnpm run check`

## Assumptions and Defaults

- This phase is a repo-wide domain isolation sweep, but it will still be executed incrementally in the order above.
- Existing generated artifacts such as `lesson-metadata.generated.json` remain in place; generation is not redesigned in this phase.
- Zod schemas and JSON imports are treated as infrastructure/application concerns, not domain concerns.
- UI labels that are purely editorial may stay outside Domain unless they affect business invariants.
- Dependency injection remains explicit and manual; no DI framework is introduced.

## Cycle 7 outcome

- `src/components/ui/references/reference-content.ts` was narrowed to Astro/UI adapter responsibilities only.
- Reference components now import pure resolution helpers directly from `src/domain`; UI-layer title error mapping remains local to the references adapter.
- `src/utils/navigation.ts` now owns only navigation payload normalization.
- `resolveAutoNav` remains exclusively at the presentation boundary in `presentation/adapters/navigation-bridge.ts` and is no longer exposed through `~/utils`.
- `src/utils/index.ts` no longer re-exports navigation or lesson-metadata helpers as shared utilities.
- `src/utils/lesson-metadata.ts` remains as infrastructure support for generated-dataset loading, validation, caching, and lookup.

## Cycle 8 outcome

- `NotesLayout.render.test.ts` now locks a real-route presentation flow with both auto-resolved `previous` and `next` links, plus a metadata-panel assertion through the layout boundary.
- Manual `previous` and `next` overrides are now explicitly covered at the render boundary so auto navigation remains an implementation detail behind the presentation adapter.
- `lesson-metadata-bridge.test.ts` now locks normalized path and full-URL inputs to the same DTO contract and asserts the bridge exposes only presentation-safe metadata fields.
- `src/components/ui/references/__tests__/reference-content.test.ts` remains focused on Astro/UI adapter responsibilities rather than duplicating lower-level domain assertions.
- `docs/architecture/layer-separation.md` is now the authoritative current-state architecture note for the post-Phase-2 boundaries; older Phase 0/1 notes are treated as historical records when they conflict with current code.
- Breadcrumb rendering remains outside the locked `NotesLayout` contract because the layout currently exposes previous/next navigation only.
