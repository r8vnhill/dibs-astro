# Replace Conceptual ASCII Models with Deterministic Build-Time Diagrams

## Summary

Replace only the **conceptual process models** in `src/pages/notes/scripting/support-scripts/nushell.astro` with
responsive, accessible inline SVG diagrams generated from Mermaid-compatible source at build time. Preserve literal
terminal output—including `ls` tables, diagnostics, query results, and the filesystem tree—as text because those blocks
represent artifacts students actually encounter.

The current proposal is directionally sound, but it overcommits to a young renderer before qualifying it, places too
much rendering responsibility directly in the Astro component, and fragments one coherent change across seven cycles.
The revised plan uses four vertical TDD cycles, introduces a narrow renderer boundary, explicitly evaluates determinism
and dependency risk, and uses the project's existing Vitest, fast-check, Playwright, architecture checks, and PDF-export
infrastructure. The project guidelines favor exactly this combination of explicit boundaries, reproducibility, focused
functions, behavior preservation, and layered testing.

The current page is also already **717 lines**, so diagram source should not be added inline indiscriminately. Keep the
pedagogical prose cohesive, but extract bulky code/output/diagram constants where that materially reduces the page size
rather than splitting paragraphs into artificial components.

## Architectural decision

Use Mermaid syntax as the **source representation**, but hide the concrete renderer behind a project-local adapter:

```text
lesson diagram specification
        ↓
renderMermaidSvg()
        ↓
MermaidDiagram.astro
        ↓
accessible <figure>
        ↓
inline SVG
```

Recommended files:

```text
src/lib/diagrams/
├── render-mermaid-svg.ts
└── types.ts

src/components/ui/figures/
├── Img.astro
├── MermaidDiagram.astro
└── index.ts

src/pages/notes/scripting/support-scripts/
├── nushell.astro
└── nushell.examples.ts
```

The existing figures barrel currently exposes only `Img`, so adding a reusable diagram primitive here extends an
established UI boundary rather than creating lesson-local infrastructure.

### Renderer recommendation

Qualify **`beautiful-mermaid@1.1.3`** first, then adopt it if it passes the project-specific characterization tests
below.

Its current API provides synchronous `renderMermaidSVG()`, has no DOM dependency, accepts CSS custom properties,
supports transparent backgrounds, and is MIT-licensed. Its package has only two runtime dependencies, `elkjs` and
`entities`. ([GitHub][1]) Those properties fit Astro's static-component model particularly well: ordinary Astro
components render HTML without a client runtime. ([Astro Docs][2])

However, treat it as **emerging rather than mature infrastructure**. The current upstream tracker includes open issues
involving subgraphs, parser edge cases, and flowchart syntax/layout behavior. ([GitHub][3]) Therefore:

- pin `beautiful-mermaid` exactly at first rather than taking a broad semver range;
- permit only the small flowchart subset used by DIBS;
- do not use subgraphs for the initial diagrams;
- never import `beautiful-mermaid` from lesson pages;
- make renderer replacement local to `render-mermaid-svg.ts`;
- retain a fallback decision to build-time `@mermaid-js/mermaid-cli` if the qualification gate exposes unacceptable
  incompatibilities.

Do **not** use client-side Mermaid for this work. The diagrams are static educational content, so browser hydration
would add an unnecessary runtime boundary. Mermaid's normal library model is JavaScript/DOM-oriented, while the site
already has a static Astro rendering pipeline. ([Mermaid][4])

---

# TDD Cycle 1 — Qualify the renderer and establish the diagram contract

## Goal

Prove that the selected renderer can produce deterministic, valid SVG for DIBS's required flowcharts under the project's
supported Node toolchain before making it part of the UI architecture.

The repository currently targets Node `>=24 <27`, Astro 7.2.2, Vitest 4.1.10, Playwright 1.62.1, and already includes
fast-check 4.5.3.

## Scope

Add:

