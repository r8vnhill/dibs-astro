# [DONE] Phase 4 — Make Lesson Components Export-Aware

## Summary

Introduce an explicit lesson render mode so shared lesson components can produce deterministic, hydration-free HTML for
future PDF generation while preserving current `/notes/**` web rendering.

This phase prepares the component tree for export routes, but it does **not** add export routes, browser automation, or
PDF generation. Those remain later phases.

The key design change is to avoid treating export as a scattered boolean concern. Use one typed render-mode boundary and
one shared read helper. Astro’s `Astro.locals` is appropriate as a request/render-context read point for deeply nested
`.astro` components because Astro documents it as request-lifecycle data available to components.
([Astro Documentation][1])

---

## Goals

- Keep normal lesson pages visually and behaviourally unchanged.
- Add a deterministic PDF/export render path for lesson content.
- Remove hydration-only or browser-only behaviour from export HTML.
- Preserve semantic document structure for later Playwright/PDF selectors.
- Make export behaviour testable through Astro render tests before adding PDF generation.
- Keep public component imports compatible by making new props optional.

## Non-Goals

- Do not add `/export/**`, `/pdf/**`, or similar routes in this phase.
- Do not add Playwright PDF generation yet.
- Do not introduce server-computed reading time yet.
- Do not move lesson navigation, sidebar, or page chrome into `LessonDocumentLayout`.
- Do not change existing web-mode tabs, code blocks, or ToDo behaviour.
- Do not edit the changelog in this phase.

---

## Core Design Decisions

### 1. Prefer a render-mode type over a raw boolean

Instead of making `exportMode?: boolean` the main contract, define a narrow internal type:

```ts
export type LessonRenderMode = "web" | "pdf";
```

Then expose either:

```ts
exportMode?: boolean;
```

only as a compatibility-facing prop, or preferably:

```ts
renderMode?: LessonRenderMode;
```

Recommended contract:

```ts
export interface LessonExportContext {
    readonly renderMode: LessonRenderMode;
    readonly isPdfExport: boolean;
}
```

This keeps Phase 4 simple but avoids hard-coding a boolean abstraction that may become awkward once there are print
previews, EPUB exports, static handouts, or multiple PDF profiles.

### 2. Use one shared export-context helper

Add a small presentation-layer helper, for example:

```ts
src/lib/presentation/export-mode.ts
```

Responsibilities:

- Read explicit component props when available.
- Fall back to `Astro.locals.lessonExportMode`.
- Default to web mode.
- Return a normalized `LessonExportContext`.
- Expose helper functions for common attributes.

Example API shape:

```ts
export function resolveLessonExportContext(input: {
    readonly propMode?: LessonRenderMode;
    readonly exportMode?: boolean;
    readonly locals?: App.Locals;
}): LessonExportContext;
```

Precedence:

1. Explicit component prop.
2. `Astro.locals.lessonExportMode`.
3. `"web"`.

This gives tests a clean prop-based seam while still allowing future export routes or middleware to set request-scoped
mode. Astro’s middleware and locals model is designed for injecting render-time behaviours and request-specific data.
([Astro Documentation][2])

### 3. Export mode must not fake interactive semantics

For tabs, export mode should not render “all panels visible” while keeping tablist/tab ARIA semantics. The ARIA tabs
pattern describes tabs as layered sections where one panel is shown through its associated tab, so export mode should
degrade to static document sections rather than an interactive tab widget. ([W3C][3])

### 4. Export mode must be hydration-free

Do not hydrate React islands or interactive scripts in export mode. Astro hydration is explicitly controlled through
client directives, so export branches should avoid rendering client-hydrated components such as `ToDo` and `CopyButton`.
([Astro Documentation][4])

### 5. Print styling should be additive and scoped

Add print-focused styles only behind export markers or print media. Use `print-color-adjust: exact` where preserving
highlighted code colours matters, because the property tells the user agent how much it may adjust colours for output.
([MDN Web Docs][5])

