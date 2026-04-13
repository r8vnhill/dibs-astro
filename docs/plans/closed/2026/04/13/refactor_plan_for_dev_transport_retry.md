# Refactor Plan for `dev-transport-retry`

## Summary

Refactor `runWithDevTransportRetry` into a single, bounded orchestration path that:

* always enforces per-attempt timeouts;
* supports caller-driven cancellation across the full retry lifecycle;
* exposes richer attempt metadata to the wrapped operation; and
* replaces ad-hoc string logging with a structured retry-event API.

This is an intentional public API change inside the repo. Update all in-repo callers and tests in the same refactor. Keep option normalization and defaulting in the config layer so the runner remains small, deterministic, and policy-driven.

## Goals

* Eliminate behavioural inconsistencies between retry and no-retry execution paths.
* Make cancellation a first-class concern for both in-flight attempts and backoff waits.
* Improve observability through structured events rather than string formatting.
* Keep the orchestration loop small and easy to reason about.
* Preserve extensibility by pushing policy and defaults into config resolution rather than hard-coding them in the runner.

## Non-Goals

* No compatibility shim, overloads, or transitional API.
* No new retry dependency unless implementation complexity grows unexpectedly.
* No expansion of retry policy beyond the existing classifier model.
* No broad redesign of unrelated transport helpers.

## Proposed API Changes

### Operation signature

Change the wrapped operation from:

```ts
(signal: AbortSignal) => Promise<T>
```

to:

```ts
(context: {
    signal: AbortSignal;
    attempt: number;
    maxAttempts: number;
}) => Promise<T>
```

This gives callers the metadata they are most likely to need without forcing future breaking changes for basic attempt awareness.

### Retry options

Extend `DevTransportRetryOptions` with:

* `signal?: AbortSignal` for top-level cancellation
* `onRetryEvent?: (event: RetryEvent) => void`

Retain:

* `shouldRetry(error)` as the retryability classifier
* `sleep`, but make it abort-aware:

```ts
sleep: (ms: number, signal: AbortSignal) => Promise<void>
```

### Structured events

Replace the primary `logger(message, error)` contract with structured events:

```ts
type RetryEvent =
    | {
          type: "retry-scheduled";
          label: string;
          attempt: number;
          nextAttempt: number;
          maxAttempts: number;
          delayMs: number;
          error: unknown;
      }
    | {
          type: "final-failure";
          label: string;
          attempt: number;
          maxAttempts: number;
          error: unknown;
      }
    | {
          type: "cancelled";
          label: string;
          attempt?: number;
          maxAttempts: number;
          error: unknown;
      };
```

`onRetryEvent` is observational only. It must not influence control flow.

## Orchestration Changes

### 1. Unify all execution paths

Remove the early-return branch for disabled retry / single attempt. Normalize the effective attempt count once:

```ts
const maxAttempts = resolved.enabled ? resolved.attempts : 1;
```

Then route every attempt through the same bounded `for` loop.

This ensures:

* `timeoutMs` is always enforced;
* attempt semantics are uniform;
* retry-disabled execution is simply a one-attempt case.

### 2. Route every attempt through `runAttemptWithTimeout`

Every operation attempt, including the single-attempt path, must be executed through the timeout wrapper. This removes the current behavioural split and makes timeout guarantees consistent.

### 3. Support full-lifecycle cancellation

Compose the per-attempt timeout signal with the external `options.signal` so that either can abort the attempt.

Cancellation must also interrupt backoff sleep. If cancellation occurs:

* stop retrying immediately;
* emit a `cancelled` event; and
* surface the cancellation reason.

### 4. Keep retry classification central

Continue to route failures through `shouldRetry(error)`.

Policy decision:

* if `shouldRetry` throws, fail fast and surface that classifier error;
* document this as intentional, since this helper is development-oriented and predicate failures indicate a broken policy function.

### 5. Keep exhaustion behaviour simple

On exhaustion, throw the last real failure. Do not rely on synthetic “unreachable” logic as part of normal control flow.

## Module-Level Responsibilities

### `runWithDevTransportRetry.ts`

Owns orchestration only:

* compute effective `maxAttempts`;
* execute the bounded attempt loop;
* invoke timeout wrapper;
* consult classifier;
* emit retry/cancel/final-failure events;
* invoke abort-aware sleep between attempts.

This module should not normalize raw inputs or duplicate config defaults.

### `config.ts`

Owns normalization and defaults:

* enforce `attempts >= 1`;
* normalize numeric fields;
* provide default label;
* provide default `shouldRetry`;
* provide default abort-aware `sleep`;
* provide default no-op `onRetryEvent`.

This keeps the runner policy-driven and reduces branching in the orchestration layer.

### `timing.ts`

Owns timing and signal mechanics:

* `runAttemptWithTimeout`
* backoff calculation
* signal composition helper for timeout + external cancellation
* abort-aware sleep helper, if not already present elsewhere

Keep these utilities small and independent so they remain easy to test directly.

### `types.ts`

