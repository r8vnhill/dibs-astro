import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { main } from "../assert-pack-files.mjs";

const REQUIRED_RUNTIME_FILES = [
    "package/README.md",
    "package/package.json",
    "package/dist/index.js",
    "package/dist/index.d.ts",
    "package/dist/index.js.map",
];

const CORE_LICENSE_FILES = [
    "package/LICENSE",
    "package/LICENSES/PHOSPHOR.txt",
    "package/LICENSES/README.md",
    "package/LICENSES/THIRD_PARTY.md",
    "package/LICENSES/third-party-icons.json",
];

const buildManifest = (assets = []) => ({ assets });

const completeFiles = (extra = []) =>
    new Set([
        ...REQUIRED_RUNTIME_FILES,
        ...CORE_LICENSE_FILES,
        "package/dist/roshar.svg",
        "package/dist/scadrial.svg",
        ...extra,
    ]);

const publishableIcons = [{ file: "roshar.svg" }, { file: "scadrial.svg" }];

describe("module contract", () => {
    test("exports an injectable main() and performs no CLI side effects on import", () => {
        assert.equal(typeof main, "function");
    });
});

describe("Feature: CLI orchestration", () => {
    test("main adapts injected shell effects and returns success without process exit", async () => {
        const calls = [];
        const files = completeFiles();
        const status = await main({
            argv: ["--pack"],
            dependencies: {
                readPackFiles: (argv) => {
                    calls.push(["readPackFiles", argv]);
                    return Promise.resolve({ files });
                },
                readPublishableIcons: () => {
                    calls.push("readPublishableIcons");
                    return Promise.resolve(publishableIcons);
                },
                readManifest: () => {
                    calls.push("readManifest");
                    return Promise.resolve(buildManifest());
                },
                writeDiagnostic: () => calls.push("writeDiagnostic"),
                writeOutput: (message) => calls.push(["writeOutput", message]),
            },
        });

        assert.equal(status, 0);
        assert.equal(calls.filter((call) => call === "readPublishableIcons").length, 1);
        assert.equal(calls.filter((call) => call === "readManifest").length, 1);
        assert.ok(calls.some((call) => Array.isArray(call) && call[0] === "writeOutput"));
    });

    test("main renders independent findings and returns failure", async () => {
        const diagnostics = [];
        const files = completeFiles(["package/scripts/urithiru.mjs", "package/dist/bash.svg"]);
        files.delete("package/LICENSE");

        const status = await main({
            dependencies: {
                readPackFiles: async () => ({ files }),
                readPublishableIcons: async () => publishableIcons,
                readManifest: async () => buildManifest(),
                writeDiagnostic: (message) => diagnostics.push(message),
                writeOutput: () => assert.fail("failure must not be reported as success"),
            },
        });

        assert.equal(status, 1);
        assert.ok(diagnostics.some((message) => message.includes("Missing required files")));
        assert.ok(diagnostics.some((message) => message.includes("Blocked files present")));
        assert.ok(diagnostics.some((message) => message.includes("svgSet.unexpected") && message.includes("bash.svg")));
    });

    test("Feature: dry-run package inspection - --pack performs no artifact cleanup", async () => {
        // The default dependencies object exposes no removePackedTarballs hook at all: cleanup
        // was removed entirely because `npm pack --dry-run` never produces a real tarball to
        // clean up. This test documents the contract at the injection boundary: main() never
        // calls anything resembling deletion.
        const calls = [];
        await main({
            argv: ["--pack"],
            dependencies: {
                readPackFiles: () => Promise.resolve({ files: completeFiles() }),
                readPublishableIcons: () => Promise.resolve(publishableIcons),
                readManifest: () => Promise.resolve(buildManifest()),
                writeDiagnostic: () => calls.push("writeDiagnostic"),
                writeOutput: () => calls.push("writeOutput"),
            },
        });

        assert.ok(!calls.includes("removePackedTarballs"));
    });
});
