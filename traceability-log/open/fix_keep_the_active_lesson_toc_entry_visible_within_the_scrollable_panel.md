# Fix: keep the active lesson-TOC entry visible within the scrollable panel

You’re right. My previous revision leaned too heavily on example-based TDD and treated the other testing techniques as
optional background. The project guidelines explicitly require considering the appropriate combination of
**BDD/example-based testing, DDT, PBT, differential testing, metamorphic testing, mutation testing, fuzzing,
model/state-machine testing, contract testing, static analysis, and browser-level verification**, selecting each based
on expected value rather than defaulting to unit tests.

For this particular change, several of those techniques are genuinely useful. I would revise the testing strategy
substantially.

## Revised assurance strategy

The change actually contains three distinct things that should be tested differently:

```text
Pure geometry
    ↓
Active-section / manual-scroll state transition
    ↓
Real browser DOM + CSS scrolling behavior
```

That suggests:

| Technique                   |                             Use? | Role                                                                    |
| --------------------------- | -------------------------------: | ----------------------------------------------------------------------- |
| BDD/example tests           |                     **Required** | Regression scenarios and understandable boundaries                      |
| DDT                         |                     **Required** | Geometry matrix                                                         |
| PBT                         |                   **High value** | General geometric invariants                                            |
| Metamorphic testing         |                   **High value** | Coordinate-system transformations                                       |
| Model/state-machine testing |                   **High value** | Active-section changes vs manual TOC scrolling                          |
| Browser integration/E2E     |                     **Required** | Actual layout and scrolling                                             |
| Mutation testing            |                   **High value** | Check whether boundaries and transition guards are genuinely protected  |
| Contract testing            |                       **Useful** | Stable DOM contract between Astro markup and client script              |
| Differential testing        |                 **Probably not** | No sufficiently independent equivalent implementation                   |
| Fuzz testing                |                **Not justified** | Numeric geometry is better handled with PBT                             |
| Mock testing                |                        **Avoid** | Browser geometry mocks would mostly recreate implementation assumptions |
| Snapshot testing            |                        **Avoid** | Little value for dynamic scrolling behavior                             |
| Static analysis             | **Required via project tooling** | TypeScript/Astro correctness                                            |

That is much closer to what the review guidelines ask for.

# Revised plan

Because the change remains small, I would still use **Red–Green–Refactor cycles**, but each cycle should deliberately
use the most appropriate verification technique rather than treating all tests as conventional examples.

---

## TDD cycle 1 — Define the geometry contract with BDD + DDT

### Goal

Specify the complete deterministic contract for deciding whether the TOC must move and, if so, its target `scrollTop`.

### Scope

Add:

```text
src/components/notes/lesson-toc-scroll.ts
src/components/notes/__tests__/lesson-toc-scroll.test.ts
```

Keep the production logic pure and independent of browser APIs.

For example:

```ts
export interface TocViewport {
    scrollTop: number;
    top: number;
    height: number;
}

export interface TocItemGeometry {
    top: number;
    height: number;
}

export function computeRevealScrollTop(
    viewport: TocViewport,
    item: TocItemGeometry,
): number | null;
```

I would **not** mix `activeId` state into this function after all. Geometry and interaction state are different concerns
and have different useful properties to test.

### Red — BDD regression examples

Cover the semantic cases:

```text
given an item fully visible inside the TOC viewport
when its reveal position is computed
then no scroll adjustment is requested

given an item extending above the viewport
when its reveal position is computed
then the smallest upward adjustment is returned

given an item extending below the viewport
when its reveal position is computed
then the smallest downward adjustment is returned

given an item taller than the viewport
when its reveal position is computed
then its top is aligned with the viewport

given an item exactly aligned with the viewport boundaries
when its reveal position is computed
then no adjustment is requested
```

### Red — DDT matrix

The boundaries are particularly suitable for `test.each`.

For example:

