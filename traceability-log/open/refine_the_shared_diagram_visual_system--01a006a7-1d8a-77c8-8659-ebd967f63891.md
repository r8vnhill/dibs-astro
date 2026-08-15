# Refine the Shared Diagram Visual System

## Summary

Improve the visual quality and consistency of every diagram rendered through the existing `MermaidDiagram`/`renderDiagramSvg()` boundary while **preserving the intentional card/subgraph presentation**.

The current plan identifies the right concerns—diagram-specific tokens, contrast, spacing, connector hierarchy, responsiveness, typography, and regression coverage—but it is too horizontally decomposed: eight cycles separately tune aspects that interact strongly with one another.  For a focused UI-system change, the project guidelines favor short TDD cycles that each produce an observable vertical increment, with explicit scope, Red/Green/Refactor, acceptance criteria, and non-goals.

Reorganize the work into **four vertical TDD cycles**:

1. establish a stable semantic visual contract and representative fixture corpus;
2. tune hierarchy, spacing, typography, and connector treatment together against that corpus;
3. make the shared component responsive and export-safe;
4. lock the result down with targeted browser/PDF regression evidence.

Do not add another dependency. `beautiful-mermaid` is already behind the correct abstraction boundary; this work should improve the project-owned design contract rather than make individual lessons aware of renderer concerns.

### Preserve

* card/subgraph layouts;
* build-time SVG rendering;
* zero client-side diagram JavaScript;
* Mermaid as the diagram-source notation;
* current diagram semantics and lesson content;
* existing light/dark appearance behavior;
* the public `MermaidDiagram` API unless testing proves a real need to extend it.

### Improve globally

* semantic hierarchy among background, cards, nodes, connectors, labels, and accent;
* readable contrast in both appearances and PDF;
* information density and spacing;
* connector/arrow continuity;
* typography consistency with DIBS;
* responsive behavior without illegibly scaling large diagrams;
* deterministic layout/rendering;
* regression assurance for changes to global renderer options.

The design-token and renderer settings should remain implementation details of the shared diagram capability. Lesson Mermaid definitions should continue to describe structure and meaning rather than compensate for renderer aesthetics.

---

# TDD Cycle 1 — Establish the visual contract and canonical fixture corpus

## Goal

Define what a “good DIBS diagram” means in observable terms before changing global renderer settings, and create a small corpus that exercises every layout pattern the shared component must support.

This avoids tuning the renderer to the Unix/Nushell screenshot while unintentionally degrading branching, vertical, long-label, or boundary diagrams.

## Scope

Relevant components/modules:

```text
src/components/ui/figures/MermaidDiagram.astro
src/lib/diagrams/render-diagram-svg.ts
src/lib/diagrams/
```

Add or reuse a test-only fixture module such as:

```text
src/lib/diagrams/__fixtures__/diagram-specs.ts
```

Keep this **test infrastructure**, not a new production diagram registry.

Canonical fixtures should cover the smallest representative matrix:

```text
comparison cards
linear left-to-right flow
linear top-to-bottom flow
branching flow
nested/grouped flow
edge labels
long Spanish labels
internal/external-process boundary
```

The existing plan already identifies essentially this matrix; consolidate it into the starting contract rather than waiting until the final cycle.

### Visual contract

Establish these project-local semantic roles:

| Role       | Purpose                                                 |
| ---------- | ------------------------------------------------------- |
| background | figure canvas                                           |
| surface    | intentional card/subgraph surface                       |
| foreground | primary labels                                          |
| muted      | secondary labels/card headings                          |
| line       | connectors                                              |
| border     | cards and node outlines                                 |
| accent     | directional or deliberately emphasized graphical detail |

The hierarchy should be:

```text
primary content
    > directional relationship
    > structural grouping
    > secondary annotation
    > canvas
```

Cards remain intentional structural grouping and must remain clearly visible.

### Red

Add BDD/DDT characterization tests before changing appearance:

```text
given each canonical diagram fixture
when it is rendered
then it produces one deterministic inline SVG
```

```text
given a grouped diagram
when it is rendered
then its group/card labels and node labels remain present
```

```text
given the same source and renderer configuration
when it is rendered repeatedly
then the generated representation is deterministic
```

Also create initial Playwright baselines for only:

1. the comparison-card fixture;
2. the densest grouped/boundary fixture.

These baselines are evidence for the subsequent visual changes, not permanent approval of the current appearance.