Owns shared public and internal types:

* `DevTransportRetryOptions`
* resolved option shapes as needed
* `RetryEvent`
* operation context type

## Caller Migration

This is a clean in-repo break.

Update all callers to destructure the new operation context:

```ts
({ signal }) => someAsyncOperation(signal)
```

Do not add overloads or adapters unless a specific caller becomes significantly worse with the new shape.

Keep the public facade exporting the same symbol names where possible, but with the updated types.

## Implementation Sequence

### Phase 1: lock current defects with tests

Before changing implementation, add characterization tests for the timeout inconsistency:

* `enabled: false` still enforces `timeoutMs`
* `attempts: 1` still enforces `timeoutMs`
* both cases execute exactly once
* neither case sleeps

This protects the main behavioural fix before the refactor begins.

### Phase 2: introduce new types and defaults

* add operation context type
* add `signal` and `onRetryEvent` to options
* add `RetryEvent`
* update resolved options and config normalization
* make `sleep` abort-aware

This should compile before orchestration changes begin.

### Phase 3: refactor orchestration loop

* replace early return + `while (true)` with a bounded `for` loop
* compute `maxAttempts` once
* route all attempts through `runAttemptWithTimeout`
* classify errors centrally
* emit structured events instead of log strings

At the end of this phase, the runner should be simpler than the current implementation.

### Phase 4: add end-to-end cancellation

* compose timeout and external signals
* make backoff sleep abortable
* stop retrying immediately on cancellation
* emit `cancelled` events

### Phase 5: migrate callers

* update in-repo call sites to the new operation signature
* remove obsolete logger assumptions
* simplify any caller code that previously worked around missing attempt context

### Phase 6: clean up and tighten invariants

* remove dead tests for old string log wording
* remove obsolete comments/docs
* verify no module duplicates config invariants already handled in `config.ts`

## Test Plan

## BDD scenarios

### Timeout consistency

* **given retry is disabled**
  it still enforces `timeoutMs`
* **given attempts is one**
  it still enforces `timeoutMs`
* **given either single-attempt path**
  it runs exactly once and never sleeps

### Retry behaviour

* **given a non-retryable failure**
  it throws immediately without sleeping
* **given retryable failures followed by success**
  it retries until success and sleeps only between failed attempts
* **given all retryable attempts fail**
  it emits one `final-failure` event and throws the last failure

### Cancellation

* **given cancellation during an in-flight attempt**
  it aborts that attempt and stops the loop
* **given cancellation during backoff**
  it aborts sleep and prevents the next attempt
* **given a pre-aborted signal**
  it never starts the first attempt

### Context and events

* **given multiple attempts**
  the operation receives the correct `attempt` and `maxAttempts` values
* **given a retryable failure**
  it emits the expected `retry-scheduled` payload
* **given exhaustion**
  it emits the expected `final-failure` payload
* **given cancellation**
  it emits the expected `cancelled` payload

## DDT matrix

Cover these combinations in a compact table-driven suite:

* `enabled = true | false`
* `attempts = 1 | 2 | 3`
* outcome sequences:

  * success
  * retryable fail then success
  * retryable fail then retryable fail
  * non-retryable fail

Assertions should focus on:

* invocation count
* sleep count
* emitted events
* final result or thrown error

## Property-style invariants

Add a small number of PBT-style checks where they provide durable value:

* sleep count is never greater than `maxAttempts - 1`
* success on attempt `k` yields exactly `k` invocations when `k <= maxAttempts`
* thrown errors always come from the operation, classifier, or cancellation path
* the orchestration layer never synthesizes a normal terminal error

## Acceptance Criteria

The refactor is complete when:

* all execution paths enforce `timeoutMs`;
* external cancellation can stop both an active attempt and a backoff delay;
* the public operation signature provides `{ signal, attempt, maxAttempts }`;
* string logger assertions are fully replaced with structured event assertions;
* the orchestration loop is bounded, single-path, and free of duplicated policy logic;
* all in-repo callers compile against the new contract;
* tests cover timeout consistency, retry classification, cancellation, DDT combinations, and key invariants.

## Key Risks and Decisions

### Risk: public API churn inside the repo

Accepted. This refactor intentionally improves the contract and updates all callers together.

### Risk: event hook misuse

Mitigation: document `onRetryEvent` as observational only and keep it out of control flow.

### Risk: cancellation semantics becoming ambiguous

Mitigation: define precedence clearly in code and tests:

* cancellation stops orchestration immediately;
* the surfaced error is the real cancellation reason;
* no further retry classification occurs after cancellation is observed.

### Risk: overengineering a small helper

Mitigation: keep the scope focused on three real problems:

* inconsistent timeout behaviour
* missing full-lifecycle cancellation
* weak observability contract

## Final Notes

This plan keeps the core idea of the original proposal, but makes the refactor easier to implement safely:

* behaviour-first sequencing;
* clearer module boundaries;
* explicit acceptance criteria;
* less ambiguity around cancellation, eventing, and failure policy.
