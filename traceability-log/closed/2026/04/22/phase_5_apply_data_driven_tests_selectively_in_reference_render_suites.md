# Phase 5: Apply Data-Driven Tests Selectively in Reference Render Suites

Status: implemented on 2026-04-22

## Summary

Introduce `test.each(...)` only where a suite already expresses a genuine contract matrix with the same setup and assertion shape across multiple cases. Keep singular or domain-specific behaviors as explicitly named tests.

This phase is a readability and maintainability pass, not a behavior change. The goal is to remove low-value duplication in the reference render suites while preserving scan-ability, precise failure output, and suite-local intent.

## Objectives

- Reduce repeated render-contract scaffolding where several cases differ only by input row and expected outcome.
- Preserve explicit tests for behaviors that are easier to understand as standalone examples.
- Keep DDT local to each suite so the test file remains the primary source of truth for that component’s contract.
- Avoid introducing abstraction layers that make the tests harder to read than the duplication they replace.

## Non-Goals

- Do not redesign the shared render test helpers.
- Do not extract cross-suite DDT utilities or generic matrix builders.
- Do not collapse distinct component rules into one shared test shape merely for uniformity.
- Do not rewrite suites that are already concise and readable.

## Selection Rules for DDT

Use `test.each(...)` only when all of the following are true:

- there is a real matrix, not just two vaguely similar tests;
- each row follows the same arrange/act/assert structure;
- the expected behavior can be understood from the row name without extra suite-specific interpretation;
- converting to DDT makes the file easier to scan, not denser or more cryptic.

Prefer standalone tests when any of the following apply:

- the case needs extra assertions beyond the common pattern;
- the case carries important domain meaning that deserves a named example;
- the case depends on a component-specific nuance;
- the table would need many optional columns, conditionals, or per-row branching.

### Default threshold

Use DDT when there are:

- at least 3 rows with the same setup and assertion shape; or
- 2 rows only when the duplication is obvious, the row names are strong, and the table is clearly shorter than separate tests.

## Refactoring Strategy

### 1. Convert repeated “missing required title” matrices

Create small suite-local tables for invalid title-source combinations only where the contract is identical.

Good candidates include:

- empty string title prop;
- whitespace-only title prop;
- missing title prop combined with empty or non-meaningful title slot variants.

Guidelines:

- keep the thrown error assertion in the suite unless an existing helper already makes it cleaner;
- prefer row objects with named fields over tuples;
- keep row names explicit enough that a failing case identifies the broken source combination immediately.

### 2. Convert slot-over-prop precedence only where the assertion is uniform

Parameterize precedence tests only when each row expresses the same rule:

> when both prop and slot are present, meaningful slot content wins.

Apply this selectively:

- `Thesis`: table `title` and `author`; keep `institution` standalone because it also carries the “not auto-wrapped as link” nuance.
- `ScholarlyArticle`: table `title`, `publication`, and `author`.
- `Video`: table `title`, `platform`, and `author`.
- `WebPage`: only table precedence cases if the final matrix remains immediately readable.

Guidelines:

- assert both positive and negative sides of precedence where useful:

  - slot content is rendered;
  - prop fallback is not rendered.
- do not force a shared cross-component precedence helper.

### 3. Convert omission checks only when the table stays simple

Use DDT for optional metadata omission only when each row differs by:

- omitted input field(s); and
- expected label or fragment that should be absent.

Good candidates:

- `Thesis`: omission of optional `author` and `institution` if both rows share the same assertion pattern.
- `WebPage`: omission of optional labelled metadata if the expected absence is easy to express per row.
- `Video`: omission of optional labelled metadata with straightforward absent-label assertions.

Keep standalone tests for:

- description rendering, unless a tiny two-row local table is clearly cleaner;
- cases where omission interacts with another rule, such as linked metadata or fallback behavior.

### 4. Preserve explicit tests for component-specific rules

Do not parameterize the cases that define the suite’s distinctive contract.

Keep these as standalone tests:

- linked title contract;
- invalid linked-metadata contract errors;
- `Thesis` institution rendering nuances;
- `Video` date rendering;
- `Video` `platformUrl` contract;
- `WebPage` title-link contract;
- any case where structural assertions go beyond the common matrix.

## Suite-by-Suite Plan

### `Thesis.render.test.ts`

