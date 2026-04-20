# Unblock Phase 2 Closure Verification

## Summary

Phase 2 is not blocked by unfinished domain-isolation work. It is blocked by repository-level verification failures, specifically instability at the Shiki and dev-retry seam during `pnpm test:unit`, plus an incomplete `pnpm run check` result caused by execution timeout rather than a confirmed repository defect.

This work should stay narrowly focused on restoring a reliable closure gate. The goal is to stabilize the Shiki highlighter path under test, re-establish the intended retry and warning contract, and then rerun the full Phase 2 verification block. Traceability closure should resume only after all required verification commands pass.

## Objectives

* Remove the test instability affecting shared highlighter creation under Vitest.
* Restore or explicitly rebaseline the retry-warning contract exercised by the Shiki tests.
* Add focused characterization around the failing seam so the fix is locked in.
* Rerun the full Phase 2 closure gate in a way that distinguishes real failures from agent timeout.
* Resume traceability-note closure only after the repository is green.

## Non-Goals

This work should not:

* reopen or expand the Phase 2 architecture refactor;
* redesign the Shiki integration or introduce a new highlighting API;
* broaden the retry framework unless the root cause is clearly inside the generic helper;
* close or archive the Phase 2 tracker before the full verification block succeeds.

## Key Changes

### 1. Stabilize shared highlighter creation under test

Inspect the seam between `src/lib/shiki/cache.ts` and `src/utils/dev-transport-retry` and make shared highlighter bootstrap deterministic under Vitest.

The main requirement is that the “bundled language aliases” path and other shared-highlighter tests should not depend on an ambient transport-retry path or timeout-sensitive bootstrap behaviour unless a test explicitly opts into that behaviour.

Preserve the production role of `getHighlighter()` and the process-level cache. This should be a narrow correction to test-time behaviour, retry policy, or bootstrap composition, not a redesign of the Shiki subsystem.

Prefer the smallest fix that matches the code as it exists:

* disable dev-retry wrapping for shared highlighter creation under Vitest unless explicitly enabled;
* or inject a test-friendly retry configuration through the cache/bootstrap path;
* or isolate bootstrap failures so a retryable timeout during global highlighter creation cannot corrupt the happy-path shared-highlighter tests.

The chosen fix should make the default unit-test path deterministic without weakening the intended production behaviour.

### 2. Restore the retry and warning contract in `highlighter.test.ts`

Fix the behaviour exercised when `highlightToHtml(..., "bash", ...)` runs with `DIBS_DEV_RETRY_ENABLED=true` and the first `loadLanguage` attempt fails with a retryable timeout.

The implementation and tests should be made decision-complete. There are only two acceptable end states:

* retry warnings are part of the intended observable diagnostic contract, in which case the implementation should emit exactly one visible retry warning and recover successfully; or
* retry warnings are intentionally internal-only, in which case tests and any relevant docs should be updated to assert the real public contract instead.

The default should be to preserve the current test intent unless there is strong evidence the contract has deliberately changed: a transient retryable language-load failure in development should emit one `[dev-retry]` warning and still return highlighted output successfully.

### 3. Add characterization around the failing seam

Add or tighten focused tests around the exact integration point so the chosen fix is protected against regression.

The test scope should stay narrow and local to the seam. Prioritize cases for:

* shared highlighter creation with retry effectively disabled in test mode;
* shared highlighter creation with retry explicitly enabled;
* `highlightToHtml` recovering after one retryable `loadLanguage` timeout;
* warning emission count and warning prefix during successful retry recovery.

Keep these tests close to the existing Shiki seam:

* `src/lib/shiki/__tests__/highlighter.test.ts`
* `src/lib/shiki/__tests__/createShikiHighlighter.patch.test.ts`, only if that file is the natural place for the selected fix
* retry-helper tests only if evidence shows that `runWithDevTransportRetry` itself is incorrect rather than merely misapplied by the Shiki integration layer

Do not turn this into a general retry-framework cleanup unless the bug genuinely cannot be fixed at the Shiki boundary.

