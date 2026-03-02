# Phase 0 · Foundations for Layer Separation

## What Phase 0 Produced

Phase 0 established a shared baseline for the refactor: a domain-area map, evidence-backed hotspots, prioritized use cases, a target layered architecture, and measurable gates. It also narrowed the pilot scope for Phase 1 so implementation can start without waiting for all open decisions.

## 1. Current Domain Areas

### Area: Content and Navigation

- Elements: `src/data/course-structure.ts`, `src/layouts/NotesLayout.astro`, `src/components/navigation/*`, `src/utils/navigation.ts`.
- Couplings: data shape, navigation rules, and rendering concerns are co-located.
- Risk: navigation behavior changes can accidentally break UI composition and vice versa.
- Refactor direction: move navigation rules to `application`, keep static catalog access in `infrastructure`, and keep layout rendering in `presentation`.
- Boundary candidates:
  - Domain: `Lesson`, `LessonId`, `NavigationPlan`, path normalization rules.
  - Application: `resolveLessonNavigation`.
  - Infrastructure: file-backed lesson catalog adapter.
  - Presentation: layout and sidebar consumers.

### Area: Interactive UI Behavior

- Elements: `src/components/navigation/LessonTree.tsx`, `src/hooks/*`, `src/utils/tabs/*`, `src/utils/tooltip/*`.
- Couplings: UI widgets access browser APIs and persistence directly while encoding behavior rules.
- Risk: behavior is hard to test without DOM and difficult to reuse outside current widgets.
- Refactor direction: isolate browser/persistence concerns behind ports and keep UI as command/query callers.
- Boundary candidates:
  - Domain: interaction invariants (state transitions).
  - Application: widget orchestration commands/queries.
  - Infrastructure: localStorage/event adapters.
  - Presentation: components and hooks only.

### Area: Code Rendering

- Elements: `src/lib/shiki/*`, `src/components/ui/code/*`.
- Couplings: code components know highlighter details, aliases, and styling responsibilities.
- Risk: replacing Shiki or changing formatting rules requires edits across presentation.
- Refactor direction: define a highlighting port in `application/ports` and keep Shiki implementation in `infrastructure`.
- Boundary candidates:
  - Domain: code block intent and supported variants.
  - Application: formatting flow and fallback policy.
  - Infrastructure: Shiki adapter.
  - Presentation: Astro block components.

### Area: Theme and Preference Management

- Elements: `src/scripts/theme-toggle.ts`, `src/utils/theme.ts`, `src/components/ui/theme/*`.
- Couplings: theme rules and browser side effects (`window`, `document`, `localStorage`) are mixed.
- Risk: duplicate logic and inconsistent behavior between initial load and interactive updates.
- Refactor direction: expose `ThemeService` in application and move storage/media-query access to infrastructure.
- Boundary candidates:
  - Domain: theme preference model.
  - Application: preference resolution and command handling.
  - Infrastructure: media-query and storage adapters.
  - Presentation: controls and initial script adapter.

### Area: Site Metadata

- Elements: `src/utils/site.ts`, `src/components/meta/Head.astro`, `src/utils/page-meta.ts`.
- Couplings: metadata construction and content-level decisions are mixed in utility/presentation layers.
- Risk: metadata policy evolves without clear ownership.
- Refactor direction: represent metadata inputs as domain objects and construct final tags in application.
- Boundary candidates:
  - Domain: `PageMetaInput`, authorship and canonical abstractions.
  - Application: head metadata assembly.
  - Infrastructure: optional metadata sources.
  - Presentation: `<Head />` rendering only.

## 2. Hotspots (with evidence)

- `src/layouts/NotesLayout.astro`
  - Symptom: imports `courseStructure` and resolves navigation directly in the layout.
  - Layer violation cause: presentation depends on data source and navigation rule execution instead of application output.
- `src/components/navigation/LessonTree.tsx`
  - Symptom: reads/writes `localStorage` directly for expand/collapse state.
  - Layer violation cause: presentation owns persistence, which should be infrastructure behind a port.
- `src/scripts/theme-toggle.ts` and `src/utils/theme.ts`
  - Symptom: theme policy and browser effects are split across script and utility.
  - Layer violation cause: application-level policy is not separated from infrastructure side effects.
- `src/components/ui/code/DarkCode.astro` and `src/components/ui/code/LightCode.astro`
  - Symptom: components call Shiki-facing helpers directly.
  - Layer violation cause: presentation is coupled to infrastructure implementation details.

## 3. Prioritized Use Cases (with contracts)

### 3.1 Pilot: Resolve Lesson Navigation (Phase 1 scope)

- Scope for Phase 1: `previous`/`next` only.
- Out of scope for Phase 1: chips, progress tracking, TOC expansion state.
- Inputs:
  - `currentPath: string`
  - `catalog: LessonCatalog` (port)
- Outputs:
  - `NavigationPlan` with `{ previous?: LessonSummary; next?: LessonSummary }`
