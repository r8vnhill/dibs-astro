# AI Agent Guide

Context and essential rules for agents working in this package.

## Package Shape

- `@ravenhill/lesson-export-core` is a host-agnostic workspace package for pure lesson export planning.
- It owns route normalization, export route derivation, PDF output-path derivation, manifest filtering, manifest
  validation, pure report summaries, finding-kind normalization, and finding-policy matching.
- It builds from `src/index.ts` to `dist/index.js` and `dist/index.d.ts` through `tsup`.
- Consumers must import from the package root (`@ravenhill/lesson-export-core`), not package subpaths.

## Boundaries

- Do not import Astro, React, DOM APIs, Playwright, Puppeteer, Tailwind, generated app data, app-local aliases, or
  DIBS-specific course structure.
- Keep rendering, browser automation, route generation, CLI parsing, process exit behaviour, and filesystem side effects
  in the consuming application.
- Add public API only through `src/index.ts`.
- Avoid terms such as `violation` or `violations` in public API, docs, findings, and tests when precise alternatives
  such as `finding`, `issue`, `not allowed`, or `unsafe output path` work.

## Workflow

- Validate this package with `pnpm check:lesson-export-core` from `astro-website`.
- Treat `dist/` as generated output. Do not edit it manually.
- Do not modify changelogs unless the user explicitly asks for changelog updates.
