# Plan to Split `dev-transport-retry` into Focused Modules

## Goal

Refactor `src/utils/dev-transport-retry.ts`, which currently mixes public API, retry policy, abortable timeout handling, configuration resolution, and parsing utilities, into a small set of focused internal modules.

The public API must continue to be exposed from the current file so that callers do not need to change imports and no observable behaviour changes as part of this refactor.

## Scope

This is a **structural refactor only**.

It should:

- improve modularity, readability, and maintainability;
- make responsibilities easier to test and review;
- preserve the current public surface and runtime behaviour.

It should **not**:

- change the public import path;
- narrow the retry classifier;
- change delay math, timeout semantics, or log wording;
- introduce new feature-level APIs for external callers.

---

## Target structure

Keep `src/utils/dev-transport-retry.ts` as the public facade.

It should continue to export:

- `runWithDevTransportRetry`
- `isRetryableDevTransportError`
- `DevTransportRetryOptions`

The facade should contain only:

- imports and re-exports; and
- at most a very thin composition layer if one is genuinely needed.

Move the implementation into internal modules under:

- `src/utils/dev-transport-retry/`

### Proposed internal modules

- `types.ts`
  - `RetryLogger`
  - `DevTransportRetryOptions`
  - `ResolvedDevTransportRetryOptions`

- `defaults.ts`
  - default numeric constants
  - optionally environment variable names if that improves clarity

- `classifier.ts`
  - `isRetryableDevTransportError`
  - `normalizeErrorMessage`

- `config.ts`
  - `resolveDevTransportRetryOptions`
  - `parseNumberEnv`
  - `parseBooleanEnv`
  - `coercePositiveInt`
  - `coerceNonNegativeFloat`

- `timing.ts`
  - `computeDelayMs`
  - `runAttemptWithTimeout`
  - `createTimeoutError`
  - `defaultSleep`
  - `defaultRetryLogger`

- `runWithDevTransportRetry.ts`
  - main retry loop
  - composition of config, timing, and classifier logic

---

## Design principles

### Split by responsibility, not by file size

Each module should own one coherent concern:

- `classifier.ts` owns retryability policy;
- `timing.ts` owns time-related mechanics and abort/timeout behaviour;
- `config.ts` owns option resolution and normalization.

Avoid splitting functions into separate files only to reduce line count.

### Preserve an internal-only module boundary

All extracted functions should remain internal to the feature unless another module inside the same feature needs them.

This refactor should not turn the helper into a mini-framework or create a new public sub-API under:

- `src/utils/dev-transport-retry/*`

### Keep the refactor mechanical and reviewable

Prefer simple movement and clear responsibility boundaries over deeper behavioural rewrites.

A reviewer should be able to verify that:

- logic was relocated cleanly;
- names remain stable where appropriate;
- behaviour did not change.

---

## Public API and contracts to preserve

### Public API

The following API must remain unchanged in both name and import path:

```ts
runWithDevTransportRetry<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  options?: DevTransportRetryOptions,
): Promise<T>

isRetryableDevTransportError(error: unknown): boolean

DevTransportRetryOptions
```

### Behavioural contracts

The refactor must preserve the following current behaviour:

* when retry is disabled, or `attempts <= 1`, the helper still runs exactly once;
* timed attempts still receive an `AbortSignal`;
* timeout failures still surface as `DevTransportTimeoutError` with `code = "ETIMEDOUT"`;
* the current broad retry classifier remains unchanged in this refactor;
* retry log wording remains unchanged;
* delay calculation remains unchanged.

### Import discipline

External callers must continue importing only from the current public location, for example through:

* `~/utils`; or
* the existing `dev-transport-retry.ts` file.

No new direct imports from internal modules under:

* `src/utils/dev-transport-retry/*`

should be introduced outside the feature itself.

---

## Test plan

### Primary test suite

Keep:

* `src/utils/__tests__/dev-transport-retry.test.ts`

as the main public-behaviour test suite for this refactor.

Do not split the test suite during this phase unless the code split makes an existing test helper meaningfully unreadable.

### Minimum verification

Run the focused checks most likely to catch regressions in the helper and its known consumers:

```bash
pnpm exec vitest run \
  src/utils/__tests__/dev-transport-retry.test.ts \
  src/lib/shiki/__tests__/highlighter.test.ts \
  src/lib/shiki/__tests__/createShikiHighlighter.patch.test.ts
```

Then run:

```bash
pnpm check
```

### Broad verification

Run:

```bash
pnpm test:unit
```

### Acceptance criteria

The refactor is acceptable when:

* the focused test run passes;
* `pnpm check` passes; and
* `pnpm test:unit` either passes fully or fails only because of the already-known debt in `LessonSidebar.test.tsx`, with no new helper-related regressions.

---

## Implementation sequence

### Phase 1 — Create the internal module layout

Add the new internal folder and files with the target structure, but keep the current public facade intact.

### Phase 2 — Move types and defaults

Extract shared types and default constants first, since they are low-risk and reduce noise in later moves.

### Phase 3 — Move classifier and config logic

Extract error classification and option resolution next. These are cohesive units and should be easy to verify in isolation.

### Phase 4 — Move timing and timeout mechanics

Extract delay calculation, timeout handling, timeout error creation, and default timing/logging helpers.

### Phase 5 — Move the retry loop

Extract the main orchestration logic into `runWithDevTransportRetry.ts` and wire the public facade to it.

### Phase 6 — Run verification and clean up

Run focused tests first, then `pnpm check`, then the broader unit suite. Clean up imports and ensure no external caller now depends on internal module paths.

---

## Assumptions

* This split is internal only; public surface and behaviour remain unchanged.
* A dedicated folder at `src/utils/dev-transport-retry/` is preferred over multiple scattered files under `src/utils/`.
* The existing test file stays where it is for now.
* Jitter semantics, environment symmetry, and classifier tightening are explicitly out of scope for this refactor and should be handled in later changes.
