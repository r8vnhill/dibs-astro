# Cycle 7: Retire or Narrow Legacy Helper Surfaces

## Summary

This cycle removes or shrinks the remaining transitional pure-helper modules now that the domain, adapter, and presentation boundaries are in place.

The main goal is to eliminate duplicated business rules from legacy helper surfaces, migrate callers to the final boundaries, and leave behind only the thin compatibility layers that still have a justified responsibility such as Astro slot I/O, dataset loading, schema validation, caching, or a temporary public import surface.

This is primarily a **boundary cleanup** cycle, not a feature cycle. The desired end state is that business rules live in one place only, and legacy modules either disappear or become clearly scoped adapters.

## Goals

* Remove duplicated business logic from legacy helper modules.
* Move callers to domain-first, adapter-first, or presentation-first entrypoints as appropriate.
* Preserve behavior through regression coverage before shrinking public surfaces.
* Make surviving legacy files honest about their role: adapter, infrastructure support, or temporary compatibility wrapper.
* Reduce ambiguity in `~/utils` so it stops acting as a second home for domain logic.

## Non-Goals

* No large-scale redesign of the domain model.
* No introduction of new production abstractions unless needed to remove duplication or clarify a final boundary.
* No deletion of helper modules purely for aesthetic reasons if they still own real I/O, framework integration, or compatibility responsibilities.
* No duplication of lower-level domain tests in UI or infrastructure suites.

## Primary Targets

This cycle focuses on these legacy surfaces:

* `src/components/ui/references/reference-content.ts`
* `src/utils/navigation.ts`
* `src/utils/index.ts`
* `src/utils/lesson-metadata.ts`

## Desired End State

By the end of the cycle:

* `reference-content.ts` is a true UI adapter, not a second implementation of reference-content business rules.
* `navigation.ts` is either a thin presentation compatibility layer or fully retired.
* `utils/index.ts` stops re-exporting helpers that no longer belong to a shared utility boundary.
* `lesson-metadata.ts` is explicitly infrastructure-facing and limited to dataset access, validation, parsing, and caching.
* Domain rules are imported from the domain layer directly rather than via legacy utilities.

---

## Phase 1: Lock current public behavior with regression tests

Before shrinking any module, add or confirm regression coverage for the user-visible and boundary-level behaviors currently protected by the legacy surfaces.

### Protect these behaviors

* reference slot classification
* required-title failure mapping
* notes navigation normalization
* notes auto-navigation behavior
* lesson metadata adapter lookup behavior
* lesson metadata date-formatting behavior where still intentionally exposed

### Why this phase matters

This cycle changes import boundaries and helper responsibilities. Regression coverage must be in place first so the cleanup can proceed safely and deletions can be made with confidence.

### Exit criteria

* every behavior that will be preserved during migration is covered at the correct boundary
* no cleanup work depends on “implicit” or accidental coverage from unrelated suites

---

## Phase 2: Shrink `reference-content.ts` into a UI adapter only

Refactor `src/components/ui/references/reference-content.ts` so it owns only Astro/UI concerns and stops duplicating domain resolution logic.

### Keep in the UI layer

Keep only members whose responsibility is genuinely UI- or Astro-specific, such as:

* `SlotLike`
* `resolveOptionalSlot`
* `resolveOptionalSlots`
* `prepareSlotsForReferences`
* `SPANISH_REFERENCE_META_LABELS`
* component-local error mapping such as `MissingReferenceTitleError`, if the UI still needs a UI-facing error surface

### Remove or stop re-exporting from the UI layer

Any pure business-rule helpers that are now owned by the domain should be removed from this module or no longer treated as public UI helpers. Current candidates include:

* `hasMeaningfulTextContent`
* `resolveInlineField`
* `resolveLinkedInlineField`
* `resolveRequiredTitleField`

### Caller migration

Migrate reference components so the boundary is explicit:

* Astro slot reading, async slot rendering, and slot batching stay in the UI adapter
* pure precedence and content resolution come from `src/domain`
* component-specific exception translation stays local to the UI layer if still needed

### Exit criteria

