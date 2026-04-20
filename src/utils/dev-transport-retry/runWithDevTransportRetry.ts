/**
 * Retry orchestration for development-time transport-bound operations.
 *
 * This module exposes {@link runWithDevTransportRetry}, a small orchestration helper for async operations that may
 * fail transiently in local or development environments. It is designed for failures such as transport hiccups, DNS
 * delays, or startup races, where retrying the same work after a bounded delay is often enough to recover.
 *
 * The helper combines four concerns:
 *
 * - bounded retry orchestration;
 * - per-attempt timeout enforcement;
 * - external cancellation through an orchestration {@link AbortSignal}; and
 * - structured retry events for observability.
 *
 * ## Behavior summary
 *
 * Each started attempt receives its own per-attempt {@link AbortSignal}. That signal is aborted when the attempt times
 * out, and it also reflects external orchestration cancellation when a top-level signal is provided.
 *
 * Retry-disabled execution is not a separate code path. It is modeled as an invocation whose effective attempt budget
 * is `1`, so timeout, cancellation, and event semantics remain consistent across all execution modes.
 *
 * ## Event model
 *
 * Observers may subscribe through `onRetryEvent` to receive structured events when:
 *
 * - another retry is scheduled;
 * - the invocation ends in terminal failure after retries were attempted; or
 * - the invocation is externally cancelled.
 *
 * ## Typical use case
 *
 * Wrapping network-dependent setup or build operations:
 *
 * ```ts
 * const highlighter = await runWithDevTransportRetry(
 *   ({ signal }) => createHighlighter({ ... }, { signal }),
 *   {
 *     label: "syntax highlighter setup",
 *     attempts: 3,
 *     timeoutMs: 10_000,
 *   },
 * );
 * ```
 */

import { resolveDevTransportRetryOptions } from "./config";
import { computeDelayMs, runAttemptWithTimeout } from "./timing";
import type { DevTransportRetryContext, DevTransportRetryOptions } from "./types";

/**
 * Returns an {@link AbortSignal} that is never aborted.
 *
 * This is used as a fallback orchestration signal when the caller does not provide an external signal. It lets the
 * rest of the orchestration code depend on one signal-shaped value without having to branch on `undefined`.
 *
 * @returns A fresh signal that will remain non-aborted for the lifetime of this invocation.
 * @internal
 */
const getNeverAbortedSignal = (): AbortSignal => new AbortController().signal;

/**
 * Marks a control-flow path as impossible and throws.
 *
 * The bounded retry loop in {@link runWithDevTransportRetry} is structured so that normal execution must either:
 *
 * - return a successful result; or
 * - throw a terminal failure.
 *
 * This helper exists only to make that invariant explicit to the type checker and to future
 * readers.
 *
 * @param message Diagnostic message describing the violated invariant.
 * @returns Never returns.
 * @throws {Error} Always throws with the supplied message.
 * @internal
 */
function unreachable(message: string): never {
    throw new Error(message);
}

/**
 * Returns whether a caught error represents external orchestration cancellation.
 *
 * This helper intentionally uses a narrow definition. It does not treat every abort-shaped error as orchestration
 * cancellation. Instead, it only reports cancellation when:
 *
 * - an external {@link AbortSignal} exists;
 * - that signal is currently aborted; and
 * - the caught error is the exact abort `reason` carried by that signal.
 *
 * This keeps external cancellation distinct from timeout failures and other retryable transport errors.
 *
 * @param error Error observed by the orchestration loop.
 * @param signal External orchestration signal, if one was configured.
 * @returns `true` only when the error is the external signal's abort reason.
 * @internal
 */
const isExternalCancellation = (error: unknown, signal?: AbortSignal): boolean =>
    signal?.aborted === true && Object.is(error, signal.reason);

