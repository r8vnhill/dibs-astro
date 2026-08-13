# Refactor — Render reading time statically from lesson content

## Summary

Replace the hydrated `ReadingTime` React island with static Astro markup and compute the estimate while the lesson is
rendered.

Under the site's current prerendered/static configuration, this calculation occurs during `pnpm build`. The
implementation should nevertheless remain conceptually **render-time**, so it continues to behave correctly if the
rendering mode changes later.

The resulting architecture should follow a functional-core / imperative-shell boundary:

```text
NotesLayout.astro
    │
    ├── render relevant slots once
    │
    ▼
rendered lesson HTML
    │
    ▼
extractReadableText()
    │
    ▼
plain readable text
    │
    ▼
estimateReadingTime()
    │
    ▼
ReadingTimeEstimate
    │
    ▼
ReadingTime.astro
    │
    ▼
static HTML
```

No browser-side JavaScript is required for calculating or displaying the estimate.

Astro supports rendering slot contents to an HTML string with `Astro.slots.render()`, while framework components only
require client directives such as `client:load` when client-side hydration is desired. Removing hydration is therefore
appropriate for a value that is fully determined during rendering. ([Astro Documentation][1])

---

## Frozen behavior

The refactor should preserve the existing reading-time model unless explicitly stated below.

### Included content

Count readable text from:

- lesson title;
- abstract;
- main lesson body;
- visible `<summary>` text;
- contents of `<details open>`.

### Excluded content

Do not count:

- the collapsed body of `<details>` without `open`;
- `.exclude-from-reading-time` subtrees;
- `<script>`;
- `<style>`;
- other explicitly established non-readable nodes, but only when already supported by the current content model.

Do **not** attempt to infer arbitrary CSS visibility at build time. Visibility beyond these explicit rules is outside
the reading-time contract.

### Reading model

Preserve:

```text
default WPM             = 250
default time multiplier = 1.5
minimum displayed time  = 1 minute
```

and preserve the current word-count semantics during this refactor.

Do not opportunistically switch to another tokenizer such as `Intl.Segmenter`: that could change existing estimates and
should be evaluated separately if improved linguistic segmentation becomes desirable.

### Interaction model

The estimate represents the lesson's **initial rendered reading state**.

Expanding a collapsed `<details>` later:

- does not recalculate the estimate;
- does not introduce client-side reading-time state;
- does not hydrate `ReadingTime`.

---

# TDD Cycle 1 — Freeze the existing estimation semantics

## Goal

Separate the mathematical reading-time calculation from React before changing how content is obtained.

## Red

Characterize the existing calculation with BDD/DDT tests.

Examples:

> given 250 counted words and the default configuration when reading time is estimated then the result preserves the
> current minute calculation

> given the same word count and different valid WPM/multiplier combinations when reading time is estimated then each
> result is deterministic

Cover at least:

- empty input;
- one word;
- values around minute-rounding boundaries;
- default WPM;
- overridden WPM;
- default multiplier;
- overridden multiplier;
- minimum one-minute behavior.

Use `test.each`/equivalent DDT for configuration combinations rather than duplicating individual tests.

Before refactoring, characterize what the current implementation does for invalid configuration such as zero or negative
WPM/multipliers if those values are currently constructible.

Do **not** silently introduce different invalid-input semantics as part of this behavior-preserving refactor.

## Green

Extract a framework-independent pure function, conceptually:

```ts
type ReadingTimeOptions = Readonly<{
    wordsPerMinute?: number;
    timeMultiplier?: number;
}>;

type ReadingTimeEstimate = Readonly<{
    words: number;
    minutes: number;
}>;

function estimateReadingTime(
    text: string,
    options?: ReadingTimeOptions,
): ReadingTimeEstimate;
```

Returning both `words` and `minutes` is preferable to returning only a number:

- tests can distinguish extraction failures from rounding failures;
- diagnostics remain available without recounting;
- future presentation changes do not affect the domain calculation.

If the current utility already has a stable equivalent abstraction, evolve it rather than creating a parallel
implementation.

