/**
 * Logger callback used by the retry helper.
 *
 * The helper emits log messages only for retry-related events:
 *
 * - before waiting for a retry after a retryable failure; and
 * - after the final failure when retries have been exhausted.
 *
 * @param message Human-readable retry event message.
 * @param error Optional error associated with the event.
 */
export type RetryLogger = (message: string, error?: unknown) => void;

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
     * Descriptive label used in retry log messages.
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
     * Logger used for retry-related messages.
     *
     * Defaults to `defaultRetryLogger`.
     */
    logger?: RetryLogger;

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
    sleep?: (ms: number) => Promise<void>;

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
 * - injecting default implementations for collaborators such as logging, sleeping, and randomness.
 */
export interface ResolvedDevTransportRetryOptions {
    label: string;
    enabled: boolean;
    attempts: number;
    baseDelayMs: number;
    maxDelayMs: number;
    timeoutMs: number;
    jitterRatio: number;
    logger: RetryLogger;
    shouldRetry: (error: unknown) => boolean;
    sleep: (ms: number) => Promise<void>;
    random: () => number;
}
