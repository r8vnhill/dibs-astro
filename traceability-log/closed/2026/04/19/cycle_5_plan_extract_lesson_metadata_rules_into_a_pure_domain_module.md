# Cycle 5 Plan: Extract Lesson Metadata Rules into a Pure Domain Module

## Closure Note

Closed on 2026-04-19 after the pure lesson-metadata rules moved into `src/domain/lesson-metadata.ts`, `src/utils/lesson-metadata.ts` was reduced to dataset validation/cache/lookup orchestration plus delegation, and caller-facing behavior remained stable.

Validation used:

* `src/domain/__tests__/lesson-metadata.test.ts`
* `src/utils/__tests__/lesson-metadata.test.ts`
* `src/components/notes/__tests__/LessonMetaPanel.render.test.ts`
* `pnpm exec tsc --noEmit`

Cycle 5 completed without caller-visible regressions in normalized lookup keys, date formatting policy, or metadata entry resolution.

## Summary

Extract the pure lesson-metadata rules from `src/utils/lesson-metadata.ts` into a new domain-owned module, while keeping generated JSON loading, Zod validation, caching, and dataset traversal in the current utility layer. The goal is to make lookup-key normalization and lesson-date policy first-class domain rules rather than utility glue. 

This cycle should remain deliberately narrow. It is not a redesign of the generated metadata dataset, the public caller API, or how `NotesLayout` and related UI components consume lesson metadata. It is a rule-ownership refactor that should preserve runtime behavior.

## Goals

This cycle should achieve four things:

* isolate pure metadata rules in a dependency-light domain module;
* leave validation, artifact loading, cache state, and dataset lookup orchestration in the utility layer;
* preserve the current public behavior of `resolveLessonMetadata(...)` and related exports;
* improve test structure by separating rule tests from artifact and cache tests.

## Non-goals

This cycle should **not**:

* redesign the generated JSON structure;
* change the public shape of `LessonMetadataDataset` or `LessonMetadataEntry`;
* move Zod schemas into Domain;
* move cache state or import-time artifact loading into Domain;
* change how `NotesLayout`, `LessonMetaPanel`, or other callers request metadata;
* broaden the refactor into a general route-model redesign.

## Recommended Boundary Decision

The one design choice I would tighten is this:

> Domain should own **canonicalization rules**, but it should not depend directly on infrastructure-ish utility modules unless those modules are already true domain value objects.

So instead of assuming Domain must directly reuse `LessonHref`, define the boundary like this:

* if `LessonHref` is already a domain-safe value object with no utility-layer dependencies, reuse it;
* otherwise, extract or mirror the minimal canonical path logic into a small domain-safe helper or value object so Domain does not end up depending on `src/utils`.

That keeps the dependency direction clean and avoids “Domain extraction” that still secretly depends on utility code.

## Proposed Architecture

### Domain module

Add a new lesson-metadata domain module under `src/domain` that owns only pure, deterministic metadata rules.

This module should own:

* normalization of raw pathname/URL input into canonical metadata lookup keys;
* parsing policy for ISO short dates;
* formatting decision policy for lesson-facing dates;
* unknown-date fallback handling, if that fallback is part of the stable metadata contract rather than purely UI wording.

This module should accept plain inputs and return plain outputs. It should not know about:

* Zod;
* generated JSON artifacts;
* caches;
* dynamic imports;
* `entries[...]` traversal;
* UI components.

### Utility layer

Keep `src/utils/lesson-metadata.ts` as the infrastructure-facing adapter.

After the refactor, it should remain responsible for:

* Zod schemas and inferred dataset types;
* importing `lesson-metadata.generated.json`;
* dataset validation and caching;
* resolving entries from `source.entries[...]`;
* delegating normalization and date decisions to the domain module.

This keeps the utility layer as the composition seam between artifact access and domain policy.

## Public API and Type Ownership

Keep these outside Domain:

* `LessonMetadataDataset`
* `LessonMetadataEntry`
* author/change record types
* generated artifact schemas and parse types

These are artifact-facing and validation-facing types, not core domain abstractions.

Domain should export only:

* pure metadata-rule functions;
* any small supporting domain types needed to model outcomes cleanly.

That keeps Domain from becoming a mirror of the dataset schema.

## Suggested Domain API Shape

Prefer a small, explicit API rather than leaking utility-oriented concerns into Domain.

A good shape would be something like:

* normalize raw pathname/URL into canonical lookup key
* parse ISO short date into a domain-safe parsed result
* resolve lesson date display decision from optional raw date input

If formatting policy has multiple outcomes, consider returning a small discriminated result rather than mixing parsing and display concerns too early. For example:

* `missing`
* `formatted`
* `passthrough`

That keeps policy explicit and easier to test.

## Constant Ownership

I would make constant ownership explicit up front.

### `DEFAULT_LOCALE`

Keep this outside Domain unless it is truly part of the business rule. In most codebases, locale defaults are application or presentation policy, not core domain logic.

### `UNKNOWN_DATE_LABEL`

Decide this based on semantics:

* if it is genuinely part of the stable metadata rule, Domain can own it;
* if it is presentation wording, keep it outside Domain and let Domain return a semantic outcome such as `missing`.

