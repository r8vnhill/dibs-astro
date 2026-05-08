# [PLAN] Correct Non-Organizational Bibliographic Sources

## Summary

Refine the bibliography model so documentation sites such as **Kotlin docs** are not represented as
`schema:Organization`.

The correction should distinguish between:

- **publisher**: a real publishing entity, such as JetBrains, ACM, O’Reilly, a university, a platform, or an editorial
  organisation;
- **site/source container**: a website or documentation corpus that contains a web page, modelled as `schema:WebSite`
  and linked from the page with `schema:isPartOf`.

The visible rendering should remain stable. Existing references should continue to show the same source/location text,
but that text should be derived from the semantically correct field when available.

## Goals

- Model documentation sites as `schema:WebSite`, not `schema:Organization`.
- Use `schema:isPartOf` from `schema:WebPage` to its containing `schema:WebSite`.
- Reserve `schema:publisher` for actual `schema:Organization` or `schema:Person` publishers.
- Preserve the current render-facing shape of `NormalizedWebReference`.
- Preserve the visible output of existing references.
- Keep the change backward-compatible for references that still rely on `schema:publisher`.
- Limit the first migration to clearly incorrect documentation-site nodes, especially Kotlin docs.

## Non-goals

- Do not rename public render-facing fields in this phase.
- Do not remove `publisherName` or `publisherUrl`.
- Do not perform a global semantic cleanup of every ambiguous `org:*` node.
- Do not change visual rendering of bibliography references.
- Do not change lesson content.
- Do not introduce a new citation style.
- Do not require every `schema:WebPage` to define `schema:isPartOf`.

## Semantic model

### Current problem

Some documentation sources are currently modelled as organisations, for example:

```ttl
org:kotlin-docs a schema:Organization ;
    schema:name "Kotlin docs" ;
    schema:url <https://kotlinlang.org/docs/> .
```

That is semantically misleading. **Kotlin docs** is a documentation site or corpus, not an organisation. The real
organisation behind Kotlin is JetBrains, while the documentation site is better represented as a `schema:WebSite`.

Schema.org defines `WebSite` as a set of related web pages and other items served from a domain and accessible through
URLs, which matches a documentation site better than `Organization`. ([Schema.org][2])

### Target model

Create a website node:

```ttl
site:kotlin-docs
    a schema:WebSite ;
    schema:name "Kotlin docs" ;
    schema:url <https://kotlinlang.org/docs/> .
```

Then reference it from individual documentation pages:

```ttl
work:kotlin-basic-syntax
    a schema:WebPage ;
    schema:name "Basic syntax" ;
    schema:url <https://kotlinlang.org/docs/basic-syntax.html> ;
    schema:isPartOf site:kotlin-docs .
```

If the publisher is useful bibliographically, model it separately:

```ttl
org:jetbrains
    a schema:Organization ;
    schema:name "JetBrains" ;
    schema:url <https://www.jetbrains.com/> .
```

And attach it only when it adds meaningful bibliographic information:

```ttl
work:kotlin-basic-syntax
    schema:publisher org:jetbrains .
```

Do not use `schema:publisher` as a fallback mechanism to produce visible location text.

## Data modelling rules

### Use `schema:isPartOf` when

Use it for a `schema:WebPage` that belongs to a recognizable website, documentation corpus, manual, guide, or reference
site.

Examples:

```ttl
schema:isPartOf site:kotlin-docs .
schema:isPartOf site:gradle-docs .
schema:isPartOf site:astro-docs .
```

### Use `schema:publisher` when

Use it only when the target is an actual publisher entity:

```ttl
schema:publisher org:jetbrains .
schema:publisher org:acm .
schema:publisher org:oreilly .
schema:publisher org:mit-press .
```

Schema.org defines `publisher` values as `Organization` or `Person`, which supports keeping it for real publishing
agents. ([Schema.org][3])

### Avoid

Do not model documentation sites as organisations:

```ttl
# Avoid
org:kotlin-docs a schema:Organization .
org:kotlin-help a schema:Organization .
```

Do not use `publisher` to mean “website where I found the page”:

```ttl
# Avoid
schema:publisher org:kotlin-docs .
```

## Namespace recommendation

Introduce a separate prefix for sites if one does not already exist:

```ttl
@prefix site: <https://dibs.ravenhill.cl/bibliography/sites/> .
```

Then use:

```ttl
site:kotlin-docs
```

rather than:

```ttl
work:kotlin-docs
```

