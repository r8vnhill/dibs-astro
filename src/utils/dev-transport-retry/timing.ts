import type { ResolvedDevTransportRetryOptions } from "./types";

/**
 * Computes the delay before the next retry attempt.
 *
 * The delay is calculated as:
 *
 * - exponential backoff based on the current attempt number;
 * - capped by `maxDelayMs`;
 * - perturbed by symmetric jitter derived from `jitterRatio`.
 *
 * Attempt numbering is 1-based. The first retry therefore uses:
 *
 * `baseDelayMs * 2 ** (attempt - 1)`
 *
 * before capping and jitter are applied.
 *
 * @param attempt Current failed attempt number, using 1-based indexing.
 * @param options Resolved retry configuration.
 * @returns Non-negative delay in milliseconds before the next retry.
 */
export function computeDelayMs(
    attempt: number,
    options: ResolvedDevTransportRetryOptions,
): number {
    const exponentialDelay = Math.min(
        options.maxDelayMs,
        options.baseDelayMs * (2 ** (attempt - 1)),
    );
    const jitterWindow = exponentialDelay * options.jitterRatio;
    const jitter = jitterWindow === 0
        ? 0
        : Math.round((options.random() * 2 - 1) * jitterWindow);

    return Math.max(0, Math.round(exponentialDelay + jitter));
}

/**
 * Creates the timeout error used when an attempt exceeds `timeoutMs`.
 *
 * The returned error:
 *
 * - uses the name `DevTransportTimeoutError`;
 * - sets `code` to `ETIMEDOUT`; and
 * - embeds the operation label and timeout value in the message.
 *
 * @param label Descriptive label for the timed operation.
 * @param timeoutMs Timeout threshold, in milliseconds.
 * @returns Timeout error object reused both for abort signalling and for surfaced failure.
 */
function createTimeoutError(label: string, timeoutMs: number) {
    const error = new Error(
        `[dev-retry] ${label} timed out after ${timeoutMs}ms while waiting for a transport-bound development operation.`,
    ) as Error & { code?: string };

    error.name = "DevTransportTimeoutError";
    error.code = "ETIMEDOUT";
    return error;
}

/**
 * Runs a single attempt with timeout-based abort signalling.
 *
 * This helper creates a fresh `AbortController` for the attempt and aborts it when the timeout
 * elapses. If the operation resolves after the timeout has already fired, the helper still reports
 * the timeout as the effective result of that attempt.
 *
 * This preserves timeout semantics from the helper's perspective even when the underlying
 * operation does not stop immediately.
 *
 * @template T Result type returned by the operation.
 * @param operation Operation to execute for this attempt.
 * @param timeoutMs Per-attempt timeout in milliseconds.
 * @param label Descriptive label used in timeout error messages.
 * @returns The successful attempt result, or throws the timeout/failure that ended the attempt.
 */
export async function runAttemptWithTimeout<T>(
    operation: (signal: AbortSignal) => Promise<T>,
    timeoutMs: number,
    label: string,
): Promise<T> {
    const controller = new AbortController();
    const timeoutError = createTimeoutError(label, timeoutMs);
    let timedOut = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    try {
        timer = setTimeout(() => {
            timedOut = true;
            controller.abort(timeoutError);
        }, timeoutMs);

        const result = await operation(controller.signal);

        if (timedOut) {
            throw timeoutError;
        }

        return result;
    } catch (error) {
        if (timedOut) {
            throw timeoutError;
        }

        throw error;
    } finally {
        if (timer) {
            clearTimeout(timer);
        }
    }
}

/**
 * Default sleep implementation used between retries.
 *
 * @param ms Delay duration in milliseconds.
 * @returns Promise that resolves after the requested delay.
 */
export const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Default logger used when callers do not provide a custom logger.
 *
 * Messages are forwarded to `console.warn`, optionally along with the associated error.
 *
 * @param message Retry-related log message.
 * @param error Optional error associated with the event.
 */
export function defaultRetryLogger(message: string, error?: unknown) {
    if (error === undefined) {
        console.warn(message);
        return;
    }

    console.warn(message, error);
}