My default recommendation is:

* Domain returns the semantic outcome;
* utility or UI applies the label.

That yields a cleaner separation and makes future localization easier. Only keep the label inside Domain if preserving exact current behavior with minimal churn is more important in this cycle.

## Implementation Changes

### 1. Introduce a pure domain module for metadata rules

Create a new module under `src/domain` that owns:

* lookup-key normalization;
* ISO short date parsing policy;
* lesson-date decision policy.

Keep functions small and deterministic. Avoid hidden state and avoid passing large config objects unless there is already real variation to support.

### 2. Reduce `lesson-metadata.ts` to orchestration

Refactor `src/utils/lesson-metadata.ts` so it becomes mostly:

* schema definition;
* JSON parsing;
* cache lifecycle;
* dataset lookup;
* delegation to Domain.

Do not move `parseLessonMetadataDataset`, `getLessonMetadataDataset`, `__resetLessonMetadataCache`, or `resolveLessonMetadata(...)` out of this file in this cycle.

### 3. Preserve public caller behavior

Keep existing public exports where practical. If callers currently rely on utility-layer helpers, maintain those wrappers and have them delegate internally to Domain rather than forcing immediate rewiring across the codebase.

### 4. Keep dataset traversal out of Domain

Do not let Domain know about `source.entries[...]`, entry lookup order, or cache access. Even though normalization is a domain concern, traversing the generated dataset is still infrastructure/application logic.

## Recommended TDD Sequence

### 1. Lock the pure rules at the domain boundary

Start by creating a dedicated domain test suite for:

* canonical lookup key normalization;
* ISO short date parsing;
* date decision policy;
* missing/invalid-date behavior.

Keep these tests completely free of Zod, generated JSON, and caching concerns.

### 2. Add property tests only for stable invariants

PBT is a good fit here, but keep it narrow and semantic.

Good properties:

* normalization is idempotent;
* equivalent path/URL representations normalize to the same key;
* normalized keys satisfy the canonical delimiter contract you expect.

Avoid property tests for date formatting through `Intl` unless the invariant is truly stable across environments.

### 3. Move pure implementations into Domain

Once the domain tests are green, move the pure implementations from `lesson-metadata.ts` into the new module.

Do this in small steps:

* normalization first;
* date parsing second;
* formatting/decision policy third.

That makes any regression easier to localize.

### 4. Shrink the utility suite to ownership-appropriate tests

After delegation is in place, move rule-heavy assertions out of `src/utils/__tests__/lesson-metadata.test.ts`.

Keep the utility suite focused on:

* dataset validation;
* cache behavior;
* lookup integration over `entries`;
* preservation of public behavior after delegation.

### 5. Re-run caller-facing tests

Run the metadata-related utility suite and any targeted caller suites affected by formatting or lookup behavior.

This should confirm that moving rule ownership did not alter render-facing behavior.

## Test Plan

### Domain tests

Cover:

* raw path normalization;
* repeated slash normalization;
* full URL normalization with origin stripping if supported by current behavior;
* blank input behavior;
* valid `YYYY-MM-DD` parsing;
* invalid format rejection;
* invalid calendar values producing the current non-valid result;
* missing date behavior;
* valid date formatting/decision outcome;
* invalid raw date passthrough, if that is still the desired contract.

### Property-based tests

Add narrow PBT for:

* normalization idempotence;
* equivalence of known-semantic URL/path variants;
* canonical shape invariants of normalized keys.

Be conservative with generators so the tests remain domain-valid and debuggable.

### Utility-layer tests

Keep or add tests for:

* valid and invalid dataset parsing through Zod;
* cache reuse and reset behavior;
* entry resolution across normalized path variants;
* one integration-style test proving public utility behavior remains unchanged after the refactor.

### Verification

Run, in order:

1. `pnpm vitest run src/domain/__tests__/lesson-metadata.test.ts`
2. `pnpm vitest run src/utils/__tests__/lesson-metadata.test.ts`
3. targeted caller tests, likely including `LessonMetaPanel` render coverage if date formatting or lookup output is surfaced there
4. `pnpm exec tsc --noEmit`

Run narrow tests first so failures stay local to the ownership seam being changed.

## Risks and Guardrails

There are two main risks in this cycle.

### 1. Domain accidentally depending on utility code

Guardrail: keep Domain dependency-light and avoid importing from `src/utils` unless the imported type is already genuinely domain-safe.

### 2. Mixing semantic policy with presentation wording

Guardrail: prefer semantic outcomes in Domain and apply labels at the outer layer unless preserving existing behavior requires otherwise.

These two guardrails will keep the refactor honest.

## Acceptance Criteria

Cycle 5 is complete when all of the following are true:

* pure metadata rules live in a domain module with no artifact-loading, Zod, or cache concerns;
* `src/utils/lesson-metadata.ts` is reduced to validation, cache, dataset access, and delegation;
* `resolveLessonMetadata(...)` preserves its current public behavior;
* rule-heavy tests have moved into a dedicated domain suite;
* utility tests focus on parsing, caching, and dataset lookup integration;
* targeted caller-facing tests remain green;
* no broader caller rewiring is required.
