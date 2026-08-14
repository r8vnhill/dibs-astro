# UI/UX Improvement Plan — Lesson Reading Experience

## Summary

Refine the DIBS lesson interface into a calmer, more legible, and more navigable long-form technical reading experience
while preserving the lesson content and existing static-first Astro architecture.

The redesign should establish three clear levels of attention:

```text
Course navigation
    ↓
Lesson navigation and orientation
    ↓
Lesson content
        ├── prose
        ├── code examples
        ├── pedagogical callouts
        └── references / next lesson
```

The current page already has good ingredients—persistent course navigation, semantic lesson sections, code examples,
callouts, references, and previous/next navigation—but they currently compete for attention rather than forming a strong
visual hierarchy.

The primary UX objective should be:

> **When reading a lesson, the lesson should visually dominate the interface. Navigation and metadata should remain
> available without competing with the content.**

---

# Phase 1 — Rebalance the reading shell

## Goal

Make the lesson content the dominant visual element while preserving immediate access to course navigation and lesson
orientation.

## Current limitations visible in the screenshots

The desktop viewport dedicates substantial visual weight to:

- the saturated purple global header;
- the dense left navigation tree;
- the lesson metadata card;
- large amounts of unused horizontal space around the reading column.

At the same time, the main content has no persistent local navigation despite being a long document with many sections.

The result is a somewhat inverted hierarchy: **global course structure is always visible, while the structure of the
lesson currently being read is not**.

## Scope

Refactor the desktop lesson shell toward a responsive three-region model:

```text
┌─────────────────────────────────────────────────────────────────────┐
│ compact global header                                               │
├───────────────┬──────────────────────────────┬──────────────────────┤
│ Course        │                              │ On this page         │
│ navigation    │ Lesson                       │                      │
│               │                              │ current section      │
│ ~260–280 px   │ reading column               │ progress / headings  │
│               │                              │ ~220–240 px          │
└───────────────┴──────────────────────────────┴──────────────────────┘
```

### Course sidebar

Keep the left navigation, but reduce its visual density:

- strengthen the current lesson state;
- use indentation and spacing rather than multiple equally strong borders;
- visually distinguish:

  - units;
  - section groups;
  - lessons;
  - current lesson;
- collapse unrelated units by default;
- preserve explicit expand/collapse state where technically reasonable;
- increase clickable row areas without increasing visual clutter.

The current lesson should be identifiable without having to infer it from nearby entries.

### Reading column

Constrain prose to approximately **70–78 characters per line** as a typography target, while allowing code blocks and
selected figures to use additional width.

This should be treated as a readability heuristic rather than a WCAG requirement.

Prefer:

```text
article
    prose width
    ├── normal paragraphs: narrow
    └── code / tables: optional breakout width
```

rather than making every element as wide as the code blocks.

### Right rail

Add an **“En esta página”** table of contents on sufficiently wide screens.

Include only meaningful lesson headings, not every nested heading.

For example:

```text
En esta página

La biblioteca desde la perspectiva...
Superficie de API
Contrato
Encapsulación
Estabilidad
Conclusiones
```

Highlight the current section as the reader scrolls.

WAI explicitly recommends headings as navigational structure and identifies tables of contents as useful mechanisms for
skimming and navigating long pages. ([W3C][1])

### Responsive behavior

Suggested progression:

```text
≥ 1440 px       left nav + article + local TOC
1024–1439 px    left nav + article
< 1024 px       article + collapsible navigation
small mobile    article only; nav/TOC in overlays or disclosures
```

Do not compress all three columns onto medium-width screens.

## Acceptance criteria

- Lesson content receives more horizontal and visual emphasis than global navigation.
- The current lesson is visually unambiguous in the course tree.
- A desktop reader can jump directly to major lesson sections.
- Article text does not grow indefinitely with viewport width.
- Content remains usable at narrow viewport widths without page-level horizontal scrolling.
- Local navigation disappears or moves into a compact control before it constrains reading width.