/**
 * Emits a `cancelled` retry event.
 *
 * This event is emitted when the external orchestration signal aborts either:
 *
 * - before the first attempt starts;
 * - during an in-flight attempt; or
 * - during the backoff wait before the next retry.
 *
 * When `attempt` is omitted, cancellation happened before any attempt started. When `attempt` is present, it
 * identifies the active or just-failed attempt at the moment cancellation was observed.
 *
 * @param options Resolved retry options, including the event sink.
 * @param maxAttempts Effective attempt budget for this invocation.
 * @param error External cancellation reason.
 * @param attempt Attempt number associated with the cancellation, when applicable.
 * @internal
 */
function emitCancelled(
    options: ReturnType<typeof resolveDevTransportRetryOptions>,
    maxAttempts: number,
    error: unknown,
    attempt?: number,
): void {
    options.onRetryEvent({
        type: "cancelled",
        label: options.label,
        ...(attempt === undefined ? {} : { attempt }),
        maxAttempts,
        error,
    });
}

/**
 * Emits a `final-failure` retry event.
 *
 * This event is emitted only for genuine terminal failure after at least one retry has already been attempted. It is
 * not emitted for:
 *
 * - first-attempt terminal failure; or
 * - external cancellation.
 *
 * @param options Resolved retry options, including the event sink.
 * @param attempt Final attempt number that failed.
 * @param maxAttempts Effective attempt budget for this invocation.
 * @param error Terminal failure that ended the invocation.
 * @internal
 */
function emitFinalFailure(
    options: ReturnType<typeof resolveDevTransportRetryOptions>,
    attempt: number,
    maxAttempts: number,
    error: unknown,
): void {
    options.onRetryEvent({
        type: "final-failure",
        label: options.label,
        attempt,
        maxAttempts,
        error,
    });
}

const getMaxAttempts = (options: ReturnType<typeof resolveDevTransportRetryOptions>) =>
    options.enabled ? options.attempts : 1;

function throwIfPreCancelled(
    options: ReturnType<typeof resolveDevTransportRetryOptions>,
    maxAttempts: number,
) {
    if (!options.signal?.aborted) return;

    emitCancelled(options, maxAttempts, options.signal.reason);
    throw options.signal.reason;
}

const runAttempt = <T>(
    operation: (context: DevTransportRetryContext) => Promise<T>,
    options: ReturnType<typeof resolveDevTransportRetryOptions>,
    attempt: number,
    maxAttempts: number,
    orchestrationSignal: AbortSignal,
) => runAttemptWithTimeout(
    operation,
    options.timeoutMs,
    options.label,
    { attempt, maxAttempts },
    orchestrationSignal,
);

function emitRetryScheduled(
    options: ReturnType<typeof resolveDevTransportRetryOptions>,
    attempt: number,
    maxAttempts: number,
    delayMs: number,
    error: unknown,
) {
    options.onRetryEvent({
        type: "retry-scheduled",
        label: options.label,
        attempt,
        nextAttempt: attempt + 1,
        maxAttempts,
        delayMs,
        error,
    });
}

async function sleepUntilNextAttempt(
    options: ReturnType<typeof resolveDevTransportRetryOptions>,
    attempt: number,
    maxAttempts: number,
    orchestrationSignal: AbortSignal,
    error: unknown,
) {
    const delayMs = computeDelayMs(attempt, options);
    emitRetryScheduled(options, attempt, maxAttempts, delayMs, error);

    try {
        await options.sleep(delayMs, orchestrationSignal);
    } catch (sleepError) {
        if (isExternalCancellation(sleepError, options.signal)) {
            emitCancelled(options, maxAttempts, sleepError, attempt);
        }
        throw sleepError;
    }
}

async function handleAttemptFailure(
    options: ReturnType<typeof resolveDevTransportRetryOptions>,
    attempt: number,
    maxAttempts: number,
    orchestrationSignal: AbortSignal,
    error: unknown,
) {
    if (isExternalCancellation(error, options.signal)) {
        emitCancelled(options, maxAttempts, error, attempt);
        throw error;
    }

    const isLastAttempt = attempt >= maxAttempts;
    const canRetry = !isLastAttempt && options.shouldRetry(error);

    if (!canRetry) {
        if (attempt > 1) {
            emitFinalFailure(options, attempt, maxAttempts, error);
        }
        throw error;
    }

    await sleepUntilNextAttempt(options, attempt, maxAttempts, orchestrationSignal, error);
}

