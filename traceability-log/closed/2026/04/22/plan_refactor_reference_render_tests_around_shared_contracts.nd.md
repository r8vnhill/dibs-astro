# Plan: Refactor Reference Render Tests Around Shared Contracts

## Summary

Refactor the reference render-test layer so shared citation-family behavior is tested through a small set of reusable contract helpers, while component-specific behavior remains local to each suite.

Start with `Thesis.render.test.ts`, since it already exposes the main problems this refactor should solve:

- concurrency-unsafe shared renderer state
- brittle string-fragment assertions
- repeated render-contract logic that likely also applies to sibling reference components

The goal is to improve reliability, clarity, and reuse in the render-test layer without introducing unnecessary abstraction and without changing production behavior unless tests reveal a real contract defect.

## Goals

- Eliminate concurrency hazards from render suites.
- Replace fragile string-based SSR assertions with structural DOM assertions.
- Make shared render contracts explicit for components that already follow the same slot/prop resolution semantics.
- Reduce duplication across reference-component suites without building a full testing framework.
- Keep component-specific behavior easy to read and test locally.

## Non-Goals

- No production API redesign for `Thesis.astro` or sibling components.
- No general-purpose test framework for all Astro components.
- No migration of lower-level normalization concerns into render suites.
- No new production abstractions unless a failing test reveals a genuine design problem.

## Scope

### In scope

- `Thesis.render.test.ts`
- shared test-only helpers for reference-family render contracts
- sibling suites that already appear to share the same observable behavior model:

  - `ScholarlyArticle`
  - `WebPage`
  - `Video`

### Out of scope

- production refactors unrelated to testability
- normalization and “meaningful content” rules already better exercised at lower levels
- property-based testing for render suites

## Core Design Decisions

### 1. Renderer isolation is mandatory

Each render assertion must use a fresh Astro renderer created inside a local helper. Do not store renderer state in outer mutable bindings, especially inside `describe.concurrent(...)`.

### 2. Structural assertions are the default

Use a lightweight SSR DOM parser, with `cheerio` as the default choice, to assert:

- element presence or absence
- uniqueness
- text content
- exact attribute values
- structural differences between plain text, links, and slotted markup

Raw substring assertions should only remain where literal HTML output is itself the contract.

### 3. Shared helpers must stay narrow

Extract helpers only for behavior that is already shared and observable across multiple components. Helpers should accept:

- a component renderer
- base props
- optional slot input
- field descriptors only when needed

They should not encode component-specific metadata rules.

### 4. Lower-level normalization stays lower-level

Whitespace normalization, meaningful-content detection, and related invariants should remain tested in `reference-content.test.ts` or other lower-level tests. The render suites should verify rendered behavior, not re-test every normalization branch indirectly.

## Expected Shared Contracts

Only extract helpers for contracts that are already common across components.

### Shared contracts

- required title contract
- linked title contract
- slot-over-prop precedence for title- and author-like fields
- omission of absent optional metadata
- non-duplication when a slot overrides a prop

### Component-local contracts

Keep these in the owning suite:

- `Thesis`: institution-specific linking rules
- `ScholarlyArticle`: publication/pages behavior
- `WebPage` and `Video`: platform/location-specific behavior

## Implementation Plan

## ~~Phase 1: Fix `Thesis` test isolation~~

Refactor `Thesis.render.test.ts` so each test renders through a local helper that creates a fresh Astro renderer per call.

Status: complete

### Changes

- Remove outer shared `let renderThesis`.
- Remove `beforeEach(...)` renderer initialization.
- Add:

  - `BASE_PROPS`
  - local `renderThesis(...)`
  - optional `parse(html)` helper

### Exit criteria

- suite remains safe under `describe.concurrent(...)`
- no test depends on shared mutable renderer state
- behavior remains unchanged

### Verification

Run the `Thesis` suite only.

---

## ~~Phase 2: Convert `Thesis` to structural SSR assertions~~

Replace brittle `toContain(...)` and regex-based checks with DOM-level assertions.

### Changes

