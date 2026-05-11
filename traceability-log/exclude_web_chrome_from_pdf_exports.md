# [PLAN] Exclude Web Chrome from PDF Exports

### Summary

Fix PDF export rendering so generated lesson PDFs contain only the lesson document: title, metadata, and lesson body.
Global web chrome such as the site header, top navigation, course sidebar, lesson navigation controls, reading-time
widgets, and footer must be hidden from print/PDF output.

The preferred fix is contract-driven: keep rendering the normal layout where useful, but mark export-irrelevant UI with
`data-export-hidden="true"` and enforce that contract through a central print stylesheet. Only introduce a dedicated PDF
layout if the shared layout keeps leaking visible chrome or structural spacing after the targeted fix.

---

## Goals

- Keep normal web rendering unchanged.
- Keep PDF export routes deterministic and hydration-free where possible.
- Use `data-export-hidden="true"` as the single exclusion contract.
- Avoid component-specific print selectors such as `.sidebar`, `.navbar`, `.footer`, etc.
- Ensure hidden chrome does not leave visible gaps in the generated PDF.
- Extend export contract tests before or alongside implementation.

---

## Non-goals

- Do not redesign the PDF document layout in this phase.
- Do not replace the export route with a separate PDF-only layout unless the minimal fix fails.
- Do not add broad Playwright visual regression coverage yet.
- Do not hide semantic lesson metadata or lesson content.
- Do not remove chrome from the DOM unless CSS hiding is insufficient.

---

## Proposed Implementation Order

### 1. Lock the expected PDF document contract

Define the expected export boundary explicitly:

- visible in PDF:

  - lesson title;
  - lesson metadata;
  - lesson body;
  - export-specific document markers;
- hidden in PDF:

  - global header;
  - global footer;
  - top navigation;
  - course sidebar;
  - reading-time widgets;
  - previous/next lesson navigation;
  - any web-only controls or interactive affordances.

This matters because the current issue may be a mix of two failure classes:

1. some chrome is already marked but not hidden by print CSS;
2. some global chrome is not marked at all.

---

### 2. Add or extend failing export contract tests first

Prefer tests that verify the contract rather than implementation details.

Add coverage for:

- `BaseLayout.astro` marks global header/footer chrome as export-hidden when rendering a PDF export route;
- `NotesLayout.astro` continues to mark sidebar, reading-time, and lesson navigation as export-hidden;
- `LessonDocumentLayout.astro` keeps the canonical visible document boundary:

  - `data-export-role="document"`;
  - `data-export-role="metadata"`;
  - `data-export-role="body"`;
- the export route renders with `data-export-mode="pdf"` or equivalent export-mode marker.

The test should not require that chrome is removed from the HTML. The more stable contract is:

```html
<header data-export-hidden="true">
```

and then print CSS decides visibility.

---

### 3. Add the global print exclusion rule

Add a central print rule in the existing global stylesheet layer:

```css
@media print {
    [data-export-hidden="true"] {
        display: none !important;
    }
}
```

This should live in the shared stylesheet that is guaranteed to load for export routes.

Keep the selector attribute-based. That preserves a simple public contract for all components:

> “If an element must not appear in PDF output, mark it with `data-export-hidden="true"`.”

Avoid adding selectors tied to current component names, because those become brittle as the layout evolves.

---

### 4. Mark global chrome in `BaseLayout.astro`

Update `BaseLayout.astro` so global header/footer chrome is marked with `data-export-hidden="true"` when the current
render mode is PDF/export mode.

Prefer conditional marking over unconditional marking, unless the project intentionally wants browser print pages to
hide header/footer too.

Recommended shape:

```astro
<header data-export-hidden={isPdfExport ? "true" : undefined}>
    ...
</header>
```

or, if Astro attribute rendering prefers explicit spreading:

```astro
<header {...(isPdfExport ? { "data-export-hidden": "true" } : {})}>
    ...
</header>
```

The key design point is that `BaseLayout` should not need to know PDF internals beyond “this is web chrome, and export
mode hides it.”

