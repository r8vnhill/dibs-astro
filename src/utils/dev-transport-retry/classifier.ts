/**
 * Converts an unknown thrown value into a comparable message string.
 *
 * This normalizes several common thrown forms:
 *
 * - raw strings;
 * - `Error` instances;
 * - plain objects carrying a `message` field; and
 * - other arbitrary values.
 *
 * @param error Unknown thrown value.
 *
 * @returns Best-effort textual representation of the error.
 */
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

/**
 * Classifies an error as retryable for development transport scenarios.
 *
 * The default classifier is intentionally pragmatic: it treats certain network error codes and
 * broad transport-like message patterns as retryable.
 *
 * It currently considers the following signals retryable:
 *
 * - error codes:
 *   - `ETIMEDOUT`
 *   - `ECONNRESET`
 *   - `ECONNREFUSED`
 *   - `EAI_AGAIN`
 * - message patterns associated with development transport failures, such as:
 *   - `vite:invoke`
 *   - `fetchModule`
 *   - timeout-related wording
 *   - `socket hang up`
 *   - `network error`
 *   - `transport`
 *
 * This classifier is intentionally overridable through `shouldRetry` because the default policy
 * may be broader than some callers want.
 *
 * @param error Unknown failure value thrown by the wrapped operation.
 * @returns `true` when the error is considered retryable by the default policy.
 */
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
