# Plan — Integrate Research-Backed Content and Catalog-Backed Readings for “La biblioteca como artefacto de software”

## Summary

Revise **“La biblioteca como artefacto de software”** using the researched version of the lesson and introduce the
minimum reusable infrastructure needed to support **inline academic citations that resolve to a lesson-specific readings
page**.

Preserve the lesson's pedagogical progression:

```text
biblioteca
    ↓
frontera
    ↓
consumidor
    ↓
superficie
    ↓
contrato
    ↓
encapsulación / ocultamiento de información
    ↓
comportamiento observable
    ↓
compatibilidad y estabilidad
```

Move bibliographic listings out of the lesson itself and expose them through:

```text
/readings/
/readings/software-libraries/what-is/
```

The architecture should establish four distinct responsibilities:

```text
Bibliographic catalog
    │
    │ canonical bibliographic metadata
    ▼
Lesson readings configuration
    │
    │ selection, grouping, editorial notes
    ▼
Readings page
    │
    │ stable reference targets
    ▼
Inline lesson citations
```

A citation should therefore never duplicate bibliographic metadata, and the bibliography renderer should never become
responsible for lesson prose.

---

# Phase 1 — Establish the citation and readings domain model

## Goal

Define a single, stable identity model connecting catalog references, lesson citations, readings-page entries, and
generated HTML targets.

## Scope

Before changing the lesson, characterize the existing:

- bibliographic catalog;
- reference IDs;
- reference renderer;
- Turtle usage/provenance representation;
- generated bibliographic artifacts;
- existing lesson reference presentation.

Introduce only the minimum pure helpers necessary for reference identity and routing.

### Stable reference identity

Use the **catalog reference ID as the canonical identity**.

Do not derive identity from:

- author names;
- publication years;
- titles;
- rendered APA strings.

Those values can change editorially.

Conceptually:

```text
referenceId
    ↓
stable anchor
    ↓
internal citation URL
```

For example:

```text
parnas-decomposing-systems-1972
    ↓
ref-parnas-decomposing-systems-1972
    ↓
/readings/software-libraries/what-is/#ref-parnas-decomposing-systems-1972
```

### Anchor helper

Prefer a small pure helper such as:

```ts
referenceAnchor(referenceId);
```

If catalog IDs already satisfy the project's slug rules, the helper should simply validate and prefix them rather than
implement another general-purpose slugification algorithm.

This avoids collision-prone transformations such as converting arbitrary titles into slugs.

If existing catalog IDs may contain unsupported HTML-ID characters, define one canonical normalization rule and add
**catalog-wide collision validation**.

### Citation URL helper

A second pure function may compose the page path and anchor:

```ts
referenceCitationHref(readingsPath, referenceId);
```

Keep routing separate from anchor identity.

### Avoid prematurely making helpers public

The original plan calls the helper “public.” I would not expand the site's public component/library API unless another
subsystem actually needs it.

Start with an internal references-domain module, for example conceptually:

```text
src/lib/references/reference-links.ts
```

and promote it only if a real external API boundary exists.

## Red

Add focused tests describing:

```text
given the same reference ID
when its anchor is generated repeatedly
then the same anchor is produced
```

```text
given two distinct catalog reference IDs
when anchors are generated for the published catalog
then their anchors are unique
```

```text
given a readings path and reference ID
when a citation URL is generated
then it points to that reference's stable anchor
```

Prefer a **catalog-wide uniqueness test** over attempting to mathematically prove collision freedom for arbitrary
strings.

## Green

Implement the smallest pure reference-link helpers.

## Refactor

Keep:

- reference identity;
- route composition;
- rendered components;

as separate concerns.

## Acceptance criteria

- every published catalog reference has one deterministic anchor;
- all generated anchors are unique across the catalog;
- anchors do not depend on mutable bibliographic presentation fields;
- no duplicate anchor-generation logic exists in components;
- existing pages remain unchanged.

