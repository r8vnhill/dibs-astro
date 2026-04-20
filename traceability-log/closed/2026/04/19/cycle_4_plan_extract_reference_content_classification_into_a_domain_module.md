# Cycle 4 Plan: Extract Reference Content Classification into a Domain Module

## Closure Note

Closed on 2026-04-19 after the pure reference-content rules moved into `src/domain/reference-content.ts`, the Astro-facing adapter was reduced to slot I/O and batching, and the existing missing-title failure mode remained mapped to `MissingReferenceTitleError`.

Validation used:

* `src/domain/__tests__/reference-content.test.ts`
* `src/components/ui/references/__tests__/reference-content.test.ts`
* `src/components/ui/references/__tests__/GenericReference.render.test.ts`
* `src/components/ui/references/__tests__/ScholarlyArticle.render.test.ts`
* `src/components/ui/references/__tests__/Thesis.render.test.ts`
* `src/components/ui/references/__tests__/WebPage.render.test.ts`
* `src/components/ui/references/__tests__/Video.render.test.ts`
* `pnpm exec tsc --noEmit`

Cycle 4 completed without caller-visible regressions in slot classification, fallback precedence, or missing-title behavior.

## Summary

Move the pure reference-content decision rules out of `src/components/ui/references/reference-content.ts` and into a new domain module that has no knowledge of Astro slots, template rendering, or component markup. The UI layer should remain responsible only for slot existence checks, slot rendering, and translation between Astro-facing inputs and domain-facing decisions.

Keep external behavior stable throughout this cycle. In particular, preserve the current presentation-facing failure mode for missing meaningful titles: the domain should model this as an explicit invalid outcome, and the UI adapter should continue translating that outcome into the existing `MissingReferenceTitleError`.

This cycle is about ownership and separation of concerns, not a redesign of reference rendering.

## Goals

This cycle should accomplish four things:

* isolate pure reference-content rules in a domain-owned module;
* leave Astro slot I/O and batching in the UI layer;
* preserve current render contracts for all reference components;
* improve test structure by moving rule-heavy assertions out of UI tests and into domain tests.

## Non-goals

This cycle should **not**:

* rename slot keys or change slot-name conventions;
* redesign reference component props;
* change punctuation, labels, wrappers, or HTML structure in rendered output;
* redesign batched slot preparation;
* broaden the public API surface unless needed to express the extracted domain rules clearly;
* change caller-visible behavior for valid or invalid references.

## Proposed Architecture

### Domain layer

Add a new reference-focused domain module under `src/domain` that owns the pure decision logic currently mixed into the UI layer.

This module should own:

* classification of rendered content as meaningful or empty;
* whitespace and HTML-entity normalization needed for that classification;
* stripping or ignoring non-meaningful HTML such as comments and empty wrappers;
* slot-over-fallback precedence for inline fields;
* resolution of linked fallbacks versus plain-text fallbacks;
* title-required validity as a domain outcome.

The domain boundary should accept only plain values and discriminated inputs. It should not depend on:

* `SlotLike`;
* Astro APIs;
* component templates;
* JSX or presentation-specific helpers.

### UI adapter layer

Keep `src/components/ui/references/reference-content.ts` as the Astro-facing adapter.

After this refactor, that module should only do the following:

* call `slots.has(...)` and `slots.render(...)`;
* pass rendered HTML or fallback props into domain functions;
* convert domain outcomes into the current UI-facing contracts;
* preserve existing exports, or thin wrappers around them, where that reduces churn in `.astro` callers.

The UI layer should continue to own:

* `MissingReferenceTitleError`;
* slot batching and per-reference preparation;
* presentation labels such as `SPANISH_REFERENCE_META_LABELS`;
* any markup or output-shaping concerns.

## Domain API Shape

Keep the domain result types close to the current runtime decision shapes so migration stays narrow.

Recommended outcomes:

* rendered content classification: `empty | meaningful`
* inline field resolution: `missing | slot | text`
* linked inline field resolution: `missing | slot | text | link`
* title-bearing field resolution: same family of outcomes, plus an explicit invalid outcome for required-title use cases

The important design choice is that the domain should model invalid title state explicitly instead of throwing. Throwing remains an adapter concern.

## Boundary Rules

To keep the separation clean, adopt these rules explicitly:

* Domain inputs are plain strings, booleans, and discriminated objects only.
* Domain functions may return meaningful slot HTML as an opaque payload, because that is already part of the current contract.
* Domain does not decide labels, punctuation, link attributes, CSS classes, or wrappers.
* UI remains the trust boundary for rendered slot HTML.
* `PreparedReferenceSlots` stays in the UI layer for this cycle unless a tiny reusable helper falls out naturally.

## Implementation Changes

### 1. Introduce a domain module for reference-content decisions

Create a new module under `src/domain` dedicated to reference-content resolution.

