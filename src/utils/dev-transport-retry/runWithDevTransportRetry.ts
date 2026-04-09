import { resolveDevTransportRetryOptions } from "./config";
import { computeDelayMs, runAttemptWithTimeout } from "./timing";
import type { DevTransportRetryOptions } from "./types";

/**
 * Runs an async operation with development-oriented retry orchestration.
 *
 * The helper performs the following steps:
 *
 * 1. Resolve runtime options from defaults, environment variables, and direct caller-provided
 *    overrides.
 * 2. Run the operation once, or enter a retry loop if retry is enabled and more than one attempt
 *    is allowed.
 * 3. Apply a per-attempt timeout through an `AbortSignal`.
 * 4. Retry only when the failure is classified as retryable and the attempt limit has not been
 *    reached.
 * 5. Wait between retries using exponential backoff plus optional jitter.
 *
 * ## When retry is skipped
 *
 * The helper executes the operation only once when either of the following is true:
 *
 * - retry is disabled; or
 * - `attempts <= 1`.
 *
 * In that case, the operation still receives an `AbortSignal`, but no retry loop or retry delay is
 * applied.
 *
 * ## Error behavior
 *
 * - If an attempt succeeds, its result is returned immediately.
 * - If a non-retryable failure occurs, that error is rethrown immediately.
 * - If all retryable attempts fail, the last failure is rethrown.
 *
 * @template T Result type returned by the wrapped operation.
 * @param operation Async operation to run. The helper supplies an `AbortSignal` that is aborted
 *   when the attempt times out.
 * @param options Optional retry configuration.
 * @returns The first successful result produced by the operation.
 * @example
 * ```ts
 * const result = await runWithDevTransportRetry(
 *   (signal) => fetchWithAbortSupport(url, { signal }),
 *   {
 *     label: "fetch resource",
 *     attempts: 3,
 *     timeoutMs: 1_000,
 *   },
 * );
 * ```
 */
export async function runWithDevTransportRetry<T>(
    operation: (signal: AbortSignal) => Promise<T>,
    options: DevTransportRetryOptions = {},
): Promise<T> {
    const resolved = resolveDevTransportRetryOptions(options);

    if (!resolved.enabled || resolved.attempts <= 1) {
        return operation(new AbortController().signal);
    }

    let attempt = 1;

    while (true) {
        try {
            return await runAttemptWithTimeout(operation, resolved.timeoutMs, resolved.label);
        } catch (error) {
            const canRetry = attempt < resolved.attempts && resolved.shouldRetry(error);

            if (!canRetry) {
                if (attempt > 1) {
                    resolved.logger(
                        `[dev-retry] ${resolved.label} failed after ${attempt} attempt(s).`,
                        error,
                    );
                }
                throw error;
            }

            const delayMs = computeDelayMs(attempt, resolved);
            resolved.logger(
                `[dev-retry] ${resolved.label} failed with a retryable transport error; retrying (${attempt}/${resolved.attempts}) in ${delayMs}ms.`,
                error,
            );

            attempt += 1;
            await resolved.sleep(delayMs);
        }
    }
}