## Refactor

Remove React-specific dependencies from the calculation module.

Keep functions short and focused; do not introduce a class or generic “reading metrics” framework for a single
calculation.

## Acceptance criteria

- Existing characterized results are unchanged.
- The estimator has no React, Astro, DOM, or HTML-parser dependency.
- The same input/options always produce the same estimate.
- No duplicate word-count implementation remains.

---

# TDD Cycle 2 — Define readable-text extraction from rendered HTML

## Goal

Create one pure boundary that converts rendered lesson HTML into exactly the text covered by the reading-time policy.

## Red

Add focused HTML fixtures for:

### Ordinary content

> given visible paragraph content when readable text is extracted then its text remains countable with word boundaries
> preserved

### Explicit exclusion

> given an `.exclude-from-reading-time` subtree when readable text is extracted then none of its descendant text
> contributes to the result

Test nested markup as well as a simple paragraph.

### Closed details

This should refine the original plan.

Given:

```html
<details>
    <summary>Explicación opcional</summary>
    <p>Contenido inicialmente oculto.</p>
</details>
```

expect:

```text
Explicación opcional
```

not an empty string.

### Open details

Given:

```html
<details open>
    <summary>Explicación opcional</summary>
    <p>Contenido visible.</p>
</details>
```

both summary and body should contribute, exactly once.

### Non-content nodes

Verify script/style content is excluded.

### Entities and markup boundaries

Cover cases such as:

```html
<p>API &amp; contrato</p>
<p>software <strong>reutilizable</strong></p>
```

so entity decoding and DOM boundaries cannot accidentally concatenate words.

### Whitespace invariance

Use metamorphic tests here without introducing a PBT dependency:

> adding irrelevant indentation/newlines between equivalent HTML nodes does not change the word count

and:

> wrapping text in semantically neutral inline markup does not change the word count

These are valuable properties of the extraction transformation and fit the guidelines' recommendation to consider
metamorphic assurance where transformations are involved.

## Green

Implement:

```ts
function extractReadableText(html: string): string;
```

using the repository's existing HTML parser.

Do not use regular expressions to interpret general HTML.

Recommended transformation order:

```text
parse HTML
    ↓
remove .exclude-from-reading-time subtrees
    ↓
replace closed <details> with their visible <summary> content
    ↓
remove script/style/non-content nodes
    ↓
extract decoded text
    ↓
normalize structural whitespace
```

Centralize selectors rather than duplicating literal strings across tests/layout/helpers.

For example:

```ts
const READING_TIME_EXCLUDE_SELECTOR = ".exclude-from-reading-time";
```

Do not add another HTML parsing dependency unless the existing parser proves unable to express these transformations
reliably.

## Refactor

Keep parser-specific operations inside this module.

The estimator should never know about:

```text
HTML
details
CSS classes
DOM nodes
Astro slots
```

## Acceptance criteria

- Closed details contribute their visible summary but not their collapsed body.
- Open details contribute all readable content once.
- Explicitly excluded trees contribute no text.
- Script/style content contributes no text.
- Entity decoding produces human-readable text.
- Formatting whitespace does not change the resulting word count.
- No new dependency is introduced.

---

# TDD Cycle 3 — Render lesson slots once and calculate from that exact output

## Goal

Make `NotesLayout.astro` the imperative boundary that obtains rendered content while avoiding duplicate rendering.

## Red

Add an Astro render fixture with controlled:

- title;
- abstract;
- normal body content;
- closed details;
- open details;
- excluded section.

Assert the resulting minute estimate matches the content that is initially readable.

The fixture should be synthetic and intentionally small. Do **not** make the primary algorithmic integration test depend
on the current word count of a real lesson, since ordinary editorial changes would then break a test unrelated to
reading-time correctness.

## Green

In `NotesLayout.astro`, render the relevant slots to HTML exactly once:

```ts
const titleHtml = /* render relevant title content */;
const abstractHtml = /* render abstract content */;
const bodyHtml = /* render body content */;
```

Then compute:

```text
titleHtml
+ abstractHtml
+ bodyHtml
        ↓
extractReadableText()
        ↓
estimateReadingTime()
```

Finally, render those **already obtained strings** as the actual lesson output rather than rendering the same slots
again.

Astro's documented pattern for an asynchronously rendered slot string is to emit that rendered HTML using `set:html`.
([Astro Documentation][1])

This point deserves an explicit regression test because calling:

```text
Astro.slots.render(...)
```

for analysis and later:

```html
<slot />
```

for presentation would create two independent render paths and could produce undesirable behavior for stateful or
expensive content.

## Refactor

Keep Astro-specific code in `NotesLayout.astro`.

Do not move `Astro.slots` awareness into the reading-time utility.

If rendering three slots requires repeated boilerplate, use one small local helper only if it improves clarity; avoid
building a generic slot-rendering abstraction for this one use case.

## Acceptance criteria

- Every reading-time source slot is rendered once.
- The estimate is based on the same rendered HTML emitted to the page.
- No browser DOM query is required.
- Exclusion policy remains completely inside readable-text extraction.
- Lesson content is not duplicated in final HTML.

---

# TDD Cycle 4 — Replace the React island with a presentational Astro component

## Goal

Make the reading-time UI a static projection of an already computed estimate.

## Red

Add a focused `ReadingTime.astro` render test:

> given a one-minute estimate when ReadingTime is rendered then it renders the singular Spanish label

and:

> given an estimate greater than one minute when ReadingTime is rendered then it renders the plural Spanish label

Also verify:

- explanatory text remains;
- decorative icon semantics remain accessible;
- the exclusion marker remains around the widget.

## Green

Make the component purely presentational:

```ts
type Props = Readonly<{
    minutes: number;
}>;
```

or pass the immutable `ReadingTimeEstimate` if the word count is useful to the presentation.

Prefer **not** to keep `wpm` and `timeMultiplier` on the presentational component merely for backward compatibility if
no other caller needs them.

Before changing that API:

1. inspect all call sites;
2. if `ReadingTime` is internal and only `NotesLayout` uses it, narrow the component API;
3. if other legitimate callers rely on those options, preserve the API at the appropriate calculation boundary.

This follows the guideline to keep APIs deliberately small rather than preserving unused configuration speculatively.

Remove:

- React import;
- `client:load`;
- `useReadingTime` from this rendering path;
- browser-side recalculation state.

Keep the visual styling unchanged.

## Refactor

If the React implementation or hook becomes unreachable, delete it rather than leaving parallel dead implementations
“for future use.”

Retain pure helpers only when they have an actual current contract or clear independent use.

Avoid speculative compatibility code.

## Acceptance criteria

- Reading time exists in initial HTML.
- No hydration directive is attached to the reading-time component.
- Singular/plural behavior is unchanged.
- Styling and Spanish copy are unchanged.
- The decorative icon remains hidden from assistive technology if it carries no independent meaning.
- No dead React reading-time implementation remains.

---

# TDD Cycle 5 — Prove the hydration boundary disappeared

## Goal

Verify the final page contract rather than only the component implementation.

## Red

Extend the Astro integration/render test to locate the reading-time region using a stable semantic marker such as:

```html
data-reading-time
```

Assert:

> given a rendered lesson when the reading-time region is inspected then it is ordinary server-rendered HTML and is not
> contained in a hydration island

Do **not** assert that the entire page contains no `<astro-island>` element. Another legitimate interactive component
may be introduced later, and that should not invalidate the reading-time contract.

## Green

Complete the layout migration.

## Refactor

Remove any now-unused island imports, hooks, helpers, and React-specific tests.

Review dependency usage afterward. If React itself is still required elsewhere, retain it; do not remove a framework
dependency solely because this one island disappeared.

## Acceptance criteria

- `[data-reading-time]` is present in rendered HTML.
- The reading-time region is not inside an `<astro-island>`.
- Other unrelated islands, if present, remain unaffected.
- No reading-time client bundle is emitted through this component path.
- Essential reading-time content is available without JavaScript.

