# Phase 5 Plan: Parallelize Per-Reference Slot Resolution and Preserve Literal Id Types

## Summary

Keep Phase 5 deliberately narrow. This phase should only change:

* how `prepareSlotsForReferences(...)` resolves schema-defined slot keys for a single reference id; and
* how the function’s return type preserves literal id unions from readonly input arrays.

Phase 4 already established the schema as the source of truth. Phase 5 should not revisit schema ownership, supported keys, deduplication policy, slot-name synthesis, or output-shape semantics.

## Non-goals

This phase should **not**:

* introduce cross-reference global parallelism;
* change `REFERENCE_SLOT_KEYS`;
* change duplicate-id handling;
* change first-seen output ordering;
* change the meaning of “empty” or “meaningful” slot content;
* broaden the public result shape beyond tighter typing.

## Production Changes

### 1. Keep the runtime contract stable

Preserve all existing runtime behavior:

* duplicate ids are still treated as one logical reference;
* output order still follows first-seen unique ids;
* slot names still come from the existing schema + id convention;
* references with no meaningful overrides still produce `{}`;
* filtering still goes through `isMeaningfulSlotContent(...)`.

This phase should only remove serial per-key awaiting within a single reference.

### 2. Refactor per-id work into a parallel per-reference step

Change the per-id flow from sequential key resolution to a two-step parallel process:

1. For a single unique id, map `REFERENCE_SLOT_KEYS` to keyed render tasks.
2. Resolve those tasks together with `Promise.all(...)`.
3. Reconstruct `PreparedReferenceSlots` from the resolved entries.
4. Keep only meaningful values.

Recommended shape:

* build `Array<Promise<readonly [key, value]>>` or equivalent keyed entries;
* resolve once with `Promise.all(...)`;
* fold resolved entries into `PreparedReferenceSlots`.

This keeps concurrency bounded to one reference at a time and avoids flattening all ids into one global batch.

### 3. Prefer one small local helper if it reduces noise

If it improves readability, extract a local helper such as:

* `prepareSlotsForReference(...)`, or
* `resolveReferenceSlotEntries(...)`

That helper should stay private to this module and own only the per-id parallel resolution logic. Do not expand the refactor beyond that seam.

### 4. Tighten the signature to preserve literal ids

Update the function signature to preserve readonly literal arrays:

```ts
prepareSlotsForReferences<TId extends string>(
  slots: SlotLike,
  referencedIds: readonly TId[],
): Promise<Record<TId, PreparedReferenceSlots>>
```

The goal is type precision at the boundary, while leaving runtime deduplication unchanged.

### 5. Keep assertion surface narrow

Because the implementation deduplicates dynamically, the record-construction point may need one narrow assertion. Prefer a small, local assertion near the final object assembly rather than widening intermediate structures or weakening the public signature.

Good targets for the assertion surface:

* final `Record<TId, PreparedReferenceSlots>` construction;
* a helper return boundary if one is extracted.

Avoid broad `as any`, wide mutable records, or type assertions scattered across the whole implementation.

## Test Changes

### 1. Add one observable concurrency test

Add a red test for overlapping per-key work inside a single reference.

Test strategy:

* use a deferred `render` stub;
* make one slot stay pending;
* invoke `prepareSlotsForReferences(...)` for a single id;
* before resolving the deferred promise, assert that all schema-derived slot names for that id have already been requested.

This verifies observable overlap without binding the test to implementation-specific internals like exact promise shapes or helper names.

### 2. Keep existing regression tests unchanged

Existing tests should remain green and unchanged, especially those that already lock down:

* `{}` for empty overrides;
* exact slot-name synthesis;
* duplicate-id deduplication;
* first-seen output order.

Those tests should continue to act as regression coverage while concurrency is introduced.

### 3. Add a type-level check for literal-id preservation

Add lightweight type coverage for the refined signature.

Preferred approach:

* use `expectTypeOf` if the repo already supports it cleanly.

Fallback only if necessary:

* a minimal `.test-d.ts`-style file, but only if that fits the project’s tooling without adding friction.

Minimum assertion to lock down:

```ts
const ids = ["ref-1", "ref-2"] as const
```

should infer:

```ts
Promise<Record<"ref-1" | "ref-2", PreparedReferenceSlots>>
```

### 4. Keep type tests focused on the boundary

Do not over-specify internals. The type test only needs to prove:

* literal unions are preserved for readonly tuples;
* plain `string[]` still widens to `Record<string, PreparedReferenceSlots>`.

That is enough to validate the signature change.

## Recommended TDD Slices

1. **Red**: add the observable concurrency test for a single id.
2. **Green**: replace serial per-key awaits with `Promise.all(...)` inside the per-id loop.
3. **Refactor**: optionally extract a small private helper for per-id resolution if it improves readability.
4. **Red**: add the literal-id type preservation check.
5. **Green**: tighten the generic return type with the smallest safe assertion surface.
6. **Regression**: run the existing runtime tests unchanged to confirm no behavioral drift.

## Validation Steps

Run the narrowest checks first:

1. the `reference-content` runtime tests;
2. the type-oriented check for `prepareSlotsForReferences(...)`, if separate;
3. the broader package test command used for this area.

The goal is to catch:

* concurrency regressions locally first;
* then typing regressions for callers;
* then any wider fallout from the stronger signature.

## Exit Criteria

Phase 5 is complete when all of the following are true:

* per-reference schema slot resolution no longer awaits key-by-key serially;
* concurrency is observable for keys belonging to the same id;
* cross-id processing remains sequential;
* deduplication, output order, slot-name synthesis, and empty-object behavior remain unchanged;
* `prepareSlotsForReferences(...)` preserves literal id unions for readonly input arrays;
* tests cover both runtime concurrency and compile-time type precision.
