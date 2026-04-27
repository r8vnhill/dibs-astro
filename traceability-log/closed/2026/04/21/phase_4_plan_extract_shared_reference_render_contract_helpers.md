# Phase 4 Plan: Extract Shared Reference Render-Contract Helpers

## Summary

Extract a small, test-only helper module for the reference render suites so the shared contract across `Thesis`, `ScholarlyArticle`, `WebPage`, and `Video` is expressed once and asserted consistently.

This phase is not about building a generic Astro testing framework. It is about consolidating a narrow set of bibliography-specific render-contract checks that are already duplicated across the reference family:

- per-render isolation;
- SSR DOM parsing;
- linked-title assertions;
- slot-over-prop precedence;
- omission and non-duplication checks.

The helper layer should remain local to the reference test area, sit on top of `src/test-utils/astro-render.ts` plus `cheerio`, and only encode behaviour that is demonstrably shared by at least two suites. Anything component-specific should stay local. That boundary is already implicit in the current plan; this phase should make it an explicit rule.

## Goals

- Reduce duplicated render-contract scaffolding across the four reference suites.
- Standardize the suites on structural SSR assertions instead of brittle string matching where DOM structure is the real contract.
- Preserve suite readability by giving shared assertions a stable vocabulary.
- Avoid over-extraction by keeping helpers narrowly behavioural and local to the reference-family tests.

## Non-Goals

- No production component changes.
- No shared global testing framework under `src/test-utils`.
- No extraction of rules that are unique to one component.
- No normalization of component-specific terminology such as `institution`, `publication`, `location`, or `platform` beyond generic helper inputs.

## Extraction Boundary

Create one test-only helper module:

- `src/components/ui/references/__tests__/reference-render-contracts.ts`

This module should only expose helpers for behaviours that are already shared across multiple suites. The current draft already points in this direction; the improvement here is to formalize the retention rule:

> A helper stays shared only if it is used by at least two reference suites and names an observable contract rather than an implementation detail. Otherwise, keep it local.

That rule prevents “helper optimism”, where a utility is extracted because it feels reusable before the duplication actually stabilizes.

## Helper Surface

Expose only the following minimal API:

- `renderReference(component, props, options?)`

  - creates a fresh Astro renderer per call;
  - renders once;
  - returns `{ html, $ }`.

- `expectLinkedTitle($, href, text?)`

  - asserts exactly one linked title exists for `href`;
  - optionally asserts trimmed visible text.

- `expectSlotOverridesProp($, slotSelector, slotText, fallbackText)`

  - asserts slot content is rendered;
  - asserts fallback text is absent from the rendered reference item.

- `expectInlineMetaLink($, href, text)`

  - asserts inline metadata renders as exactly one link.

- `expectInlineMetaPlainText($, text)`

  - asserts inline metadata renders as text and not as a link for that same visible text.

- `expectMetaLabelAbsent($, label)`

  - asserts muted labels such as `in` or `by` are absent when the corresponding field is absent.

- `expectDescriptionPresence($, expectedText)`

- `expectDescriptionAbsent($)`

These helpers match the original intent, but they should be treated as the maximum surface for this phase, not a starting point for future abstraction.

## Design Constraints

All shared helpers must follow these rules:

- Accept only observable inputs: DOM roots, literal text, URLs, and caller-provided selectors.
- Never depend on component internals, resolved field kinds, private helper functions, or fragile structure assumptions beyond the immediate render contract.
- Never own suite fixtures such as `BASE_PROPS`.
- Never encode component-specific wording or semantics that are not shared.

This keeps the helper layer contract-oriented rather than implementation-oriented, which is also consistent with the current draft’s “DOM-oriented and observable-output-oriented” direction.

## Suite Standardization Rules

Each touched suite should converge on the same local structure:

- local `Props` alias;
- local `BASE_PROPS`;
- local `renderX(...)` wrapper over `renderReference(...)`;
- structural DOM assertions by default;
- literal string assertions only when the literal output itself is the contract.

This is a worthwhile standardization target already identified in the original plan; the improvement is to make it a hard requirement for touched suites rather than a soft preference.

## Rollout Order

The migration should be incremental and evidence-driven.

### 1. Build the helper module

Implement `reference-render-contracts.ts` with the minimal surface above, but do not add speculative helpers.

### 2. Migrate two suites first

Start with the two suites that provide the clearest proof that the helpers are truly shared.

Recommended order:

- `Thesis`
- `ScholarlyArticle`

Why this order:

- both already exercise title, author-like metadata, and description-like behaviour;
- they provide a strong initial proof for shared vocabulary;
- `Thesis` also helps define the line between shared checks and institution-specific local checks.

### 3. Validate the extraction boundary

After migrating those two suites, stop and confirm that every shared helper is genuinely helping at least two suites.

Delete or inline any helper that does not survive that check.

### 4. Migrate `WebPage`

Use shared helpers only for the common contract. Keep location-specific behaviour local.

If `WebPage` does not already support meaningful description coverage, do not force parity merely to justify a helper. The current plan already hints at this; keep it explicit.

### 5. Migrate `Video`

Before adopting the shared render helper, remove any `beforeEach`-managed renderer state so the suite matches the per-call isolation model. Then move shared assertions over, while keeping date and platform specifics local.

## Suite-Specific Guidance

### Thesis

Use shared helpers for:

- linked title;
- author precedence;
- description presence or absence;
- generic omission and duplication checks.

Keep local:

- institution-specific link-versus-plain-text rules;
- institution contract failures;
- any thesis-only semantics.

### ScholarlyArticle