### 4. Re-run the Phase 2 closure gate in the correct order

Once the Shiki blocker is fixed, rerun the full closure verification block:

* `pnpm test:unit`
* `pnpm test:astro`
* `pnpm exec tsc --noEmit`
* `pnpm run check`

For `pnpm run check`, use a sufficiently large timeout budget during the closure attempt so an agent timeout is not misclassified as a repository failure.

Only after all four commands succeed should the closure workflow continue:

* add `## Phase 2 closeout`;
* move the Phase 2 tracker into `traceability-log/closed/YYYY/MM/DD/`;
* remove the stale open duplicate of the closed Cycle 8 tracker.

## Decision Rules

* If the root cause is in Shiki integration, fix it there.
* If the root cause is in retry configuration or composition, correct that seam without widening public API.
* If the root cause is in `runWithDevTransportRetry()` itself, fix the helper and add helper-level characterization.
* If `pnpm run check` fails due to agent timeout alone, retry with a larger timeout before treating it as a repository regression.
* If any verification command still fails after the fix, Phase 2 remains open and the correct next step is a narrow follow-up plan for that failure.

## Boundary Contracts to Preserve

* `highlightToHtml()` should continue to:

  * return highlighted HTML when language loading succeeds;
  * fall back to plain HTML for unknown or unavailable languages;
  * recover from transient retryable language-load failures in development when retry is enabled.
* `getHighlighter()` should remain the shared process-level entrypoint for cached highlighter access.
* `runWithDevTransportRetry()` should keep its general contract unless the investigation shows that the helper itself currently violates it.

## Test Plan

### Targeted blocker coverage

Prioritize:

* `src/lib/shiki/__tests__/highlighter.test.ts`
* any focused cache/bootstrap characterization needed for the selected fix
* helper-level retry tests only if the helper proves to be the defect source

### Full regression confirmation

Run:

* `pnpm test:unit`
* `pnpm test:astro`
* `pnpm exec tsc --noEmit`
* `pnpm run check`

### Closure validation after green verification

Confirm:

* the Phase 2 note includes a final closeout section;
* the Phase 2 note exists only under `traceability-log/closed/...`;
* the root `traceability-log/` directory no longer contains the open Phase 2 tracker;
* the stale open duplicate for already-closed Cycle 8 work has been removed or archived consistently.

## Completion Criteria

This work is complete only when all of the following are true:

* the Shiki and retry seam is stable under unit test;
* the intended retry-warning contract is either restored or explicitly rebaselined consistently across implementation, tests, and docs;
* the full Phase 2 verification block passes;
* Phase 2 closure can resume without qualification.

## Recommended Execution Order

1. Reproduce and isolate the failing Shiki and retry path.
2. Apply the smallest local fix that restores deterministic behaviour.
3. Add focused characterization around the repaired seam.
4. Rerun `pnpm test:unit`.
5. Rerun the remaining closure commands with an adequate timeout budget for `pnpm run check`.
6. Resume Phase 2 traceability closure only after all four commands pass.

## Outcome

This unblocker was completed by fixing the Shiki and dev-retry seam locally rather than reopening
Phase 2 architecture work.

Completed changes:

* `src/lib/shiki/cache.ts`
  * shared highlighter bootstrap now stays deterministic under Vitest by default
  * retry wrapping for shared bootstrap is still available when explicitly enabled through
    `DIBS_DEV_RETRY_ENABLED=true`

* `src/lib/shiki/highlighter.ts`
  * retry-scheduled events during language loading are now surfaced as a single `[dev-retry]`
    warning through the existing retry-event seam

* `src/lib/shiki/__tests__/highlighter.test.ts`
  * now locks the Vitest-default bootstrap behavior
  * now preserves the retry-recovery warning contract for transient language-load timeouts

Verification status after the fix:

* `pnpm test:unit` ✅
* `pnpm test:astro` ✅
* `pnpm exec tsc --noEmit` ✅
* `pnpm run check` ✅

Phase 2 closure is no longer blocked by repository verification. The next step is to resume
`close_phase_2_traceability_note.md`.
