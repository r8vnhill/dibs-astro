# Fix — keep the lesson TOC pinned throughout long-page scrolling

## Summary

Correct the desktop lesson-TOC layout so the TOC shell remains pinned beside the article for the full height of a long
lesson.

The implementation should move sticky positioning to the **grid-level TOC shell**, rather than applying it to a
descendant whose containing block is only as tall as the TOC itself.

At the same time, separate:

```text
sticky TOC shell
└── semantic navigation
    ├── fixed "En esta página" heading
    └── independently scrollable entries
```

This gives each concern one owner:

- the outer `<aside>` owns placement in the lesson grid and sticky behavior;
- the `<nav>` owns navigation semantics;
- the TOC list owns overflow when the list itself exceeds the available viewport height;
- the existing client script owns active-section highlighting.

No JavaScript should be needed to keep the **TOC itself** visible while the document scrolls.

The current repository already has Playwright `1.59.1` as a development dependency and a Chromium installation script,
but no general browser-test command or merge-relevant UI test job. The existing `LessonToc.render.test.ts` only verifies
the navigation labels and list existence, while the Astro render-test environment runs in Node with CSS processing
disabled, so it cannot detect this layout failure.

Because this fix includes the first general-purpose browser regression harness and CI integration as well as the CSS
correction, I would treat it as **medium scope** and use phases, with short Red–Green–Refactor cycles inside them.

---

# Phase 1 — Reproduce the observed disappearance in Chromium

## Goal

Produce an automated test that fails on the current `dev/qa` implementation for the observable behavior shown in the
screenshots:

> after scrolling sufficiently far through the lesson, `"En esta página"` and most or all of the TOC must not leave the
> viewport.

Do not change production code until this test has been observed failing.

## Scope

Add:

```text
playwright.config.ts
tests/e2e/lesson-toc-sticky.spec.ts
```

and initially only the test script required to run it:

```json
"test:e2e": "playwright test"
```

The repository's `dev.mjs` forwards CLI arguments directly to Astro, so the Playwright web server can run the existing
application with an explicit host and port.

For example:

```text
pnpm dev -- --host 127.0.0.1 --port 4321
```

Use:

```text
baseURL: http://127.0.0.1:4321
```

and Chromium first, because it directly matches the browser engine class in which the issue was observed.

### Test preconditions

Pin the viewport rather than relying on Playwright defaults:

```ts
{
    width: 1600,
    height: 900,
}
```

This is essential because the repository deliberately hides `.lesson-toc` below `1440px`.

Before exercising the behavior, assert:

```text
given the lesson is rendered at a TOC-enabled desktop viewport
then the lesson TOC is visible
and the lesson is taller than the viewport
```

That prevents a responsive-layout mismatch from producing a meaningless pass.

## Red — reproduce the actual user-visible defect

Use the real route:

```text
/notes/software-libraries/what-is/
```

Do **not** start by testing CSS classes or `position` values.

Test the observable contract:

```text
given the lesson TOC is visible at the beginning of a long lesson
when the reader scrolls to later lesson sections
then "En esta página" remains fully inside the viewport
and the TOC navigation remains visible
```

Use representative later sections from the actual lesson, for example:

```text
#h2-contract
#h2-encapsulation
#h2-stability
#conclusions
```

Prefer `test.each` or a short loop so this becomes a **data-driven scroll-depth matrix** rather than four duplicated
tests.

After scrolling each target into view, assert something equivalent to:

```ts
await expect(tocTitle).toBeInViewport({ ratio: 1 });
await expect(tocNavigation).toBeInViewport();
```

Also capture useful diagnostics on failure:

```text
window.scrollY
TOC aside bounding rectangle
TOC nav bounding rectangle
computed sticky top
viewport dimensions
```

These are failure diagnostics, not the behavioral assertion.

### Metamorphic regression

Once the TOC reaches its sticky position, scrolling the document farther should not materially change its vertical
viewport position.

Express that as:

```text
given the TOC has entered its sticky state
when document scrollY increases substantially
then the TOC shell's viewport top remains approximately constant
```

Use a small pixel tolerance for subpixel layout.

This is a particularly strong regression for this issue because it captures the relation that the screenshots show being
lost.

## Acceptance criteria

Before touching `LessonToc.astro`:

- the Chromium test fails on current `dev/qa`;
- it fails because the TOC/title leaves the viewport at a later scroll depth;
- the viewport is explicitly at least `1440px` wide;
- the test proves the document actually scrolled;
- failure diagnostics establish whether the `<aside>` and nested sticky `<nav>` move as predicted.

If this test **does not fail**, stop the implementation cycle and investigate the discrepancy before changing CSS. Do
not retrofit the test to the proposed solution.

---

# Phase 2 — Make the grid-level TOC shell the sticky owner

## Goal

Keep the TOC visible for the full lesson by making the element that participates directly in the lesson grid own sticky
positioning.

## Scope

Modify:

```text
src/components/notes/LessonToc.astro
src/components/notes/__tests__/LessonToc.render.test.ts
```

No new runtime dependency is required.

## Red — structural contract

Before changing the markup, extend the render-contract suite with a second failing test:

```text
given the lesson TOC is rendered
then it contains one dedicated scrolling region for TOC entries
and the "En esta página" heading is outside that scrolling region
```

This should fail against the current component, which puts `overflow-y-auto` on the entire navigation element.

Use a deliberate hook:

```text
data-lesson-toc-scroll
```

Do not test Tailwind class strings in the static render test.

The contract is **structure**, not CSS implementation.

## Green — restructure the component

Move sticky ownership outward:

```astro
<aside
    aria-label="En esta página" class="lesson-toc sticky top-20 self-start"
    data-export-hidden="true" data-testid="lesson-toc"
>
    <nav
        aria-label="En esta página"
        class="flex max-h-[calc(100vh-6rem)] min-h-0 flex-col border-l border-base-border px-5 py-2"
    >
        <p class="shrink-0 text-sm font-semibold text-base-text">
            En esta página
        </p>

        <ol
            class="mt-3 min-h-0 overflow-y-auto space-y-1 text-sm text-base-subtle-text" data-lesson-toc-list
            data-lesson-toc-scroll
        >
        </ol>
    </nav>
</aside>
```

The exact class organization may be refined during implementation, but preserve these responsibilities:

```text
aside
    sticky grid item

nav
    semantic navigation + height constraint

heading
    never participates in internal scrolling

ol / list viewport
    only element with vertical overflow
```

### Why this is preferable to `align-self: stretch`

A smaller patch could override the TOC grid item with:

```css
align-self: stretch;
```

and retain the sticky descendant.

I would **not** prefer that design.

It repairs the containing-block geometry indirectly by making the parent taller. Moving sticky behavior to the
grid-level shell removes the problematic intermediate containing-block dependency altogether. It gives the component a
clearer contract and is less sensitive to future grid alignment changes.

That fits the guideline preference for explicit boundaries and making unsupported states harder to create rather than
merely validating or compensating for them.

## Keep the active-section script behavior-preserving

Do not change:

```ts
updateCurrentSection();
```

or its active-ID threshold in this cycle.

The current script creates the TOC from `section[data-lesson-section]` headings and only updates active-link
attributes/classes on document scroll.

The bug being addressed is the **TOC shell leaving the viewport**, not active-section selection.

That separation is important for establishing causality.

## Refactor

Once green:

- keep the outer layout responsibilities in markup/CSS;
- keep active-section behavior in the existing client script;
- avoid adding JavaScript that compensates for a CSS containment problem;
- retain the existing public/data hooks wherever possible;
- keep the component comfortably below the project's 500-line heuristic and its client functions short.

## Acceptance criteria

- the Phase 1 browser test becomes green;
- `"En esta página"` remains fully visible through all tested scroll depths;
- the TOC shell remains at a stable viewport top once sticky;
- the title is outside the internal scrolling region;
- the existing active-link behavior is unchanged;
- no additional hydration framework or runtime dependency is introduced.

---

# Phase 3 — Cover short viewports and internally overflowing TOCs

## Goal

Ensure the structural correction does not replace the original defect with another one when the TOC itself is taller
than the available viewport.

## Red — DDT viewport matrix

Add a compact browser matrix:

```text
1600 × 900   normal desktop
1600 × 700   short desktop viewport
```

Optionally include:

```text
1440 × 900   exact TOC breakpoint
```

if this is stable enough for CI.

For every TOC-enabled viewport:

```text
given the document is scrolled deep into the lesson
then the TOC heading remains visible
and the TOC shell remains visible
```

For the short viewport additionally assert:

```text
given the entries exceed the available TOC height
then the entry list scrolls independently
and scrolling the list cannot move "En esta página"
```

Do not require that the **currently active entry** automatically scroll into view in this fix unless that behavior
already exists.

That is a distinct interaction contract.

## Green

Adjust only the flex sizing/overflow classes required for the inner list to become the scrolling surface:

```text
nav: flex column + constrained height
heading: flex-none/shrink-0
list: min-height: 0 + overflow-y: auto
```

## Refactor

If the viewport-height expression is repeated elsewhere and there is already a canonical layout variable, reuse it.

Do not create a generalized scrolling-panel abstraction for one component.

## Acceptance criteria

- normal-height desktop behavior remains green;
- short desktop behavior remains green;
- list overflow never moves the TOC title;
- internal TOC scrolling does not change document `scrollY`.

---

# Phase 4 — Add an interaction regression for manual TOC scrolling

## Goal

Protect the independent-scroll contract introduced in Phase 3.

This is a lightweight **state-transition/browser interaction test**, not a pure state-machine framework.

## Red

For a viewport where the list actually overflows:

```text
given the lesson TOC list is independently scrollable
when the reader scrolls the TOC list
then the document viewport does not move
and the TOC title remains visible
```

Then:

```text
when the reader resumes scrolling the article
then the TOC shell remains pinned
```

If later auto-reveal behavior is introduced, extend this sequence then; do not pre-build that policy here.

## Green

No production change should normally be necessary after the structural fix. If the test fails, make the smallest
CSS/event change required.

## Acceptance criteria

- list `scrollTop` can change independently;
- window `scrollY` remains stable during list-only scrolling;
- article scrolling does not move the TOC shell out of view.

---

# Phase 5 — Make the real-browser regression merge-relevant

## Goal

Ensure a CSS layout defect of this kind cannot pass every required test again.

## Scope

Update:

```text
package.json
playwright.config.ts
.gitlab-ci.yml
```

The current pipeline has required static, unit, Astro-render, and build jobs, but the only current Playwright-related CI
path is the optional PDF smoke job.

Add a dedicated job such as:

```text
test:ui-e2e
```

and make `build` depend on it alongside the existing required test jobs.

### CI browser environment

Do not blindly inherit the current Alpine Node image for Playwright.

Use either:

1. a Playwright-supported container aligned with the lockfile's Playwright version; or
2. a Debian/Ubuntu Node image plus `playwright install --with-deps chromium`.

Prefer the first if it works cleanly with the local runner.

Keep the image/browser version aligned with the **resolved lockfile version**, not just the `^1.59.1` manifest range.

## Acceptance criteria

- `pnpm test:e2e` exists;
- the sticky regression runs automatically for merge-request pipelines;
- the job is not `allow_failure`;
- artifacts such as Playwright traces/screenshots are retained on failure;
- CI and local execution use the same route, viewport, and behavioral assertions.

---

# Assurance strategy

The project guidelines require considering the appropriate verification techniques, not just conventional unit tests.
For this CSS/browser issue, I would make the choices explicit:

| Technique                      | Decision                 | Rationale                                                                                   |
| ------------------------------ | ------------------------ | ------------------------------------------------------------------------------------------- |
| BDD                            | **Required**             | Express the actual disappearance regression                                                 |
| DDT                            | **Required**             | Later-section and viewport matrices                                                         |
| Real-browser E2E               | **Required**             | Sticky/layout behavior requires a real layout engine                                        |
| Metamorphic testing            | **High value**           | More document scroll should preserve sticky viewport position                               |
| Contract testing               | **Required**             | Heading must be outside the internal scroller                                               |
| State-machine/sequence testing | **Useful**               | Document scroll vs internal TOC scroll                                                      |
| Accessibility assertions       | **Preserve**             | Existing complementary navigation labels remain intact                                      |
| Static analysis                | **Required**             | Astro/TypeScript checks                                                                     |
| Production build               | **Required**             | Detect integration/build regressions                                                        |
| PBT                            | **Not selected**         | Random browser dimensions are costly and less informative than breakpoint-oriented DDT      |
| Mutation testing               | **Not selected for CSS** | No mature/high-value mutation target here relative to browser evidence                      |
| Differential testing           | **Not selected**         | There is no independent implementation serving as a useful oracle                           |
| Fuzz testing                   | **Not selected**         | No parser/protocol/untrusted-input boundary                                                 |
| Mock testing                   | **Avoid**                | Mocked CSS layout cannot establish sticky behavior                                          |
| Snapshot testing               | **Avoid**                | Static markup snapshots cannot prove viewport persistence                                   |
| Formal methods                 | **Not justified**        | Browser layout behavior is better verified empirically against the standards implementation |

