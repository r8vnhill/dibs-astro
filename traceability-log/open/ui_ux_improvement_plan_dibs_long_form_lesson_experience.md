# Plan — Wide Complementary-Readings Workspace

## Summary

Redesign `/readings/software-libraries/what-is/` as a **wide academic reading workspace** optimized for guided complementary material.

The page will use:

* a wide readings-specific shell of approximately `1180px`;
* a flexible main region rather than forcing the entire column to `65–75ch`;
* a prose measure of approximately `65–75ch` **inside text-heavy regions**;
* a contextual reading-navigation rail on sufficiently wide layouts;
* wider reference cards that use the available horizontal space to organize pedagogical information;
* a single-column static fallback;
* optional JavaScript only for current-section indication.

The architectural distinction should be:

```text
viewport
    │
    ▼
readings page shell
    ├── main content region
    │       ├── prose → constrained readable measure
    │       └── cards → may use full main-region width
    │
    └── contextual navigation rail
```

Do **not** constrain the entire main column to `75ch`; doing so would recreate much of the white-space problem. Only prose needs the narrower reading measure.

The bibliographic catalog remains authoritative for publication metadata. `lesson-readings.ts` remains authoritative for lesson-specific pedagogical guidance.

This initiative intentionally changes presentation and navigation affordances while preserving content, bibliographic identity, routes, and no-JavaScript navigation.

---

# Architectural decisions

## 1. Keep the wide layout readings-specific

Do not change the global lesson layout.

Prefer page-scoped semantic tokens such as:

```text
--readings-shell-max
--readings-prose-max
--readings-rail-width
--readings-column-gap
--sticky-header-offset
```

Place genuinely reusable theme/focus tokens in the shared design-token layer, but keep readings-only dimensions close to the readings UI.

Astro scopes component styles by default, which makes localized layout changes practical without introducing global selector coupling. ([Astro Docs][1])

---

## 2. Use viewport queries for the page shell, container queries for reusable cards

The original plan uses `900px` for both page layout and card layout.

These are different concerns.

Use **viewport/media queries** for:

```text
main + rail
        ↓
single-column page
```

because that decision depends on the available page viewport.

Use **CSS container queries** inside `GuidedReferenceEntry` for:

```text
2-column pedagogical grid
        ↓
1-column pedagogical grid
```

because the card should react to its own available width, not know where in the page it happens to be rendered.

Container queries are specifically designed to allow reusable components to adapt according to their containing block rather than viewport size. ([MDN Web Docs][2])

This makes `GuidedReferenceEntry` more reusable without adding JavaScript or another dependency.

---

## 3. Keep the static document authoritative

The static HTML must provide:

* all section links;
* all reference content;
* all navigation;
* the reading path;
* the return-to-lesson link.

JavaScript may only enhance:

```text
visible section
      ↓
current navigation indicator
```

A failure or absence of JavaScript must not prevent navigation.

This maintains Astro's static-first architecture and keeps the enhancement as a very small imperative shell.

---

## 4. Do not test CSS class names as behavior

Remove tests such as:

> existence of the wide shell

if that means asserting `class="max-w-..."` or another styling implementation detail.

Instead test observable contracts:

> given a wide viewport, the main content and contextual navigation are simultaneously visible and do not overlap.

Astro/Vitest tests should verify **structure and semantics**. Playwright should verify **layout, browser behavior, responsive behavior, progressive enhancement, and accessibility**. Astro's current testing documentation explicitly supports both component-level testing and Playwright for end-to-end browser testing. ([Astro Docs][3])

---

# Phase 1 — Characterize the existing readings contract

## Goal

Protect content, bibliographic behavior, and navigation semantics before changing presentation.

## Scope

Characterize:

* `/readings/software-libraries/what-is/`;
* `GuidedReferenceEntry.astro`;
* `lesson-readings.ts`;
* existing bibliography rendering;
* existing heading/anchor IDs;
* return-to-lesson navigation.

