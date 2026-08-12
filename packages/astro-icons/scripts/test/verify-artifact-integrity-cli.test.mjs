import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { main } from "../verify-artifact-integrity.mjs";

describe("module contract", () => {
    test("exports an injectable main() and performs no CLI side effects on import", () => {
        assert.equal(typeof main, "function");
    });
});

describe("Feature: CLI orchestration", () => {
    test("main passes and reports success when every SVG import resolves", async () => {
        const calls = [];
        const status = await main({
            dependencies: {
                readBundleSource: () =>
                    Promise.resolve(
                        'export { default as Roshar } from "./roshar.svg";\n' +
                            'export { default as Scadrial } from "./scadrial.svg";\n',
                    ),
                readDistFiles: () => Promise.resolve(["index.js", "roshar.svg", "scadrial.svg"]),
                writeDiagnostic: () => calls.push("writeDiagnostic"),
                writeOutput: (message) => calls.push(["writeOutput", message]),
            },
        });

        assert.equal(status, 0);
        assert.ok(calls.some((call) => Array.isArray(call) && call[0] === "writeOutput"));
    });

    test("main fails and reports the unresolved specifier", async () => {
        const diagnostics = [];
        const status = await main({
            dependencies: {
                readBundleSource: () =>
                    Promise.resolve('export { default as Nalthis } from "./nalthis.svg";\n'),
                readDistFiles: () => Promise.resolve(["index.js"]),
                writeDiagnostic: (message) => diagnostics.push(message),
                writeOutput: () => assert.fail("failure must not be reported as success"),
            },
        });

        assert.equal(status, 1);
        assert.ok(diagnostics.some((message) => message.includes("nalthis.svg")));
    });
});
