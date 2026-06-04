# AI Agent Guide

Context and essential rules for agents working in this package.

## Package Shape

- `@ravenhill/html-core` is a host-agnostic workspace package for reusable HTML semantic primitives.
- It currently owns the `HeadingLevel` type and package identity constants only.
- It builds from `src/index.ts` to `dist/index.js` and `dist/index.d.ts` through `tsup`.
- Consumers must import from the package root (`@ravenhill/html-core`), not package subpaths.

## Boundaries

- Do not import Astro, UI components, DOM APIs, browser globals, generated data, `src/data/*`, app-local aliases, or other Ravenhill workspace packages.
- Do not add runtime validation, rendering behavior, CSS, component props, or presentation policy unless the user explicitly approves a broader package contract.
- Keep the package focused on stable HTML semantic contracts that are reusable outside this Astro site.
- Add public API only through `src/index.ts`.

## TypeScript Configuration

- `extends: "astro/tsconfigs/strictest"` keeps strictness aligned with the rest of the workspace.
- `rootDir: "src"` defines the package source boundary.
- `noEmit: true` leaves emitted files to `tsup`.

Do not modify `tsconfig.json` without understanding how it affects package validation and IDE type checking.

## Workflow

- Validate this package with `pnpm --filter @ravenhill/html-core check` from `astro-website`.
- Treat `dist/` as generated output. Do not edit it manually.
- Do not modify changelogs unless the user explicitly asks for changelog updates.
