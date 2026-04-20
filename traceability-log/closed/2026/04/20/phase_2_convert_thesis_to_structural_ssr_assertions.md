# Phase 2: Convert `Thesis` to Structural SSR Assertions

## Summary

`Thesis.render.test.ts` is already isolated well enough for concurrent execution, so this phase should stay narrowly focused on assertion quality. The goal is to replace brittle string and regex checks with structural SSR assertions that express the component’s render contract in DOM terms rather than serialized HTML fragments.

`Thesis.astro` already exposes a stable enough observable contract for this work: a required linked title, optional institution content that may come from props or slots, optional author content, and optional description content. This phase should make the suite verify those behaviours through parsed SSR output while leaving production code, suite structure, and broader test-utility design unchanged.

This is a local test-hardening phase, not a reference-suite standardization pass. Nearby suites may still use string assertions, and that is acceptable for now. The point of this phase is to make `Thesis` the first clean structural render-contract suite without prematurely extracting shared helpers or refactoring sibling files.

## Goals

* Replace brittle string and regex assertions in `Thesis.render.test.ts` with DOM-structural assertions.
* Make the assertions read like render-contract checks rather than serialization checks.
* Preserve the suite’s current concurrency-safe structure and local render helper.
* Keep the refactor strictly local to the `Thesis` suite.

## Non-Goals

This phase should not:

* modify `Thesis.astro` production behaviour;
* change props, slot names, or public component contracts;
* extract shared DOM-test helpers for sibling suites;
* refactor `ScholarlyArticle.render.test.ts` or any other reference suite;
* add new contract scenarios that belong to a later phase unless they are required to preserve current coverage.

## Key Changes

### 1. Add a local structural SSR parser for the `Thesis` suite

Add `cheerio` as a dev dependency and use it only within `Thesis.render.test.ts` for SSR DOM inspection.

Within the suite:

* add a small local `parse(html)` helper that returns a Cheerio root;
* keep the existing `renderThesis(...)` helper;
* keep the existing `describe.concurrent(...)` organization.

The parser should be a local implementation detail of this suite, not the beginning of a shared test-helper API.

### 2. Replace serialized HTML checks with DOM-contract assertions

Convert the existing `toContain(...)`, regex, and similar string-fragment checks into assertions against parsed DOM structure.

The suite should assert behaviour in terms of rendered elements and content, not raw HTML formatting. In particular, it should verify that:

* the title renders as the main thesis link;
* that link points to the exact `url` provided by the test input;
* institution content renders as a generated link only when it originates from props with `institutionUrl`;
* institution slot content remains caller-authored markup and is not auto-wrapped in a generated link;
* plain institution text remains plain text when no `institutionUrl` is provided;
* author content appears in the rendered metadata region when present;
* description content appears only when the description slot is meaningful.

### 3. Keep assertions contract-focused rather than wrapper-focused

Target stable public semantics and avoid coupling the suite to incidental markup details that are likely to change during harmless refactors.

Prefer assertions such as:

* there is exactly one title anchor for the thesis title;
* that anchor has the expected `href`;
* the institution region contains either a generated link, plain text, or slotted markup depending on input source;
* optional content is absent when omitted.

Avoid asserting:

* unrelated class lists;
* full serialized HTML output;
* wrapper nesting that is not part of the public render contract;
* formatting details that do not change user-visible semantics.

The suite should become stricter about behaviour and looser about incidental HTML shape.

### 4. Preserve the current failure-path contract

Keep the missing-title case as a rejection-based assertion.

That scenario is still best treated as a render failure rather than a DOM inspection case. No parser should be involved there. The suite should continue asserting that rendering fails when the required-title contract is not satisfied.

## Expected Contract Coverage

After this phase, `Thesis.render.test.ts` should continue covering the existing scenarios, but through structural assertions:

* linked institution from props;
* institution slot preserved without generated link wrapping;
* plain institution text when no institution URL exists;
* author and description when present;
* title and author slot precedence over prop fallbacks, if those cases already exist in the suite;
* rejection when no meaningful title is available.

The scope remains “same coverage, better assertions,” not “expand the suite to full future-state completeness.”

## Test Design Rules

* Parse once per rendered result and assert through the DOM.
* Query for stable semantic targets rather than relying on broad text-fragment matching.
* Keep helper logic minimal and local.
* Do not introduce abstraction layers that are only justified by anticipated reuse.
* If an assertion can be expressed either through exact HTML or a DOM query, prefer the DOM query unless literal serialization is itself the contract.

## Public Interfaces / Contracts

* No production API changes.
* No changes to `Thesis.astro` props.
* No changes to slot names or slot semantics.
* No shared parser or render-assertion utility introduced in this phase.

## Test Plan

Update `src/components/ui/references/__tests__/Thesis.render.test.ts` so the existing cases are asserted structurally rather than through serialized HTML fragments.

Primary scenarios to preserve:

* title link renders with the correct `href`;
* institution from props renders as a link when `institutionUrl` exists;
* institution slot content is preserved as authored and not auto-wrapped;
* plain institution text remains text when no URL is provided;
* author and description render only when meaningfully present;
* slot precedence over prop fallbacks remains intact where currently covered;
* missing meaningful title rejects.

Verification for this phase should stay narrow:

* run the `Thesis` render suite only.

## Completion Criteria

This phase is complete when all of the following are true:

* `Thesis.render.test.ts` no longer relies on brittle string or regex assertions for successful render cases;
* the suite expresses render behaviour through parsed DOM structure;
* the existing suite structure remains concurrency-safe and locally scoped;
* no production code or public interface changes were required;
* the `Thesis` suite passes in isolation.

## Assumptions and Defaults

* `cheerio` is the preferred parser for this local SSR test refactor.
* This phase is about converting assertion style, not broadening behavioural coverage beyond what the suite already intends to verify.
* Shared helper extraction remains deferred until more than one suite demonstrates the same stable pattern and the reuse is proven rather than speculative.

## Outcome

This phase was completed without changing `Thesis.astro` production behavior.

Completed changes:

* `src/components/ui/references/__tests__/Thesis.render.test.ts`
  * now parses SSR output structurally with a local `parse(html)` helper
  * now asserts title, institution, author, and description behavior through DOM structure instead
    of brittle string and regex checks
  * keeps the existing local render helper and concurrent-safe suite shape unchanged

* `package.json`
  * adds `cheerio` as a dev dependency for local SSR DOM assertions

Verification:

* `pnpm exec vitest run --config vitest.astro.config.ts src/components/ui/references/__tests__/Thesis.render.test.ts` ✅
