# Bibliography Catalog (Turtle + Generated JSON-LD)

This folder stores reference data for lessons. The editorial source now lives in numbered Turtle
fragments under:

`src/data/bibliography/sources/`

The build step assembles those fragments into:

`src/data/bibliography/catalog.graph.generated.ttl`

The site, reports, and tests consume the generated artifact:

`src/data/bibliography/catalog.graph.generated.jsonld`

The project still keeps legacy `*.bibliography.jsonld` `ItemList` files during migration, but new
work should target the Turtle catalog.

## Canonical model

The editorial source uses Turtle with a mixed vocabulary:

- `schema.org` for references, people, organizations, and lessons
- `dibs:` for course-specific usage relations

Core node categories:

- references: `Book | WebPage | ScholarlyArticle | Thesis`
- people: `Person`
- organizations/institutions: `Organization | CollegeOrUniversity`
- lessons: `LearningResource`
- usage edges: `dibs:ReferenceUsage`

## IDs

Use stable IDs:

- references: `ref:<slug>`
- people: `person:<slug>`
- organizations: `org:<slug>`
- lessons: canonical route, for example `/notes/scripting/pipelines/`
- usage nodes: `usage:<lesson>:<reference>:<tag>`

## Usage tags

Usage tags live on `dibs:ReferenceUsage` nodes via `dibs:tag`:

- `recommended`
- `additional`
- `pending-revision`

UI rendering hides `pending-revision` by default.

## Editing the catalog

To add or modify references:

1. **Determine the appropriate source file** (01–05) based on entity type
   - Use `01-persons.ttl` for Person entities
   - Use `02-organizations.ttl` for organizations
   - Use `03-works.ttl` for books and published works
   - Use `04-references.ttl` for specific chapters, articles, and web pages
   - Use `05-usages.ttl` for lesson-to-reference relationships
2. **Edit the themed file** directly with your additions/changes
3. Each source file includes its own `@prefix` declarations for independence
4. **Do not manually edit** `catalog.graph.generated.ttl` or `catalog.graph.generated.jsonld`
   - These are build artifacts regenerated automatically

## Build pipeline

Run `pnpm generate:bibliography-catalog` to:

- assemble `sources/*.ttl` into `catalog.graph.generated.ttl`
- parse the assembled TTL graph
- validate required fields, relation categories, and usage tags
- prune `pending-revision` usages only when they point to skipped, missing, or unsupported nodes
- normalize the graph
- write `catalog.graph.generated.jsonld`

The generated file is deterministic and should be committed.

## Builder contracts

The bibliography builder implementation now lives under `scripts/lib/bibliography/`. Root-level
files such as `scripts/lib/bibliography-catalog-builder.mjs` and
`scripts/lib/bibliography-catalog-builder.graph.mjs` remain as stable facades for scripts and
tests. Across that module family, the builder follows a small set of explicit internal contracts:

- required fields abort the build immediately with a source-labeled validation error
- optional fields are omitted from emitted JSON-LD instead of serialized as empty values
- relation fields are validated against allowed target categories before node emission
- graph sorting is deterministic and non-mutating
- pending-revision pruning is isolated to the usage-node path and does not affect published usages

These are internal implementation guarantees rather than editorial features, but they are useful
when extending the catalog builder or adding tests around the generated graph.

## Rendering model

For graph-backed lessons, use `ReferencesFromCatalog` and provide:

- `source`
- `lessonId`

Editorial descriptions remain in `.astro` using slots keyed by reference ID:

- `description-{referenceId}`
- `title-{referenceId}`
- `publication-{referenceId}` for articles
- `institution-{referenceId}` for theses

## Analysis

The CLI report `pnpm bibliography:report` reads the generated catalog and generates:

- top cited references
- top cited books
- counts by lesson and tag
