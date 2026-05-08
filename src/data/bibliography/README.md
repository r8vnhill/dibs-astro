# Bibliography Catalog (Turtle + Generated JSON-LD)

This folder stores bibliography data used by lessons, reports, tests, and reference-rendering components.

The canonical editorial source lives in numbered Turtle fragments under:

```text
src/data/bibliography/sources/
```

The build step assembles those fragments into:

```text
src/data/bibliography/catalog.graph.generated.ttl
```

The site, reports, and tests consume the generated JSON-LD artifact:

```text
src/data/bibliography/catalog.graph.generated.jsonld
```

Do not edit generated files manually. Update the Turtle files in `sources/` and regenerate the catalog instead.

The project still keeps legacy `*.bibliography.jsonld` `ItemList` files during migration, but new work should target the
Turtle catalog.

## Canonical model

The editorial source uses Turtle with a mixed vocabulary:

- `schema.org` for references, people, organizations, institutions, works, and lessons
- `dibs:` for course-specific usage relations

Core node categories:

- references: `Book | WebPage | VideoObject | ScholarlyArticle | Thesis`
- works: reusable `CreativeWork` parents referenced by citeable entries through `schema:isPartOf`
- sites: reusable `WebSite` containers for documentation and other multi-page web properties
- people: `Person`
- organizations/institutions: `Organization | CollegeOrUniversity`
- lessons: `LearningResource`
- usage edges: `dibs:ReferenceUsage`

References are the citeable entries rendered in lessons. Works are reusable source entities that can be referenced by
more specific citeable entries, such as chapters, articles, or web pages.

## IDs

Use stable, human-readable IDs.

Recommended ID patterns:

- references: `ref:<slug>`
- people: `person:<slug>`
- sites: `site:<slug>`
- organizations: `org:<slug>`
- works: `work:<slug>`
- lessons: full site URL subjects with canonical route values in `schema:url`
- usage nodes: `usage:<slug>`

Lesson nodes are written as full site URLs in Turtle, for example:

```ttl
<https://dibs.ravenhill.cl/notes/scripting/pipelines/>
  a schema:LearningResource ;
  schema:url "/notes/scripting/pipelines/" .
```

Usage IDs should follow nearby existing slug-style entries, such as
`usage:pipelines-nushell-nushell-pipelines-recommended`, instead of inventing a new route-encoded spelling.

## Usage tags

Usage tags live on `dibs:ReferenceUsage` nodes via `dibs:tag`.

Supported tags:

- `recommended`
- `additional`
- `pending-revision`

`pending-revision` is used for references that should not be rendered as normal published recommendations yet. UI
rendering hides `pending-revision` entries by default.

## Editing the catalog

To add or modify bibliography data:

1. Choose the appropriate source file.
   - `00-prefixes.ttl` is the shared prefix reference.
   - `01-persons.ttl` is for `Person` entities.
   - `02-organizations.ttl` is for organizations and institutions.
   - `03-sites.ttl` is for `WebSite` containers such as documentation sites.
   - `04-works.ttl` is for reusable parent works, such as books or larger published works.
   - `05-references.ttl` is for citeable entries, such as chapters, articles, videos, theses, and web pages.
   - `06-usages.ttl` is for lesson-to-reference usage relationships.
2. Edit the themed Turtle file directly.
3. Keep the file-local `@prefix` declarations intact. Each source file is intentionally independent.
4. Run the bibliography generator:

```sh
pnpm generate:bibliography-catalog
```

5. Commit both the edited Turtle source and the regenerated artifacts.

Never manually edit:

```text
src/data/bibliography/catalog.graph.generated.ttl
src/data/bibliography/catalog.graph.generated.jsonld
```

Those files are build artifacts.

## Build pipeline

Run:

```sh
pnpm generate:bibliography-catalog
```

The command:

- assembles `sources/*.ttl` into `catalog.graph.generated.ttl`;
- parses the assembled Turtle graph;
- validates required fields, relation categories, and usage tags;
- prunes `pending-revision` usages only when they point to skipped, missing, or unsupported nodes;
- normalizes the graph;
- writes `catalog.graph.generated.jsonld`.

The generated files are deterministic and should be committed.

## Builder layout

The bibliography builder implementation lives under:

```text
scripts/lib/bibliography/
```

It is grouped by responsibility:

- `catalog-builder.mjs` orchestrates parsing, record grouping, graph dispatch, and artifact assembly
- `reader/` owns RDF record normalization, compacting, validation errors, and the source-bound reader facade
- `graph/` owns graph-node construction, relation validation, sorting, usage nodes, and pending-revision decisions
- `shared/` owns constants shared by orchestration, reader, and graph modules

Root-level files such as these remain stable facades for scripts and tests:

```text
scripts/lib/bibliography-catalog-builder.mjs
scripts/lib/bibliography-catalog-builder.graph.mjs
scripts/lib/bibliography-catalog-builder.records.mjs
scripts/lib/bibliography-catalog-builder.constants.mjs
scripts/lib/bibliography-catalog-builder.validation.mjs
```

Prefer those facades for script consumers and behavior-oriented tests. Import implementation subdirectories only when
testing a specific internal contract.

## Builder contracts

The builder follows a small set of internal contracts:

- required fields abort the build immediately with a source-labeled validation error;
- optional fields are omitted from emitted JSON-LD instead of serialized as empty values;
- relation fields are validated against allowed target categories before node emission;
- graph sorting is deterministic and non-mutating;
- pending-revision pruning is isolated to the usage-node path and does not affect published usages.

These are implementation guarantees rather than editorial features, but they are useful when extending the catalog
builder or adding tests around the generated graph.

## Rendering model

For normal graph-backed lesson pages, prefer `LessonReferencesFromCatalog`.

Use `ReferencesFromCatalog` when a caller needs explicit `source`, `lessonId`, or tag-filter configuration.

Catalog-backed and legacy ItemList-backed references now share the same final normalization core in
`src/lib/bibliography/normalize/normalize-reference.mjs` for `Book`, `WebPage`, `VideoObject`, `ScholarlyArticle`, and
`Thesis`.

Page references stay numeric-only. Shared page-reference helpers validate positive safe integers, normalize reversed
numeric bounds at parsing boundaries, reject non-object page-reference inputs, and format only trusted page-reference
values. Callers may pass partial page-format options; omitted labels and separators use the default `p.`, `pp.`, and `–`
convention.

The callers still keep their own source-specific responsibilities:

- `src/lib/bibliography/normalize-jsonld.ts` owns ItemList validation, duplicate detection, fallback-title handling, and
  strict/non-strict policy.
- `src/lib/bibliography/catalog-core.mjs` owns graph resolution, linked-node lookup, pending-only tolerance, and
  strict/non-strict policy.

Editorial descriptions remain in `.astro` files using slots keyed by reference ID:

- `description-{referenceId}`
- `title-{referenceId}`
- `publication-{referenceId}` for articles
- `institution-{referenceId}` for theses

## Analysis

Run:

```sh
pnpm bibliography:report
```

The report regenerates the catalog, reads the generated artifact, and produces:

- top cited references;
- top cited books;
- counts by lesson and tag.

Report analytics use the same normalized catalog core as site rendering. This keeps the script aligned with runtime tag
filtering and supported rendered reference types, including `VideoObject`.

## Review checklist

Before committing bibliography changes, verify that:

- Turtle edits were made under `src/data/bibliography/sources/`;
- generated `.ttl` and `.jsonld` artifacts were regenerated;
- generated artifacts were not edited manually;
- new IDs follow the existing naming conventions;
- new usage nodes use one of the supported tags;
- lesson IDs and routes match canonical lesson routes;
- behavior-oriented tests still import the stable facade modules where possible.
