# Lesson PDF Export Phase 2 Plan

## Purpose

Plan a lesson-to-PDF export feature from the current Astro lesson implementation. This phase turns the preliminary
evidence into an implementation strategy, with explicit refactor tracks and decision points before coding begins.

The user has stated that substantial refactoring of the current webpage is acceptable when it makes the PDF export
feature cleaner.

## Current Baseline

- Lessons are Astro pages under `src/pages/notes/**/*.astro`.
- Lesson metadata is generated from git history and author configuration by `scripts/generate-lesson-metadata.mjs` and
  `src/lib/lesson-metadata/generator.js`.
- Lesson ordering and navigation are driven by `src/data/course-structure.ts`, not just the filesystem.
- Most lesson pages render through `src/layouts/NotesLayout.astro`.
- The site is configured as a static Astro build with trailing slashes in `astro.config.ts`.
- `packages/content-core`, `packages/site-core`, and `packages/shiki-core` show that the repository already accepts
  reusable workspace packages when the boundary is host-agnostic.

## Core Problem

The current web page is optimized for browser reading, not deterministic document generation.

PDF export can reuse much of the rendered lesson HTML, but some page behavior must become explicit before export can be
reliable:

- `TabsContent.astro` renders panels as `hidden` until browser JavaScript activates them.
- `ReadingTime.astro`, `LessonSidebar`, and `CodeLayout.astro` use client-side islands or buttons that are not useful in
  a PDF.
- Some pages use `client:only="react"` placeholders, which do not exist in server-rendered HTML.
- The lesson layout mixes document content with navigation chrome, sidebar state, reading-time widgets, metadata panels,
  repo panels, and prev/next navigation.

The export feature should therefore be treated as a document-rendering problem, not only as a browser automation script.

## Recommended Direction

Adopt a two-layer design:

1. Extract a reusable lesson export core package for data, route, manifest, and output-path logic.
2. Keep Astro rendering and PDF generation as site-level adapters until the rendering contract is stable.

This fits the existing package pattern: pure logic belongs in `packages/*`; Astro components, Tailwind classes, browser
automation, and site-specific routes remain in the app until they have a clear public contract.

## Target Architecture

### `packages/lesson-export-core`

Host-agnostic package. It should not import Astro, React, DOM APIs, Playwright, Puppeteer, Tailwind, or local
components.

Initial responsibilities:

- Define `LessonExportManifest`.
- Define `LessonExportEntry`.
- Normalize lesson routes and derive deterministic PDF output paths.
- Select export targets from course structure and metadata.
- Validate duplicate routes, missing titles, missing source files, and unsupported output paths.
- Provide pure helpers for export collection ordering.

Likely dependencies:

- `@ravenhill/content-core`, if route/navigation value objects are needed.
- Local TypeScript only for the first iteration, if coupling to `content-core` is unnecessary.

Not in scope:

- Rendering `.astro` components.
- Launching a browser.
- Reading from `dist/`.
- Knowing DIBS visual design.

### App-Level Export Adapter

Possible location:

- `src/infrastructure/export/lesson-export-manifest.ts`
- `src/presentation/export/lesson-export-view.ts`
- `scripts/export-lessons-pdf.mjs`

Responsibilities:

- Read the site's course structure.
- Read generated lesson metadata.
- Combine route, title, source file, authors, last modified date, and export URL.
- Emit an export manifest for all exportable lessons.
- Optionally support filters such as one lesson, one subtree, or all lessons.

### Export Layout

Introduce a document-oriented rendering path instead of forcing `NotesLayout.astro` to be both the browser layout and
the printable document layout.

Possible shape:

- `LessonDocumentLayout.astro`: title, metadata, abstract, body, references, and document footer.
- `NotesLayout.astro`: web shell that composes `LessonDocumentLayout` plus sidebar, reading time, repo panel, and
  prev/next controls.
- `LessonPrintLayout.astro` or an `exportMode` prop: only if a separate route or wrapper is needed.

Preferred implementation after refactor:

- Extract shared document composition from `NotesLayout.astro`.
- Keep browser chrome in `NotesLayout.astro`.
- Render export routes with the document composition and print CSS.

This is a larger refactor, but it avoids continuously adding "hide this in PDF" exceptions to the web layout.

## Rendering Strategy Options

