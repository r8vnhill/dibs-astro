import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHighlighterStore } from "../cache";

function deferred<T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;

    const promise = new Promise<T>((innerResolve, innerReject) => {
        resolve = innerResolve;
        reject = innerReject;
    });

    return { promise, resolve, reject };
}

describe("createHighlighterStore", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it("initializes lazily and reuses the same promise across repeated gets", async () => {
        const createdHighlighter = { codeToHtml: vi.fn() };
        const create = vi.fn(async () => createdHighlighter as any);
        const store = createHighlighterStore({ create } as any);

        const first = store.get();
        const second = store.get();

        expect(create).toHaveBeenCalledTimes(1);
        expect(second).toBe(first);
        await expect(first).resolves.toBe(createdHighlighter);
    });

    it("reuses the in-flight promise for concurrent callers", async () => {
        const pending = deferred<{ id: string }>();
        const create = vi.fn(() => pending.promise as any);
        const store = createHighlighterStore({ create } as any);

        const first = store.get();
        const second = store.get();

        expect(create).toHaveBeenCalledTimes(1);
        expect(second).toBe(first);

        pending.resolve({ id: "shared" });

        await expect(first).resolves.toEqual({ id: "shared" });
        await expect(second).resolves.toEqual({ id: "shared" });
    });

    it("clears the cached promise on reset and creates again on the next get", async () => {
        const create = vi.fn()
            .mockResolvedValueOnce({ id: "first" } as any)
            .mockResolvedValueOnce({ id: "second" } as any);
        const store = createHighlighterStore({ create } as any);

        await expect(store.get()).resolves.toEqual({ id: "first" });

        store.reset();

        await expect(store.get()).resolves.toEqual({ id: "second" });
        expect(create).toHaveBeenCalledTimes(2);
    });

    it.each([
        { label: "resolved highlighter", value: { id: "resolved" }, expectedId: "resolved" },
        {
            label: "promise highlighter",
            value: Promise.resolve({ id: "promised" }),
            expectedId: "promised",
        },
    ])("uses the injected $label until reset", async ({ value, expectedId }) => {
        const create = vi.fn(async () => ({ id: "created" } as any));
        const store = createHighlighterStore({ create } as any);

        store.setForTests(value as any);

        await expect(store.get()).resolves.toEqual({ id: expectedId });
        expect(create).not.toHaveBeenCalled();

        store.reset();

        await expect(store.get()).resolves.toEqual({ id: "created" });
        expect(create).toHaveBeenCalledTimes(1);
    });

    it("treats a null test value as restoring lazy initialization", async () => {
        const create = vi.fn(async () => ({ id: "created" } as any));
        const store = createHighlighterStore({ create } as any);

        store.setForTests({ id: "injected" } as any);
        store.setForTests(null);

        await expect(store.get()).resolves.toEqual({ id: "created" });
        expect(create).toHaveBeenCalledTimes(1);
    });

    it("clears the cached rejected promise and allows a later retry to recover", async () => {
        const create = vi.fn()
            .mockRejectedValueOnce(new Error("boom"))
            .mockResolvedValueOnce({ id: "recovered" } as any)

        const onSet = vi.fn();
        const store = createHighlighterStore({ create, onSet });

        await expect(store.get()).rejects.toThrow("boom");
        await expect(store.get()).resolves.toEqual({ id: "recovered" });

        expect(create).toHaveBeenCalledTimes(2);
        expect(onSet).toHaveBeenNthCalledWith(1, expect.any(Promise));
        expect(onSet).toHaveBeenNthCalledWith(2, null);
        expect(onSet).toHaveBeenNthCalledWith(3, expect.any(Promise));
    });
});
