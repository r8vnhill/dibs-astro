import { expect, suite, test } from "vitest";

import { assertSupportedToolchain, parseNodeRange } from "../lib/toolchain.mjs";

const packageManifest = {
    engines: { node: ">=24 <25" },
    packageManager: "pnpm@11.8.0",
};

suite("given the supported platform declaration", () => {
    test("then it accepts the declared Node and pnpm versions", () => {
        expect(() =>
            assertSupportedToolchain({
                packageManifest,
                nodeVersion: "24.11.0",
                pnpmVersion: "11.8.0",
            }),
        ).not.toThrow();
    });

    test("then it rejects an unsupported Node major", () => {
        expect(() =>
            assertSupportedToolchain({
                packageManifest,
                nodeVersion: "26.7.0",
                pnpmVersion: "11.8.0",
            }),
        ).toThrow("does not satisfy engines.node");
    });

    test("then it rejects a pnpm version that differs from the exact pin", () => {
        expect(() =>
            assertSupportedToolchain({
                packageManifest,
                nodeVersion: "24.11.0",
                pnpmVersion: "11.9.0",
            }),
        ).toThrow("does not match packageManager");
    });

    test("then it parses the supported Node range", () => {
        expect(parseNodeRange(">=24 <25")).toEqual({ minimum: 24, exclusiveMaximum: 25 });
    });
});
