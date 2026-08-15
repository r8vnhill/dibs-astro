# Design

This document explains why `dibs-astro` is built the way it is: the product it serves, the technology choices, the
layered architecture, and the content pipeline that turns course material into a static site. It is the "why and how it
fits together" reference.

- For quick start, commands, and troubleshooting, see [`README.md`](./README.md).
- For agent-facing rules (Decision Protocol, code conventions, workflow commands), see [`AGENTS.md`](./AGENTS.md).
- For the full layer-boundary rule matrix and boundary-checker internals, see
  [`docs/architecture/layer-separation.md`](./docs/architecture/layer-separation.md) — this document summarizes that
  contract but does not restate it in full.

## What this project is

`dibs-astro` is the public site for DIBS, a course on software library design and implementation. Course content is
written in Spanish; repository-level documentation (this file, `README.md`, `AGENTS.md`) is in English so the repository
stays reusable as a template for courses in other languages.

The site is a static build: there is no server-rendered or API surface at runtime. Every page is pre-rendered at build
time and served as static assets.

## Technology choices

- **Astro 7** — the site framework. `astro.config.ts` sets `output: "static"` and `trailingSlash: "always"`; there is a
  standing rule not to introduce SSR or server endpoints.
- **Tailwind CSS v4** — styling.
- **Markdoc** — authoring format for lesson content, via `@astrojs/markdoc`.
- **React islands** — used selectively for interactive components; most of the site is plain Astro/HTML.
- **TypeScript 6** — application logic under `src/domain`, `src/application`, `src/infrastructure`, and
  `src/presentation` is typed and layered (see below).
- **pnpm workspaces** — the root app and `packages/*` are managed as one workspace.
- **Vitest** — unit tests (`test:unit`, jsdom) and Astro component render tests (`test:astro`).
- **dprint** — the single formatter for the repository (`pnpm fmt`); there is no separate linter layered on top for
  formatting concerns.
- **Cloudflare Workers Static Assets** — deployment target, via Wrangler.

## Workspace layout

```text
dibs-astro (root app)
├── src/            application code: domain, application, infrastructure, presentation, UI
└── packages/
    ├── content-core       host-agnostic lesson-navigation and lesson-metadata contracts
    ├── site-core          host-agnostic repository/hosting-platform primitives
    ├── shiki-core         host-agnostic Shiki syntax-highlighting infrastructure
    ├── lesson-export-core host-agnostic lesson-export (PDF) planning primitives
    └── astro-icons        SVG icon components for Astro (Phosphor-based)
```

Each `packages/*` entry is published under restricted access to a private GitLab npm registry
(`publishConfig.access: "restricted"`), for reuse across Ravenhill projects beyond just this site — not merely an
internal folder convention. Each is framework-agnostic: no Astro imports, no generated JSON, no app-local aliases. The
boundary checker (`pnpm check:architecture`) enforces this from the app side: application code may depend on a package's
root export, but the package itself may not depend back on `src/`.

Each package carries its own `AGENTS.md` and `README.md`, scoped to that package's contract; consult those before
changing a package's public surface.

## Layered application architecture

Inside `src/`, dependencies flow in one direction:

```text
UI (layouts, components, pages)
  → presentation adapters (composition root)
    → application (orchestration, ports)
      → domain (pure business rules)
    → content-core / site-core (workspace packages)
  ← infrastructure adapters implement domain/application contracts
```

- **Domain** — pure business rules and use-case logic, free of frameworks and I/O.
- **Application** — orchestrates domain entities and ports, returns DTOs.
- **Infrastructure** — concrete data-source implementations (generated JSON, external adapters).
- **Presentation adapters** — the local composition root; the only layer allowed to bridge application/infrastructure
  output into UI-safe payloads.
- **UI surfaces** (`src/layouts`, `src/components`, `src/pages`) — Astro layouts and React components. They consume
  presentation adapters and small view-model payloads, never domain, application, or infrastructure internals directly,
  and never `src/data/*` directly.

This separation exists so that lesson-authoring and rendering concerns stay independent of how navigation, metadata, and
bibliography data happen to be sourced today — the data layer can change without UI surfaces changing, and vice versa.
`pnpm check:architecture` (part of `pnpm check`) enforces the full rule matrix statically by scanning imports; see
`docs/architecture/layer-separation.md` for the complete allowed/forbidden table and the checker's own test suite.