---

# TDD Cycle 6 — Validate against a production lesson

## Goal

Confirm that the synthetic contracts hold when exercised through the real content pipeline.

## Scope

Use:

```text
/notes/software-libraries/what-is/
```

as a smoke fixture, but avoid pinning its literal minute value.

## Validation

After the static build, verify:

- the page contains the localized reading-time label;
- it contains a valid positive minute value;
- its reading-time region is static HTML;
- the region is not a hydration island;
- the page still renders title, abstract, body, details, and references correctly.

The controlled integration fixture from Cycle 3 remains responsible for proving that excluded references do not change
the exact estimate.

This separation avoids turning normal lesson edits into false regression failures.

## Acceptance criteria

The production lesson builds successfully and exposes its reading estimate before browser JavaScript executes.

---

# Assurance strategy

## Example-based BDD

Use for:

- minute rounding;
- singular/plural rendering;
- details behavior;
- exclusions;
- integration wiring.

## DDT

Use for:

```text
WPM × multiplier × word-count boundaries
```

and simple HTML exclusion cases.

## Metamorphic testing

Use for extraction properties:

```text
extra formatting whitespace
    → same estimate

neutral inline wrapper
    → same estimate

append excluded subtree
    → same estimate

change closed details body
    → same estimate

change closed details summary
    → estimate may change
```

The last two are particularly valuable because they state the initial-state policy directly.

## Differential/characterization testing

During the migration, compare the extracted pure estimator with the existing calculation logic for a representative
corpus of ordinary content.

Delete migration-only differential scaffolding after equivalence has been established unless it continues to protect an
independent contract.

## PBT

Defer.

The important input classes are small and explicit, the project already delegates HTML parsing to an established parser,
and the highest-value invariants can be expressed through DDT and metamorphic tests without adding another dependency.

## Mock testing

Not needed.

The functional core can be tested directly, and Astro rendering can be tested through the existing render harness.

---

# Final architecture

```text
      Astro boundary
           │
  NotesLayout.astro
           │
   rendered slots
           │
           ▼
┌─────────────────────┐
│ extractReadableText │
│ HTML → text         │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ estimateReadingTime │
│ text → estimate     │
└──────────┬──────────┘
           │
           ▼
 ReadingTime.astro
    static markup
```

Dependencies point inward toward small pure functions; neither utility knows about Astro or React.

---

# Verification order

After each cycle, run the smallest relevant checks first. At the end run the complete project gate:

```bash
pnpm test -- <focused-tests>
pnpm astro check
pnpm test
pnpm build
```

Use the repository's actual script aliases where they differ.

Also perform two explicit regression checks:

1. build the representative production lesson and inspect its generated reading-time region;
2. search the built output/client graph for the former ReadingTime hydration path rather than assuming removal from
   source code guarantees removal from generated assets.

---

# Non-goals

- Changing the reading-speed model.
- Recalculating when `<details>` is opened.
- Measuring actual reader behavior.
- Adding per-language reading speeds.
- Treating code blocks differently from prose.
- Changing Spanish localization.
- Redesigning the reading-time widget.
- Replacing the existing HTML parser.
- Removing React from the project unless it becomes unused globally.
- Generalizing this into a site-wide content-metrics subsystem.

---

# Intentional behavior clarification

One aspect of the original plan should be recorded explicitly as a semantic clarification:

**A collapsed `<details>` is not entirely unreadable. Its `<summary>` remains visible.**

Therefore the canonical rule should be:

> **Count the visible `<summary>` of a closed `<details>`, but exclude its initially collapsed body.**

That is more precise than “remove `details:not([open])`” and makes the implementation correspond to the stated goal of
estimating the content visible in the lesson's initial state.

Everything else should remain behavior-preserving. The largest architectural win is not merely eliminating React; it is
making the flow **rendered content → pure extraction → pure estimation → static presentation** explicit, deterministic,
and independently testable.

[1]: https://docs.astro.build/en/reference/astro-syntax/?utm_source=chatgpt.com "Template expressions reference - Astro Docs"
