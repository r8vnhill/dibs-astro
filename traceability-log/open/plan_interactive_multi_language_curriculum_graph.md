# Plan — Interactive Multi-Language Curriculum Graph

Yes. I would revise the original plan around a **strict reusable-core / host-adapter / website-UI split**. The uploaded plan already separates domain/query logic from presentation, but some proposed core types still encode DIBS-specific assumptions such as fixed languages and `courseLessonId`.

There is also a very natural extraction point already present in the repository: `@ravenhill/content-core` describes itself as host-agnostic, publication-ready, and intended to eventually absorb reusable lesson/course-structure domain models. The root site already consumes it as a workspace package. ([GitHub][1]) I would therefore **promote that existing package into the separate repository**, rather than creating a competing `curriculum-core` abstraction immediately.

# Revised architecture

```text
┌─────────────────────────────────────────────────────────────┐
│ Separate repository                                         │
│ @ravenhill/content-core                                     │
│                                                             │
│ curriculum model                                            │
│ concepts / units / relations / facets                       │
│ validation                                                  │
│ traversal                                                   │
│ filtering                                                   │
│ graph projection                                            │
│ generic graph algorithms                                    │
│                                                             │
│ NO Astro                                                    │
│ NO React                                                    │
│ NO Cytoscape / ELK                                          │
│ NO DIBS languages                                           │
│ NO URLs or courseStructure                                  │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               │ public package API
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ DIBS website                                                │
│                                                             │
│ DIBS curriculum catalog                                     │
│ Kotlin / Python / Scala classifications                     │
│ courseStructure ↔ curriculum mapping                        │
│ planned/published policy                                    │
│ DIBS-specific presets                                       │
│                                                             │
│ presentation adapter                                        │
│        ↓                                                    │
│ React + Cytoscape + ELK                                     │
│ Astro route                                                 │
│ URL state                                                   │
│ accessible HTML view                                        │
│ DIBS styling                                                │
└─────────────────────────────────────────────────────────────┘
```

This also fits the site's existing architecture: DIBS already treats `src/domain` as framework-free, `src/application` as orchestration, presentation adapters as the bridge to UI-safe data, and Astro/React as UI surfaces. ([GitHub][2])

---

# What should be extracted now

| Capability                            | Separate library | DIBS website | Rationale                            |
| ------------------------------------- | :--------------: | :----------: | ------------------------------------ |
| Concept model                         |         ✓        |              | Generic curriculum semantics         |
| Curriculum-unit model                 |         ✓        |              | Reusable by any course               |
| Directed relations                    |         ✓        |              | Generic graph semantics              |
| Facets/classification                 |         ✓        |              | Generic filtering mechanism          |
| Graph validation                      |         ✓        |              | Independent of presentation          |
| Cycle detection                       |         ✓        |              | Domain invariant                     |
| Ancestor/descendant traversal         |         ✓        |              | Generic graph operation              |
| Subgraph selection                    |         ✓        |              | Generic                              |
| Facet filtering                       |         ✓        |              | Generic                              |
| Concept → treatments query            |         ✓        |              | Supports parallel material generally |
| Framework-neutral graph projection    |         ✓        |              | Useful to arbitrary renderers        |
| Kotlin/Python/Scala definitions       |                  |       ✓      | DIBS-specific ontology               |
| `main`/`companion`/`practical` policy |                  |       ✓      | Course policy                        |
| Published/planned policy              |                  |       ✓      | Course/site policy                   |
| DIBS lesson catalog                   |                  |       ✓      | Content                              |
| `courseStructure`                     |                  |       ✓      | Existing DIBS navigation model       |
| Stable-ID → URL resolution            |                  |       ✓      | Site routing                         |
| Cytoscape adapter                     |                  |  ✓ initially | Renderer-specific                    |
| ELK configuration                     |                  |       ✓      | Presentation decision                |
| React component                       |                  |       ✓      | Framework-specific                   |
| Astro page                            |                  |       ✓      | Host-specific                        |
| URL query parameters                  |                  |       ✓      | Host navigation policy               |
| Accessible HTML markup                |                  |       ✓      | Site presentation                    |
| Colors/style/badges                   |                  |       ✓      | Branding                             |
| Student progress                      |                  |       ✓      | Host application state               |

The key rule is:

> **The library knows what a curriculum graph means; the website knows what DIBS means and how DIBS wants to display it.**

---

# Milestone 1 — Freeze the reusable boundary

## Goal

Refactor the proposed domain before implementation so the external library does not accidentally acquire DIBS concepts in its first public API.