---

# Implementation Plan

## Step 1 — Lock existing web behaviour first

Before changing implementation, add or verify web-mode render tests for the components that will branch.

Target files:

- `LessonDocumentLayout.render.test.ts`
- `Tabs.render.test.ts`
- `CodeLayout.render.test.ts`
- ToDo or placeholder render tests, depending on current structure.

Assertions:

- Web mode remains the default.
- Existing props continue to work.
- Tabs still render interactive controls.
- Inactive tab panels remain hidden by default.
- Tab initialization script is still present in web mode.
- Code blocks still render copy controls and both theme variants.
- React/client-only placeholders still behave as they currently do.

This gives the refactor a regression harness before adding export branches.

---

## Step 2 — Add the export context helper

Create a presentation helper, for example:

```text
src/lib/presentation/export-mode.ts
```

Suggested exports:

```ts
export type LessonRenderMode = "web" | "pdf";

export interface LessonExportContext {
    readonly renderMode: LessonRenderMode;
    readonly isPdfExport: boolean;
}

export function resolveLessonExportContext(input: {
    readonly renderMode?: LessonRenderMode;
    readonly exportMode?: boolean;
    readonly locals?: App.Locals;
}): LessonExportContext;

export function getLessonExportRootAttributes(
    context: LessonExportContext,
): Record<string, string | undefined>;
```

Rules:

- `renderMode` wins over `exportMode`.
- `exportMode: true` maps to `"pdf"`.
- Missing values map to `"web"`.
- Unknown local values should fail closed to `"web"` unless the project already prefers strict runtime validation.
- Keep the helper pure and directly unit-testable.

Add tests for:

- default web mode;
- explicit `"web"`;
- explicit `"pdf"`;
- legacy `exportMode: true`;
- prop precedence over locals;
- invalid/unknown locals do not accidentally enable export mode.

---

## Step 3 — Wire `LessonDocumentLayout`

Update `LessonDocumentLayout` to accept an optional mode prop.

Recommended prop:

```ts
renderMode?: LessonRenderMode;
```

Compatibility prop, only if needed:

```ts
exportMode?: boolean;
```

Behaviour:

- Resolve the export context once at the top of the layout.
- Add document-level export markers only in PDF mode.
- Keep existing export roles.

In PDF mode, the document root should include:

```html
data-export-mode="pdf" data-export-role="document"
```

Preserve existing internal markers:

```html
data-export-role="metadata" data-export-role="body" data-export-hidden="true" data-export-finding="..."
```

Acceptance criteria:

- Web-mode output has no new PDF marker.
- PDF mode adds `data-export-mode="pdf"` at the document root.
- Metadata and body selectors remain stable.
- No browser-only layout chrome is pulled into `LessonDocumentLayout`.

---

## Step 4 — Prepare `NotesLayout` for later route integration

Do not add export routes yet.

Only make `NotesLayout` capable of passing mode through later:

```astro
<LessonDocumentLayout renderMode={resolvedRenderMode}>
    ...
</LessonDocumentLayout>
```

For Phase 4, `resolvedRenderMode` should still default to web mode unless explicitly supplied by a test or future route.

This keeps the web site unchanged while making Phase 5 route wiring small.

---

# Component Behaviour

## Tabs

### Web mode

`Tabs.astro` keeps current interactive behaviour:

- render tab list;
- render triggers;
- hide inactive panels by default;
- keep ARIA tab semantics;
- include the tab initialization script.

### PDF export mode

`Tabs.astro` renders a static document group:

```html
<section data-export-role="tabs">
    ...
</section>
```

Rules:

- Do not initialize the tabs script.
- Do not render interactive tab controls unless there is a strong reason to keep them as hidden metadata.
- Prefer omitting `TabsList.astro` and `TabsTrigger.astro`.
- If omission is too disruptive, mark them with `data-export-hidden="true"` and hide them from export.
- Render every `TabsContent.astro` panel visibly.
- Remove `hidden`.
- Remove tab-specific interactive state such as `aria-selected`, `aria-controls`, and `tabindex` when it no longer
  describes the static output.