```text
src/lib/diagrams/types.ts
src/lib/diagrams/render-mermaid-svg.ts
src/lib/diagrams/__tests__/render-mermaid-svg.test.ts
```

Update:

```text
package.json
pnpm-lock.yaml
```

Introduce a minimal type such as:

```ts
export interface DiagramSpec {
    readonly id: string;
    readonly source: string;
    readonly title: string;
    readonly description: string;
}
```

Keep renderer options private.

### Red

Characterize the adapter before building the UI component.

BDD examples:

```text
given a supported flowchart
when it is rendered twice
then both renderings are byte-identical SVG
```

```text
given each diagram required by the Nushell lesson
when it is rendered
then rendering succeeds under the supported Node runtime
```

```text
given invalid Mermaid source
when it is rendered
then the adapter reports which diagram could not be rendered
```

```text
given the same diagram source
when theme values are supplied through CSS custom properties
then the graph structure does not depend on a concrete light or dark palette
```

Use a **data-driven test** over all lesson diagram specifications rather than duplicate one test per figure.

Also use one constrained **property-based test** with the already-installed fast-check: generate simple acyclic
flowcharts from safe identifiers/labels and verify that repeated rendering is deterministic and produces one SVG root.
The objective is reproducibility of the adapter, not testing the renderer's entire Mermaid parser.

### Green

Implement `renderMermaidSvg(spec)` as the only import site for `beautiful-mermaid`.

Configure:

- transparent background;
- existing DIBS CSS custom properties for foreground/background/accent roles;
- fixed renderer settings where layout parameters affect reproducibility;
- explicit error wrapping with the diagram ID/title.

Do not silently fall back to ASCII or empty markup. Invalid diagrams should make `pnpm build` fail.

### Refactor

Keep:

```text
Mermaid source → SVG
```

as a pure, deterministic transformation as far as practical. No browser globals, filesystem reads, mutable global
renderer state, or lesson-specific behavior belong in this module.

### Acceptance criteria

- all proposed lesson diagrams render under Node 24;
- rendering the same source/config twice is deterministic;
- invalid source produces a contextual build failure;
- `beautiful-mermaid` is imported from exactly one project module;
- the dependency is pinned to a qualified version;
- no DOM or browser is required by the renderer;
- `pnpm check`, unit tests, and architecture checks remain green.

### Dependency exit criterion

If deterministic rendering, Node compatibility, or the required basic layouts cannot be demonstrated without
renderer-specific workarounds in the lesson source, **do not continue with `beautiful-mermaid`**. Switch the adapter
implementation to the heavier official Mermaid build-time path rather than leaking renderer quirks into educational
content.

### Non-goals

Do not yet change `nushell.astro`, create a general charting framework, support every Mermaid diagram type, or expose
interactive diagrams.

---

# TDD Cycle 2 — Add an accessible, theme-aware figure component

## Goal

Any lesson can render a repository-authored `DiagramSpec` as a responsive figure without client-side JavaScript and
without knowing which library generates the SVG.

## Scope

Add:

```text
src/components/ui/figures/MermaidDiagram.astro
src/components/ui/figures/__tests__/MermaidDiagram.render.test.ts
```

Update:

```text
src/components/ui/figures/index.ts
```

The component should own **presentation and accessibility**, while `render-mermaid-svg.ts` owns rendering.

### Public contract

Keep the API deliberately small:

```ts
interface Props {
    spec: DiagramSpec;
}
```

Do not expose:

- renderer themes;
- spacing algorithms;
- Mermaid configuration;
- arbitrary style objects;
- interactive options.

### Red

Add Astro-render tests:

```text
given a diagram specification
when MermaidDiagram renders
then it contains inline SVG inside a semantic figure
```

```text
given a title and detailed description
when the diagram renders
then both remain available without requiring the SVG itself to be interpreted
```

```text
given a rendered diagram
when its HTML is inspected
then it contains no client hydration directive or diagram-specific script
```