No production CSS changes yet.

## Red

Add BDD-style characterization tests such as:

> given the complementary readings configuration
> when the page is rendered
> then each reading appears in its configured stage and preserves its bibliographic target.

> given a guided reference
> when it is rendered
> then its bibliographic information and four pedagogical guidance fields remain available.

Cover:

* three existing reading stages;
* ordering;
* bibliography title/link;
* badges/metadata values;
* “Por qué leerlo”;
* “En qué enfocarse”;
* “Después de leer”;
* “Pregunta guía”;
* top and bottom navigation destinations.

## Green

No behavior change should be necessary: capture current expectations.

## Refactor

Consolidate repeated fixtures/builders if the tests expose duplicated setup.

Do not extract production abstractions merely for testing.

## Acceptance criteria

* current content and ordering are characterized;
* current anchor targets are characterized;
* tests distinguish bibliographic metadata from pedagogical metadata;
* all characterization tests pass before visual work starts.

## Non-goals

* snapshotting full rendered HTML;
* locking existing CSS classes;
* preserving accidental spacing/layout behavior.

---

# Phase 2 — Introduce the wide readings shell

## Goal

Use substantially more desktop horizontal space while preserving readable prose and collapsing cleanly to one column.

## Scope

Primary file:

```text
src/pages/readings/software-libraries/what-is/index.astro
```

Add only the reusable tokens that have a genuine design-system role.

### Desktop layout

Prefer a flexible grid rather than hard-coded column widths:

```text
┌──────────────────────────────────────────────────────────────┐
│ header                                                       │
├─────────────────────────────────────┬────────────────────────┤
│ minmax(0, 1fr)                     │ ~14–18rem rail         │
│                                     │                        │
│ main                                │ contextual navigation  │
└─────────────────────────────────────┴────────────────────────┘
```

Conceptually:

```css
grid-template-columns:
    minmax(0, 1fr)
    minmax(14rem, 18rem);
```

with the complete shell constrained to approximately `1180px`.

### Important distinction

Use a dedicated prose utility/container:

```text
main width          → wide
paragraph measure   → <= ~72ch
reference card      → full main width
section surface     → full main width
```

This is the primary mechanism for actually filling the current empty space.

### Responsive shell

Choose the breakpoint empirically from content.

Do not encode “900px” as a requirement merely because it appeared in the initial proposal.

The rail should collapse when the combination of:

```text
comfortable main width + rail width + gap
```

can no longer fit without compromising either region.

## Suggested TDD cycles

### Cycle 2.1 — Wide shell

**Red**

> given a sufficiently wide viewport
> when the readings page is displayed
> then the reading content and contextual region fit side by side without overlap.

**Green**

Implement the two-column shell.

**Refactor**

Move repeated layout values into readings-specific tokens.

### Cycle 2.2 — Narrow shell

**Red**

> given a narrow viewport
> when the readings page is displayed
> then all content reflows into one column without horizontal page scrolling.

**Green**

Add the single-column state.

**Refactor**

Remove duplicated wide/narrow markup; change only layout.

## Acceptance criteria

* desktop shell reaches approximately `1100–1180px` where space permits;
* prose remains constrained independently of card width;
* cards can occupy the available main region;
* rail collapses before either column becomes cramped;
* page has no horizontal overflow at narrow viewport sizes;
* lesson pages remain visually unchanged.

## Non-goals

* redesigning the global course shell;
* changing the regular lesson content width;
* introducing a generalized layout framework.

---

# Phase 3 — Add contextual route navigation as progressive enhancement

## Goal

Use the new side rail to provide persistent orientation without making JavaScript a navigation dependency.

## Scope

Add one focused component, for example:

```text
ReadingRouteNav.astro
```

Avoid introducing a general-purpose navigation subsystem.

The component renders:

* `Ruta de lectura`;
* links to the three reading stages;
* short stage descriptions;
* persistent “Volver a la lección”.

### Static contract

Without JavaScript:

* every link works;
* clicking a stage moves to the correct heading;
* all stages remain discoverable;
* nothing is incorrectly marked as currently active.

### Enhanced contract

With JavaScript:

* an `IntersectionObserver` observes the stage headings;
* at most one navigation item has `aria-current="location"`;
* the indicator has non-color affordances;
* the active state updates while scrolling.

`aria-current` is intended to identify the current item within a related set; only one element in that set should normally be marked current. ([MDN Web Docs][4])

### Imperative-shell boundary

Keep observer setup as a tiny effectful adapter.

Conceptually:

```text
section observations
        ↓
choose current section
        ↓
update aria-current
```

If section-selection rules become nontrivial, extract that selection policy into a pure function and test it separately.

Do not abstract the observer prematurely.

### Anchor behavior

Centralize sticky offsets so that both:

```text
scroll-padding-top
scroll-margin-top
```

derive from the same design value.

## Suggested TDD cycles

### Cycle 3.1 — Static navigation

**Red**

> given JavaScript is unavailable
> when a reading-stage link is activated
> then its target section remains reachable.

**Green**

Render semantic anchor navigation.

### Cycle 3.2 — Current-section enhancement

**Red**

> given JavaScript is available
> when the viewport moves from one reading stage to another
> then exactly one corresponding route link becomes current.

**Green**

Add the observer enhancement.

**Refactor**

Keep DOM effects isolated from section-selection policy.

## Acceptance criteria

* navigation works with scripting disabled;
* route nav has `aria-label="Ruta de lectura"`;
* zero or one item is marked current;
* current state is not communicated using color alone;
* anchor destinations are not obscured by the sticky site header;
* no hydration framework or client island is introduced merely for scrollspy behavior.

## Non-goals

* animated scrolling;
* history manipulation;
* preserving active stage across page loads;
* generic scrollspy infrastructure.

---

# Phase 4 — Restructure guided references around their container

## Goal

Use card width to expose pedagogical relationships and reduce unnecessary vertical stacking.

## Scope

Primary component:

```text
src/components/ui/references/GuidedReferenceEntry.astro
```

Preserve bibliographic rendering delegation.

### Responsibility boundary

`GuidedReferenceEntry` should own:

* card composition;
* pedagogical badges;
* four guidance fields;
* guiding-question treatment.

The bibliographic renderer continues to own:

* title;
* authors;
* venue/source;
* canonical external target;
* bibliographic formatting.

`lesson-readings.ts` continues to own:

* reading role;
* difficulty;
* extent;
* why;
* focus;
* learning outcome;
* guiding question.

No metadata should migrate merely to simplify rendering.

### Card composition

Use:

```text
reference heading / bibliography
badges

┌────────────────────────┬────────────────────────┐
│ Por qué leerlo         │ En qué enfocarse      │
├────────────────────────┼────────────────────────┤
│ Después de leer        │ Pregunta guía         │
└────────────────────────┴────────────────────────┘
```

The exact visual arrangement may place `Pregunta guía` across the full width if usability testing shows that to be clearer.

### Container-responsive behavior

Make the guidance region a size-query container and change its internal grid based on the card's actual inline size. CSS container queries allow precisely this kind of component-local adaptation. ([MDN Web Docs][2])

Do not tie card behavior to the viewport breakpoint of the page shell.

### Guiding question

Give it:

* semantic heading/label;
* question icon;
* subtle purple accent;
* sufficient text contrast.

Do not introduce:

* answer storage;
* client state;
* quizzes;
* form controls.

## Suggested TDD cycles

### Cycle 4.1 — Preserve bibliographic rendering

**Red**

> given a guided reading
> when the card is rendered
> then its canonical bibliography is still produced by the existing bibliography renderer.

### Cycle 4.2 — Structured guidance