## Non-goals

- migrating other lessons;
- generalized URL routing infrastructure;
- replacing the bibliographic catalog;
- changing reference IDs without a demonstrated need.

---

# Phase 2 — Add reusable inline citation and reference-target support

## Goal

Allow lesson prose to link semantically to a specific catalog reference without duplicating bibliographic information.

## Scope

Add:

```text
ReferenceCitation.astro
```

and extend the existing catalog reference renderer with stable targets.

### `ReferenceCitation.astro`

Suggested contract:

```text
referenceId: required
readingsPath: required or inherited from lesson-level configuration
slot: visible citation text
```

Example lesson usage:

```astro
<ReferenceCitation referenceId="parnas-decomposing-systems-1972" readingsPath="/readings/software-libraries/what-is/">
    Parnas (1972)
</ReferenceCitation>
```

I would **not make the reusable component default specifically to this lesson's path**. That couples a general citation
component to its first consumer.

If repeated `readingsPath` arguments make lesson markup noisy, solve that at a lesson/page composition boundary rather
than hiding a lesson-specific route inside the generic component.

For example, a later abstraction could provide citation context, but only introduce it if repetition becomes material.

### Accessibility

Do not require an `aria-label` merely because the element is a citation. The visible author/year text already gives the
link an accessible name.

Add extra accessible text only when it communicates information unavailable from the visible citation.

The relevant test should therefore be:

> the citation exposes an understandable accessible name

rather than:

> the component contains an `aria-label`.

### `ReferencesFromCatalog`

Extend the existing renderer without changing existing call sites.

Each rendered reference should receive:

```html
id="ref-<canonical-reference-id>"
```

The anchor is additional rendering behavior, not a change to bibliographic metadata.

## Red

Test:

- citation `href`;
- visible citation text;
- accessible link name;
- stable reference IDs in rendered catalog entries;
- uniqueness of IDs within a reference list;
- unchanged grouping of recommended/additional references.

Add a characterization test for an existing page before changing `ReferencesFromCatalog`.

## Green

Implement the component and target IDs.

## Refactor

Avoid embedding:

- APA rendering;
- reference metadata;
- catalog lookup logic;

inside `ReferenceCitation`.

It should remain a lightweight semantic link.

## Acceptance criteria

- an inline citation resolves to the correct internal target;
- each reference target occurs exactly once on its readings page;
- existing consumers of `ReferencesFromCatalog` require no migration;
- citation markup does not duplicate bibliographic metadata;
- accessibility tests use observable semantics rather than implementation details.

## Non-goals

- automatically generating prose citations from authors;
- citation-style formatting engines;
- footnotes;
- hover previews.

---

# Phase 3 — Model lesson-specific reading selections without polluting the catalog

## Goal

Keep canonical bibliography and lesson-specific editorial guidance separate while allowing both to render together.

## Scope

Introduce a small lesson-readings configuration.

Conceptually:

```ts
type LessonReading = Readonly<{
    referenceId: ReferenceId;
    note?: string;
}>;

type LessonReadings = Readonly<{
    lessonPath: string;
    readingsPath: string;
    title: string;
    recommended: readonly LessonReading[];
    additional: readonly LessonReading[];
}>;
```

The precise representation should match the project's existing content architecture.

### Responsibility boundary

The **catalog owns**:

- authors;
- year;
- title;
- publication/container;
- edition;
- URL/DOI;
- bibliographic type;
- other canonical publication metadata.

The **lesson readings configuration owns**:

- whether a work is used in this lesson;
- recommended vs. additional classification;
- lesson-specific explanation;
- chapter/section recommendation when pedagogically relevant.

For example:

```text
Catalog:
Ousterhout, John K.
A Philosophy of Software Design
2nd edition
2021
...

Lesson readings:
Recommended
Chapters 4–5: useful for deep modules and information hiding.
```

The editorial note must **not** become global bibliographic metadata because another lesson may recommend a different
chapter or emphasize a different concept from the same book.