- Invariants/rules:
  - paths are normalized with trailing slash semantics;
  - missing path yields `{ previous: undefined, next: undefined }`;
  - container-only nodes without lesson `href` are excluded from linear navigation.
- Ports needed:
  - `LessonCatalog` (read-only lesson tree/list provider).
- What stays in presentation:
  - button rendering, aria labels, responsive layout behavior.

### 3.2 Render Themed Code Blocks

- Inputs: block payload (`code`, `language`, `variant`, optional title/footer/source).
- Outputs: semantic HTML payload for presentation blocks.
- Invariants/rules: unknown language falls back safely to plain escaped output.
- Ports needed: `HighlighterGateway`.
- What stays in presentation: block shell markup and slot rendering.

### 3.3 Manage Theme Mode

- Inputs: selected preference (`light | dark | auto`) and system preference signal.
- Outputs: effective theme and persistence command result.
- Invariants/rules: `auto` must map deterministically to current media query state.
- Ports needed: `ThemePreferenceStore`, `SystemThemeProbe`.
- What stays in presentation: switch UI and event wiring.

### 3.4 Publish Page Metadata

- Inputs: page context (route, title, description, authorship).
- Outputs: normalized head metadata DTO.
- Invariants/rules: canonical URL generation and language tag consistency.
- Ports needed: optional metadata provider.
- What stays in presentation: tag emission in `<Head />`.

## 4. Target Architecture (Phase 1-ready)

### Layer responsibilities

- `domain`: entities, value objects, pure rules, no framework or browser APIs.
- `application`: use cases, orchestration, and ports.
- `infrastructure`: concrete adapters for ports and platform concerns.
- `presentation`: Astro/React rendering and user interactions.

### Concrete file examples

- `src/domain/lesson/Lesson.ts`
- `src/domain/navigation/NavigationPlan.ts`
- `src/application/navigation/resolveLessonNavigation.ts`
- `src/application/ports/LessonCatalog.ts`
- `src/infrastructure/catalog/FileLessonCatalog.ts`
- `src/presentation/adapters/navigation.ts`

### Dependency rules and explicit exceptions

- Allowed:
  - `presentation -> application`
  - `application -> domain`
  - `application -> application/ports`
  - `infrastructure -> application/ports`
  - `infrastructure -> domain`
- Forbidden:
  - `presentation -> infrastructure`
  - `domain -> application|infrastructure|presentation`
  - `application -> presentation`
- Exception policy:
  - presentation may use domain types only when re-exported by application outputs;
  - infrastructure may depend on domain types and application ports;
  - no direct import from `src/data/*` in presentation once a corresponding port exists.

## 5. Metrics, Guardrails, and Phase 1 Success Criteria

### Baseline status

- Blocked by sandbox permissions (`EPERM`) in this environment.
- Affected commands:
  - `pnpm build` (`spawn/rename` during `generate:lesson-metadata`)
  - `pnpm test:unit` (`esbuild` spawn)

### Baseline measurement plan (despite EPERM)

- Canonical baseline environment: CI runner with full process and file permissions.
- Record baseline metadata:
  - OS name/version
  - Node.js version
  - `pnpm` version
  - Vitest version
- Re-run baseline commands in CI and store results in `reports/architecture/phase-1-baseline.md`.

### Ongoing gates

- Layer dependency gate: no forbidden imports across layers.
- Coverage gate: `>= 80%` statements in `src/application`.
- Quality gate: no recurring language-loading warnings after moving highlighting behind a port.

### Additional testing targets

- Behavior-focused tests:
  - minimum 6 application tests for navigation (first item, last item, missing path, container nodes, normalized path, duplicated slash normalization).
- PBT target:
  - at least 1 property-based test for a pure rule (navigation ordering or path normalization).

### Phase 1 success criteria (testable)

- `resolveLessonNavigation` exists under `src/application/navigation`.
- `LessonCatalog` port exists under `src/application/ports`.
- File-based adapter exists under `src/infrastructure/catalog`.
- Presentation consumes navigation via `src/presentation/adapters/navigation.ts`.
- `NotesLayout` no longer resolves navigation directly from `courseStructure`.
- Navigation use case meets coverage and minimum test-count targets.

## 6. Closure Status (2026-02-27)

- Phase 0 is completed.
- Pilot selected and scoped.
- Architecture and guardrails documented.
- Phase 1 entry criteria are now actionable.

## 7. Decisions Needed

### DR-001: Shiki theme model

- Question: per-person theme matrix vs two global themes?
- Default assumption: two global themes (`light`, `dark`).

### DR-002: Navigation progress persistence

- Question: local-only progress or remote-capable progress?
- Default assumption: local-only via infrastructure adapter.

### DR-003: Internationalization scope

- Question: add multilingual lesson metadata now or later?
- Default assumption: single language (`es`) in Phase 1.

### DR-004: Canonical source of truth for course structure

- Question: static file, generated metadata, or remote source as canonical catalog?
- Default assumption: `src/data/course-structure.ts` remains canonical through Phase 1.
