# [DONE] Move Recommended Dedication Below the Lesson Title

## Completion Summary

Implemented the global layout change so `Dedicación recomendada` is inserted immediately below the lesson title and
before lesson metadata.

Changed:

- `LessonDocumentLayout.astro` now exposes an `after-title` slot immediately after `<h1>`.
- `NotesLayout.astro` passes the existing `ReadingTime` widget through that slot while keeping it export-hidden.
- Layout comments now document the ownership split: `NotesLayout` owns the widget; `LessonDocumentLayout` owns the
  document insertion point.
- Render tests cover the `after-title` slot and the `NotesLayout` placement/export-hidden structure.

Verification:

```bash
pnpm exec vitest run --config vitest.astro.config.ts src/layouts/__tests__/LessonDocumentLayout.render.test.ts
pnpm exec vitest run --config vitest.astro.config.ts src/layouts/__tests__/NotesLayout.render.test.ts -t "lesson metadata"
pnpm exec vitest run --config vitest.astro.config.ts src/layouts/__tests__/NotesLayout.export-contract.render.test.ts
```

Result: passed.

Note: the full `NotesLayout.render.test.ts` file still has two unrelated pre-existing failures in manual navigation
override precedence expectations.

## Summary

Reposition the `Dedicación recomendada` widget so it appears **after the lesson title** and **before lesson metadata**
on every page rendered through `NotesLayout`.

The change should be implemented as a layout composition improvement, not as a one-off fix for `tasks-as-abstractions`.

The key design decision is to keep ownership separated:

- `NotesLayout.astro` owns the decision to render `ReadingTime`.
- `LessonDocumentLayout.astro` owns only the document structure and exposes a named insertion point after the title.

Astro named slots are the right fit here because they let a parent layout pass content into a specific location of a
child component using a named `<slot />`. Astro supports named slots with `<slot name="...">` in the receiving component
and `slot="..."` on the passed element. ([docs.astro.build][1])

---

# Reubicar `Dedicación recomendada` bajo el título

## Problem

The lesson header currently renders the `Dedicación recomendada` panel before the lesson title. This makes the visual
hierarchy feel inverted:

```text
Dedicación recomendada
Título de la lección
Metadatos
Abstract
Contenido
```

The intended reading order is:

```text
Título de la lección
Dedicación recomendada
Metadatos
Abstract
Contenido
```

This should apply globally to all lessons using `NotesLayout`.

---

## Goals

1. Render the lesson title first.
2. Render `Dedicación recomendada` immediately below the title.
3. Keep lesson metadata below `Dedicación recomendada`.
4. Preserve the existing export contract.
5. Avoid moving unrelated navigation, metadata, or PDF/export logic.
6. Keep `ReadingTime` owned by `NotesLayout`, not by `LessonDocumentLayout`.

---

## Non-Goals

Do **not** change:

- the `ReadingTime` component API;
- the dedication text;
- the minute calculation;
- `timeMultiplier ?? 1.5`;
- metadata rendering semantics;
- export role attributes;
- navigation layout;
- sidebar/header/footer behaviour;
- page-specific lesson content.

---

## Implementation Changes

## 1. Add an `after-title` slot to `LessonDocumentLayout.astro`

In `LessonDocumentLayout.astro`, add a named slot immediately after the `<h1>` and before the metadata block:

```astro
<h1>{title}</h1>

<slot name="after-title" />

{metadata && (
  // existing metadata block
)}
```

Use the slot only as an insertion point. Do not import or reference `ReadingTime` here.

Recommended comment:

```astro
<!--
    Optional content rendered directly below the lesson title.
    Higher-level layouts may use this for non-document chrome such as reading time.
-->
<slot name="after-title" />
```

This keeps `LessonDocumentLayout` generic and reusable.

---

## 2. Move `ReadingTime` from above the document title into the new slot

In `NotesLayout.astro`, move the current `ReadingTime` wrapper into the `after-title` slot of `LessonDocumentLayout`.

Recommended shape:

```astro
<LessonDocumentLayout ...>
    <div slot="after-title" data-export-hidden="true">
        <ReadingTime minutes={readingTimeMinutes} timeMultiplier={timeMultiplier ?? 1.5} />
    </div>

    <slot />
</LessonDocumentLayout>
```

Adjust prop names to match the existing component implementation. The important parts are:

- keep `slot="after-title"`;
- keep `data-export-hidden="true"`;
- keep `timeMultiplier ?? 1.5`;
- keep `ReadingTime` in `NotesLayout`;
- keep default lesson body content in the default slot.

Astro requires named slot content to be passed with a matching `slot` attribute, and the corresponding child is rendered
where the receiving component declares `<slot name="after-title" />`. ([docs.astro.build][1])

---

## 3. Preserve the export contract

The `ReadingTime` wrapper must remain excluded from export output:

```astro
<div slot="after-title" data-export-hidden="true">
    ...
</div>
```

Do not add `data-export-role` to the reading-time widget.

The exportable document should remain owned by the existing document root:

```text
[data-export-role="document"]
```

Metadata should remain owned by:

```text
[data-export-role="metadata"]
```

The change is purely about visual ordering in the HTML layout.

---

## 4. Update layout comments

Update comments in both layouts to clarify ownership.

In `NotesLayout.astro`:

```text
NotesLayout provides lesson-level chrome such as recommended dedication and navigation.
The recommended dedication is inserted below the document title through LessonDocumentLayout's after-title slot.
```

