# Phase 3: Complete `Thesis` Render-Contract Coverage

Status: implemented on 2026-04-20

## Summary

Expand `src/components/ui/references/__tests__/Thesis.render.test.ts` so the suite reads as a contract specification for `Thesis.astro`, not just a collection of representative renders. This phase should close the remaining gaps around title requirements, institution-link gating, omission semantics, and slot-over-prop precedence, while keeping normalization details owned by `reference-content.test.ts`.

The goal is not to retest every normalization branch. The goal is to verify the render outcomes that consumers of `Thesis` can observe: what appears, what is omitted, what is linked, what is rejected, and what never appears twice.

## Scope

This phase remains local to `Thesis.render.test.ts`.

Do not:

* extract shared SSR helpers yet;
* broaden the work into sibling reference components;
* duplicate low-level normalization-path tests already covered in `reference-content.test.ts`.

Production code should remain unchanged unless the new contract tests expose a real defect in `Thesis.astro`.

## Contract Areas to Complete

### 1. Required title contract

Make the title requirement explicit and exhaustive.

Add focused coverage proving that:

* a meaningful resolved title is required for successful render;
* the resolved title always renders inside exactly one anchor;
* that anchor always uses `href=url`;
* both prop-backed and slot-backed titles satisfy the same link contract.

Add failure coverage for all non-meaningful title-source combinations:

* missing prop title and no meaningful title slot;
* whitespace-only prop title;
* non-meaningful title slot with no usable prop fallback;
* blank prop title plus non-meaningful title slot.

When the contract fails, assert `MissingReferenceTitleError` directly rather than using generic thrown-message matching.

### 2. Institution-link gating

Make the institution rendering rules explicit and asymmetric.

Cover these cases:

* meaningful `institution` plus meaningful `institutionUrl` renders institution as a link;
* meaningful `institution` without `institutionUrl` renders plain text, not a link;
* `institutionUrl` without a meaningful `institution` fails with `ReferenceContractError` in dev;
* slot-backed institution overrides prop-backed institution content and prop-backed `institutionUrl`, and is not auto-wrapped in a fallback link.

The last case is important because it verifies both precedence and rendering shape, not just text replacement.

### 3. Optional-field omission semantics

Replace broad “mixed metadata” assertions with focused omission tests that verify clean absence.

Add separate cases showing that:

* absent or non-meaningful `author` produces no author fragment;
* absent or non-meaningful `institution` produces no institution fragment;
* absent or non-meaningful `description` produces no description block.

Prefer structural DOM assertions over string absence alone so the suite verifies omission of the rendered fragment itself, not merely the lack of some text token.

### 4. Slot-over-prop precedence and non-duplication

Make precedence rules explicit for all relevant fields.

Add focused override cases for:

* `title` slot over prop title;
* `institution` slot over prop institution and prop `institutionUrl`;
* `author` slot over prop author.

In each case, verify:

* the slot-backed value is the one rendered;
* the prop-backed fallback is not rendered anywhere else;
* no duplicate element or duplicated visible text is introduced.

Also add one combined override case proving that multiple slot overrides can coexist without leaking fallback metadata and without breaking the single-title-link contract.

### 5. Assertion style and suite readability

Keep `cheerio`-based structural assertions as the default style.

Within the suite:

* prefer selecting elements and asserting counts, attributes, and text content;
* prefer exact error types when the error class is part of the public contract;
* avoid brittle string-fragment assertions unless they are the clearest way to express a contract.

The resulting suite should read as a behavior spec for `Thesis.astro`.

## Suggested Test Organization

Restructure the suite into behavior-oriented groups so the contract is easy to scan.

Recommended grouping:

* `title contract`
* `institution contract`
* `optional metadata omission`
* `slot precedence and non-duplication`
* `failure modes`

This keeps successful rendering, omission, override behavior, and invalid-input behavior clearly separated.

## Test Matrix

### Successful render cases

* prop-backed title renders as exactly one link with `href=url`;
* slot-backed title renders as exactly one link with `href=url`;
* institution renders as a link only when both institution sources are meaningful;
* institution renders as plain text when only institution is meaningful;
* author renders when meaningful;
* description renders when meaningful.

### Override cases

* institution slot overrides prop institution and suppresses fallback link behavior;
* title slot overrides prop title without duplication;
* author slot overrides prop author without duplication;
* combined override case still yields exactly one title link and no fallback metadata leakage.

### Omission cases

* no meaningful institution yields no institution fragment;
* no meaningful author yields no author fragment;
* no meaningful description yields no description block.

### Failure cases

* no title prop and no meaningful title slot yields `MissingReferenceTitleError`;
* whitespace-only prop title yields `MissingReferenceTitleError`;
* non-meaningful title slot with no usable prop fallback yields `MissingReferenceTitleError`;
* `institutionUrl` without meaningful `institution` yields `ReferenceContractError` in dev.

## Boundaries

Keep these boundaries explicit during implementation:

* render-level tests should assert observable outcomes, not internal normalization mechanics;
* slot normalization edge cases belong primarily to `reference-content.test.ts`;
* this phase should not introduce shared helpers unless duplication becomes severe enough to block readability.

A small local `renderAndParse(...)` helper inside `Thesis.render.test.ts` is acceptable if it improves clarity, but shared extraction should wait.

## Verification

During implementation:

* run `Thesis.render.test.ts` after each logical group is added;
* run `reference-content.test.ts` once at the end to confirm that render-level expectations remain aligned with lower-level normalization behavior.

## Acceptance Criteria

Phase 3 is complete when:

* every contract area identified in the traceability plan is represented by at least one focused test;
* the suite expresses required behavior in terms of rendered structure and explicit failure types;
* slot precedence is verified through both positive rendering and fallback non-duplication checks;
* omission tests verify clean structural absence rather than incidental text output;
* no test depends on shared mutable renderer state or brittle HTML-fragment matching.

## Implementation Notes

The phase was implemented in `src/components/ui/references/__tests__/Thesis.render.test.ts`.

The suite now covers:

* prop-backed and slot-backed title link contracts;
* institution link gating and contract failure for `institutionUrl` without `institution`;
* clean omission of institution, author, and description fragments;
* slot-over-prop precedence and non-duplication for title, institution, and author;
* `MissingReferenceTitleError` for missing or non-meaningful title sources.

No production changes were required.

## Assumptions

* `MissingReferenceTitleError` is the intended failure type whenever no meaningful title source can be resolved.
* `institutionUrl` without meaningful `institution` is still a render-time contract violation worth testing here.
* Slot content may override fallback props, but `Thesis` remains responsible for preserving its externally visible render contract, especially around title linking and metadata omission.
