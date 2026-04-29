# AI Agent Guide

Context and essential rules for agents working in this package.

## Decision Protocol

- Never make product, architecture, pedagogy, content-order, or style-policy decisions on your own.
- When a choice is required, present viable alternatives with their tradeoffs and wait for confirmation from the user.
- You may proceed with low-risk mechanical changes only when the existing repository pattern makes the decision unambiguous.
- If an instruction conflicts with project patterns, stop and ask before changing direction.

## Package Shape

- `@ravenhill/content-core` is a private workspace package under the Astro site.
- It is currently a structural proof-of-concept for modularization, not a full extracted domain package.
- Keep the package host-agnostic: do not import Astro, UI components, Cloudflare APIs, or site-specific infrastructure.
- Public vocabulary should stay content-neutral rather than DIBS-specific unless the user explicitly chooses otherwise.

## Workflow

- Validate this package with `pnpm check:content-core` from `astro-website`.
- The package exports TypeScript source directly from `src/index.ts`.
- Keep `package.json` publication-ready in shape, but preserve `private: true` unless the user asks to change release policy.

## Code Conventions

- Prefer pure TypeScript types, constants, and content-domain abstractions.
- Avoid adding runtime dependencies unless the package actually needs them.
- Treat future extraction from the site as an architecture decision; ask before moving domain models into this package.
- Follow the inclusive documentation guidance from `../../src/pages/notes/software-libraries/api-design/documentation/index.astro`: prefer precise, clear, respectful terminology over loaded metaphors or unnecessarily punitive wording.
- Avoid terms such as `violation` or `violations` in new public types, docs, diagnostics, and tests when a more descriptive alternative works. Prefer `finding`, `issue`, `not allowed`, `policy mismatch`, or a domain-specific name.
- Do not rename exported API terms mechanically. If compatibility is involved, propose aliases, deprecation, release notes, or a migration path first.