- Add `cheerio` as a dev dependency.
- Parse rendered HTML in the suite.
- Assert structure directly:

  - title link target and visible text
  - institution link vs plain text
  - presence of slotted markup
  - absence of elements when data is omitted

### Exit criteria

- current `Thesis` cases pass using DOM assertions
- assertions read as behavioral contracts rather than string snapshots
- failures identify the broken structure precisely

### Verification

Run the `Thesis` suite only.

---

## ~~Phase 3: Complete `Thesis` contract coverage~~

Add the missing behavior contracts that define the component’s public render semantics.

Status: complete

### Required coverage

- title always links to `url`
- institution is linked only when both `institution` and `institutionUrl` are meaningful
- institution slot overrides the prop fallback and is not auto-wrapped
- optional author, institution, and description are omitted cleanly when absent
- blank or whitespace-only title sources fail the required-title contract
- slot overrides do not duplicate fallback prop content

### Exit criteria

`Thesis.render.test.ts` fully describes the observable behavior expected from the component, including success, omission, override, and failure cases.

### Verification

Run:

- `Thesis.render.test.ts`
- `reference-content.test.ts`

---

## ~~Phase 4: Extract shared reference render-contract helpers~~

Status: complete

Once `Thesis` is stable and structurally asserted, identify repeated arrange/assert patterns across sibling suites and extract only the duplication that is already proven common.

### Changes

Create a test-only helper module for:

- per-test renderer creation
- linked-title assertions
- slot-over-prop precedence assertions
- omission-of-optional-content assertions
- non-duplication assertions

### Rules

- helpers must assert observable output only
- helpers must not know component internals
- helpers must not replace local tests for unique behavior

### Exit criteria

- shared helpers remove real duplication across multiple suites
- each suite still reads as a behavior-first specification for its component
- no helper exists for behavior used in only one place

### Verification

Run the touched render suites:

- `Thesis`
- `ScholarlyArticle`
- `WebPage`
- `Video`

---

## ~~Phase 5: Apply DDT selectively~~

Status: complete

Use `test.each(...)` only where there is a genuine case matrix and parameterization improves readability.

### Good DDT candidates

- slot-vs-prop precedence cases
- omission of optional metadata
- repeated title/author-like contracts across components

### Avoid

- forcing unique component-specific behavior into dense tables
- parameterization that obscures intent

### Exit criteria

- duplication is reduced
- suite readability remains strong
- failure output still points clearly to the broken contract

### Verification

Run touched suites, then the full Astro render-test command.

## Test Strategy

### Render suites should emphasize

- observable SSR structure
- exact link targets
- presence/absence semantics
- precedence between slots and props
- failure behavior for missing required content

### Lower-level suites should emphasize

- whitespace normalization
- meaningful-content detection
- mapping of invalid or blank inputs into render-layer outcomes

## Dependency Changes

### Add

- `cheerio` as a dev dependency for structural SSR assertions

### Do not add now

- `fast-check` for render suites

If stronger invariant coverage is needed later, use `fast-check` in lower-level pure-helper tests, not in component render tests.

## Risks and Controls

### Risk: over-abstraction

Extracting helpers too early could make suites harder to read.

**Control:** only extract behavior already duplicated across multiple suites.

### Risk: testing implementation details

DOM assertions can drift into testing markup incidental to layout rather than behavior.

**Control:** assert only what belongs to the public render contract.

### Risk: duplicated normalization coverage

Render tests may start re-testing lower-level normalization logic in indirect, noisy ways.

**Control:** keep normalization invariants in lower-level tests and verify only rendered outcomes at the component layer.

## Completion Criteria

This refactor is done when all of the following are true:

- `Thesis.render.test.ts` is concurrency-safe
- `Thesis.render.test.ts` uses structural SSR assertions by default
- `Thesis` render contracts are complete and explicit
- repeated cross-suite render contracts are extracted into narrow test-only helpers
- sibling suites adopt shared helpers only where behavior is truly shared
- full Astro render tests pass without requiring production behavior changes, unless a test reveals a real defect

## Verification Commands

During each phase, run only the touched suites first. Finish with the full Astro render-test command for the project.