WCAG 2.2 requires content to support reflow rather than forcing two-dimensional scrolling under normal text-content
conditions. ([W3C][2])

## Non-goals

- Redesigning the entire information architecture of DIBS.
- Changing lesson ordering.
- Changing lesson pedagogical content.
- Replacing Astro with a client-rendered application.

---

# Phase 2 — Establish a calmer typography and spacing system

## Goal

Reduce reading fatigue and make content hierarchy apparent before color or decorative components are considered.

## Scope

Introduce explicit design tokens for long-form educational content rather than styling Markdown elements independently.

### Body text

The screenshots suggest the body text is visually quite heavy.

Move toward:

- regular body weight;
- stronger weight only for deliberate emphasis;
- increased line height;
- slightly more separation between paragraphs;
- clearer distinction between prose and inline code.

A reasonable starting point:

```css
--content-font-size: 1rem;
--content-line-height: 1.65;
--content-measure: 74ch;
```

These are design starting points, not fixed standards.

### Heading scale

The purple headings currently dominate strongly and several heading levels look similar in weight and color.

Create a more explicit scale:

```text
H1   lesson identity
H2   major conceptual section
H3   subsection
H4   local/example heading
```

Use **size + spacing + weight**, rather than purple alone, to communicate hierarchy.

I would also reduce the H2 size slightly. There are many H2s in a long lesson, so very large headings repeatedly
interrupt reading flow.

### Vertical rhythm

Standardize spacing around:

- headings;
- paragraphs;
- lists;
- code blocks;
- callouts;
- references.

For example, major sections should have noticeably more space above than ordinary content blocks.

Avoid individually tuned margins scattered across components.

### Inline code

Increase separation between inline code and surrounding prose using:

- subtle background;
- modest padding;
- monospace face;
- sufficient foreground contrast.

Avoid making inline code visually as prominent as emphasized prose.

## Acceptance criteria

- Heading levels are distinguishable without relying solely on color.
- Paragraphs remain visually readable at 100% and 200% zoom.
- Increasing browser text size does not clip or overlap lesson content.
- Major section spacing follows one consistent scale.

WCAG requires text to remain usable when resized up to 200%, which should be explicitly included in the design
validation rather than assumed from desktop screenshots. ([W3C][3])

---

# Phase 3 — Redesign the attention hierarchy for callouts and code

## Goal

Make pedagogical emphasis meaningful again by reducing the number of equally dominant visual containers.

## Current limitation

The screenshots use several strong attention mechanisms simultaneously:

- purple headings;
- purple code borders;
- orange callouts;
- yellow warning callouts;
- green explanatory callouts;
- boxed metadata;
- bold prose;
- iconography.

Individually these components work. Collectively, too many parts of the lesson are asking to be noticed first.

## Scope

### Introduce a semantic callout system

Use a small number of semantic variants.

For example:

```text
Concepto       neutral/accent
Idea clave     positive
Atención       caution
Nota           informational
```

Each should have:

- a restrained tinted background;
- one accent edge or small icon;
- a semantic heading;
- equivalent structure.

Avoid large saturated surfaces unless the content genuinely requires interruption.

### Reduce chromatic competition

Instead of:

```text
strong background + strong border + icon + bright heading
```

prefer:

```text
subtle background + accent border + icon/title
```

Reserve the strongest color treatment for genuinely high-priority information.

Do not communicate callout meaning by color alone.

### Simplify code blocks

The code component currently has several visual layers:

- title strip;
- purple outline;
- code background;
- copy button;
- syntax highlighting.

Reduce this to a single coherent container.

Suggested hierarchy:

```text
optional caption
┌────────────────────────────────┐
│ Kotlin example          Copy   │
├────────────────────────────────┤
│ code                           │
└────────────────────────────────┘
```

The language indicator should be useful metadata, not decorative branding.

### Improve copy affordance

The current copy control appears visually small.

Use a comfortably sized control with:

- icon;
- accessible name;
- clear hover state;
- visible keyboard focus;
- temporary “Copiado” feedback.

