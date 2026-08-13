# Plan — Consolidate lesson authoring primitives and remove structural duplication

## Summary

Refactor the lesson-component APIs so that **shared components own their invariant structural markup**, while lesson
pages provide only the information that varies.

Target this authoring model:

```astro
<NotesSection
    id="h2-why" title="..."
    Icon={icons.Question}
>
    ...
</NotesSection>
```

rather than repeatedly encoding:

```astro
<NotesSection id="h2-why">
    <Heading
        slot="heading" headingLevel="h2"
        Icon={icons.Question}
    >
        ...
    </Heading>

    ...
</NotesSection>
```

Apply the same principle selectively to callouts, code-block captions, and citation context.

The objective is **not minimum source-code character count**. It is to establish one canonical implementation for each
recurring authoring convention so semantic or visual changes no longer require coordinated edits across every lesson.

The refactor must preserve rendered HTML semantics, heading hierarchy, stable fragment IDs, accessibility behavior,
citations, code-block behavior, and lesson content.

---

# Duplication inventory

## 1. Section scaffolding — highest-value duplication

Every main section repeats essentially the same contract:

```astro
<NotesSection id="...">
    <Heading
        slot="heading"
        headingLevel="h2"
        Icon={...}
    >
        ...
    </Heading>

    ...
</NotesSection>
```

This appears throughout the file with only three meaningful variations:

- section `id`;
- icon;
- heading text.

The current API leaks `NotesSection`'s internal composition into every consumer.

### Recommendation

Make `NotesSection` responsible for its ordinary heading.

Conceptually:

```ts
interface Props {
    id: string;
    title: string;
    Icon?: IconComponent;
}
```

with the component internally rendering the canonical H2.

The lesson becomes:

```astro
<NotesSection
    id="h2-surface" title="..."
    Icon={icons.Plugs}
>
    ...
</NotesSection>
```

### Important constraint

**Keep `id` explicit.**

Do not derive IDs from localized titles. Existing anchors may be bookmarked, externally referenced, or used by
table-of-contents code. Renaming identifiers such as `h2-surface` would be an observable behavior change and belongs
outside this refactor.

### Rich-heading escape hatch

Before designing one, audit all `NotesSection` call sites.

If every section title is plain text, use only `title: string`.

If genuine rich headings exist elsewhere, support exactly one escape hatch, for example a `heading` slot, while keeping
the common path concise.

Do not add speculative flexibility merely because it may someday be useful.

---

# Phase 1 — Move section invariants into `NotesSection`

## Goal

Make the common lesson-section structure expressible once and ensure every ordinary section receives the same semantic
heading contract automatically.

## Scope

Likely:

```text
src/layouts/NotesSection.astro
src/components/semantics/...
affected lesson .astro files
relevant component/render tests
```

Start with the supplied lesson, then migrate additional call sites only after confirming they conform to the same
abstraction.

## TDD cycle 1.1 — Characterize the current section contract

### Red

Add component-level BDD coverage:

> given a lesson section with an ID, title, and icon when the section is rendered then it exposes the same section
> anchor and H2 semantics as the current composition

Verify only observable behavior:

- section/heading ID relationship;
- `<h2>`;
- heading text;
- icon accessibility behavior;
- body slot.

Do not test Tailwind class lists unless they are part of an intentional visual contract.

### Green

Extend `NotesSection` with the smallest props needed to render its own heading.

### Refactor

Move the repeated `Heading`, `headingLevel="h2"`, and heading-slot wiring into `NotesSection`.

Keep the component focused; it should remain a section abstraction, not become a generic lesson-rendering engine.

## TDD cycle 1.2 — Migrate the lesson

### Red

Use the existing lesson render test to characterize stable:

- section IDs;
- heading levels;
- heading order.

### Green

Replace repeated manual `Heading` composition with `title` and `Icon` props.

The supplied lesson should no longer import `Heading` directly if it has no other use.

### Refactor

Remove dead imports and formatting noise.

## Acceptance criteria

- Every ordinary main section uses one canonical `NotesSection` API.
- No lesson call site repeats `headingLevel="h2"`.
- No lesson call site manually wires `slot="heading"` for the ordinary case.
- Existing IDs and heading semantics are unchanged.
- `NotesSection` remains small and cohesive.

---

# Phase 2 — Normalize titled component APIs

## Goal