**Red**

> given all four pedagogical fields
> when the entry has sufficient container width
> then the fields are organized into the expanded guidance layout.

### Cycle 4.3 — Container collapse

**Red**

> given the same entry in a narrow container
> when rendered
> then all guidance remains available in a single-column flow.

## Acceptance criteria

* bibliographic output is unchanged semantically;
* the four pedagogical fields remain present;
* no pedagogical content is duplicated;
* the card fills the main content region where appropriate;
* card layout responds to its own width;
* guiding question is visually distinguishable without conveying meaning through color alone.

## Non-goals

* making every reference component use cards;
* changing the global bibliography renderer;
* interactive answers.

---

# Phase 5 — Improve orientation, section grouping, and page closure

## Goal

Use the wider shell consistently from the first viewport to the final navigation action.

## Scope

### Header

Restructure to:

```text
← Todas las lecturas

La biblioteca como artefacto de software
Lecturas complementarias

short description                          [Volver a la lección]
```

The CTA should remain an ordinary link semantically unless it performs button-like behavior.

### “Cómo usar estas lecturas”

Render the current three-stage route visually:

```text
Fundamentos → Aplicación → Profundización
```

Keep the stages as semantic text/headings/list items.

Arrows are decorative.

On small containers:

```text
Fundamentos
    ↓
Aplicación
    ↓
Profundización
```

### Section surfaces

Introduce one reusable `ReadingStage` component **only if** the three sections currently repeat meaningful markup.

A section owns:

* stage number;
* title;
* brief purpose;
* its readings.

Avoid extraction if it would merely wrap five lines of markup.

### Closing navigation

Add:

```text
¿Terminaste de explorar?

Volver a la lección
Ver todas las lecturas
```

and the optional reminder that the complementary sources are not prerequisites for continuing.

## Suggested TDD cycles

1. header/navigation hierarchy;
2. three-stage orientation path;
3. section framing;
4. closing navigation.

## Acceptance criteria

* all three stages appear once;
* stage order remains driven by `lesson-readings.ts`;
* upper and lower CTAs resolve to the same canonical lesson/index destinations;
* no content is duplicated to achieve the visual path;
* the resulting page remains useful as a linear document when CSS is unavailable.

## Non-goals

* course-wide CTA redesign;
* new site navigation concepts;
* changing the pedagogical order.

---

# Phase 6 — Accessibility and browser assurance

## Goal

Verify the final experience at the level where its new behavior actually exists: the browser.

WCAG 2.2 AA requires pointer targets to meet a minimum `24 × 24 CSS px` criterion subject to specified exceptions, and the redesign should explicitly protect that requirement for standalone navigation controls. ([W3C][5])

## Tooling decision

### Playwright

If Playwright is already present, reuse the existing configuration.

If it is not present, add it as the E2E layer rather than attempting to simulate layout in Vitest. Astro currently documents Playwright as a supported end-to-end testing approach. ([Astro Docs][3])

### axe

Add `@axe-core/playwright` if not already available. Playwright's own accessibility-testing documentation uses this integration. ([Playwright][6])

Resolve the current stable releases at implementation time and pin/update them according to the repository's existing dependency and lockfile policy rather than introducing a separate versioning convention.

### Important limitation

Do not treat:

```text
axe passes
```

as equivalent to:

```text
WCAG conformant
```

Playwright explicitly notes that automated accessibility tooling catches only some accessibility issues and recommends combining automation with manual assessment. ([Playwright][6])

---

## Browser-test matrix

Avoid a full Cartesian product of every viewport × browser × theme unless CI cost is negligible.

### Main responsive DDT — Chromium

Use:

```text
1440 × 900
1280 × 800
1024 × 768
768 × 1024
390 × 844
```

Test observable layout contracts:

* wide shell;
* rail presence/collapse;
* no overlap;
* no page-level horizontal overflow;
* card expansion/collapse;
* anchor navigation;
* active-section behavior.