### Chapter-level recommendations

For books, preserve the research requirement that recommendations should identify specific chapters whenever possible.

Examples from the researched lesson include conceptually:

```text
Bloch — Chapter 4, especially Item 15
Ousterhout — Chapters 4–5
Winters et al. — Chapter 1, Hyrum's Law
JLS — Chapter 13
```

Store that pedagogical guidance in lesson-readings metadata, not by modifying the canonical book title.

## Red

Add DDT ensuring:

- every configured `referenceId` exists in the catalog;
- no reference appears twice within the same readings page unless explicitly supported;
- recommended/additional membership is deterministic;
- lesson metadata can add an editorial note without changing catalog metadata.

## Green

Implement the configuration model for this lesson only.

## Refactor

Extract common configuration machinery only if another readings page actually needs it.

## Acceptance criteria

- bibliographic metadata exists in one place;
- lesson-specific editorial notes exist in one place;
- every lesson reading resolves to an existing catalog record;
- a reference can later be reused by another lesson with different editorial guidance;
- chapter-specific reading guidance is preserved.

## Non-goals

- designing the final data model for every future course;
- storing lesson prose in the bibliography;
- duplicating APA entries in lesson configuration.

---

# Phase 4 — Create the lesson-specific readings page and readings index

## Goal

Publish a complete, navigable destination for every citation in the revised lesson.

## Scope

Create:

```text
/readings/software-libraries/what-is/
/readings/
```

### Lesson-specific page

The page should contain:

1. lesson title;
2. concise explanation of the page's purpose;
3. link back to the lesson;
4. **Recommended readings**;
5. **Additional references**;
6. catalog-rendered bibliography;
7. lesson-specific editorial notes;
8. stable targets for every reference.

Do not repeat a separate manually maintained APA bibliography.

### `/readings/` index

The index should list available readings pages using structured metadata rather than duplicate their titles/paths
manually in multiple places.

For the first iteration:

```text
Readings
└── La biblioteca como artefacto de software
    └── /readings/software-libraries/what-is/
```

Prefer deriving this listing from the same minimal readings-page registry/configuration used to generate or describe the
lesson-specific page.

That avoids a future pattern where adding a readings page requires editing:

- the page;
- the index;
- another navigation registry.

### Keep readings auxiliary

Do not place these routes into the sequential lesson hierarchy.

They are **reference resources**, not new lessons.

## Red

Test:

```text
given the lesson readings configuration
when the readings page renders
then every configured reference appears in its declared section
```

```text
given a published readings page
when the readings index renders
then the page appears exactly once with the correct route
```

## Green

Implement both routes.

## Refactor

Extract shared layout only where it represents genuine common page structure.

## Acceptance criteria

- both static routes are generated;
- every configured reference appears exactly once;
- recommended and additional readings remain distinct;
- every reference has the stable canonical anchor;
- lesson-specific notes render next to the correct catalog reference;
- `/readings/` links correctly to the lesson-specific page;
- the lesson is linked back from the readings page;
- the pages remain outside lesson sequencing/navigation.

## Non-goals

- search;
- filtering;
- tags;
- pagination;
- automatically generated reading recommendations.

---

# Phase 5 — Update the bibliographic catalog and provenance

## Goal

Ensure every academic claim newly attributed in the revised lesson resolves to canonical bibliographic metadata and
existing generation/provenance mechanisms.

## Scope

Activate or add the references required by the revised lesson, including the sources supporting:

- information hiding;
- API accessibility and surface design;
- Hyrum's Law;
- Design by Contract;
- Semantic Versioning;
- Kotlin visibility and Explicit API mode;
- source/binary compatibility;
- JVM binary compatibility;
- behavioral compatibility where cited.

### Important constraint

Do **not** copy the complete APA citation strings from the researched lesson into page source.

Represent each work using the existing bibliographic catalog's structured fields and allow the established renderer to
produce its APA representation.