- Add a small static heading before each panel.
- Use an explicit label prop when available.
- Fall back to the tab `value`.
- For nested tabs, preserve deterministic heading order.

Recommended fallback heading shape:

```html
<h3 data-export-role="tabs-panel-heading">
    {label ?? value}
</h3>
```

Test cases:

- Web mode renders tablist, triggers, hidden inactive panels, and script.
- PDF mode renders all panels visibly.
- PDF mode omits or export-hides triggers.
- PDF mode does not include the initialization script.
- Nested tabs produce stable, ordered static sections.
- Panel labels fall back to `value` when no better label exists.

---

## Code Blocks

### Web mode

`CodeLayout.astro` keeps current behaviour:

- render `CopyButton`;
- render light and dark Shiki variants;
- preserve title;
- preserve source;
- preserve footer;
- preserve line highlighting;
- preserve diff styling;
- preserve normalized indentation.

### PDF export mode

`CodeLayout.astro` renders one deterministic highlighted block:

- omit `CopyButton`;
- render only the light Shiki variant;
- keep title/source/footer;
- keep line highlighting and diff styling;
- keep normalized indentation;
- add export markers where useful for PDF selectors.

Recommended marker:

```html
data-export-role="code-block"
```

Print CSS:

```css
@media print {
    [data-export-role="code-block"] {
        break-inside: avoid;
        print-color-adjust: exact;
    }
}
```

Use `break-inside: avoid` as a best-effort rule, not a guarantee. Long code blocks may still need to split across pages
later.

Test cases:

- Web mode includes `CopyButton`.
- Web mode includes both light and dark variants.
- PDF mode omits `CopyButton`.
- PDF mode renders exactly one highlighted code block.
- PDF mode preserves title/source/footer.
- PDF mode preserves line, diff, and highlight classes.

---

## Reading Time and Layout Chrome

Keep these outside the export document in Phase 4:

- `ReadingTime`;
- `LessonSidebar`;
- previous/next navigation;
- browser-only layout chrome;
- any interactive page controls not part of lesson body content.

Do not add static reading time yet.

Rationale: Phase 4 should establish deterministic lesson-body rendering first. Static reading-time computation can be
added later once the export route owns a stable content pipeline.

---

## ToDo and Client-Only Placeholders

Add a server-renderable export branch for unresolved placeholders.

Web mode:

- keep current `ToDo` island behaviour;
- keep random image behaviour;
- keep hydration as-is.

PDF export mode:

- do not render the React island;
- do not hydrate random image behaviour;
- render static Spanish text;
- mark the finding explicitly.

Suggested output:

```html
<aside data-export-finding="unresolved-todo" data-export-hidden="true">
    Contenido pendiente de completar.
</aside>
```

For client-only placeholders:

```html
<aside data-export-finding="client-only" data-export-hidden="true">
    Este contenido interactivo no se incluye en la exportación estática.
</aside>
```

Keep wording neutral and non-alarming.

Test cases:

- Web mode still renders the current island path.
- PDF mode does not include hydration directives for the placeholder.
- PDF mode includes deterministic Spanish placeholder text.
- PDF mode includes `data-export-finding="unresolved-todo"` or `data-export-finding="client-only"`.

---

# Test Plan

## Unit Tests

Add focused tests for the pure export helper:

- defaults to web mode;
- maps `exportMode: true` to PDF mode;
- accepts explicit `renderMode: "pdf"`;
- gives explicit props precedence over locals;
- ignores malformed locals safely;
- returns stable export root attributes.

## Astro Render Tests

### `LessonDocumentLayout.render.test.ts`

Add tests for:

- web mode does not add `data-export-mode="pdf"`;
- PDF mode adds document-level export marker;
- existing document/body/metadata roles remain present;
- unresolved abstract or placeholder fallback renders a static export finding;
- no React hydration is required for export-only fallbacks.