Reason: `work:*` is likely already overloaded for cited works, while `site:*` communicates that the node represents a
reusable website/container. A documentation site is a `CreativeWork`, but in the bibliography catalogue it plays a
different role from a cited page or article.

If adding a new prefix is too expensive for the current generator, use `work:kotlin-docs` temporarily but document that
it is a `schema:WebSite` node. The cleaner long-term target is `site:*`.

## Normalization contract

Extend `schema:WebPage` normalization to derive location data in this order:

1. `schema:isPartOf` pointing to a `schema:WebSite`;
2. `schema:publisher` pointing to `schema:Organization` or `schema:Person`;
3. hostname fallback from `schema:url`.

The normalized render-facing shape remains unchanged:

```ts
interface NormalizedWebReference {
    location?: string;
    locationUrl?: string;
    authors: NormalizedCreator[];
    publisherName?: string;
    publisherUrl?: string;
}
```

Recommended interpretation:

| Normalized field | Meaning after this change                                               |
| ---------------- | ----------------------------------------------------------------------- |
| `location`       | Human-visible source/container name, preferably from `isPartOf WebSite` |
| `locationUrl`    | URL of that source/container                                            |
| `publisherName`  | Actual publishing organisation/person name                              |
| `publisherUrl`   | URL of the actual publisher                                             |
| `authors`        | Page authors, unchanged                                                 |

This preserves compatibility while making the semantics clearer internally.

## Important design detail

Avoid mixing “location” and “publisher” in the resolver too early.

Recommended internal structure:

```ts
type WebPageSource = {
    name: string;
    url?: string;
    kind: "website" | "publisher" | "hostname";
};
```

Then map it to existing fields:

```ts
location = source.name;
locationUrl = source.url;
```

This keeps a future migration possible, for example renaming `location` to `sourceName` later without disturbing
rendering now.

## Implementation plan

### Cycle 1 — Add fixtures and lock current behaviour

Add minimal RDF fixtures for:

1. a web page with `schema:publisher`;
2. a web page with no publisher and only URL hostname fallback;
3. a web page with `schema:isPartOf` pointing to `schema:WebSite`.

Expected behaviour:

- publisher-backed pages still render location as before;
- hostname fallback still works;
- `isPartOf WebSite` takes precedence when present.

### Cycle 2 — Extend catalogue parsing

Update RDF/catalog extraction so `schema:isPartOf` relationships are available to the WebPage normalizer.

Implementation details:

- resolve the object of `schema:isPartOf`;
- load its `schema:name`;
- load its `schema:url`;
- only treat it as source location if the referenced node is typed as `schema:WebSite`;
- ignore unrelated `isPartOf` targets for now, or leave them available but do not use them for `location`.

This avoids accidentally treating a book chapter’s parent book, article series, or arbitrary `CreativeWork` as a web
“location”.

### Cycle 3 — Normalize WebPage source location

Update WebPage normalization to compute source location through an explicit helper:

```ts
function resolveWebPageLocation(input: {
    isPartOfWebsite?: {
        name: string;
        url?: string;
    };
    publisher?: {
        name: string;
        url?: string;
    };
    pageUrl?: string;
}): {
    location?: string;
    locationUrl?: string;
};
```

Resolution order:

```txt
isPartOf WebSite → publisher → hostname
```

Keep publisher normalization separate:

```txt
publisherName / publisherUrl still come only from schema:publisher
```

This is the key compatibility point: a `WebSite` source should not populate `publisherName`.

### Cycle 4 — Migrate Kotlin documentation nodes

Move documentation-site nodes out of `02-organizations.ttl`.

Create, for example:

```txt
src/data/bibliography/03-sites.ttl
```

or use an existing works/sites file if the project already has one.

Add:

```ttl
site:kotlin-docs
    a schema:WebSite ;
    schema:name "Kotlin docs" ;
    schema:url <https://kotlinlang.org/docs/> .
```

Then update Kotlin documentation references:

```ttl
schema:isPartOf site:kotlin-docs .
```

Remove or stop using:

```ttl
org:kotlin-docs
org:kotlin-help
```

If `org:jetbrains` already exists, keep it as the real publisher when useful. If it does not exist, only add it when the
citation benefits from publisher information. Do not add it just to preserve `location`.

### Cycle 5 — Regenerate and verify visible stability

Regenerate the bibliography catalogue:

```bash
pnpm generate:bibliography-catalog
```

Then verify:

- Kotlin documentation references still visibly show “Kotlin docs” or the current expected source text;
- `publisherName` is absent unless `schema:publisher org:jetbrains` is explicitly present;
- no generated references point to `org:kotlin-docs` or `org:kotlin-help`.

