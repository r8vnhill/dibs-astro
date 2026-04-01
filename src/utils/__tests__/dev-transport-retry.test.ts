import { describe, expect, it, vi } from "vitest";
import { isRetryableDevTransportError, runWithDevTransportRetry } from "../dev-transport-retry";

describe("dev transport retry", () => {
    it("classifies vite invoke timeout failures as retryable", () => {
        expect(
            isRetryableDevTransportError(
                new Error("vite:invoke request failed because fetchModule timed out"),
            ),
        ).toBe(true);
    });

    it("does not classify regular implementation errors as retryable", () => {
        expect(isRetryableDevTransportError(new Error("SyntaxError: unexpected token"))).toBe(
            false,
        );
    });

    it("retries retryable failures until the operation succeeds", async () => {
        const sleep = vi.fn(async () => {});
        const logger = vi.fn();
        let attempts = 0;

        const result = await runWithDevTransportRetry(
            async () => {
                attempts += 1;
                if (attempts < 3) {
                    const error = new Error("vite:invoke transport timed out") as Error & {
                        code?: string;
                    };
                    error.code = "ETIMEDOUT";
                    throw error;
                }

                return "ok";
            },
            {
                enabled: true,
                attempts: 3,
                baseDelayMs: 5,
                maxDelayMs: 10,
                jitterRatio: 0,
                sleep,
                logger,
            },
        );

        expect(result).toBe("ok");
        expect(attempts).toBe(3);
        expect(sleep).toHaveBeenCalledTimes(2);
        expect(logger).toHaveBeenCalledTimes(2);
    });

    it("fails immediately for non-retryable errors", async () => {
        const sleep = vi.fn(async () => {});
        const error = new Error("invalid config");

        await expect(
            runWithDevTransportRetry(
                async () => {
                    throw error;
                },
                {
                    enabled: true,
                    attempts: 3,
                    sleep,
                },
            ),
        ).rejects.toThrow("invalid config");

        expect(sleep).not.toHaveBeenCalled();
    });

    it("turns timeouts into retryable failures", async () => {
        vi.useFakeTimers();
        const sleep = vi.fn(async () => {});
        let attempts = 0;

        const pending = runWithDevTransportRetry(
            async () => {
                attempts += 1;
                if (attempts === 1) {
                    return await new Promise<string>(() => {});
                }

                return "recovered";
            },
            {
                enabled: true,
                attempts: 2,
                timeoutMs: 10,
                jitterRatio: 0,
                baseDelayMs: 1,
                maxDelayMs: 1,
                sleep,
                logger: vi.fn(),
            },
        );

        await vi.advanceTimersByTimeAsync(20);

        await expect(pending).resolves.toBe("recovered");
        expect(attempts).toBe(2);

        vi.useRealTimers();
    });
});