### Green

Introduce the fixture corpus and any small helpers needed to render it consistently.

Do **not** tune colors or spacing yet.

### Refactor

Keep fixture declarations separate from renderer implementation and lesson content.

If the renderer configuration currently mixes semantic color mapping and layout numbers in one anonymous object, give that configuration a focused internal name, but do not yet add speculative layers or a user-configurable theme API.

### Acceptance criteria

* the fixture corpus covers every diagram topology currently needed by DIBS;
* all fixtures render deterministically;
* comparison cards remain part of the characterized contract;
* global renderer changes can be evaluated against the whole corpus;
* no production lesson is modified;
* no new runtime or build dependency is introduced.

### Non-goals

* user-configurable themes;
* arbitrary renderer presets;
* interactive diagrams;
* testing every Mermaid feature;
* screenshot coverage for every diagram.

---

# TDD Cycle 2 — Establish a coherent DIBS diagram theme and layout baseline

## Goal

Make cards, nodes, connectors, labels, and whitespace form one coherent visual hierarchy across all representative diagrams.

This cycle intentionally combines the current plan's separate token, tonal-hierarchy, spacing, typography, connector, and `thoroughness` cycles because these variables are perceptually interdependent. Tuning them independently creates unnecessary iterations and risks optimizing one dimension while degrading another. The guidelines explicitly favor the smallest useful decomposition and discourage planning hierarchy for its own sake.

## Scope

Refine:

```text
src/lib/diagrams/render-diagram-svg.ts
src/components/ui/figures/MermaidDiagram.astro
```

and the site's stylesheet/token location where component-local diagram variables belong.

Keep the public diagram API unchanged.

## 2.1 Introduce diagram-specific semantic tokens

The current renderer passes generic application tokens directly:

```ts
bg: "var(--background)",
fg: "var(--foreground)",
line: "var(--muted-foreground)",
accent: "var(--primary)",
muted: "var(--muted-foreground)",
surface: "var(--card)",
border: "var(--border)",
```



Introduce a **diagram-local semantic layer**:

```css
--diagram-background
--diagram-foreground
--diagram-muted
--diagram-line
--diagram-accent
--diagram-surface
--diagram-border
```

Initially derive these from existing DIBS tokens.

The purpose is not to create a parallel theme system. It is to establish a component contract that lets graphical contrast diverge from prose/card contrast where necessary without changing global UI semantics.

### Architectural boundary

Prefer:

```text
site theme tokens
       ↓
diagram semantic tokens
       ↓
renderer options
       ↓
SVG
```

rather than allowing renderer option names to leak throughout the application.

Keep all seven renderer roles explicit. The previous suggestion to omit some values and rely on `beautiful-mermaid` derivation is less desirable under the project's emphasis on deterministic, explicit contracts: a dependency upgrade could otherwise change derived colors without any DIBS code change.

## 2.2 Tune hierarchy as one system

Preserve cards but establish a deliberate hierarchy:

```text
foreground    strongest textual contrast
line          clearly traceable
accent        directional/emphasis role
border        visible but subordinate
muted         secondary but readable
surface       subtly differentiated from canvas
background    base
```

The desired result for the screenshot is not “remove the cards”; it is:

* card outline/header remains recognizable;
* node outline is stronger than or distinct from the card interior but does not compete with the card boundary;
* connectors remain traceable across the entire path;
* arrowheads read as endpoints of connectors rather than detached accent marks;
* secondary labels remain legible.

Do not rely on color alone for semantics. Shape, position, connector direction, text, and grouping must continue to carry meaning.

## 2.3 Tune spacing against the corpus

The current values are:

```ts
padding: 28,
nodeSpacing: 28,
layerSpacing: 40,
componentSpacing: 48,
```



Do **not** prescribe a replacement tuple as the final design in advance.

Instead, test a bounded set of candidate values against the fixture corpus. Use the earlier proposal only as an experimental starting point:

```ts
padding: 20,
nodeSpacing: 32,
layerSpacing: 48,
componentSpacing: 32,
```

The optimization criteria are:

* preserve clear separation between cards;
* reduce empty canvas that does not encode structure;
* leave sufficient space for edge labels;
* prevent sibling nodes from crowding;
* maintain comfortable distinction between layers;
* keep density broadly consistent across diagram topologies.

