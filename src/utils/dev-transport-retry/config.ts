import { isRetryableDevTransportError } from "./classifier";
import {
    DEFAULT_ATTEMPTS,
    DEFAULT_BASE_DELAY_MS,
    DEFAULT_JITTER_RATIO,
    DEFAULT_MAX_DELAY_MS,
    DEFAULT_TIMEOUT_MS,
} from "./defaults";
import { defaultSleep } from "./timing";
import type { DevTransportRetryOptions, ResolvedDevTransportRetryOptions } from "./types";

/**
 * Resolves user-facing retry options into the normalized internal form used by the helper.
 *
 * This module is the single source of truth for resolved-option invariants such as normalized
 * numeric ranges, default collaborators, and the minimum attempt budget.
 *
 * Resolution order is:
 *
 * 1. explicit option value;
 * 2. environment override, when supported for that field;
 * 3. hard-coded default.
 *
 * The `enabled` flag has special behavior: when not provided directly or via environment variable,
 * it defaults to `true` only in development and to `false` in tests and other environments.
 *
 * @param options Caller-provided retry options.
 * @returns Normalized internal retry configuration.
 */
export function resolveDevTransportRetryOptions(
    options: DevTransportRetryOptions,
): ResolvedDevTransportRetryOptions {
    const envEnabled = parseBooleanEnv("DIBS_DEV_RETRY_ENABLED");
    const enabled = options.enabled
        ?? envEnabled
        ?? (process.env.NODE_ENV === "development" && process.env.VITEST !== "true");

    return {
        label: options.label ?? "operation",
        enabled,
        attempts: coercePositiveInt(
            options.attempts,
            parseNumberEnv("DIBS_DEV_RETRY_ATTEMPTS"),
            DEFAULT_ATTEMPTS,
        ),
        baseDelayMs: coercePositiveInt(
            options.baseDelayMs,
            parseNumberEnv("DIBS_DEV_RETRY_BASE_DELAY_MS"),
            DEFAULT_BASE_DELAY_MS,
        ),
        maxDelayMs: coercePositiveInt(
            options.maxDelayMs,
            parseNumberEnv("DIBS_DEV_RETRY_MAX_DELAY_MS"),
            DEFAULT_MAX_DELAY_MS,
        ),
        timeoutMs: coercePositiveInt(
            options.timeoutMs,
            parseNumberEnv("DIBS_DEV_RETRY_TIMEOUT_MS"),
            DEFAULT_TIMEOUT_MS,
        ),
        jitterRatio: coerceNonNegativeFloat(options.jitterRatio, DEFAULT_JITTER_RATIO),
        ...(options.signal ? { signal: options.signal } : {}),
        onRetryEvent: options.onRetryEvent ?? (() => {}),
        shouldRetry: options.shouldRetry ?? isRetryableDevTransportError,
        sleep: options.sleep ?? defaultSleep,
        random: options.random ?? Math.random,
    };
}

/**
 * Reads an environment variable as a finite number.
 *
 * Non-numeric and missing values are treated as absent.
 *
 * @param name Environment variable name.
 *
 * @returns Parsed finite number, or `undefined` when unavailable or invalid.
 */
function parseNumberEnv(name: string): number | undefined {
    const value = process.env[name];
    if (!value) return undefined;

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * Reads an environment variable as a boolean.
 *
 * Only the exact strings `"true"` and `"false"` are recognized.
 *
 * @param name Environment variable name.
 *
 * @returns Parsed boolean, or `undefined` when unavailable or invalid.
 */
function parseBooleanEnv(name: string): boolean | undefined {
    const value = process.env[name];
    if (value === "true") return true;
    if (value === "false") return false;
    return undefined;
}

/**
 * Returns the first valid positive integer from a list of candidate values.
 *
 * Values are accepted only when they are finite numbers greater than zero. The chosen value is
 * truncated to an integer.
 *
 * If no candidate is valid, the function falls back to `1`.
 *
 * @param values Candidate numeric values in priority order.
 *
 * @returns Positive integer result.
 */
function coercePositiveInt(...values: Array<number | undefined>) {
    for (const value of values) {
        if (typeof value === "number" && Number.isFinite(value) && value > 0) {
            return Math.trunc(value);
        }
    }

    return 1;
}

/**
 * Returns a non-negative floating-point value or a fallback.
 *
 * @param value Candidate numeric value.
 * @param fallback Fallback used when `value` is absent, invalid, or negative.
 * @returns Non-negative float result.
 */
function coerceNonNegativeFloat(value: number | undefined, fallback: number) {
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
        return value;
    }

    return fallback;
}
