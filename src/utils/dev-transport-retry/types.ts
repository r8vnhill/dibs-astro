export interface DevTransportRetryContext {
    /**
     * Abort signal for the currently started attempt.
     */
    signal: AbortSignal;

    /**
     * 1-based index of the currently started attempt.
     */
    attempt: number;

    /**
     * Effective attempt budget for this invocation.
     *
     * This is the total number of attempts the helper may start for the current run, so it is `1`
     * when retry is disabled even if the raw configured `attempts` value is higher.
     */
    maxAttempts: number;
}

export type RetryEvent =
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

/**
 * User-facing configuration for `runWithDevTransportRetry`.
 *
 * All fields are optional. When omitted, values are derived from a combination of defaults and
 * environment-based overrides.
 *
 * Environment variables currently consulted by the helper:
 *
 * - `DIBS_DEV_RETRY_ENABLED`
 * - `DIBS_DEV_RETRY_ATTEMPTS`
 * - `DIBS_DEV_RETRY_BASE_DELAY_MS`
 * - `DIBS_DEV_RETRY_MAX_DELAY_MS`
 * - `DIBS_DEV_RETRY_TIMEOUT_MS`
 *
 * `jitterRatio` is currently configurable through the options object only.
 */
export interface DevTransportRetryOptions {
    /**
     * Descriptive label included in retry events.
     *
     * Defaults to `"operation"`.
     */
    label?: string;

    /**
     * Whether retry orchestration is enabled.
     *
     * When omitted, the helper enables retries by default only in development and disables them in
     * tests and non-development environments.
     */
    enabled?: boolean;

    /**
     * Maximum number of attempts.
     *
     * A value of `1` means "run once with no retry loop".
     *
     * Defaults to `3`.
     */
    attempts?: number;

    /**
     * Initial backoff delay in milliseconds.
     *
     * Defaults to `75`.
     */
    baseDelayMs?: number;

    /**
     * Maximum backoff delay in milliseconds.
     *
     * Defaults to `400`.
     */
    maxDelayMs?: number;

    /**
     * Timeout applied to each individual attempt, in milliseconds.
     *
     * Defaults to `1500`.
     */
    timeoutMs?: number;

    /**
     * Jitter ratio applied symmetrically around the computed exponential delay.
     *
     * A value of `0` makes delay calculation deterministic, which is especially useful in tests.
     *
     * Defaults to `0.15`.
     */
    jitterRatio?: number;

    /**
     * Optional top-level abort signal for the full retry orchestration.
     */
    signal?: AbortSignal;

    /**
     * Structured observer for retry-related events.
     *
     * Defaults to a no-op function.
     */
    onRetryEvent?: (event: RetryEvent) => void;

    /**
     * Predicate that decides whether a failure is retryable.
     *
     * Defaults to `isRetryableDevTransportError`.
     */
    shouldRetry?: (error: unknown) => boolean;

    /**
     * Sleep implementation used between attempts.
     *
     * Primarily useful for tests and deterministic control over waiting.
     *
     * Defaults to `defaultSleep`.
     */
    sleep?: (ms: number, signal: AbortSignal) => Promise<void>;

    /**
     * Random number generator used for jitter calculation.
     *
     * Primarily useful for deterministic tests.
     *
     * Defaults to `Math.random`.
     */
    random?: () => number;
}

/**
 * Fully resolved internal options used by the retry loop.
 *
 * This type represents the normalized configuration after:
 *
 * - applying defaults;
 * - consulting environment variables; and
 * - injecting default implementations for collaborators such as retry events, sleeping, and
 *   randomness.
 */
export interface ResolvedDevTransportRetryOptions {
    label: string;
    enabled: boolean;
    attempts: number;
    baseDelayMs: number;
    maxDelayMs: number;
    timeoutMs: number;
    jitterRatio: number;
    signal?: AbortSignal;
    onRetryEvent: (event: RetryEvent) => void;
    shouldRetry: (error: unknown) => boolean;
    sleep: (ms: number, signal: AbortSignal) => Promise<void>;
    random: () => number;
}