### Turtle/provenance updates

Update this lesson's reference-use relations using the existing vocabulary.

Prefer explicit relationships corresponding to actual use rather than merely declaring that every reading is associated
with the lesson.

If the current model distinguishes:

- cited;
- recommended;
- background/supporting;

preserve those distinctions.

If it does not, do not expand the ontology merely for this page unless the distinction is needed elsewhere.

### Generated artifacts

Use only the repository's generation workflow:

```text
canonical source
    ↓
generator
    ↓
derived artifacts
```

Never hand-edit generated outputs.

## Red

Add or extend validation proving:

- all lesson reference IDs exist;
- generated catalog artifacts contain the selected works;
- no configured reference resolves ambiguously;
- required fields for APA rendering are present.

## Green

Add/activate catalog records and Turtle usages.

Regenerate derived artifacts.

## Refactor

Remove obsolete duplicated lesson-local bibliographic data once the generated representation is authoritative.

## Acceptance criteria

- all lesson citations resolve to catalog records;
- APA output is catalog-generated;
- chapter recommendations are preserved in lesson-specific metadata;
- provenance/usage metadata includes this lesson;
- generated files reproduce cleanly from canonical sources;
- `git diff` contains no unexplained hand-edits to generated artifacts.

## Non-goals

- bibliographic cleanup unrelated to this lesson;
- changing citation style globally;
- reworking the Turtle ontology without demonstrated need.

---

# Phase 6 — Migrate and improve the lesson content

## Goal

Replace the current lesson with the researched revision while preserving its teaching progression and existing
presentation vocabulary.

## Scope

Apply the revised Spanish content while preserving:

- Spanish explanatory prose;
- English code identifiers;
- existing Astro heading/callout components;
- Kotlin code-block components;
- conclusions layout;
- key-points layout;
- closing reflection.

The revised lesson should explicitly teach:

1. **implementation / API / consumer boundary**;
2. **API surface**;
3. **supported API vs. merely accessible elements**;
4. **API contract**;
5. **API contract vs. Design by Contract**;
6. **encapsulation vs. information hiding**;
7. **supported contract vs. accidentally observable behavior**;
8. **Hyrum's Law**;
9. **source compatibility**;
10. **binary compatibility**;
11. **behavioral compatibility**;
12. **stability as an evolution commitment rather than immutability**.

### Inline citations

Replace author/year references with `ReferenceCitation`.

For example:

```astro
<ReferenceCitation referenceId="parnas-decomposing-systems-1972" readingsPath="/readings/software-libraries/what-is/">
    Parnas (1972)
</ReferenceCitation>
```

Do not turn every technical keyword into a citation.

Cite where attribution or external support contributes meaningfully:

- historical definitions;
- named principles;
- claims about API evolution;
- ecosystem-specific recommendations;
- formal compatibility specifications.

### Preserve pedagogical density

Do not allow the research additions to turn the introductory lesson into a bibliography survey.

In particular:

- introduce source/binary/behavioral compatibility briefly;
- defer detailed compatibility mechanics;
- explain Hyrum's Law with one concrete implication;
- use Design by Contract only to clarify terminology;
- keep information hiding tightly connected to library evolution.

## Red

Add lesson-level structural tests before replacing the content:

- required conceptual sections exist;
- no bibliography section is rendered;
- every inline citation resolves to the configured readings page.

## Green

Apply the revised lesson.

## Refactor

Reduce repetitive explanations and ensure each section introduces one main distinction.

## Acceptance criteria

- pedagogical order remains recognizable;
- all required conceptual distinctions appear;
- citations are linked through the shared citation component;
- no raw bibliographic URL appears in lesson prose;
- no rendered bibliography remains at the lesson bottom;
- lesson examples retain English identifiers;
- published prose remains Spanish;
- the intended content changes are reviewed separately from infrastructure changes.

## Behavior note

This phase intentionally changes **educational content**.