---

### 5. Check whether hidden chrome leaves structural gaps

After applying the print rule and markers, inspect the PDF output for spacing issues.

Likely sources of residual gaps:

- grid containers that reserve columns for the sidebar;
- wrappers with `padding-top` for sticky headers;
- layout shells that remain visible even after their children are hidden;
- empty footer/header containers;
- print margins interacting with web spacing.

If needed, add a second minimal print rule for export layout containers, still using semantic export attributes where
possible.

Example direction:

```css
@media print {
    [data-export-mode="pdf"] {
        --layout-sidebar-width: 0;
    }

    [data-export-mode="pdf"] [data-export-layout="shell"] {
        display: block;
    }
}
```

Only add this if the PDF still contains layout holes. Do not pre-emptively rewrite the layout.

---

### 6. Keep `LessonDocumentLayout.astro` as the visible PDF boundary

Confirm that `LessonDocumentLayout.astro` remains the canonical document wrapper.

It should continue to expose:

```html
<article data-export-role="document">
```

with child regions such as:

```html
<section data-export-role="metadata">
<section data-export-role="body">
```

This gives future PDF tooling a stable extraction and validation surface.

---

### 7. Run focused validation

Run the targeted Astro render tests first:

```sh
pnpm exec vitest run --config vitest.astro.config.ts src/layouts/__tests__/NotesLayout.export-contract.render.test.ts src/pages/exports/pdf/notes/__tests__/path.render.test.ts
```

Then run the broader Astro test suite if the focused tests pass:

```sh
pnpm exec vitest run --config vitest.astro.config.ts
```

Finally, generate one representative PDF:

```sh
pnpm export:pdf --route /notes/software-libraries/artifacts-taxonomy/
```

Validate that the generated PDF does **not** include:

- global header;
- top navigation;
- course sidebar;
- reading-time widget;
- previous/next lesson navigation;
- global footer.

Status: implemented by marking the global header/footer in `BaseLayout.astro`, reusing the existing
`data-export-hidden="true"` contract in `NotesLayout.astro`, and adding a shared print rule in
`src/styles/global.css`.

---

## Relevant Files

- `src/layouts/BaseLayout.astro` Mark global header/footer and other site-level chrome as export-hidden.

- `src/layouts/NotesLayout.astro` Preserve or tighten existing markings for sidebar, reading-time, and lesson
  navigation.

- `src/layouts/LessonDocumentLayout.astro` Keep the visible document boundary and export roles stable.

- `src/pages/exports/pdf/notes/[...path].astro` Confirm this route activates PDF render mode consistently.

- `src/layouts/__tests__/NotesLayout.export-contract.render.test.ts` Extend contract coverage for hidden chrome and
  visible document roles.

- `src/pages/exports/pdf/notes/__tests__/path.render.test.ts` Confirm the export route still wires the PDF wrapper
  correctly.

- `src/styles/**/*` Add the central `@media print` rule for `data-export-hidden="true"`.

---

## Acceptance Criteria

The phase is complete when:

1. export route HTML still contains the lesson document with stable export roles;
2. web-only chrome is marked with `data-export-hidden="true"` in export mode;
3. print CSS hides all `data-export-hidden="true"` elements;
4. the generated PDF contains only lesson-relevant content;
5. existing web rendering remains unchanged;
6. Astro export contract tests pass;
7. a representative generated PDF no longer shows global or course navigation chrome.

---

## Decisions

- Use `data-export-hidden="true"` as the single PDF exclusion contract.
- Prefer conditional export-mode marking in `BaseLayout` to avoid changing normal browser print behaviour accidentally.
- Keep PDF-specific CSS central and attribute-driven.
- Avoid component-specific selectors unless there is no cleaner structural marker.
- Do not introduce a separate PDF-only layout yet.
- Escalate to a dedicated export layout only if hidden chrome continues to create layout gaps or if shared layout
  complexity starts leaking into PDF behaviour.
