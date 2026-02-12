# Bibliography Datasets (JSON-LD)

This folder stores bibliography data used by lesson reference sections.

## Location convention

Place files under:

`src/data/bibliography/<area>/<lesson>.bibliography.jsonld`

Example:

`src/data/bibliography/software-libraries/scripting/pipelines.bibliography.jsonld`

## Required structure (v1)

- Root object:
  - `@context: "https://schema.org"`
  - `@type: "ItemList"`
  - `name`, `about` (optional but recommended)
  - `itemListElement: []`
- Each item:
  - `identifier` (required, unique, stable ID)
  - `@type` in `Book | WebPage`

### Book fields

- `name` (chapter/title)
- `isPartOf.name` (book title)
- `author` (optional)
- `pageStart` / `pageEnd` (optional)

### WebPage fields

- `name` (title)
- `url`
- `author` or `publisher` (optional)

## Rendering model

Lessons classify references directly in `.astro`:

- `recommended: string[]`
- `additional: string[]`

Descriptions remain in `.astro` using slots:

- `description-{identifier}`

Optional title override:

- `title-{identifier}`
