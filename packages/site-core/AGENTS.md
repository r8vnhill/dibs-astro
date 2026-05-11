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

## TypeScript Configuration

The `tsconfig.json` file defines the type-checking boundary and strictness level for this package:

- **`extends: "astro/tsconfigs/strictest"`**: Enforces strict type checking consistent with the rest of the monorepo. This catches
  common errors and ensures API contracts are explicit.
- **`rootDir: "src"`**: Designates `src/` as the compilation root. Type checking starts from this directory.
- **`noEmit: true`**: Prevents `tsc` from emitting output files. The build is handled by `tsup` (see `tsup.config.ts`), not
  the TypeScript compiler. This avoids duplicate build outputs and ensures a single source of truth.
- **`jsx: "react-jsx", jsxImportSource: "react"`**: Enables JSX support for helper components and reference implementations
  within the package. This is intentional; the package remains framework-agnostic at the API boundary but may use React
  internally for documentation or examples.

Do not modify `tsconfig.json` without understanding how it affects `tsc` validation (run by `pnpm check:site-core`) and IDE
type checking. If you need to expand the package scope (e.g., add new source directories or change compilation targets), update
this file and re-run `pnpm check:site-core` to validate.

## Workflow

- Validate this package with `pnpm check:site-core` from `astro-website`.
- Treat `dist/` as generated output. Do not edit it manually.
- Do not modify changelogs unless the user explicitly asks for changelog updates.