* `reference-content.ts` no longer acts as a second home for domain resolution rules
* all remaining exports are justifiable as UI adapter behavior
* reference-component callers use domain APIs directly for business rules

---

## Phase 3: Retire or narrow `navigation.ts`

Refactor `src/utils/navigation.ts` so it is no longer a mixed boundary. The preferred outcome is either:

* a thin presentation-only compatibility layer for `NotesLayout`, or
* full retirement if `NotesLayout` can depend directly on its final presentation bridge or adapter

### Default direction

For this cycle, prefer the conservative option: keep `navigation.ts` only if it remains a thin presentation compatibility layer.

### Required cleanup

* remove embedded business-rule duplication
* move `resolveAutoNav` off the `~/utils` barrel
* update consumers so presentation-facing code depends on a presentation boundary, not a generic utils surface

### Exit criteria

* `navigation.ts` is either gone or clearly presentation-scoped
* `~/utils` is no longer the default import path for navigation behavior that belongs elsewhere
* `resolveAutoNav` is no longer exported from the shared utility barrel

---

## Phase 4: Narrow `utils/index.ts`

Refactor `src/utils/index.ts` so it stops advertising helpers that no longer belong to a shared utility boundary.

### Default export cleanup

* stop re-exporting `resolveAutoNav`
* keep `normalizeNavigation` and `normalizePreviousNavigation` only if `NotesLayout` still genuinely depends on them after the navigation cleanup
* remove stale compatibility exports whose only purpose was to preserve a transitional import path now superseded by a real boundary

### Exit criteria

* the `~/utils` barrel exposes only helpers that still belong there
* callers no longer reach business rules through transitional exports

---

## Phase 5: Reframe `lesson-metadata.ts` as infrastructure support

Keep `src/utils/lesson-metadata.ts` only as an infrastructure-facing module behind `LessonMetadataAdapter`, and narrow it to responsibilities that still belong there.

### It should own

* dataset schema validation
* JSON loading
* cache lifecycle
* dataset parsing

### It should not own

* duplicated pure domain rules except for thin forwarding wrappers still required temporarily by existing callers

### Caller migration

Migrate infrastructure callers, including `LessonMetadataAdapter`, so they prefer domain types at the boundary and use `utils/lesson-metadata.ts` only for dataset access and validation.

If no non-adapter callers remain, make that explicit in the module role and treat the file as internal infrastructure support rather than a shared utility API.

### Exit criteria

* `lesson-metadata.ts` has a narrow infrastructure role
* domain rules are not duplicated there
* adapters depend on it for I/O and validation, not for business logic

---

## Test Strategy

## References

* Keep `src/domain/__tests__/reference-content.test.ts` as the source of truth for:

  * meaningful-content detection
  * precedence
  * linked fallback behavior
  * invalid-title semantics
* Keep `src/components/ui/references/__tests__/reference-content.test.ts` only for:

  * slot I/O
  * async slot resolution
  * batching
  * `prepareSlotsForReferences`
  * UI-layer error mapping that still exists after cleanup
* Run representative reference render suites to catch regressions at the component boundary

## Navigation

* Preserve normalization behavior used by `NotesLayout`
* Preserve auto-navigation behavior through:

  * `presentation/adapters/navigation-bridge.test.ts`
  * `NotesLayout.render.test.ts`
* Delete or relocate `src/utils/__tests__/navigation.test.ts` only after equivalent coverage exists at the final boundary

## Metadata

* Preserve `LessonMetadataAdapter.test.ts`
* Preserve dataset parsing and cache tests if `utils/lesson-metadata.ts` remains the owner of JSON validation and loading
* Remove duplicated date/path normalization tests from the utils layer once those rules are covered at the domain boundary

## Final verification

Run:

```text
pnpm test:unit
pnpm test:astro
pnpm exec tsc --noEmit
```

---

## Implementation Notes

### References cleanup

* audit all imports from `src/components/ui/references/reference-content.ts`
* classify each import as:

  * UI adapter concern
  * domain concern
  * compatibility-only concern