`componentSpacing` should not be reduced simply because the screenshot contains visible whitespace—the card separation is intentional. Choose the value that preserves the grouping hierarchy while avoiding disproportionate space.

## 2.4 Tune connector and arrow treatment

Adopt one site-wide rule.

Preferred hypothesis:

```text
connector  = neutral but clearly visible
arrowhead  = accent
```

Test that first because it preserves the existing visual intent.

If the accent arrowhead appears detached, strengthen `--diagram-line` before coloring the entire edge.

Reserve per-edge Mermaid styling for relationships with actual semantic emphasis. Do not use lesson-local `linkStyle default` declarations to compensate for shared renderer configuration.

## 2.5 Evaluate layout thoroughness

Treat `thoroughness` as an internal renderer-quality/performance parameter, not a design token.

Evaluate at least the existing/default setting and one higher candidate against:

* branching fixture;
* grouped fixture;
* boundary fixture.

Measure both:

* layout quality/crossings through visual inspection;
* total rendering/build cost.

Choose the lowest setting that produces consistently acceptable layouts.

Do not expose `thoroughness` as part of `DiagramSpec`.

### Red

Write BDD/browser tests before changing the theme:

```text
given light and dark appearances
when representative diagrams render
then primary text, secondary text, connectors, borders, and card surfaces remain distinguishable
```

```text
given the comparison-card fixture
when global spacing changes
then both cards remain visually separate and neither is clipped
```

```text
given a dense graph
when the chosen layout configuration is applied
then nodes and edge labels do not overlap
```

For accessibility, test computed colors/contrast for the actual semantic roles rather than merely asserting token names.

Use the project's existing accessibility target consistently. Text and meaningful graphical elements should remain distinguishable at the appropriate contrast levels.

### Green

* introduce diagram semantic tokens;
* tune their light/dark values;
* tune spacing against all fixtures;
* choose connector/arrow treatment;
* select the evidence-backed `thoroughness`;
* preserve `font: "inherit"` unless browser/PDF evidence demonstrates a problem.

### Refactor

Keep `renderDiagramSvg()` short. If configuration grows, extract cohesive constants/functions, for example:

```text
diagram-color-options
diagram-layout-options
```

but keep them private to the diagram rendering module.

Do not introduce a general `DiagramTheme` abstraction unless a second actual theme/profile appears.

This follows the guideline to prefer focused functions while avoiding speculative abstraction.

### Acceptance criteria

* cards/subgraphs remain an intentional and clearly visible part of the visual system;
* every renderer color role maps through a DIBS diagram semantic token;
* no lesson contains global color or spacing compensation;
* light and dark appearances have comparable hierarchy;
* connectors remain traceable and arrowheads visually attach to them;
* card borders and node borders remain distinguishable;
* no fixture contains node/label overlap;
* spacing is validated against the entire canonical fixture corpus;
* the selected `thoroughness` has documented visual/build-cost evidence;
* `renderDiagramSvg()` remains deterministic;
* public component/API behavior remains unchanged.

### Non-goals

* shadows, gradients, animation, or decorative effects;
* renderer-specific SVG mutation after generation;
* multiple density presets;
* per-lesson visual themes;
* changing Mermaid semantics.

---

# TDD Cycle 3 — Make the component responsive, typographically consistent, and export-safe

## Goal

Every diagram remains readable and structurally intact across the actual DIBS delivery surfaces: narrow web layouts, desktop pages, dark/light appearance, print, and PDF.

Responsiveness belongs to `MermaidDiagram.astro`; graph generation belongs to `renderDiagramSvg()`. Keeping those concerns separated preserves the existing rendering boundary and follows the project's preference for high cohesion and explicit module responsibilities.

## Scope

Refine:

```text
src/components/ui/figures/MermaidDiagram.astro
```

and its browser/PDF tests.

### Responsive policy

Start from a wrapper contract such as:

```css
.diagram-viewport {
    inline-size: 100%;
    overflow-x: auto;
}

.diagram-viewport > svg {
    display: block;
    inline-size: 100%;
    block-size: auto;
    max-inline-size: 100%;
    margin-inline: auto;
}
```

but do not treat that exact CSS as the goal.

The UX contract is:

1. the page itself never gains horizontal overflow from a diagram;
2. a normal diagram scales to available width;
3. if scaling would make a complex diagram unreadably small, the **diagram viewport** may scroll instead;
4. the component does not silently shrink typography below the site's comfortable reading threshold;
5. no client-side re-layout is required.

