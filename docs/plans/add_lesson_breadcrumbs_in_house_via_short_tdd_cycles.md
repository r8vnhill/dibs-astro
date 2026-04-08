# Add Lesson Breadcrumbs In-House via Short TDD Cycles

## Summary

Implement lesson breadcrumbs without `astro-breadcrumbs`. The repo already has the right source of truth in `courseStructure`, flattened ancestry metadata, and the presentation adapter layer. The plan should reuse that model, avoid the package's GPL-3.0 dependency, and render a Notes-rooted breadcrumb trail on lesson pages.

Assumed UX: render `Apuntes > ...course hierarchy... > current lesson` above the lesson `<h1>`, with clickable items when an `href` exists and the current page rendered as plain text with `aria-current="page"`.

## API / Interface Changes

- Extend the lesson-catalog query surface with a breadcrumb-specific lookup. Suggested shape:
  - `ILessonCatalog.findTrailByHref(href: string): Promise<readonly TrailNode[]>`
  - `TrailNode = { title: string; href?: string }`
- Add a presentation adapter for breadcrumb resolution, separate from prev/next. Suggested shape:
  - `resolveLessonBreadcrumbs(pathname, lessons): Promise<readonly BreadcrumbItem[]>`
  - `BreadcrumbItem = { title: string; href?: string; current: boolean }`
- Keep `NavigationServiceImpl.resolveAutoNav()` unchanged for this iteration. Breadcrumbs should be
  a parallel query, not a forced refactor of the existing prev/next contract.

## TDD Cycles

1. **Catalog trail query**
   - Add failing unit tests in the catalog adapter for:
     - a middle lesson returning ordered ancestors plus current lesson
     - a top-level lesson returning only `Apuntes` + current lesson after presentation mapping
     - a route not found returning an empty trail
     - groups without `href` contributing non-clickable breadcrumb items
   - Implement `findTrailByHref()` in `LessonCatalogAdapter`.
   - Use existing tree/flatten data instead of pathname parsing. The trail should come from lesson
     ancestry, not URL segments.

2. **Presentation adapter**
   - Add failing tests for a new breadcrumb presentation adapter.
   - Map the catalog trail to UI-safe breadcrumb items and prepend a synthetic `Apuntes` root item with `/notes/`.
   - Mark only the last item as `current: true`.
   - Preserve `href` only for non-current items that are actually navigable.

3. **Breadcrumb component**
   - Add a focused Astro render test for a new breadcrumb component, for example `LessonBreadcrumbs.astro`.
   - Verify:
     - semantic `<nav aria-label="Breadcrumb">`
     - ordered list rendering
     - intermediate items render as links when `href` exists
     - non-clickable ancestors render as plain text
     - final item uses `aria-current="page"`
   - Implement the component with styling aligned to the existing lesson chrome, keeping separators decorative and out of assistive text.

4. **NotesLayout integration**
   - Add failing render tests in `NotesLayout.render.test.ts` for:
     - a real lesson route showing `Apuntes > ... > current`
     - a lesson under a group with overview page producing clickable group crumb
     - a lesson under a structural group without overview page producing plain-text intermediate crumb
   - Integrate breadcrumb resolution into `NotesLayout.astro`.
   - Render breadcrumbs above the lesson title and below the main content container start.

5. **Regression pass**
   - Run the targeted suites for:
     - catalog adapter
     - breadcrumb adapter/component
     - `NotesLayout.render.test.ts`
   - Run `pnpm exec tsc --noEmit` and `pnpm run check` to confirm the new layout wiring stays type-safe and Astro-safe.

## Implementation Notes

- Prefer a dedicated breadcrumb component over embedding markup directly in `NotesLayout`; the behavior is reusable and easier to test in isolation.
- Do not derive breadcrumbs from URL segments. The course hierarchy already encodes better editorial structure and will stay coherent if routes move again.
- Treat groups without `href` as breadcrumb text nodes, not links.
- Do not include `Inicio` in this first version; the agreed root is `Apuntes`.
- Keep the breadcrumb pipeline presentation-safe:
  - infrastructure/application can return raw trail nodes
  - presentation adapter converts them into UI items
  - layout/component only renders

## Test Plan

- `src/infrastructure/adapters/__tests__/LessonCatalogAdapter.test.ts`
  - add trail lookup cases
- new presentation-level breadcrumb adapter test
  - verify Notes-root prepend and current-item behavior
- new Astro render test for breadcrumb component
  - verify semantics and clickable/plain-text distinctions
- `src/layouts/__tests__/NotesLayout.render.test.ts`
  - verify breadcrumb integration on real lesson routes
- Final verification:
  - `pnpm exec tsc --noEmit`
  - `pnpm run check`

## Assumptions

- Breadcrumbs are only for lesson pages using `NotesLayout`.
- The trail starts at `Apuntes` and then follows `courseStructure`, not raw path segments.
- The current lesson is shown but not linked.
- No new third-party dependency will be introduced for this feature.