Convert:

- invalid title-source combinations that should throw `MissingReferenceTitleError`;
- slot-over-prop precedence for `title` and `author`, if both rows share the same render/assert pattern;
- optional omission for `author` and `institution` only if the table remains very small and obvious.

Keep explicit:

- institution rendering variants;
- institution slot non-wrapping behavior;
- linked title contract;
- any linked institution contract errors.

### `ScholarlyArticle.render.test.ts`

Keep:

- existing `pages` DDT as-is unless it becomes inconsistent with the new suite structure.

Convert:

- slot-over-prop precedence for `title`, `publication`, and `author`;
- empty-slot fallback cases only if the rows truly share one assertion pattern.

Keep explicit:

- any cases where publication or pages behavior has special semantics beyond simple precedence.

### `WebPage.render.test.ts`

Convert:

- missing-title variants with a shared error contract;
- optional location omission or label assertions only if the resulting rows remain obvious.

Keep explicit:

- title-link behavior;
- any location case that requires extra semantic explanation;
- any linked metadata validation that is more than simple absence.

### `Video.render.test.ts`

Convert:

- slot-over-prop precedence for `title`, `platform`, and `author`;
- omission cases for optional labelled metadata where the expected absence is uniform.

Keep explicit:

- date rendering;
- `platformUrl` link contract;
- any platform-specific rendering nuance that is easier to understand as a named example.

## Test Design Conventions

- Prefer inline row objects over positional tuples once a case has more than 2 or 3 parameters.
- Put DDT blocks close to the behavior they specify; do not collect all tables at the top of the file.
- Use descriptive row names, for example:

  - `"throws when title prop is whitespace-only and title slot is absent"`
  - `"prefers author slot over author prop"`
  - `"omits institution label when institution is missing"`
- Keep per-row data minimal; compute derived values inside the test when that improves readability.
- Avoid row fields that toggle many branches inside the test body.

## Acceptance Criteria

- Every new `test.each(...)` corresponds to a genuine contract matrix.
- Table row names make failures attributable without opening the row definition.
- No component-specific rule is hidden inside a generalized table with conditional assertions.
- The resulting suites are at least as easy to scan as the current versions.
- Coverage remains explicit for:

  - linked title contract;
  - slot-over-prop precedence;
  - optional metadata omission;
  - invalid linked-meta contract errors;
  - missing required title errors.

## Verification

Run verification in two stages:

1. run only the touched render suites to validate the local refactor quickly;
2. run the full Astro render-test command to catch broader regressions.

During review, check not only for pass/fail, but also for:

- clarity of row names in failure output;
- reduction of duplicate setup noise;
- absence of table-specific branching that makes the test body harder to follow than before.

## Exit Criteria

This phase is complete when:

- duplicated matrix-style tests have been converted where appropriate;
- singular behavioral examples remain explicit;
- no new helper abstraction exists solely to enable DDT;
- the refactored suites read as render contracts first, parameterization second.

## Implementation Notes

The phase was implemented in the reference render suites under `src/components/ui/references/__tests__`.

Applied DDT selectively in the following places:

- `Thesis.render.test.ts`
  - grouped optional omission checks for missing `institution` and `author`;
  - grouped title/author slot-precedence checks;
  - grouped missing-title failure matrices.
- `ScholarlyArticle.render.test.ts`
  - grouped title/publication/author slot-precedence checks;
  - preserved the existing `pages` table unchanged.
- `WebPage.render.test.ts`
  - grouped missing-title variants under a single required-title matrix;
  - left location-specific behavior explicit.
- `Video.render.test.ts`
  - grouped title/platform/author slot-precedence checks;
  - grouped optional label-omission checks for `author` and `platform`.

Kept explicit, non-table tests for:

- linked metadata validation errors;
- `Thesis` institution linking and non-wrapping nuances;
- `Video` date rendering and `platformUrl` validation;
- description rendering examples where a standalone test remains easier to scan.

## Verification

Implemented to be verified with:

1. `pnpm test:astro -- src/components/ui/references/__tests__/Thesis.render.test.ts src/components/ui/references/__tests__/ScholarlyArticle.render.test.ts src/components/ui/references/__tests__/WebPage.render.test.ts src/components/ui/references/__tests__/Video.render.test.ts`
2. `pnpm test:astro`