WCAG 2.2 AA sets a 24×24 CSS-pixel minimum pointer-target criterion in applicable cases; I would use **44×44 CSS px as
the internal design target** for isolated toolbar controls when space permits. ([W3C][4])

## Acceptance criteria

- Conceptual importance can be understood without color.
- Repeated callouts do not dominate adjacent prose.
- All code blocks use one structural system.
- Copy controls are comfortably operable by keyboard and pointer.
- Contrast is validated for both light and dark themes.

---

# Phase 4 — Reduce metadata and site-chrome distraction

## Goal

Keep useful provenance available without making repository maintenance history part of the lesson's primary reading
flow.

## Scope

### Lesson metadata

The top metadata panel currently gives significant space to:

- author;
- last update;
- multiple recent commits.

Author and update date are useful learner-facing provenance.

The full commit list is primarily maintainer-oriented.

Replace the current panel with a compact lesson header:

```text
La biblioteca como artefacto de software

Ignacio Slater-Muñoz · Actualizado 13 ago 2026
```

Then expose detailed provenance through a disclosure:

```text
▸ Historial de cambios
```

or through a dedicated metadata/details surface.

This preserves research and maintenance provenance without making it the second-most-prominent element after the H1.

### Global header

Reduce the height and saturation of the top navigation during lesson reading.

The current purple bar visually competes with every lesson heading.

Possible approach:

- retain the purple brand color;
- reduce header height;
- use a darker/subtler background in reading mode;
- reserve strong purple for the DIBS identity and active item.

### External links

GitLab and GitHub should remain secondary utility actions rather than equal peers of course navigation.

Group them visually as repository/source utilities.

### Theme control

Keep the theme selector accessible but reduce its visual prominence.

Prefer a concise control such as:

```text
Theme: Auto
```

or an icon plus accessible label, depending on the existing component vocabulary.

## Acceptance criteria

- H1 is the first dominant content element.
- Commit history remains accessible but does not precede the lesson conceptually.
- Global navigation remains recognizable without visually dominating the lesson.
- Repository links are distinguishable from learner navigation.

---

# Phase 5 — Strengthen learning-oriented navigation

## Goal

Help learners understand both **where they are** and **what comes next**.

## Scope

### Add lightweight lesson context

Above the title, add contextual information such as:

```text
Unidad 1 · Introducción al desarrollo de bibliotecas
```

This is more useful during reading than repeating global navigation.

### Current-section tracking

Synchronize the right-side TOC with scrolling.

Do not change the URL continuously unless there is a concrete benefit; highlighting the active heading is sufficient.

### Previous / next lesson

The current bottom navigation is useful but can carry more context.

Instead of only:

```text
← Taxonomía básica de artefactos de software

Diseñar la API desde el dominio →
```

prefer:

```text
Anterior
Taxonomía básica de artefactos de software

Siguiente
Diseñar la API desde el dominio
```

Optionally expose the unit context in smaller text.

### Back-to-top

For very long lessons, add a subtle back-to-top action near the ending/navigation region rather than a permanently
floating button.

### Preserve the pedagogical ending

The current sequence:

```text
Conclusiones
Puntos clave
Reflexión de cierre
¿Con ganas de más?
Referencias
Anterior / siguiente
```

is conceptually strong.

I would **keep it**, but improve visual differentiation:

- `Conclusiones` → prose;
- `Puntos clave` → compact summary component;
- `Reflexión de cierre` → exercise/reflection component;
- `Referencias recomendadas` → quieter bibliography list.

Do not make all four look like equivalent major sections.

## Acceptance criteria

At any point in a long lesson, a learner can determine:

- the current unit;
- the current lesson;
- the current major section;
- the preceding and next lesson.

The heading hierarchy remains logical, which supports both visual navigation and assistive-technology navigation.
([W3C][1])

---

# Phase 6 — Make responsive and accessible behavior a first-class contract

## Goal

