import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, suite, test } from "vitest";

suite("given the site-core package manifest", () => {
    test("then the package declares side-effect-free modules", async () => {
        const packageJson = JSON.parse(await readFile(resolve(import.meta.dirname, "../../package.json"), "utf8"));

        expect(packageJson.sideEffects).toBe(false);
    });
});

suite("given the site-core root module", () => {
    describe("when it is imported", () => {
        test("then import does not mutate common host state", async () => {
            const before = captureHostState();

            await import("../index");

            expect(captureHostState()).toEqual(before);
        });
    });
});

const captureHostState = () => ({
    arrayPrototypeProperties: Object.getOwnPropertyNames(Array.prototype),
    globalProperties: Object.getOwnPropertyNames(globalThis),
    objectPrototypeProperties: Object.getOwnPropertyNames(Object.prototype),
    processEnv: { ...process.env },
});
