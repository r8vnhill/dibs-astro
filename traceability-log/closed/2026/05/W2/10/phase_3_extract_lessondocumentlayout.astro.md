# [DONE] Phase 3 — Extract `LessonDocumentLayout.astro`

## Summary

Extract the reusable lesson document composition from `NotesLayout.astro` into a new internal layout component,
`LessonDocumentLayout.astro`.

This phase creates a stable document boundary that later export routes can reuse, while preserving the current
browser-facing lesson behaviour. `NotesLayout.astro` remains the page shell: it resolves route-aware data, composes
`BaseLayout`, renders web-only chrome, and delegates the document body to `LessonDocumentLayout`.

Chosen defaults:

```text
- `LessonRepoPanel` stays inside `LessonDocumentLayout`.
- Phase 3 includes a document-specific props/view-model split.
- `NotesLayout` remains the only layout used directly by existing lesson pages.
- No lesson authoring syntax changes are required.
```

## Goals

- Extract document composition from the browser shell.
- Preserve the Phase 1 `data-export-*` selector contract.
- Introduce a document-only props contract with already-shaped data.
- Keep route resolution, navigation resolution, page metadata construction, and sidebar data in `NotesLayout`.
- Preserve current visual output and navigation behaviour.
- Prepare for later export routes without adding export routes yet.

## Non-Goals

Do **not** add any of the following in Phase 3:

```text
- export routes;
- export mode;
- print CSS;
- Playwright/Puppeteer;
- PDF generation scripts;
- tab expansion behaviour;
- manifest adapters;
- package API changes;
- changes to lesson authoring syntax;
- broad visual redesign;
- changes to current navigation semantics.
```

## Key Changes

### 1. Introduce a document-facing prop contract

Add:

```text
src/layouts/LessonDocumentLayout.props.ts
```

Use a document-only interface that receives already-shaped rendering data.

Suggested shape:

```ts
export interface LessonDocumentLayoutProps {
    readonly title: string;
    readonly metadata?: LessonDocumentMetadataViewModel;
    readonly repo?: LessonDocumentRepoViewModel;
}

export interface LessonDocumentMetadataViewModel {
    readonly title?: string;
    readonly description?: string;
    readonly authors?: readonly string[];
    readonly publishedAt?: string;
    readonly updatedAt?: string;
    readonly readingTime?: never;
    readonly sourceFile?: never;
}

export interface LessonDocumentRepoViewModel {
    readonly repositoryUrl?: string;
    readonly sourceUrl?: string;
    readonly editUrl?: string;
}
```

The exact fields should follow the existing `LessonMetaPanel` and `LessonRepoPanel` APIs, but the important rule is:

```text
`LessonDocumentLayout` receives display-ready data.
It does not resolve route metadata, course structure, navigation, or page context.
```

Do not include browser-shell concerns:

```text
- sidebar lessons;
- reading-time multiplier;
- previous/next navigation inputs;
- pathname;
- current route;
- course tree;
- auto-navigation resolution details;
- page `<head>` metadata;
- layout-wide SEO/social metadata.
```

### 2. Add `LessonDocumentLayout.astro`

Create:

```text
src/layouts/LessonDocumentLayout.astro
```

Responsibilities:

```text
- render `<article data-export-role="document">`;
- render the lesson title;
- render optional metadata through `data-export-role="metadata"`;
- render `LessonRepoPanel` when repo data is provided;
- render `<div data-export-role="body">`;
- render the abstract slot before the default slot;
- preserve the existing abstract fallback;
- mark unresolved fallback/client-only content with `data-export-finding="client-only"`;
- render default lesson body content.
```

Suggested conceptual structure:

```astro
---
import LessonMetaPanel from "../components/lesson/LessonMetaPanel.astro";
import LessonRepoPanel from "../components/lesson/LessonRepoPanel.astro";
import type { LessonDocumentLayoutProps } from "./LessonDocumentLayout.props";

const { title, metadata, repo } = Astro.props satisfies LessonDocumentLayoutProps;
---

<article data-export-role="document">
    <header>
        <h1>{title}</h1>

        {
            metadata && (
                <section data-export-role="metadata">
                    <LessonMetaPanel {...metadata} />
                </section>
            )
        }

        {repo && <LessonRepoPanel {...repo} />}
    </header>

    <div data-export-role="body">
        <slot name="abstract">
            <div data-export-finding="client-only">
                <!-- existing fallback content -->
            </div>
        </slot>

        <slot />
    </div>
</article>
```