### Option A: Post-Build Browser PDF From Normal Lesson Routes

Use the production `dist/notes/**/index.html` output and generate PDFs by visiting each page with a browser automation
tool.

Pros:

- Smallest initial change.
- Reuses the built site exactly as deployed.
- Compatible with static output.

Cons:

- Hidden tab panels remain a problem unless print CSS or JS expands them.
- Client-only placeholders may be absent or hydration-dependent.
- Navigation chrome and copy buttons need print-specific cleanup.
- The PDF contract is implicit.

Best use:

- Quick proof of concept.
- Visual baseline before refactoring.

### Option B: Dedicated Export Routes

Create export-specific routes such as `/exports/pdf/notes/foo/` or a build-only route tree that renders the lesson with
a print layout.

Pros:

- Clear document contract.
- Easier to expand tabs, hide interactive controls, and remove sidebar/header/footer.
- Easier to validate with render tests.

Cons:

- Requires route generation and layout refactoring.
- Needs a policy for whether export routes are public or build-only artifacts.

Best use:

- Stable feature intended for course distribution.

### Option C: Component Container Rendering

Use Astro's Container API to render lesson/document components to HTML strings, then feed that HTML to the PDF renderer.

Pros:

- Could avoid routing concerns.
- Good fit for tests and isolated component rendering.

Cons:

- Astro documents the Container API as experimental and scoped primarily to testing.
- Rendering whole pages with slots, imports, and route context may become fragile.
- Less aligned with the current static site build.

Best use:

- Testing document components.
- Not recommended as the primary v1 export pipeline.

## PDF Engine Options

### Playwright

Playwright's `page.pdf()` generates a PDF with print CSS media by default and can emulate screen media before PDF
generation. Its API also exposes PDF options such as page size and margins.

Pros:

- Already familiar as a testing-style browser automation tool.
- Good page inspection and waiting primitives.
- Useful if the project later adopts browser tests.

Cons:

- Browser dependency is relatively heavy.
- PDF output is Chromium-driven.