Remove repetitive named-slot ceremony where components nearly always receive a simple textual title.

## Current duplication

Callouts repeatedly use:

```astro
<Important headingLevel="h3">
    <span slot="title">...</span>

    ...
</Important>
```

The same shape appears with `Tip` and `Warning`.

`KotlinBlock` similarly repeats:

```astro
<KotlinBlock ...>
    <span slot="title">...</span>
    <span slot="footer">
        ...
    </span>
</KotlinBlock>
```

throughout the page.

The common case is paying the syntactic cost of the exceptional rich-markup case.

## Design

Use **progressive API richness**:

```astro
<Important title="...">
    ...
</Important>
```

and:

```astro
<KotlinBlock
    code={...}
    title="..."
>
    <Fragment slot="footer">
        ...
    </Fragment>
</KotlinBlock>
```

while retaining a named title slot only when genuinely rich markup is needed:

```astro
<Important>
    <Fragment slot="title">
        ...rich markup...
    </Fragment>

    ...
</Important>
```

### Precedence contract

If supporting both prop and slot, define behavior explicitly.

Prefer making them **mutually exclusive** if Astro's typing/component contract can enforce or validate that cleanly.

Otherwise define:

```text
title slot > title prop
```

and cover it with a test.

Do not permit two ambiguous title sources without a contract.

---

## TDD cycle 2.1 — Add plain-title support

### Red

For each relevant shared primitive:

> given a textual title prop when the component renders then it produces the same title semantics as the current
> named-slot form

Do this first for the common underlying callout implementation if `Important`, `Tip`, and `Warning` already delegate to
one.

Do **not** implement the same title logic three times.

### Green

Add `title?: string` at the lowest shared abstraction that can correctly own the behavior.

For code blocks, do the equivalent at the shared code-block abstraction if Kotlin is only a language specialization.

### Refactor

Centralize title rendering.

## TDD cycle 2.2 — Preserve rich titles

### Red

Characterize an existing rich title containing inline components/icons.

### Green

Retain the named-slot path only as the richer alternative.

### Refactor

Migrate plain-title call sites to the prop form and leave genuinely structured titles as slots.

## Acceptance criteria

- Plain textual titles require no `<span slot="title">`.
- Rich titles remain expressible.
- Title rendering exists once per component family.
- No separate lesson-specific `ImportantWithTitle`, `TipWithTitle`, etc. wrappers are created.
- Rendered semantics remain unchanged.

---

# Phase 3 — Remove repeated heading-level policy from lesson callouts

## Goal

Encode the normal lesson callout heading level once rather than writing `headingLevel="h3"` at every call site.

The supplied file repeatedly provides `headingLevel="h3"` to all callout variants.

## Before implementation

Search the complete lesson corpus and classify callout usage by containing heading level.

Do **not** infer a universal rule from this one page.

## Preferred design

If lesson callouts consistently sit beneath H2 sections, make H3 the default:

```ts
headingLevel = "h3";
```

while retaining explicit override support where another hierarchy is required.

Then the common call site becomes:

```astro
<Warning title="...">
    ...
</Warning>
```

rather than:

```astro
<Warning headingLevel="h3">
    <span slot="title">...</span>
    ...
</Warning>
```

## Alternative

If callouts legitimately occur under several heading levels with no dominant semantic default, **keep the explicit
prop**. Removing a few repeated tokens is not worth making heading semantics implicit or incorrect.

## TDD cycle 3.1

### Red

DDT over all supported callout variants:

```text
Important
Tip
Warning
```

> given no explicit heading level when the callout appears in the canonical lesson context then its title uses H3

Also test one explicit override.

### Green

Move the default into the shared component implementation.

### Refactor

Delete redundant `headingLevel="h3"` call-site props.

## Acceptance criteria

- Heading semantics remain correct.
- Common lesson callouts do not repeat the default level.
- Nonstandard contexts can still explicitly select their required level.
- The default is implemented once.

---

# Phase 4 — Centralize repeated citation configuration

## Goal

Avoid repeating lesson-level reference infrastructure on every citation while not introducing hidden global state.

## Current duplication

Every `ReferenceCitation` receives the same:

```astro
readingsPath={libraryWhatIsReadings.readingsPath}
```

with only `referenceId` and displayed children changing.

That is configuration duplication: the path belongs to the lesson/reference source, not to each individual citation.