## Scope

Remove these from the reusable model:

```ts
type CurriculumLanguage =
    | "kotlin"
    | "python"
    | "scala"
    | "language-neutral";
```

and:

```ts
type CurriculumMaterialKind =
    | "main"
    | "companion"
    | "practical";
```

and especially:

```ts
courseLessonId?: string;
```

Those are all host concerns.

Instead, make classification extensible.

For example:

```ts
export type CurriculumFacets = Readonly<
    Record<string, readonly string[]>
>;
```

A generic unit could then be:

```ts
export type CurriculumUnit<
    Metadata = unknown,
> = Readonly<{
    id: string;
    title: string;
    conceptIds: readonly string[];
    facets: CurriculumFacets;
    metadata?: Metadata;
}>;
```

DIBS supplies:

```ts
const productTypesKotlin = {
    id: "product-types-kotlin",
    title: "Product types in Kotlin",
    conceptIds: ["product-types"],
    facets: {
        language: ["kotlin"],
        material: ["main"],
        status: ["planned"],
    },
};
```

Another course could instead use:

```ts
facets: {
    level: ["advanced"],
    format: ["lecture"],
    track: ["formal-methods"],
}
```

without modifying `content-core`.

### Acceptance criteria

`@ravenhill/content-core` can model a course containing no programming languages at all.

### Non-goals

No renderer, no Astro integration, no DIBS catalog.

---

# Milestone 2 — Promote `@ravenhill/content-core` to its own repository

## Goal

Turn the existing workspace proof-of-concept into the independent package boundary.

The current package is intentionally `private: true` but already describes itself as a reusable, host-agnostic package whose future direction is extraction of real domain logic. ([GitHub][1])

## Proposed repository structure

```text
content-core/
    src/
        curriculum/
            concept.ts
            unit.ts
            relation.ts
            graph.ts
            facets.ts

            validation/
                validate-curriculum.ts
                validate-acyclic.ts
                validate-references.ts

            queries/
                filter-curriculum.ts
                find-ancestors.ts
                find-descendants.ts
                find-concept-units.ts
                select-subgraph.ts

            projection/
                project-curriculum.ts

            index.ts

        index.ts

    package.json
    tsconfig.json
    README.md
    CHANGELOG.md
```

Keep modules small and functional; do not introduce `CurriculumGraphManager` or another stateful façade.

## Public API

Prefer explicit subpath exports:

```ts
import {
    filterCurriculum,
    findAncestors,
    type CurriculumGraph,
} from "@ravenhill/content-core/curriculum";
```

rather than exposing every internal module.

## Dependency policy

I would target **zero runtime dependencies for the first curriculum-core release**.

Graph traversal, filtering, cycle detection, grouping, and projection are all straightforward enough that pulling Cytoscape or another graph package into the domain would be counterproductive.

### Red

Contract-first specifications around the proposed public API:

* generic facets do not require predefined dimensions;
* graph construction rejects missing references;
* configured acyclic relation families reject cycles;
* filtering preserves original relation semantics;
* graph operations do not mutate caller-owned values.

### Green

Move only reusable logic.

### Refactor

Review exported vocabulary as if DIBS did not exist.

### Acceptance criteria

A tiny independent TypeScript consumer can install the package and build a curriculum graph without Astro, React, DIBS data, or browser APIs.

---

# Milestone 3 — Make relation semantics extensible

This is another place where I would generalize the original plan.

Rather than publishing:

```ts
type CurriculumRelationKind =
    | "prerequisite"
    | "companion"
    | "recommended"
    | "deepening";
```

as a permanently closed universe, use an extensible relation identifier:

```ts
export type CurriculumRelation<
    Kind extends string = string,
> = Readonly<{
    source: string;
    target: string;
    kind: Kind;
}>;
```

The reusable algorithms should take semantics as configuration.

For example:

```ts
findAncestors(graph, unitId, {
    relationKinds: ["prerequisite"],
});
```

and:

```ts
validateAcyclic(graph, {
    relationKinds: ["prerequisite"],
});
```

This avoids the library deciding that every curriculum in the world must recognize DIBS's exact four relationships.

DIBS can still define:

```ts
type DibRelationKind =
    | "prerequisite"
    | "companion"
    | "recommended"
    | "deepening";
```

inside the site.

### Acceptance criteria

A second course can introduce `"co-requisite"` or `"alternative"` without changing `content-core`.

---

# Milestone 4 — Keep course data entirely in DIBS

## Goal

Make DIBS a **consumer** of the library rather than a special mode inside it.