Reference: [Playwright Page API](https://playwright.dev/docs/next/api/class-page#page-pdf)

### Puppeteer

Puppeteer's `Page.pdf()` is explicitly documented for generating PDFs from pages and uses print CSS media.

Pros:

- Focused browser automation library with a direct PDF API.
- Common choice for HTML-to-PDF pipelines.

Cons:

- Also brings a Chromium/browser dependency.
- Less useful than Playwright if the project also wants broader browser testing.

Reference: [Puppeteer Page.pdf API](https://pptr.dev/api/puppeteer.page.pdf)

### Non-Browser PDF Libraries

Examples include programmatic PDF builders. They are intentionally not recommended for v1.

Pros:

- Smaller runtime if no browser is needed.
- More deterministic layout in some cases.

Cons:

- Would require reimplementing the lesson rendering model.
- Poor fit for existing Astro/Tailwind/code-highlighted lesson content.

Best use:

- Only if the target becomes a custom book layout, not faithful lesson-page export.

## Refactor Tracks

### Track 1: Lesson Document Contract

Goal:

Define what content belongs to an exportable lesson document.

Work:

- Extract the document body composition from `NotesLayout.astro`.
- Decide whether metadata, repo links, references, language links, and prev/next links are included.
- Give export-relevant wrappers stable selectors, for example `data-export-role`.
- Keep course navigation and site header/footer outside the export document contract.

Exit criteria:

- A lesson can render as a clean document without sidebar/header/footer.
- The web layout still renders the same user-facing page.

### Track 2: Tabs and Conditional Content

Goal:

Make tabbed and optional content deterministic in PDF.

Work:

- Add an export rendering mode for tabs.
- In export mode, render every tab panel visibly with a small heading for each tab value.
- Keep normal interactive tab behavior unchanged for browser reading.
- Add render tests for normal mode and export mode.

Exit criteria:

- PDF export includes all tab panel content.
- Browser pages still show one active tab at a time.

### Track 3: Client Islands and Interactive Controls

Goal:

Remove hydration dependency from exported documents.

Work:

- Hide copy buttons in print/export mode.
- Replace client reading time with either no reading-time block or a server-computed estimate.
- Exclude `LessonSidebar` from the document layout.
- Decide how `ToDo client:only="react"` placeholders behave in export.

Exit criteria:

- Export HTML is meaningful before hydration.
- Export does not rely on running React islands.

### Track 4: Print CSS

Goal:

Create a small print stylesheet that supports PDFs without damaging web styling.

Work:

- Add page size and margin rules.
- Preserve code block colors where needed with print-color adjustment.
- Avoid page breaks inside code blocks, tables, callout headings, and figure captions where possible.
- Show external link URLs only if the visual policy allows it.
- Ensure dark/light duplicated code blocks do not both appear in print.

Exit criteria:

- A sample PDF from a long lesson has readable headings, code blocks, tables, images, and callouts.

### Track 5: Manifest and CLI

Goal:

Make export reproducible and scriptable.

Work:

- Add a manifest builder from course structure plus generated lesson metadata.
- Add a CLI script that builds or consumes the site, starts a local static server, visits export routes, and writes
  PDFs.
- Support filters for one route, one subtree, or all lessons.
- Produce stable output paths, for example `dist-pdf/notes/type-fundamentals/basics/functions.pdf`.

Exit criteria:

- One command exports a selected lesson.
- One command exports all exportable lessons.
- Missing routes or failed PDFs produce clear error output.

## Suggested TDD Sequence

1. Add pure tests for `lesson-export-core` route normalization and output-path derivation.
2. Add pure tests for manifest building from a tiny course tree plus metadata fixture.
3. Add Astro render tests for the document layout without sidebar/header/footer.
4. Add Astro render tests for tabs in normal mode and export mode.
5. Add render tests proving copy buttons/sidebar/reading-time are omitted or replaced in export mode.
6. Add a CLI unit test around manifest filtering and output path planning.
7. Add one integration smoke test that exports a fixture page to PDF, only after the HTML contract is stable.

## Decisions Needed Before Implementation

### Export route policy

Options:

- Public export routes: simple to test and debug, but visible in the deployed site unless excluded.
- Build-only export routes: cleaner public surface, but needs more script plumbing.
- Normal routes with print query or media: minimal routing work, but weaker document boundary.

Recommendation:

Use build-only or clearly namespaced export routes after the document layout exists.

### PDF engine

Options:

- Playwright: better if browser testing is likely.
- Puppeteer: narrower dependency for PDF generation.

Recommendation:

Use Playwright if the project expects browser-level visual or export tests; otherwise use Puppeteer for a narrower
PDF-only implementation.

### Export content policy

Options needing confirmation:

- Include or omit lesson metadata panel.
- Include or omit recent changes.
- Include or omit repo links.
- Include or omit previous/next navigation.
- Include all tab variants or only the default tab.
- Include optional `More` callouts by default.
- Include unresolved `ToDo` placeholders or fail export for pages containing them.

Recommendation:

Include metadata, repo links, references, language links, all tabs, and optional callouts. Omit sidebar, header, footer,
copy buttons, reading-time widget, and previous/next navigation. Treat `ToDo` placeholders as export findings first, not
hard failures, until the course content policy is confirmed.

### Package boundary

Options:

- Start with `packages/lesson-export-core` only.
- Add both `packages/lesson-export-core` and `packages/lesson-pdf-exporter`.
- Keep all export code app-local first.

Recommendation:

Start with `packages/lesson-export-core` plus app-local rendering/PDF scripts. Extract the browser PDF runner later only
if a second site or tool needs it.

## Proposed Phase 3 Scope

Phase 3 should not try to export every lesson perfectly. It should prove the architecture with one representative
lesson.

Recommended slice:

- Add `packages/lesson-export-core`.
- Build an export manifest for one selected route.
- Extract a minimal `LessonDocumentLayout.astro`.
- Add an export mode for tabs.
- Generate one PDF from a route with tabs and code blocks, preferably `src/pages/notes/installation.astro`.

Success criteria:

- The web route still renders normally.
- The export route includes all tab content.
- The generated PDF is readable without sidebar/header/footer/copy buttons.
- The code path is narrow enough to extend to all lessons in later cycles.

## External References

- [Astro Container API](https://docs.astro.build/en/reference/container-reference/)
- [Astro configuration reference](https://docs.astro.build/en/reference/configuration-reference/)
- [Playwright Page API: pdf](https://playwright.dev/docs/next/api/class-page#page-pdf)
- [Puppeteer Page.pdf API](https://pptr.dev/api/puppeteer.page.pdf)