```ts
test.each([
    // viewport, item, expected
    // fully inside
    // exactly top-aligned
    // exactly bottom-aligned
    // one pixel above
    // one pixel below
    // completely above
    // completely below
    // same height as viewport
    // taller than viewport
])(...)
```

DDT is preferable here to several nearly identical test functions because the behavior is essentially a classification
over numeric intervals.

### Green

Implement the smallest pure calculation satisfying the matrix.

### Refactor

Keep geometry terminology independent of particular DOM APIs such as `offsetTop` or `getBoundingClientRect()`.

That allows the browser adapter to change without changing the domain contract.

### Acceptance criteria

- all interval boundaries are explicitly represented;
- exact-edge positions do not produce unnecessary scrolling;
- returned targets represent the minimum movement needed;
- oversized entries follow the documented top-alignment rule;
- no DOM types occur in the pure module.

---

# TDD cycle 2 — Add property-based tests for geometry invariants

### Goal

Verify that the reveal calculation remains correct across a much larger numeric state space than hand-selected examples
can cover.

### Why PBT fits

This function has:

- a compact input domain;
- clear invariants;
- many boundary combinations;
- deterministic output;
- no effects.

That is almost an ideal PBT target according to the project's testing guidance.

### Scope

First inspect whether the repository already uses a mature TypeScript PBT library such as `fast-check`.

If it does, reuse it.

If it does not, evaluate adding `fast-check` as a **test-only dependency**. It is mature enough that this would be a
defensible dependency, but the dependency should not be introduced merely for one trivial property if the repository
does not intend to use PBT elsewhere.

### Properties

#### Property 1 — Already-visible items are stable

For every valid viewport and item satisfying:

```text
itemTop >= viewportTop
itemBottom <= viewportBottom
```

the result must be:

```text
null
```

#### Property 2 — Upward reveal exposes the top edge

For every item whose top is above the viewport:

```text
target <= currentScrollTop
```

and applying the returned adjustment places the item top exactly at the visible top.

#### Property 3 — Downward reveal exposes the bottom edge

For every non-oversized item extending below the viewport:

```text
target >= currentScrollTop
```

and after applying it:

```text
itemBottom == viewportBottom
```

in container-relative coordinates.

#### Property 4 — No unnecessary movement

Whenever a target is returned, moving by any smaller amount in the required direction must leave some part of the
relevant edge outside the viewport.

This directly verifies the “minimum adjustment” requirement.

#### Property 5 — Determinism

For identical geometry:

```text
computeRevealScrollTop(x) === computeRevealScrollTop(x)
```

This property is mathematically trivial, but there is no need to write it as a separate test because purity already
follows structurally. Avoid low-value PBT merely to increase test count.

### Acceptance criteria

- generated tests cover arbitrary valid positive viewport/item dimensions;
- shrinking produces minimal counterexamples when a property fails;
- generators exclude physically meaningless combinations such as negative element heights.

---

# TDD cycle 3 — Add metamorphic tests for coordinate invariance

### Goal

Ensure the geometry function depends on **relative geometry**, not an accidental absolute coordinate system.

This is a particularly good fit for metamorphic testing because there is a meaningful transformation for which the
expected relation between outputs is known without needing a separate oracle.

### Metamorphic relation — viewport translation

Given:

```text
viewport.top = V
item.top = I
```

translate both by any finite delta `d`:

```text
viewport.top' = V + d
item.top' = I + d
```

All relative geometry remains unchanged.

Therefore:

```text
computeRevealScrollTop(viewport, item)
===
computeRevealScrollTop(translatedViewport, translatedItem)
```

This catches implementations that accidentally mix viewport-relative and document-relative coordinates.

### Metamorphic relation — equivalent relative representation

If the browser adapter changes from:

```text
getBoundingClientRect()
```

to another representation that produces the same relative item/container displacement, the pure result should remain
equivalent.