## First choice — improve the domain API if the repository supports it naturally

Audit `ReferenceCitation` and the readings data model.

If `referenceId` is globally unique or the citation component can safely receive a typed reading collection, redesign
the API around the actual abstraction rather than exposing its filesystem/path lookup mechanism.

For example, prefer conceptually:

```astro
<ReferenceCitation reference={libraryWhatIsReadings.references.someId}>
    ...
</ReferenceCitation>
```

over requiring consumers to know both:

```text
referenceId
readingsPath
```

if those values are two halves of one logical reference.

This would make the citation API less primitive-heavy and reduce invalid combinations, consistent with the project
guidelines.

## Conservative fallback

If changing the reference model would expand scope excessively, bind the repeated configuration once locally:

```ts
const citationContext = {
    readingsPath: libraryWhatIsReadings.readingsPath,
} as const;
```

and use:

```astro
<ReferenceCitation
    {...citationContext}
    referenceId="..."
>
```

This is less architecturally strong but still creates a single source for lesson-level citation configuration without
hidden state.

## Avoid

Do not:

- put mutable citation state in a module-global variable;
- create `LibraryWhatIsCitation.astro`;
- create one wrapper component per lesson;
- use `Astro.locals` as an implicit component context merely to save one prop.

Those solutions trade visible duplication for coupling and hidden dependencies.

## TDD cycle 4.1

### Red

Characterize citation resolution for one representative reference.

### Green

Introduce the smallest general representation that centralizes the readings context.

### Refactor

Migrate repeated call sites.

## Acceptance criteria

- The lesson-level readings source is declared once.
- Individual citations provide only information that genuinely varies.
- Invalid reference/context combinations are no easier to construct than before.
- Citation rendering and URLs remain unchanged.
- No lesson-specific wrapper proliferation is introduced.

---

# Phase 5 — Audit component specialization and shared implementation

## Goal

Ensure the apparent component families are actually sharing implementation rather than merely sharing naming
conventions.

The page imports:

```text
Important / Tip / Warning
KotlinBlock / KotlinInline
B / I
```

from family-level modules.

That is a good public taxonomy, but the plan should verify whether variant components duplicate implementation
internally.

## Scope

Inspect:

```text
components/ui/callouts/*
components/ui/code/*
components/ui/font/*
components/ui/list/*
components/ui/references/*
```

### Callouts

Prefer:

```text
semantic variant
      ↓
common Callout implementation
```

rather than three separately implemented container structures.

Conceptually:

```ts
type CalloutKind =
    | "important"
    | "tip"
    | "warning";
```

It is fine to retain:

```astro
<Important>
<Tip>
<Warning>
```

as ergonomic public adapters if each is a very thin specialization.

Do not force every author to write:

```astro
<Callout kind="important">
```

merely because there is one internal implementation. Internal DRY and authoring ergonomics are separate concerns.

### Code components

Likewise, `KotlinBlock` and `KotlinInline` should preferably specialize a language-independent code-rendering
implementation rather than duplicate rendering/highlighting logic.

## Testing

Use DDT across component variants for shared behavior rather than copying entire test suites.

For callouts, matrix-test:

```text
kind × title source × heading level
```

only where the same contract genuinely applies.

## Acceptance criteria

- Shared structural behavior has one implementation.
- Semantic variants remain easy to author.
- Tests of common behavior are data-driven.
- Variant-specific behavior receives focused tests only.
- No generic component becomes an untyped bag of style props.

---

# Phase 6 — Clean the lesson call site without converting prose to configuration

## Goal

Make the page read like a document assembled from semantic primitives rather than a verbose description of those
primitives' implementation protocols.

After the previous phases, the target structure should resemble:

```astro
<NotesLayout ...>
    <Fragment slot="abstract">
        ...
    </Fragment>

    <NotesSection
        id="..."
        title="..."
        Icon={...}
    >
        ...

        <Tip title="...">
            ...
        </Tip>
    </NotesSection>

    <NotesSection
        id="..."
        title="..."
        Icon={...}
    >
        ...

        <KotlinBlock
            code={...}
            title="..."
        >
            <Fragment slot="footer">
                ...
            </Fragment>
        </KotlinBlock>
    </NotesSection>

    <ConclusionsLayout>
        ...
    </ConclusionsLayout>
</NotesLayout>
```

The lesson should retain direct Astro markup for its heterogeneous body.

