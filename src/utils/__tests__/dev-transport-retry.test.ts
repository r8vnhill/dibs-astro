/**
 * Characterization tests for the current `dev-transport-retry` behavior.
 *
 * This file captures the observable contract of the existing helper before the planned abortable
 * refactor changes its timeout and cancellation semantics.
 *
 * The goal of this suite is not only to protect useful behavior, but also to make today's
 * limitations explicit so later TDD phases can replace them deliberately rather than accidentally.
 *
 * ## What this suite documents
 *
 * The tests cover two kinds of behavior:
 *
 * - behavior worth preserving, such as retry orchestration, retry/no-retry branching, delay usage,
 *   and logging; and
 * - current limitations that are intentionally documented during the characterization phase, such
 *   as observational timeouts that reject the wrapper promise without cancelling the original
 *   async work.
 *
 * ## Why characterization matters here
 *
 * The next refactor is expected to break part of the current behavior on purpose by introducing
 * per-attempt cancellation with an abortable operation signature. These tests therefore serve as a
 * baseline:
 *
 * - some examples should continue to pass after the refactor;
 * - others should fail in a way that clearly signals an intentional semantic improvement rather
 *   than a regression.
 *
 * ## Suite structure
 *
 * This file is organized into two complementary suites:
 *
 * - `runWithDevTransportRetry`, which uses BDD-style scenarios to describe the helper's current
 *   orchestration behavior; and
 * - `isRetryableDevTransportError`, which uses table-driven examples to pin down the current
 *   retryability classifier, including overly broad matches that are expected to be narrowed later.
 */
import { describe, expect, suite, test, vi } from "vitest";
import { isRetryableDevTransportError, runWithDevTransportRetry } from "../dev-transport-retry";

/**
 * Behavioral specification for the current retry helper.
 *
 * The examples in this suite describe how the helper behaves today under:
 *
 * - retryable failures;
 * - non-retryable failures;
 * - disabled retry mode;
 * - timeout-triggered retries; and
 * - retry logging.
 *
 * Several timeout-related examples intentionally document flawed behavior in the current
 * implementation, including the fact that timed-out operations may continue running and overlap
 * with later retries. Those examples should remain explicit until the abortable refactor replaces
 * them with stronger guarantees.
 */