Accessibility should not depend on `beautiful-mermaid` correctly propagating Mermaid's `accTitle`/`accDescr`. Mermaid
itself documents accessibility metadata for generated diagrams, but the independent renderer does not need to become
part of DIBS's accessibility contract. ([Mermaid][5])

### Green

Render approximately:

```text
<figure>
    <div aria-hidden="true">
        [generated SVG]
    </div>

    <figcaption>
        [visible title]
    </figcaption>

    [visually hidden equivalent description]
</figure>
```

This treats the SVG as the visual representation while retaining a renderer-independent textual equivalent for assistive
technology.

Use the site's canonical CSS tokens after inspecting their actual names. Do not embed hex colors or renderer themes in
lessons. `beautiful-mermaid` supports CSS-variable colors and transparent SVG backgrounds, so theme changes need not
require diagram re-rendering. ([GitHub][1])

### Refactor

Keep all renderer-specific CSS/configuration inside the adapter/component boundary.

`nushell.astro` should eventually contain only:

```astro
<MermaidDiagram spec={internalPipelineDiagram} />
```

not renderer configuration.

### Acceptance criteria

- diagram output is inline SVG;
- no client JavaScript is required;
- title and full textual description are accessible independently of SVG internals;
- width is responsive and constrained to lesson content;
- SVG uses a `viewBox` and scales without fixed viewport assumptions;
- theme roles come from existing DIBS tokens;
- no renderer-specific configuration appears in lesson pages.

### Non-goals

Do not add zoom/pan, interactivity, a diagram editor, or configurable renderer themes.

---

# TDD Cycle 3 — Replace conceptual `OutputBlock`s with four purposeful diagrams

## Goal

Replace textual process drawings only where a diagram improves the students' mental model, while preserving actual
console output and the lesson's cited claims.

## Scope

Modify:

```text
src/pages/notes/scripting/support-scripts/nushell.astro
src/pages/notes/scripting/support-scripts/nushell.examples.ts
src/pages/notes/scripting/support-scripts/__tests__/support-scripts.render.test.ts
```

Extract the diagram specifications—and preferably the existing long code/output literals—into `nushell.examples.ts`. The
page is currently 717 lines. This extraction should reduce incidental bulk without splitting coherent prose solely to
satisfy a numerical target, consistent with the project's file-size guidance.

### Diagram A — Unix composition vs. Nushell composition

Replace the current conceptual block:

```text
Unix:
programa → bytes/texto → programa

Nushell:
comando → valores estructurados → comando
```

with one comparison figure containing two equivalent flows.

The topology should deliberately be identical:

```text
Program ── bytes/text ──> Program

Command ── structured value ──> Command
```

The **edge representation**, not visual complexity, should communicate the comparison.

### Diagram B — Internal pipeline vs. external-process boundary

Merge the two existing “modelo mental” ASCII blocks into one figure with two paths:

```text
Internal:
Nu Value → Internal command → Nu Value → Internal command → Nu Value

External boundary:
Nu Value → conversion → External process → bytes/text → parse → Nu Value
```

Prefer edge labels for `stdin`, `stdout`, conversion, and parsing instead of making every word a large node.

This should be the visual centerpiece because it expresses the lesson's strongest conceptual boundary.

### Diagram C — Persisted representation to runtime values

Replace:

```text
album.json
→ open
→ parsed JSON
→ record/list
→ get / where / select
```

with a compact left-to-right flow distinguishing:

```text
stored representation → decoding boundary → runtime values → transformations
```

The diagram must make it visually clear that JSON and a Nushell value are different representations.

### Diagram D — Progression toward `run`

Replace the arrow list with:

```text
Structured values
→ typed pipeline contracts
→ reusable .nu script
→ run as pipeline stage
```

Keep the real `check-library-layout.nu` example directly beneath it so the abstract model is immediately grounded in
executable code.

### Preserve as text

Do not diagram:

- the `powerslave/` filesystem tree;
- actual `ls` output;
- result tables;
- Nushell diagnostics;
- query output;
- `run` execution output.

Those remain `OutputBlock`s because their textual representation is part of what students are learning.

### Red

Use **data-driven lesson tests** asserting that the four conceptual figures:

- exist;
- have unique IDs;
- have meaningful titles/descriptions;
- render an SVG;
- replace their corresponding conceptual `OutputBlock`s.

Also assert that representative real terminal outputs are still `OutputBlock`s.

Do not test exact prose or raw generated SVG coordinates.

### Green

Introduce the four specifications and replace the existing conceptual blocks.

Keep the current surrounding explanations and citations unless minor wording changes are needed to refer to “la figura”
or “los dos caminos”.

### Refactor

Deduplicate repeated concepts. In particular, once Diagram B clearly expresses the internal/external boundary, shorten
later prose that redraws the same distinction verbally.

Do not add a separate diagram for:

```text
composición → representación → contratos de tipo → frontera de proceso
```

in the conclusion. The four preceding figures already establish that sequence; the conclusion should synthesize it in
prose.

### Acceptance criteria

- four conceptual diagrams replace the corresponding ASCII process models;
- no actual terminal output is converted into an abstract diagram;
- each figure adds a distinct conceptual relationship;
- no diagram merely repeats the preceding paragraph;
- all existing citations and lesson semantics remain intact;
- the lesson has no dependency on renderer-specific syntax beyond its imported `DiagramSpec`s;
- bulky example extraction materially reduces `nushell.astro`; if it remains over 500 lines, document the cohesion
  reason rather than fragmenting prose arbitrarily.

### Non-goals

Do not redesign the lesson, change the Nushell examples, modify the Iron Maiden-inspired dataset, or convert the
filesystem tree.

---

# TDD Cycle 4 — Verify visual, export, and reproducibility contracts end to end

## Goal

Demonstrate that diagrams remain usable in every representation DIBS publishes: responsive web pages, light/dark themes,
and exported PDFs.

The project already provides Playwright plus dedicated PDF export and PDF-smoke scripts. Use them rather than adding a
parallel testing stack.

## Red

Add browser-level tests for the Nushell lesson covering:

```text
given a narrow viewport
when the lesson is rendered
then every conceptual figure remains within the content viewport
```

```text
given light and dark appearance
when the same figure is viewed
then its graph semantics remain unchanged and its text/connectors remain visible
```

```text
given the lesson PDF export
when the route is exported
then its diagrams are present as rendered vector content
```

Add one or two **targeted Playwright visual baselines**, preferably:

- Diagram A, because it tests parallel comparison/alignment;
- Diagram B, because it is the most complex layout.

Do not snapshot every generated SVG string: renderer-internal coordinate changes would create noisy tests without
proving pedagogical correctness.

### Green

Adjust only the reusable diagram component/configuration to solve:

- overflow;
- spacing;
- theme contrast;
- print sizing;
- font inheritance.

Avoid one-off CSS in `nushell.astro`.

Include the Nushell route in an appropriate PDF smoke path or add a focused export assertion if the existing smoke
infrastructure supports multiple fixtures.

### Refactor

Consolidate shared figure styling into the figure component or canonical stylesheet.

If a renderer upgrade later changes SVG internals while the diagrams remain visually equivalent, structural tests should
continue passing and only intentionally accepted visual baselines should need review.

### Acceptance criteria

- no horizontal overflow at representative mobile width;
- diagrams remain legible in both site appearances;
- HTML contains no diagram hydration scripts;
- the exported PDF contains all four figures;
- rendering is deterministic across two clean builds;
- `pnpm check`;
- `pnpm test`;
- relevant Playwright tests;
- PDF smoke/export;
- architecture checks;
- clean production build all pass.

### Non-goals

Do not introduce generalized PDF screenshot comparison, site-wide visual regression coverage, or performance
benchmarking infrastructure solely for four diagrams.

