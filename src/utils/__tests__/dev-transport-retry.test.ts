/**
 * Behavioral tests for `dev-transport-retry`.
 *
 * This file captures the observable contract of the helper, including the abortable timeout
 * semantics introduced by the current refactor.
 *
 * The goal of this suite is not only to protect useful behavior, but also to make today's
 * limitations and guarantees explicit so later TDD phases can evolve them deliberately rather than
 * accidentally.
 *
 * ## What this suite documents
 *
 * The tests cover two kinds of behavior:
 *
 * - behavior worth preserving, such as retry orchestration, retry/no-retry branching, delay usage,
 *   and retry events; and
 * - timeout and cancellation guarantees, such as aborting timed-out attempts before a retry can
 *   start.
 *
 * ## Why characterization matters here
 *
 * The suite keeps the broader retry policy characterized while making the new per-attempt
 * cancellation contract explicit.
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
import { resolveDevTransportRetryOptions } from "../dev-transport-retry/config";
import { composeAbortSignals, defaultSleep } from "../dev-transport-retry/timing";

/**
 * Behavioral specification for the current retry helper.
 *
 * The examples in this suite describe how the helper behaves today under:
 *
 * - retryable failures;
 * - non-retryable failures;
 * - disabled retry mode;
 * - timeout-triggered retries; and
 * - retry event emission.
 *
 * Timeout-related examples now describe the stronger cancellation guarantee: timed-out attempts
 * are aborted and the next retry starts only after the aborted attempt has settled.
 */
