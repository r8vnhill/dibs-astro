# TDD Refactor Plan for `dev-transport-retry`

## Goal

Refactor `src/utils/dev-transport-retry.ts` so that timeouts become genuinely cancelable on a per-attempt basis instead of being merely observational.

For this refactor, the chosen direction is to **break the current API** and migrate the repository to an abortable operation signature:

```ts
operation: (signal: AbortSignal) => Promise<T>
```

In the same pass, the default retry classifier will be narrowed, environment-based configuration will be made fully symmetric, and test coverage will be strengthened with behavioural, data-driven, and property-based tests.

---

## Desired outcomes

By the end of this refactor:

* a timed-out attempt will actively abort the underlying operation;
* no retry will begin while a previous timed-out attempt is still running;
* retry classification will be stricter and less prone to false positives;
* configuration will be resolved consistently in one place, including jitter;
* the helper will have stronger behavioural and mathematical test coverage;
* all internal callers will use the new abortable contract.

---

## Key changes

### 1. Replace the public operation signature

Change `runWithDevTransportRetry` from:

```ts
() => Promise<T>
```

to:

```ts
(signal: AbortSignal) => Promise<T>
```

This makes cancellation part of the contract instead of an implementation detail.

### 2. Implement real per-attempt cancellation

Replace the current timeout approach based on `Promise.race` as the only timeout mechanism.

New per-attempt behaviour:

* create a fresh `AbortController` for each attempt;
* abort the attempt explicitly when `timeoutMs` elapses;
* optionally combine the per-attempt signal with an external caller-provided signal if upstream cancellation is supported;
* ensure a retry starts only after the previous attempt has been cancelled.

### 3. Migrate all internal callers

Keep `runWithDevTransportRetry` as the main helper name and update all repository callers to the new contract, including:

* `src/lib/shiki/cache.ts`
* `src/lib/shiki/highlighter.ts`
* `config/patches/shiki/createShikiHighlighter.ts`
* `config/patches/shiki/decorators.ts`

Where downstream APIs accept `AbortSignal`, propagate it directly. Where they do not, wrap that limitation explicitly and document it locally.

### 4. Narrow the default retry classifier

Tighten `isRetryableDevTransportError` so the default policy is safer.

Keep:

* known network and timeout error codes;
* high-confidence Vite/dev-transport message signatures.

Remove or replace:

* overly broad patterns such as `transport` on its own;
* ambiguous message patterns likely to match unrelated application errors.

### 5. Make environment configuration fully symmetric

Complete env-based option resolution by adding:

* `DIBS_DEV_RETRY_JITTER_RATIO`

Also ensure all option resolution remains centralized inside the helper.

### 6. Introduce a named resolved-options type

Add:

* `ResolvedDevTransportRetryOptions`

Use it across:

* the retry loop;
* delay computation;
* timeout and internal helpers.

This makes internal contracts easier to read and evolve safely.

### 7. Tighten jitter semantics

Adjust jitter handling so that:

* `jitterRatio` is clamped to `0..1`;
* `0` remains a deterministic mode useful for tests;
* delay calculations stay within an expected and explainable range.

### 8. Improve retry logging

Refine log messages so they clearly communicate:

* the next attempt number;
* whether a failure is retryable;
* when the helper gives up after the final attempt.

Logging should remain limited to retry paths and final failure after retries.

---

## Public API and types

### Public API to change

```ts
runWithDevTransportRetry<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  options?: DevTransportRetryOptions,
): Promise<T>
```

### Public API to preserve

* `DevTransportRetryOptions`
* `isRetryableDevTransportError`

### Changes to `DevTransportRetryOptions`

Keep:

* `logger`
* `sleep`
* `random`
* `shouldRetry`

Possibly add:

* `signal?: AbortSignal` if upstream cancellation needs to flow into the helper

Also add internal support for reading:

* `DIBS_DEV_RETRY_JITTER_RATIO`

### New internal types

* `ResolvedDevTransportRetryOptions`
* optional internal timeout/abort error type if distinguishing causes improves clarity

---

## Contracts to enforce

The refactor should make the following guarantees explicit:

* a timed-out attempt aborts the underlying operation, not just the wrapper promise;
* a retry never overlaps with a previous attempt that is still alive;
* a timeout-triggered abort remains retryable by default;
* callers are expected to honour the provided `AbortSignal`, or explicitly document when a downstream API prevents full cancellation.

---

## Test plan

Strengthen `src/utils/__tests__/dev-transport-retry.test.ts` with three complementary layers.

### 1. Behavioural tests

Add example-based tests that verify:

* it retries retryable failures until success;
* it does not retry non-retryable failures;
* it does not retry when `enabled` is `false`;
* a timeout aborts the current attempt before the next one begins;
* log output clearly reports `next attempt X/Y`.

### 2. Data-driven tests

Add DDT coverage for `isRetryableDevTransportError` using tables of:

* known retryable codes:

  * `ETIMEDOUT`
  * `ECONNRESET`
  * `ECONNREFUSED`
  * `EAI_AGAIN`
* high-confidence Vite/dev-transport messages;
* ambiguous messages that previously matched too broadly and should no longer retry.

Add DDT coverage for option resolution, including:

* direct options versus env vars;
* `DIBS_DEV_RETRY_JITTER_RATIO`;
* `enabled` behaviour in development, test, and explicit override scenarios.

### 3. Property-based tests

Add PBT for pure helpers and delay math, including:

* `computeDelayMs` is never negative;
* with `jitterRatio = 0`, delay is deterministic;
* computed delay stays within the expected jitter window;
* coercion helpers never return values outside their valid domain.

### 4. Integration verification

Re-run and, if needed, extend the affected integration tests:

* `src/lib/shiki/__tests__/highlighter.test.ts`
* any Shiki patch tests that depend on the retry helper

Then verify the whole repository with:

* `pnpm test:unit`
* `pnpm check`

---

## TDD phases

### Phase 1 — Characterize the current behaviour

Add tests that document the useful parts of the existing helper:

* retry path;
* non-retry path;
* current timeout behaviour;
* current logging behaviour;
* current classifier ambiguity.

**Payoff:** preserves useful behaviour before the API change.

### Phase 2 — Introduce real cancellation

Refactor the helper to use an abortable operation signature and per-attempt cancellation.

Update tests so they verify:

* a timed-out attempt is actually aborted;
* retries do not overlap with abandoned attempts.

**Payoff:** removes the main correctness risk in the current design.

### Phase 3 — Migrate callers

Update all internal callers to the new abortable contract.

Where a downstream API supports `AbortSignal`, pass it through.
Where it does not, wrap the limitation deliberately and document it.

**Payoff:** restores a single consistent retry API across the repository.

### Phase 4 — Tighten policy and configuration

Refine the default classifier, introduce `ResolvedDevTransportRetryOptions`, add env support for jitter, and clamp jitter to `0..1`.

**Payoff:** safer default behaviour and more coherent configuration.

### Phase 5 — Polish and harden

Improve log messages and complete DDT/PBT coverage for delay calculation and coercion helpers.

**Payoff:** leaves the helper in a stable state as shared infrastructure.

---

## Assumptions

* This refactor intentionally breaks the current function signature and migrates the whole repository to the abortable API.
* The scope includes all internal callers; no parallel legacy variant will be kept.
* The default classifier will become narrower, while extensibility will remain available through `shouldRetry`.
* The default policy of being disabled outside development remains unchanged unless tests reveal a concrete issue with that rule.