---

## Testing strategy across the project guidelines

The primary assurance mechanisms should be **BDD/example-based tests**, **DDT across the four diagram specifications**,
targeted **PBT for deterministic simple flowchart rendering**, and **Playwright/PDF integration tests**.

**Metamorphic testing** has one useful relation here: changing light/dark theme variables must not change graph topology
or educational meaning. Test that through the same rendered diagram under both themes.

**Snapshot/golden testing** is valuable only at the rendered-browser level for one or two representative diagrams; raw
SVG snapshots are too coupled to renderer internals.

**Differential testing** against another Mermaid renderer is not justified after the dependency-qualification gate
because the renderers need not produce identical layouts.

**Fuzz testing** is low value because diagram definitions are repository-authored rather than untrusted external input.
The third-party parser should not become a new fuzzing project for DIBS.

**Mutation testing** is also low value for this thin presentation adapter and does not justify adding mutation
infrastructure.

**Mocks should not be used.** The renderer is deterministic and cheap enough to invoke directly; tests should exercise
the real adapter.

This explicitly considers the testing styles required by the project while selecting only those whose expected assurance
value justifies their complexity.

## Behavior preservation

This work is **behavior-preserving with respect to lesson content**:

```text
Before                         After
conceptual OutputBlock   →     semantic SVG figure
actual terminal output   →     unchanged OutputBlock
lesson prose/citations   →     unchanged except figure references
code examples            →     unchanged
navigation               →     unchanged
```

The only intentional observable change is the visual representation of conceptual process models.

If implementing the figure component exposes inaccuracies in an existing diagram's semantics, treat those as separate
content corrections and document them explicitly rather than silently changing the lesson while migrating presentation.

## Priorities

**Required**

- renderer qualification before adoption;
- narrow `render-mermaid-svg.ts` dependency boundary;
- accessible `MermaidDiagram`;
- four semantic diagrams;
- deterministic/static rendering;
- existing HTML/PDF behavior preserved;
- BDD + DDT + browser/PDF assurance.

**High value**

- extract large example/diagram literals from the 717-line lesson;
- targeted visual regression for the two structurally important figures;
- exact dependency pin while `beautiful-mermaid` remains young.

**Deferred**

- interactive diagrams;
- support for sequence/class/ER charts;
- site-wide migration of other ASCII figures;
- generic `FileTree`;
- arbitrary user-authored Mermaid;
- automatic diagram generation from Markdown;
- client-side diagram editors.

## Suggested execution order

```text
1. Renderer qualification + pure adapter
             ↓
2. Accessible Astro figure component
             ↓
3. Internal/external boundary diagram
             ↓
4. HTML + theme + PDF vertical validation
             ↓
5. Remaining three diagram migrations
             ↓
6. Deduplication and lesson-file cleanup
```

The **minimum useful vertical slice** is therefore not “implement the component, then convert every diagram.” It is:

```text
qualified renderer
→ renderer adapter
→ accessible figure
→ one high-value boundary diagram
→ browser + PDF evidence
```

Only after that slice is proven should the remaining diagrams be migrated. This reduces dependency risk, produces usable
evidence early, and follows the project's preference for small vertical TDD increments over horizontal infrastructure
work.

[1]: https://github.com/lukilabs/beautiful-mermaid "GitHub - lukilabs/beautiful-mermaid · GitHub"
[2]: https://docs.astro.build/en/basics/astro-components/?utm_source=chatgpt.com "Components - Astro Docs"
[3]: https://github.com/lukilabs/beautiful-mermaid/issues?utm_source=chatgpt.com "Issues · lukilabs/beautiful-mermaid"
[4]: https://mermaid.js.org/config/usage.html?utm_source=chatgpt.com "Usage | Mermaid"
[5]: https://mermaid.js.org/config/accessibility.html?utm_source=chatgpt.com "Accessibility Options | Mermaid"
