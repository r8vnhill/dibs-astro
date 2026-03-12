# Bibliography Catalog (Turtle + Generated JSON-LD)

This folder stores reference data for lessons. The canonical source is now:

`src/data/bibliography/catalog.graph.ttl`

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
- lessons: canonical route, for example `/notes/software-libraries/scripting/pipelines/`
- usage nodes: `usage:<lesson>:<reference>:<tag>`

## Usage tags

Usage tags live on `dibs:ReferenceUsage` nodes via `dibs:tag`:

- `recommended`
- `additional`
- `pending-revision`

UI rendering hides `pending-revision` by default.

## Build pipeline

Run `pnpm generate:bibliography-catalog` to:

- parse `catalog.graph.ttl`
- validate relations and tags
- normalize the graph
- write `catalog.graph.generated.jsonld`

The generated file is deterministic and should be committed.

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
