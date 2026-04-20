# Close Out `refactor_reference_content.ts_with_small_verifiable_tdd_steps.md`

## Summary

The parent refactor tracked in `refactor_reference_content.ts_with_small_verifiable_tdd_steps.md` is implementation-complete through Phase 5, but it should not be considered closed until its own caller-facing validation plan has been fully executed and the tracker has been formally archived.

This final step should stay deliberately narrow:

* run the remaining render-contract suites named by the tracker;
* confirm Phase 5 introduced no caller-visible regressions;
* update the tracker so it reads as explicitly closed rather than merely exhausted;
* archive the tracker in the dated `closed` path used by related traceability artifacts.

This is a closure and traceability pass, not a new implementation phase.

## Scope

This close-out covers only:

* validation of the refactor through the explicitly named reference-related suites;
* final editorial updates to the parent tracker;
* archival of that tracker into the dated `closed` directory.

## Non-goals

This step should **not**:

* reopen any completed phase;
* introduce new production changes;
* add new tests unless one of the named suites exposes a real regression;
* require a fully green repository-wide `pnpm test:unit`;
* move or rewrite the already-archived Phase 4 or Phase 5 plan files;
* split the parent tracker into additional documents.

## Remaining Work

### 1. Finish the tracker’s caller-facing validation plan

Run the three render-contract suites that remain after the already-passed `reference-content.test.ts` target:

* `src/components/ui/references/__tests__/ScholarlyArticle.render.test.ts`
* `src/components/ui/references/__tests__/Thesis.render.test.ts`
* `src/components/ui/references/__tests__/GenericReference.render.test.ts`

Execution rules:

* run these as targeted suites, not through the full repository unit-test command;
* treat failure in any of the refactor-related suites as a blocker to closure;
* do not treat unrelated failures outside these suites as blockers unless they are shown to be caused by this refactor.

What this validation is meant to confirm:

* slot override behavior remains stable for callers;
* rendered metadata precedence is unchanged;
* omission behavior for absent or non-meaningful fields is unchanged;
* Phase 5’s concurrency and typing changes did not alter render contracts.

### 2. Reconfirm the runtime core suite only if needed

`reference-content.test.ts` does not need to be rerun by default if it already passed on the current branch state.

Rerun it only if:

* there were follow-up code edits after its last green run; or
* the branch changed in a way that could affect this area before closure.

This keeps the close-out focused while still allowing a quick reconfirmation when warranted.

### 3. Update the parent tracker to read as formally closed

Edit `traceability-log/refactor_reference_content.ts_with_small_verifiable_tdd_steps.md` so it becomes a final historical record rather than an in-progress checklist.

Required edits:

* add an explicit closure note near the top;
* state that Phases 1–5 are complete;
* record that validation was completed using `reference-content.test.ts` and the three caller-facing render suites;
* note, only if relevant, that unrelated Shiki failures from broader repository runs were outside the scope of this refactor and did not block closure.

Editorial guidance:

* do not add new phases;
* do not leave the file in an implicitly “open” state;
* prefer a short closure summary over more checklist detail.

### 4. Archive the closed tracker using the existing convention

After validation is complete and the tracker text has been updated, move:

`traceability-log/refactor_reference_content.ts_with_small_verifiable_tdd_steps.md`

to:

`traceability-log/closed/2026/04/19/`

Archive rules:

* preserve the filename unless a collision already exists;
* if a collision exists, use the smallest possible disambiguation;
* archive only after the tracker has been updated to its final closed form;
* leave the phase-specific plan files where they already are.

## Recommended Execution Order

1. Run the three remaining render-contract suites.
2. Rerun `reference-content.test.ts` only if reconfirmation is justified by later branch changes.
3. If all refactor-related suites are green, update the parent tracker with an explicit closure note.
4. Move the tracker into `traceability-log/closed/2026/04/19/`.

This order keeps validation ahead of archival so the archived artifact reflects the final verified state.

## Failure Handling

If any of the named refactor-related suites fail:

* do not archive the tracker;
* do not mark the tracker closed;
* treat the failure as evidence that the refactor has not yet satisfied its own exit conditions.

If unrelated repository tests fail outside the targeted suites:

* do not block closure on that basis alone;
* mention them only if they are relevant to explaining why targeted validation was used instead of a repository-wide run.

## Acceptance Criteria

This close-out is complete only when all of the following are true:

* `reference-content.test.ts` is green on the relevant branch state, or has a previously valid green run with no subsequent relevant code changes;
* `ScholarlyArticle.render.test.ts` is green;
* `Thesis.render.test.ts` is green;
* `GenericReference.render.test.ts` is green;
* no caller-facing regression is observed in render output, precedence, or omission behavior;
* the parent tracker explicitly states that the refactor is closed;
* the parent tracker has been moved into `traceability-log/closed/2026/04/19/`.

## Assumptions

* The tracker’s own validation plan defines closure, not a globally green `pnpm test:unit`.
* The correct archive date is `2026/04/19`, matching the related closure artifacts already created for this refactor.
* If the targeted caller-facing suites pass, no additional implementation work should be required before closure.