/**
 * Runs an async operation with development-oriented retry orchestration.
 *
 * The helper resolves runtime options, computes an effective attempt budget, and executes the wrapped operation inside
 * a bounded retry loop. Every started attempt is routed through the same timeout wrapper, so timeout behavior is
 * consistent whether retry is enabled or not.
 *
 * ## Execution model
 *
 * For each started attempt, the helper:
 *
 * 1. creates per-attempt timeout enforcement through {@link runAttemptWithTimeout};
 * 2. passes a {@link DevTransportRetryContext} to the wrapped operation;
 * 3. classifies failures through the configured retry predicate;
 * 4. emits structured retry events when another attempt is scheduled, when terminal failure is reached after retries,
 *    or when external cancellation occurs; and
 * 5. gives external cancellation precedence over retry classification and exhaustion handling.
 *
 * ## Effective attempt budget
 *
 * The `maxAttempts` value exposed in {@link DevTransportRetryContext} is the effective execution budget for the
 * current invocation, not merely the raw configured `attempts` value.
 *
 * In practice, this means:
 *
 * - when retry is enabled, `maxAttempts` matches the resolved attempt count; and
 * - when retry is disabled, `maxAttempts` is `1`, even if the configured `attempts` value is higher.
 *
 * ## Terminal outcomes
 *
 * The helper can finish in four ways:
 *
 * - **success**: an attempt resolves successfully and its result is returned immediately;
 * - **non-retryable failure**: the current error is not retryable, so it is rethrown immediately;
 * - **attempt exhaustion**: all retryable attempts fail, so the last failure is rethrown; or
 * - **external cancellation**: the external orchestration signal aborts, so its reason is rethrown unchanged.
 *
 * ## Timeout semantics
 *
 * Every started attempt is subject to the configured timeout.
 *
 * When an attempt times out:
 *
 * - the attempt-specific signal is aborted;
 * - the helper waits for the timed attempt to settle before moving on; and
 * - the resulting timeout error is handled through the same retry-classification path as other failures.
 *
 * @template T Result type produced by the wrapped operation.
 * @param operation Async operation to execute. The helper passes a {@link DevTransportRetryContext} containing:
 *   - `signal`: the per-attempt {@link AbortSignal};
 *   - `attempt`: the current 1-based attempt number; and
 *   - `maxAttempts`: the effective attempt budget for this invocation.
 * @param options Optional retry configuration. See {@link DevTransportRetryOptions}.
 * @returns The first successful result produced by the wrapped operation.
 * @throws Rethrows a non-retryable failure immediately.
 * @throws Rethrows the last retryable failure when the attempt budget is exhausted.
 * @throws Rethrows the external signal's abort reason unchanged when external cancellation occurs.
 * @example
 * ```ts
 * const result = await runWithDevTransportRetry(
 *   ({ signal }) => fetchWithAbortSupport(url, { signal }),
 *   {
 *     label: "fetch resource",
 *     attempts: 3,
 *     timeoutMs: 1_000,
 *   },
 * );
 * ```
 */
export async function runWithDevTransportRetry<T>(
    operation: (context: DevTransportRetryContext) => Promise<T>,
    options: DevTransportRetryOptions = {},
): Promise<T> {
    const resolved = resolveDevTransportRetryOptions(options);
    const maxAttempts = getMaxAttempts(resolved);
    const orchestrationSignal = resolved.signal ?? getNeverAbortedSignal();

    throwIfPreCancelled(resolved, maxAttempts);

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
            return await runAttempt(
                operation,
                resolved,
                attempt,
                maxAttempts,
                orchestrationSignal,
            );
        } catch (error) {
            await handleAttemptFailure(resolved, attempt, maxAttempts, orchestrationSignal, error);
        }
    }

    return unreachable("Bounded retry loop must return or throw before completion.");
}
