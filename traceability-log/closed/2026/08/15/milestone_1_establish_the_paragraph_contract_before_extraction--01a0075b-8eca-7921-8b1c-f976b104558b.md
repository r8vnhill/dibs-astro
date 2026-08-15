# Milestone 1 — Establish the paragraph contract before extraction

## Goal

Establish an executable, behavior-oriented contract for `src/components/semantics/P.astro` before changing repository or
package boundaries.

The milestone must:

- characterize the current externally observable rendering behavior;
- restore Astro/TypeScript type safety at the component boundary;
- identify and correct semantically invalid paragraph usages;
- establish reusable HTML and package-contract evidence for the later extraction;
- preserve current presentation and content except where the existing HTML structure is nonconforming.

This milestone **does not yet extract or rename the component**.

## Current state

`P.astro` currently:

- renders a single `<p>`;
- applies the Tailwind utility `my-2`;
- forwards arbitrary props through `Record<string, any>`;
- exposes no direct component-level test contract;
- is exported through `src/components/semantics/index.ts`;
- may be used in contexts where the `P` abstraction obscures the native `<p>` content model.

The implementation is small, so the principal risk is not implementation complexity but **accidentally changing
semantics while establishing the future library boundary**.

---

# TDD cycle 1 — Characterize the observable rendering contract

## Goal

Capture what consumers can currently observe before changing types or implementation structure.

## Scope

Relevant files:

```text
src/components/semantics/P.astro
src/components/semantics/__tests__/P.test.ts
existing Astro component-test helpers
vitest.astro.config.ts
```

Reuse the existing Astro rendering infrastructure rather than creating a second component test harness.

## Red

Add focused BDD-style characterization tests:

```text
given P with ordinary text content
when the component is rendered
then it produces exactly one p element containing that content
```

```text
given P with consumer-provided HTML attributes
when the component is rendered
then those attributes are preserved on the p element
```

Cover:

- exactly one `<p>`;
- default slot contents;
- `class`;
- `id`;
- `title`;
- `lang`;
- `dir`;
- `style`;
- representative `aria-*`;
- representative `data-*`.

### DDT

Use a data-driven matrix instead of separate near-identical tests:

```text
attribute    value
id           "powerslave-summary"
title        "Project summary"
lang         "en"
dir          "ltr"
data-track   "paragraph"
aria-label   "Project status"
```

Test both:

1. attribute presence;
2. exact value preservation.

## Green

Make no production change yet beyond what is required to expose the current behavior to the tests.

The first green state is a **characterization baseline**.

## Refactor

Consolidate repetitive DOM assertions into small test helpers only when doing so improves readability.

Do not create an abstraction framework for one component.

## Important distinction: `my-2`

Characterize `my-2`, but explicitly mark it as a **temporary migration anchor rather than the long-term public
contract**.

A unit test may assert:

```text
given P with no consumer class
then its current class list includes my-2
```

However, the behavior that should survive the later extraction is **vertical spacing**, not the literal Tailwind class
name.

Therefore also prepare a small browser/build fixture capable of recording the current computed `margin-block-start` and
`margin-block-end`. That fixture will later support differential testing when the package becomes Tailwind-independent.

This follows the guideline to prefer observable contracts over private implementation details.

## Acceptance criteria

- all current rendering behavior has executable characterization coverage;
- attribute tests are data-driven;
- class composition is covered;
- the current vertical-spacing behavior has a browser-observable baseline;
- no production semantics have changed yet.

---

# TDD cycle 2 — Restore native HTML attribute typing

## Goal

Make the component expose the same attribute surface as a native `<p>` rather than an unconstrained `any`-based API.

## Scope

```text
src/components/semantics/P.astro
type-test fixtures
Astro/TypeScript check configuration
```

## Red

Create compile-time fixtures demonstrating both accepted and rejected usage.

Accepted examples should include:

```astro
<P
    id="powerslave-summary" lang="en"
    dir="ltr" aria-label="Project summary"
    data-project="powerslave"
>
    Project summary
</P>
```

Add at least one attribute that is not valid for a paragraph element and assert the type checker rejects it.

Prefer a compile-time fixture over runtime assertions for this contract.

## Green

Replace:

```ts
Props & Record<string, any>;
```

with Astro's native HTML attribute type:

```ts
import type { HTMLAttributes } from "astro/types";

type Props = HTMLAttributes<"p">;
```

Then forward the remaining attributes without an unsafe cast.

The production component should contain:

- no `any`;
- no `unknown` cast used merely to bypass the checker;
- no duplicated handwritten list of HTML attributes.

## Refactor

Keep the component contract deliberately thin.

Do not add wrapper types unless they express a real semantic distinction from native paragraph attributes.

## Acceptance criteria

- `P.astro` contains no `any`;
- native/global paragraph attributes compile;
- at least one incompatible attribute fails type checking;
- the characterization tests from cycle 1 remain green;
- `astro check` remains green.

---

# TDD cycle 3 — Establish the HTML content-model contract

## Goal

Ensure that every `P` consumer actually produces HTML compatible with the native `<p>` content model.

This is important before extraction because a public `Paragraph` library component will otherwise preserve an
abstraction that can hide structurally invalid HTML.

## Scope

Audit all `P` usages, including:

```text
src/pages/notes/**
deprecated lesson/content locations still built or published
components that render P indirectly
```

Search for children that cannot legally appear inside a paragraph, especially:

- `List`;
- `<ul>` / `<ol>`;
- code-block components;
- `<div>`;
- `<section>`;
- `<figure>`;
- `<table>`;
- another paragraph;
- components known to render block-level structures.

## Red

Before correcting consumers, introduce an HTML-validation fixture containing at least one representative invalid
composition.

For example:

```astro
<P>
    Hoy aprenderemos a:
    <List>
        ...
    </List>
</P>
```

The validation test must fail because the generated HTML does not satisfy the paragraph content model.

## Green

Correct invalid compositions by separating paragraph and block content:

```astro
<P>Hoy aprenderemos a:</P>

<List>
    ...
</List>
```

Preserve:

- wording;
- instructional ordering;
- surrounding components;
- existing visual intent as closely as possible.

Do not perform editorial cleanup as part of this milestone.

## Refactor

If repeated structural corrections expose a broader lesson-layout pattern, record it as follow-up work rather than
introducing a new abstraction now.

## HTML validation

Add `html-validate` only as a development/test dependency.

Keep configuration intentionally small:

- recommended HTML rules;
- permitted-content validation;
- only the minimum Astro/build integration needed to validate generated fixtures.

Do not duplicate validation already provided by Astro or existing lint tooling.

## Acceptance criteria

- no audited `P` usage contains known block-content children;
- a deliberately invalid fixture is detected by HTML validation;
- corrected pages pass validation;
- pedagogical wording remains unchanged;
- existing website tests remain green.

---

# TDD cycle 4 — Establish the zero-client-runtime contract

## Goal

Confirm that the semantic component remains server-rendered/static and does not introduce hydration or client-side
JavaScript.

## Red

Create a minimal production fixture containing `P` and build it.

Assert against the built output that rendering `P` alone introduces:

- no hydration directive;
- no Astro island metadata;
- no component-specific client JavaScript.

Do this at the **built-artifact boundary**, not through assumptions about the `.astro` source.

## Green

No implementation change should normally be necessary.

If the test exposes unexpected client output, remove the source of that behavior rather than special-casing the test.

## Refactor

Make this fixture reusable by the later `astro-semantics` package-consumer contract tests.

## Acceptance criteria

- the fixture builds successfully;
- `P` renders as ordinary HTML;
- no client-side runtime is introduced by the component;
- the fixture can later be moved or adapted to the package repository.

---

# TDD cycle 5 — Consolidate the pre-extraction contract

## Goal

Leave the website with one coherent assurance boundary that can later be applied to both the local and extracted
implementations.

## Scope

Consolidate:

- render tests;
- type fixtures;
- HTML validation;
- browser spacing fixture;
- built-output/runtime assertions.

## Red

Add one migration-contract test fixture containing a representative combination of:

```astro
<P
    id="powerslave-summary" class="lesson-summary"
    lang="en" data-project="powerslave"
>
    Project status
</P>
```

Capture:

- resulting DOM structure;
- attributes;
- textual content;
- class composition;
- computed vertical spacing.

This becomes the canonical fixture for differential testing during extraction.

## Green

Ensure the current implementation satisfies the fixture.

## Refactor

Separate the fixture data from implementation-specific assertions so milestone 4 can later execute the same contract
against:

1. the local `P`;
2. the packaged `Paragraph`.

This avoids creating two subtly different notions of compatibility.

## Acceptance criteria

The milestone produces a reusable compatibility fixture covering the observable behavior that must survive extraction.

---

# Testing-technique disposition

All testing styles from the project guidelines should be considered, but only those with meaningful value should be
introduced.

### Required now

**Example-based / BDD**

Primary technique for:

- rendering;
- slot preservation;
- class composition;
- regression cases;
- invalid structural examples.

**DDT**

Use for the HTML/global attribute matrix.

**Contract testing**

Use for:

- native HTML attribute compatibility;
- generated HTML structure;
- built-output behavior;
- future extraction compatibility.

**Static analysis**

Required through:

- strict TypeScript;
- `astro check`;
- type fixtures;
- HTML validation.

**Browser-level testing**

Use selectively for computed vertical spacing, because this is the observable behavior currently represented by `my-2`.

### Prepare now, execute during extraction

**Differential testing**

The compatibility fixture established here should later compare:

```text
local P
    versus
packaged Paragraph
```

for normalized DOM and computed style.

### Useful but not required

**Property-based testing**

There is limited value at this stage. If introduced later, a reasonable property would be that generated safe `data-*`
values survive rendering unchanged.

Do not add a PBT dependency solely for this component.

**Metamorphic testing**

A useful lightweight invariant is:

```text
adding an unrelated global attribute
must not change the rendered slot content or element type
```

This can be expressed as ordinary parameterized tests without dedicated infrastructure.

**Snapshot/golden testing**

Use only for small normalized HTML fixtures if they materially simplify comparison.

Avoid large page snapshots.

### Not justified for this milestone

- fuzz testing;
- mutation testing;
- model-based testing;
- state-machine testing;
- concurrency testing;
- symbolic execution;
- deterministic simulation;
- formal proof;
- sanitizer-style tooling.

There is no parser, state machine, concurrent behavior, numerical domain, or sufficiently complex logic to justify those
techniques.

Mutation testing may become useful later if `astro-semantics` grows nontrivial transformation or contract logic.

---

# Milestone acceptance criteria

The milestone is complete when all of the following are true:

- `P.astro` contains neither `any` nor `Record<string, any>`;
- its props derive from `HTMLAttributes<"p">`;
- valid native/global paragraph attributes are type-checked and forwarded;
- at least one paragraph-incompatible attribute is rejected by static typing;
- rendering produces exactly one `<p>`;
- slot contents remain intact;
- consumer classes remain supported;
- the current `my-2` implementation is characterized;
- the corresponding computed vertical spacing is recorded as the migration-level observable baseline;
- no client hydration or component-specific JavaScript is introduced;
- audited consumers produce paragraph structures accepted by HTML validation;
- a deliberately invalid paragraph fixture is rejected by that validation;
- the canonical compatibility fixture is ready for later differential testing;
- component-specific tests, `astro check`, HTML validation, existing unit/integration tests, and relevant browser tests
  all pass;
- existing unrelated working-tree changes are preserved.

---

# Non-goals / deferred work

This milestone intentionally does **not**:

- create `@ravenhill/astro-semantics`;
- publish anything to the GitLab Package Registry;
- change package-registry topology;
- rename the public component from `P` to `Paragraph`;
- migrate existing imports to a new package;
- extract `Heading` or `Enquote`;
- replace `my-2` with package-owned CSS;
- redesign typography or vertical rhythm;
- introduce a generalized typography component hierarchy;
- add runtime slot-content introspection;
- broaden the work into general HTML remediation outside `P` consumers.

The eventual removal of Tailwind from the component belongs to the extraction milestone, where the captured **computed
spacing contract**, rather than the literal `my-2` class, should govern behavior preservation.

# Suggested execution order

```text
characterize rendering
        ↓
characterize visual spacing
        ↓
restore HTMLAttributes<"p"> typing
        ↓
introduce HTML structural validation
        ↓
repair invalid P consumers
        ↓
verify zero-client-runtime behavior
        ↓
consolidate migration fixture
        ↓
run full website assurance
```

The key improvement is that this milestone now leaves behind more than “tests for the old component”: it produces a
**portable compatibility contract**. That contract can become the oracle for the next milestone when `P.astro` moves
across the repository/package boundary, which substantially reduces the risk of the extraction itself.