Do not introduce dual Mermaid sources for mobile/desktop unless actual evidence proves that a diagram cannot meet those requirements with one SVG.

### Typography

Preserve:

```ts
font: "inherit"
```

as the default.

Ensure the wrapper/SVG actually inherits the site's typography in:

* Chromium web output;
* dark/light appearance;
* PDF export.

Do not globally use monospace for diagrams. Technical terms can be represented as such in diagram content only when doing so carries meaning; ordinary conceptual labels should remain normal DIBS typography.

Avoid DOM/SVG post-processing that depends on internal `<text>` structures from `beautiful-mermaid`. That would couple the project to private renderer output and undermine the adapter boundary.

### Red

Playwright matrix over representative diagrams:

```text
narrow phone
tablet/content column
normal desktop
wide desktop
```

BDD cases:

```text
given a narrow content viewport
when a grouped diagram renders
then it does not create page-level horizontal overflow
```

```text
given a diagram whose intrinsic width exceeds the readable viewport
when it is displayed
then scrolling is confined to the diagram viewport
```

```text
given light and dark appearances
when the same diagram renders
then labels, connectors, cards, and nodes remain legible
```

PDF/export:

```text
given the representative diagram page
when it is exported to PDF
then cards, labels, connectors, and typography remain visible and correctly positioned
```

### Green

Implement the minimal wrapper/style changes needed to satisfy the matrix.

Prefer CSS and intrinsic SVG behavior over JavaScript.

### Refactor

Keep responsive styling centralized in `MermaidDiagram.astro` or its canonical component stylesheet.

No lesson-specific `overflow`, `width`, `min-width`, or font overrides should be necessary.

### Acceptance criteria

* no representative viewport gets page-level horizontal overflow from diagrams;
* wide diagrams remain readable rather than being indiscriminately scaled down;
* card layout remains intact on narrow and wide screens;
* SVG aspect ratio is preserved;
* typography matches surrounding DIBS content;
* PDF output preserves cards, connectors, labels, and font rendering;
* no client JavaScript or hydration is introduced;
* no lesson requires responsive styling.

### Non-goals

* JavaScript-driven graph re-layout;
* pinch/zoom controls;
* interactive pan;
* separate mobile diagrams;
* reauthoring lesson diagrams solely to satisfy viewport tests.

---

# TDD Cycle 4 — Establish proportionate visual-regression and reproducibility assurance

## Goal

Make future changes to the shared renderer safe without coupling tests to `beautiful-mermaid`'s internal SVG coordinates or making routine dependency updates excessively noisy.

A change to the renderer configuration affects every diagram, so this is a high-leverage boundary. The guidelines favor tests of observable behavior over private implementation details and recommend snapshot/golden testing only where it provides enough value to justify the maintenance cost.

## Scope

Use existing:

* unit/render tests;
* Playwright;
* PDF/export checks;
* property-based tooling if already present.

Do not add a new testing dependency.

### Red

Create the final assurance matrix.

#### Example-based / BDD

Verify:

* diagram markup remains accessible;
* SVG is generated statically;
* cards/groups remain represented;
* invalid source still produces the established diagnostic behavior;
* responsive viewport behavior remains correct.

#### Data-driven testing

Run every canonical fixture through:

* rendering;
* deterministic-output checks;
* required semantic-content assertions.

This is the primary broad-coverage strategy because the same invariants should hold across several diagram shapes.

#### Property-based testing

Retain a bounded PBT only if the diagram infrastructure already has one or if determinism of generated safe flowcharts is a meaningful invariant not covered well by fixtures.

Do **not** add broad grammar generation merely to exercise `beautiful-mermaid`'s parser. The parser is third-party infrastructure and repository-authored diagrams do not justify a new fuzzing effort.

#### Visual regression

Keep snapshots deliberately small:

* comparison cards, desktop/light;
* dense grouped/boundary diagram, desktop/dark;
* long-label or comparison diagram at a narrow viewport.

That provides coverage of the renderer's three highest-risk visual dimensions:

```text
grouping
complexity
responsiveness
```

Do not snapshot every diagram or raw SVG text.

#### PDF

Use one representative exported lesson/page containing:

* a card/subgraph;
* edge labels;
* multiple nodes/connectors.

Verify that the diagram is present and visually intact.

### Green

Update visual baselines only after the intended design is reviewed.

Run the complete relevant suite on the final configuration.