Do not treat this snippet as final markup. Preserve existing classes and DOM structure where needed to avoid visual
changes.

### 3. Keep `NotesLayout.astro` as the browser shell

After extraction, `NotesLayout.astro` should own:

```text
- `BaseLayout`;
- page metadata construction;
- route-aware lesson metadata lookup;
- course sidebar data;
- reading-time widget;
- previous/next navigation;
- route-based auto-navigation;
- partial manual override semantics;
- web-only chrome placement.
```

`NotesLayout.astro` should build an internal document view model and pass it to `LessonDocumentLayout`.

Suggested shape:

```astro
---
import LessonDocumentLayout from "./LessonDocumentLayout.astro";
import type { LessonDocumentLayoutProps } from "./LessonDocumentLayout.props";

const documentProps: LessonDocumentLayoutProps = {
    title,
    metadata: resolvedMetadata,
    repo: resolvedRepo,
};
---

<BaseLayout {...pageMeta}>
    <aside data-export-hidden="true">
        <!-- sidebar -->
    </aside>

    <LessonDocumentLayout {...documentProps}>
        <slot name="abstract" slot="abstract" />
        <slot />
    </LessonDocumentLayout>

    <nav data-export-hidden="true">
        <!-- previous / next -->
    </nav>
</BaseLayout>
```

The exact Astro slot forwarding may need to follow the repository’s existing slot patterns, but the intent is:

```text
NotesLayout forwards authored content.
LessonDocumentLayout owns document composition.
NotesLayout owns browser shell composition.
```

### 4. Preserve the Phase 1 selector contract

Do not rename or relocate selectors unless tests prove an equivalent or safer contract.

Required invariants:

```text
- exactly one `[data-export-role="document"]`;
- exactly one `[data-export-role="body"]`;
- metadata, when present, appears under `[data-export-role="metadata"]`;
- web-only chrome remains outside `[data-export-role="body"]`;
- unresolved abstract fallback remains discoverable through `[data-export-finding="client-only"]`.
```

### 5. Keep `LessonRepoPanel` inside the document layout

This phase chooses that repo links are document content.

Make the decision explicit in tests:

```text
- when repo data is provided, the repo panel appears inside `[data-export-role="document"]`;
- the repo panel does not appear inside `[data-export-hidden="true"]`;
- omitting repo data still renders the document and body contract.
```

This is important because the baseline plan lists repo links as a content-policy decision. Since Phase 3 chooses to
include them, tests should lock that assumption for now.

## Public Interfaces / Types

Add one internal layout contract:

```text
LessonDocumentLayoutProps
```

Keep `NotesLayoutProps` as the author-facing/page-facing API.

No changes to:

```text
- route APIs;
- CLI options;
- manifest formats;
- package APIs;
- lesson frontmatter shape;
- authoring syntax.
```

The extracted layout is internal to the app. It is **not** a new package boundary.

## Implementation Order

```text
1. Add failing render tests for `LessonDocumentLayout` using a small harness.
2. Create `LessonDocumentLayout.props.ts`.
3. Create `LessonDocumentLayout.astro` with minimal copied composition.
4. Move the document root/body/metadata selector ownership into `LessonDocumentLayout`.
5. Update `NotesLayout.astro` to compose `LessonDocumentLayout`.
6. Preserve existing web-only regions in `NotesLayout`.
7. Update existing `NotesLayout` tests only where setup changed.
8. Run targeted layout tests.
9. Run the broader Astro render test suite.
```

This keeps the refactor TDD-friendly: first lock the extracted component contract, then make `NotesLayout` delegate to
it.

## Test Plan

### `LessonDocumentLayout` render tests

Add:

```text
src/layouts/__tests__/LessonDocumentLayout.test.ts
```

Cover:

```text
- renders exactly one `[data-export-role="document"]`;
- renders exactly one `[data-export-role="body"]`;
- renders the title inside the document root;
- renders abstract slot content before default slot content;
- renders abstract fallback when no abstract slot is provided;
- marks abstract fallback with `data-export-finding="client-only"`;
- renders metadata under `[data-export-role="metadata"]` when metadata is provided;
- omits metadata region when metadata is absent;
- renders repo panel inside `[data-export-role="document"]` when repo data is provided;
- omits repo panel when repo data is absent.
```

### `NotesLayout` integration tests

Update or add tests proving:

```text
- `NotesLayout` still renders one document root through `LessonDocumentLayout`;
- `NotesLayout` still renders one body region;
- sidebar is outside `[data-export-role="document"]` or marked with `data-export-hidden="true"`;
- reading-time region is outside `[data-export-role="body"]` and marked with `data-export-hidden="true"`;
- previous/next navigation is outside `[data-export-role="body"]` and marked with `data-export-hidden="true"`;
- current manual/automatic navigation semantics are preserved;
- existing export-contract tests still pass.
```

### Regression tests for visual structure

Avoid snapshot-heavy tests. Prefer structural assertions:

```text
- title exists once;
- abstract precedes body;
- metadata appears only when provided;
- sourceFile does not leak into rendered metadata;
- document selectors have stable counts.
```

Use snapshots only if the repository already uses them for Astro layout contracts and the output is small.

## Verification

Preferred targeted run:

```bash
pnpm test:astro -- src/layouts/__tests__/LessonDocumentLayout.test.ts src/layouts/__tests__/NotesLayout.export-contract.test.ts
```

Then run the broader suite:

```bash
pnpm test:astro
```

If the current test runner does not support path filtering with that syntax, use the existing targeted Vitest/Astro
convention.

## Assumptions

```text
- `LessonRepoPanel` is document content for now.
- The extracted layout remains internal to the app.
- `NotesLayout` still resolves data in this phase.
- Current lesson pages continue importing/using `NotesLayout`.
- No visual redesign is intended.
- Selector additions and component extraction should preserve user-facing behaviour.
- Known unrelated baseline test issues are documented but not fixed in this phase unless they block the extraction.
```

## Exit Criteria

Phase 3 is complete when:

```text
- `LessonDocumentLayout.astro` exists and owns the document root/body/metadata composition.
- `LessonDocumentLayoutProps` contains only document-facing display data.
- `NotesLayout.astro` composes `LessonDocumentLayout` and keeps browser-shell concerns.
- Existing lesson pages require no authoring changes.
- `LessonRepoPanel` renders inside the document layout when repo data is provided.
- Sidebar, reading time, and previous/next navigation remain web-shell concerns.
- Phase 1 selector contract remains valid.
- Targeted Astro render tests pass.
- Broader `pnpm test:astro` passes or only known unrelated baseline issues remain.
- No export routes, print CSS, tab export mode, Playwright, or PDF scripts are introduced.
```

## Implementation Status

Implemented.

Changes made:

```text
- Added `src/layouts/LessonDocumentLayout.astro`.
- Added `src/layouts/LessonDocumentLayout.props.ts`.
- Refactored `src/layouts/NotesLayout.astro` so it composes `LessonDocumentLayout` and keeps browser-shell concerns.
- Added `src/layouts/__tests__/LessonDocumentLayout.render.test.ts`.
- Extended `src/layouts/__tests__/NotesLayout.export-contract.render.test.ts` to lock the repo-panel placement.
```

Implemented behavior:

```text
- The extracted layout now owns the lesson title, metadata, repo panel, abstract fallback, and body markers.
- `NotesLayout` still owns `BaseLayout`, sidebar, reading time, route-aware metadata lookup, and previous/next navigation.
- `LessonRepoPanel` is now explicitly locked as part of the document contract.
- The Phase 1 `data-export-*` contract remains intact after the extraction.
```

Verification:

```bash
node ./node_modules/vitest/vitest.mjs run --config vitest.astro.config.ts src/layouts/__tests__/LessonDocumentLayout.render.test.ts src/layouts/__tests__/NotesLayout.export-contract.render.test.ts
```

Broader verification:

```bash
pnpm test:astro
```

Expected note:

```text
- The pre-existing `NotesLayout.render.test.ts` manual-navigation precedence failures remain outside this phase unless resolved separately.
```