It must not unintentionally change:

- unrelated lesson routes;
- existing citation APIs;
- reference rendering on other lessons;
- course navigation semantics.

---

# Phase 7 — Add end-to-end citation-integrity assurance

## Goal

Prove that the complete citation graph is internally consistent before static publication.

## Scope

Prefer a **domain-level integrity test** plus a small rendered integration test.

### Citation graph invariant

The strongest test is not merely:

> does the HTML contain an anchor?

It is:

```text
lesson citation
    ↓
known readings page
    ↓
configured reference
    ↓
existing catalog record
    ↓
unique rendered target
```

Add an integrity check asserting for every citation in this lesson:

- the reference exists in the catalog;
- it is declared for this readings page;
- its target anchor is unique;
- the generated href points to that target.

This catches errors earlier and produces better diagnostics than a generic broken-link crawler alone.

### Rendered/static checks

Still verify the final HTML to cover integration:

- `/readings/` exists;
- lesson-specific readings page exists;
- target IDs appear in final output;
- lesson citations contain the expected URLs;
- back-navigation is valid;
- headings and landmarks remain structurally sensible.

## Red

Introduce deliberately unresolved fixture data and prove the integrity check detects:

- missing catalog reference;
- reference omitted from readings configuration;
- duplicate reference;
- duplicate target;
- incorrect readings route.

## Green

Implement the integrity validator.

## Refactor

Keep it pure where possible so it can later validate additional lessons cheaply.

## Acceptance criteria

- unresolved citations fail before deployment;
- catalog/readings mismatches provide actionable diagnostics;
- final generated HTML contains every expected target;
- no internal citation introduced by this work is broken;
- existing accessibility and visual suites remain green.

---

# Final verification

Use narrow tests during TDD cycles and progressively broaden them:

```text
Red/Green
→ affected unit/component test

Refactor
→ affected test group + typecheck

Phase completion
→ tests + lint + formatting

Milestone completion
→ complete project verification/build
```

Also verify explicitly that:

- no lesson-local APA bibliography remains;
- no raw external bibliography URLs were introduced into lesson prose;
- no bibliographic metadata is duplicated in readings configuration;
- every lesson-specific editorial note points to an existing reference;
- generated bibliographic artifacts contain no manual modifications;
- static output contains both `/readings/` routes and all cited anchors.

---

# Explicit non-goals

This work does **not** include:

- migrating references for every existing lesson;
- changing the public contract of existing inline-reference components;
- redesigning the whole bibliographic catalog;
- replacing the current APA renderer;
- introducing footnotes;
- adding citation hover cards;
- adding readings search/filtering;
- changing lesson navigation to include readings pages;
- broad bibliography cleanup unrelated to this lesson.

---

# Suggested execution order

```text
Phase 1 — Stable citation identity
    ↓
Phase 2 — Citation + target components
    ↓
Phase 3 — Lesson readings model
    ├────────────────┐
    ↓                ↓
Phase 4          Phase 5
Readings pages   Catalog/provenance
    └───────┬────────┘
            ↓
Phase 6 — Lesson migration
            ↓
Phase 7 — End-to-end integrity
```

The **minimum useful vertical slice** is:

```text
one catalog reference
→ one lesson-readings entry
→ one rendered target
→ one inline citation
→ one passing integrity test
```

I would implement that slice first with **Parnas (1972)** before bulk-migrating the rest. It validates the entire
architecture with one reference and keeps the early Red–Green–Refactor cycles small.

A final adjustment I strongly recommend is renaming the initiative from the generic **“Revisión de la lección y
referencias externas”** to something that captures the architectural outcome, such as:

> **Research-Backed Lesson Content and Catalog-Backed Readings**

or, if the plan title itself should remain in Spanish:

> **Integración de contenido fundamentado y lecturas respaldadas por el catálogo**

That makes it clearer that this is not just an editorial revision: it introduces a reusable **citation → readings →
catalog** contract.
