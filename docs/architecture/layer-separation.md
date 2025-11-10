# Layered Architecture Plan for DIBS

This note captures the current analysis of the `astro-website` repo to separate business logic from UI/infra and prepare shareable libraries.

## 1. Domain map and dependency hotspots

### 1.1 Current state
- **Pages and layouts** mix orchestration and rendering (e.g., `NotesLayout.astro` resolves navigation while printing markup).
- **React/Astro components** carry UI plus rules (`LessonSidebar` persists state in `localStorage`, `ToDo` fires custom events).
- **`src/data`** stores domain data (`course-structure`, 404 messages, TODO assets) without repository boundaries.
- **`src/utils` / `src/hooks`** act as a grab bag, even for DOM-heavy helpers (`navigation.ts`, `tabs/controller.ts`, `theme.ts`), which locks logic to the browser.
- **`src/lib` and `config`** house infra (Shiki, Vite/Astro plugins) that could be split out later.

### 1.2 Key dependencies
```
courseStructure data → resolveAutoNav utils → NotesLayout → lesson pages
                      ↘ LessonSidebar/LessonTree components (UI state + persistence)
```
Other hotspots:
- **Reading Time**: `useReadingTime.ts` performs domain work but depends on DOM cloning; the widget has no adapter layer.
- **Starwind widgets**: `src/utils/tabs` manipulates `HTMLElement`, `CustomEvent`, `localStorage`.
- **404/TODO messaging**: data lives in `src/data`, logic + presentation live in components.
- **Theme**: `src/utils/theme.ts` and `src/scripts/theme-toggle.ts` mix preference rules with direct DOM access.

## 2. Key use cases (prioritized)

| Use case | Description | Impact | Priority |
| --- | --- | --- | --- |
| **Render lesson with automatic navigation** | For a given path/lesson id, produce a `NavigationPlan` (prev/next, trail) for the UI. | Drives every lesson page; today mixes layers. | **High** → **Pilot** |
| Reading time estimate | Extract relevant text, apply policies, expose minutes without touching DOM. | Shared by all lessons; depends on same layout. | Medium-high |
| Interactive widgets (tabs, tooltips, theme) | Controllers with persistence and event sync. | Used across notes; needs infra-only package. | Medium |
| Dynamic messages (404, TODO placeholders) | Select random entries, emit optional telemetry. | Smaller scope, good for later packages. | Medium-low |

**Pilot**: refactor the lesson rendering flow. Validates contracts between domain (course outline), application (navigation service) and presentation (Astro layouts/components).

## 3. Target architecture

### 3.1 Layers
1. **Domain (`packages/course-core/src/domain`)**: pure types + rules (`Lesson`, `CourseOutline`, `NavigationPlan`, `ReadingTimePolicy`, `PlaceholderMessage`). No UI/DOM/Astro deps.
2. **Application (`packages/course-core/src/application`)**: use cases (`GetLessonNavigation`, `ComputeReadingTime`, `ToggleSidebarVisibility`, `TrackPlaceholderUsage`) orchestrate repositories and policies.
3. **Infrastructure (`packages/course-core/src/infrastructure`)**: concrete adapters (e.g., `StaticCourseRepository` that reads JSON/MD, browser persistence via `localStorage`, import.meta.glob, Shiki plumbing). Split by platform when needed.
4. **Presentation (`apps/astro-site/src/presentation`)**: pages, layouts and islands. Consume only application contracts. Layouts receive view models (`LessonViewModel`, `NavigationPlanDTO`), not raw `courseStructure`.

### 3.2 Patterns and conventions
- **Lightweight CQRS**: queries (`GetNavigationPlan`, `ListCourseUnits`) separate from commands (`PersistSidebarPreference`).
- **Repositories**: `CourseRepository`, `LessonRepository`, `PlaceholderRepository`. Astro app can host concrete adapters until a CMS or external source appears.
- **Domain services**: `NavigationService`, `ReadingTimeService`, `MessagingService`. Export lean interfaces.
- **Adapters**:
  - `AstroLessonLayoutAdapter` → turns `NavigationPlan` into `previous/next/breadcrumb` props.
  - `LessonSidebarAdapter` → serializes lesson trees for the React island without touching `window`.
  - `ReadingTimeAdapter` → feeds `ReadingTimeEstimate` to the widget.
- **Folder layout**
  ```
  apps/
    astro-site/
      src/presentation/...
  packages/
    course-core/        (domain + application + minimal infra)
    course-ui/          (Astro/React wrappers built on course-core contracts)
    tooling/shiki-kit/  (shared infra such as highlighters)
  ```
  Enforce `presentation → application → domain` with `eslint-plugin-boundaries` or `dependency-cruiser`.

### 3.3 Integration contract (sample)
```ts
// @dibs/course-core
type LessonId = string;
interface LessonSummary {
  id: LessonId;
  title: string;
  href: string;
  unit: string;
  order: number;
}

interface NavigationPlan {
  trail: string[];
  previous?: LessonSummary;
  next?: LessonSummary;
}

interface NavigationService {
  plan(path: string): NavigationPlan;
}

interface ReadingTimeEstimate {
  minutes: number;
  wpm: number;
  multiplier: number;
}
```
Astro imports only these contracts; actual data (`courseStructure`) is provided by a `CourseRepository` adapter.

## 4. Metrics and gates

| Category | Metric / gate | Notes |
| --- | --- | --- |
| Architecture | `dependency-cruiser` / `eslint-boundaries`: zero cross-layer violations. | Run in CI via `pnpm depgraph`. |
|  | Track edges between layers; snapshot diff per sprint. | Measures refactor progress. |
| Quality | `pnpm test --coverage`: Domain ≥ 85%, Application ≥ 75%. | Presentation can keep manual testing. |
|  | `pnpm check` + `pnpm fmt` as pre-commit / CI gate. | `lint-staged` already runs dprint. |
| Linting | ESLint (`import/no-restricted-paths`, TS project refs) enforcing layer access. | Blocks direct `src/data` imports from UI. |
| Critical flows | Contract tests for `NavigationService` and `ReadingTimeService`. | Deterministic fixtures/text. |
| Observability | Commands (e.g., `PersistSidebarPreference`) emit events at application layer; UI only calls the command. | Removes direct `localStorage` usage in components. |

## 5. Architecture brief
1. **Principles**: pure domain code, explicit dependencies, zero `window`/`document` outside infra.
2. **Bounded contexts**:
   - `CourseExperience` (navigation, reading time, outline).
   - `InteractiveWidgets` (tabs, tooltips, theme).
   - `ThemeAndBrand` (preferences, assets).
   - `ContentInfra` (Shiki, Astro/Vite integrations).
3. **Data flow**: repository → services → adapters → UI. Components never read `src/data` directly.
4. **Observability**: instrument commands (e.g., placeholder tracking) via centralized events.
5. **CI/CD**: `pnpm fmt && pnpm check && pnpm test --coverage && pnpm depgraph`. Merge blocked on any failure.

## 6. Next steps
1. Spin up `packages/course-core` with `Lesson`, `CourseOutline`, `NavigationService`; move `course-structure` + `resolveAutoNav` behind a static repository adapter.
2. Update `NotesLayout` + `LessonSidebar` to consume `NavigationPlan` and application commands instead of touching `courseStructure` or `localStorage` directly.
3. Extract `ReadingTimeService`, add pure tests, and let the widget become a thin presenter.
4. Plan migration of Starwind widgets and theme helpers into a `course-ui` (or `interactive-widgets`) package limited to infra/UI responsibilities.