## Explicitly do **not** convert this into

```ts
const sections = [
    {
        id: "...",
        icon: ...,
        paragraphs: [...],
        callouts: [...],
        code: [...],
    },
];
```

followed by a generic renderer.

That would replace modest syntactic repetition with:

- a bespoke content schema;
- a generic dispatcher;
- weaker local type information for rich content;
- less natural authoring;
- more indirection;
- harder exceptional composition.

There is no evidence in the supplied code that such a content DSL would pay for itself.

## Likewise do not

Split every section into:

```text
WhySection.astro
BoundarySection.astro
SurfaceSection.astro
...
```

just to shrink the page.

The lesson body is cohesive declarative content. The `<500 lines` guideline should not incentivize fragmenting a single
document into arbitrary files; the guideline itself explicitly treats numerical limits as heuristics rather than
fragmentation targets.

---

# Phase 7 — Add structural regression assurance

## Goal

Ensure future lesson-authoring changes cannot reintroduce the duplicated protocols or change semantic output
accidentally.

## Component tests

Focus tests on the extracted primitives:

### `NotesSection`

DDT where useful for:

- explicit ID;
- title;
- icon/no icon;
- optional exceptional heading path, only if retained.

### Callouts

DDT across variants for:

- default heading;
- title prop;
- rich title slot;
- explicit heading override.

### Code blocks

Test:

- plain caption prop;
- rich caption fallback;
- footer slot;
- language specialization.

### Citations

Test:

- valid bound citation;
- missing/unsupported reference behavior if the component defines one.

## Page-level test

Keep only a lightweight composition test for the lesson:

> given the rendered lesson when its document structure is inspected then its stable section anchors and heading
> hierarchy remain unchanged

Do not snapshot the full page. Full-page snapshots would make normal editorial changes unnecessarily expensive.

## Static architecture checks

If the project already has ESLint/custom lint infrastructure, consider a small custom check only **after** migration if
duplication repeatedly returns.

Potential examples:

- discourage direct `Heading slot="heading"` inside `NotesSection`;
- discourage redundant default `headingLevel="h3"` on lesson callouts.

Do not build custom lint infrastructure solely for this refactor.

---

# Priority and expected value

| Priority       | Refactor                                              | Expected value                                                    |
| -------------- | ----------------------------------------------------- | ----------------------------------------------------------------- |
| **Required**   | `NotesSection` owns its normal heading                | Removes the largest repeated structural protocol                  |
| **High value** | Plain `title` API + rich-slot escape hatch            | Removes repeated wrapper markup across several component families |
| **High value** | Shared default callout heading, if corpus supports it | Centralizes semantic policy                                       |
| **High value** | Centralize citation context                           | Removes repeated configuration and invalid combinations           |
| **High value** | Verify variant components share internals             | Prevents implementation duplication beyond this page              |
| **Optional**   | Architectural lint against old patterns               | Useful only if regressions recur                                  |
| **Reject**     | Data-drive the entire lesson                          | Too much abstraction for heterogeneous content                    |
| **Reject**     | One component per lesson section                      | Artificial fragmentation                                          |

# Suggested execution order

1. **Inventory project-wide call sites** for `NotesSection`, callouts, `KotlinBlock`, and `ReferenceCitation`.
2. **Refactor `NotesSection`** and migrate the supplied page.
3. **Generalize title handling** at shared callout/code primitives.
4. **Default callout heading levels** only if the corpus confirms a stable rule.
5. **Reduce citation configuration duplication** using the strongest abstraction justified by the existing reference
   model.
6. **Inspect internal variant implementations** and consolidate any real implementation duplication.
7. **Remove obsolete imports/props/wrappers** from lesson pages.
8. Run focused tests, full checks, and production build.

## Minimum useful vertical slice

The smallest change with the best payoff is:

```text
NotesSection owns Heading
    +
title/Icon become section props
    +
lesson call sites migrate
```

That alone eliminates the most conspicuous repeated protocol while preserving the natural document-oriented Astro
authoring model.

I would stop after each subsequent phase and ask the same question: **did this remove knowledge duplication, or merely
reduce characters?** Only the former is worth abstracting. That distinction is particularly important here because rich
lesson markup is inherently repetitive at the syntactic level, and forcing all of it through data-driven renderers would
move the project away from the guidelines' preference for clear, cohesive abstractions.
