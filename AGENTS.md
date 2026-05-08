# AI Agent Guide

Context and essential rules for agents collaborating in this repository.

## Decision Protocol

- Never make product, architecture, pedagogy, content-order, or style-policy decisions on your own.
- When a choice is required, present viable alternatives with their tradeoffs and wait for confirmation from the user.
- You may proceed with low-risk mechanical changes only when the existing repository pattern makes the decision unambiguous.
- If an instruction conflicts with project patterns, stop and ask before changing direction.

## Core Principles

- Use inclusive and respectful Spanish in course content, user-facing messages, documentation, and examples.
- Avoid generic masculine Spanish. Prefer forms like "las personas usuarias", "el alumnado", "quienes usen", or neutral rewrites.
- Do not use `x` or `@` for gender neutrality; prefer collectives, reasonable paired forms, or rewritten phrasing.
- Apply the inclusive documentation criteria from `src/pages/notes/software-libraries/api-design/documentation/index.astro`: choose precise, clear, respectful terms instead of loaded metaphors or unnecessarily punitive wording.
- Avoid terms such as `violation` or `violations` in new user-facing text, docs, test names, and public APIs when a more descriptive alternative works. Prefer terms such as `finding`, `issue`, `blocked import`, `not allowed`, `policy mismatch`, or `boundary finding`, depending on context.
- Do not replace terminology mechanically. If an existing public API, generated shape, or documented contract uses a loaded term, propose a compatibility-aware migration with aliases, deprecation, release notes, or a transition guide before renaming it.
- Educational content, user documentation, and visible UI messages are in Spanish.
- Variable names, function names, and code comments follow the technical English of the ecosystem.
- Do not edit educational content without checking its immediate pedagogical context.

## Project Shape

- Public DIBS course site built with Astro 5, Tailwind CSS v4, Markdoc, and React islands.
- Deployment is static on Cloudflare Workers; do not introduce SSR or server endpoints.
- Application code lives in `src/`; reusable workspace packages live in `packages/*`.
- `packages/content-core` is a private, host-agnostic package consumed as `@ravenhill/content-core`.
- `packages/site-core` is a private, host-agnostic package consumed as `@ravenhill/site-core`.
- TypeScript logic is layered under `src/domain`, `src/application`, `src/infrastructure`, and `src/presentation`.
- Course pages live under `src/pages/notes`; shared lesson fragments live under `src/fragments`.

## Workflow

- Install dependencies with `pnpm install`.
- Run local development with `pnpm dev`; it regenerates bibliography and lesson metadata first.
- Build production with `pnpm build`; it also regenerates required data.
- Run checks with `pnpm check`; it includes generated-data validation, Astro checks, and architecture-boundary enforcement.
- Run tests with `pnpm test`, or use `pnpm test:unit` and `pnpm test:astro` for focused suites.
- Format with `pnpm fmt`; pre-commit formatting uses `dprint`.
- Use `pnpm preview` to review the local Cloudflare Workers preview flow.
- Do not modify changelogs unless the user explicitly asks for changelog updates.

## Data and Generated Files

- Do not manually edit `src/data/lesson-metadata.generated.json`.
- The editorial bibliography source is Turtle under `src/data/bibliography/sources/`.
- Do not manually edit `src/data/bibliography/catalog.graph.generated.ttl` or `src/data/bibliography/catalog.graph.generated.jsonld`.
- After bibliography changes, run `pnpm generate:bibliography-catalog` and keep both sources and generated artifacts in sync.
- New bibliography work should target the Turtle catalog, not legacy `*.bibliography.jsonld` files.

## Code Conventions

- Use the aliases in `tsconfig.json`: `~/*`, `$components/*`, `$layouts/*`, `$styles/*`, `$utils/*`, `$hooks/*`, `$assets/*`, `$icons`, `$semantics`, `$callouts`, `$domain/*`, `$application/*`, `$infrastructure/*`, `$presentation/*`, and `$test-utils/*`.
- Keep domain logic independent from Astro and UI; connect it through application, infrastructure, or presentation adapters. Use `pnpm check:architecture` only when debugging boundary findings directly.
- Internal routes use trailing slashes, for example `/notes/foo/`.
- Local icons live in `src/assets/img/icons/`; after changing them, run `pnpm generate-icons` and do not edit the generated index manually.
- Preserve the custom Shiki setup in `src/lib/shiki` and `config/shiki-warn-tracker`; the project avoids Astro's integrated Shiki highlighting.

## Tests

- Tests live near the module under test, usually in `__tests__` directories.
- Use `*.render.test.ts` for `.astro` component rendering with `pnpm test:astro`.
- Use `*.test.ts` or `*.test.tsx` for unit or integration tests in jsdom with `pnpm test:unit`.
- For Astro rendering, reuse helpers from `src/test-utils/astro-render.ts`.
- Structure tests with BDD-oriented grouping. Prefer `suite` for the Given context, `describe` for the When context, and `test` for Then expectations:

```ts
suite("given a normalized bibliography source", () => {
    describe("when references are grouped by lesson", () => {
        test("then recommended references keep source order", () => {
            // ...
        });

        test("then pending entries stay hidden by default", () => {
            // ...
        });
    });

    describe("when pending entries are explicitly included", () => {
        test("then pending references are returned", () => {
            // ...
        });
    });
});
```

- For simpler behavior, use one `describe` as the Given context and `test` as Then expectations:

```ts
describe("given a page reference range", () => {
    test("then reversed bounds are normalized", () => {
        // ...
    });
});
```

- Avoid deeply nested `describe` blocks. Prefer the `suite` / `describe` / `test` shape, or `describe` / `test` for small suites.

## Content and Components

- Lessons use `NotesLayout`, `NotesSection`, `Heading`, semantic components, callouts, exercises, conclusions, and references.
- Shared semantic components live in `src/components/semantics`; shared layouts live in `src/layouts`.
- Do not modify code examples inside educational blocks such as `<PowerShellBlock>` unless explicitly requested.
- For inline snippets with spaces, use the `code` prop in components such as `<InlineCode>`, `<PowerShellInline>`, `<NushellInline>`, or `<PythonInline>`.
- For normal bibliography references, prefer the graph-backed flow documented in `src/data/bibliography/README.md`.

## Deploy

- `astro.config.ts` defines `output: "static"`, `trailingSlash: "always"`, and `site: "https://dibs.ravenhill.cl"`.
- Legacy scripting redirects are generated from `src/pages/notes/scripting`.
- `pnpm deploy` builds the site and deploys with Wrangler; verify the build and generated artifacts before deploying.
