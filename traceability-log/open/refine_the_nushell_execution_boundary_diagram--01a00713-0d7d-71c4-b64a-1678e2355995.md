# Refine the Nushell Execution-Boundary Diagram

## Summary

Rework the diagram and its surrounding explanation so the mental model is both **pedagogically clearer** and
**technically more precise**, while preserving the existing lesson structure, shared Mermaid rendering pipeline, and
card/lifeline presentation.

The main semantic correction is to distinguish three different ideas that are currently too compressed:

1. **internal Nushell composition**: structured Nu values flow between internal commands;
2. **process-boundary transport**: values cross into an external process through `stdin`, and output returns through
   `stdout`;
3. **optional reconstruction of structure**: external output does not automatically become a structured Nu value merely
   because it re-enters Nushell.

The project guidelines prioritize correctness and semantic clarity before aesthetics, and recommend focused changes as
short TDD cycles with observable behavior, explicit scope, acceptance criteria, and appropriate testing strategies. They
also require considering BDD, DDT, PBT, differential, metamorphic, mutation, fuzzing, and test doubles according to the
defect classes they can actually expose.

Do not introduce a new diagram library or lesson-specific rendering mechanism. This should remain a content +
shared-diagram refinement.

---

# TDD Cycle 1 — Correct the execution model before changing the visual design

## Goal

A student reading the prose and diagram should come away with this mental model:

> **Dentro de Nushell, los comandos internos pueden intercambiar valores estructurados. Al cruzar hacia un proceso
> externo, la información debe representarse mediante la interfaz de `stdin`/`stdout`. Al volver a Nu, recuperar
> estructura requiere una interpretación explícita del formato cuando corresponda.**

The diagram must no longer imply that `stdout` is automatically parsed back into an arbitrary structured Nu value.

## Scope

Update the lesson section:

```text
Un modelo mental para esta lección
```

and the Mermaid source for the corresponding execution-boundary diagram.

Keep:

- the “modelo mental” framing;
- the Sorva reference;
- the two participants, `Nushell (interno)` and `Proceso externo`;
- the distinction between internal and external execution;
- the surrounding lesson flow.

Do not attempt to document Nushell internals beyond what is needed for this teaching model.

## Red

Add the smallest BDD-style lesson/content regression test supported by the current documentation test infrastructure.

The important observable semantics are:

```text
given the execution-boundary lesson section
when its rendered content is inspected
then it distinguishes stdout re-entry from explicit structured interpretation
```

and:

```text
given the process-boundary diagram
when it is rendered
then it does not describe stdout as automatically producing a structured Nu value
```

Avoid snapshotting the entire paragraph.

If the current test suite already has helpers for asserting lesson headings, diagram labels, or rendered prose
fragments, reuse them instead of introducing a specialized content-test framework.

## Green

Replace the current wording around `stdout` with a more precise explanation.

Suggested lesson prose:

> `Cuando el pipeline cruza hacia un proceso externo —un ejecutable compilado o un comando del sistema—, el valor debe transformarse en una representación que pueda entregarse por stdin. Lo que vuelve por stdout cruza nuevamente esa frontera como datos del proceso externo, no como la estructura Nushell original. Si queremos recuperar una estructura concreta, debemos interpretarla explícitamente según el formato de salida, por ejemplo con from json, from csv o parse.`

Then replace:

> `parseo (bytes/texto → valor)`

with two distinct concepts:

```text
entrada a Nu
```

followed, when useful:

```text
interpretación explícita
p. ej. from json / from csv / parse
```

Avoid saying:

```text
binary → structured value
```

as a universal transformation. The pedagogical point is that interpretation depends on the actual format and command.

## Refactor

Make the vocabulary consistent across prose and diagram:

```text
valor estructurado
proceso externo
stdin
stdout
representación
interpretación explícita
```

Do not alternate among `parseo`, `decodificación`, `conversión`, and `interpretación` unless each denotes a genuinely
different operation.

This follows the project requirement for a uniform taxonomy across code, documentation, diagrams, and tests.

## Acceptance criteria

- the lesson no longer implies automatic restoration of structured values after `stdout`;
- internal Nu composition remains described as value-oriented;
- the process boundary remains explicit;
- structured interpretation is clearly optional and format-dependent;
- prose and diagram use the same terminology;
- existing lesson references remain intact;
- no unrelated lesson content changes.

## Non-goals

Do not:

- explain Nushell's complete pipeline internals;
- turn the section into an operating-systems lecture;
- add implementation details not needed by the mental model;
- introduce a general terminology abstraction for all lessons.

---

# TDD Cycle 2 — Give the diagram one consistent visual grammar

## Goal

Students should be able to infer the meaning of a visual element before reading every label.

Use the visual grammar:

```text
participant card   = execution context
lifeline           = where activity occurs
horizontal arrow   = data crossing a boundary
arrow label        = channel + representation
attached note      = fact/transformation local to one context
```

This removes the current ambiguity around `stdin` and the self-loops.

## Scope

Modify only the diagram source unless a shared renderer defect is uncovered.

Preserve the two participant cards.

### Target structure

Conceptually:

```text
Nushell (interno)                         Proceso externo
       │                                         │
       │  [nota: comandos internos               │
       │   intercambian valores]                 │
       │                                         │
       │──── stdin: representación ─────────────▶│
       │                                         │
       │◀─── stdout: datos del proceso ─────────│
       │                                         │
       │  [nota: interpretación explícita        │
       │   cuando el formato lo requiere]        │
```

The exact Mermaid syntax should follow what `beautiful-mermaid` renders most clearly.

## Red

Add a rendered-diagram BDD regression that verifies the meaningful labels:

```text
Nushell (interno)
Proceso externo
stdin
stdout
interpretación explícita
```

and that the obsolete standalone `stdin` pseudo-node / misleading `parseo` label is absent.

Test semantic text presence, not coordinates or generated SVG IDs.

## Green

### Make `stdin` and `stdout` symmetric

Remove `stdin` as a third visual object.

Prefer:

```text
stdin: ...
```

and:

```text
stdout: ...
```

as labels on the two cross-boundary arrows.

This makes them visibly part of the same conceptual pair.

### Use the same connector style

Use the same base line style for both `stdin` and `stdout`.

Do not use dashed-vs-solid styling to imply a request/response protocol that the lesson is not teaching.

Direction and labels are enough.

### Replace self-loops with notes

Remove the two self-loops for:

```text
comando interno (valor → valor)
```

and:

```text
parseo (...)
```

Use participant-local notes instead.

Self-loops can be read as recursion/repetition by students unfamiliar with sequence-diagram notation; notes better
express static facts about one side.

## Refactor

Keep lesson-specific semantics in Mermaid source and visual defaults in the shared renderer.

Do not add:

```text
linkStyle default ...
```

or ad-hoc colors merely to make this one figure work if the shared component already owns those concerns.

## Acceptance criteria

- `stdin` and `stdout` use the same visual grammar;
- no third `stdin` node remains;
- self-loops no longer encode explanatory facts;
- arrows are reserved for actual cross-boundary flow;
- participant cards remain equal visual peers;
- the diagram is understandable without relying on line-style conventions;
- color is not required to distinguish semantics.

## Non-goals

Do not:

- remove participant cards;
- redesign the global Mermaid theme;
- introduce animation;
- add interactive annotations;
- turn the diagram into a UML-compliance exercise.

---

# TDD Cycle 3 — Improve pedagogical hierarchy and information density

## Goal

The figure should communicate one primary idea at a glance:

> **The representation changes when execution crosses the process boundary.**

Secondary details should support that idea rather than compete with it.

## Scope

Tune the diagram source and, only where globally appropriate, existing shared component spacing.

### Visual hierarchy

Prefer this order:

```text
participant names
    ↓
boundary-crossing arrows
    ↓
arrow labels
    ↓
participant-local notes
    ↓
lifelines
```

Lifelines should remain visible but quieter than the cross-boundary flow.

### Content density

Keep the diagram to approximately five semantic pieces:

```text
Nushell internal-value note
stdin crossing
external-process participant
stdout crossing
explicit-interpretation note
```

Do not add an extra node for every transformation described in prose.

The prose should carry nuance; the diagram should carry the mental model.

## Red

Add a visual regression baseline for this one representative sequence diagram before changing styling.

The baseline should be browser-level, not raw SVG text.

Use it to detect:

- accidental card-size changes;
- missing arrows;
- overlapping labels;
- lifelines obscuring content;
- excessive empty space.

## Green

Tune only what the screenshot demonstrates is needed:

- reduce the gap between prose and diagram moderately;
- keep participant cards equal width;
- make lifelines quieter than data arrows;
- improve secondary-label contrast if needed;
- preserve accent primarily for direction/boundary emphasis.

Do not hard-code precise percentages as acceptance criteria. Evaluate against actual layout.

## Refactor

If a visual change is useful to **all** sequence-style diagrams, move it to the shared diagram configuration.

If it is unique to this teaching figure, keep it in semantic Mermaid structure rather than global CSS.

This preserves high cohesion and avoids one lesson becoming the accidental design oracle for every diagram.

## Acceptance criteria

- participant cards remain aligned;
- labels do not collide with lifelines or arrows;
- the boundary-crossing flow is more visually prominent than lifelines;
- the diagram occupies less unnecessary vertical space;
- no text becomes smaller merely to make the figure fit;
- other canonical diagrams do not regress if shared options change.

## Non-goals

Do not:

- optimize for maximum compactness;
- remove the deliberate whitespace separating conceptual stages;
- add shadows/gradients/decorative effects.

---

# TDD Cycle 4 — Assure accessibility, responsive behavior, and export quality

## Goal

The conceptual model remains usable in all supported presentation modes:

```text
desktop
narrow content width
light appearance
dark appearance
print/PDF
assistive technology
```

## Scope

Use the existing shared figure/diagram component and browser test infrastructure.

Do not add client-side Mermaid rendering.

## Red

Add Playwright coverage for the representative diagram.

BDD cases:

```text
given a narrow lesson viewport
when the execution-boundary diagram is displayed
then it does not create page-level horizontal overflow
and all participant and boundary labels remain readable
```

```text
given light and dark appearances
when the diagram is displayed
then participant, connector, and annotation text remain distinguishable
```

```text
given the lesson is exported to PDF
when the diagram is rendered
then participant cards, arrows, labels, and notes remain visible
```

Accessibility:

```text
given the visual diagram
when a nonvisual reader encounters the figure
then an equivalent concise textual explanation is available
```

The accessible description should state the **relationship**, not reproduce every visual label.

Suggested Spanish description:

> `Dentro de Nushell, los comandos internos pueden intercambiar valores estructurados. Al cruzar hacia un proceso externo, los datos se representan para stdin; stdout vuelve a cruzar la frontera y cualquier estructura específica debe interpretarse explícitamente.`

## Green

Implement the smallest component/figure changes necessary to satisfy:

- width containment;
- readable labels;
- theme contrast;
- accessible description/caption;
- PDF preservation.

## Refactor

Keep accessibility text separate from renderer-generated SVG internals.

Do not post-process arbitrary `<text>` elements to manufacture accessibility semantics.

The figure component should own:

```text
title/caption
accessible description
rendered SVG
responsive viewport
```

while Mermaid continues to own the visual graph.

## Acceptance criteria

- no page-level overflow at supported narrow widths;
- labels remain readable without page zoom;
- light/dark output is usable without color alone;
- PDF preserves all semantic elements;
- the figure has an equivalent textual description;
- no client-side diagram JavaScript is introduced.

## Non-goals

Do not:

- add pan/zoom controls;
- create separate mobile Mermaid sources unless a real failure proves one source inadequate;
- introduce a new accessibility dependency.

---

# Testing strategy

The guidelines require considering the available testing techniques, but not applying them indiscriminately. For this
content/UI change, the useful mix is:

| Technique                        | Recommendation                              | What it detects                                                                         |
| -------------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------- |
| BDD/example tests                | **Required**                                | Incorrect mental-model claims, missing labels, regression of `stdin`/`stdout` semantics |
| DDT                              | **Required** for shared diagram assurance   | Same component behavior across sequence, flowchart, grouped, and long-label diagrams    |
| Browser integration / Playwright | **Required**                                | Overflow, clipping, theme issues, real rendering                                        |
| Accessibility testing            | **Required**                                | Missing equivalent text, low contrast, unusable figure semantics                        |
| Visual regression                | **High-value, targeted**                    | Layout drift, overlaps, missing arrows/cards                                            |
| Metamorphic testing              | **High-value**                              | Theme/viewport transformations should preserve diagram semantics                        |
| PBT                              | **Optional**                                | Deterministic rendering / label preservation if suitable generators already exist       |
| Differential testing             | **Low-value here**                          | No genuinely independent diagram implementation exists                                  |
| Mutation testing                 | **High-value only for shared helper logic** | Whether semantic/render-contract tests detect changed conditions                        |
| Fuzz testing                     | **Low-value for lesson-authored Mermaid**   | Input is trusted, static, repository-owned                                              |
| Mocks                            | **Avoid**                                   | No interaction-heavy external boundary is central here                                  |
| Snapshot testing                 | **Use sparingly**                           | Browser screenshot useful; raw SVG snapshots are brittle                                |
| Manual pedagogical review        | **High-value**                              | Misinterpretations automation cannot detect                                             |

## BDD

Use BDD for the actual defect class:

```text
given the lesson's process-boundary mental model
when a learner follows stdout back into Nushell
then the diagram distinguishes re-entry from explicit structured interpretation
```

This should be the primary regression test.

## DDT

If the shared component already has canonical diagram fixtures, include this sequence diagram in the matrix:

```text
flowchart
grouped cards
sequence/lifelines
long Spanish labels
edge labels
```

Run common invariants across all of them:

```text
renders
contains expected text
does not overflow
preserves accessible figure structure
```

Do not duplicate one test file per topology.

## Metamorphic testing

This is unusually useful for UI rendering.

Useful relations:

### Appearance transformation

Changing:

```text
light → dark
```

must not change:

- labels;
- participant count;
- arrow directions;
- accessible description;
- diagram topology.

Only visual tokens should differ.

### Viewport transformation

Changing:

```text
desktop → narrow
```

must preserve semantic content and ordering even if rendered size changes.

### Surrounding-prose transformation

Changing unrelated lesson prose should not change the generated diagram SVG if the `DiagramSpec` is unchanged.

That also reinforces deterministic build-time rendering.

## PBT

PBT is not necessary for the lesson's fixed content.

It becomes worthwhile only if the shared diagram layer already exposes suitable typed inputs and mature tooling exists.
Possible properties:

```text
same DiagramSpec → identical deterministic SVG
```

and:

```text
all generated safe labels remain represented in rendered SVG text
```

Do not add a PBT dependency solely for this diagram.

## Differential testing

I would **not** add a second Mermaid renderer just to compare outputs. The two implementations would not share a useful
semantic oracle, and visual differences would produce noise.

The closest useful differential check is already the browser/PDF comparison:

```text
browser rendering
vs.
PDF rendering
```

Both should preserve the same labels and relationships, but exact pixels should not be expected to match.

## Mutation testing

Mutation testing is not particularly useful for the Spanish prose itself.

It can be valuable if there is shared helper logic governing:

- diagram accessible descriptions;
- renderer option selection;
- responsive figure behavior.

For example, a mutation that removes overflow containment or drops the accessible description should be caught.

Do not introduce a mutation-testing framework solely for static lesson content.

## Fuzz testing

Not justified here.

The Mermaid source is repository-owned rather than untrusted input, so parser fuzzing would mostly test
`beautiful-mermaid`, not DIBS.

If a future feature accepts user-supplied Mermaid, reassess fuzzing at that boundary.

---

# Manual pedagogical assurance

Automated tests can establish correctness and rendering stability, but they cannot fully answer:

> “What does a student think this arrow means?”

For a teaching diagram, a tiny **cognitive walkthrough** is high-value.

Ask 2–3 people unfamiliar with the new figure to answer, without reading later lesson text:

1. ¿Qué tipo de información fluye entre comandos internos?
2. ¿Qué cambia al llegar a un proceso externo?
3. ¿Qué representan `stdin` y `stdout`?
4. ¿Al volver por `stdout` recuperamos automáticamente la estructura original?
5. ¿Qué habría que hacer si `stdout` contiene JSON?

The target is not statistical significance. It is to catch obvious diagram-induced misconceptions before publication.

If more than one person interprets:

- a note as an execution step;
- `stdout` as automatic parsing;
- the self-side annotation as recursion;
- `stdin` as a separate object;

revise the diagram before accepting the visual baseline.

This is a **high-value pedagogical check**, not a CI gate.

---

# Behavior preservation

Preserve:

```text
lesson section order
mental-model framing
Sorva citation
Nushell/internal vs external-process distinction
shared Mermaid component
build-time SVG rendering
card/lifeline presentation
light/dark behavior
```

Intentionally change:

```text
stdout/re-entry semantics
explicit parsing terminology
stdin/stdout visual symmetry
self-loop notation
spacing and visual hierarchy
accessible description
```

No package/public-site component API should change unless the existing figure component lacks a necessary accessibility
or responsive contract.

---

# Prioritization

## Required

- correct the `stdout` → structured-value implication;
- distinguish re-entry from explicit format interpretation;
- make `stdin`/`stdout` visually symmetric;
- remove misleading self-loops;
- preserve the participant-card layout;
- add BDD semantic regression coverage;
- add browser/accessibility checks;
- validate PDF rendering.

## High-value

- targeted visual regression;
- DDT across canonical diagram layouts;
- metamorphic light/dark and viewport checks;
- short learner cognitive walkthrough.

## Optional

- PBT for deterministic rendering if tooling already exists;
- targeted mutation testing of shared figure helpers.

## Deferred

- fuzzing Mermaid;
- another renderer for differential testing;
- animation;
- interactivity;
- mobile-specific alternate diagrams;
- global redesign of the diagram component.

---

# Suggested execution order

```text
Cycle 1
Semantic correction
        ↓
Cycle 2
Visual grammar
        ↓
Cycle 3
Hierarchy + density
        ↓
Cycle 4
Responsive + accessible + PDF assurance
        ↓
Targeted visual baseline
        ↓
Manual pedagogical walkthrough
```

The **minimum useful vertical slice** is Cycles 1–2:

```text
correct mental model
    ↓
stdin/stdout as symmetric boundary flows
    ↓
explicit interpretation shown separately
```

Only after that should visual spacing be tuned. That ordering follows the project's priority of **correctness and
semantic clarity before presentation polish**, while the layered testing strategy gives confidence not only that the
diagram renders, but that future changes are less likely to reintroduce the original conceptual ambiguity.
