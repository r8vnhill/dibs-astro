# [PLAN] Lesson PDF Exporter

## Decision

Use **dedicated export routes + Playwright + a small host-agnostic export core package**.

Implementation note: the PDF export now also excludes web chrome through the shared
`data-export-hidden="true"` contract and a central print rule, so the generated PDFs contain the lesson document
without the site header, footer, sidebar, or lesson navigation chrome.

The uploaded analysis is already directionally right: the hard problem is not “how to print HTML”, but how to make
lessons render as deterministic documents instead of interactive web pages. The current baseline includes Astro lesson
pages under `src/pages/notes/**/*.astro`, course ordering from `src/data/course-structure.ts`, shared layouts through
`NotesLayout.astro`, and existing workspace packages for host-agnostic logic. It also correctly identifies the main
blockers: hidden tab panels, client islands, reading-time widgets, sidebars, copy buttons, and mixed browser/document
concerns.

## Dependency research and recommendation

| Dependency / tool          |            Use? | Decision                                                                                                                                                                                                                                         |
| -------------------------- | --------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Playwright**             |             Yes | Best fit for v1. Use Chromium PDF generation from rendered export routes. `page.pdf()` generates PDFs using `print` CSS media and supports page size, margins, and background options. ([Playwright][1])                                         |
| **Puppeteer**              |     No, for now | Technically valid, but redundant if Playwright may also support future browser/export tests. Puppeteer’s `Page.pdf()` has almost the same print-media behaviour. ([Puppeteer][2])                                                                |
| **Astro export routes**    |             Yes | Use a namespaced build-time route tree such as `/exports/pdf/notes/[...path]/`. Astro static dynamic routes are generated through `getStaticPaths()`, including rest parameters for arbitrary-depth paths. ([Astro Docs][3])                     |
| **Astro Container API**    |  Only for tests | Do not make it the primary exporter. Astro documents it as experimental, currently scoped mainly to isolated `.astro` component output testing in Vite/Vitest environments, and warns it may break in minor or patch releases. ([Astro Docs][4]) |
| **Vivliostyle CLI**        |          Not v1 | Good candidate for book-quality paged media later. It is designed to generate PDF from HTML/Markdown and typeset with CSS, but it adds another rendering model on top of the browser route pipeline. ([Vivliostyle][5])                          |
| **Paged.js**               |          Not v1 | Interesting for advanced paged layouts, but unnecessary before the site has a stable export document contract. Its purpose is transforming HTML into print-ready PDF-oriented documents. ([Paged.js][6])                                         |
| **WeasyPrint**             |          Not v1 | Strong for HTML/CSS-to-PDF and print standards, but it introduces a Python/native-system dependency and may diverge from Chromium’s rendering of Astro/Tailwind/Shiki output. ([Court Bouillon Documentation][7])                                |
| **pdf-lib**                | Later, optional | Useful for post-processing PDFs, merging lesson PDFs, adding metadata, cover pages, or indexes. It is not an HTML renderer. ([PDF-LIB][8])                                                                                                       |
| **serve / sirv / wait-on** | Avoid initially | Use `astro preview` plus a tiny Node retry loop instead. Astro already provides `build` and `preview` commands, and preview is explicitly for previewing a built site locally. ([Astro Docs][9])                                                 |
| **Zod**                    |        Optional | Useful only if manifest validation needs runtime schemas. Start with TypeScript + focused validation functions; introduce Zod later only if manifests become external/public artifacts.                                                          |

## Best alternative

### Choose this architecture

```text
packages/lesson-export-core
  Pure route, manifest, validation, filtering, and output-path logic.

src/presentation/export
  Astro document/export layout and export-aware component adapters.

src/infrastructure/export
  Site-specific manifest construction from course structure + lesson metadata.

src/pages/exports/pdf/notes/[...path].astro
  Static export routes generated from the manifest.

scripts/export-lessons-pdf.mjs
  CLI: build or consume build, run astro preview, visit export URLs, write PDFs.
```

This preserves the package-boundary style already used by the repository: reusable pure logic goes in `packages/*`,
while Astro layouts, Tailwind, browser automation, and route plumbing remain app-local until their contracts stabilise.

## Core implementation policy

Exported PDFs should include:

```text
title
lesson metadata
authors / last updated date
repo links when relevant
references
language links
all tab variants
optional callouts
code blocks
tables
figures
```

Exported PDFs should omit:

```text
site header
sidebar
footer chrome
copy buttons
reading-time island
previous/next navigation
interactive tab controls
client-only placeholders as interactive widgets
```

For unresolved `ToDo` or `client:only="react"` placeholders, start with **warnings in an export findings report**, not
hard failures. Convert selected findings into hard failures later when the content policy is stable.

## Phased plan

### ~~Phase 1 — Lock the export contract with tests~~

Goal: define “exportable lesson document” before adding browser automation.

Status: implemented in `traceability-log/phase_1_lock_the_lesson_export_contract_with_render_tests.md`.

Work:

```text
- Add tests describing which layout regions belong in web mode vs export mode.
- Add fixtures for one lesson with tabs, code blocks, callouts, and metadata.
- Define stable selectors:
  - data-export-role="document"
  - data-export-role="metadata"
  - data-export-role="body"
  - data-export-hidden="true"
  - data-export-finding="client-only"
```

Exit criteria:

```text
- Tests prove the document body can be identified independently of sidebar/header/footer.
- No PDF generation yet.
```

### ~~Phase 2 — Create `packages/lesson-export-core`~~

Goal: make target selection and output paths deterministic.

Status: implemented in `traceability-log/phase_2.md`.

Package responsibilities:

```text
- LessonExportEntry
- LessonExportManifest
- normalizeLessonRoute()
- deriveExportRoute()
- derivePdfOutputPath()
- filterManifest()
- validateManifest()
- detectDuplicateRoutes()
- detectUnsafeOutputPaths()
```

Suggested public model:

```ts
export interface LessonExportEntry {
    readonly route: string;
    readonly exportRoute: string;
    readonly title: string;
    readonly sourceFile: string;
    readonly outputPath: string;
    readonly lastModified?: string;
    readonly authors?: readonly string[];
}

export interface LessonExportManifest {
    readonly generatedAt: string;
    readonly entries: readonly LessonExportEntry[];
}
```

Testing:

```text
- BDD-style unit tests for route normalization.
- Data-driven tests for trailing slashes, nested notes, index routes, and unsafe paths.
- Property-based tests for path traversal prevention if the project already has fast-check or an equivalent mature dependency.
```

Exit criteria:

```text
- Manifest logic works without Astro, DOM, Playwright, filesystem side effects, or Tailwind.
```

### ~~Phase 3 — Extract `LessonDocumentLayout.astro`~~

Goal: stop forcing `NotesLayout.astro` to be both browser shell and document layout.

Status: implemented in `traceability-log/phase_3_extract_lessondocumentlayout.astro.md`.

Refactor shape:

```text
NotesLayout.astro
  - site header
  - sidebar
  - reading-time widget
  - repo panel
  - prev/next navigation
  - wraps LessonDocumentLayout

LessonDocumentLayout.astro
  - title
  - metadata
  - abstract/intro slot if present
  - main lesson body
  - references/footer metadata
```

Exit criteria:

```text
- Existing lesson pages still look the same in normal web mode.
- Export document rendering has no sidebar/header/footer dependency.
```

### ~~Phase 4 — Make components export-aware~~

Goal: make interactive content deterministic before PDF generation.

Main changes:

```text
TabsContent.astro
  - web mode: current hidden-panel behaviour
  - export mode: render every tab panel visibly with a small heading

CodeLayout.astro
  - export mode: no copy buttons
  - print mode: only one light/dark variant appears

ReadingTime.astro
  - export mode: omit or replace with server-computed static text

LessonSidebar
  - never included in document layout

ToDo / client-only islands
  - export mode: render static warning/finding marker, not a hydrated placeholder
```

CSS should use print primitives: `@media print`, `@page`, `break-inside`, `orphans`, `widows`, and `print-color-adjust`.
MDN’s paged media documentation confirms CSS paged media controls printable areas, page breaks, page size, orientation,
margins, headers, and footers. ([MDN Web Docs][10]) `print-color-adjust: exact` is useful for preserving intentionally
styled code/callout colours, although user agents may still override it. ([MDN Web Docs][11])

Exit criteria:

```text
- Export HTML is meaningful without hydration.
- All tab content is present.
- Interactive controls are absent from export HTML.
```

### ~~Phase 5 — Add static export routes~~

Goal: render stable export HTML through Astro’s normal build pipeline.

Route:

```text
src/pages/exports/pdf/notes/[...path].astro
```

Behaviour:

```text
- Use getStaticPaths() from the app-level manifest adapter.
- Pass the matching lesson export entry as props.
- Render the lesson through LessonDocumentLayout in export mode.
- Add noindex metadata if the routes are ever deployed accidentally.
```

Policy:

```text
- Prefer build-generated namespaced routes for v1.
- Later, decide whether to exclude `/exports/**` from deployment or keep them as public printable HTML.
```

Exit criteria:

```text
- `pnpm build` generates export HTML for selected lessons.
- Export routes can be previewed locally.
```

### ~~Phase 6 — Add the Playwright PDF CLI~~

Goal: generate PDFs from the built export routes.

Recommended dependency:

```text
pnpm add -D playwright
pnpm exec playwright install --with-deps chromium
```

Playwright is the better default because it supports browser automation broadly, has waiting/inspection primitives, and
can later support export smoke tests or visual checks. Its browser installation is explicit: Playwright requires browser
binaries, and the CLI can install specific browsers and system dependencies, including Chromium-only installs.
([Playwright][12])

CLI behaviour:

```text
scripts/export-lessons-pdf.mjs
  --route /notes/software-libraries/artifacts-taxonomy/
  --subtree /notes/software-libraries/
  --all
  --outDir dist-pdf
  --skip-build
  --keep-server
```

Pipeline:

```text
1. Build the site unless --skip-build is set.
2. Start `pnpm astro preview --host 127.0.0.1 --port <port>`.
3. Wait for the preview URL with a small built-in fetch retry loop.
4. Load each export route with Playwright Chromium.
5. Assert `data-export-role="document"` exists.
6. Collect export findings from `[data-export-finding]`.
7. Write PDF to the manifest-derived output path.
8. Write `dist-pdf/export-report.json`.
9. Shut down the preview process.
```

PDF defaults:

```ts
await page.pdf({
    path: entry.outputPath,
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
    margin: {
        top: "18mm",
        right: "16mm",
        bottom: "20mm",
        left: "16mm",
    },
});
```

Exit criteria:

```text
- One command exports one representative lesson.
- Failures include route, URL, output path, and reason.
- Generated PDF is readable and excludes web chrome.
```

### ~~Phase 7 — Integration tests and CI gating~~

Goal: keep the exporter reliable without making CI too heavy too early.

Status: implemented in `traceability-log/phase_7_integration_tests_and_ci_gating.md` and wired through the new
`pnpm test:pdf-smoke` / `pnpm export:pdf:smoke` commands.

Tests:

```text
- Unit tests for lesson-export-core.
- Astro render tests for document/export layout.
- Render tests for tabs in web/export mode.
- CLI tests for filtering and path planning.
- One opt-in Playwright smoke test that exports a tiny fixture lesson.
```

CI policy:

```text
- Keep full PDF generation advisory/manual at first.
- Gate only pure tests and Astro render tests.
- Add the Playwright PDF smoke test to CI once browser install/runtime cost is acceptable.
```

Implementation note:

```text
- The smoke wrapper lives in `scripts/test-pdf-export-smoke.mjs`.
- The smoke helpers live in `scripts/lib/pdf-export-smoke.mjs`.
- CI exposes the advisory job as `pdf_export_smoke`.
- Temporary smoke artifacts live under `tmp/pdf-export-smoke/`.
```

Exit criteria:

```text
- `pnpm check` validates pure contracts.
- `pnpm export:lessons:pdf -- --route ...` works locally.
- CI can run a minimal smoke test when enabled.
```

### Phase 8 — Scale from one lesson to all lessons

Goal: move from proof of architecture to course distribution.

Work:

```text
- Enable all exportable lessons in the manifest.
- Add findings categories:
  - missing-title
  - missing-source-file
  - client-only-island
  - hidden-content
  - unresolved-todo
  - pdf-generation-failed
- Add repeatable `--fail-on findingKind` for targeted stricter policies.
- Keep deprecated `--fail-on-finding` as one-cycle shorthand for failing on any finding.
- Add `--continue-on-error` for batch exports.
- Add stable output naming for nested lesson paths.
```

Exit criteria:

```text
- Full lesson export is reproducible.
- Partial failures do not hide successful PDFs.
- The report is good enough to use as a content-quality checklist.
```

### Phase 9 — Optional book-quality layer

Only after single-lesson PDFs are stable:

```text
- Use pdf-lib to merge lesson PDFs into unit bundles.
- Add cover pages, table of contents, and PDF metadata.
- Evaluate Vivliostyle if DIBS needs book-grade running headers, page counters, indexes, and richer paged-media layout.
```

## Recommended immediate Phase 3 slice

For the next implementation pass, keep the slice narrow:

```text
1. Add `packages/lesson-export-core`.
2. Build a manifest for one selected route.
3. Extract `LessonDocumentLayout.astro`.
4. Add export mode for tabs.
5. Add `/exports/pdf/notes/[...path].astro`.
6. Generate one PDF with Playwright from a lesson containing tabs and code blocks.
```

The uploaded plan suggested `src/pages/notes/installation.astro` as the representative lesson, which is still a good
first target if it includes the relevant edge cases: tabs, code blocks, metadata, and enough length to expose print
issues.

[1]: https://playwright.dev/docs/api/class-page "Page | Playwright"
[2]: https://pptr.dev/api/puppeteer.page.pdf "Page.pdf() method | Puppeteer"
[3]: https://docs.astro.build/en/reference/routing-reference/?utm_source=chatgpt.com "Routing Reference - Astro Docs"
[4]: https://docs.astro.build/en/reference/container-reference/ "Astro Container API (experimental) | Docs"
[5]: https://docs.vivliostyle.org/en/?utm_source=chatgpt.com "Welcome to Vivliostyle Documentation"
[6]: https://pagedjs.org/?utm_source=chatgpt.com "Paged.js —"
[7]: https://doc.courtbouillon.org/weasyprint/stable/?utm_source=chatgpt.com "WeasyPrint 68.1 documentation"
[8]: https://pdf-lib.js.org/?utm_source=chatgpt.com "PDF-LIB · Create and modify PDF documents in any ..."
[9]: https://docs.astro.build/en/reference/cli-reference/ "CLI Commands | Docs"
[10]: https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Paged_media "CSS paged media - CSS | MDN"
[11]: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/print-color-adjust "print-color-adjust CSS property - CSS | MDN"
[12]: https://playwright.dev/docs/browsers "Browsers | Playwright"