It should extract the pure helpers and unions that currently mix content semantics with Astro mechanics. Consolidate rule ownership there rather than scattering logic across adapter helpers.

### 2. Reduce `reference-content.ts` to a thin adapter

Refactor `reference-content.ts` so it orchestrates slot I/O and delegates all pure classification and precedence logic to the domain module.

Keep component call sites stable where practical. Existing consumers should continue using the same module-level functions unless there is a strong reason to rename them.

### 3. Preserve title error behavior through adapter mapping

The domain should return an explicit invalid-title result when neither slot content nor fallback title is meaningful. The adapter should translate that result into the existing `MissingReferenceTitleError` so caller-facing behavior remains unchanged.

### 4. Keep batching and async orchestration in the UI layer

Do not move `resolveOptionalSlots(...)`, `prepareSlotsForReferences(...)`, or related async slot-preparation mechanics into Domain in this cycle. Those functions remain UI concerns because they orchestrate Astro rendering and slot availability.

## Recommended TDD Sequence

### 1. Add a focused domain test suite for rendered-content classification

Start by locking down the classification rules independently of Astro.

Cover at least:

* empty string;
* whitespace-only input;
* `&nbsp;`, `&#160;`, and `&#xA0;`;
* comment-only fragments;
* empty wrappers;
* visible text inside wrappers;
* media-only fragments treated according to the current contract;
* preservation of original meaningful HTML payload.

This establishes the lowest-level rules before any adapter refactor begins.

### 2. Add domain tests for fallback normalization and precedence

Next, lock down precedence and fallback behavior.

Cover:

* slot content winning over fallback text;
* blank fallback text becoming `missing`;
* meaningful text surviving normalization;
* linked fallback producing `link` only when both normalized text and usable URL are present;
* blank or unusable URL degrading to plain text rather than link.

### 3. Add domain tests for required-title validity

Then lock down the title invariant at the domain level.

Cover:

* meaningful slot title is valid;
* meaningful fallback title is valid;
* empty slot plus blank or absent fallback yields explicit invalid-title outcome.

This should be the point where the domain makes invalidity observable without UI exceptions.

### 4. Refactor implementation into the new domain module

Once the rule suite is green, move the pure logic into Domain and keep `reference-content.ts` as a thin orchestration seam.

Prefer small, verifiable moves:

* move helpers first;
* move discriminated unions second;
* then swap adapter internals to delegate to Domain.

### 5. Tighten UI-layer tests around orchestration only

After the extraction, simplify `reference-content.test.ts` so it focuses on UI concerns:

* absent slot skips render work;
* rendered slot HTML is passed to domain classification;
* batching and async slot behavior remain correct;
* invalid domain title outcome still maps to `MissingReferenceTitleError`.

Pure normalization and precedence assertions should no longer live primarily in the UI-layer suite.

## Test Plan

### Domain unit tests

Add a dedicated suite for:

* rendered-content classification;
* whitespace/entity normalization behavior;
* inline field precedence;
* linked-inline fallback behavior;
* required-title invalidity.

### UI adapter tests

Keep or add focused adapter coverage for:

* slot absence short-circuiting render work;
* handoff of rendered slot HTML into domain functions;
* preservation of async behavior in `resolveOptionalSlots(...)`;
* preservation of batching and typing behavior in `prepareSlotsForReferences(...)`;
* mapping of invalid-title domain result to `MissingReferenceTitleError`.

### Render-contract regression tests

Run the shared reference render suites that depend on these rules:

* `GenericReference.render.test.ts`
* `ScholarlyArticle.render.test.ts`
* `Thesis.render.test.ts`
* `WebPage.render.test.ts`
* `Video.render.test.ts`

That broader verification pass matters because Cycle 4 changes rule ownership at a shared seam, even if caller-visible behavior is meant to stay stable.

## Validation Order

Run the narrowest checks first, then expand outward:

1. domain test suite;
2. `reference-content.test.ts`;
3. affected render-contract suites;
4. `pnpm exec tsc --noEmit`.

Use the full Astro/Vitest command only after the targeted suites are green.

## Exit Criteria

Cycle 4 is complete when all of the following are true:

* pure reference-content rules live in a domain module with no Astro dependencies;
* `reference-content.ts` is reduced to slot I/O and adapter logic;
* `MissingReferenceTitleError` behavior remains unchanged for callers;
* `prepareSlotsForReferences(...)` and other slot orchestration functions remain in the UI layer;
* pure rule assertions have moved out of the UI-heavy suite into domain tests;
* affected render-contract suites remain green.

## Assumptions and Defaults

* This extraction is intentionally narrow and should not trigger broader component redesign.
* Existing discriminated decision shapes are close enough to keep as the basis for the domain API.
* The domain owns semantic invalidity for title resolution, while the UI owns how that invalidity is surfaced during rendering.
* `reference-content.ts` remains the composition seam for Astro-facing code even after most pure logic moves out.