Convert the suite to structural DOM assertions.
Use shared helpers for:

- title contract;
- publication slot precedence;
- author precedence;
- description presence or absence;
- missing-title failure coverage.

Keep local:

- article-specific publication semantics not shared elsewhere.

### WebPage

Use shared helpers for:

- title contract;
- location slot precedence if structurally equivalent to other inline metadata;
- optional author omission if applicable;
- missing-title failure coverage.

Keep local:

- location-specific semantics;
- any behaviour that is not clearly shared by another suite.

### Video

First eliminate shared renderer lifecycle state.
Then use shared helpers for:

- title contract;
- platform slot precedence if structurally equivalent;
- author-like omission checks if applicable.

Keep local:

- date rendering;
- video-specific platform or publication semantics.

This preserves the selective adoption intent already present in the current plan, but makes the adoption rule more disciplined: use a helper only where the behaviour is truly the same, not merely similar.

## Scenarios That Must Be Covered

The phase is done only if the touched suites collectively and structurally verify:

- title prop renders as exactly one link to `url`;
- title slot overrides prop fallback without duplication;
- author-like slot overrides prop fallback without duplication;
- linked inline metadata renders as a link only when both visible text and URL are present;
- inline metadata renders as plain text when the URL is absent;
- metadata labels disappear when the corresponding field is absent;
- description appears only for meaningful content;
- missing or whitespace-only title sources throw `MissingReferenceTitleError`;
- invalid `*Url` without visible text still throws `ReferenceContractError` where that contract already exists.

These scenarios are already present in the source plan; what improves here is the distinction between suite-level coverage and helper-level capability. Not every suite has to cover every variant, but the touched set must prove the shared contract in at least two places before a helper is retained.

## Definition of Done

This phase is complete when all of the following are true:

- `reference-render-contracts.ts` exists and remains small.
- Every shared helper is used by at least two suites.
- `Thesis.render.test.ts`, `ScholarlyArticle.render.test.ts`, `WebPage.render.test.ts`, and `Video.render.test.ts` all use structural SSR assertions for shared render contracts.
- Component-specific behaviours remain local and readable.
- No touched suite depends on cross-test renderer state.
- No production files are changed.
- The touched render suites pass.
- The project’s broader Astro render-test command also passes.

## Verification Commands

Run, at minimum:

- `Thesis.render.test.ts`
- `ScholarlyArticle.render.test.ts`
- `WebPage.render.test.ts`
- `Video.render.test.ts`

Then run the project’s full Astro render-test command.

That sequence is already in the current plan; the only added expectation is that failures should be used to trim helpers, not to expand them.

## Risks and Mitigations

### Risk: helper creep

A small helper file grows into a framework.

Mitigation:

- keep the helper file local to reference tests;
- enforce the “used by at least two suites” rule;
- reject helpers that encode component-specific semantics.

### Risk: hiding test intent

Shared helpers can make assertions opaque.

Mitigation:

- keep helper names contract-level and concrete;
- keep suite-specific cases local;
- prefer thin helpers over compound “do everything” helpers.

### Risk: partial migration inconsistency

Some suites stay string-based while others become DOM-based.

Mitigation:

- treat touched suites as full conversions for their shared contract surface;
- allow literal assertions only where literal output is itself the contract.

### Risk: accidental coupling to DOM details

Selectors become too specific to current markup.

Mitigation:

- use caller-provided slot markers where needed;
- assert visible output and link behaviour rather than unnecessary structure.

## Assumptions

- `cheerio` is already available and remains the DOM assertion layer.
- `src/test-utils/astro-render.ts` remains the only generic rendering primitive.
- The appropriate extraction boundary is the reference test area, not the shared global test utilities layer.
- `WebPage` description coverage should only be generalized if the component already supports it meaningfully.
- Local assertions are preferable to shared ones whenever reuse is not already proven.

The main upgrade is that the plan now has a stricter extraction rule, a safer rollout sequence, and a clearer definition of done. Your original version had the right ingredients; this version turns them into a tighter migration strategy grounded in the same intended scope. Source:

## Outcome

Implemented in:

- `src/components/ui/references/__tests__/reference-render-contracts.ts`
- `src/components/ui/references/__tests__/Thesis.render.test.ts`
- `src/components/ui/references/__tests__/ScholarlyArticle.render.test.ts`
- `src/components/ui/references/__tests__/WebPage.render.test.ts`
- `src/components/ui/references/__tests__/Video.render.test.ts`

### What changed

- added a reference-local render-contract helper module on top of `createAstroRenderer(...)` and `cheerio`
- standardized the four reference-family render suites on per-call renderer isolation and structural SSR assertions
- extracted only the shared assertions that survived across multiple suites:
  - linked title
  - slot-over-prop precedence
  - inline metadata link/plain-text checks
  - metadata-label omission
  - description presence/absence
- kept component-specific contracts local:
  - thesis institution behavior
  - scholarly article page/publication behavior
  - webpage location behavior
  - video date behavior

### Documentation updates

- marked Phase 4 complete in `traceability-log/plan_refactor_reference_render_tests_around_shared_contracts.nd.md`
- recorded this implementation outcome in the Phase 4 traceability note

### Verification status

Run:

- `node ./node_modules/vitest/vitest.mjs run --config vitest.astro.config.ts src/components/ui/references/__tests__/Thesis.render.test.ts src/components/ui/references/__tests__/ScholarlyArticle.render.test.ts src/components/ui/references/__tests__/WebPage.render.test.ts src/components/ui/references/__tests__/Video.render.test.ts`
- `pnpm test:astro`