### Cross-engine smoke coverage

At one representative desktop and one narrow viewport, run:

* Chromium;
* WebKit;
* Firefox.

Playwright supports these browser engines for Astro E2E testing. ([Astro Docs][3])

This provides useful interoperability evidence without multiplying the entire suite unnecessarily.

### Accessibility coverage

Run axe at minimum for:

```text
desktop × light
desktop × dark
mobile × light
mobile × dark
```

Then add explicit assertions for things axe cannot reliably establish:

* only zero/one `aria-current`;
* current indicator has a non-color cue;
* focused route links are not obscured by sticky elements;
* headings remain visible after anchor navigation;
* page can be traversed by keyboard;
* 200%/400% zoom/reflow receives a manual acceptance check.

---

# Testing responsibility matrix

The original plan mixes several checks between Astro/Vitest and Playwright. I would make the boundary explicit:

| Concern                                | Test layer                  |
| -------------------------------------- | --------------------------- |
| reading configuration/order            | Vitest                      |
| bibliography preserved                 | Astro component/Vitest      |
| semantic headings/landmarks            | Astro component + E2E smoke |
| guidance fields rendered               | Astro component/Vitest      |
| link target IDs exist                  | Vitest/integration          |
| wide vs. narrow geometry               | Playwright                  |
| sticky rail behavior                   | Playwright                  |
| container-responsive card behavior     | Playwright                  |
| `aria-current` scroll behavior         | Playwright                  |
| horizontal overflow                    | Playwright                  |
| focus visibility                       | Playwright + manual         |
| automated accessibility findings       | Playwright + axe            |
| real readability/zoom/keyboard quality | manual acceptance           |

In particular, remove a Vitest assertion for **“existence of the wide shell.”** Layout is browser behavior, not an HTML-string contract.

---

# Phase 7 — Cleanup, documentation, and traceability

## Goal

Finish the redesign without leaving one-off infrastructure or undocumented visual contracts.

## Scope

After all behavior is green:

* remove superseded `max-w-4xl`/page-specific layout rules;
* deduplicate spacing/focus tokens;
* keep new components under the project's size guidelines;
* keep functions/scripts short;
* ensure terminology is consistent across component names, tests, and documentation;
* document the readings layout's intentional distinction from normal lesson pages;
* update traceability/design documentation if the repository uses it.

## Acceptance criteria

* no obsolete parallel readings layout remains;
* no component exceeds project size heuristics without a cohesion-based reason;
* no JavaScript dependency exists for basic navigation;
* all design tokens have one authoritative definition;
* no duplicate breakpoint/layout logic exists unnecessarily;
* full project quality gate is green.

---

# Principal files

Likely production surface:

```text
src/pages/readings/software-libraries/what-is/index.astro

src/components/ui/references/
    GuidedReferenceEntry.astro
    ReadingRouteNav.astro          # new, if no equivalent exists
    ReadingPath.astro              # new only if markup warrants extraction

src/data/readings/
    lesson-readings.ts
```

I would **not automatically introduce a `ReadingsShell.astro`** yet. There is currently one page consuming this specialized layout. Keep the shell in `index.astro` until a second readings page demonstrates a reusable abstraction.

If the existing `/readings/` index or another page immediately shares the same shell, promote it then.

This avoids speculative generalization while still keeping obvious semantic components reusable.

---

# Explicit behavior-preservation boundary

## Intentionally changes

* page width;
* responsive composition;
* card layout;
* visual hierarchy;
* sticky contextual navigation;
* dynamic active-section indication;
* upper/lower navigation presentation.

## Must remain unchanged

* `/readings/software-libraries/what-is/` route;
* lesson route;
* reference IDs;
* bibliography/catalog metadata;
* reference order;
* reading-stage classification;
* pedagogical text;
* external bibliographic links;
* no-JavaScript navigation semantics;
* layouts of ordinary lessons.

