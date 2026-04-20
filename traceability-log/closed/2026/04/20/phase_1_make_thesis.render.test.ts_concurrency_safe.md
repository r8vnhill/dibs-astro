# Phase 1: Make `Thesis.render.test.ts` Concurrency-Safe

## Summary

Refactor [`Thesis.render.test.ts`](src/components/ui/references/__tests__/Thesis.render.test.ts) so each test creates its own renderer through a test-local helper instead of sharing a mutable outer `renderThesis` binding.

This phase is intentionally narrow. Its purpose is only to fix test isolation and remove flake risk under `describe.concurrent(...)`. Do not strengthen assertions, add DOM parsing, expand behavior coverage, or change production code in this phase.

## Goal

Establish a per-test render entry point that is safe under concurrent execution and preserves the suite’s current observable coverage.

## Non-Goals

The following are explicitly out of scope for Phase 1:

* changing assertion style
* adding `cheerio` or any other DOM parser
* adding new test cases
* reorganizing the suite into behavior groups
* extracting shared helpers across suites
* changing `Thesis.astro` or any production code unless required to fix a genuine test harness issue

## Key Changes

* Remove the outer shared variable:

  `let renderThesis: AstroRender<ThesisProps>`

* Remove `beforeEach(...)` renderer initialization entirely.

* Introduce a local render helper inside the test file that:

  * calls `createAstroRenderer<ThesisProps>(Thesis)` on each invocation
  * merges caller overrides onto a valid base prop object
  * accepts optional Astro render options
  * returns the rendered HTML string

* Add a small `BASE_PROPS` constant containing the minimum meaningful valid thesis props.

  * Include a non-blank `title`
  * Include the required `url`
  * Keep the base object minimal so tests remain explicit about the fields they care about

* Keep `describe.concurrent(...)` unchanged.
  Concurrency is part of the contract being preserved, not something to work around by serializing the suite.

* Keep the current test list and current assertions functionally unchanged, except for the minimal edits required to route them through the new helper.

## Implementation Details

Prefer a shape close to this:

```ts
type RenderOptions = Parameters<AstroRender<ThesisProps>>[1];

const BASE_PROPS = {
  title: "Base thesis title",
  url: "https://example.com/thesis",
} satisfies ThesisProps;

async function renderThesis(
  overrides: Partial<ThesisProps> = {},
  options?: RenderOptions,
) {
  const render = await createAstroRenderer<ThesisProps>(Thesis);
  return render({ ...BASE_PROPS, ...overrides }, options);
}
```

### Notes

* Build final props inside the helper with `{ ...BASE_PROPS, ...overrides }`.
* Keep `createAstroRenderer` as the isolation boundary for this phase.
* Keep `AstroRender` imported only if it is still needed for the `RenderOptions` type alias.
* Do not introduce `parse(html)` yet. That belongs to the structural-assertion phase.
* Do not generalize this helper beyond `Thesis` yet. Cross-suite reuse belongs to a later phase, after the shape has proven itself locally.

## Why This Phase Matters

The current suite mixes `describe.concurrent(...)` with outer mutable renderer state. Even if the renderer is assigned in `beforeEach(...)`, concurrent execution still leaves room for one test to overwrite shared state used by another. This phase removes that risk by ensuring each test creates and uses its own renderer instance.

## Acceptance Criteria

Phase 1 is complete only when all of the following are true:

* there is no outer mutable renderer state left in `Thesis.render.test.ts`
* `beforeEach(...)` is no longer needed for renderer setup
* every test renders through the new local helper
* the suite still uses `describe.concurrent(...)`
* the suite still covers the same scenarios as before
* no production code was changed as part of this phase

## Test Plan

Keep the existing scenarios intact:

* linked institution case
* institution slot case
* plain institution, author, and description case
* title and author slot precedence
* missing title failure

### Verification

For this phase:

* run only the `Thesis` render suite
* confirm the file no longer contains shared mutable renderer state
* confirm concurrent execution remains enabled
* confirm the suite still passes without broad assertion rewrites

## Risks

### Risk: accidentally widening scope

While updating the helper, it may be tempting to also improve assertions or add parsing utilities.

**Control:** reject any changes that are not required for renderer isolation.

### Risk: hiding intent with too much abstraction

A local helper is useful here, but Phase 1 should not introduce a generic render-contract framework.

**Control:** keep the helper local to `Thesis.render.test.ts`.

### Risk: invalid base props masking test intent

A bloated `BASE_PROPS` object can make tests less explicit.

**Control:** keep `BASE_PROPS` minimal and limited to fields required for a valid baseline render.

## Assumptions

* [`createAstroRenderer`](src/test-utils/astro-render.ts) is the correct per-test isolation boundary.
* Creating a fresh renderer per test is cheap enough for this suite and preferable to shared state.
* No production behavior changes are required to complete this phase.
* Assertion strengthening, DOM parsing, and contract expansion begin in Phase 2, not here.

## Outcome

Implemented in [`Thesis.render.test.ts`](../src/components/ui/references/__tests__/Thesis.render.test.ts).

### What changed

* removed the outer shared `renderThesis` binding
* removed `beforeEach(...)` renderer setup
* added local `RenderOptions`, `BASE_PROPS`, and `renderThesis(...)`
* kept `describe.concurrent(...)` and the existing scenario list intact

### Verification status

The first targeted run exposed one expected adaptation: the missing-title test now needs to override
the baseline `title` with `undefined` so the failure path remains reachable through `BASE_PROPS`.

Verified with:

`node ./node_modules/vitest/vitest.mjs run --config vitest.astro.config.ts src/components/ui/references/__tests__/Thesis.render.test.ts`

Result: passing (`5` tests).
