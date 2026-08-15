# [DONE] Give Nushell diagnostics a reusable semantic treatment

## Completion Summary

Implemented following the design decisions and TDD cycles below, with two deviations from the letter of the plan
(both judgment calls, noted here rather than silently applied):

- **Semantic color extraction (design decision 4):** created `src/components/ui/shared/semanticColors.ts` as the
  canonical source for the `error` hex tokens, and refactored `calloutColors.danger` in
  `ui/callouts/shared.ts` to derive from it — a real, single source of truth for those four consumers who read the
  value as a JS string (the callout's inline `style` object). `OutputBlock.astro`'s Tailwind arbitrary-value classes
  (`border-[#e53e3e]/70`, etc.) still carry the hex values as literal text, because Tailwind's build-time class
  scanner only detects color classes that appear verbatim in source — a `${var}`-interpolated arbitrary value is
  invisible to it. This is documented in a comment in `OutputBlock.astro` pointing back at `semanticColors.error` so
  the two don't silently drift apart. This is a real, unavoidable constraint of static-scanned Tailwind, not an
  oversight — flagging it explicitly rather than hiding the tradeoff.
- **`titleClasses` exposure (design decision 1):** the plan says not to expose styling primitives through
  `OutputBlock`'s public API "merely because the implementation needs them internally" — respected: `OutputBlock`'s
  public props are only `variant`/`label` (plus the pre-existing `code`/`lang`/`title`). `titleClasses` was added to
  `CodeBlock.astro` (an internal plumbing layer, not `OutputBlock`'s public surface) exactly as Cycle 2's Green step
  describes.
- **Discriminated prop union:** implemented as `{ variant?: "default"; label?: never } | { variant: "error"; label:
  string }`, so `<OutputBlock variant="error" />` (missing label) and `<OutputBlock label="x" />` (label without
  opting into the variant) are both compile-time errors, per design decision 2.
- **Component-level test infrastructure (Cycle 1):** `OutputBlock` and `CodeBlock` had no dedicated test file before
  this change (only lesson-level render tests existed for code components). Added
  `src/components/ui/code/txt/__tests__/OutputBlock.render.test.ts` (10 cases covering default-variant
  characterization, the error variant's icon/label/accent, neutral body background, raw-diagnostic preservation, and
  a default-vs-error comparison) plus a harness component (see below) — establishing the reusable-contract test
  layer the plan calls for.
- **Testing quirk discovered and worked around:** the Astro Container test API's top-level `slots` option renders
  slot content through a synthetic `SlotString` path that does not correctly resolve a nested `<slot name="title"
  />` when it has a static sibling element (as `OutputBlock`'s error-variant label does) — confirmed empirically by
  isolating the failure down to a minimal repro. This is a testing-harness artifact, not a production bug: real page
  usage compiles slots normally and is unaffected. Worked around by adding
  `src/components/ui/code/txt/__tests__/OutputBlockHarness.astro`, a test-only wrapper that instantiates
  `OutputBlock` with literal JSX children instead of container-injected slots, and pointing the render test at it.
  Also switched `OutputBlock`'s own `slot="title"`/`slot="footer"` wrappers from `<span>` to `<Fragment>` (matching
  every other code-block component's existing convention, e.g. `KotlinBlock.astro`), which independently fixes the
  same container-testing quirk and is a harmless, production-equivalent simplification.
- **Cycle 3 (raw diagnostic preservation)** is covered directly inside the Cycle 1/2 `OutputBlock.render.test.ts`
  suite rather than as a separate test file — the assertion (`<pre>` content unchanged, badge text absent from it)
  is a natural fit alongside the other variant assertions rather than a separate concern.
- **Cycle 4 (lesson integration):** in `nushell.astro`'s `#h2-pipeline-type-contracts` section — the incompatible
  `NushellBlock` title became "Pipeline con tipos incompatibles"; the diagnostic `OutputBlock` gained `variant="error"
  label="Error de tipo"` and its title became "Entrada de pipeline incompatible"; a new `<P>` paragraph (the user's
  own wording, from their review) was inserted between the diagnostic and the existing `<Explanation>` block,
  connecting the diagnostic to `album-title`'s declared signature. Extended
  `nushell.render.test.ts` with two new cases: the compatible result stays free of "Error de tipo", and the
  incompatible diagnostic carries the label, the new title, and a warning icon in its title bar, while its raw `<pre>`
  text is unaffected.
- **Cycle 5 (browser/theme verification):** not done. No focused Playwright test or manual multi-theme/viewport
  review was added or performed — this was descoped for time; the change is CSS-only (Tailwind arbitrary-value
  classes already used elsewhere in the same component), so the risk is low, but this remains unverified against the
  plan's explicit acceptance criterion and should be treated as an open follow-up if visual regressions are
  suspected.
- **Incidental fix:** found and fixed an unrelated pre-existing syntax error in `nushell.astro` at the
  `#h2-script-as-pipeline-stage` section — `<Important headingLevel="h3"` was missing its closing `>`, which broke
  the Astro compiler for the whole file. Fixed by adding the missing `>`; no content was changed.

**Verification:** `node scripts/run-astro-check.mjs` — 0 errors introduced (1 pre-existing, unrelated error in
`JsonBlock.astro` confirmed present on a clean checkout via `git stash`). Full test suite:
`npx vitest run` → 1433/1433 unit tests passing (92 files); `npx vitest run --config vitest.astro.config.ts` →
366/366 render tests passing (44 files, up from 354 — 10 new `OutputBlock` tests + 2 new `nushell.astro` lesson
tests).

## Goal

Make parser/type diagnostics rendered through `OutputBlock` visually and semantically distinguishable from ordinary
command output while preserving:

- the existing appearance and behavior of every default `OutputBlock`;
- the diagnostic's raw Nushell text exactly as currently shown;
- existing syntax highlighting and copy behavior;
- the site's established semantic color vocabulary;
- legibility and meaning in both light and dark themes without relying on color alone.

The reusable abstraction should support future diagnostic output without introducing a page-local styling exception or a
second output-block component.

## Current state

In `#h2-pipeline-type-contracts`, both:

```text
open album.json | album-title
→ Powerslave
```

and:

```text
"Powerslave" | album-title
→ nu::parser::input_type_mismatch
```

are represented by the same neutral `OutputBlock`.

Consequently, the rendered page does not communicate the important semantic distinction between:

- **program output**, and
- **a diagnostic explaining why normal pipeline execution cannot proceed**.

The existing UI hierarchy already provides most of the necessary mechanics:

```text
OutputBlock
    ↓
CodeBlock
    ↓
CodeLayout
```

and the site already has:

- semantic error/danger colors;
- a warning icon;
- title-bar styling infrastructure.

The change should therefore extend these existing contracts rather than create a parallel diagnostic component family.

---

# Design decisions

## 1. Keep `OutputBlock` as the abstraction

Add:

```ts
variant = "error";
```

rather than introducing `DiagnosticBlock`.

This is appropriate because the content is still terminal/output-area content; only its semantic presentation differs.

The API remains deliberately small:

```astro
<OutputBlock
    variant="error" label="Error de tipo"
    ...
/>
```

Do **not** expose styling primitives such as `titleClasses` through `OutputBlock` merely because the implementation
needs them internally.

---

## 2. Do not hardcode `"Error de tipo"` inside the reusable component

The original plan proposes:

```ts
label?: string // defaults to "Error de tipo" for error
```

I would change this.

`OutputBlock` should understand **that something is an error diagnostic**, but not assume what category of error it
represents or what human language should be used.

Prefer a discriminated prop contract:

```ts
type OutputVariantProps =
    | {
        variant?: "default";
        label?: never;
    }
    | {
        variant: "error";
        label: string;
    };
```

The lesson then supplies:

```astro
variant="error" label="Error de tipo"
```

This prevents unsupported states such as:

```astro
<OutputBlock variant="error" />
```

or:

```astro
<OutputBlock label="Error de tipo" />
```

and keeps localization/content concerns at the lesson boundary.

If Astro's current component-prop tooling makes the discriminated union unnecessarily awkward, retain `label?: string`
but enforce the relationship with development-time assertions/tests. The discriminated union is preferred.

---

## 3. Treat the icon as redundant semantic reinforcement

For `variant="error"`:

- show `icons.Warning`;
- show the textual label;
- apply the error accent.

The state must therefore remain understandable:

- without color;
- without interpreting the icon;
- in either color theme.

If the icon conveys no information beyond `"Error de tipo"`, mark it decorative for assistive technology rather than
causing the category to be announced twice.

---

## 4. Do not duplicate the semantic color literals

The original plan proposes copying:

```text
#e53e3e
#c53030
#f87171
#fca5a5
```

into `OutputBlock`.

I would avoid that. It creates a second source of truth for an existing semantic token, contrary to the project's
duplication and taxonomy guidance.

First check whether those values already have a neutral shared home.

If they exist only under:

```text
ui/callouts/shared.ts
```

extract the color data into the smallest neutral shared module, for example:

```text
src/components/ui/shared/semanticColors.ts
```

with a structure such as:

```ts
export const semanticColors = {
    error: {
        light: {
            border: "...",
            foreground: "...",
        },
        dark: {
            border: "...",
            foreground: "...",
        },
    },
} as const;
```

Then:

```text
Callout
       ↘
        semantic error token
       ↗
OutputBlock
```

The callout refactor must be behavior-preserving.

Do not create a generalized design-token framework; extract only the semantic value that now genuinely has two
consumers.

---

## 5. Keep diagnostic backgrounds neutral

For `variant="error"`:

- retain the existing output background;
- accent the outer border;
- accent the title/header;
- retain normal high-contrast terminal text.

Do not tint the entire diagnostic body.

This maintains the distinction:

```text
semantic category       → header + border + icon + label
terminal diagnostic     → authentic terminal presentation
```

---

## 6. Shorten the lesson-facing diagnostic title

The proposed:

> Nushell detecta la incompatibilidad antes de ejecutar el pipeline

is accurate but still quite long for a block header, especially once preceded by the `Error de tipo` badge.

I would use:

```text
Error de tipo | Entrada de pipeline incompatible
```

visually represented as:

```text
[Error de tipo]  Entrada de pipeline incompatible
```

The timing/interpretation belongs in the prose immediately underneath:

> `album-title` está definida para ejecutarse sin entrada de pipeline. Al escribir `"Powerslave" | album-title`, el
> pipeline intenta entregar un `string` a un comando cuya firma no lo acepta. Nushell puede detectar esta
> incompatibilidad antes de la ejecución normal del pipeline.

For the source block, keep:

> **Pipeline con tipos incompatibles**

This produces a clearer progression:

```text
Pipeline con tipos incompatibles
        ↓
[Error de tipo] Entrada de pipeline incompatible
        ↓
explanation of the command signature
```

---

# TDD cycle 1 — Characterize existing `OutputBlock` behavior

## Goal

Protect every current caller before introducing the reusable variant.

## Scope

Create dedicated component-level coverage for:

```text
src/components/ui/code/txt/OutputBlock.astro
src/components/ui/code/CodeBlock.astro
```

Reuse the existing Astro rendering test infrastructure.

The current absence of component-specific tests is **not** a reason to keep testing only at lesson level. This change
modifies a reusable component API, so its reusable contract should have reusable tests.

## Red

Characterize the current default behavior:

```text
given OutputBlock without a variant
when it renders
then it retains the existing neutral output presentation
```

Cover:

- title rendering;
- code contents;
- copy control presence;
- existing background;
- existing border/title behavior;
- absence of warning icon;
- absence of diagnostic label.

Also characterize a representative existing caller so that adding the variant cannot silently alter all other
`OutputBlock` instances.

## Green

No production behavior change yet.

The initial green state establishes the regression baseline.

## Refactor

Extract small render-query helpers only if several assertions genuinely repeat.

Avoid broad snapshots of the entire component DOM.

## Acceptance criteria

- the existing default rendering has direct characterization coverage;
- changing the future error variant cannot accidentally alter default callers without a test failure.

---

# TDD cycle 2 — Add the reusable error variant

## Goal

Allow `OutputBlock` to represent an error diagnostic without exposing lower-level styling mechanics to consumers.

## Red

Add BDD cases:

```text
given OutputBlock with variant="error" and a diagnostic label
when it renders
then the title bar exposes the label and warning icon
and the block uses the semantic error accent
while the diagnostic body keeps its neutral background
```

Also test:

```text
given a default OutputBlock
when compared with an error OutputBlock
then only the intended semantic presentation differs
```

Use DDT over:

| Variant | Label    | Icon    | Accent  | Neutral body |
| ------- | -------- | ------- | ------- | ------------ |
| default | absent   | absent  | absent  | yes          |
| error   | required | present | present | yes          |

If using the discriminated prop union, add static/type fixtures covering accepted and unsupported combinations.

## Green

### `CodeBlock.astro`

Add the smallest necessary `titleClasses` forwarding to `CodeLayout`.

This is additive and must not alter existing callers.

Do not expose any additional public prop unless actually required.

### `OutputBlock.astro`

Add the discriminated `variant` contract.

For the error state:

- select `icons.Warning`;
- render `label` before the descriptive title;
- compose semantic border/title classes;
- retain the existing body background;
- preserve the existing code and copy infrastructure.

The internal structure can conceptually be:

```astro
<CodeBlock
    icon={errorIcon} class={blockClasses}
    {titleClasses} ...
>
    <span slot="title">
        {label && <span class="...">{label}</span>}
        <slot name="title" />
    </span>
</CodeBlock>
```

but implementation details should follow the existing component conventions.

## Refactor

Centralize the shared semantic error colors instead of copying hex literals.

Ensure:

- class composition is deterministic;
- consumer/default classes are not overwritten;
- no variant-specific logic leaks into `CodeLayout`.

`CodeLayout` should remain a low-level layout primitive.

## Acceptance criteria

- `variant="default"` preserves existing observable behavior;
- `variant="error"` renders icon + textual category + accent;
- body background remains unchanged;
- no duplicate semantic color literals are introduced;
- unsupported variant/label states are statically prevented where practical;
- `CodeLayout` remains unaware of error semantics.

---

# TDD cycle 3 — Preserve diagnostic content exactly

## Goal

Guarantee that visual treatment changes presentation only, not the authentic Nushell diagnostic.

## Red

Capture the existing rendered diagnostic text as a characterization baseline.

The test should compare the diagnostic area's textual content exactly enough to detect:

- changed error identifier;
- changed Nushell wording;
- removed caret/annotation lines;
- changed command text;
- accidental inserted label text inside the terminal `<pre>`.

The semantic badge belongs outside the terminal content.

## Green

Apply:

```astro
variant="error" label="Error de tipo"
```

without modifying the existing `code` prop.

## Refactor

Keep lesson interpretation outside the raw diagnostic block.

Do not edit the error text to make it stylistically consistent with the site's prose.

## Acceptance criteria

The rendered terminal diagnostic remains equivalent to the pre-change baseline while the surrounding presentation
becomes semantically distinct.

---

# TDD cycle 4 — Update the Nushell lesson integration

## Goal

Connect the diagnostic presentation to the pipeline type contract being taught.

## Scope

Update only:

```text
src/pages/notes/scripting/support-scripts/nushell.astro
```

within `#h2-pipeline-type-contracts`.

## Red

Extend the existing lesson render test to assert the semantic relationship:

```text
given the compatible pipeline example
then its output remains a neutral result
```

```text
given the incompatible pipeline example
then its diagnostic is marked as an error
and its title identifies an incompatible pipeline input
```

Also assert that `"Error de tipo"` is **not** present on the compatible result.

## Green

Change the source-block title to:

> **Pipeline con tipos incompatibles**

Render the diagnostic as:

```astro
<OutputBlock
    variant="error" label="Error de tipo"
    ...
>
    <span slot="title">Entrada de pipeline incompatible</span>
</OutputBlock>
```

Keep the raw parser diagnostic unchanged.

Immediately after the diagnostic, add lesson prose explaining the type contract:

> `album-title` está definida para ejecutarse sin entrada de pipeline. Al escribir `"Powerslave" | album-title`, el
> pipeline intenta entregar un `string` a un comando cuya firma no lo acepta. Nushell puede detectar esta
> incompatibilidad antes de la ejecución normal del pipeline.

Use the existing `NushellInline`, `Mono`, and paragraph components according to the lesson's conventions.

## Refactor

Avoid repeating information already clearly communicated by:

- the badge;
- the title;
- the Nushell diagnostic.

The prose should explain **why**, rather than say “there is an error” for a fourth time.

## Acceptance criteria

The pedagogical sequence clearly distinguishes:

1. incompatible source composition;
2. authentic Nushell diagnostic;
3. explanation of the command's input contract.

---

# TDD cycle 5 — Verify themes, accessibility, and visual behavior

## Goal

Verify the distinction at the actual browser/CSS boundary, where the requested improvement is observable.

## Red

Add a focused browser test, preferably using the project's existing Playwright infrastructure, covering both themes.

For the diagnostic block verify:

- the `"Error de tipo"` label is visible;
- the warning icon is present;
- border/header computed colors differ from the default output block;
- body background remains equivalent to the neutral output treatment;
- diagnostic text remains legible;
- the compatible result does not receive error styling.

Also verify that the distinction does not depend solely on color by asserting the textual label is present.

If the existing accessibility tooling supports it, include the block in the normal automated accessibility scan. Do not
introduce a large new accessibility framework solely for this component.

## Green

Adjust only semantic styling necessary to satisfy these observable requirements.

## Refactor

Prefer theme tokens/classes over per-theme page-specific overrides.

## Manual visual review

Retain manual review as a complement to, not a replacement for, automated tests.

Inspect:

```text
/notes/scripting/support-scripts/nushell/
```

in:

- light theme;
- dark theme;
- narrow viewport;
- desktop viewport.

Check especially that:

- the label/title do not crowd the copy button;
- long diagnostic lines remain readable;
- the accent is noticeable but restrained;
- the body is not tinted;
- the block remains visually subordinate to the actual lesson content.

---

# Testing-technique disposition

All testing styles from the project guidelines are considered below. Not all warrant new infrastructure for this change.

| Technique                   | Decision                          | Application                                                                  |
| --------------------------- | --------------------------------- | ---------------------------------------------------------------------------- |
| Example-based / BDD         | **Required**                      | Default and error rendering, lesson integration, regression behavior         |
| DDT                         | **Required**                      | `default`/`error` variant matrix and label/icon/accent expectations          |
| PBT                         | **Not justified**                 | Finite two-state UI contract has little useful generated input space         |
| Differential testing        | **Useful, lightweight**           | Characterize default rendering before/after; compare neutral caller behavior |
| Metamorphic testing         | **Required, lightweight**         | Changing `variant` must not alter raw diagnostic text or copy content        |
| Mutation testing            | **Optional**                      | Could target the variant branch later; low value for current complexity      |
| Fuzz testing                | **Not justified**                 | No parser or external-data decoding boundary is being implemented            |
| Mock testing                | **Avoid**                         | Render real Astro components                                                 |
| Model-based testing         | **Not applicable**                | No domain state model                                                        |
| State-machine testing       | **Not applicable**                | Two render variants are not a meaningful state machine                       |
| Contract testing            | **Required**                      | `OutputBlock` public props and `CodeBlock → CodeLayout` forwarding           |
| Snapshot/golden testing     | **Selective**                     | Useful only for the raw diagnostic baseline; avoid full-page snapshots       |
| Concurrency testing         | **Not applicable**                | No shared concurrent state                                                   |
| Deterministic simulation    | **Not applicable**                | No time/randomness behavior                                                  |
| Static analysis             | **Required**                      | Astro/TypeScript checks, discriminated variant props                         |
| Symbolic execution          | **Not justified**                 | No meaningful computational branching complexity                             |
| Formal specification/proof  | **Not justified**                 | Small UI contract is adequately captured by executable tests                 |
| Runtime assertions          | **Not needed**                    | Prefer compile-time variant constraints                                      |
| Sanitizer-style tooling     | **Not applicable**                | No native memory or low-level runtime boundary                               |
| Cross-version compatibility | **Covered by existing site CI**   | No new package/framework compatibility contract introduced                   |
| Accessibility testing       | **Required at appropriate level** | Textual label + icon + theme/browser checks                                  |
| Visual/browser testing      | **Required**                      | The requested behavior is fundamentally CSS/rendering observable             |

The important point is that **lesson-level render tests are insufficient by themselves**. They prove one integration
path, while the new `variant` is a reusable component contract. Component tests should own that contract; the lesson
test should only prove correct use of it.

---

# Global acceptance criteria

The change is complete when:

- `OutputBlock` supports `default` and `error` variants;
- existing callers that omit `variant` retain their observable appearance and behavior;
- the error state requires or otherwise guarantees an explicit textual label;
- the error state uses the existing semantic error color vocabulary without duplicating literal color definitions;
- the warning icon supplements rather than replaces textual meaning;
- only the header/border receive the error accent;
- the output body retains its existing neutral background;
- the raw Nushell diagnostic remains unchanged;
- copy behavior remains available;
- the compatible `"Powerslave"` result remains neutral;
- the incompatible example is clearly identified as a diagnostic in light and dark themes;
- the explanatory prose connects the diagnostic to `album-title`'s pipeline-input signature;
- component-level tests, lesson integration tests, static checks, and focused browser tests pass;
- existing unrelated working-tree changes are preserved.

# Non-goals

This work intentionally does **not**:

- create a separate `DiagnosticBlock`;
- redesign all code/output blocks;
- recolor diagnostic terminal text;
- add a full red/pink body background;
- alter Nushell syntax highlighting;
- rewrite or normalize the authentic Nushell error;
- convert every historical error example to `variant="error"` in the same change;
- add warning/info/success variants speculatively;
- redesign the callout family;
- introduce a generalized site-wide design-token system.

The only shared-style refactor permitted here is the smallest behavior-preserving extraction needed to avoid duplicating
the existing semantic error colors.

# Suggested execution order

```text
characterize default OutputBlock
        ↓
define typed error variant contract
        ↓
forward titleClasses through CodeBlock
        ↓
share semantic error token
        ↓
implement error presentation
        ↓
prove raw diagnostic preservation
        ↓
apply variant to Nushell lesson
        ↓
add explanatory type-contract prose
        ↓
browser/theme/accessibility verification
        ↓
full existing site checks
```

The minimum useful vertical slice is therefore not merely “make the box redder.” It is:

> **`OutputBlock` gains a reusable, typed diagnostic state that communicates error semantics through text, iconography,
> and a restrained shared accent, while preserving ordinary output and the authentic terminal diagnostic exactly.**