Prevent the redesign from optimizing only for the 2048-pixel desktop view shown in the screenshots.

## Scope

Define a validation matrix for at least:

```text
320 px
390 px
768 px
1024 px
1440 px
1920+ px
```

and:

```text
light
dark
```

### Keyboard interaction

Validate:

- global navigation;
- sidebar;
- sidebar disclosure controls;
- local TOC;
- theme selector;
- code-copy buttons;
- previous/next links.

Focus order should preserve the page's meaningful sequence. ([W3C][5])

### Focus visibility

Use a site-wide focus token rather than component-specific ad hoc focus styles.

The indicator must remain clearly visible against all surfaces, including:

- purple navigation;
- code blocks;
- callouts;
- main background.

WCAG explicitly requires visible focus and contrast for meaningful non-text UI states. ([W3C][6])

### Landmarks

Ensure the page uses native semantic regions:

```html
<header>
<nav aria-label="Navegación principal">
<nav aria-label="Contenido del curso">
<main>
<aside>
<footer>
```

When multiple navigation regions exist, each should have an appropriate accessible label. WAI specifically recommends
distinguishing multiple regions of the same type. ([W3C][7])

### Skip navigation

Add a first-focusable:

```text
Saltar al contenido
```

and optionally:

```text
Saltar a la navegación de la lección
```

where that materially improves keyboard navigation.

## Acceptance criteria

- No essential lesson information disappears at narrow widths.
- No page-level horizontal scroll is needed for normal prose.
- Code may scroll internally where necessary.
- Interactive targets meet WCAG 2.2 AA minimum sizing.
- Keyboard focus is never obscured by sticky UI.
- Each navigation region has an unambiguous accessible purpose.
- The lesson works without client-side JavaScript except enhancements such as current-heading tracking or copy feedback.

---

# Phase 7 — Extract a small lesson UI system

## Goal

Make the improved design reusable across every note without creating a monolithic “lesson component.”

## Scope

Once the new visual contracts have proven useful, extract cohesive components such as:

```text
lesson/
    LessonHeader.astro
    LessonSidebar.astro
    LessonToc.astro
    LessonPager.astro
    LessonMetadata.astro

content/
    Callout.astro
    CodeBlock.astro
    KeyPoints.astro
    Reflection.astro
```

Keep content models typed and separate from rendering where useful.

Prefer semantic variants:

```ts
type CalloutKind =
    | "concept"
    | "note"
    | "caution"
    | "key-point";
```

rather than accepting arbitrary color/style combinations.

That keeps unsupported visual states harder to construct and follows the project's preference for explicit contracts and
coherent modular boundaries.

## Acceptance criteria

- No component becomes a generic style-parameter container.
- Repeated lesson chrome is defined once.
- Content semantics determine presentation.
- Components remain small and focused.
- Page-specific composition stays in the page/layout layer.

## Non-goals

- Building a general-purpose design-system package.
- Introducing a component dependency solely for these patterns.
- Converting static components into hydrated React components without an interaction requirement.

---

# Phase 8 — Add UI regression and accessibility assurance

## Goal

Turn the intended reading experience into an executable contract rather than relying on manual screenshot inspection.

## TDD strategy

### BDD structural tests

Examples:

> given a lesson when it is rendered then exactly one H1 identifies the lesson

> given a lesson with sections when the local table of contents is rendered then every entry targets an existing section

> given a nested course tree when the current lesson is displayed then exactly one lesson is marked as current

### DDT

Use data-driven coverage across:

- viewport sizes;
- themes;
- callout kinds;
- code languages;
- lessons with shallow/deep navigation;
- lessons with/without references.

### Playwright visual regression

Capture a **small intentional matrix**, not screenshots of every page:

```text
representative lesson × desktop dark
representative lesson × desktop light
representative lesson × mobile dark
navigation-heavy lesson × desktop
code-heavy lesson × desktop
```

Avoid a huge brittle golden-image suite.

### Automated accessibility checks