## Test plan

### Catalogue-core tests

Add tests for:

```txt
WebPage + isPartOf WebSite
```

Expected:

```ts
expect(reference.location).toBe("Kotlin docs");
expect(reference.locationUrl).toBe("https://kotlinlang.org/docs/");
expect(reference.publisherName).toBeUndefined();
```

Add precedence test:

```txt
WebPage + isPartOf WebSite + publisher Organization
```

Expected:

```ts
expect(reference.location).toBe("Kotlin docs");
expect(reference.publisherName).toBe("JetBrains");
```

Add fallback regression:

```txt
WebPage + publisher only
```

Expected:

```ts
expect(reference.location).toBe(existingPublisherName);
expect(reference.publisherName).toBe(existingPublisherName);
```

Or, if you decide to separate publisher from location more strictly even for old data, explicitly document and test that
compatibility choice.

Add fallback hostname test:

```txt
WebPage + url only
```

Expected:

```ts
expect(reference.location).toBe(hostname);
```

### Data migration tests

Add generated-data or fixture checks that ensure:

- `site:kotlin-docs` exists and is typed as `schema:WebSite`;
- Kotlin web pages use `schema:isPartOf site:kotlin-docs`;
- no `org:kotlin-docs` or `org:kotlin-help` node remains in `02-organizations.ttl`;
- no Kotlin docs page uses `schema:publisher org:kotlin-docs`.

### Render tests

Add or update render tests so the visible output remains stable:

- Kotlin docs page still shows the same source/location text;
- publisher text does not appear as a fake organisation when only `isPartOf` is present;
- references with real publishers still render publisher metadata correctly.

## Validation commands

Run focused tests first:

```bash
pnpm test:unit -- src/lib/bibliography
pnpm generate:bibliography-catalog
pnpm test:astro -- src/components/references
```

Then run the full quality gate:

```bash
pnpm check
```

If generated files change, inspect the diff before committing:

```bash
git diff -- src/data/generated
```

## Acceptance criteria

The change is complete when:

- documentation sites are represented as `schema:WebSite`, not `schema:Organization`;
- Kotlin documentation pages use `schema:isPartOf` for their site/container;
- `schema:publisher` remains reserved for real `Person` or `Organization` publishers;
- `NormalizedWebReference` keeps its current public shape;
- `location` and `locationUrl` can be derived from `isPartOf WebSite`;
- legacy publisher-based references continue to render as before;
- visible output for Kotlin documentation references is unchanged or intentionally improved;
- generated bibliography output is consistent;
- focused bibliography tests and `pnpm check` pass.

## Risks and mitigations

### Risk: `location` becomes semantically overloaded

Mitigation: internally resolve a `WebPageSource` object with a `kind`, then map to `location` only at the render-facing
boundary.

### Risk: existing references depend on publisher fallback

Mitigation: keep fallback order `isPartOf WebSite → publisher → hostname` for now.

### Risk: arbitrary `isPartOf` links change rendering

Mitigation: only use `isPartOf` as location when the target is explicitly typed as `schema:WebSite`.

### Risk: generated catalogue changes are noisy

Mitigation: migrate only Kotlin docs first, regenerate once, and inspect generated diffs before broadening the
migration.

### Risk: duplicated `Kotlin docs` / `Kotlin Help` nodes

Mitigation: consolidate both into one canonical `site:kotlin-docs` node unless there is a real visible distinction in
the referenced pages.

## Suggested commit sequence

```txt
test: cover WebPage site location normalization
feat: support isPartOf WebSite bibliography sources
data: model Kotlin docs as a website source
test: lock Kotlin docs bibliography rendering
```

A good MR title would be:

```txt
Model documentation sites as WebPage sources
```

[1]: https://schema.org/isPartOf?utm_source=chatgpt.com "isPartOf - Schema.org Property"
[2]: https://schema.org/WebSite?utm_source=chatgpt.com "WebSite - Schema.org Type"
[3]: https://schema.org/publisher?utm_source=chatgpt.com "publisher - Schema.org Property"

## Implementation notes

- `site:kotlin-docs` now exists as a `schema:WebSite` node in the catalog source.
- `ref:kotlin-custom-scripting-tutorial` uses `schema:isPartOf site:kotlin-docs` and keeps JetBrains as the real publisher.
- WebPage normalization and the catalog builder both accept `WebSite` as the source/container path for visible location text.
