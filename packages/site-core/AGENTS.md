# AI Agent Guide

Context and essential rules for agents working in this package.

## Package Shape

- `@ravenhill/site-core` is a host-agnostic workspace package for pure site and repository primitives.
- It owns repository references, repository hosting platform constants, platform normalization, and repository/commit URL
  builders.
- It builds from `src/index.ts` to `dist/index.js` and `dist/index.d.ts` through `tsup`.
- Consumers must import from the package root (`@ravenhill/site-core`), not package subpaths.

## Boundaries

- Do not move DIBS-specific site configuration into this package.
- Do not import Astro, UI components, generated data, `src/data/*`, app-local aliases, or `@ravenhill/content-core`.
- Keep `@ravenhill/content-core` focused on lesson navigation and lesson metadata; this package should remain separate
  from content concerns.
- Add public API only through `src/index.ts`.

## Workflow

- Validate this package with `pnpm check:site-core` from `astro-website`.
- Treat `dist/` as generated output. Do not edit it manually.
- Do not modify changelogs unless the user explicitly asks for changelog updates.