If Playwright is already part of or appropriate for the project, add `@axe-core/playwright` for automatically detectable
accessibility issues; Playwright's own documentation recommends this integration for accessibility testing.
([Playwright][8])

Also consider Playwright ARIA snapshots for a few structural contracts such as:

```text
banner
navigation
main
heading hierarchy
complementary TOC
contentinfo
```

Playwright supports accessibility-tree snapshot assertions for this purpose. ([Playwright][9])

Automated accessibility checks complement rather than replace keyboard and visual inspection.

## Acceptance criteria

CI verifies:

```text
semantic rendering
responsive smoke coverage
selected visual baselines
automated accessibility checks
production build
```

No snapshot is added merely because a component exists; snapshots protect **meaningful UX contracts**.

---

# Priority

I would implement the work in this order:

| Priority | Work                                                  | Reason                                           |
| -------- | ----------------------------------------------------- | ------------------------------------------------ |
| **P0**   | Reading width, navigation hierarchy, responsive shell | Largest improvement to the core reading task     |
| **P0**   | Typography and vertical rhythm                        | Affects every minute spent on a lesson           |
| **P0**   | Accessibility/focus/keyboard contracts                | Correctness, not polish                          |
| **P1**   | Reduce metadata and global-chrome prominence          | Removes distraction                              |
| **P1**   | Simplify callouts and code-block hierarchy            | Reduces visual fatigue                           |
| **P1**   | In-page TOC and lesson orientation                    | Major benefit for long notes                     |
| **P2**   | Component extraction                                  | Do after the interaction/visual model stabilizes |
| **P2**   | Broader visual-regression matrix                      | Add selectively after redesign stabilizes        |

## Minimum useful vertical slice

I would **not** begin by building new components or changing all colors.

The first implementation slice should be:

```text
1. constrain and center the reading measure;
2. make the current lesson obvious in the sidebar;
3. add “En esta página” on wide screens;
4. compact the metadata block;
5. normalize H1/H2/body spacing;
6. verify desktop + mobile + keyboard;
7. only then extract reusable components.
```

That should already produce a substantial UX improvement while keeping the risk small.

## What I would deliberately preserve

The screenshots contain several decisions worth retaining:

- persistent access to the course outline;
- dark mode as a first-class theme;
- strong code/prose distinction;
- explicit conceptual callouts;
- end-of-lesson `Puntos clave`;
- `Reflexión de cierre`;
- recommended references;
- previous/next lesson navigation.

The redesign should **make those elements easier to understand, not replace them**.

The strongest overall change would be to move from the current **“many equally prominent containers”** model to a
**reader-first hierarchy: quiet shell → clear prose → selective emphasis**. That would give the material a much more
polished textbook/documentation feel without losing DIBS's existing identity.

[1]: https://www.w3.org/WAI/tutorials/page-structure/headings/?utm_source=chatgpt.com "Headings | Web Accessibility Initiative (WAI)"
[2]: https://www.w3.org/TR/WCAG22/?utm_source=chatgpt.com "Web Content Accessibility Guidelines (WCAG) 2.2"
[3]: https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html?utm_source=chatgpt.com "Understanding Success Criterion 1.4.4: Resize Text | WAI"
[4]: https://www.w3.org/WAI/WCAG22/quickref/?utm_source=chatgpt.com "How to Meet WCAG (Quick Reference)"
[5]: https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html?utm_source=chatgpt.com "Understanding Success Criterion 2.4.3: Focus Order | WAI"
[6]: https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html?utm_source=chatgpt.com "Understanding Success Criterion 1.4.11: Non-text Contrast"
[7]: https://www.w3.org/WAI/tutorials/page-structure/regions/?utm_source=chatgpt.com "Page Regions | Web Accessibility Initiative (WAI)"
[8]: https://playwright.dev/docs/accessibility-testing?utm_source=chatgpt.com "Accessibility testing"
[9]: https://playwright.dev/docs/aria-snapshots?utm_source=chatgpt.com "Snapshot testing"