### `Tabs.render.test.ts`

Add tests for:

- web mode keeps tab list, triggers, inactive hidden panels, and script;
- PDF mode renders every panel visibly;
- PDF mode omits or hides tab controls;
- PDF mode removes interactive-only ARIA state from static panels;
- nested tabs render deterministically;
- fallback headings use tab `value`.

### `CodeLayout.render.test.ts`

Add tests for:

- web mode includes `CopyButton`;
- web mode includes light and dark variants;
- PDF mode omits `CopyButton`;
- PDF mode renders only one highlighted code block;
- title/source/footer remain visible;
- line highlighting and diff styling remain present.

## Optional Regression Tests

Add one small fixture lesson render test that combines:

- metadata;
- tabs;
- code block;
- unresolved ToDo/client-only placeholder.

This catches integration regressions without needing Playwright.

---

# Validation Commands

Run focused tests first:

```sh
pnpm test:astro
```

Then run full validation:

```sh
pnpm check
```

Keep `pnpm check` second because it may run generated-data, architecture, and broader repository checks that are not
necessary for the first feedback loop.

---

# Acceptance Criteria

Phase 4 is complete when:

- Existing `/notes/**` web pages render unchanged.
- Export mode is opt-in.
- `LessonDocumentLayout` can mark the document root with `data-export-mode="pdf"`.
- Deeply nested components can read export mode without manual prop drilling.
- Tabs render as static visible sections in PDF mode.
- Code blocks render once in PDF mode and keep useful visual metadata.
- Copy controls, tab scripts, random-image ToDo islands, and other hydration-only UI are absent from export HTML.
- Export findings are deterministic and marked with `data-export-finding`.
- Focused Astro render tests pass.
- `pnpm check` passes after focused tests pass.

---

# Risks and Mitigations

## Risk: Boolean export mode becomes too narrow

Mitigation: use `LessonRenderMode = "web" | "pdf"` internally, even if an optional `exportMode?: boolean` compatibility
prop exists temporarily.

## Risk: `Astro.locals` is hard to simulate in component tests

Mitigation: allow explicit props to override locals. Tests should prefer props. Future routes can use locals.

## Risk: Export-mode tabs keep misleading ARIA semantics

Mitigation: convert tabs into static sections in export mode and remove interactive tab state.

## Risk: Code blocks break awkwardly across pages

Mitigation: add scoped print CSS now, but defer sophisticated page-break handling to the Playwright/PDF phase.

## Risk: Export placeholders become user-visible noise

Mitigation: keep text short, Spanish, neutral, and marked with `data-export-hidden="true"` where appropriate.

---

# Deferred to Later Phases

## Phase 5 — Export Routes

- Add export-only route entry points.
- Set `Astro.locals.lessonExportMode = "pdf"` or pass `renderMode="pdf"` from the route boundary.
- Validate route naming and canonical lesson route mapping.
- Ensure `/notes/**` remains unchanged.

## Phase 6 — PDF Generation

- Add Playwright rendering.
- Wait for deterministic export selectors.
- Assert no hydration scripts are required.
- Add PDF-specific page size, margins, headers, footers, and page-break rules.
- Add snapshot or structural checks for generated PDF artifacts if practical.

[1]: https://docs.astro.build/en/reference/api-reference/?utm_source=chatgpt.com "Astro render context | Docs"
[2]: https://docs.astro.build/en/guides/middleware/?utm_source=chatgpt.com "Middleware - Astro Docs"
[3]: https://www.w3.org/WAI/ARIA/apg/patterns/tabs/?utm_source=chatgpt.com "Tabs Pattern | APG | WAI"
[4]: https://docs.astro.build/en/guides/framework-components/?utm_source=chatgpt.com "Front-end frameworks - Astro Docs"
[5]: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/print-color-adjust?utm_source=chatgpt.com "print-color-adjust CSS property - MDN Web Docs"