suite("runWithDevTransportRetry", () => {
    describe("given retry is enabled and failures are retryable", () => {
        describe("when the operation succeeds on a later attempt", () => {
            test(
                "then it retries until success, sleeps between attempts, and emits retry-scheduled events",
                async () => {
                    const sleep = vi.fn(async () => {});
                    const onRetryEvent = vi.fn();
                    let attempts = 0;

                    const result = await runWithDevTransportRetry(
                        async ({ signal: _signal }) => {
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
                            onRetryEvent,
                        },
                    );

                    expect(result).toBe("ok");
                    expect(attempts).toBe(3);
                    expect(sleep).toHaveBeenCalledTimes(2);
                    expect(onRetryEvent).toHaveBeenCalledTimes(2);
                },
            );
        });

        describe("when all retryable attempts fail", () => {
            test(
                "then it emits retry-scheduled events and emits final-failure after the last attempt",
                async () => {
                    const sleep = vi.fn(async () => {});
                    const onRetryEvent = vi.fn();
                    let attempts = 0;

                    await expect(
                        runWithDevTransportRetry(
                            async ({ signal: _signal }) => {
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
                                onRetryEvent,
                            },
                        ),
                    ).rejects.toThrow("fetchModule timed out");

                    expect(attempts).toBe(3);
                    expect(sleep).toHaveBeenCalledTimes(2);
                    expect(onRetryEvent).toHaveBeenCalledTimes(3);
                    expect(onRetryEvent.mock.calls[2]?.[0]).toMatchObject({
                        type: "final-failure",
                        attempt: 3,
                        maxAttempts: 3,
                    });
                },
            );
        });
    });

    describe("given retry is enabled and the failure is not retryable", () => {
        describe("when the first attempt fails", () => {
            test("then it fails immediately without sleeping or emitting retry events", async () => {
                const sleep = vi.fn(async () => {});
                const onRetryEvent = vi.fn();
                const error = new Error("invalid config");

                await expect(
                    runWithDevTransportRetry(
                        async ({ signal: _signal }) => {
                            throw error;
                        },
                        {
                            enabled: true,
                            attempts: 3,
                            sleep,
                            onRetryEvent,
                        },
                    ),
                ).rejects.toThrow("invalid config");

                expect(sleep).not.toHaveBeenCalled();
                expect(onRetryEvent).not.toHaveBeenCalled();
            });
        });
    });

    describe("given retry is disabled", () => {
        describe("when the operation fails", () => {
            test("then it bypasses retry orchestration and runs only once", async () => {
                const sleep = vi.fn(async () => {});
                const onRetryEvent = vi.fn();
                let attempts = 0;

                await expect(
                    runWithDevTransportRetry(
                        async ({ signal: _signal }) => {
                            attempts += 1;
                            throw new Error(
                                "vite:invoke request failed because fetchModule timed out",
                            );
                        },
                        {
                            enabled: false,
                            attempts: 3,
                            sleep,
                            onRetryEvent,
                        },
                    ),
                ).rejects.toThrow("fetchModule timed out");

                expect(attempts).toBe(1);
                expect(sleep).not.toHaveBeenCalled();
                expect(onRetryEvent).not.toHaveBeenCalled();
            });
        });

        describe("when the operation never resolves", () => {
            test("then it still enforces timeoutMs", async () => {
                vi.useFakeTimers();

                const sleep = vi.fn(async () => {});
                const onRetryEvent = vi.fn();
                let attempts = 0;
                let observedSignal!: AbortSignal;

                const pending = runWithDevTransportRetry(
                    async ({ signal, attempt, maxAttempts }) => {
                        attempts += 1;
                        observedSignal = signal;
                        expect(attempt).toBe(1);
                        expect(maxAttempts).toBe(1);

                        return await new Promise<string>((_, reject) => {
                            signal.addEventListener("abort", () => reject(signal.reason), {
                                once: true,
                            });
                        });
                    },
                    {
                        enabled: false,
                        attempts: 3,
                        timeoutMs: 10,
                        sleep,
                        onRetryEvent,
                    },
                );
                const expectation = expect(pending).rejects.toMatchObject({
                    name: "DevTransportTimeoutError",
                });

                await vi.advanceTimersByTimeAsync(20);

                await expectation;
                expect(attempts).toBe(1);
                expect(sleep).not.toHaveBeenCalled();
                expect(onRetryEvent).not.toHaveBeenCalled();
                expect(observedSignal.aborted).toBe(true);
                expect(observedSignal.reason).toMatchObject({
                    name: "DevTransportTimeoutError",
                });

                vi.useRealTimers();
            });
        });
    });

    describe("given attempts is 1", () => {
        describe("when the operation fails", () => {
            test("then it still enforces timeoutMs", async () => {
                vi.useFakeTimers();

                const sleep = vi.fn(async () => {});
                const onRetryEvent = vi.fn();
                let attempts = 0;
                let observedSignal!: AbortSignal;

                const pending = runWithDevTransportRetry(
                    async ({ signal, attempt, maxAttempts }) => {
                        attempts += 1;
                        observedSignal = signal;
                        expect(attempt).toBe(1);
                        expect(maxAttempts).toBe(1);

                        return await new Promise<string>((_, reject) => {
                            signal.addEventListener("abort", () => reject(signal.reason), {
                                once: true,
                            });
                        });
                    },
                    {
                        enabled: true,
                        attempts: 1,
                        timeoutMs: 10,
                        sleep,
                        onRetryEvent,
                    },
                );
                const expectation = expect(pending).rejects.toMatchObject({
                    name: "DevTransportTimeoutError",
                });

                await vi.advanceTimersByTimeAsync(20);

                await expectation;
                expect(attempts).toBe(1);
                expect(sleep).not.toHaveBeenCalled();
                expect(onRetryEvent).not.toHaveBeenCalled();
                expect(observedSignal.aborted).toBe(true);
                expect(observedSignal.reason).toMatchObject({
                    name: "DevTransportTimeoutError",
                });

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
                        async ({ signal, attempt, maxAttempts }) => {
                            attempts += 1;
                            expect(maxAttempts).toBe(2);
                            expect(attempt).toBe(attempts);
                            if (attempts === 1) {
                                return await new Promise<string>((_, reject) => {
                                    signal.addEventListener("abort", () => {
                                        reject(signal.reason);
                                    }, { once: true });
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
                            onRetryEvent: vi.fn(),
                        },
                    );

                    await vi.advanceTimersByTimeAsync(20);

                    await expect(pending).resolves.toBe("recovered");
                    expect(attempts).toBe(2);

                    vi.useRealTimers();
                },
            );

            test("then the timed-out operation is aborted", async () => {
                vi.useFakeTimers();

                const sleep = vi.fn(async () => {});
                const observedSignals: AbortSignal[] = [];
                let attempts = 0;

                const pending = runWithDevTransportRetry(
                    async ({ signal, attempt, maxAttempts }) => {
                        attempts += 1;
                        expect(maxAttempts).toBe(2);
                        expect(attempt).toBe(attempts);
                        observedSignals.push(signal);
                        if (attempts === 1) {
                            return await new Promise<string>((_, reject) => {
                                signal.addEventListener("abort", () => reject(signal.reason), {
                                    once: true,
                                });
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
                        onRetryEvent: vi.fn(),
                    },
                );

                await vi.advanceTimersByTimeAsync(20);

                await expect(pending).resolves.toBe("recovered");
                expect(observedSignals).toHaveLength(2);
                expect(observedSignals[0]?.aborted).toBe(true);
                expect(observedSignals[0]?.reason).toMatchObject({
                    name: "DevTransportTimeoutError",
                });
                expect(observedSignals[1]?.aborted).toBe(false);

                vi.useRealTimers();
            });

            test(
                "then the next retry does not start until the timed-out attempt has been aborted and settled",
                async () => {
                    vi.useFakeTimers();

                    const sleep = vi.fn(async () => {});
                    const events: string[] = [];
                    let attempts = 0;

                    const pending = runWithDevTransportRetry(
                        async ({ signal, attempt, maxAttempts }) => {
                            attempts += 1;
                            expect(maxAttempts).toBe(2);
                            expect(attempt).toBe(attempts);
                            events.push(`start:${attempts}`);

                            if (attempts === 1) {
                                return await new Promise<string>((_, reject) => {
                                    signal.addEventListener("abort", () => {
                                        events.push(`abort:${attempts}`);
                                        queueMicrotask(() => {
                                            events.push(`settled:${attempts}`);
                                            reject(signal.reason);
                                        });
                                    }, { once: true });
                                });
                            }

                            events.push(`success:${attempts}`);
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
                            onRetryEvent: vi.fn(),
                        },
                    );

                    await vi.advanceTimersByTimeAsync(20);
                    await expect(pending).resolves.toBe("recovered");

                    expect(events).toEqual([
                        "start:1",
                        "abort:1",
                        "settled:1",
                        "start:2",
                        "success:2",
                    ]);

                    vi.useRealTimers();
                },
            );

            test("then the operation can observe that its signal was aborted", async () => {
                vi.useFakeTimers();

                const sleep = vi.fn(async () => {});
                let abortedInsideHandler = false;
                let attempts = 0;

                const pending = runWithDevTransportRetry(
                    async ({ signal, attempt, maxAttempts }) => {
                        attempts += 1;
                        expect(maxAttempts).toBe(2);
                        expect(attempt).toBe(attempts);
                        if (attempts === 1) {
                            return await new Promise<string>((_, reject) => {
                                signal.addEventListener("abort", () => {
                                    abortedInsideHandler = signal.aborted;
                                    reject(signal.reason);
                                }, { once: true });
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
                        onRetryEvent: vi.fn(),
                    },
                );

                await vi.advanceTimersByTimeAsync(20);
                await expect(pending).resolves.toBe("recovered");
                expect(abortedInsideHandler).toBe(true);

                vi.useRealTimers();
            });
        });
    });

    describe("given external cancellation", () => {
        test("then a pre-aborted signal prevents the first attempt from starting", async () => {
            const controller = new AbortController();
            const cancellationError = new Error("cancel before start");
            const sleep = vi.fn(async () => {});
            const shouldRetry = vi.fn(() => true);
            const onRetryEvent = vi.fn();
            const operation = vi.fn(async ({ signal: _signal, attempt, maxAttempts }) => {
                expect(attempt).toBe(1);
                expect(maxAttempts).toBe(1);
                return "ok";
            });

            controller.abort(cancellationError);

            await expect(
                runWithDevTransportRetry(operation, {
                    enabled: true,
                    attempts: 3,
                    signal: controller.signal,
                    sleep,
                    shouldRetry,
                    onRetryEvent,
                }),
            ).rejects.toBe(cancellationError);

            expect(operation).not.toHaveBeenCalled();
            expect(sleep).not.toHaveBeenCalled();
            expect(shouldRetry).not.toHaveBeenCalled();
            expect(onRetryEvent).toHaveBeenCalledTimes(1);
            expect(onRetryEvent.mock.calls[0]?.[0]).toMatchObject({
                type: "cancelled",
                label: "operation",
                maxAttempts: 3,
                error: cancellationError,
            });
            expect(onRetryEvent.mock.calls[0]?.[0]).not.toHaveProperty("attempt");
        });

        test("then cancellation during an in-flight attempt aborts the attempt and stops retries", async () => {
            vi.useFakeTimers();

            const controller = new AbortController();
            const cancellationError = new Error("cancel in flight");
            const sleep = vi.fn(async () => {});
            const shouldRetry = vi.fn(() => true);
            const onRetryEvent = vi.fn();
            let attempts = 0;

            const pending = runWithDevTransportRetry(
                async ({ signal, attempt, maxAttempts }) => {
                    attempts += 1;
                    expect(attempt).toBe(1);
                    expect(maxAttempts).toBe(3);
                    return await new Promise<string>((_, reject) => {
                        signal.addEventListener("abort", () => reject(signal.reason), {
                            once: true,
                        });
                    });
                },
                {
                    enabled: true,
                    attempts: 3,
                    signal: controller.signal,
                    sleep,
                    shouldRetry,
                    onRetryEvent,
                },
            );
            const expectation = expect(pending).rejects.toBe(cancellationError);

            controller.abort(cancellationError);
            await vi.advanceTimersByTimeAsync(0);

            await expectation;

            expect(attempts).toBe(1);
            expect(sleep).not.toHaveBeenCalled();
            expect(shouldRetry).not.toHaveBeenCalled();
            expect(onRetryEvent).toHaveBeenCalledTimes(1);
            expect(onRetryEvent.mock.calls[0]?.[0]).toMatchObject({
                type: "cancelled",
                attempt: 1,
                maxAttempts: 3,
                error: cancellationError,
            });
            expect(
                onRetryEvent.mock.calls.some(([event]) => event?.type === "final-failure"),
            ).toBe(false);

            vi.useRealTimers();
        });

        test("then cancellation during backoff stops before the next attempt", async () => {
            vi.useFakeTimers();

            const controller = new AbortController();
            const cancellationError = new Error("cancel during backoff");
            const shouldRetry = vi.fn(() => true);
            const onRetryEvent = vi.fn();
            let attempts = 0;

            const pending = runWithDevTransportRetry(
                async ({ signal: _signal, attempt, maxAttempts }) => {
                    attempts += 1;
                    expect(attempt).toBe(1);
                    expect(maxAttempts).toBe(3);
                    if (attempts === 1) {
                        const error = new Error("socket hang up");
                        throw error;
                    }

                    return "ok";
                },
                {
                    enabled: true,
                    attempts: 3,
                    baseDelayMs: 50,
                    maxDelayMs: 50,
                    jitterRatio: 0,
                    signal: controller.signal,
                    shouldRetry,
                    onRetryEvent,
                },
            );
            const expectation = expect(pending).rejects.toBe(cancellationError);

            await vi.advanceTimersByTimeAsync(0);
            expect(onRetryEvent).toHaveBeenCalledTimes(1);
            expect(onRetryEvent.mock.calls[0]?.[0]).toMatchObject({
                type: "retry-scheduled",
                attempt: 1,
                nextAttempt: 2,
                maxAttempts: 3,
                delayMs: 50,
            });

            controller.abort(cancellationError);
            await vi.advanceTimersByTimeAsync(0);

            await expectation;

            expect(attempts).toBe(1);
            expect(shouldRetry).toHaveBeenCalledTimes(1);
            expect(onRetryEvent).toHaveBeenCalledTimes(2);
            expect(onRetryEvent.mock.calls[1]?.[0]).toMatchObject({
                type: "cancelled",
                attempt: 1,
                maxAttempts: 3,
                error: cancellationError,
            });
            expect(
                onRetryEvent.mock.calls.some(([event]) => event?.type === "final-failure"),
            ).toBe(false);

            vi.useRealTimers();
        });
    });

    describe("given retry events are emitted", () => {
        describe("when a retryable failure occurs", () => {
            test("then it emits the structured retry-scheduled event", async () => {
                const onRetryEvent = vi.fn();
                const sleep = vi.fn(async () => {});
                let attempts = 0;

                await runWithDevTransportRetry(
                    async ({ signal: _signal }) => {
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
                        onRetryEvent,
                    },
                );

                expect(onRetryEvent.mock.calls[0]?.[0]).toMatchObject({
                    type: "retry-scheduled",
                    attempt: 1,
                    nextAttempt: 2,
                    maxAttempts: 2,
                    delayMs: 1,
                });
            });
        });
    });

    describe("given the operation succeeds before the timeout", () => {
        describe("when the first attempt completes successfully", () => {
            test("then the provided signal is not aborted", async () => {
                let observedSignal!: AbortSignal;

                const result = await runWithDevTransportRetry(
                    async ({ signal }) => {
                        observedSignal = signal;
                        return "ok";
                    },
                    {
                        enabled: true,
                        attempts: 2,
                        timeoutMs: 10,
                        onRetryEvent: vi.fn(),
                    },
                );

                expect(result).toBe("ok");
                expect(observedSignal.aborted).toBe(false);
            });
        });
    });

    describe("given retry is enabled and a retryable non-timeout error occurs", () => {
        describe("when the operation succeeds on the next attempt", () => {
            test("then it still retries under the abortable operation signature", async () => {
                const sleep = vi.fn(async () => {});
                let attempts = 0;

                const result = await runWithDevTransportRetry(
                    async ({ signal: _signal }) => {
                        attempts += 1;
                        if (attempts === 1) {
                            throw new Error("socket hang up");
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
                        onRetryEvent: vi.fn(),
                    },
                );

                expect(result).toBe("ok");
                expect(attempts).toBe(2);
                expect(sleep).toHaveBeenCalledTimes(1);
            });
        });
    });
});

suite("dev-transport-retry config and timing", () => {
    test("resolveDevTransportRetryOptions preserves the external signal and defaults onRetryEvent", () => {
        const controller = new AbortController();

        const resolved = resolveDevTransportRetryOptions({
            signal: controller.signal,
        });

        expect(resolved.signal).toBe(controller.signal);
        expect(typeof resolved.onRetryEvent).toBe("function");
        expect(() =>
            resolved.onRetryEvent({
                type: "cancelled",
                label: "operation",
                maxAttempts: 1,
                error: new Error("cancelled"),
            })
        ).not.toThrow();
    });

    test("resolveDevTransportRetryOptions preserves a custom abort-aware sleep implementation", () => {
        const sleep = vi.fn(async (_ms: number, _signal: AbortSignal) => {});

        const resolved = resolveDevTransportRetryOptions({ sleep });

        expect(resolved.sleep).toBe(sleep);
    });

    test("composeAbortSignals aborts the composed signal when the external signal aborts", () => {
        const timeoutController = new AbortController();
        const externalController = new AbortController();
        const fallbackReason = new Error("fallback");

        const { signal, cleanup } = composeAbortSignals(
            timeoutController,
            externalController.signal,
            fallbackReason,
        );

        externalController.abort(new Error("external abort"));

        expect(signal.aborted).toBe(true);
        expect(signal.reason).toMatchObject({
            message: "external abort",
        });

        cleanup();
    });

    test("composeAbortSignals preserves timeout-driven aborts", () => {
        const timeoutController = new AbortController();
        const externalController = new AbortController();
        const timeoutError = new Error("timed out");

        const { signal, cleanup } = composeAbortSignals(
            timeoutController,
            externalController.signal,
            timeoutError,
        );

        timeoutController.abort(timeoutError);

        expect(signal.aborted).toBe(true);
        expect(signal.reason).toBe(timeoutError);

        cleanup();
    });

    test("defaultSleep resolves when not aborted", async () => {
        vi.useFakeTimers();

        const controller = new AbortController();
        const pending = defaultSleep(10, controller.signal);

        await vi.advanceTimersByTimeAsync(10);
        await expect(pending).resolves.toBeUndefined();

        vi.useRealTimers();
    });

    test("defaultSleep rejects with the signal reason when aborted", async () => {
        vi.useFakeTimers();

        const controller = new AbortController();
        const pending = defaultSleep(50, controller.signal);
        const abortError = new Error("aborted");

        controller.abort(abortError);

        await expect(pending).rejects.toBe(abortError);
        vi.useRealTimers();
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