suite("runWithDevTransportRetry", () => {
    describe("given retry is enabled and failures are retryable", () => {
        describe("when the operation succeeds on a later attempt", () => {
            test(
                "then it retries until success, sleeps between attempts, and logs each retry",
                async () => {
                    const sleep = vi.fn(async () => {});
                    const logger = vi.fn();
                    let attempts = 0;

                    const result = await runWithDevTransportRetry(
                        async () => {
                            attempts += 1;
                            if (attempts < 3) {
                                const error = new Error("vite:invoke transport timed out") as
                                    & Error
                                    & {
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
                },
            );
        });

        describe("when all retryable attempts fail", () => {
            test(
                "then it logs retries and logs the final failure after the last attempt",
                async () => {
                    const sleep = vi.fn(async () => {});
                    const logger = vi.fn();
                    let attempts = 0;

                    await expect(
                        runWithDevTransportRetry(
                            async () => {
                                attempts += 1;
                                const error = new Error("fetchModule timed out") as Error & {
                                    code?: string;
                                };
                                error.code = "ETIMEDOUT";
                                throw error;
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
                        ),
                    ).rejects.toThrow("fetchModule timed out");

                    expect(attempts).toBe(3);
                    expect(sleep).toHaveBeenCalledTimes(2);
                    expect(logger).toHaveBeenCalledTimes(3);
                    expect(String(logger.mock.calls[2]?.[0] ?? "")).toContain(
                        "failed after 3 attempt(s)",
                    );
                },
            );
        });
    });

    describe("given retry is enabled and the failure is not retryable", () => {
        describe("when the first attempt fails", () => {
            test("then it fails immediately without sleeping or retry logging", async () => {
                const sleep = vi.fn(async () => {});
                const logger = vi.fn();
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
                            logger,
                        },
                    ),
                ).rejects.toThrow("invalid config");

                expect(sleep).not.toHaveBeenCalled();
                expect(logger).not.toHaveBeenCalled();
            });
        });
    });

    describe("given retry is disabled", () => {
        describe("when the operation fails", () => {
            test("then it bypasses retry orchestration and runs only once", async () => {
                const sleep = vi.fn(async () => {});
                const logger = vi.fn();
                let attempts = 0;

                await expect(
                    runWithDevTransportRetry(
                        async () => {
                            attempts += 1;
                            throw new Error(
                                "vite:invoke request failed because fetchModule timed out",
                            );
                        },
                        {
                            enabled: false,
                            attempts: 3,
                            sleep,
                            logger,
                        },
                    ),
                ).rejects.toThrow("fetchModule timed out");

                expect(attempts).toBe(1);
                expect(sleep).not.toHaveBeenCalled();
                expect(logger).not.toHaveBeenCalled();
            });
        });
    });

    describe("given attempts is 1", () => {
        describe("when the operation fails", () => {
            test("then it does not retry and does not apply timeout retry behavior", async () => {
                vi.useFakeTimers();

                const sleep = vi.fn(async () => {});
                const logger = vi.fn();
                let attempts = 0;

                const pending = runWithDevTransportRetry(
                    async () => {
                        attempts += 1;
                        return await new Promise<string>(() => {});
                    },
                    {
                        enabled: true,
                        attempts: 1,
                        timeoutMs: 10,
                        sleep,
                        logger,
                    },
                );

                await vi.advanceTimersByTimeAsync(20);

                expect(attempts).toBe(1);
                expect(sleep).not.toHaveBeenCalled();
                expect(logger).not.toHaveBeenCalled();

                pending.catch(() => {});
                vi.useRealTimers();
            });
        });
    });

    describe("given a timeout occurs", () => {
        describe("when the first attempt never resolves", () => {
            test(
                "then the timeout is treated as retryable and a later attempt can succeed",
                async () => {
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
                },
            );

            test(
                "then the original timed-out operation is not cancelled and may continue running",
                async () => {
                    vi.useFakeTimers();

                    const sleep = vi.fn(async () => {});
                    let attempts = 0;
                    let firstResolved = false;
                    let resolveFirst!: (value: string) => void;

                    const pending = runWithDevTransportRetry(
                        async () => {
                            attempts += 1;
                            if (attempts === 1) {
                                return await new Promise<string>((resolve) => {
                                    resolveFirst = (value) => {
                                        firstResolved = true;
                                        resolve(value);
                                    };
                                });
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

                    expect(firstResolved).toBe(false);
                    resolveFirst("late-success");
                    await vi.advanceTimersByTimeAsync(0);
                    expect(firstResolved).toBe(true);

                    vi.useRealTimers();
                },
            );

            test(
                "then overlapping work is still possible in the current implementation",
                async () => {
                    vi.useFakeTimers();

                    const sleep = vi.fn(async () => {});
                    let activeAttempts = 0;
                    let maxConcurrentAttempts = 0;

                    const pending = runWithDevTransportRetry(
                        async () => {
                            activeAttempts += 1;
                            maxConcurrentAttempts = Math.max(maxConcurrentAttempts, activeAttempts);

                            if (activeAttempts === 1) {
                                return await new Promise<string>(() => {});
                            }

                            activeAttempts -= 1;
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
                    expect(maxConcurrentAttempts).toBeGreaterThan(1);

                    vi.useRealTimers();
                },
            );
        });
    });

    describe("given retry logging is emitted", () => {
        describe("when a retryable failure occurs", () => {
            test("then the log uses the current retrying (attempt/attempts) wording", async () => {
                const logger = vi.fn();
                const sleep = vi.fn(async () => {});
                let attempts = 0;

                await runWithDevTransportRetry(
                    async () => {
                        attempts += 1;
                        if (attempts === 1) {
                            const error = new Error("network error") as Error & { code?: string };
                            error.code = "ETIMEDOUT";
                            throw error;
                        }

                        return "ok";
                    },
                    {
                        enabled: true,
                        attempts: 2,
                        jitterRatio: 0,
                        baseDelayMs: 1,
                        maxDelayMs: 1,
                        sleep,
                        logger,
                    },
                );

                expect(String(logger.mock.calls[0]?.[0] ?? "")).toContain("retrying (1/2)");
            });
        });
    });
});

/**
 * Table-driven specification for the current retryability classifier.
 *
 * This suite pins down how `isRetryableDevTransportError` behaves today for:
 *
 * - known retryable transport failures;
 * - clearly non-retryable implementation or validation failures; and
 * - ambiguous message patterns that currently match too broadly.
 *
 * The final group is especially important during characterization because those examples describe
 * behavior that is expected to change in a later refactor. Keeping them explicit makes that
 * tightening intentional and reviewable.
 */
suite("isRetryableDevTransportError", () => {
    describe("given known retryable transport failures", () => {
        test.each([
            {
                case: "ETIMEDOUT code",
                error: Object.assign(new Error("request failed"), { code: "ETIMEDOUT" }),
            },
            {
                case: "ECONNRESET code",
                error: Object.assign(new Error("socket hang up"), { code: "ECONNRESET" }),
            },
            {
                case: "ECONNREFUSED code",
                error: Object.assign(new Error("connection refused"), { code: "ECONNREFUSED" }),
            },
            {
                case: "EAI_AGAIN code",
                error: Object.assign(new Error("dns lookup failed"), { code: "EAI_AGAIN" }),
            },
            {
                case: "vite invoke timeout message",
                error: new Error("vite:invoke request failed because fetchModule timed out"),
            },
            {
                case: "fetchModule timeout message",
                error: new Error("fetchModule timed out"),
            },
            {
                case: "socket hang up message",
                error: new Error("socket hang up"),
            },
            {
                case: "network error message",
                error: new Error("network error"),
            },
        ])("then it classifies $case as retryable", ({ error }) => {
            expect(isRetryableDevTransportError(error)).toBe(true);
        });
    });

    describe("given regular implementation failures", () => {
        test.each([
            {
                case: "syntax error",
                error: new Error("SyntaxError: unexpected token"),
            },
            {
                case: "invalid config",
                error: new Error("invalid config"),
            },
            {
                case: "validation failure",
                error: new Error("validation failed for lesson metadata"),
            },
        ])("then it does not classify $case as retryable", ({ error }) => {
            expect(isRetryableDevTransportError(error)).toBe(false);
        });
    });

    describe("given ambiguous transport-like messages", () => {
        test.each([
            {
                case: "generic transport wording",
                error: new Error("transport layer mismatch in parser"),
            },
            {
                case: "timeout wording without network context",
                error: new Error("custom timeout while validating content"),
            },
        ])("then it documents the current broad matching behavior", ({ error }) => {
            expect(isRetryableDevTransportError(error)).toBe(true);
        });
    });
});
