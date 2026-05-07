# AI Agent Guide

Context and essential rules for agents working in this package.

## Decision Protocol

- Never make product, architecture, pedagogy, content-order, or style-policy decisions on your own.
- When a choice is required, present viable alternatives with their tradeoffs and wait for confirmation from the user.
- You may proceed with low-risk mechanical changes only when the existing repository pattern makes the decision
  unambiguous.
- If an instruction conflicts with project patterns, stop and ask before changing direction.

## Package Shape

- `@ravenhill/content-core` is a host-agnostic workspace package under the Astro site that now has a pilot
  publication path.
- It contains extracted host-agnostic navigation and lesson metadata core logic.
- It builds from `src/index.ts` to `dist/index.js` and `dist/index.d.ts` through `tsup`.
- The stabilized root API uses `NavigationService`, `LessonMetadataService`, `NavigationServiceContract`, and
  `LessonMetadataServiceContract`.
- Lesson metadata records use branded semantic value types and explicit `found`/`missing`/`invalid` result unions.
- Keep the package host-agnostic: do not import Astro, UI components, Cloudflare APIs, or site-specific infrastructure.
- Public vocabulary should stay content-neutral rather than DIBS-specific unless the user explicitly chooses otherwise.

## Workflow

- Validate this package with `pnpm check:content-core` from `astro-website`.
- The package exports built files from `dist`; keep `src/index.ts` as the only public source entry.
- Treat `dist/` as generated output. Do not edit it manually or rely on it for source changes.
- Keep `package.json` publication-ready in shape. For the pilot release, `private` may be `false` and the registry
  metadata should match the GitLab project publish endpoint.
- Do not modify changelogs unless the user explicitly asks for changelog updates.

## Code Conventions

- Prefer pure TypeScript types, constants, and content-domain abstractions.
- Avoid adding runtime dependencies unless the package actually needs them.
- Keep generated-data validation dependencies app-local. `content-core` owns dependency-free branded parsers and result
  contracts, not Zod schemas or generated JSON loading.
- Treat any further extraction from the site as an architecture decision; ask before moving additional domain models
  into this package.
- Consumers must import from the package root (`@ravenhill/content-core`), not package subpaths.
- Do not add package subpath exports. If consumers need more API, add it to the root contract intentionally.
- Follow the inclusive documentation guidance from
  `../../src/pages/notes/software-libraries/api-design/documentation/index.astro`: prefer precise, clear, respectful
  terminology over loaded metaphors or unnecessarily punitive wording.
- Avoid terms such as `violation` or `violations` in new public types, docs, diagnostics, and tests when a more
  descriptive alternative works. Prefer `finding`, `issue`, `not allowed`, `policy mismatch`, or a domain-specific name.
- Do not rename exported API terms mechanically. If compatibility is involved, propose aliases, deprecation, release
  notes, or a migration path first.
