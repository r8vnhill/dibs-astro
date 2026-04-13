import type { DevTransportRetryContext, ResolvedDevTransportRetryOptions } from "./types";

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

function abortSignalWithFallbackReason(signal: AbortSignal, fallbackReason: unknown) {
    return signal.reason === undefined ? fallbackReason : signal.reason;
}

/**
 * Combines a per-attempt timeout controller with an optional orchestration signal.
 *
 * This helper decides only how abort signals are merged for a single attempt. It does not decide
 * retry policy, attempt budgeting, or event ordering.
 */
export function composeAbortSignals(
    timeoutController: AbortController,
    externalSignal: AbortSignal | undefined,
    fallbackReason: unknown,
) {
    if (!externalSignal) {
        return {
            signal: timeoutController.signal,
            cleanup() {},
        };
    }

    if (externalSignal.aborted) {
        timeoutController.abort(abortSignalWithFallbackReason(externalSignal, fallbackReason));
        return {
            signal: timeoutController.signal,
            cleanup() {},
        };
    }

    const abortFromExternal = () => {
        timeoutController.abort(abortSignalWithFallbackReason(externalSignal, fallbackReason));
    };

    externalSignal.addEventListener("abort", abortFromExternal, { once: true });

    return {
        signal: timeoutController.signal,
        cleanup() {
            externalSignal.removeEventListener("abort", abortFromExternal);
        },
    };
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
    operation: (context: DevTransportRetryContext) => Promise<T>,
    timeoutMs: number,
    label: string,
    context: Omit<DevTransportRetryContext, "signal">,
    externalSignal?: AbortSignal,
): Promise<T> {
    const controller = new AbortController();
    const timeoutError = createTimeoutError(label, timeoutMs);
    const { signal, cleanup } = composeAbortSignals(controller, externalSignal, timeoutError);
    let timedOut = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    try {
        timer = setTimeout(() => {
            timedOut = true;
            controller.abort(timeoutError);
        }, timeoutMs);

        const result = await operation({
            ...context,
            signal,
        });

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
        cleanup();
        if (timer) {
            clearTimeout(timer);
        }
    }
}

/**
 * Default abort-aware sleep used between retries.
 *
 * @param ms Delay duration in milliseconds.
 * @param signal Signal that can interrupt the wait.
 * @returns Promise that resolves after the requested delay.
 */
export const defaultSleep = (ms: number, signal: AbortSignal) =>
    new Promise<void>((resolve, reject) => {
        if (signal.aborted) {
            reject(signal.reason);
            return;
        }

        const timer = setTimeout(() => {
            signal.removeEventListener("abort", abortSleep);
            resolve();
        }, ms);

        const abortSleep = () => {
            clearTimeout(timer);
            signal.removeEventListener("abort", abortSleep);
            reject(signal.reason);
        };

        signal.addEventListener("abort", abortSleep, { once: true });
    });