## Content and generated-data pipeline

Course content is authored, not generated; several supporting datasets are derived from source-of-truth files and must
never be hand-edited:

| Generated artifact                                           | Derived from                                          | Regenerate with                      |
| ------------------------------------------------------------ | ----------------------------------------------------- | ------------------------------------ |
| `src/data/lesson-metadata.generated.json`                    | lesson frontmatter                                    | `pnpm generate:lesson-metadata`      |
| `src/data/bibliography/catalog.graph.generated.{ttl,jsonld}` | Turtle sources under `src/data/bibliography/sources/` | `pnpm generate:bibliography-catalog` |
| `@ravenhill/astro-icons` and `$icons` facade                 | GitLab registry icons plus local language marks       | `pnpm install --frozen-lockfile`    |

`pnpm dev`, `pnpm build`, and `pnpm deploy` all regenerate these first (`predev`/`prebuild`/`predeploy` also build
`content-core`, `lesson-export-core`, `site-core`, and `shiki-core`, since the app imports their built output).
`pnpm check` re-validates freshness so a stale generated file fails CI instead of silently drifting from its source.

Lesson PDF export (`pnpm export:pdf*`) is a separate, opt-in pipeline built on `@ravenhill/lesson-export-core` and
Playwright/Chromium; it renders selected lesson routes to PDF and reports per-lesson success/failure rather than failing
the whole batch on one bad lesson.

## Testing strategy

- **Unit tests** (`pnpm test:unit`, jsdom) and **Astro render tests** (`pnpm test:astro`, `*.render.test.ts`) cover
  application/domain logic and component rendering respectively.
- Tests are BDD-structured with `suite` (Given) / `describe` (When) / `test` (Then); `it` is never used. See `AGENTS.md`
  for the exact convention and an example.
- The architecture boundary checker is itself test-covered (`scripts/__tests__/layer-boundary-*.test.ts`) so changes to
  the rule matrix are deliberate, not accidental.
- The PDF export smoke path (`pnpm test:pdf-smoke`) is intentionally excluded from the default gate because it drives a
  real browser; run it explicitly when touching export code.

## Quality gates

```sh
pnpm check   # generated-data freshness + Astro checks + architecture boundaries + per-package checks
pnpm test    # unit + Astro render tests
pnpm build   # regenerates data, builds the static site into dist/
```

`pnpm check` also fans out into each workspace package's own check script (`check:content-core`, `check:site-core`,
`check:shiki-core`, `check:lesson-export-core`, `check:astro-icons`), so a package-local regression is caught from the
root gate, not only when working inside that package.

## Deployment

The production build is a static Astro output (`dist/`). That same artifact can be served by Cloudflare Workers Static
Assets through `wrangler.toml` or packaged into an unprivileged NGINX OCI image. `pnpm deploy` continues to build and
deploy with Wrangler; Docker is an alternate delivery target, not an application runtime.

The container contract is intentionally small: NGINX listens on port 8080, serves generated route directories and
`404.html`, and runs with a read-only root filesystem plus `/tmp` as temporary storage. `pnpm test:container` probes the
generated HTTP contract without becoming part of the default unit/test command.

## Change management

Non-trivial work is tracked as a traceability document: `traceability-log/open/<slug>.md` while in progress, moved to
`traceability-log/closed/YYYY/MM/DD/<slug>.md` once verified and complete, preserving history via `git mv`.

Per `AGENTS.md`'s Decision Protocol, product, architecture, pedagogy, content-order, and style-policy decisions are
never made unilaterally by an agent working in this repository — alternatives are presented and confirmed with a
maintainer first. Low-risk mechanical changes proceed directly only when the existing repository pattern makes the
outcome unambiguous.

## Where to go next

| Question                                                    | Read                                                                               |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| How do I run/build/test this locally?                       | [`README.md`](./README.md)                                                         |
| What are the agent-specific rules for working in this repo? | [`AGENTS.md`](./AGENTS.md)                                                         |
| What exactly can import what, and how is it enforced?       | [`docs/architecture/layer-separation.md`](./docs/architecture/layer-separation.md) |
| What's the licensing/attribution story for bundled assets?  | [`docs/third-party-assets.md`](./docs/third-party-assets.md)                       |
| What does package X provide and what may depend on it?      | `packages/X/README.md` and `packages/X/AGENTS.md`                                  |
