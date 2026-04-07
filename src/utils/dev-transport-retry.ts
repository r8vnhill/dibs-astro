/**
 * Small retry helper for transient dev-server transport failures.
 *
 * This targets failures that show up during local development as dynamic-import / Vite transport
 * hiccups (for example `vite:invoke`, `fetchModule`, or timeout-style errors). It is intentionally
 * disabled outside development by default so production builds keep their current fail-fast
 * behavior.
 */

const DEFAULT_ATTEMPTS = 3;
const DEFAULT_BASE_DELAY_MS = 75;
const DEFAULT_MAX_DELAY_MS = 400;
const DEFAULT_TIMEOUT_MS = 1_500;
const DEFAULT_JITTER_RATIO = 0.15;

type RetryLogger = (message: string, error?: unknown) => void;

export interface DevTransportRetryOptions {
    label?: string;
    enabled?: boolean;
    attempts?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    timeoutMs?: number;
    jitterRatio?: number;
    logger?: RetryLogger;
    shouldRetry?: (error: unknown) => boolean;
    sleep?: (ms: number) => Promise<void>;
    random?: () => number;
}

export async function runWithDevTransportRetry<T>(
    operation: () => Promise<T>,
    options: DevTransportRetryOptions = {},
): Promise<T> {
    const resolved = resolveDevTransportRetryOptions(options);

    if (!resolved.enabled || resolved.attempts <= 1) {
        return operation();
    }

    let attempt = 1;

    while (true) {
        try {
            return await runWithTimeout(operation, resolved.timeoutMs, resolved.label);
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

export function isRetryableDevTransportError(error: unknown): boolean {
    const message = normalizeErrorMessage(error);
    const code = typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: unknown }).code ?? "")
        : "";

    if (["ETIMEDOUT", "ECONNRESET", "ECONNREFUSED", "EAI_AGAIN"].includes(code)) {
        return true;
    }

    return [
        /vite:invoke/i,
        /fetchmodule/i,
        /\btimed?\s*out\b/i,
        /\btimeout\b/i,
        /\btransport\b/i,
        /\bsocket hang up\b/i,
        /\bnetwork error\b/i,
    ].some((pattern) => pattern.test(message));
}

function resolveDevTransportRetryOptions(options: DevTransportRetryOptions) {
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
        logger: options.logger ?? defaultRetryLogger,
        shouldRetry: options.shouldRetry ?? isRetryableDevTransportError,
        sleep: options.sleep ?? defaultSleep,
        random: options.random ?? Math.random,
    };
}

function computeDelayMs(
    attempt: number,
    options: ReturnType<typeof resolveDevTransportRetryOptions>,
): number {
    const exponentialDelay = Math.min(
        options.maxDelayMs,
        options.baseDelayMs * (2 ** (attempt - 1)),
    );
    const jitterWindow = exponentialDelay * options.jitterRatio;
    const jitter = jitterWindow === 0 ? 0 : Math.round((options.random() * 2 - 1) * jitterWindow);
    return Math.max(0, Math.round(exponentialDelay + jitter));
}

async function runWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    label: string,
): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;

    try {
        return await Promise.race([
            operation(),
            new Promise<T>((_, reject) => {
                timer = setTimeout(() => {
                    reject(createTimeoutError(label, timeoutMs));
                }, timeoutMs);
            }),
        ]);
    } finally {
        if (timer) {
            clearTimeout(timer);
        }
    }
}

function createTimeoutError(label: string, timeoutMs: number) {
    const error = new Error(
        `[dev-retry] ${label} timed out after ${timeoutMs}ms while waiting for a transport-bound development operation.`,
    ) as Error & { code?: string };
    error.name = "DevTransportTimeoutError";
    error.code = "ETIMEDOUT";
    return error;
}

function normalizeErrorMessage(error: unknown): string {
    if (typeof error === "string") {
        return error;
    }

    if (error instanceof Error) {
        return `${error.name}: ${error.message}`;
    }

    if (typeof error === "object" && error !== null && "message" in error) {
        return String((error as { message?: unknown }).message ?? "");
    }

    return String(error ?? "");
}

function parseNumberEnv(name: string): number | undefined {
    const value = process.env[name];
    if (!value) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}

function parseBooleanEnv(name: string): boolean | undefined {
    const value = process.env[name];
    if (value === "true") return true;
    if (value === "false") return false;
    return undefined;
}

function coercePositiveInt(...values: Array<number | undefined>) {
    for (const value of values) {
        if (typeof value === "number" && Number.isFinite(value) && value > 0) {
            return Math.trunc(value);
        }
    }
    return 1;
}

function coerceNonNegativeFloat(value: number | undefined, fallback: number) {
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
        return value;
    }
    return fallback;
}

function defaultSleep(ms: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function defaultRetryLogger(message: string, error?: unknown) {
    if (error === undefined) {
        console.warn(message);
        return;
    }

    console.warn(message, error);
}