### Refactor

Document the shared renderer contract close to the implementation:

* semantic color roles;
* spacing rationale;
* accent meaning;
* responsive policy;
* why lesson-local global styling is discouraged.

Keep this concise; avoid duplicating test documentation and implementation comments.

### Acceptance criteria

* repeated clean renders of canonical diagrams are deterministic;
* all DDT fixtures render successfully;
* the three targeted visual baselines are stable in CI;
* browser tests cover both appearance and responsive behavior without duplicating every case;
* representative PDF export remains correct;
* raw SVG coordinates are not golden-tested;
* no mocks are used for the deterministic renderer;
* the project does not add fuzzing, differential testing, or mutation infrastructure without a concrete defect class to justify it.

### Non-goals

* full-site screenshot testing;
* screenshotting every diagram in light and dark modes;
* fuzzing Mermaid syntax;
* differential comparison against another renderer;
* mutation testing of renderer internals.

---

# Candidate renderer configuration

Do not make the numeric values themselves an acceptance criterion. They should emerge from Cycle 2.

A useful starting candidate remains:

```ts
const rendererOptions = {
    bg: "var(--diagram-background)",
    fg: "var(--diagram-foreground)",
    line: "var(--diagram-line)",
    accent: "var(--diagram-accent)",
    muted: "var(--diagram-muted)",
    surface: "var(--diagram-surface)",
    border: "var(--diagram-border)",
    font: "inherit",

    padding: 20,
    nodeSpacing: 32,
    layerSpacing: 48,
    componentSpacing: 32,
    thoroughness: 5,

    transparent: true,
} as const;
```

But the plan should **not prescribe `20/32/48/32/5` as the desired end state**. The current proposal itself recognizes these as candidate values.

A better release criterion is:

> Choose the smallest spacing and layout values that preserve card separation, connector readability, long-label legibility, and consistent density across the canonical fixture corpus.

Likewise, keep explicit mappings for all semantic color roles rather than delegating some derivation to the dependency. Explicit configuration makes the visual contract easier to review and reduces renderer-version drift.

---

## Behavior preservation

This is primarily a presentation refinement.

Preserve:

```text
Mermaid source semantics
card/subgraph structure
diagram titles/descriptions
lesson prose
light/dark functionality
build-time rendering
zero hydration
PDF availability
```

Intentionally change:

```text
diagram token mapping
contrast hierarchy
spacing
connector prominence
global SVG sizing behavior
```

No lesson should need semantic changes to accommodate the new visual defaults. If a diagram only becomes readable by modifying its conceptual structure, treat that separately as a content/design correction rather than hiding it inside this renderer refactor. This follows the project's behavior-preservation guidance.

---

## Prioritization

### Required

* canonical fixture corpus before tuning;
* explicit diagram semantic tokens;
* preserve the intentional card layout;
* coherent light/dark contrast hierarchy;
* fixture-driven spacing;
* readable connector/arrow treatment;
* responsive shared component;
* deterministic rendering;
* targeted browser and PDF evidence.

### High-value

* evaluate `thoroughness` rather than selecting `5` by assumption;
* retain explicit renderer color-role mappings;
* document the accent semantic;
* three representative visual regression baselines.

### Optional experimentation

* test whether a slightly different spacing profile improves dense diagrams;
* evaluate a higher `thoroughness` setting if build cost remains negligible.

### Deferred

* multiple diagram themes;
* density presets;
* per-diagram renderer options;
* interactive diagrams;
* client-side re-layout;
* SVG post-processing;
* animations;
* a general visualization framework.

---

## Suggested execution order

```text
Cycle 1
Canonical visual contract + fixture corpus
        ↓
Cycle 2
Theme + hierarchy + spacing + connectors + layout
        ↓
Cycle 3
Responsive web + typography + PDF
        ↓
Cycle 4
Regression/reproducibility gate
```

The **minimum useful vertical slice** is:

```text
comparison-card fixture
    → diagram semantic tokens
    → tuned shared renderer
    → light/dark + mobile validation
    → accepted visual baseline
```

Then immediately run the same renderer against the dense boundary fixture before considering the configuration stable.

This is stronger than tuning each option family in isolation: it preserves the intentionally card-oriented design, keeps the renderer configuration as one cohesive abstraction, tests it against diverse diagram topologies, and follows the project guideline that focused work should advance through small observable TDD increments rather than unnecessary planning layers.
