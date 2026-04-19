# Phase 4 Plan: Refactor Batched Reference Preparation into a Schema-Driven Flow

## Summary

Refactor `prepareSlotsForReferences(...)` in [`reference-content.ts`](/e:/teaching/DIBS/projects/astro-website/src/components/ui/references/reference-content.ts:366) so batched reference preparation is driven by a single schema constant instead of four hardcoded slot branches.

This phase should stay deliberately narrow. Its goal is to remove structural duplication and make the supported batched fields explicit in one place, without changing observable behavior. The refactor must preserve:

* the same supported override fields;
* the same slot naming convention;
* the same omission rules for non-meaningful values;
* the same `{}` output for ids with no meaningful overrides;
* the same logical treatment of duplicate ids.

Phase 4 is not the place to change concurrency, broaden supported fields, or redesign result typing.

## Goals

* Establish one local source of truth for batched reference fields.
* Replace repetitive per-field branching with a schema-driven loop.
* Preserve current output shape and caller-visible behavior.
* Make the implementation easier to extend safely in later phases.

## Non-Goals

* No addition of new override fields.
* No support for `author` in batching.
* No `Promise.all(...)` or other parallelization changes.
* No changes to HTML semantics or slot-resolution rules.
* No literal-id-preserving generic refinements yet.

## Implementation Changes

### 1. Introduce a schema constant for supported batched fields

Add one local constant that defines the supported batched override keys:

```ts
const REFERENCE_SLOT_KEYS = [
  "title",
  "description",
  "publication",
  "institution",
] as const
```

Use that constant as the single source of truth for batching.

Requirements:

* derive the key type from `REFERENCE_SLOT_KEYS`;
* keep `PreparedReferenceSlots` aligned with that key set;
* do not widen the key set in this phase;
* treat any stale `author` mention in comments as documentation drift, not as a feature requirement.

The intent is that future supported-field changes happen in one place instead of in multiple code branches.

### 2. Deduplicate ids before slot resolution

Normalize the batching flow so duplicate `referencedIds` are collapsed before slot lookups begin.

Requirements:

* deduplicate ids by first occurrence;
* preserve first-seen order;
* perform slot resolution once per logical reference id;
* emit exactly one output record per unique id.

This deduplication step should be explicit in the implementation rather than an incidental side effect of object assignment.

### 3. Replace manual field branches with a schema-driven loop

Remove the hardcoded `title` / `description` / `publication` / `institution` block and iterate over the schema instead.

For each unique id:

* create an initially empty `PreparedReferenceSlots` object;
* for each key in `REFERENCE_SLOT_KEYS`, synthesize the slot name as `${key}-${id}`;
* resolve that slot through the existing `resolveOptionalSlot(...)`;
* include the field only when the resolved value is meaningful under current rules;
* after processing all keys, write the id entry to the result object even if the prepared slot object is still `{}`.

Constraints:

* keep the current slot-name convention unchanged;
* keep existing meaning/non-meaning filtering unchanged;
* keep the output keyed by id;
* do not introduce field-specific special cases unless one already exists in current behavior and must be preserved.

### 4. Keep the implementation intentionally serial

Phase 4 should favour clarity over pre-emptive concurrency work.

Requirements:

* a straightforward `for ... of` loop over unique ids and schema keys is acceptable;
* do not introduce `Promise.all(...)` yet;
* do not restructure the function around parallel execution for future phases unless the code becomes materially worse without it.

If a helper improves readability, keep it very small and local, for example:

* a helper that turns a resolved slot value into an optional `[key, value]` pair;
* or a helper that prepares one field for one id.

Do not split the function into multiple abstractions unless they clearly improve readability.

### 5. Update nearby docs and comments

Align comments with the actual supported batching contract.

Requirements:

* remove or correct stale mentions of `author` if those comments are touched;
* describe batching in terms of the four supported override fields only;
* ensure comments describe the schema-driven implementation rather than the old manual branch structure.

## Suggested Implementation Shape

A good target shape for the function is:

1. return `{}` immediately for an empty input id list;
2. compute `uniqueReferencedIds` in first-seen order;
3. create an empty result record;
4. for each unique id:

   * create an empty prepared slot object;
   * iterate through `REFERENCE_SLOT_KEYS`;
   * resolve and conditionally assign meaningful values;
   * store the prepared object under that id, even if empty;
5. return the accumulated record.

That keeps the control flow obvious and makes the invariants easy to test.

## Test Plan

### Unit tests for `prepareSlotsForReferences(...)`

Extend the existing block in [`reference-content.test.ts`](/e:/teaching/DIBS/projects/astro-website/src/components/ui/references/__tests__/reference-content.test.ts:284) to lock down the new structural contract.

Add or refine tests that verify:

* synthesized slot names are exactly the supported schema keys combined with the id;
* unsupported names are not queried;
* meaningful resolved values are included;
* empty or non-meaningful resolved values are omitted;
* duplicate ids are resolved once and preserve first-seen deduplication order;
* each unique id always produces an output entry;
* an empty input list still returns `{}`.

A particularly valuable assertion here is not just that duplicate inputs produce the same final object, but that slot lookup happens once per supported key for the first occurrence only.

### Render-suite regression coverage

Re-run nearby render consumers to confirm the batching refactor is behavior-preserving:

* `reference-content.test.ts`
* `ReferencesFromCatalog.render.test.ts`
* `ReferencesFromJsonLd.render.test.ts`

These suites should remain stable if Phase 4 stays within scope.

## Important Interface / Type Notes

* `PreparedReferenceSlots` remains the public prepared-field shape:

  * `title?: string`
  * `description?: string`
  * `publication?: string`
  * `institution?: string`
* `prepareSlotsForReferences(...)` continues to return `Promise<Record<string, PreparedReferenceSlots>>`.
* Result typing should remain compatible with current callers.
* Literal-id-preserving generics remain deferred to Phase 5.

## Acceptance Criteria

Phase 4 is complete when all of the following are true:

* batched field support is defined in exactly one schema constant;
* `prepareSlotsForReferences(...)` no longer contains four manual per-field branches;
* duplicate ids are deduplicated before slot resolution, preserving first-seen order;
* each unique id still yields an output entry, including `{}` when appropriate;
* current supported keys, slot names, and omission rules are unchanged;
* no concurrency changes were introduced;
* existing render consumers continue to pass without contract drift.

## Assumptions

* The supported batched override fields in this phase are exactly `title`, `description`, `publication`, and `institution`.
* Duplicate ids should be treated as one logical reference during preparation.
* Phase 4 is structural cleanup only.
* Any broader typing, field expansion, or concurrency work belongs to later phases.
