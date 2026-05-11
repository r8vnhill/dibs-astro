# [DONE] Phase 5 — Add Static Export Routes

## Summary

Add static Astro routes that expose PDF-oriented lesson HTML under `/exports/pdf/notes/**`.

These routes are generated only from `courseStructure`, not from the filesystem. Each export route wraps the
corresponding lesson page, activates PDF export rendering through `renderMode="pdf"` and
`Astro.locals.lessonRenderMode = "pdf"`, and produces stable, previewable HTML for Phase 6 PDF generation.

Phase 5 does **not** generate PDFs. It only creates deterministic HTML entrypoints that can later be consumed by
Playwright or another PDF pipeline.

This aligns with Astro’s static dynamic routing model: dynamic routes generated at build time must provide
`getStaticPaths()`, and `getStaticPaths()` may pass route-specific data through `props`. ([Astro Documentation][1])

## Goals

- Generate export HTML routes for every lesson linked from `courseStructure`.
- Keep export route generation independent from orphaned or deprecated note files.
- Reuse existing lesson pages instead of duplicating lesson rendering logic.
- Activate Phase 4 export-aware component behavior from a wrapper route.
- Fail the build on invalid manifest entries before Phase 6 depends on them.
- Keep deployment behavior unchanged until a later explicit deployment-policy phase.

## Non-goals

Phase 5 does not add:

- PDF generation.
- Playwright.
- CLI commands.
- public navigation links.
- sitemap entries.
- Cloudflare exclusions.
- redirects or route blocking.
- filesystem-wide lesson discovery as the source of truth.
- behavioural changes to normal `/notes/**` pages.

## Key Changes

### 1. Add an app-local export manifest adapter

Create an app-local adapter, for example:

```text
src/infrastructure/adapters/lesson-export-manifest.ts
```

The adapter should:

- flatten `courseStructure`;
- include only entries with a lesson `href`;
- ignore non-note links unless explicitly supported by `@ravenhill/lesson-export-core`;
- derive:

  - `route`;
  - `exportRoute`;
  - `outputPath`;
- use branded/runtime constructors from `@ravenhill/lesson-export-core`;
- enrich entries with:

  - navigation title from `courseStructure`;
  - generated lesson metadata when available;
  - source page module path when resolvable;
- validate the complete manifest;
- fail the build on `error` findings;
- keep `warning` findings available for tests and diagnostics.

Suggested public surface:

```ts
export function getPdfLessonExportManifest(): LessonExportManifest;

export function getPdfLessonExportEntries(): readonly LessonExportManifestEntry[];

export function assertValidPdfLessonExportManifest(
    manifest: LessonExportManifest,
): LessonExportManifest;
```

Keep this adapter app-local because it depends on app concerns: `courseStructure`, generated lesson metadata, Astro page
layout conventions, and local route structure.

### 2. Add route-to-page resolution helpers

Add a small resolver instead of embedding path logic directly in the Astro route.

Suggested file:

```text
src/infrastructure/adapters/lesson-page-registry.ts
```

Responsibilities:

- build an eager page registry with `import.meta.glob`;
- map `/notes/foo/` to `src/pages/notes/foo.astro` or `src/pages/notes/foo/index.astro`;
- apply the same `index.astro` collapse rules already used by lesson metadata;
- fail with a clear diagnostic when:

  - a `courseStructure` entry has no matching page;
  - two possible pages map to the same lesson route;
  - a page module has no default export.

From `src/pages/exports/pdf/notes/[...path].astro`, the glob should target `src/pages/notes` from the actual file depth:

```ts
const lessonPages = import.meta.glob("../../../notes/**/*.astro", {
    eager: true,
});
```

This must remain a static literal because Vite requires `import.meta.glob` patterns and options to be statically
analyzable, and eager mode imports the matched modules directly during build. ([Astro Documentation][2])

### 3. Add the static export route

Create:

```text
src/pages/exports/pdf/notes/[...path].astro
```

The route should:

- export `prerender = true` to make the intent explicit even if the app later uses hybrid/server output;
- export `getStaticPaths()` sourced only from the export manifest;
- derive `params.path` from the source route:

  - `/notes/installation/` → `installation`;
  - `/notes/software-libraries/artifacts-taxonomy/` → `software-libraries/artifacts-taxonomy`;
- pass the manifest entry through `props`;
- set `Astro.locals.lessonRenderMode = "pdf"` before rendering;
- render the matched source lesson page component;
- add `<meta name="robots" content="noindex, nofollow">`;
- add or preserve export markers:

  - `data-export-role="document"`;
  - `data-export-mode="pdf"`;
  - `data-export-role="metadata"`;
  - `data-export-role="body"`.

Astro pages are prerendered by default in static output, but making `prerender = true` explicit protects the route if
the project later adopts server or hybrid rendering. Astro documents prerendered routes as build-time HTML output and
on-demand routes as request-time rendering. ([Astro Documentation][3])

### 4. Keep export mode activation local to the wrapper route

The wrapper route should activate export mode using both mechanisms:

```ts
Astro.locals.lessonRenderMode = "pdf";
```

and:

```astro
<LessonPage renderMode="pdf" />
```

Use the prop as the primary explicit API and `Astro.locals` as the fallback read point for deeply nested components that
cannot reasonably receive props.

Astro’s `locals` object is request-scoped data available during the lifecycle of a page render, which makes it
appropriate as a shared render-context channel when used carefully. ([Astro Documentation][4])

### 5. Keep deployment behaviour unchanged

For Phase 5:

- `/exports/**` is generated into `dist`;
- no deployment exclusion is added;
- no redirect is added;
- no public navigation link is added;
- no sitemap integration is added.

Add a short follow-up note for a later phase:

```text
Phase 7 or later should decide whether `/exports/**` remains deployable,
is blocked from public access, or is generated only in PDF build jobs.
```

## Suggested Implementation Order

### Step 1 — Lock manifest semantics with tests

Add unit tests before implementation.

Cover:

- only `courseStructure` links are included;
- entries without `href` are skipped;
- non-`/notes/**` entries are skipped or reported according to the core package contract;
- deprecated/orphan filesystem pages are excluded;
- duplicate lesson routes are reported as errors;
- duplicate export routes are reported as errors;
- unsafe routes are reported as errors;
- missing generated metadata is a warning, not a blocker;
- route, export route, and output path are derived through `@ravenhill/lesson-export-core`.

### Step 2 — Implement the manifest adapter

Keep functions small and testable:

```text
flattenCourseStructure()
toCandidateLessonEntry()
toExportManifestEntry()
attachGeneratedMetadata()
validateExportManifestOrThrow()
```

Prefer pure functions for the transformation pipeline, with filesystem/module access isolated at the boundary.

### Step 3 — Add the page registry

Test route-to-module mapping separately from the Astro page.

Cover:

- `/notes/foo/` resolves to `notes/foo.astro`;
- `/notes/foo/` resolves to `notes/foo/index.astro`;
- `index.astro` collapse matches existing lesson metadata behaviour;
- duplicate source pages fail clearly;
- missing source pages fail clearly.

### Step 4 — Add the Astro export route

The route should be thin:

```text
getStaticPaths()
read props
set export render context
resolve page component
render page component
```

Avoid putting manifest, validation, or path-normalisation logic directly in the `.astro` file.

### Step 5 — Run focused and full validation

Run:

```bash
pnpm test:unit
pnpm test:astro
pnpm build
```

Add a focused command only if the repo already has a convention for package- or file-scoped test scripts.

## Tests

### Unit tests — manifest adapter

Use table-driven tests for route cases.

Required behaviours:

- includes only `courseStructure` entries with valid lesson `href`;
- excludes note pages that exist on disk but are not in `courseStructure`;
- derives `/exports/pdf/notes/.../` routes through the package API;
- derives `.pdf` output paths through the package API;
- preserves stable ordering from `courseStructure`;
- reports duplicate source routes;
- reports duplicate export routes;
- reports unsafe route inputs;
- warns for missing generated lesson metadata;
- fails build only for `error` findings.

### Unit tests — page registry

Required behaviours:

- maps direct lesson pages;
- maps nested `index.astro` lesson pages;
- applies the same route canonicalisation as generated metadata;
- reports missing modules with actionable messages;
- reports ambiguous modules with actionable messages.

### Astro render tests — export route

Representative route:

```text
/exports/pdf/notes/installation/
```

Assertions:

- renders exactly one document root;
- document root has `data-export-role="document"`;
- document root has `data-export-mode="pdf"`;
- route includes `<meta name="robots" content="noindex, nofollow">`;
- normal web chrome from `NotesLayout` is absent;
- export metadata region is present;
- export body region is present;
- tab content is rendered statically;
- code blocks preserve Phase 4 export markers;
- no interactive-only tab controls remain when export mode is active.

### Build validation

Run:

```bash
pnpm build
```

Confirm:

- export HTML files are generated under `dist/exports/pdf/notes/**`;
- normal `/notes/**` pages still build;
- no public navigation changes appear;
- manifest validation errors fail the build;
- warnings are visible but non-blocking.

## Assumptions

- `courseStructure` is the source of truth for exportable lessons.
- Phase 5 does not discover export routes directly from `src/pages/notes`.
- Missing generated metadata is a warning unless the core validator marks it as an error.
- Existing lesson pages remain source-compatible.
- Phase 4 export-aware components already support `renderMode="pdf"` or equivalent export-mode props.
- Deeply nested components may read export mode from `Astro.locals.lessonRenderMode`.
- The app will decide later whether generated export HTML should be publicly deployable.

## Risks and Mitigations

### Risk: route wrapper imports the wrong note path

Mitigation: test the page registry separately and use the corrected glob depth:

```ts
import.meta.glob("../../../notes/**/*.astro", { eager: true });
```

### Risk: normal lesson pages accidentally change

Mitigation: export mode is activated only in `/exports/pdf/notes/[...path].astro`; add at least one regression render
test for a normal `/notes/**` page.

### Risk: filesystem pages leak into the export manifest

Mitigation: use `courseStructure` as the only route source; the page registry may resolve modules but must not create
manifest entries.

### Risk: invalid manifest data reaches Phase 6

Mitigation: fail build on manifest `error` findings during `getStaticPaths()` or manifest construction.

### Risk: export HTML becomes public accidentally

Mitigation: include `noindex, nofollow` now, but defer deployment exclusion or access policy to a later explicit phase.

## Refined Acceptance Criteria

Phase 5 is complete when:

- `/exports/pdf/notes/**` routes are generated from `courseStructure`;
- each export route renders the corresponding lesson page in PDF export mode;
- export routes include `noindex, nofollow`;
- export HTML contains stable export markers for Phase 6;
- normal lesson routes remain unchanged;
- orphan note files are not exported;
- invalid manifest entries fail the build;
- focused unit and Astro render tests pass;
- `pnpm build` succeeds and emits static export HTML.

## Implementation Notes

The implemented route wrapper keeps the source lesson page intact and only shifts the render context for PDF export.

- `src/pages/exports/pdf/notes/[...path].astro` resolves the export manifest and forwards the canonical lesson route through `Astro.locals.lessonRoute`.
- `src/layouts/NotesLayout.astro` forwards `renderMode` and `exportMode` to the document layout so PDF export behavior can be activated explicitly from the wrapper.
- `src/layouts/BaseLayout.astro` adds `noindex, nofollow` only when the request-scoped lesson render mode is `pdf`.
- `src/infrastructure/adapters/lesson-export-manifest.ts` keeps manifest validation local to the app boundary while reusing the shared `@ravenhill/lesson-export-core` route and output-path helpers.

[1]: https://docs.astro.build/en/guides/routing/?utm_source=chatgpt.com "Routing - Astro Docs"
[2]: https://docs.astro.build/en/guides/imports/?utm_source=chatgpt.com "Imports reference - Astro Docs"
[3]: https://docs.astro.build/en/guides/on-demand-rendering/?utm_source=chatgpt.com "On-demand rendering - Astro Docs"
[4]: https://docs.astro.build/en/reference/api-reference/?utm_source=chatgpt.com "Astro render context | Docs"