I would **not add PBT merely because `fast-check` is already present**—the repository does have `fast-check`, but its
strengths are not well matched to this CSS layout regression. The guidelines explicitly prefer techniques whose expected
value justifies their complexity.

---

# Files

### New

```text
playwright.config.ts
tests/e2e/lesson-toc-sticky.spec.ts
```

### Edit

```text
src/components/notes/LessonToc.astro
src/components/notes/__tests__/LessonToc.render.test.ts
package.json
.gitlab-ci.yml
```

### Traceability

Add or update the appropriate open traceability record with:

- screenshot-observed behavior;
- pre-fix failing Playwright evidence;
- measured bounding-box diagnostics;
- confirmed causal explanation after Red;
- structural change;
- render-contract evidence;
- E2E evidence;
- CI command/job;
- final production build result.

Do not label the containing-block hypothesis as the confirmed root cause until the failing browser test and its geometry
diagnostics support it.

---

# Suggested execution order

```text
1. Add Chromium Playwright harness
        ↓
2. RED: reproduce TOC disappearance
        ↓
3. RED: add shell/scroller render contract
        ↓
4. GREEN: move sticky ownership to <aside>
        ↓
5. GREEN: make only the entry list scrollable
        ↓
6. REFACTOR: simplify layout responsibilities
        ↓
7. Add viewport DDT + sticky metamorphic check
        ↓
8. Add independent-scroll sequence test
        ↓
9. Run Astro/static/full regression suite
        ↓
10. Make Playwright regression required in CI
        ↓
11. Record traceability and close
```

The **minimum useful vertical slice is steps 1–4**: first demonstrate the current disappearance in Chromium, then make
the grid-level TOC shell sticky and watch that same test become green.

The key design change is that I would **not revive the earlier `offsetTop`/auto-reveal work for this symptom**. The
current branch does not contain that code; it contains a much simpler structural problem: a sticky `<nav>` nested inside
a non-stretched grid item. Your second screenshot is also consistent with the earlier unexplained observation that the
TOC itself appeared far above the viewport. The first Red browser test should now tell us whether that containing-block
explanation is in fact the missing causal link.

[1]: https://www.w3.org/TR/css-position-3/?utm_source=chatgpt.com "CSS Positioned Layout Module Level 3"

---

# Outcome

Implemented phases 1–5 as planned.

## Phase 1 — Red, confirmed

Added `playwright.config.ts` (Chromium only, matching the existing `playwright:install` script) and
`tests/e2e/lesson-toc-sticky.spec.ts`, run against `/notes/software-libraries/what-is/` at `1600×900`. Before
touching `LessonToc.astro`, the precondition test passed (TOC visible, lesson taller than viewport) and the five
behavioral tests failed exactly as predicted:

```text
Expected: in viewport
Received: viewport ratio 0

Diagnostics: {
  "scrollY": 6439,
  "asideRect": { "top": -6375, "bottom": -5936.75, "height": 438.25 },
  "navRect":   { "top": -6375, "bottom": -5936.75, "height": 438.25 },
  "navComputedPosition": "sticky",
  "asideComputedPosition": "static"
}
```

This directly confirms the causal chain this doc predicted: `asideComputedPosition: "static"` — the grid item
itself never had `position: sticky` — so its own box (shrunk to fit `<nav>`'s content because
`.lesson-reading-shell { align-items: start }`) is the sticky `<nav>`'s containing block, and that box is far
shorter than the article. Once scrolled past, the nested sticky `<nav>` has nowhere left to move and scrolls away
with the document (`top: -6375px`).

This diagnostic also retroactively explains an unexplained finding from the *previous* corrective cycle
(`fix_make_lesson_toc_auto_reveal_coordinate_safe_and_browser_verified.md`): an ad hoc mid-article wheel-scroll
probe there produced a confusing `boundingBox y: -3323` reading that was never resolved. It is the same mechanism,
observed before this fix existed.

## Phase 2 — Green

