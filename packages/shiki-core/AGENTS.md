# AI Agent Guide

Context and essential rules for agents working in this package.

## Decision Protocol

- Never make product, architecture, pedagogy, content-order, or style-policy decisions on your own.
- When a choice is required, present viable alternatives with their tradeoffs and wait for confirmation from the user.
- You may proceed with low-risk mechanical changes only when the existing repository pattern makes the decision unambiguous.
- If an instruction conflicts with project patterns, stop and ask before changing direction.

## Package Shape

- `@ravenhill/shiki-core` is a host-agnostic workspace package for Shiki infrastructure.
- It contains extracted non-UI highlighting logic intended for workspace use and external publication.
- It builds from `src/index.ts` to `dist/index.js` and `dist/index.d.ts` through `tsup`.
- Consumers must import from the package root (`@ravenhill/shiki-core`), not package subpaths.
- Subpath imports are intentionally unsupported.

## Allowed Scope

- Host-agnostic Shiki orchestration contracts.
- Highlighting cache lifecycle contracts.
- Language alias contracts.
- Fallback HTML contracts.
- Reusable transformer contracts.
- Package-level tests and external-consumer validation.

## Not Allowed

- Astro components.
- UI rendering policy.
- App-local aliases such as `~/...`.
- Imports from `src/components`.
- Imports from `src/lib/shiki` in the Astro app.
- Test hooks in the public root API.
- Public subpath exports.
- App-specific configuration or generated data.

## Public API Rule

Consumers may import only from the package root:

```ts
import { getShikiHighlighter } from "@ravenhill/shiki-core";
```

Internal subpath imports (e.g., `@ravenhill/shiki-core/src/index.js`) are not supported.

## Workflow

- Validate this package with `pnpm check:shiki-core` from `astro-website`.
- The package exports built files from `dist`; keep `src/index.ts` as the only public source entry.
- Treat `dist/` as generated output. Do not edit it manually or rely on it for source changes.
- Keep `package.json` publication-ready. For the pilot release, `private` should be `false` and the registry metadata should match the GitLab project publish endpoint.
- Do not modify changelogs unless the user explicitly asks for changelog updates.

## Package Validation

The package `check` script runs four validation gates in sequence:

1. **`pnpm run build`** — Build the package using tsup.
2. **`pnpm run typecheck`** — Type-check the source with tsc.
3. **`pnpm run test`** — Run unit tests with vitest.
4. **`pnpm run lint`** — Lint with publint for publication readiness.
5. **`pnpm run pack:check`** — Validate tarball contents and package metadata.
6. **`pnpm run consumer:check`** — Validate the package as an external installed dependency.

### Pack Validation (`pack:check`)

Runs `scripts/assert-pack-files.mjs`. This script validates that the tarball would contain only the intended files by:

- Reading `package.json` and verifying metadata (name, version, type, exports, main, types, files).
- Running `pnpm pack --dry-run --json` and parsing the file manifest.
- Asserting required distributable files are present: `dist/index.js`, `dist/index.d.ts`, `README.md`, `package.json`.
- Asserting implementation and test files are excluded: `src/`, `tests/`, `scripts/`, `vitest.config.*`, `tsup.config.*`.

### Consumer Validation (`consumer:check`)

Runs `scripts/validate-packed-consumer.mjs`. This script validates the package from an external consumer perspective by:

1. Building the package.
2. Creating a temporary root directory outside the workspace.
3. Packing the package to a temp tarball directory using `pnpm pack --pack-destination`.
4. Creating a clean temporary consumer project outside the workspace.
5. Installing the generated `.tgz` from the temp tarball (not a workspace link).
6. Installing TypeScript into the temp consumer for type checking.
7. Running an ESM runtime probe that imports from the root package entry point and calls stable APIs.
8. Running a TypeScript probe that imports types and API exports with full type checking.
9. Validating that internal subpaths (`src/`, `dist/`, implementation paths) cannot be imported at all.
10. Cleaning up the temp directory (unless `SHIKI_CORE_KEEP_CONSUMER_TEMP=1` is set for debugging).

The consumer validation proves that:

- The published tarball can be installed into a fresh project.
- Root imports work at runtime (ESM).
- Root imports work in TypeScript (declarations).
- The package `exports` field properly encapsulates internal paths.
- Internal implementation modules remain inaccessible to consumers.

## Code Conventions

- Prefer pure TypeScript types and host-agnostic abstractions.
- Avoid adding runtime dependencies unless the package actually needs them.
- Keep styling and UI concerns in the Astro app; this package owns highlighting infrastructure only.
- All public API must be exported from the root `src/index.ts` only.
- Do not add package subpath exports.
- Follow the inclusive documentation guidance from the root project: prefer precise, clear, respectful terminology over loaded metaphors.
- Avoid terms such as `violation` or `violations` in new public types, docs, and tests when a more descriptive alternative works.
- Do not rename exported API terms mechanically. If compatibility is involved, propose aliases or a migration path first.

## Tests

- Follow the repository Vitest shape: `suite` is Given, `describe` is When, and `test` is Then.
- If a test has no meaningful When grouping, use `suite` directly with `test`.
- Keep Arrange, Act, and Assert phases visually separated inside non-trivial tests.
- Do not use `it`; always prefer `test`, including data-driven cases such as `test.each(...)`.