* migrate consumers to their final boundary before deleting helpers
* remove UI-layer tests that merely duplicate domain coverage

### Navigation cleanup

* replace remaining imports that go through `~/utils` when a presentation helper or adapter now exists
* keep a dedicated navigation compatibility layer only if a direct migration would create churn without adding clarity

### Metadata cleanup

* preserve adapter-level regression behavior first
* then remove or de-emphasize pure helper tests from the utils layer where domain tests already own the rule set

### Documentation updates

Update the cycle traceability note so it records:

* which legacy modules were removed
* which survived as compatibility wrappers
* which remain intentionally because they still own I/O or framework integration

Update module-level docs on surviving wrappers so they describe the actual role of the file, such as:

* UI adapter
* presentation compatibility layer
* infrastructure support

and not “shared utilities” or “domain helpers” unless that is still genuinely true.

---

## Risks and controls

### Risk: deleting a module before its callers are migrated

This could create noisy churn and make the boundary cleanup harder to review.

**Control:** migrate callers first, then shrink or delete the old helper.

### Risk: test duplication survives the cleanup

Legacy tests may continue asserting rules that now belong to the domain boundary.

**Control:** after migration, keep each test only at the boundary that truly owns the behavior.

### Risk: `~/utils` remains a grab bag

Even after moving logic, stale re-exports could preserve the old architecture informally.

**Control:** clean the barrel deliberately, not incidentally.

### Risk: over-eager deletion of compatibility wrappers

Some wrappers may still be justified by I/O, framework, or transitional API constraints.

**Control:** allow wrappers to remain when they still have a real responsibility, but relabel and narrow them.

---

## Completion criteria

This cycle is complete when all of the following are true:

* `reference-content.ts` is reduced to UI adapter responsibilities
* domain resolution rules are no longer duplicated in the references UI layer
* `navigation.ts` is either retired or explicitly presentation-scoped
* `utils/index.ts` no longer re-exports stale transitional helpers
* `lesson-metadata.ts` is narrowed to infrastructure support
* callers have been migrated to final boundaries
* duplicated business-rule tests have been removed or relocated
* unit tests, Astro tests, and type-checking all pass

---

## Outcome

Implemented with the following end state:

* `src/components/ui/references/reference-content.ts` now acts as a UI adapter:
  * it keeps Astro slot I/O, slot batching, typed slot preparation, and title-error mapping
  * it no longer re-exports pure domain helpers such as inline-field resolution or meaningful-text classification
* reference components (`GenericReference`, `WebPage`, `Thesis`, `ScholarlyArticle`, `Video`) now import pure resolution rules directly from `src/domain`
* `src/utils/navigation.ts` is narrowed to navigation-link normalization only
* `resolveAutoNav` is no longer exported from `src/utils/navigation.ts` or from `src/utils/index.ts`
* `NotesLayout` and its render test now import navigation normalization from `~/utils/navigation` instead of the shared utils barrel
* `src/utils/index.ts` no longer advertises lesson-navigation or lesson-metadata helpers as part of the shared utility barrel
* `src/utils/lesson-metadata.ts` remains in place as infrastructure support for dataset loading, validation, caching, and lookup

## Documentation updates

Updated:

* `src/utils/navigation.ts` module docs to describe it as a presentation-facing normalization helper only
* `src/utils/index.ts` barrel docs to reflect the reduced shared utility surface
* this cycle note and the Phase 2 traceability note to record the narrowed boundaries and surviving wrappers

## Verification

Ran:

* `node ./node_modules/vitest/vitest.mjs run src/utils/__tests__/navigation.test.ts src/utils/__tests__/lesson-metadata.test.ts src/infrastructure/adapters/__tests__/LessonMetadataAdapter.test.ts`
* `node ./node_modules/vitest/vitest.mjs run src/components/ui/references/__tests__/reference-content.test.ts`
* `node ./node_modules/vitest/vitest.mjs run --config vitest.astro.config.ts src/components/ui/references/__tests__/Thesis.render.test.ts src/layouts/__tests__/NotesLayout.render.test.ts`
* `pnpm exec tsc --noEmit`

Result: passing.