Moved `sticky top-[var(--lesson-header-offset,5.5rem)]` from `nav[data-lesson-toc]` to the outer `<aside>`
(`data-testid="lesson-toc"`), added `self-start`, and left the `<nav>` as a plain flex column (heading + scroller)
with no positioning of its own. Per a CSS Grid item's containing block being the grid area itself regardless of
`align-items`, sticky now has the full article-height containing block to work within. All 6 Phase 1 tests went
green immediately, including the entry near the very end of the article that a previous cycle had to deliberately
*exclude* from its E2E traversal indices because of this exact "runs out of containing block" characteristic —
that exclusion is no longer necessary and the new spec exercises it directly (`#continue-reading`).

The existing structural render-contract tests (`LessonToc.render.test.ts`: "exactly one internal scrolling
viewport", "the heading is outside the internally scrollable region") already covered the shell/scroller split
from the prior cycle and needed no new Red step; only a stale test title ("sticky shell" → "navigation element",
since sticky no longer lives on the `<nav>`) was corrected.

## Phase 3 — DDT viewport matrix

Added a short-viewport (`1600×480`, not the plan's example `700` — measured this lesson's TOC content at ~438px,
which fits inside `700 - 104px`; `480` is the value already proven in the prior cycle to force real overflow)
describe block: heading/shell remain visible after scrolling deep in, and the entry list genuinely overflows and
scrolls independently without moving the heading. Both pass.

## Phase 4 — Interaction regression

Added a test that sets the TOC scroller's `scrollTop` directly (deterministic, avoiding the wheel-event
scroll-chaining ambiguity that produced unexplained results in the prior cycle's ad hoc probing) and asserts
`window.scrollY` is unchanged, then resumes article scrolling and confirms the TOC shell is still pinned. Passes.

## Phase 5 — CI

Added `test:e2e` to `.gitlab-ci.yml` as a `test`-stage job, `image: mcr.microsoft.com/playwright:v1.59.1-noble`
(matching the resolved lockfile version exactly, not the Alpine image the other jobs use — Playwright is not
well-supported on Alpine/musl), running the same generation steps `test:unit`/`test:astro-render` already run
before their own commands, then `pnpm exec playwright test`. Added it to both `build` and `deploy`'s `needs` lists
(matching the existing pattern where `deploy` re-lists every required test job explicitly), `allow_failure` not
set, with `playwright-report/`/`test-results/` retained as artifacts on failure. This single job covers both
`tests/e2e/lesson-toc-sticky.spec.ts` (this doc) and `tests/e2e/lesson-toc-scroll.spec.ts` (the previous
auto-reveal cycle) — one browser harness, not two.

`playwright.config.ts`'s project-level default viewport changed from `1600×480` (a leftover from when only the
auto-reveal spec existed) to `1600×900` ("normal desktop"); `lesson-toc-scroll.spec.ts` now pins its own required
`480` height via `test.use()` instead of depending on that default, per this doc's own "pin the viewport rather
than relying on Playwright defaults" guidance.

## Verification run

- `pnpm exec playwright test tests/e2e/lesson-toc-sticky.spec.ts` — 9/9 passing.
- `pnpm exec playwright test tests/e2e/lesson-toc-scroll.spec.ts` — 3/3 passing (unaffected by the sticky-ownership
  change).
- `pnpm vitest run` — 1386/1387 passing; the one failure (`pdf-export-cli.test.ts`, manifest ordering) is
  unrelated — caused by an uncommitted, in-progress change to `lesson-metadata.generated.json` from concurrent work
  elsewhere in this working tree, not by anything in this fix.
- `node ./node_modules/vitest/vitest.mjs run --config vitest.astro.config.ts` — 310/311 passing; the one failure
  (`NotesLayout.export-contract.render.test.ts`, git-history-derived authorship metadata) is likewise pre-existing
  and unrelated.

## Root-cause status

This is the confirmed root cause of the originally reported bug, unlike the two prior corrective cycles: the Red
test in Phase 1 reproduced the exact reported symptom (TOC disappearing while scrolling) with a diagnostic that
directly names the mechanism (`asideComputedPosition: "static"`, sticky `<nav>` measured at `top: -6375px`), and
the Green step resolved it with no remaining unexplained behavior. See
`fix_keep_the_active_lesson_toc_entry_visible_within_the_scrollable_panel.md`'s "Second regression discovered"
section and this doc's own outcome above for the full chain of what each of the three related traceability docs
did and did not establish.