This distinction should appear in the implementation traceability record so UI changes do not inadvertently become content changes.

---

# Suggested execution order

```text
Phase 1
Characterize current semantics
        │
        ▼
Phase 2
Wide shell + reflow
        │
        ├──────────────────┐
        ▼                  ▼
Phase 3                Phase 4
Route navigation       Guided cards
        │                  │
        └────────┬─────────┘
                 ▼
Phase 5
Header/path/sections/closing
                 │
                 ▼
Phase 6
Browser + accessibility assurance
                 │
                 ▼
Phase 7
Cleanup + documentation
```

Phases 3 and 4 can proceed in parallel once the shell's structural contract is stable.

---

# Minimum useful vertical slice

Before converting the whole page, implement:

```text
wide readings shell
        +
one contextual rail
        +
one Parnas card
        +
container-responsive pedagogical grid
        +
one guiding-question treatment
        +
wide/narrow Playwright assertions
        +
one axe scan
```

Use the Parnas entry because it exercises nearly the entire reference-card contract while remaining contentually straightforward.

Only after this slice passes:

* desktop;
* narrow viewport;
* keyboard navigation;
* automated accessibility;

should the rest of the entries be migrated.

---

# Final acceptance criteria

The redesign is complete when:

* the readings page uses the available desktop canvas substantially better than the current narrow layout;
* ordinary prose remains within a comfortable reading measure while structured content can use the wider main region;
* the page becomes one column before the rail compromises reading width;
* every reading remains available and in its original stage/order;
* every card adapts to its **container**, not a hard-coded viewport assumption;
* static navigation works with JavaScript disabled;
* the current-stage indicator is progressive enhancement only;
* no more than one route link is exposed as current;
* sticky navigation does not obscure anchor or keyboard destinations;
* standalone interactive targets satisfy the WCAG 2.2 AA target-size requirement or a documented exception applies; ([W3C][5])
* no page-level horizontal overflow occurs at the supported narrow viewport;
* Chromium responsive DDT and cross-engine smoke checks pass;
* axe reports no automatically detectable issues in the declared light/dark representative cases;
* keyboard, zoom/reflow, and focus behavior receive a manual acceptance pass because automated testing alone cannot establish accessibility conformance; ([Playwright][6])
* ordinary lesson layouts remain unchanged;
* the complete repository quality gate passes.

## Priority

I would classify the work as:

**Required**

* characterization before refactor;
* wide shell/prose-measure separation;
* responsive one-column fallback;
* semantic static route navigation;
* accessibility/focus/reflow assurance.

**High value**

* container-query-based guided cards;
* sticky route rail;
* structured guiding-question presentation;
* Playwright + axe browser assurance.

**Optional follow-up**

* visual screenshot regression tests for a small number of stable layout primitives;
* reuse of the shell across additional readings pages once a second concrete consumer exists;
* more sophisticated current-section algorithms if the simple observer proves insufficient.

This version stays deliberately conservative about abstraction: it adds reusable boundaries where the design already has a domain concept—**guided reference** and **reading route**—but does not create a general layout system merely because this first readings page needs a wider canvas. That balance is much closer to the project's stated preference for modularity without speculative layers.

[1]: https://docs.astro.build/en/guides/styling/?utm_source=chatgpt.com "Styles and CSS - Astro Docs"
[2]: https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Containment/Container_queries "CSS container queries - CSS | MDN"
[3]: https://docs.astro.build/en/guides/testing/ "Testing | Docs"
[4]: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-current?utm_source=chatgpt.com "ARIA: aria-current attribute - MDN Web Docs - Mozilla"
[5]: https://www.w3.org/TR/WCAG22/ "Web Content Accessibility Guidelines (WCAG) 2.2"
[6]: https://playwright.dev/docs/accessibility-testing "Accessibility testing | Playwright"