Keep:

```text
src/data/curriculum/
    concepts.ts
    units.ts
    relations.ts
    facets.ts
    index.ts
```

inside `dibs-astro`.

For example:

```ts
export const dibsFacets = {
    languages: [
        "kotlin",
        "python",
        "scala",
        "language-neutral",
    ],

    materialKinds: [
        "main",
        "companion",
        "practical",
    ],

    statuses: [
        "planned",
        "published",
    ],
} as const;
```

These are **data/configuration**, not reusable library types.

The same applies to the actual concept catalog:

```text
product-types
sum-types
variance
functor
monad
structured-concurrency
...
```

Those belong to DIBS because they are its syllabus.

### Acceptance criteria

Publishing a new DIBS lesson modifies the DIBS repository but does not require a `content-core` release.

That separation is essential.

---

# Milestone 5 — Add a DIBS-specific curriculum adapter

## Goal

Connect generic curriculum units to the site's existing navigation truth without leaking that mechanism into the external package.

`courseStructure` already owns stable IDs used by UI state and analytics, and those IDs are explicitly intended to remain stable even when titles or URLs change. ([GitHub][3])

Create something such as:

```text
src/infrastructure/adapters/
    DibCurriculumCatalogAdapter.ts
```

or, if it is purely composition rather than infrastructure:

```text
src/presentation/adapters/
    curriculum-bridge.ts
```

The mapping belongs here:

```ts
type DibCurriculumMetadata = Readonly<{
    courseLessonId?: string;
}>;
```

The adapter can resolve:

```text
curriculum unit
      │
      │ metadata.courseLessonId
      ▼
courseStructure
      │
      ├── href
      ├── published title
      └── navigation identity
```

The reusable package should never see `courseStructure`.

### Acceptance criteria

Changing DIBS routing conventions cannot break the `content-core` API.

---

# Milestone 6 — Move filtering semantics into the library, filter vocabulary into DIBS

There is a useful split here.

### `content-core` owns

Generic operations:

```ts
filterByFacets(...)
filterRelations(...)
findAncestors(...)
findDescendants(...)
findConnected(...)
selectSubgraph(...)
```

For example:

```ts
filterByFacets(graph, {
    language: ["kotlin", "scala"],
});
```

### DIBS owns

What those facets mean:

```text
language=kotlin
material=companion
status=published
topic=variance
```

and UI labels:

```text
Kotlin
Scala
Python

Principal
Complementario
Práctica
```

This is an excellent example of **mechanism versus policy**:

[
\text{library} = \text{filter mechanism}
]

[
\text{DIBS} = \text{filter policy and vocabulary}
]

---

# Milestone 7 — Keep URL state on the website

I would revise the original Phase 6 here.

These URLs:

```text
/roadmap/?languages=kotlin
/roadmap/?topic=variance
/roadmap/?lesson=monads-kotlin
```

belong to DIBS.

The external library should know nothing about:

* `/roadmap/`;
* URL parameters;
* browser history;
* `URLSearchParams`;
* Astro routes.

DIBS can implement:

```ts
parseCurriculumQuery(searchParams)
serializeCurriculumQuery(filter)
```

using the generic `CurriculumFilter` values returned by `content-core`.

If a second and third site eventually reproduce the exact same encoding problem, **then** extracting a web codec becomes justified.

Not before.

---

# Milestone 8 — Keep Cytoscape + ELK as a DIBS presentation adapter initially

This is the largest change I would make to the extraction strategy.

Do **not** initially create:

```text
@ravenhill/content-core-cytoscape
```

or:

```text
@ravenhill/curriculum-react
```

Instead keep:

```text
src/presentation/curriculum/
    to-cytoscape-elements.ts
    curriculum-layout.ts
    curriculum-styles.ts

src/components/curriculum/
    CurriculumExplorer.tsx
    CurriculumFilters.tsx
    CurriculumLegend.tsx

src/pages/
    roadmap.astro
```

inside DIBS.

The boundary is:

```text
content-core
    CurriculumGraph
          │
          ▼
DIBS presentation adapter
          │
          ▼
Cytoscape ElementDefinition[]
          │
          ▼
Cytoscape + ELK
```

This keeps a future renderer replacement cheap.

A different course site could immediately reuse `content-core` while choosing:

```text
React Flow
Mermaid
Graphviz
D3
plain HTML
native mobile UI
```

The core should not privilege Cytoscape.

---

# Milestone 9 — Accessible projection stays site-owned, semantics stay reusable

The **HTML rendering** remains in DIBS.

