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

## Code Conventions

- Prefer pure TypeScript types and host-agnostic abstractions.
- Avoid adding runtime dependencies unless the package actually needs them.
- Keep styling and UI concerns in the Astro app; this package owns highlighting infrastructure only.
- All public API must be exported from the root `src/index.ts` only.
- Do not add package subpath exports.
- Follow the inclusive documentation guidance from the root project: prefer precise, clear, respectful terminology over loaded metaphors.
- Avoid terms such as `violation` or `violations` in new public types, docs, and tests when a more descriptive alternative works.
- Do not rename exported API terms mechanically. If compatibility is involved, propose aliases or a migration path first.