In `LessonDocumentLayout.astro`:

```text
LessonDocumentLayout owns the semantic document structure.
It exposes after-title as a generic insertion point but does not decide what content belongs there.
```

---

## Expected Render Order

For lessons with metadata:

```text
1. h1 lesson title
2. Dedicación recomendada
3. Metadatos de la lección
4. Abstract
5. Lesson body
```

For lessons without metadata:

```text
1. h1 lesson title
2. Dedicación recomendada
3. Abstract
4. Lesson body
```

For PDF/export semantics:

```text
1. Exportable document root remains unique.
2. Metadata keeps its export role.
3. ReadingTime remains hidden from export.
4. Browser-only chrome stays outside the export contract.
```

---

## Tests

## 1. `LessonDocumentLayout.render.test.ts`

Add or update tests for the new layout slot.

### Test: `after-title` renders after the title

Assert that custom slotted content appears after the `<h1>`.

Example expectation:

```text
Lesson title
after-title test marker
```

### Test: `after-title` renders before metadata

Use a fixture with metadata and assert textual order:

```text
Lesson title
after-title test marker
Metadatos de la lección
```

The test should verify relative order, not just presence.

Recommended helper:

```ts
function expectTextOrder(html: string, ...expectedTexts: string[]): void {
    const indexes = expectedTexts.map((text) => html.indexOf(text));

    expect(indexes).not.toContain(-1);

    for (let index = 1; index < indexes.length; index += 1) {
        expect(indexes[index]).toBeGreaterThan(indexes[index - 1]);
    }
}
```

---

## 2. `NotesLayout.render.test.ts`

Add or update a render test that uses a normal `NotesLayout` fixture.

### Test: recommended dedication appears below the lesson title

Assert order:

```text
Título de la lección
Dedicación recomendada
```

### Test: recommended dedication appears before metadata

For a lesson with metadata, assert order:

```text
Título de la lección
Dedicación recomendada
Metadatos de la lección
```

### Test: recommended dedication remains export-hidden

Assert:

```ts
const readingTimeWrapper = $("[data-export-hidden=\"true\"]").filter((_, element) =>
    $(element).text().includes("Dedicación recomendada")
);

expect(readingTimeWrapper.length).toBe(1);
```

Prefer selecting by both attribute and text so the test checks the contract that matters without overfitting to CSS
classes.

---

## 3. Export contract tests

Keep or add assertions that this refactor does not alter export semantics:

```ts
expect($("[data-export-role=\"document\"]")).toHaveLength(1);
expect($("[data-export-role=\"metadata\"]")).toHaveLength(1);
expect($("[data-export-hidden=\"true\"]").text()).toContain("Dedicación recomendada");
```

Also assert that the reading-time widget is **not** inside export-role metadata:

```ts
const metadataText = $("[data-export-role=\"metadata\"]").text();

expect(metadataText).not.toContain("Dedicación recomendada");
```

This protects the distinction between visual placement and semantic metadata.

---

## TDD Sequence

## Cycle 1 — Lock current desired order in `LessonDocumentLayout`

1. Add a failing render test for the new `after-title` slot.
2. Assert this order:

```text
h1
after-title slot content
metadata
```

3. Add `<slot name="after-title" />` after the `<h1>`.
4. Run the focused layout test.

---

## Cycle 2 — Move `ReadingTime` through `NotesLayout`

1. Add a failing `NotesLayout.render.test.ts` case for:

```text
title
Dedicación recomendada
metadata
```

2. Move the existing `ReadingTime` wrapper into `slot="after-title"`.
3. Preserve `data-export-hidden="true"`.
4. Preserve `timeMultiplier ?? 1.5`.
5. Run the focused `NotesLayout` test.

---

## Cycle 3 — Protect export semantics

1. Add or update tests for:

   - one document export role;
   - metadata export role remains unchanged;
   - `Dedicación recomendada` remains export-hidden;
   - `Dedicación recomendada` is not metadata.
2. Run the existing export-contract tests.

---

## Cycle 4 — Clean comments and run validation

1. Update layout comments.
2. Run:

```bash
pnpm test:astro -- LessonDocumentLayout
pnpm test:astro -- NotesLayout
```

3. Run the broader layout/render suite if available:

```bash
pnpm test:astro -- layout
```

---

## Definition of Done

The change is complete when:

- `LessonDocumentLayout.astro` exposes an optional `after-title` slot immediately after the `<h1>`;
- `NotesLayout.astro` passes the current `ReadingTime` widget through that slot;
- `ReadingTime` still uses the existing multiplier behaviour;
- `ReadingTime` remains marked with `data-export-hidden="true"`;
- the rendered order is title → dedication → metadata → abstract → body;
- metadata remains under `[data-export-role="metadata"]`;
- the document root remains the only `[data-export-role="document"]`;
- no navigation, export, or metadata logic is moved unnecessarily;
- tests cover both layout insertion and full `NotesLayout` rendering.

---

## Refined Assumptions

- The desired position is globally below the title and above metadata.
- The change affects every lesson that uses `NotesLayout`.
- `ReadingTime` is browser-facing lesson chrome, not exportable lesson content.
- `LessonDocumentLayout` should remain content-agnostic and should not import `ReadingTime`.
- No visual styling changes are required beyond repositioning.

[1]: https://docs.astro.build/en/basics/astro-components/?utm_source=chatgpt.com "Components - Astro Docs"