But generic grouping operations can live in the library:

```ts
groupUnitsByConcept(...)
groupUnitsByFacet(...)
```

DIBS turns that result into:

```html
<section>
    <h2>Product types</h2>
    ...
</section>
```

This avoids exporting HTML, JSX, Astro components, CSS class names, or Spanish UI text from the reusable package.

---

# Milestone 10 — Validate extraction with a second consumer

Before extracting any presentation package, create a deliberately small second consumer.

It does not have to be a complete second course. A fixture/example app is sufficient initially:

```text
examples/
    minimal-course/
```

or a genuinely separate course site when one is ready.

The second consumer should intentionally use **different facets**:

```ts
facets: {
    track: ["theory"],
    difficulty: ["advanced"],
    format: ["lecture"],
}
```

rather than Kotlin/Python/Scala.

That is the strongest architectural check that the library is genuinely generic rather than merely DIBS extracted into npm.

### Acceptance criteria

The second consumer:

* uses the same graph model;
* uses the same traversal/filtering functions;
* does not import anything named `Dibs`;
* does not need programming-language facets;
* does not use Astro;
* may use a completely different renderer.

---

# Milestone 11 — Only then consider a reusable visualization package

After two real sites use essentially the same Cytoscape integration, extract:

```text
@ravenhill/curriculum-cytoscape
```

as an **optional adapter package**.

Architecture would become:

```text
@ravenhill/content-core
        │
        │ framework-neutral
        ▼
@ravenhill/curriculum-cytoscape
        │
        │ renderer adapter
        ▼
site-specific React/Astro UI
```

Even then, I would keep React out of that adapter if practical.

For example:

```ts
createCytoscapeElements(graph)
createElkLayoutOptions(...)
```

could be reusable without requiring any UI framework.

Only if several sites also share the same React component should a third package such as:

```text
@ravenhill/curriculum-react
```

be considered.

That prevents premature package proliferation.

---

# Recommended repository ownership

I would therefore converge toward:

```text
ravenhill/content-core
│
└── @ravenhill/content-core
    ├── generic content abstractions
    └── curriculum
        ├── model
        ├── validation
        ├── traversal
        ├── filtering
        └── projection


r8vnhill/dibs-astro
│
├── DIBS course content
├── courseStructure
├── DIBS curriculum catalog
├── DIBS facets
├── content-core adapter
├── URL state
├── Astro route
├── React explorer
├── Cytoscape
├── ELK
└── visual/accessibility policy
```

This direction is also consistent with the current `content-core` design goal of using a **neutral identity instead of `course-core`**, remaining host-agnostic, and eventually extracting reusable lesson and course-structure domain models. ([GitHub][1])

# Revised execution order

I would change the original implementation sequence to:

```text
1. Generalize the proposed curriculum model
        ↓
2. Promote content-core to independent repository/package
        ↓
3. Implement generic curriculum domain in content-core
        ↓
4. Publish an initial prerelease
        ↓
5. Add DIBS curriculum catalog
        ↓
6. Add DIBS → content-core adapter
        ↓
7. Add DIBS presentation DTO
        ↓
8. Implement Cytoscape + ELK in DIBS
        ↓
9. Add URL-addressable filters in DIBS
        ↓
10. Add accessible DIBS representation
        ↓
11. Exercise content-core with a second consumer
        ↓
12. Evaluate extraction of Cytoscape adapter
```

The strongest rule I would establish for the entire effort is:

> **If a piece of code needs to know that the course is DIBS, that Kotlin is the main language, that `/roadmap/` exists, or that Astro/Cytoscape is being used, it does not belong in `@ravenhill/content-core`.**

Conversely, concepts such as **curriculum units, concepts, typed relationships, facets, DAG invariants, traversal, filtering, and subgraph projection are reusable educational-domain abstractions** and are excellent candidates for the independent library. This gives you a genuinely reusable component rather than simply moving DIBS implementation code into another repository.

[1]: https://github.com/r8vnhill/dibs-astro/tree/main/packages/content-core "dibs-astro/packages/content-core at main · r8vnhill/dibs-astro · GitHub"
[2]: https://github.com/r8vnhill/dibs-astro/blob/main/docs/architecture/layer-separation.md "dibs-astro/docs/architecture/layer-separation.md at main · r8vnhill/dibs-astro · GitHub"
[3]: https://github.com/r8vnhill/dibs-astro/blob/main/src/data/course-structure.ts "dibs-astro/src/data/course-structure.ts at main · r8vnhill/dibs-astro · GitHub"