This should be expressed as a property of the numerical inputs rather than coupling the test to two DOM APIs.

### Acceptance criteria

- arbitrary coordinate translations preserve the computed target;
- tests detect accidental dependence on absolute page position.

---

# TDD cycle 4 — Model the interaction state separately

### Goal

Specify when automatic TOC movement is allowed.

This is not really geometry. It is a small state machine:

```text
active section unchanged
    → preserve manual TOC scroll

active section changes
    → reveal newly active entry if necessary
```

### Scope

Extract a small pure transition decision, for example:

```ts
export function shouldRevealActiveEntry(
    previousActiveId: string | null,
    activeId: string | null,
): boolean;
```

or, if the interaction becomes more complex, a small state type.

Avoid building a general state-machine framework for two states.

### Red — BDD/DDT

Use a transition matrix:

| Previous | Current | Reveal? |
| -------- | ------- | ------: |
| `null`   | `null`  |      no |
| `null`   | `"a"`   |     yes |
| `"a"`    | `"a"`   |      no |
| `"a"`    | `"b"`   |     yes |
| `"a"`    | `null`  |      no |

The exact `null → section` initialization behavior should match the intended component behavior and be documented
explicitly.

### Model-based / state-machine sequence tests

The valuable behavior appears across **sequences**, not individual calls:

```text
article enters A
→ automatic reveal may occur

reader manually scrolls TOC
→ no automatic correction

article remains in A
→ manual position remains untouched

article enters B
→ B may be automatically revealed

reader manually scrolls again
→ manual position remains untouched

article returns to A
→ A may be automatically revealed
```

A small table-driven state sequence is probably enough; introducing a full state-machine testing dependency is
unnecessary unless the component later gains substantially more interaction states.

### Acceptance criteria

- repeated article scroll events within one active section never request another automatic reveal;
- changing active section re-enables reveal behavior;
- behavior works in both forward and reverse article navigation.

---

# TDD cycle 5 — Establish a DOM contract for the imperative shell

### Goal

Make the client script depend on deliberate markup hooks rather than incidental tree structure.

### Scope

Prefer:

```html
<nav data-lesson-toc>
```

and, if useful:

```html
<a data-lesson-toc-entry ...>
```

over relying on assumptions such as:

```ts
list.parentElement;
```

### Contract testing

The existing render test can verify only the small DOM contract required by the client behavior:

```text
given LessonToc is rendered
when client-side TOC behavior is attached
then exactly one lesson-TOC scroll container can be identified
```

and, if appropriate:

```text
then every generated TOC entry has a stable association with its heading id
```

This is more valuable than snapshotting the entire component.

### Acceptance criteria

- the client-side behavior can locate the TOC through an intentional contract;
- server rendering tests ensure that contract remains available;
- tests do not couple themselves to unrelated nested markup.

---

# TDD cycle 6 — Verify real layout in a browser

### Goal

Verify the behavior against an actual layout engine.

This is **required**, because JSDOM cannot provide meaningful evidence for the CSSOM geometry behavior at the center of
the regression.

### Preferred test level

If the project already uses Playwright or another real-browser test framework, add a focused browser regression.

If it does not, I would **not automatically add Playwright solely for this small change**. Instead:

1. assess whether browser-level component/E2E testing is already a broader missing capability in the project;
2. if yes, introducing Playwright is a high-value architectural/testing improvement;
3. otherwise retain the documented manual browser acceptance test for this change.

### Browser test

Conceptually:

```text
given a lesson whose TOC is taller than its viewport
when the reader scrolls until a lower heading becomes active
then its TOC entry is visible inside the TOC panel

given the reader manually scrolls the TOC away from that entry
when article scrolling continues without changing active section
then the TOC retains the reader-selected scroll position

when the next article heading becomes active
then its TOC entry becomes visible
```

Also run the same scenario while scrolling upward.

### Why this matters

This catches issues pure numeric tests cannot:

- wrong element selected as the scroll container;
- unexpected `offsetParent`;
- CSS padding/border effects;
- sticky positioning interactions;
- real `clientHeight`;
- actual scroll clamping;
- viewport-specific behavior.

---

# TDD cycle 7 — Evaluate mutation-test strength

### Goal

Determine whether the test suite actually distinguishes the meaningful branches in the geometry and transition logic.

The guidelines specifically call out mutation testing for domain logic, numerical conditions, and state transitions;
this change contains all three.

### Scope

If the project already uses a JavaScript/TypeScript mutation framework such as StrykerJS, include these two pure modules
in its mutation scope.

High-value mutations include:

```text
<  → <=
>  → >=
+  → -
null → computed target
activeId === previousActiveId
    → activeId !== previousActiveId
```

Those mutations correspond directly to the subtle errors this regression is susceptible to.

### Acceptance criteria

Tests should detect mutations that:

- change inclusive visibility boundaries;
- reverse above/below classification;
- remove oversized-item handling;
- remove the unchanged-active-section guard;
- produce unnecessary movement for already-visible entries.

Do **not** make “100% mutation score” an acceptance criterion. The guidelines correctly prioritize semantically
meaningful assurance over score maximization.

---

# Techniques considered but not selected

The plan should state these explicitly rather than silently ignoring them.

### Differential testing — not currently justified

A good differential test requires an independent implementation or oracle.

Potentially comparing the custom implementation against:

```js
element.scrollIntoView({
    block: "nearest",
    container: "nearest",
});
```

looks attractive, but it would not be a clean independent oracle:

- browser support and semantics may differ;
- the project intentionally has the “only on active-section transition” policy;
- the browser operation includes additional CSSOM behavior such as scroll margins/padding.

So I would not add differential tests for this fix.

If the implementation is later replaced by a standards-native operation, differential testing between old and new
implementations during migration could become useful.

### Fuzz testing — not justified

There is no parser, wire protocol, malformed external input, or complex stateful input grammar.

Random numeric inputs are better handled through **PBT**, where valid input constraints and semantic invariants can be
expressed explicitly.

### Mock testing — avoid

Mocking:

```text
getBoundingClientRect()
scrollTop
clientHeight
```

would mostly reproduce the assumptions of the implementation.

Prefer:

1. pure numerical tests;
2. state-transition tests;
3. a real browser.

This follows the project's stated preference for pure functions and lightweight test doubles over mocks.

### Snapshot testing — not useful

The issue is behavioral, not representational. A markup snapshot cannot demonstrate that the active entry remains
visible.

### Formal methods / symbolic execution — disproportionate

The pure function is simple enough for exhaustive reasoning over its branches plus DDT/PBT/metamorphic testing. More
elaborate formal tooling would add complexity without proportional assurance.

---

# Suggested execution order

I would implement it in this order:

```text
1. BDD + DDT geometry examples
          ↓
2. Pure geometry implementation
          ↓
3. PBT + metamorphic properties
          ↓
4. Active-transition model tests
          ↓
5. Thin DOM integration
          ↓
6. DOM contract test
          ↓
7. Real-browser regression
          ↓
8. Mutation-test assessment
          ↓
9. canonical typecheck/lint/test suite
```

The **minimum useful vertical slice** is 1 → 4 → 5 → 7: it establishes the pure semantics, interaction semantics,
browser adapter, and actual real-layout behavior.

PBT, metamorphic testing, and mutation testing then strengthen the assurance around the exact parts of this change where
subtle off-by-one and coordinate-system defects are plausible.

So yes: the earlier plan was underusing the testing section of the guidelines. For this fix I would consider **BDD +
DDT + PBT + metamorphic + lightweight model/state-machine + DOM contract + real-browser testing + targeted mutation
testing** the well-justified combination. The remaining techniques should be explicitly considered and declined with
rationale rather than simply omitted.
